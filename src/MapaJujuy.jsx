import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { createEscenasLayer, levelOf } from './components/Map3D/SceneManager';
import 'maplibre-gl/dist/maplibre-gl.css';

// GeoJSON real de los 16 departamentos de Jujuy (IGN/IDERA), en /public/data/
const GEOJSON_URL = '/data/jujuy-departamentos.geojson';
const JUJUY_BOUNDS = [[-67.3, -24.5], [-64.0, -21.7]];
// se ajusta a los límites reales del GeoJSON cuando carga
let provinceBounds = JUJUY_BOUNDS;

const norm = (s = '') =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z ]/g, '').trim();

// nombre normalizado (o parte de él) -> id de JUJUY_DEPARTMENTS_DATA
const NAME_TO_ID = {
  'santa catalina': 'santa_catalina', yavi: 'yavi', rinconada: 'rinconada',
  cochinoca: 'cochinoca', susques: 'susques', humahuaca: 'humahuaca',
  tilcara: 'tilcara', tumbaya: 'tumbaya', 'valle grande': 'valle_grande',
  ledesma: 'ledesma', 'santa barbara': 'santa_barbara', 'san pedro': 'san_pedro',
  'manuel belgrano': 'belgrano', palpala: 'palpala', 'san antonio': 'san_antonio',
  'el carmen': 'el_carmen'
};

const NAME_KEYS = ['nombre', 'nam', 'fna', 'departamen', 'departamento', 'nom_dpto', 'name'];
const getName = (p = {}) => {
  const k = Object.keys(p).find((key) => NAME_KEYS.includes(key.toLowerCase()));
  return k ? String(p[k]) : '';
};
// Evita confundir "San Pedro" o "San Antonio" de otras provincias: si el archivo
// trae un campo de provincia, solo se aceptan los de Jujuy.
const isJujuy = (p = {}) => {
  const k = Object.keys(p).find((key) => /prov/i.test(key));
  return !k || norm(String(p[k])).includes('jujuy');
};
const idFromName = (name) => {
  const n = norm(name);
  const key = Object.keys(NAME_TO_ID).find((k) => n.includes(k));
  return key ? NAME_TO_ID[key] : null;
};

// Acerca la cámara a un departamento (Polygon o MultiPolygon)
export function zoomToDepartment(map, feature) {
  if (!feature) return;

  const bounds = new maplibregl.LngLatBounds();

  function extendCoordinates(coords) {
    if (typeof coords[0] === 'number') {
      bounds.extend(coords);
    } else {
      coords.forEach(extendCoordinates);
    }
  }

  extendCoordinates(feature.geometry.coordinates);

  // deja libre la ficha de la derecha en pantallas grandes (y evita paddings imposibles en pantallas chicas)
  const wide = map.getContainer().clientWidth > 1000;
  const padding = { top: 100, bottom: 100, left: wide ? 120 : 40, right: wide ? 420 : 40 };

  map.fitBounds(bounds, {
    padding,
    duration: 1400,
    maxZoom: 10,
    pitch: map.getPitch() > 0 ? 55 : 0,
    bearing: map.getPitch() > 0 ? -15 : 0
  });
}

// MapLibre 4.7.1: tras easeTo/fitBounds/flyTo con relieve (incluido el encuadre inicial) deja `_elevationFreeze` en true y la
// altura del terreno bajo el centro de la cámara deja de seguirse hasta el primer gesto manual del usuario: el encuadre queda
// corrido y las escenas 3D se ven desplazadas. Se libera al terminar cada movimiento (campo interno, con verificación de tipo).
const unfreezeElevation = (map) => { if (map && map._elevationFreeze === true && !map.isMoving()) map._elevationFreeze = false; };

const viewPad = (el) => ({ top: 40, bottom: 40, right: 40, left: el.clientWidth > 1000 ? 380 : 40 });

export function resetMapView(map) {
  map.fitBounds(provinceBounds, {
    padding: viewPad(map.getContainer()),
    duration: 1100,
    pitch: 52,
    bearing: -8
  });
}

class ResetViewControl {
  constructor(onReset) {
    this.onReset = onReset;
  }

