import { collectImages } from '../../src/collectors/images.js';
import { checklist, csvButton, empty, filteredList, h, link, pill, row, toolbar } from '../ui.js';

const oversized = (i) => i.rendered > 0 && i.natural > i.rendered * 2 && i.natural > 400;

const FILTERS = [
  { id: 'all', label: 'Todas', test: () => true },
  { id: 'noalt', label: 'Sin alt', test: (i) => i.alt === null },
  { id: 'emptyalt', label: 'Alt vacío', test: (i) => i.alt === '' },
  { id: 'nodims', label: 'Sin width/height', test: (i) => !i.hasDims },
  { id: 'oversized', label: 'Sobredimensionadas', test: oversized },
];

export default {
  id: 'images',
  label: 'Imágenes',
  collect: collectImages,
  render({ images, total }) {
    if (!images.length) return empty('Esta página no tiene imágenes <img>.');
    const count = (test) => images.filter(test).length;
    const noAlt = count((i) => i.alt === null);
    const linkNoAlt = count((i) => i.inLink && !i.alt);
    const noDims = count((i) => !i.hasDims);
    const big = count(oversized);

    const items = [
      { level: noAlt ? 'error' : 'ok', title: noAlt ? `${noAlt} imagen(es) sin atributo alt` : 'Todas las imágenes tienen alt', detail: noAlt ? 'Afecta a accesibilidad y a Google Imágenes.' : null },
      { level: linkNoAlt ? 'error' : 'ok', title: linkNoAlt ? `${linkNoAlt} imagen(es)-enlace sin alt` : 'Imágenes-enlace con alt', detail: linkNoAlt ? 'El alt hace de texto ancla.' : null },
      { level: noDims ? 'warn' : 'ok', title: noDims ? `${noDims} sin width/height` : 'Todas con dimensiones', detail: noDims ? 'Provoca saltos de maquetación (CLS).' : null },
      { level: big ? 'warn' : 'ok', title: big ? `${big} sobredimensionada(s)` : 'Tamaños ajustados', detail: big ? 'Se descargan a más del doble de su tamaño visible.' : null },
      { level: 'info', title: `${count((i) => i.lazy)} con lazy-loading de ${images.length}` },
    ];
    if (total > images.length) items.push({ level: 'info', title: `Análisis limitado a ${images.length} de ${total} imágenes` });

    return h(
      'div',
      { class: 'stack' },
      checklist(items),
      toolbar(
        csvButton('Exportar CSV', 'imagenes.csv', () => [
          ['src', 'alt', 'ancho natural', 'ancho visible', 'dimensiones declaradas', 'lazy'],
          ...images.map((i) => [i.src, i.alt ?? '(sin alt)', i.natural, i.rendered, i.hasDims, i.lazy]),
        ]),
      ),
      filteredList({
        items: images,
        filters: FILTERS,
        searchText: (i) => `${i.alt ?? ''} ${i.src}`,
        row: (i) =>
          row(
            h('span', { class: i.alt ? '' : 'muted' }, i.alt === null ? '(sin alt)' : i.alt || '(alt vacío)'),
            link(i.src),
            [
              i.alt === null ? pill('error', 'sin alt') : i.alt === '' ? pill('info', 'decorativa') : null,
              !i.hasDims ? pill('warn', 'sin dims') : null,
              oversized(i) ? pill('warn', `${i.natural}→${i.rendered}px`) : null,
            ],
          ),
      }),
    );
  },
};
