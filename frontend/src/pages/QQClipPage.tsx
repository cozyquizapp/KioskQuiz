/**
 * QQClipPage — Schätzfrage-Clip-Generator fürs tägliche TikTok/Reel (/clip).
 *
 * 2026-07-06 (Wolf): Reichweiten-Motor für Social. Reine SCHÄTZfrage (kein A/B/C
 * — Wolf: „bei schätzen brauchst du kein a,b,c"): Frage → Countdown → Reveal.
 * Der Reiz + die Reichweite kommen daraus, dass Leute ihre Schätzung KOMMENTIEREN.
 * 9:16, Reel-Modus wie /trailer (randlos → Handy-Screen-Record → TikTok).
 *
 * Content: Start-Fundus aus dem Stechen-Pool (QQ_TIEBREAKER_POOL) + eigene Frage
 * eintippbar (für lokale/aktuelle Fragen) oder via URL: /clip?q=…&a=…&unit=…&fact=…
 */
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QQ_TIEBREAKER_POOL } from '@shared/quarterQuizTypes';

const PINK = '#ec4899';
const PINK_MID = '#f472b6';
const DISPLAY = "'Stinger Fit', 'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif";
const BODY = "'Nunito', 'Inter', system-ui, sans-serif";
const COZY_BG = 'radial-gradient(circle at 50% 0%, #1E2A5A 0%, #0F1530 60%, #0A0E22 100%)';
const cw = (pose: string) => `/avatars/cozywolf/${pose}.png`;

type ClipQ = { q: string; a: number; unit?: string; fact?: string; visual?: 'eu-flag' };

// Fun-Facts zu den Stechen-Fragen (macht das Reveal teilbar). Key = target.
const FACTS: Record<number, string> = {
  12: 'Die 12 steht für Vollkommenheit, nicht für die Zahl der Länder.',
  1989: 'Am 9. November 1989, ausgelöst durch eine Panne auf einer Pressekonferenz.',
  206: 'Babys starten mit rund 300, viele wachsen später zusammen.',
  88: '52 weiße und 36 schwarze Tasten.',
  54: 'Der flächenmäßig zweitgrößte Kontinent.',
  64: '32 helle und 32 dunkle Felder.',
  86400: '60 × 60 × 24, merk dir das für die nächste Party.',
  330: 'Bei Hitze wächst er um bis zu 15 cm.',
  3: 'Zwei pumpen zu den Kiemen, eins durch den Körper.',
  32: 'Inklusive der vier Weisheitszähne.',
  13: 'Für die 13 Gründerstaaten, die 50 Sterne stehen für die Bundesstaaten.',
  90: 'Zweimal 45 Minuten, plus Nachspielzeit.',
  8: 'Seit Pluto 2006 zum Zwergplaneten wurde.',
  26: 'Von A bis Z — die Umlaute zählen nicht extra.',
  5: 'Die fünf Ringe stehen für die fünf Kontinente.',
};

const POOL: ClipQ[] = QQ_TIEBREAKER_POOL.map(e => ({
  q: e.promptDe,
  a: e.target,
  unit: (e as any).unitDe ?? undefined,
  fact: FACTS[e.target],
  // Spezial-Reveal: EU-Flagge nachbauen (blaues Rechteck + 12 Stern-Emojis).
  visual: e.promptDe.includes('Flagge der EU') ? ('eu-flag' as const) : undefined,
}));

type Scene = { key: 'ask' | 'reveal' | 'cta'; dur: number };
const SCENES: Scene[] = [
  { key: 'ask',    dur: 7000 },
  { key: 'reveal', dur: 5200 },
  { key: 'cta',    dur: 4200 },
];

const fmt = (n: number) => n.toLocaleString('de-DE');

