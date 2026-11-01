import * as THREE from 'three';

export const D = new THREE.Object3D();
// Geometrías compartidas entre todas las escenas (no se duplican por departamento)
const GEO = new Map();
export const geom = (key, make) => { if (!GEO.has(key)) GEO.set(key, make()); return GEO.get(key); };
export const disposeGeometries = () => { GEO.forEach((g) => g.dispose()); GEO.clear(); };
export const Pm = new THREE.Matrix4();
export const Fm = new THREE.Matrix4();
export const C = new THREE.Color();

export const inst = (geo, mat, n) => {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.frustumCulled = false; // el culling lo hace el SceneManager con la cámara del mapa
  return m;
};
export const setM = (mesh, i, parent, x, y, z, rx = 0, sx = 1, sy = 1, sz = 1) => {
  D.position.set(x, y, z); D.rotation.set(rx, 0, 0); D.scale.set(sx, sy, sz); D.updateMatrix();
  Fm.multiplyMatrices(parent, D.matrix);
  mesh.setMatrixAt(i, Fm);
};
export const parentM = (x, y, z, heading) => {
  D.position.set(x, y, z); D.rotation.set(0, 0, -heading); D.scale.set(1, 1, 1); D.updateMatrix();
  return Pm.copy(D.matrix);
};
export const mkPath = (pts) => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
};
export const at = (p, d) => {
  let i = 1;
  while (i < p.cum.length - 1 && p.cum[i] < d) i++;
  const [a, b] = [p.pts[i - 1], p.pts[i]];
  const k = (d - p.cum[i - 1]) / (p.cum[i] - p.cum[i - 1] || 1);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(b[0] - a[0], b[1] - a[1])];
};
