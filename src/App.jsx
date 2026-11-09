import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, CalendarDays, Compass, FileText, Globe2, Layers, Mountain,
  Pickaxe, TrendingUp, Users, Wheat, X
} from 'lucide-react';
import MapaJujuy from './MapaJujuy';
import { indicadorProvincial, indicadorDepartamental, ultimo, estadoDe, conciliacion, controlCrecimiento } from './data/indicators';
import { FUENTES_CANDIDATAS } from './data/sources';
import { JUJUY_DEPARTMENTS_DATA, PROVINCIAL_TOTALS } from './data';
import { DEPARTMENTS_CONFIG, SCENE_DEFS } from './config/departmentsConfig';

const SECTORS = {
  mineril:   { label: 'Minería y litio',     color: '#a855f7' },
  agro:      { label: 'Agroindustria',       color: '#10b981' },
  turismo:   { label: 'Turismo y servicios', color: '#f59e0b' },
  servicios: { label: 'Servicios',           color: '#0ea5e9' }
};
const SERIES = [['litio', 'Minería y litio', '#a855f7'], ['agro', 'Agroindustria', '#10b981'], ['turismo', 'Turismo y servicios', '#f59e0b']];
const YEARS = [2015, 2018, 2021, 2024, 2026];
const LATEST = 2026;
const NA = 'No disponible';
const LEVEL_NAMES = ['Provincial', 'Departamental', 'Actividad', 'Detalle'];
const SCENE_TOGGLES = [['people', 'Personas'], ['vehicles', 'Vehículos'], ['facilities', 'Instalaciones'], ['animate', 'Animaciones']];
const fmt = (n) => Math.round(n).toLocaleString('es-AR');
const glass = 'bg-[#07111d]/85 border border-white/12 backdrop-blur-md';
const card = 'bg-[#0a1624] border border-white/10 rounded-xl';

function Donut({ parts }) {
  const total = parts.reduce((t, p) => t + p.value, 0);
  let acc = 0;
  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90 shrink-0">
      <circle cx="50" cy="50" r="38" fill="none" stroke="#12263a" strokeWidth="16" />
      {total > 0 && parts.map((p) => {
        const len = (p.value / total) * 238.76;
        const el = <circle key={p.label} cx="50" cy="50" r="38" fill="none" stroke={p.color} strokeWidth="16"
          strokeDasharray={`${len} ${238.76 - len}`} strokeDashoffset={-acc} />;
        acc += len;
        return el;
      })}
    </svg>
  );
}

function LineChart({ rows }) {
  const W = 380, H = 150, L = 34, R = 8, T = 8, B = 22;
  const lines = SERIES.map(([key, label, color]) => {
    const base = rows[0]?.[key];
    return base ? { key, label, color, pts: rows.map((r) => ({ year: r.year, v: (r[key] / base) * 100 })) } : null;
  }).filter(Boolean);
  const top = Math.ceil(Math.max(150, ...lines.flatMap((l) => l.pts.map((p) => p.v))) / 100) * 100;
  const x = (yr) => L + ((yr - 2015) / 11) * (W - L - R);
  const y = (v) => T + (1 - v / top) * (H - T - B);
  return (
    <div className="flex items-center gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40 min-w-0">
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y((top / 4) * i)} y2={y((top / 4) * i)} stroke="#ffffff14" />
            <text x={L - 5} y={y((top / 4) * i) + 3} textAnchor="end" fontSize="8" fill="#6b8296">{Math.round((top / 4) * i)}</text>
          </g>
        ))}
        {lines.map((l) => (
          <g key={l.key}>
            <polyline fill="none" stroke={l.color} strokeWidth="2" points={l.pts.map((p) => `${x(p.year)},${y(p.v)}`).join(' ')} />
            {l.pts.map((p) => <circle key={p.year} cx={x(p.year)} cy={y(p.v)} r="2.5" fill={l.color} />)}
          </g>
        ))}
        {YEARS.map((yr) => <text key={yr} x={x(yr)} y={H - 6} textAnchor="middle" fontSize="8" fill="#6b8296">{yr}</text>)}
      </svg>
      <ul className="text-[10px] text-slate-300 space-y-2 shrink-0">
        {lines.map((l) => <li key={l.key} className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />{l.label}</li>)}
      </ul>
    </div>
  );
}

