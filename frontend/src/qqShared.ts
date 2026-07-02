// ── Shared Quarter Quiz constants (used by BeamerPage + CustomSlide) ──────────

import type { QQStateUpdate, QQTeam } from '@shared/quarterQuizTypes';
import { QQ_AVATARS, qqMegaFactionName, qqMegaFactionSlug } from '@shared/quarterQuizTypes';

/**
 * 2026-05-24 (Refactor #2): Kanonische Team-Sortierung. Backend schickt seit
 * heute `sortedTeamIds` mit jedem State-Update — Views sollen das nutzen
 * statt lokal zu sortieren (vorher 3 verschiedene Sort-Stellen in GameOver,
 * Paused, Mod-Leaderboard → Drift bei Ties).
 *
 * Fallback (Backwards-Compat): falls sortedTeamIds fehlt (alter Backend,
 * stale State), fällt es auf lokale Sortierung mit demselben Algo zurück.
 */
export function qqSortedTeams(s: QQStateUpdate): QQTeam[] {
  const ids = (s as any).sortedTeamIds as string[] | undefined;
  if (Array.isArray(ids) && ids.length > 0) {
    const byId = new Map(s.teams.map(t => [t.id, t]));
    const ordered = ids.map(id => byId.get(id)).filter((t): t is QQTeam => !!t);
    const extras = s.teams.filter(t => !ids.includes(t.id));
    return [...ordered, ...extras];
  }
  // Fallback: lokale Sortierung wie backend qqSortedTeamIds.
  const tieWinnerId = s.tieBreakerWinnerId ?? null;
  return [...s.teams].sort((a, b) => {
    if (tieWinnerId) {
      if (a.id === tieWinnerId && b.id !== tieWinnerId) return -1;
      if (b.id === tieWinnerId && a.id !== tieWinnerId) return 1;
    }
    return (b.largestConnected ?? 0) - (a.largestConnected ?? 0)
        || (b.totalCells ?? 0) - (a.totalCells ?? 0);
  });
}

/**
 * 2026-07-01 (Wolf Idee 2 — nestedTeams): Genesteter Groß-Modus. Die realen
 * Teams sind Sub-Teams (bis 3 pro Eltern-Team, je eigenes Handy) — sie teilen
 * sich einen avatarId-Slot (= Eltern-Team-Identität). Für die Bar-Race-Anzeige
 * werden sie nach avatarId gruppiert und ihre Punkte (largestConnected) summiert.
 *
 * Rückgabe = synthetische "Eltern-QQTeam"-Objekte (id `grp-<avatarId>`), damit
 * die bestehenden Bar-Race-Rows (StandingsRow etc.) 1:1 wiederverwendbar sind:
 * an den Render-Stellen nur qqSortedTeams → qqSortedGroups tauschen. Name+Farbe
 * kommen aus QQ_AVATARS (Avatar = Identität, Wolf: "nur der Avatar sichtbar").
 * Sub-Teams behalten ihre eigenen Namen im Akt-2-Reveal (ihr Moment).
 */
export function qqSortedGroups(s: QQStateUpdate): QQTeam[] {
  const de = s.language !== 'en';
  const byAvatar = new Map<string, QQTeam[]>();
  for (const t of s.teams) {
    const arr = byAvatar.get(t.avatarId);
    if (arr) arr.push(t);
    else byAvatar.set(t.avatarId, [t]);
  }
  const groups: QQTeam[] = [];
  for (const [avatarId, members] of byAvatar) {
    const meta = QQ_AVATARS.find(a => a.id === avatarId);
    const rep = members[0];
    const points = members.reduce((sum, m) => sum + (m.largestConnected ?? 0), 0);
    // Mega Event: Faktions-Name („Denkfaule Dachse") + Faktions-Tier (slug via
    // emoji auf die Farb-Disc). Fallback: Default-Avatar-Label.
    groups.push({
      id: `grp-${avatarId}`,
      name: qqMegaFactionName(avatarId, de ? 'de' : 'en'),
      color: meta?.color ?? rep.color,
      avatarId,
      emoji: qqMegaFactionSlug(avatarId) ?? rep.emoji,
      connected: true,
      totalCells: points,
      largestConnected: points,
    });
  }
  return groups.sort((a, b) =>
    (b.largestConnected ?? 0) - (a.largestConnected ?? 0)
    || (b.totalCells ?? 0) - (a.totalCells ?? 0));
}

