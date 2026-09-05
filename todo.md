# CozyQuiz — TODO (Single Source of Truth)

> **Regel (gegen Stale-Listen):** Diese Datei listet **nur genuin offene** Punkte.
> Erledigt → im **selben Commit hier löschen** (die Git-History ist der Beleg, dass
> es das Todo mal gab). `SESSION_LOG.md` ist reines **Verlaufsprotokoll**, KEIN
> Tracker. README/ROADMAP nur grobe Blöcke, keine Einzel-Todos.
>
> **Gruppiert nach WER BLOCKIERT** — nicht nach Datum. Neue Punkte in den passenden
> Block, nicht unten anhängen. Kein Handoff-Stapeln mehr.
>
> **Destilliert 2026-07-17:** 569 → ~150 Zeilen. Erledigtes + 8 abgearbeitete Specs raus
> (`docs/archive/`), Handoffs vom 22.6./23.6./25.6./5.7./12.7./15.7./16.7. zusammengeführt.
> Grund: die echten offenen Punkte ertranken in 550 Zeilen Vergangenheit → wir haben
> zweimal an denselben Fixes gesessen. Details der Erledigten: `git log`.

---

## ✅ LANDING cozywolf.de — FERTIG (Wolf 2026-08-28)

Wolf: „landing kannst du abhacken ist fertig". Der Umbau lief parallel in
einem eigenen Fenster, eigenes Repo (`cozyquizapp/cozywolf-landing`), eigener
Deploy.

Was hier stand — Bestandsaufnahme der sieben Routen, „Das Spiel hinter dem
Abend", die vier Ungereimtheiten aus dem Feedback und meine Gegenrede dazu —
ist damit erledigt oder ueberholt. Die Einzelheiten stehen in
`docs/UEBERGABE_LANDING.md` und in der Historie des Landing-Repos, nicht hier:
das ist ein anderes Repo, und eine Kopie davon waere nach einer Sitzung falsch.

⚠️ Was bleibt, falls die Seite wieder angefasst wird: die Marke ist dort
ABSICHTLICH anders (Marketing-Pink #FA4BA3 gegen App-Pink #EC4899, per
Logo-Pixelmessung). Das ist kein Fehler und keine Uebertragung, die noch
aussteht.

---

## 🩹 BUEHNE WAR LEER (Wolf 2026-08-27) — behoben

- ✅ **Meine Luecke, und sie war unsichtbar.** Wolf: „seite ist momentan leer",
      Bild: nur Sternenfeld, kein einziges Zeichen, keine Fehlermeldung.

      Der Lobby-Zustand haengt an drei Feldern, also an ACHT Kombinationen. Im
      Code standen drei Bedingungen nebeneinander, jede mit eigenen
      Anforderungen, und eine Kombination traf keine davon:

      ```
      setupDone      = true    Moderator ist im Cockpit
      lobbyOpen      = false   Lobby noch nicht geoeffnet     <- neu von heute
      formatSelected = false   Format-Schritt nie durchlaufen
      ```

      NeutralWelcome verlangte `!setupDone`, PausedView `formatSelected !== false`,
      LobbyView `lobbyOpen !== false`. Niemand war zustaendig.

      ⚠️ **Ein Absturz meldet sich, eine Luecke nicht.** Genau deshalb ist das
      durchgerutscht: kein Fehler in der Konsole, keine rote Box, nur nichts.
      Und das Feld, das die Luecke aufgemacht hat, war meins.

      Der Fix ist nicht die eine zusaetzliche Klammer, sondern die BAUFORM: eine
      Kette mit Rueckfall, deren letzter Zweig keine Bedingung hat. Damit kann
      es strukturell keine Luecke mehr geben.
      Beweis: `node scripts/lobby-lueckenlos.mjs` faehrt alle acht an.

      ⚠️ Zweite Falle im Werkzeug selbst: `formatSelected` kennt nur EINE
      Richtung, der Server setzt es ausschliesslich auf true. Ein naiver
      Dreifach-Schleifendurchlauf testet ab der zweiten Zeile etwas anderes, als
      er in die Tabelle schreibt - der erste Anlauf hat trotzdem acht Haken
      gemeldet. Jetzt erst alle vier mit false, dann umschalten.

---

## 🚪 ANKOMMEN, Schritt 3 (Wolf 2026-08-27)

- ✅ **„Heute Abend" und die Avatare gebaut.**
      „Heute Abend" ist die einzige Karte mit echten Zahlen, die es VOR der
      ersten Frage gibt. Nachgesehen per Socket-Mitschnitt, was die Buehne im
      Ankommen-Zustand ueberhaupt weiss: `totalPhases`, `timerDurationSec`,
      `finalWagerEnabled`, `cozyGamesEnabled`. Die **Kategorien sind nicht
      dabei**, die liegen im Entwurf beim Moderator - deshalb stehen sie nicht
      auf der Karte. Beide Sprachen gleichzeitig, die Zeilen sind kurz genug.

      Die Avatar-Karte braucht null Daten und ist die reinste Form des
      2a-Designs. Zwei Reihen a acht, gemessen: bei drei Reihen lief die
      unterste aus dem Bild.

      Umlauf jetzt: 4 Karten, 8 Bilder, 64 Sekunden.

- ✅ **Schritt 4 gemacht, aber anders als angekuendigt** (2026-08-27).
      Meine Begruendung war falsch: ich hatte gesagt, „Wie funktioniert's" sei
      „die einzige in der alten Panel-Optik". Beim Nebeneinanderlegen der vier
      stimmte das nicht mehr - die Flaechen sind laengst dieselben Tokens, ich
      hatte die drei neuen ja danach gebaut.

      Der echte Unterschied ist die DICHTE, und er ist messbar:

      ```
      Wie funktioniert's    900 px breit, Zeichen bis  44 px, links
      Heute Abend          1100 px,       Zahl        84 px, mittig
      Schon da             1280 px,       Kachel     104 px, mittig
      Avatare              1280 px,       volle Kachel,      mittig
      ```

      Drei Plakate und eine Handbuchseite. Angeglichen wurde die Form (1280 px,
      Zeichen 68 px, mehr Luft), **nicht der Text**: die vier Erklaerungen
      wurden am 2026-05-06 auf Wolfs Ansage hin inhaltlich richtiggestellt.

- ✅ **Zwei Funde nebenbei, einer echt und einer meiner.**
      1. **`fx-wave` ist eine wehende FLAGGE, kein Winken.** Die Zuordnung
         `'👋': 'fx-wave'` hat den Namen als Gruss gelesen. Ueberall, wo jemand
         ein Winken gemeint hat, stand eine Flagge. Zuordnung raus, die
         Ankommen-Karte nimmt jetzt bewusst `fx-teams`.
      2. Ich hatte an derselben Datei eine gepunktete Kante zu sehen geglaubt
         und einen zweiten Karo-Fall vermutet. Nachgemessen: **null** helle
         deckende Pixel. Das Karo war das des Bildbetrachters, nicht der Datei.

