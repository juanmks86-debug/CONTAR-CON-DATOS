import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
import fs from 'fs';

const URL = process.env.URL || 'http://localhost:4173/';
const ANCHOR = [-66.662, -23.521]; // punto interior de Susques usado por la escena
const results = []; const ok = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- teselas simuladas (el sandbox no llega a AWS ni a Esri) ----
const demCache = new Map();
const demTile = (z, x, y) => {
  const k = `${z}/${x}/${y}`; if (demCache.has(k)) return demCache.get(k);
  const png = new PNG({ width: 256, height: 256 }); const n = 2 ** z;
  for (let py = 0; py < 256; py++) for (let px = 0; px < 256; px++) {
    const lon = ((x + px / 256) / n) * 360 - 180;
    const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + py / 256)) / n))) * 180) / Math.PI;
    const e = 3800 + 700 * Math.sin(lon * 9) * Math.cos(lat * 11) + 250 * Math.sin(lon * 60 + lat * 40) + (lat + 23) * 150;
    const v = e + 32768, i = (py * 256 + px) * 4;
    png.data[i] = Math.floor(v / 256); png.data[i + 1] = Math.floor(v) % 256; png.data[i + 2] = Math.floor((v % 1) * 256); png.data[i + 3] = 255;
  }
  const buf = PNG.sync.write(png); demCache.set(k, buf); return buf;
};
const flat = (() => { const p = new PNG({ width: 256, height: 256 }); for (let i = 0; i < 256 * 256; i++) { p.data[i * 4] = 118; p.data[i * 4 + 1] = 98; p.data[i * 4 + 2] = 78; p.data[i * 4 + 3] = 255; } return PNG.sync.write(p); })();

