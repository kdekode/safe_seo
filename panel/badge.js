/**
 * Punto de color en la esquina del icono de la extensión (solo en la pestaña
 * actual): verde = indexable, naranja = indexable con avisos, rosa = no indexable.
 * Funciona tanto en el panel como en el service worker.
 */
import { PANEL_ID } from '../src/shared.js';
import { VERDICT_LABEL } from './indexability.js';

const COLORS = { ok: '#6fed2f', warn: '#ff9a1f', bad: '#ed2f6f' };
const SIZES = [16, 32];

/** Guarda el veredicto en el iframe del panel para poder repintar el punto si el icono se restablece. */
function rememberState(id, state) {
  document.getElementById(id)?.setAttribute('data-state', state);
}

export async function setIndexDot(tabId, state) {
  const base = await createImageBitmap(await (await fetch(chrome.runtime.getURL('icons/icon-128.png'))).blob());

  const imageData = {};
  for (const size of SIZES) {
    const ctx = new OffscreenCanvas(size, size).getContext('2d');
    ctx.drawImage(base, 0, 0, size, size);
    const radius = size * 0.27;
    const center = size - radius - size * 0.03;
    for (const [r, color] of [[radius + size * 0.07, '#ffffff'], [radius, COLORS[state]]]) {
      ctx.beginPath();
      ctx.arc(center, center, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    imageData[size] = ctx.getImageData(0, 0, size, size);
  }
  await chrome.action.setIcon({ tabId, imageData });
  await chrome.action.setTitle({ tabId, title: `Safe SEO · ${VERDICT_LABEL[state]}` });
  await chrome.scripting.executeScript({ target: { tabId }, func: rememberState, args: [PANEL_ID, state] }).catch(() => {});
}
