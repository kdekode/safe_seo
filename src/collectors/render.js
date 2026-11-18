/**
 * Colector de la pestaña Código: compara el HTML inicial (lo que descarga un
 * rastreador antes de ejecutar JavaScript) con el DOM renderizado.
 * Autocontenido: se inyecta en la página.
 */
export async function collectRender() {
  const LIMIT = 400_000;
  const clean = (text) => text.replace(/\s+/g, ' ').trim();

  const summarize = (root) => {
    const q = (selector) => root.querySelector(selector);
    const body = q('body')?.cloneNode(true);
    body?.querySelectorAll('script,style,noscript,template,iframe').forEach((node) => node.remove());
    const text = clean(body?.textContent ?? '');
    return {
      title: clean(q('title')?.textContent ?? ''),
      description: q('meta[name="description" i]')?.getAttribute('content')?.trim() ?? '',
      canonical: q('link[rel~="canonical" i]')?.getAttribute('href')?.trim() ?? '',
      robots: q('meta[name="robots" i]')?.getAttribute('content')?.trim() ?? '',
      h1: [...root.querySelectorAll('h1')].slice(0, 5).map((el) => clean(el.textContent)),
      headings: root.querySelectorAll('h1,h2,h3,h4,h5,h6').length,
      links: root.querySelectorAll('a[href]').length,
      images: root.querySelectorAll('img').length,
      jsonld: root.querySelectorAll('script[type="application/ld+json" i]').length,
      words: (text.match(/\S+/g) ?? []).length,
      text: text.slice(0, LIMIT),
    };
  };

  const raw = await (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(location.href, { cache: 'no-store', credentials: 'omit', signal: controller.signal });
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return {
        status: response.status,
        contentType: response.headers.get('content-type') ?? '',
        bytes: new TextEncoder().encode(html).length,
        summary: summarize(doc.documentElement),
        html: html.slice(0, LIMIT),
      };
    } catch (error) {
      return { error: error.name === 'AbortError' ? 'Tiempo de espera agotado' : 'No se pudo descargar el HTML inicial' };
    } finally {
      clearTimeout(timer);
    }
  })();

  const clone = document.documentElement.cloneNode(true);
  clone.querySelector('#safe-seo-panel-host')?.remove();
  const rendered = { summary: summarize(clone), html: `<!doctype html>\n${clone.outerHTML}`.slice(0, LIMIT) };

  return { raw, rendered, url: location.href };
}
