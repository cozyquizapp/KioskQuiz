/**
 * QQTrailerPage — animierter Werbe-Trailer „Was ist CozyQuiz?" im 9:16-Hochformat.
 *
 * 2026-06-25 (Wolf): kurzer Erklär-Trailer der Bock macht — autoplay + loop,
 * gecaptionte Motion-Sequenz in CozyWolf-Marke mit den echten cozy3d-Game-
 * Avataren. Gedacht zum Live-Herzeigen am Handy ODER als Bildschirmaufnahme
 * fürs Instagram-Reel (@cozywolf.events). Inhalt 1:1 aus den echten Spielregeln,
 * nichts Erfundenes. Route /trailer, öffentlich.
 */
import { useEffect, useRef, useState } from 'react';
import { QQ_TEAM_PALETTE } from '@shared/quarterQuizTypes';

const PINK = '#ec4899';
const PINK_MID = '#f472b6';
const MAGENTA = '#a21247';
const DISPLAY = "'Bricolage Grotesque', 'Inter', system-ui, sans-serif";
const BODY = "'Nunito', 'Inter', system-ui, sans-serif";

// Cozy-Bühnen-BG (1:1 aus dem Cozy-Theme, qqTheme.ts COZY.surface.pageBg).
const COZY_BG = 'radial-gradient(circle at 50% 0%, #1E2A5A 0%, #0F1530 60%, #0A0E22 100%)';

const cz = (slug: string) => `/avatars/cozy3d/${slug}.png`;

// 5 Teams = die echten Default-Avatare mit den echten App-Farben (QQ_TEAM_PALETTE).
const TEAMS = [
  { slug: 'hund',     color: QQ_TEAM_PALETTE[0] }, // #FA507F
  { slug: 'faultier', color: QQ_TEAM_PALETTE[1] }, // #9DCB2F
  { slug: 'pinguin',  color: QQ_TEAM_PALETTE[2] }, // #266FD3
  { slug: 'koala',    color: QQ_TEAM_PALETTE[3] }, // #9A65D5
  { slug: 'giraffe',  color: QQ_TEAM_PALETTE[4] }, // #FEC814
];
const HERO = { slug: 'fuchs', color: QQ_TEAM_PALETTE[0] };
// 5×5-Gebiete (Team-Index je Zelle) — jede Zelle trägt den Team-Avatar (wie im echten Brett).
const MINI_GRID = [
  [0, 0, 1, 1, 2],
  [0, 0, 1, 2, 2],
  [0, 3, 1, 1, 2],
  [3, 3, 3, 4, 2],
  [3, 3, 4, 4, 4],
];

const CATEGORIES = [
  { emoji: '🎯', name: 'Schätzchen', desc: 'Am nächsten dran' },
  { emoji: '🔤', name: 'Mu-Cho', desc: 'Tempo entscheidet' },
  { emoji: '📊', name: '10 von 10', desc: '10 Punkte, 3 Antworten' },
  { emoji: '📸', name: 'Schau mal!', desc: 'Erkennt das Bild' },
  { emoji: '🎁', name: 'Bunte Tüte', desc: 'Überraschungs-Format' },
];

const TWISTS = [
  { emoji: '🗡️', text: 'Felder klauen' },
  { emoji: '🃏', text: 'Joker-Bonus sammeln' },
  { emoji: '🔄', text: 'Comeback fürs letzte Team' },
];

type Scene = { key: string; dur: number };
const SCENES: Scene[] = [
  { key: 'title',  dur: 3800 },
  { key: 'conquer', dur: 4600 },
  { key: 'board',  dur: 5200 },
  { key: 'cats',   dur: 5600 },
  { key: 'twists', dur: 4800 },
  { key: 'bets',   dur: 4400 },
  { key: 'cta',    dur: 4600 },
];

