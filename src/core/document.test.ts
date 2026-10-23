import { describe, expect, it } from 'vitest';
import {
  addBlock,
  clampPlacement,
  createDocument,
  descendants,
  duplicateBlock,
  moveBlock,
  nextFreeRow,
  parentOf,
  parseDocument,
  removeBlock,
  setPlacement,
  updateProps,
} from './document';
import type { AimeDocument, BlockNode } from './types';

const text = (id: string, col = 1, row = 1, colSpan = 4): BlockNode => ({
  id,
  type: 'text',
  props: { text: id },
  place: { col, row, colSpan, rowSpan: 1 },
});

const box = (id: string, columns = 4): BlockNode => ({
  id,
  type: 'container',
  props: { columns },
  place: { col: 1, row: 5, colSpan: 12, rowSpan: 2 },
  children: [],
});

function sample(): AimeDocument {
  let doc = createDocument('Test');
  doc = addBlock(doc, 'root', text('a'));
  doc = addBlock(doc, 'root', text('b', 5, 2));
  doc = addBlock(doc, 'root', box('box'));
  doc = addBlock(doc, 'box', text('c', 1, 1, 2));
  return doc;
}

describe('document', () => {
  it('ajoute des blocs sans modifier le document d’origine', () => {
    const empty = createDocument();
    const next = addBlock(empty, 'root', text('a'));
    expect(empty.nodes.root.children).toEqual([]);
    expect(next.nodes.root.children).toEqual(['a']);
    expect(next.nodes.a.type).toBe('text');
  });

  it('refuse d’ajouter dans un bloc qui n’est pas une grille', () => {
    const doc = sample();
    expect(() => addBlock(doc, 'a', text('z'))).toThrow();
  });

  it('borne le placement à la grille du parent', () => {
    expect(clampPlacement({ col: 11, row: 0, colSpan: 6, rowSpan: 0 }, 12)).toEqual({
      col: 7,
      row: 1,
      colSpan: 6,
      rowSpan: 1,
    });
    expect(clampPlacement({ col: 1, row: 1, colSpan: 99, rowSpan: 1 }, 4).colSpan).toBe(4);
    const doc = addBlock(sample(), 'box', text('wide', 1, 1, 12));
    expect(doc.nodes.wide.place.colSpan).toBe(4);
  });

  it('calcule la première ligne libre', () => {
    expect(nextFreeRow(sample(), 'root')).toBe(7);
    expect(nextFreeRow(createDocument(), 'root')).toBe(1);
  });

  it('modifie les données et renvoie le même document si rien ne change', () => {
    const doc = sample();
    expect(updateProps(doc, 'a', { text: 'a' })).toBe(doc);
    expect(updateProps(doc, 'a', { text: 'nouveau' }).nodes.a.props.text).toBe('nouveau');
  });

  it('garde les enfants dans la grille quand elle perd des colonnes', () => {
    let doc = sample();
    doc = setPlacement(doc, 'c', { col: 3, row: 1, colSpan: 2, rowSpan: 1 });
    doc = updateProps(doc, 'box', { columns: 2 });
    expect(doc.nodes.c.place).toMatchObject({ col: 1, colSpan: 2 });
  });

  it('déplace un bloc dans la grille', () => {
    const doc = setPlacement(sample(), 'a', { col: 3, row: 4, colSpan: 2, rowSpan: 2 });
    expect(doc.nodes.a.place).toEqual({ col: 3, row: 4, colSpan: 2, rowSpan: 2 });
    expect(setPlacement(doc, 'root', { col: 2, row: 2, colSpan: 1, rowSpan: 1 })).toBe(doc);
  });

  it('supprime un bloc et tout son contenu', () => {
    const doc = removeBlock(sample(), 'box');
    expect(doc.nodes.box).toBeUndefined();
    expect(doc.nodes.c).toBeUndefined();
    expect(doc.nodes.root.children).toEqual(['a', 'b']);
    expect(() => removeBlock(doc, 'root')).toThrow();
  });

  it('change un bloc de grille, sans boucle possible', () => {
    let doc = moveBlock(sample(), 'a', 'box');
    expect(parentOf(doc, 'a')).toBe('box');
    expect(doc.nodes.root.children).not.toContain('a');
    expect(doc.nodes.a.place.colSpan).toBeLessThanOrEqual(4);
    doc = addBlock(doc, 'box', box('inner', 2));
    expect(() => moveBlock(doc, 'box', 'inner')).toThrow();
  });

  it('duplique un bloc avec tout son contenu, sous l’original', () => {
    const source = sample();
    const { doc, id } = duplicateBlock(source, 'box');
    expect(id).not.toBe('box');
    expect(doc.nodes.root.children).toEqual(['a', 'b', 'box', id]);
    expect(doc.nodes[id].place.row).toBe(7);
    const copies = descendants(doc, id);
    expect(copies).toHaveLength(1);
    expect(copies[0]).not.toBe('c');
    expect(doc.nodes[copies[0]].props.text).toBe('c');
  });

  it('valide un document importé et rejette les documents abîmés', () => {
    const doc = sample();
    expect(parseDocument(JSON.parse(JSON.stringify(doc))).nodes.c.props.text).toBe('c');
    expect(() => parseDocument({ format: 'autre' })).toThrow(/format/);
    const broken = structuredClone(doc);
    broken.nodes.root.children!.push('fantome');
    expect(() => parseDocument(broken)).toThrow(/fantome/);
    const loop = structuredClone(doc);
    loop.nodes.box.children!.push('a');
    expect(() => parseDocument(loop)).toThrow(/deux fois/);
  });
});
