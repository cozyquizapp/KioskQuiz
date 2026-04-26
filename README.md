# CozyQuiz

> Pub-Quiz-App mit Territorium-Grid-Mechanik. 2-10 Teams, Beamer-Show + Phone-Eingabe.
> Solo-Projekt von Wolf (cozywolf-Marke).
> **Letztes Update**: 2026-04-26 · Branch: `main`

---

## Quick-Start für neue Coding-Sessions

1. **Diese Datei lesen** (bist du gerade)
2. **Aktiven Block prüfen** ↓ (siehe nächste Sektion) — was läuft gerade?
3. **Memory-Files lesen** in `~/.claude/projects/c--Users-hornu-Desktop-kioskquiz/memory/` —
   da steht User-Profil, Feedback-Regeln, QQ-Architektur-Hinweise, etc.
4. **Beim Code-Editieren**: nur `frontend/src/pages/QQ*.tsx` und `backend/src/quarterQuiz/` anfassen.
   Cozy60 (alte App, `BeamerView.tsx` / `TeamView.tsx` / `ModeratorPage.tsx`) **nicht mehr anfassen**.

---

## Aktiver Block

### 🎨 Gouache-Stil als Parallel-Theme (seit 2026-04-26)

Aquarell-/Bilderbuch-Variante wird **parallel zum bestehenden Cozy-Dark** aufgebaut.
Alter Stil bleibt während der Migration unangetastet — Live-Quizze laufen weiter
im klassischen Look.

**Komplette Doku, Avatar-Hex-Werte, Migration-Plan, Verbots-Liste**:
👉 **[`GOUACHE_PLAN.md`](./GOUACHE_PLAN.md)**

