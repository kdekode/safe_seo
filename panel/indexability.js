/**
 * Veredicto de indexabilidad a partir de los datos de las pestañas General y
 * Técnico. Función pura (fácil de probar).
 *
 *  - bad:  no se indexará (noindex, error HTTP).
 *  - warn: indexable pero con señales que lo ponen en duda.
 *  - ok:   sin bloqueos detectados.
 */
export const VERDICT_LABEL = { ok: 'Indexable', warn: 'Indexable con avisos', bad: 'No indexable' };

export function indexability(general, technical = {}) {
  const bad = [];
  const warn = [];
  const directives = `${general.robots},${general.googlebot}`.toLowerCase();
  const xRobots = technical.page?.headers?.['X-Robots-Tag'] ?? '';
  const status = technical.page?.status || general.http.status;

  if (/noindex|none/.test(directives)) bad.push('meta robots noindex');
  if (/noindex|none/i.test(xRobots)) bad.push('X-Robots-Tag noindex');
  if (status >= 400) bad.push(`HTTP ${status}${technical.page?.status ? ' (sin cookies)' : ''}`);

  if (technical.page?.redirected) warn.push('la URL redirige');
  if (general.canonical && !general.canonicalSelf) warn.push('canonical apunta a otra URL');
  if (general.canonicalCount > 1) warn.push('varias etiquetas canonical');
  if (/nofollow/.test(directives)) warn.push('meta robots nofollow');
  if (technical.robots?.googlebot && !technical.robots.googlebot.allowed) warn.push('bloqueada por robots.txt');

  const state = bad.length ? 'bad' : warn.length ? 'warn' : 'ok';
  return { state, reasons: bad.length ? bad : warn.length ? warn : ['sin bloqueos detectados'] };
}
