# QQ TODO

## Offen / In Diskussion

### Schätzchen — Punkte für Range-Treffer (User denkt drüber nach, Stand 2026-04-25)

**Idee**: alle Teams die innerhalb einer Range am Zielwert dran sind, bekommen Punkte.
Aktuell: nur 1 Gewinner (kleinste Distanz, Speed-Tiebreak). „Knapp daneben"-Teams gehen leer aus.

#### Range-Modell — adaptive % je nach Wertgröße (User-Vorschlag)

Festes 5% ist nicht überall sinnvoll:
- 50.000 Einwohner ±5% = ±2.500 → fast trivial getroffen
- 24 Stück ±5% = ±1,2 → nur bei exaktem Treffer in Range

**Konkrete Formel-Vorschläge** (zur Auswahl):

- **F1 — Größenabhängige %**:
  ```
  Wert < 100      →  20%
  Wert 100-1.000  →  10%
  Wert 1.000-10k  →   7%
  Wert 10k-1Mio   →   5%
  Wert > 1Mio     →   3%
  ```

- **F2 — Logarithmisch**: `tolerance = value * (0.20 - 0.025 * log10(value))`
  - Wert 10: 17.5% (1.75)
  - Wert 100: 15% (15)
  - Wert 1000: 12.5% (125)
  - Wert 10k: 10% (1k)
  - Wert 1Mio: 5% (50k)
  - Wert 100Mio: 0% — muss noch min-cap kriegen

- **F3 — Hybrid (% UND absolut, beide gelten)**:
  ```
  range = max(value * 0.05, sqrt(value))
  ```
  - Wert 25: max(1.25, 5) = 5 (=20% effektiv)
  - Wert 100: max(5, 10) = 10 (=10%)
  - Wert 10.000: max(500, 100) = 500 (=5%)
  - Wert 1Mio: max(50k, 1k) = 50k (=5%)

**Empfehlung**: F1 ist am einfachsten zu erklären und debugbar. F3 ist mathematisch elegant.

#### Punkte-Stufen-Vorschlag (mit adaptiver Range)

- **Genau (Δ = 0)**: 2 Felder + „Closest Call"-Trophy
- **In Range (gemäß Formel)**: 1 Feld
- **Außerhalb**: 0

Bei voller Grid: Range-Sieger bekommen Klau-Recht statt Setzen.

#### Backend-Schema-Änderungen

- `evalSchaetzchen` muss Mehrfach-Sieger zurückgeben (`correctTeamId` → `correctTeamIds[]`)
- Optional: Punkte-Bonus-Counter pro Team in `teamPhaseStats`

#### Frontend-Änderungen

- `SchaetzchenReveal`-UI: mehrere Treffer-Avatare in einer Reihe statt nur 1 Trophy
- Reveal-Animation: jeder Treffer pop't einzeln, Range-Indikator als visueller Bogen
- Optional: Bonus-Animation für „Genau"-Treffer (Konfetti / Sparkles / Trophy)

#### Offene Fragen

- Welche Formel (F1/F2/F3) gefällt am besten?
- Bei vollem Grid: Range-Sieger → Klau-Recht oder leer aus?
- „Closest Call"-Trophy bleibt für genauesten Treffer auch wenn mehrere Punkte kriegen?

---

## Erledigte Game-Design-Entscheidungen

### Trinity-Mechanik (Stand 2026-04-25)

**Reduktion auf 3 Mechaniken**: Place / Steal / Stapel.
Bann + Schild + Tauschen wurden gedroppt.

**Klimakurve**:
- R1: Place 1×
- R2: + Klauen (max 2 pro Runde)
- R3: + Stapeln (+1 Punkt, max 3 pro Spiel)
- R4: identisch zu R3 (Long-Mode = mehr Fragen)

**Joker-Pattern erweitert**: 2x2 ODER 4-in-a-row → 1 Bonus-Feld (Cap 2 pro Spiel).

**Backend-Cleanup-Status**: Frontend triggert SHIELD/SANDUHR/SWAP nicht mehr.
Backend-Handler bleiben als Dead-Code für bestehende Cell-States (Legacy-Sessions
mit shielded/banned Cells werden weiter visualisiert).

## Erledigt (zur Referenz)

