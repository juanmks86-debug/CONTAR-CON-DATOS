// Motor único y compartido: capa personalizada de MapLibre con three.js.
// Usa la cámara, la proyección y el terreno del mapa (no hay una segunda escena 3D).
// Cada departamento aporta su configuración (config/departmentsConfig.js); el motor es el mismo para los 16.
import * as THREE from 'three';
import maplibregl from 'maplibre-gl';
import { SCENE_DEFS } from '../../config/departmentsConfig';
import { spreadPoints } from '../../geo';
import { LEVEL_ZOOM, levelOf, sceneScale, fades } from './ZoomController';
import { disposeGeometries } from './utils';
import { buildInstallations, layoutInstallations, installationPicks } from './InstallationManager';
import { buildVehicles, updateVehicles } from './VehicleManager';
import { buildCharacters, updateCharacters } from './CharacterManager';

export { levelOf };
const UNLOAD_S = 20;
const L = new THREE.Matrix4(), SCALE_V = new THREE.Vector3();
const disposeRt = (rt) => rt.scene.traverse((o) => { o.material?.dispose?.(); o.dispose?.(); }); // las geometrías son compartidas
const group = (sector) => (sector === 'servicios' ? 'turismo' : sector); // "Turismo y servicios" comparten filtro

export function createEscenasLayer({ onPick }) {
  const st = { opts: { people: true, vehicles: true, facilities: true, animate: true, preview: false }, filter: 'todos', selected: null, geoms: {} };
  const rts = new Map(), anchors = {};
  let map, renderer, camera, lastActive = [];

  const anchorOf = (def) => {
    if (def.anchor) return def.anchor;
    anchors[def.deptId] ||= spreadPoints(st.geoms[def.deptId], SCENE_DEFS.filter((d) => d.deptId === def.deptId).length);
    return anchors[def.deptId][def.index];
  };
  // Altura relativa del terreno en (x, y) locales: la misma que dibuja el mapa
  const elevDz = (rt, x, y, s) => {
    const lat = rt.lat0 + (y * s) / 110540;
    const lng = rt.lng0 + (x * s) / (111320 * Math.cos((rt.lat0 * Math.PI) / 180));
    const e = map.queryTerrainElevation([lng, lat]);
    return e == null ? 0 : (e - rt.elev0) / s;
  };

  function build(def) {
    const c = anchorOf(def);
    const rt = {
      def, lng0: c[0], lat0: c[1], elev0: 0, frame: 0, lastZ: -1, scene: new THREE.Scene(), mvp: new THREE.Matrix4(),
      pick: [], vis: {}, lastSeen: performance.now() / 1000, mats: { facilities: [], vehicles: [], people: [] },
      groups: { facilities: new THREE.Group(), vehicles: new THREE.Group(), people: new THREE.Group() }
    };
    rt.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(0.5, -0.6, 1); rt.scene.add(sun);
    Object.values(rt.groups).forEach((g) => rt.scene.add(g));
    const mk = (cat, color) => {
      const m = new THREE.MeshLambertMaterial({ color, transparent: true, side: THREE.DoubleSide });
      rt.mats[cat].push(m); return m;
    };
    buildInstallations(def, rt, mk);
    buildVehicles(def, rt, mk);
    buildCharacters(def, rt, mk);
    return rt;
  }

  // `preview` (apagado por defecto) dibuja también las escenas ilustrativas aún no validadas
  const active = () => SCENE_DEFS.filter((d) => (d.activa || st.opts.preview) && st.geoms[d.deptId]
    && (st.filter === 'todos' || st.filter === group(d.sector)) && (!st.selected || st.selected === d.deptId));

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
      const now = performance.now() / 1000;
      // memoria: se descartan las escenas que no se ven hace más de UNLOAD_S segundos
      rts.forEach((r, id) => { if (now - r.lastSeen > UNLOAD_S) { disposeRt(r); rts.delete(id); } });
      if (z < LEVEL_ZOOM[0] - 0.3) return;
      const lv = levelOf(z), s = sceneScale(z), t = performance.now() / 1000;
      const W = map.getCanvas().clientWidth, H = map.getCanvas().clientHeight;
      let moving = false;
      renderer.resetState();
      for (const def of active()) {
        // punto de referencia del descarte por cámara: el ancla de ESTA escena (no el centroide del departamento)
        const rc = rts.get(def.id) ? [rts.get(def.id).lng0, rts.get(def.id).lat0] : anchorOf(def);
        const p = map.project(rc);
        if (p.x < -900 || p.y < -900 || p.x > W + 900 || p.y > H + 900) continue; // culling: fuera de cámara
        let rt = rts.get(def.id);
        if (!rt) { rt = build(def); rts.set(def.id, rt); } // carga progresiva: sólo lo que se ve
        // queryTerrainElevation devuelve la altura RELATIVA al centro de la pantalla (así posiciona MapLibre los objetos 3D
        // personalizados): cambia en cada cuadro al mover la cámara, por eso el ancla se muestrea siempre.
        const e = map.queryTerrainElevation([rt.lng0, rt.lat0]);
        rt.elev0 = e == null ? 0 : e;
        if (rt.frame % 4 === 0 || Math.abs(z - rt.lastZ) > 0.01) { layoutInstallations(rt, s, elevDz); rt.lastZ = z; }
        const ops = fades(z, def.zoom || LEVEL_ZOOM);
        for (const cat of Object.keys(ops)) {
          rt.mats[cat].forEach((m) => { m.opacity = ops[cat]; });
          rt.groups[cat].visible = st.opts[cat] && ops[cat] > 0.02;
          rt.vis[cat] = rt.groups[cat].visible && ops[cat] > 0.4;
        }
        const list = rt.pick; list.length = 0;
        installationPicks(rt, list);
        updateVehicles(rt, t, st.opts.animate, s, elevDz, list);
        updateCharacters(rt, t, st.opts.animate, s, elevDz, list, lv);
        const mc = maplibregl.MercatorCoordinate.fromLngLat([rt.lng0, rt.lat0], rt.elev0);
        const sc = mc.meterInMercatorCoordinateUnits() * s;
        L.makeTranslation(mc.x, mc.y, mc.z).scale(SCALE_V.set(sc, -sc, sc));
        camera.projectionMatrix.fromArray(matrix).multiply(L);
        rt.mvp.copy(camera.projectionMatrix);
        renderer.render(rt.scene, camera);
        rt.frame++; rt.lastSeen = now; lastActive.push(rt);
        moving = moving || (st.opts.animate && (rt.groups.people.visible || rt.groups.vehicles.visible));
      }
      if (moving) map.triggerRepaint();
    },
    onRemove() { rts.forEach(disposeRt); rts.clear(); disposeGeometries(); renderer?.dispose(); }
  };

  return Object.assign(layer, {
    setOptions(o) { st.opts = { ...st.opts, ...o }; map?.triggerRepaint(); },
    setFilter(f) { st.filter = f; map?.triggerRepaint(); },
    setSelected(id) { st.selected = id; map?.triggerRepaint(); },
    setGeometries(g) { st.geoms = g; },
    sceneAnchors() { return Object.fromEntries(SCENE_DEFS.filter((d) => st.geoms[d.deptId]).map((d) => [d.id, anchorOf(d)])); }, // para pruebas
    visibleScenes() { return lastActive.map((rt) => rt.def.id); }, // para pruebas
    // selección por proximidad en pantalla (misma cámara del mapa)
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
      onPick({ deptId: def.deptId, sector: def.sector, actividad: def.actividad, elemento: best.it.elemento, tipo: 'Ilustrativa', validada: def.validada, fuentes: def.fuentes, preview: !def.activa });
      return true;
    }
  });
}
