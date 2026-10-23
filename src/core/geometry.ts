/**
 * Géométrie de la grille : convertir un point à l'écran en cellule (colonne, ligne).
 * Les fonctions de calcul sont pures (testables sans navigateur) ;
 * seule `readMetrics` lit le DOM.
 */

export interface GridMetrics {
  left: number;
  top: number;
  /** Largeur réelle de chaque colonne, en px. */
  columns: number[];
  /** Hauteur réelle de chaque ligne existante, en px. */
  rows: number[];
  columnGap: number;
  rowGap: number;
  /** Hauteur supposée des lignes au-delà de la dernière ligne existante. */
  fallbackRow: number;
}

/**
 * Index (à partir de 1) de la piste située à `offset` px du début de la grille.
 * La frontière entre deux pistes est placée au milieu de l'espace qui les sépare.
 * Au-delà de la dernière piste, on prolonge avec `fallback` (0 = on s'arrête à la dernière).
 */
export function trackIndexAt(offset: number, tracks: number[], gap: number, fallback: number): number {
  if (offset <= 0 || tracks.length === 0) return 1;
  let pos = 0;
  for (let i = 0; i < tracks.length; i++) {
    const end = pos + tracks[i];
    if (offset < end + gap / 2) return i + 1;
    pos = end + gap;
  }
  if (fallback <= 0) return tracks.length;
  return tracks.length + 1 + Math.floor((offset - pos + gap / 2) / (fallback + gap));
}

export function cellAt(x: number, y: number, m: GridMetrics): { col: number; row: number } {
  return {
    col: trackIndexAt(x - m.left, m.columns, m.columnGap, 0),
    row: trackIndexAt(y - m.top, m.rows, m.rowGap, m.fallbackRow),
  };
}

/** "120px 98.5px 120px" → [120, 98.5, 120] */
export function parseTracks(value: string): number[] {
  return value
    .split(/\s+/)
    .map((part) => /^(-?\d*\.?\d+)px$/.exec(part)?.[1])
    .filter((n): n is string => n !== undefined)
    .map(Number);
}

export function readMetrics(grid: HTMLElement, fallbackRow: number): GridMetrics {
  const rect = grid.getBoundingClientRect();
  const style = getComputedStyle(grid);
  return {
    left: rect.left,
    top: rect.top,
    columns: parseTracks(style.gridTemplateColumns),
    rows: parseTracks(style.gridTemplateRows),
    columnGap: parseFloat(style.columnGap) || 0,
    rowGap: parseFloat(style.rowGap) || 0,
    fallbackRow,
  };
}
