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
