import { collectEvents } from '../../src/collectors/events.js';
import { card, checklist, copyButton, empty, h, pill } from '../ui.js';

const POLL_MS = 1500;

const ECOMMERCE = new Set(['view_item_list', 'select_item', 'view_item', 'add_to_cart', 'remove_from_cart', 'view_cart', 'begin_checkout', 'add_shipping_info', 'add_payment_info', 'purchase', 'refund', 'add_to_wishlist', 'view_promotion', 'select_promotion']);
const ENGAGEMENT = new Set(['page_view', 'scroll', 'click', 'file_download', 'form_start', 'form_submit', 'generate_lead', 'login', 'sign_up', 'search', 'view_search_results', 'share', 'video_start', 'video_progress', 'video_complete', 'user_engagement']);
const META = new Set(['PageView', 'ViewContent', 'AddToCart', 'AddToWishlist', 'InitiateCheckout', 'AddPaymentInfo', 'Purchase', 'Lead', 'CompleteRegistration', 'Search', 'Contact', 'Subscribe', 'SubmitApplication']);

const GROUPS = ['Ecommerce', 'Interacción', 'Meta Pixel', 'Otros', 'GTM interno'];
const isInternal = (e) => e.name.startsWith('gtm.');

function groupOf(e) {
  if (isInternal(e)) return 'GTM interno';
  if (ECOMMERCE.has(e.name)) return 'Ecommerce';
  if (ENGAGEMENT.has(e.name)) return 'Interacción';
  if (META.has(e.name)) return 'Meta Pixel';
  return 'Otros';
}

// Eventos GA4 que llevan `items` y los que exigen currency si hay value
const NEEDS_ITEMS = new Set(['view_item_list', 'select_item', 'view_item', 'add_to_cart', 'remove_from_cart', 'view_cart', 'begin_checkout', 'add_shipping_info', 'add_payment_info', 'purchase', 'refund', 'add_to_wishlist']);
const NEEDS_CURRENCY = new Set(['view_item', 'add_to_cart', 'add_to_wishlist', 'view_cart', 'begin_checkout', 'add_shipping_info', 'add_payment_info', 'purchase', 'refund']);

/** Validación básica del esquema GA4 para eventos de dataLayer/gtag. */
function validate(e) {
  const items = [];
  const add = (level, title, detail) => items.push({ level, title, detail });
  if (!['dataLayer', 'gtag'].includes(e.source)) {
    add('info', 'Hit capturado en la red', 'Muestra los parámetros tal y como se enviaron (p. ej. ep.* = parámetros de evento, pr1 = producto).');
    return items;
  }
  if (!ECOMMERCE.has(e.name)) {
    add('info', 'Sin validaciones específicas para este evento');
    return items;
  }
  const data = e.data?.ecommerce && typeof e.data.ecommerce === 'object' ? e.data.ecommerce : e.data ?? {};
  if (NEEDS_ITEMS.has(e.name)) {
    const list = data.items;
    if (!Array.isArray(list) || !list.length) add('error', 'Falta el array items', 'En GTM va dentro de ecommerce.items; con gtag, en los parámetros.');
    else {
      const bad = list.filter((i) => !i?.item_id && !i?.item_name).length;
      add(bad ? 'error' : 'ok', bad ? `${bad} item(s) sin item_id ni item_name` : `${list.length} item(s) con identificador`);
    }
  }
  if (e.name === 'purchase') add(data.transaction_id ? 'ok' : 'error', data.transaction_id ? 'transaction_id presente' : 'Falta transaction_id', data.transaction_id ? null : 'Obligatorio en purchase; sin él se pueden duplicar compras.');
  if (NEEDS_CURRENCY.has(e.name)) {
    if (data.value != null && !data.currency) add('error', 'Hay value pero falta currency', 'GA4 ignora los ingresos sin moneda.');
    else if (data.value == null) add('warn', 'Falta value', 'Recomendado para medir ingresos.');
    else add('ok', `value ${data.value} ${data.currency}`);
  }
  return items;
}

const fmtTime = (t) => (t == null ? 'antes de abrir el panel' : `+${(t / 1000).toFixed(2)} s desde la carga`);

