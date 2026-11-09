// DATOS DE LA HISTORIA: capítulos como configuración + indicadores calculados desde los datos existentes del proyecto.
// - Nada se inventa: si falta un dato, el indicador sale con value = null ("Información no disponible").
// - Cada indicador declara ámbito (departamental / provincial), unidad, año, condición, fuente y variación.
// - Los valores de src/data.js son ILUSTRATIVOS y sin fuente verificada (ver src/data/indicators.js).
import { JUJUY_DEPARTMENTS_DATA as D } from '../data.js';
import { INDICADORES, indicadorProvincial, conciliacion, ANIO_EN_CURSO } from '../data/indicators.js';
import { CAUCHARI } from '../config/places.js';

export const SECTOR_COLOR = { mineril: '#a855f7', agro: '#10b981', turismo: '#f59e0b', servicios: '#0ea5e9' };
export const SECTOR_LABEL = { mineril: 'Minería y litio', agro: 'Agroindustria', turismo: 'Turismo y servicios', servicios: 'Servicios' };

const ids = (sector) => D.filter((d) => d.sector === sector).map((d) => d.id);
// Grupos de departamentos por actividad predominante (clasificación del proyecto, src/data.js)
export const GRUPOS = {
  puna: ids('mineril'),
  agro: ids('agro'),
  turismo: [...ids('turismo'), 'palpala'], // decisión del proyecto: Palpalá sí, Belgrano no
  todos: D.map((d) => d.id)
};
const nombre = (id) => D.find((d) => d.id === id).nombre ?? D.find((d) => d.id === id).name;

// ---------- cálculo ----------
const serie = (id, ind) => INDICADORES.departamentos[id].find((i) => i.id === ind).puntos;
const ultimoValor = (id, ind) => serie(id, ind).at(-1).valor;
export const sumaSerie = (lista, ind) => serie(lista[0], ind).map((p) => ({ anio: p.anio, valor: lista.reduce((t, id) => t + serie(id, ind).find((q) => q.anio === p.anio).valor, 0), parcial: p.anio === ANIO_EN_CURSO }));
export const sumaUltimo = (lista, ind) => lista.reduce((t, id) => t + ultimoValor(id, ind), 0);
export const variacion = (pts) => (pts.length > 1 && pts[0].valor > 0 ? { pct: (pts.at(-1).valor / pts[0].valor - 1) * 100, desde: pts[0].anio, hasta: pts.at(-1).anio, parcial: !!pts.at(-1).parcial } : null);
const pt = (p) => ({ x: p.anio, y: p.valor, partial: p.parcial ?? p.anio === ANIO_EN_CURSO });

const kpi = (o) => ({ validated: false, source: null, year: ANIO_EN_CURSO, condition: 'parcial', ...o });
const noDisp = (label, reason, scope = 'Departamental') => kpi({ label, value: null, unit: '', scale: scope.toLowerCase(), scopeText: scope, reason, year: null, condition: null });
const ambitoSuma = (lista, etiqueta) => `Departamental · suma de ${lista.length} departamentos (${etiqueta})`;

const empleoKpi = (lista, etiqueta) => { const s = sumaSerie(lista, 'empleo_registrado'); return kpi({ label: 'Empleo registrado', value: s.at(-1).valor, unit: 'puestos de trabajo', scale: 'departamental', scopeText: ambitoSuma(lista, etiqueta), delta: variacion(s) }); };
const pymesKpi = (lista, etiqueta) => kpi({ label: 'Red de PyMEs locales', value: sumaUltimo(lista, 'pymes'), unit: 'empresas', scale: 'departamental', scopeText: ambitoSuma(lista, etiqueta) });
const exportKpi = (lista, etiqueta) => kpi({ label: 'Exportaciones estimadas', value: sumaUltimo(lista, 'exportaciones'), unit: 'millones de USD', scale: 'departamental', scopeText: ambitoSuma(lista, etiqueta) });
const produccionKpi = (lista, etiqueta, ind, label, unit) => { const s = sumaSerie(lista, ind); return kpi({ label, value: s.at(-1).valor, unit, scale: 'departamental', scopeText: ambitoSuma(lista, etiqueta), delta: variacion(s) }); };
const lineaDept = (lista, ind, colores) => lista.map((id, k) => ({ label: nombre(id), color: colores[k % colores.length], points: serie(id, ind).map(pt) }));
const barrasDept = (lista, ind, color) => lista.map((id) => ({ label: nombre(id), value: ultimoValor(id, ind), color: color || SECTOR_COLOR[D.find((d) => d.id === id).sector] })).sort((a, b) => b.value - a.value);
const VERDES = ['#10b981', '#34d399', '#6ee7b7', '#059669', '#a7f3d0'], AMARILLOS = ['#f59e0b', '#fbbf24', '#fcd34d', '#d97706', '#0ea5e9'];

