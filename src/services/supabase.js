// SUPABASE STORAGE: fotografías de la historia
// - Sólo usa la clave pública (anon). NUNCA poner service_role ni claves secretas en el frontend.
// - Variables de entorno: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (ver .env.example).
// - El cliente se descarga recién cuando hace falta (no pesa en la carga inicial).
// - Tabla `storytelling_media` + bucket público `jujuy-storytelling` (script en supabase/storytelling_media.sql).
import { placeholderFor } from '../story/placeholders';

export const BUCKET = 'jujuy-storytelling';
const URL_ = import.meta.env.VITE_SUPABASE_URL;
const KEY_ = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TRANSFORM = import.meta.env.VITE_SUPABASE_IMAGE_TRANSFORM === 'true'; // requiere el plan con transformación de imágenes

export const supabaseConfigurado = Boolean(URL_ && KEY_);

let clientPromise = null;
const getClient = () => (clientPromise ||= import('@supabase/supabase-js').then(({ createClient }) => createClient(URL_, KEY_, { auth: { persistSession: false } })));

const cache = new Map();

// URL pública de un archivo del bucket a partir de su storage_path (nunca se guardan URLs en la base)
export const getPublicImageUrl = async (storagePath) => {
  const sb = await getClient();
  const opts = TRANSFORM ? { transform: { width: 1400, quality: 78 } } : undefined;
  return sb.storage.from(BUCKET).getPublicUrl(storagePath, opts).data.publicUrl;
};

// Imágenes de un capítulo. Devuelve { source: 'supabase' | 'referencia', images, error? }.
// Si no hay fotografías cargadas (o Supabase no está configurado o falla) devuelve la imagen de referencia provisional.
export async function getChapterImages(chapterSlug, extraSlugs = []) {
  const slugs = [chapterSlug, ...extraSlugs];
  const key = slugs.join('|');
  if (cache.has(key)) return cache.get(key);
  const fallback = (error) => ({ source: 'referencia', images: [placeholderFor(chapterSlug)], ...(error ? { error } : {}) });
  let result;
  if (!supabaseConfigurado) result = fallback();
  else {
    try {
      const sb = await getClient();
      const { data, error } = await sb.from('storytelling_media').select('id, chapter_slug, department_slug, title, description, storage_path, alt_text, display_order')
        .in('chapter_slug', slugs).eq('is_active', true).order('display_order', { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) result = fallback();
      else {
        const images = await Promise.all(data.map(async (r) => ({ id: r.id, title: r.title || '', description: r.description || '', alt: r.alt_text || r.title || 'Fotografía de Jujuy', url: await getPublicImageUrl(r.storage_path), departmentSlug: r.department_slug || null, isPlaceholder: false })));
        result = { source: 'supabase', images };
      }
    } catch (e) { result = fallback(e.message || String(e)); }
  }
  cache.set(key, result);
  return result;
}
