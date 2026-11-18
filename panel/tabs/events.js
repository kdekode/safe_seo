import { collectEvents } from '../../src/collectors/events.js';
import { card, checklist, copyButton, empty, h, jsonView, kv, pill, segmented } from '../ui.js';

const POLL_MS = 1500;

const ECOMMERCE = new Set(['view_item_list', 'select_item', 'view_item', 'add_to_cart', 'remove_from_cart', 'view_cart', 'begin_checkout', 'add_shipping_info', 'add_payment_info', 'purchase', 'refund', 'add_to_wishlist', 'view_promotion', 'select_promotion']);
const ENGAGEMENT = new Set(['page_view', 'scroll', 'click', 'file_download', 'form_start', 'form_submit', 'generate_lead', 'login', 'sign_up', 'search', 'view_search_results', 'share', 'video_start', 'video_progress', 'video_complete', 'user_engagement']);
const META = new Set(['PageView', 'ViewContent', 'AddToCart', 'AddToWishlist', 'InitiateCheckout', 'AddPaymentInfo', 'Purchase', 'Lead', 'CompleteRegistration', 'Search', 'Contact', 'Subscribe', 'SubmitApplication']);
// Lo que un técnico de Ads/Analytics suele querer ver primero
const KEY = new Set(['purchase', 'add_to_cart', 'begin_checkout', 'add_payment_info', 'view_item', 'generate_lead', 'sign_up', 'Purchase', 'AddToCart', 'InitiateCheckout', 'ViewContent', 'Lead', 'CompleteRegistration']);

const GROUPS = ['Ecommerce', 'Ads y conversiones', 'Interacción', 'Meta Pixel', 'Otros', 'Ruido (gtm, comandos)'];

// Parámetros que cambian en cada hit y no distinguen un evento de su repetición
const NOISE_KEYS = new Set(['gtm.uniqueEventId', 'gtm.start', 'eventCallback', 'eventTimeout', 'ts', 'it', 'rl', '_s', '_et', 'z', 'random', '_p', 'sct', 'tag_exp', 'gtm', '_eu', 'cbid', 'sid', '_nsi', '_ss', '_fv', 'rqm', 'dt', 'tfd']);

const isNetwork = (e) => e.source.endsWith('(red)');
const isNoise = (e) => e.name.startsWith('gtm.') || e.name.startsWith('gtag ') || e.name === '(variables)';
const isKey = (e) => KEY.has(e.name) || (e.source === 'Ads (red)' && e.name === 'conversion');

function groupOf(e) {
  if (isNoise(e)) return GROUPS[5];
  if (e.source === 'Ads (red)') return GROUPS[1];
  if (ECOMMERCE.has(e.name)) return GROUPS[0];
  if (ENGAGEMENT.has(e.name)) return GROUPS[2];
  if (META.has(e.name)) return GROUPS[3];
  return GROUPS[4];
}

const FILTERS = {
  all: () => true,
  key: isKey,
  network: isNetwork,
  datalayer: (e) => !isNetwork(e),
};

const fingerprint = (e) => {
  const data = e.data && typeof e.data === 'object' && !Array.isArray(e.data) ? Object.fromEntries(Object.entries(e.data).filter(([k]) => !NOISE_KEYS.has(k))) : e.data;
  return `${e.source}|${e.name}|${JSON.stringify(data)}`;
};

/* ---------- Extracción de datos por tipo de evento ---------- */

const ecom = (e) => (e.data?.ecommerce && typeof e.data.ecommerce === 'object' ? e.data.ecommerce : e.data) ?? {};
const ITEM_KEYS = { id: 'item_id', nm: 'item_name', pr: 'price', qt: 'quantity', ca: 'item_category', br: 'item_brand', va: 'item_variant' };

function itemsOf(e) {
  if (e.source === 'GA4 (red)') {
    return Object.entries(e.data)
      .filter(([k]) => /^pr\d+$/.test(k))
      .map(([, v]) => Object.fromEntries(String(v).split('~').map((t) => [ITEM_KEYS[t.slice(0, 2)] ?? t.slice(0, 2), t.slice(2)])));
  }
  const items = ecom(e).items;
  return Array.isArray(items) ? items.filter((i) => i && typeof i === 'object') : [];
}

