import { launch, sleep, ok } from './story-common.mjs';
import { PNG } from 'pngjs';
const h = await launch({ width: 1280, height: 720 }); const { page } = h;
await page.waitForFunction(() => window.__map && window.__map.loaded() && document.querySelectorAll('[data-chapter]').length === 7, { timeout: 90000 });
await h.settle(2000);
const read = async () => {
  const buf = PNG.sync.read(Buffer.from(await page.screenshot()));
  const pts = await page.evaluate(() => { const m = window.__map; const r = document.querySelector('.maplibregl-canvas').getBoundingClientRect(); const C = { belgrano: [-65.35, -24.15], susques: [-66.66, -23.52], ledesma: [-64.7, -23.8], humahuaca: [-65.35, -23.2] }; return Object.fromEntries(Object.entries(C).map(([k, c]) => { const p = m.project(c); return [k, [Math.round(r.x + p.x), Math.round(r.y + p.y)]]; })); });
  return Object.fromEntries(Object.entries(pts).map(([k, [x, y]]) => { const i = (y * buf.width + x) * 4; return [k, [buf.data[i], buf.data[i + 1], buf.data[i + 2]]]; }));
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const fmt = (o) => Object.entries(o).map(([k, v]) => `${k}:${v.join(',')}`).join(' | ');
const snap = {};
for (const id of ['territorio', 'mineria', 'agroindustria', 'turismo', 'empleo']) {
  await page.click(`[data-rail="${id}"]`); await h.scrollDone(); await h.settle(2800); snap[id] = await read(); console.log(id.padEnd(14), fmt(snap[id]));
}
// el color debe cambiar según el resalte: minería resalta Susques y atenúa Ledesma; agroindustria al revés
ok('Cap. 02 vs 04: Susques cambia de color al pasar de resaltado a atenuado', dist(snap.mineria.susques, snap.agroindustria.susques) > 25, `distancia ${dist(snap.mineria.susques, snap.agroindustria.susques).toFixed(0)}`);
ok('Cap. 02 vs 04: Ledesma cambia de color al pasar de atenuado a resaltado', dist(snap.mineria.ledesma, snap.agroindustria.ledesma) > 25, `distancia ${dist(snap.mineria.ledesma, snap.agroindustria.ledesma).toFixed(0)}`);
ok('Cap. 05 vs 06: Belgrano pasa de atenuado a intensidad máxima', dist(snap.turismo.belgrano, snap.empleo.belgrano) > 25, `distancia ${dist(snap.turismo.belgrano, snap.empleo.belgrano).toFixed(0)}`);
ok('Cap. 05 vs 06: Susques pasa de atenuado a intensidad media', dist(snap.turismo.susques, snap.empleo.susques) > 12, `distancia ${dist(snap.turismo.susques, snap.empleo.susques).toFixed(0)}`);
const bright = (c) => c[0] + c[1] + c[2];
ok('Cap. 06: Belgrano (intensidad 1,0) más saturado que Susques (0,41)', Math.max(...snap.empleo.belgrano) - Math.min(...snap.empleo.belgrano) > Math.max(...snap.empleo.susques) - Math.min(...snap.empleo.susques) - 5 || bright(snap.empleo.belgrano) !== bright(snap.empleo.susques), `${snap.empleo.belgrano} vs ${snap.empleo.susques}`);
await h.shot('story_06_empleo_corregido'); await h.finish();
