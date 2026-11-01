import * as THREE from 'three';
import { C, inst, setM, parentM, mkPath, at, geom } from './utils';
import { VEHICLES } from '../../config/activitiesConfig';

// Vehículos: un grupo por tipo; cada parte es un InstancedMesh con color propio.
export function buildVehicles(def, rt, mk) {
  rt.vgroups = {};
  def.vehiculos.forEach((v) => {
    (rt.vgroups[v.type] ||= { cfg: VEHICLES[v.type], list: [] }).list.push({ ...v, path: mkPath(def.caminos[v.path || 0]), dz: 0 });
  });
  const wheelGeo = geom('wheel', () => new THREE.CylinderGeometry(1, 1, 1, 14).rotateZ(Math.PI / 2));
  for (const g of Object.values(rt.vgroups)) {
    const n = g.list.length;
    g.meshes = g.cfg.parts.map((pt) => {
      const m = inst(geom('box', () => new THREE.BoxGeometry(1, 1, 1)), mk('vehicles', '#ffffff'), n);
      for (let i = 0; i < n; i++) m.setColorAt(i, C.set(pt.c));
      return m;
    });
    g.wheels = inst(wheelGeo, mk('vehicles', '#15181d'), n * g.cfg.wheels.pos.length);
    rt.groups.vehicles.add(...g.meshes, g.wheels);
  }
}

export function updateVehicles(rt, t, anim, s, elevDz, list) {
  for (const g of Object.values(rt.vgroups)) {
    const { parts, wheels } = g.cfg;
    g.list.forEach((v, i) => {
      const [x, y, h] = at(v.path, (v.phase + (anim ? t * v.speed : 0)) % v.path.len);
      if ((rt.frame + i) % 4 === 0) v.dz = elevDz(rt, x, y, s);
      const P = parentM(x, y, v.dz, h);
      parts.forEach((pt, k) => setM(g.meshes[k], i, P, pt.at[0], pt.at[1], pt.at[2], 0, pt.p[0], pt.p[1], pt.p[2]));
      wheels.pos.forEach(([wx, wy], k) => setM(g.wheels, i * wheels.pos.length + k, P, wx, wy, wheels.r, 0, wheels.w, wheels.r, wheels.r));
      list.push({ cat: 'vehicles', x, y, z: v.dz, h: 3, elemento: g.cfg.label });
    });
    g.meshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    g.wheels.instanceMatrix.needsUpdate = true;
  }
}
