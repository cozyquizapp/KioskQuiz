# CozyQuiz Session Log

Chronologisches Protokoll von Arbeits-Sessions. Trigger: Wolf sagt „log das", dann hängt Claude einen Eintrag an. Append-only, nie überschreiben.

---

## 2026-05-11 — CozyBuilder Total-Refactor + Live-Test-Fixes + EN-i18n + Spacing-Audit

**Tageslauf**: Riesige Session ~35 Commits. Vier thematische Blöcke:

### 1. Live-Test-Findings L10 + L11 ✅
- **L10 Final-Lock-View Refactor** (`afd51f82`): GridRevealSlide neu im
  PlacementView-Sizing (900px statt 64px-Mini), Frontend-BFS für
  größte verbundene Region pro Team, Sieger-Region mit Pulse, kleine
  Inseln gedimmt.
- **L11 Autoplay-Fixes** (`2d56333a`):
  - Fix 1: FINAL_REVEAL-Step-Mapping aligned mit `qqFinalRevealMaxStep`
    (`betSlotsCount + 5` statt alt `2N+8`). Race-Final bekommt jetzt
    `20 + 2N + 4` sec statt 3.2s → kein Mid-Choreo-Abbruch.
  - Fix 2: Outer-Effect-Cleanup in 2 zusätzlichen Effects (kein
    generisches return-cleanup, sonst killt's den ref-stabilen Timer).
    Reaktiver Pause/Stop-Cancel + unmount-Vollcleanup.

### 2. Spacing-Audit Pack ✅ (7 Fixes)
4 parallele Beamer-View-Audits, dann mit Wolf gefiltert nach Cascade-
Risiko:
- L1 ComebackView fly-up clamp(-510→-390) — kein Top-Edge-Overshoot
- L2 HotPotato Question paddingTop +20px — Top-Bar-Overlap weg
- L4 GameOverView Wolf-Jubel top→bottom (Winner-Hero atmet bei N≥7)
- L5 LobbyView Team-Grid-Gap 6→10 px bei N≥7
- L6 ThanksView linke leere Spalte gedroppt (3-col → 2-col)
- L7 Connections Group-Avatare bei N≥6 von 36-52→28-40 px
- L8 PhaseIntroView Cards synchron via minHeight + alignItems:stretch

Bewusst SKIPP: L3 RaceTeamUnit yOffset (Wolf will Raketen-Vielfalt
behalten) + L9 RaceFinal-Padding für N=8 (seltener Worst-Case).

### 3. EN-Localization-Sweep ✅
Wolf-Bug-Discovery: Comeback zeigt DE-Frage im EN-Spiel. Audit als
Systemleck identifiziert. 5 Commits:
- QQHLPair Type bekommt unitEn/anchorLabelEn/subjectLabelEn/
  customQuestionEn + Frontend-Fallback (Beamer + /team)
- 69 H/L-Pool-Einträge EN-übersetzt
- H/L Number-Format-Suffix Mrd./Mio. → bn/M bei EN
- Sample-Drafts (qq-vol-1..5): 15× Schätzchen-unitEn, 2× HotPotato-
  answerEn, 3× Top5-answersEn, 3× Order-criteriaEn
- /team HelpModal EN-Section + PAUSE_CAT_ACCENT.labelEn-Field
- Builder-Translate-Button: 4 fehlende Bunte-Tüte-Felder fixed
  (onlyConnect.answer + acceptedAnswers, bluff.realAnswer)

⚠️ /api/translate hängt weiter an MyMemory, nicht DeepL. translateText()
ist im Backend schon DeepL-fähig — Endpoint freigeben wäre Pack C.

### 4. CozyBuilder Total-Refactor 🪄 (Hauptblock)

**Designer-Audit** (`2598f4b6`): 3 parallele AI-Agents auf Builder-Page
(Content-Flow / Visual-UX / Feature-Wishlist). Konsolidiert in
[COZYBUILDER_AUDIT.md](COZYBUILDER_AUDIT.md) — 36 Findings sortiert in
Quick-Wins / Mid-Bets / AI-Assist / Big-Bets. Gesamtdiagnose: 'Linear/
Notion-Klon, Brand-DNA fehlt'. Marken-Richtung: 'Heimathafen statt
Werkzeugkasten'.

**Pack A — Brand + Wärme** (`0b023296`):
- Brand-Farben-Sweep (Navy/Pink/Magenta-Tokens, Page-BG/Header/Save-
  Button auf Brand)
- CozyWolf in DraftListScreen mit Sprechblase + 4 Random-Greetings
- 'CozyBuilder'-Eyebrow statt 'CozyQuiz'
- Save-Button belohnt (Pink-Glow + Click-Bounce + ✓-Cascade)
- Empty-State-Wolf statt '← Slot auswählen'

**Pack B — Workflow-Heilen** (`ea41ac06`):
- Save-Modal entschärft (nur noch Errors blocken)
- Auto-Save-Pill 'gerade gespeichert / vor Xs gespeichert'
- Drag-Drop + Paste-from-Clipboard für Bilder
- Tastatur-Nav Cmd+S / J/K / Enter

**Wizard-Modus** (`1aa20c53`): Slide-by-Slide-Editor mit Toggle
'📋 Grid | 🪄 Wizard', Phase+Counter+Filmstrip-Layout.

**Polish-Pack** (`7417ad51`): Sound-Layer (cozyBuilderSounds.ts — 3
subtile Beats Save/Click/Upload + Milestone-Fanfare), Milestone-Toasts
mit Wolf-Charakter (5/10/25 Fragen + Phase voll + alle EN), Smart-
Default Schätzchen-Unit aus Frage-Text-Heuristik, Default-Titel mit
Counter+Datum statt 'Neuer Fragensatz'.

**CHEESE-Layout-Toggle Saga** (3 Commits):
- Per-Frage `cheeseLayout`: 'landscape' | 'portrait' Override (alte
  Auto-Detection fällt nur noch zurück wenn ungesetzt)
- Wolf-Insight: 'ich croppe ein Querformat-Bild bewusst auf einen
  Hochkant-Ausschnitt' → Auto-Detection unmöglich, manuell richtig
- Dual-Frame Builder-Preview (zeigt LIVE beide Beamer-Layouts mit
  Position/Zoom-Sync) ersetzt 'random'-Mini-Preview
- 👁 Vorschau-Modal komplett entfernt (zeigte fake/random Render)
- Layout-Toggle ins Bild-Sub-Step verschoben (war fälschlich im
  Antwort-Sub-Step, Wolf konnte ihn nicht finden)

**Layout+Animation Picker komplett entfernt** (`38c60986`):
Wolf-Feedback 'nutz ich nicht' bei Window-Links/Rechts/Freisteller.
Default-Layout 'fullscreen' bleibt beim Bild-Upload. Alte Drafts mit
Window-Layouts werden weiterhin korrekt vom Beamer gerendert.

**Wizard Sub-Steps** (`38c60986`): Slide-by-Slide INNERHALB einer Frage.
Pro Kategorie eigenes Step-Schema (3-5 Steps: Frage/Antwort/Bild/Fact
etc). QuestionEditor bekommt `visibleSections`-Prop + `fullWidth`-Prop.
Mini-Stepper mit Pink-Pills, ← → wechselt Steps + an Step-Grenzen zur
Nachbar-Frage.

**Vollbild-Fokus-Mode** (`b82571ba`): Header-Chrome im Wizard
ausgeblendet (Title-Edit, Runden, Sprache, Theme, CSV, 4×4 Finale,
Host-Sheet, EN befüllen). Bleibt: Zurück, Title-Pille (read-only),
Grid|Wizard, Sound, Auto-Save, Save.

**Mod-Notiz + Fun-Fact gemerged** (`70e97af3`): Wolf-Entscheid 'ist
eigentlich das gleiche'. hostNote aus Builder entfernt, funFact (mit
DE+EN) bleibt als einziges Mod-Private-Feld. Backward-Compat: alte
Drafts mit hostNote bleiben in DB + Mod-Cheatsheet.

**Polish-Pack 5 Items** (`fea81490`):
- Step-Transitions punchier (slide+scale+blur, bouncy 0.42s)
- Filmstrip-Custom-Hover-Tooltip mit Frage-Preview
- Kategorie-Farbe stärker im Body (Card-Border + 4px-Accent-Streifen
  + Textarea-Focus-Glow per CSS-Custom-Property)
- Empty-State im Bild-Step (große einladende Drop-Zone statt
  Upload-Button)
- Inline-Validation-Dots an Step-Pills (rot/amber pro Step)

**Rename QQ Builder → CozyBuilder** (`3024507f`): User-facing Labels
in MenuPage + QQSlideEditorPage. Code-interne Bezeichner bleiben.

### Architektur-Diskussion 💭 (Wolf-Frage zur nächsten App)

Wolf fragte: 'wie würde man eine App so bauen dass ein Canva-Editor
mit echter Live-Vorschau möglich ist?'. Antwort dokumentiert:
- Slide-Spec-Datenmodell ZUERST (Zod-Schema)
- Generischer Renderer der das Spec konsumiert (1 Komponente, KEIN
  hardcoded Phase-spezifischer Code)
- Editor + Live-Game teilen denselben Renderer
- Animations als Daten (Framer Motion variants oder GSAP Timeline)
- Theme-Tokens als CSS-Vars von Tag 1, NICHT inline clamp()

Auf 'Wie aufwendig wäre Einbau in CozyQuiz jetzt?': 3 realistische
Optionen analysiert.
- Option A (Full Rewrite): 6-9 Monate Fulltime — Suizid
- Option B (Hybrid): 2-3 Monate, aber doppelte Wartung
- Option C (Theme-Editor mit CSS-Var-Knöpfen): 1 Woche, sinnvoll
- Option D (1 Slide als Pilot): 1-2 Monate

Wolf entschied: **'nö, lass mal, Builder reicht aktuell'**. Idee in
Memory abgelegt für später.

### Entscheidungen heute
- Skript-Approach für EN-Übersetzungen verworfen → manuell pragmatischer
- L3 Race-Avatar-yOffset NICHT angefasst — Raketen-Vielfalt wichtig
- L9 RaceFinal-Padding für N=8 SKIPP — seltener Worst-Case
- Mod-Notiz mit Fun-Fact gemerged — Wolf: 'ist eigentlich das gleiche'
- Layout+Animation Picker im Builder komplett entfernt
- Architektur-Refactor verworfen, Canva-Editor-Idee geparkt
- CHEESE-Layout: manueller Toggle statt Auto-Detection (Wolf-Reasoning:
  Crop kann nicht automatisch erkannt werden)
- Wizard-Modus + Vollbild-Fokus = Default-Workflow für konzentriertes
  Schreiben

### Files (Highlights)
- `frontend/src/pages/QQBuilderPage.tsx` (~1500 Zeilen
  Refactor + Wizard + Sub-Steps + Fokus-Mode + Polish)
- `frontend/src/pages/cozyBuilderSounds.ts` (NEU, Web-Audio-Beats)
- `frontend/src/pages/QQMiniPreview.tsx` (Rewrite: CHEESE-Dual-Frame)
- `frontend/src/pages/QQBeamerPage.tsx` (L10 + L11 + Spacing + EN +
  CHEESE-Override)
- `frontend/src/pages/QQTeamPage.tsx` (Comeback EN-Fallback +
  HelpModal Brand-EN)
- `frontend/src/pages/QQModeratorPage.tsx` (L11 + Schaetz-Ranking
  EN-Fallback)
- `backend/src/quarterQuiz/qqHLData.ts` (komplett-Rewrite mit EN)
- `backend/src/server.ts` (Sample-Drafts EN-Felder)
- `shared/quarterQuizTypes.ts` (QQHLPair EN-Felder + cheeseLayout)
- `COZYBUILDER_AUDIT.md` (NEU, 342 Zeilen, 36 Findings)
- `todo.md` (L4/L6/L10/L11 status updates)
- `frontend/src/pages/MenuPage.tsx` (CozyBuilder Rename)

### Memory-Updates
- Keine neuen Memory-Files heute — alle relevanten Patterns in
  COZYBUILDER_AUDIT.md festgehalten.

### Offen / Next Steps
- ⏳ **Fragebibliothek** für alle Kategorien (auch Bunte Tüte). Sehr
  groß. Mit Tracking welche Frage wie oft + wo schon verwendet wurde.
  Nach 10 Monaten Live-Quiz wiederholen sich Fragen, langweilig für
  Stammgäste. Nächster großer Block — Wolf-Wunsch direkt nach diesem
  Log-Eintrag.
- ⏳ Pack C/D/E aus COZYBUILDER_AUDIT.md (AI-Plumbing, Fact-Check +
  Themen-Generator, Wizard-Pre/Post-Pages)
- ⏳ L6 Joker-Bug (Wolf-Network-Tab-Snapshot beim nächsten Live)
- ⏳ DeepL als /api/translate (Builder-Übersetzungsqualität-Lift)
- ⏳ Theme-Editor mit CSS-Var-Knöpfen (Wolf abgelehnt für jetzt,
  später vielleicht)

⚠️ **Coolify-Backend muss redeployed werden** — backend/src/server.ts
+ qqHLData.ts haben Änderungen für die EN-Sweep-Sample-Drafts +
Comeback-Pool. Beim nächsten Wolf-Backend-Push aktiv triggern.

🦖 Jojo over and out.

---

## 2026-05-10 (Abend) — Spacing-Audit-Fixes + EN-i18n + CozyBuilder Pack A/B

**Was passiert ist**: 4-Stränge-Session nach der Live-Test-Fix-Welle:

### 1. Spacing-Audits → 7 isolierte Fixes (P0/P1/P2)
4 parallele Audits auf alle Beamer-Phasen-Views, konsolidiert + nach
Cascade-Risiko gefiltert. Wolf hat 7 grüne (= sichere) + 1 gelben Fix
freigegeben:
- L1 ComebackView fly-up Y-Clamp -510→-390 (kein Top-Edge-Overshoot mehr)
- L2 HotPotato Question paddingTop +20px (Top-Bar-Overlap weg)
- L3 RaceTeamUnit yOffset BEWUSST nicht angefasst — Wolf will Raketen-
  Vielfalt, theoretisches Clipping nur N=8 Worst-Case
- L4 GameOverView Wolf-Jubel von top:22vh → bottom:6vh (Winner-Hero
  bekommt Atemraum bei N=7-8)
- L5 LobbyView Team-Grid-Gap 6→10 px bei N≥7 (keine Block-Verschmelzung)
- L6 ThanksView linke leere Spalte gedroppt (3-col → 2-col, ausbalanciert)
- L7 Connections Group-Avatare bei N≥6 von 36-52 → 28-40 px (kein Wrap+
  Spring-Out aus Cells)
- L8 PhaseIntroView Cards via Wolf-Idee: nicht einzeln, sondern
  SYNCHRON wachsen via minHeight + alignItems:stretch + Inner 100%

### 2. EN-Localization-Sweep
Bug-Discovery durch Wolf: Comeback zeigte DE-Frage im EN-Spiel. Audit
hat das als Systemleck identifiziert. 5 Commits:
- QQHLPair Type bekommt unitEn/anchorLabelEn/subjectLabelEn/
  customQuestionEn-Felder, Frontend mit Fallback (Beamer + /team)
- 69 H/L-Pool-Einträge in qqHLData.ts EN-übersetzt (Land-Namen,
  „Mont Blanc"/„Kilimanjaro" etc., 6 customQuestion-Templates)
- Number-Format-Suffix bei Comeback: „Mrd."/„Mio." → „bn"/„M" bei EN
- Sample-Drafts (qq-vol-1..5): 15× Schätzchen-`unitEn`, 2× HotPotato-
  `answerEn` (Europa 47 + Olympia 45 Sportarten), 3× Top5-`answersEn`,
  3× Order-`criteriaEn`. Plus Frontend-Fallback bei Schätzchen-Reveal
  Unit und Mod-SchaetzRanking-Prop.
