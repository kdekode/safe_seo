<h1 align="center">Safe SEO</h1>

<p align="center">
  Una extensión para Chromium que abre un panel lateral con los datos SEO y de analítica de la página que tienes delante.
</p>

<p align="center">
  <img alt="Versión" src="https://img.shields.io/badge/versi%C3%B3n-0.10.1-2F6FED" />
  <img alt="Manifest V3" src="https://img.shields.io/badge/Manifest-V3-ACC5F8" />
  <img alt="Licencia MIT" src="https://img.shields.io/badge/licencia-MIT-6FED2F" />
  <img alt="Permisos" src="https://img.shields.io/badge/permisos-activeTab%20%2B%20scripting-ED2F6F" />
</p>

---

Pulsas el icono y aparece un panel que ocupa el 30 % del ancho de la página, algo translúcido, con tema claro u oscuro. Todo lo que muestra se calcula en tu navegador: no hay servidor detrás ni se envía nada a ningún sitio.

En el icono verás además un punto de color que avisa de si la página se puede indexar o no.

## El punto del icono

| Color | Qué quiere decir | Cuándo sale |
| :---: | --- | --- |
| Verde | Se puede indexar | No se ha detectado ningún bloqueo |
| Naranja | Se puede indexar, pero ojo | Canonical a otra URL, `nofollow`, bloqueada en `robots.txt` o una redirección |
| Rosa | No se puede indexar | `noindex` en la meta o en `X-Robots-Tag`, o un error HTTP 4xx/5xx |

Sale nada más pulsar el icono. Unos segundos después se corrige, cuando ya se han leído `robots.txt` y las cabeceras HTTP.

## Qué hay en cada pestaña

| Pestaña | Contenido |
| --- | --- |
| General | Vista previa en Google, title, description, H1, canonical, robots, HTTPS, idioma, viewport, URL y contenido |
| Encabezados | Jerarquía H1 a H6, marcando saltos de nivel, encabezados vacíos y ocultos. Puedes copiar el esquema |
| Enlaces | Internos y externos, con `nofollow`, `sponsored` y `ugc`, y anchors vacíos o genéricos. Filtros, búsqueda y exportación a CSV |
| Imágenes | `alt` ausente o vacío, falta de dimensiones (CLS), imágenes demasiado grandes y lazy-loading. También en CSV |
| Social | Open Graph y Twitter Card con su vista previa |
| Schema | JSON-LD (incluido `@graph`), Microdata y RDFa, con los errores de sintaxis |
| Técnico | Estado HTTP, cabeceras, `robots.txt` para Googlebot, sitemaps, hreflang, contenido mixto y Web Vitals |
| Código | HTML inicial frente al DOM renderizado, para ver qué contenido depende de JavaScript |
| Eventos | En directo: `dataLayer`, `gtag` y los hits reales a GA4, Universal Analytics, Meta Pixel y Google Ads |
| Tags | GTM, GA4, Ads, Consent Mode v2, comandos `gtag`, scripts de terceros y snippets inline |

### Para quien trabaja con analítica

Las pestañas Eventos y Tags son las que más peso tienen en el día a día de un proyecto de medición, y por eso tienen algunos detalles extra:

- Los eventos repetidos se agrupan con un contador, sin tener en cuenta los parámetros que cambian en cada hit.
- El filtro «Clave» deja solo `purchase`, `add_to_cart`, `begin_checkout`, `generate_lead` y las conversiones de Ads.
- En ecommerce de GA4 se comprueba que haya `items` y `currency` junto a `value`, y `transaction_id` en `purchase`.
- Salta un aviso si hay una compra duplicada, una conversión de Ads sin `value` o un evento de Meta sin `event_id`.
- Al final del detalle de cada evento tienes su JSON con colores y un botón para copiarlo.

## Instalación

No está publicada en ninguna tienda, así que de momento se instala a mano:

1. Clona el repositorio:
   ```bash
   git clone git@github.com:kdekode/safe_seo.git
   ```
2. Abre `chrome://extensions` (o `brave://extensions`) y activa el modo desarrollador.
3. Pulsa «Cargar descomprimida» y elige la carpeta del proyecto.

Necesitas Chrome, o un navegador basado en Chromium, en la versión 112 o posterior.

> Si usas Brave, los Shields bloquean por defecto Google Analytics, GTM y Meta Pixel. Si Eventos y Tags te salen vacías, desactiva los Shields en el sitio que estés auditando.

## Privacidad y permisos

La extensión no tiene servidor, no guarda tu actividad y no descarga código de fuera. Pide solo dos permisos:

| Permiso | Para qué lo usa |
| --- | --- |
| `activeTab` | Acceder a la pestaña actual, y solo cuando pulsas el icono |
| `scripting` | Inyectar el panel y leer de la página los metadatos, los enlaces y los datos de analítica |

No declara `host_permissions`, así que no puede leer ninguna página que no hayas abierto tú con el icono. Las peticiones de la pestaña Técnico van al mismo origen y sin cookies. Los enlaces a Rich Results Test, PageSpeed Insights y Wayback Machine solo se abren si pulsas en ellos.

La CSP es estricta. El contenido de las páginas se pinta siempre como texto y nunca como HTML. En las exportaciones a CSV, las celdas que empiezan por `=`, `+`, `-` o `@` se neutralizan para que no se interpreten como fórmulas.

## Lo que no hace

- El punto del icono se calcula al abrir el panel. Sin permiso sobre todos los sitios, la extensión no puede analizar páginas por su cuenta.
- La pestaña Código enseña el HTML que descarga tu navegador, no la copia que tiene Google. Google quitó `cache:` en 2024 y su renderizador no se puede reproducir.
- Los lotes de eventos de GA4 que se mandan por `POST` no se ven en la red, aunque sí aparecen en `dataLayer`.
- Las métricas de rendimiento son las que se han observado hasta ese momento. No son datos de campo (CrUX).

## Desarrollo

```
manifest.json
src/
  background.js        service worker: abre el panel y pinta el punto del icono
  shared.js            constantes compartidas
  collectors/          funciones autocontenidas que se inyectan en la página
panel/
  panel.html|css|js    shell del panel: pestañas, tema, transparencia, veredicto
  ui.js                helpers de interfaz (solo nodos de texto, nunca innerHTML)
  indexability.js      veredicto de indexabilidad (función pura)
  badge.js             dibujo del punto en el icono
  tabs/                una pestaña por archivo
icons/                 generados con scripts/make-icons.py
scripts/               iconos y empaquetado
```

Para añadir una pestaña:

1. Crea `src/collectors/<nombre>.js` con una función autocontenida. Se serializa y se inyecta en la página, así que no puede usar imports ni variables de fuera.
2. Crea `panel/tabs/<nombre>.js` y exporta `{ id, label, collect, render }`. Pon `world: 'MAIN'` solo si necesitas leer variables de la página, y `cache: false` si la vista es en directo.
3. Regístrala en `panel/tabs/index.js`.

Para empaquetar, `./scripts/package.sh` genera `dist/safe-seo-<versión>.zip` con `git archive`.

Sigo [SemVer](https://semver.org/lang/es/): un commit por versión, con su etiqueta `vX.Y.Z` y una entrada en [`CHANGELOG.md`](CHANGELOG.md). La versión se define en `manifest.json`.

## Licencia

[MIT](LICENSE). Úsala, modifícala y compártela como quieras, también para trabajo comercial, mientras conserves el aviso de copyright y la licencia.
