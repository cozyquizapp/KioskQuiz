# Die Designsprache der Buehne (gemessen)

Diese Datei wird NICHT von Hand gepflegt. Sie entsteht aus einer Messung
der laufenden CozyQuiz-Buehne: `node scripts/design-referenz.mjs --bibel`.

Der Grund steht im Kopf des Werkzeugs. Kurz: `docs/BUEHNE_2A.md` ist die
Design-Bibel mit den Begruendungen, aber vom 23.08.2026 - die
Schrift-Entscheidung und die Trennung Rahmen/Feld vom 26. stehen dort nicht.
Eine handgepflegte Liste von Werten laeuft der Buehne hinterher und wird
trotzdem geglaubt. Diese hier kann nicht veralten, sie kann nur alt sein -
und dann steht das Datum daneben.

⚠️ Die BEGRUENDUNGEN stehen weiter in `docs/BUEHNE_2A.md`. Hier stehen nur
die Werte. Wer wissen will, WARUM die Tinte warm ist, liest dort.

Gemessen am 2026-08-28 ueber 6 Stationen.

## Schriften

* `Bricolage Grotesque` — 120x, 6 Stationen (z.B. „Scannen & mitspielen")
* `League Spartan` — 18x, 2 Stationen (z.B. „C")
* ⚠️ `Fredoka` — 14x, 1 Station (**nur aufloesung**) (z.B. „206")

## Textfarben

* `243,239,231@1.00` — 98x, 6 Stationen (z.B. „C")
* `185,179,198@1.00` — 30x, 4 Stationen (z.B. „Scannen & mitspielen")
* `18,16,14@1.00` — 10x, 3 Stationen (z.B. „SCHÄTZCHEN")
* `245,236,216@1.00` — 4x, 2 Stationen (z.B. „Beispiel: 5 verbundene")
* ⚠️ `26,10,20@1.00` — 2x, 1 Station (**nur lobby**) (z.B. „8")
* ⚠️ `255,176,58@1.00` — 2x, 1 Station (**nur frage**) (z.B. „27")
* ⚠️ `253,230,138@1.00` — 2x, 1 Station (**nur aufloesung**) (z.B. „206")
* ⚠️ `234,179,8@1.00` — 2x, 1 Station (**nur aufloesung**) (z.B. „Knochen")
* ⚠️ `239,68,68@1.00` — 2x, 1 Station (**nur danke**) (z.B. „Sieger des Abends")

## Flaechen

* ⚠️ `246,239,230@0.05` — 22x, 1 Station (**nur regeln**)
* ⚠️ `12,10,30@0.66` — 12x, 1 Station (**nur aufloesung**)
* ⚠️ `245,236,216@0.67` — 10x, 1 Station (**nur regeln**)
* `249,115,22@1.00` — 6x, 3 Stationen
* `34,197,94@1.00` — 6x, 3 Stationen
* `20,184,166@1.00` — 6x, 3 Stationen
* `168,85,247@1.00` — 6x, 3 Stationen
* `250,204,21@1.00` — 6x, 3 Stationen
* `236,72,153@1.00` — 6x, 3 Stationen
* `239,68,68@1.00` — 6x, 3 Stationen
* `245,236,216@1.00` — 4x, 2 Stationen (z.B. „8")
* `59,130,246@1.00` — 4x, 2 Stationen
* `255,176,58@1.00` — 4x, 2 Stationen (z.B. „SCHÄTZCHEN")
* ⚠️ `255,255,255@1.00` — 2x, 1 Station (**nur lobby**)
* ⚠️ `253,230,138@1.00` — 2x, 1 Station (**nur aufloesung**)

## Verlaeufe

* `linear-gradient(rgba(255, 255, 255, 0.22) 0%, rgba(255, 255,` — 46x, 4 Stationen
* `radial-gradient(circle at 50% -5%, rgb(26, 21, 38) 0%, rgb(1` — 4x, 2 Stationen
* ⚠️ `radial-gradient(rgba(245, 236, 216, 0.18) 0%, rgba(245, 236,` — 2x, 1 Station (**nur lobby**)
* ⚠️ `linear-gradient(rgba(30, 24, 58, 0.94), rgba(10, 8, 24, 0.94` — 2x, 1 Station (**nur aufloesung**)
* ⚠️ `radial-gradient(circle, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0` — 2x, 1 Station (**nur pause**)

## Raender

* ⚠️ `1px solid 255,255,255@0.10` — 22x, 1 Station (**nur regeln**)
* ⚠️ `2px solid 245,236,216@1.00` — 10x, 1 Station (**nur regeln**)
* ⚠️ `1px solid 246,239,230@0.12` — 10x, 1 Station (**nur aufloesung**)
* ⚠️ `1px solid 234,179,8@0.67` — 2x, 1 Station (**nur aufloesung**)
* ⚠️ `3px solid 245,236,216@1.00` — 2x, 1 Station (**nur pause**)

## Ecken

* `klein` — 72x, 4 Stationen (z.B. „8")
* `16% (Anteil)` — 68x, 5 Stationen (z.B. „SCHÄTZCHEN")
* `mittel` — 16x, 2 Stationen
* ⚠️ `18% (Anteil)` — 12x, 1 Station (**nur aufloesung**)
* ⚠️ `50% (Anteil)` — 2x, 1 Station (**nur pause**)
* ⚠️ `22% (Anteil)` — 2x, 1 Station (**nur pause**)

## Schatten

* `neutral / Streuung klein` — 48x, 5 Stationen
* `bunt / Streuung klein` — 19x, 2 Stationen
* ⚠️ `bunt / Streuung mittel` — 2x, 1 Station (**nur aufloesung**)
