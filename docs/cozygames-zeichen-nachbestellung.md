# CozyGames: die analogen Spiele und ihre Zeichen (2026-08-27)

Wolf: „ich brauche noch eine liste aller analogen cozygames, auch da brauchen
wir neue emojis, die moechte ich aber dieses mal super clean machen".

**15 aktive Spiele, 3 archivierte.** Quelle ist `COZY_GAME_V1_SEED` in
`shared/cozyGameTypes.ts`; Wolf kann sie ueber den `/cozygames`-Editor weiter
pflegen, deshalb ist die Datei die Vorlage und nicht die Wahrheit.

---

## ⚠️ KORREKTUR (2026-08-27, noch am selben Tag)

Hier stand: „12 von 15 sind heute rohe Systemzeichen". **Das war falsch, und der
Fehler war meiner.** Ich habe gegen die Emoji-Tabelle in `QQIcon.tsx` gemessen -
und die ist fuer CozyGames gar nicht der Weg. Die Spiele laufen ueber
`CozyGameIcon` (seit 2026-07-09), und das laedt `/icons/<id>.png` mit dem
OS-Zeichen nur als Rueckfall. Diese PNG lagen alle fuenfzehn da.

Merksatz fuer das naechste Mal: **erst den Aufloeser suchen, dann messen.** Zwei
Wege zum selben Zeichen, und ich habe den falschen geprueft.

Der zweite Befund unten stimmt weiter: die `emoji`-Felder im Katalog passen
inhaltlich oft nicht. Sie sind aber nur der Rueckfall, also weniger dringend.

**Erledigt:** Wolf hat am 2026-08-27 fuenfzehn neue Zeichen geliefert, sie liegen
unter `/icons/<katalog-id>.png`. Diese Liste bleibt als Nachschlagewerk stehen.

---

## Die `emoji`-Rueckfaelle passen oft nicht

Das ist kein Geschmack, das laesst sich Zeile fuer Zeile nachlesen.

| Zeichen | Spiel | was daran nicht stimmt |
|---|---|---|
| 🍭 | M&M-Strohhalm-Transport | Lutscher. Gespielt wird mit Linsen und Strohhalm. |
| 🛟 | Bierdeckel-Rettungsringe | Rettungsring. Gemeint sind Bierdeckel im Wasser. |
| 🪢 | Ringwurf auf Flaschenhals | Knoten. Gemeint ist ein Wurfring am Flaschenhals. |
| 🧷 | Waescheklammer in Glas | Sicherheitsnadel, keine Waescheklammer. |
| 🎯 | Gummi-Pyramide | Zielscheibe. Gespielt wird Becher abschiessen. |
| 🏓 | TT-Ball-Sammeln | Schlaeger. Gebraucht wird nur der Ball. |
| 🍡 | Marshmallow-Fang | Dango-Spiess. Gemeint sind Marshmallows. |

Und zweimal steht dasselbe Zeichen: 🪙 traegt sowohl den archivierten Muenzturm
als auch das Muenz-Schnippen.

---

## Die 15 aktiven Spiele

Reihenfolge wie im Katalog. „Tisch" oder „Steh" ist der Ort, an dem gespielt
wird; das steht im Datensatz und ist fuer die Moderation relevant.

### Mund und Atem

**1. Wattebausch-Pusten** · heute 🌬️ · Tisch
Wattebausch mit dem Strohhalm in eine Zielzone pusten. Anzahl in 60 s.
*Zeichen: ein Wattebausch und ein Strohhalm.*

**2. M&M-Strohhalm-Transport** · heute 🍭 · Tisch
Mit dem Strohhalm eine Schokolinse ansaugen, zum zweiten Teller tragen,
fallenlassen. Anzahl in 60 s.
*Zeichen: ein Strohhalm mit einer Linse an der Spitze.*

**3. Luftballon-Hochhalten** · heute 🎈 · Steh
Ballon nur durch Anpusten in der Luft halten, keine Haende. Laengste Zeit.
*Zeichen: ein Luftballon. Passt schon, nur im neuen Material.*

### Geschick am Tisch

**4. Muenz-Schnippen zur Kante** · heute 🪙 · Tisch
Muenze Richtung Tischkante schnippen, so nah wie moeglich, ohne dass sie
runterfaellt. Naechste Muenze gewinnt.
*Zeichen: eine Muenze an einer Tischkante. Nicht dasselbe wie eine blosse
Muenze, sonst steht es wieder doppelt.*

**5. Karten-Haus, drei Stockwerke** · heute 🃏 · Tisch
Schnellste Zeit fuer ein stabiles dreistoeckiges Kartenhaus.
*Zeichen: ein kleines Kartenhaus, nicht eine einzelne Karte.*

**6. Becher-Pyramide (Sport-Stacking)** · heute 🥤 · Tisch
Zehn Becher zur 3-2-1-Pyramide aufbauen und wieder abbauen. Schnellste Zeit.
*Zeichen: eine kleine Becherpyramide.*

**7. Bierdeckel-Rettungsringe** · heute 🛟 · Tisch
Bierdeckel schwimmen im Wasser, aus Distanz Muenzen darauf werfen. Treffer in
60 s.
*Zeichen: ein Bierdeckel mit einer Muenze darauf.*

**8. Staebchen-Eimer** · heute 🥢 · Tisch
Mit Essstaebchen Tischtennisbaelle aufnehmen und in einen Eimer befoerdern.
Treffer in 60 s.
*Zeichen: zwei Staebchen, die einen Ball halten.*

