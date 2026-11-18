/**
 * Colector de eventos de analítica. Se ejecuta en el contexto MAIN de la
 * página (necesario para leer `dataLayer`) y es autocontenido.
 *
 * Fuentes:
 *  - dataLayer / gtag(): lo que la página empuja (sondeo del array; no se
 *    parchea `push`, porque GTM lo reescribe).
 *  - Red: peticiones reales a GA4, Universal Analytics y Meta Pixel, vía
 *    PerformanceObserver. Los lotes enviados por POST no son visibles.
 *
 * El estado vive en la página bajo un Symbol no enumerable y se consulta
 * incrementalmente con `from` (nº de eventos ya recibidos).
 */
export function collectEvents(from = 0) {
  const KEY = Symbol.for('safe-seo.events');
  const MAX_EVENTS = 1000;
  const w = window;

  /** Clon seguro y acotado (sin ciclos, nodos ni funciones). */
  const safe = (value, depth = 0, seen = new WeakSet()) => {
    if (value === null) return null;
    switch (typeof value) {
      case 'string':
        return value.slice(0, 1000);
      case 'number':
      case 'boolean':
        return value;
      case 'undefined':
        return null;
      case 'function':
        return '[Function]';
      case 'bigint':
      case 'symbol':
        return String(value);
    }
    if (value instanceof Node) return `[${value.nodeName}]`;
    if (seen.has(value)) return '[Circular]';
    if (depth > 6) return '[Profundo]';
    seen.add(value);
    const list = Object.prototype.toString.call(value) === '[object Arguments]' ? Array.from(value) : value;
    if (Array.isArray(list)) return list.slice(0, 50).map((v) => safe(v, depth + 1, seen));
    const out = {};
    for (const key of Object.keys(list).slice(0, 60)) {
      try {
        out[key] = safe(list[key], depth + 1, seen);
      } catch {
        out[key] = '[Error]';
      }
    }
    return out;
  };

  let store = w[KEY];
  if (!store) {
    store = { events: [], seen: {}, firstScan: true };
    Object.defineProperty(w, KEY, { value: store, enumerable: false });

    const add = (source, name, data, t) => {
      if (store.events.length >= MAX_EVENTS) return;
      store.events.push({ id: store.events.length, source, name, data, t });
    };
    store.add = add;

    const parseHit = (entry) => {
      let url;
      try {
        url = new URL(entry.name);
      } catch {
        return null;
      }
      const p = Object.fromEntries(url.searchParams);
      const { hostname: host, pathname: path } = url;
      if (/\/g\/collect$/.test(path) && p.en) return ['GA4 (red)', p.en, p];
      if (/google-analytics\.com$/.test(host) && /\/collect$/.test(path) && p.t) return ['UA (red)', p.t === 'event' ? p.ea || 'event' : p.t, p];
      if (/(^|\.)facebook\.com$/.test(host) && path.startsWith('/tr') && p.ev) return ['Meta (red)', p.ev, p];
      return null;
    };
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const hit = parseHit(entry);
          if (hit) add(hit[0], hit[1], safe(hit[2]), Math.round(entry.startTime));
        }
      }).observe({ type: 'resource', buffered: true });
    } catch {
      /* PerformanceObserver no disponible */
    }
  }

  /* ---- dataLayer(s): nombres por defecto + los declarados en el snippet de GTM ---- */
  const names = new Set(['dataLayer']);
  document.querySelectorAll('script[src*="googletagmanager.com/gtm.js"]').forEach((s) => {
    try {
      const l = new URL(s.src).searchParams.get('l');
      if (l) names.add(l);
    } catch {
      /* URL inválida */
    }
  });

  const now = Math.round(performance.now());
  for (const name of names) {
    const layer = w[name];
    if (!Array.isArray(layer)) continue;
    for (let i = store.seen[name] ?? 0; i < layer.length; i++) {
      const item = layer[i];
      const t = store.firstScan ? null : now;
      const isArgs = Object.prototype.toString.call(item) === '[object Arguments]';
      if (isArgs || Array.isArray(item)) {
        const [command, first, second] = Array.from(item);
        if (command === 'event') store.add('gtag', String(first), safe(second ?? {}), t);
        else store.add('gtag', `gtag ${command}`, safe(Array.from(item).slice(1)), t);
      } else if (item && typeof item === 'object') {
        store.add('dataLayer', item.event ? String(item.event) : '(variables)', safe(item), t);
      }
    }
    store.seen[name] = layer.length;
  }
  store.firstScan = false;

  /* ---- Herramientas detectadas ---- */
  const gtmKeys = Object.keys(w.google_tag_manager ?? {});
  const gtagIds = [...document.querySelectorAll('script[src*="gtag/js?id="]')].map((s) => new URL(s.src).searchParams.get('id'));
  let pixels = [];
  try {
    pixels = (w.fbq?.getState?.().pixels ?? []).map((p) => p.id);
  } catch {
    /* sin estado */
  }
  const flags = {
    'Meta Pixel': typeof w.fbq === 'function',
    TikTok: !!w.ttq,
    LinkedIn: !!w._linkedin_partner_id,
    Pinterest: typeof w.pintrk === 'function',
    'X/Twitter': typeof w.twq === 'function',
    Hotjar: typeof w.hj === 'function',
    Clarity: typeof w.clarity === 'function',
    HubSpot: Array.isArray(w._hsq),
  };
  const tools = {
    gtm: gtmKeys.filter((k) => /^GTM-/.test(k)),
    ga4: [...new Set([...gtmKeys.filter((k) => /^G-/.test(k)), ...gtagIds.filter((id) => /^G-/.test(id))])],
    ads: [...new Set([...gtmKeys.filter((k) => /^AW-/.test(k)), ...gtagIds.filter((id) => /^AW-/.test(id))])],
    pixels,
    others: Object.entries(flags).filter(([, on]) => on).map(([label]) => label),
    layers: [...names].filter((n) => Array.isArray(w[n])),
  };

  return { events: store.events.slice(from), total: store.events.length, tools };
}
