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

## Escenas 3D: reglas
- **Un solo motor** para los 16 departamentos. Cada departamento aporta configuración, no código 3D.
- Las escenas son **ilustrativas**: no son establecimientos reales ni representan cantidades de trabajadores, producción o empleo.
- **Sólo está activa la escena de Susques (minería)**, heredada del piloto original (`piloto: true`). Las otras escenas están definidas pero **desactivadas**.
- Una actividad se activa únicamente si tiene `validada: true` **y** al menos una fuente en `fuentes` (ver `departmentsConfig.js`). No hay otra forma de encenderla.
- **Vista previa ilustrativa** (interruptor en la barra inferior del mapa, apagado por defecto): dibuja también las escenas aún no validadas, con un aviso permanente y el rótulo «Vista previa · escena no validada» en la ficha de cada elemento. No activa ninguna escena: sólo las muestra.
- No se cargan simultáneamente las escenas: se construyen al verse y se descargan tras 20 s fuera de cámara. Las geometrías se comparten entre escenas.

### Activar la escena de un departamento
1. Validar la actividad con una fuente oficial.
2. En `departmentsConfig.js`: poner `validada: true` y completar `fuentes` (organismo, publicación, fecha de consulta).
3. Si hay coordenadas verificadas del establecimiento, cargar `anchor: [lng, lat]` (debe caer dentro del departamento).
4. Revisar la escena en el mapa. Si falta un modelo propio, usar o crear una plantilla en `activitiesConfig.js`.

## Datos
El proyecto no incluye datos numéricos ni gráficos: solo el mapa, las escenas 3D (personas, fábricas, vehículos).

## Pruebas
- `npm run test:regresion`: el motor modular dibuja y selecciona exactamente igual que el piloto original de Susques.
- `npm run test:descarga`: las escenas lejanas se descargan y se reconstruyen.
- `npm run test:vista-previa`: las 25 escenas se construyen y dibujan, anclas dentro de su departamento y descarte por cámara correcto.
- `npm run test:cpu`: costo de CPU del motor por cuadro.
- `tests/e2e/`: ver `tests/e2e/LEEME.md`.

## Modelos 3D pendientes
El piloto usa figuras procedurales animadas. Los modelos GLB/GLTF faltantes están listados en `MODELOS_REQUERIDOS` (`activitiesConfig.js`), carpeta prevista `public/models/`.

## Nota sobre MapLibre 4.7.1 (relieve)
Tras `easeTo`/`fitBounds`/`flyTo` con relieve, esta versión deja `_elevationFreeze` en `true` y la altura del terreno bajo el centro de la cámara deja de seguirse hasta el primer gesto manual (el encuadre queda corrido y las escenas 3D se ven desplazadas). `MapaJujuy.jsx` lo libera al terminar cada movimiento (`unfreezeElevation`, usa un campo interno con verificación de tipo). Si actualizás MapLibre, revisá si sigue siendo necesario.
