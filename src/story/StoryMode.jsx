import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { CHAPTERS, buildBlocks, estadoMapa, SECTOR_COLOR, fmtNum } from './storyData';
import { ChartCard, Kpi } from './StoryCharts';
import ChapterGallery from './ChapterGallery';
import { useIsDesktop } from './hooks';

const LEYENDA = [['agro', 'Agroindustria'], ['mineril', 'Minería y litio'], ['turismo', 'Turismo'], ['servicios', 'Servicios']];

// Modo historia: narrativa que se desplaza a la derecha (o debajo del mapa en celular) y dirige el mapa único de la aplicación.
export default function StoryMode({ mapRef, areas, reducedMotion, onStoryState, onExplore, onActive }) {
  const desktop = useIsDesktop();
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const refs = useRef([]);

  // capítulo activo = el último cuya parte superior ya pasó la «línea de lectura»
  useEffect(() => {
    let raf = 0;
    const calc = () => {
      raf = 0;
      const vh = window.innerHeight, mapBottom = desktop ? 56 : 56 + vh * 0.42, line = desktop ? vh * 0.5 : mapBottom + (vh - mapBottom) * 0.4;
      let idx = 0; refs.current.forEach((el, i) => { if (el && el.getBoundingClientRect().top <= line) idx = i; });
      setActive((p) => (p === idx ? p : idx));
      const max = document.documentElement.scrollHeight - vh; setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(calc); };
    calc(); window.addEventListener('scroll', on, { passive: true }); window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); };
  }, [desktop]);

  // al cambiar de capítulo: estado del mapa + cámara (una sola vez por cambio; reversible al volver hacia arriba)
  const ch = CHAPTERS[active];
  useEffect(() => {
    onStoryState(estadoMapa(ch));
    mapRef.current?.applyCamera(ch.camera);
    onActive?.(ch.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reducedMotion]);
  useEffect(() => () => { onStoryState(null); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const blocks = useMemo(() => Object.fromEntries(CHAPTERS.map((c) => [c.id, buildBlocks(c.id, { areas })])), [areas]);
  const go = (i) => refs.current[i]?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });

  return (
    <>
      <div className="fixed left-0 top-14 z-40 h-0.5 bg-teal-300" style={{ width: `${progress * 100}%` }} aria-hidden="true" />
      <div className="sr-only" aria-live="polite">Capítulo {ch.number}: {ch.title}</div>

      {/* superposiciones sobre el mapa */}
      <div className="pointer-events-none fixed left-0 top-14 z-30 h-[42vh] w-full lg:h-[calc(100vh-3.5rem)] lg:w-[64%]">
        <div className="absolute left-3 top-3 rounded-lg border border-white/15 bg-[#07111d]/85 px-3 py-1.5 text-[11px] text-slate-200 backdrop-blur">Capítulo {ch.number} de 07 · <b className="text-teal-200">{ch.short}</b></div>
        {ch.map.intensityFrom === 'empleo' ? (
          <div className="absolute bottom-3 left-3 hidden rounded-lg border border-white/15 bg-[#07111d]/85 px-3 py-2 text-[10px] text-slate-300 backdrop-blur sm:block">
            <div className="mb-1">Intensidad = empleo registrado 2026 (departamental, parcial · datos ilustrativos)</div>
            <div className="flex items-center gap-2"><span>menor</span><span className="h-2 w-28 rounded" style={{ background: 'linear-gradient(90deg, rgba(45,212,191,.2), rgba(45,212,191,.85))' }} /><span>mayor</span></div>
          </div>
        ) : (
          <ul className="absolute bottom-14 left-3 hidden gap-3 rounded-lg border border-white/15 bg-[#07111d]/85 px-3 py-1.5 text-[10px] text-slate-300 backdrop-blur sm:flex">
            {LEYENDA.map(([k, l]) => <li key={k} className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: SECTOR_COLOR[k] }} />{l}</li>)}
          </ul>
        )}
        {ch.map.previewIds?.length > 0 && <div className="absolute left-3 top-14 hidden rounded-lg border border-amber-400/50 bg-amber-950/80 px-2.5 py-1 text-[10px] text-amber-200 sm:block">Escena solar: representación ilustrativa</div>}
      </div>

      {/* riel de progreso: clic para navegar */}
      <nav aria-label="Capítulos de la historia" className="fixed right-0.5 top-1/2 z-40 flex -translate-y-1/2 flex-col lg:right-2">
        {CHAPTERS.map((c, i) => (
          <button key={c.id} onClick={() => go(i)} aria-label={`Capítulo ${c.number}: ${c.short}`} aria-current={i === active ? 'step' : undefined} data-rail={c.id} className="group relative flex items-center justify-end p-2">
            <span className="pointer-events-none absolute right-7 hidden whitespace-nowrap rounded bg-[#07111d]/95 px-2 py-1 text-[10px] text-slate-200 group-hover:block group-focus-visible:block">{c.number} · {c.short}</span>
            <span className={`block rounded-full transition-all ${i === active ? 'h-3 w-3 bg-teal-300 shadow-[0_0_0_4px_rgba(94,234,212,.25)]' : 'h-2 w-2 bg-white/30'}`} />
          </button>
        ))}
      </nav>

      {/* narrativa */}
      <main id="story" className="relative z-10 pt-[42vh] lg:ml-[64%] lg:w-[36%] lg:pt-0">
        {CHAPTERS.map((c, i) => {
          const b = blocks[c.id];
          return (
            <section key={c.id} id={`cap-${c.id}`} data-chapter={c.id} data-active={i === active} ref={(el) => (refs.current[i] = el)} aria-labelledby={`titulo-${c.id}`}
              className={`flex min-h-[80vh] scroll-mt-[calc(42vh+3.5rem)] flex-col justify-center gap-4 px-5 py-14 transition-opacity duration-500 lg:min-h-screen lg:scroll-mt-14 lg:px-8 ${i === active ? 'opacity-100' : 'opacity-70'}`}>
              {i === 0 && (
                <div className="mb-2">
                  <p className="text-[11px] uppercase tracking-[.2em] text-teal-300">Jujuy Data Lab · 2015–2026</p>
                  <p className="mt-1 text-sm text-slate-300">Matriz Productiva Departamental de Jujuy: Transformación Territorial y Generación de Nuevas Actividades Económicas</p>
                </div>
              )}
              <p className="text-[11px] uppercase tracking-[.18em] text-teal-300">{c.kicker}</p>
              <h2 id={`titulo-${c.id}`} className="text-2xl font-extrabold leading-tight tracking-tight lg:text-[30px]">{c.title}</h2>
              {c.text.map((t) => <p key={t} className="text-[15px] leading-relaxed text-slate-300">{t}</p>)}

              {b.kpis.length > 0 && <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{b.kpis.map((k) => <Kpi key={k.label} k={k} />)}</div>}
              {b.facts?.length > 0 && <ul className="space-y-1 text-[12px] text-slate-300">{b.facts.map((f) => <li key={f}>• {f}</li>)}</ul>}
              {b.charts.map((chart) => <ChartCard key={chart.title} chart={chart} />)}
              {b.summary && (
                <ul className="space-y-2" aria-label="Síntesis de los principales cambios observados">
                  {b.summary.map((s) => (
                    <li key={s.label} className="rounded-xl border border-white/10 bg-[#0a1624] p-3 text-[13px] text-slate-200">
                      <b>{s.label}</b>: de {fmtNum(s.desde)} a {fmtNum(s.hasta)}{s.delta ? <span className="text-teal-300"> ({s.delta.pct >= 0 ? '+' : ''}{s.delta.pct.toFixed(0)}% {s.delta.desde}–{s.delta.hasta}{s.delta.parcial ? ', 2026 parcial' : ''})</span> : null}
                    </li>
                  ))}
                </ul>
              )}
              {b.note && <p className="text-[11px] leading-snug text-slate-500">{b.note}</p>}
              <ChapterGallery slug={c.slug} extraSlugs={c.extraSlugs} />
              {c.id === 'futuro' && (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button onClick={onExplore} className="flex items-center gap-2 rounded-lg bg-teal-400 px-5 py-3 text-sm font-bold text-[#04141c] hover:bg-teal-300">EXPLORAR LOS DATOS <ArrowRight className="h-4 w-4" /></button>
                  <button onClick={() => go(0)} className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-200">Volver al inicio de la historia</button>
                </div>
              )}
            </section>
          );
        })}
        <div className="px-5 pb-24 text-[11px] text-slate-500 lg:px-8">Datos económicos ilustrativos, pendientes de fuente oficial. Límites: IGN / IDERA.</div>
      </main>
    </>
  );
}
