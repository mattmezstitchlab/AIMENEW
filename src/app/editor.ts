import type { AimeDocument, NodeId, Placement } from '../core/types';
import { canRedo, canUndo, commit, createHistory, redo, undo, type History } from '../core/history';
import * as ops from '../core/document';
import { applyPlacement, renderDocument } from '../core/render';
import { getBlock, type Mode, type UpdateOptions } from '../core/registry';
import { cellAt, readMetrics } from '../core/geometry';
import { uid } from '../core/ids';
import { saveDocument } from './storage';
import { buildBlockbar } from './blockbar';

type SaveState = 'saved' | 'pending' | 'error';

/**
 * La surface unique : voir et éditer, c'est le même écran.
 * L'éditeur tient l'historique, la sélection et le mode ; tout changement
 * de contenu passe par une opération pure du noyau puis par `apply`.
 */
export class Editor {
  private history: History<AimeDocument>;
  selected: NodeId | null = null;
  mode: Mode = 'edit';
  saveState: SaveState = 'saved';

  private renderFrame = 0;
  private saveTimer = 0;
  private pendingScroll: NodeId | null = null;
  private listeners = new Set<() => void>();

  constructor(private host: HTMLElement, doc: AimeDocument) {
    this.history = createHistory(doc);
    host.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('keydown', this.onKeyDown);
    this.renderNow();
  }

  // ─── État ─────────────────────────────────────────────────────────────

