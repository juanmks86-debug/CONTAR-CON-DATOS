import * as THREE from 'three';
import { C, inst, setM, parentM, mkPath, at, geom } from './utils';
import { ROLES } from '../../config/activitiesConfig';

// Personas procedurales animadas (reemplazo hasta contar con modelos GLB: ver MODELOS_REQUERIDOS).
// Partes instanciadas; las de nivel 4 se ordenan al final y se muestran con `count`.
export function buildCharacters(def, rt, mk) {
  const people = [...def.personas].sort((a, b) => (a.minLevel || 0) - (b.minLevel || 0));
  const n = people.length;
  const part = (w, d, h, oz, color) => inst(geom(`pp:${w},${d},${h},${oz}`, () => new THREE.BoxGeometry(w, d, h).translate(0, 0, oz)), mk('people', color), n);
  rt.ppl = {
    legL: part(0.2, 0.22, 0.85, -0.425, '#2c3e66'), legR: part(0.2, 0.22, 0.85, -0.425, '#2c3e66'),
    torso: part(0.5, 0.28, 0.62, 0.31, '#ffffff'),
    armL: part(0.14, 0.16, 0.62, -0.31, '#ffffff'), armR: part(0.14, 0.16, 0.62, -0.31, '#ffffff'),
    head: part(0.22, 0.22, 0.24, 0.12, '#e0b48f'), helmet: part(0.27, 0.27, 0.1, 0.05, '#ffffff')
  };
  people.forEach((p, i) => {
    const col = ROLES[p.role] || { chaleco: '#ffffff', casco: '#ffffff' };
    ['torso', 'armL', 'armR'].forEach((k) => rt.ppl[k].setColorAt(i, C.set(col.chaleco)));
    rt.ppl.helmet.setColorAt(i, C.set(col.casco));
  });
  rt.groups.people.add(...Object.values(rt.ppl));
  rt.people = people.map((p, i) => ({ ...p, ph: i * 1.7, dz: 0, path: p.mode === 'walk' ? mkPath(def.peatonal) : null }));
}

export function updateCharacters(rt, t, anim, s, elevDz, list, lv) {
  const nVis = rt.people.filter((p) => !p.minLevel || lv >= p.minLevel).length;
  const m = rt.ppl;
  rt.people.forEach((p, i) => {
    let { x, y, h } = p;
    if (p.mode === 'walk') [x, y, h] = at(p.path, (p.phase + (anim ? t * p.speed : 0)) % p.path.len);
    if ((rt.frame + i) % 4 === 0) p.dz = elevDz(rt, x, y, s);
    const P = parentM(x, y, p.dz, h);
    const A = anim ? t : 0;
    const sw = p.mode === 'walk' ? Math.sin(A * 6 + p.ph) * 0.7 : 0;
    const arm = p.mode === 'walk' ? -sw * 0.8 : 1.5 + (anim ? Math.sin(A * 3.2 + p.ph) * 0.9 : 0);
    setM(m.legL, i, P, -0.13, 0, 0.85, sw); setM(m.legR, i, P, 0.13, 0, 0.85, -sw);
    setM(m.torso, i, P, 0, 0, 0.85);
    setM(m.armL, i, P, -0.33, 0, 1.42, arm); setM(m.armR, i, P, 0.33, 0, 1.42, p.mode === 'walk' ? -arm : arm);
    setM(m.head, i, P, 0, 0, 1.47); setM(m.helmet, i, P, 0, 0, 1.69);
    if (i < nVis) list.push({ cat: 'people', x, y, z: p.dz, h: 1.8, elemento: p.role });
  });
  Object.values(m).forEach((mesh) => { mesh.count = nVis; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; });
}
