# CozyQuiz — TODO (Single Source of Truth)

> **Regel (gegen Stale-Listen):** Diese Datei listet **nur genuin offene** Punkte.
> Erledigt → im **selben Commit hier löschen** (die Git-History ist der Beleg, dass
> es das Todo mal gab). `SESSION_LOG.md` ist reines **Verlaufsprotokoll**, KEIN
> Tracker. README/ROADMAP nur grobe Blöcke, keine Einzel-Todos.
>
> **Gruppiert nach WER BLOCKIERT** — nicht nach Datum. Neue Punkte in den passenden
> Block, nicht unten anhängen. Kein Handoff-Stapeln mehr.
>
> **Destilliert 2026-07-17:** 569 → ~150 Zeilen. Erledigtes + 8 abgearbeitete Specs raus
> (`docs/archive/`), Handoffs vom 22.6./23.6./25.6./5.7./12.7./15.7./16.7. zusammengeführt.
> Grund: die echten offenen Punkte ertranken in 550 Zeilen Vergangenheit → wir haben
> zweimal an denselben Fixes gesessen. Details der Erledigten: `git log`.

---

## 🎯 TAGESZIEL + ROADMAP (Wolf 2026-07-19)
> **Nordstern:** beide Modi (CozyQuiz + CozyArena/Colosseum) **vollständig spielbar**.
1. **HEUTE:** CozyArena/Colosseum so weit fertig, dass es **spielbar** ist.
2. **Danach:** CozyQuiz vs CozyArena vergleichen → bessere **Views** (nicht Designs) aus
   Arena in CozyQuiz übernehmen (z.B. bestimmte Reveal-Seiten).
3. **Danach:** alle Modi eigenständig je **einmal komplett testen**.

**✅ ERLEDIGT heute (2026-07-19, alles auf `main` + deployt):**
- **Turm-Finale V2 (Grid) LIVE geschaltet** — 4-Datei-Umbau (award-Kind raus, Beat-Modell),
  am echten /beamer validiert (Screenshots `design-vorschau/finale-v2-live/`), 29 Vitest grün.
- **Finale-Score Bet-Doppelzählung gefixt** — Bet-Bonus zählte doppelt (Stamps in `largestConnected`
  + `totalBonus`), Sieger-kippbar. Empirisch bewiesen (`dev/dumpScore`-Probe rot→grün) + Regressions-Test.
- **„Einen Schritt zurück" repariert** — Shift+Space/Backspace/Button routen jetzt korrekt (Fund 1+2).
- **Tier-1 Kolosseum-Medaillons verdrahtet** (`/icons/cat-*.png`) → **Design-Freeze-Meilenstein**.
- **3 Finish-Audits** (Gap/Crash-Risk/Moderator) — beide Modi funktional durchspielbar, kein harter Blocker.
- **Item-4-Entscheidungen geklärt** — nur Backend-Refactor bleibt offen.

**Aktueller Fokus / offen:**
- [ ] **CozyWölfe-Set — v2-Cutout auf main mergen** (wartet auf Wolf-„passt"). Set 'cozyWolves' (8 Wölfe
      Mika/Nuri/Ari/Ylva/Jori/Levin/Maja/Rurik, Slot-farbig, open+blink) IST verdrahtet; **v1 ist live auf
      main**, **v2** (Boden-Fade + Corner-Flood-Fill gegen harten Schnitt/Flecken) liegt auf Feature-Branch
      `design/material-pass-standings-bar` (1 Commit vor main). Vorschau `design-vorschau/cozywolves-*.png`.
- [ ] **Backend-Refactor qqDistanceScore** (Wolf-OK: nach den Assets) — Drift-Killer. SCOPE geklärt:
      `schaetzchenRangeAbs` ist schon shared; echter Drift = nur die 2 fast identischen Schätzchen/Schwarm-
      Blöcke in `qqMegaEventScore` (`rangeAbs×K; nearScore(dist,maxErr); isHit=dist≤rangeAbs`) → in shared
      `qqDistanceScore(dist,rangeAbs,K)` ziehen. Low-Risk, `test:scoring` gatet + Vorher/Nachher.
- [ ] **Tagesziel: CozyArena + CozyQuiz je einmal komplett am Beamer durchspielen** (deckt die Beamer-Checks
      unten mit ab: Medaillons im Runden-Intro, Wölfe im Set-Picker `/team`, Finale-Scores, Siegerehrung).

