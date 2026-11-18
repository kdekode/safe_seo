# Safe SEO

Extensión para Chromium (Manifest V3) con auditoría SEO on-page al instante.

## Principios
- **Seguridad**: solo `activeTab` + `scripting`; sin `host_permissions`, sin servidores, sin telemetría, sin código remoto, CSP estricta.
- **Privacidad**: todo se analiza en local, en la propia pestaña.
- **Eficiencia**: cada pestaña ejecuta su colector solo cuando se abre y el resultado se cachea.
- **Sin XSS**: el contenido de la página nunca se inserta como HTML (solo nodos de texto).

## Uso
Pulsa el icono para abrir/cerrar el panel (30 % del ancho, a la derecha). El deslizador de la cabecera ajusta la transparencia.

## Instalación (desarrollo)
1. `chrome://extensions` → activar *Modo desarrollador*.
2. *Cargar descomprimida* → elegir esta carpeta.

## Estructura
```
manifest.json
panel/            UI (panel.js = shell, ui.js = helpers, tabs/ = una pestaña por archivo)
src/collectors/   funciones autocontenidas que se inyectan en la página
scripts/          utilidades (iconos, empaquetado)
```

## Añadir una pestaña
1. Crea `src/collectors/<nombre>.js` con una función **autocontenida** (se serializa e inyecta).
2. Crea `panel/tabs/<nombre>.js` exportando `{ id, label, collect, render }`.
3. Regístrala en `panel/tabs/index.js`.

## Versionado
SemVer. Un commit por versión, con tag `vX.Y.Z` y entrada en `CHANGELOG.md`. La versión vive en `manifest.json`.
