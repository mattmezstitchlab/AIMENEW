/**
 * Le modèle de données d'AIME NEW.
 *
 * Un site, c'est un document : un arbre de blocs posés sur des grilles.
 * Les nœuds sont stockés à plat (dictionnaire par identifiant) et les
 * grilles référencent leurs enfants par identifiant. Ce format est la
 * seule source de vérité : l'écran, l'export et l'IA ne font que le lire
 * ou produire un nouveau document.
 */

export type NodeId = string;

/** Position d'un bloc dans la grille de son parent (indices à partir de 1). */
export interface Placement {
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

export interface BlockNode {
  id: NodeId;
  /** Type de bloc, résolu par le registre (ex. "text", "image", "container"). */
  type: string;
  /** Données propres au bloc. Le noyau ne les interprète pas, sauf `columns`, `gap`, `rowHeight` pour une grille. */
  props: Record<string, unknown>;
  /** Placement dans la grille du parent. Ignoré pour la racine. */
  place: Placement;
  /** Présent uniquement si le bloc est une grille capable de contenir d'autres blocs. */
  children?: NodeId[];
}

export interface AimeDocument {
  format: 'aime/document';
  version: 1;
  id: string;
  title: string;
  /** Identifiant du Design System appliqué (tokens), indépendant du contenu. */
  designSystem: string;
  root: NodeId;
  nodes: Record<NodeId, BlockNode>;
  updatedAt: string;
}
