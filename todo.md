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

**Aktueller Fokus (Wolf 2026-07-19):**
- [ ] **Turm-Finale V2 (Grid-Modus) — LIVE-WIRING scharfschalten** ← nächster Schritt.
      Design ✅ auf `main`, in der Vorschau voll abgenommen. Neues 2-Akt-Finale (Wolf-Idee):
      Top-3 bauen ANONYM (grau/?) → grosse Award-Zeremonie (je +1, **Underdog +2**) lässt Türme
      steigen mit **„⚖ Gleichstand!" / „▲ In Führung!"**-Kipp → Glide in die Mitte → 3-2-1 + Krone.
      Komponente `CozyQuizTowerFinaleV2.tsx`, Vorschau `/race-finale` Toggle „✨ V2 Auto" + „🎛 V2 Live".
      FERTIG: Hybrid-Live-Variante (`liveBeat`-gated, hält an jedem Beat auf Space), Mapping
      `buildTowerFinaleData(state)`, Scoring geprüft (Awards zählen via `endAwards`/`awardPoints`,
      Grid-Stamp-Platzierung raus ändert Sieger NICHT). Steuerung=**Hybrid**, Awards=**ganz in den Turm**.
      OFFEN (event-kritisch, **echter /beamer-Finale-Durchlauf Pflicht**): 4 Dateien —
      (1) `shared/qqFinalReveal.ts`: `award`-Kind raus, `race-final` bekommt `beat`, `maxStep`
          dynamisch (towerBeats = 1 Aufbau + Awards + 1 Glide + min(3,Teams) Reveals);
      (2) `backend/qqRooms.ts`: `qqFinalRevealPendingForStep` Award-Stamps raus (Bet bleibt),
          `qqFinalRevealMaxStep` mit towerBeats;
      (3) `CozyQuizFinalRevealView.tsx`: `award`-Karten-Rendering raus, `race-final` →
          `TowerFinaleV2(liveBeat=beat)` statt altem `TowerFinalSlide`;
      (4) `QQModeratorPage.tsx`: lokales `maxStep` (Z.1071) + FINAL_REVEAL-Autoplay-Timing (Z.1063+).
      🔴 BLOCKER Validierung: `shot-finale.mjs` (Standard-Spiel → `dev/skipTo final-reveal` → Autoplay)
      hängt an **stale Arena-Raum im RAM** (`default`, `roomCode=QQ_ROOM` fix) → Standard-Start feuert
      nicht. FIX: **lokaler Backend-Neustart Port 4000** leert RAM-Räume (Wolf hat OK gegeben).
- [ ] **Tagesziel: CozyArena einmal komplett durchspielen + Bugs fixen** (dann CozyQuiz vs Arena
      Views vergleichen → bessere Reveal-Seiten übernehmen, dann alle Modi einmal testen). ← LÄUFT.
- [ ] *(Idee, geparkt — Wolf zeichnet)* **CozyWölfe-Avatar-Set für CozyQuiz**: 8 Wölfe in den 8
      Slot-Farben, wählbar. Minimal 2 Frames/Wolf (Augen auf + Blinzeln) = plug-in wie cozy3d;
      „gut" = + Jubel-Frame (3×8 = 24 PNGs). Einheitlicher Wolf-Körper + Slot-Farb-Accessoire
      (Kontrast + Wiedererkennung), quadratisch/transparent, Blinzel-Frame augen-deckungsgleich.
      KEINE öffentliche Trauer-Pose (no-shaming). Set unabhängig vom Bühnen-Skin. Brainstorm: Chat 19.7.

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

