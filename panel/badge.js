/**
 * Punto de color en la esquina del icono de la extensión (solo en la pestaña
 * actual): verde = indexable, naranja = indexable con avisos, rosa = no indexable.
 */
import { VERDICT_LABEL } from './indexability.js';

const COLORS = { ok: '#6fed2f', warn: '#ff9a1f', bad: '#ed2f6f' };
const SIZES = [16, 32];

export async function setIndexDot(tabId, state) {
  const base = new Image();
  base.src = chrome.runtime.getURL('icons/icon-128.png');
  await base.decode();

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
}
