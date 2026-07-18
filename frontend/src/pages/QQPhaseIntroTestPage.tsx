// ── QQ PhaseIntro-Test — Vorschau des Finalrunden-Intros (bild 11 Badge) ──────
// Rendert die ECHTE PhaseIntroView in einem Beamer-Stage mit Mock-State, der die
// Arena-Finalrunde erzwingt (gamePhaseIndex === totalPhases) → Finale-Badge.
// Toggle: ×2 (Finalrunde) / ×3 (Schlussfrage) + Sprache. Route: /phaseintro-test.
import React, { useMemo, useState } from 'react';
import { QQ_AVATARS } from '@shared/quarterQuizTypes';
import type { QQStateUpdate } from '@shared/quarterQuizTypes';
import { PhaseIntroView } from '../components/CozyQuizPhaseIntroView';

const AVS = ['panda', 'fox', 'raccoon', 'cat', 'frog', 'unicorn', 'rabbit', 'cow'];
const colorOf = (a: string) => QQ_AVATARS.find(x => x.id === a)?.color ?? '#8892b0';

export default function QQPhaseIntroTestPage() {
  const [lang, setLang] = useState<'de' | 'en'>('de');
  const [mult, setMult] = useState<2 | 3>(2); // ×3 = Schlussfrage (questionIndex%5===4)
  const [remount, setRemount] = useState(0);

  const state = useMemo(() => {
    const teams = AVS.map((a, i) => ({ id: `t${i}`, avatarId: a, emoji: '', color: colorOf(a), name: a }));
    const schedule = [
      { phase: 1, category: 'BUNTE_TUETE', bunteTueteKind: 'crowdEstimate' },
      { phase: 1, category: 'SCHAETZCHEN' },
      { phase: 2, category: 'MUCHO' },
      { phase: 2, category: 'CHEESE' },
      { phase: 2, category: 'ZEHN_VON_ZEHN' },
    ];
    return {
      phase: 'PHASE_INTRO',
      largeGroupMode: true,
      nestedTeams: true,
      gamePhaseIndex: 2,
      totalPhases: 2,
      // ×3 braucht questionIndex%5===4; firstIdx von Phase 2 = 2 → questionIndex 6 (%5=1? )
      // Finale-Mult liest questionIndex%5: 4 → ×3, sonst ×2. Fuer den Tree soll
      // questionIndex in Phase 2 liegen (>=2). ×2: qi=2 (%5=2). ×3: qi=4 (%5=4).
      questionIndex: mult === 3 ? 4 : 2,
      introStep: 0,
      language: lang,
      categoryIsNew: true,
      connectionsEnabled: false,
      sfxMuted: true,
      currentQuestion: { category: 'MUCHO', text: 'Test', textEn: 'Test' },
      schedule,
      teams,
    } as unknown as QQStateUpdate;
  }, [lang, mult]);

  return (
    <div style={S.page}>
      <div style={S.controls}>
        <span style={S.title}>PhaseIntro-Vorschau · Finalrunden-Badge (bild 11)</span>
        <div style={S.seg}>
          <button style={btn(lang === 'de')} onClick={() => setLang('de')}>DE</button>
          <button style={btn(lang === 'en')} onClick={() => setLang('en')}>EN</button>
        </div>
        <div style={S.seg}>
          <button style={btn(mult === 2)} onClick={() => setMult(2)}>×2 Finalrunde</button>
          <button style={btn(mult === 3)} onClick={() => setMult(3)}>×3 Schlussfrage</button>
        </div>
        <button style={S.ghost} onClick={() => setRemount(k => k + 1)}>▶ neu</button>
      </div>
      <div style={S.stageWrap}>
        <div style={S.stage}>
          <PhaseIntroView key={`${lang}-${mult}-${remount}`} state={state} />
        </div>
      </div>
    </div>
  );
}

const btn = (on: boolean): React.CSSProperties => ({
  background: on ? '#EC4899' : 'rgba(255,255,255,0.08)', color: '#fff', border: 'none',
  borderRadius: 10, padding: '9px 15px', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
});
const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0a0f24', color: '#f4f6ff', fontFamily: "'Nunito', system-ui, sans-serif", padding: '20px 28px 48px' },
  controls: { maxWidth: 1240, margin: '0 auto 16px', background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 14, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  title: { fontWeight: 900, fontSize: 15 },
  seg: { display: 'flex', gap: 6 },
  ghost: { background: 'transparent', color: '#f4f6ff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '9px 15px', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  stageWrap: { maxWidth: 1240, margin: '0 auto' },
  stage: { position: 'relative', width: '100%', aspectRatio: '16 / 9', containerType: 'size', borderRadius: 16, overflow: 'hidden', background: '#0a0f24', display: 'flex' } as React.CSSProperties,
};
