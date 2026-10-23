import { describe, expect, it } from 'vitest';
import { canRedo, canUndo, commit, createHistory, redo, undo } from './history';

describe('historique', () => {
  it('annule et refait', () => {
    let h = createHistory('a');
    h = commit(h, 'b');
    h = commit(h, 'c');
    expect(canUndo(h)).toBe(true);
    h = undo(h);
    expect(h.present).toBe('b');
    h = undo(h);
    expect(h.present).toBe('a');
    expect(canUndo(h)).toBe(false);
    h = redo(h);
    expect(h.present).toBe('b');
    expect(canRedo(h)).toBe(true);
  });

  it('efface le futur après une nouvelle modification', () => {
    let h = commit(commit(createHistory(1), 2), 3);
    h = commit(undo(h), 9);
    expect(h.future).toEqual([]);
    expect(canRedo(h)).toBe(false);
  });

  it('fusionne la frappe rapprochée dans un même bloc', () => {
    let h = createHistory('');
    h = commit(h, 'B', { coalesce: 'text:1', now: 0 });
    h = commit(h, 'Bo', { coalesce: 'text:1', now: 400 });
    h = commit(h, 'Bon', { coalesce: 'text:1', now: 800 });
    expect(h.past).toEqual(['']);
    h = commit(h, 'Bonjour', { coalesce: 'text:1', now: 5000 });
    expect(h.past).toEqual(['', 'Bon']);
    h = commit(h, 'X', { coalesce: 'text:2', now: 5100 });
    expect(h.past).toEqual(['', 'Bon', 'Bonjour']);
  });

  it('ignore un état identique et limite la taille', () => {
    const h = createHistory('a');
    expect(commit(h, 'a')).toBe(h);
    let big = createHistory(0);
    for (let i = 1; i <= 10; i++) big = commit(big, i, { limit: 3 });
    expect(big.past).toEqual([7, 8, 9]);
  });
});