export default function QQTrailerPage() {
  const [scene, setScene] = useState(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  useEffect(() => { document.title = 'CozyQuiz — Trailer'; }, []);

  // Szenen-Stepper: nach Ablauf der Szenen-Dauer zur nächsten (Loop). Pausierbar.
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setScene(s => (s + 1) % SCENES.length), SCENES[scene].dur);
    return () => clearTimeout(t);
  }, [scene, paused]);

  return (
    <div style={{
      minHeight: '100vh', background: '#0c0a14', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 14, padding: 10, fontFamily: BODY,
    }}>
      <style>{KEYFRAMES}</style>

      {/* 9:16-Frame (container-query-Einheiten → alles skaliert mit) */}
      <div style={{
        position: 'relative', aspectRatio: '9 / 16', height: 'min(94vh, calc(100vw * 16 / 9))',
        maxWidth: '100vw', borderRadius: 22, overflow: 'hidden',
        containerType: 'size',
        boxShadow: '0 24px 70px rgba(0,0,0,0.6)',
        background: COZY_BG,
        cursor: 'pointer',
      }} onClick={() => setPaused(p => !p)}>
        {/* Stories-Fortschrittsbalken */}
        <div style={{ position: 'absolute', top: '2cqh', left: '4cqw', right: '4cqw', zIndex: 10, display: 'flex', gap: '1cqw' }}>
          {SCENES.map((s, i) => (
            <div key={s.key} style={{ flex: 1, height: '0.7cqh', borderRadius: 99, background: 'rgba(255,255,255,0.22)', overflow: 'hidden' }}>
              <div
                key={`${s.key}-${scene}-${paused}`}
                style={{
                  height: '100%', borderRadius: 99, background: '#fff',
                  width: i < scene ? '100%' : i > scene ? '0%' : '0%',
                  animation: i === scene && !paused ? `barFill ${s.dur}ms linear forwards` : 'none',
                  ...(i < scene ? { width: '100%' } : {}),
                }}
              />
            </div>
          ))}
        </div>

        {/* Hintergrund-Deko: schwebende Tier-Discs */}
        <FloatingPets />

        {/* Aktive Szene (key → Remount triggert Entrance-Animationen) */}
        <div key={scene} style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          padding: '12cqh 7cqw', zIndex: 5, color: '#fff',
          animation: 'sceneIn 0.5s ease both',
        }}>
          {renderScene(SCENES[scene].key)}
        </div>

        {paused && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)' }}>
            <span style={{ fontSize: '14cqw' }}>▶︎</span>
          </div>
        )}
      </div>

      {/* Screen-only Hinweis (wird nicht mit-aufgenommen wenn du nur den Frame abfilmst) */}
      <div style={{ color: '#8a86a0', fontSize: 13, fontWeight: 700, textAlign: 'center', maxWidth: 360 }}>
        Tippen = Pause · Loopt automatisch. Für ein Reel einfach den Rahmen per Bildschirmaufnahme abfilmen.
      </div>
    </div>
  );
}

