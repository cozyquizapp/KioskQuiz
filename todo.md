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

### ▶ AKTUELLER PLAN (2026-06-23) — 3 Skins, Beamer-only, Flagship zuerst

**Designziele festgelegt (Vorschau live auf `/skins`, `QQSkinsPage.tsx`):**
1. **Studio Mono** — editorial, heller BG (#F3F2EC), weiße Karten, 2px schwarzer Rand,
   6px Hard-Shadow, Lime-Akzent (#C9F227), Display-Bold. (markenneutral, Akzent=Kundenfarbe)
2. **Soft Pop** — warm-heller BG, bunte runde Pillen (Gelb/Rosé/Mint/Blau), weiche Schatten,
   keine Ränder, Konfetti, Nunito-Bold. (Team-Building/Schule)
3. **Neo-Brutalism** — lila Verlauf-BG, weiße Karten + 3px schwarzer Rand + 6px Hard-Shadow,
   Selected = Electric-Blau (#2D4BFF), eckige Badges, Sterne-Deko. (modern/bold)

**🔒 REGEL (Wolf, 2026-06-23 präzisiert): Endergebnis sieht VOM DESIGN aus wie die
`/skins`-Mockups** — Farben, Ränder, Schatten, Formen, Badges, Schrift, Deko voll übernehmen,
sonst „sehen sie gar nicht aus wie die Skins". NUR die **Positionen** bleiben ungefähr wie
heute (nicht zum Mockup-Layout umarrangieren). Also: volles Skin-Aussehen, kein Re-Arrangieren.
Technik: Treatment-Tokens + `isThemed()`-Switch (Cozy bleibt exakt) + Deko-Overlay (`SkinDeco`).
**Fortschritt QuestionView:** Text-Farben ✓ · Font ✓ · Haupt-Card-Treatment ✓ · Deko ✓ ·
Sub-Flächen/Overlays/Borders ✓ · Timer-Track ✓. Reveals (Schätzchen/Bluff/Order/Top5) ✓.

**🎯 ZIEL präzisiert (Wolf 2026-06-23): die GANZE `/beamer`-View in 4 Designs** (Cozy +
Studio Mono + Soft Pop + Neo-Brutalism) — **alle Phasen-Screens**, nicht nur die 3
Showroom-Szenen. Der `/showroom`-Umschalter ist NUR ein Vorschau-Tool; echtes Ziel = `/beamer`.
Noch zu migrieren (selbes Token+`isThemed`+`SkinDeco`-Muster): Lobby · Rules · PhaseIntro ·
Placement · Comeback · FinalReveal · GameOver(Treppchen) · Thanks · TeamsReveal · Summary ·
Paused + restliche Reveals (CozyGuessr/OnlyConnect) + QQBeamerPage-Rahmen/BG.

**🔀 SKIN-WAHL = beim Quiz-EINRICHTEN, nicht in-game** (Wolf): KEIN Ecken-Toggle im Spiel
(das ist nur der Showroom). Skin wird wie `avatarSetId` vorher im Mod-Setup gewählt →
`room.themeId` (Backend-State, Whitelist + Default 'cozy') → Broadcast → Beamer ruft
`applyThemeVars(resolveTheme(state.themeId))` bei jedem stateUpdate. Picker analog zum
bestehenden Avatar-Set-Picker (`qq:setAvatarSet` → neues `qq:setTheme`).

**Scope:** **Beamer-only** zuerst (Team-Handy später). **Start:** Flagship = **Frage + Reveal**
(`CozyQuizQuestionView.tsx`) end-to-end in allen 3 Skins, live beurteilen, dann restliche
~13 Screens (Lobby/Regeln/Phasen-Intro/Placement/Comeback/Finale/Treppchen/Thanks/Summary/…).

**Token-Architektur (CSS-Vars, main.css :root = cozy-Default = zero-visual-change):**
- Akzent (existiert schon): `--qq-accent · -rgb · -soft · -light · -magenta`
- NEU: `--qq-bg · --qq-text · --qq-text-muted · --qq-card-bg · --qq-card-border ·
  --qq-card-radius · --qq-card-shadow · --qq-font`
- **WICHTIG `--qq-card-text` getrennt von `--qq-text`:** Neo-Brutalism hat WEISSEN Text auf
  lila BG **und** DUNKLEN Text auf weißen Karten → ein einzelnes Text-Token reicht nicht.
- `applyThemeVars` (qqTheme.ts) schreibt den ganzen Satz auf :root beim Skin-Wechsel.

**⚠️ ALL-OR-NOTHING bei hellen Skins:** 2 von 3 Skins sind hell. In `CozyQuizQuestionView`
(3585 Z.) ~**44 helle Textfarben** (#fff/rgba(255)) + **62 slate** (#e2e8f0/#94a3b8…) +
**54 dunkle BG/Card** auf Tokens umstellen. Jede vergessene weiße Textstelle = unsichtbar auf
hell → der Flagship-Screen muss **vollständig** migriert sein, bevor man helle Skins zeigt.
Vorsicht (wie bei Pink): Farben, die an Canvas/Confetti/Farb-Mathe gehen, NICHT auf `var()`.

**Reihenfolge:** (1) Token-Fundament main.css + qqTheme (3 Skins voll spezifiziert).
(2) QuestionView komplett auf Tokens (Flagship). (3) Showroom-Umschalter auf die 3 Skins →
Wolf beurteilt am echten Screen. (4) restliche Screens nachziehen. (5) Mod-Theme-Picker +
Room-State-Feld + Broadcast (Per-Event-Wahl, Persistenz).

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
