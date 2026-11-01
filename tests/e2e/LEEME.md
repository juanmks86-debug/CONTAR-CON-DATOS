# Prueba de extremo a extremo (navegador)

Se ejecutó en Linux con Chromium sin interfaz y WebGL por software. Simula las teselas de relieve (AWS) e imagen (Esri), así que **no necesita internet**.

1. `npm i -D puppeteer-core @sparticuz/chromium pngjs`  (en Windows reemplazá `@sparticuz/chromium` por una instalación de Chrome y pasá `executablePath` o `channel: 'chrome'` en `e2e.mjs`)
2. `VITE_EXPOSE_MAP=1 npx vite build --outDir /tmp/dist-test` (expone `window.__map` sólo para la prueba)
3. Servir esa carpeta en `http://localhost:4173` y ejecutar `node tests/e2e/e2e.mjs`.

Lo que mide: carga, selección, zoom/rotación/desplazamiento, aparición progresiva de la escena, controles, selección de elementos, filtros, cambio de departamento, memoria y errores de consola. **El rendimiento en GPU real no se mide ahí**: el emulador por software es mucho más lento que cualquier placa.
