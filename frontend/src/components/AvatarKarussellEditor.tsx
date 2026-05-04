// 2026-05-04 (Wolf): Karussell-Avatar-Editor fuer /team-Setup.
// — Hero-Avatar in der Mitte (clamp 140-180px Disc)
// — Pfeile rechts/links + Touch-Swipe wechselt Slot-FARBE (Emoji bleibt)
// — Tap auf Hero oeffnet Bottom-Sheet mit allen verfuegbaren Emojis
// — 🎲-Random-Slot-Button drunter
// — Card-Border + Hintergrund nehmen aktuelle Slot-Farbe
// — Lobby-voll-Empty-State („Beim naechsten CozyQuiz wieder dabei")
//
// Ersetzt den alten 4×2-Avatar-Grid + separaten Emoji-Picker.

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { QQ_AVATARS } from '../../../shared/quarterQuizTypes';
import { getSet, MEGA_EMOJI_POOL } from '../avatarSets';
import { QQTeamAvatar } from './QQTeamAvatar';

type Props = {
  avatarId: string;
  setAvatarId: (id: string) => void;
  chosenEmoji: string | undefined;
  setChosenEmoji: (em: string | undefined) => void;
  takenAvatarIds: string[];
  takenEmojis: string[];
  activeSetId: string;
  serverEmojis?: string[];
  lang: 'de' | 'en';
};

const SPARKS = [
  { sx: '18px', sy: '-22px' }, { sx: '-18px', sy: '-22px' },
  { sx: '24px', sy: '0px' },  { sx: '-24px', sy: '0px' },
  { sx: '16px', sy: '18px' }, { sx: '-16px', sy: '18px' },
  { sx: '22px', sy: '-10px' },{ sx: '-22px', sy: '-10px' },
];

