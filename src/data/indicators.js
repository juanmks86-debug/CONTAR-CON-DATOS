// CAPA DE METADATOS DE INDICADORES
// Envuelve los valores de src/data.js SIN modificarlos y los describe con: unidad, escala geográfica,
// año, condición del dato (observado | estimado | parcial) y fuente. Cada indicador es departamental
// O provincial: nunca se mezclan escalas. Los valores actuales NO tienen fuente verificada
// (`validacion: 'sin_validar'`), por eso su `condicion` queda en null salvo el año en curso, que por
// calendario sólo puede ser parcial.

import { JUJUY_DEPARTMENTS_DATA as DEPTS, PROVINCIAL_TOTALS as PROV } from '../data.js';

export const ANIO_EN_CURSO = 2026;   // año aún abierto: cualquier valor anual de 2026 es parcial
export const CONDICIONES = ['observado', 'estimado', 'parcial'];

const num = (s) => Number(String(s).replace(/[^0-9.\-]/g, ''));
const sinFuente = () => ({ organismo: null, publicacion: null, url: null, fechaConsulta: null });
const punto = (anio, valor) => ({ anio, valor, condicion: anio === ANIO_EN_CURSO ? 'parcial' : null });
const serie = (rows, key) => rows.map((r) => punto(r.year, r[key]));
const ind = (id, nombre, unidad, escala, deptId, puntos, extra = {}) =>
  ({ id, nombre, unidad, escala, deptId, puntos, fuente: sinFuente(), validacion: 'sin_validar', ...extra });

const deDepartamento = (d) => [
  ind('empleo_registrado', 'Empleo registrado', 'puestos de trabajo', 'departamental', d.id, serie(d.yearlyData, 'empleo')),
  ind('produccion_litio_mineria', 'Producción de litio y minería', 'miles de toneladas', 'departamental', d.id, serie(d.yearlyData, 'litio')),
  ind('produccion_agroindustria', 'Producción agroindustrial', 'miles de toneladas', 'departamental', d.id, serie(d.yearlyData, 'agro')),
  ind('actividad_turismo_servicios', 'Actividad de turismo y servicios', 'miles de servicios', 'departamental', d.id, serie(d.yearlyData, 'turismo')),
  ind('participacion_pbi', 'Participación en el PBI provincial', '% del PBI provincial', 'departamental', d.id, [punto(ANIO_EN_CURSO, num(d.metrics.pbiShare))]),
  ind('exportaciones', 'Exportaciones estimadas', 'millones de USD', 'departamental', d.id, [punto(ANIO_EN_CURSO, num(d.metrics.exportValue))]),
  ind('pymes', 'Red de PyMEs locales', 'empresas', 'departamental', d.id, [punto(ANIO_EN_CURSO, num(d.metrics.localSmes))]),
  ind('crecimiento_empleo', 'Crecimiento del empleo vs. 2015', '% de variación', 'departamental', d.id, [punto(ANIO_EN_CURSO, num(d.metrics.employmentGrowth))],
    { derivadoDe: 'empleo_registrado', nota: 'Debe poder derivarse de la serie de empleo registrado (se controla en check:data).' })
];

const provincial = [
  ind('empleo_registrado', 'Empleo registrado', 'puestos de trabajo', 'provincial', null, serie(PROV.yearlyData, 'empleo')),
  ind('produccion_litio_mineria', 'Producción de litio y minería', 'miles de toneladas', 'provincial', null, serie(PROV.yearlyData, 'litio')),
  ind('produccion_agroindustria', 'Producción agroindustrial', 'miles de toneladas', 'provincial', null, serie(PROV.yearlyData, 'agro')),
  ind('actividad_turismo_servicios', 'Actividad de turismo y servicios', 'miles de servicios', 'provincial', null, serie(PROV.yearlyData, 'turismo')),
  ind('exportaciones', 'Exportaciones', 'millones de USD', 'provincial', null, [punto(ANIO_EN_CURSO, num(PROV.totalExports))]),
  ind('pymes', 'Empresas y PyMEs', 'empresas', 'provincial', null, [punto(ANIO_EN_CURSO, num(PROV.totalSmes))]),
  ind('crecimiento_pbi', 'Crecimiento del PBI', '% de variación (período base no especificado en el dato original)', 'provincial', null, [punto(ANIO_EN_CURSO, num(PROV.pbiGrowth))],
    { nota: 'El dato original no indica el período base de la variación: definirlo al validar.' })
];

