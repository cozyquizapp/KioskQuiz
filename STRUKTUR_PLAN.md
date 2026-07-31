# Struktur-Audit + Umbauplan (2026-07-31)

Frage von Wolf: "koennen wir das Ganze ohne kaputt machen bugfix-sicherer und
umbaufreundlicher machen?"

Kurze Antwort: **ja, und der groesste Teil davon ist risikolos.** Die Datei-
groessen sind NICHT das eigentliche Problem. Das eigentliche Problem ist, dass
der TypeScript-Compiler an genau den Stellen wegschaut, an denen die Bugs
entstehen: an der Grenze zwischen Handy/Beamer/Moderator und Server.

---

## 1. Befund in Zahlen

| Was | Wert |
|---|---|
| Code gesamt (ts/tsx in frontend+backend+shared) | ~129.000 Zeilen |
| `backend/src/server.ts` | 10.622 Zeilen, 112 REST-Routen, 48 Socket-Handler |
| `backend/src/quarterQuiz/qqRooms.ts` | 7.470 Zeilen, 157 Exports |
| `frontend/src/pages/QQModeratorPage.tsx` | 6.188 Zeilen, 25 useState, 33 useEffect |
| `frontend/src/pages/QQBeamerPage.tsx` | 5.725 Zeilen, 19 useState, **66 useEffect** |
| `QQRoomState` (Backend-Spielzustand) | ~160 Felder in EINEM flachen Objekt |
| `QQStateUpdate` (was ans Frontend geht) | 131 Felder, per Hand gemappt (190 Zeilen) |
| Socket-Events Backend | 127 Handler (QQ) + 48 (Legacy) |
| Unit-Tests | 4 Dateien, 603 Zeilen |
| `any` im Code | ~993 Stellen (FE 521, BE 472) |
| Linter (frontend/backend) | keiner (nur `studio/` hat eslint) |
| Typecheck im Build | **findet nicht statt** (`vite build` prueft keine Typen) |
| Tests in CI | laufen mit `continue-on-error: true` = blockieren nichts |

Positiv, und das ist die gute Nachricht: `tsc --noEmit` laeuft heute auf
Frontend UND Backend mit **0 Fehlern**. Das Netz kann also sofort scharf
gestellt werden, ohne dass erst 200 Altlasten abgeraeumt werden muessen.

---

## 2. Die 5 echten Risiken (nach Schmerz sortiert)

### R1: Der Socket-Vertrag ist komplett untypisiert
`frontend/src/hooks/useQQSocket.ts:96`

```ts
function emit(event: string, payload?: unknown): Promise<QQAck>
```

127 Event-Namen, beidseitig als lose Strings. Konsequenz:
* Ein Tippfehler im Event-Namen = **stiller** Ausfall. Kein Compile-Fehler,
  kein Laufzeitfehler, der Knopf tut einfach nichts.
* Wenn sich ein Payload aendert (Feld umbenannt, Feld dazu), merkt das
  niemand. Backend liest `payload.teamId`, Frontend schickt `payload.team`:
  gruener Build, kaputtes Spiel.
* Umbenennen eines Events ist heute eine Suchen-und-Ersetzen-Aktion auf
  Verdacht.

Das ist die Nummer 1 fuer "bugfix-sicherer".

### R2: Der Spielzustand hat einen unsichtbaren Zwilling
`backend/src/quarterQuiz/qqRooms.ts`

**79 verschiedene Felder** haengen per `(room as any).xyz` am Room-Objekt,
insgesamt 154 Zugriffe. Darunter Sachen, die das Spiel wirklich steuern:
`_phaseSnapshot`, `_teamSockets`, `_hotPotatoOrder`, `_undoSnapshot`,
`_comebackHLTimerHandle`, `tieBreaker`, `venue`, `botsPaused`, `_testMode`,
`_bluffReviewWatchdog`, `_gameResultPersisted` ...

Diese Felder existieren fuer den Compiler nicht. Tippfehler dort sind still,
Umbenennen ist blind, und beim Lesen der `QQRoomState`-Definition sieht man
nur die halbe Wahrheit. Genau in dieser Ecke sitzen die Bugs ohne Repro
(Joker-Re-Detection nach Steal, Team-Color-Swap beim Final-Start).

### R3: Nichts blockiert einen kaputten Stand
* `.github/workflows/ci.yml` laesst Tests mit `continue-on-error: true`
  laufen. Ein roter Test stoppt nichts.
* `frontend/package.json` baut mit `vite build`. Vite wirft Typen weg,
  ohne sie zu pruefen. Ein Typfehler im Frontend faellt erst live auf.
* Kein Linter im Frontend: vergessene `useEffect`-Dependencies (bei 66
  Effects auf der Beamer-Seite) fallen niemandem auf.

