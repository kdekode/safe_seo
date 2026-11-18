import general from './general.js';
import headings from './headings.js';
import links from './links.js';
import images from './images.js';

/** Orden de pestañas. Cada una exporta { id, label, collect, render }. */
export const TABS = [general, headings, links, images];
