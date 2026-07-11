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

## 🎯 CozyArena LIVE-EVENT — HÖCHSTE PRIO (Ziel ~Anfang Aug 2026)

**Kontext:** Erstes CozyArena-Event mit **echten Geräten**. Firma lädt ein, **50–100 Leute**
(theoret. bis 200), **Tech + UX-Designer** (kritisches Publikum!), **komplett Englisch**,
**kostenloses Testevent**, **Wolf moderiert solo**. 3–4 Leute pro Handy → ~25–40 Handys/Teams.
Zeitachse: 3–4 Wochen ab 2026-07-10.

**🔒 Gelockte Entscheidungen (2026-07-10):**
- **Fraktions-Verteilung = A + Variante 1:** Server balanciert per **Soft-Cap pro Fraktion**
  (`ceil(Teams/8)`), aber **freie Wahl bleibt** — leerste Fraktion vorgeschlagen, volle gesperrt.
  (Behält Identitäts-Moment, garantiert faires Rennen, null Einlass-Orga für Solo-Host.)
- **Team-Cap 25 → 40** (`QQ_MAX_TEAMS_LARGE`, 5×8). Notbremse, keiner wird abgewiesen.
- **3 vs 4 pro Handy = Vor-Ort-Ansage**, kein Code. Wir last-testen auf volle 40.
- **Progressives Fraktions-Öffnen:** v1 NICHT, beim Trockenlauf entscheiden (nur Optik bei wenig Andrang).
- **Sprache = gelöst im Code:** Raum auf EN → Handy+Beamer+Fraktionen komplett EN. Mod-Konsole
  bleibt DE (Wolf moderiert). **Einziger echter Rest = Content:** EN erscheint nur bei gefüllten
  `*En`-Feldern.

**Audit-Befund (2 Explore-Agents, 2026-07-10):** Layout skaliert (Arena bündelt auf 8 Fraktions-
Balken, alles `overflow:hidden`, Join-Cap greift, keine Crash-Pfade). Echte Risiken = (1) Fraktions-
Balance ungesteuert, (2) per-answer Full-State-Broadcast bei vielen Geräten ungetestet.

### Woche 1 — De-risk
- [ ] **Fraktions-Soft-Cap + Auto-Balance.** Backend `qqRooms.ts:585-615` join-Validierung: pro-
      Fraktion-Cap `ceil(Teams/8)`. Frontend `QQTeamPage.tsx:470` (largeGroupMode `takenAvatarIds=[]`):
      leerste Fraktion vorschlagen, volle ausgrauen. Round-Robin-Logik existiert bisher NUR im Bot-Fill
      (`server.ts:9849-9873`) → auf echte Joins übertragen.
- [ ] **Lobby-Anzeige-Bugs:** „X/3"-Pille dynamisch statt hart `/3` (`CozyQuizLobbyView.tsx:795`) +
      Dot-Reihe deckeln gegen Overflow (`:818`).
- [ ] **Cap 25 → 40** (`quarterQuizTypes.ts:96`) + Bot-Fill 24 → 40 (`server.ts:9803`) + grep nach
      hartverdrahteten 24/25-Annahmen.
- [ ] **EN-Content-Verify:** Event-Draft Frage für Frage — jedes `textEn/answerEn/optionsEn/unitEn`
      gefüllt? Leere Felder fallen auf DE zurück. (Wolf sagt: EN-Fragen existieren → prüfen.)

### Woche 2 — Last & Join
- [ ] **40-Geräte-Lasttest** (Bots + echte Geräte). Broadcast-Latenz auf Venue-WLAN messen:
      jeder `qq:submitAnswer` → voller `buildQQStateUpdate` an alle (`qqSocketHandlers.ts:1676`,
      `qqRooms.ts:4630+`), kein Delta/Throttle. Rate-Limit 5/s verhindert Absturz, aber Latenz-Wildcard.
