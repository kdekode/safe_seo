import general from './general.js';
import headings from './headings.js';
import links from './links.js';
import images from './images.js';
import social from './social.js';
import schema from './schema.js';
import technical from './technical.js';

/** Orden de pestañas. Cada una exporta { id, label, collect, render }. */
export const TABS = [general, headings, links, images, social, schema, technical];
