import React, { useMemo, useState } from 'react';
import { ArrowLeft, Mountain, X } from 'lucide-react';
import MapaJujuy from './MapaJujuy';
import { JUJUY_DEPARTMENTS_DATA } from './data';
import { DEPARTMENTS_CONFIG } from './config/departmentsConfig';

const SECTORS = {
  mineril:   { label: 'Minería y litio',     color: '#a855f7' },
  agro:      { label: 'Agroindustria',       color: '#10b981' },
  turismo:   { label: 'Turismo y servicios', color: '#f59e0b' },
  servicios: { label: 'Servicios',           color: '#0ea5e9' }
};
const SCENE_TOGGLES = [['people', 'Personas'], ['vehicles', 'Vehículos'], ['facilities', 'Fábricas e instalaciones'], ['animate', 'Animaciones']];
const glass = 'bg-[#07111d]/85 border border-white/12 backdrop-blur-md';

export default function App() {
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('todos');
  const [view3d, setView3d] = useState(true);
  const [sceneOpts, setSceneOpts] = useState({ people: true, vehicles: true, facilities: true, animate: true, preview: true });

  const mapDepartments = useMemo(() => JUJUY_DEPARTMENTS_DATA.map((d) => ({
    ...d, color: SECTORS[d.sector].color, sector: d.sector === 'servicios' ? 'turismo' : d.sector
  })), []);

  const dept = JUJUY_DEPARTMENTS_DATA.find((d) => d.id === selectedDeptId);
  const sector = dept ? SECTORS[dept.sector] : null;
  const LEGEND = [['agro', 'Agroindustria'], ['mineril', 'Minería y litio'], ['turismo', 'Turismo y servicios']];

  return (
    <div className="h-screen w-screen relative bg-[#050d17] text-slate-100 overflow-hidden">
      <MapaJujuy departments={mapDepartments} selectedDeptId={selectedDeptId} activeFilter={activeFilter}
        onSelect={setSelectedDeptId} view3d={view3d} scenes={sceneOpts} />

      <header className={`${glass} absolute top-4 left-4 z-10 rounded-xl px-4 py-2.5 flex items-center gap-2 font-bold tracking-wide`}>
        <Mountain className="w-5 h-5 text-teal-300" /> <span>JUJUY <span className="text-teal-300">MAPA 3D</span></span>
      </header>

      <div className={`${glass} absolute left-4 bottom-20 hidden md:flex flex-col rounded-xl overflow-hidden text-xs z-10`}>
        {[[true, '3D'], [false, '2D']].map(([v, l]) => (
          <button key={l} onClick={() => setView3d(v)} className={`px-4 py-2.5 ${view3d === v ? 'bg-teal-400 text-[#04141c] font-bold' : 'text-slate-300 hover:bg-white/5'}`}>{l}</button>
        ))}
      </div>

      <div className={`${glass} absolute left-4 bottom-4 rounded-xl px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] z-10`}>
        {LEGEND.map(([id, label]) => (
          <button key={id} onClick={() => setActiveFilter(activeFilter === id ? 'todos' : id)}
            className={`flex items-center gap-1.5 ${activeFilter !== 'todos' && activeFilter !== id ? 'opacity-40' : ''}`}>
            <i className="w-2.5 h-2.5 rounded-full" style={{ background: SECTORS[id].color }} />{label}
          </button>
        ))}
      </div>

      <div className={`${glass} absolute left-1/2 -translate-x-1/2 bottom-4 rounded-xl px-3 py-2 hidden md:flex items-center gap-2 text-[11px] z-10`}>
        {SCENE_TOGGLES.map(([k, label]) => (
          <button key={k} onClick={() => setSceneOpts((o) => ({ ...o, [k]: !o[k] }))} aria-pressed={sceneOpts[k]}
            className={`px-2.5 py-1 rounded-lg border transition ${sceneOpts[k] ? 'border-teal-300/70 text-teal-200 bg-teal-300/10' : 'border-white/15 text-slate-500'}`}>{label}</button>
        ))}
        <button onClick={() => setActiveFilter('todos')} className="px-2.5 py-1 rounded-lg border border-white/15 text-slate-300 hover:bg-white/5">Todos</button>
      </div>

      {dept && (
        <aside className={`${glass} absolute right-4 top-4 w-[300px] max-w-[calc(100%-2rem)] rounded-xl p-4 z-10 flex flex-col gap-3`}>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <button onClick={() => setSelectedDeptId(null)} className="flex items-center gap-2 hover:text-white"><ArrowLeft className="w-3.5 h-3.5" /> Volver a la provincia</button>
            <button onClick={() => setSelectedDeptId(null)} aria-label="Cerrar"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex items-start justify-between gap-2">
            <div><h2 className="text-2xl font-bold leading-tight">{dept.name}</h2><p className="text-sm text-slate-400">{dept.region}</p></div>
            <span className="text-[11px] px-2.5 py-1 rounded-lg border whitespace-nowrap" style={{ color: sector.color, borderColor: sector.color + '80', background: sector.color + '1f' }}>{sector.label}</span>
          </div>
          <ul className="space-y-1.5 text-[13px] text-slate-300">
            {(DEPARTMENTS_CONFIG.find((c) => c.id === dept.id)?.actividades || []).map((act) => (
              <li key={act.label} className="flex gap-2"><i className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sector.color }} />{act.label}</li>
            ))}
          </ul>
        </aside>
      )}

    </div>
  );
}
