// Capa personalizada de MapLibre con three.js: escenas productivas ilustrativas.
// Comparte la cámara, la proyección y el terreno del mapa (no hay una segunda escena 3D).
import * as THREE from 'three';
import maplibregl from 'maplibre-gl';
import { ESCENAS, COLORES_ROL } from './escenasData';
import { centroidOf, interiorPoint } from './geo';

// Niveles de detalle por zoom: 1 provincial · 2 departamental · 3 actividad · 4 detalle
export const LEVEL_ZOOM = [8, 10, 12];
export const levelOf = (z) => (z < LEVEL_ZOOM[0] ? 1 : z < LEVEL_ZOOM[1] ? 2 : z < LEVEL_ZOOM[2] ? 3 : 4);
const smooth = (z, a, b) => { const t = Math.min(1, Math.max(0, (z - a) / (b - a))); return t * t * (3 - 2 * t); };
// Escala ilustrativa: la escena se agranda al alejarse para seguir siendo legible,
// pero crece en pantalla al acercarse (≈1,5× por nivel de zoom).
const sceneScale = (z) => Math.max(1, 150 * Math.pow(0.75, z - 12));

const D = new THREE.Object3D();
const Pm = new THREE.Matrix4();
const Fm = new THREE.Matrix4();
const C = new THREE.Color();

const inst = (geo, mat, n) => {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.frustumCulled = false; // el culling lo hacemos nosotros con la cámara del mapa
  return m;
};
const setM = (mesh, i, parent, x, y, z, rx = 0, sx = 1, sy = 1, sz = 1) => {
  D.position.set(x, y, z); D.rotation.set(rx, 0, 0); D.scale.set(sx, sy, sz); D.updateMatrix();
  Fm.multiplyMatrices(parent, D.matrix);
  mesh.setMatrixAt(i, Fm);
};
const parentM = (x, y, z, heading) => {
  D.position.set(x, y, z); D.rotation.set(0, 0, -heading); D.scale.set(1, 1, 1); D.updateMatrix();
  return Pm.copy(D.matrix);
};

const mkPath = (pts) => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
};
const at = (p, d) => {
  let i = 1;
  while (i < p.cum.length - 1 && p.cum[i] < d) i++;
  const [a, b] = [p.pts[i - 1], p.pts[i]];
  const k = (d - p.cum[i - 1]) / (p.cum[i] - p.cum[i - 1] || 1);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(b[0] - a[0], b[1] - a[1])];
};

