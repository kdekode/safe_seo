import { cssMode } from '../../src/collectors/view.js';
import { button, card, h, pill } from '../ui.js';

/** CSS: se aplica en la propia página al instante y es reversible. */
function cssCard(status, ctx) {
  const body = h('div', { class: 'stack' });
  const draw = (s) =>
    body.replaceChildren(
      h('div', { class: 'event-head' }, s.active ? pill('warn', 'CSS desactivado') : pill('ok', 'CSS activo'), s.active ? h('span', { class: 'muted' }, `${s.sheets} hojas · ${s.inline} estilos en línea`) : null),
      button(s.active ? 'Reactivar CSS' : 'Desactivar CSS', async () => draw(await ctx.call(s.active ? 'on' : 'off'))),
      h('p', { class: 'muted note' }, 'Útil para revisar el orden real del HTML y el texto oculto con CSS. Los estilos que el JavaScript vuelva a escribir en línea no se quitan.'),
    );
  draw(status);
  return card('CSS', body);
}

export default {
  id: 'view',
  label: 'Vista',
  cache: false,
  collect: cssMode,
  render(status, ctx) {
    return h(
      'div',
      { class: 'stack' },
      cssCard(status, ctx),
      card('Qué mirar', h('p', { class: 'muted' }, 'Sin CSS: ¿el contenido sigue un orden lógico y no hay texto oculto o keyword stuffing? Para ver qué contenido depende de JavaScript, usa la pestaña Código (HTML inicial vs. renderizado).')),
    );
  },
};
