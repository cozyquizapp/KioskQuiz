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
