import fs from 'fs';
import { launch, ok, sleep } from './story-common.mjs';
const { CHAPTERS, GRUPOS } = await import('../../../src/story/storyData.js');
const geo = JSON.parse(fs.readFileSync('../../../public/data/jujuy-departamentos.geojson', 'utf8'));
const NAMES = { 'Dr. Manuel Belgrano': 'belgrano', 'Doctor Manuel Belgrano': 'belgrano', 'Santa Bárbara': 'santa_barbara', 'Santa Catalina': 'santa_catalina', 'San Pedro': 'san_pedro', 'San Antonio': 'san_antonio', 'El Carmen': 'el_carmen', 'Valle Grande': 'valle_grande' };
const centers = {}; for (const f of geo.features) { const n = f.properties.nombre; const id = NAMES[n] || n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); const xs = [], ys = []; (function w(c) { typeof c[0] === 'number' ? (xs.push(c[0]), ys.push(c[1])) : c.forEach(w); })(f.geometry.coordinates); centers[id] = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]; }
const ALL = GRUPOS.todos;

const h = await launch({ width: 1280, height: 720 }); const { page } = h;
await page.waitForFunction(() => window.__map && window.__map.loaded() && document.querySelectorAll('[data-chapter]').length === 7, { timeout: 90000 }).then(() => ok('Carga: modo Historia por defecto con 7 capítulos', true), () => ok('Carga: modo Historia por defecto con 7 capítulos', false, 'timeout'));
await h.settle(1500);
ok('Selector de modo: «Historia» activo', await page.evaluate(() => document.querySelector('[data-mode="historia"]').getAttribute('aria-pressed') === 'true'));
ok('Un solo mapa (una instancia de MapLibre)', (await page.evaluate(() => window.__mapId)) === 1 && (await page.evaluate(() => document.querySelectorAll('.maplibregl-canvas').length)) === 1);
const rect0 = await h.canvasRect();
ok('Diseño de escritorio: mapa fijo a la izquierda (~64%) y narrativa a la derecha', Math.abs(rect0.w / 1280 - 0.64) < 0.03 && rect0.x === 0 && rect0.y === 56 && (await page.evaluate(() => document.getElementById('story').getBoundingClientRect().left)) > 1280 * 0.6, JSON.stringify(rect0));
ok('Riel de progreso con los 7 capítulos', (await page.$$('[data-rail]')).length === 7);
ok('Mapa visible al iniciar', (await h.nonBlank()) > 40, `${await h.nonBlank()}% con contenido`);

// la rueda sobre el mapa recorre la historia; no hace zoom
const z0 = (await h.cam()).z, y0 = await page.evaluate(() => window.scrollY);
await page.mouse.move(300, 360); await page.mouse.wheel({ deltaY: 400 }); await sleep(900);
ok('La rueda sobre el mapa desplaza la historia y no hace zoom', (await page.evaluate(() => window.scrollY)) > y0 && Math.abs((await h.cam()).z - z0) < 0.05, `scroll ${y0}→${await page.evaluate(() => window.scrollY)}, zoom ${z0}→${(await h.cam()).z}`);
await page.evaluate(() => window.scrollTo(0, 0)); await h.settle(800);

