# CozyQuiz Session Log

Chronologisches Protokoll von Arbeits-Sessions. Trigger: Wolf sagt „log das", dann hängt Claude einen Eintrag an. Append-only, nie überschreiben.

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
