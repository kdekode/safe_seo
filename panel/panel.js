import { TABS } from './tabs/index.js';
import { empty, h } from './ui.js';

const PANEL_ID = 'safe-seo-panel-host';
const $ = (id) => document.getElementById(id);
const tablist = $('tabs');
const panel = $('panel');

const state = { tab: null, cache: new Map(), selected: null, token: 0 };

/** Ejecuta el colector de una pestaña en la página (una sola vez, con caché). */
function collect(def) {
  if (!state.cache.has(def.id)) {
    const promise = chrome.scripting
      .executeScript({ target: { tabId: state.tab.id }, func: def.collect })
      .then(([frame]) => {
        if (frame?.result === undefined) throw new Error('La página no devolvió datos.');
        return frame.result;
      })
      .catch((error) => {
        state.cache.delete(def.id);
        throw error;
      });
    state.cache.set(def.id, promise);
  }
  return state.cache.get(def.id);
}

async function select(id) {
  const def = TABS.find((t) => t.id === id) ?? TABS[0];
  state.selected = def.id;
  const token = ++state.token;

  for (const btn of tablist.children) {
    const active = btn.dataset.id === def.id;
    btn.setAttribute('aria-selected', String(active));
    btn.tabIndex = active ? 0 : -1;
  }
  panel.setAttribute('aria-labelledby', `tab-${def.id}`);
  panel.replaceChildren(empty('Analizando…'));

  try {
    const data = await collect(def);
    if (token === state.token) panel.replaceChildren(def.render(data));
  } catch (error) {
    if (token === state.token) panel.replaceChildren(h('p', { class: 'error-box' }, `No se pudo analizar: ${error.message}`));
  }
}

function buildTabs() {
  tablist.replaceChildren(
    ...TABS.map((def) =>
      h('button', { type: 'button', role: 'tab', id: `tab-${def.id}`, class: 'tab', 'data-id': def.id, onclick: () => select(def.id) }, def.label),
    ),
  );
  tablist.addEventListener('keydown', (event) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    const index = TABS.findIndex((t) => t.id === state.selected);
    const next = TABS[(index + step + TABS.length) % TABS.length];
    select(next.id);
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

  const tabId = Number(new URLSearchParams(location.search).get('tab'));
  $('close').addEventListener('click', () => chrome.scripting.executeScript({ target: { tabId }, func: removePanel, args: [PANEL_ID] }));

  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab?.url || !/^https?:\/\//i.test(tab.url)) {
    panel.replaceChildren(empty('Abre una página http(s) para analizarla.'));
    $('refresh').disabled = true;
    return;
  }
  state.tab = tab;
  $('host').textContent = new URL(tab.url).hostname;
  $('refresh').addEventListener('click', () => {
    state.cache.clear();
    select(state.selected);
  });
  select(TABS[0].id);
}

init();