- ✅ **Avatar-Karte: die Farbe wandert mit** (Wolf: „die aktuelle darstellung
      koennte als missverstaendnis sagen, dass ein emoji nur mit einer
      bestimmten farbe kombiniert werden kann"). Er hat recht, und die Karte
      behauptete das Gegenteil der Wahrheit: der Satz ist farbneutral gebaut,
      48 Objekte MAL 8 Farben, ohne Bindung.
      Jetzt springt das Objekt um sechzehn und die Farbe wandert um eins.
      Bewiesen mit `node scripts/ankommen-avatare-motion.mjs`:
      48 Objekte gesehen, **33 davon auf mehr als einer Farbe**, und immer nur
      eine Kachel auf einmal.
      ⚠️ Das Werkzeug hat mich dabei zweimal erwischt: die Karte rendete
      anfangs ihr eigenes statisches Raster statt der neuen Komponente (nichts
      bewegte sich), und beim Zaehlen der gleichzeitigen Wechsel muss NUR das
      Objekt verglichen werden - die Farbe blendet ueber 420 ms um, und
      abgetastet wird alle 210 ms.

---

## 🌳 FORTSCHRITTSBAUM: WO ENDET EINE RUNDE? (Wolf 2026-08-27)

- ✅ **Das Gleis endet jetzt an der Rundengrenze** (2026-08-27, erledigt).
      Wolf zum Runden-Intro von Runde 2: „bei den symbolen im progress tree wird
      nicht klar was runde 1 und runde 2 etc ist, die trennung ist nicht so
      eindeutig?"

      ⚠️ **Meine erste Vermutung war falsch, und das ist der Kern.** Ich hatte
      auf die Abstaende getippt: im Code steht `gruppenGap = dotGap * 2`, also
      nur Faktor 2, und unter Faktor 2 bis 3 liest sich eine Gruppierung nicht.
      Gemessen (`node scripts/baum-runden-trennung.mjs`):

      ```
      innerhalb einer Runde    13 px
      zwischen den Runden     138 px im Mittel
      Faktor                   10,6
      ```

      An der Naehe lag es also nicht (zwischen den Runden stehen zusaetzlich die
      CozyGame- und Bieten-Knoten, die bringen eigene Breite mit).

      **Es lag am Gleis.** Der Strich wurde zwischen JEDEM Paar benachbarter
      Stationen gezogen, auch ueber die Rundengrenze - und weil die Luecke dort
      am groessten ist, war der Strich dort am LAENGSTEN. Die Stelle, die
      trennen soll, hatte damit die auffaelligste Verbindung im Bild. Eine
      Linie, die verbindet, schlaegt einen Abstand, der trennt: das Auge folgt
      der Kontur, bevor es Luecken zaehlt.

      Jetzt laeuft das Gleis nur innerhalb einer Runde weiter, plus zu ihrem
      CozyGame (das gehoert zu ihr, Wolfs Entscheidung vom 2026-08-24). Bieten
      und Finale stehen frei, sie gehoeren zu keiner Runde.
      Nachher: 0 von 3 Rundengrenzen mit Strich, 16 von 16 Stellen innerhalb.
      Bild: `.shots/BAUM-TRENNUNG.png`.

- ✅ **Die Bruecke ueber die Rundengrenze** (2026-08-27, Wolf: „die striche
      zwischen den runden fehlen (ich weiss extra) aber jetzt sieht es nicht mehr
      wie ein tree aus, was denkst du?").

      Er hat den Kern getroffen: eine Linie macht ZWEI Dinge auf einmal. Sie
      sagt „das ist ein Weg" und sie sagt „die gehoeren zusammen". Ich hatte sie
      an der Grenze weggenommen, damit das Zweite stimmt, und dabei das Erste
      mit weggenommen.

      Der Ausweg war nicht, sie zurueckzuholen, sondern sie im RANG zu senken:
      duenner (2 statt 3 px), gepunktet (3 px Strich, 7 px Luft) und blasser
      (0.30 statt 0.35). Drei Kanaele in dieselbe Richtung, zusammen rund ein
      Drittel der Tinte.

      ⚠️ Die Bruecke wird NIE vom Fortschritt eingefaerbt. Der farbige Kanal ist
      der staerkste im Bild; liefe er ueber die Grenze, waere die Trennung wieder
      weg. Der starke, farbige Kanal gruppiert, der schwache, graue verbindet.

      Gemessen: 0 von 3 Grenzen mit Gleis, 3 von 3 mit Bruecke, 16 von 16
      Stellen innerhalb der Runden mit Gleis.

      ⚠️ Das Werkzeug brauchte dafuer zwei verschiedene Messpunkte, und der
      erste Anlauf hat „nur 1 von 3 Bruecken" gemeldet, obwohl alle drei im Bild
      standen. Grund: seit der CozyGame-Knoten an seiner Runde haengt, sitzt er
      links in der Luecke, und die Mitte der Luecke liegt AUF ihm. Das Gleis
      wird weiter an der Mitte geprueft (dort waere ein durchgehender Strich am
      auffaelligsten), die Bruecke irgendwo in der Luecke.

- [x] ~~**Zwei weitere Hebel: Beschriftung „1 2 3 4" unter den Gruppen, Farbe
      je Runde.**~~ **Vom Tisch, Wolf 2026-08-28: „baum ist fertig".**
      Die Gruppierung allein reicht also. Beide Hebel waeren Umkehrungen
      frueherer Entscheidungen von Wolf gewesen (2026-06-29 „nackter Baum ...
      keine Phasen-Labels" und 2026-05-09 „tree noch bunt"), deshalb standen
      sie hier zur Wahl statt gebaut zu werden. Sie bleiben gueltig.

---

## 🎞️ WECHSELNDE FOLIEN: EINHEITLICH UND FEHLERFREI (Wolf 2026-08-27)

- ✅ **Fuenf Ueberschriften ohne eigenes Bild, drei alte und zwei von mir.**
      Wolf zum „Schnellste Minute"-Bild: „nicht alle wechselnden slides wirken
      gleich (gut) ... bitte das design einheitlicher und auf fehler pruefen
      (alte emojis zb oder fehlende)".

      Gefunden mit `node scripts/pausenfolien-pruefen.mjs`:

      ```
      🗡️  Steal-Master   -> <QQIcon slug="action-steal" />
      🐺  Underdog       -> <QQIcon slug="brand-wolf" />
      📅  Heute          -> <QQIcon slug="fx-chart" />
      🗓️  Heute Abend    -> <QQIcon slug="fx-clapper" />     von HEUTE, von mir
      🎨  Sucht euch...  -> <QQIcon slug="fx-sparkles" />    von HEUTE, von mir
      ```

      ⚠️ Die letzten beiden habe ich heute selbst eingebaut, waehrend ich
      behauptet habe, die Karten auf 2a zu bringen. Ein Zeichen ohne Bild wird
      auf jedem Rechner anders gezeichnet - auf Wolfs Beamer also anders als
      hier. Das gehoert genauso in die Liste wie die drei alten.

- ✅ **Das „?" war keine Zeichenfrage, sondern eine Formfrage.**
      Wolf hat auf das Fragezeichen gezeigt („das sieht komisch aus"). Der
      Grund ist nicht das Zeichen: seit dem Avatarsatz V5 ist jede Teammarke
      eine KACHEL, die Notloesung war aber ein KREIS. Neben einem echten
      Avatar stand damit ein Fremdkoerper.
      Und sie greift oft: Teams aus der Bestenliste haben keinen gespeicherten
      Avatar. Jetzt dieselbe Kachel wie ueberall, nur ohne Motiv - dieselbe
      Sprache wie die neutrale Kachel im Award-Rad.

- ⚠️ **Was das Werkzeug NICHT kann, und warum es trotzdem am Quelltext misst.**
      Mein erster Anlauf hat die laufende Buehne abgetastet und genau EINE
      Folie gesehen. Zwei Gruende: die meisten Folien haengen an Verlauf
      (Bestenliste, Rekorde, Rivalen), den ein frischer Raum nicht hat, und
      zwanzig Folien a acht Sekunden sind drei Minuten Abtasten fuer eine
      Frage, die statisch beantwortbar ist.
      Die Pruefung sagt jetzt, welche Folie ein fremdes Zeichen traegt. Sie
      sagt NICHT, ob eine Folie schoen ist. Dafuer braucht es weiter das Auge,
      und zwar an einem Abend mit Verlauf.

---

## 📐 SCHRIFT PASST SICH EIN (Wolf 2026-08-27)

- ✅ **Gemessen statt gestuft** (2026-08-27, erledigt). Wolf zu zwei Bildern:
      „immernoch der bug unten" (Gewinnerkarte abgeschnitten) und „hier auch,
      das war das font groesser problem" (untere Optionsreihe liegt hinter der
      Team-Leiste). Dann sein Vorschlag, der die Loesung war:

      > „vlt sollte nur fragefont groesser und nur automatisch so viel wie
      > aktuelle seite zulaesst also dynamisch? geht das, weil auch im
      > sprachwechsel kann das wieder anders aussehen"

      Der Grund ist der entscheidende. Bis heute liefen feste Stufen nach
      ZEICHENZAHL. Eine Zeichenzahl ist aber nur ein Stellvertreter: „Fantasy &
      Science-Fiction" hat 25 Zeichen und bricht um, „Halbwissen Gold Wert" hat
      20 und bricht nicht. Und beim Sprachwechsel wird aus 21 deutschen Zeichen
      schnell 14 englische. Eine Stufe kann also immer nur fuer eine Sprache
      richtig sein.

      **Ursache**, datierbar: die Optionsschrift trug seit 2026-08-22 keine
      Laengengrenze mehr (`QQBeamerPage.tsx`, Deckel 44 auf 72, Uebergabe 2a
      Aenderung 5). Der Deckel war eine Entscheidung und bleibt; was fehlte, war
      eine Grenze nach unten.

      **Gemessen vorher** (`node scripts/mucho-optionen-hoehe.mjs`):

      ```
      Antwort-Zustand        Block   Unterkante   Rest
        bis 16 Zeichen       280 px      789      81 px Luft
        21 bis 25 Zeichen    439 px      908       2 px      <- Wolfs Bild
        34 Zeichen           756 px     1223    -233 px UNTER der Buehne
      ```

      Eine zweite Zeile kostet genau 159 px, und es gibt zwei Reihen.

      **Gebaut**: `frontend/src/qqEinpassen.ts`. Ein Faktor `--qq-fit`, gesucht
      per Intervallhalbierung, sechs Schritte. EIN Faktor fuer Frage und
      Optionen zusammen, damit das Groessenverhaeltnis der Uebergabe 2a
      („entscheidend sind die Antworten") nicht heimlich kippt.

      **Nachher**: alles im Bild, schlimmster Fall 175 px Reserve statt 233 px
      Ueberstand. Bild: `.shots/EINPASSEN.png`.

      ⚠️ Vier Fallen, alle gemessen und im Kopf der Datei festgehalten:
      1. Die Team-Leiste ist `position: absolute`, taucht in `scrollHeight`
         also nicht auf. Der Block konnte bis unter sie laufen, ohne dass etwas
         „ueberlief". Sie ist jetzt als Sperre angemeldet.
      2. Eine handgepflegte Kennung (Frage-ID, Sprache, ...) reicht nicht: die
         Liste ist nie vollstaendig, und der Container ist `flex: 1` in einer
         festen Buehne, seine eigene Groesse aendert sich also nie. Beobachtet
         werden die KINDER.
      3. `revealWinnerIn` startet mit `translateY(30px)`. Eine Messung ueber
         `getBoundingClientRect` waere waehrend der Animation 30 px zu tief, und
         weil eine Transform keine Groessenaenderung ist, meldet sich danach kein
         Beobachter mehr. Gemessen wird ueber Offsets.
      4. Ein LUFT-Abzug am `scrollHeight` ist nie erfuellbar (Flexbox fuellt den
         Container exakt aus) und liess alles auf den Mindestfaktor fallen. Die
         Luft sitzt an der Sperre.

**Ein Beleg bleibt hier stehen, weil er sonst zweimal ausprobiert wird:**

      ~~`qRevealFontSize` kann raus~~ - **ausprobiert und wieder verworfen
         (2026-08-27).** Meine Begruendung („der Einpasser macht dieselbe Arbeit
         besser") klang schluessig und war falsch. Gemessen mit
         `node scripts/gewinnerkarte-unterkante.mjs`, fuenf Fragenlaengen:

         ```
                              mit Leiter     ohne Leiter
           kleinste Reserve      98 px          67 px
           kurze Frage (24 Z.)   85 px Schrift  64 px Schrift
         ```

         Beides schlechter. Der Grund: der Einpasser kennt als Sperre nur die
         Teamleiste. Die Gewinnerkarte laeuft IM Fluss, sie ist keine Sperre und
         kann auch keine sein - sie ist selbst das tiefste Kind, der Vergleich
         ginge gegen sich selbst. Die Leiter schaetzt zwar aus der Zeichenzahl,
         aber sie schaetzt das Richtige.
         Wer es doch angehen will, muss zuerst dem Einpasser eine zweite Art
         Sperre beibringen: „Abstand zur Unterkante der BUEHNE", nicht „Abstand
         zu einem absolut gesetzten Element".

---

## 🚪 ANKOMMEN: der QR wird freigeschaltet (Wolf 2026-08-26/27)

Die Folie „Gleich geht's los" taucht im echten Ablauf nie auf. Wolf: „diese
page taucht realistisch nie auf ... denke ich an ein event, waere diese page
gut zum ankommen etc, das einlogen nach begruessung etc?"

- ✅ **„Lobby oeffnen" gebaut** (2026-08-27). Wolf: „hier muesste es einen
      schritt davor geben sowas wie lobby oeffnen, von der slide show zum qr
      lobby screen".

      Die Ursache war ein Schalter fuer zwei Aufgaben: `setupDone` hat das
      Steuerpult vom Wizard ins Cockpit geschoben UND im selben Moment den QR
      auf die Leinwand geworfen. Der Moderator kam also nicht ins Cockpit, ohne
      die Lobby zu oeffnen. Jetzt traegt `lobbyOpen` das zweite:

      ```
      setupDone false                  Wizard
      setupDone true, lobbyOpen false  Cockpit, Buehne zeigt Ankommen-Folien
      setupDone true, lobbyOpen true   Cockpit, Buehne zeigt QR + Teamliste
      ```

      Am Steuerpult TAUSCHT der Hauptknopf seine Aufgabe, statt sich zu
      verdoppeln: „📣 Lobby oeffnen" (Bernstein), danach „▶ Quiz starten"
      (Gruen). Beide auf SPACE, in dieser Reihenfolge. Die Statuszeile sagt jetzt
      die Wahrheit, sie behauptete den QR vorher auch dann, wenn er nicht lief.
      Zurueck in den Wizard schliesst die Lobby wieder, sonst waere der
      Ankommen-Zustand nur beim allerersten Mal erreichbar.

      Beweis: `node scripts/lobby-oeffnen.mjs` → `.shots/LOBBY-OEFFNEN.png`.
      Das Bild zeigt zwei Buehnen, in beiden ist `setupDone` true.

      ⚠️ **Das Backend deployt sich nicht von selbst.** `lobbyOpen` ist ein
      neues Raumfeld, also braucht Coolify einen manuellen Redeploy. Bis dahin
      liefert der Server `undefined`, und beide Seiten sind darauf ausgelegt
      (`!== false`): es verhaelt sich exakt wie vorher, der QR kommt sofort.
      Kein kaputter Zwischenzustand, nur kein neuer Schritt.

- [x] ~~**Die Ankommen-Folien selbst** und die Regel „eine Folie nur zeigen,
      wenn sie heute Inhalt hat".~~ **Erledigt am 2026-08-27**, Wolf am
      2026-08-28: „ankommen folien haben wir gestern gexit kann raus".
      Was daraus geworden ist, steht in der Git-Historie: einheitliche Kaesten
      auf allen Statistik-Folien, gleiche Flaeche, gleiche Titelhoehe
      (`scripts/pausenfolien-pruefen.mjs`, `scripts/pausenfolien-geometrie.mjs`).

---

## 🖼️ AVATARSATZ V5 (Wolf 2026-08-26/27)

- ✅ **Wecker raus, Waermflasche rein** (2026-08-27, erledigt).
      Der Wecker (`cozy-home--alarm-clock.png`) hatte INNERHALB des Tragegriffs
      kein durchsichtiges Loch, sondern ein eingebranntes Transparenz-Karo
      (245/254 im Wechsel, Kachelbreite ~24 px, Alpha 255). Wolfs erster Ersatz
      war derselbe Fehler in vollstaendig: 1254x1254, RGB, KEIN Alphakanal, Karo
      als echte Pixel ueber die ganze Flaeche. Die zweite Lieferung ist sauber
      und gemessen:

      ```
      1024 x 1024, RGBA, Alpha vorhanden
      transparente Pixel        622 840
      teiltransparente Pixel      7 347   (weiche Kante, wie beim Rest des Satzes)
      deckende, fast weisse         0     (kein Karo mehr)
      Alpha-BBox                591 x 891 (Satz-Median 742 x 841, also im Band)
      ```

      Gegenprobe auf allen sechs Gruenden aus den Asset-Regeln:
      `.shots/WAERMFLASCHE-CLEAN.png`.

      Eingebaut ohne einen Pixel anzufassen: Original byte-identisch nach
      `design-assets/avatare-v5-original/cozy-home--hot-water-bottle.png`,
      abgeleitet mit `scripts/avatare-v5-ableiten.mjs` (640 und 160, Lanczos,
      ein Schritt je Groesse). Der defekte Wecker liegt unberuehrt unter
      `design-assets/avatare-v5-original/defekt/`.

      ⚠️ **Eine Weiche war noetig, und der Grund ist wichtig.** Der Slug steht
      im freien Feld `team.emoji`, also im `localStorage` jedes Handys, das den
      Wecker je gewaehlt hat, UND in der Raumdatei unter `backend/.qq-rooms/`.
      Haette ich ihn nur gestrichen, saehe `isCozyQuizSlug` ihn nicht mehr, der
      Zweig fiele auf „echtes Emoji" durch, und auf der Buehne stuende woertlich
      `alarm-clock`. `ALTLASTEN` in `cozyquizAvatars.ts` bildet ihn auf die
      Waermflasche ab, im Picker taucht er nicht auf.

- ✅ **Fuenf Ersatz-Motive eingebaut** (2026-08-27, noch am selben Tag).
      Wolf hat alle fuenf neu ausgeleitet, geprueft mit
      `node scripts/avatare-loecher.mjs`. Alle 1024x1024 mit Alphakanal, keine
      deckende weisse Flaeche mehr, und die Lochzahlen passen diesmal zu den
      Motiven statt zu Zufall: Rucksack 1 (unter dem Griff), Ballon 3 (die drei
      Zwischenraeume zwischen vier Seilen), Discokugel 1 (die Oese), Ringplanet
      2 (die beiden Sicheln), Pflanze 0. Bild: `.shots/F5-NEU.png`.
      Die alten liegen unberuehrt unter `avatare-v5-original/defekt/`.
      `COZYQUIZ_DEFEKT` ist damit leer, der Satz ist zum ersten Mal komplett
      heil.

      ⚠️ **Dabei musste ich mein eigenes Urteil korrigieren.** Das Werkzeug sagte
      „ein absichtliches Loch ist EINS", und das hat die kaputte Discokugel mit
      zwoelf Loechern zuverlaessig gefunden. Es war trotzdem falsch: der neue
      Ballon hat drei, der neue Planet zwei, beide einwandfrei. Der richtige
      Unterschied ist nicht die Anzahl, sondern die Regelmaessigkeit. Zum Motiv
      gehoerende Loecher sind wenige und aehnlich gross (Spanne 1,13), Schaden
      ist viel und ungleich (Spanne ueber 4).

- ~~**Fuenf weitere Motive haben denselben Fehler**~~ (2026-08-27, Wolf zum
      Heissluftballon: „hier ist auch noch ein bug... schade ich finde den super
      schoen"). Gefunden mit dem neuen `node scripts/avatare-loecher.mjs`.

      **Zu wenig Loch** (deckendes Weiss, wo der Grund durchscheinen muesste,
      teils mit demselben eingebrannten Karo wie beim Wecker):

      ```
      hot-air-balloon   zwischen den Seilen ueber dem Korb   y 657..710, bis 99 px breit
      houseplant        zwischen Stiel und Blaettern         y 429..655, bis 59 px
      backpack          unter dem Tragegriff                 y 128..156, bis 77 px
      ringed-planet     zwischen Ring und Kugel              y 376..621, bis 41 px
      ```

      **Zu viel Loch** (durchsichtig mitten in einer geschlossenen Flaeche):

      ```
      disco-ball        ZWOELF verstreute Loecher, das groesste 11168 px
                        mitten im Ball bei 256,442
      ```

      Bilder: `.shots/BALLON-ZOOM.png` und `.shots/BALLON-ZOOM2.png`.
      Zusammen mit dem Wecker sind das **sechs von 48**.

      Fuer alle gilt dasselbe wie bei der Waermflasche: neu ausleiten mit
      echtem Alphakanal, ich stelle nichts nachtraeglich frei.
      Solange: entweder sie bleiben drin und fallen gelegentlich auf, oder sie
      kommen im Code aus dem Pool (eine Zeile, jederzeit zurueck). Wolfs
      Entscheidung.

- ✅ **Endlich ein Werkzeug, das die richtige Frage stellt** (2026-08-27):
      `scripts/avatare-loecher.mjs`.
      Am 26.8. habe ich vier Detektoren gebaut und alle weggeworfen, weil sie
      nach „farblos und hell" gesucht haben - und ein weisses Objekt IST farblos
      und hell. Beim Ballon ist durch HINSEHEN ein besseres Merkmal
      aufgefallen: der Satz hat genau zwei Fehlerarten, und die zweite ist ohne
      jede Heuristik pruefbar. Durchsichtige Pixel, die vom Bildrand aus nicht
      erreichbar sind, sind Innenloecher. Kein Schwellwert, kein Falschalarm.
      Und es gibt sogar ein Urteil, ohne die Motive zu kennen: **ein
      absichtliches Loch ist EINS.** Schluessel, Donut, Teekanne und Kompass
      haben je genau eines. Die Discokugel hat zwoelf. Streuung ist der Fehler,
      nicht das Loch.
      Fuer die erste Fehlerart liefert es weiter nur eine Kandidatenliste, das
      bleibt richtig so.

- ✅ **Alle 48 auf dem Blatt durchgesehen** (2026-08-27, nach der Lieferung von
      Gaensebluemchen und Wolke). Sechs Gruende, jeder einzeln angesehen:
      kein heller Saum auf Schwarz, kein dunkler auf Weiss, kein Loch in einer
      geschlossenen Flaeche, keine abgeschnittene Aussenkante. Die Loecher, die
      es gibt, gehoeren zum Motiv (Schluesselbart, Donut, Henkel, Ringplanet).
      Blaetter: `.shots/avatare-grund/`.

      Eine Beobachtung ohne Fehlerwert, damit sie nicht zweimal auffaellt: die
      cremeweissen Motive (Wolke, Kissen, Papierboot, Muschel, Gaensebluemchen)
      stehen auf WEISS naturgemaess kontrastarm. Das ist kein Asset-Fehler, und
      auf der Buehne kommt es nicht vor - dort sitzt jedes Motiv auf einer
      gesaettigten Teamkachel.

- [x] ~~Die uebrigen 47 einmal auf dem Blatt durchsehen.~~ (erledigt, siehe oben)
      `node scripts/avatare-auf-grund.mjs` legt alle 48 auf Schwarz, Weiss,
      Orange, Gruen, Blau und Teamrot - genau die Kontrolle, die in den
      Asset-Regeln steht und fuer die es bis heute kein Werkzeug gab.
      ⚠️ Bewusst OHNE automatisches Urteil: ich habe vier Detektoren dafuer
      gebaut, und jeder hat andere unschuldige Motive gemeldet (weisse Wolke,
      Spielkarte, Heissluftballon). Ein weisses Objekt IST farblos und hell;
      numerisch ist das von einer schwachen Kachelung kaum zu trennen. Das
      Auge trennt es in einer Sekunde.

---

## 🎨 PREMIUM-DESIGN-GRUNDLAGE (Wolf 2026-08-22, laeuft)

> **Einstieg: `docs/UEBERGABE_DESIGN.md`** — dort steht der komplette Stand,
> die Randbedingungen, das Messwerkzeug und die Reihenfolge.
> Ziel laut Wolf: **`/beamer` bauen, `/team` zieht nach.**

- [ ] **Zweite Serie Kompositionen** mit den Mitteln, die noch fehlen
      (Uebergabe Abschnitt 8): Schrift ueber den Rand, etwas das aus dem Rahmen
      bricht, Verlaufsflaechen, Farbe mit Bedeutung, Wasserzeichen-Ebene,
      eine einzige Schrift, gepunktete Linien, Sequenzmittel.
- ✅ **Schrift entschieden: Bricolage Grotesque** (Wolf 2026-08-26, „ja die isses
      bricolage"). Entschieden am Bild, nicht an einer Namensliste:
      `scripts/schrift-probe.mjs` rendert dieselbe Fragefolie in mehreren
      Schriften, ohne etwas am Repo zu aendern. Bricolage war die einzige mit
      einem Grund, der nicht Geschmack ist - bei gleicher Groesse eine Zeile
      statt zwei.
      ⚠️ Zwei Korrekturen, die im Code stehen: der Platzhalter war NICHT Nunito,
      sondern FREDOKA (qqTheme.ts, ueber den Phase-Root auf --qq-font). Und
      Bricolage wurde bereits ueber Google Fonts geladen; sie liegt jetzt selbst
      gehostet in /fonts/, wie League Spartan. League Spartan bleibt Wortmarke.
      Gegengeprueft: `scripts/schrift-durchgang.mjs`, 12 Stationen ohne Ueberlauf.
- ✅ **Fragen groesser** (Wolf 2026-08-26, „der text auf beamer darf nicht zu klein
      sein, einfach nach optimiertem spacing"). 77-84 px sind jetzt 109-117 px.
      Ausgemessen mit `scripts/frage-spacing-messen.mjs`, das die Obergrenze
      SUCHT statt einen Faktor zu raten. Nebenbefund mitgefixt: die
      Groessenleiter war nicht monoton, eine kuerzere Frage stand kleiner als
      eine laengere.
- [ ] **Farbsystem:** Leinwand, Flaeche oder Marke traegt die Kategorie.
      Gemessen gleichwertig, also Geschmacksentscheidung.
- [ ] **BEWEGUNG, laeuft seit 2026-08-24. Einstieg: `docs/UEBERGABE_MOTION.md`.**
      Dort stehen die Bausteinliste B1-B11, der gemessene Ist-Zustand von
      Station 1, das Werkzeug (`scripts/motion.mjs`) und die Reihenfolge.
      - ✅ **Motion-Konsistenz ist messbar** (Wolf 2026-08-26: „app Konsistenz
            von Anfang bis Ende, dass keine Motion völlig aus der Reihe
            fällt"). `scripts/motion-konsistenz.mjs` misst gegen den
            Hausbestand, der seit dem 2026-07-12 in `main.css` steht - Rollen
            und Dauerbereiche inklusive. Erster Durchgang, 13 Stationen:
            75 Bewegungen, davon 13 auf einer Hauskurve.
      - ✅ **Die drei Befunde des ersten Durchgangs sind entschieden**
            (Wolf 2026-08-26: „Ich fands bisher überhaupt nicht unruhig, ich
            denke wir können es lassen anstatt kontext für das erstellen von
            alternativen zu verbrauchen, die vlt nicht besser sind"). Alle drei
            bleiben, wie sie sind: die 22 Nachbarkurven, die zwei
            Auftrittskurven nebeneinander, und die Folien mit mehr als einem
            Overshoot. Der Grund ist in allen drei Faellen derselbe - der
            Unterschied liegt unter der Wahrnehmungsschwelle, das Aendern waere
            Aufwand mit Risiko und ohne sichtbaren Gewinn.
            Im Werkzeug steht das als BESTANDSSCHUTZ mit Datum und Zitat: der
            heutige Stand ist abgenommen, gemeldet wird nur noch, was NEU
            dazukommt. Damit bleibt die Regel fuer den restlichen
            Motion-Durchgang scharf, ohne rueckwirkendes Aufraeumen.
      - ✅ **Die drei Dauern ausserhalb ihrer Rolle: Fehlalarm, Werkzeug
            nachgeschaerft** (2026-08-27). Gemeldet waren `phasePop` 450 ms auf
            `--qq-celebrate` (500-700), `langFadeIn` 450 ms auf `--qq-enter`
            (480-680) und eine 900-ms-Blende auf `--qq-state` (160-240).

            ⚠️ Keine davon war ein Verstoss, und der Grund ist strukturell: die
            sechs Rollen in `main.css` sind ALIASSE auf die rohe Kurvenpalette.

            ```css
            --qq-celebrate: var(--qq-ease-bounce);
            --qq-enter:     var(--qq-ease-out-cubic);
            --qq-state:     var(--qq-ease-smooth);
            ```

            Nach dem Berechnen im Browser sind beide Schreibweisen dieselbe
            Zeichenkette. Alle drei Fundstellen schreiben die ROHE Kurve, nicht
            das Rollen-Token - sie nehmen also nur die Kurve und beanspruchen
            weder Hero-Beat noch Auftritt. Und in allen drei Faellen zu Recht:
            450 ms auf kleinen Kachel-Chips sind kein Hero-Beat, und die
            900-ms-Blende der Anker-Ebene ist ausdruecklich so gebaut („laenger
            als jeder Szenenwechsel, damit das Abdunkeln nicht als Teil des
            Wechsels gelesen wird").

            `scripts/motion-konsistenz.mjs` sieht jetzt nach, welches Token im
            QUELLTEXT steht, und trennt die beiden Faelle. Gemessen wird weiter
            am laufenden Bild; der Quelltext beantwortet nur die Anschlussfrage
            „welches Token war gemeint". Ergebnis: 0 echte Verstoesse, 3
            Rohkurven-Faelle, ausgewiesen statt versteckt.

            **Entschieden am 2026-08-27, Wolf: „ja gerne so lassen".** Die
            Rollen bleiben eine Empfehlung fuer die grossen Momente, die rohe
            Kurvenpalette bleibt frei benutzbar. Verbindlich zu machen hiesse,
            fuer jeden kleinen Akzent eine Rolle zu erfinden, die es nicht gibt.
            Das Werkzeug weist die Faelle aus, statt sie zu verstecken; steht
            als `ENTSCHIEDEN.rohkurven` mit Datum und Zitat im Werkzeug.

      - ✅ **B1 + B5 an der Aufloesung: Praemisse widerlegt, nicht gebaut.**
            Im Plan stand „schneidet heute hart". Gemessen mit
            `scripts/naht-frage-aufloesung.mjs` (Mitschrift je Bildaufbau)
            stimmt das nicht mehr: im Moment der Umstellung laufen NEUN
            Bewegungen (`revealFlash`, `muchoVoterDrop`, die Polster- und
            Hoehenuebergaenge der Karte). Es schneidet nichts, es blendet ueber.
            B5 (Marker statt Einfaerbung) waere eine Alternative zu etwas, das
            Wolf am selben Tag ausdruecklich in Ordnung fand - also nicht
            gebaut.
            ⚠️ Die Messung hat dafuer einen echten Fehler gefunden, meinen
            eigenen von heute Morgen: die Frage war bei jeder Aufloesung 140 ms
            unsichtbar. Behoben.
      - [ ] **„Das Brett faellt"** (`55db717d`) liegt gebaut auf dem Zweig, wurde
            aber vorgezogen und ist nie abgenommen. Im Motion-Durchgang
            einreihen und beurteilen.
- ✅ **Skills verfuegbar machen** — ERLEDIGT von selbst, geprueft 2026-08-26.
      `ui-ux-pro-max` und `animate` sind in Web-Sitzungen da (aus den
      claude.ai-Konto-Skills, ohne dass etwas ins Repo musste; `.claude/skills/`
      existiert im Repo bis heute nicht). Der ganze Buehnen- und
      Motion-Durchgang der letzten Tage lief in Web-Sitzungen, die Behauptung
      „blockiert Design-/Motion-Arbeit" stimmt also nicht mehr.
      Offen bleibt nur `color-contrast`, und dafuer gibt es seit heute etwas
      Besseres: `scripts/design-audit-cozyquiz.mjs` misst den Kontrast an den
      echten Bildpunkten der Buehne statt an Farbwerten aus einem Stylesheet.
- [ ] **`/team` erst danach**, nur Einzelheiten, nicht der Aufbau
      (Gegenprobe hat gezeigt: Aufbau stimmt bereits).
- [ ] **Hotkeys + Stream-Deck komplett durchgehen** (Wolf 2026-08-23:
      „P zu druecken in moderator geht aktuell nicht, vlt sollten nochmal alle
      hotkeys auch stream deck buttons ueberprueft werden nach design und
      motion"). Ausdruecklich NACH Design und Motion, weil beide noch
      Ansichten verschieben und Tasten an Ansichten haengen. Reihenfolge:
      erst `P` reproduzieren (welche Phase, welcher Fokus), dann die
      vollstaendige Liste Taste -> Aktion -> Phase aufstellen, dann gegen die
      Stream-Deck-Belegung halten. Wichtig: eine Taste, die im Steuerpult
      nichts tut, faellt nirgends auf — der Socket-Vertrag ist untypisiert
      (siehe CLAUDE.md), ein Tippfehler im Ereignisnamen bleibt still.

### Aeltere Punkte aus dem 18.08.

## 🎨 (Vorlauf 2026-08-18)

> Wolf: „wir brauchen premium design 2026 fuer eine quiz event app, darauf bauen
> wir dann das emoji set bzw wir bauen es zusammen auf."

Alles Weitere in **`docs/MOTION_REFERENZEN.md`**: ausgewertete Referenzen mit
gemessenen Werten, die Bausteinliste B1 bis B7, und die Werkzeugkette zum
Auswerten neuer Videos (Websites sind aus der Remote-Umgebung nicht erreichbar).

- [ ] **Wolf sammelt weitere Referenz-Websites** (Video oder Screenshot liefern).
- [x] ~~Grundrichtung gefunden~~ — Wolfs Favoriten waren zweimal dasselbe Prinzip:
      Schrift fuehrt, kein Dekor. Regeln stehen in **`docs/BUEHNEN_DESIGN.md`**,
      Entwuerfe in `design-assets/buehnen-design/`.
- ✅ **Welche Bunte-Tuete-Unterspiele sind aktiv?** BEANTWORTET, 2026-08-26.
      Die Frage hat eine harte Antwort im Code, und die ist seither auch die
      Single Source of Truth: `QQ_BUNTE_TUETE_ACTIVE` in shared/quarterQuizTypes.ts
      = hotPotato, top5, order, map (Heisse Kartoffel, Top 5, Fix It, Pin It).
      Nur Arena: `_ARENA_ONLY` = Umfrage, Schwarmintelligenz. Abgeschaltet:
      `_DEACTIVATED` = Imposter, 4 gewinnt, Bluff - deren Code liegt weiter da
      und funktioniert, wird aber nicht ausgespielt. Steht so auch in CLAUDE.md.
- ✅ **Kategoriefarben nachgezogen** (Wolf 2026-08-26: „auf jeden fall der
      vorschlag"). Vorher entschieden am Bild: `scripts/farbwelten-probe.mjs`
      stellt beide Fassungen je Kategorie nebeneinander UND misst zu beiden die
      Lichtabgabe.
      Der eigentliche Unterschied lag nicht im Akzent, sondern im Grund: die
      AEUSSERE Stufe war bei allen fuenf Kategorien dieselbe (#120F18), ein
      roter und ein blauer Abend endeten an derselben Kante. Jetzt hat jede
      Kategorie drei eigene Stufen (`grund` in shared/qqCategoryTheme.ts).
      Nebenwirkung, gemessen: die Lichtabgabe faellt um rund 1,2 Prozentpunkte
      je Kategorie. Auf einer Buehne mit harter Lichtgrenze ist das ein Gewinn.
      ⚠️ Die Spalte „heute" im Brief nannte QQ_CATEGORY_COLORS - Werte, die die
      Buehne nie benutzt hat. Sie liest QQ_CATEGORY_THEME.
      Gegengeprueft: Kontrast (72 Zeilen, keine unter der Schwelle),
      Ueberlauf (12 Stationen), Lichtabgabe (alle unter 6,5 Prozent).
- [ ] **Schaetzchen-Achse:** Grenzen aus den Schaetzungen ableiten statt fix 0-1000,
      eigener Bereich bei `isYearAnswer`, Kollisionsversatz ab ~4% Abstand.
- → **Schrift entscheiden** stand hier ein zweites Mal und ist am 2026-08-26
      zusammengefuehrt worden. Der Punkt lebt oben in der Premium-Design-Grundlage.
      Zwei Kaestchen fuer denselben Punkt sind zwei schlechte Gewissen.
- → **Erster Baustein B1 + B5** stand hier doppelt und ist am 2026-08-26
      zusammengefuehrt worden. Der Punkt lebt oben unter BEWEGUNG.
- [ ] **Avatarset** bleibt bewusst dahinter. Gelernt am verworfenen Holz-Versuch:
      Design und Set muessen aus denselben Regeln entstehen, nicht nacheinander.

---

## 🎯 TAGESZIEL + ROADMAP (Wolf 2026-07-19)
> **Nordstern:** beide Modi (CozyQuiz + CozyArena/Colosseum) **vollständig spielbar**.
1. **HEUTE:** CozyArena/Colosseum so weit fertig, dass es **spielbar** ist.
2. **Danach:** CozyQuiz vs CozyArena vergleichen → bessere **Views** (nicht Designs) aus
   Arena in CozyQuiz übernehmen (z.B. bestimmte Reveal-Seiten).
3. **Danach:** alle Modi eigenständig je **einmal komplett testen**.

**✅ ERLEDIGT heute (2026-07-19, alles auf `main` + deployt):**
- **Turm-Finale V2 (Grid) LIVE geschaltet** — 4-Datei-Umbau (award-Kind raus, Beat-Modell),
  am echten /beamer validiert (Screenshots `design-vorschau/finale-v2-live/`), 29 Vitest grün.
- **Finale-Score Bet-Doppelzählung gefixt** — Bet-Bonus zählte doppelt (Stamps in `largestConnected`
  + `totalBonus`), Sieger-kippbar. Empirisch bewiesen (`dev/dumpScore`-Probe rot→grün) + Regressions-Test.
- **„Einen Schritt zurück" repariert** — Shift+Space/Backspace/Button routen jetzt korrekt (Fund 1+2).
- **Tier-1 Kolosseum-Medaillons verdrahtet** (`/icons/cat-*.png`) → **Design-Freeze-Meilenstein**.
- **3 Finish-Audits** (Gap/Crash-Risk/Moderator) — beide Modi funktional durchspielbar, kein harter Blocker.
- **Backend-Refactor qqDistanceScore GEBAUT** — SCHAETZCHEN + Schwarm-Distanzzweige in `scoreDistanceCat`-
  Helfer gezogen (Drift-Killer). Selfcheck 10/10, tsc, vitest 49/49. Liegt auf Branch (geht mit Wölfen auf main).
- **Stufe 2 (Views Arena→CozyQuiz) geprüft** — 3-Agent-Vergleich: **nichts zu portieren**. Reveals schon auf
  Parität, Zwischenstand/Finale/Siegerehrung je Modus passend anders (Grid vs Bar-Race), keiner ist die
  schlechtere Kopie. Stufe 2 damit im Kern erreicht.
- **5 orange Build-Punkte** — COZY_GAME-Fallback · Endstand-Höhen-Cap · SPACE-Hints · Runden-Pills gehärtet ·
  Fund-3-Teil-2+3 (GAME_OVER-Zurück-Hotkey + Bounce-Guard). Alle tsc/vitest grün, auf Branch.

**Aktueller Fokus / offen — Bau-seitig ist von MIR jetzt ALLES durch. Rest = nur Wolf am Beamer.**
- ✅ **CozyWölfe NEU verdrahtet** (2026-07-20, `e3c74e0e`) — 8 Wölfe, Farben gemessen statt geraten (7/8 in 25°,
      alle 8 auf richtiger Slot-Disc, keine Vertauschung), 5,2→1,8 MB komprimiert. Zwei Anmerkungen ohne Fix
      (Wolfs Illus): grüner Rand olivstichig, violetter hat keinen Leuchtrand nur Augen.
- ✅ **Fund 3 Teil 1 GEBAUT** (2026-07-20, `0ef05fb1`) — „Zurück" heilt jetzt eine versehentliche Frage-Aktivierung
      (Space im letzten Intro-Step zu früh → QUESTION_ACTIVE). Scope bewusst ENG (Wolf per AskUserQuestion): nur
      der Übergang PHASE_INTRO↔QUESTION_ACTIVE, der risikoärmste Fall (noch keine Antwort da, nur Timer läuft).
      Single-Slot `_phaseSnapshot`, ROT→GRÜN per Unit-Test (52/52).
      ⚠️ **Am ECHTEN Beamer noch nicht rot-reproduziert** (braucht Wolf) — Fix ist deshalb eng gehalten, berührt
      keine Antworten/Scores/Grid. Placement-/Bets-zu-früh bewusst NICHT abgedeckt (das bräuchte den Beamer-Lauf).
- [ ] **Tagesziel-Rest: CozyArena + CozyQuiz je einmal komplett am Beamer durchspielen** (nur Wolf; deckt die
      Beamer-Checks unten mit ab: Award-BGs pro Sieger-Fraktion, Blitz beim Guess-Sieger, Wölfe im Set-Picker
      `/team`, Siegerehrung im Schlicht- UND Kolosseum-Modus, Fund-3-Zurück nach zu früher Aktivierung).

> Setup/Moderator-Konsolidierung (Wizard, Cockpit-Fold, Test-Modus-Toggle, Konsolidierung) ist
> **durch** — Details in der Git-History (`109e8d35`, `e188223f`, `ddd33688`, `f16b2e1b`, `a43579ba`).

---

## 🔴 WARTET AUF WOLF — Beamer-Check (hart neuladen: Strg+Shift+R!)

> ⚠️ **Test-Gate:** Beamer **UND** Moderator hart neuladen, **Autoplay AUS** (sonst drückt
> Autoplay den Mod-Pacing-Space selbst). Eine frühere Screenshot-Runde lief auf ALTEM
> Frontend → wir haben Geister gejagt. Bitte erst reloaden, dann knipsen.

Gebaut, typecheck-grün, aber **nie am Projektor gesehen**. Nach dem Check: Punkt hier löschen
oder Nachdreh-Wunsch dranschreiben.

### Betrifft CozyQuiz (offen)

- ✅ **Kategorie-Intro-Farben** — GEPRUEFT 2026-08-26 (Wolf: „passt, war eh alt").
      Blatt mit vier Kategorien nebeneinander: `scripts/kategoriefarben-blatt.mjs`.
      Jede Kategorie traegt ihre Eigenfarbe im GRUND und in der Akzentlinie, der
      Titel ist ueberall Creme - das ist die 2a-Regel „warme Tinte statt Weiss"
      vom 2026-08-22, kein Fehler. Der zweite Teil der Frage („NUR Progress-Tree
      pink") war ueberholt: der Baum steht gar nicht auf der Intro-Folie.
(Der Punkt „Toggle Schlicht" stand bis 2026-08-26 hier und ist eine Zeile tiefer
gewandert, zu den Arena-Punkten. Grund siehe dort.)
- ✅ **Design-Audit-Fixes** (Kontrast/Touch-44px/reduced-motion) im **klassischen**
      CozyQuiz gegengecheckt, 2026-08-26. Werkzeug: `scripts/design-audit-cozyquiz.mjs`,
      wiederholbar. Der Punkt klang nach Handarbeit, ist aber messbar:
      * Kontrast (WCAG 1.4.3): 72 Textzeilen auf 8 Stationen, KEINE unter der
        Schwelle. Der Grund wird aus Bildpunkten geschaetzt, nicht aus
        `backgroundColor` der Eltern - die Buehne stapelt Verlaeufe und
        halbdurchsichtige Flaechen, da luegt der berechnete Stil regelmaessig.
      * Bewegung (prefers-reduced-motion): 38 laufende Animationen normal,
        0 mit `reduce`. Der Schalter greift.
      * Touch (WCAG 2.5.5): EIN Fund. Das Namensfeld auf dem Handy kam auf
        248 x 43, es fehlte genau ein Bildpunkt. Gefixt per `minHeight: 44`
        an `cozyInput` und am Stamm-Code-Feld. Nachgemessen: alle 44+.
      ⚠️ Automatisch pruefbar sind rund 30 Prozent der WCAG-Kriterien.
      Tastaturbedienung und Screenreader sieht weiter nur ein Mensch.

### Betrifft CozyArena — SCHLAFEND seit 2026-08-26 (kein Termin)

> Wolf am 2026-08-26 auf die Frage, ob ein Arena-Event ansteht: **„Nein, aktuell kein
> Termin."** Diese neun Punkte sind damit nicht erledigt und nicht verworfen, sie sind
> schlafend. Sie tragen bewusst KEIN Kästchen mehr, damit sie die Zahl der offenen
> Punkte nicht mehr aufblähen und kein Druck ohne Termin entsteht. Sobald ein Datum
> steht: Kästchen zurück, dann sind sie wieder echt.
>
> Warum sie hier so lange mitliefen: sie standen unter derselben Überschrift wie die
> CozyQuiz-Punkte, und „Siegerehrung/Krönung" klingt nach der Siegerehrung, die im
> August umgebaut wurde. Es ist aber eine andere: die Kolosseum-Krönung in
> `CozyQuizLargeGroupView.tsx` (Banner-Roulette, Treppchen), nicht das Turm-Finale.
> Genauso sind „Wing It" und „Objection" Arena-FRAKTIONEN, keine CozyQuiz-Kategorien.

- ⏸ **Siegerehrung/Krönung Arena** (größter neuer Block) — Roulette-Timing + Blink-Tempo ·
      Treppchen sitzt (KEINE Scrollbar) · 8-Banner-Zeile passt · Award-Banner-Entrollung
      überlappt die Stat-Zeile nicht · Award-Stat-Texte DE/EN · Streamdeck Weiter/Zurück
      durch die Beats.
- ⏸ **Schätzchen v4 „nur Strahl"** — Zwei-Lane überlappungsfrei bei 8 Fraktionen mit engen
      Tipps? Falls nicht: `spread` MIN (12%) / Wappen-Größe nachdrehen.
- ⏸ **MUCHO bei 8 Fraktionen** — 2×2 → 4-Reihen-Morph smooth, kein Overflow? · Farb-Balken-
      Segmente aus der Distanz lesbar? (falls Matsch → „bild 4"-Umbau unten greift eh)
- ⏸ **Arena-Nudges** (Konstanten, nur am Projektor justierbar):
      `BANNER_ANCHORS` (Wappen deckungsgleich auf dem gemalten Banner?) ·
      `ARENA_BG_FOCUS` (`rundenintro: 'center 66% / 116%'`) ·
      `FACE_MASK`-Ellipse am Magier-Wolf (sitzt sie aufs Gesicht?)
- ⏸ **Arena-Meister-Splash + Rules-Redesign** — Pacing/Titel ok?
- ⏸ **Scoring/Standings auf der Tafel** (17.7. neu gebaut) — Überschriften sind raus, BG ist
      auf 110% gezoomt und der Inhalt sitzt in der **ausgemessenen** Tafel (Pixel-Scan von
      `standing.webp`, nicht mehr geschätzt). Sitzt es am echten Projektor? Bleibt der
      Edelstein-Zapfen oben mittig frei? ⚠️ Falls nachdrehen: `ARENA_BG_FOCUS['standing']`
      (ArenaBeamerBg) und `MEGA_BOARD` (CozyQuizLargeGroupView) gehören **zusammen**.
- ⏸ **bild 4 — Wappen-Wahltafel** (17.7. gebaut) — passen 8 Fraktions-Wappen mit Zahl-Badge
      in eine Zeile (54% Breite)? Falls zu eng: `avatarSz`/`gap` in `MegaOptionCrests`.
- ⏸ **Kontrast am echten Beamer** — Fraktion „Wing It" (Blau) + „Objection" (Pink) auf Dunkel.
- ⏸ **Lobby bei 40 Handys** — kein Scroll am Projektor.
- ⏸ **Toggle „Schlicht"** wirklich überall sauber (Beamer/Lobby/Welcome-Overlay)?
      ⚠️ 2026-08-26 nachgesehen und UMSORTIERT: der Schalter ist Arena-only, er stand
      vorher faelschlich bei den CozyQuiz-Punkten. Belege: im Setup wird er nur unter
      `{arena ? ...}` angeboten (QQSetupFlow), das Steuerpult zeigt die Look-Zeile nur
      `arena ? [...]` (QQModeratorPage), und JEDER Leser gated auf largeGroupMode bzw.
      isMega (cozyQuizShared `qqArenaLook`, ArenaBeamerBg, LobbyView, ThanksView,
      CozyGuessrReveal). Im klassischen CozyQuiz tut der Schalter nichts, weil es dort
      keine Kolosseum-Bilder zum Abschalten gibt.

**🟡 Judgment-Calls (nur du kannst entscheiden, ob's stört):** Schätzchen-Antwort in Gold
(wirkt bewusst?) · CHEESE-Kategorie-Titel violett (= Kategorie-Eigenfarbe) ·
Fraktionsnamen-Ellipsis → Wrap (Risiko fürs arena-main-Layout).

## 🔴 WARTET AUF WOLF — Assets

- ✅ **8× Breitbild-Award-BGs GELIEFERT + VERDRAHTET** (2026-07-20, `2ea60c08`). Wolfs Dateien lagen in
      `public/neue background/` mit englischen Award-Namen; die 8 Fraktionen heißen wie die 8 Awards,
      daher 1:1-Mapping (`all in`→`risiko`, `gut feeling`→`bauchgefuehl`, …), gegengeprüft an **Farbe +
      Emblem** statt am Namen. Quellen waren schon exakt 1672×941 → reine WebP-Wandlung ohne Crop,
      190-264 KB je Bild. Kein Code nötig, der Drop-in-Layer greift. Vorher zog der Beamer das
      HOCHKANT-`faction-*.webp` (853×1844, Handy-Bild) per `cover` breit und beschnitt es brutal.
- ✅ **„am schnellsten"-Blitz GELIEFERT + VERDRAHTET** (2026-07-20, `2ea60c08`). `fx-lightning.png` war
      wegen eines Rechteck-Artefakts deaktiviert und existierte nicht mehr; neu aus Wolfs Gold-auf-
      Schwarz-Master per Luminanz-Alpha freigestellt, auf Weiß/Pink/Navy/Dunkel geprüft (kein Halo).
      `EMOJI_TO_SLUG`-Mapping wieder scharf → **alle** nativen ⚡ zeigen jetzt das 3D-Icon.
      ⚠️ Der Blitz ist **Gold** und berührt damit die Regel „kein Gold außer Krönung" — bewusst so
      von Wolf geliefert. Falls doch Pink gewünscht: eine Neu-Einfärbung, kein Umbau.

## 🔴 WARTET AUF WOLF — Entscheidungen

- ✅ **Namensfrage Grossformat ENTSCHIEDEN (Wolf 2026-08-28):**
      „ok cozyarena heisst jetzt CrowdQuiz".
      Damit ist die Ueberlegung vom 2026-08-23 erledigt. Sie lief darauf
      hinaus, dass „CozyQuiz Arena" von einem Wort zwei Bedeutungen verlangt -
      gemuetlich und Kolosseum mit 160 Leuten. Der Umbau steht als eigener
      Punkt weiter unten unter „Langzeit".

- ✅ **Backend-Refactor `qqDistanceScore` GEBAUT (2026-07-19):** `qqMegaEventScore`-Distanzzweige
      (SCHAETZCHEN + Schwarm) auf einen `scoreDistanceCat`-Helfer gezogen (Drift-Killer). Selfcheck
      10/10, tsc clean, vitest 49/49. Liegt auf Branch `design/material-pass-standings-bar` (`3ecf264b`),
      geht mit den neuen Wölfen zusammen auf main (Redeploy dann).
- Erledigt/verworfen 2026-07-19 (Wolf): MUCHO-Delight-Hebel = **verworfen** (vergessen + Design-Freeze,
  bleibt wie's ist) · Fraktions-Namen unter Wappen = **nein** (nur Wappen+Anzahl, so gebaut) ·
  arena-main-Video aufs Welcome-Overlay = **durch/moot**.
- **Standing-Note (keine Entscheidung):** Wolf-Sprechblase im Logo ist oval — vor jeder Logo-Änderung fragen.

## 🟠 WARTET AUF MICH — Build

**🎵 Musik und Film kommen zu kurz (Wolf 2026-09-05, gemessen).** Wolf: „wie
ausgeglichen ist mein fragencontent? ich glaube zb musik kommt sehr kurz?
filme?" Ja, deutlich. Werkzeug dafür: `node scripts/fragen-themen.mjs`.

Gemessen an den Startdaten im Repo (100 Fragen der fünf Allgemeinwissens-Sätze
von Hand eingeordnet, 89 Bibliotheks-Fragen über ihr `topic`-Feld):
Musik 5 %, Film & TV 3 %. Im üblichen Kneipenquiz ist jedes davon eine von
sechs Runden.

⚠️ Der schärfere Befund ist nicht die Gesamtzahl, sondern die Verteilung JE
SATZ. Die fünf Sätze sind thematisch, nicht gemischt: Vol. 4 (Technik/Essen)
und Vol. 5 (Sport/Natur) haben **null** Musik und **null** Film, Vol. 3 null
Film. Praktisch die gesamte Popkultur steckt in Vol. 2. Wer Vol. 4 spielt,
hört den ganzen Abend kein Lied.

✅ **`topic` ist eingetragen** (2026-09-05). Alle 110 Fragen der Spiel-Sätze,
Zuordnung in `backend/src/data/qqFragenThemen.ts`, dazu eine streng additive
Nachziehung in der Datenbank. Damit misst das Werkzeug jetzt den Abend.

⚠️ Die Zuordnung sind URTEILE, keine Messungen. Wer widerspricht, ändert eine
Zeile in jener Datei. Strittig sind vor allem die fünf Bauwerke (unter
Geographie statt Kunst/Geschichte), Schach (Sport) und das Nike-Logo
(Popkultur).

**🎯 Entscheidung Wolf 2026-09-05:** „ich denke die meisten standard sets
sollten alle kategorien ausgeglichen haben, da die meisten gruppen wohl bunt
gemischte runden enjoyen würden. spezifische runden könnten gewünscht werden
oder als thema gelten (heute abend etc)."

Also: **Standard-Sätze bunt gemischt, thematische Sätze als bewusste Option**
(Musik-Special, 90er-Abend, Firmen-Thema). Vol. 2 bis 5 sind heute faktisch
thematisch, ohne dass es so gemeint war.

⚠️ Die harte Grenze dabei, gemessen: die Mechanik steht an der POSITION fest.
Jede Runde ist Schätzchen, Mu-Cho, Bunte Tüte, Ten Chips, Picture This, in
dieser Reihenfolge. Ein 20er-Satz hat damit genau **4 Plätze je Mechanik**.
„Alle Gebiete ausgeglichen" ist bei 13 Gebieten und 20 Fragen nicht möglich.
Realistisch sind 6 bis 8 Gebiete je Satz mit je 2 bis 3 Fragen.

**Noch offen:**
1. **Vokabular vereinheitlichen:** die Bibliothek kennt „Sprache" UND
   „Sprache & Etymologie". Das Werkzeug meldet es, rechnet es aber bewusst
   nicht zusammen. Eine Zeile im Bibliotheks-Seed.
2. **🎧 Audio-Fragen: eingebaut, aber null benutzt.** `QQQuestion.musicUrl`
   plus `musicMode: 'audioQuestion'` gibt es samt „Höre genau hin"-Hinweis auf
   der Bühne, und `/api/upload/question-audio` nimmt Dateien an. **Keine
   einzige der 110 Fragen nutzt es.** Das ist der größte Hebel für die
   Musik-Lücke: eine echte Musikrunde („welcher Song?") ist im Kneipenquiz
   die beliebteste Runde und hier ohne neue Technik machbar.
3. **Gegen die LIVE-Bibliothek laufen lassen.** Dort liegen zusätzlich die rund
   5000 OpenTriviaDB-Fragen, die ihr topic aus der TDB-Kategorie bekommen.
   Export: `/api/qq/library/items?limit=10000` im Browser speichern, dann
   `node scripts/fragen-themen.mjs --datei=…`. Aus einer Container-Sitzung ist
   Prod nicht erreichbar.

**🪝 Die restlichen bedingten Hooks: gemessen, und der Befund entwarnt
(2026-08-30).** Es sind **29, nicht 31** (zwei sassen in Dateien, die beim
Aufräumen weggefallen sind). Verteilung: QQBeamerPage 15, QQProgressTree 6,
CozyQuizFinalRevealView 4, CozyGameView 2, CozyQuizTeamQuestionCard 2.

Vier davon haben die WIRKLICH gefährliche Form (erst Hooks, dann der
Ausstieg, dann weitere Hooks) statt der harmlosen der Fragefolie:
`QQProgressTree` (Z114/117), `CozyQuizTeamQuestionCard` (Z219-229/231, das
Handy!), `HotPotatoSemicircle` (Z2849-2874/2876), `RaceFinalSlide`.

⚠️ **Trotzdem ist keiner davon auslösbar, und das ist gemessen, nicht
gehofft:**
* `currentQuestion` wird nur in `qqResetRoom` auf null gesetzt, und dabei
  springt die Phase auf LOBBY. Die Handy-Karte rendert aber nur in
  QUESTION_ACTIVE/QUESTION_REVEAL, verschwindet also, statt leer zu rendern.
* `room.questions` wird nur bei der Raumanlage geleert, der Spielplan kann
  also nie mitten im Abend leer werden.
* Die Kartoffel: `scripts/kartoffel-letztes-team.mjs` stellt den Fall her
  (alle Teams eliminiert, `aktiv: NULL`) und meldet null Fehler. Der Server
  beendet die Runde, die Frage wechselt, die Ansicht wird neu montiert.
* `RaceFinalSlide` ist als DEPRECATED markiert und wird nirgends gerendert.

**Damit ist auch das hier Aufräumen und kein Bugfix**, genau wie bei der
Fragefolie. Priorität niedrig. Wer es macht: die Sicherheit liegt jeweils im
Ablauf ringsum, nicht in der Komponente. Wer den Ablauf ändert, verliert sie
lautlos, und die Lint-Regel kann das nicht sehen.

⚠️ Nebenbefund: `RaceFinalSlide` ist toter Code INNERHALB einer lebenden
Datei. `scripts/toter-code.mjs` misst auf Dateiebene und sieht so etwas nicht.

**🎨 Folien selbst gestalten können, ohne einen Agenten zu fragen (Wolf
2026-08-30).** Beim Aufräumen kam der alte Folien-Editor hoch
(`QQSlideEditorPage`, 2528 Zeilen). Wolf dazu: „er ist uralt und kann weg, er
repliziert auch irgendein beamer bild was überhaupt nichts mit dem
tatsächlichen beamer zu tun hat, das war am anfang der versuch eine art
powerpoint programm zu bauen um nicht ki code agenten meine folien
schrittweise überarbeiten zu lassen, sondern eine umgebung zu schaffen wo ich
größe, übergänge, text, font, farben, background etc ändern kann".

Der Code ist raus. **Der Wunsch ist es nicht**, und er steht hier, damit er
nicht mit der Datei verschwindet: eine Umgebung, in der Wolf Größe,
Übergänge, Text, Schrift, Farben und Hintergrund selbst stellt.

⚠️ Warum der erste Versuch gescheitert ist, und das ist die Lehre für einen
zweiten: er hat die Bühne **nachgebaut** statt sie zu benutzen. Damit lief er
sofort auseinander, und am Ende zeigte er ein Beamerbild, das es so nie gab.
Ein zweiter Anlauf müsste die echten Views rendern (wie es die Werkzeuge
unter `scripts/` tun, siehe `scripts/lib/buehne.mjs`) und nur Werte daran
verstellen. Nichts davon anfangen, ohne vorher mit Wolf über den Umfang zu
reden: das ist ein Produktstück, kein Aufräumen.

**Ein Nebenbefund beim Fragefolie-Umbau (2026-08-30), gemessen:**
- 📝 **Die Übergabe nennt einen Absturz, den es nicht gibt.** Dort steht, eine
      Aufrufstelle ohne `key` liefere „Rendered fewer hooks than expected". Am
      30.08. im Browser mit zwei Proben gegengemessen: 2 Hooks auf 1 Hook meldet
      React, 2 Hooks auf 0 Hooks nicht. Die Fragefolie war die zweite Form, der
      Ausstieg lag vor jedem Hook. Der Umbau bleibt richtig, aber er war
      Aufräumen und kein Bugfix. Steht so auch im Kopf der Datei.


**Moderator-View (offener Rest — Cockpit/Setup-Wizard + Back-Fix Fund 1+2 + Finale-Score-Fund 4 + SPACE-Hints
+ Runden/Frage-Pills sind durch, s. Git):**
- ✅ **Back Fund 3 — Teil 1 GEBAUT** (2026-07-20, `0ef05fb1`). Scope nach AskUserQuestion bewusst ENG: nur
      der Übergang PHASE_INTRO→QUESTION_ACTIVE („Space im letzten Intro-Step zu früh, Frage aktiviert").
      Das ist der häufigste Fehlgriff UND der risikoärmste Restore — zu dem Zeitpunkt ist keine Antwort da,
      einziges Seiteneffekt ist der gestartete Timer + ein meist leerer History-Flush. **Placement-/Bets-zu-früh
      bewusst NICHT gebaut** (die unwänden echte Scores/Grid → brauchen erst Wolfs Beamer-Durchlauf).
      Bau: Single-Slot `_phaseSnapshot` in `qqActivateQuestion` (vor dem Grenzübertritt), Restore in
      `qqGoBackSlide` (pur, längen-basiertes History-Trimmen), Timer-Stop im `qq:goBackSlide`-Handler,
      Snapshot-Löschen in `qqRevealAnswer`. Muster von `_undoSnapshot` gespiegelt, komplementär zu Ctrl+Z.
      ROT→GRÜN per 3 Unit-Tests (vitest 52/52).
      ⚠️ **Am ECHTEN Beamer noch nicht rot-reproduziert** (braucht Wolf) — Fix ist deshalb eng, berührt keine
      Answers/Scores/Grid. Beim Durchlauf gegenchecken: im Runden-Intro absichtlich Space zu früh, dann Zurück
      → muss die Kategorie/das Intro zurückholen, ohne Countdown-Geist.
      Teil 2 (GAME_OVER-Zurück-Hotkey → `qqAwardStep{-1}`) + Teil 3 (400ms-Bounce-Guard) sind schon länger durch.

**Audit-Funde 2026-07-19 (3 Finish-Audits — beide Modi funktional durchspielbar; die 2 Funde sind GEBAUT):**
- ✅ **Endstand-Beat Höhen-Cap GEBAUT** — reine Sicherheits-Bremse in `LargeGroupGameOverView` (8 Arena-
      Fraktionen bleiben bei 62px = Wolf-Baseline, nur der 9-10-Zeilen-Edge komprimiert). Am Beamer gegensehen.
- ✅ **COZY_GAME-Blank GEBAUT** — `QQBeamerPage` zeigt bei `phase===COZY_GAME` + `cozyGame===null` jetzt die
      neutrale Pause-Tafel statt leerem Beamer (Reconnect/Cancel-Transient).
- Bestätigt SAUBER: Arena-Pfad bucketet überall korrekt auf 8 Fraktionen (kein Roh-40-Overflow), EN-Fallback
  durchgängig, deaktivierte Landminen (Bluff/OnlyConnect/Final-Wager/Comeback) sind in Arena hart gegated.

**Font & Menü (Wolf 19.7.):**
- [x] ~~**Kolosseum-Font Phase 2**~~ **Faellt weg (Wolf 2026-08-28):**
      „kolosseum font kommt dann raus, weil ja standard font aus cozyquiz
      standard design kommt".
      Der Punkt wollte Siegerehrung und Standings dem Schlicht-Schalter folgen
      lassen. Wenn CrowdQuiz das Standarddesign von CozyQuiz uebernimmt, kommt
      die Schrift von dort, und es gibt nichts mehr zu gaten. Die Arbeit geht
      in „CrowdQuiz im Standarddesign" auf, siehe unten.
      ~~⚠️ Die Falle von damals bleibt aber gueltig und gehoert dorthin
      mitgenommen: die Zeremonie hat EIGENE, immer sichtbare Kolosseum-
      Hintergruende (`award-<slug>.webp`, `epic-moment.webp`), die
      `arenaBackgrounds` nicht respektieren.~~
      **Nachgeprueft 2026-08-28: stimmt nicht mehr.** Die Zeremonie liest seit
      2026-07-20 `qqArenaType` und faellt damit unter dasselbe Gate wie alles
      andere („Schlicht = ueberall schlicht", Kommentarkopf in
      CozyQuizLargeGroupView). Am laufenden Bild geprueft: unter 'buehne'
      zeigt die Station „spielende" keinen award-ceremony-Grund, unter 'cozy'
      schon.

**Screens-1707-Batch — KOMPLETT durch:** bild 4 ✅, 9 ✅, 11 ✅, 12 ✅, 13 ✅, 14 ✅, 15 ✅,
16 ✅ (Thanks-Page Arena-Glas, Regel `qqArenaGlass()`), 17 ✅ (Summary Kolosseum-BG Sieger-Fraktion +
Wappen), bild 10 ✅ (2/3-Ansicht = `QQGemFill`-Diamant füllt in Kategorie-Farbe, Wolfs 3. Variante statt
Pips/Balken — im Code aktiv, Wolf 19.7. bestätigt entschieden). Details in Memory `project_screens_1707_batch`.

**Kolosseum-Kohärenz — 🔴 RICHTUNG GEKIPPT (Wolf 2026-07-20):** „römisch? meine arena ist bunt und wirkt
mystisch". Die römische Stein-Schiene ist **zurückgebaut**: Tier-1-Medaillons (Stein+Gold) raus, wieder die
**bunten 3D-Kategorie-Icons** (Wolf: „passen super zum Background" → **nicht mehr anfassen**) · Wolf-Magier-
Splash raus (Wolf: „ich bin ja der Wolf, der durch den Abend leitet") · 4 Sandstein-Sub-Icons nicht verdrahtet
(gitignored, >2 MB brechen den Workbox-Precache). **Cinzel + EB Garamond bleiben** (Wolf 20.7. nach Kandidaten-
Vergleich am echten Beamer: „wir lassen Cinzel und Garamond" → Alternativen nicht erneut vorschlagen).
Tier 2-4 = gestrichen, nicht bauen.
- [ ] **Offen/inhaltlich: was heisst „bunt und mystisch" konkret?** Kommt über Farbe/Leuchten/Tiefe, NICHT über
      Icons oder Schrift (beides ist entschieden). Erst nach Wolfs Durchlauf angehen, wenn er sagt wo es flach wirkt.
- [ ] *(spaeter/optional, nach Freeze)* Progress-Tree Diamanten/Gems statt Kreise (koppelt an Tier-1-Assets).
- [x] ~~*(spaeter/optional, nach Freeze)* Verzierte Rahmen für Windows + Frage-Karten.~~
      Wolf 2026-08-28: „rahmen hat sich erledigt".

**🐛 Winner-Value-Bugs in Guess-Reveals:** alle gefixt + verifiziert (`3f5e8338`, `f4d84116`,
`8cf728b5`, `209a83d4`, `a238696c`). Offener Rest = nur ein Asset (unten): das „⚡"-Platzhalter-Icon.

---

## ⏸ CozyArena LIVE-EVENT — SCHLAFEND (Termin abgelaufen)

> Der Block hiess bis 2026-08-26 „~Anfang Aug 2026 — HÖCHSTE PRIO". Das Datum ist
> vorbei, und Wolf hat bestaetigt, dass aktuell kein Arena-Event ansteht. Die Punkte
> bleiben stehen, aber „hoechste Prio" ohne Termin ist nur noch Druck. Sobald ein
> Datum steht, wird die Ueberschrift zurueckgedreht.

**Kontext:** Erstes Event mit echten Geräten. Firma lädt ein, 50–100 Leute (theoret. bis 200),
Tech- + UX-Publikum (kritisch!), komplett **Englisch**, kostenloses Testevent, **Wolf moderiert
solo**. 3–4 Leute pro Handy → ~25–40 Handys/Teams.

**🟠 NEU 2026-07-20 (beim Build aufgefallen, nicht angefasst): Service-Worker-Precache = 114 MB.**
`vite.config.ts` precacht alle png/webp/avif/wav (611 Einträge) — Avatare 52 MB, Themes 21 MB,
Icons 21 MB, Sounds 19 MB. Beim **ersten** Öffnen von `/team` lädt jedes Handy das runter. Bei
~40 Handys auf Venue-WLAN sind das theoretisch ~4,5 GB und langsame Joins. Wolfs Staging-Ordner
`neue background/` (88 MB) ist korrekt via `globIgnores` raus, das ist **nicht** die Ursache.
⚠️ Vor dem Event **messen statt schätzen** (echtes Handy, Netzwerk-Tab, Cache leer): lädt der SW
wirklich alles beim Install, oder greift `runtimeCaching`? Erst danach entscheiden, ob Avatare/
Themes/Sounds aus dem Precache in Lazy-Runtime-Caching wandern. Kein Blind-Fix.

**🔒 Gelockt:** Fraktions-Soft-Cap (`ceil(Teams/8)`) + freie Wahl · Team-Cap 40
(`QQ_MAX_TEAMS_LARGE`) · 3-vs-4-pro-Handy = Vor-Ort-Ansage, kein Code · Raum auf EN → Handy +
Beamer + Fraktionen komplett EN (Mod-Konsole bleibt DE).

**Server ist NICHT der Flaschenhals** (Lasttest `backend/scripts/loadtest-arena.mjs`: 40/40 Joins,
Broadcast-Fan-out 33 ms, Payload 15,3 KB) → Broadcast-Throttle vorerst nicht nötig.

- ⏸ **Kompletter Trockenlauf** mit mehreren echten Geräten, voller Durchlauf, EN. ← der große
      Brocken, deckt die meisten Punkte unten mit ab.
- ⏸ **Setup-Flow am echten Gerät** in EN durchklicken (Fraktion wählen → beitreten).
- ⏸ **Venue-WLAN-Latenz + in-Frage-Payload** gegenprüfen. Bei Lag: Broadcast drosseln/Delta.
- ⏸ **Fraktions-Soft-Cap live validieren** im 40-Geräte-Lauf (Backend-Safety-Net ist gebaut).
- ⏸ **EN-Content-Verify:** ✅ **automatisiert (2026-07-20):** `npm run check:en` (Repo) / `check:en:live`
      (echte Mongo-Drafts), Exit 1 bei Fehlern → als Gate vorm Event nutzbar. Trennt „zeigt garantiert Deutsch"
      (Fehler) von „meist sprachneutral" (Warnung), überspringt deaktivierte Mechaniken.
      ✅ **Die 6 Fehler sind GEFIXT (2026-07-20, `bd8c59d1`)** — Quelle gefüllt + Migration, die fehlende
      EN-Felder in `order`-Fragen nachzieht. Rot→grün belegt (Checker 6 Fehler → Migration lokal echt
      laufen lassen → 0 Fehler). Deckt `qq-vol-*` **und** die Extra-Test-Drafts ab (die kannten vorher
      nur „add if missing", wurden also nie aufgefrischt).
      ⚠️ Die Migration füllt **nur fehlende** Felder (anders als die Drift-Überschreiber daneben), sonst
      hätte sie Übersetzungen aus dem Studio bzw. `/translate` plattgemacht.
      ✅ **LIVE VERIFIZIERT GRÜN** (`check:en:live`: 11 Drafts, 190 Fragen, **0 Fehler**).
      ⚠️ **Lehre, die Zeit gekostet hat:** der erste Fix war unvollständig. Es gibt **ZWEI** Migrations-
      Ebenen, und sie sind getrennt: (1) beim Startup auf `qqDrafts` (Datei/Speicher), (2) im Endpoint
      `/api/qq/drafts` auf den **Mongo**-Drafts via `saveQQDraftToDB`. Live liest aus Mongo → wer nur
      Ebene 1 anfasst, sieht lokal grün und live weiter rot. Beim nächsten Draft-Datenfix **beide**
      Ebenen bedienen. Beleg: Live schlug 150s nach dem Deploy von `61b2306c` um.
      💡 Die Live-DB hat **11** Drafts / 190 Fragen, das Repo nur 9 / 155 (Spielegruppe, Neue Bunte
      Tüte, Eurovision existieren nur live) → `check:en` allein reicht als Event-Gate NICHT, immer
      auch `check:en:live`.
      ⚠️ Fix-Weg für Neues: `qqDrafts.json` ist **gitignored** (reines Laufzeit-Artefakt) und File/DB
      gewinnen über den Source (`createSampleQQDrafts` läuft nur bei `length===0`) → NIE das JSON
      editieren, sondern Quelle **plus** Migration, oder den `/api/qq/drafts/:id/translate`-Endpoint.
      Für den EIGENTLICHEN Event-Draft gilt das weiter, sobald du ihn baust.
- ⏸ **Stechen-Trockentest** beide Modi (normal + Arena) + Auto-Reveal-Timer. Fummelig ist nur,
      künstlich einen Gleichstand herzustellen.
- ⏸ **Wertungs-Tuning am Trockenlauf:** Finale = „letzte Phase" richtig? · Nähe-Kurve K=3 /
      Map-Cap 25° am echten Content justieren.
- ⏸ **Progressives Fraktions-Öffnen** entscheiden (nur falls die Bars bei wenig Andrang dünn wirken).

**🧨 Schlafende Landminen** (deaktivierte Features, kein Live-Risiko — NICHT jetzt fixen): falls
Bluff/OnlyConnect je reaktiviert werden → `Bluff.tsx:511/640` + `OnlyConnectBeamerView.tsx:321`
iterieren rohe `s.teams` (40 statt 8 Fraktionen → Overflow); ebenso Final-Wager/Comeback in Arena.
Vor Reaktivierung Fraktions-Bucketing (`isMega`/`qqFactionBuckets`) ergänzen.

**Showdown Phase 2b (episch, bewusst droppbar):** Showdown-Zone (Top-Gruppe leuchtet durchgehend) ·
Cut-Moment (Wolf-Ansage + Awards-Feier, Akt 2) · Showdown-Look (dunkle Bühne/Spotlight im Finale) ·
persönliche Handy-Anzeige `/team` bei Distanz („Du: 96!"). Design-sensibel → eigener Pass.
Phase 1 + 2a + Finale-Banner shippen allein.

> 🎨 **Reveal-DESIGN macht Wolf selbst in Claude Design.** KI-seitiger Reveal-Rethink ist
> **gestrichen** — nicht bauen, nicht brainstormen. Wir setzen nur gelieferte Designs um.
> Backend-Wertung bleibt unsere Domäne (fertig, `test:scoring` ist Build-Gate).

---

## 🐛 GEPARKT — Bugs ohne Repro (kein Fix ohne Snapshot!)

Beim nächsten Live-Vorkommen DevTools-Network `qq:stateUpdate`-Payload ziehen. Blind fixen hat
hier schon Layout-Regressionen gekostet.

- **Team-Color rot↔blau-Swap am Final-Start** — `teams[i].color` vor/nach Final-Start vergleichen.
- **Joker-Re-Detection nach Steal-Roundtrip** — `state.grid[r][c]` der 4 markierten Cells
  (`ownerId`/`jokerFormed`/`jokerCounted`/`stuck`) + `teamPhaseStats[teamId]`. Fix-Optionen:
  (a) `cells.every(...)` statt `some(...)` in `qqBfs.ts:122+` detectNewJokers, oder
  (b) `jokerCounted` bei Steal NICHT resetten. Auch `qqRooms.ts` handleJokerDetection.
- **/team Joker-False-Positive** — Pragma-Patch drin (`myJokersThisPhase > 0`-Gate). Falls
  nochmal: Payload mit `pendingAction`/`placementsLeft`/`teamPhaseStats`.
- **Beamer-Clipping bei 10+ NICHT-genesteten Teams** (kein Scroll, nur Clipping am Stage-Rand):
  `CozyQuizLargeGroupView` CumulativeStandings (10×88px ≈ 970px an der 990er-Kante) +
  `CozyQuizGameOverView` Normal-Recap (`cols=1` ohne Höhen-Cap). 3-4er-Teams unkritisch,
  genestete Arena (8 Fraktionen) sicher. Erst mit genau 10+ echten Teams prüfen.

**Braucht echtes Gerät:** Tastatur verdeckt Eingabefeld auf kleinen Phones (iPhone SE).
Fix-Kandidat `scrollIntoView({block:'center'})` nach Fokus — ⚠️ `preventScroll:true` wurde bewusst
gegen Header-Springen gesetzt, also erst am Gerät testen.

## ⏸ BEWUSST DEFERRED (mit Grund — nicht vergessen, aber nicht blind bauen)

- **Round-Intro-Balance** — tief mit dem Journey-Zoom-Kamerasystem verzahnt (Bug-Hotspot), hohes
  Bruchrisiko; „oben-lastig" ist evtl. nur ein Transition-Frame. Erst am echten Lauf prüfen, ob's
  überhaupt stört.
- **Reflow-Audit Frage-View** (Timer/Badges) — nur falls der CHEESE-Shift nach dem Fix bleibt.
- **Streamdeck-Action-Toast** bei Hotkey-Press — optional, geringer Mehrwert (F13–F19 + Bounce-Locks
  sind verdrahtet, Skip-Toast existiert).
- **Mikro-Polish** (Animation-Easings · Layout-Cap-Bumps · justifyContent-Lücken) — spekulative
  Audit-Notizen, **Zeilennummern veraltet**. Nur anfassen wenn du die Stelle konkret bemängelst,
  vorher re-grepen.

## 🌐 BLOCKIERT / EXTERN (kein Code-Task hier)

- **ThanksView „Nächstes Event"-Block** — wartet auf den cozywolf.de-Buchungsflow. Layout-Skelett
  vorbereitet (`QQBeamerPage.tsx` ThanksView, Suchwort „LINKS: Platzhalter").
- **cozywolf.de Impressum/Datenschutz** ergänzen (App-seitig live). Siehe `COZYWOLF_LANDING.md`.

---

## 🎨 LANGLÄUFER

**Design-Sweep + 1000h-Schlussstrich** → [`DESIGN_SWEEP.md`](DESIGN_SWEEP.md): der einmalige
Design-Durchlauf (Beamer+Team, 21 Stationen, vorne→hinten), danach **Design eingefroren → nur noch
Funktionalität**. Arbeitszeit ~895/1000 h über alle 3 Repos, noch ~105 h. Nach `21/21` keine
Geschmacks-Politur mehr vorschlagen.

**Danach:** UX-Delight- & Motion-Elevation-Pass („Boden fertig, dann Delight"), Screen für Screen,
Wolf im Loop, via `animate` + `ui-ux-pro-max` + `web-design-guidelines`.

> **Higher/Lower als Stechen.** 2026-08-23 mit Wolf besprochen, Befund
> nachgetragen, Entscheidung offen.
>
> Wolf: „Ich fände Higher/Lower für ein Stechen super, auf jeden Fall besser
> als Schätzen, da es Main-Kategorie ist." Ich bin dafür, und zwar aus einem
> zweiten Grund: Schätzen ist eine STILLE Mechanik. Beide tippen, dann wird
> aufgedeckt, dazwischen passiert im Raum nichts. Für den letzten Moment des
> Abends ist das die falsche Kurve. Higher/Lower ist laut: Karte liegt, alle
> rufen mit, dann kippt sie.
>
> **Was der Code hergibt, nachgesehen statt vermutet.** `QQComebackHLState`
> trägt `teamIds: string[]` mit dem Kommentar „alle Teams, die gleichzeitig
> mitspielen (1 bei Solo-Last, ≥2 bei Tied-Last)". Der Mehrspieler-Fall ist
> also schon gebaut: Antworten pro Team, Richtig-Zähler pro Team, ein Timer für
> alle. Ein Zwei-Team-Duell ist genau dieser Fall.
> Nicht passend ist nur das Ende: heute mündet `done` in eine `steal`-Phase,
> in der die Gewinne in geklaute Felder umgesetzt werden. Fürs Stechen endet es
> bei `done`, `winnings` wird verglichen, und bei Gleichstand läuft eine weitere
> Runde. Das ist ein umschriebenes Ende, kein Neubau.
>
> **Was der Code NICHT hergibt: die Begründung.** Der Abschalt-Commit
> (a218886d, 07.07.2026) nennt zwei Gründe. Der zweite, „mechanisch redundant
> zur Final-Wager-Phase", trifft ein Stechen NICHT: die Wager-Phase macht
> Rückstand aufholbar, ein Stechen trennt zwei Gleichstehende. Verschiedene
> Aufgaben. Der erste Grund ist wörtlich nur „war buggy" — welcher Bug, steht
> nirgends, weder im Commit noch als Marker im Code. Alle Bug-Kommentare in
> `CozyQuizComebackView.tsx` sind datierte, erledigte Fixes.
>
> **Konsequenz:** vor dem Umhängen einmal einen Livetest-Durchlauf der
> H/L-Phase fahren und den Bug reproduzieren. Erst rot, dann grün. Ohne
> Repro wäre es Raten, ob der Fehler beim Stechen überhaupt auftritt.

> **„Das Brett fällt" ist gebaut** (2026-08-24). Die drei Sekunden leerer
> Vorspann vor dem Turmbau sind weg; stattdessen steht das Brett noch einmal
> still, dann lösen sich die Kacheln zeilenweise von unten nach oben und
> fliegen in die Spalte ihres Teams, wo sie sich zum Turm stapeln.
>
> Zwei Entscheidungen, die beim Bauen dazukamen:
> * Es fliegen nur die Kacheln des **größten zusammenhängenden Gebiets**
>   (`utils/qqLargestCluster.ts`, dieselbe 4er-Nachbarschaft wie der Server).
>   Die Turmhöhe IST dieses Gebiet — flögen alle Kacheln, wäre der Turm am Ende
>   niedriger als die Zahl der geflogenen Kacheln. So erzählt die Bewegung die
>   Regel mit: verstreute Felder sinken ab und verblassen, nur das Gebiet steigt
>   auf. Der Untertitel sagt jetzt entsprechend „Euer größtes Gebiet wird zum
>   Turm" statt „Jedes eroberte Feld ist ein Baustein" — das stimmte nie.
> * Die Kacheln der Top 3 verlieren ihre Farbe **im Flug**. Sonst wäre die
>   Anonymität der Spitzentürme in dem Moment hinfällig, in dem das Brett fällt.
>
> Bildrate: das war das einzige echte Risiko. Die Flüge laufen in Wellen, eine
> Brettzeile pro Welle, jede Kachel als reine CSS-Transform mit eigener
> Verzögerung. In der Luft sind höchstens zwei Zeilen, also rund sechzehn
> Kacheln, und gelandete Kacheln werden abgeräumt. Auf dem Testrechner keine
> sichtbaren Aussetzer; **auf dem echten Beamer-Rechner noch nicht gemessen**.
>
> Offen geblieben: der Final-Tipp-Bonus und doppelt zählende Klebefelder fallen
> weiter als anonyme Bausteine in der alten Bau-Phase nach, statt eine eigene
> Geste zu bekommen.

**Theme-/Skin-System** — **Studio Mono** ist live durchgeklickt + poliert (Shape-Tokens, Quiet-Motion,
Cheese-Mono-Redesign, Summary skin-aware). Offen:
- [ ] **SoftPop + Neo-Brutal** noch NIE am Live-Screen durchgesehen — kommen laut Wolf **erst wenn
      Mono perfekt** (Mono hat Prio, am ehesten für Corporate).
- [ ] **Augen-Review am Screen** (kein Code): Comeback-View in Mono + Summary-Mono eckig/Hard-Shadow.
- [ ] **Entscheidung offen:** Theme-Resolver-Fundament bauen (`resolveTheme` → ein `ResolvedTheme`,
      `getBrandColors` wird dünner Wrapper, Eurovision = nur ein Preset)? Wenn ja: welche
      Event-Themes zuerst? ⚠️ Ehrliche Kosten: Fundament ~½ Tag, „einheitlich über ALLE Pages" ist
      Langschwanz (~124× hardcoded `#ec4899` + Inline-Brand-Werte) → **graduell**, kein
      Wochenend-Projekt. Mass-Replace ist ausdrücklich verworfen (`qqDesignTokens` sagt das selbst).

**Marketing-Seiten** (`/about` A4-One-Pager mit PDF-Download, `/trailer` 9:16) sind live. Optional:
`/about` 1-Seiten-Fit am Druck verifizieren · MediaRecorder→WebM-Download im Trailer ·
Trailer-Tempo nach Review. ⚠️ Bei Mechanik-Änderungen **beide Seiten mitziehen** (Inhalt ist aus
den Regeln abgeleitet).

## Offen aus dem 2026-08-28 (Wolf)

- [x] **P1 · Reveal-Unruhe.** Wolf: „springt viel und aendert die groesse ...
      vorallem bei 10 v 10 und mucho", danach „nach timer springt es kurz, wenn
      gewinnerteam unten reinkommt ist es auch eher ein harter sprung".
      Drei Ursachen, alle gemessen und behoben:
      1. Der Einpasser hielt die Auftrittsbewegung der Sieger-Karte fuer einen
         Ueberlauf (`scrollHeight` rechnet Transforms mit) und kuerzte dafuer
         14 bis 20 Prozent Schriftgroesse. Jetzt dieselbe Offset-Rechnung wie
         bei der Sperren-Pruefung.
      2. Der harte Schnitt der Fragekarte hatte zwei Layout-Uebergaenge im
         Schlepptau. Beide raus, alles faellt in dasselbe Bild.
      3. Die Sieger-Karte wartete 768 ms tot und blitzte dann in 240 ms auf.
         Jetzt 120 ms Beat und eine Deckkraft, die mit der Bewegung laeuft.
      ⚠️ Was bleibt und bleiben soll: ein Gleiten von rund 50 px um +1 s, wenn
      die Kopfzeile nach dem Timer verschwindet (Entscheidung vom 2026-08-23).
      ⚠️ Sechs weitere Stellschrauben sind gemessen und ausgeschlossen, sie
      stehen einzeln im Kopf von `scripts/einpassen-unruhe.mjs`. Wer hier etwas
      aendert, misst DREI Laeufe - ein einzelner gruener Lauf beweist nichts.

- [x] **P1 · Siegerehrung: eine Zeile stand UNTER der Buehnenkante.**
      „Schade, der Tipp ging daneben" bei y 1004..1046, die Buehne endet bei
      990. Ursache: zwei Wrapper der Folien-Ueberblendung ohne `minHeight: 0`,
      also `min-height: auto` - ein Flex-Kind kann damit nicht unter seinen
      Inhalt schrumpfen. Dazu laeuft im Tipp-Panel jetzt derselbe Einpasser wie
      auf der Fragefolie, statt nach der Teamzahl zu stufen.

- [x] **P2 · Team-Auftritt und Danke-Folie: „verdeckt".**
      Nachgemessen: beide beschneiden nur LEERRAUM, keinen Text. Kein Fehler.
      Das Werkzeug stuft solche Faelle jetzt als Hinweis ein und nicht mehr als
      Befund - sonst meldet es dauerhaft zwei Fehler, die keine sind, und wird
      nach drei Laeufen ignoriert.

- [x] **P1 · Heisse Kartoffel: Antworten wurden abgeschnitten.** Wolf
      2026-08-28: „entweder der teamname oder die antwortmoeglichkeiten,
      mehrere reihen, abgeschnitten waren, das ist tricky".
      Gemessen (`node scripts/kartoffel-platz.mjs`): der Antwort-Block hat
      einen Deckel von 297 px, bekommt aber nur 101 - der Halbkreis darunter
      steht mit 324 px fest in einer Spalte von 449. Die Groessenleiter der
      Plaettchen war auf die gedachten 297 px gerechnet und stufte nach der
      ANZAHL, also war jede Stufe ein bis zwei zu gross. Bei zwoelf Antworten
      verschwanden 81 px lautlos hinter `overflow: hidden`.
      Die Leiter misst jetzt, statt zu zaehlen, und stuft nur abwaerts.
      Nachgemessen bei 1, 8, 12, 20 und 30 Antworten: nichts verdeckt, Name
      vollstaendig im Bild.

- [x] **P1 · Lobby-Avatare winzig.** War der abgekoppelte Klon, nicht das Repo.
      Wolf am 2026-08-28: „alte avatare sind wieder da".

---

## 👀 WARTET AUF WOLF (2026-08-28, nach der Pause)

Wolf: „lass das drinstehen, darum kuemmere ich mich nach meiner pause".
Beides kann ich nicht fuer ihn tun - es braucht das Livebild und den Saal.

- [ ] **Siegerehrung am Livebild pruefen.** Heute wurde dort einiges bewegt,
      und zwar so, dass es NUR am Projektor zu beurteilen ist:
      * Der Trostsatz „Schade, der Tipp ging daneben" war unter der Kante und
        ist wieder da. Steht er ruhig, oder wirkt die Folie jetzt gedraengt?
      * Das Tipp-Panel passt sich jetzt ein, statt nach der Teamzahl zu stufen.
        Bei vielen Tippern werden Avatare und Namen kleiner - reicht das auf
        acht Meter noch?
      * Der Auftritt der Sieger-Karte ist entschaerft (Weg 14 statt 30 px,
        Ueberschwung 1.01 statt 1.03, 0,8 s statt 0,65 s). Feiert das noch
        genug, oder ist es jetzt zu brav?
      * Der Sieger-Ton haengt an `WINNER_DELAY_MS` und wurde von 700 auf 120 ms
        gezogen. Sitzt er noch auf dem Bild?
      ⚠️ Vorher hart neu laden (Strg+Shift+R), sonst laeuft ein alter Build.

- [ ] **CozyQuiz einmal komplett am Beamer durchspielen.** Steht seit dem
      2026-07-19 und ist der einzige Punkt, den kein Werkzeug ersetzt.
      ⚠️ `scripts/anschnitt-suche.mjs` deckt inzwischen 26 Stationen ab und ist
      sauber - aber es prueft NUR, ob Text abgeschnitten wird. Ob eine Folie
      zu lang steht, ob eine Ansage fehlt, ob der Rhythmus stimmt: das sieht
      nur ein Durchlauf.

---

## 🏟️ CROWDQUIZ: neuer Name, neues Standarddesign (Wolf 2026-08-28)

Drei Zurufe, die zusammengehoeren:
> „ok cozyarena heisst jetzt CrowdQuiz"
> „cozyarena hat ja andere frage formate, soll aber im standard design so
>  aussehen wie das neue standarddesign von cozyquiz creme und dunkelblau
>  (glaube ich)"
> „standard ersetzt dann schlicht in CrowdQuiz"

⚠️ **Zur Farbe, gemessen statt uebernommen.** Creme stimmt: `#F5ECD8`
(`qqTheme.ts`, `BUEHNE.accentHex`). Der Grund ist aber kein Dunkelblau,
sondern ein tiefes Violett:
`radial-gradient(circle at 50% -5%, #1A1526, #120E1C, #0B0912)`.
Blau wirkt es dort, wo die KATEGORIE den Grund einfaerbt - Mu-Cho ist blau.
Wer „dunkelblau" fest verdrahtet, faerbt alle fuenf Kategorien gleich und
nimmt der Buehne genau den Kanal, der heute die Kategorie traegt.

- [x] **Umbenennen: CozyArena -> CrowdQuiz.** Erledigt 2026-08-28.
      **17 sichtbare Stellen**, nicht 23 wie zuerst geschaetzt - und vier davon
      hatte die erste Zaehlung uebersehen, weil die Wortmarken in
      GROSSBUCHSTABEN stehen (`'COZYARENA'`) und mein Suchmuster auf
      `CozyArena` lief. Deshalb am Ende nicht gezaehlt, sondern nachgesehen.
      Geprueft am laufenden Bild: Normalformat COZYQUIZ, Grossformat CROWDQUIZ.
      Bezeichner, Pfade und die rund 170 Kommentare heissen weiter `cozyArena`
      (Begruendung in CLAUDE.md).

- [x] **CrowdQuiz im Standarddesign, und das Standarddesign ersetzt
      „Schlicht".** Erledigt 2026-08-28.
      Der Umbau war eine Zeile, und sie stand nicht dort, wo ich sie gesucht
      habe. Nicht der Look-Schalter hat das Kolosseum gebracht, sondern die
      Format-Wahl: `themeId: ar ? 'cozy' : 'buehne'` (QQSetupFlow und die
      Format-Vorwahl im Steuerpult). Alle Arena-Gates fragen `!isThemed()`,
      also haengen Kolosseum-Bilder UND Cinzel am DESIGN. „Schlicht" war
      deshalb nie ein eigener Look, sondern ein abgeruestetes Cozy.
      Jetzt: beide Formate starten auf 'buehne'. Die Look-Kachel heisst
      „CozyQuiz Standard", steht vorn und setzt Design und BG-Schalter
      zusammen. „Mit Kolosseum" bleibt und setzt beides zurueck.
      Die Warnung aus „Kolosseum-Font Phase 2" hat sich damit erledigt: die
      Zeremonie folgt dem Gate schon seit 2026-07-20 (`qqArenaType`).
      Nachgemessen am laufenden Bild: Standard zeigt Kategorie-Grund, Creme
      und Bricolage; Kolosseum zeigt cat-schaetzchen.webp und Nunito.

      Beim Durchmessen mitgefunden und mitgefixt: die Zwischenstand-Liste
      („Frage x/5 · noch n Kategorien") rechnete mit 820 px Platz, hatte aber
      725. Ab zwoelf Teams lief die unterste Zeile 44 px unter die
      Buehnenkante, ab zwanzig waren zusaetzlich alle Namen und Zahlen
      waagerecht durchgeschnitten (`clamp` liefert MIN, sobald min > max).
      Beides gemessen, beides behoben, 8 Teams unveraendert.

- [ ] **Offen aus derselben Messung: CrowdQuiz mit 20+ Teams ist eng, aber
      nicht mehr kaputt.** Bei zwanzig Teams ist die Zwischenstand-Zeile
      36 px hoch, der Name 14 px. Nichts wird mehr abgeschnitten, aber auf
      zehn Meter ist das klein. Die Frage, ob die Liste ab einer Zahl X
      deckeln soll („…und n weitere"), ist eine Design-Entscheidung und
      gehoert Wolf, nicht mir.

- [x] **Kategorie „All In" heisst „Ten Chips".** Erledigt 2026-08-28.
      NUR die englische Seite: en „Ten Chips", de bleibt „10 von 10".
      Ich hatte zuerst beide umgestellt und mich dabei auf Mu-Cho berufen
      („ein Eigenname bleibt ein Eigenname"). Wolf am Bild: „aber der rest
      ist deutsch? nur in der englischen version ten chips". Er hat recht,
      und der Unterschied zu Mu-Cho ist einfach: Mu-Cho war nie ein
      englisches Wort, „Ten Chips" ist eins. Auf einer Folie mit der
      Unterzeile „Verteilt 10 Punkte auf 3 Antworten" faellt es raus. Auf
      Deutsch gibt es den Konflikt ohnehin nicht, die Fraktion heisst dort
      „Risiko".
      Zwoelf sichtbare Stellen, gegengeprueft auf alle Schreibweisen (beim
      CrowdQuiz-Umbau waren mir vier Grossschreibungen durchgerutscht).
      Bezeichner `ZEHN_VON_ZEHN` und der Asset-Slug `cat-allin` bleiben: der
      Bezeichner steht in gespeicherten Fragensaetzen. Die Fraktion `Risiko`
      heisst en weiter „All In", das war ja der Punkt.
      Am laufenden Bild geprueft: Runden-Intro und Fragefolie zeigen „Ten
      Chips", der alte Name kommt nirgends mehr vor. Nebenbefund: das Zeichen
      der Kategorie ist seit jeher ein Stapel Chips - der neue Name passt zum
      Bild, der alte tat es nicht.

- [x] **Standarddesign und die neuen Fraktions-Avatare zum Default machen.**
      ⚠️ TEIL 1 IST DRIN, BRAUCHT ABER EINEN COOLIFY-REDEPLOY (2026-08-28):
      der Server hatte zwei Vorgaben fuer dasselbe. Raumanlage setzt 'buehne',
      die drei State-Builder fielen auf 'cozy' zurueck. Ein gespeicherter Raum
      ohne `themeId` hat deshalb Pink/Navy gesendet - reproduziert, dann
      behoben, dann gegengemessen. Jetzt faellt alles auf
      QQ_DEFAULT_THEME_ID zurueck. Bis zum Redeploy laeuft am Server die alte
      Fassung.
      ⚠️ TEIL 2 ERLEDIGT am 2026-08-29, und zwar gemessen statt gelesen. Die
      offenen Fragen von damals sind beantwortet:
      * Raumanlage: `themeId: 'buehne'` (qqRooms.ts), Rueckfall im Broadcast
        ebenfalls `QQ_DEFAULT_THEME_ID` = 'buehne'.
      * Avatar-Satz haengt am FORMAT: `qqDefaultAvatarSetId` gibt CrowdQuiz die
        Wappen (`cozyArena`) und CozyQuiz die Objekte (`cozyquiz`). Die
        Fraktions-Avatare sind also in `cozyArena`, kein eigener Satz.
      * Der Wizard setzt es fuer beide Formate ausdruecklich.
      Gegengeprueft am Ergebnis - dem Akzent-Token der laufenden Seite - in
      vier Kombinationen (Beamer und /team, beide Formate), alle vier gruen:
      `node scripts/design-standard-probe.mjs`. Der Punkt „CozyQuiz-Design zum
      Standard machen" weiter unten ist damit derselbe und ebenfalls zu.

---

## Langzeit, nach dem Buehnen-Durchgang (Wolf 2026-08-26)

Explizit als „LONGTIME TO DOS fuer spaeter" angesagt, also nicht in diesem
Durchgang anfangen. Reihenfolge ist Wolfs Reihenfolge.

- [x] **Summary anschauen und anpassen.** Erledigt am 2026-08-29 (Wolf:
      „kannst du die summary page auch im neuen design erstellen? die sieht oll
      aus", dann „optimiere die seite, mach untermenues, mach die seite
      satisfying"). Neun Commits, `a607ba1a` bis `1b7c9dec`.
      Was dabei herauskam, kurz:
      * Die Seite KONNTE das Design laengst - der Memo hat nur nie
        umgeschaltet. Dabei kam ein Kontrastfehler heraus: Punktezahl weiss auf
        creme, gemessen 1,18:1. Ursache war eine ungeschriebene Annahme („der
        Akzent ist dunkel"); jede Design-Beschreibung beantwortet die Frage
        jetzt selbst (`accentInk`).
      * Das Endbrett zeigte den Avatar-SLUG als Text („teapot",
        „crystal-ball") und lief dadurch 10 px quer. Seit dem 22.08. an JEDEM
        Abend - unentdeckt, weil die Vorschau Tiere zeigte, die es nirgends
        mehr gibt.
      * Aus dem Sprungmenue wurde ein Register: 3088 -> 1843 px, Feedback von
        Schirm 2,4 auf 1,1.
      * Der Summary-Knopf auf dem Handy zeigte auf „juengstes Spiel im Raum".
        ⚠️ NUR GELESEN, nicht gesehen - siehe den offenen Punkt unten.
      Werkzeuge dazu: `summary-knipsen.mjs` (beide Ansichten, beide Formate),
      `summary-kontrast.mjs` (jede Textstelle gegen ihren echten Grund).
- [ ] **Rohe Unicode-Emojis auf der Buehne.** Wolf 2026-08-28: „einige der
      emojis in crowdquiz sind alt, die kompletten emojis in cozyquiz wurden
      auf ein neues design umgestellt". Gemessen mit dem neuen
      `scripts/emoji-reste.mjs` ueber vier Stationen, und es ist WENIGER als
      vermutet: genau ein CrowdQuiz-eigener Rest (`👥` in der Lobby, „Ein
      Handy pro Gruppe"), dazu `🏆` im Zwischenstand - das haben beide
      Formate. Die Folien-Ueberschriften laufen laengst ueber `QQEmojiIcon`.
      ⚠️ ERLEDIGT am 2026-08-29. Der volle Lauf ueber alle zwanzig Stationen
      ist sauber. Fuer die HANDY-Seiten hat Wolf ausdruecklich entschieden, die
      rohen Zeichen zu LASSEN: „ich wuerde alle auf der summary lassen, sonst
      ist die haelfte neu die andere nicht." Der Grund der Regel ist die
      Projektion; auf dem Handy des Gastes ist das native Zeichen umgekehrt das
      konsistente. Ausfuehrlich im Kopf von `scripts/emoji-reste.mjs`, das die
      Handy-Seiten deshalb absichtlich nicht ansieht.

- [x] **Teamview an das Beamerdesign angleichen.** Erledigt, Wolf am
      2026-08-29: „teamview und cozywolf.de kannst du abhaken". Gebaut hat es
      die parallele Handy-Sitzung auf ihrem eigenen Branch, nicht diese hier.
      Die Abmachung dazu steht in `docs/UEBERGABE_TEAM.md`.
- [x] **CozyQuiz-Design zum Standard machen.** Erledigt und gemessen am
      2026-08-29 (Wolf: „der schlichte modus ist in beamer cozy und crowd
      default (und dann automatisch in /team auch)"). Nicht nachgelesen,
      sondern am Ergebnis geprueft: das Akzent-Token der laufenden Seite.
      Buehne fuehrt Creme (#F5ECD8), Cozy fuehrt Pink - zwei Werte, kein
      Auslegungsspielraum. Vier von vier gruen (Beamer und /team, beide
      Formate). Nachfahrbar mit `node scripts/design-standard-probe.mjs`.
      ⚠️ Bewusste Ausnahme: ein Raum, der seit vor dem 24.08. auf Platte liegt,
      behaelt sein altes `themeId`. Wer damals „Cozy" gewaehlt hat, soll es
      behalten. Fuer CrowdQuiz gibt es eine Nachziehung im Steuerpult (nur wenn
      das Kolosseum nicht ausdruecklich gewaehlt wurde); fuer CozyQuiz fehlt
      ein Marker, an dem sich Wahl von Altlast unterscheiden liesse - deshalb
      bleibt es dort stehen, statt zu raten.
- [x] **cozywolf.de-Landing an das neue Design anpassen.** Erledigt, Wolf am
      2026-08-28: „landing kannst du abhacken ist fertig".

---

## Neu am 2026-08-29, aus der Summary-Runde

- [ ] **Der Summary-Link auf dem Handy ist GELESEN, nicht gesehen.** Der Knopf
      auf der Danke-Karte zeigte auf `/summary/{roomCode}` - „juengstes Spiel
      in diesem Raum". Wer sich den Link merkt oder ihn weiterschickt, sah den
      naechsten Abend desselben Raums. Auf dem Beamer war genau das am
      2026-05-10 repariert worden, das Handy hat die Reparatur nie bekommen.
      Jetzt dieselbe Zeile (`/summary/by-id/{id}`) samt Rueckfallebene.
      ⚠️ Ein roter Lauf war nicht zu haben: `lastGameResultId` wird erst beim
      Speichern gesetzt. Zu pruefen ist es am naechsten echten Abend, und zwar
      von Hand: auf dem Handy den Knopf antippen und schauen, ob die Adresse
      `/summary/by-id/...` lautet.

- [ ] **Teilen verschickt Text, kein Bild.** `navigator.share` mit Titel, einer
      Zeile und der Adresse. Wolf 2026-08-29 zur Summary: „die summary ist
      super wichtig fuer feedback und werbung (teilen einer nicen
      zusammenfassung button)". Eine erzeugte Bildkarte waere der groesste
      verbliebene Hebel auf das Werbeziel - Wolfs spaetere Idee mit dem
      Teamfoto im Rahmen setzt darauf auf. ENTSCHEIDUNG STEHT AUS.

- [ ] **Die Summary kommt nicht von selbst.** Auf dem Team-Handy steht am Ende
      ein Knopf, kein Wechsel. Wolf hatte danach gefragt („nach dem quiz auf
      team handys automatisch kommt"); technisch ginge beides.
      ENTSCHEIDUNG STEHT AUS.

- [ ] **Gewinnspiel: Verlosung unter denen, die Feedback geben.** Wolf
      2026-08-29: „ich will eigentlich ein gewinnspiel machen spaeter fuer die
      die mir feedback geben (geht erst nach paar events) mit random auslosung
      fuer merch", dazu „das ist ein long time to do".
      Da: das Kontaktfeld wird gespeichert (`contact` in QQFeedbackEntry), dazu
      `submittedAt` und `roomCode`.
      ⚠️ Fehlt, und der erste Punkt ist kein Nebenpunkt: das Kontaktfeld ist
      heute fuer RUECKFRAGEN gedacht (`contactIntent`: date/booking/response).
      Wer es ausfuellt, hat NICHT in eine Verlosung eingewilligt. Es braucht
      eine eigene, angehakte Zeile samt Teilnahmebedingungen und eine
      Aufbewahrungsfrist. Erst danach die Ziehung selbst (nachvollziehbar:
      Zeitraum, Lose, gezogene Id) und die Behandlung doppelter Eintraege.
      Reihenfolge: Einwilligung zuerst. Wer die Ziehung zuerst baut, sammelt in
      der Zwischenzeit Daten ohne Grundlage.

- [ ] **Zwei globale Regeln in `main.css` schlagen auf dem Handy JEDEN
      Inline-Style.** Am 2026-08-29 zweimal teuer bezahlt, beide Male beim
      Bau des Summary-Untermenues:
      * `[style*="display: flex"] { flex-wrap: wrap !important }`
      * `button { padding: 10px 14px !important; font-size: 14px !important;
        min-height: 40px !important }`
      Ein `!important` im Stilblatt schlaegt einen Inline-Style. Wer Layout
      baut und sich wundert, warum ein Wert nicht wirkt, sucht sonst im
      eigenen Code. Beide Stellen sind in QQSummaryPage kommentiert.
      `main.css` gehoert der Team-Sitzung (docs/UEBERGABE_TEAM.md), deshalb
      dort nichts aendern ohne Ansage - hier steht es nur, damit es niemanden
      ein drittes Mal kostet.

---

*Erledigte Punkte stehen in der Git-History (`git log --oneline`), nicht hier.
Abgearbeitete Specs/Audits/Handoffs liegen in [`docs/archive/`](docs/archive/).*