- 2026-04-25: ⚡ Blitz-Rechteck zentral entfernt (Unicode statt Fluent-PNG)
- 2026-04-25: Comeback-Bug — Legacy-Auto-Steal-Trigger entfernt
- 2026-04-25: Jahreszahlen ohne Tausenderpunkt (Heuristik via `unit`)
- 2026-04-25: CozyGuessr Team-Karte größer (260px → 380-620px clamp)
- 2026-04-25: R4 Place erlaubt solange freie Felder
- 2026-04-25: Beamer-Wrapper-Sicherheitsrand entfernt
- 2026-04-25: Klimakurve R1 → R4 — Trinity-Reduktion (Place/Steal/Stapel)
- 2026-04-25: 4×1-Joker-Pattern zusätzlich zu 2×2
- 2026-04-25: Stapel-Cap (max 3 pro Spiel)
- 2026-04-25: Dummy-AI auf Trinity portiert
- 2026-04-25: Comeback-Folie clipping gefixt (Größen reduziert)
- 2026-04-25: CozyGuessr Pin-Cluster-Spread Floor reduziert (2.5° → 0.3°)
- 2026-04-25: Spielende-Rankings als vertikale Tabelle
- 2026-04-25: Phase-Descs + Big-Emoji auf Trinity konsistent
- 2026-04-25: Dead-Code (alte R3/R4 Card-Blöcke + Buttons) gelöscht

## Later

### ThanksView · „Nächstes Event"-Block links (Stand 2026-05-10)

Linke Card-Spalte in der Thanks-Page wurde leer gelassen — Termine sind aktuell
nicht buchbar/dokumentiert, also kein Inhalt da. Sobald cozywolf.de + Buchungs-
Flow stehen, soll der Block zurück:

- **Pill**: 📅 „Nächstes Event"
- **Headline**: „Pub-Quiz · Firmen-Events · Geburtstage"
- **Subline**: „Termine + Buchung auf **cozywolf.de**"

Layout-Skelett (3-col-grid in der Hero-Card) ist bereits vorbereitet — nur den
linken `<div aria-hidden />`-Platzhalter durch das Events-Block-Markup ersetzen.
Optional: konkrete nächste 1-2 Termine fetch-basiert anzeigen, wenn ein
Termine-Endpoint existiert.

Code-Anker: `frontend/src/pages/QQBeamerPage.tsx` ThanksView, Suchwort
„LINKS: Platzhalter".

---

## 🔴 Live-Test 2026-05-10 (Wolf-Findings)

Reihenfolge: Bugs > Layout > Audit. Safety-first wegen tightem Context.

- [x] **L1 — Welcome doppelt** ✅ FIX (QQBeamerPage.tsx): QuizIntroOverlay-Render-Call vor RulesIntro entfernt + welcomeActive-Variable. Component bleibt im File falls später wieder gewünscht.
- [x] **L2 — „Saxofon" Spelling-Tolerance** ✅ FIX (`shared/textNormalization.ts`): `ph→f` phonetische Normalisierung. Saxofon/Saxophone, Telefon/Telephone, Foto/Photo etc. matchen jetzt exakt nach Normalisierung.
- [x] **L3 — „stadium" akzeptiert für Wembley Stadium** ✅ FIX (`shared/textNormalization.ts`): Substring-Tolerance jetzt mit Min-Ratio 0.5. „stadium" (7) in „wembley stadium" (15) = 0.47 → blockt. „herr der ringe" (14) in „der herr der ringe" (18) = 0.78 → matched weiter.
- [x] **L4 — Endzusammenfassung der Punkte** ✅ Wolf-Klärung 2026-05-10: bezog sich versehentlich auf L10 (Doppel-Notiz). Mit L10-Fix `afd51f82` mit-erledigt.
- [x] **L5 — pic1 HotPotato Antworten überlappen mit Trivia-Trio** ✅ FIX (`QQBeamerPage.tsx` HotPotatoBeamerView): Chips-Container von `justifyContent: center` auf `flex-start` umgestellt + paddingTop/Bottom. Chips wachsen jetzt nach unten begrenzt durch overflow:hidden statt in beide Richtungen vom Center aus zu expandieren.
- [ ] **L6 — Joker-Bug Audit-Ergebnis (2026-05-10)** 🔍

  **Top-Hypothese — Re-Detection nach Steal-Roundtrip**:
  - `qqBfs.ts:122-172` `detectNewJokers` qualifiziert ein Pattern als NEU sobald **eine** Cell `!jokerCounted` ist (`cells.some(p => isNeverCounted)` Zeile 145).
  - Bei Steal/Swap/SandLock wird `jokerCounted=false` auf der betroffenen Cell zurückgesetzt (`qqRooms.ts:2362, 2468, 2522, 2673`).
  - **Szenario**: Team A formt 2x2 in Runde 2 (Joker++). Runde 5: Team B klaut 1 Cell. Runde 7: Team A klaut zurück → `jokerCounted=false` auf dieser Cell → **identisches 2x2 wird wieder als NEU erkannt** → 4 Sterne + Bonus erneut.
  - Per-Phase-Cap rettet nur innerhalb derselben Runde, nicht über Phasen.

  **Alt-Hypothese (wenn Hypothese 1 nicht passt)**:
  Die 4 Sterne sind **ein einziges Pattern** (2x2 oder 4-Line) mit 4 Cells, alle korrekt markiert — Wolf hat es als „4 separate Joker" wahrgenommen. Spec sagt: 1 Pattern = 4 Sterne = 1 Bonus-Slot.

  **Debug-Schritte für Wolf** (DevTools Network-Tab beim nächsten Auftritt, `server:stateUpdate` Payload):
  - Für die 4 markierten Cells aus `state.grid[r][c]`: `ownerId` (alle gleich?), `jokerFormed`, `jokerCounted`, `stuck`
  - Wenn 3/4 `jokerCounted=true` + 1/4 `false` → Hypothese 1 bestätigt
  - `state.teamPhaseStats[teamId].jokersThisPhase` + `jokersEarned`
  - `room.teamTotalSteals[teamId]` über mehrere Runden — Korreliert mit Joker-Wieder-Trigger?

  **Wolf-Entscheidung 2026-05-10**: Option (c) — erstmal NICHTS ändern. Beim nächsten Auftritt im Live-Test Network-Tab-Snapshot ziehen (`state.grid[r][c]` für die 4 Cells: `ownerId`, `jokerFormed`, `jokerCounted`, `stuck` + `state.teamPhaseStats[teamId].jokersThisPhase/jokersEarned` + `room.teamTotalSteals[teamId]`), dann zwischen Fix-Option (a) `cells.every(...)` und Option (b) `jokerCounted` per Steal NICHT resetten entscheiden.

  **Files**: `qqBfs.ts:122-187`, `qqRooms.ts:2231/2357/2468/2522/2673/3466 (handleJokerDetection)/3585/3247`, `shared/quarterQuizTypes.ts:106-107` (QQCell-Field-Semantik).