- [ ] **Backend-Refactor freigeben:** `qqMegaEventScore`-Distanzzweige auf shared `qqDistanceScore`
      (beseitigt Drift-Risiko, braucht Redeploy). Angeboten, wartet auf OK. **Einzige noch offene
      Entscheidung** (Wolf 19.7.: „alle durch außer backend refactor").
- Erledigt/verworfen 2026-07-19 (Wolf): MUCHO-Delight-Hebel = **verworfen** (vergessen + Design-Freeze,
  bleibt wie's ist) · Fraktions-Namen unter Wappen = **nein** (nur Wappen+Anzahl, so gebaut) ·
  arena-main-Video aufs Welcome-Overlay = **durch/moot**.
- **Standing-Note (keine Entscheidung):** Wolf-Sprechblase im Logo ist oval — vor jeder Logo-Änderung fragen.

## 🟠 WARTET AUF MICH — Build

**Moderator-View (offener Rest — Cockpit-Rework + Setup-Wizard sind durch, s. Git):**
- [x] ✅ **„Einen Schritt zurück" repariert (Fund 1+2, 2026-07-19)** — `QQModeratorPage:1385` Vorwärts-
      Space-Handler bekam `&& !e.shiftKey` (Shift+Space sprang vorher VOR); `:1532` Escape/Backspace
      schluckt Backspace nicht mehr global → alle 3 Wege (Shift+Space, Backspace, Header-Button, der
      synthetisch Space+Shift feuert) routen jetzt auf `qq:goBackSlide`. Auf Feature-Branch, tsc grün.
      Am echten Moderator gegentesten (Streamdeck-Shift+Space + Button). (Legacy `host:back`/
      `undoLastHostStep`/`ActionButtons.tsx` = toter Waisen-Pfad; echter Pfad `qq:goBackSlide`.)
- [ ] **Back Fund 3 — Phasen-Snapshot (struktureller Ausbau):** `qqRooms.ts:7060 qqGoBackSlide` deckt nur
      5 Phasen ab (nur Sub-Step-Dekrement); `canBack` (`QQModeratorPage:2001`) auch. Kein Snapshot →
      Back kann eine versehentliche PHASEN-Weiterschaltung (Space zu früh → Frage aktiv/Placement/Bets
      zu) nicht heilen. Leichten Snapshot-Stack pro Phasen-Transition + Restore bei Sub-Step 0. Auch
      GAME_OVER-Zeremonie an Back koppeln (`qqAwardStep {dir:-1}`) + 400ms-Bounce-Guard für qqGoBackSlide.
- [x] ✅ **Back Fund 4 — Finale-Bet-Doppelzählung GEFIXT (2026-07-19, empirisch bewiesen):** die Bet-
      Stamps zählten via `updateTerritories:4635` in `largestConnected`, und `qqFinalTotal` addierte
      `totalBonus` (== Stamp-Anzahl) NOCHMAL → Bonus doppelt in JEDEM Finale (Team 5→8), Sieger-kippbar +
      Handy/Beamer-Drift. Bewiesen per `dev/dumpScore`-Probe (rot: largestConnected +totalBonus sobald
      Stamps landen; grün: konstant nach Fix). Fix: `updateTerritories` zählt revealStamps nicht mehr
      (rein visuell). Regressions-Test in `qqRooms.test.ts` (30/30). **Miterledigt:** der back-spezifische
      Stamp-Dopplungs-Teil ist damit score-immun (Back+Vor = nur noch kosmetische Extra-Stamps). Auf
      Feature-Branch, tsc+vitest grün. Dev-Diagnose-Endpoints `dev/dumpScore` + `dev/advanceFinal` blieben.
- [ ] **Alle SPACE-Befehle aktualisieren** — Hints stimmen nicht: Tooltip `:2017` + Hilfe-Panel `:6095`
      bewerben „Shift+Space/Backspace = zurück", real tot bzw. springt vor (s.o.). Nach Fix 1-3 angleichen.
      `Strg+Z` (`:1703` → undoLastAction) IST korrekt. Bounce-Schutz für `qqGoBackSlide` fehlt (400ms).
- [ ] **„Runde 1 / Frage 1 von 5" darstellen** — im Cockpit schlanke Pills; ggf. Kolosseum-Gems
      auch hier (offen, koppelt an Tier-1-Assets).

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
