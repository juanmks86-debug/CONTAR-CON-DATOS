# Matriz Productiva Departamental de Jujuy

React + Vite + Tailwind + MapLibre GL JS (relieve 3D con Terrain DEM).

## Cómo correrlo
```
npm install
npm run dev
```
Abrí la dirección que muestra la terminal (normalmente http://localhost:5173).

## Falta un archivo: el GeoJSON de los 16 departamentos
Ya incluido: `public/data/jujuy-departamentos.geojson` (IGN, simplificado).

1. Bajá la capa de departamentos del IGN (Instituto Geográfico Nacional) o de IDERA.
2. Abrila en https://mapshaper.org y dejá solo los 16 departamentos de Jujuy.
3. Simplificala un poco (botón "Simplify") y exportala como GeoJSON.

Requisitos del archivo:
- Una propiedad con el nombre del departamento (`nombre`, `nam`, `fna`, `departamen`, `departamento` o `name`).
- Si el archivo trae un campo de provincia, se usan solo los de Jujuy. Si no lo trae,
  recortalo a Jujuy antes: hay departamentos con el mismo nombre en otras provincias
  (San Pedro, San Antonio, El Carmen, etc.).
- Si no se encuentran los 16 departamentos, el mapa muestra un aviso en pantalla.

## Datos
`src/data.js` tiene datos ILUSTRATIVOS. Antes de presentar, reemplazalos por datos con
fuente real y actualizá el pie de página y la memoria descriptiva en `src/App.jsx`.

## Estructura
```
index.html
src/main.jsx        entrada
src/App.jsx         interfaz (filtros, panel, gráficos)
src/MapaJujuy.jsx   mapa MapLibre + relieve + cámara
src/data.js         datos
public/data/        acá va el GeoJSON
```

## Escenas productivas 3D (16 departamentos, ilustrativas)
Un único motor compartido (capa personalizada de MapLibre + three.js) con configuración por departamento.

```
src/config/departmentsConfig.js   los 16 departamentos: actividades, zoom, coordenadas verificadas, fuentes
src/config/activitiesConfig.js    plantillas de escena, roles de personas, vehículos, modelos GLB requeridos
src/components/Map3D/SceneManager.js        motor único (capa, culling, carga progresiva, selección)
src/components/Map3D/ZoomController.js      niveles 1-4 y aparición progresiva según el zoom
src/components/Map3D/InstallationManager.js instalaciones y caminos
src/components/Map3D/VehicleManager.js      vehículos animados
src/components/Map3D/CharacterManager.js    personas animadas
src/geo.js                                  puntos interiores del departamento
```
- Las escenas son ILUSTRATIVAS: no son establecimientos reales ni representan trabajadores, producción o empleo.
- Ninguna actividad está validada con fuente oficial (`validada: false`). Al validarla: completar `fuentes` y poner `true`.
- Coordenadas verificadas: `anchor: [lng, lat]` y `anchorSource: 'fuente'` en departmentsConfig.js.
- Para sumar una actividad nueva: crear una plantilla en activitiesConfig.js y referenciarla en el departamento.
- Faltan los modelos GLB/GLTF (`MODELOS_REQUERIDOS`, carpeta prevista `public/models/`); mientras tanto se usan figuras procedurales.
