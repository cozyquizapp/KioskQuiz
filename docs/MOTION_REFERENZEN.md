# Motion-Referenzen: Bausteine fuer das Premium-Design

> Angelegt 2026-08-18. Wolf sammelt Websites, deren Bewegung ihn ueberzeugt.
> Hier steht, was daran technisch wirklich passiert, was davon auf CozyQuiz
> uebertragbar ist und was bewusst nicht.

## So startet die naechste Sitzung

Wolf sagt sinngemaess: **„zeig mir, wie unsere App mit den Features aussehen
koennte"**, und dann werden aus der Bausteinliste unten einzelne Elemente
gewaehlt und an der echten App gebaut. Nicht alles auf einmal, nicht als
Gesamtumbau.

Reihenfolge, die sich bewaehrt hat: erst Baustein waehlen, dann an EINER Stelle
prototypisch bauen, dann gegen den heutigen Stand stellen und ansehen. Erst
danach entscheiden, ob es bleibt.

Neue Referenzen kommen als Video oder Screenshot. Ablauf zum Auswerten steht im
naechsten Abschnitt.

---

## Werkzeugkette (kostet sonst jedes Mal eine halbe Stunde)

**Websites lassen sich in dieser Umgebung nicht oeffnen.** Der Egress-Proxy
blockt fast alle Domains, `WebFetch` und `curl` scheitern beide mit 403.
Erreichbar sind unter anderem `fonts.googleapis.com` und `registry.npmjs.org`.
Wolf muss also Video oder Screenshots liefern.

**Videos brauchen einen eigenen ffmpeg.** Der ffmpeg aus dem Playwright-Paket
(`/opt/pw-browsers/ffmpeg-*/ffmpeg-linux`) ist ein Minimalbau ohne H.264 und
scheitert an MP4. Chromium aus Playwright kann H.264 ebenfalls nicht abspielen
(`MEDIA_ERR_SRC_NOT_SUPPORTED`). Loesung, funktioniert:

```bash
cd <scratchpad> && npm init -y && npm install @ffmpeg-installer/ffmpeg
FF=<scratchpad>/node_modules/@ffmpeg-installer/linux-x64/ffmpeg
```

**Auswertung in zwei Schritten.** Erst der Gesamtverlauf, dann die Zeitlupe auf
den interessanten Moment:

```bash
# 1) Kontaktbogen ueber das ganze Video, 2 Bilder je Sekunde
$FF -y -i video.mp4 -vf "fps=2,scale=460:-1,tile=7x4" -frames:v 1 bogen.png

# 2) Zeitlupe auf einen Uebergang, 10 Bilder je Sekunde
$FF -y -ss 4.6 -t 1.6 -i video.mp4 -vf "fps=10,scale=560:-1,tile=4x4" -frames:v 1 wisch.png
```

Farben werden aus Einzelbildern gemessen, nicht geschaetzt: Frame mit
`-ss <t> -frames:v 1` ziehen und mit sharp Pixel auslesen.

**Fuer laufende Websites** (wenn Wolf am eigenen Rechner ist) gibt es ein
Console-Snippet, das Bibliotheken, laufende Animationen mit Dauer und Kurve,
Transitions, Keyframes und Canvas-Nutzung einsammelt und in die Zwischenablage
legt. Es steht im Sitzungsverlauf vom 2026-08-18; wichtig ist nur, es
**waehrend** der Bewegung abzuschicken, weil `document.getAnimations()` nur
zeigt, was gerade laeuft.

---

## Randbedingungen, an denen jede Referenz gefiltert wird

Diese vier Punkte entscheiden, ob ein Effekt uebernommen werden kann. Sie sind
der Grund, warum „sieht geil aus" nicht reicht.

1. **Kein Scrollen.** Beide bisherigen Referenzen sind scroll-getrieben. Der
   Beamer hat kein Scrollen und keine Eingabe, die Zeitachse steuert Wolf per
   Socket-Event. Jede Bewegung muss auf zeit- und ereignisgesteuert uebersetzt
   werden. Das ist eher einfacher als schwerer.
2. **Keine Animationsbibliothek.** Das Projekt hat rund 335 CSS-Keyframes und
   bewusst kein GSAP, kein anime.js, kein Framer Motion. Ein Effekt, der eine
   Bibliothek braucht, ist eine Abhaengigkeits-Entscheidung und keine
   Geschmacksfrage.