export default function QQClipPage() {
  const [params] = useSearchParams();
  // Eigene Frage via URL? (?q=…&a=…&unit=…&fact=…)
  const urlQ = params.get('q');
  const urlA = params.get('a');
  const urlQuestion: ClipQ | null = urlQ && urlA && !Number.isNaN(Number(urlA))
    ? { q: urlQ, a: Number(urlA), unit: params.get('unit') ?? undefined, fact: params.get('fact') ?? undefined }
    : null;

  const [custom, setCustom] = useState<ClipQ | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const active: ClipQ = custom ?? urlQuestion ?? POOL[qIndex % POOL.length];

  const [scene, setScene] = useState(0);
  const [paused, setPaused] = useState(false);
  const [count, setCount] = useState(5);
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

  useEffect(() => { document.title = 'CozyQuiz — Schätzfrage-Clip'; }, []);

  // Szenen-Stepper (Loop, pausierbar).
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setScene(s => (s + 1) % SCENES.length), SCENES[scene].dur);
    return () => clearTimeout(t);
  }, [scene, paused]);

  // Countdown 5→0 während der Frage-Szene.
  useEffect(() => {
    if (SCENES[scene].key !== 'ask' || paused) return;
    setCount(5);
    const iv = setInterval(() => setCount(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(iv);
  }, [scene, paused, qIndex, custom]);

  const nextQuestion = () => { setCustom(null); setQIndex(i => i + 1); setScene(0); };

  return (
    <div style={{
      minHeight: reel ? undefined : '100vh',
      ...(reel
        ? { position: 'fixed', inset: 0, zIndex: 9999, background: '#0A0E22', padding: 0, gap: 0 }
        : { background: '#0c0a14', gap: 14, padding: 10 }),
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: BODY,
    }}>
      <style>{KEYFRAMES}</style>

      {/* 9:16-Frame */}
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

        {/* Fortschrittsbalken */}
        <div style={{ position: 'absolute', top: '2cqh', left: '4cqw', right: '4cqw', zIndex: 10, display: 'flex', gap: '1cqw' }}>
          {SCENES.map((s, i) => (
            <div key={s.key} style={{ flex: 1, height: '0.7cqh', borderRadius: 99, background: 'rgba(255,255,255,0.22)', overflow: 'hidden' }}>
              <div key={`${s.key}-${scene}-${paused}-${qIndex}`} style={{
                height: '100%', borderRadius: 99, background: '#fff',
                width: i < scene ? '100%' : '0%',
                animation: i === scene && !paused ? `barFill ${s.dur}ms linear forwards` : 'none',
                ...(i < scene ? { width: '100%' } : {}),
              }} />
            </div>
          ))}
        </div>

        {/* Szene */}
        <div key={`${scene}-${qIndex}-${custom ? 'c' : 'p'}`} style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          padding: '11cqh 7cqw', zIndex: 5, color: '#fff', animation: 'sceneIn 0.5s ease both',
        }}>
          {SCENES[scene].key === 'ask' && (
            <>
              <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '4.6cqw', letterSpacing: '0.22em', opacity: 0.85, animation: 'fadeUp 0.5s ease both' }}>
                SCHÄTZ MAL 🤔
              </div>
              <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '8.4cqw', lineHeight: 1.12, marginTop: '2.5cqh', animation: 'popIn 0.6s var(--eb) 0.1s both' }}>
                {active.q}
              </div>
              {/* Countdown-Ring im Quiz-Timer-Stil (Brand-konsistent): laeuft
                  ab statt zu drehen; Pink -> Orange -> Rot wie der Beamer-Timer. */}
              <div style={{ margin: '6cqh 0 4cqh', animation: 'popIn 0.5s var(--eb) 0.35s both' }}>
                <CountdownRing seconds={5} count={count} />
              </div>
              <div style={{ fontWeight: 800, fontSize: '5.2cqw', opacity: 0.96, animation: 'fadeUp 0.6s ease 0.6s both' }}>
                Kommentier deine Schätzung <span style={{ color: PINK_MID }}>👇</span>
              </div>
            </>
          )}

          {SCENES[scene].key === 'reveal' && (
            <>
              <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '4.6cqw', letterSpacing: '0.22em', opacity: 0.85, animation: 'fadeUp 0.5s ease both' }}>
                DIE ANTWORT
              </div>
              {active.visual === 'eu-flag' ? (
                <>
                  <div style={{ margin: '3cqh 0 2.5cqh', animation: 'popIn 0.6s var(--eb) 0.1s both' }}><EuFlag /></div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '2cqw', animation: 'fadeUp 0.5s ease 0.95s both' }}>
                    <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '15cqw', lineHeight: 1, color: '#fff', textShadow: `0 0 8cqw ${PINK}66` }}>{fmt(active.a)}</span>
                    <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '6.5cqw', color: PINK_MID }}>Sterne</span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '2cqw', marginTop: '2cqh', animation: 'popIn 0.7s var(--eb) 0.1s both' }}>
                  <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '22cqw', lineHeight: 1, color: '#fff', textShadow: `0 0 10cqw ${PINK}66` }}>{fmt(active.a)}</span>
                  {active.unit && <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '8cqw', color: PINK_MID }}>{active.unit}</span>}
                </div>
              )}
              {active.fact && (
                <div style={{
                  marginTop: '6cqh', maxWidth: '82cqw', background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.14)', borderRadius: '3.5cqw', padding: '3cqh 5cqw',
                  fontSize: '4.8cqw', fontWeight: 700, lineHeight: 1.35, animation: 'fadeUp 0.6s ease 0.5s both',
                }}>
                  <span style={{ color: PINK_MID, fontWeight: 900 }}>Fun Fact: </span>{active.fact}
                </div>
              )}
            </>
          )}

          {SCENES[scene].key === 'cta' && (
            <>
              <div style={{ position: 'relative', width: '38cqw', height: '38cqw', display: 'grid', placeItems: 'center', animation: 'popIn 0.7s var(--eb) both' }}>
                <div style={{ position: 'absolute', width: '84%', height: '84%', borderRadius: '50%', background: `radial-gradient(circle, ${PINK}55, transparent 68%)`, filter: 'blur(6px)' }} />
                <img src={cw('augenauf.troete.jubel')} alt="CozyWolf" style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 1.4cqh 1.8cqh rgba(0,0,0,0.45))', animation: 'floatPet 5s ease-in-out infinite' }} />
              </div>
              <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '9.5cqw', lineHeight: 1.02, marginTop: '3cqh', animation: 'popIn 0.7s var(--eb) 0.2s both' }}>
                Wie nah<br />warst du?
              </div>
              <div style={{ fontWeight: 800, fontSize: '4.8cqw', marginTop: '3cqh', opacity: 0.9, maxWidth: '80cqw', lineHeight: 1.3, animation: 'fadeUp 0.6s ease 0.45s both' }}>
                Folg für die tägliche Schätzfrage. Und spiel's live mit deinem Team.
              </div>
              <div style={{ marginTop: '4.5cqh', display: 'flex', flexDirection: 'column', gap: '1.6cqh', fontWeight: 800, fontSize: '5cqw', animation: 'fadeUp 0.6s ease 0.7s both' }}>
                <span style={{ color: PINK_MID }}>@cozywolf.events</span>
                <span style={{ opacity: 0.92 }}>cozywolf.de</span>
              </div>
            </>
          )}
        </div>

        {paused && !reel && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)' }}>
            <span style={{ fontSize: '14cqw' }}>▶︎</span>
          </div>
        )}
      </div>

      {/* Screen-only Steuerung */}
      {!reel && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 11, maxWidth: 440, width: '100%' }}>
          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={nextQuestion} style={btn('rgba(255,255,255,0.10)', '#fff', '1px solid rgba(255,255,255,0.18)')}>
              🎲 Nächste Frage
            </button>
            <button onClick={() => setReel(true)} style={btn(PINK, '#fff')}>
              ▶ Reel-Modus (aufnehmen)
            </button>
          </div>

          <CustomForm onApply={(q) => { setCustom(q); setScene(0); }} />

          <div style={{ color: '#8a86a0', fontSize: 12.5, fontWeight: 700, textAlign: 'center', lineHeight: 1.5 }}>
            Tippen aufs Bild = Pause · loopt automatisch (~16&nbsp;s).<br />
            Fürs Reel: <b style={{ color: '#c9c5da' }}>Reel-Modus</b> → am Handy per Bildschirmaufnahme abfilmen.
          </div>
        </div>
      )}
    </div>
  );
}