export const INDICADORES = { provincial, departamentos: Object.fromEntries(DEPTS.map((d) => [d.id, deDepartamento(d)])) };

export const indicadorProvincial = (id) => provincial.find((i) => i.id === id);
export const indicadorDepartamental = (deptId, id) => INDICADORES.departamentos[deptId]?.find((i) => i.id === id);
export const ultimo = (i) => i.puntos[i.puntos.length - 1];
export const estadoDe = (i) => (i.validacion === 'validado' ? 'Validado' : 'Ilustrativo · sin fuente verificada');
export const resumenDe = (i) => {
  const p = ultimo(i);
  return `${i.nombre}: ${i.unidad} · escala ${i.escala} · ${p.anio}${p.condicion ? ` (${p.condicion})` : ''} · ${estadoDe(i)}`;
};

// ¿Un indicador cumple el contrato de metadatos para considerarse validado?
export const problemasDe = (i) => {
  const p = [];
  if (!i.unidad) p.push('falta unidad');
  if (!['departamental', 'provincial'].includes(i.escala)) p.push('escala inválida');
  if (i.escala === 'departamental' && !i.deptId) p.push('indicador departamental sin deptId');
  if (i.escala === 'provincial' && i.deptId) p.push('indicador provincial con deptId');
  if (i.validacion === 'validado') {
    if (!i.fuente.organismo || !i.fuente.publicacion || !i.fuente.fechaConsulta) p.push('validado sin fuente completa');
    i.puntos.forEach((x) => { if (!CONDICIONES.includes(x.condicion)) p.push(`${x.anio}: condición inválida`); });
  }
  i.puntos.forEach((x) => { if (x.anio === ANIO_EN_CURSO && x.condicion !== 'parcial') p.push(`${x.anio}: el año en curso debe ser parcial`); });
  return p;
};

// CONCILIACIÓN provincial vs. suma departamental (no corrige nada: sólo informa)
const sumaDeptos = (id, anio) => Object.values(INDICADORES.departamentos).reduce((t, lista) => {
  const x = lista.find((i) => i.id === id)?.puntos.find((p) => p.anio === anio);
  return t + (x ? x.valor : 0);
}, 0);

export const conciliacion = () => {
  const filas = [];
  const aditivos = ['empleo_registrado', 'produccion_litio_mineria', 'produccion_agroindustria', 'actividad_turismo_servicios', 'exportaciones', 'pymes'];
  for (const id of aditivos) {
    const prov = indicadorProvincial(id);
    for (const p of prov.puntos) {
      const suma = sumaDeptos(id, p.anio);
      filas.push({ id, nombre: prov.nombre, unidad: prov.unidad, anio: p.anio, provincial: p.valor, sumaDeptos: suma,
        diferencia: p.valor - suma, porcentaje: suma ? (p.valor / suma - 1) * 100 : null, concilia: p.valor === suma });
    }
  }
  const sumaPbi = sumaDeptos('participacion_pbi', ANIO_EN_CURSO);
  filas.push({ id: 'participacion_pbi', nombre: 'Participación en el PBI', unidad: '% (deben sumar 100)', anio: ANIO_EN_CURSO, provincial: 100, sumaDeptos: Number(sumaPbi.toFixed(1)),
    diferencia: Number((100 - sumaPbi).toFixed(1)), porcentaje: null, concilia: Math.abs(sumaPbi - 100) < 0.05 });
  return filas;
};

// Crecimiento del empleo declarado vs. el calculado desde la serie
export const controlCrecimiento = () => DEPTS.map((d) => {
  const s = d.yearlyData; const calc = (s[s.length - 1].empleo / s[0].empleo - 1) * 100; const dec = num(d.metrics.employmentGrowth);
  return { deptId: d.id, declarado: dec, calculado: Number(calc.toFixed(1)), coincide: Math.abs(calc - dec) < 1 };
});
