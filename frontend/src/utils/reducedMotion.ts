/**
 * reduced-motion Helper — respektiert `prefers-reduced-motion: reduce`.
 *
 * WICHTIG: Der globale CSS-Kill-Switch (`* { animation:none; transition:none }`
 * in main.css / TEAM_CSS) greift NUR bei CSS-Animationen/Transitions. JS/RAF-
 * getriebene Motion (Count-ups, Konfetti/Partikel, Leaflet-flyTo, imperative
 * Score-Bar-Tweens) umgeht ihn → hier explizit gaten. Design-Audit 2026-07-16.
 */
import { useEffect, useState } from 'react';

/** Synchron — fuer Nicht-Hook-Kontexte (utils, RAF-Effekte). */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'undefined'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Hook-Variante, live auf Aenderung der OS-Einstellung. */
export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const m = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduce(m.matches);
    on();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return reduce;
}
