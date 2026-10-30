import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Compass,
  FileText,
  Filter,
  Globe2,
  Info,
  Layers,
  Pickaxe,
  RotateCcw,
  Users,
  Wheat,
  X
} from 'lucide-react';
import MapaJujuy from './MapaJujuy';
import { JUJUY_DEPARTMENTS_DATA, PROVINCIAL_TOTALS } from './data';

const FILTERS = [
  { id: 'todos', label: 'Todos', count: '16', Icon: Layers, iconCls: 'text-cyan-300', on: 'filter-on-all' },
  { id: 'mineril', label: 'Minería / litio', count: '5', Icon: Pickaxe, iconCls: 'text-violet-300', on: 'filter-on-mining' },
  { id: 'agro', label: 'Agroindustria', count: '5', Icon: Wheat, iconCls: 'text-emerald-300', on: 'filter-on-agro' },
  { id: 'turismo', label: 'Turismo', count: '4', Icon: Compass, iconCls: 'text-amber-300', on: 'filter-on-tourism' }
];

const TABS = [
  { id: 'evolucion', label: 'Producción', Icon: BarChart3 },
  { id: 'empleo', label: 'Empleo registrado', Icon: Users },
  { id: 'comparacion', label: 'Departamentos', Icon: Layers }
];

const PRODUCTION_SERIES = [
  ['litio', 'Litio y minería', 'bar-mining', 'tooltip-mining'],
  ['agro', 'Agroindustria', 'bar-agro', 'tooltip-agro'],
  ['turismo', 'Turismo y servicios', 'bar-tourism', 'tooltip-tourism']
];
const FILTER_TO_SERIES = { mineril: 'litio', agro: 'agro', turismo: 'turismo' };

const chapterLinks = [
  ['top', '01', 'La matriz'],
  ['territorio', '02', 'Distribución territorial'],
  ['evolucion', '03', 'Evolución económica'],
  ['mineria', '04', 'Minería y litio'],
  ['agroindustria', '05', 'Agroindustria'],
  ['turismo-servicios', '06', 'Turismo y servicios'],
  ['empleo-desarrollo', '07', 'Empleo y desarrollo'],
  ['conclusiones', '08', 'Conclusiones']
];

function MetricCard({ label, value, tone = 'cyan' }) {
  return (
    <div className={`editorial-metric tone-${tone}`}>
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );
}

const latestOf = (data) => data?.yearlyData?.[data.yearlyData.length - 1];
const availableValue = (value, suffix = '') => value !== undefined && value !== null && value !== '' ? `${value}${suffix}` : 'No disponible';
const percentageOf = (value, total) => total > 0 ? `${((value / total) * 100).toFixed(1)}%` : 'No disponible';

const SECTOR_SECTIONS = [
  {
    id: 'mineria', number: 'A', title: 'Minería y litio', filterId: 'mineril', series: 'litio', tone: 'mining',
    intro: 'Esta vista reúne la evolución de la serie de litio y minería y la distribución territorial de los departamentos identificados con ese eje productivo en la base actual.',
    matches: (department) => department.sector === 'mineril', unit: 'k Tn'
  },
  {
    id: 'agroindustria', number: 'B', title: 'Agroindustria', filterId: 'agro', series: 'agro', tone: 'agro',
    intro: 'Esta vista permite seguir la serie de agroindustria y comparar los departamentos clasificados con ese eje productivo dentro de la matriz disponible.',
    matches: (department) => department.sector === 'agro', unit: 'k Tn'
  },
  {
    id: 'turismo-servicios', number: 'C', title: 'Turismo y servicios', filterId: 'turismo', series: 'turismo', tone: 'tourism',
    intro: 'Esta vista reúne la serie de turismo y servicios y ordena los departamentos vinculados con turismo o servicios para facilitar su comparación territorial.',
    matches: (department) => department.sector === 'turismo' || department.sector === 'servicios', unit: 'k Serv'
  }
];