const browser = await puppeteer.launch({ executablePath: await chromium.executablePath(), headless: 'shell', defaultViewport: { width: 1366, height: 768 },
  args: [...chromium.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage();
const logs = []; const external = [];
page.on('console', (m) => logs.push([m.type(), m.text()]));
page.on('pageerror', (e) => logs.push(['pageerror', e.message]));
page.on('requestfailed', (r) => { const e = r.failure()?.errorText || ''; if (!/ERR_ABORTED/.test(e)) logs.push(['requestfailed', e + ' ' + r.url().slice(0, 110)]); });
await page.setRequestInterception(true);
page.on('request', (req) => {
  const u = req.url(); const cors = { 'access-control-allow-origin': '*' };
  const m = u.match(/terrarium\/(\d+)\/(\d+)\/(\d+)\.png/);
  if (m) return req.respond({ status: 200, contentType: 'image/png', headers: cors, body: demTile(+m[1], +m[2], +m[3]) });
  if (u.includes('arcgisonline.com')) return req.respond({ status: 200, contentType: 'image/png', headers: cors, body: flat });
  if (u.startsWith('http://localhost') || u.startsWith('data:') || u.startsWith('blob:')) return req.continue();
  external.push(u); return req.abort();
});

const shot = async (name) => { const b = await page.screenshot({ path: `/tmp/shots/${name}.png` }); return PNG.sync.read(Buffer.from(b)); };
const diff = (a, b) => { let n = 0; for (let i = 0; i < a.data.length; i += 4) if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) > 36) n++; return n; };
const cam = () => page.evaluate(() => { const m = window.__map; const c = m.getCenter(); return { z: +m.getZoom().toFixed(2), pitch: +m.getPitch().toFixed(1), bearing: +m.getBearing().toFixed(1), lng: +c.lng.toFixed(3), lat: +c.lat.toFixed(3) }; });
const text = () => page.evaluate(() => document.body.innerText);
const settle = async (ms = 1800) => { await sleep(ms); await page.waitForFunction(() => window.__map.loaded(), { timeout: 60000 }).catch(() => {}); await sleep(400); };
const mapRect = () => page.evaluate(() => { const r = document.querySelector('.maplibregl-canvas').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });


const nonBlank = async () => { const p = PNG.sync.read(Buffer.from(await page.screenshot())); const r = await mapRect(); let n = 0, tot = 0; for (let y = Math.floor(r.y + 60); y < r.y + r.h - 80; y += 6) for (let x = 20; x < 1340; x += 6) { const i = (y * p.width + x) * 4; tot++; if (p.data[i] + p.data[i + 1] + p.data[i + 2] > 120) n++; } return Math.round((100 * n) / tot); };
const hitsNow = async () => { const rr = await mapRect(); const h = await page.evaluate((rr) => { const out = []; for (let y = 40; y < rr.h - 40; y += 8) for (let x = 40; x < rr.w - 40; x += 8) if (window.__escenas.pick({ x, y })) out.push([x, y]); return out; }, rr); await closeCards(); return h; };
const closeCards = () => page.evaluate(() => [...document.querySelectorAll('button[aria-label="Cerrar"]')].filter((b) => b.parentElement?.parentElement?.textContent.includes('Escena ilustrativa:')).forEach((b) => b.click()));
const anchorPx = async () => { const rr = await mapRect(); const p = await page.evaluate((a) => { const q = window.__map.project(a); return [q.x, q.y]; }, ANCHOR); return { x: rr.x + p[0], y: rr.y + p[1], rx: p[0], ry: p[1] }; };
const contribution = async () => { // aporte de la escena a la imagen, en el estado actual (misma cámara, mismo filtro)
  const on = PNG.sync.read(Buffer.from(await page.screenshot())); await page.evaluate(() => window.__escenas.setOptions({ people: false, vehicles: false, facilities: false, animate: false })); await settle(900);
  const off = PNG.sync.read(Buffer.from(await page.screenshot())); await page.evaluate(() => window.__escenas.setOptions({ people: true, vehicles: true, facilities: true, animate: true })); await settle(700); return diff(on, off); };
const wheelTo = async (target, maxSteps = 18) => { const rr = await mapRect(); for (let i = 0; i < maxSteps; i++) { const c = await cam(); if (c.z >= target) return c; const a = await anchorPx(); await page.mouse.move(Math.min(Math.max(a.x, rr.x + 60), rr.x + rr.w - 60), Math.min(Math.max(a.y, rr.y + 60), rr.y + rr.h - 60)); await page.mouse.wheel({ deltaY: -300 }); await settle(2300); const b = await nonBlank(); if (b < 40) ok(`Zoom gradual: mapa visible (zoom ${(await cam()).z})`, false, `${b}% con contenido`); } return cam(); };

// ================= CARGA =================
const t0 = Date.now();
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => window.__map && window.__escenas && window.__map.loaded() && document.querySelectorAll('.dept-label').length === 16, { timeout: 90000 }).then(() => ok('Carga: mapa, relieve y 16 etiquetas de departamentos', true, `${((Date.now() - t0) / 1000).toFixed(1)} s`)).catch(() => ok('Carga: mapa, relieve y 16 etiquetas de departamentos', false, 'timeout'));
await settle(1500);
ok('Relieve 3D activo', !!(await page.evaluate(() => window.__map.getTerrain())));
ok('Polígonos de departamentos cargados', await page.evaluate(() => window.__map.queryRenderedFeatures({ layers: ['deptos-fill'] }).length >= 10));
const cam0 = await cam(); ok('Vista provincial inicial', cam0.z > 5 && cam0.z < 8.5 && cam0.pitch > 30, JSON.stringify(cam0));
ok('Nivel 1 y mapa visible en vista provincial', /Nivel 1/.test(await text()) && (await nonBlank()) > 40, `${await nonBlank()}% con contenido`);
ok('Sin elementos de escena en la vista provincial', (await hitsNow()).length === 0);

