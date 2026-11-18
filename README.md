<h1 align="center">Safe SEO</h1>

<p align="center">
  Auditoría SEO y de analítica en un panel lateral, para cualquier navegador basado en Chromium.<br />
  Todo se analiza en tu equipo. Sin servidores, sin telemetría, con permisos mínimos.
</p>

<p align="center">
  <img alt="Versión" src="https://img.shields.io/badge/versi%C3%B3n-0.10.1-2F6FED" />
  <img alt="Manifest V3" src="https://img.shields.io/badge/Manifest-V3-ACC5F8" />
  <img alt="Licencia MIT" src="https://img.shields.io/badge/licencia-MIT-6FED2F" />
  <img alt="Permisos" src="https://img.shields.io/badge/permisos-activeTab%20%2B%20scripting-ED2F6F" />
</p>

---

Pulsas el icono y se abre un panel sobre la página (30 % del ancho, translúcido y con tema claro u oscuro). En el propio icono aparece un punto de color que te dice si la página se puede indexar.

## Punto de indexación

| Color | Significado | Ejemplos |
| :---: | --- | --- |
| Verde | Indexable | Sin bloqueos detectados |
| Naranja | Indexable, pero con avisos | Canonical a otra URL, `nofollow`, bloqueada por `robots.txt`, redirección |
| Rosa | No indexable | `noindex` en meta o en `X-Robots-Tag`, error HTTP 4xx/5xx |

El punto aparece al pulsar el icono y se afina unos segundos después con `robots.txt` y las cabeceras HTTP.

## Pestañas

| Pestaña | Qué te enseña |
| --- | --- |
| **General** | Vista previa en Google, title, description, H1, canonical, robots, HTTPS, idioma, viewport, URL y contenido |
| **Encabezados** | Jerarquía H1–H6 con saltos de nivel, vacíos y ocultos. Copia el esquema |
| **Enlaces** | Internos y externos, `nofollow`/`sponsored`/`ugc`, anchors vacíos o genéricos. Filtros, búsqueda y CSV |
| **Imágenes** | `alt` ausente o vacío, sin dimensiones (CLS), sobredimensionadas, lazy-loading. CSV |
| **Social** | Open Graph y Twitter Card, con vista previa |
| **Schema** | JSON-LD (incluido `@graph`), Microdata y RDFa, con errores de sintaxis |
| **Técnico** | Estado HTTP, cabeceras, `robots.txt` para Googlebot, sitemaps, hreflang, contenido mixto y Web Vitals |
| **Código** | HTML inicial frente a DOM renderizado: qué contenido depende de JavaScript |
| **Eventos** | En vivo: `dataLayer`, `gtag` y los hits reales a GA4, Universal Analytics, Meta Pixel y Google Ads |
| **Tags** | GTM, GA4, Ads, Consent Mode v2, comandos `gtag`, scripts de terceros y snippets inline |

### Pensada para quien mide

- **Eventos agrupados:** los repetidos se colapsan con un contador, ignorando parámetros que cambian en cada hit.
- **Filtro «Clave»:** `purchase`, `add_to_cart`, `begin_checkout`, `generate_lead` y las conversiones de Ads.
- **Validación de ecommerce GA4:** `items`, `currency` junto a `value` y `transaction_id` en `purchase`.
- **Alertas:** compra duplicada, conversión de Ads sin `value`, Meta sin `event_id`.
- **JSON de cada evento** al final del detalle, con colores y botón de copiar.

## Instalación

La extensión aún no está en ninguna tienda. Para usarla en local:

1. Clona el repositorio:
   ```bash
   git clone git@github.com:kdekode/safe_seo.git
   ```
2. Abre `chrome://extensions` (o `brave://extensions`) y activa el **modo desarrollador**.
3. Pulsa **Cargar descomprimida** y elige la carpeta del proyecto.

Requiere Chrome o un navegador basado en Chromium 112 o superior.

> **Brave:** Shields bloquea por defecto Google Analytics, GTM y Meta Pixel. Si las pestañas **Eventos** y **Tags** salen vacías, baja los Shields en el sitio que estés auditando.

## Privacidad y permisos

Nada sale de tu navegador. La extensión no tiene servidor, no registra tu actividad y no carga código remoto.

| Permiso | Para qué |
| --- | --- |
| `activeTab` | Acceso temporal a la pestaña actual, solo cuando pulsas el icono |
| `scripting` | Inyectar el panel y leer metadatos, enlaces y datos de analítica de la página auditada |

No hay `host_permissions`: no puede leer ninguna página hasta que la abres tú. Las peticiones de la pestaña **Técnico** son al mismo origen y sin cookies. Los enlaces a servicios externos (Rich Results Test, PageSpeed Insights, Wayback Machine) solo se abren si los pulsas.

La CSP es estricta y el contenido de las páginas nunca se inserta como HTML en el panel, solo como texto. Las exportaciones a CSV neutralizan las celdas que empiezan por `=`, `+`, `-` o `@` para evitar inyección de fórmulas.

## Limitaciones

- El punto del icono se calcula al abrir el panel. Sin permiso sobre todos los sitios, la extensión no puede analizar páginas por su cuenta.
- La pestaña **Código** muestra el HTML que descarga tu navegador, no la copia que guarda Google. Google retiró `cache:` en 2024 y no hay forma de reproducir su renderizador.
- Los lotes de eventos de GA4 enviados por `POST` no son visibles en red. Sí se ven en `dataLayer`.
- Las métricas de rendimiento son las observadas hasta ese momento, no datos de campo (CrUX).

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

**Añadir una pestaña**

1. Crea `src/collectors/<nombre>.js` con una función **autocontenida**: se serializa e inyecta, así que no puede usar imports ni variables externas.
2. Crea `panel/tabs/<nombre>.js` exportando `{ id, label, collect, render }`. Usa `world: 'MAIN'` solo si necesitas leer variables de la página y `cache: false` para vistas en vivo.
3. Regístrala en `panel/tabs/index.js`.

**Empaquetar:** `./scripts/package.sh` genera `dist/safe-seo-<versión>.zip` con `git archive`.

**Versionado:** [SemVer](https://semver.org/lang/es/). Un commit por versión con su etiqueta `vX.Y.Z` y una entrada en [`CHANGELOG.md`](CHANGELOG.md). La versión vive en `manifest.json`.

## Licencia

[MIT](LICENSE). Puedes usarla, modificarla y distribuirla, incluso con fines comerciales, siempre que conserves el aviso de copyright y la licencia.