- [ ] Falls Lag: Broadcast drosseln/debouncen/Delta.
- [ ] **Join-Onboarding EN wasserdicht:** QR + Raumcode + „3–4 pro Handy" + eine klare Beitreten-Seite.

### Woche 3 — UX-Politur (Designer-Publikum)
- [ ] Microcopy-EN-Sweep Team + Beamer · Motion/Klarheit-Feinschliff.
- [ ] Lobby bei 40 Handys am echten Beamer prüfen (kein Scroll).

### Woche 4 — Puffer
- [ ] Kompletter Trockenlauf mit mehreren echten Geräten (voller Durchlauf, EN).
- [ ] **Coolify-Backend-Redeploy** (Cap, Faction-Balance, ggf. Broadcast-Throttle).
- [ ] Progressives Fraktions-Öffnen entscheiden (falls Bars dünn).

---

## ✅ Backend-Redeploy erledigt (2026-07-05)

Coolify-Redeploy durch, Backend gesund (health 200, db connected). Damit LIVE:
Security-Fixes (Feedback/Drafts-POST ohne PIN → 403 verifiziert), **Stechen**,
**Comeback-Auto-Skip**, Pitch-Demo-Draft, ältere Backend-Änderungen.

**Noch offen (Verhalten am Screen, kein Deploy):** Trockentest **Stechen** —
künstlichen Gleichstand herstellen ist der fummelige Teil; einmal beide Modi
(normal + Arena) durchspielen und Auto-Reveal-Timer prüfen.

## 🆕 Offene Follow-ups (2026-06-26)

**Team-View-Audit** (P0 + 2 billige P1 schon gefixt — Commit `f08414da`). Noch offen,
weil Geräte-Test / Verhaltensänderung nötig:
- **Tastatur verdeckt Eingabefeld** auf kleinen Phones (iPhone SE). Fix-Kandidat:
  `scrollIntoView({block:'center'})` nach Fokus — aber Vorsicht, `preventScroll:true`
  wurde bewusst gegen Header-Springen gesetzt. Erst am echten Gerät testen.
- **Disconnect-Flackern**: bei 1–2 s WLAN-Aussetzer springt der Spieler kurz zur
  Rejoin-Ansicht vor Auto-Rejoin. Fix: `joined` erst nach ~1,5 s zurücksetzen (QQTeamPage ~271).

**Brand-Farb-Sweep:** Amber/Gold taucht entgegen der Pink/Magenta-Marke wieder auf
(Landing-Page `QQLandingPage`, `FinalRecapHintCard` amber400). Bei Gelegenheit angleichen.

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
- **Beamer-Clipping bei 10+ NICHT-genesteten Teams** (Pre-Pitch-Audit 2026-07-05, kein Scroll,
  nur Clipping am Stage-Rand): `CozyQuizLargeGroupView` CumulativeStandings (10×88px ≈ 970px, an
  der 990er-Kante) + `CozyQuizGameOverView` Normal-Recap (`cols=1` ohne Höhen-Cap bei vielen
  Teams). 3-4er-Teams unkritisch; genestete Arena (8 Fraktionen) sicher. Am echten Screen mit
  genau 10+ echten Teams prüfen, dann ggf. Höhen-Cap/2-Spalten. Nicht blind fixen (Layout-Regress).

## 🌐 Blockiert / extern (kein Code-Task hier)

