// ─────────────────────────────────────────────────────────────────────────────
// useSceneTransition — Szenenwechsel auf der Buehne als WECHSEL statt als SCHNITT
//
// Befund (Wolf 2026-08-18, Video-Mitschnitt derselben Session, 8 Bilder/s):
//   PHASE_INTRO -> QUESTION_ACTIVE : ein Bild lang praktisch leerer Schirm.
//   QUESTION_ACTIVE -> QUESTION_REVEAL : ZWEI volle Bilder leer (~250ms Schwarz).
// Ursache ist kein Fehler, sondern das Render-Muster: die alte View wird per
// `{phase === 'X' && <View/>}` sofort unmountet, die neue startet ihre eigene
// Einblendung bei Deckkraft 0. Dazwischen ist nichts. Das ist Wolfs
// „fuehlt sich wie PowerPoint an" (Notiz 2026-07-17 in scripts/record-run.mjs).
//
// Loesung ohne Anfassen der ~20 Views: den Phasenwechsel EINEN Frame halten und
// innerhalb von `document.startViewTransition` committen. Der Browser fotografiert
// dann die alte Szene, laesst React die neue committen und blendet selbst
// dazwischen ueber. Die Choreografie liegt in main.css (::view-transition-*).
//
// WICHTIG — warum das Halten im Render passiert und nicht im Effect:
// useLayoutEffect laeuft NACH dem React-Commit. Zu dem Zeitpunkt steht die neue
// Szene bereits im DOM, ein Schnappschuss waere also schon der neue Zustand.
// Deshalb geben wir waehrend des Renders weiter den zuletzt gezeigten State aus
// (das DOM bleibt unveraendert), und starten die Transition erst im Effect.
//
// Aus (enabled=false) ist das Verhalten byte-identisch mit vorher: der Live-State
// geht unveraendert durch, kein zusaetzlicher Render, kein Timer.
// ─────────────────────────────────────────────────────────────────────────────
import { useLayoutEffect, useReducer, useRef } from 'react';
import { flushSync } from 'react-dom';

type WithPhase = { phase: string };

/** Kann der Browser View Transitions? (Chrome/Edge ja, Beamer laeuft in Chrome.) */
export function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined'
    && typeof (document as Document & { startViewTransition?: unknown }).startViewTransition === 'function';
}

/** Respektiert die System-Einstellung „Bewegung reduzieren" (Funktions-Invariante). */
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Womit wird ein Wechsel erkannt?
 *
 * 2026-08-26 (Wolf: „nach letztem reveal und punkte vergabe wechselt die view
 * abrupt und unclean"). Bis hierher war das die PHASE - und das reicht nicht.
 * In FINAL_REVEAL wechselt die Ansicht dreimal komplett (Titel, Tipps, Turm),
 * ohne dass die Phase sich ruehrt. Genau dort wurde deshalb geschnitten statt
 * ueberblendet, und zwar an der Naht zwischen der letzten Tipp-Aufloesung und
 * dem Turm - dem Moment, in dem der Abend seine Punkte vergeben hat.
 *
 * `szene` ist optional. Ohne sie verhaelt sich der Haken exakt wie vorher.
 */
export function useSceneTransition<T extends WithPhase>(
  live: T,
  enabled: boolean,
  szene?: (s: T) => string,
): T {
  const schluessel = (s: T) => (szene ? szene(s) : s.phase);
  const [, forceRender] = useReducer((n: number) => n + 1, 0);
  const liveRef = useRef(live);
  liveRef.current = live;
  // Der zuletzt WIRKLICH gerenderte State. Wird nur fortgeschrieben, wenn wir
  // ihn auch ausgeben — dadurch ist der gehaltene Schnappschuss exakt das, was
  // auf dem Beamer steht (kein Mischzustand aus alter Phase + neuen Daten).
  const shownRef = useRef<T>(live);
  // Fuer welche Ziel-Phase laeuft bereits eine Transition? React ruft Effekte im
  // Dev-Modus (StrictMode) doppelt auf — ohne diese Sperre startet derselbe
  // Wechsel zwei Transitionen, die zweite bricht die erste mittendrin ab.
  const runningForRef = useRef<string | null>(null);

  const active = enabled && supportsViewTransitions() && !prefersReducedMotion();
  const holding = active && schluessel(live) !== schluessel(shownRef.current);
  if (!holding) shownRef.current = live;
  const out = holding ? shownRef.current : live;

  useLayoutEffect(() => {
    if (!holding) { runningForRef.current = null; return; }
    const ziel = schluessel(live);
    if (runningForRef.current === ziel) return;
    runningForRef.current = ziel;
    const doc = document as Document & {
      startViewTransition: (cb: () => void) => {
        ready: Promise<void>;
        finished: Promise<void>;
        updateCallbackDone: Promise<void>;
      };
    };
    let done = false;
    const commit = () => {
      if (done) return;
      done = true;
      shownRef.current = liveRef.current;
      forceRender();
    };
    // Nicht sichtbares Dokument (Beamer-Tab im Hintergrund, Fenster minimiert):
    // startViewTransition bricht dort mit InvalidStateError ab. Gar nicht erst
    // starten, direkt committen.
    if (document.visibilityState !== 'visible') { commit(); return; }
    try {
      const vt = doc.startViewTransition(() => { flushSync(commit); });
      // ── WICHTIG (Live-Fund Wolf 2026-08-18) ──────────────────────────────
      // Die drei Zusagen der View-Transition werden REGULAER abgelehnt, wenn
      // ein Wechsel abgebrochen wird: naechster Phasenwechsel waehrend die
      // Transition noch laeuft, Tab wechselt in den Hintergrund, Dokument nicht
      // mehr „fully active". Das ist kein Fehlerfall, sondern Normalbetrieb an
      // einem Abend mit schnellem Durchsteppen.
      // Ohne Fang landen sie im `unhandledrejection`-Listener aus main.tsx —
      // und der legt ein bildschirmfuellendes Fehler-Overlay ueber die BUEHNE
      // („Client error: Transition was aborted because of invalid state").
      // Also: alle drei Zusagen still abfangen, und bei Abbruch sicherstellen,
      // dass die neue Szene trotzdem steht.
      vt?.ready?.catch(() => {});
      vt?.updateCallbackDone?.catch(() => { commit(); });
      vt?.finished?.catch(() => { commit(); });
    } catch {
      // Synchroner Wurf (aeltere Implementierungen): Buehne darf NICHT auf der
      // alten Szene haengen bleiben.
      commit();
    }
    // Sicherheitsnetz: bliebe der Callback aus irgendeinem Grund aus, waere die
    // Buehne eingefroren. Nach 600ms hart committen.
    const t = window.setTimeout(commit, 600);
    return () => window.clearTimeout(t);
  });

  return out;
}
