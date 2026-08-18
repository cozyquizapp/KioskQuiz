# Auftrag: eigenes Emoji-Set fuer CozyQuiz (Standard-Set)

> Stand 2026-08-18. Wolf-Entscheidung: „EIGENES EMOJI SET mit Charme und eigener
> Note", angelegt als Standard-Set.

---

## 0. Zwei verworfene Richtungen, und warum (damit sie nicht wiederkommen)

**Verworfen 1: „Die Runde"** — acht zugewiesene Gruppen-Identitaeten (die
Zugewandten, die Denker, die Lauten ...), begruendet damit, dass ein Einzelwesen
ein Team schlecht vertritt, wenn vier Leute an einem Handy sitzen.

Wolfs Einwand war staerker als das Konzept:

> „den witzigen Namen geben sich die Teams ja eh selbst. Ich hatte am Anfang
> einfach nur Standard-3D-Emojis, so konnten die Teams maximal kreativ werden mit
> Namen und Auswahl, das hat erstaunlich gut geklappt."

Die Identitaet entsteht aus **Teamname plus freier Wahl aus grosser Auswahl**.
Ein kuratierter Satz aus acht benannten Charakteren nimmt genau das weg.

**Verworfen 2: ein kleiner eigener Satz aus ~24 Tieren.** Gleicher Fehler in
klein. Wolfs Anfangs-Set war das komplette Emoji-Vokabular
(👍 🥳 🐘 🤗 💞 ❣️ 🫎 🐼 🐱 🐆 🦐 🐋 🐉), also Gesten, Gefuehle, Feier UND Tiere.
Ein Team, das „Die Umarmer" heisst, findet 🤗. Bei 24 Tieren findet es nichts,
und der Moment „oh ja, das passt zu uns" faellt aus. **Reichweite ist ein
Feature, kein Zufall.**

Ebenfalls verworfen: Arena-Wappen (gehoeren zur Bildsprache des Kolosseums),
Cozy Pack als Loesung (der Wolf gehoert der Marke, acht Woelfe sind acht Mal
dasselbe Tier).

## 1. Die Aufgabe

Ein **eigenes Emoji-Set**, das das native Set als Standard ersetzt. Zwei
Anforderungen, die gleichzeitig gelten:

1. **Reichweite.** Genug Motive und genug Kategorien, dass fast jeder Teamname
   etwas Passendes findet.
2. **Eigene Note.** Es muss auf den ersten Blick als CozyQuiz erkennbar sein und
   erwachsen wirken, ohne kalt zu werden.

Nebeneffekt, der gratis mitkommt: native Emoji werden **vom Geraet** gezeichnet.
Das Team waehlt 🐼 auf dem iPhone und sieht Apples Panda; auf dem Beamer zeichnet
der Laptop einen anderen. Ein eigenes Set beendet das, weil ueberall dasselbe
Bild liegt. (Fuer Laender-Flaggen loest das Projekt es heute schon so, ueber
Twemoji-Bilder — der Render-Pfad dafuer existiert also bereits.)

## 2. Was am heutigen `cozy3d` kindlich wirkt

Am Original in voller Groesse benannt, nicht geraten:

1. **Riesige glaenzende Augen**, je zwei Glanzpunkte, teils Wimpern. Staerkstes
   Kind-Signal im ganzen Satz.
2. **Rosa Wangen.** Kawaii-Konvention.
3. **Alle laecheln.**
4. **Glaenzendes Plastik**, weiche Airbrush-Schattierung. Materialsprache der
   Handyspiel-Icons um 2015.
5. **Freischwebende Koepfe**, liest sich als Sticker.
6. **Sehr hohe Saettigung**, Bonbonfarben.

Keiner dieser Punkte hat mit dem Motiv zu tun. Es ist Material und Licht.

## 3. Woher der Charme kommt, wenn nicht aus Glanzaugen

Das ist die eigentliche Gestaltungsaufgabe. Vier Traeger, alle ohne Kind-Signal:

* **Haltung statt Ausdruck.** Nichts steht gerade. Jedes Motiv ist minimal
  gekippt, gelehnt, aus dem Lot. Eine leicht schiefe Tasse hat mehr Charakter
  als eine laechelnde gerade Tasse.
