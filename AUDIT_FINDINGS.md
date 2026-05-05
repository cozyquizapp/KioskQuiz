# 🔍 Phase-2 Audit-Findings — Page-by-Page gegen STYLE_GUIDE

**Stand:** 2026-05-05 · **Status:** Phase 2 ABGESCHLOSSEN — 4 Cluster, 18 Pages auditiert

> **Ground-Truth-Liste.** Wolf priorisiert in Phase 3 (für jede Major/Minor: fix/akzeptiert), Phase 4 macht den Refactor in Clustern.

---

## 📊 Compliance-Übersicht

| Cluster | Pages | Major | Minor | Nitpick | Compliance |
|---|---|---:|---:|---:|---:|
| **A** Pre/Inter | 6 | 12 | 9 | viele | ~70% |
| **B** Active-Question | 4 | 11 | 7 | mehrere | ~72% |
| **C** Result/End | 5 | 4 | 6 | wenige | ~85% |
| **D** Mod + Team | 2 | 9 | 8 | mehrere | ~75% |
| **TOTAL** | **17** | **36** | **30** | — | **~75%** |

**Erkenntnis:** 75% der App ist Style-Guide-compliant. Die 25%-Drift kommt fast ausschließlich aus 5 strukturellen Patterns (siehe Cross-Cutting unten), kein einzelner UX-Breaker.

---

## 🔴 Cross-Cutting-Patterns (Master-Refactor-Kandidaten)

Diese Patterns kommen in MEHR als 3 Pages vor — wenn man sie zentral fixt, sind ~60% der Findings auf einen Schlag erledigt.

### CC-1 · Magic-Numbers statt Tokens
- **Verbreitung:** alle 17 Pages
- **Pattern:** `borderRadius: 16/24/999`, `fontWeight: 800`, `boxShadow: rgba(...,0.55)` statt `RADII.normal`, `WEIGHT.extraBold`, `ALPHA_DEPTH.d2`
- **Hebel-Lösung:** Codemod-Script über alle frontend Files: häufigste Inline-Werte → Token-Imports. ~2-3h Arbeit, einmalig.

### CC-2 · Inline-Cubic-Bezier statt CSS-Vars — ✅ TEIL-ERLEDIGT 2026-05-05
- **Verbreitung:** ~10 Pages, häufigster Wert `cubic-bezier(0.22,1,0.36,1)` (34×)
- **Fix:** Neue CSS-Var `--qq-ease-out-cubic` (= `cubic-bezier(0.22,1,0.36,1)`) in main.css + Token `EASING.outCubic`. 34 Vorkommen 1:1 migriert in QQBeamerPage (29×), QQProgressTree (4×), QQAvatarGeneratorPage (1×). Visuell identisch — kein Verhaltens-Shift.
- **Offen (akzeptiert):** Andere Inline-Werte mit subtilen Abweichungen
  zu bestehenden Vars (z.B. `(0.34,1.6,...)` ≈ bounce, `(0.2,0.8,0.4,1)` ≈ pop-fast)
  bleiben für jetzt inline — Migration würde unsichtbares Animation-Drift bedeuten.

### CC-3 · Submit-Status-Inkonsistenz (BREAKING) — ✅ ERLEDIGT 2026-05-05
- **Pages:** BluffWriteScreen, BluffVoteWaitingScreen
- **Bug:** nutzten NUR `filter: drop-shadow(green)` OHNE den Green-Ring (`boxShadow: 0 0 0 3px #22C55E`). CHEESE/MUCHO/Comeback haben BEIDES.
- **Status:** Bereits in einem Pre-Phase-4-Commit gefixt — beide Stellen
  haben jetzt `boxShadow: 0 0 0 3px #22C55E, 0 4px 10px rgba(0,0,0,0.55)`
  (siehe QQBeamerPage:6188 + 6317). Verifiziert in Bucket-1.

### CC-4 · Position-Fixed-Trap-Verstöße — ✅ ERLEDIGT 2026-05-05
- **Pages:** QuizIntroOverlay (line 2770), RulesIntroOverlay (line 3028)
- **Bug:** `position: 'fixed', inset: 0, zIndex: 998X` — der Style-Guide sagt explizit „nie position:fixed im BeamerFrame" (L399).
- **Fix:** `<BeamerOverlay>`-Wrapper-Komponente (`frontend/src/components/BeamerOverlay.tsx`) gebaut, beide Overlays migriert auf `position: absolute, inset: 0` mit klarem Positioning-Ancestor (QQBeamerPage-Root-Div hat `position: relative`). Verhalten visuell identisch, aber deterministisch — kein Stacking-Context-Trap mehr.

