import { useEffect, useState } from 'react';

/**
 * useExpiry — sticky deadline-Hook fuer Auto-Submit + Input-Lock.
 *
 * Liefert `true` sobald `endsAt` erreicht ist (genauer: 150ms davor), bleibt
 * dann sticky `true` bis sich `endsAt` aendert. Vorlauf-Zeit ist dafuer da,
 * dass Auto-Submit noch in QUESTION_ACTIVE landet, bevor das Backend in
 * Reveal wechselt.
 *
 * Genutzt von allen Team-Phone-Inputs (TextInput, MuchoInput, AllInInput,
 * Top5Input, FixItInput, BluffInput, OnlyConnectInput, ImposterInput,
 * PinItInput, HotPotatoInput) sowie ConnectionsTeamCard.
 *
 * Extrahiert aus QQTeamPage.tsx 2026-05-13 (Refactor Phase 2.1).
 */
export function useExpiry(endsAt: number | null | undefined): boolean {
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (!endsAt) { setExpired(false); return; }
    const lead = 150;
    const ms = endsAt - lead - Date.now();
    if (ms <= 0) { setExpired(true); return; }
    setExpired(false);
    const t = setTimeout(() => setExpired(true), ms);
    return () => clearTimeout(t);
  }, [endsAt]);
  return expired;
}
