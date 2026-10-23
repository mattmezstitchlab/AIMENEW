import type { AimeDocument, BlockNode, NodeId, Placement } from './types';
import { getBlock, type BlockDefinition, type Mode, type UpdateOptions } from './registry';
import { columnsOf } from './document';
import { h } from './dom';

/**
 * Rendu : document → DOM.
 * Le même rendu sert à l'édition et à la publication ; seul le `mode` change.
 */

export interface RenderOptions {
  mode: Mode;
  onUpdate?: (id: NodeId, patch: Record<string, unknown>, opts?: UpdateOptions) => void;
}

export function renderDocument(doc: AimeDocument, opts: RenderOptions): HTMLElement {
  const surface = h('div', { class: `aime-surface is-${opts.mode}`, 'data-ds': doc.designSystem });
  surface.append(renderNode(doc, doc.root, opts, true));
  return surface;
}

export function applyPlacement(el: HTMLElement, place: Placement): void {
  el.style.setProperty('--c', String(place.col));
  el.style.setProperty('--r', String(place.row));
  el.style.setProperty('--cs', String(place.colSpan));
  el.style.setProperty('--rs', String(place.rowSpan));
}

function renderNode(doc: AimeDocument, id: NodeId, opts: RenderOptions, isRoot = false): HTMLElement {
  const node = doc.nodes[id];
  const def = getBlock(node.type) ?? unknownBlock(node.type);
  const cell = h('div', {
    class: isRoot ? 'aime-cell aime-cell--root' : 'aime-cell',
    'data-id': id,
    'data-type': node.type,
  });
  if (!isRoot) applyPlacement(cell, node.place);

  const content = def.render(
    { ...def.defaults(), ...node.props },
    {
      mode: opts.mode,
      node,
      update: (patch, o) => opts.onUpdate?.(id, patch, o),
      renderChildren: () => (node.children ? renderGrid(doc, node, opts) : null),
    },
  );
  content.classList.add('aime-block');
  cell.append(content);

  if (opts.mode === 'edit' && !isRoot) {
    cell.append(
      h('button', { type: 'button', class: 'aime-handle aime-handle--move', 'data-handle': 'move', 'aria-label': 'Déplacer le bloc', title: 'Déplacer' }),
      h('button', { type: 'button', class: 'aime-handle aime-handle--resize', 'data-handle': 'resize', 'aria-label': 'Redimensionner le bloc', title: 'Redimensionner' }),
    );
  }
  return cell;
}

function renderGrid(doc: AimeDocument, node: BlockNode, opts: RenderOptions): HTMLElement {
  const columns = columnsOf(node);
  const grid = h('div', {
    class: 'aime-grid',
    'data-grid': node.id,
    style: {
      '--cols': columns,
      '--gap': `${num(node.props.gap, 16)}px`,
      '--row-h': `${num(node.props.rowHeight, 56)}px`,
    },
  });

  if (opts.mode === 'edit') {
    const guides = h('div', { class: 'aime-guides', 'aria-hidden': 'true' });
    for (let i = 0; i < columns; i++) guides.append(h('span'));
    grid.append(guides);
  }

  // Ordre du DOM = ordre de lecture (haut → bas, gauche → droite).
  // C'est lui qui s'applique quand la grille passe en une colonne sur mobile.
  const children = (node.children ?? [])
    .map((childId) => doc.nodes[childId])
    .filter((child): child is BlockNode => Boolean(child))
    .sort((a, b) => a.place.row - b.place.row || a.place.col - b.place.col);
  for (const child of children) grid.append(renderNode(doc, child.id, opts));
  return grid;
}

/** Un type inconnu ne casse pas la page : le document reste lisible et compatible. */
function unknownBlock(type: string): BlockDefinition {
  return {
    type,
    label: type,
    icon: '?',
    description: 'Bloc inconnu',
    capabilities: [],
    defaultSize: { colSpan: 4, rowSpan: 1 },
    defaults: () => ({}),
    render: () => h('div', { class: 'b-unknown' }, `Bloc « ${type} » non disponible`),
  };
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