export default function App() {
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('todos');
  const [view3d, setView3d] = useState(true);
  const [areas, setAreas] = useState({});
  const [chapter, setChapter] = useState(0);
  const [showDoc, setShowDoc] = useState(false);
  const [sceneOpts, setSceneOpts] = useState({ people: true, vehicles: true, facilities: true, animate: true, preview: false });
  const [picked, setPicked] = useState(null);
  const [level, setLevel] = useState(1);

  // el mapa colorea por sector; "servicios" se agrupa con turismo para el filtro
  const mapDepartments = useMemo(() => JUJUY_DEPARTMENTS_DATA.map((d) => ({
    ...d, color: SECTORS[d.sector].color, sector: d.sector === 'servicios' ? 'turismo' : d.sector
  })), []);

  const dept = JUJUY_DEPARTMENTS_DATA.find((d) => d.id === selectedDeptId);
  const data = dept || PROVINCIAL_TOTALS;
  const row = data.yearlyData.find((r) => r.year === LATEST);
  const empChange = data.yearlyData[0]?.empleo ? (row.empleo / data.yearlyData[0].empleo - 1) * 100 : null;
  const parts = SERIES.map(([key, label, color]) => ({ label, color, value: row[key] }));
  const partTotal = parts.reduce((t, p) => t + p.value, 0);
  const sector = dept ? SECTORS[dept.sector] : null;
  const activities = dept ? dept.metrics.mainActivity.split(/,| y /).map((a) => a.trim()).filter(Boolean).slice(0, 4) : [];

  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const filterTo = (f, c) => { setActiveFilter(f); setChapter(c); go('hero'); };
  const CHAPTERS = [
    ['01', 'Jujuy en transformación', () => { setSelectedDeptId(null); setActiveFilter('todos'); setChapter(0); go('top'); }],
    ['02', 'Exploración territorial', () => filterTo('todos', 1)],
    ['03', 'Evolución económica', () => { setChapter(2); go('indicadores'); }],
    ['04', 'Minería y litio', () => filterTo('mineril', 3)],
    ['05', 'Agroindustria', () => filterTo('agro', 4)],
    ['06', 'Turismo y servicios', () => filterTo('turismo', 5)],
    ['07', 'Empleo y desarrollo', () => { setChapter(6); go('indicadores'); }],
    ['08', 'Fuentes y metodología', () => { setChapter(7); setShowDoc(true); }]
  ];
  const TOPNAV = [['Inicio', 0], ['Territorio', 1], ['Minería y litio', 3], ['Agroindustria', 4], ['Turismo y servicios', 5], ['Empleo', 6], ['Metodología', 7]];
  const LEGEND = [['agro', 'Agroindustria'], ['mineril', 'Minería y litio'], ['turismo', 'Turismo y servicios']];

  return (
    <div id="top" className="min-h-screen bg-[#050d17] text-slate-100 pb-28">
      {/* HEADER */}
      <header className="h-14 flex items-center justify-between gap-4 px-5 border-b border-white/10 bg-[#07111d]/95 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center gap-2 font-bold tracking-wide text-lg shrink-0">
          <Mountain className="w-6 h-6 text-teal-300" /> <span>JUJUY <span className="text-teal-300">DATA LAB</span></span>
        </div>
        <nav className="hidden lg:flex items-center gap-1 text-[13px]">
          {TOPNAV.map(([label, c]) => (
            <button key={label} onClick={CHAPTERS[c][2]}
              className={`px-3 py-4 border-b-2 transition ${chapter === c ? 'border-teal-300 text-teal-200' : 'border-transparent text-slate-300 hover:text-white'}`}>{label}</button>
          ))}
        </nav>
        <div className="flex items-center gap-2 text-xs text-slate-300 shrink-0"><CalendarDays className="w-4 h-4 text-teal-300" /> 2015 – 2026</div>
      </header>

      {/* HERO: MAPA A PANTALLA COMPLETA */}
      <section id="hero" className="relative h-[72vh] min-h-[600px] overflow-hidden scroll-mt-14">
        <div className="absolute inset-0">
          <MapaJujuy departments={mapDepartments} selectedDeptId={selectedDeptId} activeFilter={activeFilter}
            onSelect={(id) => { setSelectedDeptId(id); if (id) setChapter(1); }} view3d={view3d} onFeatures={setAreas}
            scenes={sceneOpts} onScenePick={setPicked} onLevel={setLevel} />
        </div>
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#050d17] via-[#050d17]/55 to-transparent to-60%" />
        <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none bg-gradient-to-t from-[#050d17] to-transparent" />

        {/* texto + métricas */}
        <div className="absolute top-8 left-6 lg:left-10 max-w-[520px] pointer-events-none">
          <p className="text-[11px] uppercase tracking-[.2em] text-teal-300 mb-3">Capítulo 01 ———</p>
          <h1 className="text-3xl md:text-[44px] font-extrabold leading-[1.05] tracking-tight">
            JUJUY: EL MAPA DE SU<br /><span className="text-teal-300">TRANSFORMACIÓN PRODUCTIVA</span>
          </h1>
          <p className="text-sm text-slate-300 mt-4 max-w-md">Una exploración territorial de la evolución económica, productiva y laboral de los 16 departamentos de Jujuy durante 2015–2026.</p>
          <div className="flex flex-wrap gap-6 mt-6">
            {[[TrendingUp, 'Crecimiento PBI', PROVINCIAL_TOTALS.pbiGrowth], [Users, 'Empleo registrado', PROVINCIAL_TOTALS.totalEmployment], [Globe2, 'Exportaciones', PROVINCIAL_TOTALS.totalExports]].map(([Icon, l, v]) => (
              <div key={l} className="flex items-center gap-2.5">
                <Icon className="w-6 h-6 text-teal-300" />
                <div><div className="text-[10px] text-slate-400">{l}</div><div className="font-bold">{v}</div><div className="text-[10px] text-slate-500">({LATEST})</div></div>
              </div>
            ))}
          </div>
          <button onClick={() => go('indicadores')} className="pointer-events-auto mt-6 flex items-center gap-2 border border-teal-300/70 text-teal-200 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-teal-300/10">
            <ArrowRight className="w-4 h-4" /> Explorar el territorio
          </button>
        </div>

        {/* 3D / 2D */}
        <div className={`${glass} absolute left-6 lg:left-10 bottom-20 hidden md:flex flex-col rounded-xl overflow-hidden text-xs z-10`}>
          {[[true, '3D'], [false, '2D']].map(([v, l]) => (
            <button key={l} onClick={() => setView3d(v)} className={`px-4 py-2.5 ${view3d === v ? 'bg-teal-400 text-[#04141c] font-bold' : 'text-slate-300 hover:bg-white/5'}`}>{l}</button>
          ))}
        </div>

        {/* leyenda / filtro */}
        <div className={`${glass} absolute left-6 lg:left-10 bottom-6 rounded-xl px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] z-10`}>
          {LEGEND.map(([id, label]) => (
            <button key={id} onClick={() => setActiveFilter(activeFilter === id ? 'todos' : id)}
              className={`flex items-center gap-1.5 ${activeFilter !== 'todos' && activeFilter !== id ? 'opacity-40' : ''}`}>
              <i className="w-2.5 h-2.5 rounded-full" style={{ background: SECTORS[id].color }} />{label}
            </button>
          ))}
          <span className="flex items-center gap-1.5 text-slate-400"><i className="w-2.5 h-2.5 rounded-full" style={{ background: SECTORS.servicios.color }} />Servicios</span>
        </div>

        {/* controles de escenas productivas ilustrativas */}
        <div className={`${glass} absolute left-1/2 -translate-x-1/2 bottom-6 rounded-xl px-3 py-2 hidden md:flex items-center gap-2 text-[11px] z-10`}>
          <span className="text-slate-400 mr-1">Nivel {level} · {LEVEL_NAMES[level - 1]}</span>
          {SCENE_TOGGLES.map(([k, label]) => (
            <button key={k} onClick={() => setSceneOpts((o) => ({ ...o, [k]: !o[k] }))} aria-pressed={sceneOpts[k]}
              className={`px-2.5 py-1 rounded-lg border transition ${sceneOpts[k] ? 'border-teal-300/70 text-teal-200 bg-teal-300/10' : 'border-white/15 text-slate-500'}`}>{label}</button>
          ))}
          <button onClick={() => setActiveFilter('todos')} className="px-2.5 py-1 rounded-lg border border-white/15 text-slate-300 hover:bg-white/5">Todos los sectores</button>
          <button onClick={() => setSceneOpts((o) => ({ ...o, preview: !o.preview }))} aria-pressed={sceneOpts.preview}
            title="Dibuja también las escenas ilustrativas que todavía no están validadas con fuente oficial"
            className={`px-2.5 py-1 rounded-lg border transition ${sceneOpts.preview ? 'border-amber-300/80 text-amber-200 bg-amber-300/10' : 'border-white/15 text-slate-500'}`}>Vista previa ilustrativa</button>
        </div>
        {sceneOpts.preview && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[4.6rem] text-[11px] text-amber-200 bg-amber-950/80 border border-amber-700/60 rounded-lg px-3 py-1.5 pointer-events-none hidden md:block z-10">
            Vista previa: escenas ilustrativas sin validar. No son establecimientos reales ni indican cantidades.
          </div>
        )}
        {level < 3 && !picked && !sceneOpts.preview && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-20 text-[11px] text-slate-300 bg-[#07111d]/70 rounded-lg px-3 py-1.5 pointer-events-none hidden md:block z-10">
            Escenas ilustrativas: seleccioná Susques y acercate para ver las actividades
          </div>
        )}
        {picked && (
          <div className={`${glass} absolute left-1/2 -translate-x-1/2 bottom-20 w-[320px] max-w-[calc(100%-2rem)] rounded-xl p-3 text-xs z-20`}>
            <div className="flex items-center justify-between mb-2">
              <b className="text-sm">{picked.elemento}</b>
              <button onClick={() => setPicked(null)} aria-label="Cerrar"><X className="w-3.5 h-3.5" /></button>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-slate-300">
              <dt className="text-slate-500">Departamento</dt><dd>{JUJUY_DEPARTMENTS_DATA.find((d) => d.id === picked.deptId)?.name}</dd>
              <dt className="text-slate-500">Sector</dt><dd>{SECTORS[picked.sector]?.label}</dd>
              <dt className="text-slate-500">Actividad</dt><dd>{picked.actividad}</dd>
              <dt className="text-slate-500">Representación</dt><dd className="text-amber-300">{picked.tipo}</dd>
              {picked.preview && (<><dt className="text-slate-500">Estado</dt><dd className="text-amber-300">Vista previa · escena no validada</dd></>)}
              <dt className="text-slate-500">Fuente</dt><dd>{picked.validada ? picked.fuentes.join(', ') : 'Actividad sin validar con fuente oficial'}</dd>
            </dl>
            <p className="mt-2 text-[10px] text-slate-500 leading-snug">Escena ilustrativa: no representa establecimientos reales ni cantidades de trabajadores, producción o empleo. Los indicadores oficiales están en los paneles.</p>
          </div>
        )}

        {/* ficha flotante del departamento */}
        {dept && (
          <aside className={`${glass} absolute right-4 top-36 bottom-12 w-[350px] max-w-[calc(100%-2rem)] rounded-xl p-4 overflow-y-auto z-10 hidden md:flex flex-col gap-3`}>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <button onClick={() => setSelectedDeptId(null)} className="flex items-center gap-2 hover:text-white"><ArrowLeft className="w-3.5 h-3.5" /> Volver a la provincia</button>
              <button onClick={() => setSelectedDeptId(null)} aria-label="Cerrar"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex items-start justify-between gap-2">
              <div><h2 className="text-2xl font-bold leading-tight">{dept.name}</h2><p className="text-sm text-slate-400">{dept.region}</p></div>
              <span className="text-[11px] px-2.5 py-1 rounded-lg border whitespace-nowrap" style={{ color: sector.color, borderColor: sector.color + '80', background: sector.color + '1f' }}>{sector.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="border border-white/10 rounded-lg p-2.5"><div className="text-[10px] text-slate-400">Superficie</div><b>{areas[dept.id] ? `${fmt(areas[dept.id])} km²` : NA}</b></div>
              <div className="border border-white/10 rounded-lg p-2.5"><div className="text-[10px] text-slate-400">Altitud promedio</div><b>{NA}</b></div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Actividades económicas principales</h3>
              <ul className="space-y-1.5 text-[13px] text-slate-300">
                {activities.map((a) => <li key={a} className="flex gap-2"><i className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sector.color }} />{a}</li>)}
              </ul>
            </div>
            <div className="border border-white/10 rounded-lg p-2.5">
              <h3 className="text-[11px] font-semibold mb-1.5">Escenas 3D de este departamento <span className="text-amber-300 font-normal">(ilustrativas)</span></h3>
              <ul className="text-[11px] text-slate-300 space-y-1">
                {(DEPARTMENTS_CONFIG.find((c) => c.id === dept.id)?.actividades || []).map((act) => <li key={act.label} className="flex gap-2"><i className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-amber-300" />{act.label}{!act.validada && <span className="text-slate-500"> · sin validar</span>}{!SCENE_DEFS.find((d) => d.deptId === dept.id && d.actividad === act.label)?.activa && <span className="text-slate-500">{sceneOpts.preview ? ' · vista previa' : ' · escena desactivada'}</span>}</li>)}
              </ul>
            </div>
            <div className="grid grid-cols-[1.25fr_1fr] gap-2">
              <div className="border border-white/10 rounded-lg p-2.5">
                <h3 className="text-[11px] font-semibold mb-2">Participación en la serie ({LATEST})</h3>
                <div className="flex items-center gap-2">
                  <Donut parts={parts} />
                  <ul className="text-[10px] space-y-1 min-w-0">
                    {parts.map((p) => <li key={p.label} className="flex items-center gap-1 text-slate-300"><i className="w-2 h-2 rounded-sm shrink-0" style={{ background: p.color }} /><b>{partTotal ? `${Math.round((p.value / partTotal) * 100)}%` : NA}</b></li>)}
                  </ul>
                </div>
              </div>
              <div className="border border-white/10 rounded-lg p-2.5">
                <h3 className="text-[11px] font-semibold flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Empleo registrado</h3>
                <div className="text-xl font-bold mt-2">{fmt(row.empleo)}</div>
                <div className="text-[10px] text-slate-400">puestos de trabajo</div>
                <div className="text-[9px] text-amber-300/80 leading-tight mt-0.5">{LATEST} parcial · departamental · ilustrativo</div>
                {empChange !== null && <div className="text-[11px] text-teal-300 mt-1">↑ {empChange >= 0 ? '+' : ''}{empChange.toFixed(0)}% vs. 2015</div>}
              </div>
            </div>
            <button onClick={() => go('indicadores')} className="mt-auto border border-teal-300/60 text-teal-200 rounded-lg py-2 text-xs hover:bg-teal-300/10 flex items-center justify-center gap-2">
              Ver detalle del departamento <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </aside>
        )}
      </section>

      {/* INDICADORES */}
      <section id="indicadores" className="grid grid-cols-1 xl:grid-cols-[1.05fr_1.25fr_.9fr] gap-4 px-4 lg:px-6 pt-2 scroll-mt-16">
        <div className={`${card} p-4`}>
          <h3 className="text-sm font-semibold mb-3">Indicadores provinciales <span className="text-slate-400 font-normal">({LATEST})</span></h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-2">
            {[
              [TrendingUp, 'Crecimiento PBI', PROVINCIAL_TOTALS.pbiGrowth, '#2dd4bf', 'crecimiento_pbi'],
              [Globe2, 'Exportaciones', PROVINCIAL_TOTALS.totalExports, '#a855f7', 'exportaciones'],
              [Users, 'Empleo registrado', PROVINCIAL_TOTALS.totalEmployment, '#10b981', 'empleo_registrado'],
              [Layers, 'Empresas y Pymes', PROVINCIAL_TOTALS.totalSmes, '#f59e0b', 'pymes']
            ].map(([Icon, label, value, color, indId]) => {
              const meta = indicadorProvincial(indId); const pt = ultimo(meta);
              return (
                <div key={label} className="border border-white/10 rounded-lg p-3 bg-[#07111d]/60" title={`${meta.nombre} · ${meta.unidad} · escala ${meta.escala} · ${pt.anio}${pt.condicion ? ' (' + pt.condicion + ')' : ''} · ${estadoDe(meta)}`}>
                  <Icon className="w-4 h-4 mb-2" style={{ color }} />
                  <div className="text-[10px] text-slate-400">{label}</div>
                  <div className="text-lg font-bold" style={{ color }}>{value}</div>
                  <div className="text-[9px] text-slate-500 leading-tight mt-1">{pt.anio} · {pt.condicion || 'sin condición'} · {meta.escala}</div>
                  <div className="text-[9px] text-amber-300/80 leading-tight">{estadoDe(meta)}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className={`${card} p-4`}>
          <h3 className="text-sm font-semibold">Evolución de la producción por sector</h3>
          <p className="text-[10px] text-slate-400 mb-2">(Índice 2015 = 100) · {dept ? dept.name : 'Provincia'}</p>
          <LineChart rows={data.yearlyData} />
        </div>
        <div className={`${card} p-4`}>
          <h3 className="text-sm font-semibold">Empleo registrado por año</h3>
          <p className="text-[10px] text-slate-400 mb-3">{dept ? dept.name : 'Provincia'} · relativo al máximo de la serie</p>
          <div className="flex items-end justify-around gap-2 h-36">
            {data.yearlyData.map((r) => {
              const max = Math.max(...data.yearlyData.map((x) => x.empleo));
              return (
                <div key={r.year} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                  <span className="text-[10px] text-slate-300">{fmt(r.empleo)}</span>
                  <div className="w-full max-w-[34px] rounded-t" style={{ height: `${Math.max((r.empleo / max) * 100, 4) * 0.75}%`, background: r.year === LATEST ? '#2dd4bf' : '#1e6f78' }} />
                  <span className="text-[10px] text-slate-500">{r.year}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <p className="px-6 pt-4 text-[11px] text-slate-500">
        Fuentes: límites IGN / IDERA · relieve Terrain Tiles (AWS) · imágenes Esri, Maxar, Earthstar Geographics · datos económicos: ilustrativos, pendientes de fuente oficial.
      </p>

      {/* LÍNEA DE CAPÍTULOS */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#07111d]/95 backdrop-blur border-t border-white/10 px-4 lg:px-8 pt-3 pb-3 flex items-end gap-4" aria-label="Capítulos">
        <div className="hidden xl:block w-64 shrink-0 text-[11px] text-slate-400 leading-snug border-r border-white/10 pr-4">
          <b className="text-slate-200 text-xs">Recorré la historia productiva de Jujuy</b><br />Deslizá para descubrir cómo evolucionó su matriz productiva.
        </div>
        <div className="flex-1 grid grid-cols-4 lg:grid-cols-8 gap-x-2 gap-y-2">
          {CHAPTERS.map(([n, label, fn], i) => (
            <button key={n} onClick={fn} className="text-left group">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full grid place-items-center text-[10px] border ${chapter === i ? 'border-teal-300 text-teal-200 bg-teal-300/10' : 'border-white/15 text-slate-400'}`}>{n}</span>
                <span className={`text-[10px] leading-tight hidden sm:block ${chapter === i ? 'text-teal-200' : 'text-slate-400 group-hover:text-slate-200'}`}>{label}</span>
              </div>
              <div className={`h-0.5 mt-2 rounded ${i <= chapter ? 'bg-teal-300' : 'bg-white/10'}`} />
            </button>
          ))}
        </div>
      </nav>

      {showDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4" onMouseDown={(e) => e.target === e.currentTarget && setShowDoc(false)}>
          <div className="bg-[#0a1624] border border-white/15 rounded-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <h3 className="font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-teal-300" /> Fuentes y metodología</h3>
              <button onClick={() => setShowDoc(false)} aria-label="Cerrar"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              <p><b className="text-teal-300">Cobertura.</b> Matriz productiva de los 16 departamentos de Jujuy, 2015–2026. Los datos de {LATEST} son <b>parciales</b>: el año está en curso.</p>
              <p><b className="text-teal-300">Territorio.</b> Límites departamentales: IGN. La superficie se calcula a partir de esos límites. Relieve: Terrain Tiles (AWS). Imagen satelital: Esri, Maxar, Earthstar Geographics.</p>
              <p><b className="text-teal-300">Datos económicos.</b> Todos los valores son <b>ilustrativos y sin fuente verificada</b>. Cada indicador declara unidad, escala geográfica (departamental o provincial, nunca mezcladas), año y condición (observado, estimado o parcial) en <code>src/data/indicators.js</code>. Altitud y población figuran como “No disponible”.</p>
              <p><b className="text-teal-300">Escenas 3D.</b> Son representaciones ilustrativas: no son establecimientos reales ni indican cantidades de trabajadores, producción o empleo. Sólo está activa la escena de Susques; las demás se activan únicamente cuando su actividad esté validada con fuente. El interruptor «Vista previa ilustrativa» (apagado por defecto) permite ver las escenas no validadas, rotuladas como tales.</p>
              <div>
                <b className="text-teal-300">Fuentes oficiales candidatas</b> <span className="text-slate-500">(ninguna consultada todavía)</span>
                <ul className="mt-1 space-y-0.5">{FUENTES_CANDIDATAS.map((f) => <li key={f.id} className="flex gap-2"><i className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-slate-500" />{f.organismo} <span className="text-slate-500">· {f.accedida ? 'consultada' : 'sin consultar'}</span></li>)}</ul>
              </div>
              <div>
                <b className="text-teal-300">Conciliación provincial vs. suma departamental</b>
                <table className="w-full mt-1 text-[11px]"><thead className="text-slate-500"><tr><th className="text-left font-normal">Indicador</th><th className="text-right font-normal">Año</th><th className="text-right font-normal">Provincial</th><th className="text-right font-normal">Suma 16 dptos.</th><th className="text-right font-normal">Dif.</th></tr></thead>
                  <tbody>{conciliacion().filter((f) => f.id === 'empleo_registrado' || f.id === 'participacion_pbi' || f.id === 'exportaciones' || f.id === 'pymes').map((f) => (
                    <tr key={f.id + f.anio} className={f.concilia ? '' : 'text-amber-200'}><td>{f.nombre}</td><td className="text-right">{f.anio}</td><td className="text-right">{f.provincial.toLocaleString('es-AR')}</td><td className="text-right">{f.sumaDeptos.toLocaleString('es-AR')}</td><td className="text-right">{f.diferencia > 0 ? '+' : ''}{f.diferencia.toLocaleString('es-AR')}</td></tr>))}</tbody></table>
                <p className="mt-1 text-slate-500">Los totales provinciales fueron cargados a mano y no se calculan sumando departamentos; la diferencia cambia de signo según el año, por lo que no se explica por empleo “no asignado”. No se corrigieron: se resuelve al incorporar la fuente oficial.</p>
              </div>
              {controlCrecimiento().some((c) => !c.coincide) && (
                <p><b className="text-teal-300">Control de coherencia.</b> El crecimiento de empleo declarado no coincide con el calculado desde la serie en: {controlCrecimiento().filter((c) => !c.coincide).map((c) => `${JUJUY_DEPARTMENTS_DATA.find((d) => d.id === c.deptId)?.name} (${c.declarado}% vs ${c.calculado}%)`).join(', ')}.</p>
              )}
            </div>
            <button onClick={() => setShowDoc(false)} className="mt-5 ml-auto block border border-teal-500/60 text-teal-200 px-4 py-2 rounded-lg text-xs hover:bg-teal-500/10">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