* **Handgemachte Unregelmaessigkeit.** Sichtbar geformt statt perfekt gerechnet:
  leichte Dellen, ungleiche Ohren, eine Kante, die nicht ganz sauber ist. Das
  ist der Unterschied zwischen „warm" und „steril".
* **Ein warmes Eigenlicht.** Jedes Motiv traegt eine kleine warme Lichtstelle,
  als saesse ein Gluehwuermchen darin. Das ist die Signatur, die den Satz
  zusammenhaelt und direkt an die Marke anschliesst (Gluehwuermchen, weiche
  Tiefe, siehe CREATIVE_DIRECTION.md).
* **Ruhe im Gesicht.** Kleine matte Augen, kein Glanz, keine Wimpern, keine
  Wangenroete, kein Dauerlaecheln. Ein ruhiges Gesicht wirkt aufmerksam;
  ein laechelndes wirkt kindlich.

## 4. Stil-Rezeptur (ueber ALLE Motive identisch)

Ein Satz wirkt hochwertig, wenn er wie aus einer Werkstatt kommt, nicht wenn
jedes Stueck fuer sich gut ist.

**Material.** Matt. Ton, Weichgummi, Filz. Keine Glanzlichter, kein Plastik.
Leichte Waerme im Halbschatten, keine harten Verlaufskanten. Keine Konturlinie.

**Licht.** EINE weiche Hauptlichtquelle, bei allen Motiven aus derselben
Richtung (Vorschlag: oben links, ~35 Grad). Schwaches Umgebungslicht von unten
rechts. Weicher Kontaktschatten, der aus dem Sticker ein Ding macht. Dazu das
warme Eigenlicht aus Abschnitt 3.

**Kamera.** Bei allen Motiven derselbe Winkel und dieselbe Brennweite. Leicht
von vorn, keine kippende Perspektive.

**Gewicht.** Alle Motive fuellen optisch gleich viel. Ein Elefant darf nicht
doppelt so schwer wirken wie eine Biene, sonst zerfaellt die Reihe.

**Form.** Vereinfachen. Grosse Formen, wenige Kanten. Keine Fellstraehnen, keine
einzelnen Federn, keine Schuppen.

**Farbe.** Zurueckgenommen und warm. Die Slot-Farbe (`QQ_AVATARS[].color`) traegt
die Team-Zuordnung, das Motiv muss nicht auch noch schreien.

**Anschnitt.** Ganzes Objekt statt Kopf allein, wo die Form es hergibt.

## 5. Umfang und Auswahl der Motive

Nicht nach Geschmack, sondern nach **Kategorie-Abdeckung**. Wolfs Anfangs-Set
zeigt, welche Kategorien gebraucht werden. Vorschlag: 48 Motive, 6 Bloecke.

| Block | Anzahl | Wofuer | Beispiele |
|---|---|---|---|
| Tiere vertraut | 12 | der groesste Anteil in Wolfs Beispiel | Fuchs, Panda, Katze, Elch, Eule, Baer |
| Tiere ausgefallen | 8 | die Teams, die etwas Besonderes wollen | Garnele, Wal, Gepard, Axolotl, Dodo |
| Fabelwesen | 4 | Drache, Einhorn und Verwandte tragen viele Teamnamen | Drache, Einhorn, Yeti, Geist |
| Gesten | 8 | 👍 und Verwandte — fehlen in jedem reinen Tier-Set | Daumen, Faust, Winken, Applaus, Schulterzucken |
| Gefuehl und Feier | 8 | 🥳 🤗 💞 ❣️ — der emotionale Teil | Herz, Doppelherz, Party, Umarmung, Funke, Krone |
| Dinge und Bar | 8 | Firmenfeier und Kneipe | Krug, Tasse, Wuerfel, Gluehbirne, Buch, Pilz |

Wichtig fuer den Bau: **Dinge und Gesten bekommen konsequent kein Gesicht.** Ein
Bierkrug mit Augen ist genau der Rueckfall, den wir vermeiden.

48 auf einmal ist viel. Reihenfolge: erst **12 Motive quer durch alle sechs
Bloecke** als Rezeptur-Beweis. Stimmt der Satz, wird nachproduziert. Stimmt er
nicht, sind nur 12 verloren statt 48.

## 6. Produktion: wie 48 Motive in EINEM Stil entstehen

Handzeichnen ist der schlechteste Weg, weil Konsistenz die eigentliche
Schwierigkeit ist, nicht das einzelne Motiv.

