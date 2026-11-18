import { TABS } from './tabs/index.js';
import { empty, h } from './ui.js';

const PANEL_ID = 'safe-seo-panel-host';
const $ = (id) => document.getElementById(id);
const tablist = $('tabs');
const panel = $('panel');

const state = { tab: null, cache: new Map(), selected: null, token: 0 };
let cleanups = [];

/** Ejecuta el colector de una pestaña en la página. `world: 'MAIN'` solo para leer variables de la página. */
function run(def, args = []) {
  return chrome.scripting
    .executeScript({ target: { tabId: state.tab.id }, func: def.collect, args, world: def.world ?? 'ISOLATED' })
    .then(([frame]) => {
      if (frame?.result === undefined) throw new Error('La página no devolvió datos.');
      return frame.result;
    });
}

/** Una sola ejecución por pestaña, con caché (salvo `cache: false`, para vistas en vivo). */
function collect(def) {
  if (def.cache === false) return run(def);
  if (!state.cache.has(def.id)) {
    state.cache.set(
      def.id,
      run(def).catch((error) => {
        state.cache.delete(def.id);
        throw error;
      }),
    );
  }
  return state.cache.get(def.id);
}

async function selectTab(id) {
  cleanups.splice(0).forEach((fn) => fn());
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
    if (token === state.token) panel.replaceChildren(def.render(data, { call: (...args) => run(def, args), onLeave: (fn) => cleanups.push(fn) }));
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

/**
 * La rueda sobre el panel nunca debe desplazar la página de detrás: solo se
 * permite si algún contenedor bajo el cursor puede consumir ese desplazamiento.
 */
function trapWheel() {
  const canScroll = (el, axis, delta) => {
    const style = getComputedStyle(el);
    const [size, client, pos, overflow] = axis === 'y' ? [el.scrollHeight, el.clientHeight, el.scrollTop, style.overflowY] : [el.scrollWidth, el.clientWidth, el.scrollLeft, style.overflowX];
    if (!/(auto|scroll)/.test(overflow) || size <= client) return false;
    return delta < 0 ? pos > 0 : pos + client < size - 1;
  };
  addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey) return; // zoom del navegador
      for (let el = event.target; el instanceof Element; el = el.parentElement) {
        if ((event.deltaY && canScroll(el, 'y', event.deltaY)) || (event.deltaX && canScroll(el, 'x', event.deltaX))) return;
      }
      event.preventDefault();
    },
    { passive: false },
  );
}

/** Elimina el iframe del panel de la página. Autocontenida (se inyecta). */
function removePanel(id) {
  document.getElementById(id)?.remove();
}

async function init() {
  $('version').textContent = `v${chrome.runtime.getManifest().version}`;
  setupOpacity();
  trapWheel();
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
  addEventListener('pagehide', () => cleanups.splice(0).forEach((fn) => fn()));
  $('host').textContent = new URL(tab.url).hostname;
  $('refresh').addEventListener('click', () => {
    state.cache.clear();
    selectTab(state.selected);
  });
  selectTab(TABS[0].id);
}

init();
