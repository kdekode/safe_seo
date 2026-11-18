import { TABS } from './tabs/index.js';
import { empty, h } from './ui.js';

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

async function init() {
  $('version').textContent = `v${chrome.runtime.getManifest().version}`;
  buildTabs();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/^https?:\/\//i.test(tab.url)) {
    panel.replaceChildren(empty('Abre una página http(s) para analizarla. Las páginas internas del navegador y la Chrome Web Store no son accesibles.'));
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
