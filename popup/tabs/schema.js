import { collectSchema } from '../../src/collectors/schema.js';
import { card, checklist, copyButton, empty, h, link, pill, toolbar } from '../ui.js';

export default {
  id: 'schema',
  label: 'Schema',
  collect: collectSchema,
  render({ items, errors, microdata, rdfa, url }) {
    const checks = [];
    if (errors.length) errors.forEach((e) => checks.push({ level: 'error', title: `JSON-LD #${e.block} inválido`, detail: e.message }));
    if (items.length) checks.push({ level: 'ok', title: `${items.length} entidad(es) JSON-LD`, detail: [...new Set(items.flatMap((i) => i.types))].join(', ') });
    if (microdata.length) checks.push({ level: 'info', title: `Microdata: ${microdata.length} tipo(s)`, detail: microdata.map((t) => t.replace(/^https?:\/\/schema\.org\//, '')).join(', ') });
    if (rdfa) checks.push({ level: 'info', title: `${rdfa} elemento(s) con RDFa` });
    if (!items.length && !errors.length && !microdata.length && !rdfa) return empty('No se encontraron datos estructurados (JSON-LD, Microdata o RDFa).');

    return h(
      'div',
      { class: 'stack' },
      checklist(checks),
      toolbar(h('span', { class: 'muted' }, 'Validación completa: '), link(`https://search.google.com/test/rich-results?url=${encodeURIComponent(url)}`, 'Rich Results Test ↗')),
      ...items.map((item) =>
        card(
          null,
          h('details', {}, h('summary', {}, item.types.map((t) => pill('info', t)), ' ', h('strong', {}, item.name)), h('pre', { class: 'json' }, item.json), copyButton('Copiar JSON', () => item.json)),
        ),
      ),
    );
  },
};
