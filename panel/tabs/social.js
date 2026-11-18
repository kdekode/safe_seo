import { collectSocial } from '../../src/collectors/social.js';
import { card, checklist, empty, h, kv, link } from '../ui.js';

const REQUIRED = [
  ['og:title', 'warn'],
  ['og:description', 'warn'],
  ['og:image', 'warn'],
  ['og:url', 'warn'],
  ['og:type', 'info'],
  ['twitter:card', 'warn'],
];

export default {
  id: 'social',
  label: 'Social',
  collect: collectSocial,
  render({ tags, pageTitle }) {
    const get = (key) => tags.find((t) => t.key === key)?.value ?? '';
    const items = REQUIRED.map(([key, level]) => (get(key) ? { level: 'ok', title: key, detail: get(key) } : { level, title: `Falta ${key}` }));

    const image = get('og:image');
    if (image && !/^https:\/\//i.test(image)) items.push({ level: 'warn', title: 'og:image debería ser una URL absoluta https', detail: image });
    if (!get('og:image') && get('twitter:image')) items.push({ level: 'info', title: 'Solo hay twitter:image', detail: 'Facebook y LinkedIn usan og:image.' });

    return h(
      'div',
      { class: 'stack' },
      checklist(items),
      card(
        'Vista previa al compartir',
        h(
          'div',
          { class: 'share' },
          h('div', { class: 'share-site muted' }, get('og:site_name') || (get('og:url') && new URL(get('og:url'), 'https://x').hostname) || ''),
          h('div', { class: 'share-title' }, get('og:title') || get('twitter:title') || pageTitle || '(sin título)'),
          h('div', { class: 'muted' }, get('og:description') || get('twitter:description') || '(sin descripción)'),
          image ? h('div', { class: 'muted' }, 'Imagen: ', link(image)) : null,
          h('p', { class: 'muted note' }, 'Por privacidad la imagen no se descarga.'),
        ),
      ),
      tags.length ? card('Todas las etiquetas', kv(tags.map((t) => [t.key, t.value]))) : empty('No hay etiquetas Open Graph ni Twitter Card.'),
    );
  },
};
