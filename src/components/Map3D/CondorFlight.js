// Vuelo 3D del Cóndor Andino sobre la Quebrada de Humahuaca
// Ruta geográfica: San Salvador de Jujuy [24°11′34″ S, 65°17′36″ O] -> Purmamarca [23°44′00″ S, 65°29′00″ O]
// Renderizado integrado con Three.js + MapLibre GL JS (relieve DEM) + AnimationMixer

import * as THREE from 'three';
import maplibregl from 'maplibre-gl';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Coordenadas oficiales de la ruta solicitada
export const CONDOR_COORDINATES = {
  inicio: {
    dms: '24°11′34″ S, 65°17′36″ O',
    lat: -24.192778,
    lng: -65.293333,
    nombre: 'San Salvador de Jujuy (Dr. Manuel Belgrano)'
  },
  destino: {
    dms: '23°44′00″ S, 65°29′00″ O',
    lat: -23.733333,
    lng: -65.483333,
    nombre: 'Purmamarca (Tumbaya)'
  }
};

// Waypoints geográficos del corredor de la Quebrada de Humahuaca
// [longitud, latitud, despeje_sobre_terreno_metros]
const WAYPOINTS = [
  // 1. San Salvador de Jujuy (Punto inicial: 24°11′34″ S, 65°17′36″ O)
  [-65.293333, -24.192778, 650],
  // 2. Ascenso por el valle de Yala / Lozano
  [-65.375000, -24.135000, 720],
  // 3. Garganta de León (puerta de la Quebrada)
  [-65.432000, -24.025000, 800],
  // 4. Paso de Volcán
  [-65.462000, -23.918000, 850],
  // 5. Tumbaya (valle medio)
  [-65.468000, -23.856000, 820],
  // 6. Purmamarca - Cerro de los Siete Colores (Punto final: 23°44′00″ S, 65°29′00″ O)
  [-65.483333, -23.733333, 900],
  // 7. Vuelo térmico sobre el Paseo de los Colorados
  [-65.512000, -23.722000, 1000],
  // 8. Cumbres altas occidentales de Purmamarca
  [-65.525000, -23.750000, 1050],
  // 9. Retorno por la alta cresta montañosa de Tumbaya
  [-65.500000, -23.820000, 980],
  // 10. Cresta alta sobre Volcán
  [-65.480000, -23.935000, 920],
  // 11. Serranías de Chañi / Lozano
  [-65.420000, -24.065000, 820],
  // 12. Descenso suave sobre las alturas de Yala hacia Jujuy
  [-65.345000, -24.155000, 700]
];

// Interpolación cúbica Catmull-Rom para curvas continuas suaves
function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

// Derivada de Catmull-Rom para cálculo del vector de velocidad y orientación
function catmullRomDerivative(p0, p1, p2, p3, t) {
  const t2 = t * t;
  return (
    0.5 *
    (-p0 + p2 +
      2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * t +
      3 * (-p0 + 3 * p1 - 3 * p2 + p3) * t2)
  );
}

// Obtener punto y tangente en el circuito cerrado con u in [0, 1]
function evaluatePath(u) {
  const n = WAYPOINTS.length;
  const total = ((u % 1) + 1) % 1;
  const scaled = total * n;
  const i = Math.floor(scaled);
  const t = scaled - i;

  const p0 = WAYPOINTS[(i - 1 + n) % n];
  const p1 = WAYPOINTS[i % n];
  const p2 = WAYPOINTS[(i + 1) % n];
  const p3 = WAYPOINTS[(i + 2) % n];

  const lng = catmullRom(p0[0], p1[0], p2[0], p3[0], t);
  const lat = catmullRom(p0[1], p1[1], p2[1], p3[1], t);
  const clearance = catmullRom(p0[2], p1[2], p2[2], p3[2], t);

  const dlng = catmullRomDerivative(p0[0], p1[0], p2[0], p3[0], t) * n;
  const dlat = catmullRomDerivative(p0[1], p1[1], p2[1], p3[1], t) * n;
  const dclearance = catmullRomDerivative(p0[2], p1[2], p2[2], p3[2], t) * n;

  return { lng, lat, clearance, dlng, dlat, dclearance };
}

