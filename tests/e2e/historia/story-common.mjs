import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
import fs from 'fs';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const results = [];
export const ok = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };

// ---- teselas simuladas (sin internet) ----
const demCache = new Map();
const demTile = (z, x, y) => {
  const k = `${z}/${x}/${y}`; if (demCache.has(k)) return demCache.get(k);
  const png = new PNG({ width: 256, height: 256 }); const n = 2 ** z;
  for (let py = 0; py < 256; py++) for (let px = 0; px < 256; px++) {
    const lon = ((x + px / 256) / n) * 360 - 180, lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + py / 256)) / n))) * 180) / Math.PI;
    const e = 3800 + 700 * Math.sin(lon * 9) * Math.cos(lat * 11) + 250 * Math.sin(lon * 60 + lat * 40) + (lat + 23) * 150, v = e + 32768, i = (py * 256 + px) * 4;
    png.data[i] = Math.floor(v / 256); png.data[i + 1] = Math.floor(v) % 256; png.data[i + 2] = Math.floor((v % 1) * 256); png.data[i + 3] = 255;
  }
  const b = PNG.sync.write(png); demCache.set(k, b); return b;
};
const solid = (w, h, rgb) => { const p = new PNG({ width: w, height: h }); for (let i = 0; i < w * h; i++) { p.data[i * 4] = rgb[0]; p.data[i * 4 + 1] = rgb[1]; p.data[i * 4 + 2] = rgb[2]; p.data[i * 4 + 3] = 255; } return PNG.sync.write(p); };
const flat = solid(256, 256, [118, 98, 78]), photo = solid(120, 80, [200, 120, 60]);

// filas simuladas de storytelling_media (Supabase)
const FILAS = {
  mineria: [{ id: 'a1', chapter_slug: 'mineria', department_slug: 'susques', title: 'Salar de prueba', description: 'Foto simulada 1', storage_path: 'mineria/salar-1.png', alt_text: 'Salar de prueba', display_order: 1 }, { id: 'a2', chapter_slug: 'mineria', department_slug: null, title: 'Maquinaria', description: 'Foto simulada 2', storage_path: 'mineria/maquinaria.png', alt_text: 'Maquinaria de prueba', display_order: 2 }],
  territorio: [{ id: 'b1', chapter_slug: 'territorio', department_slug: null, title: 'Panorámica', description: 'Foto simulada', storage_path: 'territorio/panoramica.png', alt_text: 'Panorámica de prueba', display_order: 1 }],
  portada: [],
  turismo: [{ id: 'c1', chapter_slug: 'turismo', department_slug: 'tilcara', title: 'Foto rota', description: 'Archivo inexistente', storage_path: 'turismo/missing.png', alt_text: 'Foto rota', display_order: 1 }]
};