// ---------- bloques por capítulo (indicadores y gráficos) ----------
export const buildBlocks = (chapterId, ctx = {}) => {
  const areas = ctx.areas || {};
  switch (chapterId) {
    case 'territorio': {
      const total = Object.values(areas).reduce((t, v) => t + v, 0);
      const porGrupo = ['mineril', 'agro', 'turismo', 'servicios'].map((s) => ({ label: `${SECTOR_LABEL[s]} (${D.filter((d) => d.sector === s).length} dptos.)`, value: D.filter((d) => d.sector === s).reduce((t, d) => t + (areas[d.id] || 0), 0), color: SECTOR_COLOR[s] }));
      return {
        kpis: [
          kpi({ label: 'Departamentos', value: 16, unit: 'departamentos', scale: 'provincial', scopeText: 'Provincial', source: 'IGN / IDERA (límites departamentales)', year: null, condition: null, validated: true }),
          total > 0 ? kpi({ label: 'Superficie', value: Math.round(total), unit: 'km²', scale: 'provincial', scopeText: 'Provincial · suma de los 16 departamentos', source: 'Cálculo propio sobre límites IGN / IDERA', year: null, condition: null, validated: true }) : kpi({ label: 'Superficie', value: undefined, unit: 'km²', scale: 'provincial', scopeText: 'Provincial', year: null, condition: null }),
          noDisp('Población (Censo 2022)', 'Pendiente de incorporar la fuente (INDEC).', 'Provincial')
        ],
        charts: total > 0 ? [{ type: 'bars', title: 'Distribución territorial: superficie por grupo de departamentos', scale: 'departamental', scopeText: 'Departamental · agrupado por actividad predominante (clasificación del proyecto)', unit: 'km²', items: porGrupo, source: 'Cálculo propio sobre límites IGN / IDERA' }] : [],
        note: 'Los grupos reflejan la actividad predominante asignada a cada departamento en este proyecto; no son una clasificación oficial.'
      };
    }
    case 'mineria': {
      const L = GRUPOS.puna, et = 'Puna';
      return {
        kpis: [produccionKpi(L, et, 'produccion_litio_mineria', 'Producción minera', 'miles de toneladas'), exportKpi(L, et), empleoKpi(L, et), noDisp('Proyectos e inversiones', 'Pendiente de incorporar la fuente (SIACAM / Secretaría de Minería).')],
        charts: [
          { type: 'line', title: 'Evolución de la actividad minera 2015–2026', scale: 'departamental', scopeText: 'Departamental · Puna (suma de 5) y Susques', unit: 'miles de toneladas', series: [{ label: 'Puna (suma de 5 departamentos)', color: '#a855f7', points: sumaSerie(L, 'produccion_litio_mineria').map(pt) }, { label: 'Susques', color: '#e9d5ff', points: serie('susques', 'produccion_litio_mineria').map(pt) }] },
          { type: 'bars', title: 'Producción minera por departamento (2026, parcial)', scale: 'departamental', scopeText: 'Departamental', unit: 'miles de toneladas', items: barrasDept(L, 'produccion_litio_mineria') }
        ]
      };
    }
    case 'energia':
      return {
        kpis: [noDisp('Capacidad instalada', 'Pendiente de incorporar la fuente (Secretaría de Energía).'), noDisp('Evolución energética', 'Pendiente de incorporar la fuente (Secretaría de Energía).')],
        charts: [],
        facts: [`Ubicación de referencia: ${CAUCHARI.lngLat[1]}, ${CAUCHARI.lngLat[0]} (Cauchari, departamento Susques).`, CAUCHARI.fuente + '.'],
        note: 'La escena solar es una representación ilustrativa ubicada sobre esas coordenadas: no es un modelo del parque real.'
      };
    case 'agroindustria': {
      const L = GRUPOS.agro, et = 'Valles y Yungas';
      return {
        kpis: [produccionKpi(L, et, 'produccion_agroindustria', 'Producción agroindustrial', 'miles de toneladas'), empleoKpi(L, et), pymesKpi(L, et), exportKpi(L, et)],
        charts: [
          { type: 'line', title: 'Evolución sectorial 2015–2026', scale: 'departamental', scopeText: 'Departamental · 5 departamentos agroindustriales', unit: 'miles de toneladas', series: lineaDept(L, 'produccion_agroindustria', VERDES) },
          { type: 'bars', title: 'Empleo registrado por departamento (2026, parcial)', scale: 'departamental', scopeText: 'Departamental', unit: 'puestos de trabajo', items: barrasDept(L, 'empleo_registrado') }
        ]
      };
    }
    case 'turismo': {
      const L = GRUPOS.turismo, et = 'Quebrada y Palpalá';
      return {
        kpis: [produccionKpi(L, et, 'actividad_turismo_servicios', 'Actividad de turismo y servicios', 'miles de servicios'), empleoKpi(L, et), pymesKpi(L, et), noDisp('Visitantes', 'Pendiente de incorporar la fuente (organismo provincial de Turismo).')],
        charts: [
          { type: 'line', title: 'Evolución temporal 2015–2026', scale: 'departamental', scopeText: 'Departamental · 4 departamentos turísticos y Palpalá', unit: 'miles de servicios', series: lineaDept(L, 'actividad_turismo_servicios', AMARILLOS) },
          { type: 'bars', title: 'Empleo registrado por departamento (2026, parcial)', scale: 'departamental', scopeText: 'Departamental', unit: 'puestos de trabajo', items: barrasDept(L, 'empleo_registrado') }
        ]
      };
    }
    case 'empleo': {
      const provEmp = indicadorProvincial('empleo_registrado');
      const sumaEmp = sumaSerie(GRUPOS.todos, 'empleo_registrado');
      const fila = conciliacion().find((f) => f.id === 'empleo_registrado' && f.anio === ANIO_EN_CURSO);
      const grupos = ['mineril', 'agro', 'turismo', 'servicios'];
      const porSector = (anio) => grupos.map((s) => ({ label: SECTOR_LABEL[s], color: SECTOR_COLOR[s], value: D.filter((d) => d.sector === s).reduce((t, d) => t + serie(d.id, 'empleo_registrado').find((p) => p.anio === anio).valor, 0) }));
      const varDept = D.map((d) => { const s = serie(d.id, 'empleo_registrado'); const v = variacion(s.map((p) => ({ anio: p.anio, valor: p.valor, parcial: p.parcial }))); return { label: d.nombre ?? d.name, value: v ? v.pct : 0, color: SECTOR_COLOR[d.sector] }; }).sort((a, b) => b.value - a.value);
      return {
        kpis: [
          kpi({ label: 'Empleo registrado (total provincial)', value: provEmp.puntos.at(-1).valor, unit: 'puestos de trabajo', scale: 'provincial', scopeText: 'Provincial', delta: variacion(provEmp.puntos.map((p) => ({ anio: p.anio, valor: p.valor, parcial: p.condicion === 'parcial' }))) }),
          kpi({ label: 'Empleo registrado (suma de 16 departamentos)', value: sumaEmp.at(-1).valor, unit: 'puestos de trabajo', scale: 'departamental', scopeText: 'Departamental · suma de 16 departamentos', delta: variacion(sumaEmp) })
        ],
        charts: [
          { type: 'line', title: 'Evolución del empleo registrado 2015–2026', scale: 'provincial', scopeText: 'Provincial', unit: 'puestos de trabajo', series: [{ label: 'Total provincial', color: '#2dd4bf', points: provEmp.puntos.map((p) => ({ x: p.anio, y: p.valor, partial: p.condicion === 'parcial' })) }] },
          { type: 'bars', title: 'Diferencias territoriales: empleo registrado por departamento (2026, parcial)', scale: 'departamental', scopeText: 'Departamental', unit: 'puestos de trabajo', items: barrasDept(GRUPOS.todos, 'empleo_registrado') },
          { type: 'stack', title: 'Comparación de períodos: empleo registrado por grupo de departamentos', scale: 'departamental', scopeText: 'Departamental · grupos por actividad predominante del departamento', unit: 'puestos de trabajo', rows: [{ label: '2015', segments: porSector(2015) }, { label: '2026 (parcial)', segments: porSector(2026) }], note: 'Es el empleo total de cada grupo de departamentos, no el empleo del sector en toda la provincia.' },
          { type: 'bars', title: 'Actividades productivas y empleo: variación del empleo 2015–2026 por departamento (color = actividad predominante)', scale: 'departamental', scopeText: 'Departamental', unit: '%', items: varDept, format: 'pct' }
        ],
        note: fila ? `Los totales no coinciden: provincial ${fila.provincial.toLocaleString('es-AR')} contra suma de departamentos ${fila.sumaDeptos.toLocaleString('es-AR')} (diferencia ${fila.diferencia > 0 ? '+' : ''}${fila.diferencia.toLocaleString('es-AR')}). El total provincial se cargó por separado y no se calcula sumando departamentos; se resolverá al incorporar la fuente oficial.` : ''
      };
    }
    case 'futuro': {
      const bullets = [
        ['Actividad minera (Puna)', sumaSerie(GRUPOS.puna, 'produccion_litio_mineria')],
        ['Producción agroindustrial', sumaSerie(GRUPOS.agro, 'produccion_agroindustria')],
        ['Turismo y servicios', sumaSerie(GRUPOS.turismo, 'actividad_turismo_servicios')],
        ['Empleo registrado (16 departamentos)', sumaSerie(GRUPOS.todos, 'empleo_registrado')]
      ].map(([label, s]) => ({ label, delta: variacion(s), desde: s[0].valor, hasta: s.at(-1).valor }));
      return { kpis: [], charts: [], summary: bullets, note: 'Variaciones calculadas sobre datos ilustrativos, sin fuente verificada. Los valores de 2026 son parciales.' };
    }
    default:
      return { kpis: [], charts: [] };
  }
};

