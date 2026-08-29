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
Push auf `main` deployt **nur das Frontend** automatisch (Vercel).

> ⚠️ **Beim Backend NICHTS annehmen, sondern die Kennung lesen.** Es laeuft
> auf Coolify (self-hosted). Ob es sich von selbst deployt, hat sich in beide
> Richtungen schon geaendert:
>   * bis 2026-08-25 stand hier „deployt automatisch", und das war falsch -
>     es kostete einen halben Tag Fehlersuche im Code, waehrend der Server
>     schlicht eine alte Fassung lief. Wolf: „das problem besteht seit 10
>     pushes".
>   * seit 2026-08-27 deployt Coolify offenbar automatisch. Wolf dazu am
>     29.08.: „coolify sollte automatisch deployen? vercel hatte nur gestern
>     limis".
>
> ⚠️ Am 29.08. habe ich Wolf einen ausstehenden Redeploy als Tatsache gemeldet.
> Ich hatte ihn nie geprueft, sondern diesen Abschnitt in seiner alten Fassung
> geglaubt. Genau derselbe Fehler wie beim Bunte-Tuete-Register am selben Tag:
> einer Notiz vertraut statt gemessen. **Die Ansage „das Backend muss noch
> deployt werden" ist also nie eine Auskunft, sondern immer eine Messung.**
>
> Von einer Sitzung im Container aus laesst sich das NICHT pruefen: der
> Agent-Proxy weist `backend.cozyquiz.app` mit 403 ab (Richtlinie). Wer den
> Stand wissen will, liest ihn im Steuerpult ab, siehe naechster Absatz, oder
> fragt Wolf.
>
> Woran man es erkennt, ohne zu raten: das Steuerpult zeigt unter der
> Step-Anzeige „Buehne <kennung> · Server <kennung>". Meldet der Server keine
> Kennung, ist er aelter als dieser Stand. Dasselbe steht in `/api/health`
> als Feld `build`.
>
> 2026-08-27, Wolf: „coolify hat automatisch deployt, button ist schon da".
> Beim `lobbyOpen`-Feld kam der Redeploy also von selbst. Diese Warnung bleibt
> trotzdem stehen: sie hat einmal einen halben Tag gekostet, und ein Lauf, der
> gut ging, beweist nicht, dass der naechste es auch tut. Was der Fall aber
> zeigt, ist die beste Art zu pruefen: **ein neues Feld sichtbar machen**. Der
> Knopf „Lobby oeffnen" rendert nur, wenn der Server `lobbyOpen: false`
> schickt; bei einem alten Server ist das Feld undefined und der Knopf fehlt.
> Wer ein Feld hinzufuegt und es an EINER Stelle sichtbar macht, hat damit
> gratis eine Anzeige fuer den Deploy-Stand.

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

* **Der Raum lebt im RAM — aber er wird auch auf Platte geschrieben.** Ein
  Backend-Neustart allein reicht deshalb NICHT: `qqPersist` laedt den Raum
  beim Start wieder ein (im Log: `[QQ-persist] restored room …`). Fuer einen
  sauberen Repro-Lauf zusaetzlich `rm -f backend/.qq-rooms/*.json`.
  Achtung auf den Pfad: die Konstante heisst `.qq-rooms/` relativ zu
  `process.cwd()`, und `npm run start:backend` startet mit `--prefix backend`.
  Der Ordner liegt also unter **`backend/.qq-rooms/`**, nicht im Repo-Wurzel-
  verzeichnis. `rm` auf den Wurzelpfad loescht stillschweigend nichts, und man
  testet weiter gegen den alten Zustand (2026-08-22 genau so passiert).
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
* **Von den neun Bunte-Tüte-Spielen laufen im normalen Abend nur vier.**
  Aktiv: Heiße Kartoffel, Top 5, Fix It, Pin It. Nur CozyArena: Umfrage,
  Schwarmintelligenz. ⚠️ „Nur CozyArena" heißt **gespielt**, nicht
  **lauffähig**: beide haben einen CozyQuiz-Zweig im Server und laufen dort
  sauber (2026-08-29 gemessen, `scripts/paarung-probe.mjs`). Der Unterschied
  zur Heißen Kartoffel, die im Großformat hart herausgefiltert wird, ist
  Absicht — die ist dort mechanisch kaputt, diese beiden sind nur nicht
  geplant. Deaktiviert: Imposter, 4 gewinnt, Bluff — deren Views
  und Server-Logik liegen weiter im Repo und funktionieren, sie werden nur
  nicht ausgespielt. Wer daran baut, baut an etwas, das niemand zu sehen
  bekommt; das ist schon mehrfach passiert. Single Source of Truth sind
  `QQ_BUNTE_TUETE_ACTIVE` / `_ARENA_ONLY` / `_DEACTIVATED` in
  `shared/quarterQuizTypes.ts`.
