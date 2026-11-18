import { collectGeneral } from '../../src/collectors/general.js';
import { card, checklist, h, kv, meter } from '../ui.js';

const TITLE_PX_MAX = 580;
const DESC_PX_MAX = 920;

/** Convierte los datos en comprobaciones { level, title, detail }. */
export function audit(d) {
  const items = [];
  const add = (level, title, detail) => items.push({ level, title, detail });
  const url = new URL(d.url);

  // Title
  if (!d.title) add('error', 'Falta el <title>', 'Es el factor on-page más importante.');
  else if (d.title.length < 30) add('warn', `Title corto (${d.title.length} car.)`, 'Aprovecha hasta ~60 caracteres.');
  else if (d.titlePx > TITLE_PX_MAX) add('warn', `Title largo (${d.titlePx}px)`, 'Google lo cortará en los resultados (~580px).');
  else add('ok', `Title correcto (${d.title.length} car. · ${d.titlePx}px)`);

  // Meta description
  if (!d.description) add('warn', 'Falta la meta description', 'Google puede generar una, pero pierdes control del snippet.');
  else if (d.description.length < 70) add('warn', `Description corta (${d.description.length} car.)`);
  else if (d.descriptionPx > DESC_PX_MAX) add('warn', `Description larga (${d.descriptionPx}px)`, 'Se truncará en escritorio.');
  else add('ok', `Description correcta (${d.description.length} car.)`);

  // H1
  if (d.h1Count === 0) add('error', 'No hay ningún H1');
  else if (d.h1Count > 1) add('warn', `Hay ${d.h1Count} H1`, 'Lo recomendable es uno por página.');
  else add('ok', 'Un único H1');

  // Indexabilidad
  const directives = `${d.robots},${d.googlebot}`.toLowerCase();
  if (/noindex|none/.test(directives)) add('error', 'Página con noindex', `Meta robots: ${d.robots || d.googlebot}`);
  else if (/nofollow/.test(directives)) add('warn', 'Meta robots con nofollow', d.robots || d.googlebot);
  else add('ok', 'Indexable por meta robots');

  // Canonical
  if (!d.canonical) add('warn', 'Sin canonical', 'Recomendable autorreferenciada para evitar duplicados.');
  else if (d.canonicalCount > 1) add('error', `${d.canonicalCount} etiquetas canonical`, 'Google ignorará las contradictorias.');
  else if (!d.canonicalSelf) add('warn', 'Canonical apunta a otra URL', d.canonical);
  else add('ok', 'Canonical autorreferenciada');

  // Técnico básico
  if (d.http.status && d.http.status !== 200) add(d.http.status >= 400 ? 'error' : 'warn', `Código HTTP ${d.http.status}`);
  if (url.protocol !== 'https:') add('error', 'No usa HTTPS');
  if (!d.lang) add('warn', 'Falta el atributo lang en <html>');
  if (!d.viewport) add('error', 'Falta meta viewport', 'Imprescindible para mobile-first.');

  // URL
  const urlIssues = [];
  if (url.href.length > 115) urlIssues.push('larga');
  if (/[A-Z]/.test(url.pathname)) urlIssues.push('mayúsculas');
  if (url.pathname.includes('_')) urlIssues.push('guiones bajos');
  if (url.search) urlIssues.push('parámetros');
  if (urlIssues.length) add('warn', `URL mejorable: ${urlIssues.join(', ')}`);
  else add('ok', 'URL limpia');

  // Contenido
  if (d.words < 300) add('warn', `Contenido escaso (${d.words} palabras)`, 'Contenido fino: valora ampliarlo si el tema lo pide.');
  else add('ok', `${d.words} palabras`);

  return items;
}

/** Vista previa aproximada del snippet de Google. */
function serpPreview(d) {
  const url = new URL(d.url);
  const crumbs = url.pathname.split('/').filter(Boolean).map(decodeURIComponent).join(' › ');
  return h(
    'div',
    { class: 'serp' },
    h('div', { class: 'serp-site' }, url.hostname + (crumbs ? ` › ${crumbs}` : '')),
    h('div', { class: 'serp-title' }, d.title || '(sin title)'),
    h('div', { class: 'serp-desc' }, d.description || '(sin meta description)'),
  );
}

const fmtBytes = (n) => (n ? `${(n / 1024).toFixed(1)} KB` : '');
const fmtMs = (n) => (n ? `${n} ms` : '');

export default {
  id: 'general',
  label: 'General',
  collect: collectGeneral,
  render(d) {
    return h(
      'div',
      { class: 'stack' },
      card('Vista previa en Google', serpPreview(d)),
      checklist(audit(d)),
      card(
        'Longitudes',
        h('div', { class: 'meter-row' }, h('span', {}, 'Title'), meter(d.title.length, 30, 60), h('span', { class: 'muted' }, `${d.title.length}/60`)),
        h('div', { class: 'meter-row' }, h('span', {}, 'Description'), meter(d.description.length, 70, 160), h('span', { class: 'muted' }, `${d.description.length}/160`)),
      ),
      card(
        'Datos',
        kv([
          ['H1', d.h1Text],
          ['Canonical', d.canonical],
          ['Meta robots', d.robots || d.googlebot],
          ['Idioma', d.lang],
          ['Charset', d.charset],
          ['Enlaces', String(d.counts.links)],
          ['Imágenes', `${d.counts.images} (${d.counts.imagesNoAlt} sin alt)`],
          ['Scripts', String(d.counts.scripts)],
          ['Peso HTML', fmtBytes(d.http.htmlBytes)],
          ['TTFB', fmtMs(d.http.ttfb)],
          ['Carga', fmtMs(d.http.load)],
        ]),
      ),
    );
  },
};