// ================= SELECCIÓN DE SUSQUES (clic en el territorio) =================
let a = await anchorPx(); await page.mouse.click(a.x, a.y); await settle(3000);
const camS = await cam(); ok('Selección de Susques: la cámara se acerca y se encuadra', camS.z > cam0.z + 0.3, `zoom ${cam0.z} → ${camS.z}`);
ok('Selección de Susques: ficha del departamento', /Susques/.test(await text()) && /Superficie/.test(await text()));

// ================= ZOOM GRADUAL HASTA LA ESCENA =================
const seen = {}; const probe = async () => { const c = await cam(); const h = (await hitsNow()).length; return [c.z, h]; };
let camE = await cam(); let firstHit = null;
const rr0 = await mapRect();
for (let i = 0; i < 18 && camE.z < 12.6; i++) {
  a = await anchorPx(); await page.mouse.move(Math.min(Math.max(a.x, rr0.x + 60), rr0.x + rr0.w - 60), Math.min(Math.max(a.y, rr0.y + 60), rr0.y + rr0.h - 60));
  await page.mouse.wheel({ deltaY: -300 }); await settle(2300);
  const [z, h] = await probe(); camE = await cam(); const b = await nonBlank();
  if (h > 0 && firstHit === null) firstHit = z; seen[z] = h;
  if (b < 40) ok(`Mapa visible durante el zoom (zoom ${z})`, false, `${b}% con contenido`);
}
ok('El mapa se mantiene visible durante todo el acercamiento', !results.some((x) => !x.pass && x.name.startsWith('Mapa visible')));
ok('Nivel 2: aparecen instalaciones y vehículos al acercarse', firstHit !== null && firstHit >= 8 && firstHit < 10, `primeros elementos en zoom ${firstHit}`);
ok('Nivel 4 al llegar a zoom ≥ 12', /Nivel 4/.test(await text()), `${(await text()).match(/Nivel \d · \w+/)?.[0]} (zoom ${camE.z})`);
const lvl3 = Object.entries(seen).filter(([z]) => +z >= 10.4 && +z <= 11.9).map(([, h]) => h); const lvl2 = Object.entries(seen).filter(([z]) => +z >= 8.6 && +z <= 10.2).map(([, h]) => h);
ok('Nivel 3: aparecen personas (más elementos seleccionables que en el nivel 2)', lvl3.length && lvl2.length && Math.max(...lvl3) > Math.max(...lvl2), `nivel 2: ${Math.max(...lvl2)} · nivel 3: ${Math.max(...lvl3)} puntos`);
const exaggerated = (lon, lat) => (3800 + 700 * Math.sin(lon * 9) * Math.cos(lat * 11) + 250 * Math.sin(lon * 60 + lat * 40) + (lat + 23) * 150) * 1.85;
const elev = await page.evaluate((a) => window.__map.queryTerrainElevation(a) + window.__map.transform.elevation, ANCHOR); const exp = exaggerated(ANCHOR[0], ANCHOR[1]); // la API da la altura relativa al centro de la pantalla
ok('Apoyo sobre el relieve: la altura de la escena coincide con la del terreno dibujado', Math.abs(elev - exp) / exp < 0.03, `terreno ${elev?.toFixed(0)} m (relativa + centro) vs esperado ${exp.toFixed(0)} m`);
ok('Las etiquetas no interceptan los clics sobre la escena', await page.evaluate(() => getComputedStyle(document.querySelector('.dept-label')).pointerEvents === 'none'));
await shot('F_nivel4');

