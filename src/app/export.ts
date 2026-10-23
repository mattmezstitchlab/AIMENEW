import type { AimeDocument } from '../core/types';
import { renderDocument } from '../core/render';
import tokensCss from '../styles/tokens.css?inline';
import gridCss from '../styles/grid.css?inline';
import blocksCss from '../styles/blocks.css?inline';

/** Le même document, publié en une page HTML autonome : aucune dépendance, aucun script. */
export function exportHtml(doc: AimeDocument): string {
  const surface = renderDocument(doc, { mode: 'view' });
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="AIME NEW">
<title>${escapeHtml(doc.title)}</title>
<style>
${tokensCss}
${gridCss}
${blocksCss}
html, body { margin: 0; min-height: 100%; }
</style>
</head>
<body data-ds="${escapeHtml(doc.designSystem)}">
${surface.outerHTML}
</body>
</html>
`;
}

export function exportJson(doc: AimeDocument): string {
  return JSON.stringify(doc, null, 2);
}

export function download(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'page'
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
