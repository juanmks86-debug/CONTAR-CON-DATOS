# Fotografías de la historia (Supabase)

La historia lee las fotografías de **Supabase Storage** y sus datos de la tabla `storytelling_media`.
Mientras no cargues fotografías, cada capítulo muestra una **imagen de referencia provisional** claramente rotulada. Cuando cargues fotos reales, se reemplazan solas, sin tocar el diseño.

## 1. Crear el bucket y la tabla (una sola vez)
1. Entrá a tu proyecto en Supabase → **SQL Editor** → *New query*.
2. Pegá el contenido de `supabase/storytelling_media.sql` y ejecutá **Run**.
   Crea el bucket público `jujuy-storytelling`, la tabla `storytelling_media`, el índice y las políticas de seguridad (RLS): el sitio sólo puede **leer** filas activas.

## 2. Capítulos y carpetas
| Capítulo | `chapter_slug` / carpeta en el bucket |
|---|---|
| Portada (arriba del capítulo 1) | `portada` |
| 01 El territorio | `territorio` |
| 02 La transformación minera | `mineria` |
| 03 Energías renovables | `energia` |
| 04 Agroindustria | `agroindustria` |
| 05 Turismo y servicios | `turismo` |
| 06 Empleo y desarrollo | `empleo` |
| 07 El futuro de Jujuy | `futuro` |
| Fotos por departamento o localidad | `departamentos` (con `department_slug`: `susques`, `humahuaca`, `tilcara`, `perico`, `san-salvador`, `otros`) |

El capítulo 01 muestra las imágenes de `territorio` y de `portada`.

## 3. Subir una fotografía
1. **Storage → jujuy-storytelling → Upload file.** Si querés “carpeta”, ponele el prefijo al nombre (p. ej. `mineria/salar-01.webp`); Supabase la crea sola.
2. Agregá la fila en **Table Editor → storytelling_media → Insert row** (o con SQL, ver ejemplos al final del `.sql`):
   - `chapter_slug`: el slug del capítulo (tabla de arriba)
   - `storage_path`: la ruta **exacta** dentro del bucket, por ejemplo `mineria/salar-01.webp` (no la URL)
   - `title`, `description` (incluí autoría o fuente), `alt_text` (descripción para lectores de pantalla)
   - `display_order`: 1, 2, 3… (menor primero) · `is_active`: `true`
3. Recargá el sitio: la foto aparece en su capítulo. Para ocultarla sin borrarla, poné `is_active = false`.

## 4. Recomendaciones para que cargue rápido
- Formato **WebP** (o AVIF), ancho máximo **1600 px**, idealmente **menos de 300 KB** por foto.
- Hasta 4 fotos por capítulo (el sitio muestra las primeras 4). Las imágenes cargan de forma diferida y con marcador de espacio.
- Usá sólo fotografías que tengas derecho a publicar y cargá la autoría en `description`.

## 5. Conectar el sitio
1. Copiá `.env.example` como `.env.local` y completá la URL y la clave **anon** (Supabase → *Project Settings → API*).
2. En **Vercel → Settings → Environment Variables** cargá las mismas dos variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) y volvé a desplegar (las variables `VITE_*` se incorporan al compilar).
3. **Nunca** pongas la clave `service_role` en el proyecto ni en Vercel con prefijo `VITE_`: quedaría pública.

## 6. Si algo no aparece
- Se ve la imagen de referencia: no hay filas activas para ese capítulo, o falta configurar las variables de entorno.
- Aviso «No se pudo cargar la fotografía»: el `storage_path` no coincide con el archivo del bucket (revisá mayúsculas, guiones y extensión).
- Consulta de verificación en SQL Editor: `select chapter_slug, storage_path, is_active from public.storytelling_media order by chapter_slug, display_order;`

## 7. Opcional: versiones redimensionadas
Con un plan que incluya transformación de imágenes, definí `VITE_SUPABASE_IMAGE_TRANSFORM=true` para pedir versiones de 1400 px a calidad 78.
