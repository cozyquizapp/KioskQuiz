import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, memo, Fragment } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQQSocket } from '../hooks/useQQSocket';
import { isThemed, getActiveTheme, setActiveThemeId } from '../qqTheme';
import {
  QQStateUpdate, QQTeam, QQ_CATEGORY_LABELS, QQ_CATEGORY_COLORS, QQ_BUNTE_TUETE_LABELS,
  qqGetAvatar, QQCategory,
  QQQuestionImage,
  QQOptionImage,
  QQSlideTemplates,
  QQLanguage,
  QQSoundSlot,
  QQ_MAX_JOKERS_PER_GAME,
  teamDisplayName,
} from '../../../shared/quarterQuizTypes';
import { BeamerOverlay } from '../components/BeamerOverlay';
import { JokerIcon } from '../components/JokerIcon';
import { CustomSlide } from '../components/QQCustomSlide';
import { QQ_PHASE_COLORS, getRoundColor } from '../qqDesignTokens';
import { QQ3DGrid } from '../components/QQ3DGrid';
import { TeamNameLabel } from '../components/TeamNameLabel';
import QQProgressTree from '../components/QQProgressTree';
import { QQTeamAvatar, CountryFlagOrEmoji } from '../components/QQTeamAvatar';
import { Confetti } from '../components/Confetti';
import { AvatarSetProvider } from '../avatarSetContext';
import { getAvatarDisplay } from '../avatarSets';
import { QQIcon, QQEmojiIcon, qqCatSlug, qqSubSlug } from '../components/QQIcon';
import { CozyWolfImage } from '../components/CozyWolfImage';
import { WolfHeadIcon } from '../components/WolfHeadIcon';
import { ActionCard, type ActionCardData } from '../components/CozyQuizActionCard';
import { BeamerTimer } from '../components/CozyQuizBeamerTimer';
import { Fireflies, EurovisionHearts } from '../components/CozyQuizAmbient';
import { CategoryParticles } from '../components/CozyQuizCategoryParticles';
import { UrgencyVignette } from '../components/CozyQuizUrgencyVignette';
import { ConfettiOverlay } from '../components/CozyQuizConfettiOverlay';
import { GridDisplay } from '../components/CozyQuizGridDisplay';
import { ScoreBar } from '../components/CozyQuizScoreBar';
import { RulesView } from '../components/CozyQuizRulesView';
import { PlacementView } from '../components/CozyQuizPlacementView';
import { ComebackView } from '../components/CozyQuizComebackView';
import { ThanksView } from '../components/CozyQuizThanksView';
import { GameOverView } from '../components/CozyQuizGameOverView';
import { ConnectionsBeamerView } from '../components/CozyQuizConnectionsBeamerView';
import CozyGameView from '../components/CozyGameView';
import { FinalBettingView } from '../components/CozyQuizFinalBettingView';
import { LobbyView } from '../components/CozyQuizLobbyView';
import { TeamsRevealView } from '../components/CozyQuizTeamsRevealView';
import { PausedView } from '../components/CozyQuizPausedView';
import {
  FinalRevealView, FinalRoundRecapSlide,
} from '../components/CozyQuizFinalRevealView';
import { QuestionView } from '../components/CozyQuizQuestionView';
import { PhaseIntroView, RoundMiniTree } from '../components/CozyQuizPhaseIntroView';
import {
  resumeAudio, setVolume, setSoundConfig, setSfxMuted, playFanfare, playReveal, playCorrect,
  playGridReveal, playAvatarCascadeNote, playClimaxFinish, playRevealHighlight, playGoodLuckFanfare,
  playWrong, playTick, playUrgentTick, playTimesUp, playScoreUp,
  startTimerLoop, stopTimerLoop, playFieldPlaced, playSteal,
  playQuestionStart, playRoundStart,
  setMusicDucked, getMusicDuckFactor, fadeOutAudio,
  startLobbyLoop, stopLobbyLoop, startFinaleLoop, startComebackLoop, startGameOverLoop,
  playStapelStamp, playTeamJoin,
  playWrongFor, playRevealFor, playQuestionStartFor,
  playWolfHowl, playAvatarJingle, startCampfireLoop, stopCampfireLoop,
  playWoodKnock, playWinnerCardReveal,
  preloadSoundDefaults,
} from '../utils/sounds';
import { getServerNow } from '../utils/serverTime';

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? '/api';

// ── Cozy-Card-Default ─────────────────────────────────────────────────────────
// Standard-Card-Hintergrund für ALLE Beamer-Cards (Frage, Antwort-Reveal,
// Stat-Panel, Game-Over, Comeback, Pause). Subtiler Top-zu-Bottom-Gradient
// gibt der Card visuelle Tiefe (oben „beleuchtet", unten „grounded").
// Themes mit eigenem `cardBg` überschreiben das (s.theme gewinnt überall via
// `s.theme?.cardBg ?? COZY_CARD_BG`).
//
// 2026-05-08 (Aurora-Vivid-Refresh): Sepia-Braun (#1f1610 → #150e08) raus,
// dunkles Indigo-Hoodie (#1F1A2E → #14101F) als neuer Standard-Look. Wolf-
// Brand (Pink-Wolf + Navy-Hoodie) auf der Card-Ebene. Eurovision bleibt
// unangetastet via Theme-Token-Override-Pattern.
// 2026-05-12: Re-export aus cozyQuizShared (Importer aus QQBeamerPage haben
// damit ihren Pfad stabil; tatsaechliche Definition lebt zentral).
export const COZY_CARD_BG = _COZY_CARD_BG_SHARED;

// 2026-05-10 (Audit-P0 Eurovision-Konsistenz): Brand-Color-Helper.
// Vorher 15+ Stellen mit hardcoded #EC4899 / rgba(236,72,153,...) ohne
// Eurovision-Check → ESC-Edition zeigte falsche Brand-Farben.
// Jetzt: 1× import, alle Stellen lesen `eurovisionMode` aus s.theme.
// Pure function (kein Hook), damit auch in nicht-Component-Helpers nutzbar.
export function getBrandColors(eurovisionMode?: boolean) {
  // 2026-06-23 (Theme-System): wenn ein anderes Grunddesign als 'cozy' aktiv
  // ist, liefert das Theme-Runtime die Palette. Bei 'cozy' (Default) bleibt
  // das alte Verhalten inkl. Eurovision-Zweig → zero-visual-change live.
  if (isThemed()) return getActiveTheme().brand;
  return eurovisionMode
    ? {
        accentHex:  '#FF2D7B',          // ESC-Pink-Hauptakzent
        accentRgb:  '255,45,123',       // für rgba(...)
        accentSoft: '#fde6f0',          // Light-Pink für Subtle-Glow
        accentWarm: '#C084FC',          // Lila als 2. Akzent (Sympathie etc)
        magenta:    '#C084FC',          // Magenta-Pendant
        gradientPill: 'linear-gradient(135deg, #FF2D7B 0%, #C084FC 50%, #6D28D9 100%)',
      }
    : {
        accentHex:  QQ_COLORS.brandPink,          // Brand-Pink
        accentRgb:  '236,72,153',
        accentSoft: QQ_COLORS.brandPinkSoft,
        accentWarm: '#F9A8D4',
        magenta:    '#A21247',
        gradientPill: 'linear-gradient(135deg, #F472B6 0%, #EC4899 50%, #A21247 100%)',
      };
}

// ── Hero-Card-Border (Aurora-Vivid) ───────────────────────────────────────────
// Differenzierung: Hauptfrage-Cards (QuestionView, RevealView, Comeback-Choice)
// bekommen einen Pink-Glow-Border + subtle outer Aurora-Halo. Sub-Cards
// (Options, Timer, Mini-Stats) behalten neutral-weiss-Border, sonst wird das
// Pink omnipräsent.
export const COZY_HERO_BORDER = '1.5px solid rgba(236,72,153,0.32)';
export const COZY_HERO_SHADOW =
  'inset 0 1.5px 0 rgba(255,255,255,0.10), ' +
  '0 0 0 1px rgba(236,72,153,0.08), ' +
  '0 16px 50px rgba(0,0,0,0.65), ' +
  '0 0 36px rgba(236,72,153,0.14)';
export const COZY_SUB_BORDER = '1px solid rgba(255,255,255,0.10)';

// ── CSS keyframes ─────────────────────────────────────────────────────────────
import { QQ_BEAMER_CSS, QQ_CAT_BADGE_BG, QQ_CAT_ACCENT } from '../qqShared';
import { loadUsedFonts } from '../utils/fonts';
import { getRuleText, useRuleOverridesVersion } from '../qqRuleTexts';
// 2026-05-12 (Refactor): Helpers/Translations/Constants aus '../cozyQuizShared'.
// Vorher inline in dieser Datei (~200 Zeilen). Jetzt zentral fuer extrahierte
// Sub-Components (CozyQuizActionCard, CozyQuizQuestionView, ...).
import {
  truncName, useLangFlip, bt, actionVerb, actionDesc,
  imgAnim, imgFilter, formatRevealedAnswer,
  CAT_BG, CAT_GLOW, CAT_CUTOUTS,
  COZY_CARD_BG as _COZY_CARD_BG_SHARED,
  qqCapOption,
} from '../cozyQuizShared';
import { QQ_COLORS } from '../../../shared/qqColors';

export const BEAMER_CSS = QQ_BEAMER_CSS;
export const CAT_BADGE_BG = QQ_CAT_BADGE_BG;
export const CAT_ACCENT = QQ_CAT_ACCENT;

// Beamer-Namen bei 8 Teams / langen Team-Namen nicht reißen lassen.
/** 2026-05-01 (Konsistenz-Audit): Avatar-Groesse fuer Standings-Listen
 * (PausedView + GameOverView). Vorher hatten beide unterschiedliche Logik
 * was zu spuerbarem Avatar-Groessen-Sprung beim Wechsel Pause -> GameOver
 * gefuehrt hat. Jetzt eine Quelle der Wahrheit. */
export function getStandingAvatarSize(teamCount: number, twoCol = false): string {
  if (twoCol) return 'clamp(26px, 2.8cqw, 38px)';
  if (teamCount <= 3) return 'clamp(50px, 4.6cqw, 72px)';
  if (teamCount <= 5) return 'clamp(40px, 3.6cqw, 56px)';
  return 'clamp(34px, 3.2cqw, 48px)';
}

// truncName, CAT_BG, CAT_GLOW, CutoutSpec, CAT_CUTOUTS jetzt in cozyQuizShared.
// CAT_BADGE_BG, CAT_ACCENT bleiben Re-Exports aus qqShared (siehe oben).
// SpeedBoltMarker entfernt 2026-05-04 v4 — Wolf-Feedback „die gelbe Sonne weiss
// niemand was sie bedeutet".

// Fireflies + EurovisionHearts + FF + ESC_HEART_NODES jetzt in
// '../components/CozyQuizAmbient' (siehe Import oben).

// ── Helpers ───────────────────────────────────────────────────────────────────
const QQ_ROOM = 'default';

// ── Time-Travel-Recorder (Module-Level) ──
// Backend trackt Frage-Gewinner nicht historisch, also recorden wir live
// im Frontend. Module-Level damit Recorder-State und Replay-Component
// dieselben Maps lesen.
type RecordedQuestion = { winnerId: string | null; category: string; idx: number };
const recordedQuestions = new Map<string, RecordedQuestion>();
const recordedSteals = new Set<string>();

// useLangFlip, bt, actionVerb, actionDesc, imgAnim, imgFilter, formatRevealedAnswer
// alle jetzt in cozyQuizShared (siehe Import oben Z. 105+).

// ═══════════════════════════════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════════════════════════════

