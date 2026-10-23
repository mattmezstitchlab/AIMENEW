import type { BlockNode } from './types';

/**
 * Le contrat de bloc.
 *
 * Pour le noyau, tous les blocs se ressemblent : un type, des données par
 * défaut, une taille par défaut sur la grille, un rendu, et des actions
 * d'édition. Un bloc texte et un futur bloc boutique respectent le même contrat.
 */

export type Mode = 'view' | 'edit';

export interface UpdateOptions {
  /** false = le DOM reflète déjà la modification (ex. frappe en direct) : pas de re-rendu. */
  render?: boolean;
  /** Clé de fusion dans l'historique (ex. `text:<id>`). */
  coalesce?: string;
}

export interface RenderContext {
  mode: Mode;
  node: BlockNode;
  /** Modifie les données de CE bloc. */
  update(patch: Record<string, unknown>, opts?: UpdateOptions): void;
  /** Pour un bloc grille : rend la grille de ses enfants. `null` sinon. */
  renderChildren(): HTMLElement | null;
}

/** Actions affichées dans la barre du bloc sélectionné. */
export type BlockAction =
  | { kind: 'button'; label: string; title?: string; active?: boolean; patch: Record<string, unknown> }
  | { kind: 'input'; label: string; key: string; value: string; placeholder?: string }
  | { kind: 'file'; label: string; key: string; accept: string }
  | { kind: 'label'; label: string; title?: string };

export interface BlockDefinition<P extends Record<string, unknown> = Record<string, unknown>> {
  type: string;
  label: string;
  /** Un caractère ou un court glyphe pour les menus. */
  icon: string;
  description: string;
  /** Ce que le bloc sait faire : "contenu", "média", "grille", demain "formulaire", "paiement"… */
  capabilities: string[];
  defaultSize: { colSpan: number; rowSpan: number };
  /** true si le bloc est une grille qui accueille d'autres blocs. */
  isContainer?: boolean;
  defaults(): P;
  render(props: P, ctx: RenderContext): HTMLElement;
  actions?(props: P): BlockAction[];
}

const blocks = new Map<string, BlockDefinition>();

export function defineBlock<P extends Record<string, unknown>>(def: BlockDefinition<P>): BlockDefinition<P> {
  blocks.set(def.type, def as unknown as BlockDefinition);
  return def;
}

export function getBlock(type: string): BlockDefinition | undefined {
  return blocks.get(type);
}

export function listBlocks(): BlockDefinition[] {
  return [...blocks.values()];
}
