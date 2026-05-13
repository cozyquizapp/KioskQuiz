/**
 * qqTeamStyles — geteilte Styles/CSS-Keyframes fuer alle /team-Komponenten.
 *
 * Vorher inline in QQTeamPage.tsx (TEAM_CSS / darkPage / grainOverlay /
 * COZY_CARD_BG). 2026-05-13 extrahiert als Phase 3.5 des QQTeamPage-Refactor,
 * damit Lifecycle-Views (MidGameRejoinView / WaitingScreen) ihren <style>-Tag
 * unabhaengig von der Page-Mounting-Reihenfolge injecten koennen.
 *
 * Pattern analog zu qqShared.ts fuer Beamer-CSS (QQ_BEAMER_CSS).
 */
import type React from 'react';

export const TEAM_CSS = `
  @keyframes tcfloat   { 0%,100%{transform:translateY(0) rotate(var(--r,0deg))} 50%{transform:translateY(-8px) rotate(var(--r,0deg))} }
  @keyframes tcpop     { from{opacity:0;transform:scale(0.7) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes tcpulse   { 0%,100%{box-shadow: 0 0 0 0 var(--c,rgba(255,255,255,0.2))} 50%{box-shadow: 0 0 0 6px transparent} }
  @keyframes tcspin    { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
  @keyframes tcreveal  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes tctimer   { from{width:100%} to{width:0%} }
  @keyframes tcwobble  { 0%,100%{transform:rotate(-3deg)} 50%{transform:rotate(3deg)} }
  @keyframes tcCorrectFlash {
    0%   { opacity: 0; }
    18%  { opacity: 1; }
    55%  { opacity: 0.85; }
    100% { opacity: 0; }
  }
  /* 2026-05-10 (Audit P0-1): AckErrorToast Entry-Animation. */
  @keyframes tcAckToastIn {
    0%   { opacity: 0; transform: translateX(-50%) translateY(-16px); }
    100% { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  /* 2026-05-12 (Lobby-Audit P0 #3): Auto-Switch-Toast Entry-Animation. */
  @keyframes qqToastIn {
    0%   { opacity: 0; transform: translateX(-50%) translateY(-12px) scale(0.96); }
    60%  { opacity: 1; transform: translateX(-50%) translateY(2px) scale(1.02); }
    100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  }
  @keyframes qqTeamPinDrop {
    0%   { transform: translateY(-40px) scale(0.6); opacity: 0; }
    60%  { transform: translateY(4px) scale(1.08); opacity: 1; }
    80%  { transform: translateY(-2px) scale(0.96); }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }
  @keyframes tcbtnpop  { 0%{transform:scale(0.96)} 60%{transform:scale(1.04)} 100%{transform:scale(1)} }
  @keyframes tcsuccess { 0%{transform:scale(1)} 30%{transform:scale(1.06)} 60%{transform:scale(0.98)} 100%{transform:scale(1)} }
  @keyframes tcoptIn   { from{opacity:0;transform:translateY(18px) scale(0.94)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes tcwheelslide { from{transform:translateY(var(--from,0px));opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes tccheckpop { from{transform:scale(0)} to{transform:scale(1)} }
  @keyframes tcsuccessGlow {
    0%, 100% { box-shadow: 0 0 36px rgba(34,197,94,0.18), 0 6px 20px rgba(0,0,0,0.4); }
    50%      { box-shadow: 0 0 52px rgba(34,197,94,0.4), 0 0 100px rgba(34,197,94,0.15), 0 6px 20px rgba(0,0,0,0.4); }
  }
  @keyframes tcStolenToast {
    0%   { transform: translate(-50%, -120%); opacity: 0; }
    10%  { transform: translate(-50%, 0); opacity: 1; }
    80%  { transform: translate(-50%, 0); opacity: 1; }
    100% { transform: translate(-50%, -40%); opacity: 0; }
  }
  @keyframes tcwinBounce {
    0%   { transform: scale(0.5); opacity: 0; }
    40%  { transform: scale(1.15); opacity: 1; }
    60%  { transform: scale(0.92); }
    80%  { transform: scale(1.06); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes tcdotPulse {
    0%, 80%, 100% { opacity: 0.3; }
    40% { opacity: 1; }
  }
  @keyframes tccellTap {
    0%   { transform: scale(1); }
    50%  { transform: scale(0.88); }
    100% { transform: scale(1); }
  }
  @keyframes tccellPendingPulse {
    0%, 100% { transform: scale(1.04); filter: brightness(1.05); }
    50%      { transform: scale(1.10); filter: brightness(1.18); }
  }
  @keyframes tcTimerPulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50%      { transform: scale(1.12); opacity: 0.85; }
  }
  @keyframes frostPulse {
    0%, 100% { box-shadow: 0 0 6px rgba(147,210,255,0.3), inset 0 0 4px rgba(147,210,255,0.1); border-color: rgba(147,210,255,0.6); }
    50%      { box-shadow: 0 0 12px rgba(147,210,255,0.6), inset 0 0 8px rgba(147,210,255,0.25); border-color: rgba(147,210,255,1); }
  }
  @keyframes tcCellClaim {
    0%   { transform: scale(0.5); opacity: 0; }
    40%  { transform: scale(1.15); opacity: 1; }
    70%  { transform: scale(0.95); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes tcffmove {
    0%   { transform: translate(0,0) scale(1); opacity: 0; }
    10%  { opacity: 0.7; }
    45%  { transform: translate(var(--dx,20px), var(--dy,-30px)) scale(1.2); opacity: 0.5; }
    90%  { opacity: 0.6; }
    100% { transform: translate(0,0) scale(1); opacity: 0; }
  }
  @keyframes tcCellGlow {
    0%   { box-shadow: 0 0 0 rgba(255,255,255,0); }
    50%  { box-shadow: 0 0 14px var(--cell-color, rgba(255,255,255,0.5)); }
    100% { box-shadow: 0 0 4px var(--cell-color, rgba(255,255,255,0.2)); }
  }
  @keyframes tcAvatarPick {
    0%   { transform: scale(1) translateY(0) rotate(0deg); }
    12%  { transform: scale(1.38) translateY(-10px) rotate(-14deg); }
    28%  { transform: scale(0.82) translateY(6px) rotate(11deg); }
    44%  { transform: scale(1.20) translateY(-6px) rotate(-7deg); }
    60%  { transform: scale(0.94) translateY(2px) rotate(4deg); }
    78%  { transform: scale(1.06) translateY(0) rotate(-2deg); }
    100% { transform: scale(1) translateY(0) rotate(0deg); }
  }
  @keyframes tcAvatarGlow {
    0%   { filter: drop-shadow(0 0 0 transparent); }
    20%  { filter: drop-shadow(0 0 14px var(--g, rgba(255,255,255,0.9))) drop-shadow(0 0 24px var(--g, rgba(255,255,255,0.5))); }
    100% { filter: drop-shadow(0 0 0 transparent); }
  }
  @keyframes tcAvatarRing {
    0%   { transform: scale(0.5); opacity: 1; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes tcAvatarSpark {
    0%   { transform: translate(0,0) scale(1); opacity: 1; }
    100% { transform: translate(var(--sx,10px), var(--sy,-20px)) scale(0); opacity: 0; }
  }
  @keyframes tcAvatarHi {
    0%   { opacity: 0; transform: scale(0.3) translate(-6px, 8px) rotate(-18deg); }
    18%  { opacity: 1; transform: scale(1.25) translate(0, 0) rotate(10deg); }
    32%  { transform: scale(0.92) rotate(-4deg); }
    48%  { transform: scale(1.06) rotate(2deg); }
    64%  { transform: scale(1) rotate(0deg); }
    85%  { opacity: 1; transform: scale(1) translate(0, -2px); }
    100% { opacity: 0; transform: scale(0.8) translate(3px, -12px) rotate(4deg); }
  }
  @keyframes tcRowPulse {
    0%, 100% { box-shadow: 0 0 6px var(--cell-color, rgba(255,255,255,0.3)); }
    50%      { box-shadow: 0 0 16px var(--cell-color, rgba(255,255,255,0.6)); }
  }
  /* Identity-Banner: slides down from top after successful join */
  @keyframes tcIdentityIn {
    0%   { opacity: 0; transform: translateY(-40px) scale(0.85); }
    50%  { opacity: 1; transform: translateY(8px) scale(1.04); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes tcIdentityOut {
    0%   { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-30px) scale(0.9); }
  }
  /* Your-Turn fullscreen pulse (Hot Potato + Imposter) */
  @keyframes tcYourTurnPulse {
    0%   { opacity: 0; transform: scale(1.2); }
    18%  { opacity: 1; transform: scale(0.96); }
    30%  { opacity: 1; transform: scale(1.02); }
    75%  { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.04); }
  }
  @keyframes tcYourTurnGlow {
    0%, 100% { box-shadow: inset 0 0 120px 40px var(--turn-color, #EF4444); }
    50%      { box-shadow: inset 0 0 180px 60px var(--turn-color, #EF4444); }
  }
  /* Red-glow on QuestionCard during critical countdown (last 3s) */
  @keyframes tcCriticalGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.55); }
    50%      { box-shadow: 0 0 36px 4px rgba(239,68,68,0.75); }
  }
  /* Trost-Message nach falscher Antwort */
  @keyframes tcTrostIn {
    0%   { opacity: 0; transform: translateY(10px) scale(0.95); }
    60%  { opacity: 1; transform: translateY(-2px) scale(1.02); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  /* Bottom-Sheet Menu — Backdrop fade + Sheet slide-up (iOS-spring) */
  @keyframes tcMenuBackdrop {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes tcMenuSlideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  /* Joker-Earned-Toast — slide-down von oben, halt, fade-out */
  @keyframes tcJokerBanner {
    0%   { opacity: 0; transform: translate(-50%, -120%) scale(0.85); }
    14%  { opacity: 1; transform: translate(-50%, 0) scale(1.05); }
    22%  { transform: translate(-50%, 0) scale(1); }
    78%  { opacity: 1; transform: translate(-50%, 0) scale(1); }
    100% { opacity: 0; transform: translate(-50%, -40%) scale(0.92); }
  }

  button:focus-visible, input:focus-visible {
    outline: 2px solid #EC4899;
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

// 2026-05-08 (Aurora-Vivid): Card-BG aufs Beamer-Niveau angeglichen
// (#1F1A2E → #14101F = Indigo-Hoodie-Gradient). Fuehlt sich auf Phone
// genauso premium-vivid an wie der Beamer.
export const COZY_CARD_BG = 'linear-gradient(180deg, #1F1A2E, #14101F)';

export const darkPage: React.CSSProperties = {
  minHeight: '100vh', background: '#0A0814', color: '#e2e8f0',
  fontFamily: "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif",
};

export const grainOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
  opacity: 0.04, mixBlendMode: 'overlay',
};
