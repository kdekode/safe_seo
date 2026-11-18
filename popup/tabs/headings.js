import { collectHeadings } from '../../src/collectors/headings.js';
import { card, checklist, copyButton, empty, h, pill, toolbar } from '../ui.js';

function audit(headings) {
  const items = [];
  const add = (level, title, detail) => items.push({ level, title, detail });
  const h1s = headings.filter((x) => x.level === 1);

  if (h1s.length === 0) add('error', 'No hay H1');
  else if (h1s.length > 1) add('warn', `${h1s.length} H1 en la página`);
  else add('ok', 'Un único H1');

  if (headings[0].level !== 1) add('warn', `El primer encabezado es un H${headings[0].level}`, 'El H1 debería abrir la jerarquía.');
  const skips = headings.filter((x, i) => i > 0 && x.level > headings[i - 1].level + 1);
  if (skips.length) add('warn', `${skips.length} salto(s) de nivel`, 'Ej.: pasar de H2 a H4 rompe la jerarquía.');
  const blanks = headings.filter((x) => !x.text).length;
  if (blanks) add('error', `${blanks} encabezado(s) vacío(s)`);
  const hidden = headings.filter((x) => x.hidden).length;
  if (hidden) add('info', `${hidden} encabezado(s) oculto(s)`, 'Visibles para Google pero no para el usuario.');
  return items;
}

const outline = (headings) => headings.map((x) => `${'  '.repeat(x.level - 1)}H${x.level} ${x.text}`).join('\n');

export default {
  id: 'headings',
  label: 'Encabezados',
  collect: collectHeadings,
  render(headings) {
    if (!headings.length) return empty('Esta página no tiene encabezados (H1–H6).');
    const counts = [1, 2, 3, 4, 5, 6].map((n) => [n, headings.filter((x) => x.level === n).length]).filter(([, c]) => c);
    return h(
      'div',
      { class: 'stack' },
      checklist(audit(headings)),
      toolbar(copyButton('Copiar esquema', () => outline(headings)), h('span', { class: 'muted' }, counts.map(([n, c]) => `H${n}: ${c}`).join(' · '))),
      card(
        null,
        h(
          'div',
          { class: 'rows' },
          headings.map((x, i) => {
            const skipped = i > 0 && x.level > headings[i - 1].level + 1;
            return h(
              'div',
              { class: 'row heading-row', style: `padding-left:${(x.level - 1) * 14}px` },
              h('code', { class: `tag tag-h${x.level}` }, `H${x.level}`),
              h('span', { class: x.text ? 'row-title' : 'row-title muted' }, x.text || '(vacío)'),
              skipped ? pill('warn', 'salto') : null,
              x.hidden ? pill('info', 'oculto') : null,
            );
          }),
        ),
      ),
    );
  },
};
