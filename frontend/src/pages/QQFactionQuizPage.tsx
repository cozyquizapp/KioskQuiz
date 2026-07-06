/**
 * QQFactionQuizPage — „Welches Team bist du?"-Reel (/welches-team).
 *
 * 2026-07-06 (Wolf-Idee + Social-Audit): das stärkste Share-/Kommentar-Format
 * („which one are you"). Zeigt die 8 Team-Typen (echte Wappen + Motto) je mit
 * einer „so spielst du"-Zeile → Zuschauer ordnet sich zu, kommentiert sein Team,
 * taggt Freunde. 9:16, Reel-Modus wie /trailer.
 * ⚠️ Wolf: Wort „Team" statt „Fraktion"; KEIN Bezug zu Brett/Feldern-Erobern —
 * die Team-Typen leben im Groß-Modus, der KEIN Spielbrett nutzt (nicht mit dem
 * Standard-CozyQuiz-Brett vermischen).
 */
import { useEffect, useRef, useState } from 'react';
import { QQ_MEGA_FACTIONS } from '@shared/quarterQuizTypes';
import { crestSrc } from '../cozyArenaCrests';

const PINK = '#ec4899';
const PINK_MID = '#f472b6';
const DISPLAY = "'Stinger Fit', 'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif";
const BODY = "'Nunito', 'Inter', system-ui, sans-serif";
const COZY_BG = 'radial-gradient(circle at 50% 0%, #1E2A5A 0%, #0F1530 60%, #0A0E22 100%)';
const cw = (pose: string) => `/avatars/cozywolf/${pose}.png`;

// Wappen-Farbe (aus cozyArenaCrests-Kommentaren) + „so spielst du"-Charakterzeile
// (Wolf-Stimme, KEIN Em-Dash — Kunden-Copy).
const FACTION_META: Record<string, { accent: string; char: string }> = {
  bauchgefuehl:  { accent: '#FB923C', char: 'Du tippst aus dem Bauch und liegst öfter richtig, als alle zugeben.' },
  glueckstreffer:{ accent: '#4ADE80', char: 'Keine Ahnung. Trotzdem die Punkte. Frag lieber nicht wie.' },
  feierabend:    { accent: '#2DD4BF', char: 'Gewinnen? Nett. Aber das kühle Getränk ist wichtiger.' },
  letztesekunde: { accent: '#A78BFA', char: 'Deine Antwort kommt, wenn der Timer schon blinkt. Jedes Mal.' },
  allwissen:     { accent: '#FACC15', char: 'Ihr kennt die Antwort, bevor die Frage zu Ende gelesen ist.' },
  improvisation: { accent: '#3B82F6', char: 'Kein Plan, aber viel Selbstbewusstsein. Läuft schon irgendwie.' },
  einspruch:     { accent: '#EC4899', char: 'Bei jeder Auflösung: „Moment, das ist total unfair!"' },
  risiko:        { accent: '#EF4444', char: 'Beim Finale wird alles gesetzt. Glorreich oder Totalschaden.' },
};

type Scene = { key: string; dur: number };
const SCENES: Scene[] = [
  { key: 'intro', dur: 3800 },
  ...QQ_MEGA_FACTIONS.map((_, i) => ({ key: `fac-${i}`, dur: 2900 })),
  { key: 'cta', dur: 4800 },
];

