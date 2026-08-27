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

## 🌐 LANDING cozywolf.de — im neuen Design, plus zweite Ebene (2026-08-26)

> Eigenes Repo: `cozyquizapp/cozywolf-landing`, eigener Deploy (Vercel),
> eigener Stack. Einstieg: `COZYWOLF_LANDING.md`.
> Wolfs Rahmen: „es geht nur darum, die landing so anzupassen, dass sie
> funktioniert und gut aussieht (im neuen design) ich will onilo das nicht
> verkaufen, nur zeigen was ich erschaffen habe (mit pitch) website ist eher
> ein google nebenprodukt, falls sie nachschauen". Also KEINE Umpositionierung
> auf eine Bewerbungsseite - sie bleibt eine Kundenseite.

> **Uebergabe fuer ein neues Fenster: `docs/UEBERGABE_LANDING.md`.** Sie traegt
> allein - Auftrag, Stack, alle Designwerte, was absichtlich anders bleibt, das
> Feedback samt Gegenrede, und die Reihenfolge.

- [ ] **Bestandsaufnahme zuerst.** Repo klonen, alle sieben Routen aufnehmen.
      Erst danach entscheiden, ob Anstrich oder Umbau. ⚠️ Nicht blind
      umlackieren: an der Seite haengen SSG-Prerender, Meta/JSON-LD, Sitemap,
      Vercel-Rewrites je Route, GoatCounter-Conversion-Events und Formspree.
      Und die Marke ist dort ABSICHTLICH anders (Marketing-Pink #FA4BA3 gegen
      App-Pink #EC4899, per Logo-Pixelmessung). Was angeglichen wird und was
      verschieden bleibt, ist eine Entscheidung, keine Uebertragung.
- [ ] **„Das Spiel hinter dem Abend"** — der stärkste Punkt aus dem Feedback.
      Drei Bilder nebeneinander: Beamer, Team-Handy, Moderator. Darunter „Ein
      System, drei Perspektiven" und zwei Saetze. Kostet wenig, verbiegt nichts
      am Kundenversprechen, und liefert genau die zweite Ebene.
      Die Bilder fallen beim Durchlauf sowieso an.
- [ ] **Vier belegbare Ungereimtheiten** (aus dem Feedback, alle nachpruefbar):
      „Gründer & Quizmaster" steht zweimal; im FAQ wechselt die Anrede zwischen
      „ihr/eure" und „du/deine"; „Für Gruppen von 10 bis 100 Personen" gegen
      „ab sechs Personen" im Geburtstagstext; „Gratis für Test-Teams" steht
      gleichwertig neben dem Haupt-CTA und nimmt dem Hero Wertigkeit.
- [ ] **Offen, meine Gegenrede zum Feedback:** „die Seite spricht Firmen,
      Geburtstage und Bars gleichzeitig an" gilt fuer die STARTSEITE, nicht
      fuer die Seite - es gibt `/firmen`, `/locations`, `/feiern` als eigene
      Routen. Die Trennung existiert also schon. Und „Beamer und Sound bringe
      ich mit" ist fuer einen Barbetreiber ein Kaufgrund, kein Makel. Beides
      vor dem Umbau klaeren, sonst wird ein Startseiten-Problem als
      Positionierungsproblem behandelt.

---

## 🚪 LOBBY: das zweite Gesicht (Wolf 2026-08-26)

- [ ] **Die Folie „Gleich geht's los" taucht im echten Ablauf nie auf.**
      Wolf: „diese page taucht realistisch nie auf, sie ist zwischen lobby und
      es wird vorbereitet? ... denke ich an ein event, waere diese page gut zum
      ankommen etc, das einlogen nach begruessung etc?"
      Der Moment, den er beschreibt, existiert wirklich und hat heute keinen
      Bildschirm: Leute kommen an, bestellen, setzen sich. Er braucht dabei
      ZWEI Dinge gleichzeitig - „wie komme ich rein" (QR, Teamliste) und „was
      passiert hier gleich" (das Regelkarussell). Die Lobby kann das Erste,
      diese Folie das Zweite, und beide stehen sich im Weg.
      **Vorschlag: kein neuer Schritt im Ablauf, sondern ein zweites Gesicht
      der Lobby.** Solange die Lobby offen ist, wechselt der Beamer zwischen
      Beitrittsbild und Karussell. Der Inhalt wird endlich gesehen, der
      Ankommens-Moment ist bespielt, und es kostet keinen zusaetzlichen
      Tastendruck.
      ⚠️ Das Letzte ist der Punkt: ein Schritt mehr im Ablauf kostet Wolf einen
      Tastendruck im hektischsten Moment des Abends. Am 2026-08-26 haben wir
      aus genau diesem Grund einen leeren Beat aus dem Finale geworfen. Ein
      Schritt muss sich verdienen.

---

## 🖼️ AVATARSATZ V5 — ein Motiv ist defekt (Wolf 2026-08-26)

- [ ] **`cozy-home--alarm-clock.png` neu ausleiten.** Die Flaeche INNERHALB des
      Tragegriffs ist nicht durchsichtig, sondern mit deckenden, fast weissen
      Pixeln gefuellt: ein eingebranntes Transparenz-Karo, 245 und 254 im
      Wechsel, Kachelbreite rund 24 px, alle mit Alpha 255. Auf jedem farbigen
      Grund liest sich das als heller Fleck ueber der Uhr.
      Gegenprobe: `.shots/WECKER-GEGEN-SCHLUESSEL.png` - beim Schluessel
      scheint das Rot durch die Oese, beim Wecker nicht.
      ⚠️ Ich fasse die Datei nicht an. Das waere nachtraegliches Freistellen,
      und genau das schliessen die Asset-Regeln aus. Das ist ein Fall fuer
      einen neuen Export aus der Quelle.
      Solange: entweder der Wecker bleibt drin und faellt gelegentlich auf,
      oder er wird im Code aus dem Pool genommen (eine Zeile, jederzeit
      rueckgaengig). Wolfs Entscheidung.
- [ ] **Die uebrigen 47 einmal auf dem Blatt durchsehen.**
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

- [ ] **Namensfrage Grossformat** (Wolf 2026-08-23, ausdruecklich VERTAGT:
      „wir brainstormen spaeter nochmal einen anderen namen, wenn die
      implementation bei cozyquiz und die motion durch ist... falscher
      zeitpunkt"). Also erst NACH Design und Motion aufmachen.
      Stand des Gespraechs, damit man nicht bei null anfaengt:
      * Wolfs Frage war, ob „cozy" ueberhaupt traegt. Antwort aus dem Produkt:
        ja. Das Avatarset hat sechs Kategorien, eine heisst `cozy-home`
        (Teekanne, Strickstrumpf, Nachttischlampe, Sessel, Kissen, Kerze).
        Keine heisst Buero, Sport oder Wissen. Dazu: warme Tinte statt Weiss
        als Regel, und im Hauptspiel scheidet niemand aus (Ausscheiden gibt es
        nur in der Heissen Kartoffel und im abgeschalteten Imposter).
      * Was das Gefuehl macht, in dieser Reihenfolge: ein Handy pro Team
        (Leute reden miteinander statt nebeneinander), niemand fliegt raus,
        Wolfs Moderation, und erst dann der Beamer. Der Beamer ist der
        schwaechste der vier fuers Gefuehl im Raum, aber der einzige, den ein
        Kunde vor der Buchung sieht.
      * Der offene Punkt ist NUR das Grossformat: „CozyQuiz Arena" verlangt
        von einem Wort zwei Bedeutungen (Kolosseum, Fraktionen, 160 Leute).
        Vorschlag zum Weiterdenken war, Cozy beim kleinen Format zu lassen und
        das grosse unter der Dachmarke zu fuehren, also CozyWolf Arena.
      * Kein eigenes Logo je Format: Cozy und Arena sind Groessen desselben
        Produkts (32 gegen 160 Spielende), keine zwei Produkte.

- ✅ **Backend-Refactor `qqDistanceScore` GEBAUT (2026-07-19):** `qqMegaEventScore`-Distanzzweige
      (SCHAETZCHEN + Schwarm) auf einen `scoreDistanceCat`-Helfer gezogen (Drift-Killer). Selfcheck
      10/10, tsc clean, vitest 49/49. Liegt auf Branch `design/material-pass-standings-bar` (`3ecf264b`),
      geht mit den neuen Wölfen zusammen auf main (Redeploy dann).
- Erledigt/verworfen 2026-07-19 (Wolf): MUCHO-Delight-Hebel = **verworfen** (vergessen + Design-Freeze,
  bleibt wie's ist) · Fraktions-Namen unter Wappen = **nein** (nur Wappen+Anzahl, so gebaut) ·
  arena-main-Video aufs Welcome-Overlay = **durch/moot**.
- **Standing-Note (keine Entscheidung):** Wolf-Sprechblase im Logo ist oval — vor jeder Logo-Änderung fragen.

## 🟠 WARTET AUF MICH — Build

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
- [ ] **Kolosseum-Font Phase 2** — „Schlicht = überall schlicht" (Wolf-Wahl): Siegerehrung/Krönung +
      Standings sollen dem Schlicht-Schalter folgen (**alte Wappen + alte Font + alter BG**, Motion
      gleich). ⚠️ Zeremonie hat EIGENE, immer sichtbare Kolosseum-BGs (`award-<slug>.webp`/
      `epic-moment.webp`) die `arenaBackgrounds` NICHT respektieren → BG **und** Font zusammen gaten
      (via `qqArenaType`), sonst Nunito auf Kolosseum-BG. **Wolf schaut Siegerehrung-in-Schlicht SELBST
      an.** Phase 1 (In-Game-Font-Gate) ist durch (`e936fc70`). Details Memory `project_design_motion_elevation`.
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
- [ ] *(spaeter/optional, nach Freeze)* Verzierte Rahmen für Windows + Frage-Karten.

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

## Langzeit, nach dem Buehnen-Durchgang (Wolf 2026-08-26)

Explizit als „LONGTIME TO DOS fuer spaeter" angesagt, also nicht in diesem
Durchgang anfangen. Reihenfolge ist Wolfs Reihenfolge.

- [ ] **Summary anschauen und anpassen.** Die Seite hinter dem QR-Code der
      Danke-Folie. Sie ist das einzige Stueck CozyQuiz, das die Gaeste am
      naechsten Tag noch sehen, und war beim Buehnen-Durchgang nicht dabei.
- [ ] **Teamview an das Beamerdesign angleichen.** Das Handy folgt noch dem
      alten Cozy-Look. ⚠️ Nicht blind uebernehmen: die Buehne ist auf zehn
      Meter gebaut, das Handy auf dreissig Zentimeter. Gleiche Sprache,
      andere Groessen.
- [ ] **CozyQuiz-Design zum Standard machen**, explizit umstellen. Heute
      entscheidet `themeIdForState` ueber den Avatarsatz, ob die Buehne
      laeuft. Das ist ein Nebeneffekt, keine Entscheidung.
- [ ] **cozywolf.de-Landing an das neue Design anpassen.**

---

*Erledigte Punkte stehen in der Git-History (`git log --oneline`), nicht hier.
Abgearbeitete Specs/Audits/Handoffs liegen in [`docs/archive/`](docs/archive/).*
