# Uebergabe Design: Stand 2026-08-22

> Ergebnis einer langen Sitzung mit Wolf. Dieses Dokument ist der Einstieg fuer
> die naechste Sitzung. Ziel laut Wolf: **`/beamer` wird gebaut, `/team` zieht
> danach nach.**
>
> Tiefer im Detail: `docs/BUEHNEN_DESIGN.md` (Regeln), `docs/MOTION_REFERENZEN.md`
> (Bewegung und Referenzen). Bilder in `design-assets/buehnen-design/`.
>
> **Fuer Gestaltungsarbeit ausserhalb des Repos** (Claude Design, Figma, fremde
> Sitzung): `docs/DESIGN_BRIEF_CANVAS.md`. Selbsttragend, setzt kein Repo-Wissen
> voraus.

---

## 1. Der Auftrag, in einem Satz

Ein Design fuer eine **Live-Quiz-Show auf einer Projektion**, das erwachsen
wirkt, nicht wie eine Handy-App, und das zwanzig Fragen am Abend traegt, ohne zu
ermueden. Losgeloest von CozyWolf als Look.

---

## 2. Die vier Randbedingungen, an denen alles gemessen wird

Sie sind der Grund, warum die meisten Vorbilder nicht taugen.

1. **Projektion in einem dunklen Raum**, 2.8m Bildbreite, gelesen aus ~10m.
   Helle Vollflaechen blenden koerperlich, feine Details zerfallen.
2. **Keine Bedienung an der Wand.** Getippt wird auf dem Handy. Die Buehne ist
   Anzeige, kein Bedienteil. Deshalb darf dort viel mehr wandern als in einer
   normalen App.
3. **Zwanzig Wiederholungen pro Abend.** Was beim ersten Mal grossartig ist, ist
   beim zwanzigsten anstrengend.
4. **Keine Animationsbibliothek.** ~335 CSS-Keyframes, kein GSAP, kein Framer
   Motion. Effekte, die eine Bibliothek brauchen, sind eine
   Abhaengigkeits-Entscheidung.

---

## 3. Das Messwerkzeug (statt Meinung)

```bash
node scripts/beamer-tauglichkeit.mjs <bild.png> <x,y,w,h des ANTWORTbereichs>
```

* **Lichtabgabe** unter 12 Prozent. Ueber 22 Prozent blendet es.
* **Antworten aus 10m** ab 4.5:1. Gemessen wird der Antwortbereich, nicht die
  Frage: die Frage ist ueberall gross, leise werden Entwuerfe bei den Antworten.

Das Werkzeug hat in dieser Sitzung **fuenf Mal** etwas kassiert, das gut aussah:
die Riso-Variante (47 Prozent), ein weisses Antwortband (31.6), acht grosse
Farbkacheln in der Lobby (16.0), eine helle Bernstein-Leinwand (16.5), ein
Orangefeld (20.5). Alle fuenf haetten einen Kritiker-Durchgang bestanden.

**Regel daraus:** grosse helle Flaechen sind erlaubt, sie duerfen nur nicht
**weiss** sein. Dasselbe Band in Kategoriefarbe kostete 11.9 statt 31.6 Prozent
bei gleicher Lesbarkeit.

---

## 4. Was inhaltlich entschieden ist

* **Die Schrift fuehrt.** Wolfs Favoriten aus zehn Richtungen waren zweimal
  dasselbe Prinzip: Schrift ist das Design, kein Dekor. Einmal leise (Swiss),
  einmal laut (Plakat).
* **Drittel-Regel:** oberes Drittel Frage, unteres Drittel Mechanik, Mitte Luft.
  Ausnahme, die die Mechanik erzwingt: CHEESE und Pin It, dort ist das Bild
  beziehungsweise die Karte der Inhalt.
* **Kategorien sind Mechaniken, nicht Themen.** Das Layout folgt aus der Regel:
  MUCHO vier Optionen, ZEHN_VON_ZEHN drei Optionen plus Einsaetze (Setztisch),
  SCHAETZCHEN Zahl mit Einheit (Achse), BUNTE_TUETE ein Rahmen fuer sechs aktive
  Unterspiele, CHEESE Bild.
* **Aktive Bunte-Tuete-Unterspiele** (Wolf 2026-08-22): Heisse Kartoffel (nicht
  in Arena), Top 5, Umfrage (nur Arena), Schwarmintelligenz (nur Arena), Fix It,
  Pin It. Imposter, 4 gewinnt und Bluff sind deaktiviert.
* **Team-Marken sind eckig.** Kachel als Grundform, Wimpel mit Spitze nur dort,
  wo die Marke auf einen Wert zeigt (Achse, Karte). Der Kreis faellt weg, er war
  die weiche App-Form.
* **Rotation ist erlaubt** (fuenf Layouts fuer MUCHO), weil auf dem Handy getippt
  wird. Einzige Grenze: A, B, C, D immer in derselben Lesereihenfolge.
