// ── QQ Reveal-Test — Vorschau der Reveal-Folien ohne Durchspielen ────────────
// 2026-07-12: Design-System North Star. Rendert die echte SchaetzchenReveal in
// einem Beamer-Stage (16:9, container-type:size fuer cqw/cqh) mit Mock-Daten.
// Umschalter: Sprache DE/EN + Arena (Fraktionen) / Grid (Team-Namen), damit
// sichtbar ist, dass EINE Design-Handschrift beide Modi bedient.
//
// Route: /reveal-test (PinGate). Keine Socket-/Backend-Anbindung.

import React, { useMemo, useState } from 'react';
import { QQ_AVATARS } from '@shared/quarterQuizTypes';
import type { QQStateUpdate } from '@shared/quarterQuizTypes';
import { SchaetzchenReveal } from '../components/reveals/SchaetzchenReveal';

const colorOf = (avatarId: string): string => QQ_AVATARS.find(a => a.id === avatarId)?.color ?? '#8892b0';

// Fraktion (avatarId) + ihr bester Tipp. Ziel = 87 (Happy Hour/panda trifft exakt).
const FACTS: { av: string; guess: number }[] = [
  { av: 'panda',   guess: 87 }, // Happy Hour — exakt
  { av: 'fox',     guess: 90 }, // Gut Feeling
  { av: 'raccoon', guess: 82 }, // Wing It
  { av: 'cat',     guess: 80 }, // All In
  { av: 'frog',    guess: 79 }, // Lucky Guess
  { av: 'unicorn', guess: 93 }, // Know-It-All
  { av: 'rabbit',  guess: 85 }, // Last Second
  { av: 'cow',     guess: 76 }, // Objection
];
const GRID_NAMES = ['Die Schnellmerker', 'Team Kaffeepause', 'Nerd Alert', 'Die Rätselratten', 'Blindflug', 'Besserwisser AG', 'Einspruch!', 'Volles Risiko'];

export default function QQRevealTestPage() {
  const [lang, setLang] = useState<'de' | 'en'>('de');
  const [arena, setArena] = useState(true);
  const [remountKey, setRemountKey] = useState(0); // Cascade neu abspielen

  const state = useMemo(() => {
    const answers = FACTS.map((f, i) => ({ teamId: `t${i}`, text: String(f.guess), submittedAt: 1000 + i * 7 }));
    const teams = FACTS.map((f, i) => ({
      id: `t${i}`, avatarId: f.av, emoji: '', color: colorOf(f.av),
      name: arena ? f.av : GRID_NAMES[i],
    }));
    return {
      currentQuestion: {
        category: 'SCHAETZCHEN',
        targetValue: 87,
        unit: 'Tasten', unitEn: 'keys',
        text: 'Wie viele Tasten hat eine Standard-QWERTZ-Tastatur (deutsches Layout, ohne Nummernblock)?',
        textEn: 'How many keys does a standard QWERTZ keyboard have (German layout, without numpad)?',
        isYearAnswer: false,
      },
      answers,
      teams,
      currentQuestionWinners: [],
      sfxMuted: true,
      nestedTeams: arena,
    } as unknown as QQStateUpdate;
  }, [arena]);

  return (
    <div style={S.page}>
      <div style={S.controls}>
        <span style={S.title}>Reveal-Vorschau · Schätzchen (North Star)</span>
        <div style={S.seg}>
          <button style={btn(lang === 'de')} onClick={() => setLang('de')}>DE</button>
          <button style={btn(lang === 'en')} onClick={() => setLang('en')}>EN</button>
        </div>
        <div style={S.seg}>
          <button style={btn(arena)} onClick={() => setArena(true)}>Arena · Fraktionen</button>
          <button style={btn(!arena)} onClick={() => setArena(false)}>Grid · Teams</button>
        </div>
        <button style={S.ghost} onClick={() => setRemountKey(k => k + 1)}>↺ Cascade neu</button>
        <span style={S.hint}>gleiche Komponente, beide Modi · eine Design-Handschrift</span>
      </div>

      {/* Beamer-Stage: 16:9, container-type:size fuer cqw/cqh */}
      <div style={S.stageWrap}>
        <div style={S.stage}>
          <SchaetzchenReveal key={`${arena}-${lang}-${remountKey}`} state={state} lang={lang} />
        </div>
      </div>
    </div>
  );
}

const btn = (on: boolean): React.CSSProperties => ({
  background: on ? '#EC4899' : 'rgba(255,255,255,0.08)', color: '#fff', border: 'none',
  borderRadius: 10, padding: '9px 15px', fontWeight: 800, fontSize: 13, cursor: 'pointer',
  fontFamily: 'inherit',
});

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', background: 'radial-gradient(1200px 800px at 20% 0%, #1e2a5a 0%, #0e1530 60%, #0a0f24 100%)',
    color: '#f4f6ff', fontFamily: "'Nunito', system-ui, sans-serif", padding: '20px 28px 48px',
  },
  controls: {
    maxWidth: 1240, margin: '0 auto 16px', background: 'rgba(255,255,255,0.05)', borderRadius: 16,
    padding: 14, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
  },
  title: { fontWeight: 900, fontSize: 15 },
  seg: { display: 'flex', gap: 6 },
  ghost: { background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '9px 13px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  hint: { marginLeft: 'auto', fontSize: 12, opacity: 0.5 },
  stageWrap: { maxWidth: 1240, margin: '0 auto' },
  stage: {
    containerType: 'size', width: '100%', aspectRatio: '16 / 9',
    // Warme, cozy Bühne (wie der echte Beamer) statt kaltem Navy.
    background: 'radial-gradient(1100px 760px at 30% -8%, #3a1a44 0%, #241338 42%, #140b26 100%)',
    borderRadius: 24, border: '1px solid rgba(236,72,153,0.16)', boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
    overflow: 'hidden', display: 'flex', position: 'relative',
  } as React.CSSProperties,
};
