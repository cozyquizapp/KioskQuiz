# CozyQuiz Roadmap

**Stand:** 2026-05-08
**Status:** Hetzner-Migration komplett, sauber. Recherche-Pool gefüllt. Bereit für Quick-Wins.

---

## 📍 Wo wir jetzt stehen

**Backend** läuft live auf Hetzner CX22 + Coolify (`backend.cozyquiz.app`, ~€11.40/mo all-in).
**Frontend** Vercel (`play.cozyquiz.app`), Vite 5 + React 18, mit funktionierender Vercel-Rewrite-Proxy zum neuen Backend.
**MongoDB Atlas** + **Cloudinary** + **DeepL** + **CORS** + **ADMIN_PIN** alle Env-Vars in Coolify gesetzt.
**Render** läuft parallel als Backup → kann nach 1 Woche stabil-Beobachtung gekündigt werden.

7 Recherche-Markdowns im Repo-Root als Reference-Pool:
- [`GRID_TENSION_IDEAS.md`](GRID_TENSION_IDEAS.md) — 12 Mechaniken + Top-5 + Newbie-Test
- [`ANIMATION_PATTERNS.md`](ANIMATION_PATTERNS.md) — 6 Animations + 3 Tools (Motion / GSAP SplitText / View Transitions API)
- [`MODERN_UI_PATTERNS.md`](MODERN_UI_PATTERNS.md) — 21 Patterns aus Game-Show / Multi-User / 2026-Trends
- [`DESIGN_DIRECTIONS.md`](DESIGN_DIRECTIONS.md) — 5 Lab-Designs (Aurora Stage, Café Vintage, Hand-drawn Cozy, Cinematic Noir, Neo-Retro Game Show)
- [`EMOJI_INTEGRATION.md`](EMOJI_INTEGRATION.md) — Crash-Free Fluent-Emoji-Integration
- [`PERFORMANCE_AUDIT.md`](PERFORMANCE_AUDIT.md) — 6 Bereiche, Top-10-Must-Haves, Quick-Wins
- [`TOOLING_AUDIT.md`](TOOLING_AUDIT.md) — IDE/Hosting/Build-Tool 2026

Plus 2 Demo-Pages live:
- `/gekocht` — 5 Designs durchklickbar mit Color-Palette + Auto-Cycle + Thumbnail-Grid
- `/animations` — 7 Animation-Demos zum Anschauen + Re-Triggern

---

## 🔍 Repo-Diagnose 2026-05-08 (vor Optimierung)

**Was schon ordentlich ist:**
- `vite.config.ts` hat manualChunks (vendor-react/socket/qrcode/router/canvas + admin/editors)
- VitePWA aktiv mit Service-Worker + Auto-Update
- `sharp` installiert + `scripts/compress-cozywolf.js` (-94% schon erreicht)
- `@sentry/react` installiert (nur Setup fehlt)
- Tailwind + PostCSS sauber

**Problembereiche:**

| Problem | Daten | Hebel |
|---|---|---|
| `frontend/public/` 130 MB | avatars/ 51 MB · themes/ 21 MB · icons/ 21 MB · sounds/ 19 MB · images/ 9.4 MB · categories/ 6.4 MB | Beamer-Cold-Load + Vercel-Bandwidth |
| SVG-Originals in `public/` | ~5-6 MB Source-Files unnötig auf Vercel-CDN | Cleanup |
| Dead Deps | `three`, `@react-three/drei`, `@react-three/fiber`, `@react-three/postprocessing`, `postprocessing` — keine Imports verifiziert | ~600 KB-1 MB Disk + npm-Bloat |
| Kein Bundle-Visualizer | Aktuell: blind optimieren | Diagnose-Tool |
| Keine AVIF-Pipeline | Cozywolf-PNGs nur komprimiert PNG | First-Paint -50-80% |
| `useTransition` fehlt im Socket-Hook | `useQQSocket.ts` nutzt's nicht | Beamer responsiver |
| Vite 5 (nicht 7) | Aktuell stable | Kein Druck |

---

## 🎯 Sprint-Plan (Reihenfolge zum Picken)

### Sprint Q1 — Diagnose + Cleanup (~1h, Newbie-safe) ✅ ERLEDIGT 2026-05-08

**Ziel:** Klarheit was wirklich groß ist + tote Last raus.

