import { defineBlock } from '../core/registry';
import { h } from '../core/dom';

export type ImageProps = {
  src: string;
  alt: string;
  fit: 'cover' | 'contain';
};

/** Seules les adresses web et les images intégrées sont acceptées. */
export function safeImageSrc(src: string): string | null {
  const value = src.trim();
  return /^(https?:\/\/|data:image\/|blob:)/i.test(value) ? value : null;
}

export const imageBlock = defineBlock<ImageProps>({
  type: 'image',
  label: 'Image',
  icon: '▲',
  description: 'Une image depuis une adresse web ou un fichier de votre ordinateur.',
  capabilities: ['média'],
  defaultSize: { colSpan: 4, rowSpan: 4 },
  defaults: () => ({ src: '', alt: '', fit: 'cover' }),

  render(props) {
    const src = safeImageSrc(props.src);
    const figure = h('figure', { class: 'b-image', style: { '--fit': props.fit } });
    figure.append(
      src
        ? h('img', { src, alt: props.alt, loading: 'lazy', decoding: 'async', draggable: 'false' })
        : h('div', { class: 'b-image__empty' }, 'Image — ajoutez une adresse ou un fichier depuis la barre du bloc'),
    );
    return figure;
  },

  actions: (props) => [
    { kind: 'file', label: 'Fichier…', key: 'src', accept: 'image/*' },
    { kind: 'input', label: 'Adresse', key: 'src', value: props.src.startsWith('data:') ? '' : props.src, placeholder: 'https://…' },
    { kind: 'input', label: 'Description', key: 'alt', value: props.alt, placeholder: 'Pour les lecteurs d’écran' },
    { kind: 'button', label: 'Remplir', active: props.fit === 'cover', patch: { fit: 'cover' } },
    { kind: 'button', label: 'Contenir', active: props.fit === 'contain', patch: { fit: 'contain' } },
  ],
});
