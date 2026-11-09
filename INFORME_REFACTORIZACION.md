# Informe: refactorización modular, vista previa de escenas y metadatos de datos

## 1. Qué cambió respecto de tu repositorio
| Tipo | Archivos |
|---|---|
| Modificados | README.md, package.json (scripts), src/App.jsx, src/geo.js, src/index.css (1 línea), src/MapaJujuy.jsx (importación, liberación de la elevación del relieve y 2 líneas que sólo actúan en compilaciones de prueba) |
| Agregados | src/components/Map3D/ (6 módulos), src/config/ (2), src/data/ (indicators.js, sources.js), scripts/check-data.mjs, tests/ |
| Eliminados | src/escenas3d.js y src/escenasData.js (reemplazados por el motor modular; copias en tests/regresion/original/) |
| Sin cambios | src/data.js, public/data/jujuy-departamentos.geojson, PENDIENTES_TECNICOS.md |

Se conservan: mapa MapLibre, relieve, motor three.js (capa personalizada), animaciones de personas y vehículos, rotación, zoom y selección departamental.

## 2. Susques idéntico
El borrador modular previo NO era fiel (otro circuito de camiones, chimenea distinta y seleccionable, escena solar activa). Se corrigió y se verificó con `npm run test:regresion`: en 10 cuadros las instancias dibujadas (posición, tamaño, color, opacidad) y la selección con el mouse son idénticas al piloto original (107 instancias en nivel 4). Limitación: la regresión usa un mapa simulado en Node, no compara píxeles en navegador.

## 3. Escenas por departamento y vista previa
Hay **25 escenas definidas en los 16 departamentos** (plantas de procesamiento, plantas azucareras, nave industrial en Palpalá, galpones, establecimientos hoteleros, comercio y servicios). **Sólo Susques-minería está activa** (`piloto: true`); una actividad sólo se activa con `validada: true` y al menos una fuente.
El interruptor **«Vista previa ilustrativa»** (apagado por defecto) dibuja también las no validadas, con aviso permanente y el rótulo «Vista previa · escena no validada» en la ficha. Las plantillas son genéricas: ninguna corresponde a un establecimiento real.

## 4. Datos e indicadores
135 indicadores (7 provinciales, 128 departamentales) con unidad, escala, año, condición y fuente. **Ninguno está validado**: desde el entorno de desarrollo no hubo acceso a DPEC, INDEC, SIACAM ni a las demás fuentes, y no se cargaron valores ni URLs sin confirmar. 2026 se marca parcial (año en curso).

### Conciliación provincial vs. suma departamental (salida de `npm run check:data`)
```
Indicadores: 135 (provinciales 7, departamentales 128)
Sin validar con fuente oficial: 135/135
Con problemas de metadatos: 0
Datos de 2026: parciales (año en curso)
CONCILIACIÓN provincial vs suma de los 16 departamentos
  Empleo registrado                  2015  prov= 55420  suma= 59780  dif= -4360  NO CONCILIA
  Empleo registrado                  2018  prov= 62730  suma= 67150  dif= -4420  NO CONCILIA
  Empleo registrado                  2021  prov= 70265  suma= 74515  dif= -4250  NO CONCILIA
  Empleo registrado                  2024  prov= 82540  suma= 82330  dif=   210  NO CONCILIA
  Empleo registrado                  2026  prov= 89590  suma= 87120  dif=  2470  NO CONCILIA
  Producción de litio y minería      2015  prov=    36  suma=    33  dif=     3  NO CONCILIA
  Producción de litio y minería      2018  prov=    91  suma=    73  dif=    18  NO CONCILIA
  Producción de litio y minería      2021  prov=   171  suma=   133  dif=    38  NO CONCILIA
  Producción de litio y minería      2024  prov=   312  suma=   230  dif=    82  NO CONCILIA
  Producción de litio y minería      2026  prov=   432  suma=   314  dif=   118  NO CONCILIA
  Producción agroindustrial          2015  prov=   376  suma=   283  dif=    93  NO CONCILIA
  Producción agroindustrial          2018  prov=   400  suma=   307  dif=    93  NO CONCILIA
  Producción agroindustrial          2021  prov=   426  suma=   332  dif=    94  NO CONCILIA
  Producción agroindustrial          2024  prov=   467  suma=   367  dif=   100  NO CONCILIA
  Producción agroindustrial          2026  prov=   504  suma=   398  dif=   106  NO CONCILIA
  Actividad de turismo y servicios   2015  prov=   120  suma=   137  dif=   -17  NO CONCILIA
  Actividad de turismo y servicios   2018  prov=   156  suma=   195  dif=   -39  NO CONCILIA
  Actividad de turismo y servicios   2021  prov=   196  suma=   261  dif=   -65  NO CONCILIA
  Actividad de turismo y servicios   2024  prov=   275  suma=   367  dif=   -92  NO CONCILIA
  Actividad de turismo y servicios   2026  prov=   341  suma=   452  dif=  -111  NO CONCILIA
  Exportaciones                      2026  prov=  1817  suma=  1695  dif=   122  NO CONCILIA
  Empresas y PyMEs                   2026  prov=  3188  suma=  3135  dif=    53  NO CONCILIA
  Participación en el PBI            2026  prov=   100  suma= 145.4  dif= -45.4  NO CONCILIA
Crecimiento de empleo declarado vs calculado: NO coincide en santa_catalina (45% vs 47.6%), cochinoca (75% vs 76%), valle_grande (35% vs 36%)
```
Origen: los totales provinciales son literales escritos a mano en el App.jsx original (el comentario decía "aggregated", pero no se calculaban). La diferencia de empleo cambia de signo según el año, por lo que no se explica por "empleo no asignado". No se corrigió ningún valor.

