/**
 * Al pulsar el icono se abre (o cierra) el panel SEO sobre la página.
 * El panel es un iframe de la propia extensión; `use_dynamic_url` hace que su
 * URL cambie en cada sesión para que las webs no puedan detectar la extensión.
 */
const PANEL_ID = 'safe-seo-panel-host';

/** Se inyecta en la página: debe ser autocontenida. */
function togglePanel(src, id) {
  const existing = document.getElementById(id);
  if (existing) {
    existing.remove();
    return;
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
    width: '25vw',
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
}

chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: togglePanel,
      args: [`${chrome.runtime.getURL('panel/panel.html')}?tab=${tab.id}`, PANEL_ID],
    });
  } catch {
    // Páginas internas, Chrome Web Store, etc.: avisamos con una marca en el icono.
    await chrome.action.setBadgeText({ tabId: tab.id, text: '✕' });
    setTimeout(() => chrome.action.setBadgeText({ tabId: tab.id, text: '' }).catch(() => {}), 2000);
  }
});