function btn(bg: string, color: string, border = 'none'): React.CSSProperties {
  return {
    appearance: 'none', border, background: bg, color, fontFamily: BODY, fontWeight: 900, fontSize: 14.5,
    padding: '10px 18px', borderRadius: 999, cursor: 'pointer',
    boxShadow: bg === PINK ? '0 8px 22px rgba(236,72,153,0.4)' : 'none',
  };
}

// Eigene Schätzfrage eintippen (für lokale/aktuelle Themen).
function CustomForm({ onApply }: { onApply: (q: ClipQ) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const [unit, setUnit] = useState('');
  const [fact, setFact] = useState('');
  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)',
    color: '#e2e8f0', fontFamily: BODY, fontSize: 14, outline: 'none',
  };
  if (!open) {
    return <button onClick={() => setOpen(true)} style={{ ...btn('transparent', '#a9a6c4', '1px dashed rgba(255,255,255,0.22)'), fontSize: 13 }}>✏️ Eigene Frage eintippen</button>;
  }
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: 14 }}>
      <input style={inp} placeholder="Frage (z.B. Wie viele Einwohner hat Köln?)" value={q} onChange={e => setQ(e.target.value)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={{ ...inp, flex: 2 }} inputMode="numeric" placeholder="Antwort (Zahl)" value={a} onChange={e => setA(e.target.value)} />
        <input style={{ ...inp, flex: 1 }} placeholder="Einheit" value={unit} onChange={e => setUnit(e.target.value)} />
      </div>
      <input style={inp} placeholder="Fun Fact (optional)" value={fact} onChange={e => setFact(e.target.value)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => { const n = Number(a.replace(/\./g, '').replace(',', '.')); if (q.trim() && !Number.isNaN(n)) onApply({ q: q.trim(), a: n, unit: unit.trim() || undefined, fact: fact.trim() || undefined }); }}
          style={{ ...btn(PINK, '#fff'), flex: 1, fontSize: 14 }}
        >▶ Diesen Clip zeigen</button>
        <button onClick={() => setOpen(false)} style={{ ...btn('rgba(255,255,255,0.10)', '#fff', '1px solid rgba(255,255,255,0.18)'), fontSize: 14 }}>Zu</button>
      </div>
    </div>
  );
}

