import * as THREE from 'three';
import { D, C, inst } from './utils';

// Instalaciones: cajas y cilindros instanciados (con color por instancia) + caminos.
export function buildInstallations(def, rt, mk) {
  const boxes = def.piezas.filter((p) => p.shape !== 'cyl');
  const cyls = def.piezas.filter((p) => p.shape === 'cyl');
  const mesh = (items, geo) => {
    const m = inst(geo, mk('facilities', '#ffffff'), items.length);
    items.forEach((p, i) => m.setColorAt(i, C.set(p.c)));
    return m;
  };
  rt.inst = {
    boxes: { items: boxes, mesh: mesh(boxes, new THREE.BoxGeometry(1, 1, 1)) },
    cyls: { items: cyls, mesh: mesh(cyls, new THREE.CylinderGeometry(1, 1, 1, 16).rotateX(Math.PI / 2)) }
  };
  rt.segs = def.caminos.flatMap((poly) => poly.slice(1).map((b, i) => [poly[i], b]));
  rt.roads = inst(new THREE.BoxGeometry(1, 1, 1), mk('facilities', '#2b2f36'), rt.segs.length);
  rt.groups.facilities.add(rt.inst.boxes.mesh, rt.inst.cyls.mesh, rt.roads);
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
    items.forEach((p) => list.push({ cat: 'facilities', x: p.x, y: p.y, z: p.dz || 0, h: p.h, elemento: p.label }));
}
