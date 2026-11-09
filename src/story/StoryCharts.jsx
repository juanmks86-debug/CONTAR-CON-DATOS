import React from 'react';
import { fmtNum } from './storyData';

// Ámbito geográfico siempre visible: provincial y departamental nunca se mezclan sin rótulo.
const SCALE = { provincial: 'border-sky-400/50 text-sky-200 bg-sky-400/10', departamental: 'border-violet-400/50 text-violet-200 bg-violet-400/10' };
export const ScopeBadge = ({ scale, text }) => (
  <span data-scale={scale} className={`inline-block text-[10px] leading-tight px-2 py-0.5 rounded-full border ${SCALE[scale] || SCALE.departamental}`}>{text}</span>
);

const pct = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`;
const compact = (v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(Math.abs(v) >= 10000 ? 0 : 1)}k` : String(Math.round(v)));

export function Kpi({ k }) {
  if (k.value === undefined) return <div className="rounded-xl border border-white/10 bg-white/5 p-3 min-h-[92px] motion-safe:animate-pulse" role="status" aria-label="Calculando" />;
  if (k.value === null) {
    return (
      <div data-kpi="no-disponible" className="rounded-xl border border-dashed border-white/20 bg-white/[.03] p-3">
        <div className="text-[11px] uppercase tracking-wide text-slate-400">{k.label}</div>
        <div className="mt-1 text-sm font-semibold text-slate-200">Información no disponible</div>
        <div className="mt-1 text-[10px] leading-snug text-slate-500">{k.reason}</div>
        <div className="mt-2"><ScopeBadge scale={k.scale} text={k.scopeText} /></div>
      </div>
    );
  }
  return (
    <div data-kpi="dato" className="rounded-xl border border-white/10 bg-[#0a1624] p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{k.label}</div>
      <div className="mt-1 text-xl font-bold text-slate-50">{fmtNum(k.value)} <span className="text-[11px] font-normal text-slate-400">{k.unit}</span></div>
      {k.delta && <div className="text-[11px] text-teal-300">{k.delta.pct >= 0 ? '↑' : '↓'} {pct(k.delta.pct)} {k.delta.desde}–{k.delta.hasta}{k.delta.parcial ? ' (parcial)' : ''}</div>}
      <div className="mt-1.5"><ScopeBadge scale={k.scale} text={k.scopeText} /></div>
      <div className="mt-1.5 text-[10px] leading-snug text-slate-500">
        {k.year ? `${k.year}${k.condition ? ` · ${k.condition}` : ''} · ` : ''}Fuente: {k.source || 'pendiente de validación'}
      </div>
      {!k.validated && <div className="mt-1 text-[10px] text-amber-300/90">Ilustrativo · sin fuente verificada</div>}
    </div>
  );
}