export default function QQFactionQuizPage() {
  const [scene, setScene] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reel, setReel] = useState(false);
  const [controls, setControls] = useState(true);
  const hideT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pokeControls = () => {
    setControls(true);
    if (hideT.current) clearTimeout(hideT.current);
    hideT.current = setTimeout(() => setControls(false), 3000);
  };
  useEffect(() => {
    if (reel) pokeControls();
    else if (hideT.current) clearTimeout(hideT.current);
    return () => { if (hideT.current) clearTimeout(hideT.current); };
  }, [reel]);

  useEffect(() => { document.title = 'CozyQuiz — Welches Team bist du?'; }, []);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setScene(s => (s + 1) % SCENES.length), SCENES[scene].dur);
    return () => clearTimeout(t);
  }, [scene, paused]);

  return (
    <div style={{
      minHeight: reel ? undefined : '100vh',
      ...(reel
        ? { position: 'fixed', inset: 0, zIndex: 9999, background: '#0A0E22', padding: 0, gap: 0 }
        : { background: '#0c0a14', gap: 14, padding: 10 }),
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: BODY,
    }}>
      <style>{KEYFRAMES}</style>

      <div style={{
        position: 'relative', aspectRatio: '9 / 16', containerType: 'size',
        overflow: 'hidden', background: COZY_BG, cursor: 'pointer',
        ...(reel
          ? { width: 'min(100vw, calc(100dvh * 9 / 16))', height: 'auto', maxHeight: '100dvh', borderRadius: 0, boxShadow: 'none' }
          : { height: 'min(94vh, calc(100vw * 16 / 9))', maxWidth: '100vw', borderRadius: 22, boxShadow: '0 24px 70px rgba(0,0,0,0.6)' }),
      }} onClick={() => reel ? pokeControls() : setPaused(p => !p)}>

        {reel && (
          <button onClick={(e) => { e.stopPropagation(); setReel(false); }} aria-label="Reel-Modus schließen" style={{
            position: 'absolute', top: '2.5cqh', right: '3.5cqw', zIndex: 30,
            width: '9cqw', height: '9cqw', borderRadius: '50%', border: 'none',
            background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '5cqw', fontWeight: 900,
            cursor: 'pointer', opacity: controls ? 1 : 0, transition: 'opacity 0.4s ease', display: 'grid', placeItems: 'center',
          }}>✕</button>
        )}

        {/* Fortschrittsbalken (10 Segmente) */}
        <div style={{ position: 'absolute', top: '2cqh', left: '3cqw', right: '3cqw', zIndex: 10, display: 'flex', gap: '0.7cqw' }}>
          {SCENES.map((s, i) => (
            <div key={s.key} style={{ flex: 1, height: '0.7cqh', borderRadius: 99, background: 'rgba(255,255,255,0.22)', overflow: 'hidden' }}>
              <div key={`${s.key}-${scene}-${paused}`} style={{
                height: '100%', borderRadius: 99, background: '#fff',
                width: i < scene ? '100%' : '0%',
                animation: i === scene && !paused ? `barFill ${s.dur}ms linear forwards` : 'none',
                ...(i < scene ? { width: '100%' } : {}),
              }} />
            </div>
          ))}
        </div>

        <div key={scene} style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          padding: '11cqh 7cqw', zIndex: 5, color: '#fff', animation: 'sceneIn 0.5s ease both',
        }}>
          {renderScene(SCENES[scene].key)}
        </div>

        {paused && !reel && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)' }}>
            <span style={{ fontSize: '14cqw' }}>▶︎</span>
          </div>
        )}
      </div>

      {!reel && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, maxWidth: 400 }}>
          <button onClick={() => setReel(true)} style={{
            appearance: 'none', border: 'none', background: PINK, color: '#fff', fontFamily: BODY, fontWeight: 900,
            fontSize: 15, padding: '11px 22px', borderRadius: 999, cursor: 'pointer', boxShadow: '0 8px 24px rgba(236,72,153,0.4)',
          }}>▶ Reel-Modus (randlos 9:16 fürs Aufnehmen)</button>
          <div style={{ color: '#8a86a0', fontSize: 13, fontWeight: 700, textAlign: 'center', lineHeight: 1.5 }}>
            Tippen = Pause · loopt automatisch (~33&nbsp;s).<br />
            Fürs Reel: <b style={{ color: '#c9c5da' }}>Reel-Modus</b> öffnen → am Handy mit der Bildschirmaufnahme abfilmen.
          </div>
        </div>
      )}
    </div>
  );
}

