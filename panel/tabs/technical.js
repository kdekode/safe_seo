import { collectTechnical } from '../../src/collectors/technical.js';
import { card, checklist, h, kv, link } from '../ui.js';

// Umbrales de Core Web Vitals: [bueno, aceptable]
const VITALS = [
  ['LCP', 'lcp', 2500, 4000, (v) => `${v} ms`],
  ['CLS (acumulado)', 'cls', 0.1, 0.25, (v) => String(v)],
  ['FCP', 'fcp', 1800, 3000, (v) => `${v} ms`],
  ['TTFB', 'ttfb', 800, 1800, (v) => `${v} ms`],
];

function audit(d) {
  const items = [];
  const add = (level, title, detail) => items.push({ level, title, detail });
  const { page, robots } = d;

  if (page.error) add('warn', 'No se pudo consultar la página', page.error);
  else {
    add(page.status === 200 ? 'ok' : page.status >= 400 ? 'error' : 'warn', `HTTP ${page.status} (vista de rastreador anónimo)`);
    if (page.redirected) add('warn', 'La URL redirige', page.finalUrl);
    const xrobots = page.headers['X-Robots-Tag'];
    if (/noindex|none/i.test(xrobots)) add('error', 'X-Robots-Tag con noindex', xrobots);
    else if (xrobots) add('info', 'X-Robots-Tag', xrobots);
    if (/html/i.test(page.headers['Content-Type']) && !page.headers['Content-Encoding']) add('warn', 'HTML sin compresión', 'Activa gzip o brotli.');
    if (d.url.startsWith('https:') && !page.headers['Strict-Transport-Security']) add('info', 'Sin cabecera HSTS');
  }

  if (robots.error) add('warn', 'No se pudo leer robots.txt', robots.error);
  else if (robots.status !== 200) add('warn', `robots.txt no disponible (HTTP ${robots.status})`);
  else {
    const blocked = (who, v) => (v.allowed ? null : `${who} bloqueado por «${v.rule}»`);
    const problem = blocked('Googlebot', robots.googlebot) ?? blocked('Todos los bots (*)', robots.all);
    add(problem ? 'error' : 'ok', problem ?? 'robots.txt permite el rastreo de esta URL', robots.googlebot.rule || null);
  }

  const reachable = d.sitemaps.filter((s) => s.status === 200);
  if (!reachable.length && d.sitemaps.every((s) => !s.external)) add('warn', 'No se encontró sitemap', 'Declara un Sitemap en robots.txt.');
  for (const s of reachable) {
    if (!s.index && !s.containsPage) add('warn', 'La URL no aparece en el sitemap', s.url);
    else if (!s.index) add('ok', 'La URL aparece en el sitemap', `${s.entries} URLs en ${s.url}`);
    else add('info', `Índice de sitemaps (${s.entries})`, s.url);
  }

  if (d.hreflang.length) {
    const self = d.hreflang.some((l) => l.href.replace(/\/$/, '') === d.url.replace(/#.*/, '').replace(/\/$/, ''));
    add(self ? 'ok' : 'warn', self ? 'hreflang incluye la propia URL' : 'hreflang sin autorreferencia');
    if (!d.hreflang.some((l) => l.lang.toLowerCase() === 'x-default')) add('info', 'Sin hreflang x-default');
  }

  if (d.mixed.length) add('error', `${d.mixed.length} recurso(s) con contenido mixto (http)`, d.mixed[0]);
  else if (d.url.startsWith('https:')) add('ok', 'Sin contenido mixto');

  for (const [label, key, good, ok, fmt] of VITALS) {
    const value = d.vitals[key];
    if (!value && key !== 'cls') continue;
    add(value <= good ? 'ok' : value <= ok ? 'warn' : 'error', `${label}: ${fmt(value)}`, `Bueno ≤ ${fmt(good)}`);
  }
  if (d.dom.nodes > 1500) add('warn', `DOM grande (${d.dom.nodes} nodos)`, 'Más de 1.500 nodos penaliza el rendimiento.');
  return items;
}

export default {
  id: 'technical',
  label: 'Técnico',
  collect: collectTechnical,
  render(d) {
    return h(
      'div',
      { class: 'stack' },
      checklist(audit(d)),
      card('Cabeceras HTTP', d.page.error ? h('p', { class: 'muted' }, d.page.error) : kv(Object.entries(d.page.headers))),
      card(
        'Sitemaps',
        d.sitemaps.length
          ? h(
              'div',
              { class: 'rows' },
              d.sitemaps.map((s) =>
                h('div', { class: 'row' }, h('div', { class: 'row-main' }, link(s.url)), h('span', { class: 'muted' }, s.external ? 'otro dominio (no consultado)' : s.error ?? `HTTP ${s.status}${s.entries ? ` · ${s.entries} URLs` : ''}`)),
              ),
            )
          : h('p', { class: 'muted' }, 'Ninguno declarado.'),
      ),
      d.hreflang.length ? card('hreflang', kv(d.hreflang.map((l) => [l.lang, l.href]))) : null,
      d.pagination.prev || d.pagination.next || d.pagination.amp
        ? card('Relaciones', kv([['prev', d.pagination.prev], ['next', d.pagination.next], ['AMP', d.pagination.amp]]))
        : null,
      card('Recursos', kv([['Nodos DOM', String(d.dom.nodes)], ['Peticiones', String(d.dom.requests)]])),
      h('p', { class: 'muted note' }, 'Las peticiones se hacen sin cookies desde la propia página; las métricas son las observadas hasta ahora, no datos de campo (CrUX).'),
    );
  },
};
