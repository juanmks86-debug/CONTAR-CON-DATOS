
import * as THREE from 'three';
import maplibregl from 'maplibre-gl';

export const CONDOR_COORDINATE = {
  lng: -65.2934,
  lat: -24.1928
};

const PATH = [
  [CONDOR_COORDINATE.lng, CONDOR_COORDINATE.lat, 0],
  [CONDOR_COORDINATE.lng + 0.014, CONDOR_COORDINATE.lat + 0.006, 150],
  [CONDOR_COORDINATE.lng + 0.010, CONDOR_COORDINATE.lat - 0.012, 50],
  [CONDOR_COORDINATE.lng - 0.014, CONDOR_COORDINATE.lat - 0.009, -80],
  [CONDOR_COORDINATE.lng - 0.018, CONDOR_COORDINATE.lat + 0.007, 120]
];

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);

// --------------------------------------------------
// MATERIALES
// --------------------------------------------------

function createMaterials() {
  return {
    body: new THREE.MeshStandardMaterial({
      color: 0x171d20,
      roughness: 0.91,
      flatShading: false
    }),

    wing: new THREE.MeshStandardMaterial({
      color: 0x101619,
      roughness: 0.88,
      side: THREE.DoubleSide
    }),

    feather: new THREE.MeshStandardMaterial({
      color: 0x242c30,
      roughness: 0.95,
      side: THREE.DoubleSide
    }),

    featherLight: new THREE.MeshStandardMaterial({
      color: 0x343b3d,
      roughness: 0.95,
      side: THREE.DoubleSide
    }),

    white: new THREE.MeshStandardMaterial({
      color: 0xe5e0d1,
      roughness: 0.95
    }),

    skin: new THREE.MeshStandardMaterial({
      color: 0x9b4038,
      roughness: 0.8
    }),

    beak: new THREE.MeshStandardMaterial({
      color: 0x202426,
      roughness: 0.48
    }),

    eye: new THREE.MeshStandardMaterial({
      color: 0xd9a34c,
      roughness: 0.35
    }),

    pupil: new THREE.MeshBasicMaterial({
      color: 0x080909
    })
  };
}

// --------------------------------------------------
// GEOMETRÍA DE PLUMAS
// Eje longitudinal local: Z
// --------------------------------------------------

function createFeather(length, width, material) {
  const positions = [
    -width * 0.5, 0, 0,
     width * 0.5, 0, 0,
    -width * 0.28, 0, length * 0.72,
     width * 0.28, 0, length * 0.72,
     0, 0, length
  ];

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );

  geometry.setIndex([
    0, 1, 2,
    1, 3, 2,
    2, 3, 4
  ]);

  geometry.computeVertexNormals();

  return new THREE.Mesh(geometry, material);
}

// --------------------------------------------------
// ALAS ANATÓMICAS CON PLUMAS INDIVIDUALES
// --------------------------------------------------

function createWing(side, materials) {
  const wing = new THREE.Group();

  // Ala principal: superficie de sustentación
  const positions = [
     0.32,  0.04, 0,
    -0.38,  0.02, 0,
     0.12,  0.00, 1.65,
    -0.72, -0.03, 2.25
  ];

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );

  geometry.setIndex([
    0, 1, 2,
    1, 3, 2
  ]);

  geometry.computeVertexNormals();

  wing.add(new THREE.Mesh(geometry, materials.wing));

  // Plumas secundarias
  for (let i = 0; i < 12; i++) {
    const t = i / 11;

    const feather = createFeather(
      0.78 - t * 0.15,
      0.17,
      i % 3 === 0 ? materials.featherLight : materials.feather
    );

    feather.position.set(
      -0.38 - t * 0.24,
      -0.015,
      0.12 + t * 1.45
    );

    feather.rotation.y = -0.12;
    wing.add(feather);
  }

  // Plumas primarias: largas y separadas en las puntas
  for (let i = 0; i < 9; i++) {
    const t = i / 8;

    const feather = createFeather(
      0.85 + Math.sin(t * Math.PI) * 0.42,
      0.16,
      i % 2 === 0 ? materials.featherLight : materials.feather
    );

    feather.position.set(
      -0.58 - t * 0.18,
      -0.035,
      1.15 + t * 0.93
    );

    feather.rotation.y = -0.18 - t * 0.12;
    wing.add(feather);
  }

  wing.scale.z = side;
  wing.userData.side = side;

  return wing;
}

