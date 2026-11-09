# Pruebas de navegador del modo Historia

Se ejecutaron en Linux con Chromium sin interfaz y WebGL por software; simulan las teselas de relieve (AWS) e imagen (Esri) y un Supabase de mentira, así que **no necesitan internet**.

## Preparación
```
npm i -D puppeteer-core @sparticuz/chromium pngjs      # en Windows: usá una instalación de Chrome (executablePath o channel: 'chrome' en story-common.mjs)
VITE_EXPOSE_MAP=1 npx vite build --outDir /tmp/dist-story                       # sin Supabase
# con Supabase simulado y una pista de audio de prueba (copiá antes un .wav corto a src/assets/audio/ y borralo después):
VITE_EXPOSE_MAP=1 VITE_SUPABASE_URL=http://localhost:4174/fake-supabase VITE_SUPABASE_ANON_KEY=test npx vite build --outDir /tmp/dist-story-sb
```
Servir `dist-story` en el puerto 4173 y `dist-story-sb` en el 4174 (por ejemplo `python3 -m http.server 4173`) y correr cada guion con `node`.

## Guiones
| Archivo | Qué comprueba |
|---|---|
| `story-D.mjs` | **Píxeles reales**: el color de cada departamento cambia con el capítulo (resalte, atenuación, intensidad) |
| `story-A.mjs` | Escritorio: diseño, mapa fijo, rueda, los 7 capítulos (resalte, foco, cámara, Cauchari), sin animaciones repetidas, reversibilidad, indicadores («Información no disponible», ámbito provincial/departamental), galería de referencia, cambio de modo con el mismo mapa |
| `story-C1.mjs` | Celular (390×844): mapa arriba, sin desborde horizontal, gestos táctiles libres, capítulos legibles |
| `story-C2.mjs` | `prefers-reduced-motion`: cámara sin vuelo animado, sin pulsos |
| `story-B.mjs` | Supabase simulado (consulta, URL pública, foto rota) y música local (reproducir, silenciar, volumen) |

`VITE_EXPOSE_MAP` sólo expone `window.__map` para estas pruebas; no se usa en la compilación de producción.
**El rendimiento en una GPU real no se mide aquí.**
