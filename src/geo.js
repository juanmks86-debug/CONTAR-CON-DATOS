// Utilidades geográficas puras (sin dependencias)
const ringArea = (r) => {
  let a = 0;
  for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
  return Math.abs(a) / 2;
};
const polysOf = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);

export const pointInRing = (pt, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

export const pointInGeometry = (pt, g) =>
  polysOf(g).some((p) => pointInRing(pt, p[0]) && !p.slice(1).some((h) => pointInRing(pt, h)));

// centroide del polígono más grande
export const centroidOf = (g) => {
  const polys = polysOf(g);
  const big = polys.reduce((m, p) => (ringArea(p[0]) > ringArea(m[0]) ? p : m), polys[0]);
  const ring = big[0];
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const f = ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    a += f; cx += (ring[i][0] + ring[i + 1][0]) * f; cy += (ring[i][1] + ring[i + 1][1]) * f;
  }
  a *= 0.5;
  return a ? [cx / (6 * a), cy / (6 * a)] : ring[0];
};

// punto garantizado dentro del departamento, lo más cerca posible de `start`
export const interiorPoint = (g, start) => {
  if (pointInGeometry(start, g)) return start;
  let best = null, bd = Infinity;
  const pts = polysOf(g).flatMap((p) => p[0]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  for (let i = 0; i <= 60; i++) for (let j = 0; j <= 60; j++) {
    const c = [x0 + ((x1 - x0) * i) / 60, y0 + ((y1 - y0) * j) / 60];
    const d = (c[0] - start[0]) ** 2 + (c[1] - start[1]) ** 2;
    if (d < bd && pointInGeometry(c, g)) { bd = d; best = c; }
  }
  return best || start;
};
