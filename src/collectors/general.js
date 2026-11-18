/**
 * Colector de la pestaña General.
 * IMPORTANTE: se serializa e inyecta en la página, así que debe ser
 * autocontenido (no puede usar imports ni variables externas).
 */
export function collectGeneral() {
  const q = (selector) => document.querySelector(selector);
  const attr = (selector, name) => q(selector)?.getAttribute(name)?.trim() ?? '';
  const metaName = (name) => attr(`meta[name="${name}" i]`, 'content');
  const resolve = (href) => {
    try {
      return href ? new URL(href, location.href).href : '';
    } catch {
      return '';
    }
  };
  const normalize = (url) => url.replace(/#.*$/, '').replace(/\/$/, '');

  const ctx = document.createElement('canvas').getContext('2d');
  const pixelWidth = (text, font) => {
    if (!ctx || !text) return 0;
    ctx.font = font;
    return Math.round(ctx.measureText(text).width);
  };

  const title = document.title.trim();
  const description = metaName('description');
  const canonicalLinks = [...document.querySelectorAll('link[rel~="canonical" i]')];
  const canonical = resolve(canonicalLinks[0]?.getAttribute('href')?.trim());
  const nav = performance.getEntriesByType('navigation')[0];
  const text = document.body?.innerText ?? '';
  const h1 = [...document.querySelectorAll('h1')];

  return {
    url: location.href,
    title,
    titlePx: pixelWidth(title, '20px Arial'),
    description,
    descriptionPx: pixelWidth(description, '14px Arial'),
    canonical,
    canonicalCount: canonicalLinks.length,
    canonicalSelf: canonical !== '' && normalize(canonical) === normalize(location.href),
    robots: metaName('robots'),
    googlebot: metaName('googlebot'),
    lang: document.documentElement.lang.trim(),
    charset: document.characterSet,
    viewport: metaName('viewport'),
    favicon: resolve(attr('link[rel~="icon" i]', 'href')),
    h1Count: h1.length,
    h1Text: h1[0]?.textContent.replace(/\s+/g, ' ').trim() ?? '',
    words: (text.match(/\S+/g) ?? []).length,
    counts: {
      links: document.links.length,
      images: document.images.length,
      imagesNoAlt: [...document.images].filter((img) => !img.hasAttribute('alt')).length,
      scripts: document.scripts.length,
    },
    http: {
      status: nav?.responseStatus ?? 0,
      ttfb: nav ? Math.round(nav.responseStart - nav.startTime) : 0,
      load: nav ? Math.round(nav.loadEventEnd) : 0,
      htmlBytes: nav?.decodedBodySize ?? 0,
    },
  };
}
