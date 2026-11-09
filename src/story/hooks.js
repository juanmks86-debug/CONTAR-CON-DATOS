import { useEffect, useState } from 'react';

// Preferencia del sistema: movimiento reducido (sin vuelos de cámara animados ni animaciones ambientales)
export const usePrefersReducedMotion = () => {
  const q = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const [reduced, setReduced] = useState(!!q?.matches);
  useEffect(() => {
    if (!q) return undefined;
    const on = () => setReduced(q.matches);
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, [q]);
  return reduced;
};

export const useIsDesktop = () => {
  const q = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(min-width: 1024px)') : null;
  const [d, setD] = useState(q ? q.matches : true);
  useEffect(() => {
    if (!q) return undefined;
    const on = () => setD(q.matches);
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, [q]);
  return d;
};
