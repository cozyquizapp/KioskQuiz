# CozyQuiz — TODO (Single Source of Truth)

> **Regel (gegen Stale-Listen):** Diese Datei listet **nur genuin offene** Punkte.
> Erledigt → im **selben Commit hier löschen** (die Git-History ist der Beleg, dass
> es das Todo mal gab). `SESSION_LOG.md` ist reines **Verlaufsprotokoll**, KEIN
> Tracker. README/ROADMAP nur grobe Blöcke, keine Einzel-Todos.
>
> **Reconciliation 2026-06-22** (gegen Code + Git verifiziert): Der Großteil der
> alten „Offen"-Liste war längst erledigt — entfernt. Verifiziert **erledigt** u.a.:
> Summary-Link-Stale-Bug (`/summary/by-id/:gameId` live), Impressum/Datenschutz,
> `hallo@cozywolf.de`-Konstante, Schätzchen-Range-Treffer (`schaetzchenRangeAbs` +
> Range-Winner in `evalSchaetzchen`), Autoplay decodeFinalStep-Shared, L1–L11.

---

## 🐛 Beobachten — Bugs ohne Repro (warten aufs nächste Auftreten)

Kein Fix ohne Snapshot — beim nächsten Live-Vorkommen DevTools-Network `qq:stateUpdate`-Payload ziehen.

- **Team-Color rot↔blau-Swap am Final-Start** — beim Auftreten `teams[i].color` vor/nach
  dem Final-Start vergleichen.
- **Joker-Re-Detection nach Steal-Roundtrip** (Wolf-Entscheid: erst snapshotten) —
  `state.grid[r][c]` für die 4 markierten Cells (`ownerId`/`jokerFormed`/`jokerCounted`/`stuck`)
  + `teamPhaseStats[teamId].jokersThisPhase/jokersEarned`. Fix-Optionen: (a) `cells.every(...)`
  statt `some(...)` in `qqBfs.ts` detectNewJokers, oder (b) `jokerCounted` bei Steal NICHT
  resetten. Files: `qqBfs.ts:122+`, `qqRooms.ts` handleJokerDetection.
- **/team Joker-False-Positive** — Pragma-Patch ist drin (`myJokersThisPhase > 0`-Gate). Wenn
  trotzdem nochmal: `state-update`-Payload mit `pendingAction`/`placementsLeft`/`teamPhaseStats`.

## 🌐 Blockiert / extern (kein Code-Task hier)