function renderScene(key: string) {
  if (key === 'intro') {
    return (
      <>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '4.2cqw', letterSpacing: '0.24em', opacity: 0.85, animation: 'fadeUp 0.5s ease both' }}>
          COZYQUIZ · 8 TEAM-TYPEN
        </div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '13cqw', lineHeight: 1.0, letterSpacing: '-0.02em', marginTop: '2cqh', animation: 'popIn 0.7s var(--eb) 0.15s both' }}>
          Welches<br />Team<br />bist du?
        </div>
        <div style={{ fontWeight: 800, fontSize: '5.2cqw', marginTop: '4cqh', opacity: 0.94, animation: 'fadeUp 0.6s ease 0.5s both' }}>
          Bleib dran, bis du dich <span style={{ color: PINK_MID }}>erkennst</span>.
        </div>
      </>
    );
  }

  if (key === 'cta') {
    return (
      <>
        <div style={{ position: 'relative', width: '38cqw', height: '38cqw', display: 'grid', placeItems: 'center', animation: 'popIn 0.7s var(--eb) both' }}>
          <div style={{ position: 'absolute', width: '84%', height: '84%', borderRadius: '50%', background: `radial-gradient(circle, ${PINK}55, transparent 68%)`, filter: 'blur(6px)' }} />
          <img src={cw('augenauf.troete.jubel')} alt="CozyWolf" style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 1.4cqh 1.8cqh rgba(0,0,0,0.45))', animation: 'floatPet 5s ease-in-out infinite' }} />
        </div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '10cqw', lineHeight: 1.02, marginTop: '3cqh', animation: 'popIn 0.7s var(--eb) 0.2s both' }}>
          Und? Welches<br />bist du?
        </div>
        <div style={{ fontWeight: 800, fontSize: '4.8cqw', marginTop: '3cqh', opacity: 0.92, maxWidth: '82cqw', lineHeight: 1.3, animation: 'fadeUp 0.6s ease 0.45s both' }}>
          Kommentier dein Team <span style={{ color: PINK_MID }}>👇</span> und tag jemanden, der genau SO spielt.
        </div>
        <div style={{ marginTop: '4.5cqh', display: 'flex', flexDirection: 'column', gap: '1.6cqh', fontWeight: 800, fontSize: '5cqw', animation: 'fadeUp 0.6s ease 0.7s both' }}>
          <span style={{ color: PINK_MID }}>@cozywolf.events</span>
          <span style={{ opacity: 0.92 }}>cozywolf.de</span>
        </div>
      </>
    );
  }

  // fac-N
  const idx = Number(key.slice(4));
  const f = QQ_MEGA_FACTIONS[idx];
  if (!f) return null;
  const meta = FACTION_META[f.slug] ?? { accent: PINK, char: '' };
  return (
    <>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '3.8cqw', letterSpacing: '0.2em', opacity: 0.7, animation: 'fadeUp 0.4s ease both' }}>
        TEAM {idx + 1} / 8
      </div>
      {/* Wappen */}
      <div style={{ position: 'relative', width: '46cqw', height: '46cqw', margin: '2.5cqh 0 3cqh', display: 'grid', placeItems: 'center', animation: 'crestPop 0.7s var(--eb) 0.1s both' }}>
        <div style={{ position: 'absolute', width: '90%', height: '90%', borderRadius: '50%', background: `radial-gradient(circle, ${meta.accent}55, transparent 66%)`, filter: 'blur(7px)' }} />
        <img src={crestSrc(f.slug)} alt={f.nameDe} style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 1.6cqh 2cqh rgba(0,0,0,0.5))', animation: 'floatPet 5s ease-in-out infinite' }} />
      </div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '11cqw', lineHeight: 1.0, color: meta.accent, animation: 'popIn 0.6s var(--eb) 0.25s both' }}>
        {f.nameDe}
      </div>
      <div style={{ display: 'inline-block', marginTop: '2cqh', fontWeight: 900, fontSize: '4.6cqw', color: '#fff', background: `${meta.accent}2e`, border: `0.35cqw solid ${meta.accent}`, borderRadius: '99px', padding: '0.5cqh 3cqw', animation: 'fadeUp 0.5s ease 0.45s both' }}>
        „{f.mottoDe}"
      </div>
      <div style={{ fontWeight: 700, fontSize: '4.6cqw', marginTop: '3.5cqh', opacity: 0.94, maxWidth: '80cqw', lineHeight: 1.32, animation: 'fadeUp 0.6s ease 0.6s both' }}>
        {meta.char}
      </div>
    </>
  );
}

const KEYFRAMES = `
  :root { --eb: cubic-bezier(0.2, 1.2, 0.3, 1); }
  @keyframes sceneIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(4cqh); } to { opacity: 1; transform: none; } }
  @keyframes popIn { 0% { opacity: 0; transform: scale(0.7); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes crestPop { 0% { opacity: 0; transform: scale(0.5) rotate(-8deg); } 100% { opacity: 1; transform: none; } }
  @keyframes barFill { from { width: 0%; } to { width: 100%; } }
  @keyframes floatPet { 0%, 100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-2.5cqh) rotate(3deg); } }
`;