  onAdd(map) {
    this.map = map;
    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'map-reset-control';
    this.button.setAttribute('aria-label', 'Restablecer vista de Jujuy');
    this.button.title = 'Restablecer vista provincial';
    this.button.innerHTML = '⌂';
    this.button.addEventListener('click', () => {
      this.onReset?.();
      resetMapView(this.map);
    });
    this.container.appendChild(this.button);
    return this.container;
  }

  onRemove() {
    this.container?.remove();
    this.map = undefined;
  }
}

// punto de etiqueta: centroide del polígono más grande
const centroid = (ring) => {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i]; const [x1, y1] = ring[i + 1];
    const f = x0 * y1 - x1 * y0;
    a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
  }
  a *= 0.5;
  return a ? [cx / (6 * a), cy / (6 * a)] : ring[0];
};
const labelPoint = (g) => {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  const big = polys.reduce((m, p) => (ringArea(p[0]) > ringArea(m[0]) ? p : m), polys[0]);
  return centroid(big[0]);
};

// Área (km²) con proyección sinusoidal (equivalente), calculada del GeoJSON del IGN
const ringArea = (ring) => {
  const R = 6371.0088, rad = Math.PI / 180;
  const pt = ([lon, lat]) => [R * lon * rad * Math.cos(lat * rad), R * lat * rad];
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = pt(ring[i]); const [x2, y2] = pt(ring[i + 1]);
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
};
const featureArea = (g) => {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  return polys.reduce((t, p) => t + ringArea(p[0]) - p.slice(1).reduce((h, r) => h + ringArea(r), 0), 0);
};

