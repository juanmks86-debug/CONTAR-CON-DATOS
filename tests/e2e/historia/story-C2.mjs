import { launch, ok, sleep } from './story-common.mjs';
const h = await launch({ width: 1280, height: 720, reduced: true }); const { page } = h;
await page.waitForFunction(() => window.__map && window.__map.loaded() && document.querySelectorAll('[data-chapter]').length === 7, { timeout: 90000 });
await h.settle(1500);
ok('Movimiento reducido: el sistema lo informa', await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
const t0 = Date.now(); await page.click('[data-rail="mineria"]');
const scrolled = await page.waitForFunction(() => document.querySelector('[data-rail][aria-current="step"]')?.dataset.rail === 'mineria', { timeout: 8000 }).then(() => Date.now() - t0, () => -1);
ok('Movimiento reducido: el scroll al capítulo es inmediato (sin desplazamiento suave)', scrolled >= 0 && scrolled < 1500, `${scrolled} ms hasta el capítulo activo`);
const mov = []; for (const w of [0, 150, 300]) { await sleep(w ? 150 : 0); mov.push(await page.evaluate(() => ({ moving: window.__map.isMoving(), z: +window.__map.getZoom().toFixed(2) }))); }
ok('Movimiento reducido: la cámara llega sin vuelo animado (nunca en movimiento tras activarse el capítulo)', mov.every((m) => !m.moving) && mov.at(-1).z > 6.5, mov.map((m) => `${m.moving ? 'en movimiento' : 'quieta'} z${m.z}`).join(' → '));
await page.click('[data-rail="energia"]'); await h.scrollDone(); await h.settle(1800);
ok('Movimiento reducido: el punto de interés no pulsa', await page.evaluate(() => { const p = document.querySelector('.poi-pulse'); return !!p && getComputedStyle(p).animationName === 'none'; }));
ok('Movimiento reducido: la cámara enfoca Cauchari igualmente', await page.evaluate(() => { const c = window.__map.getCenter(); return Math.hypot(c.lng + 66.71382, c.lat + 24.10169) < 0.03; }));
ok('Movimiento reducido: mapa visible', (await h.nonBlank()) > 40, `${await h.nonBlank()}% con contenido`);
await h.finish();