function highlights(e) {
  const d = e.data ?? {};
  const c = ecom(e);
  const rows = [];
  const add = (label, value) => value != null && value !== '' && rows.push([label, String(value)]);
  switch (e.source) {
    case 'GA4 (red)':
      add('Medición (tid)', d.tid); add('Página (dl)', d.dl); add('value', d['epn.value'] ?? d['ep.value']); add('currency', d.cu ?? d['ep.currency']); add('transaction_id', d['ep.transaction_id']); add('Consent (gcs)', d.gcs);
      break;
    case 'Meta (red)':
      add('Pixel', d.id); add('value', d['cd[value]']); add('currency', d['cd[currency]']); add('content_ids', d['cd[content_ids]']); add('event_id (eid)', d.eid); add('Página (dl)', d.dl);
      break;
    case 'Ads (red)':
      add('Cuenta', d.conversion_id); add('label', d.label); add('value', d.value); add('currency', d.currency_code); add('order id (oid)', d.oid); add('Página (url)', d.url);
      break;
    case 'UA (red)':
      add('Propiedad (tid)', d.tid); add('Página (dp)', d.dp); add('Categoría (ec)', d.ec); add('Acción (ea)', d.ea); add('Etiqueta (el)', d.el); add('Valor (ev)', d.ev);
      break;
    default:
      add('value', c.value); add('currency', c.currency); add('transaction_id', c.transaction_id); add('coupon', c.coupon); add('shipping', c.shipping); add('tax', c.tax); add('event_id', d.event_id ?? d.eventID);
  }
  return rows;
}

function summary(e) {
  const rows = Object.fromEntries(highlights(e));
  const n = itemsOf(e).length;
  return [rows.value && `${rows.value}${rows.currency ? ` ${rows.currency}` : ''}`, n && `${n} item${n > 1 ? 's' : ''}`, rows.transaction_id && `#${rows.transaction_id}`].filter(Boolean).join(' · ');
}

/* ---------- Validación ---------- */

const NEEDS_ITEMS = new Set(['view_item_list', 'select_item', 'view_item', 'add_to_cart', 'remove_from_cart', 'view_cart', 'begin_checkout', 'add_shipping_info', 'add_payment_info', 'purchase', 'refund', 'add_to_wishlist']);
const NEEDS_CURRENCY = new Set(['view_item', 'add_to_cart', 'add_to_wishlist', 'view_cart', 'begin_checkout', 'add_shipping_info', 'add_payment_info', 'purchase', 'refund']);

function validate(e) {
  const out = [];
  const add = (level, title, detail) => out.push({ level, title, detail });
  const rows = Object.fromEntries(highlights(e));

  if (e.source === 'Meta (red)') {
    if (e.name === 'Purchase') add(rows.value && rows.currency ? 'ok' : 'error', rows.value && rows.currency ? 'value y currency presentes' : 'Purchase sin value o currency', 'Meta no puede optimizar por ingresos sin ellos.');
    add(rows['event_id (eid)'] ? 'ok' : 'info', rows['event_id (eid)'] ? 'event_id presente (permite deduplicar con la API de Conversiones)' : 'Sin event_id', 'Necesario para deduplicar con la API de Conversiones (CAPI).');
    return out;
  }
  if (e.source === 'Ads (red)') {
    if (e.name === 'conversion') {
      add(rows.label ? 'ok' : 'warn', rows.label ? `Etiqueta de conversión: ${rows.label}` : 'Sin label de conversión');
      add(rows.value && rows.currency ? 'ok' : 'warn', rows.value && rows.currency ? 'value y currency presentes' : 'Conversión sin value/currency', 'Imprescindible para pujas por valor (tROAS).');
    } else add('info', e.name === 'remarketing' ? 'Hit de remarketing' : 'Hit de lista de remarketing');
    return out;
  }
  if (e.source === 'GA4 (red)' || e.source === 'UA (red)') {
    if (e.source === 'GA4 (red)' && e.name === 'purchase') {
      add(rows.transaction_id ? 'ok' : 'error', rows.transaction_id ? 'transaction_id presente' : 'Falta transaction_id');
      add(rows.value && rows.currency ? 'ok' : 'warn', rows.value && rows.currency ? `value ${rows.value} ${rows.currency}` : 'Falta value o currency');
    } else add('info', 'Hit capturado en la red', 'Parámetros tal y como se enviaron (ep.* = texto, epn.* = número).');
    return out;
  }
  if (!ECOMMERCE.has(e.name)) {
    add('info', 'Sin validaciones específicas para este evento');
    return out;
  }
  const c = ecom(e);
  if (NEEDS_ITEMS.has(e.name)) {
    if (!Array.isArray(c.items) || !c.items.length) add('error', 'Falta el array items', 'En GTM va dentro de ecommerce.items; con gtag, en los parámetros.');
    else {
      const bad = c.items.filter((i) => !i?.item_id && !i?.item_name).length;
      add(bad ? 'error' : 'ok', bad ? `${bad} item(s) sin item_id ni item_name` : `${c.items.length} item(s) con identificador`);
    }
  }
  if (e.name === 'purchase') add(c.transaction_id ? 'ok' : 'error', c.transaction_id ? 'transaction_id presente' : 'Falta transaction_id', c.transaction_id ? null : 'Obligatorio en purchase; sin él se pueden duplicar compras.');
  if (NEEDS_CURRENCY.has(e.name)) {
    if (c.value != null && !c.currency) add('error', 'Hay value pero falta currency', 'GA4 ignora los ingresos sin moneda.');
    else if (c.value == null) add('warn', 'Falta value', 'Recomendado para medir ingresos.');
    else add('ok', `value ${c.value} ${c.currency}`);
  }
  return out;
}