> Setup/Moderator-Konsolidierung (Wizard, Cockpit-Fold, Test-Modus-Toggle, Konsolidierung) ist
> **durch** — Details in der Git-History (`109e8d35`, `e188223f`, `ddd33688`, `f16b2e1b`, `a43579ba`).

---

## 🔴 WARTET AUF WOLF — Beamer-Check (hart neuladen: Strg+Shift+R!)

> ⚠️ **Test-Gate:** Beamer **UND** Moderator hart neuladen, **Autoplay AUS** (sonst drückt
> Autoplay den Mod-Pacing-Space selbst). Eine frühere Screenshot-Runde lief auf ALTEM
> Frontend → wir haben Geister gejagt. Bitte erst reloaden, dann knipsen.

Gebaut, typecheck-grün, aber **nie am Projektor gesehen**. Nach dem Check: Punkt hier löschen
oder Nachdreh-Wunsch dranschreiben.

- [ ] **Siegerehrung/Krönung** (größter neuer Block) — Roulette-Timing + Blink-Tempo · Treppchen
      sitzt (KEINE Scrollbar) · 8-Banner-Zeile passt · Award-Banner-Entrollung überlappt die
      Stat-Zeile nicht · Award-Stat-Texte DE/EN · Streamdeck Weiter/Zurück durch die Beats.
- [ ] **Schätzchen v4 „nur Strahl"** — Zwei-Lane überlappungsfrei bei 8 Fraktionen mit engen
      Tipps? Falls nicht: `spread` MIN (12%) / Wappen-Größe nachdrehen.
