/**
 * CozyQuizTeamsRevealView — Einmalige Team-Vorstellung nach Rules, vor Phase 1.
 *
 * Slot-Machine-Effekt: Teams werden epic gereveald (drei Phasen wie ein TV-
 * Showmoment). Pro Team Avatar-Drop + Name-Reveal + Color-Glow.
 *
 * Extrahiert aus QQBeamerPage.tsx 2026-05-13 (Refactor Phase 5).
 * NICHT extern importiert (nur intern via Phase-Router).
 */
import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import type { QQStateUpdate, QQTeam } from '../../../shared/quarterQuizTypes';
import { QQ_AVATARS, qqMegaFactionName, qqMegaFactionSlug, qqMegaFactionMotto } from '../../../shared/quarterQuizTypes';
import { useLangFlip } from '../cozyQuizShared';
import { Fireflies, EurovisionHearts } from './CozyQuizAmbient';
import { QQTeamAvatar, isCountryFlagGlyph, getCountryFlagUrl } from './QQTeamAvatar';
import { TeamNameLabel } from './TeamNameLabel';
import { playAvatarCascadeNote, playGoodLuckFanfare, playWoodKnock } from '../utils/sounds';
import { isThemed } from '../qqTheme';
import { isCozy3dSlug, cozy3dSrc, cozy3dLabel } from '../cozy3dAvatars';
import { isCrestSlug, crestSrc, crestLabel } from '../cozyArenaCrests';
import { wakeAllAvatars } from '../avatarAwake';

// Arena-Moment (Wolf 2026-07-04): der Fraktions-Slogan tippt sich wie eine
// Schreibmaschine ein (erst NACH dem Namens-Einzug). Remountet pro Fraktion
// (key=enterIdx im Aufrufer) → startet jedes Mal frisch.
function ArenaTypewriter({ text, color, delayMs = 560 }: { text: string; color: string; delayMs?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(0);
    let cancelled = false;
    const timers: number[] = [];
    const per = 1000 / 26; // ~26 Zeichen/Sekunde
    const tick = (i: number) => {
      if (cancelled) return;
      setCount(i);
      if (i < text.length) timers.push(window.setTimeout(() => tick(i + 1), per));
    };
    timers.push(window.setTimeout(() => tick(1), delayMs));
    return () => { cancelled = true; timers.forEach(t => window.clearTimeout(t)); };
  }, [text, delayMs]);
  const typing = count < text.length;
  return (
    <span>
      {text.slice(0, count)}
      <span aria-hidden style={{
        color, fontWeight: 900, marginLeft: '0.04em',
        opacity: typing ? 1 : 0,
        animation: typing ? 'qqArenaCaret 0.62s steps(1) infinite' : 'none',
      }}>▍</span>
    </span>
  );
}

