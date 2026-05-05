# 🎨 CozyQuiz Style-Guide

**Stand:** 2026-05-05 · **Status:** Phase 1 (initial draft) · **Quelle:** Code-Audit über die ganze App

> **Ground-Truth.** Bei jedem Refactor checken: passt es zum Style-Guide?
> Wenn etwas im Code abweicht, ist das nicht automatisch falsch — aber es
> sollte BEGRÜNDET sein, sonst zum Style-Guide harmonisieren.
>
> **Pflege:** Der Guide ist NICHT in Stein gemeißelt. Wenn ein Pattern den
> tatsächlichen UX-Anforderungen nicht entspricht, wird der Guide aktualisiert
> (mit Datum + Begründung), nicht der Code an einen falschen Standard
> angepasst.

---

## 📐 Token-System (Single Source of Truth)

**Datei:** `frontend/src/qqDesignTokens.ts`

Bei NEUEM Code immer Tokens nutzen statt Inline-Hex/Magic-Numbers. Bestehende Inline-Werte werden schrittweise migriert (kein Mass-Replace).

### Border-Radius
```ts
RADII = {
  tight:   8,    // Mini-Pills, Mini-Buttons, Inset-Elemente
  normal:  16,   // Cards, Buttons, Inputs (DEFAULT)
  rounded: 24,   // Hero-Cards, prominente Container
  pill:    9999, // Pillen, runde Buttons
}
```

**Faustregel:** Cards = 16-18, Hero/Sieger-Card = 24, Pille/Status-Badge = 999.

### Alpha-Tiefe
```ts
ALPHA_DEPTH = {
  d1: '33',  // ~20% — leichter Halo, dezente Outline
  d2: '55',  // ~33% — Standard-Glow
  d3: '88',  // ~53% — starker Glow, prominent
}
```

Verwendung als Hex-Suffix: `${teamColor}${ALPHA_DEPTH.d2}` → z.B. `#FBBF2455`.

### Letter-Spacing
```ts
LETTER_SPACING = {
  tight: '0.04em',  // Body-Text Tweaks
  wide:  '0.1em',   // UPPERCASE-Labels, Buttons
}
```

**Andere Werte (0.06/0.08/0.12/0.16/0.22) sind Legacy** — nicht für neuen Code.

### Font-Weight
```ts
WEIGHT = {
  bold:      700,  // wichtiger Body-Text, Standard-Buttons
  extraBold: 900,  // Headlines, Hero-Numbers, prominente Labels
}
```

**600 / 800 sind raus.** Body-default = unspezifiziert (regular ~400).

### Animation-Dauer
```ts
DURATION = {
  fast:   150,  // Hover, Tap-Reaktion
  normal: 300,  // Card-Switches, subtile State
  slow:   600,  // Hero-Animation, Scene-Wechsel
}
```

### Easing
```ts
EASING = {
  bounce:     'cubic-bezier(0.34, 1.56, 0.64, 1)',  // Standard-Pop (Apple-HIG)
  bounceSoft: 'cubic-bezier(0.34, 1.4,  0.64, 1)',  // Sanfter, Reveal-Pops
  popFast:    'cubic-bezier(0.2, 0.8, 0.3, 1)',     // Game-Feel, schneller Attack
  smooth:     'cubic-bezier(0.4, 0, 0.2, 1)',       // Material-Standard
  smoothOut:  'cubic-bezier(0.3, 0, 0.5, 1)',       // Drop/Fall mit Gravity
  inOut:      'ease-in-out',                        // Idle/Breathing/Float-Loops
}
```

CSS-Vars: `var(--qq-ease-bounce)`, `var(--qq-ease-smooth)`, `var(--qq-ease-smooth-out)` etc.

### Stagger
```ts
STAGGER = {
  tight:     60,   // Lobby-Card-In, schnelle Cascades
  normal:    90,   // Sound-Sync-Grids
  leisurely: 350,  // Idle-Wobble, Personality-Loops
}
```

### Tap-Target Min-Size
```ts
TAP_TARGET = { min: 44, cozy: 48 }
```

---

## 🎨 Color-System