**9. Ringwurf auf den Flaschenhals** · heute 🪢 · Tisch
Wurfringe auf einen Flaschenhals werfen. Treffer in 60 s.
*Zeichen: ein Ring, der auf einem Flaschenhals sitzt.*

**10. Waescheklammer ins Glas** · heute 🧷 · Steh
Ueber dem Glas stehen, Klammer auf Brusthoehe halten, fallen lassen. Treffer in
60 s.
*Zeichen: eine Waescheklammer aus Holz ueber einem Glas.*

**11. Gummi-Pyramide** · heute 🎯 · Tisch
Eine Pappbecher-Pyramide mit Haushaltsgummis abschiessen. Umgefallene Becher in
60 s.
*Zeichen: ein gespanntes Gummi und ein kippender Becher.*

**12. TT-Ball-Sammeln** · heute 🏓 · Tisch
Ball hochwerfen, einen Spielstein aufnehmen, Ball fangen, dann zwei Steine, dann
drei. Beste Serie in 60 s.
*Zeichen: ein Tischtennisball mit ein, zwei Spielsteinen. Kein Schlaeger.*

### Schaetzen und Reaktion

**13. Mengen schaetzen** · heute 🫙 · Tisch
Ein gefuelltes Glas steht auf dem Tisch. Jedes Team schaetzt Menge, Gewicht oder
Volumen, der Moderator loest auf. Naechster Tipp gewinnt.
*Zeichen: ein Glas voller kleiner Dinge.*

**14. Stift-Fang** · heute ✏️ · Tisch
Einer haelt einen Stift senkrecht ueber der offenen Hand des Partners und laesst
ihn ohne Ansage fallen. Meiste Faenge in 60 s.
*Zeichen: ein fallender Stift ueber einer offenen Hand.*

**15. Marshmallow-Fang** · heute 🍡 · Steh
Einer wirft Marshmallows aus kurzer Distanz, der Partner faengt sie mit einem
Becher oder dem Mund. Meiste Faenge in 60 s.
*Zeichen: ein Marshmallow, das in einen Becher faellt.*

---

## Archiviert, nicht geloescht

Diese drei stehen weiter im Katalog, sind aber nicht mehr waehlbar. **Sie
brauchen kein neues Zeichen.**

* **Muenzturm einhaendig** (🪙) - 2026-07-09, Wolf: „Muenzturm bauen ist zu
  leicht". Ersetzt durch das Muenz-Schnippen.
* **Getraenk perfekt halbieren** (⚖️) - ersatzlos.
* **Genau in der Mitte teilen** (✂️) - ersetzt durch den Stift-Fang.

---

## Fuer die Ausleitung

Damit sie zum Rest passen, gilt dasselbe wie beim Team-Avatarsatz V5 und bei den
neuen Arena-Wappen von heute:

```
Einzelnes Objekt im weichen Knet-/Ton-Look, matte Oberflaeche, runde Kanten,
ruhiges Licht von oben links, leichte Eigenschattierung am Objekt.
Kein Boden, kein Schlagschatten, keine Kachel, kein Rahmen, kein Text.

Quadratisch 1024 x 1024, Objekt mittig, etwas Luft zum Rand.
PNG mit ECHTEM Alphakanal. Der Hintergrund muss durchsichtig sein, nicht weiss
und nicht als Karo-Muster gemalt. Auch jede Oeffnung INNERHALB des Objekts muss
durchsichtig sein.
```

⚠️ **Wo diese Zeichen stehen, ist der Grund dunkel** (Buehne) oder eine
Kategorie-Flaeche. Helle, cremefarbene Motive sind deshalb unkritisch - anders
als beim Avatarsatz, wo sie auf gesaettigten Teamkacheln sitzen. Trotzdem
danach einmal `node scripts/avatare-auf-grund.mjs` sinngemaess anwenden, also
das Blatt auf mehreren Gruenden ansehen.

**Dateinamen:** `cg-<id>.png` mit der ID aus der Tabelle oben, also
`cg-watt-puste.png`, `cg-mm-strohhalm.png` und so weiter. Dann laesst sich die
Zuordnung ohne eine einzige Tabelle bauen.

---

## Eingebaut am 2026-08-27

Fuenfzehn Zeichen, eins je aktivem Spiel. Originale unveraendert unter
`design-assets/cozygame-zeichen-original/`, von dort in EINEM Schritt auf 320 px
(Lanczos, PNG, RGBA) - die groesste Anzeige im Spiel ist `clamp(64px, 9cqw,
110px)`, auf einem 4K-Beamer also rund 240 echte Bildpunkte.

Kein Code geaendert: `CozyGameIcon` liest ohnehin `/icons/<id>.png`.

⚠️ **Sechs Dateinamen wichen von der Katalog-ID ab** und wurden beim Einbauen
umbenannt. Wer die Originale sucht, findet sie unter dem linken Namen:

```
cg-luftballon                -> cg-ballon-puste
cg-muenz-schnippen           -> cg-muenz-kante
cg-kartenhaus                -> cg-karten-haus
cg-becher-pyramide           -> cg-sport-stacking
cg-bierdeckel-rettungsringe  -> cg-bierdeckel-muenzen
cg-ringwurf-flaschenhals     -> cg-ringwurf
```

Die drei archivierten Spiele behalten ihre alten Zeichen. Sie sind nicht
waehlbar, brauchen also keine neuen.
