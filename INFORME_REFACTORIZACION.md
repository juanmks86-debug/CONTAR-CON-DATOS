# Informe del proyecto: motor modular, vista previa de escenas, metadatos de datos e historia (storytelling)

## 1. Qué hay ahora
- **Modo Historia** (por defecto): 7 capítulos donde el scroll dirige el mismo mapa 3D. **Modo Explorar datos**: la interfaz anterior. Un solo mapa para los dos (no se desmonta al cambiar).
- **Motor 3D modular** (src/components/Map3D) con 25 escenas definidas en los 16 departamentos; sólo Susques-minería está activa. Interruptor «Vista previa ilustrativa» (apagado por defecto) para ver las demás, rotuladas como no validadas.
- **Metadatos de indicadores** (unidad, escala, año, condición, fuente) y conciliación provincial vs. departamental.
- **Fotografías** desde Supabase Storage (script SQL + guía en docs/FOTOGRAFIAS.md) con imágenes de referencia provisionales rotuladas. **Música** local pendiente de archivo (src/assets/audio/).

## 2. Decisiones del proyecto aplicadas
- Capítulo 3: foco en Cauchari con las coordenadas aportadas por el proyecto (-24.10169, -66.71382), que caen dentro del polígono de Susques. Siguen **pendientes de verificación con fuente oficial**. La escena solar es ilustrativa; no hay indicadores de capacidad (Información no disponible).
- Capítulo 5: turismo (4 departamentos) + Palpalá; Belgrano no.
- Música: pendiente; se adjunta un archivo en src/assets/audio/. El proyecto no incluye ni descarga ninguna pista (revisar derechos de uso).
- Supabase: script SQL en supabase/storytelling_media.sql.

## 3. Susques idéntico al piloto
`npm run test:regresion`: en 10 cuadros las instancias dibujadas y la selección con el mouse son idénticas al piloto original (107 instancias en nivel 4), con las 16 geometrías cargadas y sólo Susques-minería dibujada. Limitación: usa un mapa simulado en Node.

## 4. Datos e indicadores
135 indicadores (7 provinciales, 128 departamentales). **Ninguno está validado**: desde el entorno de desarrollo no hubo acceso a DPEC, INDEC, SIACAM ni a las demás fuentes, y no se cargaron valores ni URLs sin confirmar. Los datos de 2026 son parciales (año en curso). En la historia, todo indicador declara ámbito (provincial o departamental, nunca mezclados), unidad, año, condición y fuente; lo que no existe dice «Información no disponible» (población, proyectos e inversiones, capacidad solar instalada, visitantes).

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
Origen: los totales provinciales son literales escritos a mano en el App.jsx original (el comentario decía "aggregated", pero no se calculaban). La diferencia de empleo cambia de signo según el año, por lo que no se explica por "empleo no asignado". No se corrigió ningún valor; el capítulo 6 lo advierte.

## 5. Errores encontrados y corregidos durante las pruebas
1. **El mapa no repintaba los cambios de estado con relieve (MapLibre 4.7.1).** Con terreno 3D, los polígonos se dibujan en texturas por baldosa en caché que no se invalidan al cambiar el feature-state (resalte, atenuación, intensidad): en el capítulo 6 los píxeles eran idénticos a los del 5. Afectaba también al filtro por sector de la app original. Se invalidan a mano tras cada cambio. Verificado midiendo el color real de los píxeles.
2. **Elevación del centro congelada tras vuelos de cámara (MapLibre 4.7.1):** el encuadre quedaba corrido y las escenas 3D desplazadas hasta el primer gesto manual. Se libera al terminar cada movimiento. Esto además hizo desaparecer la limitación anterior sobre saltos bruscos de cámara en blanco (verificado con tres saltos).
3. Descarte por cámara de escenas aún no construidas usaba el centroide del departamento y no el ancla de la escena.
4. Etiquetas de departamento que interceptaban los clics sobre la escena.
5. Celular: el encabezado desbordaba a 390 px y ensanchaba toda la página.
6. Un 404 en consola (archivo de lista de música inexistente y favicon): la música se detecta ahora al compilar y no hace pedidos de red.
7. Capítulo 3: la escena minera aparecía diminuta al fondo; ahora sólo se dibuja la solar.
8. Reproductor y etiquetas tapaban la atribución del mapa.

Los puntos 1 y 2 dependen de campos internos de MapLibre 4.7.1 (`_elevationFreeze`, `tile.rtt`), usados con verificación de tipo: revisar si se actualiza la librería.

## 6. Pruebas
**Node** (instalación limpia): regresión de Susques, vista previa (25 escenas), descarga de escenas, CPU, datos de la historia (grupos, ámbito, «no disponible»), `check:data`.
**Navegador real** (Chromium sin interfaz, WebGL por software, teselas simuladas, sin internet), sobre la versión final:
- Historia: 102 comprobaciones aprobadas — render por píxeles (6), escritorio (62: diseño, mapa fijo, rueda, 7 capítulos con resalte/foco/cámara, Cauchari, sin animaciones repetidas, reversibilidad, indicadores, cambio de modo con el mismo mapa), celular 390×844 (11), movimiento reducido (7) y Supabase simulado + música local (16).
- Explorar datos: 18/18 (filtros, cambio de departamento, reaparición de la escena, memoria, rendimiento, consola) y 15 comprobaciones sin fallos de la vista previa por departamento (cortada por el entorno; antes del cambio de estructura había pasado 25/25).
- Revisión visual de capturas de escritorio y celular.

### Rendimiento: lo medido y lo no medido
- CPU de JavaScript del motor: ~0,01 ms por cuadro con una escena y ~0,25 ms con las 25 a la vez (Node).
- El código de three.js y de Supabase se descarga aparte: el archivo principal bajó de 1,49 MB a 1,05 MB (298 KB comprimido).
- **El rendimiento en una GPU real NO fue medido** (el emulador por software corre el mapa a ~2 cuadros/s). Para medirlo: Chrome → F12 → Rendimiento → grabar 10 s recorriendo la historia.

## 7. Limitaciones
- **Supabase:** probado contra un servidor simulado; el script SQL se validó sintácticamente con el analizador de PostgreSQL pero **no se ejecutó en un proyecto real**. Las fotografías reales y la conexión las verificás vos.
- **Música:** sin archivo (pendiente). El enlace a YouTube de respaldo no pudo verificarse desde el entorno.
- Imagen satelital real (Esri) y relieve real (AWS) no se probaron; se simularon. Revisá las condiciones de uso de Esri.
- No se probó en Windows ni en tu hardware.
- Personas y vehículos son figuras procedurales: faltan los modelos GLB/GLTF (`MODELOS_REQUERIDOS`).
- Los datos económicos siguen siendo ilustrativos; las coordenadas de Cauchari son las aportadas por el proyecto.

## 8. Siguiente paso
Cargar fotografías reales (docs/FOTOGRAFIAS.md), agregar el audio, y descargar las series oficiales para cargarlas en src/data/indicators.js con su fuente completa.
