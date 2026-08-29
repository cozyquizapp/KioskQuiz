# Übergabe: /team an das neue Design, optimiert fürs Handy

Geschrieben 2026-08-28 für die Sitzung, die das Handy umbaut, während parallel
an der Bühne (CrowdQuiz) gearbeitet wird. Wolf: „ich müsste /team auch an das
neue Design anpassen aber optimiert für mobile."

Alles hier ist gemessen oder aus dem Code gelesen, nicht aus dem Gedächtnis.

---

## 0. Die Abmachung, damit wir uns nicht überschreiben

Zwei Sitzungen an einem Repo, deshalb hart aufgeteilt:

* **Eigener Branch.** Nicht `claude/buehne-2a-uebergabe`, dort wird laufend auf
  `main` gepusht.
* **Diese zwei Dateien gehören der Bühnen-Sitzung, nicht anfassen:**
  * `frontend/src/main.css`
  * `frontend/src/qqTheme.ts`

  Das sind die gemeinsamen Token. Das Handy soll sie **lesen**, nicht ändern.
  Braucht das Handy einen Wert, der dort fehlt, kurz melden statt selbst
  eintragen.

  ⚠️ **Eine Ausnahme, angesagt und geprüft.** Am 29.08. hat die Handy-Sitzung
  fünf Stellen in `main.css` geändert (Commit `fa74ae4`) und es gemeldet. Vier
  sind `.qq-team-*`-benannt und erreichen die Bühne nicht. Die fünfte liegt im
  Block `@media (max-width: 639px)` und ist **nicht gescoped**: `input` ging
  von `14px !important` auf 16, `button` von `min-height: 40px !important` auf
  44. Beides sind dokumentierte Schwellen (iOS Safari zoomt unter 16px beim
  Antippen von selbst hinein; WCAG 2.5.5 verlangt 44 x 44), keine
  Geschmacksfrage. Das `!important` hat vorher jede sorgfältig gesetzte Höhe
  im Code still überstimmt.

  Die Bühnen-Seite ist nachgemessen (`scripts/mobilregel-nebenwirkung.mjs`):
  bei 390px hat `/beamer` **null** Knöpfe im Geltungsbereich, `/moderator` 16,
  davon keiner unter 44px, kein neuer Querlauf. Die Bühne läuft ohnehin fix auf
  1760x990 und fällt gar nicht unter die Regel. **Also nicht zurückdrehen**,
  wer den Block später sieht: die alten Werte waren der Fehler.
* **Dem Handy gehören:** `frontend/src/pages/QQTeamPage.tsx` (2117 Zeilen),
  `frontend/src/views/teamStyles.ts`, und die `CozyQuizTeam*.tsx` in
  `frontend/src/components/` (Action-Cards, Bottom-Sheet, Inputs, Lifecycle,
  Overlays, PhaseCards, Primitives, QuestionCard, QuestionInputs).
* **Grenzfall `QQTeamAvatar.tsx`:** wird von BEIDEN benutzt. Wer dort etwas
  ändert, sagt es an. Am 28.08. hat die Bühnen-Sitzung dort `CrestAvatar`
  angefasst (Wappen sitzen jetzt auf der Teamkachel).

---

## 1. Was „das neue Design" ist, und wo es steht

