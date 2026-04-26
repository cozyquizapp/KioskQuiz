// Hook der Caveat (handwritten) + Lora (serif) von Google Fonts laedt.
// Idempotent — wird die Page mehrfach gemountet, kommt der <link> nur
// einmal in <head>.

import { useEffect, useState } from 'react';

const LINK_ID = 'qq-gouache-fonts';
const HREF = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Lora:ital,wght@0,400;0,600;0,700;1,400&display=swap';

export function usePaintFonts(): boolean {
  const [ready, setReady] = useState(() => !!document.getElementById(LINK_ID));

  useEffect(() => {
    let link = document.getElementById(LINK_ID) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = LINK_ID;
      link.rel = 'stylesheet';
      link.href = HREF;
      document.head.appendChild(link);
    }
    const onLoad = () => setReady(true);
    link.addEventListener('load', onLoad);
    // Fallback fuer den Fall dass „load" schon gefeuert hat
    const t = window.setTimeout(() => setReady(true), 1500);
    return () => {
      link?.removeEventListener('load', onLoad);
      window.clearTimeout(t);
    };
  }, []);

  return ready;
}