/* ---------- Alertas globales ---------- */

function alerts(events) {
  const out = [];
  const add = (level, title, detail) => out.push({ level, title, detail });

  const buys = new Map();
  for (const e of events.filter((x) => x.name === 'purchase' || (x.source === 'Meta (red)' && x.name === 'Purchase'))) {
    const id = ecom(e).transaction_id ?? e.data?.['ep.transaction_id'] ?? e.data?.oid ?? e.data?.eid;
    if (id == null) continue;
    const key = `${e.source}|${id}`;
    buys.set(key, (buys.get(key) ?? 0) + 1);
  }
  for (const [key, n] of buys) if (n > 1) add('error', `Compra duplicada: ${key.replace('|', ' · ')} ×${n}`, 'Infla conversiones e ingresos en Analytics y Ads.');

  const unique = [...new Map(events.map((e) => [fingerprint(e), e])).values()];
  const broken = unique.filter((e) => !isNoise(e) && validate(e).some((v) => v.level === 'error')).length;
  if (broken) add('warn', `${broken} evento(s) con errores de esquema`, 'Elígelos en el desplegable para ver el detalle.');

  const adsNoValue = unique.filter((e) => e.source === 'Ads (red)' && e.name === 'conversion' && !e.data.value).length;
  if (adsNoValue) add('warn', `${adsNoValue} conversión(es) de Ads sin value`);

  if (unique.some((e) => e.source === 'Meta (red)' && e.name !== 'PageView') && unique.every((e) => !e.data?.eid)) add('info', 'Meta Pixel sin event_id', 'Si usas la API de Conversiones, necesitas event_id para evitar duplicados.');

  if (!out.length) add('ok', events.length ? 'Sin alertas en los eventos capturados' : 'Esperando eventos…');
  return out;
}

/* ---------- Vistas ---------- */

const fmtTime = (t) => (t == null ? 'antes de abrir el panel' : `+${(t / 1000).toFixed(2)} s`);

function toolsCard(tools) {
  const pills = [
    ...tools.gtm.map((id) => pill('info', id)),
    ...tools.ga4.map((id) => pill('info', `GA4 ${id}`)),
    ...tools.ads.map((id) => pill('info', `Ads ${id}`)),
    ...tools.pixels.map((id) => pill('info', `Meta ${id}`)),
    ...tools.others.map((label) => pill('info', label)),
  ];
  return card('Herramientas detectadas', pills.length ? h('div', { class: 'badges left' }, pills) : h('p', { class: 'muted' }, 'Ninguna por ahora. Si carga tras aceptar cookies, aparecerá aquí.'));
}

function itemsTable(items) {
  if (!items.length) return null;
  const cols = ['item_id', 'item_name', 'price', 'quantity', 'item_category'].filter((c) => items.some((i) => i[c] != null));
  return h(
    'div',
    { class: 'table-wrap' },
    h(
      'table',
      { class: 'cmp' },
      h('thead', {}, h('tr', {}, cols.map((c) => h('th', {}, c)))),
      h('tbody', {}, items.slice(0, 50).map((i) => h('tr', {}, cols.map((c) => h('td', {}, i[c] == null ? '—' : String(i[c])))))),
    ),
  );
}