### Text-Hierarchie (Cozy-Dark-Background)
```ts
TEXT_COLOR = {
  primary:   '#F8FAFC',  // Headlines, Hero-Numbers (Kontrast 10.5:1)
  secondary: '#CBD5E1',  // Body-Text, Card-Inhalte (8:1)
  muted:     '#94A3B8',  // Subtitle, Sekundär-Labels (7:1)
  dim:       '#64748B',  // Footer, Inactive-Hints (4.5:1)
}
```

**Regel:** Auf Beamer-Distanz nie unter `muted` für lesbaren Text.

### Akzent-Gold (CozyQuiz-Brand)
```ts
ACCENT_GOLD = {
  bright: '#FBBF24',  // Standard-Highlight, Pillen, Numbers
  warm:   '#F59E0B',  // Sekundärer Goldton, Glow
  light:  '#FDE68A',  // Helle Akzent-Striche, Light-Highlight
  deep:   '#D97706',  // Schwerer Schatten unter Gold-Elementen
}
```

### Status-Farben (App-weit konsistent)

| State | Hex | Verwendung |
|---|---|---|
| **Success / Korrekt / Submit** | `#22C55E` | Submit-Glow, ✓-Reveal-Badge, Anchor-Card im H/L |
| **Warning / Pending** | `#F59E0B` | Pause-Indikator, Tie-Break-Marker |
| **Danger / Wrong** | `#EF4444` | ✕-Reveal-Badge, Steal-Flash, Locked-Out |
| **Accent-Gold** | `#FBBF24` | Sieger-Hero, Joker, Spotlight-Score |

### Kategorie-Akzentfarben
```ts
QQ_CAT_ACCENT = {
  SCHAETZCHEN:   '#EAB308',  // Gelb (Schätzen)
  MUCHO:         '#60A5FA',  // Blau (Multiple Choice)
  BUNTE_TUETE:   '#F87171',  // Rot (Surprise)
  ZEHN_VON_ZEHN: '#34D399',  // Grün (10-Punkte)
  CHEESE:        '#A78BFA',  // Lila (Picture-This)
}
```

Kategorie-Pille, Frage-Card-Border, Fireflies-Tint nutzen den Akzent.

### Brett-Palette (Smart-Color-Assignment, ab 2026-05-05)
```ts
QQ_BOARD_PALETTE = [
  '#EF4444', '#F97316', '#FACC15', '#22C55E',
  '#06B6D4', '#3B82F6', '#A855F7', '#EC4899',
]
```

**Wichtig:** Cells nutzen Brett-Palette via `qqGetBoardColor(teamId, teams)`, NICHT `team.color`. `team.color` (Avatar-Signatur) bleibt für Standings/Score-Spotlight/Comeback-Texte. Mapping: `joinOrder.indexOf(teamId) % 8`.

**Warum:** Avatar-Farben (`QQ_AVATARS`) haben teilweise zu nahe Hue-Werte (yellow/amber, pink/red) — auf Cells nebeneinander schwer unterscheidbar. Brett-Palette hat 45° Hue-Spread, garantiert keine Konflikte.

### Avatar-Signaturfarben (Team-Identity)
```ts
QQ_AVATARS Signatur-Colors (in shared/quarterQuizTypes.ts):
fox=#EC4899  frog=#84CC16  panda=#3B82F6  rabbit=#A855F7
unicorn=#FACC15  raccoon=#14B8A6  cow=#F59E0B  cat=#EF4444
```

Avatar-Farbe = Team-Identity in der Standings-Tabelle, Score-Hero, Comeback-Pillen, Welcome-Banner. **NICHT auf Cells**.

---

## ✍️ Typography-Hierarchie

Alle Werte als `clamp(min, vw, max)` für responsive Skalierung. Beamer-Distanz: 5-10m → mindestens `secondary-text` für lesbaren Body.

### Hierarchie-Level

| Level | Beispiel | clamp | Weight |
|---|---|---|---|
| **Hero-Number** | Score Spotlight | `clamp(80px, 11vw, 180px)` | 900 |
| **Hero-Title** | „Sieger!" / „Großes Finale" | `clamp(40px, 5.5vw, 88px)` | 900 |
| **Page-Headline** | „CozyQuiz", Phase-Name | `clamp(56px, 9vw, 140px)` | 900 |
| **Section-Title** | Card-Title XL | `clamp(24px, 2.6vw, 38px)` | 900 |
| **Subtitle** | „Macht's euch bequem" | `clamp(18px, 2vw, 30px)` | 900 |
| **Body** | Card-Inhalt, Optionen | `clamp(18px, 2vw, 28px)` | 900 |
| **Pill** | Buttons, Status | `clamp(13px, 1.4vw, 18px)` | 900 |
| **Eyebrow** | UPPERCASE-Labels | `clamp(11px, 1vw, 14px)` | 900 |
| **Footer/Hint** | Mod-Hints, Timestamps | `clamp(10px, 0.95vw, 14px)` | 700 |

