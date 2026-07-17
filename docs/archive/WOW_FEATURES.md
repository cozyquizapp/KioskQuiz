# CozyQuiz WOW-Features

> Fünf Charakter-Features die CozyQuiz von anderen Quiz-Apps abheben.
> Eingebaut 2026-04-26 in einem Schwung. Alle aktiv im Cozy-Dark-Stil
> (`/beamer` + `/team`), keine Gouache-Variante.

---

## 1) Phone-Haptik

Phone vibriert synchron zum Beamer mit erkennbaren Patterns — nach 2-3 Spielen
weiß jedes Team welches Pattern was bedeutet.

### Patterns

| Event | Pattern (ms) | Gefühl |
|---|---|---|
| `tap` | 20 | leichter Touch |
| `submit` | 40 | Antwort verschickt |
| `turn` | [50, 80, 50] | „du bist dran" |
| `correct` | [40, 30, 40] | richtig dabei |
| `fastest` | [30, 30, 30, 30, 60] | Crescendo — schnellste Hand |
| `wrong` | 60 | einzelner dumpfer Pulse |
| `jokerEarned` | [80, 40, 120] | Eureka — Joker dazu |
| `stolen` | [60, 50, 60] | autsch — autsch |
| `placed` | 40 | Feld gesetzt |
| `win` | [80, 60, 120, 60, 200] | ansteigender Triumph |

### Wo getriggert

- **PHASE_INTRO** → `turn` (neue Runde startet)
- **QUESTION_ACTIVE** (neue Frage) → `tap`
- **QUESTION_REVEAL**:
  - `correctTeamId === myTeamId` → `fastest` (war auch erster)
  - `currentQuestionWinners.includes(myTeamId)` aber nicht erster → `correct`
  - sonst → `wrong` (kein Hammer-Buzz mehr)
- **PLACEMENT** (mein Team darf setzen) → `turn`
- **GAME_OVER** + ich Sieger → `win`. **Verlierer-Phones bleiben still**
  (Memory-Regel: keine Bloßstellung der Verlierer)
- **Joker dazu verdient** (jokersEarned ↑) → `jokerEarned`
- **Eigenes Feld geklaut** (Owner-Diff) → `stolen`

### Files

- [`frontend/src/utils/haptics.ts`](frontend/src/utils/haptics.ts) — Helper
- [`frontend/src/pages/QQTeamPage.tsx`](frontend/src/pages/QQTeamPage.tsx) — Trigger im Phase-useEffect

### Defensiv

- iOS Safari + Desktop ohne Vibration-API → silent no-op
- Throw beim vibrate-Call wird abgefangen (manche Browser sind streng mit User-Gesture-Forderung)

---

## 2) Hot-Seat-Spotlight

Wenn ein Team in PLACEMENT dran ist, fällt ein **animierter Bühnen-Lichtkegel**
von oben auf seine Zeile in der ScoreBar — wie auf einer Theater-Bühne. Bei
Team-Wechsel gleitet der Spot durch React-Re-Render automatisch zum nächsten
Hot-Seat.

### Komponenten

- **Outer Cone**: clip-path Trapez mit linear-gradient in Team-Farbe,
  blur(6px), `mix-blend-mode: screen`, dezenter Flicker
- **Inner Cone**: schmaler heller Cremeweiß-Stream durchs Zentrum,
  +0.4 s Phase-Versatz für sanfte Pulse-Mischung
- **3 Glitter-Punkte** (4×4 px) in Team-Farbe die wie Funken durch den
  Lichtkegel fallen, gestaffelt 0.7 s versetzt, 2.8–4 s Loop

### Files

- [`frontend/src/pages/QQBeamerPage.tsx`](frontend/src/pages/QQBeamerPage.tsx)
  — Spotlight-Element in `ScoreBar` (innerhalb der `isActive`-Branch)
- [`frontend/src/qqShared.ts`](frontend/src/qqShared.ts) — `hotSeatFlicker` +
  `hotSeatGlitter` Keyframes

---

## 3) Soundscape

Vom generischen Beep-Quiz zu einer kuratierten Audio-Welt mit Cozy-Wolf-DNA.

### Drei neue Sounds

**`playWolfHowl()`** — synthetischer Wolf-Howl als Game-Over-Stinger
- Sine-Grundton 180 → 440 Hz Sweep mit 5.5 Hz-Vibrato
- Sub-Bass-Layer 110 → 165 Hz für Wärme
- Hülle: 0.5 s Attack, 1 s Sustain, 1.2 s Release
- **Trigger**: 700 ms nach `playGameOver()` — Signaturmoment statt generischem End-Beep

**`playWoodKnock()`** — warmer dumpfer Holz-Klack
- 160 Hz / 280 Hz Grundtöne + kurzes Lowpass-gefiltertes Noise-Burst
- Alternative zu `playFieldPlaced` (Library-Funktion ready, nicht aktiv eingebaut)

**`playAvatarJingle(avatarId)`** — pro Avatar eigenes 0.6–0.9 s Timbre

