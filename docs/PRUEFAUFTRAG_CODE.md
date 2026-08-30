# Prüfauftrag: drei Durchgänge durch den Code

*Erstellt 2026-08-29. Zum Kopieren in eine neue Sitzung. Wolf: „gib dem
anweisung, ich erstelle einen neuen chat und jage ihm los".*

---

## Der Auftrag

Du prüfst dieses Repo in **drei engen Durchgängen**. Du änderst dabei **nichts**.
Am Ende steht eine Liste, keine Commits.

Lies zuerst `CLAUDE.md` und `STRUKTUR_PLAN.md`. Dort steht, was hier Absicht
ist. Ohne das meldest du Entscheidungen als Fehler zurück, und das kostet nur
Sortierzeit.

### Durchgang 1: stille Fehlschläge

Suche Stellen, die abbrechen oder etwas verwerfen, ohne es zu sagen.

* `catch {}` und `catch { /* ignore */ }` ohne Log
* Versprechen ohne `await` und ohne `.catch`
* frühe `return`, die einen Zustand verschlucken
* Rückfallebenen, die einen fehlenden Wert durch einen plausiblen ersetzen
* Schalter, deren Zustand einen Abend überlebt und dabei Daten wegwirft

Warum dieser Durchgang zuerst kommt: am 2026-08-29 stellte sich heraus, dass
seit dem 04.07. **kein einziger echter Quizabend** in der Datenbank gelandet
war. Der Grund war ein Testmodus-Schalter, der still übersprang, sich pro Gerät
merkte und nie jemandem etwas sagte. Zwei Monate, kein Fehler, keine Meldung.
Genau diese Bauform suchst du.

### Durchgang 2: der Socket-Vertrag

`emit(event: string, payload?: unknown)` ist untypisiert. Ein Tippfehler im
Ereignisnamen fällt nirgends auf, der Knopf tut einfach nichts. Das steht als
Hauptrisiko R1 in `STRUKTUR_PLAN.md`.

* Sammle jeden `emit('qq:...')` im Frontend und jeden `socket.on('qq:...')` im
  Backend.
* Melde jede Seite ohne Gegenstück, in beide Richtungen.
* Melde Nutzlasten, deren Felder auf beiden Seiten verschieden heißen.

Das ist stumpfe Arbeit, aber vollständig machbar, und das Ergebnis ist
eindeutig statt geschätzt.

### Durchgang 3: Sicherheit auf den offenen Wegen

Nur die Pfade, an denen fremde Geräte hängen: Team-Beitritt, Feedback,
Uploads, das PIN-Gate, die Summary-Endpunkte. Es gab hier schon zwei Audits
(Team-Spoofing S2, Rate-Limit S5, Kontaktdaten im Feedback-Dashboard) — deren
Ergebnisse stehen als Kommentare im Code. Prüfe, ob sie noch halten, und suche
Neues nur in diesem Umkreis.

Für diesen Durchgang gibt es das fertige `/security-review`.

---

## Die eine harte Regel

**Jeder Fund kommt mit einem Weg, ihn rot zu machen.**

Also: welcher Aufruf, welche Station, welcher Inhalt führt dazu, dass man den
Fehler SIEHT. Ein Fund ohne Reproduktion ist eine Vermutung, und Vermutungen
haben in diesem Repo schon mehrfach Tage gekostet.

Wenn du keine Reproduktion findest, melde den Fund trotzdem — aber schreib
ausdrücklich „nicht reproduziert" dazu. Nicht so tun, als wäre es sicher.

Im Repo liegen unter `scripts/` rund vierzig Werkzeuge, die Stationen anfahren
und messen (`scripts/lib/buehne.mjs` ist der Harness). Wenn eines davon deinen
Fund zeigen kann, nenne den Aufruf.

---

## Was du NICHT tust

* **Keine Änderungen.** Kein Fix, kein Refactor, kein „ich hab's gleich mit
  aufgeräumt". Es stehen Events an; Umbauten kurz davor sind der beste Weg,
  etwas Laufendes kaputtzumachen.
* **Kein Geschmack.** Das Design ist eingefroren. Bewusste
  Design-Entscheidungen sind keine Bugs. Im Zweifel steht der Grund als
  Kommentar daneben, meist mit Datum und Zitat.
* **Keine Lint-Warnungen melden.** Es sind rund 495, sie sind bekannt, sie
  blockieren nichts.
* **Keine Architektur-Vorschläge.** Der Umbauplan steht in
  `STRUKTUR_PLAN.md` und ist nicht Gegenstand dieser Prüfung.
* **Nichts melden, was der Abend nie erreicht.** Rund 10 % der Quellzeilen
  hängen an keinem Einstieg. Das ist kein Suchbereich, sondern Rauschen. Der
  nächste Abschnitt sagt, wie du die Liste bekommst.

## Vor dem ersten Durchgang: die tote Hälfte ausblenden

```bash
node scripts/toter-code.mjs --selbsttest   # muss 3/3 sagen
node scripts/toter-code.mjs                # die Liste
```

**Führe das aus, bevor du mit Durchgang 1 anfängst.** Stand 2026-08-30:
**74 Dateien, 14.685 Zeilen, 10,3 %** der Quellzeilen sind von keinem Einstieg
aus erreichbar. Sie haben `catch {}` und `emit('qq:...')` wie jede andere
Datei, sie linten wie jede andere Datei, und sie rendern nie.

