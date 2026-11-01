import fs from 'fs';
import * as T from './three-stub.mjs';
const geo = JSON.parse(fs.readFileSync('../../public/data/jujuy-departamentos.geojson', 'utf8'));
const susq = geo.features.find((f) => f.properties.nombre === 'Susques').geometry;
const { createEscenasLayer } = await import('../../src/components/Map3D/SceneManager.js');
const real = performance.now.bind(performance);
const layer = createEscenasLayer({ onPick() {} });
let zoom = 13.2, q = 0;
const map = { getZoom: () => zoom, getCanvas: () => ({ clientWidth: 1366, clientHeight: 600 }), project: () => ({ x: 683, y: 300 }), queryTerrainElevation: ([a, b]) => { q++; return 6400 + Math.sin(a * 40) * 300; }, triggerRepaint() {} };
layer.onAdd(map, null); layer.setGeometries({ susques: susq });
const M = new Float64Array(16); M[0] = M[5] = M[10] = M[15] = 1;
for (let i = 0; i < 200; i++) layer.render(null, M); // calentamiento
for (const lv of [[9.5, 'nivel 2'], [11, 'nivel 3'], [13.2, 'nivel 4']]) {
  zoom = lv[0]; q = 0; T.captured.length = 0; const N = 3000; const t0 = real(); for (let i = 0; i < N; i++) layer.render(null, M); const dt = (real() - t0) / N;
  console.log(`${lv[1]} (zoom ${lv[0]}): ${dt.toFixed(3)} ms por cuadro (solo CPU de JavaScript) | consultas de relieve por cuadro: ${(q / N).toFixed(1)}`);
}