// ================= APORTE DE LA ESCENA Y CONTROLES =================
const dOn = await contribution(); ok('La escena 3D se dibuja sobre el relieve', dOn > 800, `${dOn} píxeles pertenecen a la escena`);
const base = PNG.sync.read(Buffer.from(await page.screenshot()));
for (const [key, label] of [['people', 'personas'], ['vehicles', 'vehículos'], ['facilities', 'instalaciones']]) {
  const btn = { people: 'Personas', vehicles: 'Vehículos', facilities: 'Instalaciones' }[key];
  const before = PNG.sync.read(Buffer.from(await page.screenshot()));
  await page.evaluate((b) => [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === b)?.click(), btn); await settle(900);
  const after = PNG.sync.read(Buffer.from(await page.screenshot())); const d = diff(before, after);
  const pressed = await page.evaluate((b) => [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === b)?.getAttribute('aria-pressed'), btn);
  ok(`Control «${btn}»: oculta ${label} desde el botón de la interfaz`, d > 40 && pressed === 'false', `${d} píxeles cambian, aria-pressed=${pressed}`);
  await page.evaluate((b) => [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === b)?.click(), btn); await settle(700);
}
// animaciones: con animación los cuadros cambian; sin animación quedan quietos
await page.evaluate(() => window.__map.triggerRepaint()); const an1 = PNG.sync.read(Buffer.from(await page.screenshot())); await sleep(1500); const an2 = PNG.sync.read(Buffer.from(await page.screenshot()));
const dAnim = diff(an1, an2);
await page.evaluate(() => [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Animaciones')?.click()); await settle(1200);
const st1 = PNG.sync.read(Buffer.from(await page.screenshot())); await sleep(1500); const st2 = PNG.sync.read(Buffer.from(await page.screenshot())); const dStill = diff(st1, st2);
ok('Control «Animaciones»: con animación hay movimiento, sin animación no', dAnim > 20 && dStill < dAnim / 3, `con animación ${dAnim} px cambian · sin animación ${dStill}`);
await page.evaluate(() => [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Animaciones')?.click()); await settle(900);

// ================= SELECCIÓN DE ELEMENTOS CON EL MOUSE =================
const hits = await hitsNow(); ok('La escena tiene elementos seleccionables', hits.length > 100, `${hits.length} puntos`);
const cxm = rr0.w / 2, cym = rr0.h / 2; const sorted = [...hits].sort((p, q) => Math.hypot(p[0] - cxm, p[1] - cym) - Math.hypot(q[0] - cxm, q[1] - cym));
const picks = []; for (const idx of [0, Math.floor(sorted.length / 4), Math.floor(sorted.length / 2)]) {
  const [x, y] = sorted[idx]; await page.mouse.click(rr0.x + x, rr0.y + y); await sleep(700);
  const info = await page.evaluate(() => { const dts = [...document.querySelectorAll('dt')]; const h = dts.find((e) => e.textContent === 'Departamento'); if (!h) return null; const dl = h.closest('dl'); return { elemento: dl.parentElement.querySelector('b')?.textContent, campos: Object.fromEntries([...dl.querySelectorAll('dt')].map((e) => [e.textContent, e.nextElementSibling?.textContent])) }; });
  if (info) picks.push(info); await closeCards(); await sleep(200);
}
ok('Clic en un elemento abre la ficha informativa', picks.length >= 2, picks.map((p) => p.elemento).join(' | '));
if (picks[0]) { const c = picks[0].campos; ok('Ficha: departamento, sector, actividad y representación ilustrativa', c['Departamento'] === 'Susques' && /Miner/.test(c['Sector']) && !!c['Actividad'] && c['Representación'] === 'Ilustrativa', JSON.stringify(c)); }
ok('Clic en un elemento no cambia el departamento seleccionado', /Volver a la provincia/.test(await text()) && /Susques/.test(await text()));

// ================= ZOOM, DESPLAZAMIENTO Y ROTACIÓN MANUALES (nivel 4) =================
const m1 = await cam(); const mx = rr0.x + rr0.w * 0.5, my = rr0.y + rr0.h * 0.5;
await page.mouse.move(mx, my); await page.mouse.wheel({ deltaY: 300 }); await settle(2000); const m2 = await cam(); ok('Zoom con la rueda (alejar)', m2.z < m1.z - 0.2, `${m1.z} → ${m2.z}`);
await page.mouse.wheel({ deltaY: -300 }); await settle(2000);
const m3 = await cam(); await page.mouse.down(); await page.mouse.move(mx + 130, my + 50, { steps: 8 }); await page.mouse.up(); await settle(1500); const m4 = await cam();
ok('Desplazamiento arrastrando', Math.abs(m4.lng - m3.lng) > 0.0005 || Math.abs(m4.lat - m3.lat) > 0.0005, `${m3.lng},${m3.lat} → ${m4.lng},${m4.lat}`);
await page.mouse.move(mx, my); await page.mouse.down({ button: 'right' }); await page.mouse.move(mx + 150, my - 50, { steps: 10 }); await page.mouse.up({ button: 'right' }); await settle(1800); const m5 = await cam();
ok('Rotación horizontal y vertical (clic derecho)', Math.abs(m5.bearing - m4.bearing) > 3 || Math.abs(m5.pitch - m4.pitch) > 3, `rumbo ${m4.bearing}→${m5.bearing} · inclinación ${m4.pitch}→${m5.pitch}`);
ok('Tras zoom, desplazamiento y rotación el mapa sigue visible y con escena', (await nonBlank()) > 40 && (await contribution()) > 300, `${await nonBlank()}% con contenido`);

// ================= FILTROS SECTORIALES (con la escena a la vista) =================
await page.evaluate((c) => window.__map.easeTo({ center: c, duration: 800 }), ANCHOR); await settle(1800);
const legend = (l) => page.evaluate((l) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === l)?.click(), l);
const base0 = (await hitsNow()).length; ok('Antes de filtrar: escena visible', base0 > 50, `${base0} puntos`);
await legend('Agroindustria'); await settle(1500); const hAgro = (await hitsNow()).length; ok('Filtro «Agroindustria»: oculta la escena minera', hAgro === 0, `${hAgro} puntos`);
await legend('Agroindustria'); await settle(1200);
await legend('Minería y litio'); await settle(1500); const hMin = (await hitsNow()).length; ok('Filtro «Minería y litio»: mantiene la escena', hMin > 50, `${hMin} puntos`);
await legend('Minería y litio'); await settle(1200);
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Todos los sectores')?.click()); await settle(1000);
ok('«Todos los sectores» restablece la escena', (await hitsNow()).length > 50);

// ================= CAMBIO DE DEPARTAMENTO (vuelos de cámara largos) =================
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Volver a la provincia/.test(b.textContent))?.click()); await settle(3500);
ok('«Volver a la provincia»: vista completa y mapa visible', (await cam()).z < 8.5 && (await nonBlank()) > 40, `zoom ${(await cam()).z}, ${await nonBlank()}% con contenido`);
const til = await page.evaluate(() => { const f = window.__map.querySourceFeatures('deptos').find((x) => x.properties.label === 'Tilcara'); if (!f) return null; const g = f.geometry; const ring = (g.type === 'Polygon' ? g.coordinates : g.coordinates[0])[0]; let sx = 0, sy = 0; ring.forEach(([x, y]) => { sx += x; sy += y; }); const c = [sx / ring.length, sy / ring.length]; const p = window.__map.project(c); return [p.x, p.y]; });
await page.mouse.click(rr0.x + til[0], rr0.y + til[1]); await settle(3500);
ok('Cambio a otro departamento (Tilcara): ficha y cámara', /Tilcara/.test(await text()) && (await nonBlank()) > 40, `zoom ${(await cam()).z}`);
ok('Con Tilcara seleccionado no hay escena de Susques', (await hitsNow()).length === 0);
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Volver a la provincia/.test(b.textContent))?.click()); await settle(3500);
a = await anchorPx(); await page.mouse.click(a.x, a.y); await settle(3000);
camE = await cam(); for (let i = 0; i < 6 && camE.z < 9.6; i++) { a = await anchorPx(); await page.mouse.move(Math.min(Math.max(a.x, rr0.x + 60), rr0.x + rr0.w - 60), Math.min(Math.max(a.y, rr0.y + 60), rr0.y + rr0.h - 60)); await page.mouse.wheel({ deltaY: -300 }); await settle(2300); camE = await cam(); }
ok('Al volver a seleccionar Susques, su escena reaparece', (await hitsNow()).length > 50 && (await nonBlank()) > 40, `zoom ${camE.z}`);