Push auf main deployt automatisch. Aktuell haelt also **nichts** einen
kaputten Stand auf, ausser dass der Backend-Build zufaellig `tsc` benutzt.

### R4: Zwei Engines in einer Datei
`backend/src/server.ts` enthaelt neben dem QQ-Bootstrap noch die komplette
alte Kiosk-Quiz-Engine (`RoomState`, `broadcastState`, `joinRoom`,
`host:next`, `host:reveal`, `host:lock`, `host:blitz*`, `host:rundlauf*`,
`map:nextPin`, `beamer:show-rules` ...).

Geprueft: **kein einziger dieser `host:*` / `map:*` / `beamer:*`-Events wird
von frontend/, studio/, preview/, scripts/ oder _archive/ noch gesendet.**
Vom Legacy-REST-Teil nutzt das Frontend nur noch 6 Routen (`lobby-stats`,
`mark-funny`, `admin-session`, `show-intro`, `next-question`, `reveal`, eine
davon mit `TODO(LEGACY)`-Kommentar in `components/moderator/ActionButtons.tsx:274`).

Das heisst: ein sehr grosser Teil der 10.622 Zeilen ist Ballast, den man
jedes Mal mitliest und mit-durchsucht, wenn man einen echten Bug jagt.

### R5: Die grossen Dateien mischen Ebenen
`qqRooms.ts` ist eigentlich sauber gebaut (Funktionen auf einem State-Objekt,
kein Klassen-Wirrwarr), aber es sind eben 157 davon in einer Datei: Room-
Lifecycle, Grid-Mechanik, Scoring, 6 Minispiele, Finale, Tiebreaker, Awards
und der State-Builder. Gleiches Muster bei `QQModeratorPage.tsx`.

Das ist der harmloseste Punkt der Liste: unbequem, aber nicht gefaehrlich.
Deshalb steht er hier ganz unten und nicht ganz oben.

---

## 3. Was bewusst NICHT angefasst wird

* **Die ~993 `any`s global aufraeumen.** Sinnlose Fleissarbeit mit hohem
  Regressionsrisiko. Nur die `any`s an der Vertragsgrenze (R1, R2) werden
  angefasst, das sind ca. 220.
* **Inline-Styles zu CSS-Klassen umbauen** (418 in der Moderator-Seite).
  Design ist eingefroren, das bringt null Bugfix-Sicherheit.
* **State-Management-Bibliothek einfuehren** (Redux/Zustand/XState). Der
  Server ist die einzige Wahrheit, das Muster funktioniert. Ein Umbau hier
  waere ein Rewrite, kein Refactor.
* **Komponenten "schoen" aufteilen ohne Anlass.** Nur da schneiden, wo real
  regelmaessig gearbeitet wird.

---

## 4. Der Plan, in Stufen

Regel fuer alle Stufen: **keine Verhaltensaenderung.** Jede Stufe ist einzeln
deploybar und einzeln zurueckrollbar.

### Stufe 0: Sicherheitsnetz (ca. 1 bis 2 Stunden, Risiko: null)

Kein Zeilchen Spiel-Logik wird angefasst.

1. Root-Script `npm run typecheck` = `tsc --noEmit` fuer Frontend + Backend.
   Laeuft heute schon gruen, kostet also nichts.
2. `frontend/package.json`: `"build": "tsc --noEmit && vite build"`.
   Ab da faellt ein Typfehler beim Build auf, nicht auf dem Beamer.
3. `ci.yml`: `continue-on-error: true` raus, `typecheck` als Schritt rein.
4. ESLint minimal fuer frontend+backend. Nicht die volle Dogmen-Konfig,
   sondern 5 Regeln, die echte Bugs finden:
   `react-hooks/exhaustive-deps` (Warnung), `no-unused-vars`,
   `no-floating-promises`, `no-constant-condition`, `no-dupe-keys`.
5. `CLAUDE.md` ins Repo-Root: Architektur in 30 Zeilen, die harten Regeln
   (Beamer nie scrollen, Em-Dashes, DE+EN, `qqIsMega` statt `largeGroupMode`,
   Design eingefroren). Das Repo hat aktuell keine, jede frische KI-Session
   muss sich alles neu erarbeiten.

**Nutzen:** ab hier kann ein kaputter Stand nicht mehr unbemerkt live gehen.

### Stufe 1: Vertraege dicht machen (ca. 1 Tag, Risiko: sehr niedrig)

Das ist der eigentliche Hebel fuer "bugfix-sicherer".

**1a. Socket-Events typisieren.** Neue Datei `shared/qqEvents.ts`:

```ts
export interface QQClientToServer {
  'qq:placeCell':    { roomCode: string; teamId: string; row: number; col: number };
  'qq:submitAnswer': { roomCode: string; teamId: string; answer: string };
  // ... 127 Eintraege, aber inkrementell
}
```

