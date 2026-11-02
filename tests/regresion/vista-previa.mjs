// Vista previa: las 25 escenas se construyen y se dibujan sin errores, con anclas dentro de su departamento
import fs from 'fs';
import * as T from './three-stub.mjs';
const geo = JSON.parse(fs.readFileSync('../../public/data/jujuy-departamentos.geojson', 'utf8'));
const NAMES = { 'Dr. Manuel Belgrano': 'belgrano', 'Doctor Manuel Belgrano': 'belgrano', 'Santa Bárbara': 'santa_barbara', 'Santa Catalina': 'santa_catalina', 'San Pedro': 'san_pedro', 'San Antonio': 'san_antonio', 'El Carmen': 'el_carmen', 'Valle Grande': 'valle_grande' };
const geoms = Object.fromEntries(geo.features.map((f) => { const n = f.properties.nombre; return [NAMES[n] || n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), f.geometry]; }));
const { createEscenasLayer } = await import('../../src/components/Map3D/SceneManager.js');
const { SCENE_DEFS } = await import('../../src/config/departmentsConfig.js');
const { pointInGeometry } = await import('../../src/geo.js');
const real = performance.now.bind(performance);
let NOW = 0; Object.defineProperty(globalThis.performance, 'now', { value: () => NOW, configurable: true });
let zoom = 12.5; const layer = createEscenasLayer({ onPick() {} });
const map = { getZoom: () => zoom, getCanvas: () => ({ clientWidth: 1200, clientHeight: 700 }), project: () => ({ x: 600, y: 350 }), queryTerrainElevation: ([a, b]) => 3000 + Math.sin(a * 30) * 400, triggerRepaint() {} };
layer.onAdd(map, null); layer.setGeometries(geoms);
const M = new Float64Array(16); M[0] = M[5] = M[10] = M[15] = 1;
let bad = 0; const fail = (m) => { bad++; console.log('FALLA:', m); };
// 1) anclas
const A = layer.sceneAnchors();
SCENE_DEFS.forEach((d) => { const a = A[d.id]; if (!a || !pointInGeometry(a, geoms[d.deptId])) fail(`ancla fuera de ${d.deptId} (${d.id})`); });
const byDept = {}; SCENE_DEFS.forEach((d) => (byDept[d.deptId] ||= []).push(A[d.id]));
let minSep = Infinity; Object.values(byDept).forEach((l) => l.forEach((p, i) => l.slice(i + 1).forEach((q) => { minSep = Math.min(minSep, Math.hypot(p[0] - q[0], p[1] - q[1])); })));
console.log(`anclas: ${SCENE_DEFS.length} escenas, todas dentro de su departamento: ${bad === 0 ? 'sí' : 'NO'} · separación mínima entre escenas del mismo departamento: ${(minSep * 111).toFixed(1)} km`);
// 2) vista previa apagada (por defecto) -> sólo Susques
T.captured.length = 0; layer.render(null, M); console.log('vista previa APAGADA -> escenas dibujadas:', layer.visibleScenes().join(', '));
if (layer.visibleScenes().length !== 1) fail('con la vista previa apagada debe dibujarse sólo 1 escena');
// 3) vista previa encendida: todas, en cada nivel de zoom, sin NaN
layer.setOptions({ preview: true });
for (const z of [8.5, 10.5, 12.5, 14]) {
  zoom = z; NOW += 1000; T.captured.length = 0;
  try { for (let k = 0; k < 6; k++) layer.render(null, M); } catch (e) { fail(`excepción en zoom ${z}: ${e.message}`); continue; }
  const ids = layer.visibleScenes(); let nan = 0, inst = 0;
  T.captured.slice(-ids.length).forEach((c) => c.scene.traverse((o) => { if (o.isInstancedMesh) { inst += o.count; for (let i = 0; i < o.count * 16; i++) if (!Number.isFinite(o.instanceMatrix.array[i])) nan++; } }));
  console.log(`vista previa ENCENDIDA zoom ${z}: escenas ${ids.length}/${SCENE_DEFS.length} · instancias ${inst} · valores no finitos ${nan}`);
  if (ids.length !== SCENE_DEFS.length) fail(`faltan escenas en zoom ${z}`); if (nan) fail('matrices con NaN');
}
// 4) por departamento seleccionado
for (const id of new Set(SCENE_DEFS.map((d) => d.deptId))) { layer.setSelected(id); zoom = 12.5; NOW += 1000; layer.render(null, M); const n = layer.visibleScenes().length, esp = SCENE_DEFS.filter((d) => d.deptId === id).length; if (n !== esp) fail(`${id}: ${n} escenas dibujadas, se esperaban ${esp}`); }
console.log('selección por departamento: cada uno dibuja sólo sus escenas');

// 6) descarte por cámara de escenas NO construidas: debe usar el ancla de la propia escena (no el centroide del departamento)
let culled = 0;
for (const target of SCENE_DEFS) {
  let tgt = null;
  const l2 = createEscenasLayer({ onPick() {} });
  const m2 = { getZoom: () => 13, getCanvas: () => ({ clientWidth: 1200, clientHeight: 700 }), project: (c) => (tgt && (c[0] !== tgt[0] || c[1] !== tgt[1]) ? { x: 99999, y: 99999 } : { x: 600, y: 350 }), queryTerrainElevation: () => 3000, triggerRepaint() {} };
  l2.onAdd(m2, null); l2.setGeometries(geoms); l2.setOptions({ preview: true }); l2.setSelected(target.deptId);
  tgt = l2.sceneAnchors()[target.id]; NOW += 1000; l2.render(null, M);
  if (!l2.visibleScenes().includes(target.id)) { culled++; fail(`la cámara está sobre ${target.id} pero el motor la descartó`); }
  l2.onRemove();
}
console.log(`descarte por cámara: ${SCENE_DEFS.length - culled}/${SCENE_DEFS.length} escenas se construyen al tener la cámara encima, aunque estén lejos del centroide`);
// 5) CPU con las 25 escenas activas a la vez (peor caso)
layer.setSelected(null); zoom = 12.5; for (let i = 0; i < 100; i++) layer.render(null, M);
const t0 = real(); for (let i = 0; i < 1000; i++) layer.render(null, M); console.log(`CPU con las 25 escenas simultáneas (peor caso, todas en pantalla): ${((real() - t0) / 1000).toFixed(3)} ms por cuadro`);
layer.onRemove(); console.log(bad === 0 ? '\nRESULTADO: OK' : `\nRESULTADO: ${bad} problemas`); process.exit(bad ? 1 : 0);
