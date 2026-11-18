import { collectRender } from '../../src/collectors/render.js';
import { card, checklist, copyButton, h, link, pill, segmented, toolbar } from '../ui.js';

const MAX_HTML_BYTES = 2 * 1024 * 1024;

const ROWS = [
  ['Title', (s) => s.title],
  ['Description', (s) => s.description],
  ['Canonical', (s) => s.canonical],
  ['Meta robots', (s) => s.robots],
  ['H1', (s) => s.h1.join(' | ')],
  ['Encabezados', (s) => s.headings],
  ['Enlaces', (s) => s.links],
  ['Imágenes', (s) => s.images],
  ['JSON-LD', (s) => s.jsonld],
  ['Palabras', (s) => s.words],
];

function audit({ raw, rendered }) {
  const items = [];
  const add = (level, title, detail) => items.push({ level, title, detail });

  if (raw.error) {
    add('warn', 'No se pudo obtener el HTML inicial', raw.error);
    return items;
  }
  const a = raw.summary;
  const b = rendered.summary;
  add(raw.status === 200 ? 'ok' : 'warn', `HTML inicial descargado: HTTP ${raw.status} · ${(raw.bytes / 1024).toFixed(0)} KB`, 'Petición anónima, sin cookies.');
  if (raw.bytes > MAX_HTML_BYTES) add('warn', 'HTML superior a 2 MB', 'Google solo procesa los primeros 2 MB de cada archivo HTML.');

  const noindex = (s) => /noindex|none/i.test(s.robots);
  if (noindex(a) && !noindex(b)) add('error', 'noindex en el HTML inicial, pero no tras JS', 'Google puede descartar la página sin llegar a renderizarla.');
  else if (!noindex(a) && noindex(b)) add('warn', 'noindex añadido por JavaScript', 'Funciona, pero solo cuando Google renderiza; mejor en el HTML.');

  if (a.canonical && b.canonical && a.canonical !== b.canonical) add('error', 'Canonical distinta tras JavaScript', `${a.canonical} → ${b.canonical}`);
  else if (!a.canonical && b.canonical) add('warn', 'Canonical solo existe tras JavaScript');

  if (a.title !== b.title) add('warn', 'El title cambia con JavaScript');
  if (a.h1.join() !== b.h1.join()) add('warn', 'El H1 cambia con JavaScript');

  const onlyJs = b.words - a.words;
  if (onlyJs > 100 && a.words < b.words * 0.5) add('warn', `${Math.round((onlyJs / b.words) * 100)}% del texto solo aparece tras JavaScript`, 'Se indexa en la segunda fase, con retraso, y otros rastreadores (p. ej. GPTBot) no ejecutan JS.');
  else add('ok', 'El contenido principal ya está en el HTML inicial', `${a.words} palabras antes de JS · ${b.words} después`);

  if (b.links - a.links > 10 && a.links < b.links * 0.8) add('warn', `${b.links - a.links} enlaces solo aparecen tras JavaScript`, 'El rastreo de esos enlaces depende del renderizado.');
  if (!a.jsonld && b.jsonld) add('info', 'El Schema se inyecta con JavaScript');
  return items;
}

function comparison({ raw, rendered }) {
  const cell = (value) => h('td', {}, value === '' ? h('span', { class: 'muted' }, '—') : String(value));
  return h(
    'table',
    { class: 'cmp' },
    h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'HTML inicial'), h('th', {}, 'Renderizado'))),
    h(
      'tbody',
      {},
      ROWS.map(([label, get]) => {
        const a = get(raw.summary);
        const b = get(rendered.summary);
        return h('tr', { class: String(a) !== String(b) ? 'differs' : '' }, h('th', {}, label), cell(a), cell(b));
      }),
    ),
  );
}

function sourceViewer({ raw, rendered }) {
  const views = {
    'rendered-html': ['DOM renderizado', rendered.html],
    'rendered-text': ['Texto renderizado', rendered.summary.text],
  };
  if (!raw.error) {
    views['raw-html'] = ['HTML inicial', raw.html];
    views['raw-text'] = ['Texto inicial', raw.summary.text];
  }
  const order = ['raw-html', 'rendered-html', 'raw-text', 'rendered-text'].filter((id) => views[id]);
  const area = h('textarea', { class: 'source', readonly: true, spellcheck: 'false', wrap: 'off', 'aria-label': 'Código fuente' });
  let current = order[0];
  const show = (id) => {
    current = id;
    area.value = views[id][1];
  };
  show(current);
  return h(
    'div',
    { class: 'stack' },
    segmented(order.map((id) => ({ id, label: views[id][0] })), show),
    area,
    toolbar(copyButton('Copiar', () => views[current][1])),
  );
}

export default {
  id: 'render',
  label: 'Código',
  collect: collectRender,
  render(data) {
    const url = encodeURIComponent(data.url);
    return h(
      'div',
      { class: 'stack' },
      checklist(audit(data)),
      card('HTML inicial vs. renderizado', data.raw.error ? h('p', { class: 'muted' }, data.raw.error) : comparison(data), h('p', { class: 'muted note' }, pill('info', 'Nota'), ' Las filas resaltadas difieren. El navegador ya ejecutó el JS; un rastreador primero ve solo la columna izquierda.')),
      card('Código fuente', sourceViewer(data)),
      card(
        'Herramientas de Google (abren servicios externos con esta URL)',
        h('div', { class: 'stack' }, h('div', {}, link(`https://search.google.com/test/rich-results?url=${url}`, 'Rich Results Test ↗'), h('span', { class: 'muted' }, ' · HTML renderizado por Google')), h('div', {}, link(`https://pagespeed.web.dev/analysis?url=${url}`, 'PageSpeed Insights ↗')), h('div', {}, link(`https://web.archive.org/web/*/${data.url}`, 'Wayback Machine ↗'), h('span', { class: 'muted' }, ' · sustituto del antiguo cache:'))),
      ),
    );
  },
};