// ================= RENDIMIENTO =================
await page.evaluate(() => window.__escenas.setOptions({ people: true, vehicles: true, facilities: true, animate: true }));
camE = await cam(); for (let i = 0; i < 6 && camE.z < 12.4; i++) { a = await anchorPx(); await page.mouse.move(Math.min(Math.max(a.x, rr0.x + 60), rr0.x + rr0.w - 60), Math.min(Math.max(a.y, rr0.y + 60), rr0.y + rr0.h - 60)); await page.mouse.wheel({ deltaY: -300 }); await settle(2300); camE = await cam(); }
const perf = (label) => page.evaluate(async (label) => {
  const L = window.__escenas, orig = L.render.bind(L); let n = 0, tot = 0, mx = 0; L.render = (gl, m) => { const t = performance.now(); orig(gl, m); const d = performance.now() - t; n++; tot += d; mx = Math.max(mx, d); };
  let frames = 0; const t0 = performance.now(); const heap0 = performance.memory?.usedJSHeapSize;
  await new Promise((res) => { const tick = () => { frames++; window.__map.triggerRepaint(); if (performance.now() - t0 < 4000) requestAnimationFrame(tick); else res(); }; tick(); });
  L.render = orig; const dt = (performance.now() - t0) / 1000; return { label, fps: +(frames / dt).toFixed(1), calls: n, avgMs: +(tot / Math.max(n, 1)).toFixed(2), maxMs: +mx.toFixed(1), heapMB: +(((performance.memory?.usedJSHeapSize || 0) - (heap0 || 0)) / 1048576).toFixed(2) };
}, label);
const pOn = await perf('con escena animada (nivel 4)');
await page.evaluate(() => window.__escenas.setOptions({ people: false, vehicles: false, facilities: false, animate: false })); await settle(800); const pOff = await perf('sin escena');
await page.evaluate(() => window.__escenas.setOptions({ people: true, vehicles: true, facilities: true, animate: true }));
console.log('       ', JSON.stringify(pOn)); console.log('       ', JSON.stringify(pOff));
ok('Memoria: sin crecimiento sostenido del heap de JavaScript durante la animación', Math.abs(pOn.heapMB) < 30, `${pOn.heapMB} MB en 4 s`);
ok('Sin cuadros bloqueantes (máximo por cuadro en este emulador de GPU por software)', pOn.maxMs < 120, `promedio ${pOn.avgMs} ms · máximo ${pOn.maxMs} ms · ${pOn.fps} cuadros/s (todo el mapa se dibuja por software en esta prueba)`);

// ================= CONSOLA =================
await sleep(500);
const errs = logs.filter(([t]) => ['error', 'pageerror', 'requestfailed'].includes(t));
const warns = logs.filter(([t, m]) => t === 'warning' && !/GL Driver Message|GPU stall/.test(m));
errs.slice(0, 8).forEach(([t, m]) => console.log('        ', t, m.slice(0, 200))); warns.slice(0, 5).forEach(([, m]) => console.log('        aviso:', m.slice(0, 200)));
ok('Consola sin errores de carga ni de ejecución', errs.length === 0, `${errs.length} errores · ${warns.length} avisos de la aplicación`);
const fail = results.filter((x) => !x.pass); console.log(`\n== ${results.length - fail.length}/${results.length} pruebas OK ==`); await browser.close(); process.exit(fail.length ? 1 : 0);