- P1: /team HelpModal EN-Section bekommt Brand-EN-Kategorienamen
  („Close Call · Mu-Cho · Lucky Bag · All In · Picture This"),
  PAUSE_CAT_ACCENT bekommt labelEn-Feld + lang-Render.
- Builder-Translate-Button: 4 fehlende Bunte-Tüte-Felder fixed
  (onlyConnect.answer + acceptedAnswers, bluff.realAnswer).

⚠️ /api/translate hängt weiter an MyMemory (qualitäts-mäßig okay aber
unter DeepL). Backend hat translateText() schon (DeepL) — könnte als
Endpoint freigegeben werden, ist aber Pack C-Material.

### 3. CozyBuilder Designer-Audit
3 parallele AI-Agents auf Builder-Page (~2000 Zeilen):
Content-Flow / Visual-UX / Feature-Wishlist. Synthese als
COZYBUILDER_AUDIT.md im Repo-Root abgelegt — 36 nummerierte Findings
sortiert in Quick-Wins / Mid-Bets / AI-Assist / Big-Bets.

**Gesamtdiagnose**: Builder fühlt sich heute wie Linear/Notion an
statt wie CozyQuiz. Brand-DNA fehlt komplett. Marken-Richtung:
'Heimathafen statt Werkzeugkasten'.

### 4. CozyBuilder Pack A + B umgesetzt (2 Commits)

**Pack A — Brand + Wärme** (Commit `0b023296`):
- #1 Brand-Farben-Sweep — COZY_NAVY/COZY_NAVY_DARK/COZY_PINK/
  COZY_MAGENTA als File-Tokens. Page-BG, Header-Tint, Tab-Underline,
  Save-Button, Modals alles auf Brand. Errors → Magenta (Brand-Finale),
  OK → Pink (Primary).
- #2 CozyWolf in DraftListScreen — Wolf-Pose „augenauf.mundauf.winken"
  + Sprechblase Pink-Magenta-Verlauf, 4 Random-Greetings, 'CozyBuilder'-
  Eyebrow. Create-Buttons als Brand-Cards.
- #4 Save-Button belohnt — Pink-Glow wenn ready, Click-Shrink-Bounce
  (scale 0.96), 1.2s ✓-Cascade fixed top-right nach Save-Success.
- #5 Empty-State-Wolf — CozyWolf 200×200 mit Idle-Wiggle (4s sine) +
  6 Random-Sprüchen statt „← Slot auswählen".

**Pack B — Workflow-Heilen** (Commit `ea41ac06`):
- #6 Save-Modal entschärft — saveDraft prüft nur noch Errors, Warnings
  blocken nicht mehr. Kein „Trotzdem speichern"-Modal-Spam mehr.
- #7 Auto-Save-Pill im Header — „gerade gespeichert" / „vor Xs
  gespeichert", live tickender Counter, Pulse bei Update. Brand-Grün.
- #9 Drag-Drop + Paste-from-Clipboard für Bilder — Editor-Panel als
  Drop-Zone mit Pink-Highlight-Overlay, globaler Paste-Handler
  (Strg+V Bild auf activeQ). Spart ~5 min/Quiz.
- #10 Tastatur-Navigation — Cmd/Ctrl+S Save, +J/K Slot-Wechsel,
  +Enter Save + Sprung zum nächsten leeren Slot. 25 Fragen ohne Maus.

**Entscheidungen heute**:
- Skript-Approach für EN-Übersetzung verworfen → manuelle Übersetzung
  pragmatischer für die Menge (~200 Strings) + bessere Eigennamen-
  Kontrolle. Skript-Plumbing-Investition lohnt nicht für 1-Shot.
- L10 Race-Final-Padding für N=8 NICHT umgesetzt — selten relevant.
- Connections-Avatar-Verkleinerung bei N≥6 trotz Trade-off (Lesbarkeit
  vs. Chaos) durchgezogen, Wolf testet danach.
- ThanksView 3-col → 2-col: Skelett bleibt in todo.md als „Later" für
  wenn cozywolf.de Termine-Block kommt.

**Files berührt** (Highlights):
- `frontend/src/pages/QQBuilderPage.tsx` (~360 Zeilen ergänzt für
  Pack A+B, neue Komponenten EmptyStateWolf + AutoSavePill)
- `frontend/src/pages/QQBeamerPage.tsx` (Spacing-Fixes + EN-Fallbacks
  + GridRevealSlide L10 + ComebackView fly-up)
- `frontend/src/pages/QQTeamPage.tsx` (ComebackCard EN-Fallback +
  HelpModal EN-Brand-Namen + fmtHL EN-Suffix)
- `frontend/src/pages/QQModeratorPage.tsx` (L11 FINAL_REVEAL-Mapping +
  L11 Cleanup-Effects + SchaetzRanking unit EN-Fallback)
- `backend/src/quarterQuiz/qqHLData.ts` (komplett-Rewrite mit EN)
- `backend/src/quarterQuiz/qqBfs.ts` (genutzt für L10 BFS-Helper)
- `backend/src/server.ts` (Sample-Drafts EN-Felder)
- `shared/quarterQuizTypes.ts` (QQHLPair EN-Felder)
- `shared/textNormalization.ts` (L2/L3 ph→f + Substring-Min-Ratio
  schon am Vormittag)
- `COZYBUILDER_AUDIT.md` (NEU, 342 Zeilen)
- `todo.md` (L4 als L10-Dupe, L6 = Wolf-Entscheid c, L10/L11 ✅)

**Memory-Updates**:
- Keine neuen Memory-Files — alle relevanten Patterns in
  COZYBUILDER_AUDIT.md festgehalten (langfristige Referenz für
  Pack C-E + zukünftige Builder-Refactors).

**Offen / Next Steps**:
- ⏳ **Pack C (AI-Plumbing + Pilot)**: Backend `/api/qq/llm` Endpoint
  mit Claude Haiku + #25 Auto-Distraktoren + #26 Auto-funFact.
  Beide rechtfertigen die API-Investition.
- ⏳ **Pack D (AI-Erweiterung)**: #24 Fact-Check + #27 Thema-Generator.
- ⏳ **Pack E (Big-Bet wenn Zeit)**: #30 Wizard ODER #32 Bibliothek.
- ⏳ **L6 Joker-Bug**: beim nächsten Live-Auftritt Network-Tab-
  Snapshot ziehen, dann Fix-Option (a) vs (b) entscheiden.
- ⏳ **DeepL als /api/translate**: aktuell MyMemory. translateText()
  ist im Backend schon DeepL-fähig — Endpoint freigeben würde
  Builder-Übersetzungsqualität deutlich heben.

🦖 Jojo over and out.

---

## 2026-05-09 · Marathon-Session: Final-Wager + Game-Show-Reveal + HP-Visual

**Was passiert ist:** Riesige Session, ~50 Commits. Vier thematische Blöcke:

### 1. Final-Wager-Mechanik MVP + Brainstorm-Refinement
- Erste Implementation als Cell-Picker-Variante live (Commit `b66dad6c`): Bet = `{ row, col, targetTeamId }`, Bonus +1 pro richtig, Cells werden bei falsch entfernt
- Streamdeck-Integration (Setup-Toggle „🎰 Final-Wetten" in Quick-Settings, Space-Flow durch alle 3 neuen Phasen FINAL_BETTING + FINAL_REVEAL automatisch)
- Bot-Auto-Bets gestaffelt
- Mod-Page Bet-Übersicht (Submit-Status pro Team)
- **Mid-Session Wolf-Brainstorm hat Mechanik komplett gepivotet** → siehe `memory/project_final_wager_spec.md`. Final-Spec: 1 Tipp pro Team, Bonus = Anzahl Final-Kat-Wins des getippten Teams, **Sympathie-Bonus +1 mutual**, KEIN Verlust. Refactor steht aus.

### 2. Game-Show-Reveal für TeamsRevealView (Slot M live)
- Sequenzielle Card-Sequenz pro Team: Slam-Down → Settle face-down → Flip Y-Rotate → Spotlight-Hold (3.6s/Team)
- Card-Back: Wolf-Avatar (idle.svg ohne Ring) oben + „CozyQuiz" in Stinger-Fit unten — spiegelt Front-Layout
- Mehrere Iterationen weil Live-View nicht 1:1 wie Showreel aussah → Memory `feedback_showreel_to_live_one_to_one.md` angelegt: bei Migration JSX wörtlich kopieren, nicht durch existing Components zwingen
- Autoplay-Delay dynamisch (TITLE_HOLD + N×3.6s + 2.5s buffer)

### 3. Hot-Potato-Polish + Visualisierung
- HP-Match akzeptiert jetzt EN-Antworten (q.answer + q.answerEn kombiniert)
- HP-Autoplay separater useEffect mit minimalen Deps → Multi-Trigger-Bug gelöst
- Question-Sound HP-Gate: feuert erst bei `finished` (nicht während rolling/landed)
- /animations Slot P „Fliegende Kartoffel": Hold (Bounce bis oberer Avatar-Rand) → Wurf (Bogen mit Smoke-Trail) → Click-Spark-Burst bei Eliminierung → Avatar grau → Slide-Out nach 1.2s, alive-Avatare rücken zusammen
- Wolf-Entscheidung: HP-Reihenfolge ab nächster Session **nach Scoreboard** (bestes zuerst, schlechtestes zuletzt). Slot-Machine kommt raus, Slot P ersetzt sie als HP-Visual.

### 4. Polish-Sweeps
- Vercel-Cache-Bug am Handy nach Hetzner-Migration (kein Code-Bug)
- Mehrere Brand-Refresh-Reste auf /team gefixt (gold→pink, JSX-Doppel-Quotes)
- Joker-Fix: Pink-Glow weg + Boy-Joker Größenausgleich (1.10× scale)
- /team Mobile-Polish „Konzept A" komplett: Frosted-Glass, Edge-to-Edge, Bottom-Sheet-Menu mit Mini-Grid + Stats + Hilfe + Quiz-Verlassen
- LeaveQuizConfirm-Modal aus der Mitte verschoben → Flex-Wrapper-Fix
- Star-Border (reactbits.dev) live in PreGame + Pause-Cards
- Rules-Slide 4: Joker-PNGs auf Test-Grid + Wiggle-Animation
- /animations Slots ergänzt: K (parallel Flip) · L (Slam+Flip) · **M (Game-Show, live)** · N (Spark — Wolf abgelehnt) · O (Star-Border) · P (Fliegende Kartoffel)

### Wolf-Asset-Beiträge
- Wolf-SVG ohne Ring (`/avatars/cozywolf/svg/idle.svg`) — für Card-Back-Wolf
- 8 Wink-Frame-PNGs (`/avatars/cozywolf/wink/`) — 4 Augen/Mund-Kombos × 2 Hand-Positionen, für Frame-Animation in /animations Slot J

**Entscheidungen:**

- Final-Wager Tipp-Variante (kein Cell-Picker) + Sympathie-Bonus + kein Verlust
- HP-Reihenfolge nach Scoreboard, Slot-Machine raus
- Cluster-Visual am End-Reveal (nur Glow, KEIN Bonus — Variante a)
- 3 End-Awards (🐢 Underdog · 🦝 Meisterklauer · ⚡ Speedy Gonzales)
- Joker-Mechanik bleibt 1:1 wie ist (Cap 2, Pattern-basiert)
- Star-Border NUR in PreGame + Pause (nicht überall, sonst zu viel)
- TeamsRevealView Game-Show-Sequenz Slot M live (Konsens nach Slot-Vergleich K/L/M)

**Files berührt:** ~25 Code-Files + zahlreiche Memory-Updates. Highlights:
- `frontend/src/pages/QQBeamerPage.tsx` (TeamsRevealView, FinalRevealView, FinalBettingView, RulesView Joker, Star-Border in PausedView)
- `frontend/src/pages/QQTeamPage.tsx` (FinalBettingCard, TeamBottomSheetMenu, LeaveQuizConfirm, Mini-Grid solid)
- `frontend/src/pages/QQModeratorPage.tsx` (FinalWagerControls, Bet-Übersicht, separater HP-Autoplay-Effect, Quick-Settings-Toggle)
- `frontend/src/pages/AnimationsLabPage.tsx` (Slots K-P)
- `backend/src/quarterQuiz/qqRooms.ts` (FinalBetting-Phase + Resolver, qqBeginPhase auto-Wager-Trigger, qqNextQuestion FINAL_REVEAL → GAME_OVER)
- `backend/src/quarterQuiz/qqSocketHandlers.ts` (4 Final-Wager-Sockets, maybeAutoFinalBets, HP-EN-Match)
- `shared/quarterQuizTypes.ts` (QQFinalBet, QQFinalBetResolution, neue Phasen)

**Memory-Updates:**
- NEU: `feedback_showreel_to_live_one_to_one.md` (Showreel→Live 1:1 kopieren)
- NEU: `project_final_wager_spec.md` (Tipp-Variante final-Spec für Refactor)
- NEU: `project_team_mobile_polish_konzept_a.md` (Bottom-Sheet-Menu, kein Joker im Header)

**Offen / Next Steps:**

⏳ **Final-Wager-Refactor** (Cell-Picker → Tipp-Variante)
- Backend Resolver umbauen + Sympathie-Pair-Detection
- /team UI: nur TeamPickerModal
- /beamer FinalRevealView Score-Cascade mit Sympathie-Marker

⏳ **HP-Reihenfolge** nach Scoreboard + Slot-Machine raus + Slot P live in HP-View

⏳ **End-Reveal in 3 Akten**
- Akt 1: Cluster-Glow-Visual
- Akt 2: Wager-Reveal mit Sympathie-Marker
- Akt 3: 3 End-Awards mit Konfetti

⏳ **Live-Wins-Tracker** zwischen Final-Kategorien

⏳ **Test mit Wolf**: Final-Wager-Mechanik mit Dummies durchspielen, Vibe-Check

Wolf hat ~50 Commits durchgezogen, alle deployed (Vercel + Hetzner). Marathon-Session mit viel Brainstorm-zu-Code-Pivot. Nächste Session beginnt mit Final-Wager-Refactor (1-2h) + Test-Run vor Eurovision (in ~5 Tagen).

🦖 Jojo over and out.

---

## 2026-05-08 · Recherche-Marathon + Hetzner-Migration

**Was passiert ist:**

Riesiger Tag, drei thematische Blöcke:

1. **5 Design-Richtungen für CozyQuiz-Refresh** — `/gekocht`-Lab gebaut mit 5 durchklickbaren Designs (Aurora Stage, Café Vintage, Hand-drawn Cozy, Cinematic Noir, Neo-Retro Game Show). Jeweils 3 Mock-Views (Lobby/Frage/Pause), Color-Palette-Sidebar, Auto-Cycle, Thumbnail-Grid. v4 mit Modern-Web-Patterns: animierter Mesh-Gradient (Aurora), animierter Film-Grain (Noir), Universal-Grain-Overlay, Hover-Lift, View-Cascade, Avatar-Pulse, Submit-Flow-Bar, Heartbeat-Pulse, Score-Tickup, Variable-Font-Surge.

2. **`/animations`-Lab** — 7 Animation-Demos zum Anschauen + Re-Triggern (Slide-Off+Push, Line-Mask Reveal, Spring Pop-Scale, Slot-Machine Score, View Transitions API, Word Stagger Fade-Up, 3D Card-Flip). VT-Demo nach erstem Bug fixed mit `flushSync` + `keepAlive`-Prop.

3. **Hetzner-Backend-Migration KOMPLETT durchgezogen** — von der ersten Hetzner-Account-Anlage bis zur live-funktionierenden API. Backend läuft jetzt auf `https://backend.cozyquiz.app` (Hetzner CX22 + Coolify, ~€11.40/mo all-in inkl. Backups). Alle 5 ENV-Vars + ADMIN_PIN gesetzt. Vercel-Frontend zeigt durch `vercel.json`-Rewrites transparent zu Hetzner. Build-Tool nixpacks. Deploys via GitHub-Push automatisch.

**Entscheidungen:**

- VS Code + Claude Code + Vite + Vercel **bleiben** (TOOLING_AUDIT-Erkenntnis: 2x-oder-bleib-Regel angewendet, kein 2x-Win in Sicht).
- Render → **Hetzner+Coolify** (einziger echter Stack-Hebel: halbe Kosten, 8x RAM, EU-Latenz statt US, kein Cold-Start).
- Lounge Glass im Lab durch **Aurora Stage** ersetzt (Glass im Café-Setting hat Kontrast-Probleme).
- Vintage Pub Quiz → **Café Vintage** umbenannt (Wolf-Korrektur: Café/Kiosk statt Pub).
- Mechaniken-Pick aus 12 Optionen: **#1, #2, #3, #4, #5** als Wolfs Favoriten, mit Newbie-Tauglichkeits-Check.
- ADMIN_PIN: neu gewählt + nur in Coolify gesetzt (Render-Wert nicht migriert, da Wolf eh neuen wollte).

**Files berührt:**

7 neue Recherche-MDs im Repo-Root als Reference-Pool:
- `GRID_TENSION_IDEAS.md` — 12 Mechaniken + Top-5 + Newbie-Test
- `ANIMATION_PATTERNS.md` — 6 Animations-Patterns + Library-Empfehlung
- `MODERN_UI_PATTERNS.md` — 21 Patterns aus Game-Show/Multi-User/2026-Trends
- `DESIGN_DIRECTIONS.md` — 5 Lab-Designs mit Farb-Tokens + Refs
- `EMOJI_INTEGRATION.md` — Crash-Free Fluent-Emoji-Integration
- `PERFORMANCE_AUDIT.md` — 6 Bereiche, Top-10-Must-Haves, Quick-Wins
- `TOOLING_AUDIT.md` — IDE/Hosting/Build-Tool 2026 mit „2x-oder-bleib"-Filter

Code:
- `frontend/src/pages/DesignLabPage.tsx` (NEU, /gekocht-Route)
- `frontend/src/pages/AnimationsLabPage.tsx` (NEU, /animations-Route)
- `frontend/src/App.tsx` — beide Routes wired
- `frontend/src/pages/QQModeratorPage.tsx` — fillTeams API_BASE statt hardcoded /api
- `frontend/vercel.json` — Rewrites von Render auf Hetzner umgepunktet
- `shared/eurovisionTheme.ts` — Stinger Fit als fontFamily für ESC-Theme
- 2× tmp-Files vom Repo-Root entfernt (haben nixpacks-Build gekillt)

Memory:
- `memory/feedback_log_das_trigger.md` — Trigger „log das" definiert
- `memory/MEMORY.md` — Eintrag für Trigger ergänzt

Commits heute (~25 Stück), Highlights:
- `3e515296` /gekocht initial · `e4b4134c` /gekocht v2 (Aurora) · `03be958b` v3 (Stripe-Patterns) · `d5c302ae` v4 (Live-Show + Multi-User)
- `51d5186b` /animations · `bc6e7407` VT-Demo fix
- `f56e7d99` 3 Recherche-MDs · `c22c395c` PERFORMANCE_AUDIT · `cb2f7808` TOOLING_AUDIT · `3243af7f` EMOJI · `0b877fc8` GRID_TENSION
- `8c3976e2` tmp-files cleanup für Hetzner-Build
- `cc9d24b1` vercel.json Rewrite Render→Hetzner

**Offen / Next Steps (morgen):**

Hetzner-Migration ist live + funktioniert (Dummies klappen, PIN klappt). Aber:

- ✅ **CORS-Fix erledigt** (Jojo am 2026-05-07 spät): `ALLOWED_ORIGINS=https://play.cozyquiz.app,https://cozyquiz.app` in Coolify gesetzt + Restart. Direkte Backend-Calls funktionieren wieder.
- ⏳ **1 Woche Beobachtung** — bei nächstem echten Quiz checken ob alles stabil. Render bleibt parallel aktiv.
- ⏳ **Render-Cleanup** nach Stabilität — Service löschen ($7/mo gespart), Render-spezifische ENV-Vars (z. B. RENDER_URL fürs Heartbeat) auf Coolify checken/migrieren.
- ⏳ **ENV-Var-Inventur**: Render-Dashboard hat ggf. mehr ENV-Vars als die 5 die zu Coolify migriert wurden (z. B. SENTRY_DSN). Vor Render-Kündigung abgleichen.

Optionen für morgen, Wolf wählt:

**A. Quick Wins aus PERFORMANCE_AUDIT** *(~6h)*
- AVIF für Wolf-PNGs (Beamer-Cold-Load)
- Vendor-Chunks in `vite.config.ts`
- `font-display: optional` + Nunito-Preload
- `useTransition` im Socket-Handler
- Bundle-Visualizer einmal laufen lassen
- 3 VS Code Extensions installieren (Error Lens / Pretty TS Errors / Console Ninja)
- `bun install` testen

**B. Visual Polish**
- Eine der 5 `/gekocht`-Designs picken + ins Live-CozyQuiz übertragen
- Top-Animations aus `/animations` in echte App
- FluentEmoji integrieren (3D Hero-Icons für Kategorien)

**C. Mechaniken aus GRID_TENSION_IDEAS**
- Sprint 1: Pointless-Multiplier + Jackpot-Rollover + simplified Daily-Double (~1 Tag, alle passiv, Newbie-safe)
- Sprint 2: Final-Frage-Wager (atemloser Schluss)
- Sprint 3: Carcassonne-Cluster-Bonus (größter strategischer Hebel)

**D. Render-Cleanup + ENV-Var-Inventur** *(~30 min)*
- Vor allem nach 1 Woche stabilem Hetzner-Betrieb

Wolfs Hetzner-Migration heute war ein **großer Schritt** — von Free-Tier-Bug-Magnet zu eigenem voll kontrollierten EU-Server. Damit ist eine wichtige Foundation gelegt; ab morgen kann sich der Fokus wieder auf Sichtbares (Design/Mechanik/Animation) verschieben.

---

## 2026-05-08 vormittags · Repo-Diagnose + Roadmap

**Was passiert ist:**

Kurze Morning-Session bevor Jojo Chat verlassen musste (Context voll). Ziel: vor dem Optimieren erst den Ist-Zustand erfassen.

1. **CORS-Fix bestätigt erledigt** (Jojo hat's noch gestern Abend selbst durchgezogen). `ALLOWED_ORIGINS=https://play.cozyquiz.app,https://cozyquiz.app` in Coolify, Restart durch.

2. **Repo-Diagnostics**:
   - `vite.config.ts` ist erstaunlich gut konfiguriert: manualChunks (vendor-react/socket/qrcode/router/canvas + admin/editors), VitePWA mit Auto-Update, Workbox-Caching, korrekte SPA-Fallbacks
   - `frontend/public/` ist **130 MB** total — avatars/ 51 MB · themes/ 21 MB · icons/ 21 MB · sounds/ 19 MB · images/ 9.4 MB · categories/ 6.4 MB
   - Cozywolf-PNGs schon mit sharp -94 % komprimiert (aktuell 13 MB für 22 Posen)
   - **SVG-Originals der Cozywolf-Posen liegen mit im public/-Folder** (~5-6 MB Source-Files, gehören nicht auf Vercel-CDN)
   - **Dead Dependencies in package.json**: `three`, `@react-three/drei`, `@react-three/fiber`, `@react-three/postprocessing`, `postprocessing` — keine Imports im src/ verifiziert. Tree-shaking schützt das Bundle, aber Disk + npm-Bloat. ~600KB-1MB
   - Leaflet bleibt — ist tatsächlich für Pin-It-Mechanik in QQBeamerPage + QQTeamPage genutzt
   - **Bundle-Visualizer fehlt** komplett → blind optimieren
   - **AVIF-Pipeline fehlt** → nur PNG, kein WebP/AVIF-Fallback
   - **useTransition** im Socket-Hook nicht genutzt
   - Vite 5 (nicht 7) — kein Druck zum Upgrade

3. **Web-Recherche-Agent verifiziert**:
   - **AVIF für Vite-React 2026**: Sharp-Script erweitern + `<CozyAvatar>`-Wrapper mit `<picture>`-Tag ist der best fit. Vercel `<Image>` geht nicht mit Vite, `vite-imagetools` overkill. Lohnt sich für First-Paint, ~600 KB Diff zu WebP-only.
   - **Vite manualChunks 2026**: Function-Syntax bleibt, Jojos aktuelle Config ist korrekt (nur node_modules-Pfade — `src/`-Pfade würden React.lazy brechen).
   - **Bundle-Visualizer 2026**: `rollup-plugin-visualizer` mit `template: 'treemap'`, `gzipSize: true, brotliSize: true`. Standard.

4. **`ROADMAP.md`** als langlebige Reference erstellt:
   - Sprint Q1 (Diagnose + Cleanup, ~1h): Bundle-Visualizer einbauen → npm run build → dead deps uninstall → SVG-Originals raus aus public/
   - Sprint Q2 (AVIF-Pipeline, ~1.5h): compress-cozywolf erweitern + `<CozyAvatar>`-Wrapper
   - Sprint Q3 (Polish, ~1h): font-display + useTransition + Doppelklick-Schutz
   - Spätere Sprints: Visual-Polish (Design + Animations + Emoji), Mechaniken (Sprint 1-3 aus GRID_TENSION_IDEAS), Production-Resilience, Render-Cleanup
   - Kontext-Block für nächste Claude-Session

**Entscheidungen:**

- **Sprint Q1 als nächster konkreter Schritt** (Diagnose vor Optimierung).
- AVIF-Approach: eigenes sharp-Script statt Library-Magic.
- Vite-manualChunks wie aktuell lassen (ist 2026 korrekt).
- Dead Three/Three-Helpers können sicher deinstalliert werden.

**Files berührt:**
- `ROADMAP.md` — NEU, Sprint-Plan + Repo-Diagnose + Kontext-Block
- `SESSION_LOG.md` — CORS als erledigt markiert + dieser Eintrag
- Commits: `ca72be20` (CORS done) · `d508d2d4` (ROADMAP)

**Offen / Next Steps:**

- ⏭ **Sprint Q1 starten** sobald nächste Session beginnt (~1h, Newbie-safe)
- ⏳ 1 Woche Hetzner-Beobachtung (bei nächstem echtem Quiz auf Stabilität checken) → dann Render kündigen
- ⏳ Nach Sprint Q1: Daten-getriebener Pick zwischen Q2 (AVIF), Visual-Polish, Mechaniken oder Production-Resilience

Jojo verlässt diesen Chat mit vollem Context. Nächste Session findet alles in Roadmap + Session-Log + Memory. Foundation-Phase ist abgeschlossen — ab nächster Session geht's an die sichtbare Polish-Arbeit.

---

## 2026-05-08 nachmittags+abends · Marathon-Polish + Brand-Refresh + Mod-Focus-Mode

**Was passiert ist:**

Riesiger Tag, 20 Commits. Drei Phasen:

### Phase 1: Performance-Sprints (Q1+Q2+Q3)

1. **Sprint Q1 — Diagnose + Cleanup** (`0f69d9b4`):
   rollup-plugin-visualizer eingebaut, 6 Dead Deps (three/r3f/postprocessing/@types/three) deinstalliert (0 Imports im src/), 4 Cozywolf-SVG-Quellen (4.6 MB) raus aus public/avatars/cozywolf/ in neues assets-source/cozywolf/. Precache 109 287 → 104 658 KiB (-4.5 MB).

2. **Sprint Q2 — AVIF-Pipeline** (`6cca6fa6`):
   compress-cozywolf.js erweitert: Sharp-Promise.all-Fanout zu PNG/WebP/AVIF parallel. <CozyWolfImage>-Wrapper mit <picture>-Tag (avif → webp → png). vite.config.ts globPatterns um avif+webp erweitert für SW-Precache. Format-Bilanz: PNG 196 KB → AVIF 30 KB (-84 %), Total 6.06 MB → 0.94 MB AVIF.

3. **Sprint Q3 — Polish** (`e01043bb`):
   Google-Fonts-Preload-Link in index.html. startTransition() im socket-stateUpdate-Handler. Neuer useActionLock(500)-Hook + 5 Gates auf qq:hotPotatoFinishSlot (3× handleKey + 2× Btn). Doppelklick-Schutz für Hot-Potato-Doppel-Fire-Klasse.

### Phase 2: Lab-Showreels D/C/B/A/H (5 Slots fürs Auswahl-Lab)

4-8. **5 Quiz-Realistic Showreels** (`1ccdaae4` `74ebf730` `d71ceb7f` `d7b34b6f` `b37ec8ab`) in /animations:
   - **Slot D**: Background-Layer-Toggle (Aurora/Mesh/Grain/Fireflies/Heartbeat einzeln an/aus)
   - **Slot C**: CHEESE Winner-Avatar-Drop-Cascade (4 Avatare, 850 ms Stagger, Climax-Glow)
   - **Slot B**: 8-Team Score-Cascade + Position-Swap (Kraken springt #4→#1 mit +28)
   - **Slot A**: Q→Reveal→Next 3-Phasen-Flow (Slide-Choreo zwischen 2 Fragen)
   - **Slot H**: MUCHO 3-Akt-Reveal (Voter-Hops → Lock-Doppelblink → Winner-Pop)

   Wolf brauchte ~15 min für alle 5 — erstes Beispiel wo Estimate-Reflex (5-7 h für AI-Code) deutlich übertrieben war. Memory-Eintrag `feedback_estimates_too_high.md` angelegt: Faktor 10-30× weniger als geschätzt.

### Phase 3: Aurora-Vivid Brand-Refresh (Massiv-Sweep)

9. **/gekocht — 4 Aurora-Varianten mit Brand-Farben** (`65801588`):
   Wolf-Korrektur: Logo ist Pink (Wolf-Body) + Navy (Hoodie) + Magenta (Ring), nicht Amber/Gold wie ich initial fälschlich annahm. Memory `brand_cozywolf_colors.md` angelegt mit korrekten Hex-Codes (Pink #EC4899, Magenta #A21247, Navy #1E2A5A). Dann Café Vintage / Hand-drawn Cozy / Cinematic Noir / Neo-Retro Game Show entfernt, ersetzt durch 4 Aurora-Varianten (Wolf / Vivid / Soft / Bold). Plus auroraDrift-Keyframe entrotaiert (Wolf: „kein Drehen am Background").

10. **/beamer Standard-Theme auf Aurora Vivid** (`c8b98d8b`):
    Wolf-Pick: Aurora Vivid (Pink-Pop + Premium-Karton + Bricolage Grotesque + Inter). COZY_CARD_BG, BG-Solid-Defaults (#0D0A06 → #0A0814), Pause-/PreGame-BG, Font-Cascade alle umgestellt. Hero-Border-Token vorbereitet (für später).

11. **Aurora-Vivid Phase 2** (`2e74ab80`):
    QQ_PHASE_COLORS auf Pink-Eskalation [`#F9A8D4`, `#EC4899`, `#A21247`]. /team Brand-Konsistenz (16 fontFamily-Stellen, BG, Card). Summary-Page Brand-Pink. CozyQuiz-Wordmark in Stinger Fit + Brand-Pink Solo (vorher: nur in ESC-Mode mit × ESC-Logo). Welcome-Overlay-Title + PreGame/Pause-Eyebrow + Lobby-Wordmark.

12. **Aurora-Vivid Phase 3 — Massive Yellow→Pink Sweep** (`5cb48396`):
    Wolf-Findings nach Phase 2 (Setup/Lobby/Welcome noch viel Gold, ThanksView nicht angefasst, Rules-Slides random Farben). Memory `feedback_brand_refresh_checklist.md` angelegt damit Pages künftig nicht vergessen werden. Globale accent-Defaults Pink. ~80 Hex-Werte im Beamer + ~79 in /team via replace_all umgestellt. ThanksView komplett umgebaut. Rules-Slides via neuer RULES_SLIDE_COLOR-Konstante einheitlich Brand-Pink (vorher Blau/Violett/Pink/Rot/Grün/Lila random).

### Phase 4: Welcome-Polish + Bug-Fixes + Phase-Übergänge

13. **A1 + Progress-Tree** (`d8a4fabd`):
    „Heute spielen" Letter-Cascade + Pink-Underline (statt Slide-Down + letter-spacing-tightening). Progress-Tree alle Gold-Stellen → Brand-Pink.

14. **Welcome-Polish + 3 Wolf-Bugfixes** (`7217f7df`):
    Welcome-Wolf+Sprechblase 0.8 s früher rein (3.4s → 2.6s), Greeting Word-Stagger animiert. Bug-Fixes: 4 gewinnt #A78BFA (Lila) → #F87171 (Bunte-Tüte-Rot). Higher-Lower Lower-Card #EF4444 → #EC4899 (Brand-Pink). Finale-Farbe via neuer getRoundColor(phaseIdx, totalPhases)-Helper (4-Element-Array statt 3 mit %3-Modulo, garantiert Magenta für letzte Phase).

15. **Kategorie-Badge** (`4e00f08e`):
    Wolf-Bug: Badge überdeckt Frage-Card. Outer-Wrapper paddingTop 22-50 → 90-130 px → ~30-40 px Gap zwischen Top-Bar und Card.

16. **Phase-Übergänge cinematischer + SFX-Precache** (`6c62a0e8`):
    qqSlideIn-Keyframe upgegradet (420 → 720ms, ease-out-expo, Y-Slide 24px, scale 0.96→1.005-Overshoot). Plus parallel Pink-Lichtsweep (qqPhaseSweep). vite-pwa globPatterns um wav erweitert (SFX-Latenz weg).

17. **Synth Warm-Bus weicher** (`16ea87f1`):
    Wolf-Beschwerde „Sounds zu mechanisch/KI/schrill". Sound-Audit-Agent zeigte: Architektur ist 95 % da (Howler-äquivalent in sounds.ts mit 1300 Zeilen, 8 SFX-Slots, Music-Ducking, Custom-Upload). Lowpass 3500 → 2400 Hz, Q 0.5 → 0.7, IR 0.4s/12% → 0.6s/22% Reverb-Send. Synth-Fallbacks klingen jetzt wärmer.

18. **Phase-Übergänge polish** (`bd6d5d32`):
    Audit-Punkte #1, #4, #5: BeamerOverlay Y-Slide (Welcome/Rules slidet von unten rein statt zu poppen). qqStepSlideIn-Keyframe für Comeback-Steps (slide-from-left). Connections-Avatare droppen mit muchoVoterDrop statt subtler phasePop. #3 (Glue-Sound) ehrlich übersprungen (kein passender Foley-Asset, Synth-Whoosh würde wieder „mechanisch" klingen). #2 (Q→Reveal-Übergang) skipped per Wolf nach Trade-off-Erklärung.

19. **Welcome-Title-Shimmer entfernt** (`7879157c`):
    Wolf-Bug: weißer linear-gradient Sweep über CozyQuiz-Wordmark wirkte „cheap shiny". qqIntroTitleShimmer-Animation komplett raus.

### Phase 5: Mod-Page Refactor (Brand-Refresh + Focus-Mode)

20. **/moderator Brand-Refresh + Settings auto-collapse + F19-Pause** (`4090ee6b`):
    Mod-Page-Audits (Design + Funktionalität) ergaben: Brand-Konsistenz 3/10 (Legacy-Amber statt Aurora-Pink), Layout-Überladung 4/10. ~80 Gold-Hex-Werte umgestellt. qqModeratorTheme.css komplette Token-Palette auf Indigo-Hoodie + Pink (--qm-bg #0d0a06 → #0A0814, --qm-elev → #1F1A2E, --qm-accent #f59e0b → #EC4899). Settings-Card DEFAULT COLLAPSED außerhalb LOBBY (spart 180+ px Höhe). F19 als Streamdeck-Mapping für Pause + Cheatsheet-Eintrag.

21. **/moderator Focus-Mode** (`8063c483`):
    Wolf-Screenshot zeigt: Mod-Page noch zu überladen während QUESTION_ACTIVE. HostNotes phase-aware collapsible (in QUESTION_ACTIVE/REVEAL/PLACEMENT collapsed mit ▸-Indikator, in anderen Phasen offen). Rangliste in neuer CollapsibleRanking-Component (in QUESTION_ACTIVE/REVEAL collapsed, in PAUSED/COMEBACK/etc offen). Spart ~250 px Vertical-Space im Spielmodus.

**Entscheidungen:**

- Aurora Vivid als Standard-Theme (Wolf-Pick aus 5 /gekocht-Varianten)
- Brand-Farben Pink/Magenta/Navy aus Logo extrahiert (nicht Amber wie ich initial annahm)
- Sound-Strategy umgedreht: nicht „MVP from scratch" sondern Quality-Replacement der existierenden WAVs (~95 % Architektur-Reife laut Audit)
- Eurovision-Edition NICHT explizit angefasst (Wolf-Constraint, Live-Termin in 7 Tagen). Vieles tangiert ESC automatisch durch globale Wrapper — Pink-Sweep passt zur ESC-Brand
- Mid-Risk Mod-Refactors (Teams-Compact, Show-Controls-Hide, etc.) bewusst aufgeschoben → `project_post_eurovision_backlog.md` mit 9 Punkten
- Heartbeat-Pulse + Spring-Pop-Reveal übersprungen (existierende UrgencyVignette/phasePop-Patterns reichen)
- #2 Q→Reveal Slide-Transition explizit per Wolf skipped
- #3 Glue-Sound übersprungen (kein passender Foley-Asset)

**Files berührt:**

22 Code-Files (frontend/src/pages/QQBeamerPage.tsx, QQTeamPage.tsx, QQModeratorPage.tsx, QQSummaryPage.tsx, qqDesignTokens.ts, qqShared.ts, qqModeratorTheme.css, components/QQProgressTree.tsx, components/BeamerOverlay.tsx, components/CozyWolfImage.tsx, hooks/useQQSocket.ts, hooks/useActionLock.ts, pages/DesignLabPage.tsx, pages/AnimationsLabPage.tsx, utils/sounds.ts, vite.config.ts, frontend/index.html, scripts/compress-cozywolf.js, …) + Doc-Updates (ROADMAP.md, SESSION_LOG.md, Memory-Files).

Memory-Files neu/erweitert:
- `feedback_estimates_too_high.md` (Faktor 10-30 weniger Aufwand für AI-Code)
- `feedback_brand_refresh_checklist.md` (Pages-Inventur + Workflow)
- `brand_cozywolf_colors.md` (korrekte Brand-Farben aus Logo)
- `project_post_eurovision_backlog.md` (9 aufgeschobene Mod-Refactors)
- MEMORY.md mit Verweisen aktualisiert

20 Commits gepusht (caffafab → 8063c483).

**Offen / Next Steps:**

⏳ **Wolf manuell**:
- Sound-Files (correct/wrong/fanfare/reveal/etc.) anhören und konkrete „klingt schrill"-Replace-Liste machen → wir tauschen sie aus Mixkit/Pixabay/Uppbeat aus
- /beamer + /team + /summary + /moderator live durchspielen, prüfen ob Aurora-Vivid + Pink-Pause + Brand-Wordmark + Focus-Mode-Mod richtig sitzen
- Eurovision-Edition durchspielen — nichts soll dort gebrochen sein (Theme-Token-Pattern sollte alles abdecken). Falls was komisch wirkt: notieren, nach Eurovision-Test ggf. mit `isEsc`-Gate fixen

⏳ **Eurovision Live-Quiz** in 7 Tagen → danach Live-Findings sammeln

⏳ **Post-Eurovision-Backlog** (9 Punkte in `project_post_eurovision_backlog.md`):
- Teams-List Compact-View, Host-Notes Toast, Show-Controls phasenkontextuelles Hide, Settings-Dropdown-Refactor, Undo-Hotkey (Z), Shift+Space Auto-Skip, Streamdeck-Toast, Comeback-Race-Conditions, Question_Active→Reveal Race

⏳ **Hetzner-Beobachtung 1 Woche** (läuft parallel) → dann Render kündigen

⏳ **Optional**:
- Hero-Card-Border-Anwendung an Hauptfrage-/Reveal-/Comeback-Cards (Token COZY_HERO_BORDER ist vorbereitet, Anwendung verschoben)
- Q→Reveal Slide-Übergang (#2 vom Audit) — falls Wolf nach Live-Test sagt der State-Wechsel wirkt zu unsichtbar

Wolf-Marathon heute — von Sprint-Q1-Diagnose über Lab-Showreels über Aurora-Vivid-Brand-Refresh bis Mod-Focus-Mode. App ist live-bereit für Eurovision in 7 Tagen.

---

## 2026-05-08 abends · Slide-Übergänge + Rules-Card + HP-Bugfixes (Nachschlag)

**Was passiert ist:** Nach dem Marathon-Log noch 5 weitere Commits — Animations-Polish + zwei akute HotPotato-Bugs.

22. **Rules-Slides Slide-In** (`2caa466e`):
    Wolf-Wunsch /animations Slot-1 für Rules-Slides. 4 neue qqStageSlideIn{Left,Right}/Out{Left,Right}-Keyframes (generisch in qqShared.ts). Direction-Tracking via useRef in RulesView: idx > prev → forward (von rechts), idx < prev → backward (von links). Card-Mount phasePop → qqStageSlideInRight 0.55 s spring-easing.

23. **Question→Question + Connections-Sub-Phasen Slide** (`2a4171d9`):
    Globaler Phase-Wrapper differenziert: bei `Q-id1` → `Q-id2` (zwei Question-IDs in Folge) qqStageSlideInRight, sonst qqSlideIn (vertikal). ConnectionsBeamerView Wrapper mit `key={cn-{c.phase}}` + qqStageSlideInRight für intro→active→reveal→placement→done. PHASE_INTRO Steps bewusst NICHT angefasst (600+ Zeilen mit komplexem State-Tracking, Risiko vs Win schlecht).

24. **„Now the rules" Card-Format** (`a3ac4745`):
    Wolf-Wunsch: Rules-Intro auch als Card wie die anderen Rules-Slides. Card mit Pink-Border + backdrop-blur statt Full-Bleed, BG-Glow Pink/Magenta statt Blau/Lila, Title kleiner (44-88 px statt 56-120), Eyebrow „Vorbereitung / Get Ready" über Title (analog Rules-Slides „Spielregeln"), Pink-Divider mit Shimmer, Subtitle in Off-White. Welcome → Rules-Intro → Slide-0 sind jetzt drei Cards in Folge — visueller Format-Wechsel aufgehoben.

25. **HL 3D-Slot-Machine zurück** (`ba9b3b00`):
    Wolf hatte Slot-Machine früher rausgenommen wegen Card-Größen-Sprüngen. Jetzt zurück mit fixer Layout-Struktur: Container hat perspective:600 + overflow:hidden, beide Spans (??? + Echt-Zahl) absolute über Hidden-Placeholder → keine Reflows mehr. hlSlotOut (rotateX 0→-90°, translateY 0→-50%, opacity 1→0) + hlSlotIn (rotateX 90°→0°, translateY 50%→0, opacity 0→1, 0.28 s delay).

26. **HP-Autoplay-Mehrfach-Trigger + HP-Layout-Overflow** (`48bab54b`):
    Zwei akute HotPotato-Bugs aus Dummy-Runden:
    - Autoplay triggert qq:hotPotatoFinishSlot >2× (Design ist 2×). Root Cause: autoplayLastFireKeyRef enthielt answers.length etc. — bei state-Updates die andere Felder ändern während hotPotatoSlotState noch beim alten Wert ist, re-runt Effect mit neuem fireKey → kein Dedup. Fix: separater lastHPFireKeyRef der nur qId:slotState trackt.
    - Voter-Chips ragen unten aus Viewport raus seit dem Kategorie-Badge-Padding-Fix (90-130 px paddingTop). HP-Layout (Slot-Machine + Voter-Chips + Winner-Card stacked) braucht mehr Vertical-Space. Fix: paddingTop conditional auf isHotPotatoActive — HP nutzt 60-90 px (Card direkt unter Top-Bar ohne Gap), Standard bleibt 90-130 px.

**Entscheidungen:**
- PHASE_INTRO Steps Slide bewusst aufgeschoben (zu komplex, in Post-Eurovision-Backlog ergänzt? nein, optional)
- Welcome-Card-Flip skip (Wolf: „lass es sein, Letter-Cascade reicht")

**Files berührt:**
- frontend/src/qqShared.ts (qqStageSlideIn{Left,Right}/Out + hlSlotOut/In Keyframes)
- frontend/src/pages/QQBeamerPage.tsx (RulesView Direction-Tracking, Phase-Wrapper Q→Q-Differenzierung, ConnectionsBeamerView Sub-Phase-Wrapper, RulesIntroOverlay Card-Refactor, HL Subject-Value Slot-Machine, isHotPotatoActive paddingTop)
- frontend/src/pages/QQModeratorPage.tsx (lastHPFireKeyRef für HP-Autoplay-Dedup)

**Total Tag: 25 Commits** (caffafab → 48bab54b).

**Wolf zieht weiter — Session-Abschluss.** App ist live-bereit für Eurovision in 6-7 Tagen. Sound-Files-Replace + Live-Test bei nächster Session.

---

## 2026-05-09 — Marathon 2: Final-Wager-Refactor + End-Flow-Reveal + Recap

Direkter Folge-Tag. ~16 Commits (`4ba28633` → `e9ddc68d`). Stand bei Beginn: Final-Wager war Cell-Picker-Skelett, GameOver direkt nach FINAL_REVEAL, Thanks war statisch.

### Was gemacht wurde

1. **Polish-Bugs vom Anfang** (`4ba28633`): idle.svg Wolf-Asset hatte weißen 450×450 BG-Rect (Canva-Export) → sed-strip; Joker-Bonus-Rules-Slide hatte 2 Joker-PNGs (Boy+Girl) als Hero, EN-Mini-Grid hatte fehlende ⭐-Cells; Welcome-Overlay „CozyQuiz" in Pink-Border-App-Card mit `qqIntroWelcomeCard`-Keyframe.

2. **Final-Wager Tipp-Variante** (`a3065857`): Cell-Picker komplett raus. `QQFinalBet = { targetTeamId }`, `QQFinalBetResolution` neu (`targetWins + sympathyBonus + totalBonus + mutualWith`). KEIN Verlust mehr. Per-Frage-Win-Tracking via `qqTickFinalPhaseWin` (Cells-Delta gegen Snapshot). `room.endAwards` (Underdog/Meisterklauer/Speedy) in `qqResolveFinalBets`. /team `FinalBettingCard` als Team-Liste-Picker. Bots: 80%-other / 20%-self.

3. **HP-Halbkreis** (`15098b45`): Reihenfolge nach Scoreboard (bestes zuerst). Slot-Machine raus — Backend setzt direkt 'landed', 1 Mod-Step. 5-Slot-Halbkreis-Layout (-2/-1/0/+1/+2), 3D nach hinten gehend, Active mittig vorne. Bei Wechsel rotieren Slots via 0.85s-transition. Kartoffel-Wurf mit `qqHpPotatoThrow` (1080° Spin + 110px Y-Bogen). Card-Pulse weg (Wolf: „darf sich durch Timer nicht vergrößern").

4. **Pink-Wolf-Tree + Live-Wins-Tracker** (`29115368`, `15098b45`): `pink.png` ersetzt `logo.png` in Progress-Tree, continuous `qqWolfBob`-Loop. Tree-Phasen + /team Phase-Farben auf `getRoundColor` Pink-Eskalation umgestellt. Live-Wins-Tracker → Recap-Slide nach jeder Final-Frage.

5. **3D Card-Reveal für neue Aktionen** (`e688e1ef`): R2 Steal isNew, R3 Stack isNew → Slam face-down (Card-Back: NEU + ✨ + Cross-Hatch) → Settle → Flip 1.0s. Wie TeamsRevealView Slot M.

6. **/team Grid-Sprung-Fix** (`e688e1ef`): Selecting + Mini-Grid hatten unterschiedliche `gridTemplateColumns` — beide auf `1fr + aspect-ratio: 1/1`.

7. **Rules-Audit + neue Slides** (`e688e1ef`): Bunte-Tüte aktualisiert (Reihenfolge→Fix It, CozyGuessr→Pin It, Imposter raus). NEU: 🎰 Final-Tipp + 🤝 Fair Play. totalSlides 9/10 dynamisch.

8. **Wolf-Iter-Fixes-Runde** (`ab9c540e`): Imposter komplett aus Rules + Memory-MD `feature_imposter_disabled.md` fett. ABCD/123 als 🅰🅱🅲🅳 / 1️⃣2️⃣3️⃣ (auch Drift-Partikel). Bottom-Sheet ✕-Button + Drag-Handle als Tap. CozyGuessr pinker Glow-Dot weg. Grüner Submit-Glow von 18px/0.75 → 10px/0.55. Steal #EC4899 → #EF4444. Connect 4 Spoiler-Fix: „Richtig!"-Banner raus, neutral „Tipp eingegangen", Strike-Counter „Versuch X/3".

9. **MUCHO/ZvZ Mini-Sprung** (`4f7807c2`): Border 2px → 3px bei correct = +2px Outer-Höhe content-box default → andere Cards in Row schoben. Fix: `box-sizing: border-box` + einheitliche 3px-Border (Wrong-State transparent).

10. **3 Recap-Varianten + News-Ticker als Wolf-Wahl** (`aff9d135`, `e1ff9417`, `ab6dc58e`): Iter 1: BG-Slideshow / Polaroid-Stack / Filmstrip. Iter 2: Bierdeckel / Vintage-Marquee / Memory-Card-Flip. Wolf-Wahl: News-Ticker mit Filmstrip-Cards aber OHNE Frame (TV-Bauchbinde, 60s linear loop, Edge-Fades).

11. **GameOver-Wolf Toot-Honesty** (`e1ff9417`): „Trööööt!"/„Toooot!" Speech-Bubble-Slogans entfernt — Wolf-Speech und Trompete-Pose laufen auf separaten Cycles, „toot darf er nur sagen wenn er auch trötet".

12. **End-Flow Multi-Step FinalRevealView** (`6bf0292f`): `room.finalRevealStep` (0..2N+8). `qqAdvanceFinalReveal` increments, letzter Step → THANKS direkt. `decodeFinalStep(step, N)` mappt step → kind. TitleHoldSlide → GridRevealSlide (Brett links + Tabelle rechts, Cluster-Highlight Top-1, Sparkle-Bounding-Rect mit `offset-path`) → BetRevealSlide aufsteigend nach Bonus, 0-Bonus mit 🥲 „oooh"-Moment → AwardCardSlide (🥁 Trommelwirbel ???) → AwardRevealSlide (Avatar + +1 Floating) → RankingSlide (Single bis #4, ab #3 Treppchen-Stack, Sieger mit 👑 + jubel-Wolf + Konfetti). **GameOver übersprungen** — Wolfs „Punkte nicht wieder und wieder zeigen".

13. **ThanksView komplett neu** (`ff0b914d`): Hero-Card mittig: Polaroid (-12px Y, schräg, Krone, wackelt) + QR-Code (180px) + Wolf (schlafen, +20px Y) nebeneinander höhen-versetzt. Polaroid: Sieger-Avatar mit pulsierender 👑, Caveat-Cursive „handgeschriebene" Notiz mit Team-Name. News-Ticker-Bauchbinde unten (75s Loop) durch Quiz-History. **Letzte Card im Loop**: 💜 „Besonderer Dank an Sonja fürs Zuhören & Testen — und an Claude fürs Mitbauen 🐺💜🦖".

14. **Mod-Page End-Flow-Status + Brett auf Summary** (`e9ddc68d`): Mod in FINAL_REVEAL: Live-Status `Step X/max · Jetzt: <name> · Space → <next>`. Backend `/api/qq/summary/:roomCode` liefert jetzt `cellOwners + gridSize`. `SummaryBoard`-Component mit Team-Color-Cells, Top-Cluster pulsiert, Mini-Legende drunter.

### Wichtige Entscheidungen

- **Game-Over wird übersprungen.** Direkt von Ranking-Slide → Thanks. Ranking ist der finale Reveal-Moment.
- **Keine Live-Tabelle bei Bet-Reveal/Awards.** Erst beim Ranking kommt alles zusammen — maximaler Suspense.
- **Treppchen-Stack-Kompromiss:** Single-Slide bis Platz 4, ab #3 baut sich Treppchen auf.
- **Imposter ist DEAKTIVIERT** — `feature_imposter_disabled.md` als Memory-MD mit fettem Hinweis.
- **Recap-Variante S = News-Ticker** (Wolf-Wahl). Cards aus dem alten Filmstrip, OHNE Frame, kontinuierlich + flach.
- **Sonja+Claude-Card** als allerletzte Recap-Card im Loop.

### Files (heute massiv berührt)

- `shared/quarterQuizTypes.ts` — QQFinalBet/Resolution refactored, `finalRevealStep`, `finalRecapStep`, `endAwards`, `teamTotalSteals`, `finalPhaseWins`
- `backend/src/quarterQuiz/qqRooms.ts` — qqStartFinalBetting/Submit/Finish/Resolve, `qqAdvanceFinalReveal`, `qqTickFinalPhaseWin`, HP-Order nach Score
- `backend/src/server.ts` — `/api/qq/summary` cellOwners + gridSize
- `frontend/src/pages/QQBeamerPage.tsx` — Multi-Step FinalRevealView komplett neu, neue ThanksView, Mucho-Avatar-Spacing, Mucho/ZvZ Mini-Sprung, Toot-Honesty
- `frontend/src/pages/QQTeamPage.tsx` — FinalBettingCard Team-Picker, Bottom-Sheet ✕, Phase-Farben tokens, Connect 4 Spoiler-Fix, Grid-Sprung-Fix
- `frontend/src/pages/QQModeratorPage.tsx` — Bet-Übersicht Tipp-Targets, End-Flow-Status mit Step-Mapping
- `frontend/src/pages/QQSummaryPage.tsx` — SummaryBoard-Component
- `frontend/src/pages/AnimationsLabPage.tsx` — 3 Recap-Varianten + Iter zu News-Ticker
- `frontend/src/components/QQProgressTree.tsx` — Pink-Wolf-PNG, qqWolfBob
- `frontend/src/qqShared.ts` — qqHp* Animations, qqJokerWiggle, qqWolfBob, qqHpTimerGlow
- `frontend/public/avatars/cozywolf/svg/idle.svg` — weißer Rect raus
- `frontend/public/avatars/cozywolf/pink.png` — neues Asset (Pink-Wolf von Wolf)

### Memory-Files heute

- `feature_imposter_disabled.md` — neuer Eintrag, fett markiert in MEMORY.md

**Total Tag: ~16 Commits** (`4ba28633` → `e9ddc68d`). Alle gepusht.

**App-Stand für Eurovision (in 5-6 Tagen):** Final-Wager-Mechanik live-bereit, End-Flow als geschlossene Choreo durchspielbar, Thanks-Outro mit Recap. `/mopo`-Page für Mobile-Mod kommt als Folge-Task.

---

## 2026-05-09 — Marathon-Tag: TODO-Liste + Thanks/Recap/FinalReveal-Refactor + Designer-Audit

**Tageslauf**: ~7 Stunden Live-Iteration mit Wolf, ~30 Commits, 10 Bug-TODOs aus Live-Test-Feedback abgehakt + 9 Design-Iterationen Thanks-Page (v3 → v12) + Final-Reveal-Choreografie überarbeitet + Summary-Page-Konsistenz + Designer-Audit als Abschluss.

### Was passiert ist (chronologisch)

**Block A — Vormittag, TODO-Liste aus Live-Test 2026-05-08**

1. **TODO 10 Autoplay-Stop bei Final-Standings** (`84e50c05`): Wolf-Klärung „durchlaufen, nicht stoppen". Stop-Block raus, im PLACEMENT-Case `inFinalRecap ? 8000 : 3500` ms damit Score-Cascade Lese-Zeit hat.
2. **TODO 5/6/7 Thanks-Page v2** (`06c21fd5`): Polaroid-Layout-Pivot, Avatar-Bug-Fix (`size="70%"` → absolute Pixel weil CSS font-size:% relativ zu Parent ist nicht Container-Width → 6.7px Mini-Glyph), questionHistory in Live-State (war nur in Summary-Save → 3× Sonja stuck-Look).
3. **TODO 9 Autoplay R3 Card-Skip** (`9db05f14`): R3 Stack-Card (isNew @idx 2) fertig erst bei 7350ms, Autoplay schaltete bei 5500ms → Card-Skip. Delay ph-abhängig (R1 5850 / R2 7350 / R3 8850 / R4 5750).
4. **TODO 1+2+3 Quick-Wins** (`bf33e613`): 🏯 → 🔒 für gestackte Felder (Picker + Mini-Map), Bluff-Sub-Emoji im Recap (Backend `bunteTueteKind` in History + Live-State), Standings-Text-Bump v3 (rowH 78→92 / 92→108 / 110→130).
5. **TODO 4 Standings-Performance** (`4335da9f`): Bei N=8 Teams 8 parallele rAF-Loops mit setState → 8× Re-Renders pro Frame. Fix: direct DOM-Manipulation via useRef.textContent + style.color, KEIN setState. Plus `contain: layout paint style` auf Team-Rows.
6. **TODO 8 Award-3D-Reveal + Bet-Cascade** (`b4bdf72e`): 6 Award-Steps → 4 (Overview-Slide mit 3 Cards + 3 Flips). 3D-Flip identisch dimensioniert via `min-height clamp 360-540`. Bet-Reveal mit Per-Team-Cascade per animation-delay (Team 0s → Tipp +0.55s → Punkte +1.1s).
7. **Treppchen-Refactor** (`77a9c310`): Vorher Treppchen ab rankIndex>=2. Wolf-Spec: Plätze N..3 prominent + verschwinden, Platz 2 Treppchen-Stub mit Platz 3, Platz 1 voll-Treppchen mit Sieger-Lücke + Stufen-Höhen.

**Block B — Mittag/Nachmittag, Thanks-Page Design-Iterationen v3 → v12**

8. **Thanks v3** (`3cf48cf3`): Polaroid → runder Sticker (Sonjas Wunsch). Team-color radial-gradient als BG.
9. **Custom Wolf-Head-Asset** (`507ac2f8`): generisches 🐺 → dediziertes head-only-PNG aus Wolfs Desktop. 890KB → 20KB / 10KB / 7.5KB via sharp.
10. **Thanks v4** (`5bca21f7`): Sieger-Sticker → Action-Card-Stil. Awards raus aus Card → in News-Ticker. Wolf-Decoration weiter rechts. Custom Wolf-Asset überall (Brand-Footer, Get-Ready, Reveal-Hint, Sonja-Card).
11. **/thanks-test Standalone-Page** (`0aeb5732`): Mock-State mit Toggle DE/EN, 3/5/8 Teams, Award-Sets. Plus README + MEMORY auf Coolify (Backend von Render migriert).
12. **Thanks v5** (`7e4c1c42`): 3 Spalten EXAKT gleich groß via flex 1 1 0 + alignItems stretch. ThanksColumnCard-Helper.
13. **Tree-Slides v6** (`d709bdd7`): pro Phase eine große Slide mit RUNDE-Header + 5 Cat-Kreise + überlappende Winner-Avatare.
14. **Flat Pill-Strip v7** (`1a534edf`): Wolf-Refinement — alles in flat durchlaufendem Strip. Phase-Pills VOR Cat-Pills, gleichmäßiger Abstand.
15. **Action-Card-Größen + Connect-4** (`0d14de71`): Stack-Card vs Place/Steal Drift gefixt mit `height: 360` fix. Connect-4 Winner-Card kompakt wie CHEESE/MUCHO.
16. **Pills v8 einheitlich** (`26ad0e41`): alle Recap-Items folgen Sonja/Claude-Pattern. BadgeCircle-Helper. Sonja-„fürs Testen" → „fürs Zuhören".
17. **Wrap + Recap-Speed** (`9d6d22ed`): Sieger-Name Wrap auf 2 Zeilen + dynamische FontSize. Tick-Speed 3.5s → 7s, will-change transform.
18. **Layout v9 + Award-Wrap** (`335dfad4`): Outer in Top (flex 1 mittig) + Bottom-Bereich aufgesplittet. Subtitle-Font einheitlich `inherit`. Award-Card Team-Name Wrap.
19. **Summary-Awards-Konsistenz** (`c15f48a3`): Backend `endAwards` ins Save-Payload. Summary Superlatives = die 3 Recap-Awards. Pill-Hierarchie umgekehrt.
20. **cozywolf-Subtitle 2-zeilig** (`30149483`): „cozywolf bedankt sich" abgeschnitten. Fix: Stinger Fit Brand-Font + Pink + Glow oben, „bedankt sich" drunter.
21. **Variante 3 + Seva-Pill** (`c39b601c`): Cat-Pills nur Badge ohne Text. Alle Pills strict gleiche Width via PILL_WIDTH. Plus dritte Thanks-Pill für Seva 🛟.
22. **Summary Insta-Pill** (`2b6885ab`): klickbarer Instagram-Brand-Gradient-Pill in Summary-TopBar.
23. **COZYWOLF caps + SCAN MICH** (`d601d0ef`): Brand-konsistent uppercase + 2-zeilig analog Wolf-Block.
24. **Sieger-Spalte 2-zeilig** (`c2f341c3`): Team-Name groß einzeilig in Team-Farbe + „haben gewonnen" drunter — alle 3 Spalten gleiche Komposition.
25. **Cat-Pill Kontext** (`c0a88f48`): Wolf-Pivot zurück zu mehr Info — 3-Element (Cat-Badge + Cat-Name + Winner-Avatar mit Krone 👑). Pure-Variante-3 war zu kryptisch.

**Block C — Designer-Audit + Vercel-Limit**

26. Designer-Audit (general-purpose Agent in Designer-Persona) — kritische Außensicht. Memory `project_designer_audit_2026_05_09.md` mit Top-3-Stärken, P0/P1/P2-Findings, mutige Refactor-Idee (Treppchen-Komprimierung).
27. **Vercel-Hobby-Limit** (100 deployments/24h): nach commit `30149483` reached, letzte 4 Commits stuck. Pro-Plan-Empfehlung für Live-Quizzes.

### Wichtige Entscheidungen
- **Backend ist auf Coolify, NICHT mehr Render** (Wolf-Migration).
- **Custom Wolf-Head-Asset** ersetzt 🐺 in Brand-UI, NICHT in semantischen Stat-Awards.
- **Sonja-Subtitle** „fürs Zuhören" statt „fürs Testen".
- **Cat-Pill mit 3-Element-Layout** (nicht pure-minimal). Variante 3 ohne Text war zu kryptisch.
- **Summary-Ehrentitel = die 3 Recap-Awards** (Underdog/Meisterklauer/Speedy) — konsistent zwischen Beamer + Phone.
- **Vercel auf Pro upgraden** vor Live-Quizzes — Hobby-Limit ist bei Iteration-Sessions zu schnell weg.

### Designer-Audit Top-Findings
**Gesamteinschätzung**: mechanisch sauber, emotional flach — kein klarer Crescendo-Moment.

**P0**: Sieger-Slide kein Crescendo-Delta · Thanks-Card 3 gleichgewichtige Hero-Spalten · Recap-Strip ~30 Pills monoton

**P1**: Award-Flip identisch L→M→R · Brand-Subs konkurrieren mit Sieger-Name · BetReveal 0-Bonus „🥲 oooh" verstößt Anti-Shaming · PodiumStep ellipsed Names · Summary-Underdog-Metric exponiert Score

**Mutige Idee**: Treppchen-Reveal komprimieren — alle Avatare gleichzeitig auf Bühne, synchron auf Stufen, Drumroll-Spotlight, Sieger fällt in Mitte-Lücke. **1 grandioser Moment statt 7 mittelschöne**.

Vollständig: `~/.claude/.../memory/project_designer_audit_2026_05_09.md`

### Files (heute massiv berührt)
- `frontend/src/pages/QQBeamerPage.tsx` — ThanksView v3→v12, FinalRevealView-Refactors, ActionCardReveal-Größen, OnlyConnect-Winner, Recap-Strip 8 Iterationen
- `frontend/src/pages/QQTeamPage.tsx` — Schloss-Symbol auf gestackten Cells
- `frontend/src/pages/QQModeratorPage.tsx` — Autoplay-Delays
- `frontend/src/pages/QQSummaryPage.tsx` — Ehrentitel + Insta-TopBar-Pill
- `frontend/src/components/WolfHeadIcon.tsx` — neu (Custom-Wolf Inline-Component)
- `frontend/src/pages/QQThanksTestPage.tsx` — neu (Standalone-Vorschau)
- `frontend/public/avatars/cozywolf/head.{png,webp,avif}` — neu (256px head-only)
- `backend/src/quarterQuiz/qqRooms.ts` — questionHistory + endAwards in Live-State, FinalReveal max-step 2N+6
- `backend/src/quarterQuiz/qqSocketHandlers.ts` — endAwards ins Save
- `backend/src/server.ts` — endAwards aus Summary-Endpoint
- `shared/quarterQuizTypes.ts` — Type-Updates
- `README.md` + `MEMORY.md` — Coolify-Migration-Doku

### Memory-Files heute
- `feedback_askuserquestion_clarifications.md` — neu (Wolf liebt Klick-Klärungen)
- `project_designer_audit_2026_05_09.md` — neu (Audit-Output)
- `user_workload_state.md` — 7h-Marathon-Update

**Total Tag**: ~30 Commits (`84e50c05` → `c0a88f48`). Alle gepusht. **Vercel stuck nach `30149483`** — 24h-Reset oder Pro-Upgrade.

**Stand für nächste Session**: Endgame handwerklich solide, dramaturgisch ausbaufähig. Designer-Audit zeigt klare P0-Hebel. Vor Live-Quizzes: Vercel Pro + die 3 P0-Findings. Mutige Treppchen-Komprimierung als optional-Big-Hit-Refactor.

---

## 2026-05-09 — Crescendo v4 + Race v5 (Designer-Audit-Followup)

**Tageslauf (Abend)**: Designer-Audit gab 7,4/10 — P0 #1 Sieger-Crescendo wurde direkt angegangen. Erst v4 Crescendo (3 Steps Stage/Fill/Drop) gebaut, dann Wolf-Pivot zu v5 Race-Metapher (1 Auto-Choreo) nach Brainstorm + Speed-Lines-Mockup.

### Was passiert ist

**Crescendo v4** (`cedfffa5`):
- Backend `qqFinalRevealMaxStep` 2N+6 → N+9
- 3 neue Slides: PodiumStageSlide / PodiumFillSlide / WinnerDropSlide
- Mod-Steps von 22 (N=8) auf 17 reduziert
- 6 Keyframes: qqFRWinnerSlotPulse / qqFRWinnerDrop / qqFRCrownDrop / qqFRCrownWobble / qqFRPodiumLoserFade / qqFRPodiumStepIn
- `/finalreveal-test` Standalone-Page mit Step-Slider + Quick-Jumps + Replay-Button

**Race v5** (`559888f0`):
- Wolf-Brainstorm: „alle racen wie ein Rennen mit Schweif, fallen gestaffelt zurück"
- Speed-Lines-Mockup-Bild als Visual-Referenz: Avatare on-the-spot mit vertikalen Speed-Lines drunter
- Backend N+9 → N+7 (1 Auto-Choreo statt 3 Mod-Steps)
- RaceFinalSlide mit phase-state-machine (race / staggered-fall / p3-podium / p2-final-race / p2-podium / winner-slowmo / finish)
- Auto-Choreo via setTimeout-Cascade (~12-15s je nach N)
- Sub-Components: RaceTeamUnit (Avatar + Bob-Anim) + RaceSpeedLines (7 vertikale Striche)
- 5 neue Keyframes: qqRaceBob / qqRaceTrail / qqRaceFallOut / qqRaceWinnerSlowMo / qqRaceWinnerSnap
- Mod-Steps N=8: 15 (war 17 in v4, war 22 vor Crescendo)

**Race v5.1 Bugfix + mehr Dynamik** (`<this commit>`):
- Wolf-Bug: Speed-Lines erst bei 2 Teams sichtbar, nicht bei vollem Race
- Root: SpeedLines absolute-positioned hatte `top: 50%` + `width: avatarSize`
  → bei eng angeordneten flex-Children kollidierten die Layouts
- Fix: SpeedLines IM FLOW als regulärer flex-child direkt unter Avatar
  (Avatar oben → SpeedLines mitte → Name unten als 3-Stack)
- Plus mehr Dynamik:
  - qqRaceBob Amplitude -8px → -14px, 4-Step-Curve statt 2-Step,
    leichter Scale-Pulse (1 → 1.03)
  - qqRaceTrail schneller (0.4s statt 0.6s), mehr scaleY-Range (0.7-1.25)
  - Bob-Duration 1.6s → 1.0s
  - 7 Striche statt 6, dichter (gap clamp 3-7)

### Wichtige Entscheidungen
- **Race-Metapher schlägt Crescendo-Drop**: bessere Narrativität für Pub-Publikum, „wer kommt als erstes ins Ziel" universell verstanden.
- **1 Auto-Choreo statt 3 Mod-Steps**: weniger Streamdeck-Tap-Last, mehr Drama-Build innerhalb des Steps.
- **Stationäre Race**: Avatare bewegen sich nicht horizontal, Speed-Lines suggerieren Bewegung. Löst N=8-Crowding ohne Position-Tracking.
- **Slow-Mo-Sieger schwebt über Ziellinie** vor Snap aufs Treppchen — Wolf-Wahl statt direktem Snap.
- **Trail SOFORT weg wenn Team fällt** (klares „aus dem Rennen"-Signal) — Wolf-Wahl statt synchronem Fade.
- **Legacy-Components** (PodiumStageSlide / PodiumFillSlide / WinnerDropSlide aus v4) bleiben im Code als Reference, sind unused.

### Files
- `backend/src/quarterQuiz/qqRooms.ts` — qqFinalRevealMaxStep N+7
- `frontend/src/pages/QQBeamerPage.tsx` — RaceFinalSlide + RaceTeamUnit + RaceSpeedLines, 5 neue Keyframes, decodeFinalStep race-final
- `frontend/src/pages/QQFinalRevealTestPage.tsx` — neu (Standalone-Test mit Step-Slider, Quick-Jumps, Replay-Button)
- `frontend/src/App.tsx` — Route `/finalreveal-test`
- `frontend/src/pages/MenuPage.tsx` — Menu-Eintrag „🎬 FinalReveal Test"

### Memory-Files
- `project_designer_audit_2026_05_09.md` — bleibt aktuell, P0 #1 ist abgehakt durch Race v5
- (kein neues Memory-File — nur Code-Iterationen)

**Stand**: Race-Final ist im echten Quiz drin (Backend + Frontend Code). Aber Coolify Backend muss redeployed werden (qqFinalRevealMaxStep changed) + Vercel deploy hängt am 24h-Limit. Test-Page funktioniert ohne Backend-Deploy → Wolf nutzt sie für visuelle Iteration.

**Nächste Iteration**: nach Vercel-Reset / Pro-Upgrade visuell live testen. Restliche Audit-Findings (P0 #2 Thanks-Hero-Hierarchie, P0 #3 Recap-Strip-Monotonie, P1 Award-Flip / Brand-Subs / 0-Bonus / PodiumStep / Summary-Underdog, P2 Crown-Bob / Insta-Footer-Pill) als Picklist offen.

---

## 2026-05-10 — Thanks-Refactor-Marathon + Summary-Audit + cozywolf.de Brand-Refresh

**Tageslauf**: Großer Polish-Tag. Thanks-Page ging durch ~7 Layout-Iterationen (Kreis-schließen, Mock, Setup-Spiegel, finaler PausedView-Mirror), dann Summary-Page-Audit mit allen P0/P1/P2 fertiggestellt, Menu um Test-Pages-Untermenü erweitert, /team Joker-Pragma, Z-Hotkey für Undo-Mark-Correct, Treppchen-Win-Page minimal aufgehübscht, und am Ende cozywolf.de komplett auf Brand-Pink + reduzierte v2-Texte umgebaut.

### ThanksView — 7 Iterationen bis zur Final-Form

**v1 (`193e8293`)**: Lobby-Spiegelung — Wordmark + 2-Col QR-links/Teams-rechts. Wolfs Reaktion: „Setup hatte ich anders gemeint, das war der Mock."

**v2 (`640ef553`)**: 3-Col-Mock zurückgeholt (Events/Sieger/Awards), schöner ausgebaut, Wolf-Schlafen unten links ohne Bubble. Wolfs Reaktion: nicht ganz, ich will mehr Setup-Look.

**v3 (`c80b96a6`)**: Setup-Style-BG außenrum, Wolf top-right wie Setup, DANKE FÜRS SPIELEN ohne BG-Pill, Awards weg, links Events / rechts Insta+QR. Wolfs Reaktion: passt fast, aber pages sollen IDENTISCH sein wie Setup.

**v4 (`d7756f39`)**: Komplett auf PausedView/PreGameView-Struktur umgebaut — Ambient-Ring-Light + Wolf bottom-LEFT in schlafen-Mode + Big-Card mit fixed-height + SVG Star-Border-Trace + Inner-Shimmer-Strip. Wolfs Reaktion: super, jetzt nur noch kleine Anpassungen.

**v5 (`6f923478`)**: Events-Block raus (todo.md als Later), QR-Text neu „Scannt + Insta", Subtitle „Wir hoffen ihr hattet Spaß" zurück.

**v6 (`0a97f9a9`)**: Sieger-Avatar +20%, „Team / Name / hat heute gewonnen" statt „haben gewonnen", Punkte-Pille raus, QR top-right außerhalb Card, PreGame-Atmo-Effekte (BgBreath + Spotlight + Fall-Particles).

**v7-final (`377a43a1`, `6b017c26`, `837ed56c`)**: Wolf-Feedback-Iterationen:
- COZYQUIZ-Eyebrow all-caps, Title kürzer „Danke für's Spielen!", Subtitle 2-zeilig
- Spotlight-Sweep raus (Wolf: „1/3 screen, abgeschnitten")
- Border-Sparkle deutlicher (stroke 2.5→4px, dasharray '24 76', drop-shadow-Glow)
- 30-Sek-Wir-lesen-Zeile raus
- **QR Co-Hero-Refactor nach Designer-Recherche** (TED, Google I/O, Eventbrite, B2B MarketingProfs):
  - 104px Mini-Marker → 280-320px Co-Hero in der Card
  - Brand-Logo embedded via imageSettings + level='H'
  - qqThanksQrPulse (scale 1.00→1.03, 2.4s)
  - Benefit-CTA „Feedback + auf Insta folgen"
  - Erwartbar: Scan-Rate 5-10% → 30-50%

### Summary-Page Audit-Fixes (`dbc506b6`)

Kompletter P0-P2-Sweep:
- **P0 Brand-Refresh**: 13× Amber/Gold (#fbbf24/#FBBF24/#FDE68A/#FDE047) → Brand-Pink. Neuer `summaryBrand()`-Helper analog QQBeamerPage.getBrandColors. Refresh in: Shell-BG-Mesh, TopBar-LangToggle-active, Hero-Border + Champion-Color, StammCode-Box, Place-Label, Funny-Answer-Box, Superlatives 'DAS SEID IHR'-Pin, jokersEarned-Stat-Color, UpcomingEvents-Date, PartnerCTA komplett.
- **P1 Web-Share-Button**: `navigator.share()` mit Fallback Clipboard-Copy, Brand-Gradient-Pill im Team-Detail-Hero (Acquisition-Hebel im Stats-Moment).
- **P1 RAF-Leak-Fix**: `useCountUp.animateTo` gibt jetzt Cleanup zurück, useEffect callt `cancelAnimationFrame` — keine Zahlen-Glitches bei Team-/Lang-Wechsel.
- **P2 Eurovision-Mode-Aware**: Backend reicht `eurovisionMode` durch (war seit Commit 4090ee6b in DB persistiert, nur nicht ausgegeben). Frontend rendert ESC-Hot-Pink (#FF2D7B) statt Brand-Pink im ESC-Mode.
- **P2 lang-stale-closure-Fix**: `error` von `string | null` auf `errorKey: 'notFoundMsg' | 'loadError' | null` — Translation passiert im Render mit aktuellem lang.

### Summary-Test-Page + Menu-Untermenü + /team-Pragma (`3715483d`)

- **QQSummaryPage** akzeptiert jetzt optional `mockSummary`-Prop (skip REST-Fetch).
- **QQSummaryTestPage** neu unter `/summary-test` mit Sticky-Toolbar (Teams 3/5/8, Awards alle/nur-1/keine, ESC-Mode an/aus).
- **MenuPage** umstrukturiert: neues 'CozyQuiz · Test-Pages'-Panel (Pink-Akzent #EC4899) mit Thanks-Test, Treppchen-Test, Summary-Test, Avatar-Picker. Aus „Extras" rausgezogen.
- **/team Joker-Pragma-Patch** (Live-Test-Bug 2026-05-07): zusätzlicher Gate `myJokersThisPhase > 0` auf isJoker. Schließt false-positive aus, blockiert ersten Joker einer Runde NICHT.

### Z-Hotkey + Undo-Mark-Correct (`aa6ebaf6`)

- `KeyZ` im QUESTION_REVEAL macht letzten Mark-Correct rückgängig (nur aktiv wenn `s.correctTeamId` gesetzt). Backend-Event existierte schon, war nur an Maus-Button gebunden.
- Cheatsheet: „Z — Letzten Mark-Correct rückgängig" in „Team als korrekt markieren"-Gruppe ergänzt.

### Treppchen-Win-Page Polish

Im aktuellen Race-Final am Anfang der Session: Confetti-Storm wurde gewählt nach AskUserQuestion (Option C — Treppchen größer + Confetti-Storm), Recherche aber nicht zu Ende gebracht weil Wolf zur Thanks-Page redirected hat. **Status: nicht umgesetzt, Win-Page bleibt wie sie war.**

### cozywolf.de Brand-Refresh (`2dbbf9e` in cozyquizapp/cozywolf-landing)

Komplette Landing-Page-Überarbeitung in einem separaten Repo:
- **Pfad**: `c:/Users/hornu/Desktop/desktop/cozywolf-landing` — siehe [COZYWOLF_LANDING.md](COZYWOLF_LANDING.md)
- **Brand-Refresh**: Amber/Gold → Brand-Pink (#EC4899) + Magenta + Navy + #0A0814 BG. Cross-Hatch-Pattern-Overlay subtle. Pink-Pulse auf Primary-CTA.
- **Texte v2 reduziert**: Pub-spezifisch raus (offen für alle Locations), 3 Cards statt 4 Features (Bis zu 8 Teams · 5 Kategorien · Punkte wie noch nie), „Für alle, die Lust auf spannende Quiz-Runden und interessante Fakten haben" als Quote, Booking-Disclaimer „Aktuell baue ich CozyQuiz noch auf — wenn du Interesse hast, schreib mir".
- **Layout**: 4 Sektionen (Hero · 3-Cards · Quote · Booking) statt 6. DE+EN Translations beide updated. Lang-Switcher Pink-Active statt Amber.
- **Vercel**: Repo `cozyquizapp/cozywolf-landing` → wenn der Branch-Hook auf `master` zeigt, deployt automatisch.

### Wichtige Entscheidungen
- **Thanks-Page = 1:1 PausedView-Mirror** war der richtige Move — visuelle Konsistenz Setup ↔ Thanks schließt den Kreis ohne dass „Setup-Spiegel-Spielereien" nötig waren.
- **Brand-Pink ist jetzt voll konsequent**: ThanksView, RulesIntro, BetReveal (frühere Commits) + Summary-Page + cozywolf.de = überall #EC4899. Kein Amber mehr in der gesamten User-Journey.
- **Designer-Recherche-driven Decisions** zahlen sich aus: QR-Co-Hero-Empfehlung (TED/Google I/O-Pattern) statt mein erster Vorschlag „rechts oben Mini-Marker" → erwartbar 4-5× Scan-Rate.
- **Memory-Vorsicht ist gerechtfertigt**: 3-Tage-alte Audit-Followup-Memory hatte Zeilen-Nummern verschoben — Polish-Punkte wären wahrscheinlich auf falsche Stellen gegangen. Audit-Followups sollten frisch durchgeführt werden, nicht aus alten Memos.

### Files
- `frontend/src/pages/QQBeamerPage.tsx` — ThanksView 7 Iterationen
- `frontend/src/pages/QQSummaryPage.tsx` — kompletter Audit-Fix (+186/-60)
- `frontend/src/pages/QQSummaryTestPage.tsx` — neu
- `frontend/src/pages/QQModeratorPage.tsx` — Z-Hotkey + Cheatsheet
- `frontend/src/pages/QQTeamPage.tsx` — Joker-Pragma
- `frontend/src/pages/MenuPage.tsx` — Test-Pages-Untermenü
- `frontend/src/App.tsx` — Route `/summary-test`
- `backend/src/server.ts` — eurovisionMode im Summary-Endpoint
- `todo.md` — Events-Block-Slot als „Later"
- `COZYWOLF_LANDING.md` — neu, Pfad-Doku
- `c:/Users/hornu/Desktop/desktop/cozywolf-landing/src/App.tsx` — komplett neu (separate Repo)
- `c:/Users/hornu/Desktop/desktop/cozywolf-landing/index.html` — meta-tags

### Memory-Files Updates
- Keine neuen Memory-Files in diesem Marathon (Polish-Day, keine architektonischen Erkenntnisse).
- `MEMORY.md` sollte um `COZYWOLF_LANDING.md`-Verweis ergänzt werden (mache ich jetzt).

**Stand**: Live-ready für Pub-Quiz-Test. ThanksView + Summary + cozywolf.de sind konsistent Brand-Pink. Alle gefährlichen Polish-Punkte (Brand-Bugs, false-positives, RAF-Leak, Lang-Stale-Closure) sind raus. Mod-Page hat Z-Undo-Hotkey für Live-Korrekturen. Test-Pages erreichbar via Menu für Stand-Alone-Visual-Iteration ohne ein echtes Quiz durchziehen zu müssen.

**Offen**: Treppchen-Win-Page Confetti-Storm-Refactor (Wolf-Wahl Option C), 4 spekulative Animation-Easings + 5 Layout-Cap-Bumps aus 3-Tage-altem Audit (Zeilen-Nummern unsicher — bei Live-Repro punktuell fixen), Mod-Page-Refactors aus Post-Eurovision-Backlog (Teams-Compact, Host-Toast, Show-Hide, Settings-Refactor, Shift+Space, Streamdeck-Toast, Comeback-Race-Lock, Question→Reveal-Race), Impressum + Datenschutz-Pages für cozywolf.de (Footer-Links zeigen auf `#`), `hallo@cozywolf.de`-Mail einrichten und Frontend-Konstante updaten.

---

## 2026-05-10 (spät) — Live-Test-Sweep + Audits + Mail-Setup + Legal-Pages

**Tageslauf**: Nach Wolfs erstem Live-Test 11 Findings durchgezogen — 7 direkt gefixt, 4 mit ausführlichen Audits/Strategien dokumentiert. Plus Mail-Setup (`hallo@cozywolf.de` via Strato→ImprovMX→Gmail), Impressum + Datenschutz auf beiden Sites mit „Im Aufbau"-Banner, Stable Summary-Links (by-id), /team Audit-Fixes (Ack-Toast + Brand-Pink), Summary-Test-Page + Menu-Untermenü.

### Live-Test-Findings (11)

✅ **L1** Pre-Rules-Welcome-Overlay raus (doppelt mit Lobby-Greeter)
✅ **L2** `ph→f`-Normalisierung — Saxofon/Saxophone matchen jetzt
✅ **L3** Substring-Min-Ratio 0.5 — „stadium" für Wembley Stadium blockiert
✅ **L5** HotPotato-Chips top-aligned (kein Overlap mit Trivia-Trio)
✅ **L7** Comeback NEW-Card gleiche Größe wie Steal-Card (`height: 360`, `alignSelf: stretch` raus)
✅ **L8** Mu-Cho Winner-Banner kompakter (Avatar 8vw→7vw, Padding/Font ~15-20% kleiner)
✅ **L9** 10v10 vertikal-mittig (`minHeight: clamp(280px,38vh,460px)` + `alignContent: center`)

🟡 **L4 = L10** (Wolf-Klarstellung): Final-Lock-View „Grösstes Gebiet". **Strategie**: Placement-Page-Layout kopieren + Sieger-Cells erhellen. ~30-60min beim nächsten Mal.

🔍 **L6 Joker-Bug — Audit dokumentiert in todo.md**: Top-Hypothese = Re-Detection nach Steal-Roundtrip. `detectNewJokers` qualifiziert als NEU sobald `cells.some(p => isNeverCounted)` — bei Steal/Swap wird `jokerCounted=false` resettet → identisches 2x2 kann später wieder triggern. Debug-Schritte: DevTools-State-Snapshot von `grid[r][c].jokerFormed/jokerCounted/ownerId` für die 4 betroffenen Cells.

🔍 **L11 Autoplay — Audit dokumentiert in todo.md**: Top-Verdacht „skippt Events" = FINAL_REVEAL-Step-Mapping in `QQModeratorPage.tsx:556-594` ist vor Race-Final-Refactor (`559888f0`) und rechnet mit `2N+8` statt `betSlotsCount+5`. Race-Final-Step (12-15s) bekommt 3.2s Ranking-Delay → Race wird geskippt. Top-Verdacht „manchmal gar nicht" = kein useEffect-Return-Cleanup im Outer-Effect → Timer überleben Unmount/Phase-Wechsel. Fix-Vorschläge in todo.md mit Aufwand-Schätzung.

### Mail-Setup `hallo@cozywolf.de` ✅

- Strato-MX-Records auf ImprovMX (`mx1.improvmx.com` prio hoch, `mx2.improvmx.com` prio niedrig — Strato-UI-Mapping war counter-intuitiv)
- SPF-TXT-Record `v=spf1 include:spf.improvmx.com ~all` auf Apex-Domain
- Inbox-Forwarding zu `cozyquiz.app@gmail.com` getestet, läuft
- `EMAIL`-Konstante in beiden Repos getauscht (LegalPage + QQLandingPage + LandingPage + cozywolf-landing)

### Legal-Pages auf beiden Sites ✅

- `play.cozyquiz.app/impressum` + `/datenschutz` via `LegalPage.tsx` + Route
- `cozywolf.de/impressum` + `/datenschutz` via `LegalPage.tsx` + pathname-Mini-Router + `vercel.json` SPA-Rewrites
- **Placeholder-Modus aktiv** mit „⚠️ Im Aufbau"-Banner — Klar-Name + Anschrift via `{...}`-Slots, ergänzt sobald Gewerbe-Anmeldung steht
- DDG §5 + DSGVO Art. 6/13 + TDDDG §25 Abs. 2 abgedeckt nach e-Recht24-Standard. Aufsichtsbehörde Hamburg.
- Disclaimer: ist kein anwaltlicher Rat, vor Pitch nochmal review

### Stable Summary-Links (Option A) ✅

- Backend: `lastGameResultId` im Room-State + state-update, neuer Endpoint `/api/qq/summary/by-id/:gameId`
- Frontend: Route `/summary/by-id/:gameId` + Param-Erkennung im QQSummaryPage
- ThanksView baut QR mit `/summary/by-id/{id}` (Fallback auf roomCode wenn id noch nicht da)
- DB hat kein TTL — alte Spiele bleiben unbegrenzt persistiert, lookup über 200 letzte limit

### /team Audit-Fixes (P0-1 + P0-2) ✅

- **Ack-Error-Toast**: `safeEmit()`-Wrapper + `AckErrorToast`-Component (window-event-basiert, 3.2s Pink-Toast oben + Haptic). 25+ Action-Sites umgeschrieben. Vorher: TIMER_EXPIRED/WRONG_PHASE/NOT_YOUR_TURN silent gedroppt, Spieler dachte Submit ging durch. Erwartbar: spürbarer Quality-Lift.
- **Brand-Refresh**: 6× Amber-Hardcodes → Brand-Pink (`#fde68a` → `#FBCFE8`, Hint-Card-BG, Thanks-CTA-Shadow `#B45309` → `#A21247`, Focus-Outline-Amber in main.css → Brand-Pink). Olympia-Medaillen + Trophy-Gold semantisch korrekt belassen.

### Summary-Test-Page + Menu-Untermenü ✅

- `/summary-test` Route mit Sticky-Toolbar (Teams 3/5/8, Awards alle/nur-1/keine, ESC-Mode an/aus)
- QQSummaryPage akzeptiert optional `mockSummary`-Prop (skip REST-Fetch)
- MenuPage: neues 'CozyQuiz · Test-Pages'-Panel (Pink-Akzent) mit Thanks/Treppchen/Summary/Avatar-Picker

### /team Joker-Pragma-Patch + Z-Hotkey ✅

- `myJokersThisPhase > 0` Gate auf isJoker — schließt false-positive aus
- `KeyZ` im QUESTION_REVEAL ruft `qq:undoMarkCorrect` (war bisher nur Maus-Button)

### Files (heute)
- `frontend/src/pages/QQBeamerPage.tsx` (L1, L5, L7, L8, L9, ThanksView-Iterationen)
- `frontend/src/pages/QQTeamPage.tsx` (Ack-Toast + Brand + Joker-Pragma + L2-Saxofon-Match indirekt)
- `frontend/src/pages/QQModeratorPage.tsx` (Z-Hotkey)
- `frontend/src/pages/QQSummaryPage.tsx` (Audit-Fixes, mockSummary-Prop)
- `frontend/src/pages/QQSummaryTestPage.tsx` (neu)
- `frontend/src/pages/LegalPage.tsx` (neu, Impressum + Datenschutz für play.cozyquiz.app)
- `frontend/src/pages/MenuPage.tsx` (Test-Pages-Sub-Panel)
- `frontend/src/pages/QQLandingPage.tsx`, `LandingPage.tsx` (Mail-Adresse)
- `frontend/src/App.tsx` (Routes: /summary/by-id/:gameId, /summary-test, /impressum, /datenschutz)
- `frontend/src/main.css` (Focus-Outline Brand-Pink)
- `backend/src/server.ts` (`/api/qq/summary/by-id/:gameId`, eurovisionMode im Summary)
- `backend/src/quarterQuiz/qqSocketHandlers.ts` (lastGameResultId in persistGameResult)
- `backend/src/quarterQuiz/qqRooms.ts` (lastGameResultId im state-update)
- `shared/quarterQuizTypes.ts` (lastGameResultId)
- `shared/textNormalization.ts` (L2 ph→f + L3 Substring-Min-Ratio)
- `c:/Users/hornu/Desktop/desktop/cozywolf-landing/src/App.tsx` + `LegalPage.tsx` + `main.tsx` + `vercel.json` (Brand-Refresh + Legal-Pages + Mail-Adresse)
- `todo.md` + `SESSION_LOG.md` + `COZYWOLF_LANDING.md`

### Memory-Files
- `reference_cozywolf_landing.md` neu (Pfad zum separaten Repo)
- Andere Memories blieben — keine architektonischen Erkenntnisse die festgehalten werden müssen.

**Stand bei Chat-Wechsel**: Live-ready für nächsten Pub-Test. ⚠️ Coolify-Backend muss redeployed werden (Backend-Änderungen in qqRooms.ts, qqSocketHandlers.ts, server.ts, textNormalization.ts). 4 offene Live-Test-Findings (L4=L10, L6, L11) sind in todo.md mit ausführlichen Audit-Ergebnissen + Debug-Schritten dokumentiert.

**Nächste Session-Empfehlung**: L11 Autoplay-Fix-1 (FINAL_REVEAL-Mapping, ~30min, P0) + Fix-2 (Cleanup, 10-20min, P0) zuerst angehen — fixt das spürbare „Race wird geskippt"-Symptom. Dann L10 (Grösstes-Gebiet-Layout, 30-60min). L6 erst wenn Wolf das Joker-Symptom wieder live einfangen kann mit DevTools-Snapshot.


---

## 2026-05-12 — Massive Layout-/State-Audit-Session (38 Commits)

**Was passiert** — Marathon-Tag mit ~38 Commits. Drei zusammenhängende Threads:

### 1. Pre-Audit-Fixes (Wolf-Live-Feedback während des Tages)

Kategorien-Cluster:
- **Per-Draft-Drift Root Cause (75e800e)** — `finalWagerEnabled` + `connectionsEnabled` wurden nicht in `qqStartGame` resetted. Wolf's „manche drafts haben kein bid/race" war kein Draft-Problem sondern Room-State-Leak im SINGLE_SESSION_MODE.
- **Action-Card 6. Anfrage (8cd33b3)** — `qqGsTeamSlam` animierte scale 2→1.18→0.96→1 über 1.4s. Sibling-Width-Drift bis 18 %. Fix: scale-freies `qqActionCardSlam` Keyframe.
- **Stack-Indicator Avatare nicht-überlappend (af5bce6)** — kleinere Avatare + Offsets ±28%/±26% diagonal/triangle.
- **Lobby preGame Layout (mehrere Commits)** — CozyQuiz oben absolute, „Gleich geht's los" unten absolute, Records-Card mittig im Flex.
- **Bid-Emoji konsistent 🪙 (af16e29)** — kein 🎰 mehr in Bid-Context.
- **Team-Namen einzeilig mit Ellipsis (6ca4e37)** — kein „Pubqua tscher"-Wrap mehr.
- **Wolf-Sprung Progress-Tree (28b5c26)** — Sweep endet auf `totalPhases - 1` statt `showcaseStepCount - 1` (= Bieten).
- **Hot Potato Layout (multiple Iterations)** — innerJustify flex-start statt center, Tier-Schwellen tightened, chips-block flex-basis 0.
- **Bottom-Left Kategorie-Badge ganz entfernt (b27e26d)** — Kategorie erkennbar via Question-Card-Border + PhaseIntro.

### 2. SlideStage Option A — Fixed-Canvas-System (Feature-Flag)

Wolf wollte „echte" zentrale Lösung gegen Card-Rausstehen. Phase 1 + 2 in einem Schwung:
- **Phase 1 (ec93c5a)** — SlideStage Component wrappt Phase-Render im fixen 1920×1080 Canvas mit transform:scale. Feature-Flag `?stage=1` ODER localStorage `qq_useStage='1'`. Default AUS → exakter vorheriger Zustand.
- **containerType:size auf SlideStage Inner (998acf2)** — Vorbereitung für Phase 2.
- **Phase 2 (3a22d72)** — sed-Migration `1040× vh/vw → cqh/cqw` in QQBeamerPage.tsx. Browser-Fallback (cqh ohne sized container = svh = vh auf Desktop) garantiert kein Verhaltens-Bruch bei Stage AUS.

**Doku in qqDesignTokens.ts**: 7 Slide-Layout-Regeln (min-height:0 Chain, --qq-safe-margin Token, SlotTransition, Animation-Scale-Safety, Sibling-Width-Consistency, Z_INDEX-Zonen).

### 3. 5-Parallel-Audit Sweep (Wolf: „schick alle audits durch")

Wolf wollte Wurzel-Ursachen statt iteratives Raten. Spawn 5 Explore-Agents parallel:

| Audit | Befund | Fix |
|---|---|---|
| **E (557ce8f)** | ~30 Felder im Room leakten zwischen Spielen (SINGLE_SESSION_MODE) | Massiver Reset-Sweep in qqStartGame |
| **B (90c1b94)** | AutoFitContent useLayoutEffect-deps `[children]` → infinite Re-Cascade. Chip-Keys mit Index instabil | Deps `[minScale]`, Keys reiner Text |
| **A (95fb79e)** | HP-Reveal Answer-Container 58cqh zu groß für 1080p + chipShiftVh Dead-Code (Legacy vh) | 52cqh + Dead-Code raus |
| **D (9ef8e6d)** | `revealCorrectPop` Keyframe hatte scale(1.06) Peak → MUCHO/ZvZ/CustomSlide Width-Drift | scale-frei, nur box-shadow pulse |
| **C (9e6578e)** | AutoFitContent fundamental fragil (zoom layout-affecting, scrollHeight returned skalierte Werte) | AutoFit komplett entsorgt, SlideStage als Single-Source |

### Entscheidungen
- **SlideStage statt AutoFit als Skalierungs-Architektur** — Single-Source-of-Truth statt zwei konkurrierender Systeme. SlideStage deterministischer (1920×1080 fixed Canvas), AutoFit hatte Browser-Quirks die nicht zuverlässig gefixt werden konnten.
- **Phase 2 cqh-Migration via sed statt incremental** — 1040 Stellen auf einen Schwung, weil cqh→vh-Fallback transparent ist und kein Verhaltens-Bruch entsteht.
- **revealCorrectPop globaler Fix statt Variant** — alle 4 Use-Sites profitieren ohne Code-Änderung der Sites selbst.
- **5 parallele Audits via Explore-Agents** — statt Wolf-im-Dialog: konkrete Wurzel-Ursachen-Reports zurück, dann sequenzielle Fixes mit klarer Reihenfolge (E zuerst wegen höchstem Impact).

### Open
- ⚠️ **Coolify Backend Redeploy nötig** für Fix E (State-Reset) und Fix vom Vormittag (per-draft-drift in qqStartGame). Frontend (Vercel) deployed automatisch.
- ⚠️ **Wolf testet live** mit allen 5 Audit-Fixes — observation outstanding ob Symptome (Loop-Cascade, Survivor-Card-Clipping, Bid-Drift, HP-Eliminated-Leak) wirklich weg sind.
- **?stage=1 Feature-Flag** noch unter-getestet. Wenn live OK, könnte das der dauerhafte Mode werden (= deterministische Beamer-Skalierung).
- **Future incremental**: andere Views (FinalRevealView, GameOverView, ThanksView) gelegentlich auf min-height:0 + cqh-Math prüfen wenn Layout-Bugs auftauchen.

### Files
**Backend:**
- `backend/src/quarterQuiz/qqRooms.ts` — qqStartGame State-Reset (Fix E), finalWagerEnabled/connectionsEnabled Reset
- `backend/src/quarterQuiz/qqSocketHandlers.ts` — persistGameResult Idempotenz-Guard (5e05437)
- `backend/src/server.ts` — Summary 409 gameRunning (296dfff)

**Frontend:**
- `frontend/src/pages/QQBeamerPage.tsx` — Major refactors: SlideStage, vh/vw→cqh/cqw, AutoFit raus, HP-Layout, Lobby-Hero, Kategorie-Badge weg, Stack-Avatar, etc.
- `frontend/src/pages/QQTeamPage.tsx` — Lobby-Sweep + Sticky-Submit (vorherige Sessions, hier nicht-touched)
- `frontend/src/components/QQProgressTree.tsx` — Wolf-Sprung Bid→Phase N Fix
- `frontend/src/qqShared.ts` — revealCorrectPop scale-frei (Fix D)
- `frontend/src/qqDesignTokens.ts` — Z_INDEX-Zonen + 7 Slide-Layout-Regeln Doku
- `frontend/src/main.css` — --qq-safe-margin Token, Easing-Vars

### Memory
- Memory-Files unverändert — die heutigen Audit-Findings sind primär code-dokumentiert (Kommentare in qqDesignTokens) statt memory-pflichtig. Wenn nach Live-Test ein neues Pattern offensichtlich wird, dann memory.

**Stand bei Chat-Wechsel**: Frontend gepusht (Vercel deployed auto). Backend wartet auf Wolf's Coolify-Redeploy. Wolf hat angekündigt „teste gleich mal alles" — Live-Findings outstanding.

**Nächste Session-Empfehlung**: 
1. Coolify-Redeploy verifizieren bevor Wolf live testet (State-Reset von Fix E)
2. Bei Live-Test Reproduktions-Steps für verbleibende Bugs sammeln
3. Wenn Stage-Flag stable: localStorage default-AN setzen für Beamer-Geräte

---

## 2026-05-13 — Beamer-Refactor Phase 1–6 (KOMPLETT) + Live-Test-Fixes + neue Test-Page

**Tageslauf**: Marathon-Session ~30 Commits. Drei thematische Bloecke:

### 1. Beamer-Refactor Phase 1–6 — 20 Extraktionen, QQBeamerPage 22.728 → 5.016 Z. (−78%)

Strategie aus 3 parallel laufenden Audits (Web-Recherche, Component-Inventar, Sub-Components-Dependency-Audit):
**Strangler-Fig + Internal-Module-Pattern** — QQBeamerPage bleibt API-stabile Facade, alle 22 grossen Components leben jetzt in `components/CozyQuiz*.tsx`. Externe Importer (QQBuiltinSlide, 4 Test-Pages, QQModeratorPage) brechen nicht. BEAMER_CSS-Keyframes zentral in qqShared (Single-Source).

**Phase 1 (Pure Leaves, 4 Commits)** — `601fbc0a`–`548bf627`:
- CozyQuizBeamerTimer.tsx (130 Z.)
- CozyQuizAmbient.tsx (Fireflies + EurovisionHearts + FF + ESC_HEART_NODES, 112 Z.)
- CozyQuizCategoryParticles.tsx (57 Z.)
- CozyQuizUrgencyVignette.tsx (59 Z.)

**Phase 2 (Mid-Risk, 3 Commits)** — `751c9c08`–`5722e85d`:
- CozyQuizConfettiOverlay.tsx (59 Z., mit CONFETTI_COLORS-Const)
- CozyQuizGridDisplay.tsx (597 Z., + MiniGrid Dead-Code in QQBeamerPage geloescht)
- CozyQuizScoreBar.tsx (366 Z., FLIP-Reorder-Animation inkl.)

**Phase 3 (Smaller Views, 3 Commits)** — `4ede3656`–`92cf0c24`:
- CozyQuizRulesView.tsx (615 Z., + buildRulesSlidesDe/En + RulesMiniGrid)
- CozyQuizPlacementView.tsx (228 Z.)
- CozyQuizComebackView.tsx (911 Z., + SlotMachineNumber, WolfUeberraschtWithBubble re-imported)

**Phase 4 (Mittlere Views, 4 Commits)** — `3ae4fe6c`–`bbc95588`:
- CozyQuizThanksView.tsx (564 Z., AnimatedCozyWolf/WolfCoModerator exportiert)
- CozyQuizGameOverView.tsx (680 Z., + WolfJubelWithBubble; SpeechBubble + Slogan type exportiert)
- CozyQuizConnectionsBeamerView.tsx (515 Z., + 6 Sub-Helpers)
- CozyQuizFinalBettingView.tsx (107 Z.)

**Phase 5 (Bigger Views, 3 Commits)** — `cc1c8003`–`4395e68e`:
- CozyQuizLobbyView.tsx (800 Z., + WolfLobbyGreeter)
- CozyQuizTeamsRevealView.tsx (543 Z.)
- CozyQuizPausedView.tsx (1.500 Z., + BrandLoopPanel + PAUSE_CAT_ACCENT; LeaderEntry/FunStats Types + RoundMiniTree exportiert)

**Phase 6 (Bug-Hot-Spots, 3 Commits)** — `9b1c3e6c`–`ff25db5f`:
- CozyQuizFinalRevealView.tsx (2.435 Z., + 20 Final-Helpers — FinalRoundRecapSlide, RecapScoreTickup, FinalWinsTracker, decodeFinalStep, SlotTransition, BetSlotTransition, FinalRevealSharedKeyframes, TitleHoldSlide, GridRevealSlide, BetRevealSlide, AwardsOverviewSlide, BetZeroGroupSlide, AwardFlipCard, RaceFinishHero, RaceFinalSlide, RaceTeamUnit, RaceSpeedLines, RaceStarryBackground, RaceCountdownOverlay, PodiumStepFinal + AWARD_DEFS + Types)
- CozyQuizQuestionView.tsx (6.321 Z., DER GROESSTE — + 14 Reveal-Sub-Components: TeamAnswerReveal, BluffBeamerView, BluffRevealHero, BluffTimer, BluffWriteScreen, BluffReviewScreen, BluffVoteWaitingScreen, BluffVoteScreen, OnlyConnectBeamerView, Top5Reveal, OrderReveal, SchaetzchenReveal, CozyGuessrReveal + Map-Wrapper; HotPotato* + MuchoOptionsReveal re-imported)
- CozyQuizPhaseIntroView.tsx (1.231 Z., + RoundMiniTree + PHASE_INTRO_TIMING)

### 2. Live-Test-Bugs während des Refactors gefixt

- **HP Reihenfolge im Halbkreis falsch** (`3dae033f`): Backend broadcastete `_hotPotatoOrder` nicht ins Frontend → Frontend fiel auf alphabetische Name-Sortierung zurueck, mismatcht mit Backend-Rotation. Fix: `hotPotatoOrder` ins QQStateUpdate. Plus HP-Chip-Overlap bei kleinem Screen: Tier-Schwellen aggressiver gesenkt, Active-Card-Container min-Hoehe 210→260px.
- **Glow-Cutoff am Slide-Rand** (`c25832bb`): Audit ergab `overflow:'hidden'` auf 7 Phase-Wrappers war doppelt-gemoppelt — body-scroll wird bereits durch html/body in main.css verhindert. Fix: SlideStage outer overflow:clip + 120px clipMargin, BeamerView root + QuestionView outer auf visible.
- **ZvZ Chip-Crop + Stack-Avatar Math-Bug** (`3e41cf78`): Voter-Chip Padding 2px→6px + lineHeight:1 (low-number bets nicht mehr unten gecuttet). Stapel-Avatar transform-translate(%) war prozentual zur Avatar-Eigengroesse, nicht cellSize → Fix mit Pixel-Translates basierend auf cellSize.
- **Slide-Rand sichtbar bei 16:10-Beamern** (`50346209`): bei Aspect-Ratio !== 16:9 war body-bg (#050505) am Letterbox-Rand sichtbar — SlideStage outer kriegt jetzt selbst `#0A0814` als Background.

### 3. Bugs nach Refactor-Test + Polish-Runde

- **3 Bugs nach Phase 1–3** (`fe37ddec`):
  - Bieten-Dot pink dauerhaft im Progress-Tree → default-state neutral, pink nur waehrend isBiddingActive
  - Emojis auf Grid-Cells falsch platziert (sichtbar nach unten-rechts verschoben) → Avatar-Outer-Wrapper auf `position: absolute, inset: 0` + flex-centering (war `position: relative` mit 0×0 collapse)
  - Glow hart geclippt am Stage-Rand → overflowClipMargin 120 → 1000px
- **Cheese-Avatar-Groesse + globaler Text-Shadow-Kill** (`44bfcc93`):
  - Cheese-Landscape Avatare 48/54/60 → 80/88/96 (= gleich wie Question-Footer)
  - GLOBAL Text-Shadow-Halo-Bug: `*:not([style*="rgba(0,0"]):not([style*="0,0,0"]) { text-shadow: none !important; }` in main.css — killt 130+ farbige Glow-textShadows, schwarze Lesbarkeits-Shadows bleiben. Recherche-Audit fand Smoking-Gun: Wolf hatte das Problem vor 8 Tagen schon mal gemeldet, Fix war damals nur in GameOverView punktuell.
- **Higher/Lower Layout** (`5ed5e10e`): Timer von bottom-right → top-right, Parent-padding-top 16→80-140px (Cards rutschen tiefer), Higher-Avatar Y-Translate −440 → −550 (Avatar oberhalb der MEHR-Pille statt auf dem Text).
- **Stack-Avatar diagonal + PausedView Autoplay** (`b75329e1`):
  - 2-Stack: Offsets ±25 (avatarCenter genau zwischen cellCenter und cellCorner), avFactor 0.42→0.48 (groesser)
  - 3-Stack: Dreieck → DIAGONALE Linie (TL, center, BR), avFactor 0.36→0.38
  - PausedView Autoplay-Bug: useEffect-deps `[panels.length]` triggerte beim async funStats-Load multiple setInterval-Resets → Counter erreichte nie 8s. Fix: setInterval einmal bei Mount, panels.length ueber useRef.
- **/hl-test Standalone-Test-Page** (`9366314e`): Comeback Higher/Lower live testbar im /menu. Toggle: 1/2/3/5 Teams, Frage/Reveal-Phasen, Higher/Lower-Choice, Submitted-Counter, 4 Pair-Beispiele, DE/EN.

**Entscheidungen**:
- Strangler-Fig + Internal-Module-Pattern als Architektur (aus Web-Recherche-Audit, statt Big-Bang-Rewrite)
- Bottom-up Extraktion: kleinste Leaves zuerst → Bug-Hot-Spots zuletzt (Vertrauen aufbauen)
- Naming: `components/CozyQuiz*.tsx` (Wolf-Branding statt QQ-Prefix bei neuen Files)
- ESM-circular bei function-exports konsequent genutzt (AnimatedCozyWolf, WolfCoModerator, SpeechBubble, HotPotato*, MuchoOptionsReveal, RoundMiniTree, FinalRoundRecapSlide, WolfUeberraschtWithBubble exportiert aus QQBeamerPage)
- Globaler Text-Shadow-Kill via CSS-Selector statt 130 Inline-Edits

**Bilanz**:
- QQBeamerPage.tsx: 22.728 → 5.016 Zeilen (−17.712, −78%)
- 20 neue Files in `components/CozyQuiz*.tsx`
- TS-Checks durchgehend gruen, kein Live-Bug durch Refactor verursacht
- Bug-Fix-Speed jetzt sichtbar besser: 2-5 Tool-Calls statt 15-20

**Open**:
- Andere grosse Pages noch nicht refactored: QQTeamPage (8.072 Z.), QQModeratorPage (5.428 Z.), QQBuilderPage (3.292 Z.), AnimationsLabPage (3.500 Z.)
- ESLint `import/no-cycle` als CI-Gate noch nicht aktiviert (war im Audit-Plan)
- Backend Coolify-Redeploy noetig fuer hotPotatoOrder-broadcast (siehe `3dae033f`)

**Files**: 20 neue CozyQuiz*.tsx + cozyQuizShared.ts + QQBeamerPage.tsx (Facade) + QQHigherLowerTestPage.tsx + MenuPage.tsx + App.tsx + main.css + QQProgressTree.tsx + CozyQuizGridDisplay.tsx + shared/quarterQuizTypes.ts + backend/qqRooms.ts + backend/server.ts.

**Memory-Note**: `feedback_log_das_trigger.md` ausgefuehrt; Commit + Push folgt direkt nach diesem Append.

---

## 2026-05-13 (spaet) — Polish-Nachschlag + QQTeamPage Refactor-Start

Nach dem grossen Beamer-Refactor heute morgen folgte ein Polish-Block plus
der erste Schritt am naechsten Monolithen (QQTeamPage 8.072 Z.).

### Polish nach Beamer-Refactor
- **/hl-test Standalone-Page** (`9366314e`): Comeback-Higher/Lower live im
  /menu testbar. Toggle: 1/2/3/5 Teams, Frage/Reveal-Phasen, Higher/Lower-
  Choice, Submitted-Counter, 4 Pair-Beispiele, DE/EN.
- **HL-Layout v2** (`31cbba46`): Vorheriger Avatar-Y-Higher (-550) zu weit,
  Avatar landete IN Frage-Card. Jetzt parent-padding-top 160-240px (Cards-
  Block rutscht tiefer) + Y-Higher moderat (-380 to -300). Avatar landet
  in der LUECKE zwischen Frage-Card und MEHR-Pille.
- **SESSION_LOG-Eintrag** (`6b8c7f77`) fuer den Refactor-Tag.

### App-Inventar (Wolf-Frage 'was groesste Files')
- QQTeamPage.tsx: 8.072 Z. — 🔴 live-kritisch (Spieler-Phone)
- QQModeratorPage.tsx: 5.428 Z. — 🟡 Wolf taeglich
- QQBuilderPage.tsx: 3.292 Z. — 🟡 wichtig
- AnimationsLabPage.tsx: 3.500 Z. — 🟢 nur Dev
- Refactored Files (CozyQuiz*) zwischen 57-2.435 Z., schon klein-genug.

### QQTeamPage Phase 1.1 — Mini-Primitives extrahiert
- **CozyQuizTeamPrimitives.tsx** (`377862ee`): CozyCard + CozyBtn + StepLabel
  + StatChip raus. 90 Z. neue Datei. QQTeamPage 8.072 → 8.014 (-58).
  Generische, presentation-only Components ohne Game-State.

### FinalRevealView 3 Bugs (`50d64635`)
- **Wolf im Weg**: TRÖÖT-Wolf-Decoration `bottom-right` → `top-right`
  (clamp 70-120px top). Sitzt jetzt oben rechts neben Test-Panel, blockiert
  das Podium nicht mehr.
- **Sichtbarer Rand der Stage**: SlideStage outer-bg `#0A0814` → `#0F0817`,
  matched RaceFinalSlide-Aussenring (rgba(15,8,23,0.98)) exakt. Die 5/4/3
  RGB-Differenz war als duenne Rahmen-Linie sichtbar.
- **Wimpel verlassen das Band**: Individuelle qqFRPennantFlap-Animation pro
  `<path>` rotierte Wimpel sichtbar weg vom Bogen-String. Entfernt — jetzt
  schwingt nur das gesamte SVG-Banner via qqFRPennantWave. Faehnchen + Band
  bewegen sich gemeinsam.

**Open**:
- QQTeamPage Phase 1 weiter: AnimatedDots, CopyButton, MobileFireflies,
  TeamTimerBar, Input-Primitives (StandardInput, SubmitBtn, SubmittedBadge)
- Phase 2-5 fuer QQTeamPage steht noch (~50+ inline Components total).
- Backend Coolify-Redeploy noch immer offen (hotPotatoOrder-broadcast).

**Memory-Note**: Wolf-Trigger 'du darfst loggen' = SESSION_LOG-Append + Push.
Chat-Voll-Hinweis von Wolf — Session-End naht.

---

## 2026-05-13 (ganz spaet) — HL-Layout v3 + Beamer-Rand finaler Fix

### HL-Layout v3 — Frage-Card oben festgepinnt
Vorherige v1/v2 Tuning-Versuche (Y-Higher von -440 → -550 → -380) griffen
nicht — Avatar landete immer wieder auf irgendwas. Strukturelle Loesung:
parent justifyContent center → flex-start + Frage-Card `marginBottom:auto`.
Damit sitzt Frage-Card oben fest, Anchor/VS/Subject + Team-Progress werden
an den parent-bottom geschubst. Grosser Spalt zwischen Frage-Card und
MEHR-Pille — Avatar landet darin ohne jemals zu ueberlappen.
Y-Higher auf moderat -250/-200 reduziert (Card-Row ist jetzt naeher am
Team-Progress-Block).
File: `components/CozyQuizComebackView.tsx`

### Beamer-Rand finaler Fix
Dritter Versuch (`87254c00`): `.cozy-beamer-shell` in main.css hatte
`background: #0d1117 !important`, Stage-Outer im SlideStage hatte
`#0F0817`. Die 2/9/0 RGB-Differenz war als duenner Saum zwischen Letterbox-
Bereich und Stage-Innenflaeche sichtbar. Jetzt alle drei Layer auf
`#0F0817`: body:has(.cozy-beamer-shell), .cozy-beamer-shell, SlideStage
outer-bg. Kein Uebergang mehr sichtbar.
File: `main.css`

**Memory-Note**: Trigger 'log das noch nach fix' = SESSION_LOG-Append +
Push. Chat-Wechsel naht (Wolf-Hinweis).

**Open**: QQTeamPage-Refactor weiter (Phase 1.2: AnimatedDots + CopyButton
+ MobileFireflies + TeamTimerBar + Input-Primitives).

---

## 2026-05-13 (allerletzter Nachtrag) — Rand-Fix Versuch #4: toter CSS-Selektor entlarvt

Wolfs „Rand ist immer noch da" zum 4. Mal — Versuche #1 (Stage-Outer
#0A0814 → #0F0817), #2 (.cozy-beamer-shell → #0F0817) hatten alle 0 Effekt.

Root Cause: `.cozy-beamer-shell` ist ein **toter Selektor**. In main.css
mehrfach gestylt, aber `grep -rn "cozy-beamer-shell" --include="*.tsx"`
ergibt NULL Treffer. Die Klasse wird nirgendwo im JSX gesetzt — nur in
CSS angesprochen. Vermutlich Legacy-Rest aus einer alten Beamer-Wrapper-
Architektur.

Der echte Hook: `document.body.classList.add('qq-active')` in QQBeamerPage,
QQModeratorPage, QQModPortablePage beim Mount (`grep qq-active` zeigt's
sofort). `body.qq-active { background: #0F0817 }` matched jetzt
Letterbox-Streifen mit Stage-Innenflaeche. Commit `a040d057`.

**Lesson:** Bei „CSS-Fix hat keinen Effekt"-Bug erst grep'pen ob der
Selektor ueberhaupt im DOM gesetzt wird, bevor man am Style schraubt.

**Open**: QQTeamPage-Refactor Phase 1 weiter (AnimatedDots, CopyButton,
MobileFireflies, TeamTimerBar, Input-Primitives).

---

## 2026-05-13 (Marathon-Session bis spät) — QQTeamPage 8k → 2.3k + 9 Bug-Fixes + Eurovision-Spec

Längste produktive Session bisher. Ein einziger Refactor-Strang (QQTeamPage Phase 1.2 → 3.4) **plus** 9 Bug-Fixes (3 davon strukturell statt Stochern), **plus** eine Eurovision-Quiz-Spec für externe KI am Ende.

### QQTeamPage-Refactor — 10 Phasen in einer Session

8.072 → 2.282 Zeilen (**−5.790 / −72 %**) über 10 saubere Strangler-Fig-Cuts. 12 neue Files, alle <500 Z., presentation-fokussiert, tsc durchgehend grün.

| Phase | Cut | −Zeilen | Files |
|---|---|---|---|
| 1.2 | AnimatedDots / CopyButton / MobileFireflies / TeamTimerBar | −439 | erweitert `CozyQuizTeamPrimitives.tsx` |
| 1.3 | StandardInput / SubmitBtn / SubmittedBadge | −205 | neu `CozyQuizTeamInputs.tsx` |
| 1.4 | HelpModal / LeaveQuizConfirm / ReactionPad / MobileEurovisionHearts / AckErrorToast | −358 | neu `CozyQuizTeamOverlays.tsx`, `utils/qqTeamAckBus.ts` |
| 2.1 | callback-Inputs: TextInput / MuchoInput / AllInInput / Top5Input / FixItInput + `useExpiry`-Hook | −320 | neu `CozyQuizTeamQuestionInputs.tsx`, `hooks/useExpiry.ts` |
| 2.2 | emit-Inputs: HotPotato / Bluff / OnlyConnect / Imposter / PinIt + safeEmit ausgegliedert | −743 | neu `CozyQuizTeamEmitInputs.tsx`, `qqTeamAckBus.ts` ergänzt |
| 3.1 | 8 Phase-Cards (Lobby / Rules / TeamsReveal / PhaseIntro / Paused / FinalBetting / FinalRecapHint / FinalReveal / GameOver) + Stamm-Code-Helper | −953 | neu `CozyQuizTeamPhaseCards.tsx`, `utils/qqStammCode.ts` |
| 3.2 | QuestionCard + AnswerInput-Router + hashString | −830 | neu `CozyQuizTeamQuestionCard.tsx` |
| 3.3 | Action-Cards: PlacementCard / ComebackCard / ConnectionsTeamCard / Timer | −1.441 | neu `CozyQuizTeamActionCards.tsx` |
| 3.4 | TeamBottomSheetMenu | −443 | neu `CozyQuizTeamBottomSheet.tsx` |

Pattern in jeder Phase: 1) extern referenzierte Dependencies grep'pen, 2) self-contained Block kopieren mit PowerShell, 3) function → export function, 4) Translation-strings inline (kein t-Dependency-Drift), 5) tsc clean, 6) commit + push.

### 3 strukturelle Bug-Fixes — statt Stochern

#### a) HL-Avatar 8.-Fix — strukturelle Anker statt translate-Distance
Vorher: Avatare in Team-Progress-Row unten, mit `translate(0, clamp(-260px, -19cqh, -200px))` für `higher`-Choice — versuchte "blind" die MEHR-Pille zu treffen. Bei minHeight clamp(280-400px) Container war -260px zu wenig → Avatar landete auf WENIGER. Wolf hatte das 7× gefixt durch translate-Justierung — typisches Stocher-Pattern.

Fix: Avatare strukturell an den Pillen geanchored im selben flex-column-Stack. MEHR-Gruppe: Avatar-Higher-Row über MEHR-Pille (negative margin-bottom für leichte Card-Überlappung). WENIGER-Gruppe: WENIGER-Pille über Avatar-Lower-Row. Geometrie im DOM codiert, kein Pixel-Raten.

v5 danach (Wolf-Designspec via Screenshot): 3-Slot-Säule — Unentschiedene zwischen den Pillen (Team-Color-Glow), Higher oben grün, Lower unten pink.

v6 (FLIP-Animation): Säule auf CSS-Grid umgebaut (5 rows, alle Avatare als direkte Children) + `useLayoutEffect`-Hook misst boundingRect-Diff + applied invertierten Transform + animiert 600ms zurück zu 0. Smooth Glide statt Snap.

File: `CozyQuizComebackView.tsx`.

#### b) Joker-Bug — Pattern-Selection nach just-placed-Cell
Vorher: `detectNewJokers` liefert alle qualifizierten Patterns geometrisch oben-links → unten-rechts. `handleJokerDetection` nimmt das erste Pattern. Wenn ein älteres Pattern durch Steal/Re-Steal wieder `jokerCounted=false` bekam, schnappte es sich den Joker vor dem gerade gewonnenen Pattern. Live-Test: Wolf schließt 2×2 oben rechts, Sterne erscheinen auf altem 2×2 mittig.

Fix: Vor der Selektion sortieren — Patterns die `room.lastPlacedCell` enthalten kommen zuerst. Stable-Sort, geometrische Reihenfolge nur als Fallback. 5-Zeilen-Fix im Backend.

File: `backend/src/quarterQuiz/qqRooms.ts`.

#### c) Race-Rahmen + End-Page-Treppchen-Cutoff — 1 Ursache, 2 Symptome
Wolf hatte den "Rand"-Bug 6× gefixt durch CSS-Selektor-Justierung. Heute Versuch #7: root cause im FinalRevealView Outer-Container gefunden.

```
padding: 'max(var(--qq-safe-margin), 4cqh) max(var(--qq-safe-margin), 4cqw)',
background: COZY_CARD_BG,  // lila gradient #1F1A2E
```

Race-Slide hat eigene radial-gradient-BG. Die 4 % Padding-Zone zeigte den lila Gradient als sichtbarer Rahmen. Plus: Treppchen-Container verlor 8 % Width → seitliche Teams overflow:hidden = abgeschnitten.

Fix: `fullBleed`-Flag in FinalRevealView. Bei race-final / awards-overview / awards-reveal / grid → `padding: 0` + `background: transparent` (Inner-Slide rendert eigene BG). Bei title / bet bleibt die safe-margin.

File: `CozyQuizFinalRevealView.tsx`.

### Drift-Bug eliminiert — Sieger-Tiebreaker zentral

Vorher: `[...teams].sort((a, b) => b.largestConnected - a.largestConnected)` an 8 Stellen im Code dupliziert ohne Tiebreaker. Bei tie blieb JavaScript-stable-sort bei zufälliger Insertion-Order. Wolf-Live-Test: Wolfsrudel 12-verbunden / 10-gesamt schlug Glühbirnen 12-verbunden / 16-gesamt. Falscher Sieger.

Fix: Single-source-of-truth `compareTeamsForRanking` in `utils/qqTeamRanking.ts`. Regel: largestConnected DESC → totalCells DESC → stable. Alle 8 Aufrufer umgestellt.

### Weitere Polish-Fixes

- **Bet-Card-Auflöse-Animation** (`qqFRSlamOutDown`): vorher 0.55s translateY(110cqh) + rotate(2deg) + blur(4px) "Slam-Out". Jetzt 0.35s sanfter Fade + leichter Scale-Down.
- **Stack-Avatar +1 (2-Stack)**: Wolf-Screenshot zeigt Avatare diagonal in den Ecken. tx=±20, avFactor 0.42 → 14.6 % Luftspalt, 9 % Edge-Puffer.
- **Stack-Avatar +2 (3-Stack)**: Wolf-Screenshot zeigt Triangle (war diagonale Linie). Apex (0, -28), Basis ±(22, +15), avFactor 0.34.
- **BIETEN-Label** im Progress-Tree: defensiv letterSpacing entfernt + Wrapper explicit width gesetzt.

### Eurovision-Quiz-Spec für externe KI

Wolf will Eurovision-Quiz mit 3 Runden × 5 Fragen aufpeppen. Self-contained Markdown-Spec geschrieben (im Chat), die Wolf an eine KI weiterleitet:
- alle 5 Kategorien (SCHAETZCHEN, MUCHO, ZEHN_VON_ZEHN, CHEESE, BUNTE_TUETE) mit Feldern
- 6 BUNTE_TUETE-Sub-Mechaniken
- Verteilungs-Vorschlag pro Runde (Warm-up → Mittel → Klimax)
- Output-Format JSON
- Tonalität (warm-pubby, kein TV-Studio, Camp-Faktor erlaubt)

### Patterns die heute gefestigt wurden

1. **"1 Ursache, mehrere Symptome"**: Race-Rahmen + Treppchen-Cutoff hatten dieselbe Wurzel. 6 Symptom-Fixes ohne Erfolg, 1 strukturelle Lösung.
2. **Drift-Bug-Elimination**: Wenn dieselbe Logik 8× inline kopiert ist, ist das aktive Bug-Erzeugung. Zentraler Helper > 8 Inline-Stellen.
3. **Strukturell > Stochern**: Bei translate-Distanz-Bugs nicht Pixel-Werte raten, sondern Position im DOM codieren (HL-Avatare an Pillen, Joker mit just-placed-Anker).
4. **FLIP für DOM-move-Animation**: smooth Slot-Wechsel via useLayoutEffect + boundingRect-Diff + invertiertem Transform — library-frei, ~40 LoC. Voraussetzung: Avatare als direkte Children desselben Parents (CSS-Grid).

### Cumulative Bilanz

- 30+ Commits in der Session (Refactor-Phasen + Bug-Fixes + Spec)
- QQTeamPage: 8.072 → 2.282 Zeilen (-72 %)
- 12 neue Component/Utility-Files (alle <500 Z. presentation-fokussiert)
- 9 Bug-Fixes (3 strukturell, 6 polish)
- 0 Live-Test heute — alle Refactor-Cuts strikte Strangler-Fig 1:1-Moves mit tsc-clean
- Backend-Redeploy nötig (Coolify-UI manuell) — Joker-Fix ist in qqRooms.ts

### Open

- **Live-Check der 9 Bug-Fixes** nach Vercel-Deploy (HL-FLIP, Sieger-Tiebreaker, Race-Rahmen, Stack-Avatar, Bet-Anim, BIETEN-Label, Joker)
- **Coolify-Backend-Redeploy** für Joker-Fix manuell
- **QQTeamPage Phase 3.5** weiter: kleine Helper-Components (IdentityBanner + YourTurnAlert + MidGameRejoinView + WaitingScreen, ~340 Z. Cut)
- Verbleibender QQTeamPage-Inhalt (2.282 Z.): SetupFlow (~650 Z.), TeamGameView (~570 Z., Main-Renderer), t-Translations-Object (~270 Z.), Header / Bootstrap (~450 Z.)
- **Eurovision-Fragen**: Wolf schickt Spec an KI, wartet auf JSON-Array zurück. Builder-Mapping wenn vorhanden.
- **Designer-Audit-Empfehlungen** (Top-3) noch offen: CozyQuizQuestionView 6.144 Z. (Reveals splitten), backend/server.ts 9.270 Z. (Blitz/Rundlauf/Cozy60), QQModeratorPage Hotkeys-Hook.

### Files (massiv berührt)

Neue Files (13):
- `frontend/src/components/CozyQuizTeamPrimitives.tsx` (erweitert)
- `frontend/src/components/CozyQuizTeamInputs.tsx`
- `frontend/src/components/CozyQuizTeamOverlays.tsx`
- `frontend/src/components/CozyQuizTeamQuestionInputs.tsx`
- `frontend/src/components/CozyQuizTeamEmitInputs.tsx`
- `frontend/src/components/CozyQuizTeamPhaseCards.tsx`
- `frontend/src/components/CozyQuizTeamQuestionCard.tsx`
- `frontend/src/components/CozyQuizTeamActionCards.tsx`
- `frontend/src/components/CozyQuizTeamBottomSheet.tsx`
- `frontend/src/hooks/useExpiry.ts`
- `frontend/src/utils/qqTeamAckBus.ts`
- `frontend/src/utils/qqStammCode.ts`
- `frontend/src/utils/qqTeamRanking.ts`

Refactored:
- `frontend/src/pages/QQTeamPage.tsx` (Hauptfile, 8.072 → 2.282)
- `frontend/src/components/CozyQuizComebackView.tsx` (HL-Avatar strukturell + FLIP)
- `frontend/src/components/CozyQuizFinalRevealView.tsx` (Race-Rahmen + Bet-Animation)
- `frontend/src/components/CozyQuizGridDisplay.tsx` (Stack-Avatar 2/3 diagonal)
- `frontend/src/components/CozyQuizScoreBar.tsx` (Tiebreaker)
- `frontend/src/components/QQCustomSlide.tsx` (Tiebreaker × 3)
- `frontend/src/components/QQProgressTree.tsx` (BIETEN-Label mittig)
- `frontend/src/pages/QQModeratorPage.tsx` (Tiebreaker)
- `frontend/src/pages/QQSummaryPage.tsx` (Tiebreaker)
- `backend/src/quarterQuiz/qqRooms.ts` (Joker-just-placed-Anker)

### Memory-Note

Trigger 'log das' = SESSION_LOG-Append + commit + push. Chat-Wechsel danach geplant. 🦖❣️

---

## 2026-05-13 (Nachschlag spät) — Eurovision-Quiz-Refresh (Template + H/L-Pool)

Wolf hat 15 Quiz-Fragen + 3 H/L-Pairs von externer KI bekommen (Spec aus dem Marathon-Block oben). Faktencheck, Refinements, Import.

### KI-Output → Faktencheck → Refinements

**Frage 5 (Top5 Sieger-Länder)**: Drift-Problem entdeckt — UK fehlte in answers obwohl tie mit Niederlande bei 5 Siegen. Plus Frage-Wording "Top 5" mathematisch unsauber (es gibt 6 Länder mit 5+ Siegen, nicht 5). Fix:
- Text entschärft: "Nenne bis zu 5 der erfolgreichsten ESC-Sieger-Nationen"
- 6 valide answers: Schweden/Irland (7 Siege) + Luxemburg/Frankreich/Niederlande/UK (5 Siege)
- Top5Reveal-Code ist generisch (`n = answers.length`) → rendert automatisch 6 Cards untereinander, kein "2-in-1"-Stacking nötig.

**Faktencheck-Korrektur**: Mein ursprünglicher Audit war falsch bei Israel — hat 4 ESC-Siege (1978/79/98/2018), nicht 5. Daher 6 Länder mit 5+ Wins, nicht 7. Wolf transparent korrigiert vor dem Schreiben.

**Frage 9 (ZvZ) thematisch ersetzt** — Drift-Bug-Vermeidung: Vorher "Welches Land hat meiste Siege" — überlappte direkt mit Frage 5. Wolf gespottet. Neue Frage: "Wer hielt den höchsten Punkte-Score bei einem ESC-Sieg?" mit Optionen Salvador Sobral 2017 (758) / Måneskin 2021 (524) / Loreen 2023 (583). Salvador klare Spitze → schöne ZvZ-Risiko-Verteilung möglich.

### Implementation

- **`frontend/src/data/eurovisionDraftTemplate.ts`** komplett ersetzt (commit `98f098f3`). 15 Fragen über 3 Runden, alle Mechaniken (SCHAETZCHEN/MUCHO/ZvZ/CHEESE + BUNTE_TUETE top5/map/hotPotato), funFact + hostNote in DE+EN durchgehend. Verteilung: R1 Klassiker → R2 Mittel → R3 Hart (Pub-Knowledge → Insider).
- **`backend/src/quarterQuiz/qqHLData.ts`** um 3 ESC-H/L-Pairs erweitert (commit `4a4b6600`). Neue category `'eurovision'`. Paare: ESC-Teilnehmer 2024 vs 2011 (37 vs 43), Lena vs Conchita Punkte (246 vs 290), ESC-Sendezeit 1956 vs heute (240 vs 100 Min).

### Open

- **Wolf macht im Builder**: alten Eurovision-Draft löschen → 🎤 Eurovision Quiz klicken → bekommt neuen Draft mit 15 frischen Fragen
- **CHEESE-Bilder hochladen** (R1 Lordi Athen 2006 / R2 Måneskin Rotterdam 2021 / R3 Subwoolfer Turin 2022)
- **Coolify-Backend-Redeploy manuell** für die neuen H/L-Pairs (sonst läuft alter Pool weiter)
- Optional: per-Frage Musik (`musicMode: 'revealOnly'` z.B. für ABBA-Waterloo-Reveal in R1)
- Optional: Lobby-Welcome-Sound (Beethovens "Ode an die Freude", archive.org)

### Patterns

- **Drift via Themen-Überlap**: Top5-Frage und ZvZ-Frage zur selben Statistik = Spieler kennt Antwort schon. Wolf erkennt's selbst, frage thematisch wechseln statt Distraktoren feilen.
- **Mechanik-Code generisch lassen**: `top5` heißt zwar "5", Code rendert aber `n = answers.length` — keine Magic-Number 5. Macht Tie-Cases (6 valide Antworten) trivial.
- **Externer KI-Output ist Skeleton, nicht final**: Faktencheck + Wolf-Refinement bringt 2 Verbesserungen pro Quiz raus. KI-Vertrauen sinnvoll dosieren.
