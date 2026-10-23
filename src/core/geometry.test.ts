import { describe, expect, it } from 'vitest';
import { cellAt, parseTracks, trackIndexAt, type GridMetrics } from './geometry';

describe('géométrie de la grille', () => {
  const cols = [100, 100, 100, 100];

  it('trouve la colonne sous le pointeur, frontière au milieu de l’espace', () => {
    expect(trackIndexAt(-20, cols, 20, 0)).toBe(1);
    expect(trackIndexAt(50, cols, 20, 0)).toBe(1);
    expect(trackIndexAt(109, cols, 20, 0)).toBe(1);
    expect(trackIndexAt(111, cols, 20, 0)).toBe(2);
    expect(trackIndexAt(10_000, cols, 20, 0)).toBe(4);
  });

  it('prolonge les lignes au-delà de la dernière ligne existante', () => {
    const rows = [60, 60]; // occupe 0 → 140 (avec 20 d’espace)
    expect(trackIndexAt(130, rows, 20, 60)).toBe(2);
    expect(trackIndexAt(155, rows, 20, 60)).toBe(3);
    expect(trackIndexAt(235, rows, 20, 60)).toBe(4);
    expect(trackIndexAt(30, [], 20, 60)).toBe(1);
  });

  it('convertit un point de l’écran en cellule', () => {
    const m: GridMetrics = { left: 40, top: 100, columns: cols, rows: [60], columnGap: 20, rowGap: 20, fallbackRow: 60 };
    expect(cellAt(40 + 250, 100 + 10, m)).toEqual({ col: 3, row: 1 });
    expect(cellAt(0, 0, m)).toEqual({ col: 1, row: 1 });
  });

  it('lit les pistes calculées par le navigateur', () => {
    expect(parseTracks('120px 98.5px 120px')).toEqual([120, 98.5, 120]);
    expect(parseTracks('none')).toEqual([]);
  });
});
