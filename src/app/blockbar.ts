import type { BlockNode } from '../core/types';
import { getBlock, type BlockAction } from '../core/registry';
import { h } from '../core/dom';

const MAX_FILE_BYTES = 2 * 1024 * 1024;

export interface BlockbarHandlers {
  update(patch: Record<string, unknown>): void;
  duplicate(): void;
  remove(): void;
}

/** La barre contextuelle du bloc sélectionné : ses actions + dupliquer / supprimer. */
export function buildBlockbar(node: BlockNode, handlers: BlockbarHandlers): HTMLElement {
  const def = getBlock(node.type);
  const props = def ? { ...def.defaults(), ...node.props } : node.props;
  const bar = h('div', { class: 'aime-blockbar', role: 'toolbar', 'aria-label': `Bloc ${def?.label ?? node.type}` });

  bar.append(h('span', { class: 'aime-blockbar__label' }, def?.label ?? node.type));
  for (const action of def?.actions?.(props) ?? []) bar.append(renderAction(action, handlers.update));
  bar.append(
    h('span', { class: 'aime-blockbar__sep', 'aria-hidden': 'true' }),
    h('button', { type: 'button', title: 'Dupliquer (Ctrl/⌘ + D)', onclick: handlers.duplicate }, 'Dupliquer'),
    h('button', { type: 'button', class: 'is-danger', title: 'Supprimer (Suppr)', onclick: handlers.remove }, 'Supprimer'),
  );
  return bar;
}

function renderAction(action: BlockAction, update: BlockbarHandlers['update']): HTMLElement {
  switch (action.kind) {
    case 'button':
      return h(
        'button',
        {
          type: 'button',
          title: action.title,
          'aria-pressed': action.active === undefined ? undefined : String(action.active),
          onclick: () => update(action.patch),
        },
        action.label,
      );

    case 'label':
      return h('span', { class: 'aime-blockbar__static', title: action.title }, action.label);

    case 'input': {
      const input = h('input', { type: 'text', value: action.value, placeholder: action.placeholder, 'aria-label': action.label });
      const commit = () => {
        if (input.value !== action.value) update({ [action.key]: input.value.trim() });
      };
      input.addEventListener('change', commit);
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') input.blur();
        event.stopPropagation();
      });
      return h('label', { class: 'aime-blockbar__field' }, action.label, input);
    }

    case 'file': {
      const input = h('input', { type: 'file', accept: action.accept });
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > MAX_FILE_BYTES) {
          alert('Image trop lourde pour être gardée dans le navigateur (2 Mo maximum). Utilisez plutôt une adresse web.');
          return;
        }
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' && update({ [action.key]: reader.result });
        reader.readAsDataURL(file);
      });
      return h('label', { class: 'aime-blockbar__file' }, action.label, input);
    }
  }
}
