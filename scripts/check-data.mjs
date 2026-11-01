// Uso: npm run check:data         (informe)
//      npm run check:data -- --strict   (falla si hay indicadores sin validar o con problemas)
import { INDICADORES, problemasDe, conciliacion, controlCrecimiento, ANIO_EN_CURSO } from '../src/data/indicators.js';
const strict = process.argv.includes('--strict');
const todos = [...INDICADORES.provincial, ...Object.values(INDICADORES.departamentos).flat()];
const sinValidar = todos.filter((i) => i.validacion !== 'validado');
const conProblemas = todos.map((i) => [i, problemasDe(i)]).filter(([, p]) => p.length);
console.log(`Indicadores: ${todos.length} (provinciales ${INDICADORES.provincial.length}, departamentales ${todos.length - INDICADORES.provincial.length})`);
console.log(`Sin validar con fuente oficial: ${sinValidar.length}/${todos.length}`);
console.log(`Con problemas de metadatos: ${conProblemas.length}`);
conProblemas.slice(0, 10).forEach(([i, p]) => console.log(`  - ${i.escala}/${i.deptId ?? 'prov'}/${i.id}: ${p.join('; ')}`));
console.log(`\nDatos de ${ANIO_EN_CURSO}: parciales (año en curso)`);
console.log('\nCONCILIACIÓN provincial vs suma de los 16 departamentos');
for (const f of conciliacion()) console.log(`  ${f.nombre.padEnd(34)} ${f.anio}  prov=${String(f.provincial).padStart(6)}  suma=${String(f.sumaDeptos).padStart(6)}  dif=${String(f.diferencia).padStart(6)}  ${f.concilia ? 'OK' : 'NO CONCILIA'}`);
const mal = controlCrecimiento().filter((c) => !c.coincide);
console.log(`\nCrecimiento de empleo declarado vs calculado: ${mal.length === 0 ? 'coincide en los 16' : 'NO coincide en ' + mal.map((m) => `${m.deptId} (${m.declarado}% vs ${m.calculado}%)`).join(', ')}`);
if (strict && (sinValidar.length || conProblemas.length)) { console.error('\n--strict: hay datos sin validar o con problemas'); process.exit(1); }
