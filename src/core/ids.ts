/** Identifiant court et lisible, unique à l'échelle d'un document. */
export function uid(prefix = 'b'): string {
  const random =
    globalThis.crypto?.randomUUID?.().replace(/-/g, '').slice(0, 10) ??
    Math.random().toString(36).slice(2, 12);
  return `${prefix}_${random}`;
}