export async function launch({ width = 1280, height = 720, mobile = false, reduced = false, url = 'http://localhost:4173/' } = {}) {
  const browser = await puppeteer.launch({ executablePath: await chromium.executablePath(), headless: 'shell', defaultViewport: { width, height, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 },
    args: [...chromium.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage();
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const logs = [], external = [], sbRequests = [], sbHeaders = [];
  page.on('console', (m) => logs.push([m.type(), m.text()]));
  page.on('pageerror', (e) => logs.push(['pageerror', e.message]));
  page.on('response', (r) => { if (r.status() >= 400) logs.push(['http' + r.status(), r.url().slice(0, 120)]); });
  page.on('requestfailed', (r) => { const e = r.failure()?.errorText || ''; if (!/ERR_ABORTED/.test(e)) logs.push(['requestfailed', e + ' ' + r.url().slice(0, 120)]); });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = req.url(), cors = { 'access-control-allow-origin': '*' };
    const m = u.match(/terrarium\/(\d+)\/(\d+)\/(\d+)\.png/);
    if (m) return req.respond({ status: 200, contentType: 'image/png', headers: cors, body: demTile(+m[1], +m[2], +m[3]) });
    if (u.includes('arcgisonline.com')) return req.respond({ status: 200, contentType: 'image/png', headers: cors, body: flat });
    if (u.includes('/fake-supabase/rest/v1/storytelling_media')) {
      sbRequests.push(u); sbHeaders.push(req.headers());
      const q = new globalThis.URL(u).searchParams.get('chapter_slug') || ''; const slugs = (q.match(/\(([^)]*)\)/)?.[1] || q.replace(/^eq\./, '')).split(',');
      return req.respond({ status: 200, contentType: 'application/json', headers: { ...cors, 'content-range': '0-0/*' }, body: JSON.stringify(slugs.flatMap((s) => FILAS[s] || [])) });
    }
    if (u.includes('/fake-supabase/storage/') && u.includes('missing')) return req.respond({ status: 404, contentType: 'application/json', headers: cors, body: '{}' });
    if (u.includes('/fake-supabase/storage/v1/object/public/jujuy-storytelling/')) return req.respond({ status: 200, contentType: 'image/png', headers: cors, body: photo });
    if (u.startsWith('http://localhost') || u.startsWith('data:') || u.startsWith('blob:')) return req.continue();
    external.push(u); return req.abort();
  });
  const h = {
    page, browser, logs, external, sbRequests, sbHeaders,
    settle: async (ms = 1200) => { await sleep(ms); await page.waitForFunction(() => window.__map && window.__map.loaded() && !window.__map.isMoving(), { timeout: 90000 }).catch(() => {}); await sleep(500); },
    shot: (n) => page.screenshot({ path: `./capturas/${n}.png` }),
    nonBlank: async () => { const p = PNG.sync.read(Buffer.from(await page.screenshot())); const r = await page.evaluate(() => { const c = document.querySelector('.maplibregl-canvas').getBoundingClientRect(); return { x: c.x, y: c.y, w: c.width, h: c.height }; }); let n = 0, t = 0; for (let y = Math.floor(r.y + 40); y < r.y + r.h - 30; y += 6) for (let x = Math.floor(r.x + 10); x < r.x + r.w - 10; x += 6) { const i = (y * p.width + x) * 4; t++; if (p.data[i] + p.data[i + 1] + p.data[i + 2] > 120) n++; } return Math.round((100 * n) / Math.max(t, 1)); },
    canvasRect: () => page.evaluate(() => { const c = document.querySelector('.maplibregl-canvas').getBoundingClientRect(); return { x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) }; }),
    cam: () => page.evaluate(() => { const m = window.__map, c = m.getCenter(); return { z: +m.getZoom().toFixed(2), pitch: +m.getPitch().toFixed(1), bearing: +m.getBearing().toFixed(1), lng: +c.lng.toFixed(4), lat: +c.lat.toFixed(4) }; }),
    scrollDone: async () => { let last = -1, same = 0; for (let i = 0; i < 40 && same < 4; i++) { const y = await page.evaluate(() => Math.round(window.scrollY)); same = y === last ? same + 1 : 0; last = y; await sleep(120); } },
    finish: async () => {
      await sleep(400);
      const errs = logs.filter(([t]) => ['error', 'pageerror', 'requestfailed', 'http404', 'http500', 'http403'].includes(t)); errs.slice(0, 8).forEach(([t, m]) => console.log('         ', t, m.slice(0, 200)));
      ok('Consola sin errores de carga ni de ejecución', errs.length === 0, `${errs.length} errores`);
      console.log('         pedidos externos bloqueados (esperado, sin internet):', [...new Set(external.map((u) => new globalThis.URL(u).host))].join(', ') || 'ninguno');
      const fail = results.filter((x) => !x.pass); console.log(`\n== ${results.length - fail.length}/${results.length} pruebas OK ==`); await browser.close(); process.exit(fail.length ? 1 : 0);
    }
  };
  await page.goto(url, { waitUntil: 'load' });
  return h;
}