`emit` in `useQQSocket` und `safeEmit` werden generisch ueber diesen Typ.
Backend bekommt einen `onQQ(socket, 'qq:placeCell', (p) => ...)`-Wrapper, der
den Payload typt. Ab da ist ein falscher Event-Name oder ein falsches Feld
ein **roter Build**, kein stiller Aussetzer im Livespiel.

Inkrementell machbar: erst die ~20 heissen Events (placeCell, stealCell,
submitAnswer, markCorrect, markWrong, chooseFreeAction, startGame,
nextQuestion, revealAnswer, ...), Rest nach und nach. Nicht typisierte Events
funktionieren in der Zwischenzeit unveraendert weiter.

**1b. Den Schatten-State legalisieren.** Die 79 `(room as any)._xyz`-Felder
als echte optionale Felder in `QQRoomState` deklarieren, gruppiert und
kommentiert ("interne Laufzeitfelder, gehen NICHT ins Broadcast"). Rein
mechanisch, keine Logikaenderung, aber danach faengt der Compiler Tippfehler
und Umbenennen wird sicher.

**1c. Guard-Test fuer `buildQQStateUpdate`.** Ein Test, der prueft, dass
jedes Feld von `QQStateUpdate` tatsaechlich befuellt wird. Verhindert die
Klasse "neues Feld gebaut, aber der Beamer sieht es nie", die bei 131
handgemappten Feldern vorprogrammiert ist.

### Stufe 2: Ballast raus (ca. 3 bis 4 Stunden, Risiko: niedrig mit Messung)

**2a. Legacy-Engine aus `server.ts`.** Nicht blind loeschen, sondern:
1. Alle `host:*`, `map:*`, `beamer:show-rules`-Handler und die ungenutzten
   Legacy-REST-Routen mit einem Zaehler-Log versehen ("LEGACY HIT: xyz").
2. Eine Show damit laufen lassen.
3. Was nicht geloggt hat, fliegt raus.

Erwartung nach heutiger Messung: `server.ts` schrumpft von 10.622 auf
grob 5.000 bis 6.000 Zeilen. Das halbiert die Suchflaeche bei jeder
Backend-Fehlersuche.

**2b. `qqRooms.ts` aufteilen, ohne einen einzigen Import anzufassen.**
Datei wird zur Barrel-Datei (`export * from './qqGrid'` usw.), Inhalte
wandern in:

```
qqRoomsCore.ts     Room-Lifecycle, Teams, Timer, Answers
qqGrid.ts          place / steal / swap / freeze / shield / sandLock / stapel
qqScoring.ts       evaluate / markCorrect / markWrong / awards / mega
qqMinigames.ts     hotPotato / imposter / connections / bluff / onlyConnect
qqFinale.ts        tieBreaker / finalBets / comeback / awards
qqStateUpdate.ts   buildQQStateUpdate
```

Weil `qqRooms.ts` als Barrel bestehen bleibt, aendert sich **keine einzige
Import-Zeile** irgendwo im Projekt. Verifikation: `tsc` gruen + `git diff`
zeigt nur Verschiebungen. Das ist der risikoaermste grosse Schnitt, den es
hier gibt.

**2c. Gleiches Muster fuer `qqSocketHandlers.ts` (3.729) und
`QQModeratorPage.tsx` (6.188 → Panels je Bereich).** Nur machen, wenn Wolf
dort real haeufig arbeitet, sonst spaeter.

### Stufe 3: Netz unter der Spiel-Logik (fortlaufend)

Vor jedem groesseren Eingriff in eine Mechanik erst einen
Charakterisierungstest schreiben, der das **heutige** Verhalten festnagelt:
`qqPlaceCell`, `qqStealCell`, `qqEvaluateAnswers`, `qqMarkCorrect`,
`qqChooseFreeAction`, `qqMegaEventScore`. Die bestehenden Tests decken nur
reine Helfer ab (Step-Dekodierung, Ranking, Territorien), nicht die Mutatoren,
die das Spiel wirklich bewegen.

Das ist kein Projekt fuer sich, sondern eine Gewohnheit: wer eine Mechanik
anfasst, laesst einen Test zurueck.

---

## 5. Empfohlene Reihenfolge

1. **Stufe 0** sofort. Kostet fast nichts, verhindert ab morgen Live-Ausfaelle.
2. **Stufe 1b** (Schatten-State), weil rein mechanisch und sofort spuerbar.
3. **Stufe 1a** (Event-Vertrag) fuer die ~20 heissen Events.
4. **Stufe 2a** (Legacy raus) mit Mess-Show dazwischen.
5. **Stufe 2b** (qqRooms-Split), wenn 0 bis 2 stehen.
6. Stufe 1a Rest + 2c nach Bedarf.

Was NICHT passiert: kein Big-Bang, keine neue Bibliothek, kein Rewrite,
keine Design-Aenderung.