### CC-5 · Phase/Kategorie-Farben inline statt zentral — ✅ ERLEDIGT 2026-05-05
- **Pages:** PhaseIntroView (`phaseColors`), QuestionView (`CAT_COLORS`), Mod-Page-Toast
- **Fix:** `QQ_PHASE_COLORS` Token in `qqDesignTokens.ts` (Bucket-4 Patches) + Migration der zwei Inline-Dupes in QQBeamerPage:4071+12189 + Reuse in `prevColor` bei der Round-Transition.
- **Offen (akzeptiert):** `CAT_COLORS` in QQBeamerPage:4098 bleibt page-lokal (deeper "core" Versionen, unterscheiden sich von `QQ_CAT_ACCENT` in qqShared.ts mit gleichem Zweck). Migration auf zentrales Token wäre eine Kategorie-Farb-Konsolidierung — separater Schritt, nicht Phase-4 Scope.

---

## 🅰️ Cluster A — Pre/Inter-Phase-Folien

### QuizIntroOverlay (line 2765+)
**Was passt:** Animation-Vocabulary korrekt (custom Keyframes inline), Letter-Spacing.wide (0.1em) konsistent.

**Major:**
- `[QQBeamerPage.tsx:2770]` `position: 'fixed', inset: 0` — CC-4 Position-Fixed-Trap
- `[QQBeamerPage.tsx:2836, 2845, 2880]` `fontWeight: 800` (sollte 700/900), `borderRadius: 24` ohne Token, `letterSpacing: '0.55em'` (Style-Guide nur 0.04/0.1)

**Minor:**
- Tail-Dreiecke `rgba(251,191,36,0.55)` statt ACCENT_GOLD + ALPHA_DEPTH
- `qqIntroAccentShimmer` könnte zentral sein

### RulesIntroOverlay (line 2972+)
**Was passt:** Glow-Farb-Palette Kontrast-bewusst, Inline-Keyframes Page-spezifisch.

**Major:**
- `[QQBeamerPage.tsx:3028]` `position: 'fixed'` — CC-4
- `[QQBeamerPage.tsx:3062]` WebkitBackgroundClip-Fallback komplex

**Minor:**
- `letterSpacing: '0.1em'` Magic-Value statt LETTER_SPACING.wide

### RulesView (line 3101+)
**Was passt:** Card-Padding clamp-System korrekt, Divider mit zentralem `lineShimmer`.

**Major:**
- `[3130]` `borderRadius: 24` statt RADII.rounded — CC-1
- `[3149]` `${slide.color}88` statt `ALPHA_DEPTH.d3` — CC-1
- `[3148, 3154]` Magic-LetterSpacings

**Minor:**
- Inline `${slide.color}` Glows
- `[3199]` `'#a8a395'` statt TEXT_COLOR.muted

### LobbyView (line 3305+)
**Was passt:** `qqWelcomeBanner`+`cqWordmarkBreath` zentral, Status-Farben konsistent.

**Major:**
- Inline cq-wordmark CSS-Klasse statt zentralem HERO-GLOW-Pattern
- `phasePop` nicht überall genutzt (Konsistenz-Lücke)

**Minor:**
- `[3453]` `#FBBF24` statt ACCENT_GOLD.bright — CC-1
- `lobbyPulse` Animation undefined

### TeamsRevealView (line 3715+)
**Was passt:** Custom Anims (qqTrTitle, qqTrSlam), Sound-Sync-Logik exzellent.

**Major:**
- `[3872]` `qqTrSlam 900ms` mit Inline-cubic-bezier — CC-2
- `[3878]` `qqTrPulse 2.2s` — Idle-Loop fehlt in DURATION (siehe Style-Guide-Lücke)

**Minor:** RADII-Token, `letterSpacing: '0.15em'` Magic.

### PhaseIntroView (line 4077+)
**Was passt:** Kategorie-Farben explizit (CAT_COLORS), Round-Transition-Choreografie gut.

**Major:**
- `[4080]` Magic Hex-Array statt PHASE_COLORS Token — CC-5
- `[4099]` Status-Farben manuell statt aus QQ_CATEGORY_LABELS

