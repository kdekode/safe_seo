/** Colector de datos estructurados (autocontenido: se inyecta en la página). */
export function collectSchema() {
  const parsed = [];
  const errors = [];
  document.querySelectorAll('script[type="application/ld+json" i]').forEach((script, index) => {
    try {
      parsed.push(JSON.parse(script.textContent));
    } catch (error) {
      errors.push({ block: index + 1, message: String(error.message).slice(0, 200) });
    }
  });

  const flatten = (node) => {
    if (Array.isArray(node)) return node.flatMap(flatten);
    if (node && typeof node === 'object') return node['@graph'] ? flatten(node['@graph']) : [node];
    return [];
  };

  const items = parsed
    .flatMap(flatten)
    .slice(0, 100)
    .map((node) => ({
      types: [].concat(node['@type'] ?? []).map(String),
      name: String(node.name ?? node.headline ?? '').slice(0, 120),
      json: JSON.stringify(node, null, 2).slice(0, 6000),
    }));

  const microdata = [...new Set([...document.querySelectorAll('[itemscope][itemtype]')].map((el) => el.getAttribute('itemtype')))].slice(0, 30);

  return {
    items,
    errors,
    microdata,
    rdfa: document.querySelectorAll('[typeof]').length,
    url: location.href,
  };
}