/**
 * 2026-07-02 (Wolf „Cozy Arena"): In-Game-Reveals fassen Sub-Teams zu ihren 8
 * Faktionen zusammen — statt bis zu 24 Einzel-Avataren (mit gemischten Tieren
 * je Farbe) EIN Faktions-Tier je Farbe + Anzahl-Badge. `qqFactionBuckets`
 * gruppiert eine Team-Liste nach avatarId und liefert pro Faktion Farbe/Tier/
 * Name/Count/Members (nach Count absteigend sortiert).
 */
export interface QQFactionBucket {
  avatarId: string;
  slug: string | undefined;   // Faktions-Tier (cozy3d-slug) → als teamEmoji an QQTeamAvatar
  color: string;
  name: string;               // „Denkfaule Dachse"
  count: number;
  members: QQTeam[];
}
export function qqFactionBuckets(teams: QQTeam[], de: boolean): QQFactionBucket[] {
  const byAvatar = new Map<string, QQTeam[]>();
  for (const t of teams) {
    const arr = byAvatar.get(t.avatarId);
    if (arr) arr.push(t);
    else byAvatar.set(t.avatarId, [t]);
  }
  const out: QQFactionBucket[] = [];
  for (const [avatarId, members] of byAvatar) {
    const meta = QQ_AVATARS.find(a => a.id === avatarId);
    out.push({
      avatarId,
      slug: qqMegaFactionSlug(avatarId),
      color: meta?.color ?? members[0].color,
      name: qqMegaFactionName(avatarId, de ? 'de' : 'en'),
      count: members.length,
      members,
    });
  }
  return out.sort((a, b) => b.count - a.count);
}

/**
 * 2026-05-17 P6 (Wolf 'team-namen wrap: Pub-quatscher statt Pubquatsch-er'):
 * Style-Set für mehrzeilige Team-Namen mit smart-break. Inline-spread'bar:
 *   <div style={{ ...QQ_TEAM_NAME_WRAP, fontSize: '...' }}>
 * Browser nutzt Hyphenation-Dict (DE/EN) für Syllable-Breaks bei langen
 * Composite-Wörtern. Fallback overflow-wrap:anywhere für extreme Fälle.
 */
export const QQ_TEAM_NAME_WRAP = {
  whiteSpace: 'normal' as const,
  wordBreak: 'normal' as const,
  overflowWrap: 'anywhere' as const,
  hyphens: 'auto' as const,
  WebkitHyphens: 'auto' as const,
};