* **Ein Team am Zug hat drei Aktionen, nicht sieben.** Aktiv sind nur
  Setzen, Klauen, Stapeln. Frost, Sanduhr/Bann, Schild und Tausch wurden
  frueh gestrichen, liefen aber jahrelang unerreichbar im Backend weiter und
  haben deshalb mehrfach zu falschen Annahmen gefuehrt; ihr Code ist seit
  2026-08-22 raus. Register: `QQ_BOARD_ACTIONS_ACTIVE` / `_RETIRED` in
  `shared/quarterQuizTypes.ts`. Merksatz fuer alle Mechaniken: es zaehlt, ob
  etwas **angeboten** wird, nicht ob es implementiert ist.
* **Die Comeback-Runde schlaeft, sie ist nicht tot.** 2026-07-07 deaktiviert
  (buggy und mechanisch redundant zur Final-Wager-Phase, die dieselbe Aufgabe
  uebernimmt). Der komplette Code liegt weiter da und ist ueber
  `QQ_COMEBACK_ENABLED` reaktivierbar — nicht aufraeumen, aber auch keine
  neuen Ansichten dafuer bauen, ohne vorher zu fragen.
* **Feature-Status hat drei Zustaende: aktiv, schlafend, ausgebaut.** Die
  Register stehen in `shared/quarterQuizTypes.ts` (Bunte Tuete, Brett-
  Aktionen, Comeback). Nicht damit verwechseln: `connectionsEnabled`,
  `cozyGamesEnabled`, `finalWagerEnabled`, `avatarsEnabled` sind pro Raum im
  Wizard schaltbar — lebende Features, kein toter Code.
* **Draft-Daten haben zwei Ebenen** (Datei-Startup + Mongo im
  `/api/qq/drafts`-Endpoint). Live liest Mongo. Gate ist
  `npm --prefix backend run check:en:live`.
