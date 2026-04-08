# QQ App – Handoff Dokument

Stand: 08.04.2026 | Branch: `main`

---

## Architektur

| Komponente | Stack | Hosting |
|---|---|---|
| Frontend | Vite + React + Tailwind + PWA | Vercel |
| Backend | Express + Socket.IO + Mongoose | Render |
| Datenbank | MongoDB Atlas | MongoDB Atlas |
| Bilder | Cloudinary | Cloudinary |
| Error Tracking | Sentry | Sentry |

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

> `VITE_ADMIN_PIN` ist nicht mehr nötig — PIN-Prüfung läuft server-seitig.

---

## Letzte Änderungen (Session 08.04.2026)

### Fun Stats & Lobby-Rotation

| Änderung | Dateien |
|---|---|
| `questionHistory` + `funnyAnswers` im Room-State — Antworten werden pro Frage akkumuliert | `qqRooms.ts` |
| Game-Result speichert nun `questionHistory` + `funnyAnswers` (Schema `strict: false`) | `qqSocketHandlers.ts` |
| `qq:markFunny` Socket-Event — Moderator markiert lustige Antworten (😂-Button) | `qqSocketHandlers.ts`, `QQModeratorPage.tsx` |
| Leaderboard-API liefert `funStats`: Höchster Score, knappster Sieg, Siegesserie, meiste Spiele, schnellste Antwort, lustigste Antworten | `server.ts` |
| Beamer-Lobby rotiert automatisch: Bestenliste → Rekorde → Lustige Antworten (10s, mit Dot-Indicator) | `QQBeamerPage.tsx` |

### Commit `873abd6` — Fullscreen, 10 Teams, Leaderboard

| Änderung | Dateien |
|---|---|
| Fullscreen-Button auf QQ-Beamer (versteckt sich im Fullscreen) | `QQBeamerPage.tsx` |
| Team-Limit von 5 auf 10 erhöht (5 neue Farben, Grid skaliert auf 8×8) | `quarterQuizTypes.ts` |
| Persistentes Leaderboard: `/api/qq/leaderboard` Endpoint | `server.ts`, `schemas.ts` |
| Beamer-Lobby zeigt Top-5-Teams nach Siegen | `QQBeamerPage.tsx` |

### Commit `a2a631e` — Bugfix Feld-wählen

| Änderung | Dateien |
|---|---|
| "Feld wählen"-Nachricht nach Placement ausgeblendet | `QQTeamPage.tsx` |

### Commit `84533ae` — Hot Potato Overhaul

| Änderung | Dateien |
|---|---|
| Hot Potato: Eliminierungsmodus (Richtig = überleben + weiter, Letzter gewinnt) | `qqRooms.ts`, `qqSocketHandlers.ts` |
| Auto-Check: Antworten gegen Antwortliste (Ähnlichkeit ≥ 0.8) + Duplikat-Erkennung | `qqSocketHandlers.ts` |
| Verwendete & eliminierte Antworten auf Beamer + Moderator sichtbar | `QQBeamerPage.tsx`, `QQModeratorPage.tsx` |

---

## Änderungen Session 07.04.2026

### Commit `26f9516` — Security & Prod Hardening

| ID | Änderung | Dateien |
|---|---|---|
| B1+B2 | Admin-PIN server-seitig verifiziert, `/api/verify-pin` Endpoint | `server.ts`, `PinGate.tsx`, `AdminView.tsx`, `ModeratorPage.tsx`, `ActionButtons.tsx` |
| B3 | CORS auf `ALLOWED_ORIGINS` beschränkt (war `*`) | `server.ts` |
| B4 | Content Security Policy aktiviert | `server.ts` |
| B5 | `engines >= 18` in backend package.json | `backend/package.json` |
| B6 | `.env.example` mit allen Variablen aktualisiert | `backend/.env.example` |
| W1 | `@types/multer` → devDependencies | `backend/package.json` |
| W2 | Warnung in Produktion wenn kein `MONGODB_URI` gesetzt | `backend/src/db/mongo.ts` |
| W3 | Doppeltes Root `vercel.json` entfernt | `vercel.json` (gelöscht) |
| W5 | `source-map` → devDependencies | `frontend/package.json` |
| W6 | `@sentry/*` → dependencies | `frontend/package.json` |

### Commit `8135bc5` — Refactor

| Änderung | Dateien |
|---|---|
| `ensureAdminSession` aus 2 Dateien in `frontend/src/utils/adminSession.ts` extrahiert | `adminSession.ts`, `ModeratorPage.tsx`, `ActionButtons.tsx` |

### Vorherige Commits (gleiche Session)

| Commit | Beschreibung |
|---|---|
| `4f5850b` | UX polish: Confetti, Score-Pop, Sounds, Haptics, animierte Dots |
| `687429b` | Slide-Editor: Placeholder-Warnung, Race-Condition fix |
| `a36fa38` | Design-Polish: Beamer+Team Header, Fonts, Kontraste, QR-Code |
| `5d2ffa9` | Sound/Music-System: SFX, Musik-Upload, Moderator-Mute |

---

## Bekannte Architektur-Themen

| Priorität | Thema | Aufwand |
|---|---|---|
| Niedrig | `server.ts` ist ein 8000-Zeilen-Monolith – aufteilen in Module | 1-2 Tage |
| Niedrig | Admin-Sessions sind In-Memory – gehen bei Restart verloren (Workaround: PIN erneut eingeben) | 2-3h + Redis-Addon |

---

## Wichtige Pfade

```
backend/src/server.ts        — Gesamtes Backend (API + Socket.IO + Game-Logic)
backend/src/db/mongo.ts      — MongoDB-Verbindung
backend/.env.example         — Alle benötigten Env-Vars
frontend/src/utils/adminSession.ts — Shared Admin-Session Helper
frontend/src/components/PinGate.tsx — PIN-Gate (server-seitig)
frontend/vercel.json         — Vercel Config (Rewrites + Cache Headers)
```

---

## Deploy

- **Push auf `main`** → Auto-Deploy auf Render (Backend) + Vercel (Frontend)
- **Health-Check:** `GET /api/health` gibt `{ ok: true, db: "connected" }` zurück
- **Node-Version:** >= 18 erforderlich (in `engines` deklariert)
