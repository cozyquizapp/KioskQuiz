// ── QQ Question-Test — Arena-Abgabe-Tracker (Wappen erleuchten, Wolf 2026-07-18)
// Rendert die ECHTE QuestionView mit einer CHEESE-Arena-Frage + Teil-Abgaben, um
// den „abgeschickt = Wappen ERLEUCHTEN"-Zustand (statt gruenem Kreis) zu pruefen.
// Slider fuer die Zahl abgegebener Fraktionen. Route: /question-test.
import React, { useMemo, useState } from 'react';
import type { QQStateUpdate } from '@shared/quarterQuizTypes';
import { QuestionView } from '../components/CozyQuizQuestionView';

// 8 Fraktionen x 2 Sub-Teams (16), damit qqIsMega/nested greift + Wappen rendern.
const FACTIONS = [
  { av: 'rabbit',  color: '#a855f7' }, { av: 'unicorn', color: '#22c55e' },
  { av: 'fox',     color: '#ec4899' }, { av: 'raccoon', color: '#06b6d4' },
  { av: 'cat',     color: '#f59e0b' }, { av: 'cow',     color: '#ef4444' },
  { av: 'frog',    color: '#3b82f6' }, { av: 'panda',   color: '#fb923c' },
];

export default function QQQuestionTestPage() {
  const [lang, setLang] = useState<'de' | 'en'>('de');
  // Wie viele der 8 Fraktionen haben KOMPLETT abgegeben (beide Sub-Teams)?
  const [doneFactions, setDoneFactions] = useState(3);
  // Eine Fraktion teilweise (nur 1 von 2 Sub-Teams) → „some"-Zustand.
  const [partial, setPartial] = useState(true);

  const state = useMemo(() => {
    const teams = FACTIONS.flatMap((f, i) => [0, 1].map(k => ({
      id: `${f.av}-${k}`, name: `Rudel ${i + 1}.${k + 1}`,
      color: f.color, avatarId: f.av, emoji: '', connected: true,
      totalCells: 0, largestConnected: 0,
    })));
    // Abgaben: erste `doneFactions` Fraktionen beide Sub-Teams; danach optional
    // eine Fraktion nur 1 Sub-Team (partial).
    const answers: any[] = [];
    FACTIONS.forEach((f, i) => {
      if (i < doneFactions) { answers.push({ teamId: `${f.av}-0` }, { teamId: `${f.av}-1` }); }
      else if (i === doneFactions && partial) { answers.push({ teamId: `${f.av}-0` }); }
    });
    return {
      phase: 'QUESTION_ACTIVE',
      largeGroupMode: true, nestedTeams: true,
      language: lang, sfxMuted: true,
      allAnswered: false,
      currentQuestion: {
        id: 'q-cheese', category: 'CHEESE',
        text: lang === 'de' ? 'Was siehst du hier?' : 'What do you see?',
        image: { url: '/arena-bg/arena-main.webp', layout: 'fullscreen', cheeseLayout: 'landscape' },
      },
      answers, teams,
      timerEndsAt: null, timerDurationSec: 30,
    } as unknown as QQStateUpdate;
  }, [lang, doneFactions, partial]);

  return (
    <div style={S.page}>
      <div style={S.controls}>
        <span style={S.title}>Abgabe-Tracker · Wappen erleuchten (Arena)</span>
        <div style={S.seg}>
          <button style={btn(lang === 'de')} onClick={() => setLang('de')}>DE</button>
          <button style={btn(lang === 'en')} onClick={() => setLang('en')}>EN</button>
        </div>
        <div style={S.seg}>
          {[0, 2, 3, 5, 8].map(n => (
            <button key={n} style={btn(doneFactions === n)} onClick={() => setDoneFactions(n)}>{n} fertig</button>
          ))}
        </div>
        <button style={btn(partial)} onClick={() => setPartial(p => !p)}>1 teilweise: {partial ? 'an' : 'aus'}</button>
      </div>
      <div style={S.stageWrap}>
        <div style={S.stage}>
          <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/arena-bg/schau-mal.webp)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <QuestionView key={`${lang}-${doneFactions}-${partial}`} state={state} revealed={false} hideCutouts={false} />
        </div>
      </div>
    </div>
  );
}

const btn = (on: boolean): React.CSSProperties => ({
  background: on ? '#EC4899' : 'rgba(255,255,255,0.08)', color: '#fff', border: 'none',
  borderRadius: 10, padding: '9px 13px', fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
});
const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0a0f24', color: '#f4f6ff', fontFamily: "'Nunito', system-ui, sans-serif", padding: '20px 28px 48px' },
  controls: { maxWidth: 1760, margin: '0 auto 16px', background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 14, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  title: { fontWeight: 900, fontSize: 15 },
  seg: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  stageWrap: { maxWidth: 1760, margin: '0 auto' },
  stage: { position: 'relative', width: '100%', aspectRatio: '16 / 9', containerType: 'size', borderRadius: 16, overflow: 'hidden', background: '#0a0f24', display: 'flex' } as React.CSSProperties,
};
