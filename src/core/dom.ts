type Child = Node | string | number | null | undefined | false;

/**
 * Petit créateur d'éléments, sans framework.
 * - `class` → className
 * - `style` (objet) → propriétés CSS, y compris les variables `--x`
 * - `onclick`, `oninput`… (fonction) → écouteur d'événement
 * - `value`, `textContent` → propriété
 * - le reste → attribut (true = attribut vide, false/null/undefined = absent)
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, unknown> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') el.className = String(value);
    else if (key === 'style' && typeof value === 'object') {
      for (const [prop, v] of Object.entries(value as Record<string, unknown>)) {
        if (v !== undefined && v !== null) el.style.setProperty(prop, String(v));
      }
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (key === 'value' || key === 'textContent') {
      Reflect.set(el, key, value);
    } else {
      el.setAttribute(key, value === true ? '' : String(value));
    }
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(typeof child === 'number' ? String(child) : child);
  }
  return el;
}
