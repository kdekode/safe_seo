import { TABS } from './tabs/index.js';
import { button, empty, h } from './ui.js';
import { USER_AGENTS, clearRule, hasAccess, requestAccess, revokeAccess, withUserAgent } from './ua.js';

const PANEL_ID = 'safe-seo-panel-host';
const $ = (id) => document.getElementById(id);
const tablist = $('tabs');
const panel = $('panel');

const uabar = $('uabar');
const state = { tab: null, cache: new Map(), selected: null, token: 0, ua: 'default' };
const currentUa = () => USER_AGENTS.find((u) => u.id === state.ua);

/** Ejecuta el colector de una pestaña en la página (una sola vez, con caché). */
function collect(def) {
  const ua = def.usesUa ? currentUa() : null;
  const key = ua ? `${def.id}:${ua.id}` : def.id;
  if (!state.cache.has(key)) {
    const run = () => chrome.scripting.executeScript({ target: { tabId: state.tab.id }, func: def.collect });
    const task = ua?.value
      ? async () => {
          if (!(await hasAccess(state.tab.url))) throw new Error('Falta el permiso para cambiar el User-Agent en este dominio. Vuelve a elegirlo en el selector.');
          return withUserAgent(state.tab, ua.value, run);
        }
      : run;
    const promise = task()
      .then(([frame]) => {
        if (frame?.result === undefined) throw new Error('La página no devolvió datos.');
        return frame.result;
      })
      .catch((error) => {
        state.cache.delete(key);
        throw error;
      });
    state.cache.set(key, promise);
  }
  return state.cache.get(key);
}

function buildUaBar() {
  const select = h(
    'select',
    { class: 'select', 'aria-label': 'Ver la página como', onchange: onUaChange },
    USER_AGENTS.map((u) => h('option', { value: u.id }, u.label)),
  );
  const revoke = button('Revocar permisos', async () => {
    await revokeAccess();
    select.value = state.ua = 'default';
    selectTab(state.selected);
  }, 'Elimina el acceso a dominios concedido para cambiar el User-Agent');
  uabar.replaceChildren(h('label', {}, 'Ver como: ', select), revoke);
}

/** Cambiar a un bot necesita permiso del dominio (se pide con este gesto del usuario). */
async function onUaChange(event) {
  const select = event.target;
  const next = USER_AGENTS.find((u) => u.id === select.value);
  if (next.value && !(await hasAccess(state.tab.url))) {
    const granted = await requestAccess(state.tab.url).catch(() => false);
    if (!granted) {
      select.value = state.ua;
      return;
    }
  }
  state.ua = next.id;
  selectTab(state.selected);
}

async function selectTab(id) {
  const def = TABS.find((t) => t.id === id) ?? TABS[0];
  state.selected = def.id;
  const token = ++state.token;

  for (const btn of tablist.children) {
    const active = btn.dataset.id === def.id;
    btn.setAttribute('aria-selected', String(active));
    btn.tabIndex = active ? 0 : -1;
  }
  panel.setAttribute('aria-labelledby', `tab-${def.id}`);
  uabar.hidden = !def.usesUa;
  panel.replaceChildren(empty('Analizando…'));

  try {
    const data = await collect(def);
    if (token === state.token) panel.replaceChildren(def.render(data, { ua: currentUa() }));
  } catch (error) {
    if (token === state.token) panel.replaceChildren(h('p', { class: 'error-box' }, `No se pudo analizar: ${error.message}`));
  }
}

function buildTabs() {
  tablist.replaceChildren(
    ...TABS.map((def) =>
      h('button', { type: 'button', role: 'tab', id: `tab-${def.id}`, class: 'tab', 'data-id': def.id, onclick: () => selectTab(def.id) }, def.label),
    ),
  );
  tablist.addEventListener('keydown', (event) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    const index = TABS.findIndex((t) => t.id === state.selected);
    const next = TABS[(index + step + TABS.length) % TABS.length];
    selectTab(next.id);
    $(`tab-${next.id}`).focus();
  });
}

/** Transparencia del panel, recordada entre sesiones (si el almacenamiento está disponible). */
function setupOpacity() {
  const slider = $('alpha');
  const apply = (percent) => document.documentElement.style.setProperty('--alpha', String(percent / 100));
  try {
    const saved = Number(localStorage.getItem('alpha'));
    if (saved >= 50 && saved <= 100) slider.value = String(saved);
  } catch {
    /* sin almacenamiento: se usa el valor por defecto */
  }
  apply(Number(slider.value));
  slider.addEventListener('input', () => {
    apply(Number(slider.value));
    try {
      localStorage.setItem('alpha', slider.value);
    } catch {
      /* ignorar */
    }
  });
}

/** Elimina el iframe del panel de la página. Autocontenida (se inyecta). */
function removePanel(id) {
  document.getElementById(id)?.remove();
}

async function init() {
  $('version').textContent = `v${chrome.runtime.getManifest().version}`;
  setupOpacity();
  buildTabs();
  buildUaBar();

  const tabId = Number(new URLSearchParams(location.search).get('tab'));
  $('close').addEventListener('click', () => chrome.scripting.executeScript({ target: { tabId }, func: removePanel, args: [PANEL_ID] }));

  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab?.url || !/^https?:\/\//i.test(tab.url)) {
    panel.replaceChildren(empty('Abre una página http(s) para analizarla.'));
    $('refresh').disabled = true;
    return;
  }
  state.tab = tab;
  addEventListener('pagehide', () => clearRule(tab.id));
  $('host').textContent = new URL(tab.url).hostname;
  $('refresh').addEventListener('click', () => {
    state.cache.clear();
    selectTab(state.selected);
  });
  selectTab(TABS[0].id);
}

init();