export const QQ_BEAMER_CSS = `
  @keyframes cfloat  { 0%,100%{transform:translateY(0) rotate(var(--r,0deg))} 50%{transform:translateY(-12px) rotate(var(--r,0deg))} }
  /* Subtileres Bobben fuer Kategorie-Badge-Icon waehrend Question — selbe
     Sprache wie cfloat im Cat-Intro, aber mit kleinerer Amplitude (4px) und
     etwas langsamer, damit die Badge-Pille nicht hektisch wirkt. */
  @keyframes qqBadgeIconBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
  /* Wave-Animation fuer Cat-Intro-Headline — pro-Buchstabe Stagger, ergibt
     den klassischen „ocean wave"-Effekt (Wolf-Wunsch 2026-05-04: 'smoothe
     welle auf der haupt schrift'). Amplitude moderat (8px) damit die Welle
     im 16:9-Beamer auch aus 8m noch gut sichtbar aber nicht zappelig wirkt. */
  @keyframes qqCatNameWave {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-10px); }
  }
  /* Wolf 2026-05-05: Entry-Letter-Cascade fuer Rules-Slide-Titles. Gleiche
     Sprache wie qqIntroTitleLetter im Welcome — scaleIn 0.4 → 1.05 → 1 mit
     blur-clear. Wird mit qqCatNameWave kombiniert (Entry erst, Wave danach). */
  @keyframes qqRulesTitleLetter {
    0%   { opacity: 0; transform: translateY(20px) scale(0.5); filter: blur(10px); }
    60%  { opacity: 1; transform: translateY(-4px) scale(1.05); filter: blur(0); }
    100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
  }
  /* SpeedBoltMarker entfernt 2026-05-04 v4 — qqSpeedSweep + qqSpeedGlow Keyframes
     mitentfernt (waren nur fuer den deaktivierten goldenen „Sonnen"-Marker). */
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

  /* ── Gameshow slide transitions ──────────────────────────────────────────── */
  /* 2026-05-08 (Wolf 'übergänge gefallen mir nicht'): qqSlideIn cinematischer
     gemacht — vorher 420ms scale 1.04→1 + minimal -6px slide + blur (zu kurz,
     zu subtle). Jetzt: 720ms mit echtem Y-Slide (24px), subtle scale 0.96→1
     + 1.005-Overshoot bei 65 %, dann Settle. Easing ist ease-out-expo statt
     bounce — fühlt sich „fließend" an statt „springig". Blur raus, war zu
     fragil und kostete Perf bei 16k-Beamer. */
  @keyframes qqSlideIn {
    /* 2026-05-12 (Beamer-Choreo-Audit P0 #1): weicherer Start. Vorher schnellte
       Opacity in den ersten 50% von 0→1 → harter Phase-Cut weil prev-Phase im
       gleichen Frame verschwand. Jetzt: 30% reine Opacity-Anzeige als „Fade-
       Reception" damit ALTE Phase visuell endet bevor neue motiongetrieben
       reinkommt. Echte Cross-Fade-Wrapper-Layer wären invasiv (Refactor mit
       prev-state). Diese Mini-Variante geht 90% des Wegs. */
    0%   { opacity: 0; transform: scale(0.96) translateY(24px); }
    30%  { opacity: 0.7; transform: scale(0.985) translateY(10px); }
    55%  { opacity: 1; }
    70%  { transform: scale(1.005) translateY(-2px); }
    100% { opacity: 1; transform: scale(1)    translateY(0); }
  }
  /* Final-Reveal Score-Cascade: Zeile fliegt von rechts rein mit slight Y-Drop. */
  @keyframes qqFinalRowIn {
    0%   { opacity: 0; transform: translateX(38px) scale(0.96); }
    70%  { opacity: 1; transform: translateX(-4px) scale(1.012); }
    100% { opacity: 1; transform: translateX(0)    scale(1); }
  }
  /* 2026-05-09 v3 (Wolf 'star-border ist ein dicker Balken statt umlaufender
     Light — soll wie reactbits.dev'): conic-gradient rotiert um Center → bei
     sehr breiten Cards (1500×660) wirkt der Sweep wie ein durchschiebender
     Balken statt einer Linie die DIE KANTE entlangläuft. Lösung: SVG-rect mit
     stroke-dashoffset-Animation. pathLength=100 normalisiert auf Prozent →
     Dasharray "18 82" = 18% Light + 82% Transparent, läuft sauber den
     gerundeten Rand entlang.

     qqStarBorderSpin bleibt als Legacy-Keyframe (falls noch wo verlinkt).
     qqStarBorderTrace ist der neue saubere Effect. */
  @keyframes qqStarBorderSpin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes qqStarBorderTrace {
    from { stroke-dashoffset: 100; }
    to   { stroke-dashoffset: 0; }
  }
  /* Joker-Wiggle für Rules-Slide-Demo: subtile rotation + scale-puls als
     „der Joker leuchtet auf, wenn das Pattern gebildet ist". */
  @keyframes qqJokerWiggle {
    0%, 100% { transform: rotate(-3deg) scale(1);    }
    50%      { transform: rotate( 3deg) scale(1.06); }
  }
  /* 2026-05-17 (Wolf 'alle 4 felder markiert die zu joker geführt haben'):
     Pattern-Zellen rund um den Joker bekommen einen dezenten Gold-Glow-Pulse
     synchron zum Joker-Wiggle — visuelles Signal „dieses 4er-Muster hat den
     Joker ausgelöst". Pulse nur am box-shadow (keine Transform-Konflikte
     mit dem gridCellIn-Mount), damit der Goldglow atmet ohne Cell-Größe. */
  @keyframes qqJokerPatternPulse {
    0%, 100% { box-shadow: 0 0 12px rgba(251,191,36,0.45), 0 0 0 rgba(251,191,36,0); }
    50%      { box-shadow: 0 0 22px rgba(251,191,36,0.70), 0 0 6px rgba(251,191,36,0.35); }
  }
  /* 2026-05-09 (Slot P live in HP): Bouncing-Kartoffel über aktivem Team.
     Bounce + Spin kombiniert, weil Doppel-Animation auf transform sonst
     einander überschreiben würde.
     Wolf-Wunsch v2: deutlich mehr Spin (720°/Cycle) — wie im Showreel
     Slot P, sieht „lebendig hochgeworfen" aus statt nur leicht wackelnd. */
  @keyframes qqHpPotatoSpin {
    0%   { transform: translate(-50%, -100%) translateY(0)    rotate(0deg); }
    30%  { transform: translate(-50%, -100%) translateY(-44px) rotate(220deg); }
    50%  { transform: translate(-50%, -100%) translateY(-58px) rotate(360deg); }
    70%  { transform: translate(-50%, -100%) translateY(-44px) rotate(540deg); }
    100% { transform: translate(-50%, -100%) translateY(0)    rotate(720deg); }
  }
  /* Legacy alias — falls irgendwo noch referenziert. Identisch zu Spin. */
  @keyframes qqHpPotatoBounceRotate {
    0%   { transform: translate(-50%, -100%) translateY(0)    rotate(0deg); }
    50%  { transform: translate(-50%, -100%) translateY(-32px) rotate(360deg); }
    100% { transform: translate(-50%, -100%) translateY(0)    rotate(720deg); }
  }
  /* Wurf-Bogen wenn aktives Team wechselt: Kartoffel fliegt während die
     Slot-Transition läuft auf einem Y-Bogen (hoch, dann runter), plus
     extra Spin (1080°/0.85s) für „katapultiert"-Look. */
  @keyframes qqHpPotatoThrow {
    0%   { transform: translate(-50%, -100%) translateY(0)    rotate(0deg); }
    50%  { transform: translate(-50%, -100%) translateY(-110px) rotate(540deg); }
    100% { transform: translate(-50%, -100%) translateY(0)    rotate(1080deg); }
  }
  /* HP Timer-Pulse: NUR box-shadow + color-shift, KEIN transform — die
     Active-Card darf sich nicht vergrößern/verkleinern (Wolf 2026-05-09). */
  @keyframes qqHpTimerGlow {
    0%   { box-shadow: 0 0 0 rgba(239,68,68,0); }
    100% { box-shadow: 0 0 24px rgba(239,68,68,0.85); }
  }
  /* Hot-Potato 3-Slot-Spec (2026-06-30): Kartoffel oben rechts am Timer-Ring.
     Position via top/right → Transform = nur rotate/translateY (kein -50%). */
  @keyframes qqHpRingPotatoWobble {
    0%,100% { transform: rotate(-9deg) translateY(0); }
    50%     { transform: rotate(9deg) translateY(-6px); }
  }
  @keyframes qqHpRingPotatoThrow {
    0%   { transform: rotate(0deg) translateY(0) scale(1); }
    45%  { transform: rotate(560deg) translateY(-72px) scale(1.14); }
    100% { transform: rotate(1080deg) translateY(0) scale(1); }
  }
  /* Countdown-Chip unten am Ring pulsiert (dezent). */
  @keyframes qqHpCountPulse {
    0%,100% { transform: translateX(-50%) scale(1); }
    50%     { transform: translateX(-50%) scale(1.08); }
  }
  /* „← als Nächstes"-Pfeil pulsiert horizontal. */
  @keyframes qqHpNextArrow {
    0%,100% { transform: translateX(0); opacity: 0.65; }
    50%     { transform: translateX(-5px); opacity: 1; }
  }
  /* 2026-05-08: Brand-Pink-Lichtsweep der einmalig beim Phase-Wechsel über
     den Wrapper streicht — gibt dem Übergang einen subtilen „Whoosh"-Moment
     ohne dass die Card bewegt wird. Begleitet qqSlideIn parallel. */
  @keyframes qqPhaseSweep {
    0%   { background-position: -120% 0; opacity: 0; }
    20%  { opacity: 0.85; }
    100% { background-position: 220% 0;  opacity: 0; }
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
  /* 2026-05-09 v2 (Wolf 'kreis darf nicht bouncen — linie ist fix'): Outer
     Bounce entfernt. qqWolfBob bleibt als Legacy-Keyframe (falls noch wo
     verlinkt), wird aber nicht mehr genutzt. Stattdessen: qqWolfHeadBob
     animiert NUR das innere Wolf-Bild — Kreis sitzt fix auf der Linie. */
  @keyframes qqWolfBob {
    0%, 100% { transform: translate(-50%, -50%); }
    50%      { transform: translate(-50%, -68%); }
  }
  @keyframes qqWolfHeadBob {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    25%      { transform: translateY(-4%) rotate(-2deg); }
    50%      { transform: translateY(-2%) rotate(0deg); }
    75%      { transform: translateY(-4%) rotate(2deg); }
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
  /* Empty-State-Pfeil zeigt nach links auf den QR-Code, wackelt leicht hin
     und her, damit das Auge des Veranstalters den Hinweis automatisch findet. */
  @keyframes qqEmptyArrowNudge {
    0%, 100% { transform: translateX(0); }
    50%      { transform: translateX(-10px); }
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
  /* 2026-05-04 (Wolf): sanfter Text-Shadow-Puls fuer das ??? bei
     Higher/Lower-Question — nur am Glyph, nicht als box-shadow Vignette. */
  @keyframes hlQuestionMarkPulse {
    0%, 100% { text-shadow: 0 0 22px rgba(251,191,36,0.40), 0 0 50px rgba(251,191,36,0.18); }
    50%      { text-shadow: 0 0 36px rgba(251,191,36,0.65), 0 0 80px rgba(251,191,36,0.35); }
  }
  /* 2026-05-04 (Wolf #1): Bildschirm-weite Urgency-Vignette.
     Aggressives rotes Pulsen am Bildschirmrand bei den letzten 3 Sek,
     orange leiser bei 4-5 Sek. CSS-Var --urg-color macht den Farbton
     dynamisch (239,68,68 = red, 249,115,22 = orange). */
  @keyframes urgencyVignettePulse {
    0%, 100% { box-shadow: inset 0 0 60px 10px rgba(var(--urg-color, 239,68,68), 0.18), inset 0 0 200px 40px rgba(var(--urg-color, 239,68,68), 0.06); }
    50%      { box-shadow: inset 0 0 120px 30px rgba(var(--urg-color, 239,68,68), 0.45), inset 0 0 360px 80px rgba(var(--urg-color, 239,68,68), 0.20); }
  }
  /* Gold-Flash bei Timer 0 — kurzer Aufflash, fade out 600ms. */
  @keyframes urgencyFlashGold {
    0%   { box-shadow: inset 0 0 200px 60px rgba(251,191,36,0.55), inset 0 0 480px 120px rgba(251,191,36,0.25); }
    100% { box-shadow: inset 0 0 200px 60px rgba(251,191,36,0.0),  inset 0 0 480px 120px rgba(251,191,36,0.0); }
  }
  /* 2026-05-04 (Wolf #4): Falsch-Antwort-Drama. Card wackelt kurz horizontal
     (max 6px) + bekommt rotes Pulse-Glow waehrend des Shakes. Einmalig,
     0.5s gesamt — danach gleitet's in den ueblichen revealWrongDim ueber. */
  @keyframes revealWrongShake {
    0%   { transform: translateX(0);    box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
    15%  { transform: translateX(-6px); box-shadow: 0 0 28px rgba(239,68,68,0.45), 0 4px 16px rgba(0,0,0,0.3); }
    30%  { transform: translateX(5px);  box-shadow: 0 0 32px rgba(239,68,68,0.55), 0 4px 16px rgba(0,0,0,0.3); }
    45%  { transform: translateX(-4px); box-shadow: 0 0 24px rgba(239,68,68,0.40), 0 4px 16px rgba(0,0,0,0.3); }
    60%  { transform: translateX(3px);  box-shadow: 0 0 18px rgba(239,68,68,0.30), 0 4px 16px rgba(0,0,0,0.3); }
    100% { transform: translateX(0);    box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
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
    /* 2026-05-12 (Audit-D 'scale-Drift in Sibling-Rows'): scale-Komponente
       komplett raus. Vorher 1.06 Peak waehrend Wrong-Cards bei scale(1)
       statisch → 6% Width-Drift in MUCHO/ZvZ/CustomSlide Reveal-Rows
       (gleiche Bug-Klasse wie ActionCard). Pulse-Feedback via box-shadow
       only — bleibt prominent, Cards in der Row bleiben pixel-stabil. */
    0%   { box-shadow: 0 0 0 rgba(34,197,94,0); }
    30%  { box-shadow: 0 0 48px rgba(34,197,94,0.6); }
    60%  { box-shadow: 0 0 32px rgba(34,197,94,0.45); }
    100% { box-shadow: 0 0 24px rgba(34,197,94,0.3); }
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
  /* Timer-Outro — wenn der Countdown auf 0 trifft, kurzer Pop (scale 1.18 +
     Brightness/Glow), dann sanftes Schrumpfen + Fade. Drama-Moment statt
     einfach verschwinden. Nur bei natuerlichem Ablaufen — bei vorzeitigem
     Reveal greift weiterhin der Outer-Wrapper-opacity-Fade. */
  @keyframes qqTimerOutro {
    0%   { transform: scale(1);     opacity: 1; filter: brightness(1); }
    32%  { transform: scale(1.18);  opacity: 1; filter: brightness(1.45) drop-shadow(0 0 24px rgba(251,191,36,0.65)); }
    62%  { transform: scale(1.06);  opacity: 0.95; filter: brightness(1.2); }
    100% { transform: scale(0.72);  opacity: 0; filter: brightness(0.8); }
  }
  /* VS-Badge Pulse für Comeback-H/L Question-Phase — atmender Glow auf der
     gold-Pille, signalisiert „hier passiert gleich was" ohne hektisch zu sein. */
  @keyframes qqVsPulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 0 60px rgba(251,191,36,0.55), 0 0 24px rgba(251,191,36,0.4),
                  0 8px 22px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.4);
    }
    50% {
      transform: scale(1.05);
      box-shadow: 0 0 80px rgba(251,191,36,0.75), 0 0 32px rgba(251,191,36,0.55),
                  0 8px 22px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.5);
    }
  }
  /* Joker-Cell-Pulse — wenn ein Team gerade ein 2×2 oder 4×1 geformt hat,
     leuchten die beteiligten Zellen 2.2s gold auf. */
  /* 2026-06-28 (Claude-Design-Handoff #2): von Gold auf Marken-Pink umpalettiert
     — der Joker ist jetzt ein Pink/Magenta-Jackpot, kein Gold mehr. */
  @keyframes jokerCellPulse {
    0%   { box-shadow: 0 0 0 0 rgba(236,72,153,0.0), 0 0 0 0 rgba(236,72,153,0.0); }
    20%  { box-shadow: 0 0 0 4px rgba(236,72,153,0.95), 0 0 28px 8px rgba(236,72,153,0.85); }
    50%  { box-shadow: 0 0 0 6px rgba(236,72,153,0.7), 0 0 40px 14px rgba(162,18,71,0.6); }
    80%  { box-shadow: 0 0 0 3px rgba(236,72,153,0.45), 0 0 22px 6px rgba(236,72,153,0.35); }
    100% { box-shadow: 0 0 0 0 rgba(236,72,153,0.0), 0 0 0 0 rgba(236,72,153,0.0); }
  }
  /* ── Joker-Jackpot-Overlay (Claude-Design-Handoff #2) ─────────────────────
     Vollbild-Celebratory-Layer auf dem Beamer wenn ein Joker (2x2-Block)
     geformt wird: Flash -> Shockwave-Ring -> rotierender Strahlenkranz ->
     Callout-Slam. Pink/Magenta, kein Gold. */
  @keyframes qqJokerFlash {
    0%   { opacity: 0; }
    14%  { opacity: 0.48; }
    100% { opacity: 0; }
  }
  @keyframes qqJokerRing {
    0%   { transform: translate(-50%,-50%) scale(0.32); opacity: 0.85; }
    100% { transform: translate(-50%,-50%) scale(2.7); opacity: 0; }
  }
  @keyframes qqJokerRays {
    from { transform: translate(-50%,-50%) rotate(0deg); }
    to   { transform: translate(-50%,-50%) rotate(360deg); }
  }
  @keyframes qqJokerRaysFade {
    0%   { opacity: 0; }
    18%  { opacity: 1; }
    74%  { opacity: 1; }
    100% { opacity: 0; }
  }
  /* Journey-Endbeat (Claude-Design-Handoff #3): die aktive Frage materialisiert
     aus dem Kategorie-Emoji heraus — wächst aus der Bildmitte (scale .28→1) +
     Fade. Kein fill-mode → endet im natürlichen Zustand (kein Rest-Transform,
     keine Stacking-Probleme für fixed/absolute Children danach). */
  @keyframes qqQuestionMaterialize {
    0%   { opacity: 0; transform: scale(0.28); }
    60%  { opacity: 1; }
    100% { opacity: 1; transform: scale(1); }
  }
  /* Action-Card Plain-Entrance mit mehr Wow (Wolf 2026-06-29: „erscheint sehr
     langweilig"): kommt von unten rein, schießt über (scale 1.08) und federt
     ein — statt des subtilen phasePop. */
  @keyframes qqActionCardPop {
    0%   { opacity: 0; transform: scale(0.4) translateY(46px) rotate(-3deg); }
    55%  { opacity: 1; transform: scale(1.08) translateY(0) rotate(1deg); }
    72%  { transform: scale(0.96) rotate(0deg); }
    100% { opacity: 1; transform: scale(1) translateY(0) rotate(0deg); }
  }
  @keyframes qqJokerCallout {
    0%   { opacity: 0; transform: translate(-50%,-32px) scale(0.78); }
    52%  { opacity: 1; transform: translate(-50%,0) scale(1.07); }
    66%  { transform: translate(-50%,0) scale(0.97); }
    80%  { transform: translate(-50%,0) scale(1); opacity: 1; }
    100% { opacity: 0; transform: translate(-50%,-14px) scale(0.96); }
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
  /* 2026-05-08 (Audit-#4 Comeback-Step-Slide): vorher introStep-Wechsel via
     contentReveal (nur Y-Fade) — wirkte statisch obwohl Comeback Game-Climax
     ist. Jetzt: Slide-from-Left (-60px → 0) mit ease-out-expo, 600ms. Macht
     den Step-Wechsel sequentiell-cinematisch statt nebenher. */
  @keyframes qqStepSlideIn {
    0%   { opacity: 0; transform: translateX(-60px) scale(0.96); }
    60%  { opacity: 1; }
    100% { opacity: 1; transform: translateX(0) scale(1); }
  }

  /* 2026-05-08 (Wolf-Wunsch 'nice Übergänge wo passend'): Slide-Off + Push
     Pattern aus /animations Slot-1, generisch für sequenzielle Stage-Wechsel.
     Forward (Step N→N+1): neue Card kommt von rechts (qqStageSlideInRight).
     Backward (N→N-1): von links (qqStageSlideInLeft). Verwendet von:
     - RulesView (Slide N → Slide N+1)
     - PhaseIntroView (introStep 0 → 1 → 2)
     - QuestionView (Question N → Question N+1)
     - ConnectionsBeamerView (Sub-Phases intro → active → reveal → placement) */
  @keyframes qqStageSlideOutLeft {
    0%   { transform: translateX(0)     scale(1);    opacity: 1; }
    100% { transform: translateX(-110%) scale(0.92); opacity: 0; }
  }
  @keyframes qqStageSlideOutRight {
    0%   { transform: translateX(0)     scale(1);    opacity: 1; }
    100% { transform: translateX(110%)  scale(0.92); opacity: 0; }
  }
  @keyframes qqStageSlideInRight {
    0%   { transform: translateX(110%)  scale(0.92); opacity: 0; }
    100% { transform: translateX(0)     scale(1);    opacity: 1; }
  }
  @keyframes qqStageSlideInLeft {
    0%   { transform: translateX(-110%) scale(0.92); opacity: 0; }
    100% { transform: translateX(0)     scale(1);    opacity: 1; }
  }
  /* 2026-05-08 (Wolf-Wunsch zurück): 3D-Slot-Machine-Drop für Higher-Lower
     Subject-Value-Reveal. Pattern aus /animations Slot-4. ??? rotiert nach
     oben raus, echte Zahl rotiert von unten rein. Container muss perspective
     setzen + overflow:hidden, beide Spans absolute → keine Card-Reflows. */
  @keyframes hlSlotOut {
    0%   { transform: rotateX(0deg)   translateY(0);    opacity: 1; }
    100% { transform: rotateX(-90deg) translateY(-50%); opacity: 0; }
  }
  @keyframes hlSlotIn {
    0%   { transform: rotateX(90deg)  translateY(50%);  opacity: 0; }
    100% { transform: rotateX(0deg)   translateY(0);    opacity: 1; }
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

  /* tcpulse — Box-Shadow-Pulse für Active-Team-Pille (Hot Potato),
     Round-Indicator etc. Vorher nur in QQTeamPage definiert,
     wurde aber auch in QQBeamerPage:2012/2031/15044 verwendet — Bug
     gefixt in Phase-5 Bucket-1 (zentrale Definition). */
  @keyframes tcpulse {
    0%, 100% { box-shadow: 0 0 0 0 var(--c, rgba(255,255,255,0.2)); }
    50%      { box-shadow: 0 0 0 6px transparent; }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

// 2026-05-24 (Refactor #4): Maps derived aus shared/qqCategoryTheme.ts
// (Single-Source-of-Truth). Bei neuer Kategorie: nur das Theme-File anfassen.
import { QQ_CATEGORY_THEME, qqCategoryBadgeGradient } from '@shared/qqCategoryTheme';

export const QQ_CAT_BADGE_BG: Record<string, string> = Object.fromEntries(
  (Object.keys(QQ_CATEGORY_THEME) as Array<keyof typeof QQ_CATEGORY_THEME>)
    .map(cat => [cat, qqCategoryBadgeGradient(cat)])
);

export const QQ_CAT_ACCENT: Record<string, string> = Object.fromEntries(
  (Object.keys(QQ_CATEGORY_THEME) as Array<keyof typeof QQ_CATEGORY_THEME>)
    .map(cat => [cat, QQ_CATEGORY_THEME[cat].accent])
);