// ---- recorrido de los 7 capítulos
const visita = {};
for (const c of CHAPTERS) {
  await page.click(`[data-rail="${c.id}"]`); await h.scrollDone(); await h.settle(2500);
  const act = await page.evaluate(() => document.querySelector('[data-rail][aria-current="step"]')?.dataset.rail);
  const st = await page.evaluate((ids) => { const m = window.__map; return { fs: Object.fromEntries(ids.map((id) => [id, m.getFeatureState({ source: 'deptos', id })])), b: m.getBounds().toArray(), z: m.getZoom(), c: m.getCenter() }; }, ALL);
  const cam = await h.cam(); visita[c.id] = cam;
  const hl = c.map.highlightIds || null, fc = c.map.focusIds || [];
  const dimmed = ALL.filter((id) => st.fs[id].dimmed), focus = ALL.filter((id) => st.fs[id].focus);
  const esperadoDim = hl ? ALL.filter((id) => !hl.includes(id)) : [];
  ok(`Cap. ${c.number} «${c.short}»: capítulo activo y sección marcada`, act === c.id && (await page.evaluate((id) => document.getElementById('cap-' + id).dataset.active, c.id)) === 'true', `activo=${act}`);
  ok(`Cap. ${c.number}: resalte correcto (${hl ? hl.length + ' resaltados' : 'todos'}${fc.length ? ', foco ' + fc.join() : ''})`, JSON.stringify(dimmed.sort()) === JSON.stringify(esperadoDim.sort()) && JSON.stringify(focus.sort()) === JSON.stringify([...fc].sort()), `atenuados ${dimmed.length}, foco ${focus.join() || '—'}`);
  let camOk = false, camDet = '';
  if (c.camera.type === 'departments') { const [[w, s], [e, n]] = st.b; const fuera = c.camera.ids.filter((id) => !(centers[id][0] > w && centers[id][0] < e && centers[id][1] > s && centers[id][1] < n)); camOk = fuera.length === 0; camDet = `zoom ${cam.z} · fuera de cuadro: ${fuera.join() || 'ninguno'}`; }
  else if (c.camera.type === 'point') { const d = Math.hypot(cam.lng - c.camera.lngLat[0], cam.lat - c.camera.lngLat[1]); camOk = d < 0.03 && cam.z > 10 && cam.z < 11.2; camDet = `distancia al punto ${d.toFixed(4)}°, zoom ${cam.z}`; }
  else { camOk = cam.z < 7.6; camDet = `zoom ${cam.z}`; }
  ok(`Cap. ${c.number}: la cámara enfoca el territorio del capítulo`, camOk, camDet);
  ok(`Cap. ${c.number}: el mapa sigue visible`, (await h.nonBlank()) > 40, `${await h.nonBlank()}% con contenido`);
  await h.shot(`story_${c.number}_${c.id}`);
  if (c.id === 'energia') {
    ok('Cap. 03: punto de interés «Parque Solar Cauchari» con coordenadas aportadas', await page.evaluate(() => { const p = document.querySelector('.poi-marker'); return !!p && /Cauchari/.test(p.textContent); }));
    const vis = await page.evaluate(() => window.__escenas?.visibleScenes() || []); ok('Cap. 03: escena solar ilustrativa visible en la ubicación', vis.includes('susques-solar-1'), `escenas: ${vis.join(', ') || 'ninguna'}`);
    ok('Cap. 03: sólo se dibuja la escena solar (la minera no)', vis.length === 1 && vis[0] === 'susques-solar-1', `escenas dibujadas: ${vis.join(', ')}`);
  }
  if (c.id === 'mineria') ok('Cap. 02: sin puntos de interés mineros (no hay coordenadas verificadas)', (await page.$$('.poi-marker')).length === 0);
  if (c.id === 'empleo') {
    const iv = await page.evaluate((ids) => ids.map((id) => window.__map.getFeatureState({ source: 'deptos', id })), ALL);
    ok('Cap. 06: intensidad por departamento (empleo) aplicada a los 16', iv.every((s) => s.useIntensity && s.intensity >= 0 && s.intensity <= 1) && Math.max(...iv.map((s) => s.intensity)) === 1, `máx ${Math.max(...iv.map((s) => s.intensity)).toFixed(2)}`);
  }
}

// ---- la animación no se repite dentro de un mismo capítulo, y es reversible
await page.click('[data-rail="agroindustria"]'); await h.scrollDone(); await h.settle(2200);
const calls0 = await page.evaluate(() => window.__cameraCalls); const act0 = await page.evaluate(() => document.querySelector('[data-rail][aria-current="step"]').dataset.rail);
for (let i = 0; i < 5; i++) { await page.evaluate(() => window.scrollBy(0, 24)); await sleep(250); }
await h.settle(800);
ok('Sin animaciones repetidas al moverse dentro del mismo capítulo', (await page.evaluate(() => window.__cameraCalls)) === calls0 && act0 === (await page.evaluate(() => document.querySelector('[data-rail][aria-current="step"]').dataset.rail)), `llamadas de cámara ${calls0} → ${await page.evaluate(() => window.__cameraCalls)}`);
await page.click('[data-rail="mineria"]'); await h.scrollDone(); await h.settle(2800);
const back = await h.cam(), first = visita.mineria;
ok('Al volver hacia arriba la cámara regresa al capítulo anterior (reversible)', Math.abs(back.lng - first.lng) < 0.05 && Math.abs(back.lat - first.lat) < 0.05 && Math.abs(back.z - first.z) < 0.2, `antes ${first.z}/${first.lng},${first.lat} · ahora ${back.z}/${back.lng},${back.lat}`);
const rect1 = await h.canvasRect(); ok('El mapa permanece fijo mientras se recorre la narrativa', rect1.x === rect0.x && rect1.y === rect0.y && rect1.w === rect0.w && rect1.h === rect0.h, JSON.stringify(rect1));

