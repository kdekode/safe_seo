# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [SemVer](https://semver.org/lang/es/).

## [0.6.0] - 2026-11-18
### Añadido
- Pestaña **Eventos** (en vivo): desplegable con los eventos de `dataLayer`/`gtag` y los hits reales enviados a GA4, Universal Analytics y Meta Pixel, agrupados (Ecommerce, Interacción, Meta Pixel, Otros, GTM interno). Al elegir uno se ve su JSON; copiar, limpiar, seguir el último y ocultar `gtm.*`.
- Validación del esquema GA4 de ecommerce (`items`, `currency`/`value`, `transaction_id` en `purchase`).
- Detección de herramientas: GTM, GA4, Ads, Meta Pixel, TikTok, LinkedIn, Pinterest, X, Hotjar, Clarity, HubSpot.
- Infraestructura de pestañas: `world: 'MAIN'`, `cache: false` y contexto `{ call, onLeave }` para vistas en vivo.

## [0.5.2] - 2026-11-18
### Corregido
- Las pestañas Técnico y Código quedaban ocultas a la derecha en el panel estrecho; la barra de pestañas ahora se reparte en varias filas.

## [0.5.1] - 2026-11-18
### Eliminado
- Selector «Ver como» (User-Agent), `ua.js` y los permisos `declarativeNetRequest` y `optional_host_permissions`: daba más problemas que valor. La extensión vuelve a necesitar solo `activeTab` + `scripting`.

## [0.5.0] - 2026-11-18
### Añadido
- Selector **«Ver como»** (Googlebot smartphone/escritorio, Bingbot, GPTBot) para las pestañas Técnico y Código. Usa una regla temporal de `declarativeNetRequest` limitada a la pestaña y al dominio; el permiso del dominio se pide solo al elegir un bot y puede revocarse desde el panel.
- Pestaña **Código**: HTML inicial vs. DOM renderizado (title, description, canonical, robots, H1, enlaces, imágenes, JSON-LD, palabras), avisos de contenido que depende de JavaScript, visor de código/texto y enlaces a Rich Results Test, PageSpeed y Wayback.
### Permisos
- Nuevo `declarativeNetRequest` y `optional_host_permissions` (solo se conceden bajo demanda, por dominio).

## [0.4.0] - 2026-11-18
### Cambiado
- El popup pasa a ser un **panel lateral superpuesto** (25 % del ancho, alto completo) que se abre/cierra al pulsar el icono.
- Fondo translúcido con desenfoque, control de transparencia (50–100 %) y tipografía/contraste mejorados.
- `popup/` renombrado a `panel/`; nuevo service worker `src/background.js`.
- `use_dynamic_url` en el recurso accesible para que las webs no detecten la extensión.

## [0.3.0] - 2026-11-18
### Añadido
- Pestaña **Social**: Open Graph y Twitter Card con comprobaciones y vista previa (sin descargar la imagen, por privacidad).
- Pestaña **Schema**: JSON-LD (incl. `@graph`), errores de sintaxis, Microdata y RDFa; copiar JSON.
- Pestaña **Técnico**: estado HTTP y cabeceras (`X-Robots-Tag`, compresión, HSTS), veredicto de `robots.txt` para Googlebot y `*`, sitemaps y presencia de la URL, hreflang, contenido mixto, LCP/CLS/FCP/TTFB y tamaño del DOM.

## [0.2.0] - 2026-11-18
### Añadido
- Pestaña **Encabezados**: esquema H1–H6 con detección de saltos, vacíos y ocultos; copiar esquema.
- Pestaña **Enlaces**: internos/externos/nofollow/sponsored/ugc, anchors vacíos o genéricos, filtros, búsqueda y exportación CSV (a prueba de inyección de fórmulas).
- Pestaña **Imágenes**: alt ausente/vacío, falta de dimensiones (CLS), sobredimensionadas, lazy-loading y CSV.
- Helpers `filteredList` y `row` con renderizado limitado para no ralentizar el popup.

## [0.1.0] - 2026-11-18
### Añadido
- Estructura MV3 con permisos mínimos (`activeTab`, `scripting`) y CSP estricta.
- Pestaña **General**: vista previa SERP, auditoría (title, description, H1, robots, canonical, HTTPS, lang, viewport, URL, contenido), medidores de longitud y datos clave.