## 5. Errores encontrados y corregidos durante las pruebas
1. **MapLibre 4.7.1 y la elevación del centro.** Tras easeTo/fitBounds/flyTo con relieve (incluido el encuadre inicial) queda `_elevationFreeze = true` y la altura del terreno bajo el centro de la cámara no se sigue hasta el primer gesto manual: el encuadre queda corrido y las escenas se ven desplazadas (el ancla llegó a caer fuera de pantalla). Se libera al terminar cada movimiento. Usa un campo interno de MapLibre con verificación de tipo; revisar si se actualiza la librería. Afectaba también a la app original.
2. **Descarte por cámara.** Las escenas no construidas se descartaban según el centroide del departamento y no su propia ancla; una segunda escena lejana podía no aparecer nunca. Hay una prueba que falla sin la corrección.
3. **Etiquetas de departamento** que interceptaban los clics sobre la escena (ahora el clic llega al mapa).
4. La altura del ancla se muestrea en cada cuadro (MapLibre la entrega relativa al centro de la pantalla).

## 6. Pruebas
**Node:** regresión de Susques, vista previa (25 escenas, anclas, descarte), descarga de escenas lejanas y CPU: todas pasan.
**Navegador real** (Chromium sin interfaz, WebGL por software, teselas simuladas, sin internet):
- Versión final: filtros, cambio Susques → Tilcara → Susques, reaparición de la escena, memoria y consola: 18/18. Cinco departamentos con dos escenas (vista previa): 25/25. Suite base hasta rotación: 26/26 en una corrida previa que se cortó.
- Antes de las correcciones 1 y 2, los 16 departamentos pasaron salvo la segunda escena de Ledesma (error 2). Los 16 se revisaron visualmente en capturas.
- No se vieron errores de JavaScript ni avisos de la aplicación.

### Rendimiento: lo medido y lo no medido
- CPU de JavaScript del motor: 0,02 ms por cuadro con una escena y 0,46 ms con las 25 a la vez (Node, peor caso).
- En el navegador de prueba (GPU emulada por software) la escena agrega ~7 ms por cuadro de dibujo y todo el mapa corre a ~2 cuadros/s: es el emulador. **El rendimiento en una GPU real NO fue medido.** Para medirlo: Chrome → F12 → Rendimiento → grabar 10 s con la escena de Susques en nivel 4.

## 7. Limitaciones
- Imagen satelital real (Esri) y relieve real (AWS) no se probaron; se simularon. Revisá las condiciones de uso de Esri.
- No se probó en Windows ni en tu hardware.
- Personas y vehículos son figuras procedurales: faltan los modelos GLB/GLTF (`MODELOS_REQUERIDOS`, carpeta prevista public/models/).
- Los datos económicos siguen siendo ilustrativos.
- Un salto brusco programático de cámara (`jumpTo`) con el relieve exagerado puede dejar MapLibre en blanco; no ocurre con rueda, arrastre ni vuelos animados.

## 8. Siguiente paso
Descargar las series oficiales, cargarlas en src/data/indicators.js (fuente completa, condición por punto, validacion: 'validado') y recién entonces validar actividades y activarlas.
