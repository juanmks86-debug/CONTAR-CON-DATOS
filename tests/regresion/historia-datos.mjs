// Datos de la historia: grupos, indicadores y reglas de honestidad (nada inventado)
const { CHAPTERS, GRUPOS, buildBlocks, estadoMapa } = await import('../../src/story/storyData.js');
let bad = 0; const fail = (m) => { bad++; console.log('FALLA:', m); };
console.log('grupos:', Object.entries(GRUPOS).map(([k, v]) => `${k}=${v.length}`).join(' '));
if (GRUPOS.puna.length !== 5 || GRUPOS.agro.length !== 5 || GRUPOS.turismo.length !== 5 || GRUPOS.todos.length !== 16) fail('tamaño de grupos');
if (GRUPOS.turismo.includes('belgrano') || !GRUPOS.turismo.includes('palpala')) fail('Palpalá sí, Belgrano no');
console.log('capítulos:', CHAPTERS.map((c) => c.number).join(' '));
const areas = Object.fromEntries(GRUPOS.todos.map((id) => [id, 1000]));
for (const c of CHAPTERS) {
  const b = buildBlocks(c.id, { areas });
  for (const k of b.kpis) {
    if (k.value === null && !k.reason) fail(`${c.id}/${k.label}: sin dato y sin motivo`);
    if (k.value != null && !['departamental', 'provincial'].includes(k.scale)) fail(`${c.id}/${k.label}: ámbito inválido`);
    if (k.value != null && !k.scopeText) fail(`${c.id}/${k.label}: sin ámbito`);
    if (k.value != null && !k.unit) fail(`${c.id}/${k.label}: sin unidad`);
    if (k.value != null && k.year === ANIO(k)) { /* ok */ }
  }
  for (const ch of b.charts) if (!['departamental', 'provincial'].includes(ch.scale) || !ch.scopeText) fail(`${c.id}/${ch.title}: gráfico sin ámbito`);
  const est = estadoMapa(c); const ids = [...(est.highlightIds || []), ...(est.focusIds || [])];
  ids.forEach((id) => { if (!GRUPOS.todos.includes(id)) fail(`${c.id}: departamento inexistente ${id}`); });
  console.log(`${c.number} ${c.id.padEnd(14)} KPIs ${b.kpis.length} (sin dato: ${b.kpis.filter((k) => k.value === null).length}) · gráficos ${b.charts.length} · resaltados ${est.highlightIds ? est.highlightIds.length : 'todos'} · cámara ${c.camera.type}`);
}
function ANIO(k) { return 2026; }
// capítulo de empleo: debe distinguir provincial de departamental
const emp = buildBlocks('empleo', { areas });
const escalas = new Set(emp.charts.map((c) => c.scale)); if (!escalas.has('provincial') || !escalas.has('departamental')) fail('empleo debe tener gráficos provinciales y departamentales');
if (!emp.note.includes('no coinciden')) fail('falta la nota de conciliación en empleo');
// capítulo de energía: no debe mostrar capacidad ni producción inventadas
const en = buildBlocks('energia'); if (en.kpis.some((k) => k.value !== null)) fail('energía no debe mostrar valores sin fuente');
// capítulo 1: población no disponible
if (buildBlocks('territorio', { areas }).kpis.find((k) => /Poblaci/.test(k.label)).value !== null) fail('población debe ser no disponible');
console.log(bad === 0 ? '\nRESULTADO: OK' : `\nRESULTADO: ${bad} problemas`); process.exit(bad ? 1 : 0);
