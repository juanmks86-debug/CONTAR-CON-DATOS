// PLANTILLAS DE ESCENAS ILUSTRATIVAS
// Unidades locales en metros (x = este, y = norte), compactas (~±35 m). El mapa las agranda según el
// zoom. No representan establecimientos reales ni cantidades de trabajadores, producción o empleo.

export const ROLES = {
  'Trabajador minero': { chaleco: '#ff7a1a', casco: '#ffd23f' },
  'Operario industrial': { chaleco: '#3aa0ff', casco: '#ffffff' },
  'Agricultor': { chaleco: '#7a9e3a', casco: '#d9c27a' },
  'Cosechador': { chaleco: '#c7d94a', casco: '#e8d9a0' },
  'Productor ganadero': { chaleco: '#9b7b4a', casco: '#6e5530' },
  'Técnico en energía solar': { chaleco: '#ffd23f', casco: '#ffffff' },
  'Guía turístico': { chaleco: '#e0457b', casco: '#e0457b' },
  'Turista': { chaleco: '#f08a4b', casco: '#f5d0a9' },
  'Comerciante': { chaleco: '#8a63d2', casco: '#6b4aa8' },
  'Personal hotelero': { chaleco: '#2f9e94', casco: '#1f6f68' },
  'Personal administrativo': { chaleco: '#5b7fb5', casco: '#3b4a63' }
};

// parts: cajas [ancho, largo, alto] centradas en `at`; wheels: radio, ancho y posiciones [x, y]
export const VEHICLES = {
  camion: { label: 'Camión minero', parts: [{ p: [2.6, 7.2, 0.6], at: [0, 0, 0.9], c: '#3b4350' }, { p: [2.8, 4.4, 2.2], at: [0, -1.2, 2.3], c: '#e0a526' }, { p: [2.5, 2.2, 2.4], at: [0, 2.7, 2.1], c: '#f2f2f2' }],
    wheels: { r: 0.65, w: 0.45, pos: [[-1.3, 2.7], [1.3, 2.7], [-1.3, -0.8], [1.3, -0.8], [-1.3, -2.6], [1.3, -2.6]] } },
  camionCarga: { label: 'Camión de carga', parts: [{ p: [2.6, 7.2, 0.6], at: [0, 0, 0.9], c: '#3b4350' }, { p: [2.7, 4.6, 2.4], at: [0, -1.1, 2.4], c: '#5f9e4b' }, { p: [2.5, 2.2, 2.4], at: [0, 2.7, 2.1], c: '#f2f2f2' }],
    wheels: { r: 0.65, w: 0.45, pos: [[-1.3, 2.7], [1.3, 2.7], [-1.3, -1.2], [1.3, -1.2]] } },
  tractor: { label: 'Tractor', parts: [{ p: [1.6, 3, 1], at: [0, 0, 1.2], c: '#2f8f3a' }, { p: [1.5, 1.4, 1.6], at: [0, -0.3, 2.4], c: '#d9d9d9' }],
    wheels: { r: 0.7, w: 0.5, pos: [[-1, 1.1], [1, 1.1], [-1, -1.1], [1, -1.1]] } },
  bus: { label: 'Vehículo de transporte turístico', parts: [{ p: [2.6, 9, 2.8], at: [0, 0, 1.9], c: '#f5f5f5' }, { p: [2.62, 9.02, 0.9], at: [0, 0, 1.2], c: '#e0457b' }],
    wheels: { r: 0.55, w: 0.4, pos: [[-1.3, 3], [1.3, 3], [-1.3, -3], [1.3, -3]] } },
  auto: { label: 'Vehículo liviano', parts: [{ p: [1.8, 4, 1], at: [0, 0, 0.9], c: '#5b7fb5' }, { p: [1.6, 2, 0.8], at: [0, -0.2, 1.8], c: '#dfe9f5' }],
    wheels: { r: 0.35, w: 0.25, pos: [[-0.9, 1.3], [0.9, 1.3], [-0.9, -1.3], [0.9, -1.3]] } }
};