function toolsCard(tools) {
  const pills = [
    ...tools.gtm.map((id) => pill('info', id)),
    ...tools.ga4.map((id) => pill('info', `GA4 ${id}`)),
    ...tools.ads.map((id) => pill('info', `Ads ${id}`)),
    ...tools.pixels.map((id) => pill('info', `Meta ${id}`)),
    ...tools.others.map((label) => pill('info', label)),
  ];
  return card(
    'Herramientas detectadas',
    pills.length ? h('div', { class: 'badges left' }, pills) : h('p', { class: 'muted' }, 'Ninguna por ahora. Si carga tras aceptar cookies, aparecerá aquí.'),
    tools.layers.length ? h('p', { class: 'muted note' }, `dataLayer: ${tools.layers.join(', ')}`) : null,
  );
}

export default {
  id: 'events',
  label: 'Eventos',
  world: 'MAIN',
  cache: false,
  collect: collectEvents,
  render(initial, ctx) {
    let events = [...initial.events];
    let total = initial.total;
    let selected = null;
    let tools = initial.tools;

    const toolsBox = h('div', {});
    const select = h('select', { class: 'select wide', 'aria-label': 'Evento', onchange: () => ((selected = Number(select.value)), showDetail()) });
    const hideInternal = h('input', { type: 'checkbox', checked: true, onchange: () => rebuild() });
    const follow = h('input', { type: 'checkbox' });
    const status = h('span', { class: 'muted note' });
    const detail = h('div', { class: 'stack' });

    const visible = () => events.filter((e) => !(hideInternal.checked && isInternal(e)));

    function rebuild() {
      const list = visible();
      if (follow.checked && list.length) selected = list.at(-1).id;
      if (!list.some((e) => e.id === selected)) selected = list.at(-1)?.id ?? null;
      select.replaceChildren(
        ...GROUPS.map((group) => {
          const options = list.filter((e) => groupOf(e) === group);
          return options.length
            ? h('optgroup', { label: group }, options.map((e) => h('option', { value: e.id, selected: e.id === selected }, `#${e.id} · ${e.name} · ${e.source}`)))
            : null;
        }),
      );
      if (selected != null) select.value = String(selected);
      status.textContent = `${list.length} evento(s)${events.length !== list.length ? ` (${events.length - list.length} ocultos)` : ''} · en vivo`;
      showDetail();
    }

    function showDetail() {
      const e = events.find((x) => x.id === selected);
      if (!e) {
        detail.replaceChildren(empty('Aún no se ha detectado ningún evento. Interactúa con la página (añadir al carrito, enviar un formulario…) y aparecerán aquí.'));
        return;
      }
      const json = JSON.stringify(e.data, null, 2);
      detail.replaceChildren(
        h('div', { class: 'event-head' }, pill('info', e.source), h('strong', {}, e.name), h('span', { class: 'muted' }, fmtTime(e.t))),
        checklist(validate(e)),
        h('pre', { class: 'json tall' }, json),
        copyButton('Copiar JSON', () => json),
      );
    }

    const clear = h('button', { type: 'button', class: 'btn', onclick: () => ((events = []), rebuild()) }, 'Limpiar');

    // Sondeo incremental mientras la pestaña esté abierta
    let busy = false;
    const timer = setInterval(async () => {
      if (busy) return;
      busy = true;
      try {
        const next = await ctx.call(total);
        if (next.total < total) events = []; // la página se recargó: estado nuevo
        if (next.events.length || next.total < total) {
          events.push(...next.events);
          total = next.total;
          rebuild();
        }
        if (JSON.stringify(next.tools) !== JSON.stringify(tools)) {
          tools = next.tools;
          toolsBox.replaceChildren(toolsCard(tools));
        }
      } catch {
        /* página navegando: se reintenta en el siguiente ciclo */
      } finally {
        busy = false;
      }
    }, POLL_MS);
    ctx.onLeave(() => clearInterval(timer));

    toolsBox.replaceChildren(toolsCard(tools));
    const view = h(
      'div',
      { class: 'stack' },
      toolsBox,
      card(
        'Evento',
        h('div', { class: 'stack' }, select, h('div', { class: 'toolbar' }, h('label', { class: 'check-inline' }, hideInternal, ' Ocultar gtm.*'), h('label', { class: 'check-inline' }, follow, ' Seguir el último'), clear), status),
      ),
      detail,
      h('p', { class: 'muted note' }, 'dataLayer/gtag = lo que empuja la página. «(red)» = lo que realmente se envió a GA4, UA o Meta. Los lotes por POST no se ven en red.'),
    );
    rebuild();
    return view;
  },
};
