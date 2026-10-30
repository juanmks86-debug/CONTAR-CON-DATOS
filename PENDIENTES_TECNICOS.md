# Pendientes técnicos — Matriz Productiva Departamental de Jujuy

Fecha de revisión: 2026-10-30

## Correcciones aplicadas en esta revisión

- Se agregó un estado visual de carga para el mapa: “Cargando relieve y límites departamentales…”.
- Se agregó una fuente de glifos MapLibre para permitir la renderización de las etiquetas de los departamentos.
- Se agregó `ResizeObserver` para ejecutar `map.resize()` cuando cambia el tamaño del contenedor.
- Se reforzó la limpieza del mapa al desmontar el componente: se desconecta el observador, se elimina el popup y se destruye la instancia MapLibre.
- Se mantuvieron separados el zoom, la rotación, el arrastre, la selección y el restablecimiento de la cámara.
- Se conservaron los tooltips, las etiquetas, la selección de los 16 departamentos y el manejo de errores del GeoJSON.
- Se incorporaron estilos responsive para el estado de carga y los controles cartográficos.

## Pendientes que no se pueden resolver sin información adicional

### 1. Reemplazar los datos ilustrativos por datos con fuente real

`src/data.js` todavía contiene la declaración:

```js
// DATOS ILUSTRATIVOS. Reemplazalos por datos con fuente real antes de presentar.
```

Para corregirlo se necesitan los archivos o fuentes oficiales de cada indicador, incluyendo:

- Organismo responsable.
- Fecha o período de referencia.
- Unidad de medida.
- Método de cálculo.
- Distinción entre dato observado, estimación y dato derivado.
- Fuente específica para empleo, PBI, exportaciones, Pymes, litio, agroindustria y turismo.

No se reemplazaron esos valores automáticamente para evitar inventar información económica.

### 2. Confirmar el build de producción en este equipo

Las dependencias están instaladas localmente y son compatibles con `package.json`. Sin embargo, `npm run build` continúa fallando en Windows con un error de permisos de `esbuild` al resolver `vite.config.js`:

```text
Cannot read directory "../../../..": Acceso denegado.
Could not resolve vite.config.js
```

Se debe resolver la restricción de permisos del proceso de `esbuild` o ejecutar la validación en un entorno Node/Vite con permisos normales. No se aplicó `npm audit fix --force` para no cambiar versiones ni romper el entorno existente.

### 3. Prueba visual final en navegadores y tamaños reales

Todavía se recomienda probar manualmente:

- Chrome y Edge en escritorio.
- Tablet en orientación vertical y horizontal.
- Móvil con ancho aproximado de 360 px.
- Selección rápida de varios departamentos.
- Rotación y zoom después de seleccionar un departamento.
- Carga con conexión lenta o sin acceso temporal a las teselas DEM.
- Renderización de las etiquetas MapLibre desde la fuente de glifos configurada.

### 4. División futura de `App.jsx`

La aplicación funciona con los componentes actuales, pero `App.jsx` concentra portada, panel departamental, gráficos, ranking, métricas y modal. Como mejora de mantenimiento, se puede separar en componentes como:

- `DepartmentProfile.jsx`
- `ProductionChart.jsx`
- `EmploymentChart.jsx`
- `DepartmentComparison.jsx`
- `ProjectModal.jsx`

Esta reorganización no es imprescindible para ejecutar la aplicación y debe hacerse en una pasada independiente para evitar duplicar lógica.

## Archivos relacionados

- `src/MapaJujuy.jsx`
- `src/index.css`
- `src/App.jsx`
- `src/data.js`
- `public/data/jujuy-departamentos.geojson`
- `package.json`
