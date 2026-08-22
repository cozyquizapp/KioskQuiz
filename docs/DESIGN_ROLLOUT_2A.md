# Buehne 2a auf die ganze App ziehen

Stand 2026-08-22. Gemessen, nicht geschaetzt. Die Zahlen unten stammen aus
`grep` ueber `frontend/src`, die Kommandos stehen jeweils dabei.

---

## Die Ausgangslage, korrigiert

Ich hatte den Aufwand vorher zu hoch eingeschaetzt. Die Begruendung war
"Cozy liest keine Tokens". Das stimmt so nicht. Gemessen auf den 32
Buehnen-Dateien:

| | Anzahl |
|---|---|
| `var(--qq-…)` Lesezugriffe | **1097** |
| rohe Hex-Werte | 542 (davon 134 verschiedene) |
| rohe `rgba()`-Werte | 932 |
| `QQ_COLORS.*` | 141 |

Die Buehne ist also zu gut 40 Prozent bereits tokenisiert. Und, wichtiger:

**Der Buehnen-Scope haengt schon global.** `data-qq-stage="2a"` sitzt in
`QQBeamerPage.tsx:1941` auf dem Phase-Root, und der Phase-Root umschliesst
**alle** Phasen, nicht nur die Frage. Jede Ansicht, die heute
`--qq-card-radius`, `--qq-card-bg`, `--qq-card-border`, `--qq-card-shadow`
oder `--qq-surface-deep` liest, bekommt die 2a-Werte also bereits.

Was an der ersten Folie so lange gedauert hat, war nicht die Folie. Es war
der Bau genau dieses Mechanismus plus die Gestaltungsfragen, die einmal pro
System beantwortet werden und nicht pro Ansicht.

---

## Was wirklich noch zu tun ist

Drei Sorten Arbeit, die man nicht vermischen sollte, weil sie
unterschiedlich teuer sind und unterschiedlich viel Entscheidung von Wolf
brauchen.

### Sorte 1: die Werte, die an den Tokens vorbeigehen

1474 rohe Farbwerte auf der Buehne. Die klingen nach viel, sind aber keine
1474 Entscheidungen. Sie fallen in wenige Haufen:

| Haufen | Vorkommen | wird zu |
|---|---|---|
| Weiss und Hellgrau (`#FFF`, `#FFFFFF`, `#F8FAFC`, `#F1F5F9`, `#F4F6FF`) | ~87 | `var(--qq-text)`, das warme Creme |
| `rgba(0,0,0,x)` Schatten und Schleier | 302 | groesstenteils **weg**, 2a hat keine Schatten auf der Buehne |
| `rgba(255,255,255,x)` Haarlinien und Glas | 141 | `var(--qq-hairline)` |
| Markenpink (`#EC4899`, `#FF2D7B`, `#FDE6F0`, `#FBCFE8`, dazu die rgba-Formen) | ~150 | `var(--qq-stage-accent)`, also die Kategoriefarbe |
| Alter Grund `#0A0814` | 39 | `#120F18` |
| Kaltes Slate (`#94A3B8`, `#CBD5E1`, `#334155`, `#475569`) | ~90 | `var(--qq-text-muted)`, warm statt blaugrau |

Das sind sechs Entscheidungen fuer rund 800 der 1474 Werte. Der Rest ist ein
langer Schwanz aus Einzelfaellen: Verlaufsstopps, Glows, Partikelfarben.
Die gehoeren teils bewusst zur jeweiligen Ansicht und bleiben.

Zwei davon brauchen wirklich deine Entscheidung, der Rest ist Mechanik:

* **Das Markenpink.** Es steckt an ~150 Stellen auf der Buehne. 2a ersetzt
  den festen Marken-Akzent durch die Kategoriefarbe. Die Frage ist, ob Pink
  irgendwo bewusst bleiben soll, zum Beispiel in der Lobby und auf der
  Danke-Folie, wo es keine Kategorie gibt.
* **Die Schatten.** 302 Vorkommen. 2a sagt: keine. Auf der Projektion malt ein
  Schatten einen grauen Rand, kein Volumen. Ich wuerde sie ersatzlos
  streichen, aber das aendert das Bild spuerbar.

### Sorte 2: die Gestalt pro Ansicht

