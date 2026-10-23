/**
 * Historique immuable : un passé, un présent, un futur.
 * Les modifications rapprochées portant la même clé (ex. la frappe dans
 * un même bloc texte) sont fusionnées en une seule étape d'annulation.
 */

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  lastKey?: string;
  lastAt?: number;
}

export interface CommitOptions {
  coalesce?: string;
  now?: number;
  limit?: number;
}

const COALESCE_WINDOW_MS = 1500;
const DEFAULT_LIMIT = 200;

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

export function commit<T>(history: History<T>, next: T, opts: CommitOptions = {}): History<T> {
  if (Object.is(next, history.present)) return history;
  const now = opts.now ?? Date.now();
  const merge =
    opts.coalesce !== undefined &&
    opts.coalesce === history.lastKey &&
    history.lastAt !== undefined &&
    now - history.lastAt < COALESCE_WINDOW_MS;

  const past = merge
    ? history.past
    : [...history.past, history.present].slice(-(opts.limit ?? DEFAULT_LIMIT));

  return { past, present: next, future: [], lastKey: opts.coalesce, lastAt: now };
}

export function undo<T>(history: History<T>): History<T> {
  if (!history.past.length) return history;
  return {
    past: history.past.slice(0, -1),
    present: history.past[history.past.length - 1],
    future: [history.present, ...history.future],
  };
}

export function redo<T>(history: History<T>): History<T> {
  if (!history.future.length) return history;
  return {
    past: [...history.past, history.present],
    present: history.future[0],
    future: history.future.slice(1),
  };
}

export const canUndo = <T>(h: History<T>) => h.past.length > 0;
export const canRedo = <T>(h: History<T>) => h.future.length > 0;