Wenn du sie mitsuchst, passiert zweierlei. Du verbrennst Zeit an Code, den
niemand sieht. Und schlimmer: du meldest Funde, für die es die geforderte
Reproduktion gar nicht geben kann, und schreibst brav „nicht reproduziert"
darunter. Dann liegt bei Wolf ein Fund, der weder falsch noch echt ist, und
jemand muss pro Eintrag von Hand nachsehen, ob die Datei überhaupt lebt.

Das ist kein erfundenes Risiko. Am 2026-08-30 hat eine Sitzung ein Repro in
`QQQuestionTestPage` gebaut und erst danach gemerkt, dass die Route seit einer
Weile eine Weiterleitung auf `/moderator-test` ist. Beim selben Anlass kam
heraus, dass `docs/UEBERGABE_FRAGEFOLIE.md` vier Aufrufstellen der Fragefolie
nennt, von denen nur zwei erreichbar sind: `QQBuiltinSlide` und
`QQQuestionTestPage` sind tot. Eine Übergabe, die sorgfältig aussah, hat also
über die Hälfte ihrer eigenen Belege aus totem Code gezogen.

Das Werkzeug läuft über die Import-Kanten, nicht über Namen, und liefert zwei
Stufen: **Stufe 1** wird von niemandem importiert, **Stufe 2** nur von Dateien
der Stufe 1 oder 2. Was es nicht sieht, steht in seinem Kopf; lies das mit.
Der Selbsttest muss 3/3 sagen, sonst bedeutet die Liste nichts.

⚠️ **Erreichbar heißt nicht benutzt, und tot heißt nicht wertlos.** Die Liste
ist eine Entscheidungsvorlage für Wolf, kein Löschbefehl und kein Fund. Melde
sie nicht als Ergebnis, lösche nichts, und schlage auch kein Aufräumen vor.
Sie steht hier nur, damit du deinen Suchbereich kennst.

## Was hier Absicht ist und trotzdem komisch aussieht

* **`(room as any)._xyz`**: rund 79 Felder kleben am Raum-Objekt, ohne im Typ
  aufzutauchen. Bekannt, dokumentiert in CLAUDE.md.
* **Schlafende Features**: Comeback-Runde, Imposter, 4 gewinnt, Bluff, die
  ausgebauten Brett-Aktionen. Ihr Code liegt absichtlich da. Die Register
  stehen in `shared/quarterQuizTypes.ts`. Feature-Status hat drei Zustände:
  aktiv, schlafend, ausgebaut.
* **CrowdQuiz ist nicht CozyQuiz**: eigene Kategorien, eigene Siegerehrung,
  kein Spielbrett, Fraktionen statt Teams. Unterschiede sind gewollt, nicht
  Duplikate zum Zusammenlegen. Siehe `docs/FORMATE.md`.
* **Bezeichner heißen `cozyArena`, sichtbar heißt es CrowdQuiz.** Der Wert ist
  persistiert, Umbenennen bricht gespeicherte Räume.
* **Rohe Unicode-Emojis auf den Handy-Seiten** sind eine Entscheidung, keine
  Altlast. Begründung im Kopf von `scripts/emoji-reste.mjs`.
* **Zwei `!important`-Regeln in `frontend/src/main.css`** schlagen in der
  Handy-Breite jeden Inline-Style (`flex-wrap: wrap` und die Button-Maße). Das
  ist bekannt und gewollt; melde es nicht als Fund, aber ziehe es in Betracht,
  wenn dir ein Layout-Wert unwirksam vorkommt.

## Dateien, die anderen Sitzungen gehören

`frontend/src/main.css` und `frontend/src/qqTheme.ts` gehören der
Bühnen-Sitzung, `QQTeamAvatar.tsx` ist ein Grenzfall. Siehe
`docs/UEBERGABE_TEAM.md`. Du änderst ohnehin nichts, aber melde Funde dort
gesondert, damit klar ist, wer sie anfassen darf.

---

## Ausgabe

Eine Liste, nach Schaden sortiert, nicht nach Fundort. Je Eintrag:

1. **Was ist kaputt**, in einem Satz.
2. **Wo**: Datei und Zeile.
3. **Wie es rot wird**: der konkrete Weg. Oder ausdrücklich „nicht
   reproduziert".
4. **Was es kostet, wenn es bleibt**: wer merkt es wann, und woran.

Am Ende ein Absatz: **was du NICHT geprüft hast.** Der ist wichtiger als er
aussieht. Ein Prüfer, der seine Lücken verschweigt, ist gefährlicher als
keiner — das Emoji-Werkzeug dieses Repos hat monatelang grün gemeldet, weil
es nur die Bühne ansah und niemand wusste, dass die Handy-Seiten nie im
Suchbereich lagen.

## Was du erwarten darfst

Nicht viel, und das ist eine ehrliche Erwartung, kein Understatement. Am
2026-08-29 wurden fünf echte Fehler gefunden; ein Code-Durchgang hätte
plausibel **einen** davon gesehen. Die anderen vier lebten im Verhalten: sie
brauchten ein laufendes Bild, ein bestimmtes Format oder einen bestimmten
Inhalt.

Wenn du also wenig findest, ist das ein Ergebnis und kein Versagen. Schreib es
hin. Was du an Struktur findest — stille Fehlschläge, lose Vertragsenden —
zahlt sich dafür langfristig aus, weil es die Klasse Fehler ist, die sich
sonst zwei Monate versteckt.