Status:
- [x] Library `frontend/src/gouache/` — Tokens + SVG-Filter + 11 Painted-Components
- [x] 16 Aquarell-Avatare (8 Tiere × open/closed eyes) in `public/avatars/gouache/`
- [x] Auto-Fallback-Hook (Gouache-PNG wenn da, sonst cozy-cast)
- [x] Stilstudie auf `/gouache` (im Menü als „Gouache Lab" 🎨)
- [x] PWA-Build-Fix (unkomprimierte PNGs aus Precache excludet)
- [x] **Phase 1**: `/lobby-gouache` — echte Welcome-Lobby mit Live-Sockets (parallel zu `/beamer`)
- [ ] **Phase 2-4**: Team / Spielende / Beamer mit allen 5 Kategorien
- [ ] **Phase 5**: PNG-Komprimierung (sharp/squoosh, 200-500 KB pro Bild)
- [ ] **Phase 6**: Theme-Switch im Moderator-Setup

---

## Was funktioniert (Live)

### Spielmechanik
- 5 Kategorien: Schätzchen, Mucho, Bunte Tüte (Top5/Order/Map/Hot Potato), 10 von 10, Cheese
- Trinity-Mechanik (seit 2026-04-25): **Place / Steal / Stapel** — Bann + Schild + Tauschen sind gedroppt
- Klimakurve: R1 = 1× Place · R2 = + Klauen · R3 = + Stapeln · R4 = identisch zu R3 (mehr Fragen)
- Joker: 2×2 ODER 4-in-a-row → 1 Bonus-Feld (Cap 2 pro Spiel)
- Stapel-Cap: max 3 pro Spiel
- Comeback Higher/Lower-Mini-Game vor Final-Phase
- Gewinnbedingung: größtes zusammenhängendes Territorium (BFS)

### Grid-Größen nach Teamanzahl
| Teams | Grid |
|-------|------|
| 2 | 4×4 |
| 3 | 5×5 |
| 4 | 6×6 |
| 5-7 | 7×7 |
| 8-10 | 8×8 |

### Show-Polish
- 3D-Grid mit Slam-Down-Animation und F-Flyover
- 8 Avatare (Hund/Faultier/Pinguin/Koala/Giraffe/Waschbär/Kuh/Capybara) mit Signaturfarben
- Slide-Editor (Canva-ähnlich, 25 Platzhalter-Typen, Theme-Presets)
- Host-Cheatsheet als PDF
- CSV-Import im Builder
- Game-Over QR-Code → Team-Summary-Seite mit Stats + Feedback + Upcoming
- Persistentes Leaderboard (Top-5-Teams nach Siegen, knappster Sieg, höchster Score, etc.)
- Beamer-Lobby rotiert: Bestenliste → Rekorde → Lustige Antworten (10s)

### Betrieb
- Bilingual DE/EN durchgehend
- Reconnect-Infinity, Timeout-Guards, 4h Room-TTL + 10min Cleanup-Sweep
- QQ-Drafts persistent in `qqDrafts.json`
- MongoDB Atlas + Cloudinary

---

## Roadmap (priorisiert)

### Block A — Event-Readiness ✅
- [x] Host-Cheatsheet PDF-Export
- [x] Frage-Validierung beim Speichern
- [x] Sound-System (Default-WAVs, Master-Mute, Volume)
- [x] CHEESE-Bild-Positionierung
- [x] Pause-Button mit Musik-Duck

### Block B — Content & Partner ✅
- [x] CSV-Import im Builder
- [x] Frage duplizieren
- [x] Live-Frage-Preview im Builder

### Block C — Show-Polish ✅
- [x] Epische Team-Reveal-Folie
- [x] Game-Over QR-Code → Team-Summary

### Block D — Spectator
- [→] Emote-Rückmeldungen für Zuschauer — nach Longterm verschoben

### Block E — Betrieb ✅
- [x] Reconnect-Audit
- [→] Sentry — nach Longterm
- [→] Plausible — nach Longterm

### Block F — Memory & Longterm-Memo ✅
- [x] Handoff-Memo komprimiert
- [x] Longterm-TODO-File gepflegt

### Block G — Gouache-Stil 🎨 (aktiv)
Siehe [`GOUACHE_PLAN.md`](./GOUACHE_PLAN.md) für Details + 7-Phasen-Plan.

---

## Architektur

| Komponente | Stack | Hosting |
|---|---|---|
| Frontend | Vite + React + Tailwind + PWA | Vercel (`https://play.cozyquiz.app`) |
| Backend | Express + Socket.IO + Mongoose | Render Free Tier (`https://cozyquiz-backend.onrender.com`) |
| Datenbank | MongoDB Atlas | `cluster0.4xushmp.mongodb.net` |
| Bilder | Cloudinary | Cloudinary |
| Error-Tracking | Sentry | Sentry |
| Übersetzung | DeepL | DeepL API |

> **Hinweis**: Render-Free-Tier schläft nach Inaktivität → MongoDB-Reconnect dauert bis 15 s
> beim ersten Request nach Wakeup.

---

## Env-Variablen

### Render (Backend)
| Variable | Beschreibung |
|---|---|
| `ADMIN_PIN` | PIN für Moderator-Zugang |
| `ALLOWED_ORIGINS` | Komma-separierte Frontend-URLs für CORS |
| `MONGODB_URI` | MongoDB-Verbindungsstring |
| `SENTRY_DSN` | Sentry Error-Tracking DSN |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud Name |
| `CLOUDINARY_API_KEY` | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret |
| `DEEPL_API_KEY` | DeepL Übersetzungs-API |

### Vercel (Frontend)
| Variable | Beschreibung |
|---|---|
| `VITE_SOCKET_URL` | WebSocket-URL zum Backend |
| `VITE_API_BASE` | API-Base-URL zum Backend |

> `VITE_ADMIN_PIN` ist **nicht** mehr nötig — PIN-Prüfung läuft server-seitig
> (`/api/verify-pin`).

---

## Wichtige Pfade

```
backend/src/server.ts                       — API + Socket.IO Glue + Auth (~8000 Zeilen)
backend/src/quarterQuiz/qqRooms.ts          — Game-State-Machine (Grid, Phasen, Trinity)
backend/src/quarterQuiz/qqSocketHandlers.ts — Socket-Events
backend/src/db/mongo.ts                     — MongoDB-Verbindung

frontend/src/pages/QQBeamerPage.tsx         — Beamer (10000+ Zeilen, in Chunks lesen!)
frontend/src/pages/QQTeamPage.tsx           — Team-Phone-View
frontend/src/pages/QQModeratorPage.tsx      — Moderator-Steuerung
frontend/src/pages/QQBuilderPage.tsx        — Quiz-Builder
frontend/src/pages/MenuPage.tsx             — Dev-Menü mit allen Lab-Pages
frontend/src/qqShared.ts                    — Geteilte CSS-Keyframes für QQ
frontend/src/utils/adminSession.ts          — Shared Admin-Session Helper
frontend/src/components/PinGate.tsx         — Server-seitiges PIN-Gate

frontend/src/gouache/                       — Aquarell-Library (Tokens + Components)
frontend/public/avatars/cozy-cast/          — Klassische Avatare (8× open + closed)
frontend/public/avatars/gouache/            — Aquarell-Avatare (8× open + closed)

shared/quarterQuizTypes.ts                  — Alle geteilten QQ-Types + QQ_AVATARS

frontend/vite.config.ts                     — Build + PWA-Config
frontend/vercel.json                        — Vercel Rewrites + Cache-Headers
backend/.env.example                        — Alle Env-Vars als Template
```

---

## Deploy

- **Push auf `main`** → Auto-Deploy auf Render (Backend) + Vercel (Frontend)
- **Health-Check**: `GET /api/health` → `{ ok: true, db: "connected" }`
- **Node-Version**: ≥ 18 erforderlich (in `engines` deklariert)
- Pre-Push-Checks: `cd frontend && npx vite build` (gibt PWA-Manifest aus)

---

## Bekannte Architektur-Themen

| Priorität | Thema | Aufwand |
|---|---|---|
| Niedrig | `server.ts` ist 8000-Zeilen-Monolith — aufteilen in Module | 1-2 Tage |
| Niedrig | Admin-Sessions in-memory — gehen bei Restart verloren (Workaround: PIN erneut eingeben) | 2-3 h + Redis-Addon |
| Mittel | Render Free Tier schläft nach Inaktivität → MongoDB-Reconnect bis 15 s | Bezahltes Render-Plan |
| Mittel | Gouache-Avatare unkomprimiert (180 MB im Repo) — sharp-Pipeline für Production nötig | siehe GOUACHE_PLAN Phase 5 |

---

## Bekannte Bugs

- MongoDB Films-Frage hat falsches `bunteTuete`-Feld (enthält Football oneOfEight statt Films)
  — direkt in DB fixen
- `CreatorCanvasPage.tsx` hat TypeScript-Errors — pre-existing, Cozy60, ignorieren

---

## Verwandte Docs

- [`GOUACHE_PLAN.md`](./GOUACHE_PLAN.md) — Aquarell-Stil-Migration (aktiver Block)
- `~/.claude/projects/.../memory/` — Agent-Memory (User-Profil, Feedback-Regeln, etc.)
- `frontend/public/avatars/gouache/README.md` — Hoodie-Specs + Master-Prompt für Avatar-Generierung
- `docs/QQ_ROUND_PLAN_TODO.md` — alte Round-Plan-Diskussion (historisch)

---

## Cozy60 (alte App) — wird nicht mehr angefasst

Die ursprüngliche CozyQuiz-Variante (`/moderator`, `/beamer`, `/team`-Pfade ohne `/quarterquiz-*`)
liegt noch im Repo (`BeamerView.tsx`, `TeamView.tsx`, `ModeratorPage.tsx`,
`CreatorCanvasPage.tsx`, `beamerTheme.css`) — wird aber nicht mehr weiterentwickelt.
TS-Errors dort sind pre-existing und werden ignoriert. **Nicht anfassen** außer expliziter
User-Anfrage.
