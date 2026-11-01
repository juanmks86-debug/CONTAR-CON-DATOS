# Informe de la refactorización modular (escenas 3D + metadatos de datos)

## 1. Qué cambió respecto de tu repositorio
| Tipo | Archivos |
|---|---|
| Modificados | README.md, package.json (scripts), src/App.jsx, src/geo.js (+25 líneas), src/index.css (1 línea), src/MapaJujuy.jsx (1 línea de importación + 2 líneas que sólo actúan en compilaciones de prueba) |
| Agregados | src/components/Map3D/ (6 módulos), src/config/ (2), src/data/ (indicators.js, sources.js), scripts/check-data.mjs, tests/ |
| Eliminados | src/escenas3d.js y src/escenasData.js (reemplazados por el motor modular; copias en tests/regresion/original/) |
| Sin cambios | src/data.js, public/data/jujuy-departamentos.geojson, PENDIENTES_TECNICOS.md |

Se conservan: mapa MapLibre, relieve, motor three.js (capa personalizada), animaciones de personas y vehículos, rotación, zoom y selección departamental.

## 2. Susques idéntico
El borrador modular previo NO era fiel (otro circuito de camiones, chimenea distinta y seleccionable, escena solar activa). Se corrigió y se verificó con `npm run test:regresion`: en 10 cuadros (distintos zoom, filtros y selección) las instancias dibujadas (posición, tamaño, color, opacidad) y la selección con el mouse son idénticas al piloto original (107 instancias en nivel 4). Con las 16 geometrías cargadas sólo se dibuja Susques-minería.
Limitación: la regresión usa un mapa simulado en Node, no compara píxeles en navegador.

Cambios deliberados que no alteran lo que se ve:
- La altura del ancla se muestrea en cada cuadro (MapLibre la entrega relativa al centro de la pantalla y cambia al mover la cámara).
- Las etiquetas de departamento ya no capturan clics (tapaban la escena); el clic llega al polígono, que sigue seleccionando el departamento.

## 3. Activación de escenas
Sólo Susques-minería está activa (`piloto: true`). Las demás están configuradas pero desactivadas: una actividad se activa únicamente con `validada: true` y al menos una fuente.

## 4. Datos e indicadores
135 indicadores (7 provinciales, 128 departamentales) con unidad, escala, año, condición y fuente. **Ninguno está validado**: desde el entorno de desarrollo no hubo acceso a DPEC, INDEC, SIACAM ni a las demás fuentes, y no se cargaron valores ni URLs sin confirmar. Las fuentes figuran como candidatas "sin consultar". El año 2026 se marca parcial (año en curso).

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
Origen: los totales provinciales son literales escritos a mano en el App.jsx original (el comentario decía "aggregated", pero no se calculaban). La diferencia de empleo cambia de signo según el año (negativa hasta 2021, positiva desde 2024), por lo que no se explica por "empleo no asignado a departamentos". No se corrigió ningún valor.

## 5. Pruebas
Navegador real (Chromium sin interfaz, WebGL por software, teselas simuladas): 46 comprobaciones aprobadas en dos corridas (32 + 14), sin errores de JavaScript ni avisos de la aplicación.
- Carga y 16 etiquetas; relieve activo; vista provincial sin elementos de escena.
- Acercamiento gradual con la rueda: el mapa nunca queda en blanco; instalaciones y vehículos desde zoom 8,8; personas en nivel 3; nivel 4 desde 12,7.
- Altura de la escena = altura del terreno dibujado.
- Controles (personas, vehículos, instalaciones, animaciones), ficha informativa con "Representación: Ilustrativa", filtros sectoriales, cambio Susques → Tilcara → Susques, zoom/desplazamiento/rotación.
- Memoria JS estable; descarga de escenas lejanas (15 materiales liberados a los 25 s) y reconstrucción.

### Rendimiento: lo medido y lo no medido
- CPU de JavaScript del motor: 0,01–0,07 ms por cuadro (Node).
- En el navegador de prueba, con GPU emulada por software, la escena agrega ~11 ms por cuadro de dibujo (0,43 ms sin escena) y todo el mapa corre a ~2 cuadros/s. Eso es el emulador: **el rendimiento en una GPU real NO fue medido**.
- Para medirlo en tu PC: Chrome → F12 → Rendimiento → grabar 10 s con la escena de Susques en nivel 4.

## 6. Limitaciones y riesgos conocidos
- MapLibre puede quedar en blanco tras un salto brusco programático de cámara (`jumpTo`) con el relieve exagerado; no ocurrió con rueda, arrastre ni vuelos animados. La app no hace saltos, salvo un ajuste de encuadre inicial.
- Imagen satelital real (Esri) y teselas de relieve reales (AWS) no se probaron; se simularon. Revisá las condiciones de uso de Esri.
- No se probó en Windows ni en tu hardware.
- Personas y vehículos son figuras procedurales: faltan los modelos GLB/GLTF (lista en `MODELOS_REQUERIDOS`, carpeta prevista public/models/).
- Los datos económicos siguen siendo ilustrativos.

## 7. Siguiente paso
Descargar las series oficiales y cargarlas en src/data/indicators.js (fuente completa, condición por punto, validacion: 'validado'); recién entonces validar actividades y activar escenas de otros departamentos.
