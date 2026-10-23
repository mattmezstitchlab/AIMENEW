# AIME NEW

**Une grille. Des blocs. Tout le reste.**

AIME NEW repart de zéro avec une idée unique : chaque page est une grille universelle, et chaque élément est un bloc posé dessus. Le noyau reste minuscule et stable ; tout le reste (types de blocs, styles, publication, IA) se branche autour.

## Démarrer

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests du noyau
npm run build    # vérification des types + build de production dans dist/
```

## Ce que fait la V0

- **Surface unique.** Voir et éditer, c'est le même écran : on touche un texte pour l'écrire, sans fenêtre ni panneau.
- **Grille universelle.** On déplace un bloc avec la pastille iris et on l'agrandit avec le coin, au pas de la grille. Les grilles s'imbriquent sans limite (bloc *Conteneur*).
- **Responsive natif.** Chaque grille se replie en une colonne selon **sa propre largeur** (container queries), dans l'ordre de lecture.
- **Annuler / refaire** illimité (Ctrl/⌘ + Z, Ctrl/⌘ + Maj + Z). La frappe dans un même bloc compte pour une seule étape.
- **Design Systems interchangeables** (Iris, Clair) : le style change, le contenu ne bouge pas.
- **Local-first.** Le document est enregistré automatiquement dans le navigateur.
- **Publication.** *Fichier → Publier en page HTML* produit une page autonome, sans aucun script. Le document s'exporte et se réimporte aussi en JSON.

### Raccourcis (bloc sélectionné)

| Touche | Action |
| --- | --- |
| Flèches | déplacer d'une cellule |
| Maj + flèches | redimensionner |
| Ctrl/⌘ + D | dupliquer |
| Suppr | supprimer |
| Échap | désélectionner |

## Architecture : 4 couches séparées

```
src/
├── core/            le noyau, qui ne dépend d'aucun bloc
│   ├── types.ts       le format du document
│   ├── document.ts    opérations pures : ajouter, modifier, déplacer, dupliquer, supprimer, valider
│   ├── history.ts     annuler / refaire
│   ├── registry.ts    le contrat de bloc
│   ├── render.ts      document → DOM (même rendu en édition et en publication)
│   └── geometry.ts    point à l'écran → cellule de grille
├── blocks/          les blocs : texte, image, conteneur
├── app/             l'éditeur : sélection, glisser, barres, stockage, export
└── styles/          tokens (Design Systems), grille, blocs, éditeur
```

1. **Le document** est un simple JSON : des nœuds stockés à plat, et des grilles qui référencent leurs enfants. C'est la seule source de vérité.
2. **La grille** est la seule « loi physique » : chaque bloc a une position `{ col, row, colSpan, rowSpan }` dans la grille de son parent.
3. **Les blocs** respectent tous le même contrat.
4. **Le style** est un jeu de tokens à part (`data-ds`).

### Le contrat de bloc

```ts
defineBlock({
  type: 'citation',
  label: 'Citation',
  icon: '“',
  description: 'Une citation mise en valeur.',
  capabilities: ['contenu'],
  defaultSize: { colSpan: 6, rowSpan: 2 },
  defaults: () => ({ text: '', auteur: '' }),
  render(props, ctx) {
    // renvoie un élément ; ctx.mode = 'view' | 'edit'
    // ctx.update({ text }) modifie les données du bloc
  },
  actions: (props) => [/* boutons et champs de la barre du bloc */],
});
```

Pour ajouter un bloc, il suffit de créer un fichier dans `src/blocks/` et de l'importer dans `src/blocks/index.ts`. Le noyau n'a pas à être modifié.

### Format du document

```json
{
  "format": "aime/document",
  "version": 1,
  "title": "Page zéro",
  "designSystem": "iris",
  "root": "root",
  "nodes": {
    "root": { "id": "root", "type": "container", "props": { "columns": 12 }, "place": { "col": 1, "row": 1, "colSpan": 12, "rowSpan": 1 }, "children": ["t1"] },
    "t1":   { "id": "t1", "type": "text", "props": { "text": "Bonjour", "variant": "titre" }, "place": { "col": 1, "row": 1, "colSpan": 8, "rowSpan": 2 } }
  }
}
```

Un type de bloc inconnu ne casse pas la page : il s'affiche comme un emplacement réservé, et le document reste compatible.

## Feuille de route

- [x] **V0** : document, grille, 3 blocs, rendu, sauvegarde locale
- [x] **V0.1** : édition en place, annuler/refaire, clavier
- [x] **V0.2** : tokens, 2 Design Systems interchangeables
- [x] **V0.3** : publication en HTML statique (téléchargement)
- [ ] Déplacer un bloc d'une grille à l'autre par glisser (l'opération `moveBlock` existe déjà)
- [ ] Plusieurs pages et navigation
- [ ] Liens causaux entre blocs (« si… alors… », valeurs liées)
- [ ] Blocs riches : formulaire, carte, vidéo, paiement…
- [ ] Publication en ligne avec une vraie URL
- [ ] L'Orbe : une IA qui compose en manipulant le document, jamais le code
