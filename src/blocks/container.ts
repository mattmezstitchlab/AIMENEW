import { defineBlock } from '../core/registry';
import { h } from '../core/dom';

type Tone = 'none' | 'surface' | 'accent';

export type ContainerProps = {
  columns: number;
  gap: number;
  rowHeight: number;
  padding: number;
  tone: Tone;
};

const TONES: [Tone, string][] = [
  ['none', 'Transparent'],
  ['surface', 'Surface'],
  ['accent', 'Iris'],
];

/** Une grille dans la grille : c'est ce bloc qui rend la mise en page infiniment imbriquable. */
export const containerBlock = defineBlock<ContainerProps>({
  type: 'container',
  label: 'Conteneur',
  icon: '▦',
  description: 'Une grille imbriquée qui accueille d’autres blocs.',
  capabilities: ['grille'],
  defaultSize: { colSpan: 12, rowSpan: 3 },
  isContainer: true,
  defaults: () => ({ columns: 6, gap: 16, rowHeight: 48, padding: 24, tone: 'surface' }),

  render(props, ctx) {
    const section = h('section', {
      class: `b-container b-container--${props.tone}`,
      style: { '--pad': `${props.padding}px` },
    });
    const grid = ctx.renderChildren();
    if (grid) section.append(grid);
    if (ctx.mode === 'edit' && !ctx.node.children?.length) {
      section.append(h('p', { class: 'b-container__hint' }, 'Conteneur vide — sélectionnez-le puis ajoutez un bloc'));
    }
    return section;
  },

  actions: (props) => [
    { kind: 'button', label: '−', title: 'Moins de colonnes', patch: { columns: Math.max(1, props.columns - 1) } },
    { kind: 'label', label: `${props.columns} col.`, title: 'Colonnes de cette grille' },
    { kind: 'button', label: '+', title: 'Plus de colonnes', patch: { columns: Math.min(24, props.columns + 1) } },
    ...TONES.map(([tone, label]) => ({
      kind: 'button' as const,
      label,
      active: props.tone === tone,
      patch: { tone },
    })),
  ],
});