**Minor:** CAT_EXPLAIN/BUNTE_SUB_INTRO lokal statt zentral.

---

## 🅱️ Cluster B — Active-Question-Views

### QuestionView (line 8413+)
**Was passt:** CAT_ACCENT konsistent, Cascade-Sound synchron, Responsive Typography.

**Major:**
- `COZY_CARD_BG` inline — sollte COLORS.cardGradient
- `[5345]` Hex-Suffix `55` statt ALPHA_DEPTH.d2 — CC-1
- `[6399-6401]` Bluff-Reveal-Cards nur 2-Schicht-Shadow, Style-Guide verlangt 3-Schicht für „prominent"
- Font-Weight 700/900-Mix bei Pillen

**Minor:** OnlyConnect Winner-Ring `#FBBF24` hardcoded, Hot-Potato Goldton Inline-Hex.

**Nitpick:** Watermark-Avatar-BG-Pattern nicht im Style-Guide dokumentiert (siehe Style-Guide-Lücken).

### HotPotatoBeamerView (line 1904+)
**Was passt:** Card+Chips als 1 Block (no-gap-fix 2026-05-05), Tier-basiertes Chip-Sizing, Cascade-Anim.

**Major:**
- `[2022-2033]` Timer-Pill mit Magic Border + Colors
- `[2074-2075]` Eliminated-Watermark Goldton 0.7 alpha nicht in Token
- `[2010]` `tcpulse 1.4s` nicht im Animation-Vocabulary

**Minor:** letterSpacing 0.2 Magic.

### BluffBeamerView (line 5896+)
**Was passt:** Fireflies-Tint, Phase-Pill konsistent, Reveal-Tabelle als Grid.

**Major:**
- **Submit-Status BREAKING** [BluffWriteScreen 6185-6209, BluffVoteWaitingScreen 6315-6334]: NUR Filter ohne Green-Ring — CC-3 BREAKING
- `[6399-6401]` Reveal-Cards 2-Schicht statt Hero-3-Schicht
- Winner-Pille Position UNTER Reveal-Tabelle (neu) — verifizieren dass Voter-Avatare nicht überdeckt
- Font-Weight 11px-Eyebrow mit fontWeight 900 (sollte 700)

### OnlyConnectBeamerView (line 6488+)
**Was passt:** Hint-Cards mit Pulse, Winner-Hint Gold-Ring, Cascade-Sound.

**Major:**
- `[6827]` `rgba(251,191,36,0.65)` Alpha nicht in ALPHA_DEPTH (siehe Style-Guide-Lücken)
- `[6856]` `grayscale(0.65)` nicht dokumentiert (HotPotato nutzt 0.4)
- `[6792]` Inline cubic-bezier in revealAnswerBam — CC-2
- `[6880-6907]` Answer-Card Reveal Gold-Alphas 0.18/0.05/0.45 nicht in Token

---

## ©️ Cluster C — Result/End-Folien

### PlacementView (line 10826+)
**Was passt:** Token-Nutzung konsistent, 3D-Grid-Transition mit activeTeamId-Indikator, ScoreBar prominent.

**Major:**
- Keine — PlacementView ist clean ✅

**Minor:** `0.48vw` Magic-Number im Grid-maxSize.

### ComebackView (line 11116+)
**Was passt:** Hero-Card-Pattern (24+3-Schicht), VS-Badge mit `qqVsPulse`, Avatar-Farbsysteme.

**Major:**
- `[11328]` `letterSpacing: '0.12em'` statt LETTER_SPACING.wide(0.1em)
- ⚠️ Subagent meinte Avatar-Glow-bei-Reveal fehlt — **falsch verstanden**, der ist seit `e12d3fae` (1A-Feature) implementiert. Bitte bei Phase-3 ignorieren.

**Minor:** SlotMachineNumber nicht im Style-Guide, Reveal-Pille 0.4s statt DURATION.normal.

**Nitpick:** Title-Pill 999 vs Card-Radius 24 — Konsistenz-Detail.

### ConnectionsBeamerView (line 12855+)
**Was passt:** ALLES — Hero-Title 3-Layer-Glow, Header korrekt, Rule-Pillen nutzen Stapel-Bonus-Wording, Spoiler-Safe Grid, Placement-Phase Status-Farbe korrekt.

**Major:** Keine ✅

