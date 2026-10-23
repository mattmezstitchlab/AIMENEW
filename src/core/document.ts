import type { AimeDocument, BlockNode, NodeId, Placement } from './types';
import { uid } from './ids';

/**
 * Opérations pures sur le document.
 * Chaque fonction renvoie un NOUVEAU document et ne modifie jamais l'ancien :
 * c'est ce qui rend l'historique (annuler / refaire) trivial et fiable.
 */

export const ROOT_ID = 'root';
export const ROOT_COLUMNS = 12;
const MAX_ROW_SPAN = 48;
const MAX_ROW = 10_000;

// ─── Lecture ────────────────────────────────────────────────────────────────

export function getNode(doc: AimeDocument, id: NodeId): BlockNode {
  const node = doc.nodes[id];
  if (!node) throw new Error(`Bloc introuvable : ${id}`);
  return node;
}

export function isGrid(node: BlockNode | undefined): boolean {
  return Array.isArray(node?.children);
}

/** Nombre de colonnes d'une grille (convention : `props.columns`). */
export function columnsOf(node: BlockNode): number {
  return clampInt(numberOr(node.props.columns, ROOT_COLUMNS), 1, 24);
}

export function parentOf(doc: AimeDocument, id: NodeId): NodeId | null {
  for (const node of Object.values(doc.nodes)) {
    if (node.children?.includes(id)) return node.id;
  }
  return null;
}

/** Tous les descendants d'un bloc (sans le bloc lui-même). */
export function descendants(doc: AimeDocument, id: NodeId): NodeId[] {
  const out: NodeId[] = [];
  const stack = [...(doc.nodes[id]?.children ?? [])];
  while (stack.length) {
    const next = stack.pop()!;
    out.push(next);
    stack.push(...(doc.nodes[next]?.children ?? []));
  }
  return out;
}

/** Première ligne libre sous les blocs existants d'une grille. */
export function nextFreeRow(doc: AimeDocument, parentId: NodeId): number {
  let row = 1;
  for (const childId of getNode(doc, parentId).children ?? []) {
    const place = doc.nodes[childId]?.place;
    if (place) row = Math.max(row, place.row + place.rowSpan);
  }
  return row;
}

export function clampPlacement(place: Placement, columns: number): Placement {
  const colSpan = clampInt(place.colSpan, 1, columns);
  return {
    col: clampInt(place.col, 1, columns - colSpan + 1),
    row: clampInt(place.row, 1, MAX_ROW),
    colSpan,
    rowSpan: clampInt(place.rowSpan, 1, MAX_ROW_SPAN),
  };
}

// ─── Création ───────────────────────────────────────────────────────────────

