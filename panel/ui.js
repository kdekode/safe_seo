/**
 * Helpers de UI. Todo el contenido dinámico se inserta con nodos de texto
 * (nunca innerHTML), así que el contenido de las páginas auditadas no puede
 * inyectar HTML ni scripts en el panel.
 */

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  el.append(...children.flat(Infinity).filter((c) => c != null && c !== false));
  return el;
}

const LEVEL_LABEL = { ok: 'OK', warn: 'Aviso', error: 'Error', info: 'Info' };

export const pill = (level, text = LEVEL_LABEL[level]) => h('span', { class: `pill pill-${level}` }, text);

/** Fila de comprobación: icono de estado + título + detalle. */
export const check = (level, title, detail) =>
  h(
    'li',
    { class: `check check-${level}` },
    pill(level),
    h('div', { class: 'check-body' }, h('strong', {}, title), detail ? h('span', { class: 'muted' }, detail) : null),
  );

/** Lista de comprobaciones con el resumen de estados arriba. */
export function checklist(items) {
  const count = (level) => items.filter((i) => i.level === level).length;
  return h(
    'section',
    { class: 'card' },
    h(
      'div',
      { class: 'summary' },
      ...['error', 'warn', 'ok'].map((level) => h('span', { class: `summary-${level}` }, `${count(level)} ${LEVEL_LABEL[level].toLowerCase()}${level === 'ok' ? '' : 's'}`)),
    ),
    h('ul', { class: 'checks' }, items.map((i) => check(i.level, i.title, i.detail))),
  );
}

/** Tabla clave/valor. Omite filas sin valor. */
export function kv(rows) {
  return h(
    'dl',
    { class: 'kv' },
    rows
      .filter(([, value]) => value !== '' && value != null)
      .flatMap(([key, value]) => [h('dt', {}, key), h('dd', {}, value)]),
  );
}

export const card = (title, ...body) => h('section', { class: 'card' }, title ? h('h2', {}, title) : null, ...body);

export const empty = (message) => h('p', { class: 'empty' }, message);

export const code = (text) => h('code', {}, text);

/** Medidor de longitud con zona recomendada [min, max]. */
export function meter(value, min, max, ceiling = max * 1.5) {
  const level = value === 0 ? 'error' : value < min || value > max ? 'warn' : 'ok';
  const width = Math.min(100, (value / ceiling) * 100);
  return h(
    'div',
    { class: `meter meter-${level}`, role: 'img', 'aria-label': `${value} de ${min}-${max} recomendados` },
    h('div', { class: 'meter-zone', style: `left:${(min / ceiling) * 100}%;width:${((max - min) / ceiling) * 100}%` }),
    h('div', { class: 'meter-bar', style: `width:${width}%` }),
  );
}

/** Enlace externo seguro: solo http(s), con noopener. */
export function link(href, text = href) {
  if (!/^https?:\/\//i.test(href)) return h('span', { class: 'url' }, text);
  return h('a', { class: 'url', href, target: '_blank', rel: 'noopener noreferrer' }, text);
}

export function button(label, onclick, title) {
  return h('button', { type: 'button', class: 'btn', title, onclick }, label);
}

/** Botón que copia texto y confirma brevemente. */
export function copyButton(label, getText) {
  const btn = button(label, async () => {
    await navigator.clipboard.writeText(getText());
    btn.textContent = '¡Copiado!';
    setTimeout(() => (btn.textContent = label), 1200);
  });
  return btn;
}

/** CSV seguro: escapa comillas y neutraliza fórmulas (=, +, -, @) de Excel/Sheets. */
export function toCsv(rows) {
  const cell = (value) => {
    let text = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return rows.map((row) => row.map(cell).join(',')).join('\n');
}

export function csvButton(label, filename, getRows) {
  return button(label, () => {
    const blob = new Blob(['﻿', toCsv(getRows())], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    h('a', { href: url, download: filename }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

/** Selector exclusivo en forma de chips. */
export function segmented(options, onChange) {
  const buttons = options.map((option, index) =>
    h(
      'button',
      {
        type: 'button',
        class: 'chip',
        'aria-pressed': String(index === 0),
        onclick: () => {
          buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
          onChange(option.id);
        },
      },
      option.label,
    ),
  );
  return h('div', { class: 'chips' }, buttons);
}

export const toolbar = (...children) => h('div', { class: 'toolbar' }, ...children);

/**
 * Barra de filtros: chips exclusivos + buscador.
 * `onChange({ filter, query })` se llama en cada cambio.
 */
export function filterBar(filters, onChange) {
  const state = { filter: filters[0].id, query: '' };
  const chips = filters.map((f) =>
    h(
      'button',
      {
        type: 'button',
        class: 'chip',
        'aria-pressed': String(f.id === state.filter),
        onclick: () => {
          state.filter = f.id;
          chips.forEach((c, i) => c.setAttribute('aria-pressed', String(filters[i].id === f.id)));
          onChange({ ...state });
        },
      },
      f.label,
      f.count != null ? h('span', { class: 'chip-count' }, String(f.count)) : null,
    ),
  );
  const search = h('input', {
    type: 'search',
    class: 'search',
    placeholder: 'Buscar…',
    'aria-label': 'Buscar',
    oninput: (e) => {
      state.query = e.target.value.trim().toLowerCase();
      onChange({ ...state });
    },
  });
  return h('div', { class: 'filters' }, h('div', { class: 'chips' }, chips), search);
}

/** Fila genérica de listado: título + subtítulo + badges. */
export const row = (title, sub, badges = []) =>
  h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), sub), h('div', { class: 'badges' }, badges));

/**
 * Listado filtrable con buscador. Solo pinta `cap` filas para mantener el
 * panel fluido; el CSV exporta siempre todo.
 */
export function filteredList({ items, filters, searchText, row: renderRow, cap = 150 }) {
  const list = h('div', { class: 'rows' });
  const note = h('p', { class: 'muted note' });

  const update = ({ filter, query }) => {
    const { test } = filters.find((f) => f.id === filter);
    const hits = items.filter((item) => test(item) && (!query || searchText(item).toLowerCase().includes(query)));
    list.replaceChildren(...hits.slice(0, cap).map(renderRow));
    note.textContent = !hits.length ? 'Sin resultados.' : hits.length > cap ? `Mostrando ${cap} de ${hits.length}. Exporta el CSV para verlos todos.` : `${hits.length} resultado(s)`;
  };

  const bar = filterBar(filters.map((f) => ({ id: f.id, label: f.label, count: items.filter(f.test).length })), update);
  update({ filter: filters[0].id, query: '' });
  return h('div', { class: 'stack' }, bar, note, list);
}

/** Visor JSON con colores (solo nodos de texto/span: seguro con contenido de terceros). */
export function jsonView(value) {
  const text = (JSON.stringify(value, null, 2) ?? 'null').slice(0, 30000);
  const pre = h('pre', { class: 'json' });
  const token = /("(?:\\.|[^"\\])*")(\s*:)?|\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|\b(true|false|null)\b/g;
  let last = 0;
  for (const m of text.matchAll(token)) {
    if (m.index > last) pre.append(text.slice(last, m.index));
    const kind = m[1] ? (m[2] ? 'j-key' : 'j-str') : m[3] ? 'j-num' : 'j-lit';
    pre.append(h('span', { class: kind }, m[1] ?? m[0]));
    if (m[2]) pre.append(m[2]);
    last = m.index + m[0].length;
  }
  pre.append(text.slice(last));
  return pre;
}

/** Bloque desplegable. */
export const details = (summary, open, ...body) => h('details', { open }, h('summary', {}, summary), ...body);
