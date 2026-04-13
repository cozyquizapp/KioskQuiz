// ── Shared Quarter Quiz constants (used by BeamerPage + CustomSlide) ──────────

export const QQ_BEAMER_CSS = `
  @keyframes cfloat  { 0%,100%{transform:translateY(0) rotate(var(--r,0deg))} 50%{transform:translateY(-12px) rotate(var(--r,0deg))} }
  @keyframes cfloata { 0%,100%{transform:translateY(0) rotate(var(--r,0deg))} 50%{transform:translateY(10px)  rotate(var(--r,0deg))} }
  @keyframes cavspin  { from{transform:rotate(var(--r,0deg))} to{transform:rotate(calc(var(--r,0deg) + 360deg))} }
  @keyframes cavpulse { 0%,100%{transform:scale(1) rotate(var(--r,0deg))} 50%{transform:scale(1.22) rotate(var(--r,0deg))} }
  @keyframes cavshake { 0%,100%{transform:translateX(0) rotate(var(--r,0deg))} 20%{transform:translateX(-7px) rotate(calc(var(--r,0deg) - 5deg))} 40%{transform:translateX(7px) rotate(calc(var(--r,0deg) + 5deg))} 60%{transform:translateX(-4px) rotate(calc(var(--r,0deg) - 3deg))} 80%{transform:translateX(4px) rotate(calc(var(--r,0deg) + 3deg))} }
  @keyframes cavdance { 0%,100%{transform:translateY(0) rotate(var(--r,0deg))} 25%{transform:translateY(-10px) rotate(calc(var(--r,0deg) - 8deg))} 75%{transform:translateY(-10px) rotate(calc(var(--r,0deg) + 8deg))} }
  @keyframes cavpeek  { 0%,40%,100%{transform:translateY(0) rotate(var(--r,0deg))} 15%{transform:translateY(-18px) rotate(var(--r,0deg))} 30%{transform:translateY(-14px) rotate(calc(var(--r,0deg) + 5deg))} }
  @keyframes cavflip  { 0%,100%{transform:rotateY(0deg) rotate(var(--r,0deg))} 50%{transform:rotateY(180deg) rotate(var(--r,0deg))} }
  @keyframes ffmove {
    0%{transform:translate(0,0) scale(1);opacity:0}
    10%{opacity:0.85}
    45%{transform:translate(var(--dx,40px),var(--dy,-50px)) scale(1.3);opacity:0.6}
    90%{opacity:0.3}
    100%{transform:translate(calc(var(--dx,40px)*1.6),calc(var(--dy,-50px)*1.6)) scale(0.6);opacity:0}
  }
  @keyframes introBadgePop { from{opacity:0;transform:scale(0.45) translateY(48px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes introFadeOut  { to{opacity:0;pointer-events:none} }
  @keyframes contentReveal { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes floatNum { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-16px)} }
  @keyframes phasePop { from{opacity:0;transform:scale(0.6) translateY(40px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes phaseLineGrow { from{transform:scaleX(0)} to{transform:scaleX(1)} }
  @keyframes introRoundReveal {
    0%   { opacity:0; transform:scale(0.6) translateY(40px); }
    20%  { opacity:1; transform:scale(1) translateY(0); }
    65%  { opacity:1; transform:scale(1) translateY(0); }
    100% { opacity:0.7; transform:scale(0.5) translateY(-60px); }
  }
  @keyframes nbSlide { from{opacity:0;transform:translateX(-28px)} to{opacity:1;transform:translateX(0)} }
  @keyframes winnerPulse { 0%,100%{opacity:0.85;transform:scale(1)} 50%{opacity:1;transform:scale(1.04)} }
  @keyframes qqGlow { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.2)} }
  @keyframes gridCellIn { from{opacity:0;transform:scale(0.5)} to{opacity:1;transform:scale(1)} }
  @keyframes cellInkFill {
    0%   { clip-path: circle(0% at 50% 50%); opacity: 0; filter: brightness(1); }
    30%  { opacity: 1; filter: brightness(1.8); }
    60%  { filter: brightness(1.2); }
    100% { clip-path: circle(100% at 50% 50%); opacity: 1; filter: brightness(1); }
  }
  @keyframes cellShockwave {
    0%   { transform: scale(0.8); opacity: 0.8; }
    40%  { transform: scale(1.6); opacity: 0.4; }
    100% { transform: scale(2.6); opacity: 0; }
  }
  @keyframes cellEmojiDrop {
    0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
    50%  { transform: scale(1.4) rotate(6deg); opacity: 1; }
    70%  { transform: scale(0.85) rotate(-3deg); }
    85%  { transform: scale(1.08) rotate(1deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes cellSparkle {
    0%   { transform: translate(0,0) scale(1); opacity: 1; }
    100% { transform: translate(var(--sx), var(--sy)) scale(0); opacity: 0; }
  }
  @keyframes toastUp { from{opacity:0;transform:translateY(16px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes imgFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
  @keyframes imgZoomIn { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
  @keyframes imgReveal { from{clip-path:inset(0 100% 0 0)} to{clip-path:inset(0 0 0 0)} }
  @keyframes imgSlideL { from{opacity:0;transform:translateX(-60px)} to{opacity:1;transform:translateX(0)} }
  @keyframes imgSlideR { from{opacity:0;transform:translateX(60px)} to{opacity:1;transform:translateX(0)} }
  @keyframes fsExpand { from{clip-path:inset(10% 15% 10% 15% round 22px)} to{clip-path:inset(0 0 0 0 round 0px)} }
  @keyframes langFadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

  @keyframes confettiFall {
    0%   { transform: translateY(var(--cy, -60px)) rotate(0deg) scale(1); opacity: 1; }
    75%  { opacity: 1; }
    100% { transform: translateY(calc(100vh + 40px)) rotate(var(--cr, 720deg)) scale(0.4); opacity: 0; }
  }
  @keyframes celebShake {
    0%, 100% { transform: translateX(0); }
    15% { transform: translateX(-6px) rotate(-1deg); }
    30% { transform: translateX(5px) rotate(1deg); }
    45% { transform: translateX(-4px); }
    60% { transform: translateX(3px); }
  }
  @keyframes scorePop {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.25); }
    70%  { transform: scale(0.95); }
    100% { transform: scale(1); }
  }
  @keyframes qrGlow {
    0%, 100% { box-shadow: 0 12px 48px rgba(0,0,0,0.6), 0 0 20px rgba(255,255,255,0.05); }
    50%      { box-shadow: 0 12px 48px rgba(0,0,0,0.6), 0 0 40px rgba(234,179,8,0.35), 0 0 80px rgba(234,179,8,0.18); }
  }
  @keyframes teamCardIn {
    from { opacity: 0; transform: translateY(20px) scale(0.9); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes lobbyPulse {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.6; }
  }
  @keyframes winnerSlideIn {
    from { opacity: 0; transform: translateY(24px) scale(0.92); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes timerUrgent {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.12); }
  }
  @keyframes bTimerPulse {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.08); }
  }
  @keyframes bTimerGlow {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50%      { opacity: 1; transform: scale(1.05); }
  }
  @keyframes bQuestionIn {
    from { opacity: 0; transform: scale(0.92) translateY(20px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes bAnswerCheck {
    from { opacity: 0; transform: scale(0.7); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes dotPulse {
    0%, 80%, 100% { opacity: 0.3; }
    40% { opacity: 1; }
  }
  @keyframes scoreFloat {
    0%   { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-40px) scale(1.2); }
  }
  @keyframes frostShimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes frostPulse {
    0%, 100% { box-shadow: 0 0 8px rgba(147,210,255,0.4), inset 0 0 6px rgba(147,210,255,0.15); border-color: rgba(147,210,255,0.7); }
    50%      { box-shadow: 0 0 18px rgba(147,210,255,0.7), inset 0 0 12px rgba(147,210,255,0.3); border-color: rgba(147,210,255,1); }
  }
  @keyframes frostCrystal {
    0%, 100% { opacity: 0.7; transform: scale(1); }
    50%      { opacity: 1; transform: scale(1.15); }
  }
  @keyframes roundBam {
    0%   { opacity: 0; transform: scale(1.35); filter: brightness(2); }
    40%  { opacity: 1; transform: scale(0.95); filter: brightness(1.3); }
    65%  { transform: scale(1.03); filter: brightness(1.05); }
    100% { transform: scale(1); filter: brightness(1); }
  }
  @keyframes roundShockwave {
    0%   { transform: scale(0.3); opacity: 0.8; }
    50%  { opacity: 0.4; }
    100% { transform: scale(3); opacity: 0; }
  }
  @keyframes roundLineGlow {
    from { transform: scaleX(0); filter: brightness(2); }
    60%  { filter: brightness(1.5); }
    to   { transform: scaleX(1); filter: brightness(1); }
  }
  @keyframes roundBreathe {
    0%, 100% { transform: scale(1); filter: brightness(1); }
    50%      { transform: scale(1.02); filter: brightness(1.12); }
  }
  @keyframes lineShimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes subtitleSlide {
    0%   { opacity: 0; transform: translateY(16px) scale(0.9); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

export const QQ_CAT_BADGE_BG: Record<string, string> = {
  SCHAETZCHEN:   'linear-gradient(135deg, #A16207, #EAB308)',
  MUCHO:         'linear-gradient(135deg, #1E3A8A, #2563EB)',
  BUNTE_TUETE:   'linear-gradient(135deg, #991B1B, #DC2626)',
  ZEHN_VON_ZEHN: 'linear-gradient(135deg, #065F46, #059669)',
  CHEESE:        'linear-gradient(135deg, #4C1D95, #7C3AED)',
};

export const QQ_CAT_ACCENT: Record<string, string> = {
  SCHAETZCHEN:   '#EAB308',
  MUCHO:         '#60A5FA',
  BUNTE_TUETE:   '#F87171',
  ZEHN_VON_ZEHN: '#34D399',
  CHEESE:        '#A78BFA',
};