export function createDocument(title = 'Sans titre'): AimeDocument {
  return {
    format: 'aime/document',
    version: 1,
    id: uid('doc'),
    title,
    designSystem: 'iris',
    root: ROOT_ID,
    nodes: {
      [ROOT_ID]: {
        id: ROOT_ID,
        type: 'container',
        props: { columns: ROOT_COLUMNS, gap: 20, rowHeight: 56, padding: 40, tone: 'none' },
        place: { col: 1, row: 1, colSpan: ROOT_COLUMNS, rowSpan: 1 },
        children: [],
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

// ─── Écriture ───────────────────────────────────────────────────────────────

export function addBlock(doc: AimeDocument, parentId: NodeId, node: BlockNode): AimeDocument {
  const parent = getNode(doc, parentId);
  if (!isGrid(parent)) throw new Error("Ce bloc ne peut pas contenir d'autres blocs.");
  if (doc.nodes[node.id]) throw new Error(`Identifiant déjà utilisé : ${node.id}`);
  const placed: BlockNode = { ...node, place: clampPlacement(node.place, columnsOf(parent)) };
  return touch(doc, {
    ...doc.nodes,
    [node.id]: placed,
    [parentId]: { ...parent, children: [...parent.children!, node.id] },
  });
}

export function updateProps(
  doc: AimeDocument,
  id: NodeId,
  patch: Record<string, unknown>,
): AimeDocument {
  const node = getNode(doc, id);
  const changed = Object.entries(patch).some(([k, v]) => !Object.is(node.props[k], v));
  if (!changed) return doc;

  const nodes = { ...doc.nodes, [id]: { ...node, props: { ...node.props, ...patch } } };

  // Si une grille change de nombre de colonnes, ses enfants restent dedans.
  if (isGrid(node) && 'columns' in patch) {
    const columns = columnsOf(nodes[id]);
    for (const childId of node.children!) {
      const child = nodes[childId];
      if (child) nodes[childId] = { ...child, place: clampPlacement(child.place, columns) };
    }
  }
  return touch(doc, nodes);
}

export function setPlacement(doc: AimeDocument, id: NodeId, place: Placement): AimeDocument {
  const parentId = parentOf(doc, id);
  if (!parentId) return doc; // la racine n'a pas de placement
  const node = getNode(doc, id);
  const next = clampPlacement(place, columnsOf(getNode(doc, parentId)));
  if (samePlacement(node.place, next)) return doc;
  return touch(doc, { ...doc.nodes, [id]: { ...node, place: next } });
}

export function removeBlock(doc: AimeDocument, id: NodeId): AimeDocument {
  if (id === doc.root) throw new Error('La racine ne peut pas être supprimée.');
  const parentId = parentOf(doc, id);
  const nodes = { ...doc.nodes };
  for (const gone of [id, ...descendants(doc, id)]) delete nodes[gone];
  if (parentId) {
    const parent = nodes[parentId];
    nodes[parentId] = { ...parent, children: parent.children!.filter((c) => c !== id) };
  }
  return touch(doc, nodes);
}

export function moveBlock(
  doc: AimeDocument,
  id: NodeId,
  newParentId: NodeId,
  place?: Placement,
): AimeDocument {
  if (id === doc.root) throw new Error('La racine ne peut pas être déplacée.');
  if (id === newParentId || descendants(doc, id).includes(newParentId)) {
    throw new Error('Un bloc ne peut pas entrer dans lui-même.');
  }
  const target = getNode(doc, newParentId);
  if (!isGrid(target)) throw new Error("Ce bloc ne peut pas contenir d'autres blocs.");

  const node = getNode(doc, id);
  const oldParentId = parentOf(doc, id);
  const nodes = { ...doc.nodes };
  if (oldParentId) {
    const old = nodes[oldParentId];
    nodes[oldParentId] = { ...old, children: old.children!.filter((c) => c !== id) };
  }
  const fresh = nodes[newParentId];
  nodes[newParentId] = { ...fresh, children: [...fresh.children!.filter((c) => c !== id), id] };
  nodes[id] = { ...node, place: clampPlacement(place ?? node.place, columnsOf(target)) };
  return touch(doc, nodes);
}

/** Duplique un bloc et tout son contenu, placé juste en dessous dans la même grille. */
export function duplicateBlock(doc: AimeDocument, id: NodeId): { doc: AimeDocument; id: NodeId } {
  if (id === doc.root) throw new Error('La racine ne peut pas être dupliquée.');
  const parentId = parentOf(doc, id)!;
  const parent = getNode(doc, parentId);
  const original = getNode(doc, id);

  const idMap = new Map<NodeId, NodeId>();
  for (const old of [id, ...descendants(doc, id)]) idMap.set(old, uid(doc.nodes[old].type));

  const nodes = { ...doc.nodes };
  for (const [oldId, newId] of idMap) {
    const src = doc.nodes[oldId];
    nodes[newId] = {
      ...structuredClone(src),
      id: newId,
      children: src.children?.map((c) => idMap.get(c)!),
    };
    if (!src.children) delete nodes[newId].children;
  }
  const copyId = idMap.get(id)!;
  nodes[copyId] = {
    ...nodes[copyId],
    place: clampPlacement({ ...original.place, row: nextFreeRow(doc, parentId) }, columnsOf(parent)),
  };
  const siblings = [...parent.children!];
  siblings.splice(siblings.indexOf(id) + 1, 0, copyId);
  nodes[parentId] = { ...parent, children: siblings };
  return { doc: touch(doc, nodes), id: copyId };
}

// ─── Validation (import) ────────────────────────────────────────────────────

/** Vérifie qu'une valeur inconnue (fichier importé, stockage) est un document sain. */
export function parseDocument(value: unknown): AimeDocument {
  const fail = (msg: string): never => {
    throw new Error(`Document invalide : ${msg}`);
  };
  if (!value || typeof value !== 'object') fail('ce n’est pas un objet.');
  const doc = value as Partial<AimeDocument>;
  if (doc.format !== 'aime/document') fail('format inconnu.');
  if (doc.version !== 1) fail(`version ${String(doc.version)} non prise en charge.`);
  if (typeof doc.root !== 'string' || !doc.nodes || typeof doc.nodes !== 'object') fail('racine absente.');
  const nodes = doc.nodes!;
  if (!nodes[doc.root!]) fail('la racine ne correspond à aucun bloc.');

  const seen = new Set<NodeId>();
  const visit = (id: NodeId) => {
    if (seen.has(id)) fail(`le bloc ${id} apparaît deux fois.`);
    seen.add(id);
    const node = nodes[id];
    if (!node) fail(`le bloc ${id} est référencé mais absent.`);
    if (node.id !== id || typeof node.type !== 'string') fail(`le bloc ${id} est mal formé.`);
    if (!node.props || typeof node.props !== 'object') fail(`le bloc ${id} n’a pas de données.`);
    const p = node.place;
    if (!p || ![p.col, p.row, p.colSpan, p.rowSpan].every(Number.isFinite)) fail(`placement du bloc ${id} invalide.`);
    node.children?.forEach(visit);
  };
  visit(doc.root!);

  return {
    format: 'aime/document',
    version: 1,
    id: typeof doc.id === 'string' ? doc.id : uid('doc'),
    title: typeof doc.title === 'string' ? doc.title : 'Sans titre',
    designSystem: typeof doc.designSystem === 'string' ? doc.designSystem : 'iris',
    root: doc.root!,
    // Les blocs orphelins (non atteignables depuis la racine) sont ignorés.
    nodes: Object.fromEntries([...seen].map((id) => [id, nodes[id]])),
    updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : new Date().toISOString(),
  };
}

// ─── Utilitaires ────────────────────────────────────────────────────────────

export function samePlacement(a: Placement, b: Placement): boolean {
  return a.col === b.col && a.row === b.row && a.colSpan === b.colSpan && a.rowSpan === b.rowSpan;
}

function touch(doc: AimeDocument, nodes: Record<NodeId, BlockNode>): AimeDocument {
  return { ...doc, nodes, updatedAt: new Date().toISOString() };
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clampInt(value: number, min: number, max: number): number {
  const n = Math.round(Number.isFinite(value) ? value : min);
  return Math.min(max, Math.max(min, n));
}