1. ✅ **Bundle-Visualizer eingebaut** — `rollup-plugin-visualizer` als devDep, in `vite.config.ts` als Plugin mit `template: 'treemap'`, `gzipSize: true`, `brotliSize: true`. Output: `dist/stats.html` (351 KB).
2. ✅ **`npm run build`** Baseline + Nach-Build dokumentiert (siehe Tabelle).
3. ✅ **Dead Deps entfernt**: `three @react-three/drei @react-three/fiber @react-three/postprocessing postprocessing @types/three` (auch der Type-Dep). Verifiziert: 0 Imports im `src/`. Tree-Shaking hatte sie eh schon aus dem Bundle gehalten — Effekt: `node_modules` schlanker, npm-Bloat weg.
4. ✅ **SVG-Originals verschoben** von `frontend/public/avatars/cozywolf/*.svg` (4 Files, 4.6 MB) nach `assets-source/cozywolf/`. README in `assets-source/` dokumentiert den Zweck. Sind Quellen für `scripts/compress-cozywolf.js`, gehören nicht aufs Vercel-CDN.

**Vorher-Nachher (2026-05-08):**

| Metrik | Vorher | Nachher | Δ |
|---|---|---|---|
| Precache-Entries (SW) | 256 | 252 | -4 (SVGs raus) |
| Precache-Größe | 109 287 KiB | 104 658 KiB | **-4.5 MB** |
| `frontend/public/` | ~130 MB | ~125 MB | **-4.6 MB** |
| JS-Bundle Top-Chunks | Beamer 437 KB / vendor-react 370 KB | identisch | 0 (tree-shaking) |
| Dead Deps in package.json | 6 | 0 | three-Stack komplett raus |

**Erkenntnisse aus `dist/stats.html`:**
- Top-3 JS-Chunks: `QQBeamerPage` 437 KB (gzip 112 KB) · `vendor-react` 370 KB (gzip 115 KB) · `QQTeamPage` 169 KB (gzip 46 KB).
- Beamer-Page allein ist die größte einzelne Quelle. Code-Splitting via React.lazy auf Teil-Bereiche (z. B. Mini-Games / Reveal-Phasen) wäre der nächste Hebel — aber nicht jetzt.
- Vendor-React 115 KB gzip ist Standard für React 18 + DOM. Kein Quick-Win drin.

**Was als Nächstes: Q2 (AVIF) oder Visual-Polish.**

### Sprint Q2 — AVIF-Pipeline (~1.5h) ✅ ERLEDIGT 2026-05-08

**Ziel:** First-Paint des Beamers spürbar schneller.

1. ✅ **`scripts/compress-cozywolf.js` erweitert** — Sharp-Pipeline rendert jetzt 3 Formate parallel pro Pose: PNG (palette/q90), WebP (q80), AVIF (q50, effort 6). `Promise.all([…])` für Fanout, kein Mehrfach-Resize.
2. ✅ **`<CozyWolfImage>`-Wrapper** in [`frontend/src/components/CozyWolfImage.tsx`](frontend/src/components/CozyWolfImage.tsx) — `<picture>` mit `<source type="image/avif">` → `<source type="image/webp">` → `<img src=".png">`. `forwardRef` weitergegeben, `src` aus Props entfernt (per `Omit`), alle restlichen img-Attrs gehen durch.
3. ⏭ **`<link rel="preload">`** ausgelassen — der bestehende JSX-Pre-Cache-Loop in QQBeamerPage rendert eh alle Posen mit `loading="eager"`/`decoding="sync"` und ist seitenspezifisch. Globaler Preload würde auf `/team`, `/builder` etc. Bandbreite verschwenden.
4. ✅ **Beide Cozywolf-Refs in `QQBeamerPage.tsx` migriert** (Pre-Cache-Loop + Visible-Wolf, Zeile ~3307+3329). Anti-Flicker-Pattern bleibt: src-swap auf `<picture>` rendert React `<source>` und `<img>` simultan, Browser swappt atomar.
5. ✅ **`vite.config.ts` workbox.globPatterns** um `webp,avif` erweitert — sonst hätte SW nur PNG precached und Browser hätte AVIF on-demand vom Netz geholt (Cold-Load-Penalty).

**Format-Bilanz pro Pose (Durchschnitt):**

| Format | ⌀ Größe | Total (31 Posen) | vs PNG |
|---|---|---|---|
| PNG (palette) | ~196 KB | 6.06 MB | baseline |
| WebP (q80) | ~67 KB | 2.08 MB | **−66%** |
| AVIF (q50) | ~30 KB | 0.94 MB | **−84%** |

**Bundle-Bilanz:**

| Metrik | Vor Q2 | Nach Q2 | Δ |
|---|---|---|---|
| Precache-Entries | 252 | 340 | +88 (avif+webp + sonstige) |
| Precache-Größe | 104 658 KiB | 107 194 KiB | +2.5 MB (3 Formate precached) |
| AVIF-Cold-Load (Beamer) | 6.06 MB PNG | 0.94 MB AVIF | **−5.1 MB für moderne Browser** |
| JS-Bundle | identisch | identisch | 0 (CozyWolfImage tree-inlined) |

