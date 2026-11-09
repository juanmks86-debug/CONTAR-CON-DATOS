// CONFIGURACIÓN DE LOS 16 DEPARTAMENTOS (escenas ilustrativas)
//
// RIGOR: las actividades salen de los textos del propio proyecto (data.js) y de los ejemplos de la consigna.
// NINGUNA está validada con fuente oficial todavía (`validada: false`, `fuentes: []`). Las escenas son
// representaciones ilustrativas: no son establecimientos ni indican cantidades de trabajadores, producción o empleo.
// Cuando validés una actividad: completá `fuentes` y poné `validada: true`.
// Cuando tengas coordenadas verificadas: `anchor: [lng, lat]` + `anchorSource: 'fuente'` (debe caer dentro del departamento).
// `zoom: [instalaciones, personas, detalle]` sobrescribe los niveles por defecto (8, 10, 12).
// Los indicadores económicos del panel salen de src/data.js (mismo id de departamento).

import { TEMPLATES } from './activitiesConfig';

const sector = (tipo) => ({ mineria: 'mineril', solar: 'mineril', azucarera: 'agro', agricultura: 'agro', ganaderia: 'agro', turismo: 'turismo', comercio: 'servicios', metalurgica: 'servicios' }[tipo]);
// `piloto: true` => escena heredada del piloto original (Susques, minería), activa pese a no estar validada.
// Regla: ninguna otra actividad se activa hasta tener `validada: true` y al menos una fuente en `fuentes`.
const a = (tipo, label, params, extra = {}) => ({ tipo, label, params, sector: sector(tipo), validada: false, fuentes: [], piloto: false, ...extra });
const activa = (act, fuentesDepto = []) => act.piloto || (act.validada && [...fuentesDepto, ...act.fuentes].length > 0);

export const DEPARTMENTS_CONFIG = [
  { id: 'susques', nombre: 'Susques', actividades: [a('mineria', 'Minería de litio: extracción y procesamiento', undefined, { piloto: true }), a('solar', 'Energía solar')] },
  { id: 'cochinoca', nombre: 'Cochinoca', actividades: [a('mineria', 'Minería de litio (salares)'), a('comercio', 'Comercio y logística')] },
  { id: 'rinconada', nombre: 'Rinconada', actividades: [a('mineria', 'Minería polimetálica y proyectos de litio')] },
  { id: 'santa_catalina', nombre: 'Santa Catalina', actividades: [a('ganaderia', 'Ganadería camélida')] },
  { id: 'yavi', nombre: 'Yavi', actividades: [a('ganaderia', 'Actividad agropecuaria'), a('comercio', 'Comercio')] },
  { id: 'humahuaca', nombre: 'Humahuaca', actividades: [a('turismo', 'Turismo cultural y gastronomía'), a('agricultura', 'Agricultura de altura', { cultivo: 'altura', c1: '#8aa14a', c2: '#a6b862' })] },
  { id: 'tilcara', nombre: 'Tilcara', actividades: [a('turismo', 'Turismo y hotelería'), a('comercio', 'Gastronomía y servicios')] },
  { id: 'tumbaya', nombre: 'Tumbaya', actividades: [a('turismo', 'Turismo y servicios')] },
  { id: 'valle_grande', nombre: 'Valle Grande', actividades: [a('turismo', 'Ecoturismo'), a('ganaderia', 'Ganadería de valles')] },
  { id: 'ledesma', nombre: 'Ledesma', actividades: [a('azucarera', 'Agroindustria azucarera e industria'), a('agricultura', 'Citricultura', { cultivo: 'cítricos', c1: '#4f9f45', c2: '#6cb35a' })] },
  { id: 'san_pedro', nombre: 'San Pedro', actividades: [a('azucarera', 'Agroindustria'), a('agricultura', 'Horticultura y frutales', { cultivo: 'hortalizas y frutales' })] },
  { id: 'santa_barbara', nombre: 'Santa Bárbara', actividades: [a('agricultura', 'Granos y citricultura', { cultivo: 'granos y cítricos', c1: '#b9a64a', c2: '#cdb95e' }), a('ganaderia', 'Ganadería')] },
  { id: 'el_carmen', nombre: 'El Carmen', actividades: [a('agricultura', 'Producción tabacalera', { cultivo: 'tabaco', c1: '#6b8e23', c2: '#7da02e' })] },
  { id: 'palpala', nombre: 'Palpalá', actividades: [a('metalurgica', 'Industria y metalurgia')] },
  { id: 'san_antonio', nombre: 'San Antonio', actividades: [a('agricultura', 'Floricultura', { cultivo: 'flores', c1: '#d86fa8', c2: '#e58fbd' })] },
  { id: 'belgrano', nombre: 'Doctor Manuel Belgrano', actividades: [a('comercio', 'Comercio, administración y servicios')] }
].map((d) => ({ zoom: null, anchor: null, anchorSource: 'ilustrativa', fuentes: [], ...d }));

// Definiciones de escena listas para el motor (una por actividad). Sólo las `activa` se dibujan.
export const SCENE_DEFS = DEPARTMENTS_CONFIG.flatMap((d) =>
  d.actividades.map((act, index) => ({
    id: `${d.id}-${act.tipo}-${index}`, deptId: d.id, sector: act.sector, actividad: act.label,
    validada: act.validada, activa: activa(act, d.fuentes), fuentes: [...d.fuentes, ...act.fuentes], zoom: d.zoom, anchor: d.anchor, index, count: d.actividades.length,
    ...TEMPLATES[act.tipo](act.params)
  }))
);