export function createEscenasLayer({ onPick }) {
  const st = { opts: { people: true, vehicles: true, facilities: true, animate: true }, filter: 'todos', selected: null, geoms: {} };
  const rts = new Map();
  let map, renderer, camera, lastActive = [];

  const elevDz = (rt, x, y, s) => {
    const lat = rt.lat0 + (y * s) / 110540;
    const lng = rt.lng0 + (x * s) / (111320 * Math.cos((rt.lat0 * Math.PI) / 180));
    const e = map.queryTerrainElevation([lng, lat]);
    return e == null ? 0 : (e - rt.elev0) / s;
  };

  function build(def) {
    const c = def.anchor || interiorPoint(st.geoms[def.deptId], centroidOf(st.geoms[def.deptId]));
    const rt = {
      def, lng0: c[0], lat0: c[1], elev0: 0, frame: 0, lastZ: -1, scene: new THREE.Scene(),
      mvp: new THREE.Matrix4(), pick: [], vis: {}, mats: { facilities: [], vehicles: [], people: [] },
      groups: { facilities: new THREE.Group(), vehicles: new THREE.Group(), people: new THREE.Group() }
    };
    rt.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(0.5, -0.6, 1); rt.scene.add(sun);
    Object.values(rt.groups).forEach((g) => rt.scene.add(g));
    const mk = (cat, color) => {
      const m = new THREE.MeshLambertMaterial({ color, transparent: true, side: THREE.DoubleSide });
      rt.mats[cat].push(m); return m;
    };

    // --- instalaciones ---
    const F = rt.groups.facilities;
    rt.plant = new THREE.Mesh(new THREE.BoxGeometry(def.planta.w, def.planta.d, def.planta.h), mk('facilities', '#8d98a6'));
    rt.chim = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, def.chimenea.h, 12).rotateX(Math.PI / 2), mk('facilities', '#c9ced6'));
    rt.tanks = inst(new THREE.CylinderGeometry(1, 1, 1, 16).rotateX(Math.PI / 2), mk('facilities', '#d7dde4'), def.tanques.length);
    rt.ponds = inst(new THREE.BoxGeometry(1, 1, 1), mk('facilities', '#ffffff'), def.piletas.length);
    def.piletas.forEach((p, i) => rt.ponds.setColorAt(i, C.set(p.c)));
    rt.segs = def.caminos.flatMap((poly) => poly.slice(1).map((b, i) => [poly[i], b]));
    rt.roads = inst(new THREE.BoxGeometry(1, 1, 1), mk('facilities', '#2b2f36'), rt.segs.length);
    F.add(rt.plant, rt.chim, rt.tanks, rt.ponds, rt.roads);

    // --- vehículos ---
    const V = rt.groups.vehicles, nv = def.vehiculos.length;
    rt.veh = {
      chassis: inst(new THREE.BoxGeometry(2.6, 7.2, 0.6), mk('vehicles', '#3b4350'), nv),
      bed: inst(new THREE.BoxGeometry(2.8, 4.4, 2.2), mk('vehicles', '#e0a526'), nv),
      cab: inst(new THREE.BoxGeometry(2.5, 2.2, 2.4), mk('vehicles', '#f2f2f2'), nv),
      wheels: inst(new THREE.CylinderGeometry(0.65, 0.65, 0.45, 14).rotateZ(Math.PI / 2), mk('vehicles', '#15181d'), nv * 6)
    };
    V.add(...Object.values(rt.veh));
    rt.vehicles = def.vehiculos.map((v) => ({ ...v, path: mkPath(def.caminos[v.path]), dz: 0 }));

    // --- personas (partes instanciadas; las de nivel 4 van al final) ---
    const P = rt.groups.people;
    const people = [...def.personas].sort((a, b) => (a.minLevel || 0) - (b.minLevel || 0));
    const n = people.length;
    const part = (w, d, h, oz, color) => inst(new THREE.BoxGeometry(w, d, h).translate(0, 0, oz), mk('people', color), n);
    rt.ppl = {
      legL: part(0.2, 0.22, 0.85, -0.425, '#2c3e66'), legR: part(0.2, 0.22, 0.85, -0.425, '#2c3e66'),
      torso: part(0.5, 0.28, 0.62, 0.31, '#ffffff'),
      armL: part(0.14, 0.16, 0.62, -0.31, '#ffffff'), armR: part(0.14, 0.16, 0.62, -0.31, '#ffffff'),
      head: part(0.22, 0.22, 0.24, 0.12, '#e0b48f'), helmet: part(0.27, 0.27, 0.1, 0.05, '#ffffff')
    };
    people.forEach((p, i) => {
      const col = COLORES_ROL[p.role] || { chaleco: '#ffffff', casco: '#ffffff' };
      ['torso', 'armL', 'armR'].forEach((k) => rt.ppl[k].setColorAt(i, C.set(col.chaleco)));
      rt.ppl.helmet.setColorAt(i, C.set(col.casco));
    });
    P.add(...Object.values(rt.ppl));
    rt.people = people.map((p, i) => ({ ...p, ph: i * 1.7, dz: 0, path: p.mode === 'walk' ? mkPath(def.peatonal) : null }));
    return rt;
  }

  function layoutStatic(rt, s) {
    const def = rt.def, z = (x, y) => elevDz(rt, x, y, s);
    rt.plant.position.set(def.planta.x, def.planta.y, z(def.planta.x, def.planta.y) + def.planta.h / 2);
    rt.chim.position.set(def.chimenea.x, def.chimenea.y, z(def.chimenea.x, def.chimenea.y) + def.chimenea.h / 2);
    const put = (mesh, i, x, y, zz, sx, sy, sz, rz = 0) => {
      D.position.set(x, y, zz); D.rotation.set(0, 0, rz); D.scale.set(sx, sy, sz); D.updateMatrix(); mesh.setMatrixAt(i, D.matrix);
    };
    def.tanques.forEach((t, i) => put(rt.tanks, i, t.x, t.y, z(t.x, t.y) + t.h / 2, t.r, t.r, t.h));
    def.piletas.forEach((p, i) => put(rt.ponds, i, p.x, p.y, z(p.x, p.y) + 0.15, p.w, p.d, 0.3));
    rt.segs.forEach(([a, b], i) => {
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      put(rt.roads, i, mx, my, z(mx, my) + 0.08, Math.hypot(b[0] - a[0], b[1] - a[1]), 3, 0.15, Math.atan2(b[1] - a[1], b[0] - a[0]));
    });
    [rt.tanks, rt.ponds, rt.roads].forEach((m) => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    rt.pick.length = 0;
  }

  function animate(rt, t, anim, s, lv) {
    const list = rt.pick; list.length = 0;
    const d = rt.def;
    // instalaciones (seleccionables)
    list.push({ cat: 'facilities', x: d.planta.x, y: d.planta.y, z: rt.plant.position.z, h: d.planta.h, elemento: d.planta.label });
    d.tanques.forEach((q) => list.push({ cat: 'facilities', x: q.x, y: q.y, z: 0, h: q.h, elemento: 'Tanque de almacenamiento' }));
    d.piletas.forEach((p) => list.push({ cat: 'facilities', x: p.x, y: p.y, z: 0, h: 0.5, elemento: 'Piletas de evaporación (representación de salar)' }));

    // vehículos
    rt.vehicles.forEach((v, i) => {
      const [x, y, h] = at(v.path, (v.phase + (anim ? t * v.speed : 0)) % v.path.len);
      if ((rt.frame + i) % 4 === 0) v.dz = elevDz(rt, x, y, s);
      const P = parentM(x, y, v.dz, h);
      setM(rt.veh.chassis, i, P, 0, 0, 0.9); setM(rt.veh.bed, i, P, 0, -1.2, 2.3); setM(rt.veh.cab, i, P, 0, 2.7, 2.1);
      for (let k = 0; k < 6; k++) setM(rt.veh.wheels, i * 6 + k, P, k % 2 ? 1.3 : -1.3, [2.7, -0.8, -2.6][k >> 1], 0.65);
      list.push({ cat: 'vehicles', x, y, z: v.dz, h: 3, elemento: v.kind });
    });
    Object.values(rt.veh).forEach((m) => { m.instanceMatrix.needsUpdate = true; });

    // personas
    const nVis = rt.people.filter((p) => !p.minLevel || lv >= p.minLevel).length;
    rt.people.forEach((p, i) => {
      let { x, y, h } = p;
      if (p.mode === 'walk') [x, y, h] = at(p.path, (p.phase + (anim ? t * p.speed : 0)) % p.path.len);
      if ((rt.frame + i) % 4 === 0) p.dz = elevDz(rt, x, y, s);
      const P = parentM(x, y, p.dz, h);
      const A = anim ? t : 0;
      const sw = p.mode === 'walk' ? Math.sin(A * 6 + p.ph) * 0.7 : 0;
      const arm = p.mode === 'walk' ? -sw * 0.8 : 1.5 + (anim ? Math.sin(A * 3.2 + p.ph) * 0.9 : 0);
      const m = rt.ppl;
      setM(m.legL, i, P, -0.13, 0, 0.85, sw); setM(m.legR, i, P, 0.13, 0, 0.85, -sw);
      setM(m.torso, i, P, 0, 0, 0.85);
      setM(m.armL, i, P, -0.33, 0, 1.42, arm); setM(m.armR, i, P, 0.33, 0, 1.42, p.mode === 'walk' ? -arm : arm);
      setM(m.head, i, P, 0, 0, 1.47); setM(m.helmet, i, P, 0, 0, 1.69);
      if (i < nVis) list.push({ cat: 'people', x, y, z: p.dz, h: 1.8, elemento: p.role });
    });
    Object.values(rt.ppl).forEach((m) => { m.count = nVis; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
  }

  const active = () => ESCENAS.filter((d) => st.geoms[d.deptId] && (st.filter === 'todos' || st.filter === d.sector) && (!st.selected || st.selected === d.deptId));

  const layer = {
    id: 'escenas3d', type: 'custom', renderingMode: '3d',
    onAdd(m, gl) {
      map = m; camera = new THREE.Camera();
      renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
    },
    render(gl, arg) {
      const matrix = arg?.defaultProjectionData?.mainMatrix ?? arg;
      const z = map.getZoom();
      lastActive = [];
      if (z < LEVEL_ZOOM[0] - 0.3) return;
      const lv = levelOf(z), s = sceneScale(z), t = performance.now() / 1000;
      const W = map.getCanvas().clientWidth, H = map.getCanvas().clientHeight;
      let moving = false;
      renderer.resetState();
      for (const def of active()) {
        let rt = rts.get(def.id);
        const p = map.project([rt ? rt.lng0 : st.geoms[def.deptId] ? centroidOf(st.geoms[def.deptId])[0] : 0, rt ? rt.lat0 : centroidOf(st.geoms[def.deptId])[1]]);
        if (p.x < -700 || p.y < -700 || p.x > W + 700 || p.y > H + 700) continue; // culling
        if (!rt) { rt = build(def); rts.set(def.id, rt); }
        // altura del terreno (misma que renderiza el mapa)
        if (rt.frame % 4 === 0 || Math.abs(z - rt.lastZ) > 0.01) {
          const e = map.queryTerrainElevation([rt.lng0, rt.lat0]);
          rt.elev0 = e == null ? 0 : e;
          layoutStatic(rt, s); rt.lastZ = z;
        }
        const opF = smooth(z, LEVEL_ZOOM[0], LEVEL_ZOOM[0] + 1), opP = smooth(z, LEVEL_ZOOM[1], LEVEL_ZOOM[1] + 1);
        const ops = { facilities: opF, vehicles: opF, people: opP };
        for (const cat of Object.keys(ops)) {
          rt.mats[cat].forEach((m) => { m.opacity = ops[cat]; });
          rt.groups[cat].visible = st.opts[cat] && ops[cat] > 0.02;
          rt.vis[cat] = rt.groups[cat].visible && ops[cat] > 0.4;
        }
        animate(rt, t, st.opts.animate, s, lv);
        const mc = maplibregl.MercatorCoordinate.fromLngLat([rt.lng0, rt.lat0], rt.elev0);
        const sc = mc.meterInMercatorCoordinateUnits() * s;
        const L = new THREE.Matrix4().makeTranslation(mc.x, mc.y, mc.z).scale(new THREE.Vector3(sc, -sc, sc));
        camera.projectionMatrix.fromArray(matrix).multiply(L);
        rt.mvp.copy(camera.projectionMatrix);
        renderer.render(rt.scene, camera);
        rt.frame++; lastActive.push(rt);
        moving = moving || (st.opts.animate && (rt.groups.people.visible || rt.groups.vehicles.visible));
      }
      if (moving) map.triggerRepaint();
    },
    onRemove() { rts.forEach((rt) => rt.scene.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); })); rts.clear(); renderer?.dispose(); }
  };

  return Object.assign(layer, {
    setOptions(o) { st.opts = { ...st.opts, ...o }; map?.triggerRepaint(); },
    setFilter(f) { st.filter = f; map?.triggerRepaint(); },
    setSelected(id) { st.selected = id; map?.triggerRepaint(); },
    setGeometries(g) { st.geoms = g; },
    // selección por proximidad en pantalla (usa la misma cámara del mapa)
    pick(pt) {
      if (!map) return false;
      const W = map.getCanvas().clientWidth, H = map.getCanvas().clientHeight, v = new THREE.Vector4();
      let best = null, bd = 22;
      for (const rt of lastActive) for (const it of rt.pick) {
        if (!rt.vis[it.cat] || !st.opts[it.cat]) continue;
        v.set(it.x, it.y, it.z + it.h / 2, 1).applyMatrix4(rt.mvp);
        if (v.w <= 0) continue;
        const d = Math.hypot((v.x / v.w * 0.5 + 0.5) * W - pt.x, (1 - (v.y / v.w * 0.5 + 0.5)) * H - pt.y);
        if (d < bd) { bd = d; best = { rt, it }; }
      }
      if (!best) return false;
      const { def } = best.rt;
      onPick({ deptId: def.deptId, sector: def.sector, actividad: def.actividad, elemento: best.it.elemento, tipo: 'Ilustrativa' });
      return true;
    }
  });
}