* **Das Handy ist die Fernbedienung, nicht die Show.** Gegenprobe gemacht: ein
  Entwurf aus den Regeln, ohne die bestehende Seite anzusehen, kam Wolfs
  jetziger Variante sehr nahe. **Kein Redesign von `/team` noetig.** Zusaetzlich
  geprueft: die Korrektheit wird erst bei `QUESTION_REVEAL` ausgewertet, das
  Handy spoilert also nicht vor der Wand.

---

## 5. Bewegung: die Lautstaerke-Treppe

Vier ausgewertete Referenzvideos ergaben vier eigenstaendige Mechaniken. Alle
tragen dasselbe Prinzip: **etwas bleibt stehen, waehrend sich der Rest aendert.**

| Anlass | pro Abend | Uebergang | Quelle |
|---|---|---|---|
| Frage zu Frage | ~20 | Grundblende, leise | Twitch Turbo |
| Frage zu Aufloesung | ~20 | Bogen-Wisch, mittel | NODECK |
| Rundenwechsel | ~5 | Durchskalieren, laut | Superplay |
| Kategorie-Intro | ~5 | Kreisbahn um einen Anker | mana |

**Je haeufiger, desto leiser.** Details und Bausteinliste B1 bis B11 in
`docs/MOTION_REFERENZEN.md`.

---

## 6. Die fuenf Style-Vorlagen, die Wolf geschickt hat

Structured (Galerie, Putty), Duolingo (weiss, gruen), Discord (dunkel, Blurple),
Apple (weiss, ein Blau), Hungry Tiger (Rost, Gold).

**Worin alle fuenf uebereinstimmen** (das ist mehr wert als jede einzelne):

1. Eine eigene Akzentfarbe, alles andere neutral.
2. Display-Schrift traegt die Marke, Fliesstext bleibt klein und ruhig.
3. **Flach. Keine Schatten, keine Verlaeufe.** Fuenf von fuenf.
4. Laufweite wird enger je groesser der Grad, Zeilenabstand staucht sich.
5. Tiefe entsteht aus einer **Flaechenleiter** (drei Stufen), nicht aus Elevation.