  get doc(): AimeDocument {
    return this.history.present;
  }
  get canUndo(): boolean {
    return canUndo(this.history);
  }
  get canRedo(): boolean {
    return canRedo(this.history);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Point d'entrée unique de toute modification du document. */
  apply(next: AimeDocument, opts: UpdateOptions = {}): void {
    if (next === this.doc) return;
    this.history = commit(this.history, next, { coalesce: opts.coalesce });
    this.afterChange(opts.render !== false);
  }

  undo(): void {
    const prev = undo(this.history);
    if (prev === this.history) return;
    this.history = prev;
    this.afterChange(true);
  }

  redo(): void {
    const next = redo(this.history);
    if (next === this.history) return;
    this.history = next;
    this.afterChange(true);
  }

  select(id: NodeId | null): void {
    if (id === this.selected) return;
    this.selected = id;
    this.applySelection();
    this.emit();
  }

  setMode(mode: Mode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    if (mode === 'view') this.selected = null;
    document.body.classList.toggle('is-viewing', mode === 'view');
    this.renderNow();
    this.emit();
  }

  // ─── Commandes ────────────────────────────────────────────────────────

  addBlock(type: string): void {
    const def = getBlock(type);
    if (!def) return;
    const doc = this.doc;
    const selected = this.selected ? doc.nodes[this.selected] : undefined;
    const parentId = selected
      ? ops.isGrid(selected)
        ? selected.id
        : (ops.parentOf(doc, selected.id) ?? doc.root)
      : doc.root;
    const columns = ops.columnsOf(doc.nodes[parentId]);
    const id = uid(type);

    this.selected = id;
    this.pendingScroll = id;
    this.apply(
      ops.addBlock(doc, parentId, {
        id,
        type,
        props: def.defaults(),
        place: {
          col: 1,
          row: ops.nextFreeRow(doc, parentId),
          colSpan: Math.min(def.defaultSize.colSpan, columns),
          rowSpan: def.defaultSize.rowSpan,
        },
        ...(def.isContainer ? { children: [] } : {}),
      }),
    );
  }

  removeSelected(): void {
    const id = this.selected;
    if (!id || id === this.doc.root) return;
    this.selected = null;
    this.apply(ops.removeBlock(this.doc, id));
  }

  duplicateSelected(): void {
    const id = this.selected;
    if (!id || id === this.doc.root) return;
    const result = ops.duplicateBlock(this.doc, id);
    this.selected = result.id;
    this.pendingScroll = result.id;
    this.apply(result.doc);
  }

  updateProps(id: NodeId, patch: Record<string, unknown>, opts?: UpdateOptions): void {
    if (!this.doc.nodes[id]) return;
    this.apply(ops.updateProps(this.doc, id, patch), opts);
  }

  /** Flèches : déplacer d'une cellule. Maj + flèches : redimensionner. */
  private nudge(dx: number, dy: number, resize: boolean): void {
    const id = this.selected;
    if (!id) return;
    const p = this.doc.nodes[id].place;
    const next: Placement = resize
      ? { ...p, colSpan: p.colSpan + dx, rowSpan: p.rowSpan + dy }
      : { ...p, col: p.col + dx, row: p.row + dy };
    this.apply(ops.setPlacement(this.doc, id, next), { coalesce: `nudge:${id}` });
  }

  // ─── Rendu ────────────────────────────────────────────────────────────

  private afterChange(render: boolean): void {
    if (this.selected && !this.doc.nodes[this.selected]) this.selected = null;
    if (render) this.scheduleRender();
    this.queueSave();
    this.emit();
  }

  private scheduleRender(): void {
    if (this.renderFrame) return;
    this.renderFrame = requestAnimationFrame(() => {
      this.renderFrame = 0;
      this.renderNow();
    });
  }

  renderNow(): void {
    if (this.renderFrame) cancelAnimationFrame(this.renderFrame);
    this.renderFrame = 0;
    const surface = renderDocument(this.doc, {
      mode: this.mode,
      onUpdate: (id, patch, opts) => this.updateProps(id, patch, opts),
    });
    this.host.replaceChildren(surface);
    document.body.dataset.ds = this.doc.designSystem;
    document.title = `${this.doc.title} — AIME`;
    this.applySelection();

    if (this.pendingScroll) {
      this.cellOf(this.pendingScroll)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      this.pendingScroll = null;
    }
  }

  private cellOf(id: NodeId): HTMLElement | null {
    return this.host.querySelector<HTMLElement>(`.aime-cell[data-id="${CSS.escape(id)}"]`);
  }

  /** La sélection ne reconstruit pas la page : on peut écrire dès le premier clic. */
  private applySelection(): void {
    this.host.querySelectorAll('.aime-cell.is-selected').forEach((el) => el.classList.remove('is-selected'));
    this.host.querySelectorAll('.aime-blockbar').forEach((el) => el.remove());
    if (!this.selected || this.mode !== 'edit') return;

    const cell = this.cellOf(this.selected);
    const node = this.doc.nodes[this.selected];
    if (!cell || !node) return;

    cell.classList.add('is-selected');
    const bar = buildBlockbar(node, {
      update: (patch) => this.updateProps(node.id, patch),
      duplicate: () => this.duplicateSelected(),
      remove: () => this.removeSelected(),
    });
    cell.append(bar);
    const ceiling = (document.querySelector('.aime-topbar')?.getBoundingClientRect().bottom ?? 0) + 6;
    if (bar.getBoundingClientRect().top < ceiling) bar.classList.add('is-below');
    // Rester dans l'écran : décaler la barre vers la gauche si elle déborde.
    const overflow = bar.getBoundingClientRect().right - (document.documentElement.clientWidth - 8);
    if (overflow > 0) bar.style.translate = `-${Math.ceil(overflow)}px 0`;
  }

  // ─── Sauvegarde ───────────────────────────────────────────────────────

  private queueSave(): void {
    this.saveState = 'pending';
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      this.saveState = saveDocument(this.doc) ? 'saved' : 'error';
      this.emit();
    }, 300);
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }

  // ─── Interactions ─────────────────────────────────────────────────────

  private onPointerDown = (event: PointerEvent): void => {
    if (this.mode !== 'edit' || event.button > 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('.aime-blockbar')) return;

    const cell = target.closest<HTMLElement>('.aime-cell');
    const id = cell?.dataset.id ?? null;
    const handle = target.closest<HTMLElement>('[data-handle]');

    if (handle && cell && id) {
      event.preventDefault();
      this.select(id);
      this.startDrag(event, id, handle.dataset.handle === 'resize' ? 'resize' : 'move', cell);
      return;
    }
    this.select(id && id !== this.doc.root ? id : null);
  };

  private startDrag(event: PointerEvent, id: NodeId, kind: 'move' | 'resize', cell: HTMLElement): void {
    const grid = cell.parentElement;
    if (!grid?.classList.contains('aime-grid') || !grid.dataset.grid) return;
    const parent = this.doc.nodes[grid.dataset.grid];
    const columns = ops.columnsOf(parent);
    const rowHeight = typeof parent.props.rowHeight === 'number' ? parent.props.rowHeight : 56;

    const start = this.doc.nodes[id].place;
    const origin = cellAt(event.clientX, event.clientY, readMetrics(grid, rowHeight));
    let current = start;

    grid.classList.add('is-guiding');
    cell.classList.add('is-dragging');
    document.body.classList.add('is-dragging');

    const onMove = (ev: PointerEvent) => {
      const at = cellAt(ev.clientX, ev.clientY, readMetrics(grid, rowHeight));
      const raw: Placement =
        kind === 'move'
          ? { ...start, col: start.col + at.col - origin.col, row: start.row + at.row - origin.row }
          : { ...start, colSpan: at.col - start.col + 1, rowSpan: at.row - start.row + 1 };
      const next = ops.clampPlacement(raw, columns);
      if (ops.samePlacement(next, current)) return;
      current = next;
      applyPlacement(cell, next); // aperçu direct, sans re-rendu
    };

    const onEnd = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      grid.classList.remove('is-guiding');
      cell.classList.remove('is-dragging');
      document.body.classList.remove('is-dragging');
      if (!ops.samePlacement(current, start)) this.apply(ops.setPlacement(this.doc, id, current));
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    const mod = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();

    if (mod && key === 'z') {
      event.preventDefault();
      if (event.shiftKey) this.redo();
      else this.undo();
      return;
    }
    if (mod && key === 'y') {
      event.preventDefault();
      this.redo();
      return;
    }
    if (this.mode !== 'edit') return;

    const target = event.target as HTMLElement | null;
    const typing = !!target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
    if (typing) {
      if (event.key === 'Escape') target!.blur();
      return;
    }
    if (!this.selected) return;

    if (mod && key === 'd') {
      event.preventDefault();
      this.duplicateSelected();
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.removeSelected();
    } else if (event.key === 'Escape') {
      this.select(null);
    } else if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      const dx = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
      const dy = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
      this.nudge(dx, dy, event.shiftKey);
    }
  };
}
