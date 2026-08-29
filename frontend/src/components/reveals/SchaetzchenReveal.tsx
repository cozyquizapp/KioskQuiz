/**
 * SchaetzchenReveal v4 — "NUR STRAHL" (Redesign 2026-07-16, Wolf).
 *
 * v2 (Chip-Lanes+Connectors) war Chaos, v3 (Strahl + 2-spalt. Liste) war verwirrend
 * (Lese-Reihenfolge unklar). v4: NUR der Zahlenstrahl, KEINE Liste.
 *  - Antwort-Tafel oben zentriert (Wahrheit = 50%, Gold, Count-up).
 *  - Mess-Schiene mittig + Gold-Wahrheits-Diamant + Skalen-Endlabels.
 *  - Jede Fraktion: Wappen direkt an ihrer Tipp-Position, in ZWEI Lanes (oben/unten
 *    am Strahl → halbe Dichte), sanft entzerrt (nur bei Overlap minimal geschoben),
 *    kurzer Stiel zur Schiene, Wert + signiertes Delta (+ Punkte in Arena) am Wappen.
 *  - Sieger: Gold-Ring + Pop + Gold-Messstrecke zur Wahrheit. Schätzchen-Identität
 *    ist Gold/Gelb (kein Pink).
 *
 * Beats: 0 Wappen steigen · 1 Beam + Count-up · 2 Nicht-Sieger dimmen · 3 Sieger-Pop.
 * Motion nur ueber transform/opacity, reduced-motion respektiert, Count-up mit
 * Hidden-Tab-Guard. Zahlen-Parsing (dt. Tausender/Dezimal) unveraendert.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRandKorrektur } from './useRandKorrektur';
import type { QQStateUpdate } from '../../../../shared/quarterQuizTypes';
import { qqMegaFactionName, qqMegaFactionSlug, qqIsMega } from '../../../../shared/quarterQuizTypes';
import { qqDistanceFactionScores, qqSchaetzchenParse } from '../../../../shared/qqDistanceScore';
import { QQTeamAvatar } from '../QQTeamAvatar';
import { QQEmojiIcon, QQIcon } from '../QQIcon';
import { isQuirkTileSet } from '../../quirks2Avatars';
import { playAvatarCascadeNote, playClimaxFinish } from '../../utils/sounds';
import { QQ_COLORS } from '../../../../shared/qqColors';
import { useActiveThemeId, getActiveThemeId, BUEHNE_THEME_ID, QQ_BUEHNE_RAND } from '../../qqTheme';
import { QQ_CATEGORY_LABELS } from '../../../../shared/quarterQuizTypes';

const MINT = QQ_COLORS.green300;
const GOLD = '#EAB308';
const GOLD_BRIGHT = '#FDE68A';
const DIM = 0.5; // brightness() der nicht-Sieger beim Saal-Dimmen (Wolf: Sieger klarer heben)

// Tipp-Zahl robust parsen: deutsche Tausender-Punkte + Dezimalkomma korrekt.
function parseGuess(raw: unknown): number {
  let t = String(raw ?? '').trim().replace(/[^\d.,-]/g, '');
  const hasDot = t.includes('.'), hasComma = t.includes(',');
  if (hasDot && hasComma) {
    t = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  } else if (hasComma) {
    const p = t.split(',');
    t = (p.length === 2 && p[1].length !== 3) ? p[0] + '.' + p[1] : t.replace(/,/g, '');
  } else if (hasDot) {
    const p = t.split('.');
    if (!(p.length === 2 && p[1].length !== 3)) t = t.replace(/\./g, '');
  }
  return Number(t);
}

export function SchaetzchenReveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  const target = q.targetValue as number;
  // Cozy Quirks: eckige Kachel → Ring hugt die Kachel (Radius 18%) statt rund.
  const quirkSet = isQuirkTileSet(s.avatarSetId);

  const unitStr = (lang === 'en' && q.unitEn ? q.unitEn : q.unit) ?? '';
  const looksLikeYear = (n: number) => Number.isInteger(n) && n >= 1000 && n <= 2100;
  const isYearUnit = !!q.isYearAnswer || /jahr|year/i.test(unitStr) || (target != null && looksLikeYear(target));
  const fmt = (n: number) => {
    const abs = Math.abs(n);
    if (isYearUnit) return String(Math.round(n));
    if (abs >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (abs >= 10000) return (n / 1000).toFixed(0) + 'k';
    if (abs >= 1000) return n.toLocaleString(lang === 'en' ? 'en-US' : 'de-DE');
    return n % 1 === 0 ? String(n) : n.toFixed(1);
  };

  const ranked = useMemo(() => {
    return s.answers
      .map(a => {
        const num = parseGuess(a.text);
        const team = s.teams.find(t => t.id === a.teamId);
        if (!team || !Number.isFinite(num)) return null;
        return { teamId: a.teamId, num, team, delta: Math.abs(num - target), submittedAt: a.submittedAt };
      })
      .filter((x): x is { teamId: string; num: number; team: NonNullable<ReturnType<typeof s.teams.find>>; delta: number; submittedAt: number } => !!x)
      .sort((a, b) => a.delta - b.delta || a.submittedAt - b.submittedAt);
  }, [s.answers, s.teams, target]);

  // CozyArena: pro Fraktion auf den besten Tipp bündeln.
  const isMega = qqIsMega(s);
  // 2026-07-15 (Wolf 'schau wo die wappen sind, wo das bild endet, wo der strahl
  // ist'): In der Arena liegt hinter der Bühne das Kolosseum-Bild (cover). Dessen
  // Schale endet deutlich vor dem Bildrand — volle Breite (Schiene/Ticks/Wappen bis
  // ~95%) schob Content in den dunklen Rand bzw. schnitt das rechte Wappen ab.
  // Darum die gesamte Strahl-Bühne in ein zentrales Band ziehen, das auf der Schale
  // sitzt. Nur Arena (der dunkle Default-BG braucht das nicht).
  // 2026-08-23 (Uebergabe 2a, Buehnen-Durchgang). Der Strahl selbst bleibt, wie
  // er ist - er IST die Mechanik dieser Kategorie, und sein Gold ist die
  // Kategoriefarbe von Schaetzchen, nicht die Fremdfarbe, die bei Top 5
  // rausgeflogen ist. Was fehlte, ist die Statuszeile, und was zu klein war,
  // sind die Beschriftungen: die Antwort-Ueberschrift lief auf 14px, die
  // Skalen-Enden auf 17px, das Delta am Wappen auf 16px. Das sind Werte fuer
  // eine Bildschirmseite, nicht fuer acht Meter.
  const istBuehne = getActiveThemeId() === BUEHNE_THEME_ID;

  // 2026-08-23, im Bild gemessen: ohne Rand (0%) klemmt der aeusserste Tipp an
  // der Bildkante. Die Wappen werden auf 5..95% der Flaeche geklemmt, das sind
  // bei 1760px noch 88px bis zum Rand - die Marke ist 64px breit, das
  // Wert-Kaestchen darunter breiter, und beides ist mittig ueber der Position.
  // Also lief die rechte Haelfte aus dem Bild. Auf der Buehne bekommt die
  // Flaeche 4% Rand je Seite, damit die Klemmung Platz zum Klemmen hat.
  const CONTENT_INSET = isMega ? 11 : (istBuehne ? 4 : 0); // % Rand je Seite
  // Arena-Wertung EXAKT wie Backend (per Handy, Ø über verbundene Handys) — nur
  // mega. Marker bleibt der beste Tipp (Visual), aber Ranking/Sieger = Punkte, so
  // matcht der Sieger 1:1 das Standing (Wolf 2026-07-14). qqSchaetzchenParse =
  // exakt der Backend-Parser fuer SCHAETZCHEN.
  const factionScores = useMemo(
    () => isMega
      ? qqDistanceFactionScores(s.answers.map(a => ({ teamId: a.teamId, text: a.text })), target, q.unit, s.teams as any, qqSchaetzchenParse)
      : new Map(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isMega, s.answers, s.teams, target, q.unit],
  );
  const ptsOfAvatar = (av: string) => Math.round((factionScores.get(av) as any)?.points ?? 0);

  // ── Variante „Spanne" (2026-08-29, Wolf: „bau die spanne als variante") ────
  // Heute sitzt das Wappen am BESTEN Tipp der Fraktion, die Punkte kommen aber
  // aus dem Durchschnitt ueber alle ihre Handys (deine Entscheidung vom
  // 14.07.: „Marker bleibt der beste Tipp (Visual), aber Ranking = Punkte").
  // Bild und Zahl erzaehlen damit leicht verschiedene Geschichten.
  //
  // Die Variante legt das Wappen auf den DURCHSCHNITT - also genau dorthin, wo
  // die Punkte herkommen - und zeichnet dahinter die Spanne der Fraktion vom
  // schlechtesten bis zum besten Tipp. Das ist das, was CozyQuiz baulich nicht
  // haben kann: bei acht Teams ist ein Tipp ein Tipp, bei fuenf Handys je
  // Fraktion ist die Streuung die eigentliche Geschichte.
  //
  // ⚠️ Nur zum Vergleichen, VORGABE ist weiter der bisherige Stand. Schalter:
  // ?spanne=1 in der Adresse oder localStorage qq-spanne=1.
  // 2026-08-29, Wolf am Bild: „spanne ist aus entfernung nicht wirklich
  // sichtbar". Stimmt - 4 px bei 62 Prozent Deckkraft sind auf zehn Meter
  // nichts. Deshalb gibt es die Variante jetzt in zwei Staerken, und dazu
  // einen Schalter fuer die zweite Frage („wie saehe das aus, wenn du das
  // untere Drittel mehr nutzt").
  //   qq-spanne = 1      leise (erster Entwurf)
  //   qq-spanne = 2      lesbar auf Entfernung
  //   qq-strahl = tief   groessere Wappen, Strahl weiter oben, damit die
  //                      untere Bahn den leeren Streifen fuellt
  const schalter = (name: string) => {
    if (typeof window === 'undefined') return null;
    try {
      const ausAdresse = new URLSearchParams(window.location.search).get(name.replace('qq-', ''));
      if (ausAdresse) return ausAdresse;
      return window.localStorage.getItem(name);
    } catch { return null; }
  };
  const spanneStufe = useMemo(() => Number(schalter('qq-spanne') ?? 0) || 0, []);
  const spanneAn = spanneStufe > 0;
  const strahlTief = useMemo(() => schalter('qq-strahl') === 'tief', []);

  /** Je Fraktion: kleinster, groesster und mittlerer Tipp ihrer Handys. */
  const spannen = useMemo(() => {
    const m = new Map<string, { min: number; max: number; avg: number; n: number }>();
    if (!isMega || !spanneAn) return m;
    const werte = new Map<string, number[]>();
    for (const r of ranked) {
      const l = werte.get(r.team.avatarId) ?? [];
      l.push(r.num);
      werte.set(r.team.avatarId, l);
    }
    for (const [av, l] of werte) {
      m.set(av, {
        min: Math.min(...l), max: Math.max(...l),
        avg: l.reduce((a, b) => a + b, 0) / l.length, n: l.length,
      });
    }
    return m;
  }, [isMega, spanneAn, ranked]);

  const rankedFinal = useMemo(() => {
    if (!isMega) return ranked;
    const bestByAvatar = new Map<string, typeof ranked[number]>();
    for (const r of ranked) {
      const prev = bestByAvatar.get(r.team.avatarId);
      if (!prev || r.delta < prev.delta) bestByAvatar.set(r.team.avatarId, r);
    }
    // In der Variante steht die Fraktion an ihrem Durchschnitt, nicht am besten
    // Tipp. Nur `num` und `delta` wechseln - Rangfolge und Sieger kommen
    // unveraendert aus den Backend-Punkten, daran aendert die Variante nichts.
    if (spanneAn) {
      for (const [av, r] of bestByAvatar) {
        const sp = spannen.get(av);
        // Der Durchschnitt bekommt die Genauigkeit der ANTWORT. Bei „88 Tasten"
        // stand sonst „75.7" am Wappen, und eine Dreiviertel-Taste gibt es nicht.
        if (sp) {
          const mittel = Number.isInteger(target) ? Math.round(sp.avg) : sp.avg;
          bestByAvatar.set(av, { ...r, num: mittel, delta: Math.abs(mittel - target) });
        }
      }
    }
    return [...bestByAvatar.values()]
      .map(r => ({ ...r, team: { ...r.team, name: qqMegaFactionName(r.team.avatarId, lang), emoji: qqMegaFactionSlug(r.team.avatarId) ?? r.team.emoji } }))
      // Ranking nach Backend-Punkten (nicht bester Tipp) → Sieger = Standing-Sieger.
      .sort((a, b) => (ptsOfAvatar(b.team.avatarId) - ptsOfAvatar(a.team.avatarId)) || a.delta - b.delta || a.submittedAt - b.submittedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranked, isMega, lang, factionScores, spanneAn, spannen, target]);

  const winner = rankedFinal[0] ?? null;
  // 2026-07-18 (Wolf „warum gewinnt jetzt das team? das wird hier nicht
  // ersichtlich"): wenn der Sieg NICHT ueber Naehe/Punkte entschieden wurde,
  // sondern ueber den Abschick-Zeitpunkt (Punkte-Gleichstand UND gleicher Abstand
  // zur Wahrheit, z.B. alle spot-on = alle 100P), dann wirkt der Sieger willkuerlich.
  // In dem Fall kennzeichnen wir ihn als „am schnellsten" (Speed-Tiebreak sichtbar).
  const winnerBySpeed = useMemo(() => {
    const w = rankedFinal[0], second = rankedFinal[1];
    if (!w || !second) return false;
    const sameDist = w.delta === second.delta;
    const samePts = !isMega || ptsOfAvatar(w.team.avatarId) === ptsOfAvatar(second.team.avatarId);
    return sameDist && samePts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankedFinal, isMega, factionScores]);
  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';
  useActiveThemeId();


  // Achse auf die Wahrheit zentriert, Ausreißer geclamped.
  // 2026-07-29 (Wolf-Finding #12 'ziel sieht komisch positioniert, 61 wirkt näher
  // als Sieger 62'): Root-Cause war die LINEARE Skala — ein Ausreißer (z.B. 129)
  // bläht `span` auf, wodurch die nahen Tipps (61/62/68) auf ~0.5% zusammengequetscht
  // wurden → der Sieger-Vorsprung war unsichtbar, 61 sah gleich nah aus. Fix:
  // signed-sqrt-Mapping → vergrößert die Nähe-zum-Ziel-Unterschiede (wo Schätzchen
  // spielt), staucht Ausreißer an die Ränder. Monoton in |v-target| → der Sieger
  // (kleinstes |Δ|) liegt IMMER sichtbar am nächsten am Gold-Diamant. Endlabels
  // „zu niedrig/hoch" bleiben stimmig (Skala zeigt Nähe, keine exakten Werte).
  const axisPct = useMemo(() => {
    let half = 1;
    for (const r of rankedFinal) half = Math.max(half, Math.abs(r.num - target));
    const span = half || 1;
    return (v: number) => {
      const d = v - target;
      const mag = Math.sqrt(Math.min(1, Math.abs(d) / span)); // 0..1, nahe Tipps gespreizt
      return Math.max(5, Math.min(95, 50 + Math.sign(d) * mag * 43));
    };
  }, [rankedFinal, target]);
  const tx = axisPct(target);

  // Redesign 2026-07-16 v4 (Wolf 'nur Strahl, keine Liste'): die Wappen sitzen
  // direkt am Strahl an ihrer Tipp-Position, in ZWEI Lanes (abwechselnd ober-/
  // unterhalb → halbe Dichte pro Reihe), sanft entzerrt (nur bei Overlap minimal
  // auseinandergeschoben, dann auf den echten Schwerpunkt zentriert). KEIN
  // Connector-Chaos: Tick UND Wappen sitzen auf derselben (ggf. minimal
  // verschobenen) Position, der Wert steht am Wappen. Keine Rangliste mehr.
  const spread = (arr: Array<{ x: number; cx: number; r?: { teamId: string } }>) => {
    if (arr.length < 2) return;
    const LO = 5, HI = 95; // % Mindestabstand der Wappen-Mitten in einer Lane
    // 2026-07-17 (Wolf bild 9): der Sieger ist ~2x so gross → braucht rechts/links
    // deutlich mehr Luft (20%) als die kleinen Wappen untereinander (12%), sonst
    // ueberlappt sein Gold-Ring den Nachbarn im dichten Cluster.
    const winId = winner?.teamId;
    arr.sort((a, b) => a.cx - b.cx);
    for (let i = 1; i < arr.length; i++) {
      const nearWin = arr[i].r?.teamId === winId || arr[i - 1].r?.teamId === winId;
      const min = nearWin ? 20 : 12;
      if (arr[i].cx < arr[i - 1].cx + min) arr[i].cx = arr[i - 1].cx + min;
    }
    const meanReal = arr.reduce((s, c) => s + c.x, 0) / arr.length;
    const meanCx = arr.reduce((s, c) => s + c.cx, 0) / arr.length;
    const shift = meanReal - meanCx;
    for (const c of arr) c.cx += shift;
    const minCx = Math.min(...arr.map(c => c.cx));
    const maxCx = Math.max(...arr.map(c => c.cx));
    if (minCx < LO) { const d = LO - minCx; for (const c of arr) c.cx += d; }
    else if (maxCx > HI) { const d = maxCx - HI; for (const c of arr) c.cx -= d; }
  };
  const placed = useMemo(() => {
    // nach Tippwert sortiert, abwechselnd obere/untere Lane, jede Lane separat entzerrt.
    // 2026-07-17 (Wolf bild 9): der Sieger IMMER in die obere Lane (Hero oben, wie im
    // sauberen Fall) → er kollidiert nicht mehr mit einem kleinen Nachbarn unten.
    const winId = winner?.teamId;
    let k = 0;
    const sorted = [...rankedFinal]
      .sort((a, b) => a.num - b.num)
      .map((r) => {
        const isWin = r.teamId === winId;
        return { r, x: axisPct(r.num), cx: axisPct(r.num), above: isWin ? true : (k++ % 2 === 1) };
      });
    const above = sorted.filter(c => c.above);
    spread(sorted.filter(c => !c.above));
    spread(above);
    // 2026-07-18 (Wolf 'Sieger liegt am weitesten weg vom Zielstreifen'): bei
    // dicht/identisch geclusterten Tipps (z.B. alle spot-on) streute spread den
    // Sieger ans Lane-Extrem — obwohl er der beste ist, wirkte er als "weit weg".
    // Fix: den Sieger auf seine ECHTE Tipp-Position (axisPct) verankern (spot-on
    // = Ziel-Mitte), die restliche obere Lane relativ mitschieben, dann clampen.
    const win = above.find(c => c.r.teamId === winId);
    if (win) {
      const dx = axisPct(winner!.num) - win.cx;
      if (dx) {
        for (const c of above) c.cx += dx;
        const lo = Math.min(...above.map(c => c.cx)), hi = Math.max(...above.map(c => c.cx));
        if (lo < 5) { const d = 5 - lo; for (const c of above) c.cx += d; }
        else if (hi > 95) { const d = hi - 95; for (const c of above) c.cx -= d; }
      }
    }
    // 2026-07-30 (Wolf 'blau hat exakt getroffen, aber teal wirkt naeher — darf
    // nicht sein'): spread() konnte einen Nicht-Sieger in die Sieger-Spalte (~tx)
    // druecken, wodurch ein Fast-Treffer optisch naeher am Gold-Diamant sass als
    // der exakte Sieger. MOAT: kein Nicht-Sieger naeher als GAP an der Sieger-Spalte;
    // Ueberlappungen werden nach AUSSEN (weg von der Wahrheit) aufgeloest → der
    // Sieger besitzt die Mitte unmissverstaendlich. Nur wenn der Sieger auch der
    // naechste Tipp ist (sonst waere ein naeherer Tipp legitim naeher — Arena-
    // Punktesieger bleibt unberuehrt).
    const winnerIsNearest = !!winner && rankedFinal.every(r => r.delta >= winner.delta);
    if (winnerIsNearest) {
      const wcx = above.find(c => c.r.teamId === winId)?.cx ?? tx;
      const GAP = 14, STEP = 12;
      const moat = (lane: typeof sorted) => {
        const left  = lane.filter(c => c.r.teamId !== winId && c.cx <= wcx).sort((a, b) => b.cx - a.cx);
        const right = lane.filter(c => c.r.teamId !== winId && c.cx >  wcx).sort((a, b) => a.cx - b.cx);
        let e = wcx - GAP; for (const c of left)  { if (c.cx > e) c.cx = e; e = c.cx - STEP; }
        e = wcx + GAP;     for (const c of right) { if (c.cx < e) c.cx = e; e = c.cx + STEP; }
        for (const c of lane) if (c.r.teamId !== winId) c.cx = Math.max(5, Math.min(95, c.cx));
      };
      moat(above);
      moat(sorted.filter(c => !c.above));
    }
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankedFinal, axisPct, winner]);

  // 2026-08-29: dieselbe Falle wie im Schwarm-Strahl. `spread()` klemmt die
  // MITTE der Kachel auf 95 Prozent und kennt ihre Breite nicht. Hier ist die
  // Kachel schmaler als drueben (nur Wappen und Wert), deshalb war die Messung
  // in der Probe gruen - das Loch ist aber dasselbe, es faengt nur spaeter an.
  const buehneRef = useRef<HTMLDivElement | null>(null);
  useRandKorrektur(buehneRef, placed);

  const wx = winner ? axisPct(winner.num) : 50;

  // ── Dramaturgie: 0 Chips · 1 Beam+Count-up · 2 Dimmen · 3 Sieger ──
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [beat, setBeat] = useState<number>(reduce ? 3 : 0);
  const N = Math.max(1, placed.length);
  useEffect(() => {
    if (reduce) return;
    const sfx = !s.sfxMuted;
    const tBeam = 400 + N * 90 + 350;
    const tDark = tBeam + 1200;
    const tWin = tDark + 550;
    const ts: ReturnType<typeof setTimeout>[] = [
      setTimeout(() => setBeat(1), tBeam),
      setTimeout(() => setBeat(2), tDark),
      setTimeout(() => setBeat(3), tWin),
    ];
    if (sfx) {
      placed.forEach((_, i) => { ts.push(setTimeout(() => { try { playAvatarCascadeNote(i, N + 2); } catch {} }, 400 + i * 90)); });
      ts.push(setTimeout(() => { try { playClimaxFinish(); } catch {} }, tWin));
    }
    return () => ts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Count-up (Hidden-Tab-Guard; Jahre nicht hochzählen).
  const [shown, setShown] = useState<number>(reduce ? target : 0);
  const doCount = !isYearUnit;
  const rafRef = useRef<number | null>(null);
  const startCount = beat >= 1;
  useEffect(() => {
    if (!startCount) return;
    if (reduce || !doCount || (typeof document !== 'undefined' && document.hidden)) { setShown(target); return; }
    const start = performance.now(); const dur = 900;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(target * e);
      if (p < 1) rafRef.current = requestAnimationFrame(tick); else setShown(target);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [startCount, target, reduce, doCount]);

  const struck = beat >= 1;
  const housedark = beat >= 2;
  const lit = beat >= 3;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      // 2026-08-24 (Wolf: „gleich die schaetzchen aufloesung mit an"). Gemessen
      // sass die Kategorie-Pille hier auf x50 y26, auf der Fragefolie derselben
      // Kategorie dagegen auf x28 y28 - das Polster war oben 2cqh (Hoehe) und
      // seitlich 3cqw (Breite), also wieder zwei Bezugsgroessen und zwei
      // verschiedene Raender. Auf der Buehne jetzt derselbe eine Wert wie
      // ueberall. Unten bleibt es enger: dort steht der Strahl, kein Text.
      padding: istBuehne
        ? `${QQ_BUEHNE_RAND} ${QQ_BUEHNE_RAND} clamp(10px, 1.4cqh, 20px)`
        : 'clamp(14px, 2cqh, 26px) clamp(20px, 3cqw, 52px) clamp(10px, 1.4cqh, 20px)',
      animation: 'contentReveal 0.5s var(--qq-enter) both',
      minHeight: 0, position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes qqStr2Rise{0%{transform:translateY(24px);opacity:0}100%{transform:translateY(0);opacity:1}}
        @keyframes qqStr2Strike{0%{transform:scale(1.07)}100%{transform:scale(1)}}
        @keyframes qqStr2Sweep{0%{transform:translateX(-60%);opacity:0}25%{opacity:1}100%{transform:translateX(60%);opacity:0}}
      `}</style>

      {/* Kopf */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 6 }}>
        {istBuehne ? (
          <span style={{
            display: 'inline-block', marginBottom: 'clamp(3px, 0.5cqh, 7px)',
            padding: 'clamp(6px, 0.7cqh, 12px) clamp(14px, 1.6cqw, 28px)',
            borderRadius: 'var(--qq-pill-radius)',
            background: 'var(--qq-stage-accent)',
            color: '#12100E', fontWeight: 900, lineHeight: 1,
            fontSize: 'clamp(16px, 1.7cqw, 30px)',
            letterSpacing: '0.06em', whiteSpace: 'nowrap',
          }}>
            {(QQ_CATEGORY_LABELS.SCHAETZCHEN?.[lang] ?? 'Schätzchen').toUpperCase()}
          </span>
        ) : (
          <div style={{
            fontSize: 'clamp(11px, 1.05cqw, 16px)', fontWeight: 900, color: 'var(--qq-accent)',
            letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 'clamp(3px, 0.5cqh, 7px)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <QQIcon slug="cat-schaetzchen" size="1.25em" /> {lang === 'en' ? 'Guess It · Reveal' : 'Schätzchen · Auflösung'}
          </div>
        )}
        <div key={lang} style={{
          fontSize: istBuehne
            ? (qText.length > 90 ? 'clamp(24px, 2.5cqw, 40px)' : 'clamp(28px, 3cqw, 50px)')
            : (qText.length > 90 ? 'clamp(16px, 1.8cqw, 29px)' : 'clamp(18px, 2.3cqw, 37px)'),
          fontWeight: 900, lineHeight: 1.12, letterSpacing: '-0.01em', color: 'var(--qq-card-text)',
          maxWidth: '62%', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          animation: 'langFadeIn 0.4s ease both', textWrap: 'pretty',
        }}>{qText}</div>
      </div>

      {/* Bühne: NUR Strahl (Wolf 2026-07-16 v4). Wappen sitzen in zwei Lanes direkt
          am Strahl an ihrer Tipp-Position, Wert+Delta am Wappen. Keine Liste. */}
      <div ref={buehneRef} style={{ flex: 1, position: 'relative', minHeight: 0, zIndex: 1 }}>
        {placed.length === 0 ? (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--qq-text-muted)', fontSize: 'clamp(20px, 2.2cqw, 32px)', fontWeight: 700,
          }}>{lang === 'en' ? 'No valid guesses.' : 'Keine gültigen Schätzungen.'}</div>
        ) : (() => {
          // ⚠️ 54 % bleibt, auch in der Variante. Der erste Anlauf schob die
          // Schiene auf 46 %, um „das untere Drittel zu nutzen" - und lieferte
          // genau das Gegenteil: die obere Bahn wuchs in den Antwort-Kasten
          // hinein und verdeckte ihn, waehrend der leere Streifen unten blieb.
          // Ausgemessen ist unten ohnehin kein Drittel frei, sondern rund
          // 180 px, oben rund 150 - der Block haengt also schon fast mittig.
          // Was der Hoehe wirklich hilft, ist nicht Verschieben, sondern
          // Wachsen: gleiche Achse, groessere Wappen.
          const RAIL = 54; // % Höhe: die Mess-Schiene, Wappen darüber/darunter
          const winnerCx = placed.find(p => p.r.teamId === winner?.teamId)?.cx ?? wx;
          return (
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${CONTENT_INSET}%`, right: `${CONTENT_INSET}%` }}>
            {/* Licht-Sweep */}
            <div aria-hidden style={{
              position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none', opacity: 0,
              background: 'linear-gradient(105deg, transparent 38%, rgba(255,244,214,0.13) 50%, transparent 62%)',
              animation: struck && !reduce ? 'qqStr2Sweep 0.9s var(--qq-enter) both' : 'none',
            }} />

            {/* Antwort-Tafel oben zentriert (Wahrheit = 50%) */}
            <div aria-hidden style={{
              position: 'absolute', left: `${tx}%`, top: 0, transform: 'translateX(-50%)',
              zIndex: 7, display: 'flex', flexDirection: 'column', alignItems: 'center',
              opacity: struck ? 1 : 0, transition: 'opacity 0.35s var(--qq-enter)',
            }}>
              <span style={{
                fontSize: istBuehne ? 'clamp(15px, 1.6cqw, 26px)' : 'clamp(9px, 0.95cqw, 14px)',
                fontWeight: 900, color: 'var(--qq-text-muted)',
                letterSpacing: istBuehne ? '0.26em' : '0.2em', textTransform: 'uppercase', marginBottom: 4,
              }}>{lang === 'en' ? 'Answer' : 'Antwort'}</span>
              <div style={{
                display: 'inline-flex', alignItems: 'baseline', gap: 'clamp(3px,0.5cqw,9px)',
                padding: 'clamp(6px,0.9cqh,13px) clamp(14px,1.6cqw,26px)', borderRadius: 18,
                background: 'linear-gradient(180deg, rgba(30,24,58,0.94), rgba(10,8,24,0.94))',
                boxShadow: `0 0 0 2px ${GOLD}8c, inset 0 1px 0 rgba(246, 239, 230,0.10)`,
                animation: struck && !reduce ? 'qqStr2Strike 0.5s var(--qq-celebrate) both' : 'none',
              }}>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 4.8cqw, 84px)', fontWeight: 700,
                  lineHeight: 0.92, color: GOLD_BRIGHT, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                  textShadow: `none`,
                }}>{fmt(shown)}</span>
                {unitStr && (
                  <span style={{ fontSize: 'clamp(13px, 1.6cqw, 26px)', fontWeight: 900, color: GOLD }}>{unitStr}</span>
                )}
              </div>
            </div>

            {/* Wahrheits-Beam (Tafel → Schiene) */}
            <div aria-hidden style={{
              position: 'absolute', left: `${tx}%`, top: '24%', height: `${RAIL - 24}%`, width: 'clamp(5px,0.62cqw,12px)', zIndex: 1,
              transform: `translateX(-50%) scaleY(${struck ? 1 : 0})`, transformOrigin: 'top center', borderRadius: 8,
              background: `linear-gradient(180deg, ${GOLD_BRIGHT} 0%, ${GOLD_BRIGHT} 65%, ${GOLD}1f 100%)`,
              boxShadow: `none`,
              transition: reduce ? 'none' : 'transform 0.7s var(--qq-enter)',
            }} />

            {/* Skalen-Endlabels (auf Schienen-Höhe) */}
            {/* 2026-08-23, im Bild gefunden: die Skalen-Enden sassen auf
                Schienenhoehe, also in genau dem Band, in dem auch die Wappen der
                oberen Bahn ihre Wert-Kaestchen abstellen. Ein Tipp am Rand (hier
                252 bei 95%) lief mitten durch „zu hoch". Auf der Buehne wandern
                die beiden Beschriftungen an den unteren Rand: sie beschriften die
                ganze Achse, nicht die Schienenhoehe, und dort unten ist ohnehin
                Platz. Kollision damit baulich ausgeschlossen statt weggerueckt. */}
            <div aria-hidden style={{
              position: 'absolute', left: 0,
              ...(istBuehne ? { bottom: 0 } : { top: `${RAIL - 6}%` }),
              zIndex: 2,
              fontSize: istBuehne ? 'clamp(15px, 1.6cqw, 26px)' : 'clamp(10px, 1.05cqw, 17px)',
              fontWeight: 900, color: 'var(--qq-text-muted)',
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>← {lang === 'en' ? 'too low' : 'zu niedrig'}</div>
            <div aria-hidden style={{
              position: 'absolute', right: 0,
              ...(istBuehne ? { bottom: 0 } : { top: `${RAIL - 6}%` }),
              zIndex: 2,
              fontSize: istBuehne ? 'clamp(15px, 1.6cqw, 26px)' : 'clamp(10px, 1.05cqw, 17px)',
              fontWeight: 900, color: 'var(--qq-text-muted)',
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>{lang === 'en' ? 'too high' : 'zu hoch'} →</div>

            {/* Mess-Schiene */}
            <div aria-hidden style={{
              position: 'absolute', left: 0, right: 0, top: `${RAIL}%`, height: 5, borderRadius: 5, zIndex: 2,
              transform: 'translateY(-50%)',
              background: `linear-gradient(90deg, transparent, ${GOLD}4d 10%, rgba(255,244,214,0.55) 50%, ${GOLD}4d 90%, transparent)`,
              boxShadow: `0 0 22px ${GOLD}40`,
            }} />

            {/* Variante „Spanne": je Fraktion ein Stueck Schiene vom schlechtesten
                bis zum besten Tipp ihrer Handys. Bewusst LEISE gehalten - Wolf
                2026-08-29: „wird dann die view nicht etwas voll?". Deshalb kein
                neues Objekt, sondern dieselbe Schiene, nur eingefaerbt: gleiche
                Hoehe, gleiche Rundung, halbe Deckkraft. Es kommt kein Element
                dazu, das man einzeln lesen muesste. */}
            {spanneAn && placed.map(({ r, above }) => {
              const sp = spannen.get(r.team.avatarId);
              if (!sp || sp.n < 2) return null;
              const a = axisPct(sp.min), b = axisPct(sp.max);
              const isWin = r.teamId === winner?.teamId;
              return (
                <div key={'sp-' + r.team.avatarId} aria-hidden style={{
                  position: 'absolute', zIndex: 2,
                  height: spanneStufe >= 2 ? 12 : 4, borderRadius: 12,
                  // ⚠️ NICHT alle acht auf dieselbe Linie. Der erste Anlauf legte
                  // jede Spanne mittig auf die Schiene, und weil sich die
                  // Fraktionen ueberlappen, wurde daraus ein matschiger
                  // Farbverlauf statt acht lesbarer Strecken. Jede Bahn bekommt
                  // ihre eigene Hoehe, direkt an der Schiene, auf der Seite, auf
                  // der auch das Wappen steht.
                  top: `calc(${RAIL}% ${above ? '-' : '+'} ${spanneStufe >= 2 ? 15 : 7}px)`,
                  left: `${Math.min(a, b)}%`, width: `${Math.max(0.6, Math.abs(b - a))}%`,
                  transform: `translateY(-50%) scaleX(${lit || !housedark ? 1 : 0.001})`,
                  transformOrigin: 'center',
                  background: r.team.color,
                  opacity: housedark && !isWin ? (spanneStufe >= 2 ? 0.34 : 0.22) : (spanneStufe >= 2 ? 0.9 : 0.62),
                  transition: reduce ? 'none' : 'transform 0.5s var(--qq-carry), opacity 0.4s ease',
                }} />
              );
            })}

            {/* Gold-Messstrecke Sieger → Wahrheit (Schätzchen-Identität = Gold) */}
            {winner && winner.delta > 0 && (
              <div aria-hidden style={{
                position: 'absolute', top: `${RAIL}%`, zIndex: 3, height: 5, borderRadius: 5,
                left: `${Math.min(winnerCx, tx)}%`, width: `${Math.abs(tx - winnerCx)}%`,
                transform: `translateY(-50%) scaleX(${lit ? 1 : 0})`,
                transformOrigin: winnerCx <= tx ? 'left center' : 'right center',
                background: `linear-gradient(90deg, ${GOLD}, ${GOLD}40)`,
                boxShadow: `0 0 16px ${GOLD}99`,
                transition: reduce ? 'none' : 'transform 0.55s var(--qq-carry)',
              }} />
            )}

            {/* Wahrheits-Marker (Gold-Diamant) auf der Schiene */}
            <div aria-hidden style={{
              position: 'absolute', left: `${tx}%`, top: `${RAIL}%`, width: 'clamp(13px,1.4cqw,24px)', height: 'clamp(13px,1.4cqw,24px)',
              transform: `translate(-50%, -50%) rotate(45deg) scale(${struck ? 1 : 0})`, zIndex: 6,
              background: GOLD_BRIGHT, borderRadius: 3, boxShadow: `0 0 18px 4px ${GOLD}aa`,
              transition: reduce ? 'none' : 'transform 0.5s var(--qq-celebrate) 0.2s',
            }} />

            {/* Wappen an ihrer Tipp-Position, zwei Lanes (oben/unten am Strahl) */}
            {placed.map(({ r, cx, above }, i) => {
              const isWin = r.teamId === winner?.teamId;
              const dimmed = housedark && !(isWin && lit);
              const diff = r.num - target;
              const exact = diff === 0;
              // Wolf 2026-07-16 (bild 5 'unklar wer Sieger, alle gleich gross'):
              // Sieger deutlich groesser als der Rest → unuebersehbar, welches Wappen
              // gewonnen hat (Sieger = Punkte-Sieger, nicht zwingend der naechste Tipp).
              // In der Variante „tief" wachsen die Wappen mit: die Hoehe wird
              // ja frei, und ein groesseres Wappen ist der eigentliche Gewinn
              // auf zehn Meter.
              const av = strahlTief
                ? (isWin ? 'clamp(76px, 9cqw, 152px)' : 'clamp(46px, 5.2cqw, 86px)')
                : (isWin ? 'clamp(68px, 8.2cqw, 134px)' : 'clamp(38px, 4.3cqw, 68px)');
              return (
                <div key={r.teamId} data-qq-rand-kachel={above ? 'oben' : 'unten'} style={{
                  position: 'absolute', left: `${cx}%`,
                  ...(above ? { bottom: `${100 - RAIL + 1}%` } : { top: `${RAIL + 1}%` }),
                  transform: 'translateX(-50%)', zIndex: isWin && lit ? 8 : 4,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(2px,0.4cqh,6px)',
                  filter: dimmed ? `brightness(${DIM}) saturate(0.82)` : 'none',
                  transition: 'filter 0.5s var(--qq-enter)',
                  animation: !reduce ? `qqStr2Rise 0.5s var(--qq-enter) ${0.35 + i * 0.08}s both` : 'none',
                }}>
                  {/* untere Lane: kurzer Stiel NACH OBEN zur Schiene steht vor dem Wappen;
                      obere Lane: Wert zuerst, dann Wappen, dann Stiel nach unten. Reihenfolge
                      via column-reverse fuer die obere Lane, damit das Wappen der Schiene am
                      naechsten ist. */}
                  {above && (
                    <span aria-hidden style={{ order: 3, width: 2, height: 'clamp(6px,1.2cqh,16px)', background: r.team.color, opacity: 0.6, borderRadius: 2 }} />
                  )}
                  {/* Wappen (Sieger: gross, dicker Gold-Doppelring + Krone drueber).
                      2026-07-17 (Wolf bild 9 „quetscht"): beim Sieger IMMER Wappen
                      zuerst (order 1) → Krone oben frei, Wert-Label darunter (kein
                      Kollaps von Label+Krone mehr). */}
                  <div style={{
                    order: isWin ? 1 : (above ? 2 : 1),
                    position: 'relative',
                    // ⚠️ 2026-08-29, Wolf am Kontaktbogen: „schaetzchen reveal,
                    // auch da passt die umrandung nicht an die kachel". Hier
                    // stand hart `50%`, waehrend die Marke darin seit dem 22.08.
                    // `--qq-team-mark-radius` traegt (auf der Buehne 16 %). Der
                    // Gold-Ring war also ein Kreis um ein Quadrat und schaute
                    // oben und an den Seiten darunter hervor. Genau der Fall aus
                    // BUEHNE_2A.md: „Kacheln, keine Kreise. Ein runder Rahmen um
                    // eine eckige Kachel schneidet sich mit ihr."
                    // Der Ring folgt jetzt derselben Variable wie die Marke, also
                    // rund auf dem Handy und eckig auf der Buehne. Der Zuwachs
                    // durch `spread` rechnet der Browser selbst auf die
                    // Aussenecke, der Ring liegt damit gleichmaessig an.
                    borderRadius: quirkSet ? '18%' : 'var(--qq-team-mark-radius, 50%)',
                    transform: isWin && lit ? 'scale(1.14)' : 'scale(1)',
                    transition: 'transform 0.5s var(--qq-celebrate)',
                    // 2026-08-23: auf der Buehne EIN Ring statt drei Lagen. Der
                    // 48px-Schein war die dritte Wiederholung neben Groesse und
                    // Gold-Messstrecke.
                    boxShadow: istBuehne
                      ? (isWin && lit ? `0 0 0 5px ${GOLD}` : `0 0 0 2px ${r.team.color}`)
                      : (isWin && lit ? `0 0 0 5px ${GOLD}, 0 0 0 9px ${GOLD}55, 0 0 48px 7px ${GOLD}aa` : `0 0 0 2px ${r.team.color}, 0 0 14px ${r.team.color}66`),
                  }}>
                    {/* 2026-08-23 (VORSCHLAG, umgesetzt): die Krone faellt auf der
                        Buehne weg. Kronen waren im Juli aus dem restlichen Quiz
                        genommen worden („Kronen-raus im ganzen Batch"), hier ist
                        die letzte stehen geblieben - und sie ist ausserdem wieder
                        ein rohes Systemzeichen. Wer gewonnen hat, sagen der
                        Gold-Ring, die groessere Marke und die Gold-Messstrecke
                        zur Wahrheit; das reicht dreifach. */}
                    {isWin && lit && !istBuehne && (
                      <span aria-hidden style={{
                        position: 'absolute', top: '-52%', left: '50%', transform: 'translateX(-50%)',
                        fontSize: 'clamp(22px, 2.8cqw, 48px)', lineHeight: 1, zIndex: 9,
                        filter: `drop-shadow(0 0 14px ${GOLD})`,
                      }}><QQEmojiIcon emoji="👑" /></span>
                    )}
                    <QQTeamAvatar avatarId={r.team.avatarId} teamEmoji={r.team.emoji} size={av} />
                  </div>
                  {/* Wert + Delta (+ Punkte in Arena) — beim Sieger IMMER unter dem Wappen. */}
                  <div style={{
                    order: isWin ? 2 : (above ? 1 : 2), marginTop: isWin ? 'clamp(4px,0.7cqh,10px)' : 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.05,
                    background: 'rgba(12,10,30,0.66)', borderRadius: 'clamp(8px,0.9cqw,14px)',
                    padding: 'clamp(2px,0.4cqh,5px) clamp(6px,0.8cqw,12px)',
                    border: `1.5px solid ${isWin && lit ? GOLD + 'aa' : 'rgba(246, 239, 230,0.12)'}`,
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: istBuehne ? 'clamp(20px,2cqw,34px)' : 'clamp(14px,1.5cqw,26px)',
                      fontWeight: 700,
                      color: 'var(--qq-card-text)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                    }}>{fmt(r.num)}</span>
                    {/* 2026-08-24, auf der Buehne nachgemessen: diese Zeile stand
                        bei 25px, also knapp unter dem Grad-Boden, und sie trug
                        zwei rohe Systemzeichen. ▲ und ▼ sind Geometrie-Glyphen
                        aus der Systemschrift und werden auf jedem Rechner anders
                        gemalt - mal als schmale Pfeilspitze, mal als fetter
                        Klotz. Das Vorzeichen sagt dieselbe Sache und ist Teil
                        unserer Schrift: „+1" und „−7" brauchen kein Dreieck
                        daneben. Die Farbe traegt den Rest. */}
                    <span style={{
                      fontSize: istBuehne ? 'clamp(20px,1.9cqw,28px)' : 'clamp(10px,1cqw,16px)',
                      fontWeight: 900, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                      color: exact ? MINT : 'var(--qq-text-muted)',
                    }}>
                      {exact
                        ? (istBuehne
                            ? <><QQEmojiIcon emoji="✨" size="1em" /> {lang === 'en' ? 'spot on' : 'getroffen'}</>
                            : (lang === 'en' ? '✨ spot on' : '✨ getroffen'))
                        : istBuehne
                          ? (diff > 0 ? `+${fmt(diff)}` : `−${fmt(Math.abs(diff))}`)
                          : (diff > 0 ? `▲ +${fmt(diff)}` : `▼ −${fmt(Math.abs(diff))}`)}
                      {isMega && <span style={{ color: isWin && lit ? GOLD_BRIGHT : GOLD, marginLeft: 6 }}>· {ptsOfAvatar(r.team.avatarId)}P</span>}
                    </span>
                    {/* „am schnellsten": nur beim Sieger, nur wenn der Sieg per
                        Abschick-Zeitpunkt entschieden wurde (Gleichstand). Macht den
                        sonst willkuerlich wirkenden Sieger nachvollziehbar. Wolfs 3D-
                        Gold-Blitz (fx-blitz.png) als Icon. */}
                    {isWin && lit && winnerBySpeed && (
                      <span style={{
                        marginTop: 'clamp(2px,0.35cqh,5px)',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: istBuehne ? 'clamp(14px,1.4cqw,23px)' : 'clamp(9px,0.95cqw,15px)',
                        fontWeight: 900, whiteSpace: 'nowrap',
                        letterSpacing: '0.02em', color: GOLD_BRIGHT,
                        textShadow: istBuehne ? 'none' : `0 0 10px ${GOLD}aa`,
                      }}>
                        <img src="/fx-blitz.png" alt="" aria-hidden style={{
                          height: 'clamp(15px,1.5cqw,24px)', width: 'auto', display: 'block',
                          filter: `drop-shadow(0 0 6px ${GOLD}cc)`,
                        }} />
                        {lang === 'en' ? 'fastest' : 'am schnellsten'}
                      </span>
                    )}
                  </div>
                  {/* untere Lane: Stiel nach OBEN zur Schiene (order 0 = ganz oben) */}
                  {!above && (
                    <span aria-hidden style={{ order: 0, width: 2, height: 'clamp(6px,1.2cqh,16px)', background: r.team.color, opacity: 0.6, borderRadius: 2 }} />
                  )}
                </div>
              );
            })}
          </div>
          );
        })()}
      </div>
    </div>
  );
}