// ── Szenen-Renderer ──────────────────────────────────────────────────────────
function renderScene(key: string) {
  switch (key) {
    case 'title':
      return (
        <>
          <PetDisc slug={HERO.slug} color={HERO.color} sizeCqw={34} anim="popIn 0.7s var(--eb) both" />
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '4cqw', letterSpacing: '0.3em', opacity: 0.9, marginTop: '4cqh', animation: 'fadeUp 0.6s ease 0.15s both' }}>
            DAS LIVE-QUIZ FÜR TEAMS
          </div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '15cqw', lineHeight: 0.95, letterSpacing: '-0.02em', marginTop: '1cqh', animation: 'popIn 0.7s var(--eb) 0.2s both' }}>
            CozyQuiz
          </div>
          <div style={{ fontWeight: 800, fontSize: '5.4cqw', marginTop: '3cqh', opacity: 0.96, animation: 'fadeUp 0.6s ease 0.45s both' }}>
            Pub-Quiz trifft <span style={{ color: '#fff', background: PINK, borderRadius: 8, padding: '0.2em 0.4em' }}>Strategiespiel</span>
          </div>
        </>
      );

    case 'conquer':
      return (
        <>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '8.5cqw', lineHeight: 1.05, animation: 'fadeUp 0.6s ease both' }}>
            Jede richtige Antwort…
          </div>
          {/* Eine Zelle + Avatar ploppt drauf */}
          <div style={{ position: 'relative', width: '34cqw', height: '34cqw', margin: '5cqh 0', animation: 'fadeUp 0.6s ease 0.3s both' }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '4cqw',
              background: `linear-gradient(135deg, ${HERO.color}, ${HERO.color}cc)`,
              boxShadow: `0 0 0 0.8cqw rgba(255,255,255,0.85), 0 1.5cqh 4cqh ${HERO.color}88`,
              animation: 'cellPulse 1.6s ease 0.9s infinite',
            }} />
            <img src={cz(HERO.slug)} alt="" style={{
              position: 'absolute', inset: '8%', width: '84%', height: '84%', objectFit: 'contain',
              filter: 'drop-shadow(0 0.6cqh 0.8cqh rgba(0,0,0,0.4))',
              animation: 'dropIn 0.7s var(--eb) 0.75s both',
            }} />
          </div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '8.5cqw', lineHeight: 1.05, color: PINK_MID, animation: 'popIn 0.7s var(--eb) 0.95s both' }}>
            …erobert ein Feld.
          </div>
        </>
      );

    case 'board':
      return (
        <>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '7cqw', marginBottom: '3.5cqh', animation: 'fadeUp 0.5s ease both' }}>
            Erobert euer Gebiet
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.4cqw',
            padding: '2.4cqw', background: 'rgba(255,255,255,0.06)', borderRadius: '4cqw',
            width: '74cqw',
          }}>
            {MINI_GRID.flat().map((region, i) => {
              const team = TEAMS[region];
              return (
                <div key={i} style={{
                  aspectRatio: '1', borderRadius: '2cqw', position: 'relative',
                  background: `linear-gradient(135deg, ${team.color}, ${team.color}cc)`,
                  boxShadow: 'inset 0 0 0 0.3cqw rgba(255,255,255,0.28)',
                  animation: `cellIn 0.4s var(--eb) ${0.2 + i * 0.045}s both`,
                }}>
                  <img src={cz(team.slug)} alt="" style={{
                    position: 'absolute', inset: '8%', width: '84%', height: '84%', objectFit: 'contain',
                    filter: 'drop-shadow(0 0.3cqh 0.4cqh rgba(0,0,0,0.42))',
                  }} />
                </div>
              );
            })}
          </div>
          <div style={{ fontWeight: 800, fontSize: '5.6cqw', marginTop: '4cqh', animation: 'fadeUp 0.6s ease 1.4s both' }}>
            Größtes zusammenhängendes<br />Gebiet <span style={{ color: PINK_MID }}>gewinnt.</span>
          </div>
        </>
      );

    case 'cats':
      return (
        <>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '7cqw', marginBottom: '4cqh', animation: 'fadeUp 0.5s ease both' }}>
            5 Kategorien<br />pro Runde
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2cqh', width: '82cqw' }}>
            {CATEGORIES.map((c, i) => (
              <div key={c.name} style={{
                display: 'flex', alignItems: 'center', gap: '3.5cqw',
                background: 'rgba(255,255,255,0.10)', borderRadius: '3cqw', padding: '2.2cqh 4cqw',
                animation: `slideIn 0.5s var(--eb) ${0.25 + i * 0.28}s both`,
              }}>
                <span style={{ fontSize: '8cqw', lineHeight: 1 }}>{c.emoji}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '5.6cqw', lineHeight: 1 }}>{c.name}</div>
                  <div style={{ fontSize: '4cqw', opacity: 0.82 }}>{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      );

    case 'twists':
      return (
        <>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '7cqw', marginBottom: '5cqh', animation: 'fadeUp 0.5s ease both' }}>
            Und dann wird's<br />taktisch
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5cqh', width: '82cqw' }}>
            {TWISTS.map((t, i) => (
              <div key={t.text} style={{
                display: 'flex', alignItems: 'center', gap: '4cqw',
                animation: `slideIn 0.5s var(--eb) ${0.3 + i * 0.55}s both`,
              }}>
                <span style={{ fontSize: '11cqw', lineHeight: 1 }}>{t.emoji}</span>
                <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '6.6cqw', textAlign: 'left', lineHeight: 1.05 }}>{t.text}</span>
              </div>
            ))}
          </div>
        </>
      );

    case 'bets':
      return (
        <>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '4cqw', letterSpacing: '0.28em', opacity: 0.85, animation: 'fadeUp 0.5s ease both' }}>
            DAS GROSSE FINALE
          </div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '13cqw', lineHeight: 1, marginTop: '0.5cqh', animation: 'popIn 0.7s var(--eb) 0.15s both' }}>
            Final-Bets
          </div>
          {/* Tipp: Team A → Team B */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4cqw', margin: '5cqh 0', animation: 'fadeUp 0.6s ease 0.35s both' }}>
            <PetDisc slug={TEAMS[2].slug} color={TEAMS[2].color} sizeCqw={20} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5cqh' }}>
              <span style={{ fontSize: '3.4cqw', fontWeight: 900, letterSpacing: '0.15em', opacity: 0.85 }}>TIPPT AUF</span>
              <span style={{ fontSize: '9cqw', lineHeight: 1, animation: 'cellPulse 1.4s ease 0.6s infinite' }}>🎯</span>
            </div>
            <PetDisc slug={TEAMS[4].slug} color={TEAMS[4].color} sizeCqw={20} />
          </div>
          <div style={{ fontWeight: 800, fontSize: '5.2cqw', opacity: 0.96, animation: 'fadeUp 0.6s ease 0.6s both' }}>
            Liegt euer Tipp vorn → <span style={{ color: PINK_MID }}>Bonus-Punkte.</span>
          </div>
        </>
      );

    case 'cta':
      return (
        <>
          <PetDisc slug={HERO.slug} color={HERO.color} sizeCqw={32} anim="popIn 0.7s var(--eb) both" />
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '10cqw', lineHeight: 1.02, marginTop: '4cqh', animation: 'popIn 0.7s var(--eb) 0.2s both' }}>
            Bock auf ein<br />CozyQuiz?
          </div>
          <div style={{ fontWeight: 800, fontSize: '4.6cqw', marginTop: '3cqh', opacity: 0.9, animation: 'fadeUp 0.6s ease 0.45s both' }}>
            Für Bar · Café · Firmenfeier · Event
          </div>
          <div style={{ marginTop: '5cqh', display: 'flex', flexDirection: 'column', gap: '1.4cqh', fontWeight: 800, fontSize: '5cqw', animation: 'fadeUp 0.6s ease 0.7s both' }}>
            <span>🌐 cozywolf.de</span>
            <span style={{ color: PINK_MID }}>📸 @cozywolf.events</span>
          </div>
        </>
      );

    default:
      return null;
  }
}

