// Niveles de detalle y escala ilustrativa según el zoom del mapa.
// 1 provincial · 2 departamental · 3 cercana · 4 inmersiva
export const LEVEL_ZOOM = [8, 10, 12];
export const levelOf = (z) => (z < LEVEL_ZOOM[0] ? 1 : z < LEVEL_ZOOM[1] ? 2 : z < LEVEL_ZOOM[2] ? 3 : 4);
export const smooth = (z, a, b) => { const t = Math.min(1, Math.max(0, (z - a) / (b - a))); return t * t * (3 - 2 * t); };
// La escena se agranda al alejarse para seguir legible y crece ≈1,5× por nivel al acercarse.
export const sceneScale = (z) => Math.max(1, 150 * Math.pow(0.75, z - 12));
// Aparición progresiva: instalaciones y vehículos (nivel 2), personas (nivel 3). `zoom` puede
// sobrescribirse por departamento en departmentsConfig.
export const fades = (z, zoom = LEVEL_ZOOM) => {
  const f = smooth(z, zoom[0], zoom[0] + 1);
  return { facilities: f, vehicles: f, people: smooth(z, zoom[1], zoom[1] + 1) };
};