// Ablaufender Ring-Timer im Look des Beamer-Timers (CozyQuizBeamerTimer): SVG-Ring
// schrumpft von voll → leer über `seconds`; Farbe Pink → Orange → Rot je Restzeit.
function CountdownRing({ seconds, count }: { seconds: number; count: number }) {
  const R = 80, STROKE = 9, C = 2 * Math.PI * R;
  const [go, setGo] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGo(true), 40); return () => clearTimeout(t); }, []);
  const color = count <= 1 ? '#EF4444' : count <= 2 ? '#F97316' : PINK;
  return (
    <div style={{ position: 'relative', width: '38cqw', height: '38cqw' }}>
      <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
        <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={STROKE} />
        <circle cx="100" cy="100" r={R} fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={go ? C : 0}
          style={{ transition: `stroke-dashoffset ${seconds}s linear, stroke 0.3s ease`, filter: `drop-shadow(0 0 2cqw ${color}aa)` }} />
      </svg>
      <div key={count} style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
        fontFamily: DISPLAY, fontWeight: 800, fontSize: '16cqw', color,
        fontVariantNumeric: 'tabular-nums', textShadow: `0 0 3cqw ${color}88`, animation: 'countPop 0.6s var(--eb)',
      }}>
        {count > 0 ? count : '⏰'}
      </div>
    </div>
  );
}

// EU-Flagge nachgebaut: blaues Rechteck + 12 Stern-Emojis im Kreis (poppen der Reihe
// nach rein = „mitzählen"). Wolf-Wunsch für die EU-Sterne-Schätzfrage.
function EuFlag() {
  // Echter Kreis in einem 3:2-Rechteck: Prozente skalieren pro Achse unterschiedlich,
  // also Radius getrennt. EU-Spec = Kreisradius 1/3 der Flaggenhöhe → Ry = 33% (Höhe),
  // Rx = Ry × Höhe/Breite = 33 × (2/3) = 22% (Breite). Sonst wird der Kreis zum Oval.
  const Ry = 33, Rx = 22;
  const stars = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30) * Math.PI / 180;
    return { x: 50 + Rx * Math.sin(a), y: 50 - Ry * Math.cos(a) };
  });
  return (
    <div style={{ position: 'relative', width: '62cqw', aspectRatio: '3 / 2', background: '#003399', borderRadius: '2.5cqw', border: '0.4cqw solid rgba(255,255,255,0.18)', boxShadow: '0 2cqh 6cqh rgba(0,0,0,0.5)', overflow: 'hidden' }}>
      {stars.map((s, i) => (
        <span key={i} style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, transform: 'translate(-50%,-50%)', fontSize: '8cqw', lineHeight: 1, animation: `popIn 0.4s var(--eb) ${0.2 + i * 0.07}s both` }}>⭐</span>
      ))}
    </div>
  );
}

const KEYFRAMES = `
  :root { --eb: cubic-bezier(0.2, 1.2, 0.3, 1); }
  @keyframes sceneIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(4cqh); } to { opacity: 1; transform: none; } }
  @keyframes popIn { 0% { opacity: 0; transform: scale(0.7); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes countPop { 0% { opacity: 0; transform: scale(1.6); } 45% { opacity: 1; transform: scale(1); } 100% { opacity: 1; } }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes barFill { from { width: 0%; } to { width: 100%; } }
  @keyframes floatPet { 0%, 100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-3cqh) rotate(4deg); } }
`;