### LetterSpacing
- **UPPERCASE-Eyebrows:** `0.1em` (LETTER_SPACING.wide)
- **Body / Numbers:** unspezifiziert oder `0.04em` (tight)
- **Hero-Numbers** (tabular): `fontVariantNumeric: 'tabular-nums'` für stabile Breite

### Text-Shadow-Standards
- **Hero-Glow:** `'0 0 40px rgba(251,191,36,0.55), 0 6px 0 rgba(0,0,0,0.4)'`
- **Body-on-Card:** `'0 1px 3px rgba(0,0,0,0.5)'`
- **Subtle-Lift:** `'0 0 14px {accentColor}88'`

---

## 🃏 Card-System

### Card-Variants

| Variant | Use-Case | borderRadius | boxShadow |
|---|---|---|---|
| **Hero** | Sieger-Card, Spotlight | 24-32 | 3-Schicht (drop + halo + inset) |
| **Standard** | Frage-Card, Reveal-Cards | 16-18 | 2-Schicht (drop + glow) |
| **Compact** | Inline-Pills, Mini-Cards | 8-12 | 1-Schicht (subtle drop) |
| **Pill** | Buttons, Status | 999 | 1-Schicht oder none |

### Standard-Card-Pattern
```jsx
<div style={{
  padding: 'clamp(14px, 1.8vh, 24px) clamp(20px, 2.5vw, 36px)',
  borderRadius: 18,
  background: `linear-gradient(135deg, ${color}28, ${color}10)`,
  border: `2px solid ${color}aa`,
  boxShadow: `0 0 28px ${color}33, 0 6px 16px rgba(0,0,0,0.4)`,
}}>
```

### 3D-Plättchen-Cell-Shadow (Grid-Cells)
```css
boxShadow:
  inset 0 1px 0 rgba(255,255,255,0.22),    /* Lichtkante oben */
  inset 0 -3px 0 rgba(0,0,0,0.20),         /* Wölbung unten */
  2px 3px 0 rgba(0,0,0,0.45),              /* Hard-Edge-Drop */
  0 7px 12px rgba(0,0,0,0.35);             /* Soft-Drop */
```

**Stapel-Cell** kriegt zusätzlich gestaffelten Gold-Doppel-Drop:
```css
3px 4px 0 rgba(217,119,6,0.85),
6px 8px 0 rgba(180,83,9,0.55),
0 0 18px rgba(251,191,36,0.6),
0 0 8px rgba(251,191,36,0.45)
```

### Glow-Pattern (für Highlights)
```css
boxShadow: '0 0 0 3px {accent}, 0 0 18px {accent}88, 0 4px 10px rgba(0,0,0,0.55)'
```
3-Layer: dünner Outline-Ring + Soft-Glow + Subtle-Drop.

---

## ✅ Status-Indikator-Pattern (App-weit konsistent)

### Submit-Status (Team hat geantwortet)
**Pattern:** Grüner Ring 3px `#22C55E` + drop-shadow Glow auf dem Avatar.

```jsx
<div style={{
  filter: answered
    ? 'drop-shadow(0 0 18px rgba(34,197,94,0.75)) drop-shadow(0 0 6px rgba(34,197,94,0.55))'
    : 'grayscale(0.4)',
  opacity: answered ? 1 : 0.55,
}}>
  <QQTeamAvatar style={{
    boxShadow: answered
      ? `0 0 0 3px #22C55E, 0 4px 10px rgba(0,0,0,0.55)`
      : `0 0 0 2px ${tm.color}55, 0 4px 10px rgba(0,0,0,0.55)`,
    transition: 'box-shadow 0.45s ease',
  }} />
