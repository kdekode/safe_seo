import { cssMode } from '../../src/collectors/view.js';
import { button, card, h, pill } from '../ui.js';

const PERMISSION = { permissions: ['contentSettings'] };
const pattern = (url) => `${new URL(url).protocol}//${new URL(url).hostname}/*`;
const scopeOf = (tab) => (tab.incognito ? 'incognito_session_only' : 'regular');

/** Tarjeta de CSS: se aplica en la página al instante y es reversible. */
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

/** Tarjeta de JavaScript: usa contentSettings (permiso opcional) y recarga la pestaña. */
function jsCard(tab, ctx) {
  const body = h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Comprobando…'));
  const note = h('p', { class: 'muted note' }, 'Al cambiarlo la página se recarga y el panel se cierra: pulsa el icono para volver a abrirlo. El bloqueo afecta a todo el sitio hasta que lo reactives.');

  async function draw() {
    if (!(await chrome.permissions.contains(PERMISSION))) {
      body.replaceChildren(
        h('p', {}, 'Para bloquear el JavaScript del sitio hace falta un permiso de Chrome (contentSettings). Solo se pide si lo activas y puedes retirarlo después.'),
        button('Permitir control de JavaScript', async () => {
          if (await chrome.permissions.request(PERMISSION)) draw();
        }),
      );
      return;
    }
    const { setting } = await chrome.contentSettings.javascript.get({ primaryUrl: tab.url, incognito: tab.incognito });
    const blocked = setting === 'block';
    body.replaceChildren(
      h('div', { class: 'event-head' }, blocked ? pill('warn', 'JS bloqueado') : pill('ok', 'JS activo'), h('span', { class: 'muted' }, new URL(tab.url).hostname)),
      button(blocked ? 'Reactivar JS y recargar' : 'Desactivar JS y recargar', async () => {
        if (blocked) await chrome.contentSettings.javascript.clear({ scope: scopeOf(tab) });
        else await chrome.contentSettings.javascript.set({ primaryPattern: pattern(tab.url), setting: 'block', scope: scopeOf(tab) });
        await chrome.tabs.reload(tab.id);
      }),
      blocked
        ? h('p', { class: 'muted note' }, 'Si sigue bloqueado tras reactivar, el bloqueo viene de la configuración global de Chrome, no de esta extensión.')
        : h('p', { class: 'muted note' }, 'Con JS bloqueado ves lo que obtiene un rastreador que no ejecuta JavaScript. Las pestañas Eventos y Tags quedarán vacías.'),
    );
  }
  draw().catch((error) => body.replaceChildren(h('p', { class: 'error-box' }, `No se pudo leer el estado: ${error.message}`)));
  return card('JavaScript', body, note);
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
      jsCard(ctx.tab, ctx),
      card('Qué mirar', h('p', { class: 'muted' }, 'Sin CSS: ¿el contenido sigue un orden lógico y no hay texto oculto o keyword stuffing? Sin JS: ¿se ven el contenido principal, los enlaces y los encabezados? Lo que desaparece depende del renderizado.')),
    );
  },
};
