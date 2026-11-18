/**
 * Colector de la pestaña Tags: instalación de GTM/gtag/píxeles, comandos
 * gtag (config, consent…), scripts de terceros y snippets inline.
 * Contexto MAIN (lee `dataLayer` y `google_tag_manager`); autocontenido.
 */
export function collectTags() {
  const w = window;
  const ID_RE = /\b(GTM-[A-Z0-9]{4,}|G-[A-Z0-9]{6,}|AW-\d{6,}|UA-\d{4,}-\d+|DC-\d+)\b/g;
  const kindOf = (id) => (id.startsWith('GTM-') ? 'GTM' : id.startsWith('G-') ? 'GA4' : id.startsWith('AW-') ? 'Google Ads' : id.startsWith('UA-') ? 'Universal Analytics' : 'Floodlight');
  const where = (el) => (el.closest('head') ? 'head' : 'body');

  const safe = (value, depth = 0) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value.slice(0, 500);
    if (['number', 'boolean'].includes(typeof value)) return value;
    if (typeof value !== 'object' || depth > 5) return typeof value === 'object' ? '[Profundo]' : String(value);
    if (Array.isArray(value)) return value.slice(0, 40).map((v) => safe(v, depth + 1));
    const out = {};
    for (const key of Object.keys(value).slice(0, 50)) {
      try {
        out[key] = safe(value[key], depth + 1);
      } catch {
        out[key] = '[Error]';
      }
    }
    return out;
  };

  const ids = new Map();
  const addId = (id, via) => {
    const entry = ids.get(id) ?? { id, kind: kindOf(id), via: new Set() };
    entry.via.add(via);
    ids.set(id, entry);
  };

  const VENDORS = [
    ['Google Tag Manager', /googletagmanager\.com\/gtm\.js/],
    ['Google tag (gtag.js)', /googletagmanager\.com\/gtag\/js/],
    ['Google Analytics (analytics.js)', /google-analytics\.com\/(analytics|ga)\.js/],
    ['Google Ads', /googleadservices\.com|googleads\.g\.doubleclick\.net/],
    ['Meta Pixel', /connect\.facebook\.net\/[^/]+\/fbevents\.js/],
    ['TikTok Pixel', /analytics\.tiktok\.com/],
    ['LinkedIn Insight', /snap\.licdn\.com/],
    ['Pinterest Tag', /s\.pinimg\.com\/ct\//],
    ['X/Twitter Pixel', /static\.ads-twitter\.com/],
    ['Hotjar', /static\.hotjar\.com/],
    ['Microsoft Clarity', /clarity\.ms/],
    ['HubSpot', /js\.hs-(scripts|analytics)\.net|js\.hs-scripts\.com/],
    ['Segment', /cdn\.segment\.com/],
    ['Matomo', /matomo|piwik/i],
    ['Cookiebot', /consent\.cookiebot\.com/],
    ['OneTrust', /cookielaw\.org|onetrust\.com/],
  ];

  /* ---- Scripts externos (HTML + cargados dinámicamente) ---- */
  const urls = new Map();
  for (const script of document.scripts) {
    if (!script.src) continue;
    urls.set(script.src, where(script));
  }
  for (const entry of performance.getEntriesByType('resource')) {
    if (entry.initiatorType === 'script' && !urls.has(entry.name)) urls.set(entry.name, 'dinámico');
  }
  for (const url of urls.keys()) {
    try {
      const id = new URL(url).searchParams.get('id');
      if (id && /^(GTM-|G-|AW-|UA-|DC-)/.test(id)) addId(id, 'script');
    } catch {
      /* URL inválida */
    }
  }
  const vendors = [];
  for (const [url, place] of urls) {
    const vendor = VENDORS.find(([, re]) => re.test(url))?.[0];
    if (vendor) vendors.push({ vendor, url: url.slice(0, 300), where: place });
  }

  /* ---- Snippets inline ---- */
  const TRACKING = /gtag\s*\(|GTM-|dataLayer|fbq\s*\(|ttq\.|_linkedin_partner_id|clarity|\bhj\s*\(|_hsq|snaptr|pintrk|twq\s*\(/;
  const snippets = [];
  for (const script of document.scripts) {
    if (script.src || /json/i.test(script.type)) continue;
    const code = script.textContent ?? '';
    if (!TRACKING.test(code)) continue;
    for (const [id] of code.matchAll(ID_RE)) addId(id, 'inline');
    const label = /GTM-/.test(code) ? 'Google Tag Manager' : /gtag\s*\(/.test(code) ? 'gtag.js' : /fbq\s*\(/.test(code) ? 'Meta Pixel' : /dataLayer/.test(code) ? 'dataLayer' : 'Script de tracking';
    if (snippets.length < 12) snippets.push({ label, where: where(script), code: code.trim().slice(0, 4000), truncated: code.length > 4000 });
  }

  /* ---- Contenedores activos en runtime ---- */
  for (const key of Object.keys(w.google_tag_manager ?? {})) if (/^(GTM-|G-|AW-|UA-|DC-)/.test(key)) addId(key, 'runtime');

  /* ---- Comandos gtag registrados en dataLayer ---- */
  const names = new Set(['dataLayer']);
  document.querySelectorAll('script[src*="googletagmanager.com/gtm.js"]').forEach((s) => {
    try {
      const l = new URL(s.src).searchParams.get('l');
      if (l) names.add(l);
    } catch {
      /* ignorar */
    }
  });
  const COMMANDS = new Set(['config', 'set', 'consent', 'js', 'get']);
  const commands = [];
  const layers = [];
  for (const name of names) {
    const layer = w[name];
    if (!Array.isArray(layer)) continue;
    layers.push(name);
    for (const item of layer) {
      const isArgs = Object.prototype.toString.call(item) === '[object Arguments]';
      if (!(isArgs || Array.isArray(item))) continue;
      const [command, ...rest] = Array.from(item);
      if (COMMANDS.has(command) && commands.length < 100) commands.push({ command, args: safe(rest) });
    }
  }

  const noscriptGtm = [...document.querySelectorAll('noscript')].some((n) => /googletagmanager\.com\/ns\.html/.test(n.textContent + n.innerHTML));

  return {
    ids: [...ids.values()].map((entry) => ({ ...entry, via: [...entry.via] })),
    vendors: vendors.slice(0, 60),
    snippets,
    commands,
    layers,
    noscriptGtm,
  };
}
