import fs from 'fs';
import * as T from './three-stub.mjs';
const [, , which] = process.argv;
const geo = JSON.parse(fs.readFileSync('../../public/data/jujuy-departamentos.geojson', 'utf8'));
const g = Object.fromEntries(geo.features.map((f) => [({ Susques: 'susques' })[f.properties.nombre] || f.properties.nombre, f.geometry]));
const mod = which === 'orig' ? await import('./original/escenas3d.js') : await import('../../src/components/Map3D/SceneManager.js');
let NOW = 0; Object.defineProperty(globalThis.performance, 'now', { value: () => NOW, configurable: true });
let zoom = 12.5; const picked = [];
const layer = mod.createEscenasLayer({ onPick: (i) => picked.push(i) });
const elev = ([lng, lat]) => 3800 + Math.sin(lng * 40) * 300 + Math.cos(lat * 55) * 220;
const map = { getZoom: () => zoom, getCanvas: () => ({ clientWidth: 1200, clientHeight: 700 }), project: () => ({ x: 600, y: 350 }), queryTerrainElevation: elev, triggerRepaint() {} };
layer.onAdd(map, null);
// SE CARGAN LAS 16 GEOMETRÍAS: en el motor modular sólo debe dibujarse Susques-minería
layer.setGeometries(Object.fromEntries(Object.entries(g)));
layer.setOptions?.({});
const cx = 0.3 + -66.662 * 1e-3, cy = 0.4 - -23.521 * 1e-3, K = 1300;
const M = new Float64Array([K, 0, 0, 0, 0, -K, 0, 0, 0, 0, 1e-4, 0, -K * cx + 0, K * cy, 0, 1]);
const r = (v) => Math.round(v * 1e5) / 1e5;
const sig = (caps) => {
  const out = [];
  for (const cap of caps) {
    cap.scene.updateMatrixWorld(true);
    cap.scene.traverse((o) => {
      if (!o.isMesh) return;
      let vis = true; for (let p = o; p; p = p.parent) if (!p.visible) vis = false;
      o.geometry.computeBoundingBox();
      const n = o.isInstancedMesh ? o.count : 1;
      for (let i = 0; i < n; i++) {
        const m = new T.Matrix4(); if (o.isInstancedMesh) o.getMatrixAt(i, m); else m.copy(o.matrix);
        const bb = o.geometry.boundingBox.clone().applyMatrix4(m);
        const col = o.instanceColor ? new T.Color().fromArray(o.instanceColor.array, i * 3).getHexString() : o.material.color.getHexString();
        out.push(`${vis ? 'V' : 'h'}|${[bb.min.x, bb.min.y, bb.min.z, bb.max.x, bb.max.y, bb.max.z].map(r).join(',')}|${col}|${r(o.material.opacity)}`);
      }
    });
  }
  return out.sort();
};
const frames = [];
for (const [z, t, filter, sel] of [[7, 0, 'todos', null], [8.5, 1.3, 'todos', null], [9.5, 2.1, 'todos', null], [11, 3.7, 'todos', null], [12.5, 5.2, 'todos', null], [13.5, 8.9, 'todos', null], [12.5, 9.5, 'agro', null], [12.5, 10, 'mineril', null], [12.5, 11, 'todos', 'tilcara'], [12.5, 12, 'todos', 'susques']]) {
  zoom = z; NOW = t * 1000; layer.setFilter(filter); layer.setSelected?.(sel); T.captured.length = 0;
  for (let k = 0; k < 6; k++) layer.render(null, M);
  const per = T.captured.length / 6;
  const last = per ? T.captured.slice(-per) : [];
  const picks = []; picked.length = 0;
  if (per) for (let x = 0; x < 1200; x += 15) for (let y = 0; y < 700; y += 15) { if (layer.pick({ x, y })) picks.push(`${x},${y}:${picked.at(-1).elemento}`); }
  frames.push({ z, filter, sel, escenasDibujadas: per, instancias: sig(last), picks });
}
fs.writeFileSync(`snap-${which}.json`, JSON.stringify(frames));
console.log(which.padEnd(5), frames.map((f) => `z${f.z}${f.filter === 'todos' ? '' : '/' + f.filter}${f.sel ? '>' + f.sel : ''}: esc=${f.escenasDibujadas} inst=${f.instancias.length} picks=${f.picks.length}`).join('\n      '));
