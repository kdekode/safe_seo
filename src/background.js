/**
 * Al pulsar el icono se abre (o cierra) el panel SEO sobre la página y se
 * pinta de inmediato el punto de indexabilidad en el icono.
 * El panel es un iframe de la propia extensión; `use_dynamic_url` hace que su
 * URL cambie en cada sesión para que las webs no puedan detectar la extensión.
 */
import { setIndexDot } from '../panel/badge.js';
import { indexability } from '../panel/indexability.js';
import { collectGeneral } from './collectors/general.js';
import { DEFAULT_TITLE, PANEL_ID } from './shared.js';

/** Se inyecta en la página: debe ser autocontenida. Devuelve true si abre el panel. */
function togglePanel(src, id) {
  const existing = document.getElementById(id);
  if (existing) {
    existing.remove();
    return false;
  }
  const frame = document.createElement('iframe');
  frame.id = id;
  frame.src = src;
  frame.title = 'Safe SEO';
  const styles = {
    all: 'initial',
    position: 'fixed',
    top: '0',
    right: '0',
    width: '30vw',
    'min-width': 'min(400px, 100vw)',
    height: '100vh',
    border: '0',
    'z-index': '2147483647',
    'color-scheme': 'normal',
    'backdrop-filter': 'blur(12px)',
    'box-shadow': '-1px 0 0 rgba(15,26,51,.35)',
  };
  for (const [prop, value] of Object.entries(styles)) frame.style.setProperty(prop, value, 'important');
  document.documentElement.append(frame);
  return true;
}

/** Se inyecta en la página: lee el veredicto guardado en el iframe del panel (si sigue ahí). */
function readState(id) {
  return document.getElementById(id)?.getAttribute('data-state') ?? null;
}

/** Veredicto rápido (solo con el HTML de la página); el panel lo afina después con robots.txt y cabeceras. */
async function quickVerdict(tabId) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func: collectGeneral });
    await setIndexDot(tabId, indexability(result).state);
  } catch {
    /* sin datos: el panel lo calculará */
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  try {
    const [{ result: opened }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: togglePanel,
      args: [`${chrome.runtime.getURL('panel/panel.html')}?tab=${tab.id}`, PANEL_ID],
    });
    if (opened) await quickVerdict(tab.id);
  } catch {
    // Páginas internas, Chrome Web Store, etc.: avisamos con una marca en el icono.
    await chrome.action.setBadgeText({ tabId: tab.id, text: '✕' });
    setTimeout(() => chrome.action.setBadgeText({ tabId: tab.id, text: '' }).catch(() => {}), 2000);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.status === 'loading') {
    // Cualquier carga restablece el icono; se repinta si el panel sigue en la página.
    chrome.action.setIcon({ tabId, path: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png' } }).catch(() => {});
    chrome.action.setTitle({ tabId, title: DEFAULT_TITLE }).catch(() => {});
  } else if (info.status === 'complete') {
    try {
      // Tras navegar el acceso temporal se pierde (la llamada falla) o el panel ya no existe (null): se queda el icono normal.
      const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func: readState, args: [PANEL_ID] });
      if (result) await setIndexDot(tabId, result);
    } catch {
      /* sin acceso a la pestaña */
    }
  }
});