// --------------------------------------------------
// CUERPO DEL CÓNDOR
// Eje X: dirección de vuelo
// Eje Y: vertical
// Eje Z: envergadura
// --------------------------------------------------

function buildCondor() {
  const root = new THREE.Group();
  const materials = createMaterials();

  // Cuerpo principal
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.65, 24, 16),
    materials.body
  );

  body.scale.set(1.55, 0.76, 0.83);
  body.position.set(-0.12, 0, 0);
  root.add(body);

  // Pecho
  const chest = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 20, 14),
    materials.body
  );

  chest.scale.set(0.9, 0.85, 0.85);
  chest.position.set(0.48, -0.04, 0);
  root.add(chest);

  // Cuello
  const neck = new THREE.Mesh(
    new THREE.SphereGeometry(0.31, 18, 14),
    materials.skin
  );

  neck.scale.set(0.72, 1.35, 0.75);
  neck.position.set(0.92, 0.08, 0);
  root.add(neck);

  // Cabeza
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 20, 16),
    materials.skin
  );

  head.scale.set(1.12, 1.05, 0.95);
  head.position.set(1.12, 0.35, 0);
  root.add(head);

  // Pico curvado estilizado
  const upperBeak = new THREE.Mesh(
    new THREE.ConeGeometry(0.115, 0.42, 12),
    materials.beak
  );

  upperBeak.rotation.z = -Math.PI / 2;
  upperBeak.position.set(1.43, 0.29, 0);
  root.add(upperBeak);

  const lowerBeak = new THREE.Mesh(
    new THREE.ConeGeometry(0.075, 0.28, 10),
    materials.beak
  );

  lowerBeak.rotation.z = -Math.PI / 2;
  lowerBeak.position.set(1.40, 0.20, 0);
  root.add(lowerBeak);

  // Collar blanco característico
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.30, 0.095, 10, 28),
    materials.white
  );

  collar.rotation.y = Math.PI / 2;
  collar.position.set(0.86, 0.09, 0);
  root.add(collar);

  // Plumas del collar
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;

    const feather = createFeather(
      0.23,
      0.075,
      materials.white
    );

    feather.position.set(
      0.83,
      0.10 + Math.cos(angle) * 0.27,
      Math.sin(angle) * 0.27
    );

    feather.rotation.x = angle;
    feather.rotation.y = Math.PI / 2;

    root.add(feather);
  }

  // Cola: abanico de plumas
  const tail = new THREE.Group();
  tail.position.set(-1.10, 0, 0);

  for (let i = 0; i < 9; i++) {
    const t = (i - 4) / 4;

    const feather = createFeather(
      0.85,
      0.16,
      i % 2 === 0 ? materials.featherLight : materials.body
    );

    feather.position.set(
      0,
      t * 0.07,
      0
    );

    feather.rotation.y = Math.PI / 2;
    feather.rotation.x = t * 0.15;

    tail.add(feather);
  }

  root.add(tail);

  // Alas
  const leftWing = createWing(1, materials);
  const rightWing = createWing(-1, materials);

  leftWing.position.set(-0.12, 0.12, 0.30);
  rightWing.position.set(-0.12, 0.12, -0.30);

  root.add(leftWing, rightWing);

  // Ojos a ambos lados de la cabeza
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 10),
      materials.eye
    );

    eye.position.set(1.22, 0.40, side * 0.19);
    root.add(eye);

    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 10, 8),
      materials.pupil
    );

    pupil.position.set(1.24, 0.405, side * 0.226);
    root.add(pupil);
  }

  // Patas retraídas durante el vuelo
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.035, 0.38, 8),
      materials.skin
    );

    leg.position.set(-0.30, -0.55, side * 0.20);
    leg.rotation.z = -0.65;
    root.add(leg);
  }

  root.userData.wings = [leftWing, rightWing];
  root.userData.tail = tail;
  root.userData.phase = 0.7;
  root.userData.materials = materials;

  return root;
}

