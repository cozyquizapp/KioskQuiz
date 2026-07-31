# CozyQuiz (intern: QQ / quarterQuiz)

Live-Quiz fuer Bars und Firmenevents. Wolf moderiert am Laptop, das Publikum
spielt am Handy, alles laeuft parallel auf dem Beamer. Drei Ansichten, ein
Server, ein Zustand.

> ⚠️ **Nicht verwechseln:** Dieses Repo ist CozyQuiz. Das Party-Schaetzspiel
> **wonky guess** liegt in einem eigenen Repo (`Desktop/PARTYAPP`). Im Zweifel
> nachfragen, bevor Dateien angefasst werden.

---

## Vor dem Push: das Gate

```bash
npm run gate        # typecheck + tests + lint, genau das laeuft auch in CI
```

Einzeln: `npm run typecheck` · `npm test` · `npm run lint`

CI blockiert bei Typfehlern, roten Tests und Lint-**Fehlern**.
Lint-**Warnungen** blockieren nicht (Bestand: ~464, siehe STRUKTUR_PLAN.md).
Push auf `main` deployt automatisch: Backend nach Coolify, Frontend nach Vercel.

## Lokal starten

```bash
npm run start:backend    # Port 4000, OHNE MONGODB_URI = In-Memory
npm run start:frontend   # Port 5173
```

Beamer-Durchlauf zum Pruefen: `/moderator-test?arena=1&mega=1&run=1`,
Screenshot bei 1760x990. Nie gegen Prod testen, da laufen echte Raeume.

---

## Architektur in einem Absatz

Der Server haelt pro Raum ein `QQRoomState`-Objekt im **RAM**
(`backend/src/quarterQuiz/qqRooms.ts`). Jede Aktion ist ein Socket-Event, das
eine Mutator-Funktion auf diesem Objekt aufruft. Danach wird per
`buildQQStateUpdate(room)` ein flaches `QQStateUpdate` gebaut und an alle
Clients im Raum gebroadcastet. Die Clients rendern nur, sie rechnen nicht.
REST gibt es fast nur noch fuer Drafts, Uploads und Auswertung.

```
frontend/src/pages/QQBeamerPage.tsx      Buehne (delegiert an components/CozyQuiz*View.tsx)
frontend/src/pages/QQTeamPage.tsx        Handy
frontend/src/pages/QQModeratorPage.tsx   Wolfs Steuerpult
frontend/src/hooks/useQQSocket.ts        einziger Socket-Eingang im Frontend
shared/quarterQuizTypes.ts               QQPhase, QQStateUpdate, Team-/Grid-Typen
backend/src/quarterQuiz/qqRooms.ts       Spiel-Logik (Mutatoren auf QQRoomState)
backend/src/quarterQuiz/qqSocketHandlers.ts  Event -> Mutator -> Broadcast
backend/src/server.ts                    Express, Uploads, Drafts, Legacy-Engine
```

`todo.md` ist die Single Source of Truth fuer offene Punkte.
`STRUKTUR_PLAN.md` beschreibt die bekannten Struktur-Risiken und den Umbauplan.

---

## Fallen, die schon mehrfach Zeit gekostet haben

* **Der Raum lebt im RAM.** Fuer einen sauberen Repro-Lauf Backend neu
  starten, sonst testet man gegen einen halb benutzten Zustand.
* **Der Socket-Vertrag ist untypisiert.** `emit(event: string, payload?:
  unknown)`. Ein Tippfehler im Event-Namen faellt nirgends auf, der Knopf tut
  einfach nichts. Beim Umbenennen beide Seiten pruefen.
* **`QQRoomState` hat ~79 Felder, die per `(room as any)._xyz` drankleben**
  und im Typ nicht auftauchen (`_phaseSnapshot`, `_undoSnapshot`,
  `_teamSockets`, Timer-Handles ...). Vor jeder Aenderung dort grep statt
  Typ-Vertrauen.
* **Neues State-Feld?** Es muss in `buildQQStateUpdate` eingetragen werden,
  sonst kommt es am Beamer nie an.
* **Cozy-CSS-Variablen kommen aus `main.css` `:root`, nicht aus dem
  COZY-Theme-Objekt.** `setActiveThemeId('cozy')` ist ein No-Op. Wer Farben
  prueft, prueft gegen main.css.
* **Draft-Daten haben zwei Ebenen** (Datei-Startup + Mongo im
  `/api/qq/drafts`-Endpoint). Live liest Mongo. Gate ist
  `npm --prefix backend run check:en:live`.
* **`qqIsMega(state)` benutzen, nie `largeGroupMode` roh.**
* **Fraktionen sind keine Tiere.** CozyArena hat 8 Fraktionen mit Wappen,
  `avatarId` ist nur ein Farb-Slot.

---

## Harte Regeln

* **Deutsche UI, Umlaute direkt tippen** (ae/oe/ue nur in Code-Kommentaren).
  **Keine Em-Dashes**, auch nicht in Antworten an Wolf.
* **Alles zweisprachig** (DE + EN). Features werden fuers Produkt fertig
  gebaut, nicht nur fuer das naechste Event.
* **Der Beamer bekommt nie eine Scrollbar.** Buehne ist fix 1760x990.
* **Design ist eingefroren.** Keine Geschmacks-Politur vorschlagen.
  Bewusste Design-Entscheidungen sind keine Bugs (im Zweifel: Kommentar im
  Code lesen, dort steht meist das Datum und Wolfs Zitat).
* **Bei Design-/Motion-Arbeit** zuerst die Skills `ui-ux-pro-max`, `animate`
  und `color-contrast` laden und wirklich anwenden.
* **Assets ausmessen, nicht schaetzen** (Alpha-BBox), bevor Layout-Werte
  gesetzt werden.
* **Erst rot, dann gruen.** Bug reproduzieren, bevor er gefixt wird.
  Ueberraschung ist ein Stoppschild, kein Zufall.
* **Nach jeder Aenderung committen und pushen.** Wolf arbeitet nicht waehrend
  eines laufenden Events, also nicht zur Vorsicht mahnen. Force-Push auf main
  nur auf Ansage.