export default function MapaJujuy({ departments, selectedDeptId, activeFilter, onSelect, view3d = true, onFeatures, scenes, onScenePick, onLevel }) {
  const scenesRef = useRef(null);
  const latest = useRef({});
  latest.current = { scenes, activeFilter, selectedDeptId, onScenePick, onLevel };
  const levelRef = useRef(0);
  const onFeaturesRef = useRef(onFeatures);
  onFeaturesRef.current = onFeatures;
  const prevView = useRef(view3d);
  const markersRef = useRef([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const featuresRef = useRef([]);
  const readyRef = useRef(false);
  const prevSelected = useRef(null);
  // callbacks siempre actualizados sin recrear el mapa
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // --- Crear mapa una sola vez ---
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      bounds: JUJUY_BOUNDS,
      fitBoundsOptions: { padding: viewPad(containerRef.current) },
      pitch: 50,
      bearing: -8,
      maxPitch: 75,
      minZoom: 5.2,
      maxZoom: 15,
      attributionControl: false,
      style: {
        version: 8,
        light: {
          anchor: 'viewport',
          color: '#c5f4f2',
          intensity: 0.45
        },
        sources: {
          sat: {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            maxzoom: 17
          },
          'dem-hs': { type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], encoding: 'terrarium', tileSize: 256, maxzoom: 14 },
          dem: {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            encoding: 'terrarium',
            tileSize: 256,
            maxzoom: 14
          }
        },
        layers: [
          { id: 'bg', type: 'background', paint: { 'background-color': '#061116' } },
          { id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-saturation': -0.25, 'raster-brightness-max': 0.75 } },
          {
            id: 'sombreado', type: 'hillshade', source: 'dem-hs',
            paint: {
              'hillshade-exaggeration': 0.45,
              'hillshade-shadow-color': '#02090d',
              'hillshade-highlight-color': '#6f9b9b',
              'hillshade-illumination-direction': 315,
              'hillshade-illumination-anchor': 'viewport'
            }
          }
        ]
      }
    });
    mapRef.current = map;
    map.on('moveend', () => unfreezeElevation(map));
    map.on('idle', () => unfreezeElevation(map));
    if (import.meta.env.VITE_EXPOSE_MAP) window.__map = map; // sólo para pruebas automáticas

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => map.resize())
      : null;
    if (resizeObserver && containerRef.current) resizeObserver.observe(containerRef.current);

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new ResetViewControl(() => onSelectRef.current(null)), 'top-right');
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: 'Límites: IGN / IDERA · Relieve: Mapzen Terrain Tiles (AWS) · Imágenes: Esri, Maxar, Earthstar Geographics'
      })
    );

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });

    map.on('load', async () => {
      map.setTerrain({ source: 'dem', exaggeration: 1.85 });

      try {
        const res = await fetch(GEOJSON_URL);
        if (!res.ok) throw new Error('No se encontró ' + GEOJSON_URL);
        const gj = await res.json();

        const byId = Object.fromEntries(departments.map((d) => [d.id, d]));
        gj.features = gj.features
          .filter((f) => isJujuy(f.properties))
          .map((f) => {
            const deptId = idFromName(getName(f.properties));
            const d = byId[deptId];
            if (!d) return null; // otras provincias o nombres que no matchean
            return {
              ...f,
              properties: { ...f.properties, deptId, color: d.color, label: d.name, sector: d.sector }
            };
          })
          .filter(Boolean);

        if (gj.features.length !== 16) {
          setError(`Se esperaban 16 departamentos y se encontraron ${gj.features.length}. Revisá los nombres del GeoJSON.`);
        }
        featuresRef.current = gj.features;
        const pb = new maplibregl.LngLatBounds();
        const ext = (c) => (typeof c[0] === 'number' ? pb.extend(c) : c.forEach(ext));
        gj.features.forEach((f) => ext(f.geometry.coordinates));
        if (!pb.isEmpty()) provinceBounds = pb;
        onFeaturesRef.current?.(Object.fromEntries(gj.features.map((f) => [f.properties.deptId, featureArea(f.geometry)])));

        map.addSource('deptos', { type: 'geojson', data: gj, promoteId: 'deptId' });
        map.addLayer({
          id: 'deptos-fill', type: 'fill', source: 'deptos',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'selected'], false], 0.7,
              ['boolean', ['feature-state', 'dimmed'], false], 0.06,
              0.5
            ]
          }
        });
        map.addLayer({
          id: 'deptos-line', type: 'line', source: 'deptos',
          paint: {
            'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#ffffff', ['get', 'color']],
            'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 3, 1.2]
          }
        });

        // escenas productivas 3D (misma cámara y terreno que el mapa)
        const escenas = createEscenasLayer({ onPick: (info) => latest.current.onScenePick?.(info) });
        escenas.setGeometries(Object.fromEntries(gj.features.map((f) => [f.properties.deptId, f.geometry])));
        escenas.setOptions(latest.current.scenes || {});
        escenas.setFilter(latest.current.activeFilter);
        escenas.setSelected(latest.current.selectedDeptId);
        map.addLayer(escenas);
        scenesRef.current = escenas;
        if (import.meta.env.VITE_EXPOSE_MAP) window.__escenas = escenas;
        map.on('click', (e) => { if (escenas.pick(e.point)) e.originalEvent.__sceneHit = true; });
        const reportLevel = () => {
          const lv = levelOf(map.getZoom());
          if (lv !== levelRef.current) { levelRef.current = lv; latest.current.onLevel?.(lv); }
        };
        map.on('zoom', reportLevel); reportLevel();

        markersRef.current = gj.features.map((f) => {
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'dept-label';
          el.textContent = f.properties.label;
          el.addEventListener('click', (ev) => { ev.stopPropagation(); onSelectRef.current(f.properties.deptId); });
          const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(labelPoint(f.geometry)).addTo(map);
          return { id: f.properties.deptId, sector: f.properties.sector, el, marker };
        });

        map.on('click', 'deptos-fill', (e) => {
          if (e.originalEvent.__sceneHit) return;
          const id = e.features?.[0]?.properties?.deptId;
          if (id) onSelectRef.current(id);
        });
        map.on('click', (e) => {
          if (e.originalEvent.__sceneHit) return;
          const hit = map.queryRenderedFeatures(e.point, { layers: ['deptos-fill'] });
          if (!hit.length) { onSelectRef.current(null); latest.current.onScenePick?.(null); }
        });
        map.on('mousemove', 'deptos-fill', (e) => {
          map.getCanvas().style.cursor = 'pointer';
          popup.setLngLat(e.lngLat).setText(`Departamento: ${e.features[0].properties.label}`).addTo(map);
        });
        map.on('mouseleave', 'deptos-fill', () => {
          map.getCanvas().style.cursor = '';
          popup.remove();
        });

        readyRef.current = true;
        setLoading(false);
        map.fitBounds(provinceBounds, { padding: viewPad(map.getContainer()), duration: 0 });
        unfreezeElevation(map);
        // aplicar estado inicial (filtro / selección)
        map.fire('jujuy-ready');
      } catch (err) {
        console.error('No se pudo cargar el GeoJSON de departamentos:', err);
        setLoading(false);
        setError(`No se pudo mostrar la provincia: ${err.message}. El GeoJSON debe estar en public/data/jujuy-departamentos.geojson`);
      }
    });

    return () => {
      readyRef.current = false;
      resizeObserver?.disconnect();
      popup.remove();
      markersRef.current.forEach((m) => m.marker.remove());
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Filtro sectorial: atenúa los departamentos fuera del sector ---
  useEffect(() => {
    const map = mapRef.current;
    const apply = () => {
      featuresRef.current.forEach((f) => {
        map.setFeatureState(
          { source: 'deptos', id: f.properties.deptId },
          { dimmed: activeFilter !== 'todos' && f.properties.sector !== activeFilter }
        );
      });
    };
    const applyAll = () => {
      scenesRef.current?.setFilter(activeFilter);
      apply();
      markersRef.current.forEach((m) => m.el.classList.toggle('is-dim', activeFilter !== 'todos' && m.sector !== activeFilter));
    };
    if (readyRef.current) applyAll();
    else map.once('jujuy-ready', applyAll);
  }, [activeFilter]);

  // --- Opciones de las escenas (personas, vehículos, instalaciones, animaciones) ---
  useEffect(() => { scenesRef.current?.setOptions(scenes || {}); }, [scenes]);

  // --- Vista 3D / 2D ---
  useEffect(() => {
    const map = mapRef.current;
    if (prevView.current === view3d) return;
    prevView.current = view3d;
    const apply = () => {
      map.setTerrain(view3d ? { source: 'dem', exaggeration: 1.85 } : null);
      map.easeTo({ pitch: view3d ? 52 : 0, bearing: view3d ? -8 : 0, duration: 800 });
    };
    if (readyRef.current) apply(); else map.once('jujuy-ready', apply);
  }, [view3d]);

  // --- Selección: resalta y hace fitBounds al departamento ---
  useEffect(() => {
    const map = mapRef.current;
    const apply = () => {
      if (!selectedDeptId && !prevSelected.current) return; // vista inicial: no animar
      if (prevSelected.current) {
        map.setFeatureState({ source: 'deptos', id: prevSelected.current }, { selected: false });
      }
      if (selectedDeptId) {
        map.setFeatureState({ source: 'deptos', id: selectedDeptId }, { selected: true });
        const f = featuresRef.current.find((x) => x.properties.deptId === selectedDeptId);
        zoomToDepartment(map, f);
      } else {
        resetMapView(map);
      }
      markersRef.current.forEach((m) => m.el.classList.toggle('is-selected', m.id === selectedDeptId));
      scenesRef.current?.setSelected(selectedDeptId);
      prevSelected.current = selectedDeptId;
    };
    if (readyRef.current) apply();
    else map.once('jujuy-ready', apply);
  }, [selectedDeptId]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden" />
      {loading && (
        <div className="absolute inset-0 z-[3] flex items-center justify-center gap-2 text-xs text-teal-100 bg-[#061116]/80" role="status" aria-live="polite">
          <span className="w-3.5 h-3.5 border-2 border-teal-300/30 border-t-teal-300 rounded-full animate-spin" />
          <span>Cargando relieve y límites departamentales…</span>
        </div>
      )}
      {error && (
        <div className="absolute top-3 right-14 max-w-sm z-[3] bg-amber-950/95 border border-amber-700 text-amber-200 text-xs rounded-lg p-3">
          {error}
        </div>
      )}
    </div>
  );
}
