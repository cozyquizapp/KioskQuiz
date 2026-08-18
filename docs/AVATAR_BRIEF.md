# Auftrag: neues Team-Marken-Set fuer CozyQuiz

> Stand 2026-08-18. Ziel: erwachsen, heutig, mit Charakter, ohne den Mechanismus
> kaputtzumachen, der schon funktioniert.

---

## 0. Eine verworfene Richtung, und warum (wichtig fuer spaeter)

Zwischenstand dieser Session war ein Konzept namens „Die Runde": acht zugewiesene
Gruppen-Identitaeten (die Zugewandten, die Denker, die Lauten ...), weil ein
Einzelwesen ein Team schlecht vertritt, wenn vier Leute an einem Handy sitzen.

**Verworfen auf Wolfs Einwand, und der Einwand ist staerker als das Konzept:**

> „den witzigen Namen geben sich die Teams ja eh selbst. Ich hatte am Anfang
> einfach nur Standard-3D-Emojis, so konnten die Teams maximal kreativ werden mit
> Namen und Auswahl, das hat erstaunlich gut geklappt."

Das ist Empirie gegen Theorie, und die Empirie gewinnt. Die Identitaet entsteht
aus **Teamname plus freier Wahl aus einem grossen Pool**. Ein kuratierter Satz
aus acht benannten Charakteren nimmt genau diese Freiheit weg. Wolf hatte den
Mechanismus bereits richtig gebaut; die Schwaeche liegt woanders.

Ebenfalls von Wolf verworfen und der Vollstaendigkeit halber notiert: die
Arena-Wappen (gehoeren zur Bildsprache des Kolosseums, nicht zu CozyQuiz) und
Cozy Pack als Loesung (der Wolf gehoert der Marke, acht Woelfe sind acht Mal
dasselbe Tier, Ausfuehrung ueberzeugt nicht).

## 1. Die eigentliche Aufgabe

**Der Pool bleibt, der Stil wird neu.** `cozy3d` hat 83 Motive und die richtige
Mechanik. Was nicht stimmt, ist die Anmutung.

## 2. Was den heutigen Satz kindlich macht

Gemessen am Original in voller Groesse, nicht geraten:

1. **Riesige glaenzende Augen** mit je zwei Glanzpunkten, dazu Wimpern (Eule,
   Flamingo). Staerkstes Kind-Signal im ganzen Satz.
2. **Rosa Wangen.** Kawaii-Konvention.
3. **Alle laecheln.**
4. **Glaenzendes Plastik**, weiche Airbrush-Schattierung. Materialsprache der
   Handyspiel-Icons um 2015.
5. **Freischwebende Koepfe**, liest sich als Sticker.
6. **Sehr hohe Saettigung**, Bonbonfarben.

Keiner dieser Punkte hat damit zu tun, dass es Tiere sind. Es ist Material und
Licht, nicht Motiv.

## 3. Die Stil-Rezeptur fuer den neuen Satz

Das ist der Teil, der ueber alle Motive **identisch** sein muss. Ein Pool wirkt
hochwertig, wenn er wie aus einer Werkstatt kommt, nicht wenn jedes Stueck fuer
sich gut ist.

**Material**
* Matt. Ton, Weichgummi, Filz. Keine Glanzlichter, kein Plastik-Speculum.
* Leichte Waerme im Halbschatten (Anmutung von durchscheinendem Material),
  aber keine sichtbaren Verlaufskanten.
* Keine Konturlinie.

**Licht**
* EINE weiche Hauptlichtquelle, bei allen Motiven aus derselben Richtung
  (Vorschlag: oben links, etwa 35 Grad).
* Dazu ein schwaches Umgebungslicht von unten rechts, damit der Schatten nicht
  absaeuft.
* Ein weicher Kontaktschatten unter dem Objekt. Er macht aus dem Sticker ein Ding.

**Kamera**
* Bei allen Motiven derselbe Winkel und dieselbe Brennweite. Leicht von vorn,
  kein Weitwinkel, keine Perspektive, die kippt.
* Alle Motive fuellen optisch gleich viel: ein Elefant darf nicht doppelt so
  schwer wirken wie eine Biene, sonst zerfaellt die Reihe.

**Form**
* Vereinfachen. Grosse Formen, wenige Kanten. Keine Fellstraehnen, keine
  einzelnen Federn, keine Schuppen.
* Rund, aber nicht knuddelig: weiche Kanten an klaren Grundkoerpern.

**Gesicht (der entscheidende Unterschied)**
* Augen klein, matt, ohne Glanzpunkte, ohne Wimpern.
* Keine Wangenroete.
* Kein Laecheln. Ruhiger, neutraler bis leicht interessierter Ausdruck.
* Der Charakter kommt aus Silhouette und Haltung, nicht aus dem Ausdruck.

