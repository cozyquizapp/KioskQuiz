// Hook: lädt die Gouache-Avatar-PNG, fällt auf cozy-cast zurück wenn die
// Gouache-Version (noch) nicht im public/-Ordner liegt. So kann der User
// die 8 neuen Bilder einzeln reinwerfen — jede tauscht sich live aus,
// ohne dass die App vorher auf alle 8 warten muss.
//
// Verhalten:
// - Mount: setzt URL initial auf Gouache-Pfad (falls vorhanden, lädt's
//   sofort); parallel checkt ein Image() ob die Datei wirklich da ist.
// - Falls Gouache-PNG fehlt: URL switcht still auf cozy-cast.
// - Falls beide fehlen: bleibt auf cozy-cast (das Browser-Fallback-
//   Verhalten ist dann „Broken-Image-Icon", was in unserem Code aber
//   nie passieren sollte da cozy-cast immer existiert).

import { useEffect, useState } from 'react';
import { gouacheAvatarUrl, cozyCastAvatarUrl } from './tokens';

// Modul-Cache — verhindert dass beim Re-Render ein neuer Image-Probe
// startet und kurz auf cozy-cast zurückspringt.
const probeCache = new Map<string, 'gouache' | 'cozy'>();

export function useGouacheAvatar(slug: string): {
  src: string;
  isGouache: boolean;
} {
  const cached = probeCache.get(slug);
  const [variant, setVariant] = useState<'gouache' | 'cozy'>(
    cached ?? 'gouache'  // Optimistisch starten — meistens ist die Datei da
  );

  useEffect(() => {
    if (probeCache.has(slug)) {
      setVariant(probeCache.get(slug)!);
      return;
    }
    const img = new Image();
    let cancelled = false;
    img.onload = () => {
      if (cancelled) return;
      probeCache.set(slug, 'gouache');
      setVariant('gouache');
    };
    img.onerror = () => {
      if (cancelled) return;
      probeCache.set(slug, 'cozy');
      setVariant('cozy');
    };
    img.src = gouacheAvatarUrl(slug);
    return () => { cancelled = true; };
  }, [slug]);

  const src = variant === 'gouache' ? gouacheAvatarUrl(slug) : cozyCastAvatarUrl(slug);
  return { src, isGouache: variant === 'gouache' };
}

// Force-Reset des Probe-Caches — z.B. wenn der User gerade neue Bilder
// reingelegt hat und die Status-Section live auffrischen soll.
export function resetGouacheAvatarCache(): void {
  probeCache.clear();
}
