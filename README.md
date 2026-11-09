# Matriz Productiva Departamental de Jujuy (2015–2026)

React + Vite + Tailwind + MapLibre GL JS (relieve 3D) + three.js (escenas productivas ilustrativas).

```
npm install
npm run dev
```

## Estructura
```
src/App.jsx                         interfaz (mapa a pantalla completa, fichas, indicadores, capítulos)
src/MapaJujuy.jsx                   mapa MapLibre: relieve, límites, etiquetas, cámara, selección
src/components/Map3D/               motor 3D único y compartido (módulos JS, no componentes React)
  SceneManager.js                   capa personalizada de MapLibre + three.js (misma cámara y terreno)
  CharacterManager.js               personas animadas (instanciadas)
  VehicleManager.js                 vehículos animados
  InstallationManager.js            instalaciones y caminos
  ZoomController.js                 niveles de detalle por zoom
src/config/departmentsConfig.js     los 16 departamentos: actividades, fuentes, anclas, zoom, activación
src/config/activitiesConfig.js      plantillas de escena, roles y vehículos
src/data.js                         valores económicos (ILUSTRATIVOS, sin fuente verificada)
src/data/indicators.js              metadatos de indicadores + conciliación provincial/departamental
src/data/sources.js                 fuentes oficiales candidatas (ninguna consultada todavía)
scripts/check-data.mjs              informe de calidad de datos
tests/regresion/                    pruebas del motor (sin navegador)
tests/e2e/                          prueba de extremo a extremo en navegador (opcional)
public/data/jujuy-departamentos.geojson   límites oficiales (IGN)
```

## Historia (storytelling) y modo exploración
Al abrir el sitio se ve **Historia**: un recorrido de 7 capítulos donde el scroll dirige el mismo mapa 3D (un solo mapa para los dos modos). El botón «Explorar datos» (o el selector del encabezado) abre la interfaz de exploración libre; `#explorar` y `#historia` en la URL eligen el modo.
- Capítulos como datos: `src/story/storyData.js` (textos, departamentos resaltados, cámara, indicadores). Para editar un capítulo no hace falta tocar el motor.
- Cada indicador declara ámbito (**provincial** o **departamental**, nunca mezclados), unidad, año, condición y fuente; lo que no existe dice «Información no disponible».
- Capítulo 3: la escena solar es **ilustrativa**, ubicada en las coordenadas de Cauchari aportadas por el proyecto (`src/config/places.js`), pendientes de verificación con fuente oficial.
- Respeta `prefers-reduced-motion` (cámara sin vuelos animados, sin pulsos) y funciona en celular (mapa fijo arriba, narrativa debajo).
- **Fotografías:** Supabase Storage. Guía en `docs/FOTOGRAFIAS.md` y script en `supabase/storytelling_media.sql`. Sin fotografías se muestran imágenes de referencia provisionales rotuladas.
- **Música:** copiá un archivo de audio en `src/assets/audio/` (ver el `LEEME.md` de esa carpeta). Sin archivo muestra «Música pendiente». No empieza sola.

## Escenas 3D: reglas
- **Un solo motor** para los 16 departamentos. Cada departamento aporta configuración, no código 3D.
- Las escenas son **ilustrativas**: no son establecimientos reales ni representan cantidades de trabajadores, producción o empleo.
- **Sólo está activa la escena de Susques (minería)**, heredada del piloto original (`piloto: true`). Las otras escenas están definidas pero **desactivadas**.
- Una actividad se activa únicamente si tiene `validada: true` **y** al menos una fuente en `fuentes` (ver `departmentsConfig.js`). No hay otra forma de encenderla.
- No se cargan simultáneamente las escenas: se construyen al verse y se descargan tras 20 s fuera de cámara. Las geometrías se comparten entre escenas.

### Activar la escena de un departamento
1. Validar la actividad con una fuente oficial.
2. En `departmentsConfig.js`: poner `validada: true` y completar `fuentes` (organismo, publicación, fecha de consulta).
3. Si hay coordenadas verificadas del establecimiento, cargar `anchor: [lng, lat]` (debe caer dentro del departamento).
4. Revisar la escena en el mapa. Si falta un modelo propio, usar o crear una plantilla en `activitiesConfig.js`.

## Datos e indicadores
- Cada indicador declara **unidad, escala (departamental o provincial, nunca mezcladas), año y condición** (`observado`, `estimado` o `parcial`) y su **fuente** (`src/data/indicators.js`).
- Los valores actuales **no tienen fuente verificada** (`validacion: 'sin_validar'`). El año 2026 es **parcial** (año en curso).
- `npm run check:data` informa indicadores sin validar, la conciliación provincial vs. suma de departamentos y controles de coherencia (`-- --strict` falla si hay datos sin validar).
- Para validar un indicador: cargar el valor real, completar `fuente`, fijar `condicion` en cada punto y poner `validacion: 'validado'`.

## Pruebas
- `npm run test:regresion`: el motor modular dibuja y selecciona exactamente igual que el piloto original de Susques.
- `npm run test:descarga`: las escenas lejanas se descargan y se reconstruyen.
- `npm run test:historia`: capítulos, grupos de departamentos e indicadores (ámbito, unidad, «no disponible»).
- `npm run test:cpu`: costo de CPU del motor por cuadro.
- `tests/e2e/` y `tests/e2e/historia/`: pruebas en navegador (ver sus LEEME.md).

## Modelos 3D pendientes
El piloto usa figuras procedurales animadas. Los modelos GLB/GLTF faltantes están listados en `MODELOS_REQUERIDOS` (`activitiesConfig.js`), carpeta prevista `public/models/`.