- [x] **L7 — pic3 Comeback rechte „NEW"-Card kleiner als linke** ✅ FIX (`QQBeamerPage.tsx` ActionCardReveal): Outer-Wrapper bekommt explizit `height: 360` matching non-isNew Card, `alignSelf: stretch` raus (zog Outer auf parent-row-Höhe, Inner blieb 360 → wirkte kleiner).
- [x] **L8 — pic4 Mu-Cho untere Winner-Card abgeschnitten** ✅ FIX (`QQBeamerPage.tsx` Single-Winner-Banner): Banner ~15-20% kompakter — Avatar 8vw→7vw, font 5vw→4.2vw, padding/gap/margin reduziert. Damit Mu-Cho-Reveal mit 4 Optionen den viewport-Bottom (overflow:hidden) nicht mehr verlässt.
- [x] **L9 — pic5 10v10 unten viel Platz** ✅ FIX (`QQBeamerPage.tsx` ZvZ-Grid): `minHeight: clamp(280px,38vh,460px)` + `alignContent: center` + marginTop dazu. Cards nutzen jetzt den Platz vertikal-mittig statt top-aligned.
- [x] **L10 — „Grösstes Gebiet" final-Lock-View** ✅ FIX (Commit `afd51f82`, QQBeamerPage.tsx GridRevealSlide): PlacementView-Sizing übernommen (clamp 900/78vh/50vw statt 64px-Mini-Grid). Per-Team Frontend-BFS (matched backend qqBfs.ts: 4-Nachbarschaft, stuck=2P) ermittelt die größte verbundene Region; Region-Cells voll deckend + Glow (Sieger-Region mit qqFRClusterPulse), kleinere Inseln gedimmt (opacity 0.35 + grayscale 0.55). Sidebar-Sort: largestConnected primary, totalCells tiebreak (matched GameOverView).
- [x] **L11 — Autoplay-Fixes 1 + 2** ✅ (Commit `2d56333a`, QQModeratorPage.tsx):

  **Fix 1 — FINAL_REVEAL-Step-Mapping aligned** mit `qqFinalRevealMaxStep` (qqRooms.ts:5367+, `betSlotsCount + 5`). Vorher `2N+8`-Schema, Race-Final-Step bekam 3.2s Ranking-Delay und wurde mittendrin abgebrochen. Neue Delays: title 1.5s, grid 5.5s, bet 3s (Zero-Group 4.5s), awards-overview 2.5s, awards-reveal 8.5s, race-final (20+2N+4)s.

  **Fix 2 — Outer-Effect-Cleanup** in 2 zusätzlichen Effects (NICHT als return im Outer-Effect — würde den ref-stabilen Timer bei jedem dep-change platt machen und Wolf-Bug „autoplay langsam" reaktivieren). Reaktiver Effect: Pause/Disable/Stop-Phase cancelt den Timer sofort. Unmount-Effect: clearTimeout + autoplayLastFireKeyRef null.

  **Offene Reste** (nicht heute):
  - **Fix 3 (P1, 15 min)**: Failsafe-Timer 60s für Custom-Pipelines (OnlyConnect/Bluff/HotPotato/Imposter „warte-auf-Backend"-Pfade) → emit revealAnswer fallback.
  - **Fix 4 (P2, 20 min)**: `qqDecodeFinalStep` als shared util exportieren — Mod-Autoplay + Beamer-View teilen sich SoT.
  - **Effect-Deps unvollständig** (Top-Verdacht-3): `state?.finalBetResolution` + `state?.endAwards` + `state?.finalBettingSubmitted` fehlen → server-State-Update ohne fireKey-Change = kein Re-Schedule.

## Offen — Stand 2026-05-10 (nach Marathon-Tag)

### 🔴 Wichtig (Live-Risiko)

- **Summary-Link-Stale-Bug** *(siehe SESSION_LOG 2026-05-10)*
  Bei `SINGLE_SESSION_MODE = MAIN` (= aktueller Default) wird der gleiche
  RoomCode für jedes Spiel verwendet. Das heißt: wenn ein Spieler den
  `/summary/MAIN`-Link teilt und Wolf am nächsten Tag wieder spielt, zeigt
  der alte Link auf das NEUE Spiel — alte Stats für den Spieler weg.
  **Fix-Optionen:**
  - (A) Per-Game-ID-basierte Summary: `/summary/by-id/:gameId` zusätzlich
    zum roomCode-Endpoint. Thanks-Page-QR auf id verlinken. ~30 min.
  - (B) RoomCode pro Spiel neu generieren (SINGLE_SESSION_MODE-Refactor).
    Höheres Risiko, mehr Stellen.
  → Empfehlung: Option A, da risikoarm + behebt das Problem komplett.

### 🟡 Mod-Page Race-Conditions (mid-Risiko, selten)

- **Comeback-Choice Phase-Loop Race-Lock** ([QQModeratorPage.tsx:13513+])
  Bei zu schnellem Space während Backend-State-Switch ggf. falscher Punkt.
  Braucht reproducible Test-Szenario.
- **Question_Active → Reveal Race**: Space kann je nach State zwei Events
  triggern. ~30 min.

### 🟢 Polish (kein Pitch-Blocker)

- **Treppchen-Win-Page Confetti-Storm** (Wolf-Wahl Option C aus AskUser
  am Anfang der Session, nicht umgesetzt — Thanks-Refactor übernahm den
  Vorrang). Treppchen vertikal mehr Mitte ziehen + dauerhafte Konfetti-
  Cascade von oben + stärkerer Sieger-Glow. ~30 min.
- **4 Animation-Easings** (`project_qq_audit_followups_2026_05_07`):
  ComebackHL bounce → ease-out, HotPotato Container revealAnswerBam →
  langFadeIn, Bluff-Watermark phasePop bounce, Standard-Card opacity-
  Delay-Konflikt. **Achtung**: Memory-Zeilen-Nummern sind 3 Tage alt,
  vor Fix re-grep'en.
- **5 Layout-Cap-Bumps**: Phase-Intro Step-1 maxWidth, Comeback Step-0/1
  Mechanik-Card, Connections-Intro Pills, TEAMS_REVEAL Disc-Cap, Standard
  Question-Card horizontal-padding.
- **2 justifyContent-Lücken**: GameOver Recap rechte Spalte, Comeback
  Step 0/1 + PausedView preGame Top/Bottom-Streifen.

### 🟢 Mod-Page UI-Backlog (`project_post_eurovision_backlog`)

Alles mid-Risiko, nach erstem echten Live-Quiz priorisieren je nach echtem
Schmerz:

- Teams-List Compact-View während Spielzeit (~30 min)
- Host-Notes Toast statt always-visible (~45 min)
- Show-Controls phasenkontextuelles Hide statt grey-out (~60 min)
- Settings-Dropdown-Refactor (~2 h)
- Shift+Space → direkter Sprung zu QUESTION_ACTIVE (~1.5 h, mid-Risiko)
- Streamdeck-Action-Toast bei Hotkey-Press (~2 h)

### 🟢 cozywolf.de Landing-Page

Siehe [COZYWOLF_LANDING.md](COZYWOLF_LANDING.md):
- Impressum + Datenschutz-Pages (Footer-Links zeigen auf `#`)
- `hallo@cozywolf.de` Mail einrichten + Frontend-Konstante `EMAIL` updaten

### 🟢 Live-Test-Bug (braucht Repro)

- **/team Joker-False-Positive**: Pragma-Patch ist drin (`myJokersThisPhase
  > 0` zusätzliche Gate). Wenn der Bug doch noch auftritt → DevTools
  Network-Tab `state-update`-Payload mit `pendingAction`,
  `placementsLeft`, `teamPhaseStats[myTeam].jokersThisPhase` festhalten.
