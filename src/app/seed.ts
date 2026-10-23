import type { AimeDocument, BlockNode } from '../core/types';
import { addBlock, createDocument } from '../core/document';

/** La page de départ : elle explique le système en étant faite avec lui. */

const IRIS_IMAGE =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800">
  <defs>
    <radialGradient id="a" cx="25%" cy="20%" r="70%"><stop offset="0" stop-color="#ffb6c9"/><stop offset="1" stop-color="#ffb6c9" stop-opacity="0"/></radialGradient>
    <radialGradient id="b" cx="80%" cy="45%" r="65%"><stop offset="0" stop-color="#9fe2ff"/><stop offset="1" stop-color="#9fe2ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="c" cx="40%" cy="85%" r="60%"><stop offset="0" stop-color="#ffe7a6"/><stop offset="1" stop-color="#ffe7a6" stop-opacity="0"/></radialGradient>
    <radialGradient id="d" cx="55%" cy="40%" r="35%"><stop offset="0" stop-color="#c8b4ff"/><stop offset="1" stop-color="#c8b4ff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="600" height="800" fill="#16161d"/>
  <rect width="600" height="800" fill="url(#a)"/><rect width="600" height="800" fill="url(#b)"/>
  <rect width="600" height="800" fill="url(#c)"/><rect width="600" height="800" fill="url(#d)"/>
  <g fill="none" stroke="#0d0d11" stroke-opacity=".22">
    ${Array.from({ length: 7 }, (_, i) => `<line x1="${(i + 1) * 75}" y1="0" x2="${(i + 1) * 75}" y2="800"/>`).join('')}
    ${Array.from({ length: 9 }, (_, i) => `<line x1="0" y1="${(i + 1) * 80}" x2="600" y2="${(i + 1) * 80}"/>`).join('')}
  </g>
</svg>`);

const text = (id: string, text: string, variant: string, col: number, row: number, colSpan: number, rowSpan = 1): BlockNode => ({
  id,
  type: 'text',
  props: { text, variant, align: 'start' },
  place: { col, row, colSpan, rowSpan },
});

export function seedDocument(): AimeDocument {
  let doc = createDocument('Page zéro');

  doc = addBlock(doc, 'root', text('intro_kicker', 'AIME NEW — V0', 'legende', 1, 1, 6));
  doc = addBlock(doc, 'root', text('intro_title', 'Une grille.\nDes blocs.\nTout le reste.', 'titre', 1, 2, 7, 3));
  doc = addBlock(
    doc,
    'root',
    text(
      'intro_body',
      'Chaque page est une grille, chaque élément est un bloc. Touchez un texte pour l’écrire, attrapez la pastille iris pour déplacer un bloc, tirez le coin pour l’agrandir. Tout est enregistré dans votre navigateur.',
      'texte',
      1,
      5,
      6,
      2,
    ),
  );
  doc = addBlock(doc, 'root', {
    id: 'intro_image',
    type: 'image',
    props: { src: IRIS_IMAGE, alt: 'Dégradé iridescent posé sur une grille', fit: 'cover' },
    place: { col: 8, row: 2, colSpan: 5, rowSpan: 6 },
  });

  doc = addBlock(doc, 'root', {
    id: 'layers',
    type: 'container',
    props: { columns: 3, gap: 16, rowHeight: 48, padding: 28, tone: 'surface' },
    place: { col: 1, row: 8, colSpan: 12, rowSpan: 3 },
    children: [],
  });
  const layers: [string, string][] = [
    ['01 — Le document', 'Un simple fichier JSON : un arbre de blocs. C’est la seule source de vérité.'],
    ['02 — La grille', 'Colonnes, lignes, imbrication. Chaque grille se replie selon SA largeur.'],
    ['03 — Les blocs', 'Un même contrat pour tous : données, rendu, édition sur place, capacités.'],
  ];
  // Chaque colonne est elle-même une petite grille : sur mobile, titre et texte restent ensemble.
  layers.forEach(([title, body], i) => {
    const col = `layer_${i}`;
    doc = addBlock(doc, 'layers', {
      id: col,
      type: 'container',
      props: { columns: 1, gap: 12, rowHeight: 32, padding: 0, tone: 'none' },
      place: { col: i + 1, row: 1, colSpan: 1, rowSpan: 3 },
      children: [],
    });
    doc = addBlock(doc, col, text(`${col}_t`, title, 'legende', 1, 1, 1));
    doc = addBlock(doc, col, text(`${col}_b`, body, 'texte', 1, 2, 1, 2));
  });

  doc = addBlock(doc, 'root', text('outro', 'Le style est un Design System à part : essayez « Clair » dans la barre du haut, le contenu ne bouge pas.', 'texte', 1, 12, 8));

  return { ...doc, updatedAt: new Date().toISOString() };
}
