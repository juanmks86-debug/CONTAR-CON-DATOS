import { launch, ok, sleep } from './story-common.mjs';
const h = await launch({ width: 1280, height: 720, url: 'http://localhost:4174/' }); const { page } = h;
await page.waitForFunction(() => window.__map && window.__map.loaded() && document.querySelectorAll('[data-chapter]').length === 7, { timeout: 90000 });
await h.settle(1500);
// galerías: recorrer los capítulos para que carguen las imágenes
for (const id of ['territorio', 'mineria', 'energia', 'agroindustria', 'turismo', 'empleo', 'futuro']) { await page.evaluate((id) => document.querySelector(`#cap-${id} [data-gallery]`).scrollIntoView({ block: 'center' }), id); await sleep(900); }
await sleep(1500);
const g = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-gallery]')].map((e) => [e.dataset.gallery, { source: e.dataset.source, imgs: [...e.querySelectorAll('img')].map((i) => ({ src: i.src, alt: i.alt, w: i.naturalWidth, lazy: i.loading })), text: e.innerText }])));
ok('Supabase: se consulta la tabla una vez por capítulo', h.sbRequests.length === 7, `${h.sbRequests.length} consultas`);
const q = h.sbRequests.find((u) => /mineria/.test(u)) || '';
ok('Supabase: consulta correcta (capítulo, sólo activas, ordenadas)', /chapter_slug=in\.\(mineria\)/.test(decodeURIComponent(q)) && /is_active=eq\.true/.test(q) && /order=display_order\.asc/.test(q), decodeURIComponent(q).slice(-150));
ok('Supabase: el capítulo 1 consulta «territorio» y «portada»', h.sbRequests.some((u) => /territorio,portada/.test(decodeURIComponent(u))));
ok('Capítulo 02: 2 fotografías reales desde Supabase Storage (URL pública del bucket)', g.mineria.source === 'supabase' && g.mineria.imgs.length === 2 && g.mineria.imgs.every((i) => /fake-supabase\/storage\/v1\/object\/public\/jujuy-storytelling\/mineria\//.test(i.src) && i.w > 0 && i.lazy === 'lazy'), g.mineria.imgs.map((i) => i.src.split('/').slice(-2).join('/')).join(' · '));
ok('Capítulo 02: títulos y descripciones de la tabla visibles', /Salar de prueba/.test(g.mineria.text) && /Foto simulada 2/.test(g.mineria.text) && /Supabase Storage/.test(g.mineria.text));
ok('Capítulo 01: fotografía real (territorio)', g.territorio.source === 'supabase' && g.territorio.imgs.length === 1 && g.territorio.imgs[0].w > 0);
ok('Sin fotografías cargadas: vuelve a la imagen de referencia provisional', ['energia', 'agroindustria', 'empleo', 'futuro'].every((k) => g[k].source === 'referencia' && /Imagen de referencia provisional/.test(g[k].imgs[0].alt)));
ok('Foto que no carga: se reemplaza por la imagen de referencia y se avisa', g.turismo.imgs.length === 1 && /Imagen de referencia provisional/.test(g.turismo.imgs[0].alt || '') || /No se pudo cargar la fotografía/.test(g.turismo.text), g.turismo.text.replace(/\n/g, ' ').slice(0, 150));
ok('Supabase: los pedidos llevan sólo la clave pública (anon); no hay claves secretas', h.sbHeaders.length > 0 && h.sbHeaders.every((x) => x.apikey === 'test' && !/service_role/i.test(JSON.stringify(x))), `${h.sbHeaders.length} pedidos, apikey=${h.sbHeaders[0]?.apikey}`);

// música local adjuntada en src/assets/audio/
ok('Música: pista detectada en la carpeta (sin pedidos de red)', await page.evaluate(() => { const m = document.querySelector('[data-music]'); return m?.dataset.music === 'lista' && /Pista de prueba/.test(m.innerText); }));
ok('Música: no empieza sola (sin autoplay)', await page.evaluate(() => document.querySelector('audio').paused === true));
await page.click('[data-music="lista"] button[aria-label="Reproducir música"]'); await sleep(900);
ok('Música: reproducir', await page.evaluate(() => document.querySelector('audio').paused === false && document.querySelector('[data-music] button[aria-pressed="true"]') !== null));
await page.click('[data-music="lista"] button[aria-label="Silenciar"]'); await sleep(200);
ok('Música: silenciar', await page.evaluate(() => document.querySelector('audio').muted === true));
await page.click('[data-music="lista"] button[aria-label="Activar sonido"]');
await page.evaluate(() => { const r = document.querySelector('[data-music] input[type=range]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(r, '0.2'); r.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(300);
ok('Música: control de volumen', await page.evaluate(() => Math.abs(document.querySelector('audio').volume - 0.2) < 0.01 && document.querySelector('audio').muted === false));
await page.click('[data-music="lista"] button[aria-label="Pausar música"]'); await sleep(300);
ok('Música: pausar', await page.evaluate(() => document.querySelector('audio').paused === true));
// el 404 de «missing.png» es el caso provocado a propósito (foto rota)
const i = h.logs.findIndex((l) => l[0] === 'http404' && /missing/.test(l[1])); if (i >= 0) { h.logs.splice(i, 1); const j = h.logs.findIndex((l) => l[0] === 'error' && /404/.test(l[1])); if (j >= 0) h.logs.splice(j, 1); }
await h.finish();
