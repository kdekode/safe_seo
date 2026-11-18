/** Colector de encabezados (autocontenido: se inyecta en la página). */
export function collectHeadings() {
  const clean = (text) => text.replace(/\s+/g, ' ').trim();
  return [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].slice(0, 1000).map((el) => ({
    level: Number(el.tagName[1]),
    text: clean(el.textContent).slice(0, 160),
    hidden: !el.checkVisibility(),
  }));
}