- **ThanksView „Nächstes Event"-Block** — wartet auf cozywolf.de-Buchungsflow. Layout-Skelett
  ist vorbereitet (`QQBeamerPage.tsx` ThanksView, Suchwort „LINKS: Platzhalter").
- **cozywolf.de Landing** — Impressum/Datenschutz dort ergänzen (App-seitig sind sie live).
  Siehe `COZYWOLF_LANDING.md`.

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

**STAND 2026-06-25 (Mono live-reviewed & poliert):** Über mehrere Sessions die ganze
`/beamer` in **Studio Mono** durchgeklickt + gefixt: Shape-Tokens (`--qq-card-radius` +
`--qq-pill-radius`, Mono pill=3px), alle Fenster/Cards/Badges eckig (inkl. systemischer
`cozyCard()`-Hebel), Farben skin-konform (kein Rest-Pink/unlesbarer Text), **Cheese-Mono-
Redesign** (solide weiße Cards statt dunkel-frosted), **Avatare bleiben bewusst RUND**
(Editorial-Kontrast, Wolf-Entscheid), **Quiet-Motion** (Mono = ruhig: Shockwave/Shimmer/
Title-Waves aus via `isQuietMotion()` + `data-quiet-motion`-CSS-Hebel). Volle Detail-Doku:
Memory `project-theme-skin-system`.

**Update 2026-06-25 (späte Session):** Weitere Mono-Fixes:
- **Regel-/Hero-Titel sichtbar:** Quiet-Motion-CSS killte per Substring-Match auch die
  Entrance-Animation (opacity:0→1) → Titel unsichtbar. Fix: Regel zusätzlich `opacity:1`
  erzwingen (main.css `data-quiet-motion`). Deckt Rules/Paused/Thanks/Beamer-Rules + phasePop.
- **Phase-Intro „Schau mal" / Kategorie-Intro** (beide Branches in CozyQuizPhaseIntroView)
  war un-gethemt → lila Titel/unsichtbarer Untertitel/rundes Window gefixt; **Progress-Tree-
  Discs bleiben RUND** (wie Avatare), Linie/Ring auf Accent.
- **Cheese:** ohne Bild weiße Card-Fläche statt dunkel-lila (Mono); „X/Y Teams"-Zähler als
  lesbarer Chip; Pink-Leak im schnellsten Zeit-Pill raus.
- **Ambient in Mono AUS** (Wolf-Entscheid): Fireflies (zentral in CozyQuizAmbient),
  Placement-Sweep, Paused-preGame Glow/Spotlight/Partikel — via `isQuietMotion()`. CozyWolf bleibt.
- **Summary skin-aware migriert:** Backend reicht `themeId` durch, `setActiveThemeId` beim
  Laden; `--sum-*`-Var-Rampe + theme-aware `summaryBrand` (Cozy byte-identisch). Offen als
  Polish: Mono-Ästhetik **eckig + Hard-Shadow** (Radius/Schatten noch rund/weich).

**NOCH OFFEN (gegen Code verifiziert 2026-06-25):**
- **SoftPop + Neo-Brutal** noch NICHT am Live-Screen durchgesehen — kommen lt. Wolf **erst wenn
  Mono perfekt** (Mono hat Prio, am ehesten für Corporate).
- **Augen-Review am Screen** (kein Code mehr): Comeback-View in Mono + Summary-Mono eckig/Hard-Shadow.
- Wolf-Sprechblase im Logo ist oval (vor Änderung fragen).

Verifiziert **erledigt** (raus): ~~Mod-Theme-Picker~~ (Skin im Setup pickbar, `room.themeId`
verdrahtet Beamer/Team/Summary) · ~~Comeback-Mono-Migration~~ (Code fertig) · ~~Summary-Mono
eckig+Hard-Shadow~~ (Commit `cd28323e`: sumR/sumPill/sumSh-Shape-Tokens, Avatare bewusst rund).

**Marketing-Seiten (2026-06-25, LIVE):** `/about` (A4-One-Pager, PNG/PDF-Download via
html2canvas+jsPDF) + `/trailer` (9:16 IG-Trailer). Doku: Memory `project-marketing-pages`.
Optionale Follow-ups: (a) `/about` 1-Seiten-Fit am Druck verifizieren, (b) optionaler
MediaRecorder→WebM-Download-Button im Trailer, (c) Trailer-Tempo/Tiere nach Wolf-Review.
**Wichtig:** Bei Mechanik-Änderungen beide Seiten mitziehen (Inhalt ist aus den Regeln abgeleitet).

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