</div>
```

**Verwendung:** Bluff (write+vote), Comeback-H/L Question, Connections AnswerStatus, CHEESE/MUCHO Avatare.

**❌ Nicht mehr verwenden:** ✓-Badge unten rechts in der Question-Phase (war Legacy).

### Reveal-Korrekt/Falsch-Indikator
**Pattern:** ✓ (grün) oder ✕ (rot) als Badge unten rechts am Avatar — **nur im Reveal**.

```jsx
{isReveal && (
  <div style={{
    position: 'absolute', bottom: -6, right: -6,
    width: 32, height: 32, borderRadius: '50%',
    background: correct ? '#22C55E' : '#EF4444',
    border: '2.5px solid #0D0A06',
    fontSize: 18, fontWeight: 900, color: '#fff',
    animation: 'revealCorrectPop 0.5s var(--qq-ease-bounce) 0.5s both',
  }}>{correct ? '✓' : '✕'}</div>
)}
```

### Sieger-Indikator
- **🏆** für Connect-4-/Comeback-Sieger
- **🏁** für Connections-Top-Team
- **🥇/🥈/🥉** für Final-Position 1/2/3
- **#N** für Plätze 4+

### Watermark-Avatar im Card-BG (Bluff-Pattern)
```jsx
<div aria-hidden style={{
  position: 'absolute', right: '-15px', top: '50%',
  transform: 'translateY(-50%)',
  width: 'clamp(120px, 14vw, 200px)',
  height: 'clamp(120px, 14vw, 200px)',
  opacity: 0.18,
  filter: 'blur(1.5px)',
  pointerEvents: 'none',
  zIndex: 1,
}}>
  <QQTeamAvatar avatarId={authorTeam.avatarId} size="100%" />
</div>
```

Halbtransparent + leicht geblurrt + großzügig dimensioniert.

---

## 🎬 Animation-Vocabulary

**Datei:** `frontend/src/qqShared.ts` — alle ~95 keyframes zentral.

### Standard-Animationen (verwende diese, statt neue zu schreiben)

| Keyframe | Use-Case | Dauer | Easing |
|---|---|---|---|
| `phasePop` | Element-Entry (opacity + scale) | 0.5-0.7s | `var(--qq-ease-bounce)` |
| `contentReveal` | Fade-in mit subtle slide | 0.45s | `ease` |
| `revealCorrectPop` | ✓ Badge bei Reveal | 0.5s | `var(--qq-ease-bounce)` |
| `revealAnswerBam` | Frage-Card → Reveal-Card | 0.5s | `cubic-bezier(0.22,1,0.36,1)` |
| `cellShockwave` | Neue/gestolen Cell | 0.7s | `ease-out` |
| `cellInkFill` | Cell wird placed | 0.9s | `cubic-bezier(0.22,1,0.36,1)` |
| `qqTimerOutro` | Timer-Ende-Pop | 0.85s | `var(--qq-ease-bounce)` |
| `revealWinnerIn` | Sieger-Banner | 0.55-0.65s | `var(--qq-ease-bounce)` |
| `qqIntroTitleIn` | QuizIntroOverlay-Title | 1.4s | `cubic-bezier(0.16,1,0.3,1.1)` |
| `qqIntroShockwave` | Doppelring-Echo | 1.7-2.0s | `cubic-bezier(0.16,1,0.3,1)` |
| `lineShimmer` | Akzentlinie-Sweep | 1.8-3s linear | – |
| `roundLineGlow` | Divider-Draw-In | 0.7s | `var(--qq-ease-bounce)` |
| `roundDigitFall` / `roundDigitRoll` | Round-Transition Ziffer | 760-820ms | various |
| `qqWelcomeBanner` | Team-Join-Welcome | 3.2s | `cubic-bezier(0.22,1,0.36,1)` |
| `jokerStarFly` | Joker-Verdient-Burst | 0.9s | `cubic-bezier(0.34,1.5,0.64,1)` |
| `comebackSlam` / `comebackFlash` | Comeback-Intro | 0.6-1s | various |

### Idle-Loops (für „nicht-tot wirken" während Wartezeiten)
- `cqWordmarkBreath` — Glow-Pulse
- `qqIntroBubbleBob` — Sprechblase wackelt
- `qqIntroFireflyDrift` — Fireflies treiben
- `qqBadgeIconBob` — Badge-Icons wippen
- `cfloat` — Cutout-Emojis schweben

### Stagger-Patterns
- **Cards-In:** delay = `0.1 + i * 0.08` (s)
- **Avatar-Cascade:** delay = `0.3 + i * 0.1` (s)
- **Letter-Stagger** (Wordmark): `0.25 + i * 0.06` (s)

---

## 📐 Spacing-Patterns

### Padding-Tripel (clamp)
```css
/* XL — Hero-Cards */
padding: clamp(14px, 1.8vh, 24px) clamp(20px, 2.5vw, 36px)