export function AvatarKarussellEditor({
  avatarId, setAvatarId, chosenEmoji, setChosenEmoji,
  takenAvatarIds, takenEmojis, activeSetId, serverEmojis, lang,
}: Props) {
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [pickedGreeting, setPickedGreeting] = useState<string>('Hi!');
  const [sheetOpen, setSheetOpen] = useState(false);
  // 2026-05-04 (Wolf): Idle-Wackler nach 15s ohne Interaktion → Aufmerksamkeits-
  // Boost dass Avatar tappbar ist. Reset bei jeder Aenderung.
  const [shouldWiggle, setShouldWiggle] = useState(false);
  const pickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  const greetings = lang === 'de' ? ['Hi!', 'Hallo!', 'Hey!'] : ['Hi!', 'Hey!', 'Yo!'];

  // 2026-05-04 (Wolf): bei 'all' ist der Pool jetzt der MEGA_EMOJI_POOL
  // (~140 kuratierte Emojis, frei waehlbar). Theme-Sets (Halloween/Pub/etc.)
  // behalten ihre fixen 8 Theme-Emojis. PNG-Sets brauchen keinen Pool.
  const set = getSet(activeSetId);
  const isPng = (set?.source ?? 'emoji') === 'png';
  const emojiPool: string[] = isPng
    ? []
    : (activeSetId === 'all'
        ? MEGA_EMOJI_POOL
        : (set?.avatars ?? []));
  const availableSlots = QQ_AVATARS.filter(a => !takenAvatarIds.includes(a.id));
  const allSlotsTaken = availableSlots.length === 0;
  const currentSlot = availableSlots.find(a => a.id === avatarId) ?? availableSlots[0];
  const myColor = currentSlot?.color ?? '#EAB308';
  const availableEmojis = emojiPool.filter(em => !takenEmojis.includes(em));
  const needsEmoji = !isPng && emojiPool.length > 0;
  const canTapAvatar = needsEmoji && availableEmojis.length > 0;

  const goToSlotIdx = (newIdx: number) => {
    if (availableSlots.length === 0) return;
    const idx = ((newIdx % availableSlots.length) + availableSlots.length) % availableSlots.length;
    const target = availableSlots[idx];
    if (!target) return;
    setAvatarId(target.id);
    setPickedId(target.id);
    setPickedGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
    if (pickTimer.current) clearTimeout(pickTimer.current);
    pickTimer.current = setTimeout(() => setPickedId(null), 1500);
  };
  const currentIdx = availableSlots.findIndex(a => a.id === avatarId);
  const goNext = () => goToSlotIdx((currentIdx < 0 ? 0 : currentIdx) + 1);
  const goPrev = () => goToSlotIdx((currentIdx < 0 ? 0 : currentIdx) - 1);
  const goRandom = () => {
    if (availableSlots.length <= 1) return;
    let pick = currentIdx;
    while (pick === currentIdx) pick = Math.floor(Math.random() * availableSlots.length);
    goToSlotIdx(pick);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartXRef.current;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientX ?? start;
    const dx = end - start;
    touchStartXRef.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx > 0) goPrev(); else goNext();
  };

  // Vibration als Tap-Feedback (Android Chrome/FF unterstuetzen es; iOS Safari
  // ignoriert silently). 25ms = kurzer Buzz.
  const buzz = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(25); } catch { /* swallow */ }
    }
  };

  // Idle-Wackler: nach 15s Inaktivitaet (ohne Slot-Wechsel oder Sheet-Open)
  // wackelt der Avatar einmal kurz — Aufmerksamkeits-Boost dass er tappbar ist.
  useEffect(() => {
    setShouldWiggle(false);
    const t = setTimeout(() => setShouldWiggle(true), 15000);
    return () => clearTimeout(t);
  }, [avatarId, sheetOpen, chosenEmoji]);

  if (allSlotsTaken) {
    return (
      <div style={{
        textAlign: 'center', padding: '24px 16px',
        borderRadius: 16,
        background: 'rgba(148,163,184,0.08)',
        border: '1px dashed rgba(148,163,184,0.3)',
      }}>
        <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 10 }}>🐺</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#FDE68A', marginBottom: 6 }}>
          {lang === 'de' ? 'Schade, alle Plätze sind voll!' : 'All seats taken!'}
        </div>
        <div style={{ fontSize: 14, color: '#94a3b8', fontWeight: 700, lineHeight: 1.45 }}>
          {lang === 'de'
            ? 'Beim nächsten CozyQuiz wieder dabei? Schau einfach vorbei.'
            : 'Join the next CozyQuiz! See you soon.'}
        </div>
      </div>
    );
  }

  const arrowBtnStyle: CSSProperties = {
    flexShrink: 0,
    width: 44, height: 44, borderRadius: '50%',
    border: `2px solid ${myColor}66`,
    background: 'rgba(0,0,0,0.35)',
    color: '#FDE68A', fontSize: 26, fontWeight: 900, lineHeight: 1,
    cursor: availableSlots.length <= 1 ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: availableSlots.length <= 1 ? 0.35 : 1,
    transition: 'border-color 0.4s ease',
  };

  return (
    <>
      {/* 2026-05-04 (Wolf): Haptik-/Aufmerksamkeits-Animationen lokal. */}
      <style>{`
        @keyframes qqAvatarHalo {
          0%   { transform: scale(1);    opacity: 0; }
          15%  { opacity: 0.55; }
          100% { transform: scale(1.32); opacity: 0; }
        }
        @keyframes qqAvatarWiggle {
          0%, 100% { transform: scale(1)    rotate(0deg); }
          25%      { transform: scale(1.04) rotate(-3deg); }
          75%      { transform: scale(1.02) rotate(3deg); }
        }
      `}</style>
      {/* Hero-Karussell */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8,
          padding: '20px 8px 18px',
          marginBottom: 12,
          borderRadius: 20,
          background: `linear-gradient(135deg, ${myColor}28, ${myColor}08)`,
          border: `1.5px solid ${myColor}55`,
          transition: 'background 0.45s ease, border-color 0.45s ease',
          userSelect: 'none',
          touchAction: 'pan-y',
        }}
      >
        <button
          type="button"
          onClick={goPrev}
          disabled={availableSlots.length <= 1}
          aria-label={lang === 'de' ? 'Vorherige Farbe' : 'Previous color'}
          style={arrowBtnStyle}
        >‹</button>

        <button
          type="button"
          onClick={() => {
            if (!canTapAvatar) return;
            buzz();
            setSheetOpen(true);
            setShouldWiggle(false);
          }}
          disabled={!canTapAvatar}
          aria-label={lang === 'de' ? 'Avatar-Emoji ändern' : 'Change avatar emoji'}
          style={{
            flex: '0 1 auto',
            position: 'relative',
            border: 'none', background: 'transparent',
            padding: 0,
            cursor: canTapAvatar ? 'pointer' : 'default',
            fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {/* Pulse-Halo-Ring — radial-pulse alle 4.5s in Slot-Farbe.
              Visueller Tap-Hint, sagt 'klick mich'. Nur wenn Avatar tappbar. */}
          {canTapAvatar && (
            <span aria-hidden style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              border: `2px solid ${myColor}`,
              pointerEvents: 'none',
              animation: 'qqAvatarHalo 4.5s ease-out infinite',
              opacity: 0,
            }} />
          )}
          {pickedId === avatarId && SPARKS.map((sp, si) => (
            <div key={si} style={{
              position: 'absolute', left: '50%', top: '50%', width: 6, height: 6,
              borderRadius: '50%', background: myColor, pointerEvents: 'none',
              boxShadow: `0 0 8px ${myColor}`,
              ['--sx' as string]: sp.sx, ['--sy' as string]: sp.sy,
              animation: 'tcAvatarSpark 0.55s ease-out forwards',
              animationDelay: `${si * 0.02}s`,
            }} />
          ))}
          {pickedId === avatarId && (
            <div style={{
              position: 'absolute', top: -4, right: 0,
              background: myColor, color: '#fff', fontWeight: 900,
              fontSize: 13, padding: '4px 10px',
              borderRadius: '14px 14px 14px 4px',
              boxShadow: `0 2px 8px ${myColor}88, 0 0 0 1.5px rgba(255,255,255,0.35) inset`,
              pointerEvents: 'none', zIndex: 5,
              transformOrigin: 'bottom left',
              animation: 'tcAvatarHi 1.4s ease-out forwards',
              letterSpacing: '0.5px',
            }}>{pickedGreeting}</div>
          )}
          <div style={{
            width: 'clamp(140px, 38vw, 180px)',
            height: 'clamp(140px, 38vw, 180px)',
            borderRadius: '50%',
            background: `radial-gradient(circle at 30% 28%, ${myColor}ff 0%, ${myColor}cc 60%, ${myColor}88 100%)`,
            boxShadow: `0 0 0 4px ${myColor}33, 0 12px 28px ${myColor}55, 0 6px 16px rgba(0,0,0,0.45)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.45s ease, box-shadow 0.45s ease',
            // 2026-05-04 (Wolf): Idle-Wackler nach 15s ohne Tap (qqAvatarWiggle
            // 0.8s einmalig). Sonst regulaerer cfloat-Atemzug.
            animation: shouldWiggle && canTapAvatar
              ? 'qqAvatarWiggle 0.8s ease-in-out 1, tcfloat 3.6s ease-in-out 0.8s infinite'
              : 'tcfloat 3.6s ease-in-out infinite',
            position: 'relative',
          }}>
            {needsEmoji && chosenEmoji ? (
              <span style={{
                fontSize: 'clamp(72px, 19vw, 96px)',
                lineHeight: 1,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
              }}>{chosenEmoji}</span>
            ) : (
              <QQTeamAvatar avatarId={avatarId} size={'clamp(120px, 33vw, 160px)'} />
            )}
          </div>
          {canTapAvatar && (
            <div style={{
              position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
              fontSize: 10, fontWeight: 900, color: '#FDE68A',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              opacity: 0.7,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}>
              {lang === 'de' ? '🖐 tap = Emoji ändern' : '🖐 tap = change emoji'}
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={goNext}
          disabled={availableSlots.length <= 1}
          aria-label={lang === 'de' ? 'Nächste Farbe' : 'Next color'}
          style={arrowBtnStyle}
        >›</button>
      </div>

      {/* 🎲 Random-Farbe-Button */}
      <button
        type="button"
        onClick={goRandom}
        disabled={availableSlots.length <= 1}
        style={{
          width: '100%',
          padding: '8px 14px', borderRadius: 10,
          border: `1.5px solid ${myColor}55`,
          background: `linear-gradient(135deg, ${myColor}22, ${myColor}08)`,
          color: '#FDE68A', fontSize: 13, fontWeight: 900,
          cursor: availableSlots.length <= 1 ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          opacity: availableSlots.length <= 1 ? 0.45 : 1,
          transition: 'border-color 0.4s ease',
          marginBottom: 14,
        }}
        title={lang === 'de' ? 'Zufällige freie Farbe' : 'Random free color'}
      >
        🎲 {lang === 'de' ? 'Zufalls-Farbe' : 'Random color'}
      </button>

      {/* Bottom-Sheet: Emoji-Auswahl */}
      {sheetOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSheetOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 79,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              animation: 'qqSheetFade 0.25s ease both',
            }}
          />
          {/* Sheet */}
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: 0,
            zIndex: 80,
            maxHeight: '78vh',
            background: 'linear-gradient(180deg, #1a1209 0%, #0d0a06 100%)',
            borderTop: `2px solid ${myColor}77`,
            borderRadius: '24px 24px 0 0',
            boxShadow: `0 -12px 40px rgba(0,0,0,0.6), 0 -4px 18px ${myColor}33`,
            padding: 'clamp(16px, 2.5vh, 24px) clamp(16px, 4vw, 28px) clamp(20px, 3vh, 32px)',
            animation: 'qqSheetSlideUp 0.32s cubic-bezier(0.34,1.56,0.64,1) both',
            overflowY: 'auto',
          }}>
            {/* Drag-Handle */}
            <div style={{
              width: 44, height: 4, borderRadius: 4,
              background: 'rgba(255,255,255,0.2)',
              margin: '0 auto 14px',
            }} />
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 14,
            }}>
              <div style={{
                fontSize: 16, fontWeight: 900, color: '#FDE68A',
                letterSpacing: '0.04em',
              }}>
                {lang === 'de' ? 'Avatar-Emoji wählen' : 'Pick avatar emoji'}
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label={lang === 'de' ? 'Schließen' : 'Close'}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#94a3b8', fontSize: 18, fontWeight: 900,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>
            </div>
            {/* Emoji-Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {availableEmojis.map((em, i) => {
                const sel = chosenEmoji === em;
                return (
                  <button
                    key={`${em}-${i}`}
                    type="button"
                    onClick={() => {
                      setChosenEmoji(em);
                      setSheetOpen(false);
                    }}
                    style={{
                      padding: '14px 4px', borderRadius: 14, cursor: 'pointer',
                      background: sel
                        ? `linear-gradient(135deg, ${myColor}33, ${myColor}14)`
                        : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${sel ? myColor : 'rgba(255,255,255,0.10)'}`,
                      fontSize: 32, lineHeight: 1,
                      fontFamily: 'inherit',
                      transition: 'all 0.18s',
                      boxShadow: sel ? `0 0 14px ${myColor}55` : 'none',
                    }}
                  >
                    {em}
                  </button>
                );
              })}
            </div>
          </div>
          <style>{`
            @keyframes qqSheetFade {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            @keyframes qqSheetSlideUp {
              from { transform: translateY(100%); }
              to   { transform: translateY(0); }
            }
          `}</style>
        </>
      )}
    </>
  );
}
