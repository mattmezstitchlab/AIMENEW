# AIME NEW — règles du repo

Projet de Matt : une grille universelle à blocs, repartie de zéro. Interface et textes en **français**.

## Principes à ne pas casser

- **Le noyau (`src/core/`) ne dépend d'aucun bloc** et ne connaît aucun type de bloc. Seule convention partagée : un nœud avec `children` est une grille, et `props.columns`, `props.gap` et `props.rowHeight` la décrivent.
- **Le document JSON est la seule source de vérité.** Toute modification passe par une fonction pure de `core/document.ts`, puis par `Editor.apply()`. On ne modifie jamais un document en place.
- **Une seule surface.** Pas de fenêtres, de Dock ni de Bureau : l'édition se fait sur la page, et la barre du bloc sélectionné porte ses actions.
- **Le contenu ne référence jamais un style.** Couleurs et polices passent par les tokens de `styles/tokens.css` (`data-ds`).
- **Tous les blocs suivent le même contrat** (`core/registry.ts`). Un nouveau bloc = un fichier dans `src/blocks/` + un import dans `src/blocks/index.ts`.
- La page publiée (`app/export.ts`) ne contient aucun script.
- Pas de Supabase.

## Vérifier avant de pousser

```bash
npm test && npm run build
```