/* LG — Standard-Cards */
padding: clamp(10px, 1.4vh, 18px) clamp(16px, 1.8vw, 28px)

/* MD — Compact Cards */
padding: clamp(7px, 0.9vh, 12px) clamp(14px, 1.5vw, 22px)

/* Pill */
padding: 8px 22px  (oder clamp(6,1vh,10) clamp(14,1.6vw,22))
```

### Gap-Patterns
- **Wide Container:** `gap: clamp(18px, 3vh, 36px)`
- **Card-Internal:** `gap: clamp(8px, 1vh, 14px)`
- **Avatar-Row:** `gap: clamp(10px, 1.4vw, 20px)`
- **Compact-Inline:** `gap: clamp(4px, 0.5vw, 8px)`

### Margins
- **Section-Trenner:** `marginBottom: clamp(16px, 2.5vh, 28px)`
- **Sub-Element-Offset:** `marginTop: clamp(6px, 1vh, 14px)`

---

## 🚫 Layout-Hard-Rules

### `/beamer` darf NIE Scrollbar zeigen
**Regel:** body+html overflow:hidden + QuestionView overflow:hidden. Falls Inhalt zu groß → **clippen oder Sizing anpassen**, nicht scrollen lassen.

### Card vertikal mittig (mit Options als 1 Block)
**Regel:** Frage-Card + Optionen + Voter-Reihe werden als zusammenhängender Block vertikal zentriert. Memory: `feedback_card_transitions_smooth.md`.

**Ausnahme:** Hot-Potato bei vielen Antworten — Card+Chips als 1 Block in flex-flow, kein justifyContent-Switch.

### Smooth Q↔R-Transitions
**Regel:** Question→Reveal-Übergänge ≥0.45s, smooth — kein Jump-Cut. Memory: `feedback_card_transitions_smooth.md`.

### Position-Fixed-Trap
**Regel:** Niemals `position: fixed` innerhalb BeamerFrame — wird durch Transform-Stacking-Context von `beamerFade` zu `position: absolute`-relativ-zur-Card. Stattdessen `position: absolute` mit klarem Positioning-Ancestor verwenden. Memory: `MEMORY.md` Critical-Section.

### Gouache-Pages = nur Stil-Tausch
**Regel:** Gouache-Pages clonen das Layout 1:1 vom produktiven Pendant — nur Components/Tokens austauschen, keine eigene Layout-Architektur. Memory: `feedback_gouache_layout_principle.md`.

---

## 🎯 Standards-Checkliste für neue Pages

Wenn du eine neue Page baust oder eine bestehende refactorst, geh diese Liste durch:

- [ ] Verwendet `qqDesignTokens.ts` (RADII / WEIGHT / DURATION / TEXT_COLOR)?
- [ ] Status-Indikator = grüner Ring (Submit) oder ✓/✕ (Reveal) — nicht mixed?
- [ ] Cards: 3-Schicht-Shadow oder 2-Schicht (siehe Card-System)?
- [ ] Animations aus dem Vocabulary (qqShared.ts) — keine neue ad-hoc?
- [ ] Typography in Hierarchie-Stufe (siehe Typography)?
- [ ] Cell-Background nutzt `qqGetBoardColor`, nicht `team.color`?
- [ ] Beamer hat keine Scrollbar (overflow: hidden auf root)?
- [ ] Card-Center: Frage+Options als 1 Block vertikal mittig?
- [ ] Q↔R-Transition ≥0.45s?
- [ ] Mod-Hint („Space → Next" etc.) bei spezial-Phasen vorhanden?

---

## 📅 Änderungs-Log (für die KI in zukünftigen Sessions)

- **2026-05-05** — Initial-Style-Guide aus Code-Audit. Phase 1 von Vereinheitlichungs-Pass.
  Page-by-Page-Audits folgen in Phase 2.

