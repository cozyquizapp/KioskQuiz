# Fuenf Avatare neu ausleiten (2026-08-27)

Wolf: „schreib mir prompts für die 5 neuen exporte einfach als text chatgpt
weiß wie zu bauen, nur was".

Alle Farben unten sind aus den vorhandenen Dateien **gemessen**
(Haeufigkeitsverteilung ueber die deckenden Pixel), nicht geschaetzt. Damit
passen die Neuen zu den 43 heilen Motiven.

Der Fehler ist bei allen fuenf derselbe wie beim Wecker: eine Flaeche, durch
die der Grund scheinen muesste, ist mit deckenden Pixeln gefuellt. Deshalb
steht bei jedem Motiv ausdruecklich dabei, WO das Loch sein muss.

---

## Zum Voranstellen (gilt fuer alle fuenf)

```
Einzelnes 3D-Objekt im weichen Knet-/Ton-Look, matte Oberflaeche, runde
Kanten, ruhiges Licht von oben links, leichte Eigenschattierung am Objekt.
Kein Boden, kein Schlagschatten, keine Kachel, kein Rahmen, kein Text.

Quadratisch 1024 x 1024, Objekt mittig, etwas Luft zum Rand.
PNG mit ECHTEM Alphakanal. Der Hintergrund muss durchsichtig sein, nicht
weiss und nicht als Karo-Muster gemalt. Auch jede Oeffnung INNERHALB des
Objekts muss durchsichtig sein.
```

---

## 1. Heissluftballon

```
Heissluftballon von der Seite. Huelle als Kugel mit senkrechten Bahnen im
Wechsel Rot (#F03030) und Creme (#FFF0D8), oben eine kleine orange Kappe.
Darunter ein geflochtener Korb in Karamellbraun. Vier gedrehte Seile in
demselben Braun verbinden die Huelle mit dem Korb.

WICHTIG: Der Raum ZWISCHEN den vier Seilen, also unter der Huelle und ueber
dem Korb, ist offene Luft und muss vollstaendig durchsichtig sein. Dort steht
in der alten Fassung eine weisse Flaeche.
```

## 2. Zimmerpflanze

```
Kleine Zimmerpflanze im Topf. Topf aus cremefarbener Keramik (#F0D8A8) mit
feinen Sprenkeln, darunter ein flacher Terrakotta-Untersetzer. Dunkle Erde.
Ein aufrechter gruener Stiel (#78A800) mit paarweise gegenstaendigen, dicken,
ovalen Blaettern, Geldbaum-artig.

WICHTIG: Die Zwischenraeume zwischen Stiel und Blaettern sind offen und
muessen durchsichtig sein. Dort steht in der alten Fassung eine weisse
Flaeche.
```

## 3. Rucksack

```
Wanderrucksack von vorne. Korpus aus warmem Braun (#A84818) mit dunkleren
Partien, zwei olivgruene Riemen mit Messingschnallen ueber der Vorderklappe,
eine aufgesetzte Tasche, oben eine Rolle. Am oberen Rand ein gebogener
Tragegriff.

WICHTIG: Die Oeffnung UNTER dem Tragegriff, zwischen Griff und Rucksack, ist
ein echtes Loch und muss durchsichtig sein. Dort steht in der alten Fassung
eine weisse Flaeche.
```

## 4. Ringplanet

```
Planet mit Ring, leicht schraeg von der Seite. Kugel in warmem Orange
(#D87818) mit weichen waagerechten Baendern. Ein flacher, breiter Ring in
hellem Gelb (#FFD890) liegt geneigt um die Kugel und laeuft vorne davor und
hinten dahinter durch.

WICHTIG: Die beiden sichelfoermigen Zwischenraeume zwischen Ring und Kugel
sind offen und muessen durchsichtig sein. Dort steht in der alten Fassung
eine weisse Flaeche.
```

## 5. Discokugel

```
Discokugel, haengend. Kugel aus vielen kleinen quadratischen Spiegel-
facetten in Blau- und Silbertoenen (#607890, #A8A8C0, #C0C0C0), oben eine
kleine silberne Aufhaengeoese.

WICHTIG: Hier ist der Fehler umgekehrt. Die Kugel ist eine GESCHLOSSENE
Flaeche, sie darf keine Loecher haben. In der alten Fassung fehlen zwoelf
Stuecke mitten im Ball, das groesste rund 11 000 Pixel. Nur INNERHALB der
Aufhaengeoese soll der Hintergrund durchscheinen.
```

---

## Zweite Runde: noch zwei (2026-08-27 abends)

Wolf hat das Gaensebluemchen auf einer pinken Kachel gefunden. Aus fuenf
Blaettern sind Stuecke **herausgebissen**, bei der Wolke oben rechts dasselbe.
Gleiche Ursache wie bei der alten Discokugel: **weisses Objekt auf weissem
Grund**, die Hintergrundentfernung kann beides nicht trennen und frisst mit.

⚠️ Mein Werkzeug findet das NICHT, und ich habe zweimal vergeblich versucht,
einen Messwert dafuer zu bauen:
* Die Bisse beruehren den Aussenrand, sind also keine Innenloecher.
* „Harte Kante" trennt auch nicht: gemessen liegen Gaensebluemchen (60 %) und
  Wolke (57 %) UNTER dem Durchschnitt, weil der ganze Satz freigestellt ist und
  damit jede Kante hart ist.

Die einzige verlaessliche Kontrolle bleibt das Blatt auf einem gesaettigten
Grund. Gefaehrdet sind die HELLEN Motive.

### 6. Gaensebluemchen

```
Gaensebluemchen von vorne. Acht bis neun cremeweisse (#FFF6E8), dicke, runde
Blaetter um eine gewoelbte gelbe Mitte (#F2B705) mit feiner Koernung. Darunter
ein gruener Stiel mit zwei ovalen Blaettern.

WICHTIG: Die Blaetter sind VOLLSTAENDIG. In der alten Fassung fehlen aus fuenf
Blaettern unregelmaessige Stuecke, als waeren sie herausgebissen - dort scheint
der Hintergrund durch, wo Blatt sein muesste. Die Silhouette darf keine
Ausbrueche haben.
```

### 7. Wolke

```
Wolke von vorne, aus mehreren weichen, runden Ballen zusammengesetzt, cremeweiss
(#FFF6E8) mit sanfter Schattierung.

WICHTIG: Die Aussenkante ist durchgehend rund und geschlossen. In der alten
Fassung fehlen oben rechts zwei unregelmaessige Stuecke.
```

Dateinamen: `nature--daisy.png`, `nature--cloud.png`.

---

## Danach

```bash
node scripts/avatare-loecher.mjs      # prueft beide Fehlerarten
node scripts/avatare-auf-grund.mjs    # alle 48 auf sechs Gruenden ansehen
```

Die Dateien bitte genau so benennen wie im Satz (nachgesehen, nicht geraten):

```
adventure--hot-air-balloon.png
cozy-home--houseplant.png
adventure--backpack.png
magic-curious--ringed-planet.png
magic-curious--disco-ball.png
```