// --------------------------------------------------
// TRAYECTORIA
// --------------------------------------------------

function positionAt(time) {
  const scaled = ((time * 0.000018) % 1) * PATH.length;

  const i = Math.floor(scaled) % PATH.length;
  const j = (i + 1) % PATH.length;

  const t = smooth(scaled - Math.floor(scaled));

  const a = PATH[i];
  const b = PATH[j];

  return {
    lng: lerp(a[0], b[0], t),
    lat: lerp(a[1], b[1], t),
    extra: lerp(a[2], b[2], t) + Math.sin(time * 0.0012) * 120,
    heading: Math.atan2(b[1] - a[1], b[0] - a[0])
  };
}

// --------------------------------------------------
// ESCENA
// --------------------------------------------------

export function createCondorFlight() {
  const scene = new THREE.Scene();

  scene.add(
    new THREE.HemisphereLight(0xbad9e5, 0x24201b, 2.1)
  );

  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(-20, -30, 80);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xd5e8ff, 1.0);
  fill.position.set(30, 20, -40);
  scene.add(fill);

  const condor = buildCondor();
  scene.add(condor);

  return {
    scene,
    condor,
    lastTime: 0
  };
}

// --------------------------------------------------
// ANIMACIÓN Y POSICIONAMIENTO MAPLIBRE
// --------------------------------------------------

export function renderCondorFlight(flight, map, camera, matrix, now) {
  if (!flight || !map) return;

  const p = positionAt(now);

  const terrain =
    map.queryTerrainElevation?.([p.lng, p.lat]) ?? 0;

  const mc = maplibregl.MercatorCoordinate.fromLngLat(
    [p.lng, p.lat],
    terrain + 3200 + p.extra
  );

  const scale = mc.meterInMercatorCoordinateUnits() * 2700;

  const transform = new THREE.Matrix4()
    .makeTranslation(mc.x, mc.y, mc.z)
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
    .multiply(new THREE.Matrix4().makeRotationZ(-p.heading))
    .multiply(new THREE.Matrix4().makeScale(scale, -scale, scale));

  camera.projectionMatrix.fromArray(matrix).multiply(transform);

  // Ciclo de vuelo: aleteo + planeo
  const cycle = now * 0.0025 + flight.condor.userData.phase;

  const flap = Math.sin(cycle);

  // Mayor amplitud de aleteo
  const flapAmount = 0.43;

  flight.condor.userData.wings[0].rotation.x =
    flap * flapAmount;

  flight.condor.userData.wings[1].rotation.x =
    -flap * flapAmount;

  // Ligera oscilación del cuerpo
  flight.condor.rotation.z =
    Math.sin(now * 0.0011) * 0.025;

  // Inclinación suave de las alas durante los giros
  flight.condor.rotation.x =
    Math.sin(now * 0.00045) * 0.045;

  // Movimiento de cola
  flight.condor.userData.tail.rotation.y =
    Math.sin(now * 0.0015) * 0.035;

  flight.lastTime = now;
}

// --------------------------------------------------
// LIBERACIÓN DE RECURSOS
// --------------------------------------------------

export function disposeCondorFlight(flight) {
  if (!flight) return;

  const geometries = new Set();
  const materials = new Set();

  flight.scene.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);

    if (Array.isArray(object.material)) {
      object.material.forEach(material => materials.add(material));
    } else if (object.material) {
      materials.add(object.material);
    }
  });

  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}