3. **Zwanzig Wiederholungen statt einer.** Eine Marketingseite wird einmal
   besucht. Ein Quizabend zeigt denselben Uebergang zwanzig Mal. Was beim ersten
   Mal grossartig ist, ist beim zwanzigsten anstrengend. **Mechanismus
   uebernehmen, Amplitude senken** ist fast immer die richtige Antwort.
4. **Projektion in einem dunklen Raum.** Satte Vollflaechen und sehr helle
   Grundtoene blenden auf 2,8 Meter Bildbreite koerperlich. Feine Koernung
   zerfaellt aus zehn Metern zu Griess. Beides funktioniert am Laptop und nicht
   an der Wand.

---

## Referenz 1: superplay.co

Bilder: `superplay-bogen.webp`, `superplay-uebergang-skalieren.webp`,
`superplay-objektfeld.webp`

Karriereseite eines Spielestudios. Sehr laut, sehr selbstbewusst, scroll-getrieben.

### Was technisch passiert

**Der Uebergang dauert rund eine Sekunde.** Die alte Ueberschrift skaliert
massiv auf, ungefaehr aus der Bildmitte, und laeuft weit ueber den Rand hinaus.
Waehrend sie waechst, faerbt sie sich zur Hintergrundfarbe hin ein, von Weiss
ueber blasses Rosa, bis sie im Grund verschwindet. Sie blendet nicht aus, sie
**loest sich im Hintergrund auf**.

Die neue Ueberschrift liegt die ganze Zeit **schon dahinter**, in Endgroesse und
Endposition. Sie bewegt sich nicht, sie wird nur freigelegt.