| Avatar | Timbre | Töne |
|---|---|---|
| `fox` (Hund) | 3 fast Bell-Triangle | 659 / 880 / 1175 Hz |
| `frog` (Faultier) | gemächlich tief | 220 → 330 Hz sine |
| `panda` (Pinguin) | hoch trillernd | 1320–1976 Hz square |
| `rabbit` (Koala) | sanft holzig | 523–784 Hz triangle |
| `unicorn` (Giraffe) | elegant slide-up | 4-Note sine |
| `raccoon` (Waschbär) | 4 schnelle Klicks | 880–1320 Hz square |
| `cow` (Kuh) | warm breit brummig | 165 Hz sawtooth + 247 triangle |
| `cat` (Capybara) | entspannt | 330–415 Hz sine |

**Trigger**: beim Team-Join in Lobby (nur wenn schon andere Teams da waren —
kein Mass-Jingle beim Beamer-Mount). Gestaffelt 250 ms versetzt bei mehreren
gleichzeitigen Joins.

### Lagerfeuer-Loop

**`startCampfireLoop()` / `stopCampfireLoop()`** — Brown-Noise-basierter
sanfter Knister-Loop als Atmosphäre-Layer.

- 4 % Master-Volume, Lowpass 600 Hz
- Sporadische Pop-Bursts (kurzer high-freq tick) alle 1–3 s
- Idempotent (Doppel-Start startet nicht zweimal), fadet sauber aus
- **Aktiv in**: LOBBY · PAUSED · PHASE_INTRO · RULES — wenn ein Quiz-Abend „atmet"
- Respektiert `musicMuted` und `globalMuted`

### Files

- [`frontend/src/utils/sounds.ts`](frontend/src/utils/sounds.ts) — alle neuen Sound-Helpers
- [`frontend/src/pages/QQBeamerPage.tsx`](frontend/src/pages/QQBeamerPage.tsx) — Trigger:
  - `playWolfHowl` 700 ms nach GAME_OVER
  - Campfire-Loop-useEffect je nach Phase
  - Avatar-Jingle-Tracker bei Team-IDs-Diff in Lobby

---

## 4) Live-Reactions vom Phone

Spieler-Phones haben in passiven Beobachter-Phasen ein Reaction-Pad. Tap auf
ein Emoji → fliegt am Beamer als Mini-Burst von unten nach oben.

### Backend

**`socket.on('qq:reaction')`** in [`backend/src/quarterQuiz/qqSocketHandlers.ts`](backend/src/quarterQuiz/qqSocketHandlers.ts):
- Payload: `{ roomCode, teamId, emoji }`
- Whitelist gegen Spam: `👏 🔥 😱 😢 🎉 😂`
- Rate-Limit: max **4 Reactions pro 5-Sek-Fenster** pro Team (silent throttle, kein Error)
- `reactionLog` als in-memory Map pro Room/Team (lebt nicht in qqRooms-Persistenz, ephemerer Anti-Spam-Memo)
- Broadcastet als `qq:reactionBurst` an alle Clients im Room

### Phone

**`ReactionPad`-Component** in [`frontend/src/pages/QQTeamPage.tsx`](frontend/src/pages/QQTeamPage.tsx):
- 6 Emojis als 48×48 Buttons in einer Reihe
- **Sichtbar** in: REVEAL · PLACEMENT · PAUSED · GAME_OVER · THANKS · PHASE_INTRO · TEAMS_REVEAL
- **NICHT sichtbar** in QUESTION_ACTIVE damit es nicht von der Antworteingabe ablenkt
- Tap → 320 ms Pop-Animation + 15 ms Vibration + `qq:reaction`-Emit
- Lokaler 250 ms-Cooldown gegen Doppel-Taps (Backend hat 5 s-Window dazu)

### Beamer

**Reaction-Float-Overlay** in [`frontend/src/pages/QQBeamerPage.tsx`](frontend/src/pages/QQBeamerPage.tsx):
- `socket.on('qq:reactionBurst')` → Reaction-Float-State
- Pro Burst: random X-Position 5–95 %, einzigartige id, Auto-Cleanup nach 3.5 s
- Render als fixed-position Overlay (zIndex 9000, pointer-events none)

### Animation `reactionFloat`

| Zeitpunkt | Position | Scale | Opacity |
|---|---|---|---|
| 0 % | bottom 0 | 0.6 | 0 |
| 12 % | -8 vh | 1.15 | 1 |
| 80 % | -78 vh | 1 | 1 |
| 100 % | -100 vh | 0.85 | 0 |

font-size `clamp(36px, 4.4vw, 64px)`, warmer drop-shadow.

---

## 5) Time-Travel-Replay am Game-Over

Erscheint 5.5 s nach GAME_OVER über dem Sieger-Hero und spielt alle geloggten
Fragen in 15 Sek (1 Sek pro Frage) als 5×3-Grid ab.

### Recorder (Module-Level in QQBeamerPage)

Backend trackt Frage-Gewinner nicht historisch (nur live in `correctTeamId`),
also recorded der Beamer live im Frontend:

