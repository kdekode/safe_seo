/** Colector de imágenes (autocontenido: se inyecta en la página). */
export function collectImages() {
  const MAX = 1000;
  const shorten = (src) => (src.startsWith('data:') ? `${src.slice(0, 30)}…` : src.slice(0, 300));
  const images = [...document.images].slice(0, MAX).map((img) => ({
    src: shorten(img.currentSrc || img.src),
    alt: img.hasAttribute('alt') ? img.getAttribute('alt').trim() : null,
    hasDims: img.hasAttribute('width') && img.hasAttribute('height'),
    natural: img.naturalWidth,
    rendered: img.clientWidth,
    lazy: img.loading === 'lazy',
    inLink: img.closest('a[href]') !== null,
  }));
  return { images, total: document.images.length };
}