function LineChartS({ chart }) {
  const W = 360, H = 176, L = 40, R = 10, T = 10, B = 24;
  const all = chart.series.flatMap((s) => s.points);
  const xs = [...new Set(all.map((p) => p.x))].sort((a, b) => a - b);
  const x0 = xs[0], x1 = xs[xs.length - 1], max = Math.max(...all.map((p) => p.y), 1) * 1.08;
  const X = (v) => L + ((v - x0) / (x1 - x0 || 1)) * (W - L - R), Y = (v) => T + (1 - v / max) * (H - T - B);
  const summary = chart.series.map((s) => `${s.label}: ${fmtNum(s.points[0].y)} en ${s.points[0].x} y ${fmtNum(s.points.at(-1).y)} en ${s.points.at(-1).x}`).join('; ');
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${chart.title}. ${summary}`}>
        {[0, 1, 2, 3].map((i) => <g key={i}><line x1={L} x2={W - R} y1={Y((max / 3) * i)} y2={Y((max / 3) * i)} stroke="#ffffff14" /><text x={L - 5} y={Y((max / 3) * i) + 3} textAnchor="end" fontSize="8" fill="#6b8296">{compact((max / 3) * i)}</text></g>)}
        {xs.map((v) => <text key={v} x={X(v)} y={H - 7} textAnchor="middle" fontSize="8" fill="#6b8296">{v}</text>)}
        {chart.series.map((s) => {
          const solid = s.points.filter((p, i) => !(p.partial && i === s.points.length - 1));
          const last = s.points.at(-1), prev = s.points.at(-2);
          return (
            <g key={s.label}>
              <polyline fill="none" stroke={s.color} strokeWidth="2" points={solid.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')} />
              {last.partial && prev && <line x1={X(prev.x)} y1={Y(prev.y)} x2={X(last.x)} y2={Y(last.y)} stroke={s.color} strokeWidth="2" strokeDasharray="4 3" />}
              {s.points.map((p) => <circle key={p.x} cx={X(p.x)} cy={Y(p.y)} r="2.6" fill={p.partial ? '#07111d' : s.color} stroke={s.color} strokeWidth="1.5" />)}
            </g>
          );
        })}
      </svg>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-300">
        {chart.series.map((s) => <li key={s.label} className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}</li>)}
        <li className="text-slate-500">○ y línea punteada: 2026 parcial</li>
      </ul>
    </div>
  );
}

function BarsChart({ chart }) {
  const max = Math.max(...chart.items.map((i) => Math.abs(i.value)), 1);
  const f = (v) => (chart.format === 'pct' ? pct(v) : fmtNum(v));
  return (
    <ul className="space-y-1.5" aria-label={chart.title}>
      {chart.items.map((it) => (
        <li key={it.label} className="grid grid-cols-[104px_1fr_58px] items-center gap-2 text-[11px]">
          <span className="truncate text-slate-300" title={it.label}>{it.label}</span>
          <span className="h-2.5 rounded bg-white/5"><span className="block h-full rounded" style={{ width: `${Math.max(2, (Math.abs(it.value) / max) * 100)}%`, background: it.color }} /></span>
          <span className="text-right tabular-nums text-slate-200">{f(it.value)}</span>
        </li>
      ))}
    </ul>
  );
}

function StackChart({ chart }) {
  return (
    <div className="space-y-3">
      {chart.rows.map((row) => {
        const total = row.segments.reduce((t, s) => t + s.value, 0) || 1;
        return (
          <div key={row.label}>
            <div className="mb-1 text-[11px] text-slate-300">{row.label} <span className="text-slate-500">· total {fmtNum(total)}</span></div>
            <div className="flex h-3 overflow-hidden rounded" role="img" aria-label={`${row.label}: ${row.segments.map((s) => `${s.label} ${((s.value / total) * 100).toFixed(0)}%`).join(', ')}`}>
              {row.segments.map((s) => <span key={s.label} title={`${s.label}: ${fmtNum(s.value)}`} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />)}
            </div>
            <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-400">{row.segments.map((s) => <li key={s.label} className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm" style={{ background: s.color }} />{s.label} {((s.value / total) * 100).toFixed(0)}%</li>)}</ul>
          </div>
        );
      })}
    </div>
  );
}

export function ChartCard({ chart }) {
  return (
    <figure data-chart={chart.type} data-scale={chart.scale} className="m-0 rounded-xl border border-white/10 bg-[#0a1624] p-3">
      <figcaption className="mb-2">
        <div className="text-[13px] font-semibold leading-snug text-slate-100">{chart.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2"><ScopeBadge scale={chart.scale} text={chart.scopeText} /><span className="text-[10px] text-slate-500">{chart.unit}</span></div>
      </figcaption>
      {chart.type === 'line' && <LineChartS chart={chart} />}
      {chart.type === 'bars' && <BarsChart chart={chart} />}
      {chart.type === 'stack' && <StackChart chart={chart} />}
      {chart.note && <p className="mt-2 text-[10px] leading-snug text-slate-500">{chart.note}</p>}
      <p className="mt-2 text-[10px] text-slate-500">Fuente: {chart.source || 'pendiente de validación'}{chart.source ? '' : ' · datos ilustrativos'}</p>
    </figure>
  );
}
