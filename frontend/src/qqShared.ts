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
  @keyframes phasePop { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
  @keyframes phaseLineGrow { from{transform:scaleX(0)} to{transform:scaleX(1)} }
  @keyframes introRoundReveal {
    0%   { opacity:0; transform:scale(0.6) translateY(40px); }
    20%  { opacity:1; transform:scale(1) translateY(0); }
    65%  { opacity:1; transform:scale(1) translateY(0); }
    100% { opacity:0.7; transform:scale(0.5) translateY(-60px); }
  }
  @keyframes nbSlide { from{opacity:0;transform:translateX(-28px)} to{opacity:1;transform:translateX(0)} }

  /* 2026-05-03 (Wolf-Wunsch): Kategorie-Badge-Wuerfel bewegt sich nur leicht,
     kein Roll-In. Konstante sanfte Drift durch alle 3 Achsen, ~6s pro Loop —
     gibt 3D-Tiefe ohne abzulenken. */
  @keyframes qqCubeIdle {
    0%, 100% { transform: rotateY(-5deg) rotateX(3deg); }
    25%      { transform: rotateY(5deg)  rotateX(-2deg); }
    50%      { transform: rotateY(-2deg) rotateX(-4deg); }
    75%      { transform: rotateY(4deg)  rotateX(4deg); }
  }

  /* ── Gameshow slide transitions ──────────────────────────────────────────── */
  /* New slide eases in with slight overshoot + blur clearing */
  @keyframes qqSlideIn {
    0%   { opacity: 0; transform: scale(1.04) translateY(-6px); filter: blur(3px); }
    60%  { opacity: 1; filter: blur(0); }
    100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
  }
  /* Soft-Zoom crossfade — sanfter Blur+Scale-Puls über den Screen, kein Diagonal-Sheen */
  @keyframes qqSoftZoom {
    0%   { opacity: 0;    transform: scale(1);    filter: blur(0px); }
    35%  { opacity: 0.55; transform: scale(1.04); filter: blur(10px); }
    65%  { opacity: 0.55; transform: scale(1.04); filter: blur(10px); }
    100% { opacity: 0;    transform: scale(1);    filter: blur(0px); }
  }
  /* Sehr dezente Dim-Welle für Gewicht unter dem Soft-Zoom */
  @keyframes qqFlashDim {
    0%, 100% { opacity: 0; }
    50%      { opacity: 0.22; }
  }
  /* Round-Transition Ziffer-Flip: alte Ziffer fällt aus dem Titel, neue rollt von oben rein.
     Langsamer + smoother: keine Overshoot-Bounce, ease-out cubic. Mit blur-Hint für Speed-Look. */
  @keyframes roundDigitFall {
    0%   { transform: translateY(0)     scale(1);    opacity: 1;   filter: blur(0); }
    50%  { transform: translateY(45%)   scale(0.96); opacity: 0.55; filter: blur(0.5px); }
    100% { transform: translateY(120%)  scale(0.9);  opacity: 0;   filter: blur(2px); }
  }
  @keyframes roundDigitRoll {
    0%   { transform: translateY(-120%) scale(0.9);  opacity: 0;   filter: blur(2px); }
    45%  { transform: translateY(-30%)  scale(0.96); opacity: 0.7; filter: blur(0.4px); }
    100% { transform: translateY(0)     scale(1);    opacity: 1;   filter: blur(0); }
  }
  /* Farb-Sweep: Wort "Runde" tauscht von Grau auf Kategorie-Farbe via gradient-Shift. */
  @keyframes roundWordSweep {
    0%   { background-position: 200% 0; }
    100% { background-position: 0 0; }
  }
  /* RoundMiniTree Wolf-Hop: wolf springt in einem kurzen Bogen zum nächsten Dot */
  @keyframes roundMiniHop {
    0%   { transform: translate(-50%, -50%); }
    45%  { transform: translate(-50%, -115%); }
    100% { transform: translate(-50%, -50%); }
  }
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
  @keyframes fsNudgePulse {
    0%, 100% { box-shadow: 0 6px 18px rgba(0,0,0,0.4), 0 0 0 0 rgba(251,191,36,0.45); }
    50%      { box-shadow: 0 6px 18px rgba(0,0,0,0.4), 0 0 0 10px rgba(251,191,36,0); }
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
  /* Hot-Seat-Spotlight: warmer Lichtkegel-Flicker auf das aktive Team. */
  @keyframes hotSeatFlicker {
    0%, 100% { opacity: 0.85; transform: translateY(0) scaleY(1); }
    35%      { opacity: 1.0;  transform: translateY(-1px) scaleY(1.02); }
    65%      { opacity: 0.78; transform: translateY(0) scaleY(0.99); }
  }
  /* Hot-Seat-Glitter: einzelne Funken die durch den Lichtkegel fallen. */
  @keyframes hotSeatGlitter {
    0%   { transform: translate(0, -8px); opacity: 0; }
    20%  { opacity: 1; }
    80%  { opacity: 0.6; }
    100% { transform: translate(2px, 70px); opacity: 0; }
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
  /* Schild-Glow: dauerhaft sichtbarer goldener Ring um geschuetzte Felder
     (2s-Loop). Deutlicher als frostPulse, damit geschuetzte Felder aus
     Beamer-Distanz lesbar sind. */
  @keyframes shieldGlow {
    0%, 100% {
      box-shadow: 0 0 10px rgba(251,191,36,0.4), 0 0 22px rgba(251,191,36,0.18), inset 0 0 8px rgba(251,191,36,0.15);
      border-color: rgba(251,191,36,0.75);
    }
    50% {
      box-shadow: 0 0 20px rgba(251,191,36,0.75), 0 0 42px rgba(251,191,36,0.35), inset 0 0 14px rgba(251,191,36,0.3);
      border-color: rgba(251,191,36,1);
    }
  }
  /* Schild-Puls einmalig beim Setzen (~700ms): groesserer Blitz-Effekt. */
  @keyframes shieldBurst {
    0%   { transform: scale(1.4); opacity: 0; box-shadow: 0 0 0 rgba(251,191,36,0); }
    40%  { transform: scale(1); opacity: 1; box-shadow: 0 0 40px rgba(251,191,36,0.9), 0 0 70px rgba(251,191,36,0.4); }
    100% { transform: scale(1); opacity: 1; box-shadow: 0 0 16px rgba(251,191,36,0.5); }
  }
  /* Stapel-Drop: Stempel kracht von oben rein mit Bounce, Dust-Ring expandiert. */
  @keyframes stapelDrop {
    0%   { transform: translateY(-60px) scale(1.3) rotate(-8deg); opacity: 0; filter: brightness(1.4); }
    55%  { transform: translateY(4px) scale(1.05) rotate(2deg); opacity: 1; filter: brightness(1.1); }
    75%  { transform: translateY(-2px) scale(0.98) rotate(-1deg); }
    100% { transform: translateY(0) scale(1) rotate(0); opacity: 1; filter: brightness(1); }
  }
  @keyframes stapelShake {
    0%, 100% { transform: translateX(0); }
    15%  { transform: translateX(-3px); }
    30%  { transform: translateX(3px); }
    45%  { transform: translateX(-2px); }
    60%  { transform: translateX(2px); }
    80%  { transform: translateX(-1px); }
  }
  @keyframes stapelDustRing {
    0%   { transform: scale(0.4); opacity: 0.8; }
    100% { transform: scale(1.8); opacity: 0; }
  }
  /* Klauen: roter Flash + Avatar fly-out + crash-in. Wird von der Zelle getragen. */
  @keyframes stealFlash {
    0%   { background: transparent; }
    15%  { background: rgba(239,68,68,0.55); }
    60%  { background: rgba(239,68,68,0.22); }
    100% { background: transparent; }
  }
  @keyframes stealCrashIn {
    0%   { transform: scale(1.5); opacity: 0; filter: brightness(1.8); }
    50%  { transform: scale(0.9); opacity: 1; filter: brightness(1.2); }
    75%  { transform: scale(1.05); filter: brightness(1.05); }
    100% { transform: scale(1); opacity: 1; filter: brightness(1); }
  }
  @keyframes stealBurst {
    0%   { transform: scale(0.3); opacity: 1; border-width: 3px; }
    100% { transform: scale(2.4); opacity: 0; border-width: 1px; }
  }
  /* Comeback-BAM: Screen-Flash + Schrift-Slam + Shake. */
  @keyframes comebackFlash {
    0%   { opacity: 0; }
    20%  { opacity: 0.85; }
    100% { opacity: 0; }
  }
  @keyframes comebackSlam {
    0%   { opacity: 0; transform: translateY(-180px) scale(1.5) rotate(-4deg); filter: blur(6px) brightness(2); }
    50%  { opacity: 1; transform: translateY(18px) scale(0.92) rotate(1deg); filter: blur(0) brightness(1.4); }
    70%  { transform: translateY(-8px) scale(1.04) rotate(-0.5deg); filter: brightness(1.15); }
    100% { opacity: 1; transform: translateY(0) scale(1) rotate(0); filter: brightness(1); }
  }
  @keyframes comebackShake {
    0%, 100% { transform: translate(0, 0); }
    15%  { transform: translate(-6px, 2px); }
    30%  { transform: translate(6px, -2px); }
    45%  { transform: translate(-4px, 3px); }
    60%  { transform: translate(4px, -1px); }
    75%  { transform: translate(-2px, 1px); }
    90%  { transform: translate(2px, 0); }
  }
  @keyframes comebackBoltFall {
    0%   { opacity: 0; transform: translateY(-80vh) rotate(var(--bolt-rot, 0deg)) scale(0.6); }
    10%  { opacity: 1; }
    70%  { opacity: 1; }
    100% { opacity: 0; transform: translateY(120vh) rotate(var(--bolt-rot, 0deg)) scale(1); }
  }
  /* Joker-Stern-Flug (B2): Stern startet in Frage-Zone (CSS-Variablen von/to),
     fliegt in Team-Header-Pill, dort Impact-Pulse. */
  @keyframes jokerStarFly {
    0%   { opacity: 0; transform: translate(0, 0) scale(0.4) rotate(0deg); }
    10%  { opacity: 1; transform: translate(0, 0) scale(1.2) rotate(30deg); }
    85%  { opacity: 1; transform: translate(var(--jk-dx, 0), var(--jk-dy, -300px)) scale(0.85) rotate(540deg); }
    100% { opacity: 0; transform: translate(var(--jk-dx, 0), var(--jk-dy, -300px)) scale(0.4) rotate(600deg); }
  }
  @keyframes jokerImpactPulse {
    0%   { transform: scale(1); box-shadow: 0 0 0 rgba(251,191,36,0); }
    30%  { transform: scale(1.22); box-shadow: 0 0 28px rgba(251,191,36,0.8), 0 0 60px rgba(251,191,36,0.35); }
    60%  { transform: scale(0.96); }
    100% { transform: scale(1); box-shadow: 0 0 10px rgba(251,191,36,0.3); }
  }
  /* C1 Hot-Potato-Elimination: Shake-red + fade-to-grey + Kartoffel-Drop. */
  @keyframes hpEliminate {
    0%   { transform: translate(0, 0) rotate(0); filter: brightness(1) saturate(1); }
    10%  { transform: translate(-8px, 2px) rotate(-4deg); filter: brightness(1.4) saturate(1.3) drop-shadow(0 0 12px rgba(239,68,68,0.8)); }
    20%  { transform: translate(8px, -2px) rotate(4deg); filter: brightness(1.4) saturate(1.3) drop-shadow(0 0 12px rgba(239,68,68,0.8)); }
    30%  { transform: translate(-6px, 2px) rotate(-3deg); filter: brightness(1.3) saturate(1.2); }
    40%  { transform: translate(6px, -1px) rotate(3deg); filter: brightness(1.2) saturate(1.1); }
    50%  { transform: translate(-4px, 1px) rotate(-1deg); filter: brightness(1.1); }
    60%  { transform: translate(2px, 0) rotate(1deg); filter: brightness(1); }
    100% { transform: translate(0, 0) rotate(0); filter: grayscale(0.8) brightness(0.65) saturate(0.4); }
  }
  @keyframes hpPotatoDrop {
    0%   { opacity: 0; transform: translate(0, -24px) rotate(0) scale(0.6); }
    30%  { opacity: 1; transform: translate(0, 0) rotate(-15deg) scale(1.1); }
    60%  { transform: translate(0, -4px) rotate(10deg) scale(1); }
    100% { opacity: 0; transform: translate(0, 80px) rotate(-30deg) scale(0.8); }
  }
  /* C2 Streak: Feuer-Wackel. */
  @keyframes streakFlameWobble {
    0%, 100% { transform: scale(1) rotate(-3deg); }
    50%      { transform: scale(1.1) rotate(3deg); }
  }
  /* C3 Timer-Urgency-Vignette: Screen-Rand pulsiert rot. */
  @keyframes timerVignettePulse {
    0%, 100% { box-shadow: inset 0 0 40px rgba(239,68,68,0.2), inset 0 0 120px rgba(239,68,68,0.08); }
    50%      { box-shadow: inset 0 0 80px rgba(239,68,68,0.4), inset 0 0 220px rgba(239,68,68,0.18); }
  }
  /* C4 Map-Target-Drop. */
  @keyframes mapTargetDrop {
    0%   { opacity: 0; transform: translateY(-300px) scale(1.6) rotate(-8deg); filter: brightness(1.6); }
    55%  { opacity: 1; transform: translateY(8px) scale(0.92); filter: brightness(1.25); }
    75%  { transform: translateY(-3px) scale(1.04); }
    100% { opacity: 1; transform: translateY(0) scale(1) rotate(0); filter: brightness(1); }
  }
  /* C5 QR-Scan-me-Breath. */
  @keyframes qrScanBreath {
    0%, 100% { box-shadow: 0 0 0 rgba(34,197,94,0), 0 8px 28px rgba(0,0,0,0.4); transform: scale(1); }
    50%      { box-shadow: 0 0 26px rgba(34,197,94,0.4), 0 0 60px rgba(34,197,94,0.2), 0 8px 28px rgba(0,0,0,0.4); transform: scale(1.01); }
  }
  /* C6 Swap-Cross-Over: Avatar-Paar kreuzt sich mit Bogen. */
  @keyframes swapFlyA {
    0%   { transform: translate(0, 0) scale(1); }
    50%  { transform: translate(var(--swap-mid-x, 100px), -40px) scale(1.1); }
    100% { transform: translate(var(--swap-dx, 200px), 0) scale(1); }
  }
  @keyframes swapFlyB {
    0%   { transform: translate(0, 0) scale(1); }
    50%  { transform: translate(calc(-1 * var(--swap-mid-x, 100px)), 40px) scale(1.1); }
    100% { transform: translate(calc(-1 * var(--swap-dx, 200px)), 0) scale(1); }
  }
  /* C7 Sanduhr-Drop + Rotate. */
  @keyframes sanduhrDrop {
    0%   { opacity: 0; transform: translateY(-40px) rotate(-180deg) scale(0.5); }
    55%  { opacity: 1; transform: translateY(4px) rotate(20deg) scale(1.1); }
    100% { opacity: 1; transform: translateY(0) rotate(0) scale(1); }
  }
  @keyframes sanduhrTick {
    0%, 100% { transform: rotate(0); }
    25%      { transform: rotate(8deg); }
    75%      { transform: rotate(-8deg); }
  }
  /* F1 Team-Join-Wave: Card shaked kurz + scaled hoch. */
  @keyframes teamJoinWave {
    0%   { opacity: 0; transform: scale(0.7) translateY(12px); }
    30%  { opacity: 1; transform: scale(1.06) translateY(-2px) rotate(-1deg); }
    45%  { transform: scale(1.02) translateY(0) rotate(1deg); }
    60%  { transform: scale(1) rotate(-0.5deg); }
    100% { opacity: 1; transform: scale(1) translateY(0) rotate(0); }
  }
  /* F1 Begruessungs-Wink 👋 */
  @keyframes teamJoinHi {
    0%   { opacity: 0; transform: translateY(-14px) scale(0.5) rotate(-20deg); }
    30%  { opacity: 1; transform: translateY(2px) scale(1.2) rotate(14deg); }
    55%  { transform: translateY(-2px) scale(1) rotate(-8deg); }
    80%  { transform: scale(1.05) rotate(12deg); }
    100% { opacity: 0; transform: scale(0.9) rotate(0); }
  }
  /* F2 Ranking-Shuffle: Zeile schiebt vertikal sanft weiter. */
  @keyframes rankShuffle {
    0%   { transform: translateY(var(--shuffle-from, 0px)); }
    100% { transform: translateY(0); }
  }
  /* G1 Round-End-Toast — dezent von unten statt Full-Screen-Overlay. */
  @keyframes roundEndToast {
    0%   { opacity: 0; transform: translate(-50%, 36px); }
    12%  { opacity: 1; transform: translate(-50%, 0); }
    85%  { opacity: 1; transform: translate(-50%, 0); }
    100% { opacity: 0; transform: translate(-50%, 18px); }
  }
  /* G2 Placement-Entry-Sweep: heller Streifen laeuft uebers Grid beim Reveal→Placement. */
  @keyframes placementSweep {
    0%   { transform: translateX(-120%) skewX(-14deg); opacity: 0.6; }
    40%  { opacity: 0.85; }
    100% { transform: translateX(220%) skewX(-14deg); opacity: 0; }
  }
  /* H1 Perfect-Round Rainbow-Burst. */
  @keyframes rainbowBurst {
    0%   { opacity: 0; transform: scale(0.3) rotate(0); }
    40%  { opacity: 1; transform: scale(1.1) rotate(60deg); }
    100% { opacity: 0; transform: scale(2.2) rotate(180deg); }
  }
  /* H2 First-Steal-Badge. */
  @keyframes firstStealBadge {
    0%   { opacity: 0; transform: translateY(-60px) scale(0.5) rotate(-10deg); }
    30%  { opacity: 1; transform: translateY(8px) scale(1.08) rotate(3deg); }
    50%  { transform: translateY(-4px) scale(1) rotate(-1deg); }
    80%  { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-16px) scale(0.9); }
  }
  /* J1 Moderator-Toast-Slide. */
  @keyframes modToastSlide {
    0%   { opacity: 0; transform: translateX(60px); }
    12%  { opacity: 1; transform: translateX(0); }
    80%  { opacity: 1; transform: translateX(0); }
    100% { opacity: 0; transform: translateX(30px); }
  }
  /* J2 Idle-Hint sanftes Pulsieren. */
  @keyframes idleHintPulse {
    0%, 100% { opacity: 0.55; transform: translateY(0); }
    50%      { opacity: 1; transform: translateY(-3px); }
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
  @keyframes revealCorrectPop {
    0%   { transform: scale(1); box-shadow: 0 0 0 rgba(34,197,94,0); }
    30%  { transform: scale(1.06); box-shadow: 0 0 40px rgba(34,197,94,0.5); }
    60%  { transform: scale(0.98); }
    100% { transform: scale(1); box-shadow: 0 0 24px rgba(34,197,94,0.3); }
  }
  @keyframes revealWrongDim {
    from { opacity: 1; filter: brightness(1) saturate(1); }
    to   { opacity: 0.45; filter: brightness(0.6) saturate(0.3); }
  }
  @keyframes revealAnswerBam {
    0%   { opacity: 0; transform: scale(0.8); filter: brightness(2); }
    40%  { opacity: 1; transform: scale(1.04); filter: brightness(1.3); }
    70%  { transform: scale(0.98); filter: brightness(1.05); }
    100% { transform: scale(1); filter: brightness(1); }
  }
  /* Sanfter Cross-Fade ohne Scale — für Comeback-HL Reveal damit beim
     ?→MEHR↑/WENIGER↓ Wechsel KEIN Scale-Wackeln entsteht. */
  @keyframes comebackHLFadeIn {
    0%   { opacity: 0; }
    100% { opacity: 1; }
  }
  /* Joker-Cell-Pulse — wenn ein Team gerade ein 2×2 oder 4×1 geformt hat,
     leuchten die beteiligten Zellen 2.2s gold auf. */
  @keyframes jokerCellPulse {
    0%   { box-shadow: 0 0 0 0 rgba(251,191,36,0.0), 0 0 0 0 rgba(251,191,36,0.0); }
    20%  { box-shadow: 0 0 0 4px rgba(251,191,36,0.95), 0 0 28px 8px rgba(251,191,36,0.85); }
    50%  { box-shadow: 0 0 0 6px rgba(251,191,36,0.7), 0 0 40px 14px rgba(251,191,36,0.6); }
    80%  { box-shadow: 0 0 0 3px rgba(251,191,36,0.45), 0 0 22px 6px rgba(251,191,36,0.35); }
    100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.0), 0 0 0 0 rgba(251,191,36,0.0); }
  }
  /* Grid-Border-Glow wenn ein Team gerade dran ist (PLACEMENT-Phase) —
     pulsiert sanft mit der Team-Farbe (CSS-Var --active-team-color). */
  @keyframes gridActiveTeamGlow {
    0%, 100% {
      box-shadow:
        0 0 0 1px var(--active-team-color),
        0 0 80px var(--active-team-color),
        0 0 32px var(--active-team-color),
        inset 0 1px 0 rgba(255,255,255,0.04);
      filter: brightness(1);
    }
    50% {
      box-shadow:
        0 0 0 2px var(--active-team-color),
        0 0 100px var(--active-team-color),
        0 0 48px var(--active-team-color),
        inset 0 1px 0 rgba(255,255,255,0.06);
      filter: brightness(1.06);
    }
  }
  /* Kaskade: Team-Avatare poppen einzeln auf die Option — leichter Magnet-Drop von oben mit Bounce + Glow */
  @keyframes muchoVoterDrop {
    0%   { opacity: 0; transform: translateY(-28px) scale(0.55) rotate(-8deg); filter: brightness(1.8) drop-shadow(0 0 12px rgba(255,255,255,0.4)); }
    55%  { opacity: 1; transform: translateY(4px) scale(1.08) rotate(1.5deg); filter: brightness(1.15) drop-shadow(0 0 6px rgba(255,255,255,0.2)); }
    75%  { transform: translateY(-2px) scale(0.96) rotate(-0.5deg); filter: brightness(1.05); }
    100% { opacity: 1; transform: translateY(0) scale(1) rotate(0); filter: brightness(1) drop-shadow(0 0 0 transparent); }
  }
  @keyframes revealFlash {
    0%   { opacity: 0.6; }
    100% { opacity: 0; }
  }
  /* Doppelblink auf die korrekte Option (MUCHO/ZvZ Reveal) — zwei kurze Helligkeits-Pulse, Endzustand hell */
  @keyframes revealDoubleBlink {
    0%   { filter: brightness(1); }
    15%  { filter: brightness(1.9); }
    30%  { filter: brightness(0.75); }
    50%  { filter: brightness(1.9); }
    70%  { filter: brightness(0.85); }
    100% { filter: brightness(1); }
  }
  @keyframes revealShimmer {
    0%   { left: -100%; }
    100% { left: 200%; }
  }
  @keyframes revealWinnerIn {
    0%   { opacity: 0; transform: translateY(30px) scale(0.9); }
    50%  { transform: translateY(-4px) scale(1.02); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  /* Pin-Reveal für Schätzchen-Zeitstrahl — bewahrt das Wrapper-translate
     (--pin-x, --pin-y) und animiert nur opacity + scale. Ohne diese Keyframe
     würde revealWinnerIn die Position auf translateY(0) setzen und der
     Avatar würde auf die Rail zurückspringen. */
  @keyframes pinRevealIn {
    0%   { opacity: 0; transform: translate(calc(-50% + var(--pin-x, 0px)), calc(-50% + var(--pin-y, 0px))) scale(0.6); }
    60%  { opacity: 1; transform: translate(calc(-50% + var(--pin-x, 0px)), calc(-50% + var(--pin-y, 0px))) scale(1.08); }
    100% { opacity: 1; transform: translate(calc(-50% + var(--pin-x, 0px)), calc(-50% + var(--pin-y, 0px))) scale(1); }
  }
  /* Winner-Nudge: Gewinner-Avatar am Zeitstrahl hüpft 2x Richtung Ziel.
     Nutzt CSS-Vars --nudge-x (horizontal offset zum Ziel, z.B. "20px")
     und --nudge-y (vertikal offset des Pins auf dem Strahl, z.B. "-44px"),
     damit die Ausgangs-/Endposition korrekt bleibt. */
  @keyframes winnerNudge {
    0%   { transform: translate(calc(-50% + var(--base-x, 0px)), calc(-50% + var(--nudge-y, 0px))) scale(1); }
    25%  { transform: translate(calc(-50% + var(--base-x, 0px) + var(--nudge-x, 0px) * 0.35), calc(-50% + var(--nudge-y, 0px) - 10px)) scale(1.12); }
    50%  { transform: translate(calc(-50% + var(--base-x, 0px)), calc(-50% + var(--nudge-y, 0px))) scale(1); }
    75%  { transform: translate(calc(-50% + var(--base-x, 0px) + var(--nudge-x, 0px) * 0.55), calc(-50% + var(--nudge-y, 0px) - 14px)) scale(1.15); }
    100% { transform: translate(calc(-50% + var(--base-x, 0px)), calc(-50% + var(--nudge-y, 0px))) scale(1); }
  }
  @keyframes panelSlideIn {
    0%   { opacity: 0; transform: translateY(18px) scale(0.98); filter: blur(4px); }
    60%  { opacity: 1; transform: translateY(-2px) scale(1.003); filter: blur(0); }
    100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
  }
  /* Welcome-Team-Banner in der Lobby: pop-in, 2.4s halten, weich raus. */
  @keyframes qqWelcomeBanner {
    0%   { opacity: 0; transform: translate(-50%, -40%) scale(0.85); }
    12%  { opacity: 1; transform: translate(-50%, -50%) scale(1.04); }
    20%  { transform: translate(-50%, -50%) scale(1); }
    80%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.97); }
  }
  /* Kategorie-Intro-Title: dezenter Glow-Atemzug zwischen weicherem & etwas
     intensiverem Layered-Shadow. Subtil, nicht ablenkend — nur 'lebendig'. */
  @keyframes qqCatTitleBreathe {
    0%, 100% { transform: translateY(0) scale(1); filter: brightness(1); }
    50%      { transform: translateY(-1px) scale(1.005); filter: brightness(1.06); }
  }
  /* Get-Ready-Overlay: kompletter Container fadet rein, hält 2.6s, fadet weich raus. */
  @keyframes qqGetReadyOverlay {
    0%   { opacity: 0; backdrop-filter: blur(0) saturate(1); }
    8%   { opacity: 1; backdrop-filter: blur(14px) saturate(1.1); }
    88%  { opacity: 1; backdrop-filter: blur(14px) saturate(1.1); }
    100% { opacity: 0; backdrop-filter: blur(0) saturate(1); }
  }
  /* Eyebrow- und Subtitle-Slide-In über dem Get-Ready-Countdown. */
  @keyframes qqGetReadyEyebrow {
    0%   { opacity: 0; transform: translateY(8px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  /* Pro Ziffer (3, 2, 1): dramatisch reinpoppen, kurz halten, schnell raus. */
  @keyframes qqGetReadyCount {
    0%   { opacity: 0; transform: scale(2.2); filter: blur(8px); }
    18%  { opacity: 1; transform: scale(1); filter: blur(0); }
    72%  { opacity: 1; transform: scale(1); filter: blur(0); }
    100% { opacity: 0; transform: scale(0.55); filter: blur(2px); }
  }
  /* Comeback H/L Round-Wechsel: nur der Frage-Text fadet sanft durch,
     Card-Layout drumherum bleibt 100% stehen. */
  @keyframes qqHlQuestionFade {
    0%   { opacity: 0; transform: translateY(6px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  /* Pause/Lobby Panel-Inhalts-Wechsel: Card-Hülle bleibt stehen, nur der
     innere Content fadet weich rein (mit minimalem Y-Lift + Blur-Out). */
  @keyframes qqPanelContentFade {
    0%   { opacity: 0; transform: translateY(10px) scale(0.99); filter: blur(2px); }
    50%  { opacity: 0.7; filter: blur(0); }
    100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
  }
  @keyframes panelIconPop {
    0%   { transform: scale(0.5) rotate(-18deg); opacity: 0; }
    55%  { transform: scale(1.25) rotate(8deg); opacity: 1; }
    80%  { transform: scale(0.95) rotate(-3deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes top5RowSlideIn {
    0%   { opacity: 0; transform: translateX(60px) scale(0.92); filter: blur(6px); }
    60%  { opacity: 1; transform: translateX(-4px) scale(1.01); filter: blur(0); }
    100% { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
  }
  @keyframes top5RowGlow {
    0%   { box-shadow: 0 0 0 0 rgba(74,222,128,0.0); }
    40%  { box-shadow: 0 0 40px 8px rgba(74,222,128,0.35); }
    100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.0); }
  }
  @keyframes top5RankPop {
    0%   { transform: scale(0.5) rotate(-20deg); opacity: 0; }
    60%  { transform: scale(1.15) rotate(3deg); opacity: 1; }
    100% { transform: scale(1) rotate(0); opacity: 1; }
  }
  @keyframes top5AvatarPop {
    0%   { transform: scale(0) rotate(-180deg); opacity: 0; }
    70%  { transform: scale(1.15) rotate(10deg); opacity: 1; }
    100% { transform: scale(1) rotate(0); opacity: 1; }
  }
  @keyframes gridIdle {
    0%, 100% { box-shadow: 0 0 30px rgba(255,255,255,0.02), inset 0 1px 0 rgba(255,255,255,0.03); }
    50%      { box-shadow: 0 0 50px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.05); }
  }
  @keyframes cellIdlePulse {
    0%, 100% { background: rgba(255,255,255,0.04); }
    50%      { background: rgba(255,255,255,0.10); }
  }
  @keyframes boardShake {
    0%, 100% { transform: translate(0, 0); }
    15%      { transform: translate(-3px, 2px); }
    30%      { transform: translate(3px, -2px); }
    45%      { transform: translate(-2px, 1px); }
    60%      { transform: translate(2px, -1px); }
    80%      { transform: translate(-1px, 0); }
  }
  @keyframes cellNeighborDuck {
    0%, 100% { transform: scale(1); }
    40%      { transform: scale(0.94); }
    70%      { transform: scale(1.02); }
  }
  @keyframes cellShatter {
    0%   { opacity: 1; transform: scale(1); filter: brightness(1); }
    25%  { opacity: 0.9; transform: scale(1.08); filter: brightness(2); }
    55%  { opacity: 0.6; transform: scale(0.92) rotate(-4deg); filter: brightness(1.4) blur(1px); }
    100% { opacity: 0; transform: scale(0.4) rotate(8deg); filter: blur(3px); }
  }
  @keyframes cellShard {
    0%   { opacity: 1; transform: translate(0,0) rotate(0deg) scale(1); }
    100% { opacity: 0; transform: translate(var(--shx), var(--shy)) rotate(var(--shr, 180deg)) scale(0.3); }
  }
  @keyframes cellAnticipate {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 rgba(255,255,255,0); }
    50%      { transform: scale(1.06); box-shadow: 0 0 18px rgba(255,255,255,0.55); }
  }
  @keyframes activeTeamGlow {
    0%, 100% { box-shadow: 0 0 12px var(--team-color, #fff); opacity: 1; }
    50%      { box-shadow: 0 0 24px var(--team-color, #fff); opacity: 0.85; }
  }
  @keyframes claimToast {
    0%   { opacity: 0; transform: translateY(20px) scale(0.9); }
    15%  { opacity: 1; transform: translateY(0) scale(1); }
    85%  { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-10px) scale(0.95); }
  }

  @keyframes finaleTitle {
    0%   { opacity: 0; transform: scale(1.8); filter: brightness(3) blur(8px); }
    30%  { opacity: 1; filter: brightness(1.5) blur(0px); }
    50%  { transform: scale(0.95); filter: brightness(1.1); }
    70%  { transform: scale(1.02); }
    100% { transform: scale(1); filter: brightness(1); }
  }
  @keyframes finaleGlow {
    0%, 100% { text-shadow: 0 0 30px rgba(234,179,8,0.4), 0 0 60px rgba(234,179,8,0.15); }
    50%      { text-shadow: 0 0 50px rgba(234,179,8,0.6), 0 0 100px rgba(234,179,8,0.25); }
  }
  @keyframes finaleWinner {
    0%   { opacity: 0; transform: translateY(50px) scale(0.8); }
    50%  { transform: translateY(-8px) scale(1.04); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes finaleRank {
    from { opacity: 0; transform: translateX(-30px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes finaleStarBurst {
    0%   { transform: scale(0) rotate(-30deg); opacity: 0; }
    50%  { transform: scale(1.3) rotate(10deg); opacity: 1; }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes finaleTrophyFloat {
    0%, 100% { transform: translateY(0) rotate(-2deg); }
    50%      { transform: translateY(-10px) rotate(3deg); }
  }
  @keyframes finaleAvatarBreathe {
    0%, 100% { transform: scale(1); filter: brightness(1); }
    50%      { transform: scale(1.04); filter: brightness(1.08); }
  }
  @keyframes finaleSparklePop {
    0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.4) rotate(0deg); }
    20%      { opacity: 1; transform: translate(-50%, -50%) scale(1.1) rotate(20deg); }
    60%      { opacity: 0.85; transform: translate(-50%, -50%) scale(0.95) rotate(180deg); }
    80%      { opacity: 0; transform: translate(-50%, -50%) scale(0.8) rotate(280deg); }
  }
  @keyframes finaleScoreCount {
    0%   { transform: translateY(8px) scale(0.85); opacity: 0; }
    60%  { transform: translateY(-2px) scale(1.06); opacity: 1; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }

  @keyframes qqTargetPulse {
    0%, 100% { transform: scale(1); filter: brightness(1); }
    50%      { transform: scale(1.08); filter: brightness(1.15); }
  }
  @keyframes qqTeamPinDrop {
    0%   { transform: translateY(-32px) scale(0.4); opacity: 0; }
    70%  { transform: translateY(4px)   scale(1.08); opacity: 1; }
    100% { transform: translateY(0)     scale(1);    opacity: 1; }
  }
  @keyframes qqMapRankSlideIn {
    0%   { transform: translateX(100%); opacity: 0; }
    100% { transform: translateX(0);    opacity: 1; }
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