// Escala adaptativa del cóndor: visible tanto en vista provincial amplia como en detalle cercano
export function condorScaleForZoom(z) {
  // En zoom 7.5-8.5 (provincia completa): escala ~1800-2400 (envergadura visible en pantalla de ~20-30 px)
  // En zoom 12 (Purmamarca): escala ~350
  // En zoom 14: escala ~120
  // En zoom 16: escala ~40
  return Math.max(30, 2200 * Math.pow(0.70, Math.max(0, z - 8)));
}

/**
 * Crea e inicializa el vuelo del Cóndor Andino.
 * Cumple con: createCondorFlight(), renderCondorFlight(), disposeCondorFlight().
 */
export function createCondorFlight({ onPick, modelUrl = '/models/Condor_Andino.glb' } = {}) {
  let mapInstance = null;
  let ownRenderer = null;
  let ownCamera = null;
  const scene = new THREE.Scene();
  let mixer = null;

  // Acciones de animación del GLB
  const actions = {
    glide: null,
    flap: null,
    turnLeft: null,
    turnRight: null,
    transition: null,
    extraWings: []
  };
  let currentAction = null;

  // Grupos de posicionamiento y orientación
  const flightGroup = new THREE.Group();
  flightGroup.frustumCulled = false;

  const orientationGroup = new THREE.Group();
  orientationGroup.frustumCulled = false;
  flightGroup.add(orientationGroup);

  let condorModel = null;
  let isLoaded = false;
  let loadError = null;

  // Iluminación dedicada para destacar al cóndor sobre el mapa satelital
  scene.add(new THREE.AmbientLight(0xffffff, 2.0));
  const sunLight = new THREE.DirectionalLight(0xfffaed, 2.8);
  sunLight.position.set(0.6, 0.5, 1.8);
  scene.add(sunLight);
  const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x445566, 1.6);
  scene.add(hemiLight);

  scene.add(flightGroup);

  // Malla temporal de previsualización mientras carga el GLB asíncrono
  const previewGeo = new THREE.ConeGeometry(2, 6, 4);
  previewGeo.rotateX(Math.PI / 2);
  const previewMat = new THREE.MeshLambertMaterial({ color: 0x223344, side: THREE.DoubleSide });
  const previewMesh = new THREE.Mesh(previewGeo, previewMat);
  previewMesh.frustumCulled = false;
  orientationGroup.add(previewMesh);

  // Estado del vuelo
  const state = {
    enabled: true,
    speed: 0.007,
    progress: 0.08,
    lastTime: performance.now() / 1000,
    currentLng: WAYPOINTS[0][0],
    currentLat: WAYPOINTS[0][1],
    currentAlt: WAYPOINTS[0][2] + 1600,
    currentHeading: 0,
    currentPitch: 0,
    smoothedBank: 0,
    smoothedPitch: 0,
    turnSmoothed: 0,
    flapTimer: 0,
    isFlapping: false,
    mvp: new THREE.Matrix4()
  };

  const transformMatrix = new THREE.Matrix4();
  const scaleVector = new THREE.Vector3();

  // Transición suave entre animaciones
  function crossFadeTo(targetAction, duration = 0.45) {
    if (!targetAction || currentAction === targetAction) return;
    targetAction.reset();
    targetAction.setEffectiveTimeScale(1);
    targetAction.setEffectiveWeight(1);
    targetAction.play();
    if (currentAction) {
      currentAction.crossFadeTo(targetAction, duration, true);
    }
    currentAction = targetAction;
  }

  // Cargar modelo GLB
  function loadModel() {
    if (typeof window === 'undefined') return;
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        // Remover malla temporal
        orientationGroup.remove(previewMesh);
        previewGeo.dispose();
        previewMat.dispose();

        condorModel = gltf.scene;
        condorModel.frustumCulled = false;

        // Orientar el modelo (+Y arriba de Blender -> +Z arriba del mapa)
        orientationGroup.rotation.x = Math.PI / 2;

        // ¡CRUCIAL!: Desactivar frustumCulled en todas las mallas del modelo
        // MapLibre usa matrices Mercator que Three.js descarta si frustumCulled es true
        condorModel.traverse((child) => {
          if (child.isMesh) {
            child.frustumCulled = false;
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.side = THREE.DoubleSide;
              child.material.depthWrite = true;
              child.material.depthTest = true;

              // Dar luminosidad visible al plumaje para contrastar sobre las sombras del mapa satelital
              if (
                child.material.color &&
                child.material.color.r < 0.05 &&
                child.material.color.g < 0.05 &&
                child.material.color.b < 0.05
              ) {
                child.material.color.setRGB(0.18, 0.22, 0.28);
              }
              child.material.roughness = 0.55;
              child.material.needsUpdate = true;
            }
          }
        });

        orientationGroup.add(condorModel);

        // Inicializar animaciones
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(condorModel);

          gltf.animations.forEach((clip) => {
            const name = clip.name;
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopRepeat, Infinity);

            if (name.includes('Glide')) actions.glide = action;
            else if (name.includes('Flap')) actions.flap = action;
            else if (name.includes('Turn_Left')) actions.turnLeft = action;
            else if (name.includes('Turn_Right')) actions.turnRight = action;
            else if (name.includes('Transition')) actions.transition = action;
            else actions.extraWings.push(action);
          });

          currentAction = actions.glide || mixer.clipAction(gltf.animations[0]);
          if (currentAction) {
            currentAction.play();
          }
          actions.extraWings.forEach((act) => act.play());
        }

        isLoaded = true;
        mapInstance?.triggerRepaint();
      },
      undefined,
      (err) => {
        console.warn('Advertencia al cargar modelo GLB del Cóndor:', modelUrl, err);
        loadError = err;
      }
    );
  }

  // Carga inicial
  loadModel();

  /**
   * Renderizado cuadro a cuadro del Cóndor
   * Soporta ser invocado con (renderer, camera, matrix, map) o (gl, matrix)
   */
  function renderCondorFlight(rendererParam, cameraParam, matrixParam, mapParam) {
    if (!state.enabled) return;

    let targetRenderer = rendererParam;
    let targetCamera = cameraParam;
    let mainMatrix = matrixParam;
    const map = mapParam || mapInstance;

    // Si se llama como capa MapLibre directa render(gl, arg):
    if (!targetCamera || !targetRenderer?.render) {
      const gl = rendererParam;
      const arg = cameraParam;
      mainMatrix = arg?.defaultProjectionData?.mainMatrix ?? arg;
      targetRenderer = ownRenderer;
      targetCamera = ownCamera;
    }

    if (!targetRenderer || !targetCamera || !map) return;

    const now = performance.now() / 1000;
    const dt = Math.min(0.1, Math.max(0.001, now - state.lastTime));
    state.lastTime = now;

    // Avanzar trayectoria
    state.progress = (state.progress + state.speed * dt) % 1;
    const pt = evaluatePath(state.progress);

    // Muestreo de altura del terreno DEM
    const terrainElevation = map.queryTerrainElevation?.([pt.lng, pt.lat]) ?? 1600;
    const finalAltitude = terrainElevation + pt.clearance;

    state.currentLng = pt.lng;
    state.currentLat = pt.lat;
    state.currentAlt = finalAltitude;

    // Tangentes métricas
    const metersPerDegreeLng = 111320 * Math.cos((pt.lat * Math.PI) / 180);
    const metersPerDegreeLat = 110540;
    const vx = pt.dlng * metersPerDegreeLng;
    const vy = pt.dlat * metersPerDegreeLat;
    const vz = pt.dclearance;

    // Rumbo (heading)
    const targetHeading = Math.atan2(vy, vx);
    let headingDiff = targetHeading - state.currentHeading;
    while (headingDiff > Math.PI) headingDiff -= 2 * Math.PI;
    while (headingDiff < -Math.PI) headingDiff += 2 * Math.PI;
    state.currentHeading += headingDiff * Math.min(1, dt * 4.5);

    // Cabeceo (pitch)
    const horizontalSpeed = Math.hypot(vx, vy);
    const targetPitch = Math.atan2(vz, horizontalSpeed);
    state.smoothedPitch += (targetPitch - state.smoothedPitch) * Math.min(1, dt * 3.0);

    // Alabeo en curvas (bank/roll)
    const turnRate = headingDiff / dt;
    state.turnSmoothed += (turnRate - state.turnSmoothed) * Math.min(1, dt * 3.0);
    const targetBank = Math.max(-0.45, Math.min(0.45, -state.turnSmoothed * 0.8));
    state.smoothedBank += (targetBank - state.smoothedBank) * Math.min(1, dt * 4.0);

    // Aplicar orientación
    flightGroup.rotation.z = state.currentHeading;
    flightGroup.rotation.y = -state.smoothedPitch;
    orientationGroup.rotation.y = state.smoothedBank;

    // Máquina de estados de animación
    state.flapTimer += dt;
    const isSharpTurn = Math.abs(state.turnSmoothed) > 0.08;

    if (isSharpTurn && (actions.turnLeft || actions.turnRight)) {
      if (state.turnSmoothed > 0.08 && actions.turnLeft) {
        crossFadeTo(actions.turnLeft, 0.4);
      } else if (state.turnSmoothed < -0.08 && actions.turnRight) {
        crossFadeTo(actions.turnRight, 0.4);
      }
    } else {
      // 85-90% planeo, 10-15% aleteos (2.2 s aleteo cada 14 s)
      const cycleTime = 14.0;
      const flapDuration = 2.2;
      const timeInCycle = state.flapTimer % cycleTime;

      if (timeInCycle < flapDuration) {
        if (!state.isFlapping) {
          state.isFlapping = true;
          crossFadeTo(actions.flap || actions.glide, 0.35);
        }
      } else {
        if (state.isFlapping) {
          state.isFlapping = false;
          crossFadeTo(actions.glide, 0.45);
        }
      }
    }

    if (mixer) {
      mixer.update(dt);
    }

    // Matriz de proyección y escala sincronizada
    const zoom = map.getZoom();
    const scale = condorScaleForZoom(zoom);

    const mc = maplibregl.MercatorCoordinate.fromLngLat([state.currentLng, state.currentLat], state.currentAlt);
    const meterUnits = mc.meterInMercatorCoordinateUnits();

    transformMatrix
      .makeTranslation(mc.x, mc.y, mc.z)
      .scale(scaleVector.set(meterUnits * scale, -meterUnits * scale, meterUnits * scale));

    targetCamera.projectionMatrix.fromArray(mainMatrix).multiply(transformMatrix);
    state.mvp.copy(targetCamera.projectionMatrix);

    targetRenderer.render(scene, targetCamera);
    map.triggerRepaint();
  }

  /**
   * Liberación de memoria
   */
  function disposeCondorFlight() {
    if (mixer) {
      mixer.stopAllAction();
      mixer.uncacheRoot(condorModel);
    }
    if (condorModel) {
      condorModel.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material?.dispose();
        }
      });
    }
    scene.clear();
    ownRenderer?.dispose();
  }

  const layer = {
    id: 'condor-flight',
    type: 'custom',
    renderingMode: '3d',

    init(map) {
      mapInstance = map;
    },

    onAdd(map, gl) {
      mapInstance = map;
      ownCamera = new THREE.Camera();
      ownRenderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true
      });
      ownRenderer.autoClear = false;
    },

    render(gl, arg) {
      renderCondorFlight(gl, arg);
    },

    onRemove() {
      disposeCondorFlight();
    }
  };

  return Object.assign(layer, {
    createCondorFlight: () => layer,
    renderCondorFlight,
    disposeCondorFlight,

    setEnabled(enabled) {
      state.enabled = !!enabled;
      mapInstance?.triggerRepaint();
    },

    setSpeed(speedMultiplier) {
      state.speed = 0.007 * speedMultiplier;
    },

    getState() {
      return { ...state, isLoaded, loadError };
    },

    pick(pt) {
      if (!state.enabled || !mapInstance) return false;
      const canvas = mapInstance.getCanvas();
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;

      const screenPos = new THREE.Vector4(0, 0, 0, 1).applyMatrix4(state.mvp);
      if (screenPos.w <= 0) return false;

      const sx = (screenPos.x / screenPos.w * 0.5 + 0.5) * W;
      const sy = (1 - (screenPos.y / screenPos.w * 0.5 + 0.5)) * H;
      const dist = Math.hypot(sx - pt.x, sy - pt.y);

      if (dist < 45) {
        onPick?.({
          id: 'condor-andino',
          deptId: 'tumbaya',
          elemento: 'Cóndor Andino (Vultur gryphus)',
          tipo: 'Vuelo patrimonial',
          actividad: 'Conexión Pachamama · Vuelo Jujuy - Purmamarca',
          coordenadas: [state.currentLng.toFixed(4), state.currentLat.toFixed(4)],
          altura: `${Math.round(state.currentAlt)} m`,
          validada: true,
          fuentes: ['Parque Nacional Calilegua / Quebrada de Humahuaca (UNESCO)']
        });
        return true;
      }
      return false;
    }
  });
}