**Farbe**
* Zurueckgenommen. Gedaempfte, warme Toene statt Bonbon.
* Die Slot-Farbe (`QQ_AVATARS[].color`) traegt die Team-Zuordnung, das Motiv
  muss nicht auch noch schreien.

**Anschnitt**
* Ganzes Objekt statt Kopf allein, wo es die Form hergibt. Ein ganzer Vogel
  wirkt erwachsener als ein abgeschnittener Vogelkopf.

## 4. Umfang

Nicht 83 auf einmal. **24 Motive** als erster Satz, ausgewaehlt nach dem, was
real am haeufigsten gewaehlt wurde (steht in den Spiel-Daten, laesst sich
auszaehlen). Der Rest waechst nach, sobald die Rezeptur steht.

Gemischt aus Wesen und Dingen, damit Teams auch Nicht-Tiere waehlen koennen.
Dinge brauchen dann konsequent **kein** Gesicht.

## 5. Produktion: wie 24 Motive in EINEM Stil entstehen

Handzeichnen ist hier der schlechteste Weg, weil Konsistenz die eigentliche
Schwierigkeit ist, nicht das einzelne Motiv.

**Weg A, empfohlen: ein 3D-Aufbau, viele Modelle.** In Blender einmal Licht,
Material und Kamera festnageln, dann nur die Modelle tauschen und alles mit
demselben Aufbau rendern. Konsistenz ist dadurch garantiert statt erhofft, und
Nachrendern in anderer Groesse oder Pose kostet nichts. Braucht 3D-Kenntnisse
oder jemanden, der sie hat.

**Weg B: Bildmodell mit fester Rezeptur.** Ein Referenzbild plus wortgleicher
Prompt-Baustein fuer Material, Licht, Kamera und Gesichtsregeln, pro Motiv nur
das Motiv-Wort tauschen. Kommt nahe heran, driftet aber ueber viele Motive und
braucht Nacharbeit beim Freistellen. Fuer 24 Stueck machbar.

**Weg C: fertigen 3D-Icon-Satz lizenzieren** und umfaerben. Schnell und
konsistent, aber es ist dann nicht deins.

## 6. Reaktionen (Wolf-Entscheidung: erst der billige Weg)

Kein eigener Satz pro Emotion. Getrennt wird, was sich aendert, von dem, was
bleibt:

* **Pro Motiv:** ein Grundbild, optional ein zweites fuer den Blinzel-Ruck
  (Mechanik existiert bereits, siehe `cozy3dBlinkSrc`).
* **Gemeinsam fuer alle Motive:** eine Handvoll Auflagen (Arme hoch, Ausruf,
  Schweisstropfen, Krone). Fuenf Bilder fuer den ganzen Pool statt fuenf je Motiv.
* **Bewegung aus CSS.** Das Projekt hat ueber 300 Keyframes und keine
  Animationsbibliothek. Vorbeugen ist ein Verschieben, Jubeln ein Huepfen,
  Zusammensacken ein Stauchen. Reaktionen kosten so keine einzige neue Zeichnung.

Rive (Figuren mit echten Zustaenden, eine Datei statt vieler Bilder) bleibt der
moegliche Schritt danach. Es waere die erste Animationsbibliothek im Projekt,
rund 200 KB Laufzeit. Erst wenn der billige Weg nachweislich nicht reicht.

## 7. Formate: NICHT pro Position ein eigenes Bild

Gemessen (`scripts/measure-avatar-sizes.mjs`) erscheinen die Marken in
108x92, 92x92, 68x55, 48x48, 44x44 und 32x26 Bildschirmpunkten.

* **Groesse** ist kein Zeichenproblem. Ein 512er Bild deckt alle ab.
* **Seitenverhaeltnis** teilweise: das Quadrat und das liegende Format wollen
  unterschiedliche Anordnung. Das sind **zwei** Fassungen, nicht sechs. Alles
  andere loesen Beschnitt und Maske in der App.

## 8. Lieferung

* `frontend/public/avatars/<setId>/<slug>.png` (plus `-blink.png`, optional)
* 512x512, transparent, Motiv fuellt ~80 Prozent, optisch gleiche Gewichtung
* danach die vorhandene Komprimierung (`optimize-avatars.js`)
* Registrierung: ein Eintrag in `frontend/src/avatarSets.ts`

## 9. Pruefung vor dem Einbau

1. **Die Reihen-Probe.** Alle 24 nebeneinander in einer Reihe ansehen. Faellt
   eines aus der Reihe (anderes Licht, andere Saettigung, anderes Gewicht), ist
   es das Motiv, das den ganzen Satz billig aussehen laesst. Ein Ausreisser
   kostet mehr als drei mittelmaessige Motive.
2. `node scripts/avatar-contact-sheet.mjs` um den neuen Satz erweitern.
3. Am echten Beamer, nicht im Nachbau.
