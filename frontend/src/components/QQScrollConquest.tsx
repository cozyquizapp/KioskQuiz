// QQScrollConquest — scroll-getriebener Landing-Hero (Wolf-Wahl 2026-06-26).
// Beim Runterscrollen erobert sich das ECHTE 5×5-Brett (GridDisplay) Feld für
// Feld in Team-Farben — der Scroll-Fortschritt IST das Spiel. Erklärungen
// blenden synchron ein, am Ende Sieger-Finale + CTA.
//
// Reuse der echten Views + Mock-State aus QQDemoShowcase (ScaledScreen/BeamerScene/
// PhoneScene/buildState). Kein WebGL → schnell + mobil-safe.
import { useEffect, useRef, useState } from 'react';
import { AvatarSetProvider } from '../avatarSetContext';
import { wakeTeamAvatar } from '../avatarAwake';
import {
  BEAMER, PHONE, GRID, TEAMS, ME, QUESTION,
  BeamerScene, PhoneScene, ScaledScreen, DemoKeyframes, buildState,
  type Beat, type Board,
} from './QQDemoShowcase';

// Reihenfolge der Feld-Eroberungen [row, col, teamIndex]. Cluster pro Team,
// interleaved → mehrere Farben wachsen gleichzeitig. Vorletzter Eintrag ist ein
// KLAU (überschreibt ein fremdes Feld → GridDisplay animiert es als „gestohlen").
const PLACEMENTS: [number, number, number][] = [
  [0, 0, 0], [0, 4, 1], [4, 0, 2], [4, 4, 3],
  [0, 1, 0], [1, 3, 1], [4, 1, 2], [3, 4, 3],
  [1, 0, 0], [0, 3, 1], [3, 1, 2], [4, 3, 3],
  [1, 1, 0], [2, 2, 2], [3, 3, 3], [2, 0, 2],
  [0, 2, 1], [2, 4, 3],
  [0, 1, 1],            // Klau: Eulen nehmen Füchse-Feld (0,1)
  [3, 0, 2],
];
const STUCK = { r: 4, c: 4 };

const CHAPTERS = [
  'So läuft eine Runde CozyQuiz.',
  'Beantwortet Fragen aus 5 Kategorien — jedes Team am eigenen Handy.',
  'Jede richtige Antwort erobert ein Feld auf dem Brett.',
  'Runde um Runde wächst euer Gebiet in eurer Farbe.',
  'Klauen, Stapeln, Joker — Taktik entscheidet.',
  'Das größte zusammenhängende Gebiet gewinnt. Buch dein CozyQuiz!',
];

function emptyBoard(): Board {
  return Array.from({ length: GRID }, () => Array(GRID).fill(-1));
}
function boardFromK(k: number): Board {
  const b = emptyBoard();
  for (let i = 0; i < k && i < PLACEMENTS.length; i++) {
    const [r, c, t] = PLACEMENTS[i];
    b[r][c] = t;
  }
  return b;
}