```ts
type RecordedQuestion = { winnerId: string | null; category: string; idx: number };
const recordedQuestions = new Map<string, RecordedQuestion>();
const recordedSteals = new Set<string>();  // "row-col-teamId"
```

- **`recordedQuestions`**: bei jedem QUESTION_REVEAL-Entry geupdated mit aktueller `currentQuestion.id` + `correctTeamId`
- **`recordedSteals`**: bei jedem `lastPlacedCell` mit `wasSteal === true`
- **Reset bei LOBBY-Phase** (neues Spiel)

### ReplayOverlay-Component

3-Phasen-State-Machine:
1. **hidden** — initial, bis 5.5 s nach GAME_OVER-Mount
2. **intro** — 1.2 s Backdrop-Fade-In + Title
3. **replay** — 1 s pro Slot (revealedIdx steigt)
4. **done** — bleibt sichtbar, keine weitere Animation

Pro Slot:
- Frage-Index oben links in Kategorie-Akzent-Farbe
- Winner-Avatar (oder "?" wenn niemand richtig)
- Slot-Background: gradient in Team-Farbe wenn Winner da, grau-leer sonst
- Slot-Border: 2 px in Team-Farbe wenn shown, 1 px grau sonst
- `replaySlotIn`-Animation (scale 0.5 → 1.18 → 1, blur 6 → 0)

Frame:
- `rgba(13,10,6,0.92)` mit 14 px Border-Radius
- `1.5px solid rgba(251,191,36,0.4)` Amber-Outline
- Backdrop-Blur(14 px)
- 80 px Amber-Glow Box-Shadow
- Title „⏱ SPIELVERLAUF · RECAP" in Block-Caps mit Glow

z-Index-Layering:
- 50 — Confetti
- 8500 — **ReplayOverlay**
- 9000 — Live-Reactions
- 9999 — FullscreenNudge / Errors

### Files

- [`frontend/src/pages/QQBeamerPage.tsx`](frontend/src/pages/QQBeamerPage.tsx) —
  Module-Level-Maps · Recorder-useEffects · `ReplayOverlay`-Component

---

## Gemeinsame Designprinzipien

1. **100 % nah am bestehenden Cozy-Dark-Stil** — keine eigene Farbwelt, keine
   neuen Schriften, alles nutzt `QQ_CAT_ACCENT` und Amber-Akzente
2. **Keine Bloßstellung von Verlierern** — Win-Haptik nur für Sieger, Wrong-
   Pulse einfacher dumpfer statt Hammer-Buzz, Reactions sind anonym (kein
   Team-Name auf der Float-Animation)
3. **Defensiv gegen fehlende APIs** — Vibration auf iOS Safari, AudioContext
   ohne User-Gesture, Sockets im Test-Mode → alle Stellen silent no-op
4. **Backend-Performance**: Live-Reactions sind ein dünner Broadcast-Kanal
   ohne State-Update — kein Storage-Druck, rate-limited
5. **Player-Erlebnis vor Polish**: jedes Feature ist sofort testbar in 1–2
   Spielen, kein „Lazy-Load until perfect"

---

## Metriken (was sich nicht in Code-Zeilen messen lässt)

- **Reaktion**: erstes Mal Wolf-Howl beim Game-Over → „Wow, das war
  wirklich ein **Wolf** am Ende"
- **Reaktion**: erstes Mal Phone-Vibration bei Joker → „Hat mein Phone
  gerade gewusst dass ich was gewonnen habe?"
- **Reaktion**: erstes Mal Reaction von Phone fliegt am Beamer hoch →
  „Mein 🔥 ist auf dem Beamer!"
- **Reaktion**: erstes Mal Replay läuft → „Das ganze Spiel nochmal in 15
  Sekunden"
- **Reaktion**: erstes Mal Hot-Seat-Spotlight → „Es leuchtet auf mich!"

Wenn alle 5 Reaktionen in einem Spielabend kommen — Mission accomplished.

---

## Pull-Requests / Commits (in Reihenfolge)

1. `feat(haptics): Phone vibriert synchron zum Beamer` — [`7e5020c`](https://github.com/cozyquizapp/KioskQuiz/commit/7e5020c)
2. `feat(beamer): Hot-Seat-Spotlight auf aktives Team in ScoreBar` — [`2a3d66e`](https://github.com/cozyquizapp/KioskQuiz/commit/2a3d66e)
3. `feat(sounds): Cozy-Soundscape — Wolf-Howl, Avatar-Jingles, Lagerfeuer-Loop` — [`810cf3c`](https://github.com/cozyquizapp/KioskQuiz/commit/810cf3c)
4. `feat(reactions): Live-Reactions vom Phone fliegen über den Beamer` — [`e31bb42`](https://github.com/cozyquizapp/KioskQuiz/commit/e31bb42)
5. `feat(replay): Time-Travel-Recap am Game-Over` — [`30a730f`](https://github.com/cozyquizapp/KioskQuiz/commit/30a730f)

Branch: `main`. Keine Reverts geplant — alle Features sind defensiv gebaut
und brechen die Spielbarkeit nicht wenn was nicht passt (silent no-ops überall).
