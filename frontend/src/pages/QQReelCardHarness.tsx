// Reel-Harness: rendert die ECHTE Team-QuestionCard mit gescripteter Frage in
// Handy-Logikgroesse (360x780), fuer Social-Video-Aufnahmen (Screenshot/Screencast).
// Kein Backend, kein Socket — emit ist ein No-op, Antippen setzt nur den
// lokalen Auswahl-Zustand der Karte. Aufruf: /reel-card
import type { CSSProperties } from 'react';
import type { QQQuestion } from '../../../shared/quarterQuizTypes';
import { AvatarSetProvider } from '../avatarSetContext';
import { QuestionCard } from '../components/CozyQuizTeamQuestionCard';
import { DemoKeyframes, buildState, ME, TEAMS } from '../components/QQDemoShowcase';

const B_EMPTY = Array.from({ length: 5 }, () => Array(5).fill(-1));

// Falle: fast alle tippen Google, richtig ist Netflix (1997).
const REEL_QUESTION: QQQuestion = {
  id: 'reel-q', category: 'MUCHO', phaseIndex: 1, questionIndexInPhase: 0,
  text: 'Was wurde zuerst gegründet?', answer: '2',
  options: ['Google', 'YouTube', 'Netflix', 'Facebook'], correctOptionIndex: 2,
};

const COZY_BG = 'radial-gradient(circle at 50% 0%, #1E2A5A 0%, #0F1530 60%, #0A0E22 100%)';

export default function QQReelCardHarness() {
  const state = buildState({
    board: B_EMPTY, phase: 'QUESTION_ACTIVE', question: REEL_QUESTION,
    answers: [], correctTeamId: null,
  });
  const wrap: CSSProperties = {
    width: 360, height: 780, background: COZY_BG, position: 'relative',
    padding: '64px 18px 22px', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    fontFamily: "'Nunito','Inter',sans-serif",
  };
  return (
    <AvatarSetProvider value="cozy3d">
      <DemoKeyframes />
      <div id="reel-phone" style={wrap}>
        <QuestionCard state={state} myTeamId={ME.id} emit={() => {}} roomCode="COZY" lang="de" />
      </div>
      {/* Team-Kontext, damit nichts im Header fehlt */}
      <span style={{ display: 'none' }}>{TEAMS.length}</span>
    </AvatarSetProvider>
  );
}
