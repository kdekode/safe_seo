/**
 * Colector técnico (autocontenido: se inyecta en la página).
 * Las peticiones son same-origin y sin cookies (credentials: 'omit'), por lo
 * que reflejan lo que vería un rastreador anónimo y no requieren permisos.
 */
export async function collectTechnical() {
  const TIMEOUT = 6000;

  const request = async (url) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    try {
      const response = await fetch(url, { cache: 'no-store', credentials: 'omit', redirect: 'follow', signal: controller.signal });
      return { response };
    } catch (error) {
      return { error: error.name === 'AbortError' ? 'Tiempo de espera agotado' : 'No se pudo consultar' };
    } finally {
      clearTimeout(timer);
    }
  };

  /* ---------- Página: estado HTTP y cabeceras ---------- */
  const page = await (async () => {
    const { response, error } = await request(location.href);
    if (!response) return { error };
    response.body?.cancel();
    const header = (name) => response.headers.get(name) ?? '';
    return {
      status: response.status,
      redirected: response.redirected,
      finalUrl: response.url,
      headers: {
        'X-Robots-Tag': header('x-robots-tag'),
        'Content-Type': header('content-type'),
        'Content-Encoding': header('content-encoding'),
        'Cache-Control': header('cache-control'),
        'Last-Modified': header('last-modified'),
        Link: header('link'),
        'Strict-Transport-Security': header('strict-transport-security'),
        Server: header('server'),
      },
    };
  })();

  /* ---------- robots.txt ---------- */
  const matchesPattern = (path, pattern) => {
    if (!pattern || pattern.length > 200) return false;
    const anchored = pattern.endsWith('$');
    const body = (anchored ? pattern.slice(0, -1) : pattern).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${body}${anchored ? '$' : ''}`).test(path);
  };

  const parseRobots = (text) => {
    const groups = [];
    const sitemaps = [];
    let current = null;
    let afterAgent = false;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.replace(/#.*/, '').trim();
      const colon = line.indexOf(':');
      if (colon < 1) continue;
      const field = line.slice(0, colon).trim().toLowerCase();
      const value = line.slice(colon + 1).trim();
      if (field === 'user-agent') {
        if (!current || !afterAgent) groups.push((current = { agents: [], rules: [] }));
        current.agents.push(value.toLowerCase());
        afterAgent = true;
        continue;
      }
      afterAgent = false;
      if (field === 'sitemap') sitemaps.push(value);
      else if (current && (field === 'allow' || field === 'disallow')) current.rules.push({ allow: field === 'allow', path: value });
    }
    return { groups, sitemaps };
  };

  /** Regla ganadora (la más específica; en empate, Allow) para un user-agent. */
  const verdict = (groups, agent, path) => {
    const group = groups.find((g) => g.agents.includes(agent)) ?? groups.find((g) => g.agents.includes('*'));
    if (!group) return { allowed: true, rule: '' };
    let best = null;
    for (const rule of group.rules) {
      if (!matchesPattern(path, rule.path)) continue;
      if (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.allow)) best = rule;
    }
    return best && !best.allow ? { allowed: false, rule: `Disallow: ${best.path}` } : { allowed: true, rule: best ? `Allow: ${best.path}` : '' };
  };

  const robots = await (async () => {
    const { response, error } = await request(`${location.origin}/robots.txt`);
    if (!response) return { error };
    if (!response.ok) return { status: response.status, sitemaps: [] };
    const parsed = parseRobots((await response.text()).slice(0, 200000));
    const path = location.pathname + location.search;
    return {
      status: response.status,
      groups: parsed.groups.length,
      sitemaps: parsed.sitemaps.slice(0, 10),
      googlebot: verdict(parsed.groups, 'googlebot', path),
      all: verdict(parsed.groups, '*', path),
    };
  })();

  /* ---------- Sitemaps (solo mismo origen) ---------- */
  const candidates = robots.sitemaps?.length ? robots.sitemaps : [`${location.origin}/sitemap.xml`];
  const sitemaps = [];
  for (const url of candidates.slice(0, 3)) {
    if (!url.startsWith(`${location.origin}/`)) {
      sitemaps.push({ url, external: true });
      continue;
    }
    const { response, error } = await request(url);
    if (!response) {
      sitemaps.push({ url, error });
      continue;
    }
    if (!response.ok) {
      sitemaps.push({ url, status: response.status });
      continue;
    }
    const text = (await response.text()).slice(0, 10_000_000);
    sitemaps.push({
      url,
      status: response.status,
      index: /<sitemapindex/i.test(text),
      entries: (text.match(/<loc>/gi) ?? []).length,
      containsPage: text.includes(location.href) || text.includes(location.href.replace(/\/$/, '')),
    });
  }

  /* ---------- hreflang y paginación ---------- */
  const hreflang = [...document.querySelectorAll('link[rel~="alternate" i][hreflang]')].slice(0, 100).map((link) => ({
    lang: link.getAttribute('hreflang').trim(),
    href: link.href,
  }));
  const rel = (name) => document.querySelector(`link[rel~="${name}" i]`)?.href ?? '';

  /* ---------- Contenido mixto ---------- */
  const mixed =
    location.protocol === 'https:'
      ? [...document.querySelectorAll('[src^="http://" i], link[rel~="stylesheet" i][href^="http://" i]')].map((el) => el.getAttribute('src') || el.getAttribute('href')).slice(0, 10)
      : [];

  /* ---------- Rendimiento ---------- */
  const vitals = await new Promise((resolve) => {
    const out = { lcp: 0, cls: 0, fcp: 0 };
    const observers = [];
    const watch = (type, handler) => {
      try {
        const observer = new PerformanceObserver((list) => list.getEntries().forEach(handler));
        observer.observe({ type, buffered: true });
        observers.push(observer);
      } catch {
        /* tipo no soportado */
      }
    };
    watch('largest-contentful-paint', (e) => (out.lcp = Math.round(e.startTime)));
    watch('layout-shift', (e) => {
      if (!e.hadRecentInput) out.cls += e.value;
    });
    watch('paint', (e) => {
      if (e.name === 'first-contentful-paint') out.fcp = Math.round(e.startTime);
    });
    setTimeout(() => {
      observers.forEach((o) => o.disconnect());
      out.cls = Math.round(out.cls * 1000) / 1000;
      resolve(out);
    }, 120);
  });
  const nav = performance.getEntriesByType('navigation')[0];
  vitals.ttfb = nav ? Math.round(nav.responseStart - nav.startTime) : 0;

  return {
    page,
    robots,
    sitemaps,
    hreflang,
    pagination: { prev: rel('prev'), next: rel('next'), amp: rel('amphtml') },
    mixed,
    vitals,
    dom: { nodes: document.getElementsByTagName('*').length, requests: performance.getEntriesByType('resource').length },
    origin: location.origin,
    url: location.href,
  };
}
