import * as THREE from 'three';
import { D, C, inst, geom } from './utils';

// Instalaciones: cajas y cilindros instanciados (con color por instancia) + caminos.
export function buildInstallations(def, rt, mk) {
  // un InstancedMesh por tipo de forma (caja, cilindro, cono) con color por instancia
  const groups = {};
  def.piezas.forEach((p) => {
    const key = p.shape === 'cyl' ? `cyl@${p.top ?? 1}` : 'box';
    (groups[key] ||= { top: p.top ?? 1, cyl: p.shape === 'cyl', items: [] }).items.push(p);
  });
  rt.inst = {};
  for (const [key, g] of Object.entries(groups)) {
    const geo = geom(`inst:${key}`, () => (g.cyl ? new THREE.CylinderGeometry(g.top, 1, 1, 16).rotateX(Math.PI / 2) : new THREE.BoxGeometry(1, 1, 1)));
    const mesh = inst(geo, mk('facilities', '#ffffff'), g.items.length);
    g.items.forEach((p, i) => mesh.setColorAt(i, C.set(p.c)));
    rt.inst[key] = { items: g.items, mesh };
  }
  rt.segs = def.caminos.flatMap((poly) => poly.slice(1).map((b, i) => [poly[i], b]));
  rt.roads = inst(geom('box', () => new THREE.BoxGeometry(1, 1, 1)), mk('facilities', '#2b2f36'), rt.segs.length);
  rt.groups.facilities.add(...Object.values(rt.inst).map((v) => v.mesh), rt.roads);
}

export function layoutInstallations(rt, s, elevDz) {
  const put = (mesh, i, x, y, z, sx, sy, sz, rz = 0) => {
    D.position.set(x, y, z); D.rotation.set(0, 0, rz); D.scale.set(sx, sy, sz); D.updateMatrix(); mesh.setMatrixAt(i, D.matrix);
  };
  for (const { items, mesh } of Object.values(rt.inst)) {
    items.forEach((p, i) => {
      p.dz = elevDz(rt, p.x, p.y, s); // apoyo sobre el relieve
      put(mesh, i, p.x, p.y, p.dz + p.h / 2, p.shape === 'cyl' ? p.w : p.w, p.shape === 'cyl' ? p.w : p.d, p.h);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  rt.segs.forEach(([a, b], i) => {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    put(rt.roads, i, mx, my, elevDz(rt, mx, my, s) + 0.08, Math.hypot(b[0] - a[0], b[1] - a[1]), 3, 0.15, Math.atan2(b[1] - a[1], b[0] - a[0]));
  });
  rt.roads.instanceMatrix.needsUpdate = true;
}

export function installationPicks(rt, list) {
  for (const { items } of Object.values(rt.inst))
    items.forEach((p) => { if (p.pick !== false) list.push({ cat: 'facilities', x: p.x, y: p.y, z: p.dz || 0, h: p.h, elemento: p.label }); });
}