* **`qqIsMega(state)` benutzen, nie `largeGroupMode` roh.**
* **Das Grossformat heisst CrowdQuiz, nicht mehr CozyArena** (Wolf
  2026-08-28: „ok cozyarena heisst jetzt CrowdQuiz"). Umbenannt wurde nur der
  SICHTBARE Text, siebzehn Stellen. Bezeichner, Dateipfade und die rund
  hundertsiebzig Kommentare heissen weiter `cozyArena` - das ist Absicht:
  * `avatarSetId: 'cozyArena'` ist **persistiert**. Der Wert steht in
    gespeicherten Raeumen (`backend/.qq-rooms/*.json`) und wird beim Neustart
    zurueckgelesen. Umbenennen ohne Migration bricht laufende Raeume.
  * `frontend/public/avatars/cozyarena/` ist ein Ordnername, keine
    Beschriftung. Umbenennen kostet dort nur Risiko.
  Wer in einem Kommentar „CozyArena" liest, liest also den alten Namen
  desselben Formats.
* **Fraktionen sind keine Tiere.** CrowdQuiz hat 8 Fraktionen mit Wappen,
  `avatarId` ist nur ein Farb-Slot.
* **⚠️ CrowdQuiz teilt das DESIGN mit CozyQuiz, nicht die MECHANIK.** Wolf
  2026-08-28: „crowdquiz hat spezifische kategorien und views die cozyquiz
  nicht hat und das muss bei 40 geraeten auch so sein … das hat mit font und
  eckige formen und farbe nichts zu tun, aber darf nicht kaputt gemacht
  werden."

  Seit dem 28.08. laeuft CrowdQuiz im CozyQuiz-Standarddesign. Angeglichen
  wurde damit die SPRACHE: Schrift, Farbe, Flaechen, Ecken, Schatten. Nicht
  angeglichen wird, WAS auf der Folie steht. Die Trennlinie ist einfach:
  gleiche Woerter, andere Saetze.

  Was CrowdQuiz allein gehoert und bleiben muss:
  * **Fraktionen statt Teams.** Bis **40 Teams** auf 8 Fraktionen gebuendelt
    (`nestedTeams`), also 8 x 5. Die Zahl steht als `QQ_MAX_TEAMS_LARGE` in
    shared/quarterQuizTypes.ts und wird ueberall aus der Konstante gelesen.
    ⚠️ Bis 2026-08-28 behaupteten neun Kommentare und der Wizard-Text „bis 25
    Teams" - eine Zahl von vor dem 10.07. Der Code war nie falsch, nur der
    Text. Wolf hat es beim Nachfragen bemerkt, nicht ich. Die Wappen sind fest an Name UND
    Farbe gebunden (`frontend/src/cozyArenaCrests.ts`) - Bauchgefuehl ist
    orange, Risiko ist rot. Kein freier Avatar-Satz, deshalb haengt auch die
    Avatar-Vorgabe am Format (`qqDefaultAvatarSetId`).
  * **Zwei eigene Bunte-Tuete-Mechaniken**: Umfrage und Schwarmintelligenz
    (`QQ_BUNTE_TUETE_ARENA_ONLY` in shared/quarterQuizTypes.ts).
  * **Kein Spielbrett.** Statt Setzen/Klauen/Stapeln laeuft ein Bar-Race
    (`CozyQuizLargeGroupView`), gewertet wird der ANTEIL richtiger Antworten,
    damit eine grosse Fraktion keinen Vorteil hat.
  * **Ten Chips auf Fraktionen gebuendelt** und eine eigene Siegerehrung mit
    fuenf Awards.

  ⚠️ **Die Siegerehrung von CrowdQuiz ist unantastbar.** Wolf 2026-08-29:
  „die crowd quiz zeremonie muss bleiben! dort funktioniert die cozyquiz bar
  race nicht." Sie liegt in `LargeGroupGameOverView` (CozyQuizLargeGroupView.tsx)
  und laeuft ueber `qq:awardStep`: erst die Awards, einer je Takt, dann die
  Kroenung („Wer kroent sich?", das Fraktions-Roulette), dann der Endstand.
  Der Server laesst den Schritt ausdruecklich nur in GAME_OVER und nur im
  Grossformat zu (`qqAwardStep`). Am Design darf man arbeiten - Ecken, Schrift,
  Schein. Der ABLAUF und die WERTUNG bleiben, und die CozyQuiz-Siegerehrung
  (Turm-Finale, `springe('final-reveal')`) gehoert dort nie hin.

  📄 **Die vollstaendige Liste der Unterschiede steht in `docs/FORMATE.md`**
  und wird erzeugt, nicht gepflegt: `node scripts/formate-vergleich.mjs`. Sie
  liest jede Stelle im Code, an der sich das Verhalten nach Format gabelt, samt
  dem Kommentar darueber. Teil 1 sind die Regeln, die CrowdQuiz zu CrowdQuiz
  machen (Server und Register, rund vierzig, entscheidbar), Teil 2 die Folgen
  in den Ansichten (rund dreihundertsechzig, zum Nachschlagen).
  Wolf 2026-08-29: „wichtig waere vlt einmal die UNTERSCHIEDE zwischen
  cozyquiz und crowdquiz zu identifizieren, anhandessen kann entschieden
  werden, was gewollt und was nicht ist."

  ⚠️ Was dort NICHT steht, und das ist die wichtigere Haelfte: Unterschiede
  ohne Weiche im Code. Dieselbe Ansicht mit vierzig statt acht Teams, etwas
  das in CrowdQuiz fehlt, ohne dass es jemand abgeschaltet hat, und Text, der
  dort schlicht falsch ist, weil er von CozyQuiz erzaehlt. Dafuer die
  Bild-Werkzeuge: `crowd-abgleich.mjs`, `crowd-ankommen.mjs`,
  `crowd-zeremonie.mjs`.

  ⚠️ Besonders fuer Werkzeuge: `scripts/design-referenz.mjs` vergleicht
  CrowdQuiz mit CozyQuiz. Es vergleicht den WORTSCHATZ, nicht das Bild, und
  genau deshalb ist es ungefaehrlich. Wer daraus je ein „mach die Ansichten
  gleich" macht, nimmt CrowdQuiz sein Format weg.

  ⚠️ **Und die Falle darunter, die zweimal zugeschlagen hat:** ein Werkzeug,
  das CrowdQuiz misst, misst leicht CozyQuiz mit Wappen. Der Avatarsatz haengt
  an einem anderen Feld als das Format, das Bild SIEHT also richtig aus.
  * 2026-08-28: der Harness setzte kein Design, also mass er `buehne`, wo der
    Abend `cozy` fuhr.
  * 2026-08-29: der Harness gab `largeGroupMode` nicht an `qq:startGame` mit.
    `qqStartGame` rechnet `largeGroupMode === true || nestedTeams === true`,
    beide waren undefined, und damit war JEDE Station mit gestartetem Spiel
    in Wahrheit CozyQuiz. Aufgefallen an drei Wortresten in einem Bild:
    „Final-Phase" (gibt es dort nicht), „#11" (bei acht Fraktionen) und
    „1 Feld" (in einem Format ohne Brett).

    Gegenprobe, die nichts kostet: `qq:awardStep` wirft im falschen Format
    einen Fehler. Wer die Zeremonie ansteuern kann, hat CrowdQuiz.

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