export default function QQBeamerPage() {
  const roomCode = QQ_ROOM;
  const [joined, setJoined] = useState(false);
  const [slideTemplates, setSlideTemplates] = useState<QQSlideTemplates>({});
  const fetchedDraftId = useRef<string | null>(null);
  const { state, connected, emit, socketRef } = useQQSocket(roomCode);

  // Disable Cozy gradient mesh on QQ pages
  useEffect(() => {
    document.body.classList.add('qq-active');
    return () => { document.body.classList.remove('qq-active'); };
  }, []);

  // 2026-05-12 (Sound-Audit P0 #4): Preload aller Default-SFX-URLs beim Mount
  // damit der erste Sound der Session keine 150-400ms Lade-Latenz hat.
  useEffect(() => {
    try { preloadSoundDefaults(); } catch { /* ignore */ }
  }, []);

  // 2026-06-24 (B-Wiring): Bühnen-Skin aus dem Room-State anwenden. Mod waehlt
  // ihn beim Setup (qq:setTheme → room.themeId), Server broadcastet ihn im State.
  // setActiveThemeId schreibt die CSS-Tokens (applyThemeVars) + triggert Re-Render
  // aller skin-abhaengigen Views. No-op wenn unveraendert. Default 'cozy'.
  useEffect(() => {
    setActiveThemeId(state?.themeId ?? 'cozy');
  }, [state?.themeId]);

  // 2026-05-05 (Wolf-Bug 'Scrollbar darf NIE auf /beamer'): body + html overflow
  // hart auf hidden — egal was Inhalts-Container-CSS macht, der Browser zeigt
  // keine Scrollbar mehr. Restore beim Unmount.
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  // Beamer-Fullscreen: erkennt sowohl JS-API (document.fullscreenElement) als
  // auch natives F11 (window.innerHeight === screen.height), damit die Nudge
  // verschwindet wenn der User schon per F11 im Vollbild ist und kein erneutes
  // requestFullscreen noetig (das wuerde an verbrauchter User-Geste scheitern).
  const detectFS = (): boolean => {
    if (typeof document === 'undefined') return false;
    if (!!document.fullscreenElement) return true;
    if (typeof window !== 'undefined' && typeof screen !== 'undefined') {
      // ±2px Toleranz fuer Rundungsdifferenzen bei skaliertem Display
      return Math.abs(window.innerHeight - screen.height) < 3;
    }
    return false;
  };
  const [isFullscreen, setIsFullscreen] = useState<boolean>(detectFS);
  useEffect(() => {
    const onChange = () => setIsFullscreen(detectFS());
    document.addEventListener('fullscreenchange', onChange);
    window.addEventListener('resize', onChange);
    onChange();
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      window.removeEventListener('resize', onChange);
    };
  }, []);
  const requestFS = useCallback(async () => {
    // AudioContext bei diesem User-Klick entstummen — vermeidet
    // "AudioContext was not allowed to start" Console-Warnings, sobald
    // beim ersten Reveal Sounds spielen sollen.
    try { resumeAudio(); } catch { /* noop */ }
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        await el.requestFullscreen();
      }
    } catch { /* user cancelled or not supported */ }
  }, []);
  // (Kein globaler once-Listener mehr — der konnte requestFullscreen aus
  //  Pointerdown-Events feuern, die der Browser nicht als "transient
  //  activation" akzeptiert, was die Console-Errors „API can only be
  //  initiated by a user gesture" produzierte. Der Vollbild-Button
  //  rechts oben ist der saubere Trigger.)

  // Remote-Flyover vom Moderator: simuliere F-Taste, damit interner Listener feuert
  useEffect(() => {
    const sock = socketRef.current;
    if (!sock) return;
    const onFlyover = () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
    };
    const onToggleView = () => {
      window.dispatchEvent(new CustomEvent('qq:toggleView'));
    };
    sock.on('qq:flyover', onFlyover);
    sock.on('qq:toggleView', onToggleView);
    return () => {
      sock.off('qq:flyover', onFlyover);
      sock.off('qq:toggleView', onToggleView);
    };
  }, [connected]);

  // Live-Reactions von Phones — kommt als qq:reactionBurst-Event mit
  // {teamId, emoji, ts}. Sammelt aktive Reactions in einer State-Liste,
  // jede mit eigener Float-Animation; Auto-Cleanup nach 3.2s.
  const [reactionFloats, setReactionFloats] = useState<Array<{
    id: string; emoji: string; teamId: string; xPct: number; delaySec: number;
  }>>([]);
  useEffect(() => {
    const sock = socketRef.current;
    if (!sock) return;
    const onBurst = (payload: { teamId: string; emoji: string; ts: number }) => {
      const id = `${payload.ts}-${Math.random().toString(36).slice(2, 7)}`;
      // Random X-Position 5%-95% damit Reactions nicht alle in derselben Spalte fliegen
      const xPct = 5 + Math.random() * 90;
      setReactionFloats(prev => [...prev, { id, emoji: payload.emoji, teamId: payload.teamId, xPct, delaySec: 0 }]);
      window.setTimeout(() => {
        setReactionFloats(prev => prev.filter(r => r.id !== id));
      }, 3500);
    };
    sock.on('qq:reactionBurst', onBurst);
    return () => { sock.off('qq:reactionBurst', onBurst); };
  }, [connected]);

  useEffect(() => {
    if (!connected) { setJoined(false); return; }
    if (joined) return;
    emit('qq:joinBeamer', { roomCode }).then(ack => { if (ack.ok) setJoined(true); });
  }, [connected]);

  // Use slide templates from state (sent inline with startGame payload)
  useEffect(() => {
    if (state?.slideTemplates && Object.keys(state.slideTemplates).length > 0) {
      setSlideTemplates(state.slideTemplates);
      // Load any Google Fonts used in slide elements
      const fonts = Object.values(state.slideTemplates)
        .flatMap(t => (t?.elements ?? []).map(el => el.fontFamily));
      loadUsedFonts(fonts);
    }
  }, [state?.slideTemplates]);

  // Fallback: fetch slide templates from server if not in state
  useEffect(() => {
    const draftId = state?.draftId;
    if (!draftId || fetchedDraftId.current === draftId) return;
    // Skip fetch if we already have templates from state
    if (state?.slideTemplates && Object.keys(state.slideTemplates).length > 0) {
      fetchedDraftId.current = draftId;
      return;
    }
    fetchedDraftId.current = draftId;
    fetch(`${API_BASE}/qq/drafts/${encodeURIComponent(draftId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(draft => {
        if (draft?.slideTemplates) {
          setSlideTemplates(draft.slideTemplates);
          const fonts = Object.values(draft.slideTemplates as QQSlideTemplates)
            .flatMap((t: any) => (t?.elements ?? []).map((el: any) => el.fontFamily));
          loadUsedFonts(fonts);
        }
      })
      .catch(() => {/* ignore — fallback to hardcoded components */});
  }, [state?.draftId]);

  if (!state) return <LoadingScreen roomCode={roomCode} connected={connected} />;
  return (
    <AvatarSetProvider value={state.avatarSetId} emojis={state.avatarSetEmojis}>
      <BeamerView state={state} slideTemplates={slideTemplates} roomCode={roomCode} />
      {/* 2026-05-04 (Wolf #1): Bildschirm-weite Urgency-Vignette in den
          letzten 5 Sek der Frage-Zeit. Ergaenzt den existierenden Timer-Pulse
          um einen klaren visuellen Drama-Moment ohne den Inhalt zu stoeren.
          Critical (≤3s): aggressives rotes Pulsen.
          Warning (≤5s): orange leiser Puls.
          Plus Gold-Flash bei timerExpired (timer geht auf 0). */}
      {state.phase === 'QUESTION_ACTIVE' && state.timerEndsAt && (
        <UrgencyVignette endsAt={state.timerEndsAt} />
      )}
      {!isFullscreen && <FullscreenNudge onClick={requestFS} />}
      {/* Time-Travel-Replay deaktiviert (Wolfs Wunsch) — die separate Card
          überlagerte die GameOver-Komposition und wirkte fragmentiert.
          Code in ReplayOverlay bleibt drin falls später wieder gewünscht. */}
      {/* {state.phase === 'GAME_OVER' && <ReplayOverlay state={state} />} */}
      {/* Live-Reactions Overlay — Mini-Bursts schweben von unten nach oben.
          Pointer-events: none → blockt nichts darunter. zIndex: 9000 → über
          allem (auch Cell-Animationen) aber unter Fehlermeldungen. */}
      {reactionFloats.length > 0 && (
        <div aria-hidden style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9000,
          overflow: 'hidden',
        }}>
          {reactionFloats.map(r => (
            <span key={r.id} style={{
              position: 'absolute',
              left: `${r.xPct}%`,
              bottom: 0,
              fontSize: 'clamp(36px, 4.4cqw, 64px)',
              animation: 'reactionFloat 3.2s cubic-bezier(0.22,0.7,0.35,1) both',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
              transform: 'translateX(-50%)',
              willChange: 'transform, opacity',
            }}>
              {r.emoji}
            </span>
          ))}
          <style>{`
            @keyframes reactionFloat {
              0%   { transform: translate(-50%, 0)        scale(0.6); opacity: 0; }
              12%  { transform: translate(-50%, -8cqh)     scale(1.15); opacity: 1; }
              80%  { transform: translate(-50%, -78cqh)    scale(1); opacity: 1; }
              100% { transform: translate(-50%, -100cqh)   scale(0.85); opacity: 0; }
            }
          `}</style>
        </div>
      )}
    </AvatarSetProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ReplayOverlay — Time-Travel-Recap am Spielende.
// Erscheint 5.5s nach GAME_OVER-Entry, läuft 15 Sek durch alle geloggten
// Fragen (1 Sek pro Frage). Pro Slot: Frage-Index + Avatar des Winners +
// Kategorie-Akzent. Ein Slot pro Frage in einem 5×3-Grid (15 Fragen total).
// Steal-Highlights blinken rot beim Auftauchen (wasSteal-Flag aus Recorder).
// Auto-fade-out nach Replay; bleibt dann sichtbar als Mini-Strip am unteren
// Bildschirmrand.
// ─────────────────────────────────────────────────────────────────────────

function ReplayOverlay({ state }: { state: QQStateUpdate }) {
  const lang = useLangFlip(state.language);
  const [visible, setVisible] = useState(false);
  const [revealedIdx, setRevealedIdx] = useState(-1);
  const [phase, setPhase] = useState<'hidden' | 'intro' | 'replay' | 'done'>('hidden');

  useEffect(() => {
    // 5.5s nach GAME_OVER-Mount sichtbar machen, dann in 15s durchspielen.
    const tIntro = window.setTimeout(() => { setVisible(true); setPhase('intro'); }, 5500);
    const tReplay = window.setTimeout(() => { setPhase('replay'); }, 5500 + 1200);
    return () => { window.clearTimeout(tIntro); window.clearTimeout(tReplay); };
  }, []);

  // Replay-Tick: ein Slot pro Sekunde
  useEffect(() => {
    if (phase !== 'replay') return;
    const total = Math.min(15, recordedQuestions.size);
    if (total === 0) { setPhase('done'); return; }
    let i = 0;
    setRevealedIdx(0);
    const id = window.setInterval(() => {
      i++;
      if (i >= total) {
        window.clearInterval(id);
        setRevealedIdx(total - 1);
        window.setTimeout(() => setPhase('done'), 1200);
      } else {
        setRevealedIdx(i);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  if (!visible) return null;

  // Sortiere Recorded-Questions nach idx
  const entries = Array.from(recordedQuestions.values()).sort((a, b) => a.idx - b.idx).slice(0, 15);
  if (entries.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 8500,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
      paddingBottom: 'clamp(40px, 6cqh, 80px)',
      animation: phase === 'done' ? undefined : 'replayBackdrop 0.6s ease both',
    }}>
      <style>{`
        @keyframes replayBackdrop {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes replaySlotIn {
          0%   { transform: scale(0.5) translateY(20px); opacity: 0; filter: blur(6px); }
          50%  { transform: scale(1.18) translateY(-2px); opacity: 1; filter: blur(0); }
          100% { transform: scale(1) translateY(0); opacity: 1; filter: blur(0); }
        }
        @keyframes replayStealRing {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.9); }
          50%  { box-shadow: 0 0 0 6px rgba(239,68,68,0.4), 0 0 24px rgba(239,68,68,0.7); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
      `}</style>
      <div style={{
        background: 'rgba(13,10,6,0.92)',
        borderRadius: 24,
        padding: 'clamp(20px, 2.4cqh, 32px) clamp(28px, 3cqw, 48px)',
        border: '1.5px solid rgba(236,72,153,0.4)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 80px rgba(236,72,153,0.15)',
        backdropFilter: 'blur(14px)',
        maxWidth: 1100, width: '92%',
      }}>
        <div style={{
          fontSize: 'clamp(14px, 1.5cqw, 20px)', fontWeight: 900,
          color: QQ_COLORS.brandPink, letterSpacing: '0.1em', textTransform: 'uppercase',
          textAlign: 'center', marginBottom: 14,
          textShadow: '0 0 18px rgba(236,72,153,0.55)',
        }}>
          {lang === 'en' ? '⏱ Game Replay · Recap' : '⏱ Spielverlauf · Recap'}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 'clamp(8px, 1cqw, 14px)',
        }}>
          {entries.map((e, i) => {
            const team = e.winnerId ? state.teams.find(t => t.id === e.winnerId) : null;
            const teamColor = team?.color ?? QQ_COLORS.slate600;
            const catColor = QQ_CAT_ACCENT[e.category] ?? QQ_COLORS.slate400;
            const wasSteal = team
              ? Array.from(recordedSteals).some(key => key.endsWith(`-${team.id}`))
              : false;
            void wasSteal; // grobe Heuristik — nicht jeder Steal ist 1:1 dieser Frage zuordenbar
            const shown = i <= revealedIdx;
            return (
              <div key={i} style={{
                position: 'relative',
                aspectRatio: '1 / 1',
                borderRadius: 16,
                background: shown && team
                  ? `linear-gradient(135deg, ${teamColor}88, ${teamColor}33)`
                  : 'rgba(255,255,255,0.04)',
                border: shown
                  ? `2px solid ${team ? teamColor : QQ_COLORS.slate600}`
                  : '1px solid rgba(255,255,255,0.08)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 4,
                opacity: shown ? 1 : 0.25,
                animation: shown ? 'replaySlotIn 0.4s var(--qq-ease-bounce) both' : undefined,
                overflow: 'hidden',
              }}>
                {/* Frage-Index oben links */}
                <span style={{
                  position: 'absolute', top: 4, left: 6,
                  fontSize: 'clamp(9px, 0.9cqw, 12px)', fontWeight: 900,
                  color: catColor, letterSpacing: '0.1em',
                  opacity: shown ? 1 : 0,
                }}>
                  {e.idx + 1}
                </span>
                {/* Avatar des Winners (oder leer) */}
                {shown && team ? (
                  <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={'min(8cqh, 6cqw)'} />
                ) : shown ? (
                  <span style={{ fontSize: 'min(5cqh, 3cqw)', opacity: 0.4 }}>?</span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FullscreenNudge({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Beamer auf Vollbild schalten (F11)"
      style={{
        position: 'fixed', top: 14, right: 14, zIndex: 99999,
        padding: '8px 14px', borderRadius: 8,
        border: '1px solid rgba(236,72,153,0.5)',
        background: 'rgba(20,16,31,0.85)', color: QQ_COLORS.brandPink,
        fontFamily: "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif",
        fontWeight: 900, fontSize: 13, cursor: 'pointer',
        boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
        animation: 'fsNudgePulse 2.4s ease-in-out infinite',
        pointerEvents: 'auto',
      }}
    >⛶ Vollbild (F11)</button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SlideStage — Fixed-Canvas Skalierung (Option A, 2026-05-12)
// ═══════════════════════════════════════════════════════════════════════════════
// Wrappt Slide-Content in einem festen 1920×1080 Canvas und skaliert es per
// transform:scale auf die echte Viewport-Groesse. Vorteil: jede Slide hat
// einen bekannten Design-Raum, kein vh/vw-Geraetsel mehr fuer Layout-Mathe.
//
// SAFETY-FLAG: standardmaessig OFF. Aktivierung via URL-Param `?stage=1`
// (oder ?stage=on/true). Wolf kann live testen und bei Problem URL ohne
// Param oeffnen → exakt vorheriger Zustand. Kein Risiko fuer bestehendes
// Verhalten.
//
// Phase-1-Scope: nur der Phase-Render-Bereich wird gewrappt. Globale
// Overlays (Grain, Confetti, Toasts) bleiben ausserhalb damit position:fixed
// nicht mit dem transform:scale-Container kollidiert.
const STAGE_DESIGN_WIDTH = 1920;
const STAGE_DESIGN_HEIGHT = 1080;
function isStageEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const url = new URLSearchParams(window.location.search);
    const v = url.get('stage');
    if (v === '1' || v === 'on' || v === 'true') return true;
    if (v === '0' || v === 'off' || v === 'false') return false;
    return localStorage.getItem('qq_useStage') === '1';
  } catch {
    return false;
  }
}
function SlideStage({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const measure = () => {
      const w = outer.clientWidth;
      const h = outer.clientHeight;
      if (w <= 0 || h <= 0) return;
      const sx = w / STAGE_DESIGN_WIDTH;
      const sy = h / STAGE_DESIGN_HEIGHT;
      const s = Math.min(sx, sy);
      setScale(prev => Math.abs(prev - s) > 0.005 ? s : prev);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  return (
    <div ref={outerRef} style={{
      flex: 1,
      width: '100%',
      position: 'relative',
      // 2026-05-12 (Glow-Audit): overflow 'hidden' -> 'clip' + overflowClipMargin.
      // 'clip' verhindert weiterhin Body-Scroll wenn die skalierte Stage groesser
      // als die Viewport wird, aber laesst Box-Shadows/Glows von Cards INNERHALB
      // der Stage ueber die Stage-Kante bluten.
      // 2026-05-13 (Wolf-Bug 'harte glow-kanten auf allen slides'): 120px war
      // zu eng — bei dicken Glows (200-400px) wurde der Glow hart bei 120px
      // gecuttet → sichtbare rechteckige Kante um die Stage. Jetzt 1000px =
      // praktisch unsichtbar (kein Glow reicht so weit), aber overflow:clip
      // bleibt fuer Body-Scroll-Sicherheit.
      overflow: 'clip',
      overflowClipMargin: '1000px',
      // 2026-05-12 v2 (Wolf-Bug 'komischer sichtbarer rand'): bei Beamern mit
      // anderem Aspect-Ratio als 16:9 wird die Stage centered gescaled und
      // drumherum ist body-bg sichtbar.
      // 2026-05-13 v3 (Wolf 'rand ist immer noch da'): FinalRevealView nutzt
      // `rgba(15,8,23,0.98)` (= #0F0817) als Aussenring, vorheriger
      // Stage-Outer war #0A0814 (5/4/3 RGB heller). Die Differenz war als
      // duenne Rahmen-Linie sichtbar. Jetzt auf #0F0817 angeglichen — matched
      // den RaceFinalSlide-Aussenring + bleibt fuer andere Views (BG dort
      // i.d.R. auch sehr dunkles Lila) praktisch unsichtbar.
      // 2026-06-23 (Skin): bei aktivem Skin der Aussenring = Skin-BG, sonst
      // erscheint ein dunkler Rahmen um die hell-lackierte Stage.
      background: isThemed() ? 'var(--qq-bg)' : '#0F0817',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: 0,
    }}>
      <div style={{
        width: STAGE_DESIGN_WIDTH,
        height: STAGE_DESIGN_HEIGHT,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        flexShrink: 0,
        position: 'relative',
        // Phase-Render-Box muss flex-column sein damit existing views mit
        // flex:1 weiterhin korrekt fuellen.
        display: 'flex', flexDirection: 'column',
        // 2026-05-12 Phase 2: CSS Container Query Unit Anchor. cqh/cqw
        // innerhalb der Stage beziehen sich auf 1080px/1920px Canvas
        // statt auf den echten Viewport. Bei Stage AUS faellt cqh/cqw
        // auf vh/vw zurueck (Browser-Default ohne sized container).
        containerType: 'size',
      }}>
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Beamer view — top-level router
// ═══════════════════════════════════════════════════════════════════════════════

function BeamerView({ state: s, slideTemplates, roomCode }: { state: QQStateUpdate; slideTemplates: QQSlideTemplates; roomCode: string }) {
  const cat = s.currentQuestion?.category;
  // Drei Overlay-Stufen vor den Regel-Folien:
  //   -2 = Willkommens-Screen („Herzlich Willkommen zum CozyQuiz")
  //   -1 = Regel-Intro („Jetzt kommen die Regeln — gut aufpassen!")
  //    0..= normale Regel-Folien (RulesView)
  // 2026-05-11 (Wolf-Klarstellung): Welcome-Overlay (-2) ist Wolfs gewünschter
  // großer Hero vor den Regeln. Vorher fälschlich entfernt unter Missverständnis
  // („L1 Welcome doppelt"). Bleibt jetzt drin.
  const rulesIdx = s.rulesSlideIndex ?? 0;
  const welcomeActive = s.phase === 'RULES' && rulesIdx === -2;
  const rulesIntroActive = s.phase === 'RULES' && rulesIdx === -1;
  // Pause-/Wartescreen: Aurora-Vivid-Pink-Mesh passend zum CozyWolf-Brand
  // (Pink-Wolf + Navy-Hoodie). Pre-Game und Paused teilen sich den Pink/Navy-
  // Aurora-Untergrund — Kategorie-Phases dominieren weiter mit ihren eigenen
  // CAT_BG-Akzenten, daher keine Konkurrenz.
  // 2026-05-08 (Aurora-Vivid-Refresh): vorher Amber/Orange (PreGame) + Lavender/
  // Rose (Paused). Jetzt Brand-Pink/Navy/Magenta — weg von Sepia-Cozy hin zu
  // Aurora-Vivid-Pink.
  const isPreGame = s.phase === 'LOBBY' && !s.setupDone;
  const isPaused = s.phase === 'PAUSED';
  const pauseBg = isPreGame
    ? [
        'radial-gradient(ellipse at 22% 28%, rgba(236,72,153,0.30) 0%, transparent 55%)',
        'radial-gradient(ellipse at 78% 72%, rgba(30,42,90,0.32) 0%, transparent 55%)',
        'radial-gradient(ellipse at 50% 105%, rgba(190,24,93,0.18) 0%, transparent 60%)',
        '#0A0814',
      ].join(',')
    : isPaused
    ? [
        'radial-gradient(ellipse at 28% 32%, rgba(236,72,153,0.26) 0%, transparent 55%)',
        'radial-gradient(ellipse at 78% 70%, rgba(30,42,90,0.30) 0%, transparent 55%)',
        'radial-gradient(ellipse at 55% 8%, rgba(244,114,182,0.16) 0%, transparent 55%)',
        '#0A0814',
      ].join(',')
    : null;
  const bg = pauseBg ?? s.theme?.bgColor ?? (cat ? (CAT_BG[cat] ?? '#0A0814') : '#0A0814');
  const textCol = s.theme?.textColor ?? QQ_COLORS.slate200;
  const accent = s.theme?.accentColor ?? QQ_COLORS.brandPink;
  // Cozy-warmer Card-Hintergrund (passend zum In-Game) statt kühlem Navy.
  // PreGame/Paused nutzen denselben Default wie In-Game (COZY_CARD_BG),
  // damit der ganze Beamer eine konsistente Card-Optik hat.
  const cardBg = (isPreGame || isPaused)
    ? COZY_CARD_BG
    : (s.theme?.cardBg ?? COZY_CARD_BG);
  const fontFam = s.theme?.fontFamily ? `'${s.theme.fontFamily}', 'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif` : "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif";

  // ── 3D grid toggle (beamer-local) ──
  // Not persisted: each new question restarts in 2D so the cinematic "Fahrt"
  // (flat → isometric) plays again. Toggle is only a per-question override.
  const [use3D, setUse3D] = useState(false);
  const toggle3D = useCallback(() => { setUse3D(v => !v); }, []);
  useEffect(() => {
    const onToggle = () => toggle3D();
    window.addEventListener('qq:toggleView', onToggle);
    return () => window.removeEventListener('qq:toggleView', onToggle);
  }, [toggle3D]);

  // Auto-reset to 2D whenever the question changes, so the Fahrt can replay
  const use3DQIdxRef = useRef(s.questionIndex);
  useEffect(() => {
    if (use3DQIdxRef.current !== s.questionIndex) {
      use3DQIdxRef.current = s.questionIndex;
      setUse3D(false);
    }
  }, [s.questionIndex]);

  // ── Slide transition: gameshow-style flash-sweep between phase groups ──
  // Bis 2026-04-23 wurden QUESTION_ACTIVE + QUESTION_REVEAL zusammengruppiert
  // ("reveal ist keine neue Slide"). Das fuehlte sich beim Uebergang aber als
  // harter Cut an. Active→Reveal feuert KEIN Flash mehr (User-Feedback): die
  // QuestionView bleibt gemountet, der Inhalt aendert sich nur leicht (Antwort
  // wird gruen, Avatare/Top-Bets erscheinen) — eine zusaetzliche Bildschirm-
  // Pulsanimation wirkt unnoetig "ueber" einem fast identischen Screen.
  // RULES sub-steps (Welcome -2 / RulesIntro -1 / Regel-Folie 0..) zaehlen als
  // eigene Slides, damit der Flash-Sweep auch bei diesen Uebergaengen feuert.
  const phaseGroup = (s.phase === 'QUESTION_ACTIVE' || s.phase === 'QUESTION_REVEAL')
    ? `Q-${s.currentQuestion?.id ?? s.questionIndex}`
    : s.phase === 'PLACEMENT'
      ? `PLACE-${s.questionIndex}`
      : s.phase === 'RULES'
        ? `RULES-${s.rulesSlideIndex ?? 0}`
        : s.phase;
  const [flashKey, setFlashKey] = useState(0);
  const prevGroupRef = useRef(phaseGroup);
  useEffect(() => {
    if (prevGroupRef.current !== phaseGroup) {
      prevGroupRef.current = phaseGroup;
      setFlashKey(k => k + 1);
    }
  }, [phaseGroup]);

  // ── Placement cell flash: when PLACEMENT→QUESTION_REVEAL, keep showing
  // PlacementView briefly with the just-placed cell highlighted (#2)
  const prevPhaseRef = useRef(s.phase);
  const [placementFlash, setPlacementFlash] = useState<{ cell: { row: number; col: number; teamId: string; wasSteal?: boolean }; state: QQStateUpdate } | null>(null);

  useEffect(() => {
    if (prevPhaseRef.current === 'PLACEMENT' && s.phase === 'QUESTION_REVEAL' && s.lastPlacedCell) {
      setPlacementFlash({ cell: s.lastPlacedCell, state: s });
      const t = setTimeout(() => setPlacementFlash(null), 1800);
      prevPhaseRef.current = s.phase;
      return () => clearTimeout(t);
    }
    prevPhaseRef.current = s.phase;
  }, [s.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Get-Ready Countdown: PAUSED → andere Phase oder RULES → PHASE_INTRO ──
  // (User-Wunsch 2026-04-28: 'nach pause weiter drücken vlt mit timer starten,
  // bei quiz start nach regeln vor runde 1 auch ein timer'). 3-2-1-Overlay
  // gibt den Spielern Zeit zum Handy-Schnappen / Aufmerksamkeit-Sammeln.
  // 2026-04-28-Update: Während Countdown wird der ALTE Bildschirm gefreezed
  // (PausedView / RulesView) — User-Wunsch 'pause darf keinen bug auslösen'.
  // Sonst rendert die neue Phase schon hinter dem Backdrop-Blur und
  // animiert/spielt durch.
  const prevReadyPhaseRef = useRef(s.phase);
  // 2026-05-10 (Audit-P0 Frozen-State-Race-Fix): frozenState als Teil des
  // useState-Werts statt separater useRef. Vorher: zwei Quellen (frozenStateRef
  // + getReady), die getrennt gesetzt/genullt wurden → Race wenn ref vor
  // setState-flush genullt wurde → renderState fiel 1 Frame auf live-s zurück
  // → visible Phase-Snap. Jetzt: 1 atomic State, getReady ist null oder
  // {id, reason, frozenState} — kein Inter-Frame-Mismatch mehr möglich.
  const [getReady, setGetReady] = useState<{
    id: number;
    reason: 'resume' | 'start';
    frozenState: QQStateUpdate;
  } | null>(null);
  useEffect(() => {
    const prev = prevReadyPhaseRef.current;
    prevReadyPhaseRef.current = s.phase;
    // 1) Resume nach Pause — egal in welche Phase wir zurückkehren
    if (prev === 'PAUSED' && s.phase !== 'PAUSED' && s.phase !== 'LOBBY') {
      setGetReady({
        id: Date.now(),
        reason: 'resume',
        frozenState: { ...s, phase: 'PAUSED' as any },
      });
      const t = window.setTimeout(() => setGetReady(null), 3200);
      return () => window.clearTimeout(t);
    }
    // 2) Quiz-Start nach Regeln → erste Runde
    if (prev === 'RULES' && s.phase === 'PHASE_INTRO' && s.gamePhaseIndex === 1) {
      setGetReady({
        id: Date.now(),
        reason: 'start',
        frozenState: { ...s, phase: 'RULES' as any },
      });
      const t = window.setTimeout(() => setGetReady(null), 3200);
      return () => window.clearTimeout(t);
    }
  }, [s.phase, s.gamePhaseIndex]);
  // Atomic: entweder frozen-Snapshot (während Countdown) oder live-State.
  const renderState: QQStateUpdate = getReady ? getReady.frozenState : s;

  // ── Sound: sync volume & config from server state ──
  // Volume only applies to SFX (music has its own volume handling)
  useEffect(() => {
    setVolume(s.sfxMuted ? 0 : s.volume);
  }, [s.sfxMuted, s.volume]);

  // 2026-05-01 (Sound-Audit): Belt-and-Suspender Mute-Gate. Synct s.sfxMuted
  // in eine globale Flag in sounds.ts. Falls ein play*-Aufrufer das
  // 'if (s.sfxMuted) return'-Gate vergisst, blockt die globale Flag den
  // Sound trotzdem.
  useEffect(() => {
    setSfxMuted(!!s.sfxMuted);
  }, [s.sfxMuted]);

  useEffect(() => {
    setSoundConfig(s.soundConfig);
  }, [s.soundConfig]);

  // ── Sound: phase-based SFX ──
  const prevSfxPhaseRef = useRef(s.phase);
  const prevSfxQuestionIdRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevSfxPhaseRef.current;
    prevSfxPhaseRef.current = s.phase;
    if (s.sfxMuted) return;
    resumeAudio();
    if (s.phase === 'PHASE_INTRO' && prev !== 'PHASE_INTRO') {
      playRoundStart();
      playFanfare();
    }
    // Comeback-Intro: Animation ist maechtig, da gehoert ein Sound dazu
    // (User-Wunsch 2026-05-01). Fanfare beim Phase-Enter.
    if (s.phase === 'COMEBACK_CHOICE' && prev !== 'COMEBACK_CHOICE') {
      playFanfare();
    }
    if (s.phase === 'QUESTION_REVEAL' && prev === 'QUESTION_ACTIVE') {
      // Mucho + ZvZ haben Multi-Step-Reveals (Step 0 = Pause, Step 1 = Avatar-
      // Cascade, Step 2 = Lock-Green). Phase-Wechsel ist visuell nur eine
      // dezente Question-Fade — Reveal-Sound wäre hier zu früh. Stattdessen
      // beim ersten muchoRevealStep/zvzRevealStep getriggert (siehe unten).
      const cat = s.currentQuestion?.category;
      const subKind = (s.currentQuestion?.bunteTuete as { kind?: string } | undefined)?.kind;
      const isHotPotato = cat === 'BUNTE_TUETE' && subKind === 'hotPotato';
      const skipPhaseSound = cat === 'MUCHO' || cat === 'ZEHN_VON_ZEHN' || isHotPotato;
      if (!skipPhaseSound) {
        playRevealFor(cat);
      }
      // 2026-05-06 (Konsistenz-Audit S2#2): HotPotato Mini-Cascade ueber die
      // qualifizierten Teams (Sieger-Pool). Pentatonik-Note pro Qualified-Team
      // mit 250ms Stagger, dann Fanfare als Climax. Vorher: nur 1× generischer
      // playReveal — fuehlte sich abrupt an, kein 'musikalischer Aufbau' wie
      // Cheese/Top5/Order.
      if (isHotPotato && !s.sfxMuted) {
        const qualified = s.hotPotatoQualified ?? [];
        const cascadeTotal = qualified.length + 1;
        for (let i = 0; i < qualified.length; i++) {
          const delayMs = 200 + i * 250;
          window.setTimeout(() => {
            try { playAvatarCascadeNote(i, cascadeTotal); } catch {}
          }, delayMs);
        }
        // 2026-05-07 (Sound-Audit P1.1): Fanfare-Timing zu spaet — vorher
        // qualified.length * 250 + 250 Buffer = bei 4 Teams 1450ms, bei 6 Teams
        // 1950ms. Visual-Cascade ist ~800ms — Fanfare wirkte wie 'Nachschlag'
        // statt 'Climax'. Jetzt: Last-Cascade-Note bei (length-1)*250+200,
        // Fanfare 100ms drauf — psychoakustisch direkt am Cascade-Top.
        const lastNoteMs = 200 + Math.max(0, qualified.length - 1) * 250;
        const fanfareMs = lastNoteMs + 100;
        window.setTimeout(() => {
          try { playFanfare(); } catch {}
        }, fanfareMs);
      }
    }
    if (s.phase === 'PLACEMENT' && prev === 'QUESTION_REVEAL') {
      // 2026-04-30 v3 round 5 (User-Bug 'Grid-Öffnen-Sound ist weg'):
      // playGridReveal ist der „Grid erscheint"-Slam, der IMMER feuern soll
      // wenn das Grid sichtbar wird — unabhaengig davon ob jemand richtig lag.
      // Bei Wrong-Answer zusaetzlich playWrongFor (kategorie-spez. Wrong).
      const cat = s.currentQuestion?.category;
      playGridReveal();
      if (!s.correctTeamId) playWrongFor(cat);
    }
    if (s.phase === 'GAME_OVER' && prev !== 'GAME_OVER') {
      // v3 round 9 (User-Wunsch 'auf game over darf musik kommen nach
      // dem mp3 das dafuer vorgesehen ist'): playGameOver one-shot
      // entfernt — startGameOverLoop im Music-Effect kuemmert sich um
      // den Loop ueber die ganze Game-Over-Anzeige.
      // Cozy-Wolf-Stinger: ein einzelner ferner Howl ~600ms nach Loop-Start,
      // wirkt wie ein Signaturmoment statt generischem End-Beep.
      window.setTimeout(() => { try { playWolfHowl(); } catch {} }, 700);
    }
  }, [s.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2026-04-30 v3 (User-Bug): Action-Cards (eure aktion diese runde…)
  // erscheinen erst bei introStep===1 (Rule-Reminder-Substep), nicht bei
  // introStep===0 (Round-Announcement). Vorher feuerte der Sound zum
  // falschen Zeitpunkt → User hoerte nichts wenn die Cards erschienen.
  // Jetzt Trigger an introStep-Wechsel auf 1, mit phasePop-Sync (0.85s
  // delay → Sound 800ms vor dem Pop, psychoakustisch synchron).
  // v3 round 7 (Phase-Sound-Audit): substep 2 (Category-Reveal) + 3
  // (Category-Explanation) bekommen ebenfalls einen entry-Sound, damit
  // jede Folie hoerbar markiert ist.
  // v3 round 8 (User-Wunsch 'cards aufploppen nacheinander, dann moderieren'):
  // Pro Action-Card ein eigener Sound (gestaffelt 1.5s zwischen Cards).
  // Card-Anzahl haengt von Phase + Grid-Free-Cells ab — gleiche Logik wie
  // im Render-Code unten.
  const prevIntroStepRef = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevIntroStepRef.current;
    prevIntroStepRef.current = s.introStep ?? null;
    if (s.sfxMuted) return;
    if (s.phase !== 'PHASE_INTRO') return;
    if (s.introStep === 1 && prev !== 1) {
      // Action-Card-Cascade: Card-Anzahl = Place(if free) + Steal(R2+) + Stapel(R3+)
      const ph = s.gamePhaseIndex ?? 1;
      const hasFreeCells = s.grid.some(row => row.some(c => !c.ownerId));
      // v3 round 11 (User-Wunsch 'echte action-sounds beim vorstellen'):
      // statt Cascade-Toenen jetzt der ECHTE Sound der Action im Grid:
      // - Setzen → playFieldPlaced (Stamp)
      // - Klauen → playSteal
      // - Stapeln → playStapelStamp
      // Liste haengt von Phase + Free-Cells ab — gleiche Logik wie Render.
      // 2026-05-05 (Wolf-Bug 'bei 4 gewinn intro kommt stabelsound'):
      // Stapel-Sound aus Phase-Intro-Cascade entfernt — er kam in
      // Phase 3 als Action-Card-Sound, war aber bei 4-Gewinnt-Fragen
      // verwirrend (4-Gewinnt hat keine Stapel-Aktion in der Frage).
      // 2026-05-05 v2 (Wolf-Bug 'cozyguessr intro: steal sound, runde 2
      // intro: anderer sound'): Steal-Sound auch raus — selbe Begruendung,
      // er kam in Phase 2+ als Action-Card-Sound aber bei Fragen ohne
      // Steal-Aktion (CozyGuessr/Cheese/Top5/...) wirkte er fremdartig.
      // Action-Sounds bleiben beim ECHTEN Triggern in PLACEMENT.
      // 2026-05-17 (Wolf 'doppel sound place: erst cascade, dann nochmal
      // bei drehung'): Cascade-Action-Sound komplett raus. ActionCardReveal
      // feuert beim Slam einen Card-Slam-Thump (playWoodKnock) und beim
      // Flip den action-spez. Sound (playFieldPlaced/playSteal/playStapel).
      // Plain Cards (= keine NEU-Karte) bleiben still — sie führen keine
      // neue Aktion ein, brauchen keinen Sound-Highlight.
      void hasFreeCells; void ph; // keep referenced for ESLint
      return () => { /* no-op */ };
    } else if (s.introStep === 2 && prev !== 2) {
      // Category-Reveal-Substep — kategorie-spez. Question-Start-Sound
      try { playQuestionStartFor(s.currentQuestion?.category); } catch {}
    }
    // 2026-05-06 (Wolf 'Runde 3 Frage 1 hat anderen Sound im Intro als
    // die anderen Question-Intros'): introStep===3 spielte zusaetzlich
    // playRoundStart() — das ist aber bereits beim PHASE_INTRO-Entry
    // (Zeile ~818) gefeuert worden. Doppel-Sound entfernt; Step 3
    // (Category-Explanation) ist visuell genug markiert. Konsistent fuer
    // alle Question-Intros, unabhaengig ob Kategorie neu oder bekannt.
  }, [s.phase, s.introStep, s.sfxMuted, s.currentQuestion?.category, s.gamePhaseIndex, s.grid]);

  // RULES-Slide-Wechsel: bewusst KEIN Sound (User-Wunsch 2026-05-01).
  // Hintergrundmusik laeuft + Wolf moderiert live, da stoert ein zusaetzlicher
  // Tick/Stamp pro Folie.

  // ── Time-Travel-Recorder ──
  // Wir loggen während des Spiels Frage für Frage wer gewonnen hat —
  // das Backend trackt das nicht historisch (nur live in correctTeamId).
  // Beim GAME_OVER spielen wir das als 15-Sek-Recap ab.
  // Steal-Events kommen aus lastPlacedCell.wasSteal.
  // Module-Level-Refs (siehe oben), damit die Replay-Component beim Mount
  // im Render-Tree dieselben Refs sieht.
  useEffect(() => {
    if (s.phase === 'QUESTION_REVEAL' && s.currentQuestion) {
      const qid = s.currentQuestion.id;
      if (!recordedQuestions.has(qid)) {
        recordedQuestions.set(qid, {
          winnerId: s.correctTeamId ?? null,
          category: s.currentQuestion.category,
          idx: s.questionIndex,
        });
      } else if (s.correctTeamId) {
        const ex = recordedQuestions.get(qid)!;
        if (!ex.winnerId) ex.winnerId = s.correctTeamId;
      }
    }
  }, [s.phase, s.currentQuestion?.id, s.correctTeamId, s.questionIndex]);

  useEffect(() => {
    const lp = s.lastPlacedCell;
    if (lp && lp.wasSteal) {
      recordedSteals.add(`${lp.row}-${lp.col}-${lp.teamId}`);
    }
  }, [s.lastPlacedCell?.row, s.lastPlacedCell?.col, s.lastPlacedCell?.teamId, s.lastPlacedCell?.wasSteal]);

  // Reset Recordings beim Game-Restart (LOBBY → erneut aktivieren)
  useEffect(() => {
    if (s.phase === 'LOBBY') {
      recordedQuestions.clear();
      recordedSteals.clear();
    }
  }, [s.phase]);

  // Lagerfeuer-Loop deaktiviert (User-Wunsch 2026-04-28: hat zu sehr gestört).
  // Code bleibt stehen falls wir's später als optionales Toggle wieder aktivieren.
  useEffect(() => { stopCampfireLoop(); return () => stopCampfireLoop(); }, []);

  // Avatar-Jingle wenn ein neues Team joint — pro Avatar eigenes Mini-Timbre.
  // Erkennt frische Joins via teamIds-Diff (gleiche Logik wie Wave-Anim in
  // LobbyView). Spielt nur wenn SFX aktiv und neues Team echt neu (nicht
  // beim initialen Mount mit existierenden Teams).
  const prevTeamIdsForJingleRef = useRef<Set<string>>(new Set(s.teams.map(t => t.id)));
  useEffect(() => {
    if (s.sfxMuted) {
      prevTeamIdsForJingleRef.current = new Set(s.teams.map(t => t.id));
      return;
    }
    const cur = new Set(s.teams.map(t => t.id));
    const prev = prevTeamIdsForJingleRef.current;
    const fresh = s.teams.filter(t => !prev.has(t.id));
    prevTeamIdsForJingleRef.current = cur;
    // Nur jinglen wenn vorher schon Teams da waren (kein Mass-Jingle beim Beamer-Mount).
    if (fresh.length > 0 && prev.size > 0 && s.phase === 'LOBBY') {
      // Stagger: pro Avatar ~250ms versetzt
      fresh.forEach((t, i) => {
        window.setTimeout(() => { try { playAvatarJingle(t.avatarId); } catch {} }, i * 250);
      });
    }
  }, [s.teams, s.sfxMuted, s.phase]);

  // Neuer Frage-Cue bei jeder neuen Question-ID.
  // 2026-05-09 (Wolf): bei Hot Potato erst Question-Sound feuern wenn Slot
  // finished ist (= Timer startet). Vorher (rolling/landed) läuft die Slot-
  // Animation visuell — Question-Sound würde sich mit Slot-Stinger überlagern.
  useEffect(() => {
    if (s.sfxMuted) return;
    const qid = s.currentQuestion?.id ?? null;
    if (!qid) return;
    const isHotPotato = (s.currentQuestion?.bunteTuete as { kind?: string } | undefined)?.kind === 'hotPotato';
    const hps = (s as any).hotPotatoSlotState;
    // HP-Gate: Question-Sound darf erst feuern wenn Slot finished (= Timer-Start)
    if (isHotPotato && hps !== 'finished') return;
    if (qid === prevSfxQuestionIdRef.current) return;
    prevSfxQuestionIdRef.current = qid;
    if (s.phase === 'QUESTION_ACTIVE') {
      resumeAudio();
      playQuestionStartFor(s.currentQuestion?.category);
    }
  }, [s.currentQuestion?.id, s.phase, s.sfxMuted, (s as any).hotPotatoSlotState]);

  // ── Music: timer loop (game-show music while question is active) ──
  // Normalfall: laeuft solange ein Frage-Timer aktiv ist (s.timerEndsAt).
  // Hot Potato: hat keinen Frage-Timer, sondern pro-Team-Turn-Timer der mit
  //   jedem Team-Wechsel neu gesetzt wird. Frueher hing die Musik an
  //   `s.hotPotatoTurnEndsAt` → Loop startete bei jedem Team-Switch neu (Cut!).
  //   Jetzt ist sie an die Frage selbst gekoppelt: einmal Start beim Aktivieren,
  //   bis die Phase wechselt (Winner declared / Reveal).
  // Pro-Kategorie-Musik (seit 2026-04-23): currentQuestion.category waehlt
  //   den passenden catMusic*-Slot — wenn dort eine URL gesetzt ist, wird
  //   sie geladen, sonst Fallback auf timerLoop.
  useEffect(() => {
    const bt: { kind?: string } | undefined = s.currentQuestion?.bunteTuete as any;
    const cat = s.currentQuestion?.category;
    const isHotPotato = cat === 'BUNTE_TUETE' && bt?.kind === 'hotPotato';
    // 2026-04-30 v3 round 7 (User-Frage 'alle kategorien auch? gerade
    // bunte tuete?'): Bluff und Imposter (oneOfEight) hatten qqStopTimer
    // → s.timerEndsAt war null → kein Loop-Trigger → keine BG-Musik.
    // Jetzt explizit jede BUNTE_TUETE-Sub als 'loop-erlaubt' markieren.
    const isCustomTimerSub = cat === 'BUNTE_TUETE'
      && (bt?.kind === 'bluff' || bt?.kind === 'oneOfEight'
        || bt?.kind === 'hotPotato' || bt?.kind === 'onlyConnect'
        || bt?.kind === 'top5' || bt?.kind === 'order'
        || bt?.kind === 'map');
    const hasNormalTimer = !!s.timerEndsAt;
    const shouldLoop =
      !s.musicMuted
      && s.phase === 'QUESTION_ACTIVE'
      && !s.currentQuestion?.musicUrl
      && (hasNormalTimer || isHotPotato || isCustomTimerSub);
    if (!shouldLoop) {
      stopTimerLoop();
      return;
    }
    const catSlot: QQSoundSlot | undefined =
      cat === 'SCHAETZCHEN'   ? 'catMusicSchaetzchen'
      : cat === 'MUCHO'         ? 'catMusicMucho'
      : cat === 'BUNTE_TUETE'   ? 'catMusicBunteTuete'
      : cat === 'ZEHN_VON_ZEHN' ? 'catMusicZehnVonZehn'
      : cat === 'CHEESE'        ? 'catMusicCheese'
      : undefined;
    startTimerLoop(catSlot);
    return () => stopTimerLoop();
    // hotPotatoTurnEndsAt ABSICHTLICH NICHT in deps — sonst springt der Loop
    // bei jedem Team-Wechsel an. Die Musik laeuft fuer die gesamte HP-Runde.
  }, [s.timerEndsAt, s.phase, s.musicMuted, s.currentQuestion?.id, s.currentQuestion?.musicUrl, s.currentQuestion?.category]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Music: Lobby-Loop in Lobby / Welcome / RULES / Pause / FINALE ──
  // Erweitert auf alle RULES-Slides (vorher nur Welcome bei -2), damit
  // der Regel-Walkthrough nicht in komplett stillem Raum stattfindet.
  // 2026-04-28: CONNECTIONS_4X4 (Großes Finale) bekommt auch Hintergrund-Musik
  // (User-Wunsch: 'während Finale keine Musik und keine Sounds' war Bug).
  useEffect(() => {
    const inRules = s.phase === 'RULES';
    // v3 round 11 (User-Bug 'musik von finale laeuft nach timer noch, nur
    // waehrend timer'): Finale-Musik nur waehrend connections.phase==='active'
    // (= Timer laeuft). Bei intro/reveal/placement/done STOP.
    // Analog Comeback: nur waehrend H/L-Question-Timer aktiv.
    const inFinale = s.phase === 'CONNECTIONS_4X4' && s.connections?.phase === 'active';
    const inLobby = s.phase === 'LOBBY';
    const inComeback = s.phase === 'COMEBACK_CHOICE'
      && s.comebackHL?.phase === 'question'
      && !!s.comebackHL?.timerEndsAt
      && getServerNow() < s.comebackHL.timerEndsAt;
    const inGameOver = s.phase === 'GAME_OVER';
    const inThanks = s.phase === 'THANKS';
    const shouldLoop = !s.musicMuted && (inLobby || s.phase === 'PAUSED' || inRules || inFinale || inComeback || inGameOver || inThanks);
    if (shouldLoop) {
      resumeAudio();
      // 2026-04-30: Lobby/Setup nutzt IMMER den Pool (4 lobby-welcome Tracks).
      // Rules/Pause nutzen den Custom-Upload aus lobbyWelcome-Slot
      // (mit Pool als Fallback). v3 round 6 (User-Wunsch): Finale +
      // Comeback haben eigene Slots 'finaleMusic' / 'comebackMusic',
      // jeweils mit lobbyWelcome als Fallback.
      // v3 round 9 (User-Wunsch GAME_OVER + THANKS Musik):
      // - GAME_OVER nutzt eigenen 'gameOver'-Slot (existiert schon, war
      //   nur als one-shot getriggert). Jetzt als Loop fuer die ganze
      //   Game-Over-Anzeige.
      // - THANKS ('hope you had fun') wieder Lobby-Musik.
      if (inFinale) {
        startFinaleLoop();
      } else if (inComeback) {
        startComebackLoop();
      } else if (inGameOver) {
        startGameOverLoop();
      } else {
        // LOBBY/PAUSED/RULES/THANKS → lobbyWelcome
        startLobbyLoop(inLobby ? 'pool-only' : 'custom-or-pool');
      }
    } else {
      stopLobbyLoop();
    }
    return () => stopLobbyLoop();
    // 2026-05-01: connections.phase + comebackHL deps ergaenzt — sonst wird
    // der Loop nicht (re)gestartet wenn z.B. connections.phase 'intro'→'active'
    // wechselt waehrend s.phase konstant CONNECTIONS_4X4 bleibt. Vorher: Finale-
    // Musik startete nicht waehrend der 3-Min-Phase.
  }, [s.phase, s.musicMuted, s.connections?.phase, s.comebackHL?.phase, s.comebackHL?.timerEndsAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Audio-Unlock: Browser blockiert Autoplay bis zur ersten User-Interaktion
  // im Tab. Der Beamer-Tab bekommt aber selten echte Klicks (Moderator ist
  // meist im Moderator-Tab). Wir haengen einmalige Unlock-Listener auf
  // click/keydown/touchend — sobald irgendwas im Beamer-Tab passiert, wird
  // Audio-Context entsperrt und der Lobby-Loop (falls aktiv) neu gestartet.
  useEffect(() => {
    const stateSnapshot = { phase: s.phase, musicMuted: s.musicMuted };
    // Ref zu aktuellen state-Werten via snapshot, der bei jedem Render refresht wird.
    const unlock = () => {
      resumeAudio();
      const inRules = stateSnapshot.phase === 'RULES';
      const inLobby = stateSnapshot.phase === 'LOBBY';
      const shouldLoop = !stateSnapshot.musicMuted && (inLobby || stateSnapshot.phase === 'PAUSED' || inRules);
      if (shouldLoop) startLobbyLoop(inLobby ? 'pool-only' : 'custom-or-pool');
    };
    const opts: AddEventListenerOptions = { once: true };
    window.addEventListener('click', unlock, opts);
    window.addEventListener('keydown', unlock, opts);
    window.addEventListener('touchend', unlock, opts);
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchend', unlock);
    };
  }, [s.phase, s.rulesSlideIndex, s.musicMuted]);

  // ── Music Duck: während PAUSE wird alle Musik auf ~20% gedämpft (500ms fade) ──
  useEffect(() => {
    setMusicDucked(s.phase === 'PAUSED');
  }, [s.phase]);

  // ── Duck auf question-musicUrl anwenden (tickt, weil getMusicDuckFactor global ist) ──
  const [duckFactor, setDuckFactor] = useState(1);
  useEffect(() => {
    if (s.phase !== 'PAUSED' && duckFactor === 1) return;
    // während Fade: alle 30ms nachziehen, bis Ziel erreicht
    const iv = setInterval(() => {
      const f = getMusicDuckFactor();
      setDuckFactor(f);
      if ((s.phase === 'PAUSED' && f <= 0.21) || (s.phase !== 'PAUSED' && f >= 0.99)) {
        clearInterval(iv);
      }
    }, 30);
    return () => clearInterval(iv);
  }, [s.phase, duckFactor]);

  // ── Sound: timer ticks (SFX — not music) ──
  useEffect(() => {
    if (s.sfxMuted || !s.timerEndsAt || s.phase !== 'QUESTION_ACTIVE') return;
    const iv = setInterval(() => {
      const rem = Math.max(0, (s.timerEndsAt! - getServerNow()) / 1000);
      if (rem <= 0) { stopTimerLoop(); playTimesUp(); clearInterval(iv); return; }
      if (rem <= 5) playUrgentTick();
      else if (rem <= 10) playTick();
    }, 1000);
    return () => clearInterval(iv);
  }, [s.timerEndsAt, s.phase, s.sfxMuted]);

  // D1-D3 Marker-Sounds: Shield / Stapel / Sanduhr beim ersten Setzen.
  // Wir diffen die Grid-Cell-Flags: neues shielded/stuck/sandLockTtl>0 → Sound.
  // F1 Team-Join-Sound wird hier auch angehaengt (neue Team-IDs).
  // Swap-Sound: wenn zwischen zwei States zwei Cells gleichzeitig den Owner
  // wechseln UND ihre neuen Owner zu ihren vorherigen Gegner passen (= Swap).
  const prevFlagsRef = useRef<{ stuck: string; teamIds: string }>({
    stuck: '', teamIds: '',
  });
  useEffect(() => {
    if (s.sfxMuted) return;
    // 2026-04-30: SHIELD/SANDUHR/SWAP entfernt — nur noch Trinity (Place/Steal/Stapel).
    const stuckKey = s.grid.flatMap((row, r) => row.map((c, ci) => c.stuck ? `${r}-${ci}` : '')).filter(Boolean).join(',');
    const teamIdsKey = s.teams.map(t => t.id).sort().join(',');
    const prev = prevFlagsRef.current;
    const grew = (a: string, b: string) => b.split(',').filter(Boolean).length > a.split(',').filter(Boolean).length;
    // 2026-05-17 P7 (Wolf 'stapel sound nicht immer zu hören in grid wenn
    // aus /team gesetzt'): hasNew = positional Diff — fired wenn aktuell
    // ein stuck-Key existiert der vorher nicht da war. Vorteile gg. `grew`:
    //   - first stapel der Session fired (vorher: prev.stuck='' → falsy-
    //     guard `prev.stuck &&` blockte den ersten Stapel komplett)
    //   - kein false-fire wenn Cell-Count gleich bleibt aber Position wechselt
    // Phase-Check bleibt (PLACEMENT only) — Phase-Wechsel-False-Fires bleiben
    // unterbunden weil prev/current bei Phase-Wechsel identisch sind.
    const hasNewStuck = (prevStr: string, curStr: string): boolean => {
      const prevSet = new Set(prevStr.split(',').filter(Boolean));
      return curStr.split(',').filter(Boolean).some(k => !prevSet.has(k));
    };
    if (s.phase === 'PLACEMENT' && hasNewStuck(prev.stuck, stuckKey)) playStapelStamp();
    if (prev.teamIds && grew(prev.teamIds, teamIdsKey) && s.phase === 'LOBBY') playTeamJoin();
    prevFlagsRef.current = { stuck: stuckKey, teamIds: teamIdsKey };
  }, [s.grid, s.teams, s.phase, s.sfxMuted]); // eslint-disable-line react-hooks/exhaustive-deps

  // H2 First-Steal-Badge: beim ersten Klau der Partie ein „Steal unlocked!"-
  // Moment. Trigger via lastPlacedCell.wasSteal zum ersten Mal true.
  const firstStealSeenRef = useRef(false);
  const [firstStealBadge, setFirstStealBadge] = useState<string | null>(null);
  useEffect(() => {
    if (firstStealSeenRef.current) return;
    if (s.lastPlacedCell?.wasSteal) {
      firstStealSeenRef.current = true;
      const t = s.teams.find(tm => tm.id === s.lastPlacedCell?.teamId);
      setFirstStealBadge(t?.name ?? 'Team');
      setTimeout(() => setFirstStealBadge(null), 2800);
    }
  }, [s.lastPlacedCell]);

  // G1 Round-End-Overlay + H1 Perfect-Round-Detection.
  // Tracken: pro Team, wie oft es in der aktuellen Runde correctTeamId war.
  // Bei Runden-Wechsel (gamePhaseIndex++): Zeige Overlay, prüfe auf 5/5 Perfect.
  const roundCorrectsRef = useRef<Record<string, number>>({});
  const prevGamePhaseRef = useRef(s.gamePhaseIndex);
  const prevCorrectTeamIdRef = useRef<string | null>(null);
  const prevQidRef = useRef<string | null>(null);
  const [roundEndOverlay, setRoundEndOverlay] = useState<{
    phase: number;
    winner: typeof s.teams[number] | null;
    perfectTeams: typeof s.teams;
  } | null>(null);

  useEffect(() => {
    const qid = s.currentQuestion?.id ?? null;
    const cur = s.correctTeamId ?? null;
    // Nur einmal pro Question counten — wechsel der Question-ID reset prevCorrect.
    if (qid !== prevQidRef.current) {
      prevQidRef.current = qid;
      prevCorrectTeamIdRef.current = null;
    }
    if (cur && cur !== prevCorrectTeamIdRef.current) {
      prevCorrectTeamIdRef.current = cur;
      roundCorrectsRef.current[cur] = (roundCorrectsRef.current[cur] ?? 0) + 1;
    }
  }, [s.correctTeamId, s.currentQuestion?.id]);

  useEffect(() => {
    const prev = prevGamePhaseRef.current;
    prevGamePhaseRef.current = s.gamePhaseIndex;
    if (s.gamePhaseIndex > prev && prev >= 1) {
      const leader = [...s.teams].sort((a, b) =>
        b.largestConnected - a.largestConnected || b.totalCells - a.totalCells
      )[0] ?? null;
      // H1: wer hatte 5/5 in der gerade beendeten Runde?
      const perfect = s.teams.filter(t => (roundCorrectsRef.current[t.id] ?? 0) >= 5);
      setRoundEndOverlay({ phase: prev, winner: leader, perfectTeams: perfect });
      setTimeout(() => setRoundEndOverlay(null), 3600);
      // Reset fuer neue Runde.
      roundCorrectsRef.current = {};
    }
  }, [s.gamePhaseIndex, s.teams]);

  // C3 Timer-Urgency-Vignette: roter Inset-Pulse am Screen-Rand bei <=5s.
  // Separater State, damit wir im Render-Baum die Vignette zeigen koennen
  // (der Sound-Tick-Hook oben setzt keinen State).
  const [timerUrgent, setTimerUrgent] = useState(false);
  useEffect(() => {
    if (!s.timerEndsAt || s.phase !== 'QUESTION_ACTIVE') {
      setTimerUrgent(false);
      return;
    }
    const tick = () => {
      const rem = Math.max(0, (s.timerEndsAt! - getServerNow()) / 1000);
      setTimerUrgent(rem > 0 && rem <= 5);
    };
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
  }, [s.timerEndsAt, s.phase]);

  // ── Sound: Timer-End auch wenn alle Teams vor Ablauf geantwortet haben ──
  const prevAllAnsweredRef = useRef(false);
  useEffect(() => {
    const justAllAnswered =
      s.phase === 'QUESTION_ACTIVE' && s.allAnswered && !prevAllAnsweredRef.current;
    prevAllAnsweredRef.current = s.allAnswered;
    if (justAllAnswered && !s.sfxMuted) {
      stopTimerLoop();
      playTimesUp();
    }
  }, [s.allAnswered, s.phase, s.sfxMuted]);

  // ── Sound: placement → score up (SFX) ──
  const prevCorrectRef = useRef(s.correctTeamId);
  useEffect(() => {
    if (s.correctTeamId && !prevCorrectRef.current && !s.sfxMuted) playScoreUp();
    prevCorrectRef.current = s.correctTeamId;
  }, [s.correctTeamId, s.sfxMuted]);

  // ── Sound: pro Einzel-Placement (nicht pro Phase-Wechsel)
  // In Multi-Placement-Runden (PLACE_2 etc.) bleibt das Backend in der PLACEMENT-Phase
  // bis alle Steine gesetzt sind — wir verlassen uns deshalb auf lastPlacedCell, das pro
  // einzelnem Placement auf dem Backend aktualisiert wird.
  const prevPlacementKeyRef = useRef<string | null>(null);
  // 2026-04-30 v3 round 9 (User-Wunsch 'cascade-toene auch im finale beim
  // setzen, fuer konsistenz'): pro Finale-Placement zusaetzlich zum
  // playFieldPlaced einen aufsteigenden Pentatonik-Ton. Rank zaehlt hoch,
  // Total = max-erwartete Placements (sum foundGroupIds.length).
  const finalePlacementCountRef = useRef(0);
  const finalePlacementQidRef = useRef<string | null>(null);
  useEffect(() => {
    const c = s.lastPlacedCell;
    if (!c) { prevPlacementKeyRef.current = null; return; }
    const key = `${c.row}-${c.col}-${c.teamId}`;
    if (key === prevPlacementKeyRef.current) return;
    prevPlacementKeyRef.current = key;
    if (s.sfxMuted) return;
    // v3 round 11 (User-Bug 'stapeln macht feldsetzen+stapel sound'):
    // Wenn die letzte Cell-Aktion ein STAPEL war, NICHT playFieldPlaced
    // feuern — der separate stuck-effect (line ~1024) spielt schon
    // playStapelStamp. Sonst Doppel-Sound.
    const isStapel = !!s.grid[c.row]?.[c.col]?.stuck;
    if (c.wasSteal) playSteal();
    else if (!isStapel) playFieldPlaced();
    // Im Finale: zusaetzlich Cascade-Ton pro gesetztem Avatar.
    if (s.phase === 'CONNECTIONS_4X4' && s.connections?.phase === 'placement') {
      // Reset counter when entering finale or new round
      const finaleKey = s.connections.payload?.toString() ?? 'finale';
      if (finalePlacementQidRef.current !== finaleKey) {
        finalePlacementQidRef.current = finaleKey;
        finalePlacementCountRef.current = 0;
      }
      const expectedTotal = Object.values(s.connections.teamProgress ?? {})
        .reduce((sum, tp) => sum + (tp?.foundGroupIds?.length ?? 0), 0);
      const cascadeTotal = Math.max(2, expectedTotal + 1);
      const rank = Math.min(finalePlacementCountRef.current, cascadeTotal - 1);
      finalePlacementCountRef.current += 1;
      try { playAvatarCascadeNote(rank, cascadeTotal); } catch {}
    }
  }, [s.lastPlacedCell, s.sfxMuted, s.phase, s.connections]);

  // ── Sound: Reveal-Step Plopps (Avatare auf Optionen / Map-Pins / Lösungs-Highlight)
  // Bei MUCHO/ZehnvonZehn/Cheese/CozyGuessr werden im REVEAL pro Moderator-Klick
  // sukzessive Avatare oder Pins eingespielt. Pro Step ein „Plopp", beim finalen
  // Lösungs-Step (z.B. MUCHO grünes Feld) ein satterer Bestätigungs-Sound.
  //
  // Alter Code hatte einen separaten Reset-useEffect der BAUM die frisch gesetzte
  // Baseline direkt wieder auf null ueberschrieb → jeder erste Step einer Frage
  // hatte kein Audio. Jetzt konsolidiert in einem Hook + prevQidRef:
  // - Frage-Wechsel (qid neu): prevSteps auf curr setzen, KEIN Sound.
  // - Sonst: curr mit prev vergleichen, Sound pro Step-Inkrement.
  const prevRevealStepsRef = useRef({ mucho: 0, zvz: 0, cheese: 0, map: 0 });
  const prevRevealQidRef = useRef<string | null>(null);
  useEffect(() => {
    const qid = s.currentQuestion?.id ?? null;
    const curr = {
      mucho:  s.muchoRevealStep  ?? 0,
      zvz:    s.zvzRevealStep    ?? 0,
      cheese: s.cheeseRevealStep ?? 0,
      map:    s.mapRevealStep    ?? 0,
    };
    // Question wechselt → Baseline neu setzen, kein Sound.
    if (qid !== prevRevealQidRef.current) {
      prevRevealQidRef.current = qid;
      prevRevealStepsRef.current = curr;
      return;
    }
    const prev = prevRevealStepsRef.current;
    prevRevealStepsRef.current = curr;
    if (s.phase !== 'QUESTION_REVEAL' || s.sfxMuted) return;

    // MUCHO: Akt-1-Steps → Tonleiter pro Avatar; Lock-Step (Lösung grün) → naechster Cascade-Ton.
    // 2026-04-30 v2 (User-Wunsch): Aufloesen + Winner-Card sind +2 Toene
    // auf der gleichen Tonleiter NACH den Avataren. cascadeTotal = N+2,
    // damit Avatare die unteren N Stufen, Reveal+Winner die obersten 2.
    if (curr.mucho > prev.mucho) {
      const q = s.currentQuestion;
      if (q?.category === 'MUCHO') {
        const distinctVoterOptions = new Set(s.answers.map(a => a.text)).size;
        const lockStep = distinctVoterOptions + 1;
        const total = s.answers.length;
        const cascadeTotal = total + 2; // +2 fuer Reveal-Highlight + WinnerCard
        if (curr.mucho >= lockStep) {
          // v3 round 11 (User-Bug 'mehrere parallele sounds'): nur Reveal-
          // Highlight statt Cascade+Highlight gleichzeitig. Saubere 1-Layer
          // 'gruene-loesung'-Markierung. Cascade-Top kommt mit WinnerCard.
          try { playRevealHighlight(); } catch {}
        }
        else if (prev.mucho === 0) {
          // Cascade-Start — Tonleiter pro Voter-Avatar synchron
          // mit der MUCHO-Animation. autoCap advanced alle 750ms eine Option,
          // Voter pro Option erscheinen simultan. Wir scheduln dazu
          // passend pro Voter einen aufsteigenden Pentatonik-Ton.
          // v3 round 8 (User-Bug 'ton kommt viel zu früh'): autoCap-Tick startet
          // bei t=750ms (NICHT t=0). Erste Voter-Pops also bei +750ms. Sounds
          // wurden um eine Tick-Periode verschoben damit sie synchron zum
          // visuellen Pop kommen, minus 60ms Lead-Time fuer psychoakustische
          // Synchronitaet (Ohr nimmt Ton minimal vor Bild als sync wahr).
          const opts = q.options ?? [];
          const nonEmptyOrdered: number[] = [];
          for (let i = 0; i < opts.length; i++) {
            if (s.answers.some(a => a.text === String(i))) nonEmptyOrdered.push(i);
          }
          let voterCount = 0;
          nonEmptyOrdered.forEach((optIdx, optStep) => {
            const optionVoters = s.answers
              .filter(a => a.text === String(optIdx))
              .sort((a, b) => a.submittedAt - b.submittedAt);
            optionVoters.forEach((_voter, localIdx) => {
              const myRank = voterCount;
              voterCount++;
              // 2026-05-13 (Wolf 'sound cascaden nicht passend') — Audit-Fix
              // MUCHO: Voter-Stagger 90→180ms. Visual-CSS muchoVoterDrop nutzt
              // `${vi*0.18}s` (= 180ms), Sound war 90ms → Sound raste doppelt
              // so schnell durch die Voter wie das Visual.
              const delay = (optStep + 1) * 750 - 60 + localIdx * 180;
              window.setTimeout(() => { try { playAvatarCascadeNote(myRank, cascadeTotal); } catch {} }, delay);
            });
          });
        }
        else playFieldPlaced();
      }
    }
    // ZEHN_VON_ZEHN: Cascade-Step → Tonleiter pro Team-Bet, Lock → Highlight.
    if (curr.zvz > prev.zvz) {
      const total = s.answers.length;
      const cascadeTotal = total + 2;
      if (curr.zvz >= 2) {
        // 2026-05-06 (Konsistenz-Audit S2#1 'ZvZ Lock-Step ohne Sound, alle
        // anderen Cascades haben playRevealHighlight'): Highlight wieder rein,
        // aber mit Delay sodass er NACH den noch laufenden Cascade-Toenen
        // kommt (statt parallel). Die Cascade-Setimeouts feuern bei
        // 200 + i*550 - 60 ms ab Step-1-Trigger. Step 2 kommt nach Mod-Klick;
        // wenn das mid-Cascade ist, koennten Toene noch laufen.
        // Schaetzung: Cascade max ~3.5s. Wir setzen den Highlight 200ms nach
        // dem Step-Trigger (Mod klickt nach Cascade-Ende). Ergibt minimal
        // overlap mit letztem Cascade-Ton, fuehlt sich aber wie Climax an.
        window.setTimeout(() => { try { playRevealHighlight(); } catch {} }, 200);
      }
      else if (prev.zvz === 0) {
        // Cascade-Start — Tonleiter pro Avatar synchron zur ZvZ-Animation.
        // v3 round 8 (User-Bug 'ton kommt zu früh'): ZvZ enthuellt Optionen
        // gestaffelt (200ms initial + 550ms pro Option, siehe zvzNonEmptyOptions
        // forEach in line 7993). Sounds müssen pro Option-Batch + per-team-
        // Stagger feuern, nicht stupide alle 150ms ab t=0.
        const q = s.currentQuestion;
        const opts = q?.options ?? [];
        // Reihenfolge der Option-Reveals (Backend-Sortierung): nicht-leere
        // Optionen in Index-Reihenfolge — passt zum Frontend-Cascade.
        const nonEmptyOrderedZ: number[] = [];
        for (let i = 0; i < opts.length; i++) {
          if (s.answers.some(a => a.text.split(',').some((p, pi) => pi === i && Number(p) > 0))) {
            nonEmptyOrderedZ.push(i);
          }
        }
        let zvzVoterCount = 0;
        nonEmptyOrderedZ.forEach((optIdx, optStep) => {
          // Teams die auf optIdx gesetzt haben, sortiert nach submittedAt
          const optionTeams = s.answers
            .map(a => {
              const parts = a.text.split(',').map(n => Number(n) || 0);
              return { teamId: a.teamId, pts: parts[optIdx] ?? 0, submittedAt: a.submittedAt };
            })
            .filter(x => x.pts > 0)
            .sort((a, b) => a.submittedAt - b.submittedAt);
          optionTeams.forEach((_t, localIdx) => {
            const myRank = zvzVoterCount;
            zvzVoterCount++;
            // Visual-Time = 200 (initial) + optStep*550 (option-batch). Sound
            // 60ms davor + 90ms per-team-stagger fuer hoerbare Cascade.
            const delay = 200 + optStep * 550 - 60 + localIdx * 90;
            window.setTimeout(() => { try { playAvatarCascadeNote(myRank, cascadeTotal); } catch {} }, Math.max(0, delay));
          });
        });
      }
      else playFieldPlaced();
    }
    // 2026-05-06 (Konsistenz-Audit S2#3): Cheese-Step-Sound-Block entfernt —
    // toter Code seit Cheese-Reveal sofort komplett zeigt (cheeseRevealStep
    // wird nie inkrementiert). Cheese-Sounds laufen jetzt zentral in der
    // useEffect bei der Cheese-Cascade (slow→fast Winners + RevealHighlight
    // auf schnellstem Winner).
    // CozyGuessr (BUNTE_TUETE Map): pro Step ein Sound.
    // 2026-05-06 (Wolf 'beim Zoom auf Karte (letzter Step) bitte anderen
    // Sound — Stampfen ergibt keinen Sinn weil kein Pin mehr gesetzt wird,
    // nimm den Lösung-Aufdeck-Sound aus den anderen Kategorien'):
    // - Step 1                    = Ziel-Marker erscheint     → Plopp
    // - Step 2..1+validCount      = Pins droppen worst→best   → Plopp
    // - Step 1+validCount+1       = Closeup-Zoom auf Ziel     → playRevealHighlight
    if (curr.map > prev.map) {
      const validCount = s.answers.filter(a => {
        const parts = String(a.text ?? '').split(',');
        return Number.isFinite(Number(parts[0])) && Number.isFinite(Number(parts[1]));
      }).length;
      const closeUpStep = 1 + validCount + 1;
      if (curr.map >= closeUpStep) {
        try { playRevealHighlight(); } catch {}
      } else {
        playFieldPlaced();
      }
    }
  }, [s.muchoRevealStep, s.zvzRevealStep, s.cheeseRevealStep, s.mapRevealStep, s.phase, s.sfxMuted, s.currentQuestion?.id, s.answers]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── CONNECTIONS_4X4 (Finale) Phase-Wechsel-Sounds ──────────────────────────
  // 2026-05-05 (Wolf-Bug 'keine toene beim reveal von finale 4x4'):
  // Connections-Reveal hatte keine Audio-Markierung — Wolf hoerte Stille
  // waehrend Teams enthuellt wurden. Jetzt:
  // - intro → active: Fanfare (Spiel beginnt)
  // - active → reveal: Cascade pro Team (worst→best, ~600ms Stagger)
  // - reveal → placement: Field-Placed-Sound (Markierung dass Setzen anfaengt)
  // - placement → done: ClimaxFinish (Finale ist fertig)
  const prevConnectionsPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    const cur = s.connections?.phase ?? null;
    const prev = prevConnectionsPhaseRef.current;
    prevConnectionsPhaseRef.current = cur;
    if (s.sfxMuted) return;
    if (s.phase !== 'CONNECTIONS_4X4') return;
    if (cur === prev) return;
    if (prev === 'active' && cur === 'reveal') {
      // 2026-05-05 (Wolf 'Sound stimmt nicht mit Visual ueberein'): Cascade-
      // Timing mit Visual-Stagger gesynced — visual nutzt baseDelay 0.6s +
      // teamStepMs 1.0s pro Team (siehe ConnectionsRevealView teamRevealDelay).
      // Vorher: Sound 200ms+600ms-Stagger → 400ms zu frueh + zu schnell.
      const teamCount = s.teams.length;
      const cascadeTotal = teamCount + 1;
      const baseMs = 600;
      const stepMs = 1000;
      for (let i = 0; i < teamCount; i++) {
        window.setTimeout(() => {
          try { playAvatarCascadeNote(i, cascadeTotal); } catch {}
        }, baseMs + i * stepMs);
      }
      // Final-Fanfare nach allen Team-Reveals (matched ans Visual-Tempo).
      window.setTimeout(() => {
        try { playFanfare(); } catch {}
      }, baseMs + teamCount * stepMs + 400);
    } else if (prev === 'reveal' && cur === 'placement') {
      try { playFieldPlaced(); } catch {}
    } else if (cur === 'done') {
      // 2026-05-06 (Wolf 'stacking sound nach finale auf grid unterschiedlich
      // beim allerletzten Team'): playClimaxFinish feuerte synchron mit dem
      // letzten lastPlacedCell-Tick (= playFieldPlaced + Avatar-Cascade-Ton)
      // → drei Sounds uebereinander, klang fuer das letzte Team 'anders'.
      // Jetzt 700ms Delay: place+cascade landen sauber, dann erst der Climax-
      // Stinger als eigener Moment.
      window.setTimeout(() => { try { playClimaxFinish(); } catch {} }, 700);
    }
  }, [s.connections?.phase, s.phase, s.teams.length, s.sfxMuted]);

  // ── Bunte-Tüte-Sub-Mechanik-Sounds: HotPotato / OnlyConnect / Bluff ────────
  // Diese Mechaniken hatten bisher kein Audio — Beamer war stumm während die
  // Action lief. Tracking via Refs damit jeder State-Sprung genau 1× klingt.
  const prevHpEliminatedRef = useRef(0);
  const prevHpActiveTeamRef = useRef<string | null>(null);
  const prevOcGuessCountRef = useRef(0);
  const prevBluffPhaseRef = useRef<string | null>(null);
  const prevBluffSubmitCountRef = useRef(0);
  const prevBluffVoteCountRef = useRef(0);
  const prevSubMechQidRef = useRef<string | null>(null);
  useEffect(() => {
    const qid = s.currentQuestion?.id ?? null;
    // Frage-Wechsel: alle Baselines reset, kein Sound.
    if (qid !== prevSubMechQidRef.current) {
      prevSubMechQidRef.current = qid;
      prevHpEliminatedRef.current = (s.hotPotatoEliminated ?? []).length;
      prevHpActiveTeamRef.current = s.hotPotatoActiveTeamId ?? null;
      prevOcGuessCountRef.current = (s.onlyConnectGuesses ?? []).length;
      prevBluffPhaseRef.current = s.bluffPhase ?? null;
      prevBluffSubmitCountRef.current = Object.values(s.bluffSubmissions ?? {}).filter(t => t?.trim()).length;
      prevBluffVoteCountRef.current = Object.keys(s.bluffVotes ?? {}).length;
      return;
    }
    if (s.sfxMuted) {
      // Werte trotzdem nachziehen, damit nach Unmute kein Riesensprung kommt.
      prevHpEliminatedRef.current = (s.hotPotatoEliminated ?? []).length;
      prevHpActiveTeamRef.current = s.hotPotatoActiveTeamId ?? null;
      prevOcGuessCountRef.current = (s.onlyConnectGuesses ?? []).length;
      prevBluffPhaseRef.current = s.bluffPhase ?? null;
      prevBluffSubmitCountRef.current = Object.values(s.bluffSubmissions ?? {}).filter(t => t?.trim()).length;
      prevBluffVoteCountRef.current = Object.keys(s.bluffVotes ?? {}).length;
      return;
    }

    // HotPotato: neues Team eliminiert → playWrong.
    const hpElim = (s.hotPotatoEliminated ?? []).length;
    const hpElimGrew = hpElim > prevHpEliminatedRef.current;
    if (hpElimGrew) {
      try { playWrong(); } catch {}
    }
    prevHpEliminatedRef.current = hpElim;
    // HotPotato: aktives Team wechselt → playTick (Zug weitergegeben).
    // 2026-05-13 (Wolf 'bei hot potato spielt er mehrere sounds random ab'):
    // playTick NUR wenn der Active-Wechsel NICHT durch ein gleichzeitiges
    // Eliminate verursacht wurde. Beim Eliminate-Event sendet Backend hpElim++
    // UND hpActive=nextTeam im selben State-Update — Frontend sah beide
    // Changes im selben useEffect-Frame und spielte playWrong + playTick
    // zusammen. Doppel-Cue klang chaotisch. Jetzt: bei Eliminate nur playWrong,
    // bei "sauberem" Turn-Switch (korrekte Antwort, kein Eliminate) playTick.
    const hpActive = s.hotPotatoActiveTeamId ?? null;
    if (hpActive && hpActive !== prevHpActiveTeamRef.current && prevHpActiveTeamRef.current != null && !hpElimGrew) {
      try { playTick(); } catch {}
    }
    prevHpActiveTeamRef.current = hpActive;

    // OnlyConnect: neuer Tipp eingegangen → richtig=playCorrect, falsch=playWrong.
    const ocGuesses = s.onlyConnectGuesses ?? [];
    if (ocGuesses.length > prevOcGuessCountRef.current) {
      const newGuess = ocGuesses[ocGuesses.length - 1];
      if (newGuess?.correct) { try { playCorrect(); } catch {} }
      else { try { playWrong(); } catch {} }
    }
    prevOcGuessCountRef.current = ocGuesses.length;

    // Bluff: Phase-Übergänge.
    const bp = s.bluffPhase ?? null;
    if (bp !== prevBluffPhaseRef.current) {
      if (bp === 'review' || bp === 'vote') { try { playFieldPlaced(); } catch {} }
      else if (bp === 'reveal') { try { playFanfare(); } catch {} }
    }
    prevBluffPhaseRef.current = bp;
    // Bluff: jeder neue Submit/Vote = leiser Plopp.
    const bSubmits = Object.values(s.bluffSubmissions ?? {}).filter(t => t?.trim()).length;
    if (bSubmits > prevBluffSubmitCountRef.current) {
      try { playTick(); } catch {}
    }
    prevBluffSubmitCountRef.current = bSubmits;
    const bVotes = Object.keys(s.bluffVotes ?? {}).length;
    if (bVotes > prevBluffVoteCountRef.current) {
      try { playTick(); } catch {}
    }
    prevBluffVoteCountRef.current = bVotes;
  }, [
    s.hotPotatoEliminated, s.hotPotatoActiveTeamId,
    s.onlyConnectGuesses,
    s.bluffPhase, s.bluffSubmissions, s.bluffVotes,
    s.sfxMuted, s.currentQuestion?.id,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Finale (CONNECTIONS_4X4) Sounds ─────────────────────────────────────────
  // (User-Wunsch 2026-04-28: 'während Finale keine Musik und keine Sounds').
  // Music siehe oben (lobby-loop in CONNECTIONS_4X4 phase). SFX tracken hier
  // das Connections-State für Group-Found / Phase-Wechsel.
  const prevConnPhaseRef = useRef<string | null>(null);
  const prevConnFoundCountsRef = useRef<Record<string, number>>({});
  useEffect(() => {
    const c = s.connections;
    if (!c) {
      prevConnPhaseRef.current = null;
      prevConnFoundCountsRef.current = {};
      return;
    }
    if (s.sfxMuted) {
      prevConnPhaseRef.current = c.phase;
      Object.keys(c.teamProgress).forEach(id => {
        prevConnFoundCountsRef.current[id] = c.teamProgress[id]?.foundGroupIds.length ?? 0;
      });
      return;
    }
    // Phase-Wechsel
    if (c.phase !== prevConnPhaseRef.current) {
      if (c.phase === 'active' && prevConnPhaseRef.current === 'intro') {
        try { playQuestionStart(); } catch {}
      } else if (c.phase === 'reveal') {
        try { playFanfare(); } catch {}
      } else if (c.phase === 'placement' && prevConnPhaseRef.current === 'reveal') {
        // 2026-04-30 v3 round 7 (Phase-Sound-Audit): Placement-Eintritt im
        // Finale war stumm. Grid erscheint → playGridReveal als
        // 'jetzt geht's los'-Cue.
        try { playGridReveal(); } catch {}
      }
      prevConnPhaseRef.current = c.phase;
    }
    // Pro neu gefundener Gruppe pro Team einen playCorrect-Klick
    Object.entries(c.teamProgress).forEach(([id, tp]) => {
      const now = tp?.foundGroupIds.length ?? 0;
      const before = prevConnFoundCountsRef.current[id] ?? 0;
      if (now > before) {
        try { playCorrect(); } catch {}
      }
      prevConnFoundCountsRef.current[id] = now;
    });
  }, [s.connections, s.sfxMuted]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Comeback H/L Sounds — bisher komplett stumm ─────────────────────────────
  // - phase 'question' (start) → playQuestionStart
  // - phase 'reveal'           → playReveal (Drama-Moment)
  // - jede neue Antwort         → tick
  const prevHlPhaseRef = useRef<string | null>(null);
  const prevHlAnsweredCountRef = useRef(0);
  const prevHlRoundRef = useRef<number>(-1);
  useEffect(() => {
    const hl = s.comebackHL;
    if (!hl) {
      prevHlPhaseRef.current = null;
      prevHlAnsweredCountRef.current = 0;
      prevHlRoundRef.current = -1;
      return;
    }
    if (s.sfxMuted) {
      prevHlPhaseRef.current = hl.phase;
      prevHlAnsweredCountRef.current = (hl.answeredThisRound ?? []).length;
      prevHlRoundRef.current = hl.round;
      return;
    }
    // Neue Runde → reset answered-count baseline
    if (hl.round !== prevHlRoundRef.current) {
      prevHlAnsweredCountRef.current = 0;
      prevHlRoundRef.current = hl.round;
    }
    // Phase-Wechsel
    if (hl.phase !== prevHlPhaseRef.current) {
      if (hl.phase === 'question') {
        try { playQuestionStart(); } catch {}
      } else if (hl.phase === 'reveal') {
        try { playReveal(); } catch {}
        // Kurz danach: Fanfare wenn jemand richtig lag
        if ((hl.correctThisRound ?? []).length > 0) {
          window.setTimeout(() => { try { playCorrect(); } catch {} }, 600);
        } else {
          window.setTimeout(() => { try { playWrong(); } catch {} }, 600);
        }
      } else if (hl.phase === 'steal') {
        try { playFieldPlaced(); } catch {}
      }
      prevHlPhaseRef.current = hl.phase;
    }
    // Answers-Tick: jeder neue Submit klick'.
    const ansN = (hl.answeredThisRound ?? []).length;
    if (ansN > prevHlAnsweredCountRef.current) {
      try { playTick(); } catch {}
    }
    prevHlAnsweredCountRef.current = ansN;
  }, [s.comebackHL, s.sfxMuted]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Music: play question musicUrl ──
  // 2026-05-07 (Wolf-Konzept): musicMode pro Frage waehlbar
  //   'auto'           = active + reveal (default, altes Verhalten)
  //   'duringActive'   = nur waehrend Frage, stoppt beim Reveal
  //   'revealOnly'     = erst beim Reveal (Climax-Variante, z.B. ESC-Sieger-Song)
  //   'audioQuestion'  = wie duringActive (visueller Hint kommt separat)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const url = s.currentQuestion?.musicUrl;
    const mode = s.currentQuestion?.musicMode ?? 'auto';
    if (!url) {
      if (audioRef.current) { fadeOutAudio(audioRef.current, 600); audioRef.current = null; }
      return;
    }
    // Welche Phasen sollen Sound abspielen?
    const allowActive = mode === 'auto' || mode === 'duringActive' || mode === 'audioQuestion';
    const allowReveal = mode === 'auto' || mode === 'revealOnly';
    const inActive = s.phase === 'QUESTION_ACTIVE' && allowActive;
    const inReveal = s.phase === 'QUESTION_REVEAL' && allowReveal;
    const inPaused = s.phase === 'PAUSED'; // Pause friert immer ein, nur Duck
    if (!inActive && !inReveal && !inPaused) {
      if (audioRef.current) { fadeOutAudio(audioRef.current, 600); audioRef.current = null; }
      return;
    }
    const effVol = s.musicMuted ? 0 : Math.min(1, s.volume * 0.5 * duckFactor);
    if (audioRef.current?.src?.endsWith(url)) {
      audioRef.current.volume = effVol;
      return;
    }
    if (audioRef.current) fadeOutAudio(audioRef.current, 400);
    const a = new Audio(url);
    a.loop = true;
    a.volume = effVol;
    a.play().catch(() => {});
    audioRef.current = a;
    return () => { fadeOutAudio(a, 500); };
  }, [s.currentQuestion?.musicUrl, s.currentQuestion?.musicMode, s.phase, s.musicMuted, s.volume, duckFactor]);

  // (Vollbild-Button wird zentral vom QQBeamerPage-Parent gerendert (FullscreenNudge),
  //  hier kein zweiter Button mehr — vermeidet Stacking-/Klick-Konflikte oben rechts.)

  // Resolve slide template type for current phase
  const templateType = resolveTemplateType(s);
  // These phases always use built-in views — custom templates not supported
  const builtinOnly = s.phase === 'LOBBY' || s.phase === 'RULES' || s.phase === 'TEAMS_REVEAL' || s.phase === 'PLACEMENT' || s.phase === 'THANKS';
  // Sub-Mechaniken mit dedizierten Beamer-Views NIE durch Custom-Templates
  // überschreiben — weder per-Frage (`q-${q.id}`) noch per-Kategorie. Welle 5
  // hat nur den Category-Pfad gegated, der per-Frage-Pfad überschrieb die
  // dedizierte View aber weiterhin → leerer BG mit Fireflies. User-Bug
  // 4 gewinnt durch 6 Welle-Iterationen unbehoben — Plan-Agent fand die
  // Lücke 2026-04-28.
  const subKindForGate = s.currentQuestion?.bunteTuete?.kind;
  const hasDedicatedView = s.currentQuestion?.category === 'BUNTE_TUETE' && (
    subKindForGate === 'onlyConnect' || subKindForGate === 'bluff' ||
    subKindForGate === 'hotPotato' || subKindForGate === 'top5' ||
    subKindForGate === 'order' || subKindForGate === 'map' ||
    subKindForGate === 'oneOfEight'
  );
  const allowCustomTemplate = !builtinOnly && !hasDedicatedView;
  // Per-question override takes priority over category template
  const perQKey = allowCustomTemplate && s.currentQuestion ? `q-${s.currentQuestion.id}` : null;
  const rawPerQ = perQKey ? slideTemplates[perQKey] : undefined;
  const rawCategoryTemplate = allowCustomTemplate && templateType ? slideTemplates[templateType] : undefined;
  const rawActiveTemplate = rawPerQ?.elements?.length ? rawPerQ : rawCategoryTemplate;
  // Only use custom template if it has actual elements to render
  const activeTemplate = rawActiveTemplate?.elements?.length ? rawActiveTemplate : undefined;

  // I2 Team-Farbwelt Accent: wenn ein Team gerade aktiv ist (pendingFor oder
  // correctTeamId), subtil team-farbigen radial-Accent in den Hintergrund.
  const accentTeamId = s.pendingFor ?? s.correctTeamId ?? null;
  const accentTeam = accentTeamId ? s.teams.find(t => t.id === accentTeamId) : null;
  const teamTintColor = accentTeam?.color ?? null;

  return (
    <div style={{
      height: '100cqh', width: '100cqw',
      // 2026-06-23 (Skin): aktiver Skin lackiert den Phase-Root — Seiten-BG,
      // Font und Primaertext ziehen alle Child-Views mit (auch die, die keinen
      // eigenen BG malen). Cozy bleibt 1:1 (Kategorie-BG/Template-BG/fontFam).
      background: isThemed() ? 'var(--qq-bg)' : (activeTemplate ? (activeTemplate.background || bg) : bg),
      fontFamily: isThemed() ? 'var(--qq-font)' : fontFam,
      color: isThemed() ? 'var(--qq-text)' : textCol, display: 'flex', flexDirection: 'column',
      // 2026-05-12 (Glow-Audit): overflow 'hidden' → 'visible'. Body-Scroll
      // ist bereits durch SlideStage outer (overflow:clip + 120px clipMargin)
      // UND html/body in main.css (overflow:hidden) doppelt verhindert. Dieser
      // Phase-Root hatte `overflow:hidden` als historische Sicherung — die war
      // aber der GROSSE Glow-Killer: jeder Card-Glow (Question-Card, Options,
      // Active-Pill) wurde am Phase-Rand abgeschnitten. Visible heisst Glows
      // bluten frei bis zum SlideStage-Clip (120px Toleranz-Ring).
      overflow: 'visible', position: 'relative',
      // Kein Wrapper-Padding — der eingebaute Sicherheitsrand zeichnete
      // sich optisch sichtbar ab. Inneres Padding handhaben die Views selber.
      transition: 'background 0.8s ease',
    }}>
      {/* CSS keyframes */}
      <style>{BEAMER_CSS}</style>

      {/* I2 Team-Farbwelt-Accent: radial-gradient in Team-Farbe,
          nur sichtbar wenn Team aktiv. Sehr subtil (~8% alpha), damit
          es nicht mit Kategorie-BG kollidiert. */}
      {teamTintColor && (
        <div aria-hidden style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
          background: `radial-gradient(ellipse at 50% 50%, ${teamTintColor}14 0%, transparent 55%)`,
          transition: 'opacity 0.7s ease',
        }} />
      )}

      {/* Grain overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9990,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        opacity: 0.04, mixBlendMode: 'overlay',
      }} />

      {activeTemplate ? (
        /* Custom template: render only Fireflies + CustomSlide (no overlayOnly — ph_* positions apply) */
        <>
          <Fireflies />
          <div style={{ position: 'absolute', inset: 0 }}>
            <CustomSlide template={activeTemplate} state={s} />
          </div>
          {/* Placement flash overlay for custom template mode */}
          {placementFlash && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
              <PlacementView key={`flash-${s.questionIndex}`} state={placementFlash.state} flashCell={placementFlash.cell} use3D={use3D} enable3DTransition={s.enable3DTransition} />
            </div>
          )}
        </>
      ) : (() => {
        /* No template: built-in views, wrapped in transition container.
           2026-05-08 (Wolf 'übergänge gefallen mir nicht'): Duration 420 →
           720ms, Easing bounce → ease-out-expo (fließend statt springig),
           qqSlideIn-Keyframe selber cinematischer (echter Y-Slide statt
           subtle blur). Plus zusätzlicher subtiler Pink-Sweep parallel über
           den ganzen Beamer in den ersten 600ms — gibt dem Phase-Wechsel
           einen Brand-konsistenten „Whoosh"-Moment ohne Bewegung der Card.
           2026-05-08 (Wolf-Wunsch 'nice Übergänge wo passend'): Question→
           Question-Wechsel (= phaseGroup `Q-id1` → `Q-id2`) bekommt einen
           horizontalen Slide-In statt des vertikalen qqSlideIn. Klare visuelle
           „Nächste Frage kommt von rechts"-Sprache statt subtiler Mount-Pop. */
        const isQuestionToQuestion =
          phaseGroup.startsWith('Q-') &&
          prevGroupRef.current.startsWith('Q-') &&
          phaseGroup !== prevGroupRef.current;
        const wrapperAnim = isQuestionToQuestion
          ? 'qqStageSlideInRight 0.55s cubic-bezier(0.34, 1.30, 0.64, 1) both'
          : 'qqSlideIn 720ms cubic-bezier(0.16, 1, 0.3, 1) both';
        // 2026-05-12 (Wolf 'Option A — Fixed Canvas Stage'): wenn ?stage=1
        // gesetzt, wird der Phase-Render-Bereich in einem 1920×1080 Canvas
        // gerendert und per transform:scale auf die echte Viewport-Groesse
        // skaliert. Standardmaessig AUS — bestehender Code-Pfad unveraendert.
        const useStage = isStageEnabled();
        const phaseRender = (
        <div
          key={phaseGroup}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
            animation: wrapperAnim,
            willChange: 'transform, opacity',
            position: 'relative',
          }}
        >
          {/* Pink-Sweep — Diagonale Lichtkante die einmalig beim Phase-Mount
              über den Wrapper streicht. Pointer-events:none, animiert
              background-position (GPU-cheap). 2026-05-08. */}
          <div aria-hidden style={{
            position: 'absolute', inset: 0, zIndex: 0,
            pointerEvents: 'none',
            background: 'linear-gradient(115deg, transparent 38%, rgba(236,72,153,0.10) 50%, transparent 62%)',
            backgroundSize: '220% 100%',
            backgroundPosition: '-120% 0',
            animation: 'qqPhaseSweep 1.0s cubic-bezier(0.5, 0, 0.5, 1) 0.05s both',
            mixBlendMode: 'screen',
            opacity: 0.85,
          }} />
          {/* Während Countdown: renderState ist Snapshot der vorherigen Phase
              (PausedView / RulesView bleiben sichtbar und gefreezed). Nach
              Countdown schwenkt automatisch zum Live-State.
              2026-05-09 (Wolf 'standings sitzen vor der grid card, sollen
              eigenständige seite sein nicht im vordergrund'): Final-Recap
              (zwischen Final-Fragen) ist jetzt eigene Vollbild-Seite ANSTELLE
              der Question/Placement-View — kein Overlay mehr. */}
          {renderState.finalWagerEnabled
           && renderState.gamePhaseIndex === renderState.totalPhases
           && renderState.finalRecapStep === 1
           && renderState.phase !== 'FINAL_BETTING'
           && renderState.phase !== 'FINAL_REVEAL'
           && renderState.phase !== 'GAME_OVER'
           && renderState.phase !== 'THANKS'
           && renderState.phase !== 'PAUSED'
           && renderState.phase !== 'LOBBY' ? (
            <FinalRoundRecapSlide state={renderState} />
          ) : (
            <>
              {renderState.phase === 'LOBBY' && !renderState.setupDone && <PausedView state={renderState} mode="preGame" />}
              {renderState.phase === 'LOBBY' && renderState.setupDone  && <LobbyView state={renderState} />}
              {renderState.phase === 'RULES'           && <RulesView state={renderState} />}
              {renderState.phase === 'TEAMS_REVEAL'    && <TeamsRevealView state={renderState} />}
              {renderState.phase === 'PHASE_INTRO'     && <PhaseIntroView state={renderState} />}
              {(renderState.phase === 'QUESTION_ACTIVE' || renderState.phase === 'QUESTION_REVEAL') && !placementFlash && (
                <QuestionView key={renderState.currentQuestion?.id} state={renderState} revealed={renderState.phase !== 'QUESTION_ACTIVE'} hideCutouts={false} />
              )}
              {renderState.phase === 'PLACEMENT'       && <PlacementView key={`place-${renderState.questionIndex}`} state={renderState} use3D={use3D} enable3DTransition={renderState.enable3DTransition} />}
              {placementFlash && (
                <PlacementView key={`flash-${s.questionIndex}`} state={placementFlash.state} flashCell={placementFlash.cell} use3D={use3D} enable3DTransition={s.enable3DTransition} />
              )}
              {renderState.phase === 'COMEBACK_CHOICE' && <ComebackView state={renderState} />}
              {renderState.phase === 'CONNECTIONS_4X4' && <ConnectionsBeamerView state={renderState} />}
              {renderState.phase === 'FINAL_BETTING'   && <FinalBettingView state={renderState} />}
              {renderState.phase === 'FINAL_REVEAL'    && <FinalRevealView state={renderState} />}
              {renderState.phase === 'COZY_GAME'       && renderState.cozyGame && (
                <CozyGameView
                  round={renderState.cozyGame}
                  width={typeof window !== 'undefined' ? window.innerWidth : 1920}
                  height={typeof window !== 'undefined' ? window.innerHeight : 1080}
                  teams={renderState.teams}
                  language={renderState.language}
                />
              )}
              {renderState.phase === 'PAUSED'          && <PausedView state={renderState} />}
              {renderState.phase === 'GAME_OVER'       && <GameOverView state={renderState} roomCode={roomCode} />}
              {renderState.phase === 'THANKS'          && <ThanksView state={renderState} roomCode={roomCode} />}
            </>
          )}
        </div>
        );
        // 2026-05-12 (Wolf 'Option A Fixed Canvas'): wenn Flag aktiv,
        // wrap'd den Phase-Render in SlideStage (1920×1080 transform:scale).
        return useStage ? <SlideStage>{phaseRender}</SlideStage> : phaseRender;
      })()}

      {/* 2026-05-07: TwelvePoints-Sticker entfernt (Wolf-Feedback 'wirkt
          random eingesetzt, raus'). Plus dieser Aufruf hatte useLangFlip()
          inline als Prop in einem conditional-Branch, was React-Hook-Order
          zerlegte (error #310, jede Sekunde) wenn eurovisionMode zwischen
          Renders wechselt. */}

      {/* Willkommens-Overlay (rulesSlideIndex === -2). Crossfade raus beim
          Übergang zum Regel-Intro. 2026-05-11: zurückgebracht nach Wolf-
          Klarstellung — vorher fälschlich unter „L1 Welcome doppelt"
          entfernt. */}
      <QuizIntroOverlay language={s.language} visible={welcomeActive} eurovisionMode={s.theme?.eurovisionMode} logoUrl={s.theme?.logoUrl} welcomeVideoUrl={s.theme?.welcomeVideoUrl} />
      {/* Regel-Intro-Overlay (rulesSlideIndex === -1). Crossfade zwischen
          Willkommen und erster Regel-Folie. */}
      <RulesIntroOverlay language={s.language} visible={rulesIntroActive} eurovisionMode={s.theme?.eurovisionMode} />

      {/* C3 Timer-Urgency-Vignette: pulsierender roter Screen-Rand bei <=5s,
          zusaetzlich zum bestehenden Timer-Pill-Shake. */}
      {timerUrgent && (
        <div aria-hidden style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9990,
          animation: 'timerVignettePulse 0.8s ease-in-out infinite',
        }} />
      )}

      {/* G1/H1/H2 Toast-Overlays entfernt (User-Feedback): wirkten nebenbei,
          Phase-Wechsel ist ohnehin visuell klar. Perfect-Round-Info bleibt
          via roundCorrectsRef gespeichert — kann spaeter in PhaseIntro
          oder Summary als Badge eingebaut werden wenn gewuenscht. */}

      {/* Get-Ready-Countdown — 3-2-1 Vor Quiz-Start oder nach Pause-Resume.
          User-Wunsch 2026-04-28: Spielern kurz Zeit geben Handys zu greifen
          / Aufmerksamkeit zu sammeln statt direkt in die nächste Frage zu
          springen. CSS-only countdown via 3 Spans + Timing — kein JS-Tick
          nötig, das Overlay verschwindet komplett nach 3.2s. */}
      {getReady && (
        <div
          key={getReady.id}
          aria-hidden
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 18,
            background: 'radial-gradient(ellipse at center, rgba(13,10,6,0.92) 0%, rgba(13,10,6,0.78) 60%, rgba(13,10,6,0.55) 100%)',
            backdropFilter: 'blur(14px) saturate(1.1)',
            WebkitBackdropFilter: 'blur(14px) saturate(1.1)',
            pointerEvents: 'none',
            animation: 'qqGetReadyOverlay 3.2s ease both',
          }}
        >
          <div style={{
            fontFamily: fontFam,
            fontSize: 'clamp(18px, 1.8cqw, 26px)', fontWeight: 900,
            color: QQ_COLORS.brandPink, letterSpacing: '0.32em', textTransform: 'uppercase',
            textShadow: '0 0 18px rgba(236,72,153,0.6)',
            animation: 'qqGetReadyEyebrow 0.6s ease 0.1s both',
            display: 'inline-flex', alignItems: 'center', gap: 12, justifyContent: 'center',
          }}>
            {/* 2026-05-09 v4 (Wolf-Brand): generisches 🐺 → Custom-Wolf-Asset */}
            <WolfHeadIcon size={32} />
            {getReady.reason === 'start'
              ? (s.language === 'en' ? 'Get ready' : 'Macht euch bereit')
              : (s.language === 'en' ? 'Back in' : 'Weiter geht\'s in')}
          </div>
          <div style={{
            position: 'relative',
            width: 'clamp(180px, 22cqw, 320px)',
            height: 'clamp(180px, 22cqw, 320px)',
          }}>
            {[3, 2, 1].map((n, i) => (
              <div key={n} style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: fontFam,
                fontSize: 'clamp(140px, 18cqw, 240px)', fontWeight: 900, lineHeight: 1,
                color: '#FCE7F3',
                textShadow:
                  '0 0 24px rgba(236,72,153,0.8), ' +
                  '0 0 60px rgba(236,72,153,0.5), ' +
                  '0 0 120px rgba(236,72,153,0.3), ' +
                  '0 6px 0 rgba(0,0,0,0.5), ' +
                  '0 18px 32px rgba(0,0,0,0.6)',
                // 2026-05-13 (Wolf 'back in countdown nach pause ueberlappt sich'):
                // Stagger 0.45 → 0.95s. Vorher: Zahl 2 fadet bei 0.73s voll ein
                // waehrend Zahl 3 erst bei 0.82s rauszufaden begann → 90ms
                // Overlap mit beiden Ziffern voll sichtbar uebereinander.
                // Jetzt: 1 Sekunde pro Zahl (3 ... 2 ... 1, psychoakustisch
                // korrekt). Letzte Zahl bei 2.0-3.0s, Overlay fadet bei 3.2s.
                animation: `qqGetReadyCount 1s var(--qq-ease-bounce) ${0.1 + i * 0.95}s both`,
                opacity: 0,
              }}>
                {n}
              </div>
            ))}
          </div>
          <div style={{
            fontFamily: fontFam,
            fontSize: 'clamp(20px, 2.2cqw, 32px)', fontWeight: 900,
            color: QQ_COLORS.slate300, letterSpacing: '0.04em',
            animation: 'qqGetReadyEyebrow 0.6s ease 0.3s both',
          }}>
            {getReady.reason === 'start'
              ? (s.language === 'en' ? 'First round starts!' : 'Runde 1 startet!')
              : (s.language === 'en' ? 'We\'re back!' : 'Es geht weiter!')}
          </div>
        </div>
      )}

      {/* Soft-Zoom transition overlay — sanfter Blur/Scale-Puls zwischen Slides.
          2026-05-07 (Wolf 'art blitz der ueber cozy quiz zieht sieht nicht
          gut aus'): in LOBBY-Phase ueberspringen — Lobby ist statische
          Welcome-Seite, kein Action-Moment. Flash wirkt da uebertrieben. */}
      {flashKey > 0 && s.phase !== 'LOBBY' && (
        <div
          key={flashKey}
          style={{
            position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9995,
            overflow: 'hidden',
          }}
        >
          {/* Dezenter Dim als Tiefen-Anker */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.06) 65%, transparent 100%)',
            animation: 'qqFlashDim 520ms ease-out both',
          }} />
          {/* Soft-Zoom: heller Blur-Schleier pulst kurz auf */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.08) 45%, transparent 75%)',
            animation: 'qqSoftZoom 520ms var(--qq-ease-smooth) both',
            transformOrigin: 'center center',
          }} />
        </div>
      )}
    </div>
  );
}

