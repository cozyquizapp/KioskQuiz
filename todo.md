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
- [ ] **L4 — Endzusammenfassung der Punkte** ❓ — Wolf-Quote unklar, vermutlich Final-Score-Display falsch/fehlend. Bei nächster Gelegenheit präzisieren lassen.
- [x] **L5 — pic1 HotPotato Antworten überlappen mit Trivia-Trio** ✅ FIX (`QQBeamerPage.tsx` HotPotatoBeamerView): Chips-Container von `justifyContent: center` auf `flex-start` umgestellt + paddingTop/Bottom. Chips wachsen jetzt nach unten begrenzt durch overflow:hidden statt in beide Richtungen vom Center aus zu expandieren.
- [ ] **L6 — pic2 Joker-Bug: 4 Joker markiert obwohl 2 der Felder gerade gesetzt wurden**. Joker-Detection darf neu-gesetzte-im-selben-Zug-Felder nicht als „bestehender Block" werten.
- [x] **L7 — pic3 Comeback rechte „NEW"-Card kleiner als linke** ✅ FIX (`QQBeamerPage.tsx` ActionCardReveal): Outer-Wrapper bekommt explizit `height: 360` matching non-isNew Card, `alignSelf: stretch` raus (zog Outer auf parent-row-Höhe, Inner blieb 360 → wirkte kleiner).
- [ ] **L8 — pic4 Mu-Cho: untere Card („Drei Halbe Ne Ganze"-Toast) wird unten abgeschnitten**. Padding/maxHeight oder Position fixen.
- [ ] **L9 — pic5 10-von-10: viel Platz unten, Cards nach oben gequetscht**. Vertikal verteilen statt top-aligned.
- [ ] **L10 — pic6 „Grösstes Gebiet"-Final-Page**: anderes Grid-Layout als im Quiz. Soll dasselbe Layout nutzen wie Placement-Phase (Grid + Tabelle daneben), nur der Sieger erhellt.
- [ ] **L11 — Autoplay-Audit**: skippt Events, funktioniert manchmal gar nicht. Audit der Autoplay-State-Machine + Event-Trigger.

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
