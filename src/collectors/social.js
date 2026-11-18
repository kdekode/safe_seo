/** Colector de metadatos sociales (autocontenido: se inyecta en la página). */
export function collectSocial() {
  const tags = [...document.querySelectorAll('meta')]
    .map((meta) => ({
      key: (meta.getAttribute('property') || meta.getAttribute('name') || '').trim().toLowerCase(),
      value: (meta.getAttribute('content') ?? '').trim().slice(0, 500),
    }))
    .filter((tag) => /^(og:|twitter:|article:|fb:)/.test(tag.key))
    .slice(0, 100);
  return { tags, pageTitle: document.title.trim() };
}