- **ThanksView „Nächstes Event"-Block** — wartet auf cozywolf.de-Buchungsflow. Layout-Skelett
  ist vorbereitet (`QQBeamerPage.tsx` ThanksView, Suchwort „LINKS: Platzhalter").
- **`hallo@cozywolf.de`** — Mail tatsächlich einrichten (Frontend-Konstante existiert bereits).
- **cozywolf.de Landing** — Impressum/Datenschutz dort ergänzen (App-seitig sind sie live).
  Siehe `COZYWOLF_LANDING.md`.

## 💬 Braucht Wolf-Input

- **EN-Casing-Audit** — Sentence- vs. Title-Case uneinheitlich (z.B. „Real answer" vs
  „Top 5 — Reveal"). Für gezielte Fixes Screenshots der konkreten Stellen nötig.
- **NBC-Phönix Auto-Translate-Quirk** — DeepL lässt Eigennamen manchmal unübersetzt.
  Aktuell: nach Auto-Translate manuell prüfen. Optional später: Eigennamen-Schutz im Translate-Flow.

## 🔧 Rest-Backlog (2026-06-22 gegen Code verifiziert)

Verifiziert **erledigt/obsolet** und daher entfernt: Host-Notes-Toast (jetzt default collapsed
in Frage-Phasen) · Teams-List Compact-View (Compact-Mode bei >5 Teams) · Show-Controls/
Settings (Mod-Cockpit-Compact + Live-Settings-Cleanup) · Shift+Space→QUESTION_ACTIVE-Sprung
(obsolet — Shift+Space ist jetzt „Slide zurück") · Treppchen-Confetti-Storm (durch Eurovision-
Finale-Redesign überholt) · **Autoplay-Failsafe für Custom-Pipelines** (kein echtes Todo:
HotPotato ist timer-getrieben — `qqArmHotPotatoTimer` Turn-Timeout + Pause/Resume + Validierungs-
Guard gegen Solo-Hang; OnlyConnect ist deaktiviert; nur Bluff braucht wegen manuellem Mod-Review
einen Watchdog, der existiert `_bluffReviewWatchdog`).

Genuin offen (alle niedrige Prio, live-test-getrieben):

- **Streamdeck-Action-Toast bei Hotkey-Press** — nicht umgesetzt; optional. Streamdeck ist
  sonst voll verdrahtet (F13–F19, Bounce-Locks), Skip-Toast existiert → geringer Mehrwert.
- **Mikro-Polish** (4 Animation-Easings · Layout-Cap-Bumps · justifyContent-Lücken) —
  speculative Audit-Notizen, Zeilennummern veraltet. Nur anfassen, wenn Wolf die Stelle
  konkret im Live-Test bemängelt; vor Fix re-grepen.

---

## 🎨 Theme-System (Skins je Location) — Foundation + Proof LIVE (2026-06-23)

**Update 2026-06-23 (Commit `03106c88`):** Wolf-Klarstellung — es geht NICHT um
Event-Kostüme (Weihnachten/Halloween), sondern um **subtile Grunddesigns je
Location/Setting** (Café · Bar · Corporate · Glass), per Klick umschaltbar.
Gebaut: `qqTheme.ts` (ResolvedTheme + QQ_THEMES cozy/glass + Runtime + `applyThemeVars`),
**Cozy↔Glass-Umschalter im `/showroom`** über den echten Beamer-Views.

**Wichtiger Befund (Commit `4d2acd1f`):** `getBrandColors` ist NICHT der breite
Chokepoint — die Views hardcoden Pink direkt (131× `#ec4899`, 391× `rgba(236,72,153)`).
→ Echte Foundation = **CSS-Custom-Properties** `--qq-accent*` (main.css :root, Default
= Pink = zero-visual-change). `applyThemeVars` schreibt die Skin-Akzente per Wechsel
auf `:root`. **3 Views migriert** (QuestionView/TeamsRevealView/GameOverView, 65 Stellen)
→ Showroom-Flip wechselt Frage/Reveal/Teams/Treppchen sichtbar Pink↔Indigo.

**Status: Mechanik bewiesen & von Wolf abgenommen, danach PAUSIERT (2026-06-23).**
Wiederaufnahme = reine Fleißarbeit mit demselben Muster:
- (1) **App-weit ausrollen**: restliche ~47 Dateien (inkl. Thanks/QQBeamerPage) per
  `#ec4899`→`var(--qq-accent)` / `rgba(236,72,153)`→`rgba(var(--qq-accent-rgb)` /
  `#a21247`→`var(--qq-accent-magenta)` / `#f472b6`→`var(--qq-accent-light)` migrieren.
  **VORSICHT:** vorher pro Datei prüfen, ob Pink an Canvas/Confetti/Farb-Mathe geht
  (dort kein `var()`!) — bei den 3 migrierten Views war es sauber Inline-CSS.
- (2) **Glass als echtes Skin**: frosted Flächen (cardBg/heroBorder als `surface`-Tokens
  schon in qqTheme definiert, aber noch nicht an Views verdrahtet) + kühler BG.
- (3) Die 4 Skins ausarbeiten: **Glass · Café/Kiosk · Bar/Night · Corporate**.
  (Café = Terracotta/Creme matt, Bar = Electric auf Schwarz+Glow, Corporate = Navy+1 Akzent.)
- (4) Theme-Picker für den Mod (pro Event wählen) + State-Persistenz.

---

## 🎨 Geplante Initiative: Theme-System generalisieren (Stand 2026-06-22, teils überholt)

**Ziel (Wolf):** Design pro **Event/Setting** umschaltbar — aber **komplett einheitlich**
über alle audience-facing Pages (Beamer · Team · Summary · Thanks · Showroom). Ein Theme
wählen → alles folgt. Moderator-Page bleibt neutral (Cockpit, kein Bühnenbild).

**Ist-Stand:** Skelett existiert, aber **3 konkurrierende Quellen** → nie vollständig:
1. `QQ_THEME_PRESETS` (`shared/quarterQuizTypes.ts:602`) — `default/dark/neon/retro/nature`
   (bg/card/accent). Theme fließt via `s.theme` schon zu Beamer+Team.
2. `getBrandColors(eurovisionMode)` (`QQBeamerPage.tsx:94`) — **binärer** Zweig (Eurovision
   vs. Default), liefert den Pink-Akzent in den meisten Views, liest aber **NICHT**
   `theme.accentColor`. → Eurovision und Preset sind getrennte Systeme.
3. **~124× hardcoded `#ec4899`** (+ weitere Inline-Brand-Werte) direkt in Views → reagieren
   auf gar kein Theme. (Grund für die Memory-Regel „Brand-Refresh — alle Pages mit-checken".)

**Plan:**
1. **Ein Resolver:** `resolveTheme(theme?)` → vollständiges `ResolvedTheme` (accent/accentRgb/
   accentSoft/gradient · bg · cardBg · font · **+ die `qqStyleTokens`** radius/shadow/spacing/
   motion · Kategorie-Palette · Ambient an/aus · Logo). `getBrandColors` wird dünner Wrapper
   darauf — **Eurovision = nur EIN Preset**, kein Sonderzweig. State-lose Seiten:
   `resolveTheme(undefined)` = Default.
2. **Alles liest daraus** — die ~124 Pinks + Inline-Brand-Werte page-by-page auf
   `theme.accentHex` etc. umstellen.
3. **Theme-Picker pro Event** — Presets zu sauberem Dropdown generalisieren.

**Kosten (ehrlich):** Fundament (Resolver + Eurovision-als-Preset + 1–2 neue volle Presets +
`getBrandColors` delegiert + 1 Fläche als Proof, am besten Showroom) = ~½ Tag. „Komplett
einheitlich über ALLE Pages" = Langschwanz, **graduell** migrieren (gezielter Sweep ODER beim
nächsten Anfassen, wie bei der Farb-Tokenisierung). Kein Wochenend-Projekt.

**Entscheidung offen:** Fundament bauen? Wenn ja: welche **Event-Themes zuerst** (Weihnachten /
Firmenfeier / Geburtstag / Halloween)? → die als erste echte Presets anlegen.

---

*Erledigte Punkte stehen in der Git-History (`git log --oneline`), nicht hier.*
