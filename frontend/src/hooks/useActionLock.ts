import { useCallback, useRef } from 'react';

/**
 * useActionLock — Doppelklick-/Doppel-Fire-Schutz fuer Mod-Aktionen.
 *
 * Gibt eine `canFire(key)`-Funktion zurueck, die `true` liefert, wenn seit dem
 * letzten Erfolg fuer diesen Key mindestens `ms` Millisekunden vergangen sind,
 * sonst `false`. Mehrere Keys werden unabhaengig gelockt.
 *
 * Use-Case: bei Hot Potato kann der Mod schnell hintereinander Space druecken,
 * wodurch zwei `qq:hotPotatoFinishSlot`-Emits durchgehen — Backend hat zwar
 * State-basierte Idempotenz, aber kann subtle Race conditions geben (Timer-
 * Doppelstart, Phase-Skip). Der Lock unterbindet das clientseitig.
 *
 * @example
 *   const canFire = useActionLock(500);
 *   if (canFire('hp')) emit('qq:hotPotatoFinishSlot', ...);
 *   // Innerhalb von 500 ms wird ein zweiter Aufruf einfach uebersprungen.
 */
export function useActionLock(ms = 500) {
  const lastFireRef = useRef<Map<string, number>>(new Map());

  return useCallback((key: string): boolean => {
    const now = Date.now();
    const last = lastFireRef.current.get(key) ?? 0;
    if (now - last < ms) return false;
    lastFireRef.current.set(key, now);
    return true;
  }, [ms]);
}