function buildBeat(chapter: number, k: number): Beat {
  const board = boardFromK(k);
  const last = k > 0 ? PLACEMENTS[Math.min(k, PLACEMENTS.length) - 1] : null;
  const isWinner = chapter >= 5;
  const phone: Beat['phone'] = chapter === 0 ? 'lobby' : chapter === 1 ? 'question' : chapter >= 5 ? 'winner' : 'standings';
  return {
    ms: 0,
    caption: CHAPTERS[chapter],
    beamer: isWinner ? 'winner' : k === 0 ? 'lobby' : 'board',
    phone,
    highlightTeam: !isWinner && chapter >= 2 && last ? TEAMS[last[2]].id : null,
    state: buildState({
      board,
      phase: isWinner ? 'GAME_OVER' : chapter === 1 ? 'QUESTION_ACTIVE' : 'PLACEMENT',
      question: chapter === 1 ? QUESTION : null,
      answers: chapter === 1 ? [{ teamId: ME.id, text: '0' }] : [],
      correctTeamId: null,
      stuck: chapter >= 4 ? STUCK : undefined,
    }),
  };
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export default function QQScrollConquest() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0);
  const [chapter, setChapter] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = sectionRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const total = el.offsetHeight - window.innerHeight;
        const p = clamp(-rect.top / Math.max(1, total), 0, 1);
        setProgress(p);
        // Fuell-Bereich p ∈ [0.12, 0.84] → K Felder
        const fillP = clamp((p - 0.12) / 0.72, 0, 1);
        const newK = Math.round(fillP * PLACEMENTS.length);
        setK((prev) => (prev === newK ? prev : newK));
        const ch = p < 0.12 ? 0 : p < 0.30 ? 1 : p < 0.52 ? 2 : p < 0.70 ? 3 : p < 0.85 ? 4 : 5;
        setChapter((prev) => (prev === ch ? prev : ch));
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  // Aktives Team „aufwecken" (Augen auf) wenn es gerade ein Feld setzt.
  const lastTeamId = chapter >= 2 && chapter < 5 && k > 0 ? TEAMS[PLACEMENTS[Math.min(k, PLACEMENTS.length) - 1][2]].id : null;
  useEffect(() => { if (lastTeamId) wakeTeamAvatar(lastTeamId, 2000); }, [lastTeamId]);

  const beat = buildBeat(chapter, k);

  return (
    <AvatarSetProvider value="cozy3d">
      <DemoKeyframes />
      {/* Tall scroll container → die sticky-Bühne bleibt gepinnt während man scrollt. */}
      <section ref={sectionRef} style={{ position: 'relative', width: '100%', height: `${CHAPTERS.length * 90}vh` }}>
        <div style={{
          position: 'sticky', top: 0, height: '100svh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 'clamp(16px, 3vh, 30px)', padding: '20px 12px',
        }}>
          {/* dünne Fortschrittslinie */}
          <div style={{ position: 'absolute', top: 0, left: 0, height: 3, width: `${progress * 100}%`, background: 'linear-gradient(90deg,#F472B6,#EC4899,#A21247)', transition: 'width 0.1s linear', boxShadow: '0 0 12px rgba(236,72,153,0.6)' }} />

          {/* Caption */}
          <div key={chapter} style={{
            fontSize: 'clamp(17px, 2.6vw, 26px)', color: '#f1f5f9', fontWeight: 800,
            textAlign: 'center', maxWidth: 720, minHeight: 64, lineHeight: 1.3,
            animation: 'demoIn 0.5s ease both', textShadow: '0 2px 20px rgba(0,0,0,0.5)',
          }}>
            {beat.caption}
          </div>

          {/* Bühne: echtes Brett (Beamer) + echtes Handy */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 'clamp(18px, 3vw, 50px)',
            justifyContent: 'center', alignItems: 'center', width: '100%',
          }}>
            <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: 'min(86vw, 560px)' }}>
              <ScaledScreen logicalW={BEAMER.w} logicalH={BEAMER.h} radius={16} fit="width" style={{
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 40px 90px -24px rgba(0,0,0,0.7), 0 0 60px rgba(99,102,241,0.18), 0 0 0 1px rgba(255,255,255,0.06)',
              }}>
                <BeamerScene beat={beat} />
              </ScaledScreen>
              <span style={{ fontSize: 11, color: '#5b6780', fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase' }}>Beamer</span>
            </figure>

            <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{
                height: 'min(44vh, 380px)', display: 'inline-flex', padding: 8, borderRadius: 40,
                background: 'linear-gradient(155deg,#262b3d 0%,#0c0f1a 70%)', position: 'relative',
                border: '1px solid rgba(255,255,255,0.14)',
                boxShadow: '0 40px 90px -24px rgba(0,0,0,0.78), 0 0 40px rgba(236,72,153,0.14)',
              }}>
                <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', width: 80, height: 20, borderRadius: 99, background: '#05070d', zIndex: 5 }} />
                <ScaledScreen logicalW={PHONE.w} logicalH={PHONE.h} radius={33} fit="height">
                  <PhoneScene beat={beat} />
                </ScaledScreen>
              </div>
              <span style={{ fontSize: 11, color: '#5b6780', fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase' }}>Dein Handy</span>
            </figure>
          </div>

          {/* Kapitel-Punkte + Scroll-Hinweis */}
          <div style={{ display: 'flex', gap: 8 }}>
            {CHAPTERS.map((_, i) => (
              <div key={i} style={{
                width: i === chapter ? 24 : 8, height: 8, borderRadius: 99,
                background: i === chapter ? '#EC4899' : 'rgba(148,163,184,0.4)', transition: 'all 0.3s ease',
              }} />
            ))}
          </div>
          {chapter === 0 && (
            <div style={{ position: 'absolute', bottom: 18, fontSize: 13, color: '#94a3b8', fontWeight: 700, animation: 'scrollHint 1.8s ease-in-out infinite' }}>
              ↓ scrollen
            </div>
          )}
        </div>
      </section>

      <style>{`@keyframes scrollHint { 0%,100%{transform:translateY(0);opacity:0.6} 50%{transform:translateY(6px);opacity:1} }`}</style>
    </AvatarSetProvider>
  );
}
