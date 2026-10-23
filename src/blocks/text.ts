import { defineBlock } from '../core/registry';
import { h } from '../core/dom';

type Variant = 'titre' | 'texte' | 'legende';
type Align = 'start' | 'center' | 'end';

export type TextProps = {
  text: string;
  variant: Variant;
  align: Align;
};

const VARIANTS: [Variant, string][] = [
  ['titre', 'Titre'],
  ['texte', 'Texte'],
  ['legende', 'Légende'],
];

const ALIGNS: [Align, string, string][] = [
  ['start', '⇤', 'Aligner à gauche'],
  ['center', '↔', 'Centrer'],
  ['end', '⇥', 'Aligner à droite'],
];

export const textBlock = defineBlock<TextProps>({
  type: 'text',
  label: 'Texte',
  icon: 'T',
  description: 'Un titre, un paragraphe ou une légende, modifiable directement sur la page.',
  capabilities: ['contenu'],
  defaultSize: { colSpan: 6, rowSpan: 1 },
  defaults: () => ({ text: 'Écrivez ici…', variant: 'texte', align: 'start' }),

  render(props, ctx) {
    const el = h(props.variant === 'titre' ? 'h2' : 'p', {
      class: `b-text b-text--${props.variant}`,
      style: { 'text-align': props.align },
    });
    el.textContent = props.text;

    if (ctx.mode === 'edit') {
      // Texte brut uniquement : rien de collé ne peut injecter de mise en forme ou de code.
      el.contentEditable = 'plaintext-only';
      if (el.contentEditable !== 'plaintext-only') {
        el.contentEditable = 'true';
        el.addEventListener('paste', (event) => {
          event.preventDefault();
          const pasted = event.clipboardData?.getData('text/plain') ?? '';
          document.execCommand('insertText', false, pasted);
        });
      }
      el.spellcheck = true;
      el.setAttribute('aria-label', `${props.variant === 'titre' ? 'Titre' : 'Texte'} modifiable`);
      el.addEventListener('input', () => {
        ctx.update({ text: el.innerText.replace(/\n$/, '') }, { render: false, coalesce: `text:${ctx.node.id}` });
      });
    }
    return el;
  },

  actions: (props) => [
    ...VARIANTS.map(([variant, label]) => ({
      kind: 'button' as const,
      label,
      active: props.variant === variant,
      patch: { variant },
    })),
    ...ALIGNS.map(([align, label, title]) => ({
      kind: 'button' as const,
      label,
      title,
      active: props.align === align,
      patch: { align },
    })),
  ],
});