// ─── Template type resolver ────────────────────────────────────────────────────
function resolveTemplateType(s: QQStateUpdate): import('../../../shared/quarterQuizTypes').QQSlideTemplateType | null {
  switch (s.phase) {
    case 'LOBBY':           return 'LOBBY';
    case 'PHASE_INTRO': {
      const idx = s.gamePhaseIndex as number;
      if (idx === 1) return 'PHASE_INTRO_1';
      if (idx === 2) return 'PHASE_INTRO_2';
      return 'PHASE_INTRO_3';
    }
    case 'QUESTION_ACTIVE':
    case 'QUESTION_REVEAL': {
      const cat = s.currentQuestion?.category;
      if (cat === 'SCHAETZCHEN')   return 'QUESTION_SCHAETZCHEN';
      if (cat === 'MUCHO')         return 'QUESTION_MUCHO';
      if (cat === 'BUNTE_TUETE') {
        // Sub-Mechaniken mit eigenen dedizierten Beamer-Views (OnlyConnect,
        // Bluff, HotPotato, Top5, Order, Map, Imposter) NICHT durch Custom-
        // Template überschreiben — sonst rendert nur ein leerer BG mit
        // Fireflies (Template kennt keine ph_-Slots für diese Layouts).
        const kind = s.currentQuestion?.bunteTuete?.kind;
        const hasDedicatedView = kind === 'onlyConnect' || kind === 'bluff'
          || kind === 'hotPotato' || kind === 'top5' || kind === 'order'
          || kind === 'map' || kind === 'oneOfEight';
        return hasDedicatedView ? null : 'QUESTION_BUNTE_TUETE';
      }
      if (cat === 'ZEHN_VON_ZEHN') return 'QUESTION_ZEHN';
      if (cat === 'CHEESE')        return 'QUESTION_CHEESE';
      return null;
    }
    case 'PLACEMENT':       return 'PLACEMENT';
    case 'COMEBACK_CHOICE': return 'COMEBACK_CHOICE';
    case 'GAME_OVER':       return 'GAME_OVER';
    default:                return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOT POTATO SLOT-MACHINE — Intro vor dem ersten Zug.
//
// 2026-05-06 (Wolf-Wunsch 'Slot-Machine vor erstem HP-Zug, smooth ~3s'):
// Backend bestimmt das Start-Team random + setzt hotPotatoSlotState='rolling'.
// Diese Komponente zeigt eine horizontale Avatar-Reihe aller Teams; ein
// Highlight-Cursor "rollt" mit abnehmender Geschwindigkeit durch die Liste
// und landet smooth auf hotPotatoActiveTeamId. Tick-Sound pro Cursor-Schritt,
// Stapel-Stamp + Wolf-Howl beim Land.
//
// Mod druckt 2. Space → qq:hotPotatoFinishSlot → Backend kippt auf 'finished',
// startet den Turn-Timer. Diese View wird unmounted, normaler HP-View kommt.
// ═══════════════════════════════════════════════════════════════════════════════
export function HotPotatoSlotMachine({ teams, chosenTeamId, lang }: {
  teams: any[]; chosenTeamId: string; lang: 'de' | 'en';
}) {
  const targetIdx = useMemo(
    () => Math.max(0, teams.findIndex(t => t.id === chosenTeamId)),
    [teams, chosenTeamId]
  );
  const [cursor, setCursor] = useState(0);
  const [landed, setLanded] = useState(false);
  const n = teams.length;

  useEffect(() => {
    if (n === 0) return;
    setLanded(false);
    // ~14-18 Schritte gesamt, last step = targetIdx; Delays mit ease-in
    // (langsam langsamer): 55ms → ~435ms. Total ~3.0s.
    const totalSteps = Math.max(14, n * 2 + 4);
    const delays: number[] = [];
    for (let i = 0; i < totalSteps; i++) {
      const t = i / Math.max(1, totalSteps - 1);
      const eased = Math.pow(t, 2.4);
      delays.push(55 + eased * 380);
    }
    const indices: number[] = [];
    for (let i = 0; i < totalSteps; i++) {
      const stepsRemaining = totalSteps - 1 - i;
      const idx = ((targetIdx - stepsRemaining) % n + n) % n;
      indices.push(idx);
    }
    let acc = 0;
    const handles: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < totalSteps; i++) {
      acc += delays[i];
      const isLast = i === totalSteps - 1;
      const idx = indices[i];
      handles.push(setTimeout(() => {
        setCursor(idx);
        if (isLast) {
          setLanded(true);
          try { playStapelStamp(); } catch {}
          try { playWolfHowl(); } catch {}
        } else {
          try { playTick(); } catch {}
        }
      }, acc));
    }
    return () => { handles.forEach(clearTimeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosenTeamId, n]);

  if (n === 0) return null;
  const chosen = teams[targetIdx];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 'clamp(20px, 3cqh, 36px)',
      width: '100%',
      maxWidth: 'min(96cqw, 1700px)',
      pointerEvents: 'none',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 18,
        padding: '10px 28px', borderRadius: 999,
        background: 'linear-gradient(135deg, rgba(236,72,153,0.22), rgba(217,119,6,0.10))',
        border: '2px solid rgba(236,72,153,0.55)',
        boxShadow: '0 0 36px rgba(236,72,153,0.35)',
        animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) both',
      }}>
        <span style={{ fontSize: 'clamp(28px, 3cqw, 44px)' }}>
          <QQEmojiIcon emoji="🥔"/>
        </span>
        <span style={{
          fontSize: 'clamp(22px, 2.4cqw, 34px)', fontWeight: 900,
          color: QQ_COLORS.yellow300, letterSpacing: 0.4, textTransform: 'uppercase',
        }}>
          {lang === 'en' ? 'Who starts?' : 'Wer fängt an?'}
        </span>
      </div>

      {/* 2026-05-06 (Wolf 'reihen dynamisch anpassen, bei 8 Teams 2x4 statt
          7x1'): CSS-Grid mit dynamischer Spalten-Anzahl statt flex-wrap.
          Pro Anzahl Teams die optimale Aufteilung:
          ≤4 → 1 Reihe, 5-6 → 1 Reihe, 7-8 → 2x4, sonst 2 Reihen. */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${
          teams.length <= 4 ? teams.length
          : teams.length <= 6 ? teams.length
          : teams.length <= 8 ? 4
          : Math.ceil(teams.length / 2)
        }, minmax(0, 1fr))`,
        justifyItems: 'center',
        gap: 'clamp(14px, 1.6cqw, 26px)',
        padding: 'clamp(20px, 2.5cqh, 32px) clamp(24px, 2.5cqw, 40px)',
        borderRadius: 28,
        background: 'linear-gradient(180deg, rgba(15,23,42,0.55), rgba(15,23,42,0.30))',
        border: '2px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        {teams.map((t, i) => {
          const active = i === cursor;
          const isWinner = landed && i === targetIdx;
          const dim = landed && i !== targetIdx;
          return (
            <div key={t.id} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: 'clamp(8px, 1cqh, 14px) clamp(10px, 1.1cqw, 18px)',
              borderRadius: 20,
              background: active
                ? `linear-gradient(135deg, ${t.color}55, ${t.color}22)`
                : 'transparent',
              border: active
                ? `2.5px solid ${t.color}`
                : '2.5px solid transparent',
              boxShadow: isWinner
                ? `0 0 50px ${t.color}cc, 0 0 18px ${t.color}, inset 0 0 0 2px ${t.color}`
                : active
                  ? `0 0 28px ${t.color}88`
                  : 'none',
              transform: isWinner
                ? 'scale(1.18)'
                : active ? 'scale(1.08)' : 'scale(1)',
              opacity: dim ? 0.32 : 1,
              filter: dim ? 'grayscale(0.4)' : 'none',
              transition: 'transform 0.18s var(--qq-ease-pop-fast), opacity 0.45s ease, filter 0.45s ease, box-shadow 0.25s ease',
            }}>
              <QQTeamAvatar
                avatarId={t.avatarId}
                teamEmoji={t.emoji}
                size={'clamp(56px, 6.5cqw, 92px)'}
              />
              <span title={t.name} style={{
                fontSize: 'clamp(13px, 1.3cqw, 18px)',
                fontWeight: 800,
                color: active || isWinner ? t.color : QQ_COLORS.slate300,
                maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {truncName(t.name, 14)}
              </span>
            </div>
          );
        })}
      </div>

      {/* 2026-05-06 (Wolf 'card unter slot-machine verschiebt die card darüber,
          baue es so um dass die card beim erscheinen nicht verschoben wird'):
          Slot reserviert seinen Platz IMMER (auch beim Rolling). Card-Inhalt
          fadet via opacity ein, kein Layout-Shift mehr. */}
      <div style={{
        minHeight: 'clamp(64px, 7cqh, 92px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {chosen && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '12px 28px', borderRadius: 999,
            background: `linear-gradient(135deg, ${chosen.color}44, ${chosen.color}1a)`,
            border: `2.5px solid ${chosen.color}`,
            boxShadow: landed ? `0 0 48px ${chosen.color}88` : 'none',
            opacity: landed ? 1 : 0,
            transform: landed ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.85)',
            transition: 'opacity 0.55s var(--qq-ease-bounce), transform 0.55s var(--qq-ease-bounce), box-shadow 0.55s ease',
            animation: landed ? 'hpSlotWinnerIn 0.55s var(--qq-ease-bounce) both' : undefined,
          }}>
            <QQTeamAvatar avatarId={chosen.avatarId} teamEmoji={chosen.emoji} size={48} />
            <span style={{
              fontSize: 'clamp(22px, 2.5cqw, 34px)', fontWeight: 900,
              color: chosen.color,
            }}>
              {truncName(chosen.name, 22)} {lang === 'en' ? 'starts!' : 'fängt an!'}
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes hpSlotWinnerIn {
          0%   { transform: translateY(14px) scale(0.85); opacity: 0; }
          60%  { transform: translateY(-3px) scale(1.06); opacity: 1; }
          100% { transform: translateY(0)    scale(1);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOT POTATO SEMICIRCLE — 5-Slot horizontaler Halbkreis (Wolf 2026-05-09)
// ACTIVE mittig vorne, slot ±1 rechts/links leicht zurück, slot ±2 weiter zurück.
// Bei Active-Wechsel rotieren alle Slots — Kartoffel fliegt mit Bogen rüber.
// ═══════════════════════════════════════════════════════════════════════════════
export function HotPotatoSemicircle({ state: s, lang, activeTeam, remaining, urgent }: {
  state: any; lang: 'de' | 'en';
  activeTeam: any | undefined;
  remaining: number | null;
  urgent: boolean;
}) {
  // 2026-05-12 (Wolf-Bug 'links nächstes / rechts gerade-dran stimmt nicht'):
  // Backend broadcastet jetzt hotPotatoOrder (score-sortierte Rotations-Order).
  // Frontend liest die direkt — kein Fallback auf Name-Sort mehr noetig, da
  // dieser Fallback in der Praxis IMMER alphabetisch endete und mit der
  // Backend-Rotation kollidierte. Legacy-Pfade fuer alte Rooms ohne Field bleiben.
  const eliminated: string[] = s.hotPotatoEliminated ?? [];
  const order: string[] = (s.hotPotatoOrder && s.hotPotatoOrder.length > 0)
    ? s.hotPotatoOrder
    : (s as any)._hotPotatoOrder && (s as any)._hotPotatoOrder.length > 0
      ? (s as any)._hotPotatoOrder
      : (s.joinOrder && s.joinOrder.length > 0)
        ? s.joinOrder
        : [...s.teams]
            .sort((a: any, b: any) => {
              const lA = a.largestConnected ?? 0; const lB = b.largestConnected ?? 0;
              if (lB !== lA) return lB - lA;
              const cA = a.totalCells ?? 0; const cB = b.totalCells ?? 0;
              if (cB !== cA) return cB - cA;
              return (a.name ?? '').localeCompare(b.name ?? '');
            })
            .map((t: any) => t.id);
  // Alive-Teams in der Halbkreis-Reihenfolge (eliminierte raus)
  const aliveIds = order.filter((id: string) => !eliminated.includes(id));

  // 2026-05-09 (Wolf): bei Active-Wechsel kurz die Throw-Animation triggern
  // statt continuous Spin. 850ms (= Slot-Transition-Dauer) Wurf-Bogen +
  // 1080° Spin, dann zurück zum Standard-Spin-Loop.
  const prevActiveRef = useRef<string | null>(null);
  const [isThrowing, setIsThrowing] = useState(false);
  useEffect(() => {
    const cur = activeTeam?.id ?? null;
    if (cur && prevActiveRef.current && prevActiveRef.current !== cur) {
      setIsThrowing(true);
      const t = window.setTimeout(() => setIsThrowing(false), 850);
      prevActiveRef.current = cur;
      return () => window.clearTimeout(t);
    }
    prevActiveRef.current = cur;
  }, [activeTeam?.id]);
  // 2026-05-11 (Wolf-Bug 'nachrutschen ist random, animation nicht smooth'):
  // Vorher modulo-wrap-Logik → Teams sprangen von Slot +2 zu Slot -2 wenn
  // Active-Index die aliveIds umlaufen lief. Erzeugte unvorhersehbares
  // 'random'-Gefühl + Snap-statt-Slide bei jedem Wrap. Jetzt LINEAR: Slots
  // sind absolute Positionen ggü. activeIdx. Teams ausserhalb ±2 sind komplett
  // ausgeblendet (unmounted), neue Teams mounten beim Eintreten in den Slot-
  // Bereich → React kümmert sich um saubere Animationen, da gleiche teamId
  // = gleicher DIV-Key = Transform-Transition slidet smooth.
  // Snap-Detection bleibt als Fallback für seltene Active-Wrap-Around-Fälle
  // (active=last → active=0 nach voller Runde).
  const prevSlotsRef = useRef<Map<string, number>>(new Map());
  if (!activeTeam) {
    return (
      <div style={{
        flex: '0 0 auto',
        padding: '8px 18px', borderRadius: 999,
        background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.25)',
        color: QQ_COLORS.slate400, fontSize: 15, fontWeight: 700,
      }}>
        <QQEmojiIcon emoji="🥔"/> {lang === 'en' ? 'Waiting for start…' : 'Bereit für Start…'}
      </div>
    );
  }
  const activeIdx = aliveIds.indexOf(activeTeam.id);
  if (activeIdx < 0 || aliveIds.length === 0) return null;

  // 2026-05-11 v2: nur ±1 sichtbar, zirkulär.
  // 2026-05-12 (Wolf 'L→R nachrutschen, links = naechstes, rechts = vorher'):
  // Mapping invertiert. Slot +1 (next) → LEFT (negative xSign).
  // Slot -1 (prev) → RIGHT (positive xSign). Teams rutschen also L→R durchs
  // Bild: neues Team rein von links, altes Team raus nach rechts.
  // Bei N=2: nur Slot 0 + Slot +1 (next, links). Bei N=1 nur active.
  const N = aliveIds.length;
  type SlotEntry = { teamId: string; slot: number };
  const slotEntries: SlotEntry[] = [
    { teamId: aliveIds[activeIdx], slot: 0 },
  ];
  if (N >= 2) {
    const nextIdx = (activeIdx + 1) % N;
    slotEntries.push({ teamId: aliveIds[nextIdx], slot: 1 });
  }
  if (N >= 3) {
    const prevIdx = (activeIdx - 1 + N) % N;
    slotEntries.push({ teamId: aliveIds[prevIdx], slot: -1 });
  }

  // 2026-05-09 v3 (Wrap-Anti-Fly-Across): nach jedem Render prevSlots updaten.
  // Bei nächstem Render kennen wir den vorherigen Slot pro Team — damit kann
  // wrapped-Detection den transition:none-Pfad nehmen.
  useEffect(() => {
    const next = new Map<string, number>();
    for (const e of slotEntries) next.set(e.teamId, e.slot);
    prevSlotsRef.current = next;
  });

  // Slot-Konfiguration (X-Offset, Y-Offset für Halbkreis-Bogen, Scale, Z-Index, Opacity)
  // ACTIVE = vorne unten (Slot 0). Slot ±1 stehen leicht zurückgesetzt im Bogen.
  // 2026-05-11 v2 (Wolf): nur noch ±1, also gibt's keine ±2-Config mehr. Side-
  // Slots etwas weiter raus (320 statt 300) damit sie nicht mit der Active-Card
  // kollidieren — wir haben jetzt mehr horizontalen Platz.
  const slotConfig = (slot: number) => {
    const abs = Math.abs(slot);
    if (abs === 0) return { x: 0,   y: 0,   scale: 1,    z: 5, opacity: 1    };
    return                  { x: 320, y: -70, scale: 0.85, z: 3, opacity: 0.55 };
  };

  return (
    <div style={{
      flex: '0 0 auto',
      position: 'relative',
      // 2026-05-11 (Wolf-Bug 'Antworten hängen in Team-Cards'): Container-Höhe
      // von 22cqh auf 30cqh erhöht.
      // 2026-05-12 (Wolf-Screenshot 'chips ueberlappen mit active-card'):
      // 30cqh → 24cqh reduziert.
      // 2026-05-12 v3 (Wolf-Bug 'chips uberlappen IMMER NOCH bei kleinem
      // screen'): min von 210 → 260px erhöht. Die Active-Card mit Avatar
      // (clamp 72-120px) + Name + Timer-Pill braucht ~230-250px PLUS 48px
      // Glow-Spillover oben. Wenn Container nur 210px hoch ist, ragt der
      // Glow-Halo in den Chips-Bereich → optischer Overlap. 260px puffert
      // den Glow + Card-Border-Shadow sauber.
      width: '100%', height: 'clamp(260px, 24cqh, 290px)',
      pointerEvents: 'none',
    }}>
      {/* Backdrop-Glow hinter dem Active-Team — Spotlight-Effekt */}
      <div aria-hidden style={{
        position: 'absolute',
        left: '50%', bottom: 0,
        transform: 'translateX(-50%)',
        width: 'clamp(220px, 26cqw, 380px)',
        height: 'clamp(220px, 26cqw, 380px)',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${activeTeam.color}33 0%, transparent 65%)`,
        filter: 'blur(12px)',
        zIndex: 0,
      }} />

      {/* Slot-Container — alle Avatare relativ zum Container-Center positioniert */}
      <div style={{
        position: 'absolute',
        left: '50%', bottom: 0,
        width: 0, height: 0,
        zIndex: 2,
      }}>
        {slotEntries.map(({ teamId, slot }) => {
          const t = s.teams.find((x: any) => x.id === teamId);
          if (!t) return null;
          const cfg = slotConfig(slot);
          // 2026-05-12 (Wolf 'links = naechstes, rechts = war gerade'):
          // xSign invertiert ggue. Slot-Sign. Slot +1 (next) bekommt
          // xSign -1 (links), Slot -1 (prev) bekommt xSign +1 (rechts).
          const xSign = slot > 0 ? -1 : slot < 0 ? 1 : 0;
          const isActive = slot === 0;
          // 2026-05-09 v3: Wrap-Detection — wenn Team-Slot um >1 sprang
          // (modulo-wrap zwischen extremen Slots) → kein transform-transition,
          // sondern Snap. Verhindert das "fly-across-the-stage" bei kleinen
          // Lobbys.
          const prevSlot = prevSlotsRef.current.get(teamId);
          const wrapped = prevSlot !== undefined && Math.abs(slot - prevSlot) > 1;
          return (
            <div
              key={teamId}
              style={{
                position: 'absolute',
                left: 0, bottom: 0,
                transform: `translate(calc(${xSign * cfg.x}px - 50%), ${cfg.y}px) scale(${cfg.scale})`,
                transformOrigin: 'center bottom',
                zIndex: cfg.z,
                opacity: cfg.opacity,
                transition: wrapped
                  ? 'opacity 0.6s ease'
                  : 'transform 0.85s cubic-bezier(0.34, 1.25, 0.64, 1), opacity 0.6s ease',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: isActive ? 10 : 6,
              }}
            >
              {isActive ? (
                // ACTIVE — Card mit Avatar, Name, Timer + Kartoffel SEITLICH daneben
                <div style={{
                  position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 10,
                  padding: '14px 24px 18px',
                  borderRadius: 22,
                  background: `linear-gradient(180deg, ${t.color}33, ${t.color}11)`,
                  border: `2.5px solid ${t.color}`,
                  boxShadow: `0 0 48px ${t.color}66, 0 12px 28px rgba(0,0,0,0.5)`,
                  minWidth: 280,
                }}>
                  {/* 2026-05-09 v3 (Wolf 'kartoffel darf antworten nicht
                      verdecken — nicht über card, nicht über timer, sondern
                      NEBEN die card'): Kartoffel rechts ausserhalb der
                      Active-Card platziert, vertikal mittig zur Card.
                      Avatar/Name/Timer bleiben innerhalb der Card sichtbar. */}
                  <span aria-hidden style={{
                    position: 'absolute',
                    right: 'clamp(-110px, -8cqw, -70px)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 'clamp(70px, 7.5cqw, 110px)',
                    lineHeight: 1, pointerEvents: 'none',
                    filter: 'drop-shadow(0 6px 12px rgba(239,68,68,0.7)) drop-shadow(0 0 26px rgba(245,158,11,0.65))',
                    animation: isThrowing
                      ? 'qqHpPotatoThrow 0.85s cubic-bezier(0.4, 1.2, 0.6, 1) both'
                      : 'qqHpPotatoSpin 1.4s ease-in-out infinite',
                    zIndex: 6,
                  }}>🥔</span>
                  <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={'clamp(72px, 8cqw, 120px)'} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, lineHeight: 1.05 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
                      textTransform: 'uppercase', color: QQ_COLORS.slate400,
                    }}>
                      <QQEmojiIcon emoji="🥔"/> {lang === 'en' ? 'Hot Potato' : 'Heiße Kartoffel'}
                    </span>
                    <span title={t.name} style={{
                      fontSize: 'clamp(22px, 2.6cqw, 34px)', fontWeight: 900, color: t.color,
                      maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {truncName(t.name, 22)}
                    </span>
                  </div>
                  {remaining !== null && (
                    <div style={{
                      padding: '6px 18px', borderRadius: 999,
                      background: urgent ? 'rgba(239,68,68,0.25)' : 'rgba(15,23,42,0.5)',
                      border: `2px solid ${urgent ? QQ_COLORS.red500 : QQ_COLORS.slate600}`,
                      color: urgent ? QQ_COLORS.red300 : QQ_COLORS.slate200,
                      fontSize: 'clamp(20px, 2.4cqw, 30px)', fontWeight: 900,
                      minWidth: 76, textAlign: 'center',
                      animation: urgent ? 'qqHpTimerGlow 0.6s ease infinite alternate' : 'none',
                    }}>
                      ⏱ {remaining}s
                    </div>
                  )}
                </div>
              ) : (
                // SIDE-SLOT (±1 / ±2) — 2026-05-09 v3 (Wolf 'text unter
                // avataren unlesbar, nimm den raus, links/rechts reichen
                // avatare'): nur noch Avatar, kein Teamname, kein 'gespielt'/
                // 'gleich dran'-Label. Wirkt visuell ruhiger.
                <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={'clamp(54px, 6cqw, 90px)'} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOT POTATO BEAMER VIEW — active team, per-turn timer, used answers
// ═══════════════════════════════════════════════════════════════════════════════

export function HotPotatoBeamerView({ state: s, lang, revealed }: {
  state: any; lang: 'de' | 'en'; revealed: boolean;
}) {
  // Live countdown for per-turn timer
  const [remaining, setRemaining] = useState<number | null>(() =>
    s.hotPotatoTurnEndsAt ? Math.max(0, Math.ceil((s.hotPotatoTurnEndsAt - Date.now()) / 1000)) : null
  );
  useEffect(() => {
    if (!s.hotPotatoTurnEndsAt) { setRemaining(null); return; }
    const tick = () => setRemaining(Math.max(0, Math.ceil((s.hotPotatoTurnEndsAt! - Date.now()) / 1000)));
    tick();
    const iv = setInterval(tick, 200);
    return () => clearInterval(iv);
  }, [s.hotPotatoTurnEndsAt]);

  // C1 Track new eliminations — dramatisches Ausscheide-Moment (Shake-Red +
  // Kartoffel-Drop + fade-to-grey). Ein Team gleichzeitig ist normal, bei
  // Last-Team-Wins koennen am Ende auch 2+ fast simultan eliminiert werden.
  const prevElimRef = useRef<string[]>([]);
  const [justEliminated, setJustEliminated] = useState<Set<string>>(new Set());
  useEffect(() => {
    const cur: string[] = s.hotPotatoEliminated ?? [];
    const prev = prevElimRef.current;
    const newOnes = cur.filter(id => !prev.includes(id));
    prevElimRef.current = cur;
    if (newOnes.length > 0) {
      setJustEliminated(new Set(newOnes));
      setTimeout(() => setJustEliminated(new Set()), 1400);
    }
  }, [s.hotPotatoEliminated]);

  const activeTeam = s.teams.find((t: any) => t.id === s.hotPotatoActiveTeamId);
  const urgent = remaining !== null && remaining <= 5;
  const used: string[] = s.hotPotatoUsedAnswers ?? [];

  if (revealed) return null;

  // 2026-05-09 (Wolf-Wunsch 'Slot-Machine raus, Reihenfolge nach Scoreboard'):
  // Slot-Machine entfällt — Backend bestimmt erstes Team deterministisch
  // (bestes Score zuerst). Bei state 'landed' (Mod hat noch Announce-Zeit vor
  // Timer-Start) zeigen wir bereits die normale HP-View mit Active-Pill +
  // Bouncing-Kartoffel. Bei state 'rolling' (legacy/edge-case) ebenfalls
  // direkt zur normalen View. Slot-Machine-Component bleibt als Dead-Code,
  // aber der Branch fällt weg.

  // 2026-05-05 (Wolf-Bug 'Chips zu klein'): Card wird jetzt aktiv hochgeschoben
  // bei vielen Antworten → mehr Vertikal-Raum unten → Tier-Schwellen koennen
  // weiter nach oben rutschen (lg statt md, md statt sm). xl bleibt fuer ≤8.
  const n = used.length;
  // 2026-05-12 v2 (Wolf-Screenshot 'chips ueberlappen mit active-card bei
  // kleinem screen'): Tier-Schwellen NOCHMAL aggressiver gesenkt. Bei 11 Chips
  // (Screenshot-Fall) war Tier 'lg' (≤16) → 2 Reihen, kollidierte unten mit
  // der Active-Card-Glow. Jetzt: ≤4 xl, ≤10 lg, ≤20 md, sonst sm — bei 11
  // Chips greift 'md' (kleiner, mehr passen in 2 Reihen). Schafft mehr
  // vertikalen Headroom zur Semicircle-Card.
  const tier: 'xl' | 'lg' | 'md' | 'sm' = n <= 4 ? 'xl' : n <= 10 ? 'lg' : n <= 20 ? 'md' : 'sm';
  const chipStyles = {
    xl: { fontSize: 'clamp(24px, 2.6cqw, 38px)', padding: 'clamp(10px, 1.2cqh, 16px) clamp(18px, 1.8cqw, 30px)', gap: 12, border: 2.5, shadowAlpha: 0.22 },
    lg: { fontSize: 'clamp(20px, 2.2cqw, 32px)', padding: 'clamp(8px, 1cqh, 14px) clamp(16px, 1.6cqw, 26px)', gap: 10, border: 2, shadowAlpha: 0.18 },
    md: { fontSize: 'clamp(17px, 1.85cqw, 26px)', padding: 'clamp(7px, 0.9cqh, 12px) clamp(14px, 1.5cqw, 22px)', gap: 9, border: 2, shadowAlpha: 0.15 },
    sm: { fontSize: 'clamp(14px, 1.5cqw, 21px)', padding: 'clamp(6px, 0.7cqh, 10px) clamp(12px, 1.3cqw, 18px)', gap: 7, border: 1.5, shadowAlpha: 0.13 },
  }[tier];

  return (
    <div style={{
      // 2026-05-06 (Wolf 'Active-Team-Card und Eliminated-Teams sollen am
      // Footer fix bleiben, nicht dynamisch mit hochrutschen wenn viele
      // Antworten kommen'):
      // - Chips-Block: flex:1, alignItems:flex-end (wachsen von unten nach oben)
      // - Active-Pill + Eliminated-Reihe: flex:0 0 auto am Footer
      // - Container nutzt full-height des Parent-Slots
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      pointerEvents: 'none',
      width: '100%', height: '100%',
      maxWidth: 'min(94cqw, 1500px)',
      // 2026-05-11 (Wolf-Bug 'Antworten hängen in Team-Cards'): Gap zwischen
      // Chips-Block und Semicircle größer. War 14px, jetzt clamp(20,3cqh,40).
      // Schafft visuelle Trennung damit Chips nicht direkt an die Active-Card
      // anstoßen, plus puffert gegen 1-2px Layout-Rundungsfehler.
      gap: 'clamp(20px, 3cqh, 40px)',
    }}>
      {/* Used answers list — top-aligned damit unten garantiert Platz fuer
          Trivia-Trio-Semicircle + Out-Liste bleibt.
          2026-05-07 (Wolf 'genannte Antworten landen direkt ueber dem Footer,
          duerfen aber mittig spawnen'): justify-content flex-end → center.
          2026-05-10 (Wolf-Live-Test L5 'Antworten überlappen mit Team-Card'):
          justify-content center → flex-start. Bei vielen Antworten wuchs der
          zentrierte Chips-Block in beide Richtungen — kollidierte unten mit
          dem Trivia-Trio-Avatar. Jetzt: Chips wachsen nach unten begrenzt
          durch overflow:hidden, oben sitzen sie unter der Frage-Card.
          2026-05-11 (Wolf 'Antworten hängen IMMER NOCH in Team-Cards' — der
          Bug war Container-Höhe von Semicircle zu klein, ist jetzt oben in
          HotPotatoSemicircle gefixt auf 30cqh. Extra paddingBottom hier als
          zweite Sicherung: Chips können maximal X px über der Block-Unterkante
          enden, darunter ist Safe-Zone für die Active-Card-Border + Spotlight). */}
      <div style={{
        // 2026-05-12 (Wolf 'hot potato: bei mehr antworten rutschen
        // disqualifizierte unten aus der slide'): flex-basis von auto → 0
        // damit der Chips-Block AGGRESSIV shrinkt bevor die eliminated-row
        // unten aus dem Slide gedrueckt wird. overflow:hidden cuttet die
        // hinteren Chip-Zeilen sauber statt sie auf folgende Sibling-Items
        // zu schieben.
        flex: '1 1 0',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
        alignItems: 'center',
        width: '100%',
        minHeight: 0,
        paddingTop: 8,
        paddingBottom: 'clamp(16px, 2cqh, 28px)',
        overflow: 'hidden',
      }}>
        {used.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: chipStyles.gap,
          maxWidth: 'min(94cqw, 1500px)',
        }}>
          {used.map((a, i) => (
            <div key={`${a}-${i}`} style={{
              padding: chipStyles.padding,
              borderRadius: 999,
              background: 'linear-gradient(135deg, rgba(34,197,94,0.22), rgba(22,163,74,0.10))',
              border: `${chipStyles.border}px solid rgba(34,197,94,0.55)`,
              boxShadow: `0 4px 14px rgba(34,197,94,${chipStyles.shadowAlpha})`,
              color: QQ_COLORS.green300, fontSize: chipStyles.fontSize, fontWeight: 900,
              letterSpacing: 0.2,
              animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) both',
            }}>
              {a}
            </div>
          ))}
        </div>
        )}
      </div>

      {/* 2026-05-09 (Wolf-Halbkreis-Vision): Active-Pill ersetzt durch
          horizontalen Halbkreis mit 5 Slots. ACTIVE mittig vorne, slot ±1
          rechts/links leicht zurückgesetzt, slot ±2 noch weiter zurück.
          Reihenfolge aus Score-Sortierung (_hotPotatoOrder): links das
          vorherige Team, rechts das nächste. Bei Active-Wechsel rotieren
          alle Slots — Kartoffel fliegt mit Bogen vom alten zum neuen Slot. */}
      <HotPotatoSemicircle
        state={s} lang={lang} activeTeam={activeTeam}
        remaining={remaining} urgent={urgent}
      />

      {/* Eliminated teams. Frisch eliminierte Teams:
          C1 Shake-Red + Kartoffel-Drop 🥔 + fade-to-grey. */}
      {s.hotPotatoEliminated && s.hotPotatoEliminated.length > 0 && (
        <div style={{
          flex: '0 0 auto',
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center',
          gap: 'clamp(10px, 1.4cqw, 18px)',
          fontSize: 'clamp(18px, 2cqw, 28px)', color: QQ_COLORS.slate400, fontWeight: 900,
        }}>
          <span style={{ fontSize: 'clamp(20px, 2.2cqw, 30px)' }}>
            <QQEmojiIcon emoji="❌"/> {lang === 'en' ? 'Out:' : 'Raus:'}
          </span>
          {s.hotPotatoEliminated.map((id: string) => {
            const t = s.teams.find((tm: any) => tm.id === id);
            if (!t) return null;
            const fresh = justEliminated.has(id);
            return (
              <span key={id} style={{
                color: t.color, opacity: fresh ? 1 : 0.75,
                display: 'inline-flex', alignItems: 'center', gap: 8,
                position: 'relative',
                animation: fresh ? 'hpEliminate 1.2s ease-out both' : undefined,
              }}>
                <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={'clamp(28px, 3cqw, 42px)'} />
                <span style={{ fontSize: 'clamp(16px, 1.8cqw, 24px)' }}>{t.name}</span>
                {fresh && (
                  <span aria-hidden style={{
                    position: 'absolute', top: -32, left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 36, lineHeight: 1, pointerEvents: 'none',
                    filter: 'drop-shadow(0 0 8px rgba(236,72,153,0.7))',
                    animation: 'hpPotatoDrop 1.3s cubic-bezier(0.4,1.4,0.6,1) both',
                    zIndex: 5,
                  }}><QQEmojiIcon emoji="🥔"/></span>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ConfettiOverlay + CONFETTI-Konstanten jetzt in
// '../components/CozyQuizConfettiOverlay' (siehe Import oben).


// ─────────────────────────────────────────────────────────────────────────────
// AnimatedCozyWolf — Multi-Mode-Wolf-Animation.
//
// Modi:
//   speaking — Original-Verhalten: Idle-Blink + Mund-Flap waehrend speaking=true.
//              4 Base-Posen (augen[auf|zu].mund[auf|zu]).
//   winken   — Idle Pre-Game-Mode: alterniert zwischen wachem Winken (augenauf+
//              mundauf+winken) und kurzem Augen-zu-Moment (augenzu+mundzu+
//              winken). ~700ms-Cycle, gelegentlich pausiert.
//   jubel    — Jubelnder Wolf: cycelt durch 3 Jubel-Posen (mund-zu, mund-auf-jubel,
//              eyes-zu+jubel). Wirkt wie 'YEAH!'.
//   trinken  — Pause-Mode-Wolf: ueberwiegend trinken-pose (augenauf+mundzu+
//              trinken), gelegentlicher Sip-Blink (augenzu+mundzu+trinken).
//   schlafen — Pause-Mode-Wolf-Variante: cycelt durch 3 Z-Stufen (1z→2z→3z),
//              ~900ms pro Stufe. Wirkt wie 'leise schnarchen'.
//
// 2026-05-06 (Wolf 'noch mehr Wolf-Varianten + erstmal nur fuer pause und
// lobby'): mode prop hinzugefuegt mit Default 'speaking' fuer Backwards-Compat.
// Alle relevanten PNGs einer Mode werden ueberlagert vorgeladen, opacity-Switch
// haelt das Flackern aus.
// ─────────────────────────────────────────────────────────────────────────────
type WolfMode = 'speaking' | 'winken' | 'jubel' | 'trinken' | 'schlafen' | 'ueberrascht' | 'daumen' | 'flagge' | 'troete';

export function AnimatedCozyWolf({ widthCss, speaking, mode, wink, mirror, troeteBoost }: {
  widthCss: string; speaking?: boolean; mode?: WolfMode; wink?: boolean; mirror?: boolean;
  /**
   * 2026-05-07 (Wolf 'troete in eurovision edition mehr einbauen'): wenn true,
   * feuert die Troete-Pose im jubel-Mode haeufiger (alle 2.5-4s statt 6-10s)
   * und bleibt laenger sichtbar (1800ms statt 1200ms). Nur sinnvoll im
   * jubel-Mode — andere Modi ignorieren das.
   */
  troeteBoost?: boolean;
}) {
  // Default-Mode: 'speaking' (alte API). Wenn mode gesetzt, ignoriert speaking-Prop
  // (Ausnahme: winken/jubel/daumen-Modes lesen speaking als externes Mund-Flap-Gate).
  const effectiveMode: WolfMode = mode ?? 'speaking';

  // 2026-05-06 v4 (Wolf 'kannst du den Mund so bewegen, als wuerde er das
  // wirklich sagen — gutes Timing'): speaking als externer Gate fuer winken.
  // Wenn der Parent `speaking` setzt, lippen-flap nur waehrend speaking=true,
  // synchron zur Sprechblase. Ref-Pattern, damit der einmal gestartete Tick-
  // Loop nicht bei jedem speaking-Toggle neu aufgesetzt werden muss (sonst
  // verlieren wir die Blink-Schedule).
  const speakingRef = useRef<boolean | undefined>(speaking);
  useEffect(() => { speakingRef.current = speaking; }, [speaking]);

  // 2026-05-07 (Wolf 'zwinkern wenn ein team reinkommt'): wink-Gate fuer
  // daumen-Mode. Wenn true, augen sind augenzwinkern statt augenauf.
  const winkRef = useRef<boolean | undefined>(wink);
  useEffect(() => { winkRef.current = wink; }, [wink]);

  // Aktuell sichtbares PNG (Filename ohne .png). State pro Mode.
  const [currentFile, setCurrentFile] = useState<string>('augenauf.mundzu');

  // ── speaking-Mode ──────────────────────────────────────────────────────
  const [eyesOpen, setEyesOpen] = useState(true);
  const [mouthOpen, setMouthOpen] = useState(false);

  useEffect(() => {
    if (effectiveMode !== 'speaking') return;
    let alive = true;
    let timer: number | undefined;
    const scheduleBlink = () => {
      timer = window.setTimeout(() => {
        if (!alive) return;
        setEyesOpen(false);
        timer = window.setTimeout(() => {
          if (!alive) return;
          setEyesOpen(true);
          scheduleBlink();
        }, 130);
      }, 3000 + Math.random() * 2200);
    };
    scheduleBlink();
    return () => { alive = false; if (timer) window.clearTimeout(timer); };
  }, [effectiveMode]);

  useEffect(() => {
    if (effectiveMode !== 'speaking' || !speaking) { setMouthOpen(false); return; }
    let alive = true;
    let timer: number | undefined;
    let phase: 'speak' | 'pause' = 'speak';
    let phaseUntil = Date.now() + 2200 + Math.random() * 1200;
    const tick = () => {
      if (!alive) return;
      const now = Date.now();
      if (now >= phaseUntil) {
        if (phase === 'speak') {
          phase = 'pause';
          setMouthOpen(false);
          phaseUntil = now + 1100 + Math.random() * 900;
          timer = window.setTimeout(tick, phaseUntil - now);
          return;
        } else {
          phase = 'speak';
          phaseUntil = now + 2000 + Math.random() * 1500;
        }
      }
      if (phase === 'speak') {
        setMouthOpen(m => !m);
        timer = window.setTimeout(tick, 200 + Math.random() * 80);
      } else {
        timer = window.setTimeout(tick, 200);
      }
    };
    tick();
    return () => { alive = false; if (timer) window.clearTimeout(timer); };
  }, [effectiveMode, speaking]);

  // ── Mode-spezifischer Cycle (winken/jubel/trinken/schlafen) ────────────
  useEffect(() => {
    if (effectiveMode === 'speaking') return;
    let alive = true;
    let timer: number | undefined;

    if (effectiveMode === 'winken') {
      // 2026-05-06 v3 (Wolf 'jetzt gerade blinkt der Wolf'): konstanter
      // 200ms-Mund-Flap mit Snap-Cut sah aus als wuerde der ganze Wolf
      // flackern. Jetzt analog zur Speaking-Logic: Speak-Phase mit Mund-
      // Flap (2-3s), dann Pause-Phase mit Mund zu (1-2s). Der Wolf wirkt
      // dadurch ruhiger — winkt + 'sagt' was, dann Atempause.
      // Idle-Blink scheduled deterministisch alle 3.5-5.5s, NICHT random
      // pro tick (sonst Doppel-Trigger).
      // 2026-05-06 v4 (Wolf 'gutes Timing'): Wenn parent `speaking` als
      // Prop steckt, ueberschreibt das die interne Speak-Pause-Phase —
      // Mund-Flap synchron zur Sprechblase, Pause sobald Sprechblase fadet.
      let mouthOpenLocal = false;
      let phase: 'speak' | 'pause' = 'speak';
      let phaseUntil = Date.now() + 2200 + Math.random() * 1200;
      let nextBlinkAt = Date.now() + 3500 + Math.random() * 2000;
      let blinkUntil = 0;
      const tick = () => {
        if (!alive) return;
        const now = Date.now();
        // Blink hat Vorrang
        if (now < blinkUntil) {
          setCurrentFile('augenzu.mundzu.winken');
          timer = window.setTimeout(tick, blinkUntil - now);
          return;
        }
        // Blink-Trigger faellig?
        if (now >= nextBlinkAt) {
          blinkUntil = now + 130;
          nextBlinkAt = now + 130 + 3500 + Math.random() * 2000;
          setCurrentFile('augenzu.mundzu.winken');
          timer = window.setTimeout(tick, 130);
          return;
        }
        // External speaking-Gate (Parent-controlled) hat Vorrang vor interner
        // Speak-Pause-Phase, falls speakingRef definiert.
        const externalSpeak = speakingRef.current;
        const isSpeaking = externalSpeak !== undefined
          ? externalSpeak
          : (() => {
              if (now >= phaseUntil) {
                if (phase === 'speak') {
                  phase = 'pause';
                  phaseUntil = now + 1200 + Math.random() * 900;
                } else {
                  phase = 'speak';
                  phaseUntil = now + 2000 + Math.random() * 1500;
                }
              }
              return phase === 'speak';
            })();
        if (isSpeaking) {
          mouthOpenLocal = !mouthOpenLocal;
          setCurrentFile(mouthOpenLocal ? 'augenauf.mundauf.winken' : 'augenauf.mundzu.winken');
          timer = window.setTimeout(tick, 220 + Math.random() * 100);
        } else {
          // pause: mund bleibt zu
          mouthOpenLocal = false;
          setCurrentFile('augenauf.mundzu.winken');
          timer = window.setTimeout(tick, 250);
        }
      };
      tick();
    } else if (effectiveMode === 'jubel') {
      // 2026-05-06 v3 (Wolf neue 4. Pose augenzu.mundauf.jubel geliefert):
      // Jetzt 4 Jubel-Posen → Mund-Flap-Loop wie im Winken-Mode mit Speak-
      // Pause-Phasen + Idle-Blink. Wolf jubelt mit Howl, schliesst gelegent-
      // lich die Augen (joyful squint), atmet kurz durch.
      // 2026-05-06 v6 (Wolf 'wenn er den Mund bewegt, soll er was sagen'):
      // Externes speaking-Gate analog winken — Mund-Flap synchron zur
      // Sprechblase im GameOver.
      // 2026-05-06 v7 (Wolf neue Posen 'troete im mund' + 'augenzwinkern'):
      //  - Troete-Burst: alle ~6-10s 400ms 'augenauf.troete.jubel' = Party-
      //    Horn-Tooot-Moment, ueberschreibt allen anderen State.
      //  - Zwinker statt Blink (35% Chance, nur wenn Mund offen): zeigt
      //    'augenzwinker.mundauf.jubel' statt regulaerem augenzu-Blink.
      let mouthOpenLocal = false;
      let phase: 'speak' | 'pause' = 'speak';
      let phaseUntil = Date.now() + 1800 + Math.random() * 1000;
      let nextBlinkAt = Date.now() + 2500 + Math.random() * 1500;
      let blinkUntil = 0;
      let blinkIsZwinker = false;
      // 2026-05-07 v2 (Wolf 'troete in eurovision edition mehr einbauen'):
      // Mit troeteBoost-Prop feuert die Troete im 2.5-4s-Cycle (statt 6-10s)
      // und bleibt 1800ms (statt 1200ms). Erste Troete kommt nach ~1.5s damit
      // der Sieger-Wolf direkt mit Toot startet.
      const TROETE_DUR_MS = troeteBoost ? 1800 : 1200;
      const troeteCycleBaseMs = troeteBoost ? 2500 : 6000;
      const troeteCycleJitterMs = troeteBoost ? 1500 : 4000;
      let nextTroeteAt = Date.now() + (troeteBoost ? 1500 : 4000) + Math.random() * (troeteBoost ? 1000 : 4000);
      let troeteUntil = 0;
      const tick = () => {
        if (!alive) return;
        const now = Date.now();
        // Troete hat absoluten Vorrang
        if (now < troeteUntil) {
          setCurrentFile('augenauf.troete.jubel');
          timer = window.setTimeout(tick, troeteUntil - now);
          return;
        }
        if (now >= nextTroeteAt) {
          troeteUntil = now + TROETE_DUR_MS;
          nextTroeteAt = now + TROETE_DUR_MS + troeteCycleBaseMs + Math.random() * troeteCycleJitterMs;
          setCurrentFile('augenauf.troete.jubel');
          timer = window.setTimeout(tick, TROETE_DUR_MS);
          return;
        }
        if (now < blinkUntil) {
          setCurrentFile(blinkIsZwinker
            ? 'augenzwinker.mundauf.jubel'
            : (mouthOpenLocal ? 'augenzu.mundauf.jubel' : 'augenzu.mundzu.jubel'));
          timer = window.setTimeout(tick, blinkUntil - now);
          return;
        }
        if (now >= nextBlinkAt) {
          blinkUntil = now + 200;
          // Zwinker nur wenn Mund offen (Pose ist mundauf)
          blinkIsZwinker = mouthOpenLocal && Math.random() < 0.35;
          nextBlinkAt = now + 200 + 2500 + Math.random() * 1500;
          setCurrentFile(blinkIsZwinker
            ? 'augenzwinker.mundauf.jubel'
            : (mouthOpenLocal ? 'augenzu.mundauf.jubel' : 'augenzu.mundzu.jubel'));
          timer = window.setTimeout(tick, 200);
          return;
        }
        const externalSpeak = speakingRef.current;
        const isSpeaking = externalSpeak !== undefined
          ? externalSpeak
          : (() => {
              if (now >= phaseUntil) {
                if (phase === 'speak') {
                  phase = 'pause';
                  phaseUntil = now + 700 + Math.random() * 600;
                } else {
                  phase = 'speak';
                  phaseUntil = now + 1800 + Math.random() * 1000;
                }
              }
              return phase === 'speak';
            })();
        if (isSpeaking) {
          mouthOpenLocal = !mouthOpenLocal;
          setCurrentFile(mouthOpenLocal ? 'augenauf.mundauf.jubel' : 'augenauf.mundzu.jubel');
          timer = window.setTimeout(tick, 200 + Math.random() * 80);
        } else {
          mouthOpenLocal = false;
          setCurrentFile('augenauf.mundzu.jubel');
          timer = window.setTimeout(tick, 250);
        }
      };
      tick();
    } else if (effectiveMode === 'trinken') {
      // Mostly open-eye trinken, gelegentlicher Sip-Blink (eyes-zu)
      let idx = 0; // 0 = open, 1 = closed
      const tick = () => {
        if (!alive) return;
        if (idx === 0) {
          setCurrentFile('augenauf.mundzu.trinken');
          timer = window.setTimeout(() => { idx = 1; tick(); }, 2200 + Math.random() * 1500);
        } else {
          setCurrentFile('augenzu.mundzu.trinken');
          timer = window.setTimeout(() => { idx = 0; tick(); }, 280 + Math.random() * 220);
        }
      };
      tick();
    } else if (effectiveMode === 'schlafen') {
      // Z-Cycle: 1z → 2z → 3z → 1z (wie Z-Animation)
      const seq = ['augenzu.mundzu.schlafen1z', 'augenzu.mundzu.schlafen2z', 'augenzu.mundzu.schlafen3z'];
      let idx = 0;
      const tick = () => {
        if (!alive) return;
        setCurrentFile(seq[idx]);
        timer = window.setTimeout(() => {
          idx = (idx + 1) % seq.length;
          tick();
        }, 900);
      };
      tick();
    } else if (effectiveMode === 'ueberrascht') {
      // 'Oh!' — alterniert zwischen zwei Gestik-Phasen mit gelegentlichen
      // Blinks. Phase 'mund' = klassisches mundueberrascht (offener Schock-
      // Mund). Phase 'haende' = haendeueberrascht (Haende vor der Brust
      // verschraenkt, leicht gespannt-laechelnd). 2026-05-06 v8 (Wolf neue
      // Posen 'haende ueberrascht' geliefert): Dadurch kein statisches
      // 'Mund offen'-Frieren mehr, der Wolf 'reagiert' lebendiger.
      let phase: 'mund' | 'haende' = 'mund';
      let phaseUntil = Date.now() + 2200 + Math.random() * 1000;
      let nextBlinkAt = Date.now() + 2800 + Math.random() * 1500;
      let blinkUntil = 0;
      const tick = () => {
        if (!alive) return;
        const now = Date.now();
        const fileFor = (eyes: 'auf' | 'zu') => phase === 'mund'
          ? `augen${eyes}.mundueberrascht`
          : `augen${eyes}.haendeueberrascht`;
        if (now < blinkUntil) {
          setCurrentFile(fileFor('zu'));
          timer = window.setTimeout(tick, blinkUntil - now);
          return;
        }
        if (now >= nextBlinkAt) {
          blinkUntil = now + 200;
          nextBlinkAt = now + 200 + 2800 + Math.random() * 1500;
          setCurrentFile(fileFor('zu'));
          timer = window.setTimeout(tick, 200);
          return;
        }
        if (now >= phaseUntil) {
          phase = phase === 'mund' ? 'haende' : 'mund';
          phaseUntil = now + 2200 + Math.random() * 1000;
        }
        setCurrentFile(fileFor('auf'));
        timer = window.setTimeout(tick, 250);
      };
      tick();
    } else if (effectiveMode === 'daumen') {
      // 2026-05-07 (Wolf 'daumen Posen fuer QR-Code-Seite, zwinkern wenn ein
      // team reinkommt'): Daumen-hoch-Mode analog winken — Mund-Flap synchron
      // zur Sprechblase via speakingRef, regulaere Idle-Blinks. Wenn winkRef
      // true ist, wechselt der Wolf auf augenzwinker-Variante (1 Auge zu) →
      // 'Hallo!'-Reaktion auf Team-Joins. Idle-Blink wird waehrend wink-Phase
      // ausgesetzt (zwinker IST schon ein Halb-Blink).
      let mouthOpenLocal = false;
      let phase: 'speak' | 'pause' = 'speak';
      let phaseUntil = Date.now() + 2200 + Math.random() * 1200;
      let nextBlinkAt = Date.now() + 3500 + Math.random() * 2000;
      let blinkUntil = 0;
      const tick = () => {
        if (!alive) return;
        const now = Date.now();
        const winking = winkRef.current === true;
        const eyePrefix = winking ? 'augenzwinker' : 'augenauf';
        // Idle-Blink hat Vorrang — aber nur wenn NICHT zwinkern (sonst doppel)
        if (!winking && now < blinkUntil) {
          setCurrentFile('augenzu.mundzu.daumen');
          timer = window.setTimeout(tick, blinkUntil - now);
          return;
        }
        if (!winking && now >= nextBlinkAt) {
          blinkUntil = now + 130;
          nextBlinkAt = now + 130 + 3500 + Math.random() * 2000;
          setCurrentFile('augenzu.mundzu.daumen');
          timer = window.setTimeout(tick, 130);
          return;
        }
        // External speaking-Gate (Parent-controlled) hat Vorrang vor interner
        // Speak-Pause-Phase, falls speakingRef definiert.
        const externalSpeak = speakingRef.current;
        const isSpeaking = externalSpeak !== undefined
          ? externalSpeak
          : (() => {
              if (now >= phaseUntil) {
                if (phase === 'speak') {
                  phase = 'pause';
                  phaseUntil = now + 1200 + Math.random() * 900;
                } else {
                  phase = 'speak';
                  phaseUntil = now + 2000 + Math.random() * 1500;
                }
              }
              return phase === 'speak';
            })();
        if (isSpeaking) {
          mouthOpenLocal = !mouthOpenLocal;
          setCurrentFile(`${eyePrefix}.${mouthOpenLocal ? 'mundauf' : 'mundzu'}.daumen`);
          timer = window.setTimeout(tick, 220 + Math.random() * 100);
        } else {
          mouthOpenLocal = false;
          setCurrentFile(`${eyePrefix}.mundzu.daumen`);
          timer = window.setTimeout(tick, 250);
        }
      };
      tick();
    } else if (effectiveMode === 'troete') {
      // 2026-05-09 v8 (Wolf 'nur Tröte im Mund mit Augen auf und zu'):
      // Konstante Tröte-Pose, periodische Blinks. Da kein augenzu.troete-Asset
      // existiert, nutzt Blink-Frame augenzu.mundzu.jubel (130ms = quick blink,
      // Tröte fehlt nur kurz). Idle-Blink alle 2.5-4s.
      let nextBlinkAt = Date.now() + 2500 + Math.random() * 1500;
      let blinkUntil = 0;
      const tick = () => {
        if (!alive) return;
        const now = Date.now();
        if (now < blinkUntil) {
          setCurrentFile('augenzu.mundzu.jubel');
          timer = window.setTimeout(tick, blinkUntil - now);
          return;
        }
        if (now >= nextBlinkAt) {
          blinkUntil = now + 130;
          nextBlinkAt = now + 130 + 2500 + Math.random() * 1500;
          setCurrentFile('augenzu.mundzu.jubel');
          timer = window.setTimeout(tick, 130);
          return;
        }
        setCurrentFile('augenauf.troete.jubel');
        timer = window.setTimeout(tick, 250);
      };
      tick();
    } else if (effectiveMode === 'flagge') {
      // 2026-05-07 (Wolf-ESC): Eurovision-Variante des winken-Modes — Wolf
      // haelt eine EU-Flagge in der Hand statt zu winken. Logik 1:1 wie
      // winken: Speak/Pause-Phase mit Mund-Flap, Idle-Blink alle 3.5-5.5s.
      // Externes speaking-Gate respektiert (synchron zur Sprechblase).
      let mouthOpenLocal = false;
      let phase: 'speak' | 'pause' = 'speak';
      let phaseUntil = Date.now() + 2200 + Math.random() * 1200;
      let nextBlinkAt = Date.now() + 3500 + Math.random() * 2000;
      let blinkUntil = 0;
      const tick = () => {
        if (!alive) return;
        const now = Date.now();
        if (now < blinkUntil) {
          setCurrentFile('augenzu.mundzu.flagge');
          timer = window.setTimeout(tick, blinkUntil - now);
          return;
        }
        if (now >= nextBlinkAt) {
          blinkUntil = now + 130;
          nextBlinkAt = now + 130 + 3500 + Math.random() * 2000;
          setCurrentFile('augenzu.mundzu.flagge');
          timer = window.setTimeout(tick, 130);
          return;
        }
        const externalSpeak = speakingRef.current;
        const isSpeaking = externalSpeak !== undefined
          ? externalSpeak
          : (() => {
              if (now >= phaseUntil) {
                if (phase === 'speak') {
                  phase = 'pause';
                  phaseUntil = now + 1200 + Math.random() * 900;
                } else {
                  phase = 'speak';
                  phaseUntil = now + 2000 + Math.random() * 1500;
                }
              }
              return phase === 'speak';
            })();
        if (isSpeaking) {
          mouthOpenLocal = !mouthOpenLocal;
          setCurrentFile(mouthOpenLocal ? 'augenauf.mundauf.flagge' : 'augenauf.mundzu.flagge');
          timer = window.setTimeout(tick, 220 + Math.random() * 100);
        } else {
          mouthOpenLocal = false;
          setCurrentFile('augenauf.mundzu.flagge');
          timer = window.setTimeout(tick, 250);
        }
      };
      tick();
    }

    return () => { alive = false; if (timer) window.clearTimeout(timer); };
  }, [effectiveMode, troeteBoost]);

  // Welche Datei ist im speaking-Mode sichtbar
  const speakingFile = `augen${eyesOpen ? 'auf' : 'zu'}.mund${mouthOpen ? 'auf' : 'zu'}`;
  const visibleFile = effectiveMode === 'speaking' ? speakingFile : currentFile;

  // Alle moeglichen Posen (alle PNGs vorgeladen, opacity-toggle).
  // 2026-05-06 v2: augenauf.mundzu.winken (war NICHT in der Liste → Wolf
  // verschwand bei Mund-Flap-Animation), augenzu.mundauf.jubel,
  // augen[auf|zu].mundueberrascht ergaenzt.
  const allPoses: string[] = [
    'augenauf.mundauf', 'augenauf.mundzu',
    'augenzu.mundauf', 'augenzu.mundzu',
    'augenauf.mundauf.winken', 'augenauf.mundzu.winken', 'augenzu.mundzu.winken',
    'augenauf.mundauf.jubel', 'augenauf.mundzu.jubel',
    'augenzu.mundauf.jubel', 'augenzu.mundzu.jubel',
    'augenauf.troete.jubel', 'augenzwinker.mundauf.jubel',
    'augenauf.mundzu.trinken', 'augenzu.mundzu.trinken',
    'augenzu.mundzu.schlafen1z', 'augenzu.mundzu.schlafen2z', 'augenzu.mundzu.schlafen3z',
    'augenauf.mundueberrascht', 'augenzu.mundueberrascht',
    'augenauf.haendeueberrascht', 'augenzu.haendeueberrascht',
    'augenauf.mundauf.daumen', 'augenauf.mundzu.daumen',
    'augenzu.mundauf.daumen', 'augenzu.mundzu.daumen',
    'augenzwinker.mundauf.daumen', 'augenzwinker.mundzu.daumen',
    // 2026-05-07 (Wolf-ESC): Flagge-Posen
    'augenauf.mundauf.flagge', 'augenauf.mundzu.flagge',
    'augenzu.mundauf.flagge', 'augenzu.mundzu.flagge',
  ];

  // Pro Mode nur die relevanten Posen rendern (sparen 60-70% Memory)
  const posesForMode = effectiveMode === 'speaking'
    ? allPoses.slice(0, 4)
    : effectiveMode === 'winken'
      ? allPoses.filter(p => p.includes('winken'))
      : effectiveMode === 'jubel'
        ? allPoses.filter(p => p.includes('jubel'))
        : effectiveMode === 'trinken'
          ? allPoses.filter(p => p.includes('trinken'))
          : effectiveMode === 'schlafen'
            ? allPoses.filter(p => p.includes('schlafen'))
            : effectiveMode === 'daumen'
              ? allPoses.filter(p => p.includes('daumen'))
              : effectiveMode === 'flagge'
                ? allPoses.filter(p => p.includes('flagge'))
                : effectiveMode === 'troete'
                  ? ['augenauf.troete.jubel', 'augenzu.mundzu.jubel']
                  : allPoses.filter(p => p.includes('ueberrascht'));

  return (
    <div style={{
      position: 'relative',
      width: widthCss,
      aspectRatio: '1 / 1',
      transformOrigin: 'bottom center',
      // 2026-05-07 v3 (Wolf 'Wolf flackert immernoch'): mirror direkt am
      // Haupt-Wrapper statt extra-Wrapper drumherum — verhindert Stack-
      // Filter-Glitches beim Mund-Flap.
      transform: mirror ? 'scaleX(-1)' : undefined,
      animation: 'qqIntroWolfBreathe 4.2s ease-in-out infinite',
      // 2026-05-07 v4 (Wolf 'Hintergrund loest Flackern aus wenn Bilder
      // sich abwechseln'): Drop-Shadow-Filter (war yellow halo) hat bei
      // jedem Mund-Flap die Silhouette neu gerechnet → BG-Composite hat
      // dadurch repaintet → sichtbares Flicker durch BG-Animation
      // (Fireflies, Spotlight). Filter raus, Halo wird unten ueber ein
      // ::before-aehnliches absolutes Glow-Element gemacht (statisch,
      // unabhaengig von Bilder-Swap).
      // isolation: isolate erzwingt eigenen Stacking Context → BG hinter
      // dem Wrapper kann nicht mehr durch Image-Swap-Repaint stoeren.
      isolation: 'isolate',
    }}>
      {/* Statischer Halo-Glow hinter dem Wolf — ersetzt das ehemalige
          drop-shadow filter. Aendert sich NICHT mit Frame-Wechsel,
          deshalb kein Flicker mehr. */}
      <div aria-hidden style={{
        position: 'absolute',
        inset: '8% 8% -2% 8%',
        background: 'radial-gradient(ellipse at center 60%, rgba(236,72,153,0.35) 0%, rgba(236,72,153,0.15) 40%, transparent 70%)',
        filter: 'blur(18px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      {/* Pre-Cache: alle Posen mit opacity:0 + width/height 1px gerendert,
          damit Browser sie laedt + decodiert. Verhindert 1-Frame-Flicker
          beim ersten Anzeigen einer noch ungecacheten Pose. Nur einmal
          beim Mount. <picture> sorgt dafuer dass auch die AVIF-Variante
          (die der Browser tatsaechlich anzeigen wird) vor-decodiert wird,
          nicht nur die PNG-Fallback-Datei. */}
      {posesForMode.filter(p => p !== visibleFile).map(p => (
        <CozyWolfImage
          key={p}
          pose={p}
          alt=""
          aria-hidden
          loading="eager"
          decoding="sync"
          style={{
            position: 'absolute', width: 1, height: 1,
            opacity: 0, pointerEvents: 'none',
          }}
        />
      ))}
      {/* Sichtbarer Wolf — nur EIN <picture>-Element, pose wechselt mit visibleFile.
          2026-05-07 v5 (Wolf 'Wolf flackert immernoch — wirkt als kommen
          neue Bilder nicht schnell genug'): vorher 6 gestackte imgs mit
          opacity-Toggle — Browser hatte bei Compositing-Swap gelegentlich
          1-Frame-Luecke wo alle imgs als opacity:0 dargestellt wurden.
          Single-img + src-swap: Browser zeigt das alte Bild bis das neue
          im Cache geladen ist (ist es, weil alle Posen vor-gecached sind),
          dann sofortiger Atomic-Replace ohne Transparent-Frame.
          2026-05-08: <picture>-Wrapper fuer AVIF (-84 %) → WebP → PNG
          Fallback. Browser-Pick passiert atomar bei pose-Aenderung. */}
      <CozyWolfImage
        pose={visibleFile}
        alt=""
        loading="eager"
        decoding="sync"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'contain',
          display: 'block',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MuchoOptionsReveal — 2-Akt-Choreografie für MUCHO:
//   Akt 1 (moderator-gesteuert via revealStep): pro Klick poppen die Voter einer
//         nicht-leeren Option rein. Leere Options werden übersprungen — der
//         Backend-Handler „qq:muchoRevealStep" zählt nur Optionen mit ≥1 Voter.
//   Akt 2 (moderator-gesteuert, revealStep = nonEmpty+1): Doppelblink auf die
//         richtige Option → permanent grün + Speedrun-Highlight (⚡ Goldrand).
// ─────────────────────────────────────────────────────────────────────────────
export function MuchoOptionsReveal({
  options, optionsEn, correctOptionIndex, optionImages, answers, teams, lang,
  cardBg, timerEndsAt, timerDurationSec, revealStep,
}: {
  options: string[];
  optionsEn?: string[];
  correctOptionIndex?: number;
  optionImages?: Array<QQOptionImage | null | undefined>;
  answers: Array<{ teamId: string; text: string; submittedAt: number }>;
  teams: Array<{ id: string; name: string; avatarId: string; color?: string; emoji?: string }>;
  lang: 'de' | 'en';
  cardBg: string;
  timerEndsAt: number | null;
  timerDurationSec: number;
  revealStep: number;
}) {
  const N = options.length;
  // Nicht-leere Optionen in Reihenfolge (identisch zur Backend-Zählung).
  const nonEmptyOrdered = useMemo(() => {
    const res: number[] = [];
    for (let i = 0; i < N; i++) {
      if (answers.some(a => a.text === String(i))) res.push(i);
    }
    return res;
  }, [answers, N]);
  const akt1Max = nonEmptyOrdered.length;
  const lockStep = akt1Max + 1;
  const locked = revealStep >= lockStep && correctOptionIndex != null && N > 0;
  // Auto-Stagger ab 2026-04-26: Backend springt bei Klick 1 direkt auf akt1Max,
  // Frontend zaehlt intern hoch (auto-Reveal jeder Option im 750ms-Takt) damit
  // die Voter nacheinander einfliegen statt alle gleichzeitig.
  const [autoCap, setAutoCap] = useState(0);
  useEffect(() => {
    if (revealStep <= 0) {
      setAutoCap(0);
      return;
    }
    const target = Math.min(revealStep, akt1Max);
    if (autoCap >= target) return;
    const t = setTimeout(() => setAutoCap(prev => Math.min(prev + 1, target)), 750);
    return () => clearTimeout(t);
  }, [revealStep, autoCap, akt1Max]);
  const shownVoterSet = useMemo(() => {
    const cap = Math.min(autoCap, akt1Max);
    return new Set(nonEmptyOrdered.slice(0, cap));
  }, [autoCap, akt1Max, nonEmptyOrdered]);

  const showLock = locked;
  const akt3On = locked;
  const MUCHO_COLORS = [QQ_COLORS.blue500, QQ_COLORS.red500, QQ_COLORS.brandPink, QQ_COLORS.green500];
  // 2026-05-09 (Wolf): Negative-Squared-Latin-Emojis statt Plain-Text.
  // 2026-05-09 v2 (Wolf): zurück auf Plain Text — Emoji-Version 🅰🅱🅲🅳
  // wurde auf Mac/iPhone als blaue OS-Squares mit weißem Buchstaben gerendert,
  // hat den existing Square-Box-Look doppelt-eingerahmt. Plain-Text in der
  // farbigen Box ist cleaner.
  const muchoLabels = ['A', 'B', 'C', 'D'];

  // Waehrend QUESTION_ACTIVE (revealStep=0): kompaktes Layout, keine Luecken
  // zwischen A/B und C/D. Erst wenn Voter-Avatare einfliegen (revealStep>=1)
  // ziehen die Rows smooth auseinander, damit die Chips Platz unter der Card
  // bekommen ohne die naechste Card zu verdecken.
  const expandedLayout = revealStep >= 1;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      columnGap: 18,
      // 2026-05-12 (Wolf 'mucho runde 1 felder stehen unten aus slide raus'):
      // rowGap-Max von 120 → 90, paddingBottom-Max von 160 → 110 reduziert.
      // Zwei-Spalten-Layout mit 4 Optionen + Voter-Reihen + Footer-Avatar-Row
      // war bei kleinen Beamer-Aufloesungen + grosser Frage-Card knapp am
      // Bottom-Edge. Kompaktere Bottom-Spaces verhindern Clipping.
      rowGap: expandedLayout ? 'clamp(60px, 8cqh, 90px)' : 18,
      paddingBottom: expandedLayout ? 'clamp(70px, 9cqh, 110px)' : 0,
      marginBottom: 'clamp(10px, 1.4cqh, 22px)',
      width: '100%', maxWidth: 1400,
      animation: 'contentReveal 0.35s var(--qq-ease-pop-fast) 0.1s both',
      // 2026-04-30 v2: 0.6s → 0.9s entspanntes Easing — User-Feedback
      // 'cards verschieben sich zu hektisch'. ≥0.45s ist die neue Faustregel.
      transition: 'row-gap 0.9s var(--qq-ease-smooth), padding-bottom 0.9s var(--qq-ease-smooth), margin-bottom 0.9s ease',
    }}>
      {options.map((opt, i) => {
        const optImg = optionImages?.[i];
        const isCorrect = showLock && i === correctOptionIndex;
        const isWrong = showLock && i !== correctOptionIndex;
        const optColor = MUCHO_COLORS[i] ?? QQ_COLORS.slate500;
        const optText = qqCapOption(lang === 'en' && optionsEn?.[i] ? optionsEn[i] : opt);
        const voterShow = shownVoterSet.has(i);
        // Voter pro Option vorberechnen — wir brauchen sie ausserhalb der Card
        const voters = answers
          .filter(a => a.text === String(i))
          .sort((a, b) => a.submittedAt - b.submittedAt)
          .map(a => {
            const team = teams.find(t => t.id === a.teamId);
            return team ? { team, submittedAt: a.submittedAt } : null;
          })
          .filter((x): x is { team: NonNullable<ReturnType<typeof teams.find>>; submittedAt: number } => !!x);
        const t0 = timerEndsAt && timerDurationSec
          ? timerEndsAt - timerDurationSec * 1000
          : voters[0]?.submittedAt;
        return (
          // 2026-05-07 (Audit P1): MUCHO-Cards gleich-hoch via flex:1+height:100%,
          // analog zu ZvZ. Wrapper bekommt display:flex + height:100%, Inner-Card
          // flex:1 — bei laengeren Optionen (zweizeilig) wachsen alle Cards mit.
          <div key={i} style={{ position: 'relative', display: 'flex', height: '100%' }}>
            <div style={{
              flex: 1,
              position: 'relative', overflow: 'hidden',
              borderRadius: 24, padding: '24px 28px',
              // 2026-05-09 (Wolf 'Mini-Sprung in Reihe wenn Sieger-Card kommt'):
              // Border einheitlich 3px ausgeführt (vorher 2/3/2) + box-sizing
              // border-box, sonst wuchs die korrekte Card 2px höher und alle
              // Cards in derselben Row schoben sich nach. Wrong-Border in
              // Transparent damit visuell nichts da ist, Höhe aber konstant.
              boxSizing: 'border-box',
              background: isCorrect ? 'rgba(34,197,94,0.22)' : cardBg,
              // 2026-06-24 (Wolf 'option-rahmen auch schwarz'): bei Skin Card-Behandlung
              // (Mono=schwarzer Rand+Hard-Shadow) statt Akzent-Rand.
              border: isCorrect ? '3px solid #22C55E'
                : isWrong ? (isThemed() ? '3px solid var(--qq-hairline)' : '3px solid rgba(255,255,255,0.06)')
                : (isThemed() ? 'var(--qq-card-border)' : `3px solid ${optColor}55`),
              boxShadow: isCorrect ? '0 0 44px rgba(34,197,94,0.48), 0 0 90px rgba(34,197,94,0.18)'
                : (isThemed() ? 'var(--qq-card-shadow)' : '0 4px 16px rgba(0,0,0,0.3)'),
              display: 'flex', alignItems: 'center', gap: 16,
              transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
              animation: isCorrect
                ? 'revealDoubleBlink 1.1s ease both, revealCorrectPop 0.6s var(--qq-ease-bounce) both'
                : isWrong
                  // 2026-05-04 (Wolf #4): Wrong-Drama — kurzer horizontaler
                  // Shake (0.5s) mit rotem Pulse-Glow, danach revealWrongDim
                  // (1.6s delay matcht Shake-End). Macht Falsch-Tipps spuerbar.
                  ? 'revealWrongShake 0.5s var(--qq-ease-bounce) both, revealWrongDim 0.5s ease 0.55s both'
                  : undefined,
            }}>
              {optImg?.url && (
                <img src={optImg.url} alt="" style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: optImg.fit ?? 'cover', opacity: optImg.opacity ?? 0.4,
                  pointerEvents: 'none',
                }} />
              )}
              {optImg?.url && (
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%)', pointerEvents: 'none' }} />
              )}
              <div style={{
                position: 'relative', zIndex: 1,
                width: 56, height: 56, borderRadius: 16,
                background: isCorrect ? QQ_COLORS.green500 : isWrong ? '#374151' : optColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isCorrect ? 32 : 28, fontWeight: 900, color: '#fff', flexShrink: 0,
                boxShadow: isCorrect
                  ? '0 0 16px rgba(34,197,94,0.6)'
                  : `0 2px 8px ${optColor}44`,
                transition: 'background 0.3s ease, box-shadow 0.3s ease',
              }}>{muchoLabels[i]}</div>
              <div style={{
                position: 'relative', zIndex: 1,
                flex: 1, minWidth: 0,
                fontSize: 'clamp(26px, 3.2cqw, 44px)', fontWeight: 900,
                color: isWrong ? QQ_COLORS.slate600 : QQ_COLORS.slate100, lineHeight: 1.3,
                textShadow: optImg?.url ? '0 2px 8px rgba(0,0,0,0.8)' : 'none',
                transition: 'color 0.3s ease',
              }}>{optText}</div>
            </div>
            {/* Voter-Reihe: haengt unter der Card (Avatare 80% rausragend, nur
                der obere Top-Edge scrapt die Card-Unterkante) damit der
                Antwort-Text nicht verdeckt wird. Zeit-Pill direkt unter dem
                Avatar-Kreis. justifyContent:center damit einzelne Avatare
                unter der Card zentriert stehen. */}
            {voterShow && voters.length > 0 && (
              <div style={{
                position: 'absolute', left: 8, right: 8, bottom: 0,
                transform: 'translateY(80%)',
                display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start',
                justifyContent: 'center',
                gap: voters.length > 4 ? 6 : 10,
                pointerEvents: 'none', zIndex: 5,
              }}>
                {voters.map((v, vi) => {
                  const tm = v.team;
                  const timeSec = t0 ? Math.max(0, (v.submittedAt - t0) / 1000) : null;
                  const isFastest = akt3On && isCorrect && vi === 0;
                  const voterDelay = vi * 0.18;
                  // Viele Voter (>4) = etwas kleinere Avatare, damit sie in eine Reihe passen
                  const many = voters.length > 4;
                  const avatarSz = isFastest
                    ? (many ? 'clamp(56px, 6cqw, 80px)' : 'clamp(64px, 7cqw, 92px)')
                    : (many ? 'clamp(44px, 4.8cqw, 64px)' : 'clamp(52px, 5.6cqw, 76px)');
                  // Wrong-Option-Voter: dezent dimmen (Grayscale + Opacity) →
                  // signalisiert visuell „haben falsch geraten".
                  const dim = isWrong;
                  return (
                    <div key={tm.id} style={{
                      position: 'relative',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      animation: `muchoVoterDrop 0.55s cubic-bezier(0.34,1.5,0.64,1) ${voterDelay}s both`,
                      opacity: dim ? 0.55 : 1,
                      filter: dim ? 'grayscale(0.6)' : 'none',
                      transition: 'opacity 0.4s ease, filter 0.4s ease',
                    }}>
                      <div title={tm.name} style={{ position: 'relative', display: 'inline-block' }}>
                        <QQTeamAvatar
                          avatarId={tm.avatarId} teamEmoji={tm.emoji}
                          size={avatarSz}
                          style={{
                            // Kein Doppel-Rand mehr: das Avatar-Artwork hat eh
                            // einen farbigen Kapuzen-/Kreis-Rim. Nur der schnellste
                            // Voter bekommt den Gold-Ring als Winner-Indikator.
                            border: isFastest ? '4px solid #EC4899' : 'none',
                            boxShadow: isFastest
                              ? '0 0 22px rgba(236,72,153,0.6), 0 6px 14px rgba(0,0,0,0.55)'
                              : `0 6px 14px rgba(0,0,0,0.55), 0 0 10px ${tm.color}55`,
                            background: '#0A0814',
                          }}
                        />
                        {/* Zeit-Pill: direkt unter dem Kreis, zentriert, leicht ueberlappend */}
                        {timeSec != null && isCorrect && akt3On && (
                          <span style={{
                            position: 'absolute',
                            left: '50%', bottom: -8,
                            transform: 'translate(-50%, 50%)',
                            padding: '2px 9px', borderRadius: 999,
                            background: isFastest ? 'rgba(236,72,153,0.95)' : 'rgba(15,23,42,0.95)',
                            border: isFastest ? '1.5px solid rgba(236,72,153,1)' : `1.5px solid ${tm.color}`,
                            color: isFastest ? '#0A0814' : QQ_COLORS.slate200,
                            fontWeight: 900,
                            fontSize: 'clamp(11px, 1.2cqw, 15px)',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                            lineHeight: 1.1,
                          }}>
                            {timeSec.toFixed(1)}s
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuizIntroOverlay — epische Begrüßungs-Folie "Willkommen beim BLOCK QUIZ
// / QUARTER QUIZ by cozywolf". Spielt einmal pro Session beim ersten Wechsel
// in RULES-Phase und blendet dann in die Rules-Ansicht über.
// ─────────────────────────────────────────────────────────────────────────────
function QuizIntroOverlay({ language, visible, eurovisionMode, logoUrl, welcomeVideoUrl }: { language: QQLanguage; visible: boolean; eurovisionMode?: boolean; logoUrl?: string; welcomeVideoUrl?: string }) {
  const lang = useLangFlip(language);
  const title = 'COZYQUIZ';
  const welcome = lang === 'en' ? 'A WARM WELCOME TO' : 'HERZLICH WILLKOMMEN ZUM';
  const greeting = lang === 'en'
    ? 'Get comfy — here we go!'
    : 'Macht\'s euch bequem – gleich geht\'s los!';
  // 2026-05-07 v6 (Wolf 'video VOR cascade, cascade erst nach video einblenden'):
  // hasIntroVideo = wenn eurovisionMode + welcomeVideoUrl + sichtbar. Solange
  // das Video laeuft (videoEnded=false), wird die komplette Cascade-Stage
  // unterdrueckt. onEnded triggert videoEnded=true, dann fadet Video auf
  // 0.25 BG-Opacity zurueck und Cascade-Animation startet frisch.
  const hasIntroVideo = !!(eurovisionMode && welcomeVideoUrl && visible);
  const [videoEnded, setVideoEnded] = useState(false);
  // Reset wenn Overlay neu angezeigt wird oder Video-URL aendert.
  useEffect(() => {
    if (!hasIntroVideo) { setVideoEnded(true); return; }
    setVideoEnded(false);
    // Safety-Timeout: falls onEnded nie feuert (404, autoplay-block etc.),
    // nach 15s zwangsweise Cascade einblenden.
    const t = window.setTimeout(() => setVideoEnded(true), 15000);
    return () => window.clearTimeout(t);
  }, [hasIntroVideo, welcomeVideoUrl]);
  const cascadeReady = !hasIntroVideo || videoEnded;
  // 2026-05-07 v9 (Wolf 'in der lobby hast du gelb fuer den text? wieso?'):
  // Der Welcome-Cascade hat sein eigenes Farb-Schema in Gold (Subtitle,
  // Goldlinien, Ambient-Glow, Sunrise, Fireflies). Mein Pink-Pass hatte das
  // uebersehen — jetzt im eurovisionMode auf ESC-Pink/Lila gemappt.
  // 2026-05-08 (Aurora-Vivid): Standard-Accent jetzt Brand-Pink (#EC4899)
  // statt Amber-Gold (#EC4899). Eurovision behaelt sein Hot-Pink (#FF2D7B).
  // accentSoft/accentWarm sind Pink-Spektrum statt Gold-Spektrum.
  // 2026-06-24 (Skin): Welcome-Hero zieht bei aktivem Skin Akzent/Titel aus den
  // Tokens; titleHex = --qq-title (Mono=Schwarz, Neo=Gelb) fuer COZYQUIZ + Subtitle.
  const themed = isThemed();
  const accentHex     = eurovisionMode ? '#FF2D7B' : themed ? 'var(--qq-accent)' : QQ_COLORS.brandPink;
  const accentRgb     = eurovisionMode ? '255,45,123' : themed ? 'var(--qq-accent-rgb)' : '236,72,153';
  const accentSoftHex = eurovisionMode ? '#fde6f0' : themed ? 'var(--qq-accent-soft)' : QQ_COLORS.brandPinkSoft;
  const accentWarmHex = eurovisionMode ? '#C084FC' : themed ? 'var(--qq-accent-light)' : '#F9A8D4'; // accent-2 fuer Fireflies-Variation
  const titleHex      = eurovisionMode ? '#FF2D7B' : themed ? 'var(--qq-title)' : QQ_COLORS.brandPink;
  // Wolf 2026-05-05 'episch aber professionell': Phasen-Choreographie:
  //   0.0–0.9s  Subtitle „HERZLICH WILLKOMMEN ZUM" letter-cascade aus weitem
  //             letter-spacing zoomt auf normal, gold-glow.
  //   0.9–1.4s  Goldlinie zieht sich von Mitte nach beiden Seiten aus.
  //   1.4–1.6s  Light-Flash ueber den ganzen Screen (gold-warmer Pulse).
  //   1.6–2.4s  „CozyQuiz" letter-by-letter scaleIn von 0.4→1.05→1 mit elastic
  //             bounce, je 0.06s Stagger. Goldglow um Schriftzug pulsiert 1×.
  //   2.4–3.4s  Shimmer-Lichtreflex wandert links→rechts ueber den Title.
  //   3.4–4.4s  Wolf-Avatar swoosht von unten links rein, Sprechblase pop.
  // Background-Atmosphaere (Sterne, Glow) bleibt ueber alles hinweg ruhig + atmend.
  // 2026-05-05 (Animation-Audit #6): waehrend Welcome sichtbar ist, body
  // markieren mit data-cinematic damit andere Ambient-Loops auf der Page
  // pausieren (CSS-Selektor in main.css).
  useEffect(() => {
    if (!visible) return;
    document.body.setAttribute('data-cinematic', 'true');
    return () => { document.body.removeAttribute('data-cinematic'); };
  }, [visible]);
  const fireflies = Array.from({ length: 14 }, (_, i) => ({
    left: 6 + ((i * 37) % 88),
    top: 8 + ((i * 53) % 84),
    dur: 5 + (i % 4) * 0.7,
    delay: (i * 0.4) % 4,
    size: 2.5 + (i % 3) * 1.4,
  }));
  return (
    <BeamerOverlay
      visible={visible}
      zIndex={9990}
      // Wolf 2026-05-05 'sehe da aktuell nichts': Mount-Anim deutlich
      // dramatischer — Folie zoomt aus 1.18 → 1 (war 1.04, kaum sichtbar).
      hiddenScale={1.18}
      background={themed ? 'var(--qq-bg)' : 'radial-gradient(ellipse at center, #0f172a 0%, #0a0f1c 55%, #050810 100%)'}
    >
      {/* 2026-05-07 (Wolf-ESC 'wie geil waere ein 10sec intro video — video
          ist drin'): Welcome-Video laeuft als BG-Layer hinter allen anderen
          Elementen. autoPlay+muted+playsInline → cross-browser autoplay-
          policy-konform (kein User-Gesture noetig). object-fit: cover damit
          das Video den ganzen Overlay fuellt. Sichtbar nur im eurovisionMode
          + wenn welcomeVideoUrl gesetzt. Hearts/Wordmark/Logo overlay wie
          gewohnt drueber, leichter dunkler Schleier um die Lesbarkeit der
          Letter-Cascade nicht zu verlieren. */}
      {hasIntroVideo && (
        <>
          <video
            key={welcomeVideoUrl}
            src={welcomeVideoUrl}
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={() => setVideoEnded(true)}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              // 2026-05-07 v7 (Wolf 'video etwas frueher ausfaden — der Vienna-
              // 2026-Text vom Video sieht man noch hinter dem Wordmark'):
              // Post-End-Opacity 0.25 -> 0 (komplett weg) plus schnellere
              // Transition 0.8s -> 0.5s. Cascade hat eh eigene Hearts/Fireflies,
              // braucht keinen Video-BG-Layer.
              opacity: videoEnded ? 0 : 1,
              transition: 'opacity 0.5s ease',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
          {/* 2026-05-07 v16 (Wolf 'nimm 3.png als BG nach dem Video — fast
              exakt der gleiche Pink/Blau-Look wie im Video, krasser Continuity-
              Effekt'): nach Video-Ende fadet 3.png ein als BG. Plus Dim-Overlay
              fuer Lesbarkeit der Cascade-Texte. */}
          <div aria-hidden style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(/themes/3.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: videoEnded ? 0.7 : 0,
            transition: 'opacity 0.6s ease 0.1s',
            pointerEvents: 'none', zIndex: 0,
          }} />
          {/* Dim-Overlay ueber dem 3.png-BG — duenkelt das Bild leicht ab
              damit Pink-Cascade-Texte gut lesbar bleiben. */}
          <div aria-hidden style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(5,8,16,0.35) 0%, rgba(5,8,16,0.65) 100%)',
            opacity: videoEnded ? 1 : 0,
            transition: 'opacity 0.5s ease',
            pointerEvents: 'none', zIndex: 0,
          }} />
        </>
      )}
      {/* 2026-05-07 v6: Cascade-Stage erst nachdem das Video zu Ende ist
          (oder wenn kein Video gesetzt). Container re-mounted bei
          cascadeReady-Flip → alle CSS-Animations starten frisch mit ihren
          Delay-Werten. */}
      {cascadeReady && (
      <>
      {/* Cinematic-Focus-In: BG-blur fadet in den ersten 0.7s aus.
          Wirkt wie Kamera die scharfstellt. Wolf 2026-05-05. */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        backdropFilter: 'blur(0px)',
        WebkitBackdropFilter: 'blur(0px)',
        animation: 'qqIntroFocusIn 0.9s cubic-bezier(0.2, 0.7, 0.3, 1) both',
        pointerEvents: 'none', zIndex: 0,
      }} />
      {/* Light-Streifen-Sweep beim Mount — diagonaler Glanz wandert von
          oben-links nach unten-rechts, einmal als Eintritts-Statement. */}
      <div aria-hidden style={{
        position: 'absolute', top: 0, left: '-30%',
        width: '60%', height: '100%',
        background: `linear-gradient(115deg, transparent 35%, rgba(${accentRgb},0.18) 48%, rgba(255,255,255,0.22) 50%, rgba(${accentRgb},0.18) 52%, transparent 65%)`,
        animation: 'qqIntroEntrySweep 1.4s cubic-bezier(0.2, 0.7, 0.3, 1) 0.1s both',
        pointerEvents: 'none', zIndex: 1,
        filter: 'blur(2px)',
      }} />
      {/* Ambient title-glow — wide warm halo behind the title area, atmend. */}
      <div style={{
        position: 'absolute', left: '50%', top: '40%',
        width: '95vmin', height: '55vmin',
        transform: 'translate(-50%, -50%)',
        background: eurovisionMode
          ? 'radial-gradient(ellipse at center, rgba(255,45,123,0.20) 0%, rgba(168,85,247,0.10) 38%, transparent 68%)'
          : 'radial-gradient(ellipse at center, rgba(236,72,153,0.20) 0%, rgba(249,115,22,0.10) 38%, transparent 68%)',
        filter: 'blur(34px)',
        animation: 'qqIntroAmbientPulse 6s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      {/* 2026-05-06 (Wolf 'reinfliegen ist nice, blitz am ende nicht so —
          cozier machen, sonnenaufgang + lichter-schwarm'):
          (c) Sanfter Sonnenaufgang — radial-gradient pulsiert von Center nach
          aussen, langsamer und weicher als der vorherige Lichtblitz. Wirkt
          wie ein Vorhang der sich hebt, statt Donner.
          Vorher: qqIntroLightFlash 0.9s, 25% peak opacity 1.0 → grell.
          Jetzt: qqIntroSunrise 1.6s, 40% peak opacity 0.7 → warm und ruhig. */}
      <div style={{
        position: 'absolute', inset: 0,
        background: eurovisionMode
          ? 'radial-gradient(ellipse at center, rgba(255,45,123,0.42) 0%, rgba(168,85,247,0.18) 38%, rgba(59,130,246,0.06) 65%, transparent 80%)'
          : 'radial-gradient(ellipse at center, rgba(236,72,153,0.42) 0%, rgba(249,115,22,0.18) 38%, rgba(236,72,153,0.06) 65%, transparent 80%)',
        opacity: 0,
        transformOrigin: 'center',
        animation: 'qqIntroSunrise 1.6s cubic-bezier(0.16, 0.84, 0.44, 1) 1.4s both',
        pointerEvents: 'none', mixBlendMode: 'screen',
      }} />
      {/* (d) Lichter-Schwarm-Burst — alle Fireflies blitzen einmal synchron
          hell auf (kurz nach dem Title-Pop), dann beruhigen sie sich auf den
          normalen Drift-Loop. Wir layern dafuer eine zweite Element-Reihe an
          den gleichen Positionen, die einmal aufflammt und dann verschwindet. */}
      {fireflies.map((f, i) => (
        <div key={`burst-${i}`} aria-hidden style={{
          position: 'absolute',
          left: `${f.left}%`, top: `${f.top}%`,
          width: f.size * 1.8, height: f.size * 1.8, borderRadius: '50%',
          background: i % 3 === 0 ? accentSoftHex : i % 3 === 1 ? accentHex : accentWarmHex,
          boxShadow: `0 0 24px rgba(${accentRgb},0.85), 0 0 6px rgba(255,255,255,0.7)`,
          opacity: 0,
          animation: `qqIntroFireflyBurst 1.4s var(--qq-ease-pop-fast) ${1.5 + (i % 6) * 0.04}s both`,
          pointerEvents: 'none',
          transform: 'translate(-50%, -50%)',
        }} />
      ))}
      {/* Fireflies (continuous drift) */}
      {fireflies.map((f, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${f.left}%`, top: `${f.top}%`,
          width: f.size, height: f.size, borderRadius: '50%',
          background: i % 2 ? accentHex : accentSoftHex,
          boxShadow: `0 0 10px rgba(${accentRgb},0.55), 0 0 2px rgba(255,255,255,0.4)`,
          opacity: 0.65,
          animation: `qqIntroFireflyDrift ${f.dur}s ease-in-out ${f.delay}s infinite`,
          pointerEvents: 'none',
        }} />
      ))}
      {eurovisionMode && <EurovisionHearts />}
      {/* Content-Stack */}
      <div style={{
        position: 'relative', zIndex: 5,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 'clamp(14px, 2cqh, 28px)',
        textAlign: 'center',
        padding: '0 6cqw',
      }}>
        {/* 2026-05-09 (Wolf-Wunsch 'CozyQuiz in eine typische App-Card —
            konsistenter, etwas grösser, schön prominent mittig'): Subtitle +
            Title in einer Pink-Border-Card mit Glow + dark BG + Cross-Hatch-
            Pattern — gleicher Look wie Format-Cards auf /formats und Card-Backs
            in TeamsRevealView. Goldlinien bleiben als Innen-Decorations.
            Card poppt nach dem Sunrise-Light rein (Delay 1.2s). */}
        <div style={{
          position: 'relative',
          padding: 'clamp(28px, 4.5cqh, 60px) clamp(36px, 6.5cqw, 100px)',
          borderRadius: 'clamp(20px, 2.4cqw, 32px)',
          background: themed
            ? 'var(--qq-card-bg)'
            : 'radial-gradient(ellipse at 50% 30%, rgba(236,72,153,0.28) 0%, transparent 60%),' +
            'radial-gradient(ellipse at 50% 80%, rgba(162,18,71,0.22) 0%, transparent 55%),' +
            'linear-gradient(135deg, rgba(31,26,46,0.92) 0%, rgba(20,16,31,0.92) 60%, rgba(15,8,23,0.92) 100%)',
          border: `2.5px solid rgba(${accentRgb},0.65)`,
          boxShadow: `0 16px 56px rgba(0,0,0,0.55), 0 0 80px rgba(${accentRgb},0.32), inset 0 0 48px rgba(${accentRgb},0.14)`,
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'clamp(14px, 2cqh, 28px)',
          animation: 'qqIntroWelcomeCard 0.9s cubic-bezier(0.2, 0.85, 0.3, 1) 1.2s both',
          opacity: 0,
        }}>
          {/* Cross-Hatch-Pattern (matcht Card-Back-Look in TeamsReveal) */}
          <div aria-hidden style={{
            position: 'absolute', inset: 0,
            backgroundImage:
              `repeating-linear-gradient(45deg, rgba(${accentRgb},0.05) 0 2px, transparent 2px 22px),` +
              `repeating-linear-gradient(-45deg, rgba(${accentRgb},0.04) 0 2px, transparent 2px 22px)`,
            pointerEvents: 'none',
          }} />

        {/* Subtitle — Letter-Cascade. Jeder Buchstabe erscheint mit eigenem
            stagger 0.04s, fade-in + letter-spacing-zoom (von weit zu normal). */}
        <div style={{
          position: 'relative',
          display: 'inline-flex',
          fontSize: 'clamp(15px, 1.6cqw, 24px)', fontWeight: 900,
          letterSpacing: '0.32em', textTransform: 'uppercase',
          color: titleHex,
          opacity: 0.92,
          // 2026-05-07 v12 (Wolf 'kontrast teilweise unleserlich'): zusaetzlich
          // dunkler Halo (rgba(0,0,0,0.55) Drop-Shadow) zur Lesbarkeit auf
          // Pink/Lila-BG. Pink-Glow bleibt fuer Atmosphaere.
          textShadow: `0 1px 6px rgba(0,0,0,0.55), 0 0 28px rgba(${accentRgb},0.55), 0 0 8px rgba(${accentRgb},0.35)`,
        }} aria-label={welcome}>
          {Array.from(welcome).map((ch, i) => (
            <span key={i} style={{
              display: 'inline-block',
              opacity: 0,
              animation: `qqIntroSubLetter 0.55s var(--qq-ease-pop-fast) ${i * 0.04}s both`,
              whiteSpace: 'pre',
            }}>{ch === ' ' ? ' ' : ch}</span>
          ))}
        </div>

        {/* Title-Block: Goldlinie oben + Letter-Cascade Title + Goldlinie unten */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'clamp(10px, 1.4cqh, 22px)',
          position: 'relative',
        }}>
          {/* Goldlinie OBEN — zieht sich von Mitte nach außen aus (0.9s delay). */}
          <div style={{
            width: 'clamp(380px, 50cqw, 760px)', height: 2, borderRadius: 999,
            background: `linear-gradient(90deg, transparent 0%, rgba(${accentRgb},0.6) 25%, ${accentHex} 50%, rgba(${accentRgb},0.6) 75%, transparent 100%)`,
            backgroundSize: '200% 100%',
            boxShadow: `0 0 14px rgba(${accentRgb},0.55)`,
            transformOrigin: 'center',
            animation: 'qqIntroLineExpand 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.9s both, qqIntroAccentShimmer 3.5s linear 2.6s infinite',
            opacity: 0,
          }} />

          {/* Title — Letter-Cascade mit elastic ScaleIn pro Buchstabe.
              Stagger 0.06s, scale 0.4 → 1.08 → 1. Whole-screen white text mit
              dichtem Goldglow.
              2026-05-07 v13 (Wolf 'cozyquiz x eurovision songcontest stinger
              eingebaut?'): im ESC-Mode ist der Title jetzt eine horizontale
              Stinger-Row [COZYQUIZ × EUROVISION-LOGO] — alle drei Elemente
              inline-flex children, Letters cascaden weiter, X poppt nach
              Letters, Logo poppt nach X. Gemeinsame baseline ueber
              alignItems:center. */}
          <div
            aria-label={eurovisionMode ? `${title} × Eurovision Song Contest` : title}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: eurovisionMode ? 'clamp(20px, 2cqw, 40px)' : 0,
              // 2026-05-08 (Wolf-Wunsch 'logo text in standard wie eurovision'):
              // Stinger-Look jetzt fuer ALLE Drafts (nicht nur ESC). Wordmark
              // wird in Stinger Fit + Brand-Pink gerendert. Eurovision behaelt
              // zusaetzlich × + ESC-Logo daneben (Stinger-Composition); Standard
              // zeigt nur den Wordmark Solo.
              fontFamily: "'Stinger Fit', 'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif",
              // 2026-05-09 (Wolf 'etwas größer und schön prominent mittig'):
              // Standard-Wordmark von clamp(72px,9cqw,158px) auf (82px,10cqw,178px)
              // — ~13% größer. Eurovision behält Komposition (X + Logo brauchen
              // Platz daneben).
              fontSize: eurovisionMode ? 'clamp(52px, 7cqw, 118px)' : 'clamp(82px, 10cqw, 178px)',
              fontWeight: 400,
              letterSpacing: '0.04em',
              lineHeight: 0.96,
              color: eurovisionMode ? accentHex : titleHex,
              // 2026-05-13 Kontrast-Audit ESC: Dark-Halo davor, Pink-Glow
              // reduziert (Welcome-Video-BG kann hellpink-Frames haben).
              textShadow: themed
                ? 'none'
                : eurovisionMode
                ? `0 4px 22px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.7), 0 0 32px rgba(${accentRgb},0.35)`
                : '0 0 28px rgba(236,72,153,0.65), 0 0 72px rgba(236,72,153,0.28)',
              position: 'relative', zIndex: 1,
              animation: 'qqIntroTitleSettle 1.1s cubic-bezier(0.16, 1, 0.3, 1) 2.5s both',
              filter: 'drop-shadow(0 6px 30px rgba(0,0,0,0.55))',
            }}
          >
            {/* CozyQuiz-Wordmark als Letter-Cascade-Container.
                2026-05-08: Hover-Float jetzt fuer ALLE Themes — Stinger-Look
                ist Standard-Wordmark, Hover macht ihn lebendig. */}
            <span style={{
              position: 'relative',
              display: 'inline-flex',
              animation: 'qqStingerHover 4.2s ease-in-out 3.4s infinite',
            }}>
              {/* 2026-05-08 (Wolf 'shimmer-effekt wirkt billig'): Sweep-Overlay
                  entfernt. Vorher zog ein weißer Linear-Gradient diagonal
                  über den Wordmark — wirkte wie Cheap-CSS-Sheen-Effekt.
                  Stinger-Hover-Animation auf dem Container reicht für
                  Lebendigkeit. */}
              {Array.from(eurovisionMode ? title.toUpperCase() : title).map((ch, i) => (
                <span key={i} style={{
                  display: 'inline-block',
                  opacity: 0,
                  animation: `qqIntroTitleLetter 0.85s cubic-bezier(0.16, 1.2, 0.3, 1) ${1.6 + i * 0.06}s both`,
                  whiteSpace: 'pre',
                }}>{ch}</span>
              ))}
            </span>
            {/* ESC-Stinger: × in Standard-Nunito-Font (Wolf-Wunsch 'X in
                standard font mit aktueller standard farbe') + Eurovision-
                Logo-Image. Beide popen NACH dem CozyQuiz-Cascade rein. */}
            {eurovisionMode && (
              <>
                {/* 2026-05-07 v15 (Wolf 'X bitte mittig + animieren dass es
                    schimmert'): inline-flex Container fuer perfekt zentriertes
                    X. Doppel-Animation: pop-in @ 2.4s, dann Shimmer-Loop ab
                    3.0s (alle 2.5s pulsiert). */}
                <span aria-hidden style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  // 2026-05-07 v17: line-height + height fest, damit X
                  // perfekt vertikal mittig sitzt zwischen CozyQuiz-Letters
                  // und Logo. lineHeight 1, height 1em fixiert die Box.
                  // 2026-05-07 v19 (Wolf 'jetzt ist das x doch noch weniger
                  // mittig'): top:-0.08em von v18 wieder raus — wirkte falsch
                  // herum/uebertrieben. Stattdessen: COZYQUIZ + Logo geshrinkt
                  // damit × proportional dominanter wirkt und natuerlicher
                  // mittig erscheint (Wolfs eigener Vorschlag).
                  fontFamily: "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif",
                  fontWeight: 900,
                  fontSize: '0.85em',
                  lineHeight: 1,
                  height: '1em',
                  color: '#fde6f0',
                  opacity: 0,
                  // qqStingerXShine: Tilt + Multi-Layer-Glow-Pulse, 3.5s cycle.
                  animation: 'qqIntroEurovisionPop 0.5s var(--qq-ease-bounce) 2.4s both, qqStingerXShine 3.5s ease-in-out 3.0s infinite',
                  textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                }}>×</span>
                {logoUrl && (
                  /* Wrapper-Span traegt die Hover-Float-Animation; das img selbst
                     den Pop-In + Drop-Shadow. */
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    animation: 'qqStingerHover 4.2s ease-in-out 3.4s infinite',
                  }}>
                    <img
                      src={logoUrl}
                      alt="Eurovision Song Contest"
                      draggable={false}
                      style={{
                        // 2026-05-07 v17 (Wolf 'beide schriftarten etwa
                        // aehnlich gross'): Logo-Bild enthaelt Text +
                        // Padding/Hintergrund — visible-Letter-Height ist
                        // ~50 % der Bild-Hoehe. 1.15em -> 1.7em damit die
                        // 'Eurovision Song Contest'-Buchstaben optisch
                        // gleich gross sind wie 'COZYQUIZ'.
                        height: '1.7em',
                        width: 'auto',
                        filter: 'drop-shadow(0 0 28px rgba(236,72,153,0.6)) drop-shadow(0 6px 18px rgba(0,0,0,0.55))',
                        animation: 'qqIntroEurovisionPop 0.7s var(--qq-ease-bounce) 2.6s both',
                        opacity: 0,
                      }}
                    />
                  </span>
                )}
              </>
            )}
          </div>

          {/* Goldlinie UNTEN — symmetrisch zur oberen, gleiches expand */}
          <div style={{
            width: 'clamp(380px, 50cqw, 760px)', height: 2, borderRadius: 999,
            background: `linear-gradient(90deg, transparent 0%, rgba(${accentRgb},0.6) 25%, ${accentHex} 50%, rgba(${accentRgb},0.6) 75%, transparent 100%)`,
            backgroundSize: '200% 100%',
            boxShadow: `0 0 14px rgba(${accentRgb},0.55)`,
            transformOrigin: 'center',
            animation: 'qqIntroLineExpand 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.95s both, qqIntroAccentShimmer 3.5s linear 2.6s infinite',
            opacity: 0,
          }} />

          {/* 2026-05-07 v13: Eurovision-Logo-Block unter dem Title entfernt —
              ist jetzt INSIDE des Title als Teil des CozyQuiz × Eurovision
              Stingers (siehe oben). Fallback fuer den Fall, dass logoUrl
              fehlt: kompakte Text-Pille auch im Stinger-Stil rendern. */}
          {eurovisionMode && !logoUrl && (
            <div style={{
              marginTop: 'clamp(8px, 1.4cqh, 20px)',
              padding: '8px 28px', borderRadius: 999,
              background: 'linear-gradient(135deg, rgba(236,72,153,0.32), rgba(168,85,247,0.24))',
              border: '2px solid rgba(236,72,153,0.65)',
              fontSize: 'clamp(16px, 1.7cqw, 24px)', fontWeight: 900,
              color: QQ_COLORS.yellow300, letterSpacing: '0.22em', textTransform: 'uppercase',
              boxShadow: '0 0 30px rgba(236,72,153,0.45), 0 4px 14px rgba(0,0,0,0.4)',
              animation: 'qqIntroEurovisionPop 0.7s var(--qq-ease-bounce) 2.6s both',
              opacity: 0,
            }}>
              🎤 Eurovision Edition
            </div>
          )}
        </div>
        </div>{/* /Welcome-App-Card */}

        {/* Wolf + Sprechblase — kommen erst NACH dem Title-Pop rein.
            2026-05-08 (Wolf 'wirkt eher öde'): Wolf+Sprechblase früher (2.6s
            statt 3.4s) damit kein langer Stillstand vor dem Auftritt. Greeting
            wird zusätzlich Word-Stagger animiert (qqWordFadeUp pro Wort) statt
            statisch — wirkt lebendig wie der Wolf wirklich spricht. */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 'clamp(14px, 1.8cqw, 28px)',
          marginTop: 'clamp(20px, 2.6cqh, 36px)',
          animation: 'qqIntroWolfStack 0.95s cubic-bezier(0.2, 1, 0.3, 1) 2.6s both',
          opacity: 0,
        }}>
          <AnimatedCozyWolf
            widthCss="clamp(130px, 15cqw, 220px)"
            mode={eurovisionMode ? 'flagge' : undefined}
            speaking={visible}
          />

          <div style={{
            position: 'relative',
            padding: 'clamp(14px, 1.8cqh, 24px) clamp(22px, 2.6cqw, 38px)',
            borderRadius: 24,
            background: 'linear-gradient(180deg, rgba(15,23,42,0.78) 0%, rgba(11,16,28,0.78) 100%)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: `2px solid rgba(${accentRgb},0.55)`,
            boxShadow: `0 10px 32px rgba(0,0,0,0.5), 0 0 0 3px rgba(${accentRgb},0.12), inset 0 1px 0 rgba(255,255,255,0.06)`,
            color: QQ_COLORS.slate100,
            fontSize: 'clamp(18px, 2cqw, 30px)', fontWeight: 900,
            maxWidth: '60cqw',
            lineHeight: 1.28,
            animation: 'qqIntroBubbleBob 5s ease-in-out 4s infinite',
          }}>
            {/* Tail */}
            <div style={{
              position: 'absolute', left: -13, top: '50%',
              width: 0, height: 0, transform: 'translateY(-50%)',
              borderTop: '11px solid transparent', borderBottom: '11px solid transparent',
              borderRight: `14px solid rgba(${accentRgb},0.55)`,
            }} />
            <div style={{
              position: 'absolute', left: -10, top: '50%',
              width: 0, height: 0, transform: 'translateY(-50%)',
              borderTop: '9px solid transparent', borderBottom: '9px solid transparent',
              borderRight: '12px solid rgba(15,23,42,0.85)',
            }} />
            {greeting.split(' ').map((word, i) => (
              <span key={i} style={{
                display: 'inline-block',
                opacity: 0,
                animation: `qqWordFadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${3.2 + i * 0.08}s both`,
                marginRight: 6,
              }}>{word}</span>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes qqIntroAmbientPulse {
          0%, 100% { opacity: 0.65; transform: translate(-50%, -50%) scale(1); }
          50%      { opacity: 1.0;  transform: translate(-50%, -50%) scale(1.10); }
        }
        @keyframes qqIntroFocusIn {
          0%   { backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); opacity: 0.6; }
          60%  { opacity: 1; }
          100% { backdrop-filter: blur(0); -webkit-backdrop-filter: blur(0); opacity: 1; }
        }
        @keyframes qqIntroEntrySweep {
          0%   { transform: translateX(0); opacity: 0; }
          25%  { opacity: 1; }
          100% { transform: translateX(280%); opacity: 0; }
        }
        @keyframes qqIntroLightFlash {
          0%   { opacity: 0; }
          25%  { opacity: 1; }
          100% { opacity: 0; }
        }
        /* 2026-05-06: cozier Sonnenaufgang statt Lichtblitz. Langsamer, weicher,
           radial-pulse von Center. */
        @keyframes qqIntroSunrise {
          0%   { opacity: 0;   transform: scale(0.85); }
          40%  { opacity: 0.7; transform: scale(1.05); }
          100% { opacity: 0;   transform: scale(1.25); }
        }
        /* Lichter-Schwarm-Burst — einmal hell aufblitzen, dann fade-out. */
        @keyframes qqIntroFireflyBurst {
          0%   { opacity: 0;   transform: translate(-50%, -50%) scale(0.6); }
          30%  { opacity: 1;   transform: translate(-50%, -50%) scale(1.6); }
          100% { opacity: 0;   transform: translate(-50%, -50%) scale(2.2); }
        }
        @keyframes qqIntroFireflyDrift {
          0%, 100% { opacity: 0.35; transform: translate(0, 0) scale(0.9); }
          25%      { opacity: 1;    transform: translate(8px, -10px) scale(1.1); }
          50%      { opacity: 0.6;  transform: translate(-6px, -18px) scale(1); }
          75%      { opacity: 0.9;  transform: translate(10px, -8px) scale(1.05); }
        }
        @keyframes qqIntroSubLetter {
          0%   { opacity: 0; transform: translateY(-12px); letter-spacing: 0.8em; filter: blur(8px); }
          100% { opacity: 0.92; transform: translateY(0); letter-spacing: 0; filter: blur(0); }
        }
        /* 2026-05-09 (Wolf-Wunsch 'CozyQuiz in App-Card prominent'): Card poppt
           rein nach Sunrise-Light. Subtle scale+blur fuer Stage-Entry. */
        @keyframes qqIntroWelcomeCard {
          0%   { opacity: 0; transform: translateY(20px) scale(0.92); filter: blur(8px); }
          60%  { opacity: 1; transform: translateY(-3px) scale(1.02); filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes qqIntroLineExpand {
          0%   { opacity: 0; transform: scaleX(0); }
          100% { opacity: 0.85; transform: scaleX(1); }
        }
        @keyframes qqIntroEurovisionPop {
          0%   { opacity: 0; transform: translateY(8px) scale(0.85); }
          70%  { opacity: 1; transform: translateY(-2px) scale(1.06); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        /* 2026-05-07 v17 (Wolf 'nicer als nur blinken — schau dir mal das gif
           auf dem desktop an'): mehrstufige Animation mit Tilt + Multi-Layer-
           Glow-Pulse + leichter Color-Shift Rosa→Weiss. Cycle 3.5s. */
        @keyframes qqStingerXShine {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            color: #fde6f0;
            text-shadow: 0 2px 10px rgba(0,0,0,0.5);
          }
          25% {
            transform: scale(1.10) rotate(8deg);
            color: #fff;
            text-shadow: 0 2px 10px rgba(0,0,0,0.5),
                         0 0 14px rgba(255,255,255,0.85),
                         0 0 28px rgba(255,45,123,0.55);
          }
          50% {
            transform: scale(1.22) rotate(0deg);
            color: #fff;
            text-shadow: 0 2px 10px rgba(0,0,0,0.5),
                         0 0 28px rgba(255,255,255,0.95),
                         0 0 56px rgba(255,45,123,0.75),
                         0 0 96px rgba(168,85,247,0.45);
          }
          75% {
            transform: scale(1.10) rotate(-8deg);
            color: #fff;
            text-shadow: 0 2px 10px rgba(0,0,0,0.5),
                         0 0 14px rgba(255,255,255,0.85),
                         0 0 28px rgba(255,45,123,0.55);
          }
        }
        /* Backwards-compat alias falls noch wo verwendet. */
        @keyframes qqStingerXShimmer {
          0%, 100% { transform: scale(1);    text-shadow: 0 2px 10px rgba(0,0,0,0.5); }
          50%      { transform: scale(1.18); text-shadow: 0 2px 10px rgba(0,0,0,0.5), 0 0 24px rgba(255,255,255,0.85); }
        }
        /* Subtle vertical hover-float fuer Stinger-Logos. */
        @keyframes qqStingerHover {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes qqIntroAccentShimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes qqIntroTitleLetter {
          0%   { opacity: 0; transform: translateY(40px) scale(0.4); filter: blur(14px); }
          55%  { opacity: 1; transform: translateY(-6px) scale(1.08); filter: blur(0); }
          80%  { transform: translateY(2px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes qqIntroTitleSettle {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.015); }
        }
        @keyframes qqIntroTitleShimmer {
          0%   { background-position: -120% 0; opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { background-position:  120% 0; opacity: 0; }
        }
        @keyframes qqIntroWolfStack {
          0%   { opacity: 0; transform: translateY(36px); filter: blur(8px); }
          60%  { opacity: 1; filter: blur(0); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes qqIntroBubbleBob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        /* 2026-05-08 (Welcome-Polish): Word-Stagger fuer Sprechblasen-Greeting.
           Macht den Wolf-Auftritt lebendig — wie wenn er wirklich spricht. */
        @keyframes qqWordFadeUp {
          0%   { opacity: 0; transform: translateY(10px); filter: blur(3px); }
          100% { opacity: 1; transform: translateY(0);    filter: blur(0); }
        }
      `}</style>
      </>
      )}
    </BeamerOverlay>
  );
}

// ─── RulesIntroOverlay ──────────────────────────────────────────────────────
// Zwischen-Folie: "Jetzt kommen die Regeln — gut aufpassen!"
// Aktiv bei rulesSlideIndex === -1. Crossfade vom Willkommen rein, in die
// erste Regel-Folie raus. Kühlere Palette (blau/violett) als Kontrast zum
// warmen Welcome, damit der Übergang auch farblich spürbar ist.
function RulesIntroOverlay({ language, visible, eurovisionMode }: {
  language: QQLanguage; visible: boolean; eurovisionMode?: boolean;
}) {
  const lang = useLangFlip(language);
  const headline = lang === 'en' ? 'Now the rules' : 'Jetzt kommen die Regeln';
  const sub = lang === 'en' ? 'Pay close attention!' : 'Gut aufpassen!';
  // 2026-05-10 (Audit-P0 Eurovision-Konsistenz): accent themed via getBrandColors.
  const accent = getBrandColors(eurovisionMode).accentHex;
  const themed = isThemed();
  return (
    <BeamerOverlay
      visible={visible}
      zIndex={9988}
      hiddenScale={0.98}
      background={themed ? 'var(--qq-bg)' : 'radial-gradient(ellipse at center, rgba(31,26,46,0.96) 0%, rgba(20,16,31,0.98) 55%, rgba(10,8,20,1) 100%)'}
    >
      {/* Hintergrund-Glow — Brand-Pink (Eurovision: ESC-Pink) */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: '140vmin', height: '140vmin',
        transform: 'translate(-50%, -50%)',
        background: `radial-gradient(circle, rgba(${getBrandColors(eurovisionMode).accentRgb},0.22) 0%, rgba(162,18,71,0.12) 40%, transparent 65%)`,
        filter: 'blur(10px)',
        animation: visible ? 'qqRulesIntroGlow 3.6s ease-out both' : 'none',
        pointerEvents: 'none',
      }} />
      {/* Card — gleiche Struktur wie Rules-Slides (RulesView) */}
      <div style={{
        position: 'relative', zIndex: 5,
        maxWidth: 1200, width: '94%',
        background: themed ? 'var(--qq-card-bg)' : 'rgba(15,12,9,0.85)',
        border: themed ? 'var(--qq-card-border)' : `2px solid ${accent}44`,
        borderRadius: themed ? 'var(--qq-card-radius)' : 24,
        padding: 'clamp(40px, 6cqh, 80px) clamp(40px, 6cqw, 96px)',
        boxShadow: themed ? 'var(--qq-card-shadow)' : `0 0 120px ${accent}22, 0 16px 48px rgba(0,0,0,0.6)`,
        backdropFilter: 'blur(10px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 'clamp(14px, 2cqh, 24px)', textAlign: 'center',
      }}>
        {/* 2026-05-05 v2 (Wolf 'Buch bouncen, sync zum Title-Wave'):
            Entry-Animation + continuous qqCatNameWave. */}
        <div style={{
          fontSize: 'clamp(64px, 9cqw, 110px)', lineHeight: 1,
          display: 'inline-block',
          animation: visible
            ? 'qqRulesIntroIcon 1.1s cubic-bezier(0.2,0.9,0.3,1.3) 0.2s both, qqCatNameWave 2.4s ease-in-out 1.3s infinite'
            : 'none',
          filter: `drop-shadow(0 6px 24px ${accent}66)`,
        }}>📖</div>
        {/* Eyebrow — analog Rules-Slides "Spielregeln" */}
        <div style={{
          fontSize: 'clamp(13px,1.4cqw,18px)', fontWeight: 900, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: `${accent}88`,
        }}>
          {lang === 'de' ? 'Vorbereitung' : 'Get Ready'}
        </div>
        {/* Title — Letter-Cascade analog Rules-Slides */}
        <div
          aria-label={headline}
          style={{
            display: 'inline-flex',
            fontSize: 'clamp(44px, 7cqw, 88px)', fontWeight: 900,
            lineHeight: 1.05, letterSpacing: '-0.01em',
            color: themed ? 'var(--qq-card-text)' : accent,
            textShadow: themed ? 'none' : `0 0 60px ${accent}44`,
          }}
        >
          {Array.from(headline).map((char, i) => (
            <span key={i} style={{
              display: 'inline-block',
              opacity: 0,
              animation: visible
                ? `qqRulesTitleLetter 0.7s cubic-bezier(0.16, 1.2, 0.3, 1) ${0.3 + i * 0.05}s both, qqCatNameWave 2.4s ease-in-out ${1.4 + i * 0.08}s infinite`
                : 'none',
              whiteSpace: 'pre',
            }}>{char === ' ' ? ' ' : char}</span>
          ))}
        </div>
        {/* Divider — gleicher Style wie Rules-Slides */}
        <div style={{
          width: '100%', height: 3, borderRadius: 2,
          background: `linear-gradient(90deg, transparent, ${accent}cc 50%, transparent)`,
          backgroundSize: '200% 100%',
          animation: visible ? 'lineShimmer 3s linear 1.4s infinite' : 'none',
          boxShadow: `0 0 18px ${accent}44`,
        }} />
        {/* Subtitle */}
        <div style={{
          fontSize: 'clamp(22px,3cqw,40px)', fontWeight: 700,
          letterSpacing: '0.05em',
          color: themed ? 'var(--qq-card-text)' : QQ_COLORS.slate200,
          textShadow: themed ? 'none' : '0 2px 12px rgba(0,0,0,0.4)',
          animation: visible ? 'qqRulesIntroSub 0.8s cubic-bezier(0.2,0.8,0.4,1) 0.95s both' : 'none',
        }}>{sub}</div>
      </div>
      <style>{`
        @keyframes qqRulesIntroGlow {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          60% { opacity: 1; transform: translate(-50%, -50%) scale(1.0); }
          100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.08); }
        }
        @keyframes qqRulesIntroIcon {
          0% { opacity: 0; transform: translateY(18px) scale(0.6) rotate(-8deg); }
          65% { transform: translateY(-4px) scale(1.08) rotate(3deg); }
          100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
        }
        @keyframes qqRulesIntroHeadline {
          0% { opacity: 0; transform: translateY(24px) scale(0.92); filter: blur(8px); }
          55% { filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes qqRulesIntroSub {
          0% { opacity: 0; transform: translateY(10px); letter-spacing: 0.22em; }
          100% { opacity: 1; transform: translateY(0); letter-spacing: 0.08em; }
        }
      `}</style>
    </BeamerOverlay>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// LOBBY
// ═══════════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════════
// TEAMS REVEAL — einmalige epische Team-Vorstellung nach Rules, vor Phase 1
// ═══════════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════════
// ROUND MINI TREE — 5 Kategorie-Dots der aktuellen Runde, Wolf auf aktuellem Dot.
// Bei Fragewechsel gleitet der Wolf durch CSS-transition zum neuen Dot.
// ═══════════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════════
// TEAM ANSWER REVEAL — shared block rendered in right panel
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// PLACEMENT VIEW
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════

// Comeback-Drama-Moment.
export function WolfUeberraschtWithBubble({ lang, eurovisionMode }: { lang: 'de' | 'en'; eurovisionMode?: boolean }) {
  // 2026-05-07 v8 (Wolf 'gib dem wolf eurovision sprueche'): ESC-Drama-Pool
  // mit Französisch/Englisch-Mix wie auf der ESC-Buehne. 'Quel choc!' /
  // 'Mon dieu!' bringen den Watchparty-Vibe, beim Comeback-Surprise-Moment.
  const slogans: Slogan[] = eurovisionMode
    ? (lang === 'de'
        ? [
            { text: 'Quel choc!', mouths: 2 },
            { text: 'Mon dieu!', mouths: 2 },
            { text: 'Sensationell!', mouths: 3 },
            { text: 'Ein Comeback!', mouths: 3 },
            { text: 'Magnifique!', mouths: 3 },
          ]
        : [
            { text: 'Quel choc!', mouths: 2 },
            { text: 'Mon dieu!', mouths: 2 },
            { text: 'Sensational!', mouths: 3 },
            { text: 'A comeback!', mouths: 3 },
            { text: 'Magnifique!', mouths: 3 },
          ])
    : (lang === 'de'
        ? [
            { text: 'Was?!', mouths: 1 },
            { text: 'Krass!', mouths: 1 },
            { text: 'Ohhh!', mouths: 1 },
            { text: 'Echt jetzt?', mouths: 3 },
            { text: 'Holla!', mouths: 2 },
          ]
        : [
            { text: 'What?!', mouths: 1 },
            { text: 'Whoa!', mouths: 1 },
            { text: 'No way!', mouths: 2 },
            { text: 'Really?', mouths: 2 },
            { text: 'Wild!', mouths: 1 },
          ]);
  const [idx, setIdx] = useState(0);
  // 2026-05-07 v14 (Bug-Fix): safe index — siehe WolfLobbyGreeter.
  const slogan = slogans[idx % Math.max(1, slogans.length)] ?? slogans[0] ?? { text: '', mouths: 2 };
  const speakMs = Math.min(3000, Math.max(1100, slogan.mouths * 500));
  const enterMs = 200;
  const exitMs = 400;
  const gapMs = 500;
  const totalMs = enterMs + speakMs + exitMs + gapMs;
  useEffect(() => {
    const id = window.setTimeout(() => {
      setIdx(p => (p + 1) % slogans.length);
    }, totalMs);
    return () => window.clearTimeout(id);
  }, [idx, totalMs, slogans.length]);
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
      gap: 14, pointerEvents: 'none',
    }}>
      <SpeechBubble
        text={slogan.text}
        bubbleKey={idx}
        enterMs={enterMs}
        speakMs={speakMs}
        exitMs={exitMs}
        eurovisionMode={eurovisionMode}
      />
      <AnimatedCozyWolf widthCss="clamp(120px, 12cqw, 180px)" mode="ueberrascht" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAUSED — Records / Leaderboard display
// ═══════════════════════════════════════════════════════════════════════════════

export type LeaderEntry = { name: string; wins: number; games: number; avatarId?: string | null; lastPlayedAt?: number | null };
export type FunStats = {
  highestScore: { teamName: string; score: number; draftTitle: string } | null;
  closestGame: { teams: string[]; gap: number; draftTitle: string } | null;
  winStreak: { teamName: string; streak: number } | null;
  mostGames: { teamName: string; games: number } | null;
  fastestAnswer: { teamName: string; text: string; questionText: string; ms: number } | null;
  funnyAnswers: Array<{ teamName: string; text: string; questionText: string }>;
  // Erweiterte Stats
  jokerKing?: { teamName: string; total: number } | null;
  stealMaster?: { teamName: string; total: number } | null;
  potatoBoss?: { teamName: string; total: number } | null;
  comebackKing?: { teamName: string; total: number } | null;
  underdog?: { teamName: string; games: number; wins: number } | null;
  speedDemon?: { teamName: string; avgRank: number; samples: number } | null;
  categoryMasters?: Array<{ teamName: string; category: string; count: number }>;
  perfectRounds?: Array<{ teamName: string; draftTitle: string }>;
  todayStats?: {
    games: number;
    topScore: { teamName: string; score: number; draftTitle: string } | null;
    topWinner: { teamName: string; wins: number } | null;
  } | null;
};

// WolfCoModerator — Sprechblase + animierter Wolf als Co-Moderator-Paar.
// Zykelt durch Sprueche, Wolf-Mund-Flap synchron zur aktiven Sprechblase
// (winken-Variant). Sprueche-Set haengt vom variant ab.
//
// 2026-05-06 v4 (Wolf 'sprechblase ist nicht zu, vlt mehrere groessen je
// nach textlaenge, schoener machen, mund passend zum text bewegen'):
//  - Sprechblase mit SVG-Tail (V offen oben → bubble border-bottom IST die
//    obere Kante des Tails, dadurch keine Naht).
//  - Tail-Position dynamisch: ueber dem Wolf-Maul (bei winken+links-Layout
//    rechts-orientiert ~30% von links).
//  - Bubble-Width adaptiv: min/max + natural wrap statt nowrap, kurze
//    Sprueche bleiben kompakt.
//  - speakDuration aus Slogan-Laenge berechnet (~80ms pro Zeichen, min 1.6s,
//    max 4.5s) → wird als externes speaking-Gate an AnimatedCozyWolf
//    durchgereicht.
type CoModeratorVariant = 'preGame' | 'pause';
// Slogan + erwartete offene Mundbewegungen (Wolf-getunte Werte 2026-05-06).
// Pace: speakMs = mouths × 440ms. Internal Wolf-Toggle 220ms → eine offene
// Mundbewegung (open-close-Cycle) pro Silbe.
export type Slogan = { text: string; mouths: number };

export function WolfCoModerator({ lang, variant, widthCss, eurovisionMode }: {
  lang: 'de' | 'en';
  variant: CoModeratorVariant;
  widthCss: string;
  /** 2026-05-07 (Wolf-ESC): bei true → Wolf haelt EU-Flagge (statt trinken/winken). */
  eurovisionMode?: boolean;
}) {
  // 2026-05-07 v8 (Wolf 'gib dem wolf eurovision sprueche'): ESC-Slogan-Pool
  // pro variant. Pause = Watchparty-Pause-Witze, preGame = Show-Anmoderation.
  const slogans: Slogan[] = eurovisionMode
    ? (variant === 'pause'
        ? (lang === 'de'
            ? [
                { text: 'Pinkelpause vor dem Finale!', mouths: 5 },
                { text: 'Schnell Sekt nachfüllen!', mouths: 4 },
                { text: 'Wer ist euer Favorit?', mouths: 4 },
                { text: 'Outfit-Check beim Nachbarn!', mouths: 5 },
                { text: 'Gleich geht das Voting weiter!', mouths: 6 },
                { text: 'Stay tuned, Europe!', mouths: 4 },
              ]
            : [
                { text: 'Bathroom break before the final!', mouths: 6 },
                { text: 'Top up the bubbly!', mouths: 4 },
                { text: 'Who\'s your favourite?', mouths: 4 },
                { text: 'Check those outfits!', mouths: 4 },
                { text: 'Voting resumes shortly!', mouths: 5 },
                { text: 'Stay tuned, Europe!', mouths: 4 },
              ])
        : (lang === 'de'
            ? [
                { text: 'Bonsoir mes amis!', mouths: 4 },
                { text: 'Bereit für die Show?', mouths: 4 },
                { text: 'Jury und Publikum bereit?', mouths: 5 },
                { text: 'Lasst die Show beginnen!', mouths: 5 },
                { text: 'Wer holt heute 12 Punkte?', mouths: 6 },
                { text: 'Gleich gibt es Drama!', mouths: 4 },
              ]
            : [
                { text: 'Bonsoir mes amis!', mouths: 4 },
                { text: 'Ready for the show?', mouths: 4 },
                { text: 'Jury and audience ready?', mouths: 5 },
                { text: 'Let the show begin!', mouths: 4 },
                { text: 'Who scores douze points?', mouths: 5 },
                { text: 'Drama is coming!', mouths: 4 },
              ]))
    : (variant === 'pause'
        ? (lang === 'de'
            ? [
                { text: 'Habt ihr noch Getränke?', mouths: 4 },
                { text: 'Muss noch jemand?', mouths: 3 },
                { text: 'Dehnen erlaubt!', mouths: 2 },
                { text: 'Schon einen Snack besorgt?', mouths: 4 },
                { text: 'Kurz die Beine vertreten?', mouths: 4 },
                { text: 'Wer hat den nächsten Sieg im Kopf?', mouths: 6 },
              ]
            : [
                { text: 'Anyone need a drink?', mouths: 3 },
                { text: 'Bathroom break time?', mouths: 3 },
                { text: 'Stretch a bit!', mouths: 2 },
                { text: 'Snacks topped up?', mouths: 2 },
                { text: 'Quick walk?', mouths: 2 },
                { text: 'Who\'s plotting the next win?', mouths: 4 },
              ])
        : (lang === 'de'
            ? [
                { text: 'Bereit?', mouths: 2 },
                { text: 'Macht\'s euch bequem', mouths: 4 },
                { text: 'Snacks bereit?', mouths: 3 },
                { text: 'Gleich gibt\'s was zu rätseln', mouths: 5 },
                { text: 'Sind alle da?', mouths: 3 },
                { text: 'Spitzt die Ohren!', mouths: 3 },
              ]
            : [
                { text: 'Ready?', mouths: 2 },
                { text: 'Get comfy', mouths: 3 },
                { text: 'Snacks ready?', mouths: 3 },
                { text: 'Quiz time soon!', mouths: 3 },
                { text: 'Everyone here?', mouths: 3 },
                { text: 'Ears up!', mouths: 2 },
              ]));

  const [idx, setIdx] = useState(0);
  // 2026-05-07 v14 (Bug-Fix): safe index — siehe WolfLobbyGreeter.
  const slogan = slogans[idx % Math.max(1, slogans.length)] ?? slogans[0] ?? { text: '', mouths: 2 };

  // Sprechblase-Lebenszyklus: enter (250ms) → speak (speakMs) → exit (450ms)
  // → gap (550ms) → next. SpeakMs aus mouths × 440 (passt zu internem
  // 220ms-Wolf-Toggle: 1 offene Mundbewegung pro Silbe).
  const speakMs = Math.min(4500, Math.max(1300, slogan.mouths * 440));
  const enterMs = 250;
  const exitMs = 450;
  const gapMs = 550;
  const totalMs = enterMs + speakMs + exitMs + gapMs;

  useEffect(() => {
    const id = window.setTimeout(() => {
      setIdx(p => (p + 1) % slogans.length);
    }, totalMs);
    return () => window.clearTimeout(id);
  }, [idx, totalMs, slogans.length]);

  // External speaking-Gate fuer den Wolf-Mund-Flap. true nur waehrend
  // Speak-Window (nach enter, vor exit). Der Wolf-Mund klappt dann nur,
  // solange die Sprechblase wirklich da ist und 'spricht'.
  const [speakingNow, setSpeakingNow] = useState(false);
  useEffect(() => {
    setSpeakingNow(false);
    const t1 = window.setTimeout(() => setSpeakingNow(true), enterMs);
    const t2 = window.setTimeout(() => setSpeakingNow(false), enterMs + speakMs);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [idx, enterMs, speakMs]);

  const wolfMode: WolfMode = eurovisionMode
    ? 'flagge'
    : (variant === 'pause' ? 'trinken' : 'winken');
  // 2026-05-07 (Wolf-ESC): flagge-Mode hat speak-Frames — speaking-Gate auch
  // im pause-variant durchreichen (sonst kein Mund-Flap zur Sprechblase).
  const speakingProp = (variant === 'preGame' || eurovisionMode) ? speakingNow : undefined;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
      // 2026-05-06 v5 (Wolf-Bug 'blitzt im BG vom Wolf'): Gap 6→14 — der
      // Wolf hat drop-shadow(0 10px 30px) mit ~30px Blur-Radius, der bis
      // 24px in den Bubble-Bereich reichte. Backdrop-Filter der Bubble
      // hat die feinen Halo-Veraenderungen vom Frame-Wechsel zu sichtbarem
      // Flicker magnifiziert. Mehr Abstand → Halo erreicht Bubble nicht.
      gap: 14,
      pointerEvents: 'none',
    }}>
      <SpeechBubble
        text={slogan.text}
        bubbleKey={idx}
        enterMs={enterMs}
        speakMs={speakMs}
        exitMs={exitMs}
        eurovisionMode={eurovisionMode}
      />
      <AnimatedCozyWolf
        widthCss={widthCss}
        mode={wolfMode}
        speaking={speakingProp}
      />
    </div>
  );
}

// SpeechBubble — geschlossene Sprechblase mit SVG-V-Tail, der nahtlos
// unter der Bubble-Bottom-Border haengt. Adaptive Breite (min/max +
// natural wrap), warmes Cozy-Theme, sanfte Enter/Exit-Animation.
//
// Tail-Trick: Open SVG-Path "M 0 0 L 11 12 L 22 0" — Fill schliesst implizit
// (Dreieck), Stroke folgt aber nur dem V (nicht der oberen Linie).
// Dadurch ueberlappt sich die obere Kante der Tail-Fuellung mit der
// Bubble-Bottom-Border, und die V-Stroke-Farbe matcht die Bubble-Border.
export function SpeechBubble({ text, bubbleKey, enterMs, speakMs, exitMs, tailSide = 'left', eurovisionMode, size = 'md' }: {
  text: string;
  bubbleKey: number | string;
  enterMs: number;
  speakMs: number;
  exitMs: number;
  tailSide?: 'left' | 'right';
  /** 2026-05-07 (Wolf 'mehr Pink+Blau, Set D'): wenn true, Bubble in ESC-
   *  Palette — Pink-Lila-BG, Pink-zu-Blau-Border, helles Rosa-Text. */
  eurovisionMode?: boolean;
  /** 2026-05-07 v18 (Wolf 'wolf und sprechbubble in lobby rechts oben darf
   *  groesser sein, sonst kann man das ueberhaupt nicht lesen'): 'lg' fuer
   *  die Lobby (Beamer-Distanz lesbar), 'md' fuer Wolf-Co-Mod (Pause/PreGame). */
  size?: 'md' | 'lg';
}) {
  const totalLifeMs = enterMs + speakMs + exitMs;
  const isLg = size === 'lg';
  return (
    <div
      key={bubbleKey}
      style={{
        position: 'relative',
        // Bei tail rechts kein left-Margin (Bubble ist rechts-aligned)
        marginLeft: tailSide === 'left' ? 14 : 0,
        marginRight: tailSide === 'right' ? 14 : 0,
        // Adaptive Breite: 1-Wort-Slogan kompakt, langer Slogan wraped
        // automatisch auf 2 Zeilen.
        minWidth: isLg ? 100 : 80,
        // 2026-05-07 v19 (Wolf 'da ueberlappt sich einiges oben rechts'):
        // 'lg' maxWidth 460 -> 360 damit die Bubble nicht in den Stinger
        // reicht. Bubble extends von Wolf nach links — bei 8 Teams + 280px
        // Wolf war 460px Reserve in den Title.
        maxWidth: isLg ? 360 : 320,
        background: eurovisionMode
          ? 'linear-gradient(140deg, rgba(45,22,68,0.94) 0%, rgba(31,15,61,0.94) 100%)'
          : 'linear-gradient(140deg, rgba(28,20,10,0.94) 0%, rgba(38,28,14,0.94) 100%)',
        border: eurovisionMode
          ? '2px solid rgba(255,45,123,0.7)'
          : '2px solid rgba(236,72,153,0.6)',
        borderRadius: isLg ? 24 : 20,
        padding: isLg ? '14px 24px' : '10px 18px',
        fontSize: isLg ? 'clamp(20px, 2.1cqw, 30px)' : 'clamp(14px, 1.45cqw, 20px)',
        fontWeight: 800,
        lineHeight: 1.25,
        letterSpacing: '0.005em',
        color: eurovisionMode ? '#fde6f0' : QQ_COLORS.brandPinkSoft,
        textAlign: 'center',
        // Soft inner highlight + ambient glow
        // 2026-05-06 v5: backdrop-filter raus — beim Bounce-In skaliert die
        // Bubble (1.02), der Blur muss pro Frame neu rechnen, und magnifiziert
        // jede minimale Aenderung im BG (z.B. Wolf-Halo) zu sichtbarem Flicker.
        // Bubble hat genug visuelle Tiefe ueber Gradient+Border+Shadow ohne Blur.
        boxShadow: eurovisionMode
          ? '0 8px 22px rgba(0,0,0,0.45), 0 0 22px rgba(255,45,123,0.30), inset 0 1px 0 rgba(255,180,210,0.12)'
          : '0 8px 22px rgba(0,0,0,0.45), 0 0 18px rgba(236,72,153,0.18), inset 0 1px 0 rgba(255,231,170,0.10)',
        // Animation: Enter-Bounce + lange Hold + Exit-Fade. Keyframe-Times
        // sind relativ zu totalLifeMs (CSS percentage).
        animation: `qqWolfBubbleLife ${totalLifeMs}ms cubic-bezier(0.34,1.56,0.64,1) both`,
      }}
    >
      {text}
      {/* SVG-Tail: V-Form unter der Bubble. Top-Linie offen → Bubble-
          Border-Bottom IST der oberer Rand des Tails. Stroke nur auf den
          V-Beinen. */}
      <svg
        aria-hidden
        width={22}
        height={13}
        viewBox="0 0 22 13"
        style={{
          position: 'absolute',
          // Tail-Position abhaengig von tailSide. Bei left: 32px von links
          // (ueber Wolf links unten). Bei right: 32px von rechts (ueber
          // Wolf rechts unten).
          ...(tailSide === 'left' ? { left: 32 } : { right: 32 }),
          top: '100%',
          marginTop: -1,
          overflow: 'visible',
          pointerEvents: 'none',
        }}
      >
        <path
          d="M 0 0 L 11 13 L 22 0"
          fill={eurovisionMode ? 'rgb(38,18,57)' : 'rgb(33,24,12)'}
          stroke={eurovisionMode ? 'rgba(255,45,123,0.7)' : 'rgba(236,72,153,0.6)'}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="butt"
        />
      </svg>
    </div>
  );
}

// Brand-Loop für PreGame: AnimatedCozyWolf + zyklischer Slogan
// Wichtig (User-Wunsch): Wolf-Position, Card-Größe und Text-Position bleiben STABIL
// beim Wechsel — nur der Text-Inhalt fadet weich aus/ein. Reservierte Höhe + absolute
// Positionierung des Slogans verhindern Layout-Shift bei unterschiedlichen Slogan-Längen.

// ─────────────────────────────────────────────────────────────────────────
// Final-Wager-Mechanik (Wolf 2026-05-09):
// FINAL_BETTING: Teams setzen Wetten — Beamer zeigt Submit-Counter + Atmosphäre
// FINAL_REVEAL: dramatische Score-Cascade (Eurovision-Style Score-Race)
// ─────────────────────────────────────────────────────────────────────────
// + verbleibende Kategorien. Mod-Space schaltet weiter zur nächsten Frage.



// ═══════════════════════════════════════════════════════════════════════════════
// GAME OVER — Notebook style
// ═══════════════════════════════════════════════════════════════════════════════


// 2026-05-07: TwelvePointsSticker-Component entfernt (Wolf-Feedback 'wirkt
// random eingesetzt'). Plus der inline-Aufruf hatte useLangFlip() in einem
// conditional-Branch, das verursachte React-error #310 (hook order kaputt
// wenn eurovisionMode-Flag zwischen Renders kippt). Wenn ESC-Punkte-Geste
// spaeter zurueck soll, separate Component mit Hooks im stabilen scope.

// 2026-05-09 v4 (Wolf-Feedback Live-Test 2): Sieger-Sticker → Action-Card-Stil
// (mit pinkem/Team-Color-Border + 3D-Look) für Konsistenz zum Spiel-UI.
// Awards komplett raus aus Thanks-Card, ziehen in News-Ticker als Recap-Items
// nach den Kategorie-Winnern. Wolf-Decorator weiter rechts (verdeckte vorher
// cozywolf.de-Text). Brand-Footer 🐺 → Custom WolfHeadIcon (cozywolf-Brand).

// 2026-05-10 (Wolf 'Variante X — Action-Card-XL Brand-Pattern'):
// ThanksColumnCard + ThanksColumnSubtitle entfernt — wurden nur vom alten
// 3-Spalten-ThanksView (Wolf · Sieger · QR) verwendet. Neue Hero-Action-Card
// hat alles inline (keine wiederverwendbare Spalten-Struktur mehr).

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

// UrgencyVignette jetzt in '../components/CozyQuizUrgencyVignette'.

// 2026-05-12 (Refactor): BeamerTimer extrahiert nach
// '../components/CozyQuizBeamerTimer' (siehe Import oben). Re-Export fuer
// externe Importer-Stabilitaet (kein File ausserhalb importiert es direkt,
// aber wenn doch — Pfad bleibt stabil).
export { BeamerTimer };


// MiniGrid (Z. 21552, ~20 Z.) gelöscht 2026-05-12: war tot in QQBeamerPage.
// QQModeratorPage hat eine eigene MiniGrid (lokal, andere Props), keine
// externe Verwendung der QQBeamerPage-Variante gefunden.
// GridDisplay (566 Z.) jetzt in '../components/CozyQuizGridDisplay'.
// Re-Export fuer externe Importer (QQBuiltinSlide, FinalRevealView in
// separate test pages):
export { GridDisplay };

// ScoreBar jetzt in '../components/CozyQuizScoreBar'.
export { ScoreBar };

// RulesView + buildRulesSlidesDe/En + RulesMiniGrid jetzt in
// '../components/CozyQuizRulesView'. Re-Export fuer externe Importer:
export { RulesView };

// PlacementView jetzt in '../components/CozyQuizPlacementView'.
export { PlacementView };

// ComebackView + SlotMachineNumber jetzt in '../components/CozyQuizComebackView'.
// WolfUeberraschtWithBubble bleibt in dieser Datei (oben mit export markiert),
// damit ComebackView es zurueck importieren kann (ESM circular OK).
export { ComebackView };

// ThanksView jetzt in '../components/CozyQuizThanksView'.
// AnimatedCozyWolf + WolfCoModerator bleiben in QQBeamerPage (export markiert)
// und werden zurueck-importiert (ESM circular OK).
export { ThanksView };

// GameOverView jetzt in '../components/CozyQuizGameOverView'.
// WolfJubelWithBubble mit-extrahiert (war ein Local-Helper nur fuer GameOver).
// SpeechBubble + Slogan type sind in QQBeamerPage exportiert worden.
export { GameOverView };

// ConnectionsBeamerView (+ alle Connections* Sub-Helpers) jetzt in
// '../components/CozyQuizConnectionsBeamerView'.
export { ConnectionsBeamerView };

// FinalBettingView jetzt in '../components/CozyQuizFinalBettingView'.
// FinalRoundRecapSlide + andere Final-Helpers bleiben in QQBeamerPage (werden
// auch von FinalRevealView genutzt — wandern mit dieser View in eigene Datei).
export { FinalBettingView };

// LobbyView jetzt in '../components/CozyQuizLobbyView'.
// WolfLobbyGreeter mit-extrahiert (Local-Helper nur fuer LobbyView).
// 7 externe Importer — Re-Export stabil.
export { LobbyView };

// TeamsRevealView jetzt in '../components/CozyQuizTeamsRevealView'.
// NICHT extern importiert, aber Re-Export fuer Konsistenz mit anderen Views.
export { TeamsRevealView };

// PausedView jetzt in '../components/CozyQuizPausedView'.
// BrandLoopPanel + PAUSE_CAT_ACCENT mit-extrahiert (nur dort genutzt).
// LeaderEntry + FunStats types + AnimatedCozyWolf + RoundMiniTree exportiert
// aus QQBeamerPage damit PausedView sie zurueck-importieren kann.
export { PausedView };

// FinalRevealView + 20+ Final-Helpers (FinalRoundRecapSlide, RecapScoreTickup,
// FinalWinsTracker, decodeFinalStep, SlotTransition, BetSlotTransition,
// FinalRevealSharedKeyframes, TitleHoldSlide, GridRevealSlide, BetRevealSlide,
// AwardsOverviewSlide, BetZeroGroupSlide, AwardFlipCard, RaceFinishHero,
// RaceFinalSlide, RaceTeamUnit, RaceSpeedLines, RaceStarryBackground,
// RaceCountdownOverlay, PodiumStepFinal, AWARD_DEFS) jetzt in
// '../components/CozyQuizFinalRevealView'. FinalRoundRecapSlide wird auch
// von BeamerView genutzt — Re-Export.
export { FinalRevealView, FinalRoundRecapSlide };

// QuestionView (Bug-Hot-Spot #1) + alle Reveal-Sub-Components jetzt in
// '../components/CozyQuizQuestionView' (~6.273 Z., grosster Single-Extract).
// Inkl. TeamAnswerReveal, Bluff* (8 Komponenten), OnlyConnectBeamerView,
// Top5Reveal, OrderReveal, SchaetzchenReveal, CozyGuessrReveal, Map-Wrapper.
// HotPotato* + MuchoOptionsReveal bleiben hier (export markiert) und werden
// von CozyQuizQuestionView zurueck-importiert (ESM circular OK).
export { QuestionView };

// PhaseIntroView (Bug-Hot-Spot #2) + RoundMiniTree + PHASE_INTRO_TIMING jetzt
// in '../components/CozyQuizPhaseIntroView'. RoundMiniTree wird auch von
// CozyQuizPausedView genutzt — re-exported aus dieser Datei.
export { PhaseIntroView, RoundMiniTree };

// CategoryParticles jetzt in '../components/CozyQuizCategoryParticles'.
// Fireflies + EurovisionHearts jetzt in '../components/CozyQuizAmbient'.
// Re-Exports fuer externe Importer-Stabilitaet:
export { Fireflies, EurovisionHearts };
export { CategoryParticles };

function ComebackOption({ icon, label, desc, color, cardBg: bg }: { icon: string; label: string; desc: string; color: string; cardBg?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 24, padding: '28px 36px', borderRadius: 24,
      background: bg ?? '#1B1510',
      border: `2px solid ${color}44`,
      boxShadow: `0 6px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04), 0 0 30px ${color}12`,
      flex: '1 1 0', minWidth: 200,
    }}>
      <span style={{ fontSize: 48, lineHeight: 1 }}><QQEmojiIcon emoji={icon}/></span>
      <div>
        <div style={{ fontWeight: 900, color, fontSize: 'clamp(22px, 2.5cqw, 30px)' }}>{label}</div>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 'clamp(17px, 1.8cqw, 22px)', color: QQ_COLORS.slate400, marginTop: 4 }}>{desc}</div>
      </div>
    </div>
  );
}

function LoadingScreen({ roomCode, connected }: { roomCode: string; connected: boolean }) {
  return (
    <div style={{
      minHeight: '100cqh', background: '#0A0814',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif", color: QQ_COLORS.slate200,
    }}>
      <style>{BEAMER_CSS}</style>
      <Fireflies />
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 5 }}>
        <div style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: 32, fontWeight: 900, marginBottom: 8,
          background: 'linear-gradient(135deg, #e2e8f0, #94a3b8)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          CozyQuiz
        </div>
        <div style={{ color: QQ_COLORS.slate700, marginBottom: 20, fontWeight: 700 }}>{bt.loading.room.de}: {roomCode}</div>
        {/* 2026-05-04 (Wolf #10): Spinner + besserer Wakeup-Hint statt nur Text. */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '3px solid rgba(236,72,153,0.18)',
            borderTopColor: QQ_COLORS.brandPink,
            animation: 'spin 0.9s linear infinite',
          }} />
          <div style={{ fontSize: 13, color: connected ? QQ_COLORS.green500 : QQ_COLORS.brandPink, fontWeight: 700 }}>
            {connected
              ? bt.loading.waiting.de
              : 'Server wird wach gemacht — gleich geht’s los'}
          </div>
        </div>
      </div>
    </div>
  );
}
