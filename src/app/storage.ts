import type { AimeDocument } from '../core/types';
import { parseDocument } from '../core/document';

/** Local-first : le document vit dans le navigateur. La synchro viendra plus tard. */

const KEY = 'aime.document.v1';

export function loadDocument(): AimeDocument | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseDocument(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveDocument(doc: AimeDocument): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(doc));
    return true;
  } catch {
    return false;
  }
}