function detailView(entry) {
  const { e, count, ids } = entry;
  const json = JSON.stringify(e.data, null, 2);
  const keyRows = highlights(e);
  return h(
    'div',
    { class: 'stack' },
    card(
      null,
      h('div', { class: 'event-head' }, h('strong', { class: 'event-name' }, e.name), pill('info', e.source), isKey(e) ? pill('ok', 'clave') : null, count > 1 ? pill('warn', `×${count}`) : null),
      h('p', { class: 'muted note' }, `${fmtTime(e.t)}${count > 1 ? ` · repetido en #${ids.join(', #')}` : ` · #${e.id}`}`),
      keyRows.length ? kv(keyRows) : null,
    ),
    checklist(validate(e)),
    itemsTable(itemsOf(e)) ? card(`Productos (${itemsOf(e).length})`, itemsTable(itemsOf(e))) : null,
    card('Así se ve el evento (JSON)', jsonView(e.data), copyButton('Copiar JSON', () => json)),
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
    let tools = initial.tools;
    let selected = null;
    let mode = 'all';
    let current = [];

    const toolsBox = h('div', {});
    const alertsBox = h('div', {});
    const select = h('select', { class: 'select wide', 'aria-label': 'Evento', onchange: () => ((selected = Number(select.value)), showDetail()) });
    const check = (label, checked, onChange) => {
      const input = h('input', { type: 'checkbox', checked, onchange: onChange });
      return [input, h('label', { class: 'check-inline' }, input, ` ${label}`)];
    };
    const [hideNoise, hideLabel] = check('Ocultar ruido', true, () => rebuild());
    const [dedupe, dedupeLabel] = check('Agrupar repetidos', true, () => rebuild());
    const [follow, followLabel] = check('Seguir el último', false, () => rebuild());
    const status = h('span', { class: 'muted note' });
    const detail = h('div', { class: 'stack' });

    function entries() {
      const list = events.filter((e) => !(hideNoise.checked && isNoise(e)) && FILTERS[mode](e));
      if (!dedupe.checked) return list.map((e) => ({ e, count: 1, ids: [e.id] }));
      const map = new Map();
      for (const e of list) {
        const key = fingerprint(e);
        const group = map.get(key);
        if (group) {
          group.count++;
          group.ids.push(e.id);
        } else map.set(key, { e, count: 1, ids: [e.id] });
      }
      return [...map.values()];
    }

    function rebuild() {
      current = entries();
      if (follow.checked && current.length) selected = current.at(-1).e.id;
      if (!current.some((en) => en.e.id === selected)) selected = current.at(-1)?.e.id ?? null;
      select.replaceChildren(
        ...GROUPS.map((group) => {
          const list = current.filter((en) => groupOf(en.e) === group);
          return list.length
            ? h(
                'optgroup',
                { label: `${group} (${list.length})` },
                list.map(({ e, count }) => h('option', { value: e.id }, [`${e.name}${count > 1 ? ` ×${count}` : ''}`, e.source, summary(e)].filter(Boolean).join(' · '))),
              )
            : null;
        }),
      );
      if (selected != null) select.value = String(selected);
      const dupes = events.length - new Set(events.map(fingerprint)).size;
      status.textContent = `${current.length} mostrados · ${events.length} capturados${dupes ? ` · ${dupes} repetidos` : ''} · en vivo`;
      alertsBox.replaceChildren(card('Alertas', checklist(alerts(events))));
      showDetail();
    }

    function showDetail() {
      const entry = current.find((en) => en.e.id === selected);
      detail.replaceChildren(entry ? detailView(entry) : empty('Aún no hay eventos que mostrar. Interactúa con la página (añadir al carrito, enviar un formulario…) o prueba otro filtro.'));
    }

    // Sondeo incremental mientras la pestaña esté abierta
    let busy = false;
    const timer = setInterval(async () => {
      if (busy) return;
      busy = true;
      try {
        const next = await ctx.call(total);
        const reloaded = next.total < total; // la página se recargó: estado nuevo
        if (reloaded) events = [];
        if (next.events.length || reloaded) {
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
    const filters = segmented(
      [
        { id: 'all', label: 'Todos' },
        { id: 'key', label: 'Clave (ads)' },
        { id: 'network', label: 'Solo red' },
        { id: 'datalayer', label: 'Solo dataLayer' },
      ],
      (id) => ((mode = id), rebuild()),
    );
    const view = h(
      'div',
      { class: 'stack' },
      toolsBox,
      alertsBox,
      card(
        'Evento',
        h(
          'div',
          { class: 'stack' },
          filters,
          select,
          h('div', { class: 'toolbar' }, hideLabel, dedupeLabel, followLabel, h('button', { type: 'button', class: 'btn', onclick: () => ((events = []), rebuild()) }, 'Limpiar')),
          status,
        ),
      ),
      detail,
      h('p', { class: 'muted note' }, 'dataLayer/gtag = lo que empuja la página. «(red)» = lo que realmente se envió. Un mismo evento puede verse en ambos. Los lotes por POST no se ven en red.'),
    );
    rebuild();
    return view;
  },
};