function SectorSection({ config, onExplore, onSelectDepartment }) {
  const provinceSeries = PROVINCIAL_TOTALS.yearlyData;
  const latestProvince = latestOf(PROVINCIAL_TOTALS)?.[config.series] ?? null;
  const departments = JUJUY_DEPARTMENTS_DATA
    .filter(config.matches)
    .map((department) => ({ ...department, latest: latestOf(department)?.[config.series] ?? null }))
    .filter((department) => department.latest !== null)
    .sort((a, b) => b.latest - a.latest);
  const maxHistory = Math.max(1, ...provinceSeries.map((year) => year[config.series] ?? 0));
  const maxDepartment = Math.max(1, ...departments.map((department) => department.latest));
  const totalLatest = latestOf(PROVINCIAL_TOTALS);
  const allLatest = totalLatest ? totalLatest.litio + totalLatest.agro + totalLatest.turismo : 0;
  const sectorShare = latestProvince === null ? 'No disponible' : percentageOf(latestProvince, allLatest);

  return (
    <section id={config.id} className={`sector-section sector-${config.tone}`}>
      <div className="sector-intro">
        <div><span className="section-number">{config.number} / SECTOR</span><h3>{config.title}</h3></div>
        <div><p>{config.intro}</p><button className="sector-action" onClick={() => onExplore(config.filterId)}>Explorar este eje <ChevronDown size={14} /></button></div>
      </div>
      <div className="sector-indicators">
        <MetricCard label="Último valor provincial" value={latestProvince === null ? 'No disponible' : `${latestProvince} ${config.unit}`} tone={config.tone === 'mining' ? 'violet' : config.tone === 'agro' ? 'green' : 'amber'} />
        <MetricCard label="Participación de la serie" value={sectorShare} tone="cyan" />
        <MetricCard label="Departamentos en foco" value={departments.length || 'No disponible'} tone="amber" />
        <MetricCard label="Último año" value={latestOf(PROVINCIAL_TOTALS)?.year || 'No disponible'} tone="green" />
      </div>
      <div className="sector-grid">
        <div className="sector-panel">
          <div className="sector-panel-heading"><span>Evolución histórica</span><small>Serie provincial · 2015—2026</small></div>
          <div className="sector-history">
            {provinceSeries.map((year) => <div className="sector-year" key={year.year}><div className={`sector-bar bar-${config.tone}`} style={{ height: `${Math.max(((year[config.series] ?? 0) / maxHistory) * 100, 4)}%` }} /><span>{year.year}</span><b>{year[config.series] ?? 'No disponible'}</b></div>)}
          </div>
          <p className="sector-footnote">La escala representa la serie disponible para este eje; no se agregan años que no estén presentes en la base.</p>
        </div>
        <div className="sector-panel">
          <div className="sector-panel-heading"><span>Distribución territorial</span><small>Comparación del último año</small></div>
          <div className="sector-ranking">
            {departments.map((department, index) => <button className="sector-rank-row" key={department.id} onClick={() => onSelectDepartment(department.id)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{department.name}</strong><i><em className={`bar-${config.tone}`} style={{ width: `${Math.max((department.latest / maxDepartment) * 100, 4)}%` }} /></i><b>{department.latest} {config.unit}</b></button>)}
            {!departments.length && <p className="sector-unavailable">No hay departamentos disponibles para este eje en la base actual.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('todos');
  const [activeTab, setActiveTab] = useState('evolucion');
  const [showDocModal, setShowDocModal] = useState(false);

  const selectedData = useMemo(() => {
    if (!selectedDeptId) return PROVINCIAL_TOTALS;
    return JUJUY_DEPARTMENTS_DATA.find((d) => d.id === selectedDeptId) || PROVINCIAL_TOTALS;
  }, [selectedDeptId]);

  const activeSeriesKeys = activeFilter === 'todos' ? PRODUCTION_SERIES.map(([key]) => key) : [FILTER_TO_SERIES[activeFilter]];
  const maxProd = useMemo(
    () => Math.max(1, ...selectedData.yearlyData.flatMap((y) => activeSeriesKeys.map((key) => y[key]))),
    [selectedData, activeFilter]
  );
  const maxEmpleo = useMemo(
    () => Math.max(1, ...selectedData.yearlyData.map((y) => y.empleo)),
    [selectedData]
  );

  const isProvince = !selectedDeptId;
  const headlineLabel = isProvince ? 'Panorama provincial' : `${selectedData.region} · ${selectedData.sector}`;
  const selectedLatest = latestOf(selectedData);
  const provincialLatest = latestOf(PROVINCIAL_TOTALS);
  const sectorTotal = selectedLatest ? selectedLatest.litio + selectedLatest.agro + selectedLatest.turismo : 0;
  const sectorParticipation = selectedLatest ? [
    ['Litio y minería', selectedLatest.litio, 'bar-mining'],
    ['Agroindustria', selectedLatest.agro, 'bar-agro'],
    ['Turismo y servicios', selectedLatest.turismo, 'bar-tourism']
  ] : [];
  const provincialAverageEmployment = provincialLatest ? provincialLatest.empleo / JUJUY_DEPARTMENTS_DATA.length : 0;
  const employmentVsAverage = selectedLatest && provincialAverageEmployment > 0
    ? ((selectedLatest.empleo / provincialAverageEmployment) - 1) * 100
    : null;
  const comparisonKey = FILTER_TO_SERIES[activeFilter] || 'empleo';
  const comparisonLabel = activeFilter === 'todos' ? 'Empleo registrado' : PRODUCTION_SERIES.find(([key]) => key === comparisonKey)?.[1];
  const comparisonData = useMemo(() => JUJUY_DEPARTMENTS_DATA
    .map((department) => ({ id: department.id, name: department.name, value: latestOf(department)?.[comparisonKey] ?? null }))
    .filter((department) => department.value !== null)
    .sort((a, b) => b.value - a.value), [comparisonKey]);
  const maxComparison = Math.max(1, ...comparisonData.map((department) => department.value));

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const exploreSector = (filterId) => { setActiveFilter(filterId); scrollTo('territorio'); };
  const selectSectorDepartment = (departmentId) => { setSelectedDeptId(departmentId); scrollTo('evolucion'); };
  const firstEmployment = PROVINCIAL_TOTALS.yearlyData[0]?.empleo;
  const latestEmployment = latestOf(PROVINCIAL_TOTALS)?.empleo;
  const employmentChange = firstEmployment && latestEmployment ? ((latestEmployment / firstEmployment) - 1) * 100 : null;

  return (
    <div className="site-shell min-h-screen bg-[#061116] text-slate-100 selection:bg-cyan-300 selection:text-[#061116]">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="grain" />
      <nav className="chapter-sidebar" aria-label="Capítulos de la exploración">
        <span className="chapter-sidebar-label">Capítulos</span>
        {chapterLinks.map(([id, number, label]) => <button key={id} onClick={() => scrollTo(id)} title={label}><i>{number}</i><span>{label}</span></button>)}
      </nav>

      <header className="site-header">
        <button className="brand-lockup" onClick={() => scrollTo('top')} aria-label="Volver al inicio">
          <span className="brand-mark"><Globe2 size={18} strokeWidth={1.8} /></span>
          <span><b>JUJUY</b><small>matriz productiva</small></span>
        </button>
        <nav className="chapter-nav" aria-label="Navegación principal">
          {chapterLinks.map(([id, number, label]) => (
            <button key={id} onClick={() => scrollTo(id)}><i>{number}</i>{label}</button>
          ))}
        </nav>
        <button className="header-document" onClick={() => setShowDocModal(true)}>
          <FileText size={15} /> <span>Memoria descriptiva</span>
        </button>
      </header>

      <main id="top" className="editorial-main">
        <section className="intro-section">
          <div className="intro-copy">
            <p className="kicker"><span className="live-dot" /> Periodismo de datos · Jujuy · 2015—2026</p>
            <h1>JUJUY: EL MAPA DE SU<br /><em>TRANSFORMACIÓN PRODUCTIVA</em></h1>
            <p className="intro-deck">
              Una exploración territorial de la evolución económica, productiva y laboral de los 16 departamentos de Jujuy durante el período 2015–2026.
            </p>
            <p className="intro-context">Esta plataforma convierte la matriz productiva provincial en una experiencia de lectura: compara territorios, identifica especializaciones y sigue los cambios de cada departamento.</p>
            <div className="intro-actions">
              <button className="primary-action" onClick={() => scrollTo('territorio')}>Acceder a la exploración <ChevronDown size={16} /></button>
              <span className="intro-note">Mapa interactivo · 16 departamentos</span>
            </div>
          </div>
          <div className="intro-index" aria-label="Índice de la investigación">
            <span className="index-line" />
            <p><b>01</b> La matriz<br />productiva</p>
            <p><b>02</b> Distribución<br />territorial</p>
            <p><b>03</b> Evolución<br />económica</p>
          </div>
        </section>

        <section className="snapshot-strip" aria-label="Resumen provincial">
          <div className="snapshot-heading"><span>Lectura rápida</span><small>Provincia de Jujuy</small></div>
          <MetricCard label="Empleo registrado" value={PROVINCIAL_TOTALS.totalEmployment} tone="cyan" />
          <MetricCard label="Exportaciones est." value={PROVINCIAL_TOTALS.totalExports} tone="violet" />
          <MetricCard label="Red de Pymes" value={PROVINCIAL_TOTALS.totalSmes} tone="amber" />
          <MetricCard label="Crecimiento PBI" value={PROVINCIAL_TOTALS.pbiGrowth} tone="green" />
        </section>

        <section id="territorio" className="chapter-section territory-section">
          <div className="section-heading">
            <span className="section-number">02 / DISTRIBUCIÓN TERRITORIAL</span>
            <h2>La economía no se distribuye<br /><em>de manera uniforme.</em></h2>
            <p>Selecciona un departamento para cambiar la escala de lectura. Los colores representan el eje productivo predominante y el mapa permite recorrer sus límites y relieve.</p>
          </div>

          <div className="territory-layout">
            <aside className="filter-rail">
              <div className="rail-label"><Filter size={14} /> Filtrar por sector</div>
              <p className="rail-help">Atenúa los departamentos que no pertenecen al eje elegido.</p>
              <div className="filter-list">
                {FILTERS.map(({ id, label, count, Icon, iconCls, on }) => (
                  <button key={id} onClick={() => setActiveFilter(id)} className={`filter-row ${activeFilter === id ? on : ''}`}>
                    <Icon size={17} className={iconCls} /><span>{label}</span><small>{count}</small>
                  </button>
                ))}
              </div>
              {selectedDeptId && (
                <button className="reset-selection" onClick={() => setSelectedDeptId(null)}><RotateCcw size={13} /> Ver provincia completa</button>
              )}
              <div className="map-legend"><span className="legend-pulse" /> Selecciona una forma en el mapa</div>
            </aside>

            <div className="map-stage">
              <div className="stage-meta"><span><span className="live-dot" /> Mapa interactivo</span><span>IGN / IDERA · relieve</span></div>
              <div className="map-frame"><MapaJujuy departments={JUJUY_DEPARTMENTS_DATA} selectedDeptId={selectedDeptId} activeFilter={activeFilter} onSelect={setSelectedDeptId} /></div>
              <div className="map-caption"><Info size={14} /><span>Arrastra para mover · clic derecho para rotar · rueda para acercar</span><span className="map-coordinates">JUJUY / ARG</span></div>
            </div>
          </div>
        </section>

        <section id="evolucion" className="chapter-section evolution-section">
          <div className="section-heading compact-heading">
            <span className="section-number">03 / EVOLUCIÓN ECONÓMICA</span>
            <h2>El tiempo también<br /><em>deja un mapa.</em></h2>
          </div>

          <div className="analysis-layout">
            <div className="profile-card">
              <div className="profile-top"><span className="profile-tag">{headlineLabel}</span>{selectedDeptId && <button onClick={() => setSelectedDeptId(null)} aria-label="Limpiar selección"><X size={14} /></button>}</div>
              <h3>{selectedData.name}</h3>
              <p>{selectedData.metrics?.mainActivity || 'Estructura económica consolidada de Jujuy.'}</p>
              <div className="profile-rule" />
              <div className="profile-highlight"><span>Aporte PBI</span><strong>{selectedData.metrics?.pbiShare || '100%'}</strong></div>
              <div className="profile-highlight"><span>Crec. empleo</span><strong className="green-value">{selectedData.metrics?.employmentGrowth || selectedData.pbiGrowth}</strong></div>
              {selectedDeptId ? (
                <div className="department-inspector">
                  <div className="inspector-context"><span>Contexto territorial</span><b>{selectedData.region || 'No disponible'}</b><small>Eje predominante: {selectedData.sector || 'No disponible'}</small></div>
                  <div className="inspector-facts">
                    <div><span>Superficie territorial</span><b>No disponible</b><small>No figura en la base actual</small></div>
                    <div><span>Último año</span><b>{availableValue(selectedLatest?.year)}</b><small>Fin de la serie disponible</small></div>
                  </div>
                  <div className="inspector-block"><span className="inspector-label">Indicadores productivos</span><div className="inspector-grid"><div><small>Empleo formal</small><b>{availableValue(selectedData.metrics?.formalJobs)}</b></div><div><small>Red de Pymes</small><b>{availableValue(selectedData.metrics?.localSmes)}</b></div><div><small>Exportaciones</small><b>{availableValue(selectedData.metrics?.exportValue)}</b></div><div><small>Crec. empleo</small><b>{availableValue(selectedData.metrics?.employmentGrowth)}</b></div></div></div>
                  <div className="inspector-block"><span className="inspector-label">Participación sectorial · {availableValue(selectedLatest?.year)}</span>{sectorParticipation.map(([label, value, colorClass]) => <div className="participation-row" key={label}><div><span>{label}</span><b>{percentageOf(value, sectorTotal)}</b></div><div className="participation-track"><i className={colorClass} style={{ width: `${sectorTotal > 0 ? (value / sectorTotal) * 100 : 0}%` }} /></div></div>)}</div>
                  <div className="comparison-note"><span>Comparación con el promedio provincial</span><b>{employmentVsAverage === null ? 'No disponible' : `${employmentVsAverage >= 0 ? '+' : ''}${employmentVsAverage.toFixed(1)}%`}</b><small>Empleo del último año frente al promedio por departamento calculado sobre los 16 departamentos.</small></div>
                </div>
              ) : (
                <div className="province-context"><span>Lectura provincial</span><p>Selecciona un departamento en el mapa para abrir su ficha territorial, comparar sus indicadores y consultar la composición sectorial de la última observación disponible.</p></div>
              )}
            </div>

            <div className="chart-card">
              <div className="chart-header"><div><span className="chart-eyebrow">{activeFilter === 'todos' ? 'Serie histórica · 2015—2026' : `Filtro activo · ${FILTERS.find((filter) => filter.id === activeFilter)?.label}`}</span><h3>{activeTab === 'evolucion' ? 'Producción por sector' : activeTab === 'empleo' ? 'Empleo formal registrado' : 'Comparación entre departamentos'}</h3></div><div className="tab-switcher">{TABS.map(({ id, label, Icon }) => <button key={id} onClick={() => setActiveTab(id)} className={activeTab === id ? 'active' : ''}><Icon size={14} />{label}</button>)}</div></div>

              {activeTab === 'evolucion' ? (
                <div className="production-chart">
                  <div className="chart-gridlines"><span>máximo relativo</span><span>0</span></div>
                  <div className="bars-area">
                    {selectedData.yearlyData.map((item) => (
                      <div key={item.year} className="year-column">
                        <div className="bar-tooltip"><b>{item.year}</b>{PRODUCTION_SERIES.filter(([key]) => activeSeriesKeys.includes(key)).map(([key, label, , tooltipClass]) => <span className={tooltipClass} key={key}>{label}: {item[key]} {key === 'litio' ? 'k Tn' : key === 'agro' ? 'k Tn' : 'k Serv'}</span>)}</div>
                        <div className="bar-group">
                          {PRODUCTION_SERIES.filter(([key]) => activeSeriesKeys.includes(key)).map(([key, , cls]) => <div key={key} className={`chart-bar ${cls}`} style={{ height: `${Math.max((item[key] / maxProd) * 100, 4)}%` }} />)}
                        </div>
                        <span className="year-label">{item.year}</span>
                      </div>
                    ))}
                  </div>
                  <div className="chart-legend">{PRODUCTION_SERIES.filter(([key]) => activeSeriesKeys.includes(key)).map(([key, label, cls]) => <span key={key}><i className={cls} />{label}</span>)}</div>
                </div>
              ) : activeTab === 'empleo' ? (
                <div className="employment-chart"><div className="employment-note"><ArrowDownRight size={16} /><span>Valores relativos al máximo de la serie seleccionada.</span></div>{selectedData.yearlyData.map((item) => <div className="employment-row" key={item.year}><div><span>{item.year}</span><b>{item.empleo.toLocaleString()} <small>puestos</small></b></div><div className="employment-track"><div style={{ width: `${Math.max((item.empleo / maxEmpleo) * 100, 5)}%` }} /></div></div>)}</div>
              ) : (
                <div className="department-comparison"><div className="employment-note"><ArrowDownRight size={16} /><span>{comparisonLabel} · último año disponible · {activeFilter === 'todos' ? 'ordenado por empleo' : 'ordenado por serie sectorial'}</span></div>{comparisonData.map((department, index) => <div className={`comparison-row ${department.id === selectedDeptId ? 'is-selected' : ''}`} key={department.id} onClick={() => setSelectedDeptId(department.id)}><span className="comparison-rank">{String(index + 1).padStart(2, '0')}</span><span className="comparison-name">{department.name}</span><div className="comparison-track"><i style={{ width: `${Math.max((department.value / maxComparison) * 100, 4)}%` }} /></div><b>{department.value.toLocaleString()}</b></div>)}</div>
              )}

              <div className="metric-grid">
                <MetricCard label="Empleo formal" value={selectedData.metrics?.formalJobs || selectedData.totalEmployment} tone="cyan" />
                <MetricCard label="Red de Pymes" value={selectedData.metrics?.localSmes || selectedData.totalSmes} tone="amber" />
                <MetricCard label="Exportaciones" value={selectedData.metrics?.exportValue || selectedData.totalExports} tone="violet" />
                <MetricCard label="Crec. empleo" value={selectedData.metrics?.employmentGrowth || selectedData.pbiGrowth} tone="green" />
              </div>
            </div>
          </div>
        </section>

        <section id="sectores" className="sectors-overview">
          <div className="section-heading compact-heading"><span className="section-number">04—06 / SECTORES</span><h2>Tres lecturas para<br /><em>un mismo territorio.</em></h2><p>Explora cada eje productivo con la misma estructura: evolución histórica, indicadores derivados de las series disponibles y comparación entre departamentos.</p></div>
          {SECTOR_SECTIONS.map((config) => <SectorSection key={config.id} config={config} onExplore={exploreSector} onSelectDepartment={selectSectorDepartment} />)}
        </section>

        <section id="empleo-desarrollo" className="employment-chapter">
          <div className="employment-chapter-heading"><span className="section-number">07 / EMPLEO Y DESARROLLO</span><h2>El trabajo también<br /><em>deja una huella.</em></h2><p>La serie de empleo registrado funciona como una lectura transversal del desarrollo territorial. El detalle anual completo está disponible en la pestaña de empleo de la sección de evolución.</p><button className="sector-action" onClick={() => { setActiveTab('empleo'); scrollTo('evolucion'); }}>Abrir evolución del empleo <ChevronDown size={14} /></button></div>
          <div className="employment-chapter-data"><div className="employment-chapter-metrics"><MetricCard label="Empleo inicial disponible" value={firstEmployment?.toLocaleString() || 'No disponible'} tone="cyan" /><MetricCard label="Último empleo disponible" value={latestEmployment?.toLocaleString() || 'No disponible'} tone="green" /><MetricCard label="Variación de la serie" value={employmentChange === null ? 'No disponible' : `${employmentChange >= 0 ? '+' : ''}${employmentChange.toFixed(1)}%`} tone="violet" /></div><div className="employment-sparkline">{PROVINCIAL_TOTALS.yearlyData.map((year) => <div className="employment-spark-column" key={year.year}><i style={{ height: `${Math.max((year.empleo / Math.max(1, latestEmployment || 1)) * 100, 5)}%` }} /><span>{year.year}</span></div>)}</div></div>
        </section>

        <section id="conclusiones" className="method-section">
          <div><span className="section-number">08 / CONCLUSIONES</span><h2>Una matriz para<br /><em>seguir preguntando.</em></h2></div>
          <div className="method-copy"><p>La exploración organiza la información disponible para leer Jujuy a distintas escalas: provincia, departamento y sector. Sus gráficos no cierran la conversación; permiten volver al mapa, comparar territorios y revisar cómo cambia cada serie a lo largo del tiempo.</p><div className="method-sources"><span>Lectura cartográfica</span><b>IGN / IDERA</b><span>Relieve</span><b>Terrain Tiles · AWS</b><span>Datos económicos</span><b>Verificar fuentes antes de presentar</b></div></div>
        </section>
      </main>

      <footer className="site-footer"><span><b>JUJUY / MATRIZ PRODUCTIVA</b> · Concurso “Contar con Datos”</span><span>Exploración departamental · 2015—2026</span></footer>

      {showDocModal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowDocModal(false)}><div className="document-modal" role="dialog" aria-modal="true" aria-labelledby="document-title"><div className="modal-heading"><span><FileText size={18} /> Memoria descriptiva</span><button onClick={() => setShowDocModal(false)} aria-label="Cerrar"><X size={18} /></button></div><div className="modal-body"><div><b>01 · Título y cobertura</b><p>Matriz Productiva Departamental de Jujuy (2015–2026), con los 16 departamentos de la provincia.</p></div><div><b>02 · Resumen</b><p>Exploración interactiva de la estructura productiva por departamento: minería, agroindustria y turismo.</p></div><div><b>03 · Fuentes y método</b><p>Completar con cada fuente real (organismo, archivo, fecha) y aclarar qué valores son estimaciones propias y cómo se calcularon.</p></div></div><button className="modal-close" onClick={() => setShowDocModal(false)}>Cerrar</button></div></div>}
    </div>
  );
}
