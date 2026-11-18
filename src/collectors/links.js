/** Colector de enlaces (autocontenido: se inyecta en la página). */
export function collectLinks() {
  const MAX = 3000;
  const clean = (text) => text.replace(/\s+/g, ' ').trim();
  const bare = (hostname) => hostname.replace(/^www\./, '');
  const here = bare(location.hostname);
  const page = location.href.replace(/#.*$/, '');
  const links = [];

  for (const a of document.links) {
    if (links.length >= MAX) break;
    let url;
    try {
      url = new URL(a.href);
    } catch {
      continue;
    }
    const http = url.protocol === 'http:' || url.protocol === 'https:';
    const rel = (a.getAttribute('rel') ?? '').toLowerCase().split(/\s+/);
    const text = clean(a.textContent) || clean(a.querySelector('img')?.getAttribute('alt') ?? '') || clean(a.getAttribute('aria-label') ?? '');

    links.push({
      href: a.href,
      text: text.slice(0, 120),
      http,
      internal: http && bare(url.hostname) === here,
      fragment: http && url.hash !== '' && a.href.replace(/#.*$/, '') === page,
      nofollow: rel.includes('nofollow'),
      sponsored: rel.includes('sponsored'),
      ugc: rel.includes('ugc'),
    });
  }
  return { links, total: document.links.length };
}