// CozyArena — Fraktions-Einzug: jede Fraktion tritt einzeln auf (Wappen gross,
// Name, Motto, Farb-Flut), setzt sich dann in die Startaufstellung unten. KEIN
// FLIP-Flug (Wolfs Positions-Bug damit hinfaellig) — Einzug = Drama, Aufstellung
// = sauberer Pop. Nur nested/Arena; Cozy Quiz behaelt den Roll-Call.
function ArenaEntranceView({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  const themed = isThemed();
  const de = lang !== 'en';
  const sfxMutedRef = useRef(s.sfxMuted);
  sfxMutedRef.current = s.sfxMuted;

  const factions = useMemo(() => {
    const connected = s.teams.filter(t => t.connected);
    const base = connected.length > 0 ? connected : s.teams;
    const byAv = new Map<string, { avatarId: string; color: string; subs: number }>();
    const order: string[] = [];
    for (const t of base) {
      let g = byAv.get(t.avatarId);
      if (!g) {
        const meta = QQ_AVATARS.find(a => a.id === t.avatarId);
        g = { avatarId: t.avatarId, color: meta?.color ?? t.color ?? '#EC4899', subs: 0 };
        byAv.set(t.avatarId, g); order.push(t.avatarId);
      }
      g.subs++;
    }
    return order.map(a => byAv.get(a)!);
  }, [s.teams]);
  const n = factions.length;

  const [enterIdx, setEnterIdx] = useState(-1);
  const [placed, setPlaced] = useState<Set<number>>(() => new Set());
  const [done, setDone] = useState(false);
  const sfxRef = sfxMutedRef;

  useEffect(() => { wakeAllAvatars(16000); }, []);
  useEffect(() => {
    if (n === 0) { setDone(true); return; }
    let cancelled = false;
    const timers: number[] = [];
    const T = (fn: () => void, ms: number) => { const id = window.setTimeout(() => { if (!cancelled) fn(); }, ms); timers.push(id); return id; };
    const ENTER = 1900;
    const step = (i: number) => {
      if (cancelled) return;
      if (i >= n) {
        T(() => { setDone(true); if (!sfxRef.current) { try { playGoodLuckFanfare(); } catch {} } }, 360);
        return;
      }
      setEnterIdx(i);
      if (!sfxRef.current) { try { playWoodKnock(); } catch {} }
      T(() => {
        setPlaced(prev => { const nx = new Set(prev); nx.add(i); return nx; });
        if (!sfxRef.current) { try { playAvatarCascadeNote(i, n + 1); } catch {} }
      }, ENTER - 420);
      T(() => step(i + 1), ENTER);
    };
    T(() => step(0), 520);
    return () => { cancelled = true; timers.forEach(t => window.clearTimeout(t)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  const crestFor = (avId: string): string | null => {
    const slug = qqMegaFactionSlug(avId);
    // 2026-07-04: volles Fraktions-Wappen (Form + Farbe + Rand gebacken) statt
    // Emblem-auf-Disc.
    return slug && isCrestSlug(slug) ? crestSrc(slug) : null;
  };
  const cur = (enterIdx >= 0 && enterIdx < n && !done) ? factions[enterIdx] : null;
  const curColor = cur?.color ?? '#EC4899';

  // Startaufstellung — waehrend des Einzugs klein am Boden (baut sich auf),
  // im „Los geht's"-Finale gross + zentriert (fuellt die Mitte statt leerem Raum).
  const renderLineup = (big: boolean) => {
    // Ausgewogene 2 Reihen statt 6-2 (Wolf 2026-07-04): 8 → 4+4, 6 → 3+3, 7 → 4+3.
    const cols = n <= 4 ? Math.max(1, n) : Math.ceil(n / 2);
    const cellW = big ? 'clamp(112px, 13cqw, 210px)' : 'clamp(80px, 10cqw, 150px)';
    return (
    <div style={{
      position: 'relative', zIndex: 2, display: 'grid',
      gridTemplateColumns: `repeat(${cols}, ${cellW})`,
      gap: big ? 'clamp(14px, 2cqw, 34px)' : 'clamp(8px, 1.2cqw, 20px)',
      justifyContent: 'center', justifyItems: 'center', alignItems: 'flex-start',
      padding: big ? 'clamp(8px, 1.5cqh, 24px) clamp(24px, 4cqw, 72px)' : 'clamp(14px, 2.5cqh, 34px) clamp(18px, 3cqw, 48px)',
      width: '100%', boxSizing: 'border-box',
    }}>
      {factions.map((f, i) => {
        const on = placed.has(i);
        const src = crestFor(f.avatarId);
        // 2026-07-12 (Wolf): Finale-Wappen groesser/praesenter, damit die Mitte
        // gefuellt wirkt statt leer. Einzugs-Groesse (klein) unveraendert.
        const disc = big ? 'clamp(96px, 10.5cqw, 186px)' : 'clamp(54px, 6cqw, 96px)';
        return (
          <div key={f.avatarId} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: big ? 8 : 5,
            width: '100%',
            opacity: on ? 1 : 0.3, filter: on ? 'none' : 'grayscale(0.7)',
            transform: on ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.92)',
            transition: 'all 0.45s cubic-bezier(0.2,1.2,0.4,1)',
          }}>
            <div style={{
              width: disc, height: disc,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {src
                ? <img src={src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: on ? `drop-shadow(0 0 ${big ? 22 : 13}px ${f.color}66) drop-shadow(0 3px 6px rgba(0,0,0,0.4))` : 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }} />
                : <QQTeamAvatar avatarId={f.avatarId} teamEmoji={qqMegaFactionSlug(f.avatarId)} size={disc} />}
            </div>
            <div style={{ fontSize: big ? 'clamp(16px, 1.9cqw, 30px)' : 'clamp(11px, 1.2cqw, 17px)', fontWeight: 900, color: on ? f.color : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
              {qqMegaFactionName(f.avatarId, de ? 'de' : 'en')}
            </div>
          </div>
        );
      })}
    </div>
    );
  };

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      backgroundColor: themed ? undefined : '#0A0814',
      background: themed ? 'var(--qq-bg)' : undefined,
      fontFamily: themed ? 'var(--qq-font)' : "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      // 2026-07-12 (Wolf 'Let's go oben-lastig, Leere oben'): im Finale Titel +
      // Aufstellung als EINE zentrierte Gruppe, statt Titel oben angepinnt und
      // Aufstellung tief im flex:1-Raum. Waehrend des Einzugs bleibt flex-start.
      justifyContent: done ? 'center' : 'flex-start',
    }}>
      {/* Farb-Flut der aktuellen Fraktion */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `radial-gradient(ellipse 82% 62% at 50% 40%, ${curColor}2e 0%, transparent 62%)`,
        transition: 'background 0.6s ease',
      }} />

      {/* Titel */}
      <div style={{ position: 'relative', zIndex: 2, marginTop: done ? 0 : 'clamp(22px, 4cqh, 52px)', marginBottom: done ? 'clamp(16px, 2.6cqh, 40px)' : 0, textAlign: 'center' }}>
        <div style={{ fontSize: 'clamp(13px, 1.5cqw, 24px)', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: themed ? 'var(--qq-text-muted)' : '#94a3b8' }}>
          {done ? (de ? 'Startaufstellung' : 'Starting lineup') : (de ? 'Die Fraktionen treten an' : 'The factions enter')}
        </div>
        <div style={{ fontSize: 'clamp(38px, 6.5cqw, 100px)', fontWeight: 900, lineHeight: 1.02, color: themed ? 'var(--qq-title)' : '#f8fafc' }}>
          {done ? (de ? 'Los geht’s!' : 'Let’s go!') : 'CozyArena'}
        </div>
      </div>

      {/* Bühne: Einzug (aktuelle Fraktion) ODER — wenn fertig — die grosse
          zentrierte Startaufstellung (fuellt die Mitte statt leerem Raum;
          Wolf 2026-07-04 'leerer space in der mitte'). */}
      <div style={{ position: 'relative', zIndex: 2, flex: done ? '0 0 auto' : 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        {done ? (
          // Smoothe Schluss-Transition (Wolf): die Startaufstellung steigt von
          // unten in die Mitte statt hart einzublenden.
          <div style={{ width: '100%', animation: 'qqArenaFinale 0.75s cubic-bezier(0.2,1,0.4,1) both' }}>
            {renderLineup(true)}
          </div>
        ) : (cur && (() => {
          const src = crestFor(cur.avatarId);
          return (
            <div key={enterIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(8px, 1.4cqh, 20px)', animation: 'qqArenaEnter 0.6s cubic-bezier(0.2,1.3,0.4,1) both' }}>
              {src
                ? <img src={src} alt="" draggable={false} style={{ width: 'clamp(170px, 21cqw, 340px)', height: 'auto', filter: `drop-shadow(0 0 60px ${curColor}88) drop-shadow(0 16px 30px rgba(0,0,0,0.55))` }} />
                : <QQTeamAvatar avatarId={cur.avatarId} teamEmoji={qqMegaFactionSlug(cur.avatarId)} size={'clamp(170px, 21cqw, 340px)'} style={{ boxShadow: `0 0 60px ${curColor}88` }} />}
              {/* Name mit Unterstrich (zieht sich auf) + Slogan, der sich wie eine
                  Schreibmaschine eintippt = der Arena-Moment (Wolf 2026-07-04). */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(4px, 0.8cqh, 12px)' }}>
                <div style={{ fontSize: 'clamp(38px, 6.4cqw, 100px)', fontWeight: 900, color: curColor, lineHeight: 1, textShadow: `0 0 50px ${curColor}66` }}>
                  {qqMegaFactionName(cur.avatarId, de ? 'de' : 'en')}
                </div>
                <div aria-hidden style={{ height: 'clamp(3px, 0.42cqh, 6px)', width: 'clamp(64px, 11cqw, 190px)', borderRadius: 999, background: curColor, transformOrigin: 'center', boxShadow: `0 0 16px ${curColor}99`, animation: 'qqArenaUnderline 0.5s cubic-bezier(0.2,1,0.4,1) 0.42s both' }} />
              </div>
              <div style={{ fontSize: 'clamp(19px, 2.5cqw, 40px)', fontWeight: 800, fontStyle: 'italic', color: themed ? 'var(--qq-text-muted)' : '#cbd5e1', minHeight: '1.4em' }}>
                „<ArenaTypewriter text={qqMegaFactionMotto(cur.avatarId, de ? 'de' : 'en')} color={curColor} />"
              </div>
            </div>
          );
        })())}
      </div>

      {/* Waehrend des Einzugs: kleine Aufstellung unten, baut sich auf. */}
      {!done && renderLineup(false)}

      <style>{`
        @keyframes qqArenaEnter {
          0%   { opacity: 0; transform: translateY(46px) scale(0.66); }
          60%  { opacity: 1; }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes qqArenaUnderline {
          from { transform: scaleX(0); opacity: 0; }
          to   { transform: scaleX(1); opacity: 1; }
        }
        @keyframes qqArenaCaret {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0; }
        }
        @keyframes qqArenaFinale {
          0%   { opacity: 0; transform: translateY(64px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Phase-Router (Wolf 2026-07-04 'mehr Arena-Vibe bei der Team-Vorstellung',
// Variante A): Arena (nested) → Fraktions-Einzug + Startaufstellung, sonst der
// klassische Cozy-Quiz-Roll-Call.
// ─────────────────────────────────────────────────────────────────────────
export function TeamsRevealView({ state: s }: { state: QQStateUpdate }) {
  if ((s as any).nestedTeams) return <ArenaEntranceView state={s} />;
  return <CozyRollCall state={s} />;
}

function CozyRollCall({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  const themed = isThemed();
  const fontFam = themed
    ? 'var(--qq-font)'
    : s.theme?.fontFamily ? `'${s.theme.fontFamily}', 'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif` : "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif";
  // 2026-07-02 (Wolf Mega-Event): 24 Sub-Teams einzeln vorstellen = viel zu lang
  // (Seite zu hoch, Roll-Call ewig). Genestet → nach avatarId zu 8 Eltern-Teams
  // gruppieren; ein Eltern-Avatar, darunter die 2-3 Sub-Team-Namen als Zeile
  // (Sub-Teams werden vorgestellt, aber zusammengefasst). Länge = wie 8-Team-Spiel.
  const nested = !!(s as any).nestedTeams;
  const teams = useMemo<Array<QQTeam & { _subNames?: string[] }>>(() => {
    const connected = s.teams.filter(t => t.connected);
    const base = connected.length > 0 ? connected : s.teams;
    if (!nested) return base;
    const de = lang !== 'en';
    const byAvatar = new Map<string, QQTeam & { _subNames: string[] }>();
    const order: string[] = [];
    for (const t of base) {
      let g = byAvatar.get(t.avatarId);
      if (!g) {
        const meta = QQ_AVATARS.find(a => a.id === t.avatarId);
        // Mega Event: Faktions-Name + Faktions-Tier (slug via emoji → cozy3d-Bild).
        g = { ...t, id: `grp-${t.avatarId}`, emoji: qqMegaFactionSlug(t.avatarId) ?? t.emoji, name: qqMegaFactionName(t.avatarId, de ? 'de' : 'en') || (meta ? (de ? meta.label : meta.labelEn) : t.name), color: meta?.color ?? t.color, _subNames: [] };
        byAvatar.set(t.avatarId, g);
        order.push(t.avatarId);
      }
      g._subNames.push(t.name);
    }
    return order.map(a => byAvatar.get(a)!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nested, s.teams, lang]);
  // ── Teams Roll-Call (Claude-Design-Handoff #3) ──────────────────────────
  // Ein Team nach dem anderen „aufrufen": ein zentrales Spotlight (großer Avatar
  // in Team-Farbe) zoomt rein, hält kurz, fliegt per FLIP in den Karten-Slot →
  // die Karte zündet (Glow + Avatar-Pop + Name blur→scharf + Unterstrich-Sweep).
  // Ersetzt den früheren Slam+rotateY-Flip (Wolf-Entscheidung 2026-06-29). FLIP
  // misst die Live-Rects → robust gegen Grid-Umbruch (4+3 etc., N≠7 ok).
  const titleDelay = 0;
  const showSubtitle = true;
  const reducedMotion = useRef(
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  ).current;
  const stageRef = useRef<HTMLDivElement | null>(null);
  const spotRef = useRef<HTMLDivElement | null>(null);
  const spotDiscRef = useRef<HTMLDivElement | null>(null);
  const cardDiscRefs = useRef<(HTMLDivElement | null)[]>([]);
  // sfxMuted via Ref lesen → Mute-Toggle startet die Sequenz nicht neu.
  const sfxMutedRef = useRef(s.sfxMuted);
  sfxMutedRef.current = s.sfxMuted;
  const [spotIdx, setSpotIdx] = useState(-1);
  const [revealedSet, setRevealedSet] = useState<Set<number>>(() => new Set());
  const [allRevealed, setAllRevealed] = useState(false);
  const showGoodLuck = allRevealed;

  // Augen-auf bei der Vorstellung: alle cozy3d-Tiere mit open-Asset.
  useEffect(() => { wakeAllAvatars(12000); }, []);

  // Spotlight VOR dem ersten Paint verstecken (kein Flash am Mittelpunkt).
  useLayoutEffect(() => {
    const spot = spotRef.current;
    if (spot) {
      spot.style.transform = 'translate(-50%,-50%) scale(0.55)';
      spot.style.opacity = '0';
    }
  }, []);

  // Roll-Call-Sequenz: imperative Timeout-Kette, EIN Spotlight wird pro Team
  // recyclet. FLIP-Delta aus Live-getBoundingClientRect (Spotlight-Disc-Breite
  // gemessen → responsive-safe, kein fixer 330px-Wert).
  useEffect(() => {
    const n = teams.length;
    if (reducedMotion || n === 0) {
      setRevealedSet(new Set(teams.map((_, i) => i)));
      setAllRevealed(true);
      return;
    }
    let cancelled = false;
    const timers: number[] = [];
    const T = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => { if (!cancelled) fn(); }, ms);
      timers.push(id); return id;
    };
    const step = (i: number) => {
      if (cancelled) return;
      const spot = spotRef.current;
      if (i >= n) {
        // Alle aufgerufen → Spotlight ausblenden, „Viel Glück" + Fanfare.
        if (spot) { spot.style.transition = 'opacity 0.4s ease'; spot.style.opacity = '0'; }
        T(() => {
          setAllRevealed(true);
          if (!sfxMutedRef.current) { try { playGoodLuckFanfare(); } catch {} }
        }, 220);
        return;
      }
      setSpotIdx(i);
      if (spot) {
        spot.style.transition = 'none';
        spot.style.transform = 'translate(-50%,-50%) scale(0.55)';
        spot.style.opacity = '0';
      }
      // Zoom-in (zentral)
      requestAnimationFrame(() => {
        if (cancelled) return;
        const sp = spotRef.current;
        if (sp) {
          sp.style.transition = 'transform 0.46s cubic-bezier(0.34,1.5,0.5,1), opacity 0.36s ease';
          sp.style.transform = 'translate(-50%,-50%) scale(1)';
          sp.style.opacity = '1';
        }
        if (!sfxMutedRef.current) { try { playWoodKnock(); } catch {} }
      });
      // Hold (~0.66s) → Fly in den Karten-Slot
      T(() => {
        const sp = spotRef.current, stage = stageRef.current, disc = cardDiscRefs.current[i];
        if (sp && stage && disc) {
          const sr = stage.getBoundingClientRect();
          const dr = disc.getBoundingClientRect();
          const spotW = spotDiscRef.current?.getBoundingClientRect().width || dr.width;
          const dx = (dr.left + dr.width / 2) - (sr.left + sr.width * 0.5);
          const dy = (dr.top + dr.height / 2) - (sr.top + sr.height * 0.48);
          const sc = dr.width / spotW;
          sp.style.transition = 'transform 0.62s cubic-bezier(0.5,0,0.18,1), opacity 0.3s ease 0.4s';
          sp.style.transform = `translate(-50%,-50%) translate(${dx}px,${dy}px) scale(${sc})`;
          sp.style.opacity = '0';
        }
        // Ankunft (~0.52s nach Fly-Start): Karte zündet.
        T(() => {
          setRevealedSet(prev => { const nx = new Set(prev); nx.add(i); return nx; });
          if (!sfxMutedRef.current) { try { playAvatarCascadeNote(i, n + 1); } catch {} }
        }, 520);
        // Nächstes Team
        T(() => step(i + 1), 880);
      }, 660);
    };
    T(() => step(0), 280);
    return () => { cancelled = true; timers.forEach(t => window.clearTimeout(t)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams.length]);

  // 2026-05-07 v18 (Wolf 'die seite wo die teams vorgestellt werden, darf
  // auch mehr nach eurovision aussehen, also bg von eurovision und vlt text
  // in eurovision farben'): ESC-Adaption — BG-Image (5.png Vienna-Stripe-Pink
  // wie Lobby) statt Slate, Title + Good-Luck in Pink, EurovisionHearts statt
  // Fireflies, optionaler ESC-Logo-Anker oben (kleiner als Lobby-Stinger,
  // damit Big-Title dominiert). Standard-CozyQuiz-Mode unangetastet.
  const isEsc = !!s.theme?.eurovisionMode;
  const escBgUrl = isEsc ? s.theme?.lobbyBackgroundUrl : null;
  const escLogoUrl = isEsc ? s.theme?.logoUrl : null;
  const titleColor = isEsc ? '#FF2D7B' : themed ? 'var(--qq-title)' : '#f8fafc';
  // 2026-05-13 Kontrast-Audit ESC: Pink-Glow weg, Dark-Halo first auf BG-Image.
  const titleShadow = isEsc
    ? '0 4px 22px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.7)'
    : '0 4px 20px rgba(var(--qq-accent-rgb),0.25)';
  // 2026-06-24 (Lesbarkeit): „Viel Glück" auf Seiten-BG → var(--qq-text) bei Skin
  // (Akzent waere auf Neo-Brutal blau-auf-lila). Cozy = Pink-Akzent.
  const goodLuckColor = isEsc ? '#FF2D7B' : themed ? 'var(--qq-title)' : 'var(--qq-accent)';
  const goodLuckShadow = isEsc
    ? '0 4px 22px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.7)'
    : '0 4px 24px rgba(var(--qq-accent-rgb),0.5)';
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      // 2026-05-17 (Wolf 'heute spielen slide wirkt irgendwie off zum rest der
      // app'): BG an restliche App angeglichen — vorher Slate-Blau-Gradient
      // (#1e293b/#0f172a/#020617), das wirkte fremd zwischen den anderen
      // dunklen Pink-Tint-Slides. Jetzt #0A0814 Base + Pink-Radial-Glow analog
      // PausedView/ComebackView/QuestionView. ESC-Variante behält Lila-Glow.
      // 2026-06-23 (Skin): bei aktivem Skin flacher Skin-BG (var(--qq-bg)) statt
      // dem dunklen Pink-Glow-Untergrund — sonst bleibt diese Slide dunkel
      // waehrend der Rest hell lackiert ist.
      backgroundColor: themed ? undefined : '#0A0814',
      background: themed ? 'var(--qq-bg)' : undefined,
      backgroundImage: themed ? undefined : isEsc
        ? 'radial-gradient(ellipse at 50% 30%, rgba(255,45,123,0.18), transparent 55%),' +
          'radial-gradient(ellipse at 85% 110%, rgba(167,139,250,0.10), transparent 55%),' +
          'radial-gradient(ellipse at 15% 80%, rgba(244,114,182,0.06), transparent 50%)'
        : 'radial-gradient(ellipse at 50% 30%, rgba(var(--qq-accent-rgb),0.16), transparent 55%),' +
          'radial-gradient(ellipse at 85% 110%, rgba(99,102,241,0.08), transparent 55%),' +
          'radial-gradient(ellipse at 15% 80%, rgba(244,114,182,0.05), transparent 50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: fontFam, overflow: 'hidden',
      minHeight: 0,
      padding: 'var(--qq-safe-margin)',
      boxSizing: 'border-box',
    }}>
      {escBgUrl && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${escBgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.55,
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      )}
      {isEsc ? <EurovisionHearts /> : <Fireflies />}
      <style>{`
        @keyframes qqTrTitle {
          0%   { opacity: 0; transform: translateY(-30px) scale(0.8); letter-spacing: 0.5em; }
          100% { opacity: 1; transform: translateY(0)     scale(1);   letter-spacing: 0.12em; }
        }
        /* 2026-05-08 (Wolf-Wunsch 'heute spielen wirkt eher öde'): Letters
           cascaden einzeln rein (1.2em → 0.1em letter-spacing pro Buchstabe),
           dann subtle Wave nach Settle. Underline-Reveal expandiert von center
           als Pink-Gradient. */
        @keyframes qqTrTitleLetter {
          0%   { opacity: 0; transform: translateY(-32px) scale(0.6); filter: blur(8px); }
          70%  { opacity: 1; transform: translateY(4px)   scale(1.06); filter: blur(0); }
          100% { opacity: 1; transform: translateY(0)     scale(1);   filter: blur(0); }
        }
        @keyframes qqTrTitleWave {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }
        @keyframes qqTrUnderline {
          0%   { opacity: 0; transform: scaleX(0); }
          60%  { opacity: 1; transform: scaleX(1.05); }
          100% { opacity: 1; transform: scaleX(1); }
        }
        @keyframes qqTrUnderlineShimmer {
          0%   { background-position: -100% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes qqTrSlam {
          0%   { opacity: 0; transform: translateY(-80cqh) scale(2) rotate(-18deg); filter: blur(6px); }
          55%  { opacity: 1; transform: translateY(8%)    scale(1.15) rotate(3deg); filter: blur(0); }
          75%  { transform: translateY(-2%) scale(0.96) rotate(-1deg); }
          100% { transform: translateY(0)    scale(1) rotate(0deg); }
        }
        /* 2026-05-09 (Game-Show-Reveal Slot M): Slam für Cards (3:4 box)
           mit etwas heftiger overshoot (1.18 statt 1.15). Identisch zu Slot M. */
        @keyframes qqGsTeamSlam {
          0%   { opacity: 0; transform: translateY(-90cqh) scale(2)    rotate(-18deg); filter: blur(7px); }
          55%  { opacity: 1; transform: translateY(8%)    scale(1.18) rotate(3deg);   filter: blur(0); }
          75%  {            transform: translateY(-2%)    scale(0.96) rotate(-1deg); }
          100% { opacity: 1; transform: translateY(0)     scale(1)    rotate(0);     filter: blur(0); }
        }
        /* 2026-05-12 (Wolf '6. mal action cards nicht gleich gross'): scale-freie
           Variante fuer ActionCardReveal. Vorher animierte qqGsTeamSlam scale 2→
           1.18→0.96→1 ueber 1.4s — waehrend dieser Zeit war die isNew Card
           bis zu 18% groesser als die nebenan settled non-isNew Cards
           (phasePop schon bei scale 1 nach 0.6s). Wolf sah die Cards mid-
           Choreo als 'nicht gleich gross' — strukturell sind sie's, nur die
           Slam-Scale-Animation drift'te ihre VISUAL-Width temporaer auseinander.
           Diese Variante macht Drop + Rotate + Blur ohne Scale → Layout-Box-
           Width bleibt durchgehend konstant. */
        @keyframes qqActionCardSlam {
          0%   { opacity: 0; transform: translateY(-90cqh) rotate(-18deg); filter: blur(7px); }
          55%  { opacity: 1; transform: translateY(8%)    rotate(3deg);   filter: blur(0); }
          75%  {            transform: translateY(-2%)    rotate(-1deg); }
          100% { opacity: 1; transform: translateY(0)     rotate(0);     filter: blur(0); }
        }
        @keyframes qqTrFlash {
          0%   { opacity: 0; }
          10%  { opacity: 0.9; }
          100% { opacity: 0; }
        }
        @keyframes qqTrGood {
          0%   { opacity: 0; transform: scale(0.7); }
          60%  { opacity: 1; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes qqTrPulse {
          0%,100% { transform: scale(1); }
          50%     { transform: scale(1.04); }
        }
        @keyframes qqTrEscLogo {
          0%   { opacity: 0; transform: translateY(-12px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Backdrop spotlight — Pink in ESC, Gold sonst */}
      <div style={{
        position: 'absolute', inset: 0,
        background: isEsc
          ? 'radial-gradient(circle at 50% 40%, rgba(255,45,123,0.16) 0%, transparent 55%)'
          : 'radial-gradient(circle at 50% 40%, rgba(var(--qq-accent-rgb),0.12) 0%, transparent 55%)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* ESC-Logo-Anker oben — nur Logo (ohne COZYQUIZ-Wordmark) damit der
          Big-Title 'Heute spielen…' dominiert. Brueckenbau zu Lobby/Welcome. */}
      {escLogoUrl && (
        <div style={{
          position: 'relative', zIndex: 2,
          marginBottom: 'clamp(14px, 1.6cqw, 24px)',
          animation: 'qqTrEscLogo 700ms cubic-bezier(0.2, 0.8, 0.2, 1) 100ms both',
        }}>
          <img
            src={escLogoUrl}
            alt="Eurovision Song Contest"
            draggable={false}
            style={{
              height: 'clamp(48px, 6cqh, 92px)',
              width: 'auto',
              filter: 'drop-shadow(0 0 18px rgba(var(--qq-accent-rgb),0.55)) drop-shadow(0 4px 10px rgba(0,0,0,0.5))',
              animation: 'qqStingerHover 4.2s ease-in-out 1.2s infinite',
            }}
          />
        </div>
      )}

      {/* 2026-05-11 (Wolf-Bug): WELCOME-Hero entfernt — Welcome-Moment lebt
          im Pre-Rules-QuizIntroOverlay. TeamsRevealView startet jetzt direkt
          mit dem „Heute spielen…"-Subtitle + Team-Cascade. */}

      {/* Subtitle Title — startet sofort beim Mount (kein Welcome-Wait mehr).
          Letters cascaden einzeln rein, dann sanftes Wave-Loop. Pink-Underline
          expandiert drunter mit Shimmer-Loop. */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 'clamp(8px, 1cqh, 14px)',
        marginBottom: 'clamp(24px, 3cqw, 48px)',
        opacity: showSubtitle ? 1 : 0,
        transform: showSubtitle ? 'translateY(0)' : 'translateY(-12px)',
        transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}>
      <div style={{
        position: 'relative', zIndex: 2,
        fontSize: 'clamp(36px, 5.2cqw, 82px)', fontWeight: 900, color: titleColor,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        textShadow: titleShadow,
        display: 'inline-flex', flexWrap: 'nowrap',
      }}>
        {(() => {
          const titleText = lang === 'en' ? 'Tonight\u2019s teams\u2026' : 'Heute spielen\u2026';
          const letters = Array.from(titleText);
          const letterStagger = 0.05;
          const baseSec = titleDelay / 1000;
          return letters.map((ch, i) => (
            <span key={i} style={{
              display: 'inline-block',
              opacity: 0,
              whiteSpace: 'pre',
              animation:
                `qqTrTitleLetter 0.7s cubic-bezier(0.16, 1.2, 0.3, 1) ${baseSec + i * letterStagger}s both, ` +
                `qqTrTitleWave 2.6s ease-in-out ${baseSec + 1.2 + i * 0.06}s infinite`,
            }}>{ch}</span>
          ));
        })()}
      </div>
      {/* Pink-Underline — expandiert von center, dann shimmer-loop */}
      {(() => {
        const titleText = lang === 'en' ? 'Tonights teams' : 'Heute spielen';
        const letterCount = Array.from(titleText).length;
        const baseSec = titleDelay / 1000;
        const underlineDelay = baseSec + letterCount * 0.05 + 0.1;
        return (
          <div style={{
            width: 'clamp(220px, 35cqw, 480px)', height: 3, borderRadius: 'var(--qq-pill-radius)',
            background: isEsc
              ? 'linear-gradient(90deg, transparent 0%, rgba(255,45,123,0.7) 25%, #FF2D7B 50%, rgba(255,45,123,0.7) 75%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, rgba(var(--qq-accent-rgb),0.7) 25%, var(--qq-accent) 50%, rgba(var(--qq-accent-rgb),0.7) 75%, transparent 100%)',
            backgroundSize: '200% 100%',
            boxShadow: isEsc
              ? '0 0 14px rgba(255,45,123,0.55)'
              : '0 0 14px rgba(var(--qq-accent-rgb),0.55)',
            transformOrigin: 'center',
            opacity: 0,
            animation:
              `qqTrUnderline 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${underlineDelay}s both, ` +
              `qqTrUnderlineShimmer 3.5s linear ${underlineDelay + 0.8}s infinite`,
          }} />
        );
      })()}
      </div>

      {/* Teams grid — Game-Show-Card-Reveal (sequenziell). Pro Team:
          Card slammt face-down rein → settled → flippt zur Vorderseite →
          Spotlight-Hold für Mod-Anmoderation → nächstes Team. */}
      {(() => {
        const n = teams.length;
        const rowSizes: number[] =
          n <= 6 ? [n]
          : n === 7 ? [4, 3]
          : n === 8 ? [4, 4]
          : n === 9 ? [5, 4]
          : n === 10 ? [5, 5]
          : (() => {
              const rows = Math.ceil(n / 4);
              const base = Math.floor(n / rows);
              const extra = n - base * rows;
              return Array.from({ length: rows }, (_, i) => base + (i < extra ? 1 : 0));
            })();
        const many = n > 5;
        const multiRow = rowSizes.length > 1;
        // Card-Width — Avatar ist ~55% der Card-Width
        // 2026-05-12 (Wolf 'pubquatscher macht 2. Reihe fuers r'): multi-row
        // Card-Min von 140 → 165 px hochgezogen. Bei 12-char Namen wie
        // 'Pubquatscher' war 140px-Card zu eng → das letzte 'r' brach in die
        // 2. Zeile. 165 + leicht aggressiveres TeamNameLabel.shrinkAfter (s.u.)
        // verhindert das ohne dass andere Cards merklich groesser werden.
        const cardWidth = multiRow
          ? 'clamp(165px, 13cqw, 220px)'
          : many ? 'clamp(160px, 15cqw, 240px)' : 'clamp(190px, 18cqw, 280px)';
        const avatarSize = multiRow
          ? 'clamp(82px, 8cqw, 130px)'
          : many ? 'clamp(96px, 9.5cqw, 160px)' : 'clamp(118px, 12cqw, 196px)';
        // 2026-05-28 (Wolf 'avatar viel zu klein im kreis' Round 2): Edge/Chromium
        // rendert `calc(clamp(...) * 0.78)` teilweise auf 0 — nested clamp-in-calc
        // mit Multiplikation ist fragil. Daher Emoji-Size als eigene Clamp
        // (~78% des Avatar-Clamps) statt calc-Multiplikation.
        const emojiFontSize = multiRow
          ? 'clamp(64px, 6.2cqw, 101px)'
          : many ? 'clamp(75px, 7.4cqw, 125px)' : 'clamp(92px, 9.4cqw, 153px)';
        const nameFont = multiRow ? 'clamp(16px, 1.7cqw, 24px)' : 'clamp(18px, 1.9cqw, 28px)';
        // Größen-agnostischer Avatar-Inhalt (Flag-IMG / cozy3d-IMG / Emoji-Text /
        // cozyCast-PNG). Wiederverwendet von Karten-Disc UND Spotlight-Disc —
        // %/em/inherit-basiert, skaliert also mit der jeweiligen Disc-Größe.
        const avatarInner = (t: (typeof teams)[number]) => {
          if (t.emoji && isCountryFlagGlyph(t.emoji)) {
            return <img src={getCountryFlagUrl(t.emoji)} alt={t.emoji} draggable={false}
              style={{ width: '1.3em', height: '1em', objectFit: 'contain' }} />;
          }
          if (isCozy3dSlug(t.emoji)) {
            return <img src={cozy3dSrc(t.emoji)} alt={cozy3dLabel(t.emoji)} draggable={false}
              style={{ width: '90%', height: '90%', objectFit: 'contain', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.32))' }} />;
          }
          // CozyArena-Wappen-Slug → freigestelltes Emblem (cremes Symbol) auf
          // der Farb-Disc. Ohne diesen Zweig fiel der Slug in den Roh-Text-Case
          // darunter → abgeschnittener Slug-Text in der Disc (Wolf 2026-07-03).
          if (isCrestSlug(t.emoji)) {
            return <img src={crestSrc(t.emoji)} alt={crestLabel(t.emoji)} draggable={false}
              style={{ width: '92%', height: '92%', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} />;
          }
          if (t.emoji) return <>{t.emoji}</>;
          return <QQTeamAvatar avatarId={t.avatarId} teamEmoji={undefined} size="100%" />;
        };
        const spotTeam = spotIdx >= 0 ? teams[spotIdx] : teams[0];
        const spotColor = spotTeam?.color ?? '#EC4899';
        let cursor = 0;
        return (
          <div ref={stageRef} style={{
            display: 'flex', flexDirection: 'column',
            gap: 'clamp(18px, 2.4cqw, 36px)',
            alignItems: 'center', maxWidth: '92cqw',
            position: 'relative', zIndex: 2,
            animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) both',
          }}>
            {rowSizes.map((size, rIdx) => {
              const slice = teams.slice(cursor, cursor + size);
              const startI = cursor;
              cursor += size;
              return (
                <div key={rIdx} style={{
                  display: 'flex', gap: 'clamp(14px, 2cqw, 32px)',
                  justifyContent: 'center', flexWrap: 'nowrap',
                }}>
                  {slice.map((t, j) => {
                    const i = startI + j;
                    const revealed = revealedSet.has(i);
                    return (
                      <div key={t.id} style={{
                        width: cardWidth,
                        aspectRatio: '3 / 4',
                        borderRadius: themed ? 'var(--qq-card-radius)' : 'clamp(14px, 1.4cqw, 22px)',
                        // Card-Stil bleibt exakt wie zuvor (Team-Tint 40%/20%),
                        // nur opacity .24 (gedämpft) → 1 beim Aufruf.
                        background: `linear-gradient(180deg, ${t.color}66, ${t.color}33)`,
                        border: revealed ? `2px solid ${t.color}` : '1.5px solid rgba(255,255,255,0.07)',
                        boxShadow: revealed
                          ? `0 14px 36px rgba(0,0,0,0.55), inset 0 0 44px ${t.color}33, 0 0 40px ${t.color}55`
                          : 'none',
                        opacity: revealed ? 1 : 0.24,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 'clamp(10px, 1.2cqw, 18px)', padding: 'clamp(16px, 1.8cqw, 26px)',
                        transition: 'opacity 0.5s ease, box-shadow 0.5s ease, border-color 0.5s ease',
                      }}>
                        {/* Avatar-Disc = FLIP-Mess-Anker. Vor dem Aufruf gedämpft
                            (transparent + dashed), beim Zünden Team-Farbe + Glow.
                            Slot-M-Pattern: fontSize sitzt auf dem Flex-Parent. */}
                        <div ref={el => { cardDiscRefs.current[i] = el; }} style={{
                          position: 'relative',
                          width: avatarSize, height: avatarSize, borderRadius: '50%',
                          background: revealed ? t.color : 'transparent',
                          border: revealed ? `2.5px solid ${t.color}` : '2.5px dashed rgba(255,255,255,0.18)',
                          boxShadow: revealed ? `0 0 28px ${t.color}99` : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                          overflow: (isCozy3dSlug(t.emoji) || isCrestSlug(t.emoji)) ? 'visible' : 'hidden',
                          fontSize: emojiFontSize, lineHeight: 1,
                          transition: 'background 0.45s ease, border-color 0.45s ease, box-shadow 0.45s ease',
                        }}>
                          {/* CozyArena: Puls-Aura (atmend) + Einzug-Stempel (einmaliger
                              Ring-Pop) beim Aufdecken — nur Fraktions-Wappen. */}
                          {revealed && isCrestSlug(t.emoji) && (
                            <>
                              <span aria-hidden style={{
                                position: 'absolute', inset: 0, borderRadius: '50%',
                                boxShadow: `0 0 18px 5px ${t.color}`, pointerEvents: 'none',
                                animation: 'qqCrestAura 3.2s ease-in-out infinite',
                              }} />
                              <span aria-hidden style={{
                                position: 'absolute', inset: '-6px', borderRadius: '50%',
                                border: `3px solid ${t.color}`, pointerEvents: 'none',
                                animation: 'qqStampRing 0.7s ease-out both',
                              }} />
                            </>
                          )}
                          <div style={{
                            width: '100%', height: '100%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 'inherit', lineHeight: 1,
                            opacity: revealed ? 1 : 0,
                            transform: revealed ? 'scale(1)' : 'scale(0.4)',
                            transition: 'opacity 0.4s ease, transform 0.55s cubic-bezier(0.34,1.6,0.5,1)',
                          }}>
                            {avatarInner(t)}
                          </div>
                        </div>
                        {/* Name zündet leicht versetzt (blur→scharf + translateY),
                            danach Unterstrich-Sweep in Team-Farbe. */}
                        <div style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          gap: 'clamp(8px, 1cqw, 12px)', width: '100%',
                        }}>
                          <div style={{
                            width: '100%',
                            opacity: revealed ? 1 : 0,
                            transform: revealed ? 'translateY(0)' : 'translateY(16px)',
                            filter: revealed ? 'blur(0)' : 'blur(7px)',
                            transition: 'opacity 0.4s ease 0.18s, transform 0.46s cubic-bezier(0.3,1.4,0.5,1) 0.18s, filter 0.4s ease 0.18s',
                          }}>
                            <TeamNameLabel
                              name={t.name}
                              maxLines={2}
                              shrinkAfter={11}
                              // 2026-06-28 (Beamer-Review P0): Team-Namen weiß für
                              // bessere Distanz-Lesbarkeit. Dark-Halo-Shadow bleibt.
                              color={themed ? 'var(--qq-card-text)' : '#ffffff'}
                              fontWeight={900}
                              fontSize={nameFont}
                              style={{
                                textAlign: 'center',
                                letterSpacing: '-0.01em',
                                textShadow: '0 2px 8px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.55)',
                                maxWidth: '95%',
                              }}
                            />
                          </div>
                          <div style={{
                            width: 'clamp(44px, 5cqw, 72px)', height: 4, borderRadius: 3,
                            background: t.color, transformOrigin: 'center',
                            opacity: revealed ? 1 : 0,
                            transform: revealed ? 'scaleX(1)' : 'scaleX(0)',
                            transition: 'transform 0.42s cubic-bezier(0.5,0,0.18,1) 0.26s, opacity 0.3s ease 0.26s',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {/* Spotlight-Overlay — EIN persistentes Element, pro Team recyclet.
                Zoomt zentral rein, fliegt per FLIP in den jeweiligen Karten-Slot.
                transform/opacity werden imperativ in der Sequenz gesetzt (NICHT
                hier im JSX-style), damit React-Re-Renders sie nicht zurücksetzen. */}
            <div ref={spotRef} aria-hidden style={{
              position: 'absolute', left: '50%', top: '48%', zIndex: 30,
              pointerEvents: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              willChange: 'transform, opacity',
            }}>
              {/* 2026-06-29 (Wolf): Während Zoom/Flug NUR das Tier zeigen — kein
                  farbiger Disc, kein Team-Farb-Halo. Die Team-Farbe erscheint
                  erst beim „Stempeln" auf der Karte (cardDisc füllt sich beim
                  Zünden). Soft-Glow neutral-weiß für etwas Präsenz auf dunklem BG. */}
              <div aria-hidden style={{
                position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%,-50%)',
                width: 'clamp(360px, 42cqw, 620px)', height: 'clamp(360px, 42cqw, 620px)',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 62%)',
                filter: 'blur(12px)', pointerEvents: 'none',
              }} />
              <div ref={spotDiscRef} style={{
                position: 'relative',
                width: 'clamp(220px, 24cqw, 360px)', height: 'clamp(220px, 24cqw, 360px)',
                borderRadius: '50%',
                background: 'transparent',
                border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                filter: 'drop-shadow(0 18px 34px rgba(0,0,0,0.55))',
                overflow: 'visible',
                fontSize: 'clamp(150px, 17cqw, 252px)', lineHeight: 1,
              }}>
                {spotTeam && avatarInner(spotTeam)}
              </div>
              <div style={{
                marginTop: 'clamp(14px, 1.8cqw, 30px)', fontWeight: 900,
                fontSize: 'clamp(34px, 5cqw, 64px)', color: '#fff', textAlign: 'center',
                // 2026-07-02 (Wolf: Spotlight-Name schlecht lesbar/abgeschnitten):
                // kräftigerer Dark-Halo für Kontrast + saubere Ellipsis statt Überlauf.
                textShadow: '0 2px 6px rgba(0,0,0,0.85), 0 4px 24px rgba(0,0,0,0.6)',
                whiteSpace: 'nowrap', maxWidth: 'min(80cqw, 640px)',
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{spotTeam?.name}</div>
            </div>
          </div>
        );
      })()}

      {/* "Viel Glück!" — reserve space from the start to prevent layout jump when it fades in */}
      <div style={{
        marginTop: 'clamp(32px, 4cqw, 64px)',
        height: 'clamp(38px, 5.2cqw, 80px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontSize: 'clamp(28px, 4cqw, 64px)', fontWeight: 900,
          color: goodLuckColor,
          textTransform: 'uppercase', letterSpacing: '0.15em',
          textShadow: goodLuckShadow,
          opacity: showGoodLuck ? 1 : 0,
          transform: showGoodLuck ? 'scale(1)' : 'scale(0.7)',
          animation: showGoodLuck ? 'qqTrGood 900ms cubic-bezier(.2,.8,.2,1) both' : 'none',
        }}>
          {/* 2026-06-28 (Beamer-Review P2): OS-Emoji ✨ → Marken-Sparkle
              (CSS clip-path-Stern in Akzentfarbe, dezenter Puls). */}
          <span aria-hidden style={{
            display: 'inline-block', width: '0.46em', height: '0.46em',
            marginRight: '0.34em', verticalAlign: '0.08em',
            background: goodLuckColor,
            clipPath: 'polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%)',
            filter: 'drop-shadow(0 0 10px rgba(var(--qq-accent-rgb),0.6))',
            animation: 'qqTrSpark 2.4s ease-in-out infinite',
          }} />
          {lang === 'en' ? 'Good luck!' : 'Viel Glück!'}
          <span aria-hidden style={{
            display: 'inline-block', width: '0.46em', height: '0.46em',
            marginLeft: '0.34em', verticalAlign: '0.08em',
            background: goodLuckColor,
            clipPath: 'polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%)',
            filter: 'drop-shadow(0 0 10px rgba(var(--qq-accent-rgb),0.6))',
            animation: 'qqTrSpark 2.4s ease-in-out infinite 0.8s',
          }} />
        </div>
      </div>

    </div>
  );
}
