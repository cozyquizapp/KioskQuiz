# Stilproben ablegen

Hier kommen die generierten Stil-Reihen hinein (fuenf Motive je Bild:
Fuchs, Daumen, Herz, Krug, Drache).

Dateinamen frei, empfohlen:

    A-ton.png  B-filz.png  C-papier.png  D-holz.png  E-vinyl.png

Dieser Ordner liegt bewusst in `design-assets/` und NICHT in `.shots/`:
`.shots/` steht in der .gitignore, Dateien dort kommen nie im Repo an und
sind fuer eine Remote-Session unsichtbar.

Auswertung:

    node scripts/stilprobe-auf-buehne.mjs

Das stellt jedes Motiv freigestellt auf die Slot-Farb-Disc, in den gemessenen
Groessen (92/68/48px), und zeigt jede Richtung auf zwei Gruenden nebeneinander:
heutiger Buehnengrund gegen einen waermeren. Ergebnis in
`.shots/stilprobe-auf-buehne/`.

Voraussetzung fuers Freistellen: flacher, einfarbiger Hintergrund im Bild.