const box = (x, y, w, d, h, c, label) => ({ shape: 'box', x, y, w, d, h, c, label });
const cyl = (x, y, r, h, c, label, extra = {}) => ({ shape: 'cyl', x, y, w: r, d: r, h, c, label, ...extra });
const chim = (x, y, r, h) => cyl(x, y, r, h, '#c9ced6', 'Chimenea', { top: 0.9 / 1.1, pick: false }); // cono: radio superior 0,9 / inferior 1,1 (como el piloto)
const flat = (x, y, w, d, c, label) => box(x, y, w, d, 0.3, c, label);
const loop = [[-32, -32], [-32, 32], [32, 32], [32, -32], [-32, -32]];
const walk = [[-8, -6], [8, -6], [8, -12], [-8, -12], [-8, -6]];
const V = (type, phase, speed = 6) => ({ type, path: 0, speed, phase });
const work = (role, x, y, h, minLevel) => ({ role, mode: 'work', x, y, h, minLevel });
const stroll = (role, phase, minLevel) => ({ role, mode: 'walk', phase, speed: 1.2, minLevel });
const base = { caminos: [loop], peatonal: walk };
// Circuito de camiones del piloto de Susques (se conserva idéntico)
const loopMineria = [[-30, -32], [-30, 28], [38, 28], [38, -32], [-30, -32]];

