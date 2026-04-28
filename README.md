# CozyQuiz

> Pub-Quiz-App mit Territorium-Grid-Mechanik. 2-10 Teams, Beamer-Show + Phone-Eingabe.
> Solo-Projekt von Wolf (cozywolf-Marke).
> **Letztes Update**: 2026-04-28 · Branch: `main`

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

### 🆕 Drei neue Spielmechaniken (seit 2026-04-28)

Großer Schub: 4×4-Finalrunde + 2 neue Bunte-Tüete-Sub-Mechaniken sind komplett
in die App integriert (Backend + Frontend + Builder + Dummy-AI + Auto-Flow +
Setup-Toggles). Alle 5 Sample-Drafts (qq-vol-1 bis qq-vol-5) wurden mit
Test-Fragen für die neuen Mechaniken angereichert (siehe „Test-Routen" unten).

#### 🔗 4×4 Connections — eigene Finalrunde
- 16 Begriffe in 4×4-Raster, 4 versteckte Gruppen à 4 Items
- Teams jagen **parallel** auf eigenem Phone, sehen sich Submissions ab anderer Teams nicht
- Beamer **spoiler-safe**: Tiles werden erst im Reveal eingefärbt
- Pro gefundener Gruppe = 1 Aktion. Ranking: meiste Gruppen → schnellster bei Tie
- Eigene Phase `CONNECTIONS_4X4` mit Sub-Phasen `intro → active → reveal → placement → done`
- Auto-Trigger ans Ende von Runde 4 (Setup-Toggle „🔗 Finale: An/Aus")
- Skip-Button für Notfälle, Done → GAME_OVER per Space
- Live-Status-Reihe wie CHEESE (✓ / ✕ / 🏁 pro Team)
- Default-Timer 3 Min, Max-Fails 2 (im Setup anpassbar)
- Avatare auf Gruppen-Labels im Reveal (wer fand was, sortiert nach Speed)
- Dummy-AI funktioniert (60 % Chance auf echte Gruppe, fallback zufällige 4er)

#### 🧩 4 gewinnt (Only Connect) — BunteTüete-Sub
- 4 Hinweise nacheinander aufgedeckt (Default 15 s zwischen Hinweisen)
- Teams raten Verbindungs-Begriff per Freitext (1 Versuch — falsch = gesperrt)
- **Multi-Winner**: alle korrekten Teams gewinnen, sortiert nach `(atHintIdx ASC, submittedAt ASC)`
- Punkte (Stat): 4/3/2/1 je nach Hint-Index
- Auto-Transition zu QUESTION_REVEAL wenn alle Teams fertig oder letzter Hint-Timer
  abläuft (Standard-Pipeline greift dann für Placement)
- Beamer: 4 Hint-Slots als Grid, aktueller Hint pulsiert; Reveal zeigt Lösung +
  alle Winner sortiert mit 🥇🥈🥉 + Punkte-Pillen
- Match-Logik wie CHEESE (case-insensitive, substring-match, acceptedAnswers-Liste)
- Dummy-AI funktioniert

#### 🎭 Bluff (Fibbage-Style) — BunteTüete-Sub
- 3 Phasen: **write** → (review optional) → **vote** → **reveal**
- Teams tippen plausible Falsch-Antwort, dann Voting auf gemischte Liste
- **Per-Team Random-4-Subset**: jedes Team sieht real + 3 zufällige andere Bluffs
  (NICHT eigener Bluff — kein Filter-Frust). Bei vielen Teams keine Beamer-Spoiler.
- Beamer während Vote: KEINE Optionen sichtbar, nur 🗳 + Live-Counter + Avatar-✓
- Reveal: voller Pool mit Voter-Avataren + Bluff-Author-Avataren pro Option
- Punkte (Teilpunkte wie Top-5):
  - +2 wenn Team echte Antwort gewählt hat
  - +1 pro Reinfall auf eigenen Bluff (bei merged Bluffs aufgeteilt)
  - +3 Truth-Accident wenn Bluff = echte Antwort (gefiltert, nicht in Optionen)
- Aktion an Top-Team(s), Speed-Tie-Break wie sonst
- Setup-Toggle „🎭 Bluff-Check" (Moderator-Review der Bluffs vor Voting, Default Aus)
- Phasen-Timer Default 30+30 s, im Setup anpassbar
- Auto-Transition zu QUESTION_REVEAL nach Vote → Standard-Pipeline + qqMarkCorrect
- Dummy-AI funktioniert (Number-Bluff bei Zahl-Antworten ±10-30 %, sonst Filler-Liste)

#### Setup-Toggles (alle in der Lobby-Quick-Settings)
- **🎮 Runden 3/4** — Default 4. 20q-Draft + Klick auf 3 truncated auf 15 Fragen
- **🔗 Finale An/Aus** — `connectionsEnabled` (default an)
- **🔀 Reihenfolge** — Zufällig vs. aus Draft (default zufällig, mit
  Anti-Adjacency an Rundengrenzen)
- **🎭 Bluff-Check** — Moderator-Review der Bluffs (default aus)

#### Sample-Drafts — Test-Routen pro Vol

| Draft | 🧩 4 gewinnt | 🎭 Bluff |
|---|---|---|
| Vol 1 | P2: Komponisten 9 Sinfonien | P4: Google-Originalname (BackRub) |
| Vol 2 | P2: Tom Hanks Filme | P3: Olympia '72 Maskottchen (Waldi) |
| Vol 3 | P3: Nobelpreis Physik | P4: Jeanne Calment Lebensalter (122) |
| Vol 4 | P1: Apple-Produkte | P2: Inseln Indonesiens (17.508) |
| Vol 5 | P1: Sternzeichen | P4: Zahnpasta-Tube Jahr (1892) |

Vol 4 / Vol 5 sind die schnellsten Test-Pfade (4 gewinnt direkt in Phase 1).

Migration: bestehende qq-vol-* Drafts in File + DB werden beim nächsten
Backend-Start automatisch refresht (Detection: hasNewSubMechanics).

#### Gefixte Bugs (relativ neu)
- Auto-Flow am Ende von Runde 4 → 4×4 starten (`b1c65e8a` `ecc053d0`)
- Autoplay-Endless-Loop bei MUCHO mit `nonEmpty=0` (`e1972c12`)
- Spoiler-Leak bei 4×4 (Beamer färbte Tiles während Active) (`6feca3db`)
- Truth-Accident-Handling (Bluff = real → ausgefiltert + Sonderbonus)
- Connection-Avatare-Race-Layout (mehrere Iterationen, finaler Stand: Status-Reihe wie CHEESE) (`daa39fb4`)

### 🎨 Gouache-Stil als Parallel-Theme (pausiert seit 2026-04-26)

Aquarell-Variante liegt auf Eis — Fokus auf Cozy-Quiz-Optimierung. Bestehende
`/lobby-gouache` und `/team-gouache` Pages bleiben als Spielwiese.
Komplette Doku: [`GOUACHE_PLAN.md`](./GOUACHE_PLAN.md)

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

- **CHEESE-Fragen in qq-vol-* Drafts haben aktuell KEINE Bilder** — Drafts werden
  nur mit Text + Antwort gespawnt. Bilder müssen via QQ Builder pro Frage hochgeladen
  oder per URL gepflegt werden. Ohne Bild ist die Frage praktisch unspielbar.
  → Ticket: Auto-Image-Insert oder Frontend-Fallback bei fehlendem Bild.
- MongoDB Films-Frage hat falsches `bunteTuete`-Feld (enthält Football oneOfEight statt Films)
  — direkt in DB fixen
- `CreatorCanvasPage.tsx` hat TypeScript-Errors — pre-existing, Cozy60, ignorieren

---

## Verwandte Docs

- [`WOW_FEATURES.md`](./WOW_FEATURES.md) — fünf Charakter-Features (Haptik, Spotlight, Soundscape, Live-Reactions, Time-Travel-Replay)
- [`GOUACHE_PLAN.md`](./GOUACHE_PLAN.md) — Aquarell-Stil-Migration (pausiert)
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
