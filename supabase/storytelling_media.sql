-- ============================================================================
-- JUJUY DATA LAB · Fotografías de la historia (storytelling)
-- Cómo usarlo: Supabase → SQL Editor → pegar todo este archivo → Run.
-- Es seguro ejecutarlo más de una vez (usa IF NOT EXISTS / ON CONFLICT / DROP POLICY IF EXISTS).
-- Guía completa: docs/FOTOGRAFIAS.md
-- ============================================================================

-- 1) BUCKET PÚBLICO de imágenes ------------------------------------------------
-- Las imágenes se sirven por URL pública (sólo lectura). Subir archivos requiere iniciar sesión en el Dashboard.
insert into storage.buckets (id, name, public)
values ('jujuy-storytelling', 'jujuy-storytelling', true)
on conflict (id) do update set public = true;

-- Lectura pública de los archivos de ese bucket (la escritura NO queda habilitada para nadie desde el sitio web)
drop policy if exists "Lectura pública de jujuy-storytelling" on storage.objects;
create policy "Lectura pública de jujuy-storytelling"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'jujuy-storytelling');

-- 2) TABLA con los datos de cada imagen ----------------------------------------
-- Se guarda storage_path (ruta dentro del bucket), NUNCA la URL: el sitio arma la URL pública al leerla.
create table if not exists public.storytelling_media (
  id              uuid primary key default gen_random_uuid(),
  chapter_slug    text not null,                 -- capítulo al que pertenece (ver la lista del CHECK)
  department_slug text,                          -- opcional: departamento o localidad (susques, humahuaca, tilcara, perico, san-salvador...)
  title           text,                          -- título corto de la fotografía
  description     text,                          -- descripción / epígrafe (incluir autoría o fuente si corresponde)
  storage_path    text not null,                 -- p. ej. 'mineria/salar-cauchari-01.webp'
  alt_text        text,                          -- texto alternativo para lectores de pantalla (accesibilidad)
  display_order   integer not null default 0,    -- orden dentro del capítulo (menor primero)
  is_active       boolean not null default true, -- false = ocultar sin borrar
  created_at      timestamptz not null default now(),
  constraint storytelling_media_storage_path_key unique (storage_path),
  constraint storytelling_media_chapter_slug_check check (chapter_slug in
    ('portada','territorio','mineria','energia','agroindustria','turismo','empleo','futuro','departamentos'))
);

comment on table  public.storytelling_media              is 'Fotografías de la historia de Jujuy Data Lab (se leen desde el frontend con la clave pública).';
comment on column public.storytelling_media.storage_path is 'Ruta del archivo dentro del bucket jujuy-storytelling (no es una URL).';

create index if not exists storytelling_media_chapter_idx
  on public.storytelling_media (chapter_slug, is_active, display_order);

-- 3) SEGURIDAD (Row Level Security) --------------------------------------------
-- El sitio sólo puede LEER filas activas. No existen políticas de insert/update/delete para anon:
-- las altas y cambios se hacen desde el Dashboard (Table Editor / SQL Editor) con tu sesión.
alter table public.storytelling_media enable row level security;

drop policy if exists "Lectura pública de imágenes activas" on public.storytelling_media;
create policy "Lectura pública de imágenes activas"
  on public.storytelling_media for select
  to anon, authenticated
  using (is_active = true);

-- 4) EJEMPLOS (descomentar y ajustar DESPUÉS de subir el archivo al bucket) ------
-- insert into public.storytelling_media (chapter_slug, department_slug, title, description, storage_path, alt_text, display_order) values
--   ('portada',    null,       'Jujuy al atardecer',        'Panorámica de la provincia. Foto: AUTOR / FUENTE', 'portada/panoramica-01.webp',        'Montañas de Jujuy al atardecer',            1),
--   ('mineria',    'susques',  'Salar y explotación',       'Salar en la Puna. Foto: AUTOR / FUENTE',           'mineria/salar-01.webp',             'Salar de la Puna visto desde el aire',      1),
--   ('energia',    'susques',  'Parque Solar Cauchari',     'Foto: AUTOR / FUENTE',                             'energia/cauchari-01.webp',          'Paneles solares en la Puna',                1),
--   ('turismo',    'tilcara',  'Quebrada de Humahuaca',     'Foto: AUTOR / FUENTE',                             'turismo/quebrada-01.webp',          'Cerros de colores de la Quebrada',          1);

-- 5) CONSULTAS ÚTILES -----------------------------------------------------------
-- Imágenes de un capítulo, en el orden en que se muestran:
--   select title, storage_path, display_order from public.storytelling_media
--   where chapter_slug = 'mineria' and is_active order by display_order;
-- Ocultar una imagen sin borrarla:
--   update public.storytelling_media set is_active = false where storage_path = 'mineria/salar-01.webp';
