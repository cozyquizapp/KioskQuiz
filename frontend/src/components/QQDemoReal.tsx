// QQDemoReal — PREVIEW (Route /demo-real): der Landing-Durchlauf, aber mit den
// ECHTEN Quiz-Views statt Nachbildungen. Beamer = echte `QuestionView`
// (CozyQuizQuestionView), Handy = echte `QuestionCard` (CozyQuizTeamQuestionCard),
// gefahren mit gemocktem QQStateUpdate (buildState aus QQDemoShowcase).
//
// Warum eine eigene Route: die echten Beamer-Views nutzen cqw/cqh-Container-
// Queries → nur korrekt, wenn der logische 1024×576-Rahmen `container-type: size`
// hat. Darum wrappen wir die Views hier in eine container-typed Box. Live `/`
// bleibt vorerst auf QQDemoShowcase, bis Wolf diese Fidelity abnimmt.
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { QQStateUpdate, QQQuestion } from '../../../shared/quarterQuizTypes';
import { AvatarSetProvider } from '../avatarSetContext';
import { QuestionView } from './CozyQuizQuestionView';
import { QuestionCard } from './CozyQuizTeamQuestionCard';
import {
  DemoKeyframes, ScaledScreen, ProjectedFX, BEAMER, PHONE,
  buildState, TEAMS, ME, QUESTION, QUESTION2, GRID,
} from './QQDemoShowcase';

const EMPTY_BOARD = Array.from({ length: GRID }, () => Array(GRID).fill(-1));

type RealBeat = { ms: number; caption: string; state: QQStateUpdate; revealed: boolean };

function buildRealBeats(): RealBeat[] {
  const active = (q: QQQuestion, answers: { teamId: string; text: string }[]) =>
    buildState({ board: EMPTY_BOARD, phase: 'QUESTION_ACTIVE', question: q, answers, correctTeamId: null });
  const reveal = (q: QQQuestion, correct: string) =>
    buildState({ board: EMPTY_BOARD, phase: 'QUESTION_REVEAL', question: q, answers: TEAMS.map(t => ({ teamId: t.id, text: '0' })), correctTeamId: correct, muchoRevealStep: 9 });
  return [
    { ms: 5200, caption: 'Echte Frage-Ansicht — Beamer & Handy, live aus dem Quiz.', revealed: false, state: active(QUESTION, [{ teamId: 't0', text: '0' }]) },
    { ms: 5200, caption: 'Aufgelöst: die richtige Antwort leuchtet auf.', revealed: true, state: reveal(QUESTION, 't0') },
    { ms: 5200, caption: 'Andere Kategorie, andere Mechanik — Schätzchen.', revealed: false, state: active(QUESTION2, []) },
    { ms: 5200, caption: 'Wer am nächsten dran ist, gewinnt die Runde.', revealed: true, state: reveal(QUESTION2, 't2') },
  ];
}

const LABEL: CSSProperties = { fontSize: 11, color: '#5b6780', fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase' };
// Container-typed Wrapper: cqw/cqh der echten Views lösen gegen den logischen
// Rahmen auf (1024×576 bzw. 360×780), nicht gegen den Viewport.
const CQ: CSSProperties = { width: '100%', height: '100%', containerType: 'size' } as CSSProperties;

export function QQDemoReal() {
  const beats = useMemo(buildRealBeats, []);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setI(b => (b + 1) % beats.length), beats[i].ms);
    return () => clearTimeout(t);
  }, [i, paused, beats]);
  const cur = beats[i];

  return (
    <AvatarSetProvider value="cozy3d">
      <DemoKeyframes />
      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%', maxWidth: 1280, margin: '0 auto', padding: 24 }}>
        <div style={{ fontSize: 12, color: '#EC4899', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Preview · echte Quiz-Komponenten</div>
        <div key={`cap-${i}`} style={{
          fontSize: 'clamp(16px, 2.2vw, 24px)', color: '#f1f5f9', fontWeight: 800,
          textAlign: 'center', maxWidth: 760, minHeight: 40, lineHeight: 1.3,
          animation: 'demoIn 0.5s ease both',
        }}>{cur.caption}</div>

        <div
          onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px,4vw,56px)', justifyContent: 'center', alignItems: 'center', width: '100%' }}
        >
          {/* Beamer — echte QuestionView */}
          <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: 'min(94vw, 720px)' }}>
            <ScaledScreen logicalW={BEAMER.w} logicalH={BEAMER.h} radius={16} fit="width" overlay={<ProjectedFX radius={16} />}
              style={{ border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 40px 90px -28px rgba(0,0,0,0.8)' }}>
              <div key={`bv-${i}`} style={{ ...CQ, display: 'flex', animation: 'demoIn 0.5s ease both' }}>
                <QuestionView state={cur.state} revealed={cur.revealed} hideCutouts={false} />
              </div>
            </ScaledScreen>
            <span style={LABEL}>Beamer</span>
          </figure>

          {/* Handy — echte QuestionCard */}
          <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              height: 'min(66vh, 500px)', display: 'inline-flex', padding: 9, borderRadius: 44, position: 'relative',
              background: 'linear-gradient(155deg,#262b3d 0%,#0c0f1a 70%)', border: '1px solid rgba(255,255,255,0.14)',
              boxShadow: '0 40px 90px -28px rgba(0,0,0,0.84)',
            }}>
              <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', width: 90, height: 23, borderRadius: 99, background: '#05070d', zIndex: 5 }} />
              <ScaledScreen logicalW={PHONE.w} logicalH={PHONE.h} radius={36} fit="height">
                <div key={`pv-${i}`} style={{ ...CQ, padding: '64px 18px 22px', display: 'flex', flexDirection: 'column', fontFamily: "'Nunito','Inter',sans-serif", animation: 'demoIn 0.5s ease both' }}>
                  <QuestionCard state={cur.state} myTeamId={ME.id} emit={() => {}} roomCode="COZY" lang="de" />
                </div>
              </ScaledScreen>
            </div>
            <span style={LABEL}>Dein Handy</span>
          </figure>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {beats.map((_, k) => (
            <button key={k} aria-label={`Szene ${k + 1}`} onClick={() => setI(k)} style={{
              width: k === i ? 24 : 8, height: 8, borderRadius: 99, border: 0, cursor: 'pointer', padding: 0,
              background: k === i ? '#EC4899' : 'rgba(148,163,184,0.4)', transition: 'all 0.3s ease',
            }} />
          ))}
        </div>
      </section>
    </AvatarSetProvider>
  );
}

export default QQDemoReal;