// ---------- capítulos ----------
const PUNTO_CAUCHARI = { id: 'cauchari', label: CAUCHARI.nombre, lngLat: CAUCHARI.lngLat };
export const CHAPTERS = [
  { id: 'territorio', slug: 'territorio', extraSlugs: ['portada'], number: '01', short: 'El territorio', kicker: 'Capítulo 01 · El territorio',
    title: 'JUJUY: UNA PROVINCIA, MÚLTIPLES REALIDADES PRODUCTIVAS',
    text: ['Desde la inmensidad de la Puna hasta la vegetación de las Yungas, Jujuy presenta una diversidad territorial que condiciona sus actividades económicas y productivas.'],
    camera: { type: 'province', pitch: 52, bearing: -8 }, map: {} },
  { id: 'mineria', slug: 'mineria', number: '02', short: 'La transformación minera', kicker: 'Capítulo 02 · La transformación minera',
    title: 'LA PUNA: NUEVAS OPORTUNIDADES PRODUCTIVAS',
    text: ['La actividad minera adquirió un papel estratégico en la transformación económica de Jujuy, impulsando nuevas inversiones y actividades vinculadas al litio y otros recursos minerales.'],
    camera: { type: 'departments', ids: GRUPOS.puna, pitch: 56, bearing: -12, maxZoom: 9 }, map: { highlightIds: GRUPOS.puna, focusIds: ['susques'] } },
  { id: 'energia', slug: 'energia', number: '03', short: 'Energías renovables', kicker: 'Capítulo 03 · Energías renovables',
    title: 'EL SOL COMO MOTOR DE DESARROLLO',
    text: ['Jujuy cuenta con condiciones geográficas y climáticas que favorecen el desarrollo de proyectos de generación de energía solar.'],
    camera: { type: 'point', lngLat: CAUCHARI.lngLat, zoom: 10.6, pitch: 60, bearing: -15 },
    map: { highlightIds: ['susques'], focusIds: ['susques'], pois: [PUNTO_CAUCHARI], previewIds: ['susques-solar-1'] } },
  { id: 'agroindustria', slug: 'agroindustria', number: '04', short: 'Agroindustria', kicker: 'Capítulo 04 · Agroindustria',
    title: 'LA PRODUCCIÓN QUE CONSTRUYÓ NUESTRA ECONOMÍA',
    text: ['Los Valles y las Yungas representan espacios fundamentales para las actividades agrícolas y agroindustriales de la provincia.'],
    camera: { type: 'departments', ids: GRUPOS.agro, pitch: 55, bearing: -8, maxZoom: 9.5 }, map: { highlightIds: GRUPOS.agro } },
  { id: 'turismo', slug: 'turismo', number: '05', short: 'Turismo y servicios', kicker: 'Capítulo 05 · Turismo y servicios',
    title: 'EL TERRITORIO COMO GENERADOR DE OPORTUNIDADES',
    text: ['El patrimonio natural y cultural de Jujuy constituye una fuente de oportunidades económicas mediante el turismo y los servicios.'],
    camera: { type: 'departments', ids: GRUPOS.turismo, pitch: 55, bearing: -8, maxZoom: 9.5 }, map: { highlightIds: GRUPOS.turismo } },
  { id: 'empleo', slug: 'empleo', number: '06', short: 'Empleo y desarrollo', kicker: 'Capítulo 06 · Empleo y desarrollo territorial',
    title: '¿CÓMO SE TRANSFORMA EL TRABAJO EN JUJUY?',
    text: ['El empleo registrado cambió de manera desigual entre territorios. Los gráficos distinguen siempre los datos provinciales de los departamentales.'],
    camera: { type: 'province', pitch: 50, bearing: -6 }, map: { intensityFrom: 'empleo' } },
  { id: 'futuro', slug: 'futuro', number: '07', short: 'El futuro de Jujuy', kicker: 'Capítulo 07 · El futuro de Jujuy',
    title: 'UNA NUEVA MATRIZ PRODUCTIVA',
    text: ['Jujuy no es una economía estática. Es un territorio en transformación, donde las actividades tradicionales conviven con nuevas oportunidades productivas.'],
    camera: { type: 'province', pitch: 52, bearing: -8, duration: 2800 }, map: {} }
];

// Intensidad (0–1) del mapa del capítulo de empleo: empleo registrado 2026 por departamento (escala raíz cuadrada)
export const intensidadEmpleo = () => {
  const v = Object.fromEntries(D.map((d) => [d.id, ultimoValor(d.id, 'empleo_registrado')]));
  const max = Math.max(...Object.values(v));
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Math.sqrt(x / max)]));
};
// Estado del mapa para un capítulo (resaltado, foco, intensidad, puntos de interés y escenas en vista previa)
export const estadoMapa = (chapter) => ({
  highlightIds: chapter.map.highlightIds ?? null,
  focusIds: chapter.map.focusIds ?? null,
  intensity: chapter.map.intensityFrom === 'empleo' ? intensidadEmpleo() : null,
  pois: chapter.map.pois ?? null,
  previewIds: chapter.map.previewIds ?? []
});
export const fmtNum = (n) => (n == null ? '' : Math.abs(n) >= 100 ? Math.round(n).toLocaleString('es-AR') : n.toLocaleString('es-AR', { maximumFractionDigits: 1 }));