export const TEMPLATES = {
  mineria: () => ({ ...base, caminos: [loopMineria],
    piezas: [box(0, 6, 16, 10, 6, '#8d98a6', 'Planta de procesamiento'), chim(5, 6, 1.1, 12),
      ...[10, 3, -4].map((y) => cyl(-12, y, 2.6, 5, '#d7dde4', 'Tanque de almacenamiento')),
      flat(22, -14, 20, 12, '#3fb8a8', 'Piletas de evaporación (representación de salar)'), flat(22, 0, 20, 12, '#59c9b5', 'Piletas de evaporación (representación de salar)'),
      flat(-2, -22, 18, 10, '#2f9e94', 'Piletas de evaporación (representación de salar)')],
    vehiculos: [V('camion', 0), V('camion', 128)],
    personas: [work('Trabajador minero', -6, -3, 1.2), work('Trabajador minero', -4, -2.2, 1), work('Operario industrial', -9, 8, 1.57), work('Operario industrial', 6, 0, 0),
      work('Trabajador minero', 18, -6, 0.8), stroll('Trabajador minero', 0), stroll('Operario industrial', 15), stroll('Trabajador minero', 30),
      work('Trabajador minero', 30, -8, -1.57, 4), work('Operario industrial', -9, 1, 1.57, 4), stroll('Trabajador minero', 8, 4)] }),

  solar: () => ({ ...base,
    piezas: [...[0, 1, 2, 3].flatMap((i) => [0, 1, 2].map((j) => flat(-18 + i * 12, -22 + j * 10, 9, 4, '#1f3b73', 'Paneles solares'))),
      box(20, 14, 8, 6, 4, '#9aa5b1', 'Sala de inversores')],
    vehiculos: [V('auto', 0, 5)],
    personas: [work('Técnico en energía solar', -14, -16, 0.5), work('Técnico en energía solar', 6, -6, 2.4), work('Técnico en energía solar', 18, 10, 0),
      stroll('Técnico en energía solar', 5), work('Técnico en energía solar', -2, -26, 1.5, 4), stroll('Técnico en energía solar', 25, 4)] }),

  azucarera: () => ({ ...base,
    piezas: [box(0, 12, 26, 14, 8, '#a38b6b', 'Planta industrial azucarera'), cyl(-8, 12, 1.2, 16, '#c9ced6', 'Chimenea', { pick: false }), cyl(8, 12, 1.2, 14, '#c9ced6', 'Chimenea', { pick: false }),
      flat(-17, -16, 26, 16, '#7fb23c', 'Cañaveral (representación)'), flat(17, -16, 26, 16, '#6fa334', 'Cañaveral (representación)'), flat(0, -30, 40, 8, '#86b845', 'Cañaveral (representación)')],
    vehiculos: [V('tractor', 0, 4), V('tractor', 128, 4), V('camionCarga', 64, 5)],
    personas: [work('Cosechador', -17, -16, 0.5), work('Cosechador', 17, -16, 2), work('Cosechador', 0, -28, 1), work('Operario industrial', -12, 4, 0), work('Operario industrial', 10, 4, 0),
      stroll('Agricultor', 0), stroll('Agricultor', 20), work('Cosechador', 8, -22, 1.2, 4), stroll('Operario industrial', 10, 4)] }),

  agricultura: ({ cultivo = 'cultivos', c1 = '#5fae4a', c2 = '#7bbf5c' } = {}) => ({ ...base,
    piezas: [flat(-16, -14, 24, 16, c1, `Cultivos de ${cultivo} (representación)`), flat(16, -14, 24, 16, c2, `Cultivos de ${cultivo} (representación)`),
      flat(-16, 12, 24, 14, c2, `Cultivos de ${cultivo} (representación)`), box(18, 14, 14, 8, 5, '#b7a58a', 'Galpón')],
    vehiculos: [V('tractor', 0, 4), V('auto', 128, 5)],
    personas: [work('Agricultor', -16, -14, 0.5), work('Agricultor', 16, -14, 2), work('Cosechador', -16, 12, 1), work('Cosechador', 8, 12, 0.7),
      stroll('Agricultor', 0), work('Cosechador', 4, -20, 1, 4), stroll('Cosechador', 22, 4)] }),

  ganaderia: () => ({ ...base,
    piezas: [flat(-16, -12, 18, 14, '#a68a64', 'Corral (representación)'), flat(8, -12, 18, 14, '#b39770', 'Corral (representación)'), flat(-14, 12, 16, 12, '#a68a64', 'Corral (representación)'),
      box(14, 14, 10, 6, 4, '#b9a98d', 'Galpón')],
    vehiculos: [V('auto', 0, 4)],
    personas: [work('Productor ganadero', -16, -12, 0.6), work('Productor ganadero', 8, -12, 2.2), stroll('Productor ganadero', 0), work('Productor ganadero', -14, 12, 1.2, 4), stroll('Productor ganadero', 20, 4)] }),

  turismo: () => ({ ...base,
    piezas: [box(0, 10, 18, 10, 9, '#e8dcc6', 'Establecimiento hotelero'), ...[-24, -14, 16, 26].map((x) => box(x, 18, 7, 6, 4, '#d98c5f', 'Construcción tradicional')),
      flat(0, -12, 24, 14, '#c9b98a', 'Espacio turístico (plaza)')],
    vehiculos: [V('bus', 0, 5), V('auto', 128, 5)],
    personas: [stroll('Guía turístico', 0), stroll('Turista', 6), stroll('Turista', 12), stroll('Turista', 20), work('Personal hotelero', -3, 3, 0), work('Personal hotelero', 4, 3, 0),
      work('Comerciante', 12, -10, 3.1), stroll('Guía turístico', 28, 4), stroll('Turista', 34, 4)] }),

  comercio: () => ({ ...base,
    piezas: [box(-16, 16, 12, 9, 14, '#8e99a8', 'Edificio de servicios'), box(0, 18, 10, 9, 9, '#a6aebb', 'Edificio de servicios'), box(14, 16, 12, 9, 16, '#7d8897', 'Edificio de servicios'),
      box(-20, 2, 9, 8, 7, '#b4bcc8', 'Local comercial'), box(20, 2, 9, 8, 7, '#b4bcc8', 'Local comercial'), flat(0, -10, 30, 12, '#d0d4da', 'Espacio público')],
    vehiculos: [V('auto', 0, 5), V('auto', 85, 5), V('auto', 170, 5), V('bus', 40, 4)],
    personas: [work('Comerciante', -20, -3, 3.1), work('Comerciante', 20, -3, 3.1), stroll('Personal administrativo', 0), stroll('Personal administrativo', 14), stroll('Personal administrativo', 28),
      stroll('Personal administrativo', 7, 4), work('Comerciante', 0, 8, 3.1, 4)] }),

  metalurgica: () => ({ ...base,
    piezas: [box(0, 10, 30, 16, 9, '#7a828d', 'Nave industrial'), cyl(-10, 10, 1.4, 18, '#c9ced6', 'Chimenea', { pick: false }), cyl(10, 10, 1.4, 16, '#c9ced6', 'Chimenea', { pick: false }),
      cyl(-22, -12, 3, 7, '#d7dde4', 'Tanque'), cyl(-22, -2, 3, 7, '#d7dde4', 'Tanque'), flat(10, -16, 30, 14, '#9ca3ad', 'Patio de acopio')],
    vehiculos: [V('camion', 0, 5), V('camionCarga', 128, 5)],
    personas: [work('Operario industrial', -6, -1, 0), work('Operario industrial', 6, -1, 0), work('Operario industrial', 10, -16, 1.2), stroll('Operario industrial', 0), stroll('Operario industrial', 22),
      work('Operario industrial', -18, -7, 1.57, 4), stroll('Operario industrial', 10, 4)] })
};

// Modelos GLB/GLTF que faltan (el piloto usa figuras procedurales). Ubicación prevista: public/models/
export const MODELOS_REQUERIDOS = [
  ...Object.keys(ROLES).map((rol) => ({ rol, archivo: `${rol.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]+/g, '-')}.glb`, animaciones: ['Walk', 'Work'] })),
  ...Object.values(VEHICLES).map((v) => ({ rol: v.label, archivo: `${v.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]+/g, '-')}.glb`, animaciones: [] }))
];
