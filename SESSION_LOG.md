# CozyQuiz Session Log

Chronologisches Protokoll von Arbeits-Sessions. Trigger: Wolf sagt „log das", dann hängt Claude einen Eintrag an. Append-only, nie überschreiben.

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