**Korrektur an meiner eigenen frueheren Arbeit:** ich hatte mit Lichtkante oben
und weichem Schatten gearbeitet („Tiefe aus Licht"). Fuenf von fuenf Vorlagen
sagen flach. Die Beweislage ist einseitig, flach gewinnt.

**Was strukturell am besten passt: Discord.** Dunkle Umgebung als Pflicht, eine
eigene Farbe, und vor allem: *„section identity comes from card background
colour, not from the page background."* Gemessen kostet beides gleich viel Licht
(3.5 gegen 3.6 Prozent), die Wahl ist also gestalterisch, nicht technisch.

**Was nicht passt:** Putty und weisse Leinwaende (blenden), Duolingos Gruen als
Bedeutungstraeger (kollidiert mit den Teamfarben), Haarlinien auf hellem Grund
(aus 10m unsichtbar).

---

## 7. Entwuerfe, die vorliegen

Alle in `design-assets/buehnen-design/entwuerfe-2026-08-22/`.

**Fuenf Welten** (`welten-uebersicht.webp`, je zwei Screens): unterscheiden sich
darin, **wo die Kategoriefarbe lebt**. A Ember (die Leinwand ist die Kategorie),
B Signal (konstante Buehne, Kategorie als Kante), C Folio (Papier invertiert,
Kategorie nur als Marke), D Studio (fast keine Oberflaeche), E Arcade (laut,
rund, Farbe als Energie).

Wolfs Kritik daran war berechtigt: **sie sahen sich zu aehnlich.** Ursachen,
benannt damit sie nicht wiederkehren: nur drei Schriften lokal verfuegbar, und
alle fuenf haben dasselbe Skelett geerbt (Label links oben, Zeit rechts oben,
Frage links, Antworten als Zeile unten). Ausserdem hatte ich meine eigene
Messregel zur Gestaltungsregel gemacht: aus „darf nicht blenden" wurde
„einfarbige dunkle Flaeche".

**Fuenf Kompositionen** (`komposition-uebersicht.webp`), danach gebaut, die sich
im **Aufbau** unterscheiden statt in der Farbe, mit acht Schriften:
1 Schnitt (zwei Felder, diagonale Kante, Schrift laeuft ueber die Grenze),
2 Zentrum (radial, Frage im Ring, Antworten an den Himmelsrichtungen),
3 Tafel (die Antworten sind das Bild, vier Farbbaender),
4 Feld (gerechnete Textur als Grund, Schrift ausgestanzt),
5 Gitter (die Struktur ist sichtbar, Inhalt sitzt in Zellen).

**Serifen-Probe** (`serifprobe-*.webp`): Serife fuer Momente (Willkommen,
Kategoriename, das eine Wort in der Aufloesung), Grotesk fuer Arbeit (Frage,
Antworten). Kommt aus Structured und traegt.

---

## 8. Was aus den Vorlagen NOCH NICHT geholt ist

Ehrliche Luecke, von mir selbst gefunden. Das ist die naechste Arbeit.

* **Schrift groesser als das Bild**, an den Raendern beschnitten (Structured
  faehrt 374px). Mein Maximum war 178px.
* **Etwas, das aus dem Rahmen bricht** (Discords Figuren ueberlappen Kartenkanten).
* **Verlaufsflaechen** je Abschnitt statt flacher Farbe (Discord).
* **Eine Farbe, die eine Bedeutung traegt** statt nur eine Identitaet (Duolingo:
  gruen heisst richtig). Fuer ein Quiz naheliegend.
* **Aufkleber-Sprache** mit dicken Konturen und Pillen (Duolingo).
* **Ein Bild als Inhalt**, nicht als Textur (Apple).
* **Wasserzeichen-Ebene**, die erst sichtbar wird, wenn das Auge sich setzt
  (Hungry Tiger). Ideal fuer die Lobby, die fuenfzehn Minuten laeuft.
* **Eine einzige Schrift fuer alles** als Signatur (Hungry Tiger). Ich habe
  jedes Mal zwei benutzt, also das Gegenteil.
* **Gepunktete Linien** als Rhythmus (Hungry Tiger).
* **Sequenzmittel**: harte Schnitte zwischen hell und dunkel ueber
  aufeinanderfolgende Screens. Ich habe durchgehend Einzelbilder entworfen,
  deshalb sind mir die Mittel entgangen, die erst ueber eine Folge wirken.

---

## 9. Reihenfolge fuer die naechste Sitzung

Wolf: **`/beamer` starten, `/team` nachziehen.**

1. **Zweite Serie Kompositionen** mit den fehlenden Mitteln aus Abschnitt 8.
   Danach sortiert Wolf, und die Richtung steht.
2. **Schrift entscheiden.** Groesster Einzelhebel, bisher alles Platzhalter.
   Empfehlung als Struktur: eine Grotesk fuer Frage und Antworten, optional eine
   Serife nur fuer Momente.
3. **Farbsystem entscheiden:** traegt die Leinwand die Kategorie, eine Flaeche
   darin, oder nur eine Marke. Gemessen sind alle drei gleichwertig.
4. **Ersten Bewegungs-Baustein einbauen:** B1 (Bogen-Wisch) plus B5 (Marker
   statt Einfaerbung) an der Aufloesung, gegen den Ist-Zustand stellen.
5. **`/team` erst danach**, und dann nur in Einzelheiten (Trefferflaechen,
   Lesbarkeit im Halbdunkel), nicht im Aufbau.

---

## 10. Offene Entscheidungen, die nur Wolf treffen kann

* **Markenarchitektur.** Ablösung von CozyWolf als Look, Produkte unter einer
  Dachmarke. Der Wolf steckt in mindestens acht Komponenten und laeuft im
  Progress Tree; dort ist er **Funktion** (Anker) und kann bleiben, dekorativ
  ist er **Marke** und faellt weg. Details in `docs/MOTION_REFERENZEN.md`.
* **Pink `#EC4899`** steht in `CREATIVE_DIRECTION.md` als nicht verhandelbar,
  stammt aber aus CozyWolf. Nicht eigenmaechtig aendern.
* **Kategoriefarben** sind laut Wolf anpassbar. Die heutigen Werte sind
  Tailwind-Standard und wirken beliebig. Vorschlag zum Nachziehen in
  `docs/BUEHNEN_DESIGN.md` Abschnitt 6.

---

## 11. Werkzeugkette (spart bei jedem Container-Reset eine halbe Stunde)

Der Container wurde in dieser Sitzung **dreimal** zurueckgesetzt. `.shots/` ist
gitignored, deshalb liegen alle Ergebnisse als WebP unter `design-assets/`.

* **Websites lassen sich nicht oeffnen**, der Egress-Proxy blockt fast alles.
  Wolf liefert Video oder Screenshots.
* **Videos brauchen einen eigenen ffmpeg**, der aus dem Playwright-Paket kann
  kein H.264, dessen Chromium auch nicht:
  `npm install @ffmpeg-installer/ffmpeg`
* **Schriften** kommen ueber `curl` von Google Fonts und werden lokal
  verdrahtet, der Browser hier laedt sie nicht selbst. Rezept in
  `docs/MOTION_REFERENZEN.md`. **Ohne echte Schriftauswahl sehen alle Entwuerfe
  gleich aus, das war der Hauptfehler der ersten Serie.**
* **Rendern** mit Playwright auf 1760x990, dann messen.
