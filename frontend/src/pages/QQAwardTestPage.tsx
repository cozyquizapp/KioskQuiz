// ── QQ Award-Test — Vorschau der Siegerehrung (Special-Award-Beats) ───────────
// Rendert die ECHTE LargeGroupGameOverView mit Mock-GameOver-State. Zeigt die
// Award-Beats inkl. BG-Roulette (Wolf bild 12: BG wechselt durch → rastet auf dem
// Sieger ein). Step-Buttons + „neu abspielen". Route: /award-test.
import React, { useMemo, useState } from 'react';
import { QQ_AVATARS } from '@shared/quarterQuizTypes';
import type { QQStateUpdate } from '@shared/quarterQuizTypes';
import { LargeGroupGameOverView } from '../components/CozyQuizLargeGroupView';

const AVS = ['panda', 'fox', 'raccoon', 'cat', 'frog', 'unicorn', 'rabbit', 'cow'];
const colorOf = (a: string) => QQ_AVATARS.find(x => x.id === a)?.color ?? '#8892b0';

export default function QQAwardTestPage() {
  const [lang, setLang] = useState<'de' | 'en'>('de');
  const [step, setStep] = useState(0);
  const [remount, setRemount] = useState(0);

  const state = useMemo(() => {
    const teams = AVS.map((a, i) => ({
      id: `t${i}`, avatarId: a, emoji: '', color: colorOf(a), name: a,
      connected: true, largestConnected: 200 - i * 18, totalCells: 200 - i * 18,
    }));
    const megaAwards = {
      fastest: 'raccoon', sharpshooter: 'panda', comeback: 'cow',
      participation: 'frog', steady: 'unicorn',
      stats: { fastest: 4, sharpshooter: 88, comeback: 5, participation: 100, steady: 47 },
    };
    return {
      phase: 'GAME_OVER',
      largeGroupMode: true,
      nestedTeams: true,
      language: lang,
      sfxMuted: true,
      awardCeremonyStep: step,
      megaAwards,
      teams,
    } as unknown as QQStateUpdate;
  }, [lang, step]);

  return (
    <div style={S.page}>
      <div style={S.controls}>
        <span style={S.title}>Siegerehrung-Vorschau · Award-Beats + BG-Roulette (bild 12)</span>
        <div style={S.seg}>
          <button style={btn(lang === 'de')} onClick={() => setLang('de')}>DE</button>
          <button style={btn(lang === 'en')} onClick={() => setLang('en')}>EN</button>
        </div>
        <div style={S.seg}>
          {[0, 1, 2, 3, 4].map(i => (
            <button key={i} style={btn(step === i)} onClick={() => setStep(i)}>Award {i + 1}</button>
          ))}
          <button style={btn(step === 5)} onClick={() => setStep(5)}>Krönung</button>
          <button style={btn(step === 6)} onClick={() => setStep(6)}>Endstand</button>
        </div>
        <button style={S.ghost} onClick={() => setRemount(k => k + 1)}>▶ Roulette neu</button>
      </div>
      <div style={S.stageWrap}>
        <div style={S.stage}>
          <LargeGroupGameOverView key={`${lang}-${step}-${remount}`} state={state} />
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
  controls: { maxWidth: 1240, margin: '0 auto 16px', background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 14, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  title: { fontWeight: 900, fontSize: 15 },
  seg: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  ghost: { background: 'transparent', color: '#f4f6ff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '9px 15px', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  stageWrap: { maxWidth: 1240, margin: '0 auto' },
  stage: { position: 'relative', width: '100%', aspectRatio: '16 / 9', containerType: 'size', borderRadius: 16, overflow: 'hidden', background: '#0a0f24', display: 'flex' } as React.CSSProperties,
};