Das ist die eigentliche Arbeit und die laesst sich nicht buendeln. Pro
Ansicht: Schriftgroessen, rahmenlose Karten, die Zeitleiste oben, Abstaende,
und die Frage, was auf der Folie ueberhaupt noch stehen muss. Genau das habe
ich fuer die Mu-Cho-Frage gemacht.

### Sorte 3: die Motion

Die vier Uebergaenge aus der Uebergabe (Grundblende 450, Bogen-Wisch 460,
Durchskalieren 1000, Kreisbahn 1000) und die zwei Buehnen-Ebenen, die das
schwarze Bild von 250 ms zwischen zwei Folien verhindern. Das ist ein
eigener Block, der einmal gebaut wird und danach fuer alle Ansichten gilt.

---

## Reihenfolge

Nach Nutzen pro Aufwand sortiert. Die Gruppen sind so geschnitten, dass
innerhalb einer Gruppe dieselben Entscheidungen gelten.

### Block 0 · Fundament (einmalig, vor allem anderen)

Die sechs Haufen oben durchziehen und den Buehnen-Token-Satz in `main.css`
von 7 auf die rund 12 Werte erweitern, die die anderen Ansichten brauchen
(Akzent, Muted-Ink, Grund, Trennlinie, tiefe Flaeche, Pill-Radius).

Danach ist jede weitere Ansicht ein Bruchteil der ersten.

### Block 1 · Die Frage-Ansichten (der Rest der 15 Fragen des Abends)

`CozyQuizQuestionView.tsx` traegt Mu-Cho (fertig), Schaetzchen, 10 von 10,
Schau mal **und** die vier Bunte-Tuete-Spiele. Alles in einer Datei, 3465
Zeilen, aber die Huelle steht bereits. Dazu die Aufloesungen:
`SchaetzchenReveal`, `Top5Reveal`, `OrderReveal`, `CozyGuessrReveal`.

Das ist der groesste Nutzen: 15 von ungefaehr 20 Folien eines Abends sind
Fragen.

### Block 2 · Brett und Punktestand

`CozyQuizGridDisplay`, `CozyQuizPlacementView`, `CozyQuizScoreBar`. Die
Scoreleiste ist bereits vollstaendig tokenisiert (0 rohe Hex-Werte), das
Brett hat 10. Hier faellt auch die offene Entscheidung zur Kachelform:
Radius des Brettfeldes gegen Radius der Teammarke auf der Buehne.

### Block 3 · Der Rahmen des Abends

Lobby, Regeln, Team-Reveal, Phasen-Intro, Pause, Danke. Sechs Ansichten,
zusammen rund 7600 Zeilen und 148 rohe Hex-Werte. Hier steckt auch der
Wasserzeichen-Layer fuer die Lobby aus der Uebergabe.

### Block 4 · Das Finale

Final-Betting, Final-Reveal, Turm-Finale, Game Over, Connections, Stechen.
`CozyQuizFinalRevealView` ist mit 3979 Zeilen und 155 Farbwerten der
groesste Brocken der ganzen App.

### Block 5 · Das Handy

Eigener Block, weil die Regeln andere sind: mobil optimiert, aber dem
Design nachgezogen. Elf Dateien. Ein Teil ist bereits mitgelaufen, zum
Beispiel der Kategorie-Grund, der jetzt aus derselben Funktion kommt wie
auf der Buehne.

### Block 6 · Arena

`CozyQuizLargeGroupView`, `CrowdTopReveal`, `CrowdEstimateReveal`. Kommt im
normalen Abend nicht vor, deshalb zuletzt.

### Block 7 · Motion

Die vier Uebergaenge und die zwei Ebenen. Bewusst am Ende: Bewegung auf ein
Design zu legen, das sich noch aendert, ist doppelte Arbeit.

---

## Wie ich pruefe

Nicht am Nachbau. `scripts/beamer-shot.mjs` faehrt den echten Beamer, pro
Block ein Durchlauf mit Vorher-Nachher. Backend vorher neu starten, der Raum
lebt im RAM.

## Arbeitsvereinbarung

Jede Lieferung endet mit einem Bericht aus `git diff`, in drei Toepfen:
Beauftragt, Notwendig, Mein Vorschlag. Was in Topf 3 steht und nicht
bestaetigt wird, geht zurueck.
