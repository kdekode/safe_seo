/**
 * User-Agents de rastreadores y cambio temporal de la cabecera.
 * `fetch` no permite fijar User-Agent, así que se usa una regla de sesión de
 * declarativeNetRequest limitada a esta pestaña y a este dominio, que se
 * elimina en cuanto termina la petición.
 */
const CHROME = `${navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] ?? '130'}.0.0.0`;

export const USER_AGENTS = [
  { id: 'default', label: 'Navegador actual', value: null },
  {
    id: 'googlebot-mobile',
    label: 'Googlebot smartphone',
    value: `Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME} Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)`,
  },
  {
    id: 'googlebot-desktop',
    label: 'Googlebot escritorio',
    value: `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/${CHROME} Safari/537.36`,
  },
  { id: 'bingbot', label: 'Bingbot', value: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)' },
  {
    id: 'gptbot',
    label: 'GPTBot (OpenAI)',
    value: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1; +https://openai.com/gptbot',
  },
];

const originPattern = (url) => {
  const { protocol, hostname } = new URL(url);
  return `${protocol}//${hostname}/*`;
};

export const hasAccess = (url) => chrome.permissions.contains({ origins: [originPattern(url)] });
export const requestAccess = (url) => chrome.permissions.request({ origins: [originPattern(url)] });

/** Revoca todos los permisos de dominio concedidos a la extensión. */
export async function revokeAccess() {
  const { origins = [] } = await chrome.permissions.getAll();
  if (origins.length) await chrome.permissions.remove({ origins });
}

let active = 0;

/** Ejecuta `task` con el User-Agent indicado en las peticiones fetch de la pestaña. */
export async function withUserAgent(tab, userAgent, task) {
  const ruleId = tab.id;
  active++;
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [ruleId],
    addRules: [
      {
        id: ruleId,
        priority: 1,
        action: { type: 'modifyHeaders', requestHeaders: [{ header: 'user-agent', operation: 'set', value: userAgent }] },
        condition: { tabIds: [tab.id], requestDomains: [new URL(tab.url).hostname], resourceTypes: ['xmlhttprequest'] },
      },
    ],
  });
  try {
    return await task();
  } finally {
    if (--active === 0) await clearRule(tab.id);
  }
}

export const clearRule = (tabId) => chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [tabId] }).catch(() => {});
