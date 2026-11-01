// REGISTRO DE FUENTES OFICIALES CANDIDATAS
// Estado honesto: NINGUNA fue consultada ni verificada para este proyecto (`accedida: false`).
// No se cargan URLs ni valores que no hayan sido confirmados. Para validar un indicador:
//   1) descargar la serie del organismo, 2) completar `fuente` en su indicador (src/data/indicators.js),
//   3) cargar los valores reales, 4) cambiar `validacion` a 'validado' y fijar `condicion` de cada punto.
// `aportaria` es una orientación a CONFIRMAR, no una afirmación sobre el contenido de cada publicación.

export const FUENTES_CANDIDATAS = [
  { id: 'dpec', organismo: 'DPEC Jujuy (Dirección Provincial de Estadística y Censos)', escala: 'provincial/departamental', aportaria: 'estadísticas provinciales y departamentales (a confirmar series y años)', accedida: false },
  { id: 'indec', organismo: 'INDEC', escala: 'nacional/provincial', aportaria: 'Censo 2022 (población, superficie) y comercio exterior por provincia (a confirmar desagregación)', accedida: false },
  { id: 'siacam', organismo: 'SIACAM (Secretaría de Minería de la Nación)', escala: 'proyectos mineros', aportaria: 'información de proyectos y producción minera (a confirmar cobertura departamental)', accedida: false },
  { id: 'mineria_nacion', organismo: 'Secretaría de Minería de la Nación', escala: 'nacional/provincial', aportaria: 'producción y exportaciones mineras (a confirmar)', accedida: false },
  { id: 'energia_nacion', organismo: 'Secretaría de Energía de la Nación', escala: 'nacional/provincial', aportaria: 'generación y capacidad instalada de energía solar (a confirmar)', accedida: false },
  { id: 'agricultura_jujuy', organismo: 'Organismo provincial de Agricultura (Jujuy)', escala: 'provincial/departamental', aportaria: 'superficie y producción agrícola (a confirmar)', accedida: false },
  { id: 'turismo_jujuy', organismo: 'Organismo provincial de Turismo (Jujuy)', escala: 'provincial/departamental', aportaria: 'oferta y flujo turístico (a confirmar)', accedida: false },
  { id: 'sipa', organismo: 'SIPA / OEDE (Ministerio de Capital Humano)', escala: 'nacional/provincial/departamental', aportaria: 'empleo registrado por departamento y sector (a evaluar)', accedida: false }
];