**Minor:** Grid-Gap clamp-Wert `1.2vw` nicht in Token-Tripeln.

### GameOverView (line 13479+)
**Was passt:** Spotlight-Stage mit `finaleScoreCount`, Mod-Hint sichtbar, Hero-Card mit 32-Radius + 3-Schicht-Shadow, Recap-Tabelle ohne Clipping, Tie-Breaker-Handling.

**Major:** Keine ✅

**Minor:**
- `[13510]` Auto-Advance 3.5s Magic-Number
- Pause-Indikator `1.4s ease-in-out` nicht DURATION-Wert

**Nitpick:** Hero-Spotlight-Emoji `#{rank}` font-size keine Hierarchie-Skalierung.

### ThanksView (line 13758+)
**Was passt:** QR prominent, CozyWolf-Anchor-Pill, UPPERCASE-Eyebrow korrekt, 24-Radius+3-Schicht-Shadow.

**Major:**
- `[14001]` QR-Box-Shadow nur 2-Schicht statt 3-Schicht für Hero-Card

**Minor:** CozyWolf-Pill Gradient-BG (visuelle Aufwertung, ok), QRCode 240px Magic.

---

## 🆎 Cluster D — Mod + Team Pages

### QQModeratorPage
**Was passt:** Toast-System mit Status-Farben, Hotkey-Labels sichtbar, computeTeamHighlights-Spickzettel im Live-Stress lesbar.

**Major:**
- `[844-849, 882-886]` Inline-BorderRadius + BoxShadow statt RADII/ALPHA_DEPTH — CC-1
- `[1609-1652]` Spickzettel-Padding 8px zu klein für Live-Stress (sollte MD-Standard 10-12px)
- `[1643-1647]` Highlight-Typography Eyebrow-Stil-Mix (10-13px, sollte einheitlich 11px+wide)
- `[1921-1926]` Action-Bar-Buttons Shadow-Alpha 22 statt 33 (d1)
- `[1610]` `padding: '8px 10px'` cramped für Highlights

**Minor:**
- Button-Shadow inkonsistent
- Separator-Background `rgba(255,255,255,0.08)` hardcoded

**Nitpick:** Icon-Spacing inkonsistent in Action-Bar.

### QQTeamPage
**Was passt:** Setup-Flow CozyBtn 16px-Padding ✓ TAP_TARGET, Cell-Grid Hover/Tap mit 3-Schicht-Glow ✓, Avatar-Glow konsistent.

**Major:**
- `[5920-5931]` CozyBtn `padding: '16px'` fest statt clamp für Phone-Skalierung
- `[4847]` Cell-Gradient Alpha48/24 hardcoded statt ALPHA_DEPTH.d3+d2
- `[4133, 4050]` Bluff-Item vs Comeback-Title Typography-Inkonsistenz (gleiche semantische Ebene, andere clamp-Range)
- `[1477-1499]` Language-Toggle `padding: 4px 8px` → ~24×24px UNTER TAP_TARGET.min(44px)
- `[809, 1119, 1637]` `tcfloat 3s` hardcoded — Idle-Loop fehlt in DURATION (siehe Lücken)

**Minor:**
- `[1453-1459, 4806-4817]` BorderRadius 8 statt RADII.tight Token
- `[2087]` Emoji-Pill Padding nicht synchron mit Pill-Token
- `[4878-4883]` Frost-Animation blue Hardcoded statt Cat-Accent

**Nitpick:** `[4839]` `borderRadius: 6` non-standard (zwischen RADII.tight=8 und keinem kleineren Token).

---

## 📚 Style-Guide-Lücken (sollten ergänzt werden)

Aus allen 4 Cluster-Reports konsolidiert:

| # | Lücke | Vorschlag |
|---|---|---|
| **L1** | Overlay-Position-Regel klarer | Section „Overlays im BeamerPage" mit Beispiel-Wrapper-Component |
| **L2** | DURATION für Idle-Loops fehlt (2-3s) | `DURATION.idle: 2400` oder `DURATION.loop: 3000` ergänzen |
| **L3** | PHASE_COLORS-Token fehlt | In `qqDesignTokens.ts` hinzufügen, alle PhaseIntro-Inlines migrieren |
| **L4** | LETTER_SPACING strikter / erweitern | Entweder Liste auf 0.04/0.1/0.12/0.16/0.22 erweitern, oder Migration-Regel „nur tight/wide für neuen Code" festschreiben |
| **L5** | Watermark-Avatar-Pattern dokumentieren | Section unter Status-Indikatoren |
| **L6** | RADII.compact (6px) für „subtile runde Ecke" | Optional ergänzen, oder strikt „nur tight/normal/rounded/pill" |
| **L7** | Phone-spezifische Patterns (Tap-Feedback, Vibration) | Section „Mobile Interaction Feedback" für Team-Page |
| **L8** | Alpha-Werte 0.18/0.45/0.65 nicht in ALPHA_DEPTH | Entweder Token erweitern oder Migration-Regel |
| **L9** | Easing-Inline cubic-bezier Migration-Regel | Neuer Code muss CSS-Vars nutzen, kein Inline |
| **L10** | Auto-Advance/Spotlight-Durations | `DURATION.spotlight: 3500` für GameOver-Auto-Advance |

---

## 🎯 Phase-3 Vorschlag: Priorisierung-Buckets für Wolf

### Bucket-1: BREAKING Konsistenz (Pflicht-Fix)
- **CC-3** Bluff-Submit-Status: Green-Ring fehlt → 20 Min Fix
- **CC-4** Position-Fixed-Trap (2 Stellen) → 1h via BeamerOverlay-Wrapper

### Bucket-2: Strukturelle Hebel (große Wirkung pro Stunde)
- **CC-1** Magic-Numbers → Tokens (Codemod-Script) → 2-3h, fixt 60% der Findings
- **CC-2** Inline-cubic-bezier → CSS-Vars → 30 Min
- **CC-5** PHASE_COLORS-Token + Migration → 30 Min
- **L3** Style-Guide-Lücken-Update bevor Phase 4 → 30 Min

### Bucket-3: Per-Page-Detail-Findings (lange Liste)
- Bluff-Reveal-Cards Hero-3-Schicht → 15 Min
- ThanksView QR-Box-Shadow Hero-3-Schicht → 10 Min
- ComebackView letterSpacing 0.12 → 0.1 → 5 Min
- Mod-Page Spickzettel Padding 8px → 10-12px → 10 Min
- TeamPage Language-Toggle Tap-Target → 10 Min
- Diverse Page-spezifische Findings → ~3-4h gesamt

### Bucket-4: Style-Guide-Lücken-Patches (vor Phase 4)
- L1, L2, L3, L7, L10 ergänzen → 1h
- L4, L6, L8 entscheiden (erweitern vs. strikt) → Wolf-Entscheidung

### Bucket-5: Akzeptiert / Nitpicks
- Visual-Aufwertungen (CozyWolf-Pill Gradient, italic Voters)
- Existing Brand-Choices die kein Bug sind

---

## 🚀 Empfohlene Reihenfolge für Phase 4

1. **Style-Guide-Lücken patchen** (1h) — Bucket-4 erst, damit Phase 4 gegen aktuellen Standard läuft
2. **CC-3 Bluff-Submit-Status fixen** (20 Min) — schnellster BREAKING-Fix
3. **CC-2 Inline-Easing → CSS-Vars** (30 Min) — Codemod-Script
4. **CC-5 PHASE_COLORS-Migration** (30 Min)
5. **CC-1 Magic-Numbers → Tokens** (2-3h Codemod) — 60% der Findings auf einen Schlag
6. **CC-4 BeamerOverlay-Wrapper** (1h)
7. **Bucket-3 Per-Page-Details** in 2-3 Sessions

**Total geschätzt:** 8-10h Refactor in Phase 4. Danach: ~95% Compliance.

---

## 🎬 Was Wolf jetzt entscheiden muss

1. **Style-Guide-Lücken-Patches** (Bucket-4): welche Lücken erweitern wir Token-System (L2/L3/L8), welche entscheiden wir „strict" (L4/L6)?
2. **Bucket-1 BREAKING**: Sofort fixen oder warten bis Bucket-2 zusammen?
3. **Bucket-2 strukturelle Refactors**: Reihenfolge ok? Oder anders?
4. **Bucket-3 Detail-Findings**: alle ja, oder nur ausgewählte?
5. **Welche „akzeptiert" sind das**? (z.B. CozyWolf-Pill-Gradient ist absichtlich Brand-Aufwertung)

Sag „Bucket-1 + 2 jetzt, Rest später" oder „alle 1-3, Bucket-4 mit Patches" oder anders. Dann starte ich Phase 4.