**Folge, und das ist der Kern: es gibt nie ein leeres Bild, und der neue Inhalt
kommt nie an.** Genau das Gegenteil vom heutigen CozyQuiz-Wechsel, wo zwischen
Frage und Aufloesung bis zu 250ms Schwarz liegen und die neue Szene dann als
Block aufblendet (Wolf 2026-07-17: „wie PowerPoint").

**Durchlaufendes Objektfeld.** Muenzen, Wuerfel und Fotokarten driften permanent
in verschiedenen Geschwindigkeiten und ignorieren die Abschnittsgrenze
vollstaendig. Sie sind der Faden, der aus Einzelbildern einen zusammenhaengenden
Raum macht.

**Farbe.** Je Abschnitt eine satte Vollflaeche, kein Verlauf, keine Textur.
Gemessen: Magenta `#D40064`, Violett `#A017F7`, Gelb `#FADC0A`, Muenzgold
`#F6BF30`.

### Uebertragbar

* Durchskalieren mit Aufloesen im Grund. Das ist `transform: scale` plus
  Farbwechsel, reine CSS-Keyframes, keine neue Abhaengigkeit.
* Das durchlaufende Objektfeld. Gluehwuermchen sind in der Bildsprache ohnehin
  angelegt (siehe CREATIVE_DIRECTION.md).
* Der Grundsatz „nie ein leeres Bild".

### Nicht uebernehmen

* Die Amplitude. Zehnfache Vergroesserung traegt keine zwanzig Runden.
* Die Vollflaechen in dieser Saettigung. Auf der Projektion blendet das.

---

## Referenz 2: nodeck.online

Bilder: `nodeck-bogen.webp`, `nodeck-wisch.webp`

Eine Beratungs-Website, gebaut als Praesentation. **Strukturell die bisher
naechste Verwandte:** Folge von Folien, unten PREV / NEXT und ein Folienzaehler,
also moderatorgesteuert wie ein Quiz. Was hier funktioniert, funktioniert
strukturell auch bei uns.

### Was technisch passiert

**Der Uebergang ist ein Wisch mit gebogener Kante.** Ein Band in der
Akzentfarbe (Neongelb) faehrt von unten nach oben durchs Bild, seine Vorderkante
ist ein flacher Bogen statt einer geraden Linie. Dauer rund 0,4 bis 0,5
Sekunden. Die naechste Folie liegt darunter und ist fertig, wenn das Band
durchgelaufen ist. Die Bogenform ist der ganze Trick: sie liest sich als
Stiftstrich, nicht als Rechteck.

**Danach baut sich der Titel Buchstabe fuer Buchstabe auf**, sichtbar an
Zwischenstaenden wie „THE PROBLE…". Der Wisch bringt die Flaeche, die Schrift
kommt danach.

**Textaufbau im Fliesstext wortweise**, mit grauen Platzhaltern fuer die noch
nicht erschienenen Woerter, sodass das Layout nicht springt.

**Der Marker als durchgehendes Motiv.** Ein Textmarker liegt gekippt im Bild,
Schluesselwoerter im Fliesstext sind gelb markiert, und derselbe Gelbton macht
den Wisch. Ein Werkzeug, das die Uebergaenge, die Hervorhebung und die Deko
zugleich erklaert.

**Physische Requisiten:** Haftnotiz, Klebeband, Stift. Alle leicht gekippt, mit
Schatten. Dieselbe Sprache wie unser Avatar-Brief („mattes Objekt, leicht
gekippt, weicher Kontaktschatten").

### Uebertragbar, und zwar direkt

* **Der Bogen-Wisch als Phasenwechsel.** CSS, kein Zusatzpaket. Ersetzt den
  harten Schnitt.
* **Der Marker als Aufloesungs-Geste.** Die richtige Antwort wird nicht
  eingefaerbt, sie wird **markiert**. Das ist eine Handlung statt eines
  Zustands und passt zur Quiz-Dramaturgie.
* **Wortweiser Textaufbau mit Platzhaltern** fuer die Frage. Baut Spannung, ohne
  dass das Layout springt.
* Die Requisiten-Sprache deckt sich mit dem Avatar-Brief, hier waeren Oberflaeche
  und Avatarset zum ersten Mal aus derselben Quelle.

### Nicht uebernehmen

* Der Comic-Umriss an der Schrift (dicke weisse Kontur). Sehr laut, und die
  Marke ist woanders.
* Der cremefarbene Grund als Hauptflaeche. Auf der Projektion zu hell.

---

## Bausteinliste, aus der gewaehlt wird

Das ist die eigentliche Arbeitsliste fuer die naechsten Sitzungen.

| # | Baustein | Woher | Aufwand | Wo es zuerst hingehoert |
|---|---|---|---|---|
| B1 | Bogen-Wisch statt Schnitt beim Phasenwechsel | NODECK | klein | Frage nach Aufloesung |
| B2 | Nie ein leeres Bild: alte Szene geht sichtbar ab | Superplay | mittel | alle Szenenwechsel |
| B3 | Durchskalieren und im Grund aufloesen | Superplay | mittel | Runden-Intro, Progress Tree |
| B4 | Durchlaufendes Objektfeld ueber Szenengrenzen | Superplay | mittel | Buehne generell |
| B5 | Marker-Geste fuer die richtige Antwort | NODECK | klein | Aufloesung |
| B6 | Wortweiser Textaufbau mit Platzhaltern | NODECK | klein | Frageanzeige |
| B7 | Requisiten als Zustandstraeger (gekippt, Schatten) | NODECK | gross | zusammen mit dem Avatarset |

### Erster Kandidat, wenn nichts dagegen spricht

**B1 plus B5 an der Aufloesung.** Beide klein, beide ohne neue Abhaengigkeit,
beide an einer Stelle, die pro Abend zwanzig Mal laeuft und heute hart schneidet.
Gut messbar gegen den Ist-Zustand.

**Fuer den Progress Tree** ist B3 der passende Baustein.
`frontend/src/components/QQProgressTree.tsx` hat die Kamera bereits, samt Zoom
auf Runden-Cluster und Kategorie-Punkte, Spotlight-Sweep und dem Wolf auf der
Punktlinie. Was fehlt, ist die Uebergangsregel: beim Wechsel von der Uebersicht
in eine Runde soll die Uebersicht durch den Betrachter hindurch skalieren und im
Grund aufgehen, waehrend Wolf und Punktlinie ueber die Grenze hinweg stehen
bleiben. Aus einer Folge von Zustaenden wird ein Raum, durch den man faehrt.

---

## Offene Entscheidungen

* **Schrift.** Groesster Einzelhebel auf der Buehne und noch nicht entschieden.
  Die sechs Richtungsbilder vom 2026-08-18 nutzen Platzhalter.
* **Grundrichtung.** Sechs Haltungen wurden gebaut (Buehne und Licht, Editorial,
  Kino, Bar, Broadcast, Objekt), die Sortierung durch Wolf steht aus.
* **Avatarset.** Haengt bewusst hinter der Design-Grundlage. Gelernt am
  verworfenen Holz-Versuch: das Design dem Set hinterherzustreichen fuehrt in
  die Irre, beide muessen aus denselben Regeln entstehen.
