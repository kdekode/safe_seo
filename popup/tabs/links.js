import { collectLinks } from '../../src/collectors/links.js';
import { card, checklist, csvButton, empty, filteredList, h, link, pill, row, toolbar } from '../ui.js';

const GENERIC = /^(click|clic|haz clic|pulsa|aqu[ií]|aqui|here|click here|m[aá]s|leer m[aá]s|ver m[aá]s|read more|more|link|enlace|saber m[aá]s)\.?$/i;
const isNavigable = (l) => l.http && !l.fragment;

const FILTERS = [
  { id: 'all', label: 'Todos', test: () => true },
  { id: 'internal', label: 'Internos', test: (l) => l.internal && !l.fragment },
  { id: 'external', label: 'Externos', test: (l) => l.http && !l.internal },
  { id: 'nofollow', label: 'nofollow', test: (l) => l.nofollow || l.sponsored || l.ugc },
  { id: 'noanchor', label: 'Sin anchor', test: (l) => isNavigable(l) && !l.text },
  { id: 'generic', label: 'Anchor genérico', test: (l) => GENERIC.test(l.text) },
  { id: 'other', label: 'mailto/tel/otros', test: (l) => !l.http },
];

function badges(l) {
  return [
    l.fragment ? pill('info', 'ancla') : l.internal ? pill('ok', 'interno') : l.http ? pill('info', 'externo') : pill('info', 'otro'),
    l.nofollow ? pill('warn', 'nofollow') : null,
    l.sponsored ? pill('warn', 'sponsored') : null,
    l.ugc ? pill('warn', 'ugc') : null,
  ];
}

export default {
  id: 'links',
  label: 'Enlaces',
  collect: collectLinks,
  render({ links, total }) {
    if (!links.length) return empty('Esta página no tiene enlaces.');
    const nav = links.filter(isNavigable);
    const noAnchor = nav.filter((l) => !l.text).length;
    const generic = links.filter((l) => GENERIC.test(l.text)).length;
    const internal = links.filter((l) => l.internal && !l.fragment).length;
    const unique = new Set(nav.map((l) => l.href.replace(/#.*$/, ''))).size;

    const items = [
      { level: internal ? 'ok' : 'warn', title: `${internal} enlaces internos`, detail: internal ? null : 'Sin enlazado interno la página queda aislada.' },
      { level: noAnchor ? 'warn' : 'ok', title: noAnchor ? `${noAnchor} enlace(s) sin texto ancla` : 'Todos los enlaces tienen anchor' },
      { level: generic ? 'warn' : 'ok', title: generic ? `${generic} anchor(s) genérico(s)` : 'Sin anchors genéricos', detail: generic ? '«Leer más» o «aquí» no aportan contexto.' : null },
      { level: 'info', title: `${links.length} enlaces · ${unique} URLs únicas` },
    ];
    if (total > links.length) items.push({ level: 'info', title: `Análisis limitado a ${links.length} de ${total} enlaces` });

    return h(
      'div',
      { class: 'stack' },
      checklist(items),
      toolbar(
        csvButton('Exportar CSV', 'enlaces.csv', () => [
          ['url', 'anchor', 'tipo', 'nofollow', 'sponsored', 'ugc'],
          ...links.map((l) => [l.href, l.text, l.fragment ? 'ancla' : l.internal ? 'interno' : l.http ? 'externo' : 'otro', l.nofollow, l.sponsored, l.ugc]),
        ]),
      ),
      filteredList({
        items: links,
        filters: FILTERS,
        searchText: (l) => `${l.text} ${l.href}`,
        row: (l) => row(h('span', { class: l.text ? '' : 'muted' }, l.text || '(sin anchor)'), link(l.href), badges(l)),
      }),
    );
  },
};
