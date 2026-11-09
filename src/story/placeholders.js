// IMÁGENES DE REFERENCIA PROVISIONALES
// No son fotografías: son tarjetas gráficas que describen QUÉ fotografía debe ir en cada espacio y están
// rotuladas como provisionales. Se reemplazan solas cuando hay fotografías reales en Supabase (sin tocar el diseño).
export const REFERENCIAS = {
  portada: { desc: 'Paisaje panorámico de la provincia de Jujuy: montañas y cielo al atardecer', c: ['#1e1b4b', '#9a3412'] },
  territorio: { desc: 'Mapa topográfico, relieve de los Andes y paisajes de las cuatro regiones', c: ['#0f2a43', '#365314'] },
  mineria: { desc: 'Salar, explotación de litio y maquinaria minera', c: ['#2e1065', '#0e7490'] },
  energia: { desc: 'Parque solar Cauchari', c: ['#422006', '#1d4ed8'] },
  agroindustria: { desc: 'Cultivos, campos agrícolas, tabaco y producción azucarera', c: ['#052e16', '#854d0e'] },
  turismo: { desc: 'Purmamarca, Tilcara, Humahuaca y paisajes de la Quebrada', c: ['#431407', '#9f1239'] },
  empleo: { desc: 'Actividades económicas y trabajadores', c: ['#0c4a6e', '#334155'] },
  futuro: { desc: 'Paisaje de Jujuy con energía renovable y desarrollo territorial', c: ['#082f49', '#166534'] }
};

const esc = (t) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const wrap = (text, n) => { const out = []; let line = ''; text.split(' ').forEach((w) => { if ((line + ' ' + w).trim().length > n) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); }); if (line) out.push(line); return out; };

export const placeholderFor = (slug) => {
  const r = REFERENCIAS[slug] || { desc: 'Fotografía de referencia', c: ['#0f172a', '#1e293b'] };
  const lines = wrap(r.desc, 34).map((l, i) => `<text x="600" y="${380 + i * 44}" text-anchor="middle" font-size="34" fill="#f8fafc" font-family="system-ui, sans-serif">${esc(l)}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${r.c[0]}"/><stop offset="1" stop-color="${r.c[1]}"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><rect x="60" y="60" width="1080" height="680" rx="24" fill="none" stroke="#ffffff55" stroke-width="3" stroke-dasharray="14 12"/><text x="600" y="250" text-anchor="middle" font-size="26" letter-spacing="6" fill="#fcd34d" font-family="system-ui, sans-serif">IMAGEN DE REFERENCIA PROVISIONAL</text>${lines}<text x="600" y="640" text-anchor="middle" font-size="24" fill="#cbd5e1" font-family="system-ui, sans-serif">Reemplazar por una fotografía real cargada en Supabase</text><text x="600" y="676" text-anchor="middle" font-size="22" fill="#94a3b8" font-family="system-ui, sans-serif">jujuy-storytelling/${esc(slug)}/</text></svg>`;
  return { id: `ref-${slug}`, title: 'Imagen de referencia provisional', description: r.desc, alt: `Imagen de referencia provisional (no es una fotografía): ${r.desc}`, url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, isPlaceholder: true, width: 1200, height: 800 };
};