Das Bühnen-Design heißt intern **`buehne`** (Label im Moderator: „CozyQuiz").
Seit 2026-08-24 ist es die Vorgabe für neue Räume, seit 2026-08-28 auch für
CrowdQuiz.

Drei Quellen, in dieser Reihenfolge:

| Was | Wo | Gilt für |
|---|---|---|
| Farb-/Schrift-Token | `qqTheme.ts`, Objekt `BUEHNE` | überall (setzt `--qq-*` auf `documentElement`) |
| Flächensprache der Bühne | `main.css`, Block `[data-qq-stage='2a']` | NUR die Projektion |
| Gemessene Werteliste | `docs/DESIGNSPRACHE.md` | Nachschlagewerk, wird erzeugt |

Die Begründungen stehen in `docs/BUEHNE_2A.md` (die Design-Bibel, zehn Regeln)
und `docs/DESIGN_CHECKLISTE_2A.md`.

⚠️ **`docs/DESIGNSPRACHE.md` wird nicht von Hand gepflegt.** Sie entsteht aus
einer Messung der laufenden Bühne:
`node scripts/design-referenz.mjs --bibel`. Der Grund steht im Kopf des
Werkzeugs: eine handgepflegte Werteliste läuft dem Code hinterher und wird
trotzdem geglaubt.

**Die Werte, Stand 2026-08-28 gemessen über 15 Stationen:**

* Schrift: **Bricolage Grotesque** (`--qq-font`), Wortmarke **League Spartan**
  (`--font-brand`). Seit 2026-08-28 gibt es keine dritte mehr.
* Tinte: `#F3EFE7` warm, gedämpft `#B9B3C6`. Kein Weiß, kein kaltes Slate.
* Grund: `radial-gradient(circle at 50% -5%, #1A1526, #120E1C, #0B0912)` —
  tiefes Violett, **nicht** Dunkelblau. Der blaue Eindruck auf der Bühne kommt
  vom Kategorie-Ton, der pro Frage darüberliegt.
* Akzent: Creme `#F5ECD8`.
* Marken-Pink `#EC4899` bedeutet auf der Bühne **Dringlichkeit** (Timer unter
  zehn Sekunden). ⚠️ Dieselbe Farbe ist zugleich die Teamfarbe des Slots `cow`
  (in CrowdQuiz „Einspruch"). Wer nach Pink sucht, findet beides.

---

## 2. ⚠️ Was das Handy NICHT von der Bühne übernehmen darf

Das ist der wichtigste Abschnitt. Die Bühnenregeln sind für ein PROJIZIERTES
BILD gebaut, das Handy ist eine Oberfläche in dreißig Zentimetern Abstand. Wolf
2026-08-26 zur Teamview: „Nicht blind übernehmen: die Bühne ist auf zehn Meter
gebaut, das Handy auf dreißig Zentimeter. Gleiche Sprache, andere Größen."

Konkret, mit Fundstelle:

* **Die Teammarke bleibt auf dem Handy RUND.** Auf der Bühne ist sie eckig
  (`--qq-team-mark-radius: 16%`), weil sie dort ein Spielstein ist. Auf dem
  Handy ist sie Avatar, also Identität. Steht ausdrücklich so in `main.css`
  („NICHT betroffen: das Handy … Dieser Scope gilt nur für die Projektion").
* **Regel null gilt umgekehrt.** Die Bibel verbietet auf der Bühne
  Bedien-Idiome: Reiterleisten, Chips von Rand zu Rand, Zustände nur über eine
  Randfarbe, alles unter 26 px Schrift. Auf dem Handy sind Reiter, Sheets und
  kleine Schrift genau richtig. Nicht von der Bibel abschrecken lassen.
* **Touch-Ziele mindestens 44 px**, mit 8 px Abstand. Auf der Bühne gibt es
  keine Berührung, dort ist die Regel bedeutungslos; auf dem Handy ist sie
  bindend (WCAG 2.5.5). `scripts/design-audit-cozyquiz.mjs` prüft das bereits
  und misst Touch-Ziele **nur** auf dem Handy.
* **Kein `overflow: hidden`-Denken.** „Der Beamer bekommt nie eine Scrollbar"
  ist eine Bühnenregel. Das Handy darf und soll scrollen.
* **Die Kartensprache ist auf der Bühne leer** (`--qq-card-bg: transparent`,
  `--qq-card-border: none`). Auf dem Handy trägt eine Karte Struktur und darf
  eine Fläche haben. ⚠️ Nicht verwechseln mit `--qq-feld-*` — main.css
  unterscheidet **Rahmen** (ein Fenster um eine Folie, auf der Bühne weg) von
  **Feld** (die Form eines einzelnen Gegenstands, bleibt). Im Zweifel: liegt
  der Inhalt DARIN (Feld) oder DARUNTER (Rahmen)?

---

## 3. CozyQuiz gegen CrowdQuiz: was das Handy unterscheiden muss

Beide Formate teilen seit 2026-08-28 das **Design**, nicht die **Mechanik**.
Merksatz: gleiche Wörter, andere Sätze. Die vollständige Liste steht in
`CLAUDE.md`; hier das, was auf dem Handy ankommt.

| | CozyQuiz | CrowdQuiz |
|---|---|---|
| Teams | 3 bis 8 | bis **40** (`QQ_MAX_TEAMS_LARGE`), gebündelt auf 8 Fraktionen à 5 |
| Identität | frei kombinierbar: 48 Objekte × 8 Farben (`cozyquiz`-Satz) | **8 feste Wappen**, an Name UND Farbe gebunden (`cozyArenaCrests.ts`) |
| Avatar-Satz | `cozyquiz` | `cozyArena` — Vorgabe hängt am Format, siehe `qqDefaultAvatarSetId()` |
| Wertung | Brett: Setzen, Klauen, Stapeln | kein Brett, Bar-Race auf den ANTEIL richtiger Antworten |
| Bunte Tüte | Heiße Kartoffel, Top 5, Fix It, Pin It | zusätzlich Umfrage und Schwarmintelligenz (`QQ_BUNTE_TUETE_ARENA_ONLY`) |

⚠️ **Die zwei Fallen, in die die Bühnen-Sitzung heute selbst getappt ist:**

1. **Nicht blind angleichen.** Eine Ankommen-Folie „Sucht euch ein Team-Emoji
   aus" lief auch in CrowdQuiz. Sie war nicht nur unpassend, sie sagte etwas
   FALSCHES über die Regeln — dort sucht sich niemand ein Emoji aus. Wolf:
   „das wäre wichtig beim Angleichen des Designs an CozyQuiz, dass nicht blind
   alles übernommen wird."
2. **Die Fraktionsfarbe ist die erste Information.** Die acht Wappen sind alle
   creme und unterscheiden sich nur im Emblem; auf Distanz trennt sie nur die
   Farbe. Auf der Bühne sitzen sie deshalb seit heute auf der Teamkachel in
   Teamfarbe. Auf dem Handy ist der Abstand klein, dort trägt das Emblem
   allein — aber die Zuordnung Team → Fraktion muss trotzdem sofort lesbar
   sein, das Handy ist der Ort, an dem die Sub-Team-Identität lebt.

Kategorien: **„10 von 10" heißt auf Englisch seit 2026-08-28 „Ten Chips"**
(deutsch unverändert). Grund: die Fraktion `Risiko` heißt englisch „All In",
und die Kategorie hieß auch so.

---

## 4. Werkzeuge, die es schon gibt

Alle unter `scripts/`, alle nutzen `scripts/lib/buehne.mjs` (Raum aufsetzen,
zu einer Station fahren).

* `design-audit-cozyquiz.mjs` — **das wichtigste für das Handy.** Prüft
  Kontrast (WCAG 4.5:1), Touch-Ziele (44 px, nur Handy) und
  `prefers-reduced-motion`.
* `design-referenz.mjs` — vergleicht den Wortschatz zweier Formate und
  schreibt die Bibel. Prüft seit heute auch die Referenz gegen sich selbst
  („Einzelgänger": ein Wert auf genau einer Folie ist ein Rest oder eine
  bewusste Ausnahme).
* `anschnitt-suche.mjs` — findet abgeschnittenen Text (still verdeckt oder
  über die Kante).
* `emoji-reste.mjs` — findet rohe Unicode-Emojis, die noch nicht durch die
  3D-Zeichen ersetzt sind.

---

## 5. Fallen, die schon Zeit gekostet haben

Die vollständige Liste steht in `CLAUDE.md`. Die fünf, die beim Handy am
ehesten zuschlagen:

1. **Der Raum lebt im RAM UND auf Platte.** Für einen sauberen Repro-Lauf
   `rm -f backend/.qq-rooms/*.json` — und **erst den Server killen, dann die
   Datei anfassen**, sonst schreibt er beim Beenden seinen RAM-Stand drüber.
   Am 28.08. dreimal hintereinander falsch gemacht.
2. **`pkill -f "start:backend"` trifft nur den npm-Wrapper**, nicht
   ts-node-dev. Der Server läuft weiter und man misst eine Fassung, die es
   nicht mehr gibt.
3. **Der Socket-Vertrag ist untypisiert.** Ein Tippfehler im Event-Namen fällt
   nirgends auf, der Knopf tut einfach nichts.
4. **Neues State-Feld?** Muss in `buildQQStateUpdate` eingetragen werden, sonst
   kommt es nie an. Und: Backend-Änderungen brauchen einen **manuellen
   Redeploy auf Coolify**, das Frontend deployt Vercel von selbst.
5. **Erst rot, dann grün.** Bug reproduzieren, bevor er gefixt wird. Und ein
   einzelner grüner Lauf beweist nichts — bei zufälligen Bot-Namen und
   Antwortzahlen dreimal messen.

---

## 6. Was am Handy offen ist (Stand 28.08.)

Aus `todo.md`, Abschnitt Langzeit:

* **Teamview an das Beamerdesign angleichen** — dieser Auftrag.
* **`/team` danach im Detail**, nur Einzelheiten, nicht der Aufbau.
* Die Summary-Seite (hinter dem QR der Danke-Folie) ist ein eigener Punkt und
  gehört NICHT hierher.

Ein gemessener Befund, der das Handy betreffen könnte: `QQTeamAvatar` rendert
die Marke über `qqKachelFlaeche` (Kachel mit Innenschatten). Auf dem Handy
sollte geprüft werden, ob dieselbe Tiefe auf dreißig Zentimetern nicht zu
laut ist. Gemessen ist das noch nicht.