- [ ] **MUCHO** — 2×2 → 4-Reihen-Morph smooth, kein Overflow? · Farb-Balken-Segmente aus der
      Distanz lesbar bei 8 Fraktionen? (falls Matsch → „bild 4"-Umbau unten greift eh)
- [ ] **Kategorie-Intro-Farben** — jede Kategorie in ihrer Eigenfarbe, NUR Progress-Tree pink?
- [ ] **Arena-Nudges** (Konstanten, nur am Projektor justierbar):
      `BANNER_ANCHORS` (Wappen deckungsgleich auf dem gemalten Banner?) ·
      `ARENA_BG_FOCUS` (`rundenintro: 'center 66% / 116%'`) ·
      `FACE_MASK`-Ellipse am Magier-Wolf (sitzt sie aufs Gesicht?)
- [ ] **Arena-Meister-Splash + Rules-Redesign** — Pacing/Titel ok?
- [ ] **Toggle „Schlicht"** wirklich überall sauber (Beamer/Lobby/Welcome-Overlay)?
- [ ] **Scoring/Standings auf der Tafel** (17.7. neu gebaut) — Überschriften sind raus, BG ist
      auf 110% gezoomt und der Inhalt sitzt in der **ausgemessenen** Tafel (Pixel-Scan von
      `standing.webp`, nicht mehr geschätzt). Sitzt es am echten Projektor? Bleibt der
      Edelstein-Zapfen oben mittig frei? ⚠️ Falls nachdrehen: `ARENA_BG_FOCUS['standing']`
      (ArenaBeamerBg) und `MEGA_BOARD` (CozyQuizLargeGroupView) gehören **zusammen**.
- [ ] **bild 4 — Wappen-Wahltafel** (17.7. gebaut) — passen 8 Fraktions-Wappen mit Zahl-Badge
      in eine Zeile (54% Breite)? Falls zu eng: `avatarSz`/`gap` in `MegaOptionCrests`.
- [ ] **Kontrast am echten Beamer** — „Wing It" (Blau) + „Objection" (Pink) auf Dunkel.
- [ ] **Lobby bei 40 Handys** — kein Scroll am Projektor.
- [ ] **Design-Audit-Fixes** (Kontrast/Touch-44px/reduced-motion) auch im **klassischen**
      CozyQuiz gegenchecken, nicht nur Arena.

**🟡 Judgment-Calls (nur du kannst entscheiden, ob's stört):** Schätzchen-Antwort in Gold
(wirkt bewusst?) · CHEESE-Kategorie-Titel violett (= Kategorie-Eigenfarbe) ·
Fraktionsnamen-Ellipsis → Wrap (Risiko fürs arena-main-Layout).

## 🔴 WARTET AUF WOLF — Assets

- [ ] **8× Breitbild-Award-BGs** `frontend/public/arena-bg/award-<slug>.webp` (16:9).
      Drop-in steht (Layer über `faction-<slug>.webp`-Fallback in `MegaAwardBeat`) → greifen
      automatisch sobald da. Slugs: `bauchgefuehl` `glueckstreffer` `feierabend` `letztesekunde`
      `allwissen` `improvisation` `einspruch` `risiko`.
      ⚠️ Wolfs VS Code verarbeitet zu große Bilder nicht → selbst optimieren (max ~2 MB, sonst
      bricht der Workbox-Precache den Build).
- [ ] **„am schnellsten"-Icon** — ersetzt den ⚡-Platzhalter beim Guess-Sieger (nur bei Punkte-
      Gleichstand sichtbar). Drop-in: TODO-Slot im Reveal wartet auf dein Icon.

## 🔴 WARTET AUF WOLF — Entscheidungen

- ✅ **Backend-Refactor `qqDistanceScore` GEBAUT (2026-07-19):** `qqMegaEventScore`-Distanzzweige
      (SCHAETZCHEN + Schwarm) auf einen `scoreDistanceCat`-Helfer gezogen (Drift-Killer). Selfcheck
      10/10, tsc clean, vitest 49/49. Liegt auf Branch `design/material-pass-standings-bar` (`3ecf264b`),
      geht mit den neuen Wölfen zusammen auf main (Redeploy dann).
- Erledigt/verworfen 2026-07-19 (Wolf): MUCHO-Delight-Hebel = **verworfen** (vergessen + Design-Freeze,
  bleibt wie's ist) · Fraktions-Namen unter Wappen = **nein** (nur Wappen+Anzahl, so gebaut) ·
  arena-main-Video aufs Welcome-Overlay = **durch/moot**.
- **Standing-Note (keine Entscheidung):** Wolf-Sprechblase im Logo ist oval — vor jeder Logo-Änderung fragen.

## 🟠 WARTET AUF MICH — Build

**Moderator-View (offener Rest — Cockpit/Setup-Wizard + Back-Fix Fund 1+2 + Finale-Score-Fund 4 sind durch, s. Git):**
- [ ] **Back Fund 3 — Phasen-Snapshot (struktureller Ausbau):** `qqRooms.ts:7060 qqGoBackSlide` deckt nur
      5 Phasen ab (nur Sub-Step-Dekrement); `canBack` (`QQModeratorPage:2001`) auch. Kein Snapshot →
      Back kann eine versehentliche PHASEN-Weiterschaltung (Space zu früh → Frage aktiv/Placement/Bets
      zu) nicht heilen. Leichten Snapshot-Stack pro Phasen-Transition + Restore bei Sub-Step 0. Auch
      GAME_OVER-Zeremonie an Back koppeln (`qqAwardStep {dir:-1}`) + 400ms-Bounce-Guard für qqGoBackSlide.
- [ ] **SPACE-Hints angleichen** — Tooltip `:2017` + Hilfe-Panel `:6095` sagen „Shift+Space/Backspace =
      zurück"; das STIMMT jetzt (Fund 1+2 gefixt), aber Text/Konsistenz gegenchecken. `Strg+Z` (`:1703`)
      ist korrekt. (Fund 3 = echtes phasenübergreifendes Undo bleibt separat.)
- [ ] **„Runde 1 / Frage 1 von 5" darstellen** — im Cockpit schlanke Pills; ggf. Kolosseum-Gems auch hier
      (Tier-1-Medaillons sind jetzt da → unblockt).

**Audit-Funde 2026-07-19 (3 Finish-Audits — beide Modi sind funktional durchspielbar, kein harter Blocker):**
- [ ] **Endstand-Beat Höhen-Cap** — `CozyQuizLargeGroupView.tsx:931-953` nutzt feste `62px`/Zeile OHNE
      Cap (anders als `CumulativeStandings:266` mit `MEGA_BOARD_H`). Bei 8 Fraktionen + Hero (~360px)
      ≈ 950px auf 990er-Bühne → knapp/Clipping-Risiko bei langen Fraktionsnamen. Am Beamer prüfen, ggf. Cap.
- [ ] *(schmal)* **COZY_GAME-Blank** — `QQBeamerPage.tsx:2075` zeigt bei `phase===COZY_GAME` aber
      `cozyGame===null` (Reconnect/Cancel-Transient) leeren Beamer, kein Fallback. Nur wenn CozyGame genutzt.
- Bestätigt SAUBER: Arena-Pfad bucketet überall korrekt auf 8 Fraktionen (kein Roh-40-Overflow), EN-Fallback
  durchgängig, deaktivierte Landminen (Bluff/OnlyConnect/Final-Wager/Comeback) sind in Arena hart gegated.

**Font & Menü (Wolf 19.7.):**
- [ ] **Kolosseum-Font Phase 2** — „Schlicht = überall schlicht" (Wolf-Wahl): Siegerehrung/Krönung +
      Standings sollen dem Schlicht-Schalter folgen (**alte Wappen + alte Font + alter BG**, Motion
      gleich). ⚠️ Zeremonie hat EIGENE, immer sichtbare Kolosseum-BGs (`award-<slug>.webp`/
      `epic-moment.webp`) die `arenaBackgrounds` NICHT respektieren → BG **und** Font zusammen gaten
      (via `qqArenaType`), sonst Nunito auf Kolosseum-BG. **Wolf schaut Siegerehrung-in-Schlicht SELBST
      an.** Phase 1 (In-Game-Font-Gate) ist durch (`e936fc70`). Details Memory `project_design_motion_elevation`.
**Screens-1707-Batch — KOMPLETT durch:** bild 4 ✅, 9 ✅, 11 ✅, 12 ✅, 13 ✅, 14 ✅, 15 ✅,
16 ✅ (Thanks-Page Arena-Glas, Regel `qqArenaGlass()`), 17 ✅ (Summary Kolosseum-BG Sieger-Fraktion +
Wappen), bild 10 ✅ (2/3-Ansicht = `QQGemFill`-Diamant füllt in Kategorie-Farbe, Wolfs 3. Variante statt
Pips/Balken — im Code aktiv, Wolf 19.7. bestätigt entschieden). Details in Memory `project_screens_1707_batch`.

**Kolosseum-Kohärenz (Wolf 18.7.):** ✅ **Tier 1 FERTIG (2026-07-19):** Wolfs 5 Kategorie-Medaillons
(Stein+Gold, römisch) per Corner-Flood-Fill freigestellt + in `/icons/cat-*.png` verdrahtet (ersetzen
cozy3d). Vorschau `design-vorschau/tier1-medaillons-cutout.png`. **→ Design-FREEZE erreicht** → Fokus
Event-Funktion + Akquise. Tier 2-4 + folgende Punkte = „spaeter/optional", NICHT jetzt bauen.
⚠️ Am echten Beamer im Runden-Intro gegensehen (Blend auf Kolosseum-BG). Details Memory `project_design_motion_elevation`.
- [ ] *(spaeter/optional, nach Freeze)* Progress-Tree Diamanten/Gems statt Kreise (koppelt an Tier-1-Assets).
- [ ] *(spaeter/optional, nach Freeze)* Verzierte Rahmen für Windows + Frage-Karten.

**🐛 Winner-Value-Bugs in Guess-Reveals:** alle gefixt + verifiziert (`3f5e8338`, `f4d84116`,
`8cf728b5`, `209a83d4`, `a238696c`). Offener Rest = nur ein Asset (unten): das „⚡"-Platzhalter-Icon.

---

## 🎯 CozyArena LIVE-EVENT (~Anfang Aug 2026) — HÖCHSTE PRIO

**Kontext:** Erstes Event mit echten Geräten. Firma lädt ein, 50–100 Leute (theoret. bis 200),
Tech- + UX-Publikum (kritisch!), komplett **Englisch**, kostenloses Testevent, **Wolf moderiert
solo**. 3–4 Leute pro Handy → ~25–40 Handys/Teams.

**🔒 Gelockt:** Fraktions-Soft-Cap (`ceil(Teams/8)`) + freie Wahl · Team-Cap 40
(`QQ_MAX_TEAMS_LARGE`) · 3-vs-4-pro-Handy = Vor-Ort-Ansage, kein Code · Raum auf EN → Handy +
Beamer + Fraktionen komplett EN (Mod-Konsole bleibt DE).

**Server ist NICHT der Flaschenhals** (Lasttest `backend/scripts/loadtest-arena.mjs`: 40/40 Joins,
Broadcast-Fan-out 33 ms, Payload 15,3 KB) → Broadcast-Throttle vorerst nicht nötig.

- [ ] **Kompletter Trockenlauf** mit mehreren echten Geräten, voller Durchlauf, EN. ← der große
      Brocken, deckt die meisten Punkte unten mit ab.
- [ ] **Setup-Flow am echten Gerät** in EN durchklicken (Fraktion wählen → beitreten).
- [ ] **Venue-WLAN-Latenz + in-Frage-Payload** gegenprüfen. Bei Lag: Broadcast drosseln/Delta.
- [ ] **Fraktions-Soft-Cap live validieren** im 40-Geräte-Lauf (Backend-Safety-Net ist gebaut).
- [ ] **EN-Content-Verify:** Event-Draft Frage für Frage — jedes `textEn/answerEn/optionsEn/unitEn`
      gefüllt? Leere Felder fallen still auf DE zurück. **Kommt erst wenn du den Event-Draft machst.**
- [ ] **Stechen-Trockentest** beide Modi (normal + Arena) + Auto-Reveal-Timer. Fummelig ist nur,
      künstlich einen Gleichstand herzustellen.
- [ ] **Wertungs-Tuning am Trockenlauf:** Finale = „letzte Phase" richtig? · Nähe-Kurve K=3 /
      Map-Cap 25° am echten Content justieren.
- [ ] **Progressives Fraktions-Öffnen** entscheiden (nur falls die Bars bei wenig Andrang dünn wirken).

**🧨 Schlafende Landminen** (deaktivierte Features, kein Live-Risiko — NICHT jetzt fixen): falls
Bluff/OnlyConnect je reaktiviert werden → `Bluff.tsx:511/640` + `OnlyConnectBeamerView.tsx:321`
iterieren rohe `s.teams` (40 statt 8 Fraktionen → Overflow); ebenso Final-Wager/Comeback in Arena.
Vor Reaktivierung Fraktions-Bucketing (`isMega`/`qqFactionBuckets`) ergänzen.

**Showdown Phase 2b (episch, bewusst droppbar):** Showdown-Zone (Top-Gruppe leuchtet durchgehend) ·
Cut-Moment (Wolf-Ansage + Awards-Feier, Akt 2) · Showdown-Look (dunkle Bühne/Spotlight im Finale) ·
persönliche Handy-Anzeige `/team` bei Distanz („Du: 96!"). Design-sensibel → eigener Pass.
Phase 1 + 2a + Finale-Banner shippen allein.

> 🎨 **Reveal-DESIGN macht Wolf selbst in Claude Design.** KI-seitiger Reveal-Rethink ist
> **gestrichen** — nicht bauen, nicht brainstormen. Wir setzen nur gelieferte Designs um.
> Backend-Wertung bleibt unsere Domäne (fertig, `test:scoring` ist Build-Gate).

---

## 🐛 GEPARKT — Bugs ohne Repro (kein Fix ohne Snapshot!)

Beim nächsten Live-Vorkommen DevTools-Network `qq:stateUpdate`-Payload ziehen. Blind fixen hat
hier schon Layout-Regressionen gekostet.

- **Team-Color rot↔blau-Swap am Final-Start** — `teams[i].color` vor/nach Final-Start vergleichen.
- **Joker-Re-Detection nach Steal-Roundtrip** — `state.grid[r][c]` der 4 markierten Cells
  (`ownerId`/`jokerFormed`/`jokerCounted`/`stuck`) + `teamPhaseStats[teamId]`. Fix-Optionen:
  (a) `cells.every(...)` statt `some(...)` in `qqBfs.ts:122+` detectNewJokers, oder
  (b) `jokerCounted` bei Steal NICHT resetten. Auch `qqRooms.ts` handleJokerDetection.
- **/team Joker-False-Positive** — Pragma-Patch drin (`myJokersThisPhase > 0`-Gate). Falls
  nochmal: Payload mit `pendingAction`/`placementsLeft`/`teamPhaseStats`.
- **Beamer-Clipping bei 10+ NICHT-genesteten Teams** (kein Scroll, nur Clipping am Stage-Rand):
  `CozyQuizLargeGroupView` CumulativeStandings (10×88px ≈ 970px an der 990er-Kante) +
  `CozyQuizGameOverView` Normal-Recap (`cols=1` ohne Höhen-Cap). 3-4er-Teams unkritisch,
  genestete Arena (8 Fraktionen) sicher. Erst mit genau 10+ echten Teams prüfen.

**Braucht echtes Gerät:** Tastatur verdeckt Eingabefeld auf kleinen Phones (iPhone SE).
Fix-Kandidat `scrollIntoView({block:'center'})` nach Fokus — ⚠️ `preventScroll:true` wurde bewusst
gegen Header-Springen gesetzt, also erst am Gerät testen.

## ⏸ BEWUSST DEFERRED (mit Grund — nicht vergessen, aber nicht blind bauen)

- **Round-Intro-Balance** — tief mit dem Journey-Zoom-Kamerasystem verzahnt (Bug-Hotspot), hohes
  Bruchrisiko; „oben-lastig" ist evtl. nur ein Transition-Frame. Erst am echten Lauf prüfen, ob's
  überhaupt stört.
- **Reflow-Audit Frage-View** (Timer/Badges) — nur falls der CHEESE-Shift nach dem Fix bleibt.
- **Streamdeck-Action-Toast** bei Hotkey-Press — optional, geringer Mehrwert (F13–F19 + Bounce-Locks
  sind verdrahtet, Skip-Toast existiert).
- **Mikro-Polish** (Animation-Easings · Layout-Cap-Bumps · justifyContent-Lücken) — spekulative
  Audit-Notizen, **Zeilennummern veraltet**. Nur anfassen wenn du die Stelle konkret bemängelst,
  vorher re-grepen.

## 🌐 BLOCKIERT / EXTERN (kein Code-Task hier)

- **ThanksView „Nächstes Event"-Block** — wartet auf den cozywolf.de-Buchungsflow. Layout-Skelett
  vorbereitet (`QQBeamerPage.tsx` ThanksView, Suchwort „LINKS: Platzhalter").
- **cozywolf.de Impressum/Datenschutz** ergänzen (App-seitig live). Siehe `COZYWOLF_LANDING.md`.

---

## 🎨 LANGLÄUFER

**Design-Sweep + 1000h-Schlussstrich** → [`DESIGN_SWEEP.md`](DESIGN_SWEEP.md): der einmalige
Design-Durchlauf (Beamer+Team, 21 Stationen, vorne→hinten), danach **Design eingefroren → nur noch
Funktionalität**. Arbeitszeit ~895/1000 h über alle 3 Repos, noch ~105 h. Nach `21/21` keine
Geschmacks-Politur mehr vorschlagen.

**Danach:** UX-Delight- & Motion-Elevation-Pass („Boden fertig, dann Delight"), Screen für Screen,
Wolf im Loop, via `animate` + `ui-ux-pro-max` + `web-design-guidelines`.

**Theme-/Skin-System** — **Studio Mono** ist live durchgeklickt + poliert (Shape-Tokens, Quiet-Motion,
Cheese-Mono-Redesign, Summary skin-aware). Offen:
- [ ] **SoftPop + Neo-Brutal** noch NIE am Live-Screen durchgesehen — kommen laut Wolf **erst wenn
      Mono perfekt** (Mono hat Prio, am ehesten für Corporate).
- [ ] **Augen-Review am Screen** (kein Code): Comeback-View in Mono + Summary-Mono eckig/Hard-Shadow.
- [ ] **Entscheidung offen:** Theme-Resolver-Fundament bauen (`resolveTheme` → ein `ResolvedTheme`,
      `getBrandColors` wird dünner Wrapper, Eurovision = nur ein Preset)? Wenn ja: welche
      Event-Themes zuerst? ⚠️ Ehrliche Kosten: Fundament ~½ Tag, „einheitlich über ALLE Pages" ist
      Langschwanz (~124× hardcoded `#ec4899` + Inline-Brand-Werte) → **graduell**, kein
      Wochenend-Projekt. Mass-Replace ist ausdrücklich verworfen (`qqDesignTokens` sagt das selbst).

**Marketing-Seiten** (`/about` A4-One-Pager mit PDF-Download, `/trailer` 9:16) sind live. Optional:
`/about` 1-Seiten-Fit am Druck verifizieren · MediaRecorder→WebM-Download im Trailer ·
Trailer-Tempo nach Review. ⚠️ Bei Mechanik-Änderungen **beide Seiten mitziehen** (Inhalt ist aus
den Regeln abgeleitet).

---

*Erledigte Punkte stehen in der Git-History (`git log --oneline`), nicht hier.
Abgearbeitete Specs/Audits/Handoffs liegen in [`docs/archive/`](docs/archive/).*
