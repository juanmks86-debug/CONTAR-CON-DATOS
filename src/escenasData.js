// ESCENAS PRODUCTIVAS ILUSTRATIVAS
// - No son establecimientos reales ni representan cantidades de trabajadores, producción o empleo.
// - `anchor: null` => la escena se ubica dentro del departamento (punto interior del polígono).
//   Cuando haya coordenadas verificadas de un establecimiento, poné `anchor: [lng, lat]`
//   y `anchorSource: 'fuente'`; la escena se moverá ahí (debe caer dentro del departamento).
// - Unidades locales en metros (x = este, y = norte), compactas (~±35 m). El mapa las agranda
//   según el zoom para que se lean (escala ilustrativa).
// - Para sumar un departamento: copiar una escena, cambiar deptId/sector/actividad y sus elementos.

export const ESCENAS = [
  {
    id: 'susques-mineria',
    deptId: 'susques',
    sector: 'mineril',
    actividad: 'Extracción y procesamiento',
    anchor: null,
    anchorSource: 'ilustrativa',
    planta: { x: 0, y: 6, w: 16, d: 10, h: 6, label: 'Planta de procesamiento' },
    chimenea: { x: 5, y: 6, h: 12 },
    tanques: [{ x: -12, y: 10, r: 2.6, h: 5 }, { x: -12, y: 3, r: 2.6, h: 5 }, { x: -12, y: -4, r: 2.6, h: 5 }],
    piletas: [
      { x: 22, y: -14, w: 20, d: 12, c: '#3fb8a8' },
      { x: 22, y: 0, w: 20, d: 12, c: '#59c9b5' },
      { x: -2, y: -22, w: 18, d: 10, c: '#2f9e94' }
    ],
    caminos: [[[-30, -32], [-30, 28], [38, 28], [38, -32], [-30, -32]]],
    peatonal: [[-8, -6], [8, -6], [8, -12], [-8, -12], [-8, -6]],
    vehiculos: [
      { kind: 'Camión minero', path: 0, speed: 6, phase: 0 },
      { kind: 'Camión minero', path: 0, speed: 6, phase: 128 }
    ],
    personas: [
      { role: 'Trabajador minero', mode: 'work', x: -6, y: -3, h: 1.2 },
      { role: 'Trabajador minero', mode: 'work', x: -4, y: -2.2, h: 1.0 },
      { role: 'Operario industrial', mode: 'work', x: -9, y: 8, h: 1.57 },
      { role: 'Operario industrial', mode: 'work', x: 6, y: 0, h: 0 },
      { role: 'Trabajador minero', mode: 'work', x: 18, y: -6, h: 0.8 },
      { role: 'Trabajador minero', mode: 'walk', phase: 0, speed: 1.2 },
      { role: 'Operario industrial', mode: 'walk', phase: 15, speed: 1.2 },
      { role: 'Trabajador minero', mode: 'walk', phase: 30, speed: 1.2 },
      // sólo en nivel 4 (vista detallada)
      { role: 'Trabajador minero', mode: 'work', x: 30, y: -8, h: -1.57, minLevel: 4 },
      { role: 'Operario industrial', mode: 'work', x: -9, y: 1, h: 1.57, minLevel: 4 },
      { role: 'Trabajador minero', mode: 'walk', phase: 8, speed: 1.2, minLevel: 4 }
    ]
  }
];

export const COLORES_ROL = {
  'Trabajador minero': { chaleco: '#ff7a1a', casco: '#ffd23f' },
  'Operario industrial': { chaleco: '#3aa0ff', casco: '#ffffff' }
};

// Modelos GLB/GLTF que faltan (el piloto usa figuras procedurales como reemplazo).
// Ubicación prevista: public/models/<archivo>. Animaciones esperadas: Walk, Work.
export const MODELOS_REQUERIDOS = [
  { rol: 'Trabajador minero', archivo: 'trabajador-minero.glb', animaciones: ['Walk', 'Work'] },
  { rol: 'Operario industrial', archivo: 'operario-industrial.glb', animaciones: ['Walk', 'Work'] },
  { rol: 'Agricultor', archivo: 'agricultor.glb', animaciones: ['Walk', 'Work'] },
  { rol: 'Cosechador', archivo: 'cosechador.glb', animaciones: ['Walk', 'Work'] },
  { rol: 'Técnico en energía solar', archivo: 'tecnico-solar.glb', animaciones: ['Walk', 'Work'] },
  { rol: 'Guía turístico', archivo: 'guia-turistico.glb', animaciones: ['Walk', 'Idle'] },
  { rol: 'Comerciante', archivo: 'comerciante.glb', animaciones: ['Walk', 'Idle'] },
  { rol: 'Personal hotelero', archivo: 'personal-hotelero.glb', animaciones: ['Walk', 'Work'] },
  { rol: 'Camión minero', archivo: 'camion-minero.glb', animaciones: [] },
  { rol: 'Tractor', archivo: 'tractor.glb', animaciones: [] }
];
