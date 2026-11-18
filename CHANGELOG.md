# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [SemVer](https://semver.org/lang/es/).

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
