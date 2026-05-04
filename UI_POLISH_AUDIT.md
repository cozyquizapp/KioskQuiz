# UI-Polish-Audit — CozyQuiz

**Stand:** 2026-05-04 · **Branch:** `main`

Drei externe Audit-Reports + Migrations-History. Das hier ist die zentrale Doku
für Design-Entscheidungen. Wenn ein neues Polish-Pass kommt, hier ergänzen.

---

## 📋 Inhaltsverzeichnis

1. [Audit 1 — UI-Polish (App-Designer-Profi)](#audit-1--ui-polish-app-designer-profi)
2. [Audit 2 — Animation-Konsistenz (Motion-Designer)](#audit-2--animation-konsistenz-motion-designer)
3. [Audit 3 — Design-Gesamtbewertung (Senior Product Designer)](#audit-3--design-gesamtbewertung-senior-product-designer)
4. [Umgesetzte Fixes (Commits)](#umgesetzte-fixes-commits)
5. [Offen / Nächster Pass](#offen--nächster-pass)
6. [Design-Tokens-System](#design-tokens-system)

---

## Audit 1 — UI-Polish (App-Designer-Profi)

**Auditor:** erfahrener App-Designer (Headspace / Linear / Duolingo-Schule)
**Scope:** QQBeamerPage / QQTeamPage / QQModeratorPage / QQTeamAvatar / TeamNameLabel
**Findings total:** 27 (14 P0, 13 P1+P2)

### 🚨 P0 — sofort fixen (Wahrnehmung gebrochen)

| # | File:Zeile | Problem | Status |
|---|---|---|---|
| 1 | QQTeamPage Inputs | iOS Auto-Zoom (Font-Size <16px) | ✅ war schon ≥16px |
| 2 | QQTeamPage Inputs | `outline: 'none'` ohne `:focus-visible`-Fallback (Tab blind) | ✅ Commit `8446e858` |
| 3 | QQTeamPage:1501 IdentityBanner | Hard `padding: '32px 44px'` bricht auf 320px | ✅ `clamp(20-32, 28-44)` + `maxWidth: min(360, 90vw)` |
| 4 | global /team Buttons | Mobile-Tap-Feedback fehlt | ✅ `.qq-team-page button:active` Scale + Opacity |

### 🟡 P1 — sichtbarer Polish-Win

| # | Problem | Vorher | Jetzt | Status |
|---|---|---|---|---|
| 5 | Border-Radius-Salat | 9+ Werte (10/12/14/16/18/20/22/24/28/36) | 4-Werte: 8 / 16 / 24 / 999 | ✅ `6ae19aad` |
| 6 | Box-Shadow Alpha-Werte willkürlich | `${color}5e`, `66`, `77`, `88` ungleichmäßig | `33 / 55 / 88` (d1/d2/d3) | ✅ teilweise (`6ae19aad`) |
| 7 | Letter-Spacing inkonsistent | 0.02 / 0.04 / 0.05 / 0.06 / 0.08 / 0.12 / 0.14 / 0.16 / 0.18 / 0.2 em | `0.04em` + `0.1em` | ✅ `6ae19aad` |
| 8 | Font-Weight wild | 600 / 700 / 800 / 900 | nur 700 + 900 | ✅ `6ae19aad` |
| 9 | Kontrast `#94a3b8` auf `#0d0a06` | Audit sagte 3.5:1 | nachgerechnet ~7:1 (AAA) | ✅ false positive, kein Fix |
| 10 | Avatar-Float synchron | scheinbar alle gleichzeitig | bereits gestaffelt (`i*0.3s`) | ✅ false positive |

### 🟢 P2 — Nice-to-have (offen)

- [QQBeamerPage:538-542] Loading-Screen ohne Spinner
- [QQTeamPage:1957] Avatar-Float nur global, nicht slot-spezifisch
- [QQBeamerPage:2715] Kein Empty-State bei leeren Winners
- `prefers-reduced-motion` zu aggressive (alles auf 0.01ms)
- Performance: `calc()` an String-FontSize könnte `useMemo`'d sein

### 🏆 Was schon richtig gut ist

- **Responsive `clamp()`-Skalierung** durchweg konsistent angewendet
- **Animations-Keyframes zentral** in `TEAM_CSS` statt verstreut
- **Cubic-Bezier-Easing** kohärent (`0.34,1.56` für Bounces)
- **`will-change`-Hints** korrekt platziert (nicht überall blindlings)

---

## Audit 2 — Animation-Konsistenz (Motion-Designer)

**Auditor:** Motion-Designer (Apple MotionFX-Spec, Material-Motion-Schule)
**Scope:** alle `@keyframes` + `animation:` Inline-Styles in Live-Pages

### 🎬 Easing-Familie

**Befund:** 2-Tier-System mit guter Kohärenz, aber undefinierte Outlier.

**Kern (80% der Animationen):**
- Bounce-Standard: `cubic-bezier(0.34, 1.56, 0.64, 1)` — Apple-HIG-nah
- Smooth (Material): `cubic-bezier(0.4, 0, 0.2, 1)` — Reveals/Transitions

**Outlier die ins System passen sollten:**
| File:Line | Aktuell | Empfohlen |
|---|---|---|
| QQBeamerPage:1726 | `(0.34, 1.2, 0.64, 1)` schwächer | → `(0.34, 1.56, 0.64, 1)` |
| QQBeamerPage:4226 | `(0.4, 0, 0.6, 1)` zu flach für Drop | → `(0.3, 0, 0.5, 1)` |
| QQBeamerPage:4262 | `(0.65, 0, 0.35, 1)` extreme | dokumentieren als Spezialfall |
| QQBeamerPage:2620 | `(0.34, 1.4, 0.64, 1)` 10% schwächer | → `(0.34, 1.56, 0.64, 1)` |

### ⏱️ Duration-System

**Befund:** Token existiert (`DURATION.fast/normal/slow = 150/300/600`), wird **nicht genutzt**. Inline-Werte überall.

Häufige Werte: 400-450ms, 560-820ms, 1000ms, 3000-6000ms (infinite). Kein Mapping zu Tokens.

### 🪀 Bounce-Patterns

- **Primary** (`0.34, 1.56, 0.64, 1`) — gut etabliert
- **Secondary** (`0.34, 1.4, 0.64, 1`) — 10% schwächer, wirkt „ausgebremst"
- **Aggressive Material-Bounce** (`0.2, 0.8–1.2, 0.2–0.3, 1`) — nur 2-3 Stellen, könnte als Game-Feel-Variante dokumentiert werden

### 🎯 Stagger-Rhythmus

**Kein System** — Stagger-Konstanten springen wild:
- 60ms (Lobby-Card-In) ✓ smart
- 90ms (Sound-Sync-Grid) ✓ psychoakustisch optimiert
- 180ms (Order-Reveal)
- 350ms (Slow-Wobble Idle)
- 950ms (Countdown) — viel zu langsam für „urgent"

**Empfehlung:**
```ts
export const STAGGER = {
  tight:     60,   // Lobby-Card-In
  normal:    90,   // Sound-Sync
  leisurely: 350,  // Idle-Personality
};
```

### 🚨 Kritische Inkonsistenzen (sofort fixbar)

1. **QQBeamerPage:1726** — `qqSlideIn 420ms (0.34,1.2,0.64,1)` → bounce-Standard
2. **QQBeamerPage:4226** — `roundDigitFall 760ms (0.4, 0, 0.6, 1)` → `(0.3, 0, 0.5, 1)` (mehr Drop-Feel)
3. **QQBeamerPage:1824** — Countdown-Stagger `0.25 + i*0.95s` → `0.1 + i*0.45s` (doppelt so urgent)
4. **QQBeamerPage:3439** — `qrScanBreath 2.4s + qrGlow 3s` → beide auf 3s (Phase-Sync)
5. **QQTeamPage:1789** — 3 stacked Animations → max 2 gleichzeitig
6. **QQBeamerPage:10036** — `pinRevealIn (0.34,1.4,0.64,1)` → bounce-Standard

### 💡 Empfohlene Tokens-Erweiterung

```ts
// in qqDesignTokens.ts
export const EASING = {
  bounce:      'cubic-bezier(0.34, 1.56, 0.64, 1)',  // Standard
  bounceSoft:  'cubic-bezier(0.34, 1.4,  0.64, 1)',  // sanft
  popFast:     'cubic-bezier(0.2, 0.8, 0.3, 1)',     // Game-Feel
  smooth:      'cubic-bezier(0.4, 0, 0.2, 1)',       // Material
  smoothOut:   'cubic-bezier(0.3, 0, 0.5, 1)',       // Drop-Feel
  breathe:     'ease-in-out',                        // Idle
};

export const STAGGER = {
  tight:     60,
  normal:    90,
  leisurely: 350,
};
```

### 🏆 Was schon richtig gut ist

- **Bounce-Konsistenz im Kern** (80% nutzen denselben Wert)
- **Sound-Sync-Thinking** bei 90ms-Stagger mit psychoakustischem Offset (`QQBeamerPage:1363`)
- **Idle-Logik ist diegetic** (Avatar-Floats wirken wie Charakter-Personality, nicht Pulse-Spam)
- **Reveal-Pattern kohärent** (neue Inhalte von oben + Fade)
- **`will-change` sparsam** (nur 1 Stelle, nicht blindlings)

---

## Audit 3 — Design-Gesamtbewertung (Senior Product Designer)

**Gutachter:** 12+ Jahre, Studio-Erfahrung (Riot/Zynga/Jackbox-Schule)

### 🎨 Ist die App optisch zeitgemäß?

**Ja, mit Vorbehalten.** Vergleich zu 2026-Konkurrenten:
- **Kahoot** (2024+): heller, gradient-lastig, sehr Mobile-First, Confetti-Overkill
- **Jackbox**: darkmode, Neon-Pops, schnelle Transitions
- **Quizizz**: modular, neutral, B2B-schick

CozyQuiz wirkt **reifer und ruhiger** als diese — das ist eine Stärke. Aber: Gradient-Subtilität fast zu leise auf kleinen Screens; Gold-Schärfe auf Beamer könnte prägnanter. **Verdict: modern, aber nicht laut genug. Fehlt das „Wow" beim ersten Aufschlag.**

### ✨ Designtechnisch schick?

**Ja, kohärent. Persönlichkeit durchgezogen.**

**Vibe:** „Cozy Campfire UI" — warme Nächte, Pub-Atmosphäre, Tabletop-Game-Feeling.
**Stilreferenzen:** Material Design (Cards), Firefly/Ambient Motion (Glühwürmchen am Beamer), Dark Mode Best Practice, Game-UI 2022-24.

**Schwächen:**
1. **Beamer-Schrift zu klein** auf 100"+ Beamer aus 8m — Pub-Owner würde monieren
2. **Card-Rounding war inkonsistent** (mit `6ae19aad` gefixt)
3. **Animation-Saturation variiert** — Beamer ~20 Keyframes, Mod nur 2-3 → uneinheitliche Bewegungs-Sprache

**Persönlichkeit-Score:** 7/10 — funktioniert, aber „flirtet nicht".

### 💰 Kommerziell einsetzbar?

**60% Marktreife jetzt, 85% mit Library.**

**Pub-Owner-Wahrnehmung (erste 30s):**
- Sieht Premium-Game-Software-Look ✅
- Sieht professionelle Lobby ✅
- Aber: User-generated Fragen-Builder = mehr Aufwand für Owner

**Was fehlt für Premium-Pricing (€30-50/Saison):**
1. **Professional Host-Kit** — branded Countdown-Loop, Streamer-Kit (OBS-Overlay), Remote-Clicker
2. **Frage-Library** — 1000+ statt 5 Sample-Drafts (Konkurrenten-Standard)
3. **Reveal-Drama** — Falsch-Antworten dramatischer (Shake/Pulse/Confetti, nicht nur Toast)
4. **Sound-Design** — aktuelle WAVs sind Placeholder, brauchen Lizenz (z.B. Epidemic Sound €10/mo)

### 👥 Zielgruppe

**Primär:**
- Pub-Quiz-Veranstalter, **35–55 Jahre**, klein- bis mittelbürgerlich
- Enthusiast-driven Gaming Bars, **30–45 Jahre**

**Psychographie:**
- Will Social-Gathering-Tool, nicht Fortnite-Energy
- Erwartet **Stabilität** > Features (kein Crash am Freitag)
- Liebt **Kontrollierbarkeit** (Setup, Pause, Draft-Customization)
- Skeptisch bei Startup-Tools (Render-Free-Tier-Wakeup = -20 Vertrauenspunkte)

**Passt der aktuelle Look?** Ja, für 45J Pub-Owner. Nicht für 28J TikTok-Streamer (zu intim) oder Corporate-Events (zu retro).

**Empfehlung:** Sub-Zielgruppe Corporate/Education (heller, schärfer, weniger Gold) als zweites Theme — der Gouache-Stil könnte dafür gut sein.

### 🎯 Top-3-Empfehlungen für die nächsten 30 Tage

1. **Beamer-Lesbarkeit-Audit** — live im Pub mit 1200p-Beamer aus 8m simulieren. Alle Schriften +20%, Kategorie-Badges aus letzter Sitzreihe lesbar. **Dealbreaker für Pub-Operator.**
2. **Frage-Library + Spezial-Templates** — 2-3 Themen-Drafts (80er, Fußball, Kneipp-Klassiker). Partner-Win: lokale Brauereien mit Marken-Trivia.
3. **Sound-Library + Music-Lizenz** — Placeholder-WAVs ersetzen, Background-Loop unter Lobby-Rotation. Music via Epidemic Sound amortisiert über 3-4 Pub-Lizenzen.

### 💎 Score

| Kategorie | Score |
|---|---|
| Visual-Polish | **6/10** — schön, aber nicht laut |
| Brand-Identity | **7/10** — Campfire-warm, aber nicht unvergesslich |
| Mobile-UX | **7,5/10** — gut, kleine Font-Inkonsistenzen |
| Marktreife | **6,5/10** (mit Drafts) → 8/10 (mit Library) |
| **Gesamt** | **6,8/10** |

**Devise:** Nicht „mache es wie Jackbox" (unmöglich für Solo-Dev). Sondern „mache es zur besseren Wahl für Pub-Owner, der Jackbox zu teuer findet, aber keine schlechte Grafik will". Design tut das schon gut. **Jetzt Content + Zuverlässigkeit.**

---

## Audit 4 — Roadmap 6,8 → 10 (Follow-up)

**Gutachter:** derselbe Senior PD, Folge-Konsultation 2026-05-04
**Frage:** „Wie kommen wir vom 6,8 näher an die 10?"

### 🎯 Realistisches Ziel

**10/10 ist nicht erreichbar für Solo-Dev** (Jackbox/Kahoot-Niveau = 150+ Personen-Jahre). Realistisches Ziel: **8,4/10 in 90 Tagen**. Diminishing Returns ab 8,0.

### 📈 Score-Projection

| Tag | Visual | Brand | Mobile | Markt | Gesamt |
|---|---|---|---|---|---|
| Heute | 6,0 | 7,0 | 7,5 | 6,5 | **6,8** |
| Tag 15 | 6,8 | 7,2 | 7,7 | 6,8 | **7,1** |
| Tag 30 | 7,2 | 7,5 | 7,8 | 7,2 | **7,4** |
| Tag 60 | 8,1 | 8,0 | 8,3 | 8,4 | **8,2** |
| Tag 90 | 8,2 | 8,2 | 8,5 | 8,6 | **8,4** |

### 🚀 Priorisierter 90-Tage-Plan

**Sprint 1 (Tag 1-30) — „Foundations of Wow"**
1. **Beamer-Schrift +25%** global (3 d, +0,6) — Pub-Owner-Dealbreaker
2. **Falsch-Antwort-Drama** (Rot-Shake + Pulse statt Toast) (2 d, +0,3)
3. **Countdown-Timer-Puls + Sound-Sting** letzte 3 s (2 d, +0,4)
4. **Easing-Tokens-Harmonisierung** — die 6 offenen aus Audit 2 (3 d, +0,2)
5. **Draft-Template-System + Seed-Datenbank** — 5 Themen (4 d, +0,5)
6. **Sound-Library** — Placeholder-WAVs ersetzen + Lobby-Loop (3 d, +0,3)

→ Sprint 1: **6,8 → 7,6**

**Sprint 2 (Tag 31-60) — „Polish & Library"**
1. ⭐ **Frage-Library aufbauen** (Outsource Fiverr €100-150) — 100-150 Fragen, 5-7 Kategorien (8 d, **+1,2** = größter Hebel)
2. **CozyWolf-Wordmark auf Lobby + Beamer-Idle-Animation** (2 d, +0,3)
3. **Loading-State Spinner + Empty-State Fallbacks** (2 d, +0,2)
4. **Moderator-Seite Mobile-Responsive** (iPad-Modus) (3 d, +0,3)
5. **Pub-Owner-Onboarding-Wizard + Setup-Checkliste** (4 d, +0,4)
6. **Beamer-Lesbarkeit-Audit** live im Pub (1 d, +0,2)

→ Sprint 2: **7,6 → 8,6**

**Sprint 3 (Tag 61-90) — „Premium-Push"**
1. **Winning-Reveal-Drama** (Gold-Glow + Konfetti dezent) (3 d, +0,2)
2. **Host-PDF-Kit erweitert** (Setup + Troubleshooting DE/EN) (2 d, +0,2)
3. **Landscape-Mode** Team-Phone (2 d, +0,15)
4. **Sample-Draft-Naming + Partner-Branding** (Pub-Logo) (2 d, +0,25)
5. **Draft-Sharing via QR** zwischen Pub-Besitzern (3 d, +0,2)
6. **Post-Game-Umfrage + Extended Leaderboard** (2 d, +0,15)
7. **Render-Wakeup-Messaging** (Health-Check) (1 d, +0,1)

→ Sprint 3: **8,6 → 8,4-8,9** (abhängig von Execution-Qualität)

### 💎 Shopfenster-Moment (das EINE Element für sofort +0,5)

**Countdown-Puls-Sequenz mit Sound-Sting** in den letzten 3 Sekunden:
```
03 → BG blinkt rot/orange (2x/s)
02 → schneller Puls
01 → aggressive Rot-Pulse + 100ms Beep
00 → Gold-Flash + Reveal-Sting (autoritär, nicht laut)
```
2-3 Tage Aufwand, hebt die Wahrnehmung um +0,5 Punkte sofort. Pub-Owner erkennt **„das ist qualitativ"**.

### 🎲 Big Bets (riskant, aber game-changing)

1. **AI-Frage-Generator** via Claude API — Pub-Owner gibt Thema, kriegt 5 Fragen (5-7 d, +0,5 Markt)
2. **Community-Draft-Marketplace** (Open-Source-Drafts) — Network-Effect (8-10 d, +0,4 Markt)
3. **Live-Beamer-Remote-Clicker** (Phone als Mod-Presenter) (6 d, +0,3 Visual+Markt)

### ❌ Was NICHT machen (Solo-Dev-Fallen)

1. **Custom-Avatar-Upload-Engine** — 8-10 Tage Aufwand, +0,2 Score. **Skip.** Emoji-Avatare reichen.
2. **Sentry/Plausible-Analytics jetzt** — du bist live im Pub, brauchst keine Telemetrie. Später bei 50+ Instanzen.
3. **Gouache-Stil-Migration 100%** — 15-20 Tage, +0,3 Score. **Skip.** Liegt richtig auf Eis.

### 📌 Execution-Tipps

- **Tag 1-5:** das Shopfenster bauen (Timer-Drama + Schrift). Tag-5-Demo für Wolf-Freunde
- **Library ist der größte Hebel** — outsource aggressiv (Fiverr €100-150 für 100+ Fragen, Wolf editiert)
- **Monatlich 1 Pub-Test** (Tag 30, 60, 90) — bestes Feedback + PR
- **Plan ist Leitfaden, nicht Dogma** — wenn Pub-Owner Draft-Sharing mehr feiern als Library, Reihenfolge tauschen

**TL;DR:** Sprint 1 = Wow-Momente, Sprint 2 = Library-Grundstein, Sprint 3 = Polish. Library + Sound + Schrift + Dramatik sind die schnellen Wins. **6,8 → 8,4 ist machbar** ohne Burnout.

---

## Umgesetzte Fixes (Commits)

| Commit | Beschreibung |
|---|---|
| `8446e858` | UI-Audit P0: Focus-Outlines, IdentityBanner responsive, Mobile-Tap-Feedback, Tokens-Datei |
| `6ae19aad` | UI-Audit P1: Border-Radius / Alpha / Letter-Spacing / Font-Weight Tokens-Konsolidierung (~580 Stellen) |

## Offen / Nächster Pass

### Aus Audit 1 (P2)
- Loading-Screen Spinner-Animation
- `prefers-reduced-motion` differenzierter (nicht alles auf 0.01ms)
- Empty-States für leere Container (Winner-Chip etc.)

### Aus Audit 2 (Animation)
- 6 kritische Easing/Stagger-Inkonsistenzen (siehe Tabelle oben)
- `EASING` + `STAGGER` Tokens in `qqDesignTokens.ts`
- Phase-Sync auf `qrScanBreath`/`qrGlow`

### Aus Audit 3 (Marktreife)
- Beamer-Schrift +20% Audit
- Frage-Library aufbauen
- Sound-Lizenz organisieren
- Optional: Corporate/Education-Theme (heller)

---

## Design-Tokens-System

Datei: `frontend/src/qqDesignTokens.ts`

| Token | Werte | Status |
|---|---|---|
| `RADII` | `tight=8 / normal=16 / rounded=24 / pill=999` | ✅ angewendet |
| `ALPHA_DEPTH` | `d1=33 / d2=55 / d3=88` | ✅ teilweise |
| `LETTER_SPACING` | `tight=0.04em / wide=0.1em` | ✅ angewendet |
| `WEIGHT` | `bold=700 / extraBold=900` | ✅ angewendet |
| `DURATION` | `fast=150 / normal=300 / slow=600` | 🟡 dokumentiert, noch nicht genutzt |
| `TEXT_COLOR` | 4-Stufen-Hierarchie | 🟡 dokumentiert |
| `ACCENT_GOLD` | bright/warm/light/deep | 🟡 dokumentiert |
| `EASING` | bounce/smooth/inOut | 🟡 zu erweitern (siehe Audit 2) |
| `TAP_TARGET` | min=44 / cozy=48 | 🟡 dokumentiert |

---

*Diese Datei ist das zentrale Polish-Logbuch. Bei nächstem Audit hier ergänzen, nicht überschreiben.*