// ── Bausteine ────────────────────────────────────────────────────────────────
function PetDisc({ slug, color, sizeCqw, anim }: { slug: string; color: string; sizeCqw: number; anim?: string }) {
  return (
    <div style={{
      width: `${sizeCqw}cqw`, height: `${sizeCqw}cqw`, borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.3), rgba(255,255,255,0) 52%), ${color}`,
      boxShadow: `0 1.5cqh 4cqh ${color}66, inset 0 -1.4cqh 2.6cqh rgba(0,0,0,0.25)`,
      animation: anim,
    }}>
      <img src={cz(slug)} alt="" style={{ width: '84%', height: '84%', objectFit: 'contain', filter: 'drop-shadow(0 0.5cqh 0.6cqh rgba(0,0,0,0.35))' }} />
    </div>
  );
}

// Dezent schwebende Tiere im Hintergrund (Deko).
function FloatingPets() {
  const pets = [
    { slug: 'pinguin', x: 8, y: 16, s: 13, d: 0 },
    { slug: 'koala', x: 82, y: 22, s: 11, d: 1.3 },
    { slug: 'eule', x: 14, y: 80, s: 12, d: 0.6 },
    { slug: 'baer', x: 86, y: 78, s: 13, d: 2.0 },
  ];
  return (
    <>
      {pets.map(p => (
        <img key={p.slug} src={cz(p.slug)} alt="" aria-hidden style={{
          position: 'absolute', left: `${p.x}cqw`, top: `${p.y}cqh`,
          width: `${p.s}cqw`, height: `${p.s}cqw`, objectFit: 'contain',
          opacity: 0.16, filter: 'drop-shadow(0 0.4cqh 0.6cqh rgba(0,0,0,0.4))',
          animation: `floatPet 6s ease-in-out ${p.d}s infinite`, zIndex: 1, pointerEvents: 'none',
        }} />
      ))}
    </>
  );
}

const KEYFRAMES = `
  :root { --eb: cubic-bezier(0.2, 1.2, 0.3, 1); }
  @keyframes sceneIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(4cqh); } to { opacity: 1; transform: none; } }
  @keyframes popIn { 0% { opacity: 0; transform: scale(0.7); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes slideIn { from { opacity: 0; transform: translateX(-6cqw); } to { opacity: 1; transform: none; } }
  @keyframes dropIn { 0% { opacity: 0; transform: translateY(-8cqh) scale(0.6); } 100% { opacity: 1; transform: none; } }
  @keyframes cellIn { 0% { opacity: 0; transform: scale(0.3); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes cellPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
  @keyframes barFill { from { width: 0%; } to { width: 100%; } }
  @keyframes floatPet { 0%, 100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-3cqh) rotate(4deg); } }
`;