// ---- indicadores: ámbito, fuente y «Información no disponible»
const txt = (id) => page.evaluate((id) => document.getElementById('cap-' + id).innerText, id);
const t1 = await txt('territorio'), t2 = await txt('mineria'), t3 = await txt('energia'), t5 = await txt('turismo'), t6 = await txt('empleo'), t7 = await txt('futuro');
ok('Cap. 01: superficie calculada en km² y población «Información no disponible»', /km²/i.test(t1) && /Superficie/i.test(t1) && /Población \(Censo 2022\)[\s\S]{0,40}Información no disponible/i.test(t1));
ok('Cap. 02: «Proyectos e inversiones» sin dato', /Proyectos e inversiones[\s\S]{0,40}Información no disponible/i.test(t2));
ok('Cap. 03: capacidad instalada y evolución energética sin dato; coordenadas aportadas indicadas', /Capacidad instalada[\s\S]{0,40}Información no disponible/i.test(t3) && /Evolución energética[\s\S]{0,40}Información no disponible/i.test(t3) && /-24\.10169, -66\.71382/.test(t3) && /pendiente de verificación/.test(t3));
ok('Cap. 05: «Visitantes» sin dato', /Visitantes[\s\S]{0,40}Información no disponible/i.test(t5));
const escalas6 = await page.evaluate(() => [...new Set([...document.querySelectorAll('#cap-empleo [data-chart]')].map((e) => e.dataset.scale))].sort());
ok('Cap. 06: gráficos provinciales y departamentales distinguidos', JSON.stringify(escalas6) === JSON.stringify(['departamental', 'provincial']), escalas6.join(' + '));
ok('Cap. 06: nota de conciliación de totales provincial vs. departamental', /no coinciden/.test(t6));
const kpis = await page.evaluate(() => [...document.querySelectorAll('[data-kpi="dato"]')].map((e) => e.innerText));
ok('Todo indicador con dato declara ámbito, fuente y condición de ilustrativo', kpis.length > 10 && kpis.every((k) => /Departamental|Provincial/.test(k) && /Fuente:/.test(k) && (/Ilustrativo/.test(k) || /IGN/.test(k))), `${kpis.length} indicadores`);
ok('Cap. 07: síntesis de cambios y botón «EXPLORAR LOS DATOS»', /EXPLORAR LOS DATOS/.test(t7) && /Actividad minera/i.test(t7));
// galería: imágenes de referencia rotuladas
await page.evaluate(() => document.querySelectorAll('img').forEach((i) => i.scrollIntoView({ block: 'center' }))); await sleep(1500);
const imgs = await page.evaluate(() => [...document.querySelectorAll('[data-gallery] img')].map((i) => ({ alt: i.alt, lazy: i.loading, w: i.naturalWidth })));
ok('Fotografías: imágenes de referencia provisionales rotuladas, con carga diferida', imgs.length === 7 && imgs.every((i) => /Imagen de referencia provisional/.test(i.alt) && i.lazy === 'lazy' && i.w > 0), `${imgs.length} imágenes`);
ok('Fotografías: aviso «Referencia provisional» visible', (await page.evaluate(() => [...document.querySelectorAll('[data-gallery]')].every((g) => g.dataset.source === 'referencia' && /Referencia provisional/.test(g.innerText)))));
ok('Música: estado «pendiente» con enlace de respaldo (sin archivo agregado)', await page.evaluate(() => { const m = document.querySelector('[data-music]'); return m?.dataset.music === 'pendiente' && /agregá el archivo/.test(m.innerText) && !!m.querySelector('a[href*="youtube.com"]'); }));

// ---- cambio de modo con el mismo mapa
await page.click('[data-rail="futuro"]'); await h.scrollDone(); await h.settle(1500);
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /EXPLORAR LOS DATOS/.test(b.textContent)).click()); await sleep(800); await h.settle(2500);
ok('«EXPLORAR LOS DATOS» pasa al modo exploración con el MISMO mapa', await page.evaluate(() => !!document.getElementById('hero') && document.querySelector('[data-mode="explorar"]').getAttribute('aria-pressed') === 'true' && window.__mapId === 1 && location.hash === '#explorar'));
const rE = await h.canvasRect(); ok('Exploración: el mapa ocupa toda la pantalla', rE.w === 1280 && rE.y === 56, JSON.stringify(rE));
ok('Exploración: mapa visible y vista provincial', (await h.nonBlank()) > 40 && (await h.cam()).z < 7.6, `zoom ${(await h.cam()).z}`);
const zE = (await h.cam()).z; await page.mouse.move(640, 400); await page.mouse.wheel({ deltaY: -500 }); await h.settle(1800);
ok('Exploración: la rueda vuelve a hacer zoom en el mapa', (await h.cam()).z > zE + 0.2, `${zE} → ${(await h.cam()).z}`);
await page.evaluate(() => window.__map.easeTo({ zoom: 6.9, duration: 800 })); await h.settle(1500);
const ap = await page.evaluate(() => { const p = window.__map.project([-66.662, -23.521]); const r = document.querySelector('.maplibregl-canvas').getBoundingClientRect(); return [r.x + p.x, r.y + p.y]; });
await page.mouse.click(ap[0], ap[1]); await h.settle(3000);
ok('Exploración: se puede seleccionar un departamento (Susques) y se abre su ficha', /Susques/.test(await page.evaluate(() => document.body.innerText)) && /Volver a la provincia/.test(await page.evaluate(() => document.body.innerText)));
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Minería y litio')?.click()); await sleep(800);
ok('Exploración: los filtros sectoriales funcionan', await page.evaluate(() => window.__map.getFeatureState({ source: 'deptos', id: 'ledesma' }).dimmed === true && window.__map.getFeatureState({ source: 'deptos', id: 'susques' }).dimmed === false));
await page.evaluate(() => document.querySelector('[data-mode="historia"]').click()); await sleep(800); await h.settle(2500);
ok('«Historia» vuelve al recorrido con el MISMO mapa y sin selección previa', await page.evaluate(() => !!document.getElementById('story') && window.__mapId === 1 && !/Volver a la provincia/.test(document.body.innerText)) && (await page.evaluate(() => document.querySelector('[data-rail][aria-current="step"]')?.dataset.rail)) === 'territorio');
await h.finish();
