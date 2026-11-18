import { collectTags } from '../../src/collectors/tags.js';
import { card, checklist, copyButton, details, empty, h, jsonView, pill } from '../ui.js';

const CONSENT_KEYS = ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization', 'functionality_storage', 'personalization_storage', 'security_storage'];

/** Estado de Consent Mode a partir de los comandos `consent` (sin region). */
function consentState(commands) {
  const state = { default: {}, update: {}, hasDefault: false, hasUpdate: false };
  for (const { command, args } of commands) {
    if (command !== 'consent') continue;
    const [kind, values] = args;
    if ((kind !== 'default' && kind !== 'update') || !values || typeof values !== 'object' || values.region) continue;
    Object.assign(state[kind], values);
    state[kind === 'default' ? 'hasDefault' : 'hasUpdate'] = true;
  }
  return state;
}

function audit(d, consent) {
  const items = [];
  const add = (level, title, detail) => items.push({ level, title, detail });
  const gtm = d.ids.filter((i) => i.kind === 'GTM');
  const ga4 = d.ids.filter((i) => i.kind === 'GA4');
  const ua = d.ids.filter((i) => i.kind === 'Universal Analytics');
  const vendor = (name) => d.vendors.some((v) => v.vendor === name);

  if (gtm.length === 1) add('ok', `Contenedor GTM: ${gtm[0].id}`);
  else if (gtm.length > 1) add('warn', `${gtm.length} contenedores GTM`, gtm.map((g) => g.id).join(', '));
  if (gtm.length && !d.noscriptGtm) add('info', 'GTM sin <noscript> de respaldo', 'Recomendado por Google justo tras <body>.');
  if (vendor('Google tag (gtag.js)') && vendor('Google Tag Manager')) add('warn', 'gtag.js y GTM cargados a la vez', 'Comprueba que la misma propiedad GA4 no se mida dos veces.');
  if (ga4.length > 1) add('info', `${ga4.length} propiedades GA4`, ga4.map((g) => g.id).join(', '));
  if (ua.length) add('warn', 'Universal Analytics (UA-) sigue instalado', 'UA dejó de procesar datos en 2023; migra a GA4.');

  const tracking = d.ids.length > 0 || d.vendors.length > 0;
  if (tracking && !consent.hasDefault) add('info', 'No se detecta Consent Mode (consent default)', 'Si usas un CMP, puede cargarse después de aceptar cookies.');
  if (consent.hasDefault) {
    const missing = ['ad_user_data', 'ad_personalization'].filter((k) => !(k in consent.default));
    if (missing.length) add('warn', 'Consent Mode v2 incompleto', `Faltan en default: ${missing.join(', ')} (obligatorios para Ads en el EEE).`);
    else add('ok', 'Consent Mode v2: default completo');
    if (!consent.hasUpdate) add('info', 'Sin consent update todavía', 'Normal hasta que el usuario acepta o rechaza el banner.');
  }
  if (!items.length) add('info', 'No se detectan etiquetas de analítica ni publicidad');
  return items;
}

const consentPill = (value) => (value ? pill(value === 'granted' ? 'ok' : 'error', value) : h('span', { class: 'muted' }, '—'));

function consentCard(consent) {
  if (!consent.hasDefault && !consent.hasUpdate) return null;
  return card(
    'Consent Mode',
    h(
      'table',
      { class: 'cmp' },
      h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Por defecto'), h('th', {}, 'Tras update'))),
      h('tbody', {}, CONSENT_KEYS.filter((k) => k in consent.default || k in consent.update).map((k) => h('tr', {}, h('th', {}, k), h('td', {}, consentPill(consent.default[k])), h('td', {}, consentPill(consent.update[k]))))),
    ),
  );
}

export default {
  id: 'tags',
  label: 'Tags',
  world: 'MAIN',
  collect: collectTags,
  render(d) {
    if (!d.ids.length && !d.vendors.length && !d.snippets.length && !d.commands.length) return empty('No se detecta GTM, gtag ni píxeles en esta página (puede cargarse tras aceptar cookies: pulsa ↻).');
    const consent = consentState(d.commands);

    return h(
      'div',
      { class: 'stack' },
      checklist(audit(d, consent)),
      d.ids.length
        ? card(
            'IDs de medición',
            h(
              'div',
              { class: 'rows' },
              d.ids.map((i) => h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('code', {}, i.id), h('span', { class: 'muted' }, `  ${i.kind}`)), h('div', { class: 'badges' }, i.via.map((v) => pill('info', { script: 'script', inline: 'inline', runtime: 'activo' }[v]))))),
            ),
          )
        : null,
      consentCard(consent),
      d.commands.length
        ? card(
            `Comandos gtag (${d.commands.length})`,
            h(
              'div',
              { class: 'stack' },
              d.commands.map((c, n) => details(h('span', {}, h('code', {}, c.command), ' ', h('span', { class: 'muted' }, typeof c.args[0] === 'string' ? c.args[0] : '')), false, jsonView(c.args))),
            ),
          )
        : null,
      d.vendors.length
        ? card(
            'Scripts de terceros',
            h('div', { class: 'rows' }, d.vendors.map((v) => h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('strong', {}, v.vendor), h('div', { class: 'url muted' }, v.url)), h('div', { class: 'badges' }, pill('info', v.where))))),
          )
        : null,
      d.snippets.length
        ? card(
            'Snippets inline',
            h(
              'div',
              { class: 'stack' },
              d.snippets.map((s) => details(h('span', {}, s.label, ' ', h('span', { class: 'muted' }, `en ${s.where}${s.truncated ? ' · recortado' : ''}`)), false, h('pre', { class: 'json' }, s.code), copyButton('Copiar', () => s.code))),
            ),
          )
        : null,
    );
  },
};