**Weg A, empfohlen: ein 3D-Aufbau, viele Modelle.** In Blender einmal Licht,
Material und Kamera festnageln, dann nur die Modelle tauschen und alles durch
denselben Aufbau rendern. Konsistenz ist dadurch garantiert statt erhofft. Und
was spaeter gebraucht wird (andere Groesse, gekippte Pose, ein zweites Bild fuer
eine Reaktion), wird nachgerendert statt neu gezeichnet. Braucht 3D-Kenntnisse
oder jemanden, der sie hat.

**Weg B: Bildmodell mit fester Rezeptur.** Ein Referenzbild plus wortgleicher
Prompt-Baustein fuer Material, Licht, Kamera, Eigenlicht und Gesichtsregeln, pro
Motiv nur das Motiv-Wort tauschen. Kommt nah heran, driftet ueber viele Motive
und braucht Nacharbeit beim Freistellen. Fuer 12 als Probe gut geeignet.

**Weg C: fertigen 3D-Icon-Satz lizenzieren** und umfaerben. Schnell und
konsistent, aber es ist dann nicht deins, und „eigene Note" war die Vorgabe.

## 7. Reaktionen (Wolf-Entscheidung: erst der billige Weg)

Kein eigener Bildsatz pro Emotion. Getrennt wird, was sich aendert, von dem, was
bleibt:

* **Pro Motiv:** ein Grundbild, optional ein zweites fuer den Blinzel-Ruck
  (Mechanik existiert, siehe `cozy3dBlinkSrc`).
* **Gemeinsam fuer den ganzen Satz:** eine Handvoll Auflagen (Arme hoch, Ausruf,
  Schweisstropfen, Krone). Fuenf Bilder fuer alle 48 statt fuenf je Motiv.
* **Bewegung aus CSS.** Das Projekt hat ueber 300 Keyframes und bewusst keine
  Animationsbibliothek. Vorbeugen ist ein Verschieben, Jubeln ein Huepfen,
  Zusammensacken ein Stauchen. Reaktionen kosten so keine neue Zeichnung.

Rive (Figuren mit echten Zustaenden, eine Datei statt vieler Bilder) bleibt der
moegliche Schritt danach. Waere die erste Animationsbibliothek im Projekt, rund
200 KB Laufzeit. Erst wenn der billige Weg nachweislich nicht reicht.

## 8. Formate: NICHT pro Position ein eigenes Bild

Gemessen (`scripts/measure-avatar-sizes.mjs`) erscheinen die Marken in
108x92, 92x92, 68x55, 48x48, 44x44 und 32x26 Bildschirmpunkten.

* **Groesse** ist kein Zeichenproblem. Ein 512er Bild deckt alle ab.
* **Seitenverhaeltnis** teilweise: Quadrat und liegendes Format wollen
  unterschiedliche Anordnung. Das sind **zwei** Fassungen, nicht sechs. Alles
  andere loesen Beschnitt und Maske in der App.

## 9. Lieferung

* `frontend/public/avatars/<setId>/<slug>.png` (plus `-blink.png`, optional)
* 512x512, transparent, Motiv fuellt ~80 Prozent, optisch gleiche Gewichtung
* danach die vorhandene Komprimierung (`optimize-avatars.js`)
* Registrierung: ein Eintrag in `frontend/src/avatarSets.ts`; als Standard
  ausserdem `avatarSetId` in `backend/src/quarterQuiz/qqRooms.ts` umstellen

## 10. Pruefung vor dem Einbau

1. **Die Reihen-Probe.** Alle Motive nebeneinander in einer Reihe. Faellt eines
   heraus (anderes Licht, andere Saettigung, anderes Gewicht), ist genau das
   Motiv der Grund, warum der Satz billig wirkt. Ein Ausreisser kostet mehr als
   drei mittelmaessige Motive.
2. **Die Namens-Probe.** Zehn erfundene Teamnamen aufschreiben, wie Gaeste sie
   waehlen, und fuer jeden im Satz etwas Passendes suchen. Findet sich fuer mehr
   als zwei nichts, fehlt Reichweite, nicht Qualitaet.
3. `node scripts/avatar-contact-sheet.mjs` um den neuen Satz erweitern.
4. Am echten Beamer, nicht im Nachbau.