**Erkenntnis:** SW-Install kostet jetzt +2.5 MB (alle 3 Formate sind precached für Offline-Reliability), aber *jeder Cold-Load auf einem AVIF-fähigen Browser* spart 5 MB Wolf-Last. Sobald SW installiert ist, ist's eh Cache-Hit; entscheidend ist der erste Beamer-Boot auf einem frischen Device.

**Was als Nächstes: Q3 (Polish — `font-display: optional`, `useTransition`, Doppelklick-Schutz) oder direkt in Visual-Polish/Mechaniken-Sprints.**

### Sprint Q3 — Polish (~1h)
**Ziel:** Kleinere Best-Practice-Punkte.

1. **`font-display: optional`** + Nunito-Preload in `index.html` (`<link rel="preload" as="font" crossorigin>`)
2. **`useTransition`-Wrapper** in `useQQSocket.ts` um `setQuizState(next)` — nicht-blocking stateUpdate
3. **Bundle-Visualizer NOCHMAL laufen** lassen, vergleichen mit Q1-Snapshot
4. Doppelklick-Schutz auf Mod-Buttons (`useActionLock(500)` Custom-Hook) → Hot-Potato-Doppel-Fire-Bug-Klasse weg

---

## 🌟 Größere Sprints (nach Quick-Wins)

### Sprint A — Visual-Polish (1-3 Tage je nach Tiefe)
- Eine der 5 `/gekocht`-Designs picken + ins Live-CozyQuiz übertragen (View für View)
- Top-Animations aus `/animations` in echte App (Slide-Off+Push für Q→Reveal, Slot-Machine-Score, Line-Mask Reveal)
- Fluent-Emoji-Hero-Icons via `<FluentEmoji>`-Component (Migration-Plan in EMOJI_INTEGRATION.md)

### Sprint B — Game-Mechaniken (Sprint 1-3 aus GRID_TENSION_IDEAS.md)
**Sprint 1 (~1 Tag, Newbie-safe):**
- Pointless-Multiplier (Solo-Right-Answer = ×2)
- Jackpot-Rollover (schwere Frage lädt Bonus-Pot auf)
- Simplified Daily-Double (auto +2× ohne Wager-Prompt)

**Sprint 2 (~1-2 Tage):** Final-Frage-Wager (geheimer Slider, Reveal-Sequenz)

**Sprint 3 (~2-3 Tage):** Carcassonne-Cluster-Bonus + Onboarding-Slide

### Sprint C — Production-Resilience (~1 Tag)
- Sentry/Highlight Production-Logging (Sentry-SDK ist schon installiert!)
- Connection State Recovery in Socket.IO
- Idempotency-Keys auf Mod-Actions (`useActionLock` plus Server-LRU)
- Error-Boundary-Pyramide um Risk-Features

### Sprint D — Render-Cleanup (~30 min, in 1 Woche)
- ENV-Var-Inventur Render vs Coolify abgleichen (z. B. `SENTRY_DSN`)
- Render-Service löschen → $7/mo gespart

---

## 🛟 Kontext für nächste Claude-Session

**Trigger-Phrases die existieren:**
- „log das" → Eintrag in `SESSION_LOG.md`

**Zentrale Files:**
- Backend: `backend/src/server.ts` (~9700 Zeilen) + `backend/src/quarterQuiz/qqRooms.ts`
- Frontend Beamer: `frontend/src/pages/QQBeamerPage.tsx` (~16k Zeilen)
- Frontend Mod: `frontend/src/pages/QQModeratorPage.tsx`
- Vite Config: `frontend/vite.config.ts`
- Vercel Config: `frontend/vercel.json` (Rewrites zu `backend.cozyquiz.app`)
- Memory: `C:\Users\hornu\.claude\projects\c--Users-hornu-Desktop-kioskquiz\memory\MEMORY.md`

**Zentrale Fakten:**
- User heißt **Jojo** (nicht Wolf — Wolf ist Nachname + Brand-Maskottchen)
- Kindheitspädagoge, plant Pub/Café-Quiz-Geschäft nebenberuflich
- Backend: Hetzner CX22 + Coolify in Nürnberg, ~€11.40/mo
- Frontend: Vercel, custom domain `play.cozyquiz.app`
- Repo-URL: `https://github.com/cozyquizapp/KioskQuiz` (public)
- Default-Mod-Room: `'default'` (Singleton, Jojo will keine parallelen Quizze)

**Empfehlung beim Session-Start:**
1. `git log --oneline -10` für letzte Aktivität
2. `SESSION_LOG.md` lesen für Kontext
3. Diese Roadmap lesen für was als Nächstes ansteht
4. Dann fragen: „Welcher Sprint?"

---

**Nächster konkreter Schritt sobald Jojo zurück ist: Sprint Q1 starten.**
