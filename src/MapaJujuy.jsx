import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// GeoJSON real de los 16 departamentos de Jujuy (IGN/IDERA), en /public/data/
const GEOJSON_URL = '/data/jujuy-departamentos.geojson';
const JUJUY_BOUNDS = [[-67.3, -24.5], [-64.0, -21.7]];

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

  // padding de 100 px, pero nunca más de un cuarto del lado menor del mapa,
  // para que fitBounds no falle en pantallas chicas
  const { clientWidth, clientHeight } = map.getContainer();
  const padding = Math.max(10, Math.min(100, Math.floor(Math.min(clientWidth, clientHeight) / 4)));

  map.fitBounds(bounds, {
    padding,
    duration: 1400,
    maxZoom: 10,
    pitch: 55,
    bearing: -15
  });
}

export function resetMapView(map) {
  map.fitBounds(JUJUY_BOUNDS, {
    padding: 28,
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

export default function MapaJujuy({ departments, selectedDeptId, activeFilter, onSelect }) {
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
      fitBoundsOptions: { padding: 20 },
      pitch: 50,
      bearing: -8,
      maxPitch: 75,
      minZoom: 5.2,
      maxZoom: 13,
      attributionControl: false,
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        light: {
          anchor: 'viewport',
          color: '#c5f4f2',
          intensity: 0.45
        },
        sources: {
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
          {
            id: 'sombreado', type: 'hillshade', source: 'dem',
            paint: {
              'hillshade-exaggeration': 0.85,
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

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => map.resize())
      : null;
    if (resizeObserver && containerRef.current) resizeObserver.observe(containerRef.current);

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new ResetViewControl(() => onSelectRef.current(null)), 'top-left');
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: 'Límites: IGN / IDERA · Relieve: Mapzen Terrain Tiles (AWS)'
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

        map.addSource('deptos', { type: 'geojson', data: gj, promoteId: 'deptId' });
        map.addLayer({
          id: 'deptos-fill', type: 'fill', source: 'deptos',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'selected'], false], 0.7,
              ['boolean', ['feature-state', 'dimmed'], false], 0.06,
              0.38
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
        map.addLayer({
          id: 'deptos-labels',
          type: 'symbol',
          source: 'deptos',
          layout: {
            'text-field': ['get', 'label'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 5, 9, 9, 12],
            'text-font': ['Open Sans Regular'],
            'text-allow-overlap': false,
            'symbol-placement': 'point'
          },
          paint: {
            'text-color': '#d9f5f3',
            'text-halo-color': '#061116',
            'text-halo-width': 1.5,
            'text-opacity': ['case', ['boolean', ['feature-state', 'dimmed'], false], 0.25, 0.92]
          }
        });

        map.on('click', 'deptos-fill', (e) => {
          const id = e.features?.[0]?.properties?.deptId;
          if (id) onSelectRef.current(id);
        });
        map.on('click', 'deptos-labels', (e) => {
          const id = e.features?.[0]?.properties?.deptId;
          if (id) onSelectRef.current(id);
        });
        map.on('click', (e) => {
          const hit = map.queryRenderedFeatures(e.point, { layers: ['deptos-fill'] });
          if (!hit.length) onSelectRef.current(null);
        });
        map.on('mousemove', 'deptos-fill', (e) => {
          map.getCanvas().style.cursor = 'pointer';
          popup.setLngLat(e.lngLat).setText(`Departamento: ${e.features[0].properties.label}`).addTo(map);
        });
        map.on('mousemove', 'deptos-labels', (e) => {
          map.getCanvas().style.cursor = 'pointer';
          popup.setLngLat(e.lngLat).setText(`Departamento: ${e.features[0].properties.label}`).addTo(map);
        });
        map.on('mouseleave', 'deptos-fill', () => {
          map.getCanvas().style.cursor = '';
          popup.remove();
        });
        map.on('mouseleave', 'deptos-labels', () => {
          map.getCanvas().style.cursor = '';
          popup.remove();
        });

        readyRef.current = true;
        setLoading(false);
        // aplicar estado inicial (filtro / selección)
        map.fire('jujuy-ready');
      } catch (err) {
        console.error('No se pudo cargar el GeoJSON de departamentos:', err);
        setLoading(false);
        setError('Falta el GeoJSON de departamentos. Guardalo en public/data/jujuy-departamentos.geojson (ver README).');
      }
    });

    return () => {
      readyRef.current = false;
      resizeObserver?.disconnect();
      popup.remove();
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
    if (readyRef.current) apply();
    else map.once('jujuy-ready', apply);
  }, [activeFilter]);

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
      prevSelected.current = selectedDeptId;
    };
    if (readyRef.current) apply();
    else map.once('jujuy-ready', apply);
  }, [selectedDeptId]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden" />
      {loading && (
        <div className="map-loading" role="status" aria-live="polite">
          <span className="map-loading-spinner" />
          <span>Cargando relieve y límites departamentales…</span>
        </div>
      )}
      {error && (
        <div className="absolute left-3 right-3 bottom-3 bg-amber-950/90 border border-amber-700 text-amber-200 text-xs rounded-lg p-3">
          {error}
        </div>
      )}
    </div>
  );
}
