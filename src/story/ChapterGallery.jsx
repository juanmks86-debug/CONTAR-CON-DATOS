import React, { useEffect, useState } from 'react';
import { getChapterImages } from '../services/supabase';
import { placeholderFor } from './placeholders';

// Galería de un capítulo: lee las fotografías de Supabase (o muestra la imagen de referencia provisional).
export default function ChapterGallery({ slug, extraSlugs = [] }) {
  const [state, setState] = useState({ loading: true, source: 'referencia', images: [] });
  const key = [slug, ...extraSlugs].join('|');
  useEffect(() => {
    let alive = true;
    setState({ loading: true, source: 'referencia', images: [] });
    getChapterImages(slug, extraSlugs).then((r) => alive && setState({ loading: false, ...r }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div data-gallery={slug} data-source={state.source}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Fotografías</h3>
        {!state.loading && (state.source === 'referencia'
          ? <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-400/50 text-amber-200 bg-amber-300/10">Referencia provisional</span>
          : <span className="text-[10px] px-2 py-0.5 rounded-full border border-teal-400/40 text-teal-200">Supabase Storage</span>)}
      </div>
      {state.loading ? (
        <div className="aspect-[3/2] rounded-xl bg-white/5 motion-safe:animate-pulse" role="status" aria-label="Cargando fotografías" />
      ) : (
        <div className={`grid gap-2 ${state.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {state.images.slice(0, 4).map((im, i) => <Figure key={im.id} im={im} slug={slug} big={i === 0 && state.images.length > 1} />)}
        </div>
      )}
    </div>
  );
}

function Figure({ im, slug, big }) {
  const [src, setSrc] = useState(im.url);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <figure className={`m-0 ${big ? 'col-span-2' : ''}`}>
      <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-white/5 border border-white/10">
        {!ready && <div className="absolute inset-0 motion-safe:animate-pulse bg-white/5" />}
        <img src={src} alt={im.alt} loading="lazy" decoding="async" width={im.width || 1200} height={im.height || 800}
          onLoad={() => setReady(true)}
          onError={() => { if (!failed) { setFailed(true); setSrc(placeholderFor(slug).url); } }}
          className={`h-full w-full object-cover transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`} />
      </div>
      {(im.title || im.description) && !im.isPlaceholder && (
        <figcaption className="mt-1 text-[11px] text-slate-400 leading-snug">{im.title}{im.title && im.description ? ' · ' : ''}{im.description}</figcaption>
      )}
      {failed && <figcaption className="mt-1 text-[11px] text-amber-300">No se pudo cargar la fotografía; se muestra una imagen de referencia.</figcaption>}
    </figure>
  );
}
