# Gouache — Aquarell-/Bilderbuch-Stil als Parallel-Theme

> **Stand**: 2026-04-26
> **Status**: Library + Avatare + Stilstudie live · echte Pages folgen schrittweise
> **Owner**: Wolf (cozywolf-Marke)

---

## Was ist das?

CozyQuiz hat ab sofort **zwei parallele Visual-Welten**:

| Welt | Stimmung | Status | Live-Pfade |
|---|---|---|---|
| **Cozy Dark** *(bestehend, „klassisch")* | Dunkler Beamer, warme Amber-Spots, Fireflies, satte Saturation | ✅ Production-ready, alle Spiele laufen darauf | `/beamer`, `/team`, `/moderator`, `/lobby` |
| **Gouache** *(neu, „Bilderbuch")* | Cremepapier, gemalte Aquarell-Wäschen, handgeschriebene Headings (Caveat), gedämpfte Erdtöne | 🚧 Lab-Stilstudie + Library + 16 echte Aquarell-Avatare + erste echte Live-Page (Lobby) | `/gouache` (Studie), `/lobby-gouache` (live), zukünftig `/beamer-gouache`, `/team-gouache` |

**Wichtig**: Der alte Stil bleibt **als Safety unverändert**. Solange wir noch nicht alle Gouache-Live-Pages durchgetestet haben, läuft jedes echte Quiz weiter im Cozy-Dark-Stil. Erst wenn der parallele Pfad voll funktioniert → entscheiden wir per Theme-Switch im Setup.

---

## Aktueller Stand (Was ist fertig)

### ✅ Library / Infrastructure (`frontend/src/gouache/`)

```
frontend/src/gouache/
├── tokens.ts             — PALETTE, F_HAND, F_BODY, SHADOWS, RADIUS,
│                            SOFT_TEAM_COLORS, HOODIE_COLORS,
│                            PAPER_GRAIN_BG, PAPER_BG, avatar-URL-Helpers
├── filters.tsx           — <GouacheFilters/>: paperGrain, watercolorEdge,
│                            paintFrame, bleed, avatarGouache, washSky/Sage/Warm
├── components.tsx        — PaperCard, PaintedButton, SectionLabel,
│                            PaintedAvatar, PaintedAvatarMini, PaintedBalloon,
│                            PaintedMoon, PaintedHills, PaintedStars,
│                            PaintedBird, PaintedKeyframes
├── usePaintFonts.ts      — idempotenter Google-Fonts-Loader (Caveat + Lora)
├── useGouacheAvatar.ts   — Hook: lädt Gouache-PNG, Fallback auf cozy-cast
└── index.ts              — Barrel export
```

Komplett separat vom alten Stil — keine bestehende Datei wurde modifiziert.
Alle Gouache-Pages importieren über `import { ... } from '../gouache'`.

### ✅ 16 Avatar-PNGs in `frontend/public/avatars/gouache/`

8 Tiere × 2 Augen-Varianten (open + closed). Aquarell-Stil, full-color,
in voller AI-Generator-Auflösung (je 9-13 MB). **TODO**: vor Production
durch sharp/squoosh komprimieren auf 200-500 KB pro Bild.

| Slug | Tier | Hoodie / Team-Farbe (Hex) | User-Vorgabe |
|------|------|---------------------------|--------------|
| `capybara`  | Capybara  | `#B4B677` Sage Olive       | grün ✓ |
| `giraffe`   | Giraffe   | `#9EA7C8` Periwinkel Blue  | blau ✓ |
| `koala`     | Koala     | `#F35357` Coral Red        | rot ✓ |
| `waschbaer` | Waschbär  | `#E9BF53` Mustard Yellow   | gelb ✓ |
| `faultier`  | Faultier  | `#B79EAC` Lavender         | lavendel ✓ |
| `shiba`     | Hund      | `#9D9387` Stone Grey       | grau ✓ |
| `pinguin`   | Pinguin   | `#E99E9D` Dusty Rose       | pink ✓ |
| `kuh`       | Kuh       | `#D26631` Burnt Orange     | orange ✓ |

Hex-Werte wurden per Node-Script aus dem Hoodie-Bereich der PNGs gesampelt
(Region 85-97 % Höhe, Average-RGB ohne Highlight/Shadow-Pixel).

### ✅ Design-Entscheidung: Hoodie = Team-Farbe

Vorherige Idee (komplementärer Hoodie-Kontrast für Pop-Out) wurde verworfen —
die Avatare sind so gemalt, dass jeder seine Team-Farbe als Hoodie trägt.
**Eine Identität pro Team** (z.B. „Kuh-Team = Orange").

Auf eigenem Feld: Hoodie verschmilzt mit der Cell, das Tier-Gesicht
(warmer Pelz) wird zum fokalen Pop. Auf fremdem Feld (Klau-Phase):
Hoodie kontrastiert klar gegen die andere Team-Farbe.

### ✅ `/gouache` — Stilstudie (Live)

Eine umfassende Demo-Page mit 14 Sektionen die zeigt wie jede Seite des
Spiels im Aquarell-Stil aussehen würde:

1. Hero-Header mit Caveat-Heading
2. Farbpalette (8 Erdtöne als gemalte Pinsel-Spots)
3. Typografie-Sample
4. Beamer · Welcome (Hügel + Mond + Sterne + Heißluftballons)
5. Beamer · Frage (Schätzchen-Mockup)
6. Beamer · Auflösung
7. Spielfeld 5×5 (Tile-Felder leicht verdreht ±3°)
8. Team-Page (3 Phone-Frames)
9. Beamer · Spielende
10. Avatar-Stilstudie (alle 8 Avatare einzeln)
11. **Sanfte Team-Farben** (Vergleich alt → sanft + Demo-Grid)
12. **Erweiterte Hoodie-Palette** (12 Töne nach kühl/warm/neutral gruppiert)
13. **Avatar-Loading-Status** (live ✓/⧖ pro Slot)
14. Hoodie-Empfehlungen (final 8 Pairings)
15. Verdict (was geht / braucht Custom-Art / hybrid behalten)

Auch erreichbar über das **Menü → Gouache Lab** 🎨 (Eintrag in
`frontend/src/pages/MenuPage.tsx`).

### ✅ Auto-Fallback-Logik

`useGouacheAvatar(slug)`-Hook probet beim Mount mit `Image()`, ob die
Gouache-PNG existiert. Wenn ja: Gouache. Wenn nein: cozy-cast Fallback.
Ein Modul-Cache verhindert Re-Probe-Flicker beim Re-Render.

Das heißt: man könnte einzelne Avatare entfernen ohne dass die App
crasht — fehlende fallen still auf cozy-cast zurück.

---

## Was noch offen ist (Migration-Plan)

> **Strategie**: Page für Page parallel aufbauen, nicht alles auf einmal.
> Jede neue Page bekommt einen `-gouache`-Suffix, alte bleiben unverändert.

### Phase 1 — Erste Live-Page ✅ (live seit 2026-04-26)

**`/lobby-gouache`** — `frontend/src/pages/QQLobbyGouachePage.tsx`

- Welcome-Screen vor Spielstart, Teams joinen
- Echte Live-Daten via `useQQSocket('default')` + `qq:joinBeamer`
- Selber Socket-Room wie `/beamer` → spiegelt 1:1 dieselbe Lobby parallel
- Komponenten:
  - `PaperCard` für QR-Card + Teams-Card
  - `PaintedBalloon` pro joinendem Team in dessen `softTeamColor()`
    (Default-Atmo-Ballons verschwinden sobald das erste Team da ist)
  - `PaintedHills` als Bottom-Silhouette
  - `PaintedStars` (32) + `PaintedMoon` + `PaintedBird` für Atmo
  - `PaintedAvatar` pro Team (Aquarell-PNG, Fallback cozy-cast)
- Drei State-Branches:
  1. Kein State / nicht verbunden → ConnectingPanel
  2. `phase === 'LOBBY' && !setupDone` → PreGamePanel („Bald geht's los")
  3. `phase === 'LOBBY' && setupDone` → Voller QR + Team-Grid
  4. Andere Phasen → RunningPanel mit Hinweis auf `/beamer`
- Wave-Animation (👋 + Glow) wenn ein neues Team frisch joint
- Lab-Footer mit Cross-Links zu `/gouache` und `/beamer`
- **Sicherheit**: keine Edits an QQBeamerPage / qqShared / Backend.
  Nur eine neue Page + 1 Zeile in App.tsx + 1 Zeile in MenuPage.

### Phase 2 — Team-Page (Phone)

**`/team-gouache`**

- Phone-View für Spielende
- Autark testbar während der Beamer noch im alten Stil läuft
- 3 Sub-Screens: Frage-Eingabe, Feedback (Richtig/Falsch), Ergebnis
- Reuses: socket events, answer-submission flow

### Phase 3 — Spielende-Page

**`/spielende-gouache`** (oder im Beamer-Pfad als Variante)

- Sieger-Page nach GAME_OVER
- Klein, hoher Wow-Faktor
- „Stiller Triumph" statt Konfetti-Feuerwerk

### Phase 4 — Beamer (das große Ding)

**`/beamer-gouache`**

- Frage-Screen + Reveal-Logik pro Kategorie
- 5 Kategorien × eigene Reveal-Animation:
  - **Schätzchen** — Lösung + Sieger gemalt
  - **Mucho** — Optionen als Aquarell-Cards
  - **Bunte Tüte** (Top5/Order/Map/Hot Potato/Imposter) — je eigener Reveal
  - **ZvZ** — Bet-Cascade in Aquarell-Pills
  - **Cheese** — Bild-Reveal mit Frame
- Hier wird's Arbeit — pro Kategorie ein eigener Mini-Refactor

### Phase 5 — Bild-Optimierung

- Die 16 PNGs (je 9-13 MB) durch Komprimier-Pipeline:
  - sharp oder squoosh
  - Target: 200-500 KB pro Bild
  - WebP als zusätzliches Format mit PNG-Fallback
  - Lazy-Load wo sinnvoll
- 1-2 Stunden Setup, dann läuft's automatisch bei jedem neuen Asset

### Phase 6 — Theme-Switch

- Dropdown im Moderator-Setup: „Klassisch (Cozy Dark)" oder „Bilderbuch (Gouache)"
- Pro Quiz-Abend wählbar
- Backend speichert Auswahl in `room.themeStyle: 'cozyDark' | 'gouache'`
- Frontend-Routing: schaut auf Room-Theme, lädt entsprechend Beamer-Variante
- **Erst implementieren wenn alle Gouache-Pages durchgetestet sind**

### Phase 7 — Cleanup / Konsolidierung

- Wenn Gouache stabil läuft und der User ihn als Default will:
  - Theme-Switch auf Default „Gouache" stellen
  - Cozy-Dark als Fallback / Legacy-Option behalten
  - Eventuell auch Cozy-Dark in das Theme-System ziehen, sodass beide Pfade
    durch einen `useTheme()`-Hook laufen statt durch separate Page-Trees

---

## Sicherheits-Strategie (Warum parallel)

**Goldene Regel**: Solange ein echtes Quiz-Erlebnis gefährdet sein könnte,
wird der bestehende Cozy-Dark-Stil **nicht angefasst**.

### Was das bedeutet

✅ **Erlaubt während Migration**:
- Neue Dateien in `frontend/src/gouache/` und `frontend/src/pages/QQ*Gouache*.tsx`
- Neue Routes in `App.tsx`
- Neue Avatare in `frontend/public/avatars/gouache/`
- Edits an `MenuPage.tsx` (nur das Lab-Link-Hinzufügen)

❌ **Verboten während Migration** (außer der User sagt's explizit):
- Edits an `QQBeamerPage.tsx` (10000+ Zeilen, der echte Beamer)
- Edits an `QQTeamPage.tsx` (echte Team-Page)
- Edits an `QQModeratorPage.tsx`
- Edits an `qqShared.ts`, Beamer-Theme-CSS
- Änderungen an `QQ_AVATARS.color` in `shared/quarterQuizTypes.ts`
  (würde beide Stile gleichzeitig betreffen)

### Konsequenz

Wenn der User „live ein Quiz spielt", kann nichts kaputtgehen — die
Gouache-Welt ist eine eigene URL-Familie und wird vom echten Spiel
nicht angefasst.

---

## Technische Details

### Avatar-Loading-Cascade

```
User ruft <PaintedAvatar slug="capybara" /> auf
   ↓
useGouacheAvatar('capybara')
   ↓
Probet /avatars/gouache/avatar-capybara.png
   ↓ (existiert)
Gibt {src: '/avatars/gouache/avatar-capybara.png', isGouache: true} zurück
   ↓
PaintedAvatar rendert ohne Sepia-Filter (PNG hat schon Aquarell-Textur)

----- ODER (wenn PNG fehlt) -----

   ↓ (fehlt → onerror)
Gibt {src: '/avatars/cozy-cast/avatar-capybara.png', isGouache: false} zurück
   ↓
PaintedAvatar rendert MIT Sepia-Filter (cozy-cast PNG bekommt Aquarell-Look)
```

### SVG-Filter-Tricks

- **Paper-Grain**: `feTurbulence` (fractalNoise, baseFrequency 0.85) +
  `feColorMatrix` mit warmer Sepia-Tint → wird als Multiply-Overlay auf
  Cards gelegt
- **Watercolor-Edge**: `feTurbulence` + `feDisplacementMap` (scale 3.5) →
  hand-gemalte wobblige Card-Kanten
- **Paint-Frame**: stärkere Variante (scale 5) für Avatar-Frames
- **Avatar-Sepia**: hand-getuneten Color-Matrix der Saturation dämpft +
  warmen Touch addiert (NUR auf cozy-cast Fallbacks angewendet, nicht auf
  echte Aquarell-PNGs)

### Fonts

- **Caveat** (Heading) — Google Fonts, weights 400 + 700
- **Lora** (Body, Serif) — Google Fonts, weights 400/600/700 + italic
- Geladen via `usePaintFonts()` Hook — idempotent, Single-`<link>`-Tag im
  `<head>`

### PNG-Größen-Problem

Die 16 Aquarell-PNGs sind je 9-13 MB. Insgesamt ca. 180 MB im Repo.
Vor Production-Deploy **pflicht** zu komprimieren — sonst:
- Vercel-Bundle wird riesig
- Mobile-Team-Pages laden zu langsam
- CDN-Cache wird teuer

Lösungsansatz: `sharp`-Pipeline im Build (`vite-plugin-imagetools` oder
custom-script in `vite.config.ts`), Output WebP + PNG-Fallback in
`200-500 KB`-Range.

---

## Wichtige Pfade (Quick-Reference)

```
frontend/src/gouache/                    — Library (Tokens + Components + Hooks)
frontend/src/pages/QQGouachePage.tsx     — /gouache Stilstudie
frontend/public/avatars/gouache/         — 16 Aquarell-Avatare
frontend/public/avatars/gouache/README.md — Hoodie-Specs + Master-Prompt
frontend/src/pages/MenuPage.tsx          — Menü-Eintrag „Gouache Lab" 🎨

shared/quarterQuizTypes.ts               — QQ_AVATARS.color (NICHT ÄNDERN während
                                            Migration — beide Stile lesen das)
```

---

## Offene Entscheidungen / TODOs

1. **Bild-Komprimierung** — sharp/squoosh-Pipeline einrichten, sonst
   Production-Deploy nicht möglich
2. **Erste Live-Page** — User-Entscheidung: Lobby? Team? Spielende? Beamer?
3. **Theme-Switch-UI** — wo im Moderator-Setup einbauen? Eigene Sektion oder
   neben Sound/Sprache?
4. **`-closed.png`-Verwendung** — wann zeigt die App das closed-eyes-Avatar?
   Idee: random-blink-Animation alle 5-10 Sekunden, oder bei „warten auf
   Antwort"-State, oder bei „falsch geantwortet". Muss noch entschieden werden.
5. **3D-Grid im Gouache-Stil** — schwierig, weil Three.js scharf rendert.
   Tendenz: 3D-Grid bleibt im Gouache-Theme als 2D-illustriertes Grid
   (siehe `/city-lab` Variante 3 als Morph-Base).

---

## Für zukünftige Coding-Agents

- Wenn der User „Gouache" oder „Aquarell" oder „Bilderbuch-Stil" erwähnt →
  diese Doku lesen, dann `frontend/src/gouache/` als Library nutzen
- **NIE** den alten Cozy-Dark-Code anfassen, außer der User sagt explizit
  „migriere jetzt"
- Bei neuen Gouache-Pages: immer das `-gouache`-Suffix in der Route
- Avatar-Loading immer über `useGouacheAvatar(slug)` — niemals hardcoded
  Pfade, sonst geht das Auto-Fallback verloren
- Vor Production-Deploy: PNG-Komprimierung muss laufen (siehe Phase 5)
