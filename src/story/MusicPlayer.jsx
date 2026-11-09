import React, { useEffect, useRef, useState } from 'react';
import { Music, Pause, Play, Volume2, VolumeX } from 'lucide-react';

// Música ambiental. Sin autoplay. Se detecta al compilar: copiá un archivo de audio en src/assets/audio/ (ver LEEME.md de esa carpeta).
// Mientras no haya archivo queda en estado «pendiente» y NO hace ningún pedido de red. Usá sólo audio que tengas derecho a usar.
const YOUTUBE_REFERENCIA = 'https://www.youtube.com/watch?v=C4VQj5XOQ7M';
const ARCHIVOS = import.meta.glob('../assets/audio/*.{mp3,ogg,wav,m4a,aac,flac}', { eager: true, query: '?url', import: 'default' });
const META = Object.values(import.meta.glob('../assets/audio/playlist.json', { eager: true, import: 'default' }))[0] || []; // opcional: [{ "file": "tema.mp3", "title": "...", "artist": "..." }]
const bonito = (ruta) => decodeURIComponent(ruta.split('/').pop()).replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
const PISTAS = Object.entries(ARCHIVOS).sort(([x], [y]) => x.localeCompare(y)).map(([ruta, url]) => {
  const nombre = ruta.split('/').pop(); const meta = Array.isArray(META) ? META.find((t) => t.file === nombre) : null;
  return { url, title: meta?.title || bonito(ruta), artist: meta?.artist || '' };
});

export default function MusicPlayer({ lifted = false }) {
  const audio = useRef(null);
  const track = PISTAS[0] || null;
  const [state, setState] = useState(track ? 'lista' : 'pendiente'); // pendiente | lista | error
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);

  useEffect(() => { if (audio.current) { audio.current.volume = volume; audio.current.muted = muted; } }, [volume, muted, state]);

  const toggle = () => {
    const a = audio.current; if (!a) return;
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => setState('error')); else { a.pause(); setPlaying(false); }
  };

  const pill = `fixed ${lifted ? 'left-3 bottom-[5.5rem]' : 'left-3 bottom-3 lg:left-auto lg:right-3'} z-40 flex items-center gap-2 rounded-full border border-white/15 bg-[#07111d]/90 backdrop-blur px-3 py-1.5 text-xs text-slate-200 max-w-[calc(100vw-1.5rem)]`;
  if (state !== 'lista') {
    return (
      <div className={pill} data-music="pendiente">
        <Music className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
        <span className="leading-tight text-slate-300 sm:max-w-[210px]" title="Copiá un archivo de audio en src/assets/audio/">{state === 'error' ? 'No se pudo reproducir el archivo.' : (<><span className="sm:hidden">Música pendiente</span><span className="hidden sm:inline">Música pendiente: agregá el archivo en src/assets/audio/</span></>)}</span>
        <a href={YOUTUBE_REFERENCIA} target="_blank" rel="noopener noreferrer" className="text-teal-300 underline underline-offset-2 whitespace-nowrap"><span className="sm:hidden">YouTube</span><span className="hidden sm:inline">Escuchar en YouTube</span></a>
      </div>
    );
  }
  return (
    <div className={pill} data-music="lista">
      <audio ref={audio} src={track.url} loop preload="none" onError={() => setState('error')} onEnded={() => setPlaying(false)} />
      <button onClick={toggle} aria-label={playing ? 'Pausar música' : 'Reproducir música'} aria-pressed={playing}
        className="grid place-items-center w-7 h-7 rounded-full bg-teal-400 text-[#04141c]">{playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}</button>
      <span className="max-w-[150px] truncate" title={track.title}>{track.title || 'Música'}{track.artist ? ` · ${track.artist}` : ''}</span>
      <button onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Activar sonido' : 'Silenciar'} aria-pressed={muted}>{muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
      <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Volumen" className="w-16 accent-teal-400" />
    </div>
  );
}
