import type { Editor } from './editor';
import { listBlocks } from '../core/registry';
import { createDocument, parseDocument } from '../core/document';
import { h } from '../core/dom';
import { download, exportHtml, exportJson, slugify } from './export';

const DESIGN_SYSTEMS: [string, string][] = [
  ['iris', 'Iris'],
  ['clair', 'Clair'],
];

/** Une seule barre, sobre : ajouter, annuler, style, mode, fichier. */
export function mountTopbar(editor: Editor): HTMLElement {
  const title = h('input', { class: 'aime-title', type: 'text', 'aria-label': 'Titre du document', spellcheck: 'false' });
  title.addEventListener('change', () => editor.apply({ ...editor.doc, title: title.value.trim() || 'Sans titre' }));
  title.addEventListener('keydown', (e) => e.key === 'Enter' && title.blur());

  const addButtons = listBlocks().map((def) =>
    h(
      'button',
      { type: 'button', class: 'aime-btn', title: def.description, onclick: () => editor.addBlock(def.type) },
      h('span', { class: 'aime-btn__icon', 'aria-hidden': 'true' }, def.icon),
      h('span', { class: 'aime-btn__label' }, def.label),
    ),
  );

  const undoBtn = h('button', { type: 'button', class: 'aime-btn', title: 'Annuler (Ctrl/⌘ + Z)', 'aria-label': 'Annuler', onclick: () => editor.undo() }, '↶');
  const redoBtn = h('button', { type: 'button', class: 'aime-btn', title: 'Refaire (Ctrl/⌘ + Maj + Z)', 'aria-label': 'Refaire', onclick: () => editor.redo() }, '↷');

  const dsButtons = DESIGN_SYSTEMS.map(([id, label]) =>
    h('button', { type: 'button', 'data-ds-option': id, onclick: () => editor.apply({ ...editor.doc, designSystem: id }) }, label),
  );
  const modeButtons = (
    [
      ['edit', 'Éditer'],
      ['view', 'Voir'],
    ] as const
  ).map(([mode, label]) => h('button', { type: 'button', 'data-mode': mode, onclick: () => editor.setMode(mode) }, label));

  const importInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    importInput.value = '';
    if (!file) return;
    try {
      editor.apply(parseDocument(JSON.parse(await file.text())));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ce fichier ne peut pas être importé.');
    }
  });

  const menu = h('details', { class: 'aime-menu' });
  const closeMenu = () => menu.removeAttribute('open');
  menu.append(
    h('summary', {}, 'Fichier'),
    h(
      'div',
      { class: 'aime-menu__panel' },
      h('button', { type: 'button', onclick: () => (closeMenu(), download(`${slugify(editor.doc.title)}.html`, exportHtml(editor.doc), 'text/html')) }, 'Publier en page HTML'),
      h('button', { type: 'button', onclick: () => (closeMenu(), download(`${slugify(editor.doc.title)}.aime.json`, exportJson(editor.doc), 'application/json')) }, 'Exporter le document (JSON)'),
      h('button', { type: 'button', onclick: () => (closeMenu(), importInput.click()) }, 'Importer un document…'),
      h(
        'button',
        {
          type: 'button',
          onclick: () => {
            closeMenu();
            if (confirm('Repartir d’une page vide ? (Ctrl/⌘ + Z pour revenir en arrière)')) editor.apply(createDocument());
          },
        },
        'Nouvelle page vide',
      ),
    ),
    importInput,
  );
  document.addEventListener('pointerdown', (e) => !menu.contains(e.target as Node) && closeMenu());

  const status = h('span', { class: 'aime-status', role: 'status' });

  const bar = h(
    'header',
    { class: 'aime-topbar' },
    h('div', { class: 'aime-brand' }, h('span', { class: 'aime-brand__orb', 'aria-hidden': 'true' }), 'AIME', h('small', {}, 'NEW')),
    title,
    h('div', { class: 'aime-group', 'data-edit-only': '' }, ...addButtons),
    h('div', { class: 'aime-group', 'data-edit-only': '' }, undoBtn, redoBtn),
    h('span', { class: 'aime-spacer' }),
    h('span', { 'data-edit-only': '' }, status),
    h('div', { class: 'aime-seg', role: 'group', 'aria-label': 'Design System' }, ...dsButtons),
    h('div', { class: 'aime-seg', role: 'group', 'aria-label': 'Mode' }, ...modeButtons),
    menu,
  );

  const update = () => {
    if (document.activeElement !== title) title.value = editor.doc.title;
    undoBtn.disabled = !editor.canUndo;
    redoBtn.disabled = !editor.canRedo;
    dsButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.dsOption === editor.doc.designSystem)));
    modeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === editor.mode)));
    status.textContent =
      editor.saveState === 'error'
        ? 'Non enregistré — stockage du navigateur plein'
        : editor.saveState === 'pending'
          ? 'Enregistrement…'
          : 'Enregistré dans ce navigateur';
    status.classList.toggle('is-error', editor.saveState === 'error');
  };
  editor.subscribe(update);
  update();
  return bar;
}
