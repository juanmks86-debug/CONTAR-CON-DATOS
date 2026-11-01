// Compara el motor original (piloto de Susques) con el motor modular: instancias dibujadas y selección con el mouse
import fs from 'fs';
const a = JSON.parse(fs.readFileSync('snap-orig.json', 'utf8')), b = JSON.parse(fs.readFileSync('snap-new.json', 'utf8'));
let bad = 0;
a.forEach((fa, i) => {
  const fb = b[i]; const okI = JSON.stringify(fa.instancias) === JSON.stringify(fb.instancias);
  const A = new Map(fa.picks.map((s) => s.split(':'))), B = new Map(fb.picks.map((s) => s.split(':')));
  let dif = 0; for (const [k, v] of B) if (A.get(k) !== v) dif++; for (const k of A.keys()) if (!B.has(k)) dif++;
  console.log(`zoom ${fa.z}${fa.filter !== 'todos' ? '/' + fa.filter : ''}${fa.sel ? '>' + fa.sel : ''}: instancias ${okI ? 'IGUALES' : 'DISTINTAS'} (${fa.instancias.length}) | selección ${dif === 0 ? 'IGUAL' : dif + ' puntos distintos'} (${fa.picks.length})`);
  if (!okI || dif) bad++;
});
console.log(bad === 0 ? '\nRESULTADO: el motor modular dibuja y selecciona exactamente igual que el original' : `\nRESULTADO: ${bad} cuadros con diferencias`);
process.exit(bad ? 1 : 0);
