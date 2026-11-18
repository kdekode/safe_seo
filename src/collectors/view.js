/**
 * Quita o restaura el CSS de la página (hojas de estilo, adoptedStyleSheets y
 * atributos style). Se ejecuta en el mundo aislado; el estado persiste en él
 * entre llamadas. Autocontenido: se inyecta en la página.
 *
 * @param {'status'|'off'|'on'} action
 */
export function cssMode(action = 'status') {
  const KEY = Symbol.for('safe-seo.css');
  const HOST = 'safe-seo-panel-host'; // el iframe del panel conserva su estilo en línea
  let state = window[KEY];

  const report = () => ({ active: Boolean(state), sheets: state?.sheets.length ?? 0, inline: state?.inline.length ?? 0 });
  const disable = (sheet) => {
    if (sheet && !sheet.disabled) {
      sheet.disabled = true;
      state.sheets.push(sheet);
    }
  };

  if (action === 'off' && !state) {
    state = { sheets: [], inline: [], adopted: document.adoptedStyleSheets, observer: null };
    window[KEY] = state;
    for (const sheet of document.styleSheets) disable(sheet);
    document.adoptedStyleSheets = [];
    for (const el of document.querySelectorAll('[style]')) {
      if (el.id === HOST) continue;
      state.inline.push([el, el.getAttribute('style')]);
      el.removeAttribute('style');
    }
    // Hojas añadidas después (p. ej. por JavaScript)
    state.observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.tagName !== 'STYLE' && node.tagName !== 'LINK') continue;
          if (node.sheet) disable(node.sheet);
          else node.addEventListener('load', () => disable(node.sheet), { once: true });
        }
      }
    });
    state.observer.observe(document.documentElement, { childList: true, subtree: true });
  } else if (action === 'on' && state) {
    state.observer.disconnect();
    state.sheets.forEach((sheet) => (sheet.disabled = false));
    document.adoptedStyleSheets = state.adopted;
    state.inline.forEach(([el, value]) => el.isConnected && el.setAttribute('style', value));
    const result = { active: false, sheets: 0, inline: 0 };
    window[KEY] = undefined;
    return result;
  }
  return report();
}
