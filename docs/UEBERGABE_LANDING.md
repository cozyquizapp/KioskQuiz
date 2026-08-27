# Uebergabe: cozywolf.de auf das neue Design

**Fuer ein neues Fenster im Repo `cozyquizapp/cozywolf-landing`.**
Dieses Dokument soll allein tragen. Wer es liest, braucht den Verlauf des
Quiz-Fensters nicht.

Stand 2026-08-26.

---

## 1. Der Auftrag, in Wolfs Worten

> „es geht nur darum, die landing so anzupassen, dass sie funktioniert und gut
> aussieht (im neuen design) ich will onilo das nicht verkaufen, nur zeigen was
> ich erschaffen habe (mit pitch) website ist eher ein google nebenprodukt,
> falls sie nachschauen"

Daraus folgen drei Dinge, und die dritte ist die wichtigste:

1. Die Seite kommt auf das neue Design (siehe Abschnitt 3).
2. Ein kleiner Abschnitt macht sichtbar, dass hinter dem Abend ein selbst
   entwickeltes System steht (siehe Abschnitt 5).
3. **Sie bleibt eine Kundenseite.** Sie verkauft Kneipenquiz und
   Firmenevents an Bars, Firmen und Feiernde. Sie wird NICHT zu einer
   Bewerbungsseite umgebaut.

⚠️ Der Hintergrund zu Punkt 3: Wolf bewirbt sich initiativ bei onilo.de
(Lernplattform fuer Grundschulen). Die Landing ist dabei nur das, was jemand
findet, der ihn googelt. Eine Seite, die ernsthaft ein Produkt an Bars
verkauft, ist dafuer ein **staerkerer** Beleg als eine Seite, die sich
anbiedert. Wer sie fuer Onilo verbiegt, verliert beides.

---

## 2. Wo der Code liegt, und was daran haengt

**Repo:** `github.com/cozyquizapp/cozywolf-landing`
**Live:** https://www.cozywolf.de/ · **Deploy:** Vercel, auto auf Push zu `master`
**Lokal (Wolfs Rechner):** `c:/Users/hornu/Desktop/desktop/cozywolf-landing`

**Stack:** React 19 + Vite + TypeScript, keine Abhaengigkeiten ausser React.

### ⚠️ Was beim Umlackieren kaputtgehen kann

Das ist keine reine Designseite. An ihr haengt:

* **SSG-Prerender** (`prerender.mjs`): erzeugt pro Route statisches HTML mit
  eigenem Meta-Titel, Open-Graph, Canonical, JSON-LD (LocalBusiness, FAQPage,
  Person), dazu `sitemap.xml` und `dist/404.html`.
* **Routing ohne Router-Lib** (`src/routes.tsx`), Navigation ueber echte
  `<a>`-Links, Vercel-Rewrites je Route in `vercel.json`.
* **Conversion-Messung**: GoatCounter, cookiefrei. Ereignisse in `src/track.ts`
  (`cta-anfragen-*`, `form-kontakt-gesendet`, `form-testteam-gesendet`). Wer
  einen Knopf umbaut und das Ereignis vergisst, macht die Messung still blind.
* **Formulare** ueber Formspree, Mailto als Rueckfall.
* **FAQ steht doppelt**: in `FaqSection.tsx` UND als JSON-LD in
  `prerender.mjs`. Beides mitpflegen, sonst weichen Seite und Rich Result ab.

**Routen:** `/`, `/firmen`, `/locations`, `/feiern`, `/ueber`, `/kontakt`,
`/testen` (noindex, Kampagne), `/impressum`, `/datenschutz`, echte 404.

---

## 3. Das Design, das sie erben soll

Alle Werte gemessen aus `frontend/src/main.css` im Repo `kioskquiz`, Stand
2026-08-26.

### Schrift

```
Arbeitsschrift   'Bricolage Grotesque', 'Nunito', 'Geist', system-ui, sans-serif
Wortmarke        League Spartan  (bleibt, siehe Abschnitt 4)
```

Bricolage ist seit dem 2026-08-26 die Schrift der Buehne. Entschieden wurde am
Bild, nicht an einer Namensliste: bei gleicher Groesse laeuft sie schmaler und
braucht dadurch eine Zeile weniger. Sie ist variabel (200 bis 800) und wird
selbst gehostet, mit `font-optical-sizing: auto`.

⚠️ In der App steht `'Twemoji Country Flags'` als ERSTE Familie in `--font`
und `--font-game`. Das ist kein Zierrat, sondern der Unicode-Range-Trick, damit
Flaggen unter Windows dargestellt werden. Fuer die Landing nur uebernehmen,
wenn dort Flaggen vorkommen.

### Farben

```
--qq-text          #F6EFE6     Primaertext (warmes Creme, kein Weiss)
--qq-text-muted    rgba(246,239,230,0.62)
--qq-hairline      rgba(246,239,230,0.20)   dezente Linien
--qq-surface       rgba(246,239,230,0.05)   Sub-Karten auf dem Grund
--qq-card-radius   20px
App-Pink           #EC4899   (--qq-accent / --qq-stage-brand)
Pink hell          #F472B6
Pink weich         #FBCFE8
Pink tief          #A21247
```

Die Regel dahinter, und sie ist die wichtigste des ganzen Designs: **Text ist
warmes Creme, nicht Weiss.** Ein kaltes Weiss neben einem warmen Grund sticht
blaeulich ab. Dasselbe gilt fuer Flaechen: `rgba(246,239,230,0.05)`, nicht
`rgba(255,255,255,0.04)`.

### Die Kachel

Teamkacheln und Bausteine haben seit dem 2026-08-26 EINE Definition
(`frontend/src/qqKachel.ts`). Die Tiefe kommt nicht aus Weichzeichnung, sondern
aus vier harten Kanten:

```css
border-radius: 16%;
background:
  linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 18%,
                  rgba(255,255,255,0) 50%, rgba(0,0,0,0.16) 78%, rgba(0,0,0,0.34) 100%),
  <Teamfarbe>;
box-shadow:
  inset 0 1px 0 rgba(255,255,255,0.38),
  inset 2px 0 0 rgba(255,255,255,0.07),
  inset -2px 0 0 rgba(0,0,0,0.18),
  0 3px 4px rgba(0,0,0,0.42);
```

Auf Projektionsdistanz frisst ein weicher Schatten die Kante, statt Tiefe zu
erzeugen. Auf einem Monitor gilt das weniger streng, aber die Kachel ist die
Wiedererkennung der Marke und sollte gleich aussehen.

### Bewegung

Es gibt einen Hausbestand mit Rollen UND Dauerbereichen:

```
--qq-enter      cubic-bezier(0.22, 1, 0.36, 1)      Auftritte       480-680 ms
--qq-exit       cubic-bezier(0.4, 0, 1, 1)          Verlassen       200-280 ms
--qq-state      cubic-bezier(0.4, 0, 0.2, 1)        Hover/Farbe     160-240 ms
--qq-carry      cubic-bezier(0.34, 1.05, 0.5, 1)    durch den Raum  700-800 ms
--qq-celebrate  cubic-bezier(0.34, 1.56, 0.64, 1)   Hero-Beat       500-700 ms
--qq-press      cubic-bezier(0.3, 0, 0.4, 1)        Tap              90 ms
```

Dazu die schaerfste Regel des Hauses: **Overshoot nur fuer den EINEN Hero-Beat
pro Bildschirm.** Auf einer Landing heisst das: hoechstens ein Element darf
ueberschwingen, alles andere kommt ruhig.

### Die Avatare

48 Motive, 1024x1024, RGBA, in `frontend/public/avatars/cozyquiz/`
(640 px) und `.../klein/` (160 px). Wenn die Landing sie zeigt:

```css
.avatar { width: 72px; height: 72px; object-fit: contain; display: block; }
```

Schatten nur per `filter: drop-shadow(0 4px 5px rgb(0 0 0 / 22%))`, **nie**
`box-shadow` — der schattet die rechteckige Bildflaeche statt der Silhouette.

⚠️ Der Wecker ist seit 2026-08-27 **raus**. Sein Original hatte ein
eingebranntes Transparenz-Karo im Tragegriff, Wolf hat die **Waermflasche**
(`hot-water-bottle`) als Ersatz geliefert. Die defekte Datei liegt unberuehrt
unter `design-assets/avatare-v5-original/defekt/`. Der Satz hat weiter 48
Motive. Wer alte Screenshots wiederverwendet: die Uhr gibt es nicht mehr.

---

## 4. Was ABSICHTLICH anders bleibt

Nicht alles angleichen. Diese Unterschiede sind Entscheidungen, keine Fehler:

| | App | Landing | warum |
|---|---|---|---|
| Pink | `#EC4899` | `#FA4BA3` | Marketing-Pink, per Logo-Pixelmessung |
| Wortmarke | Bricolage | League Spartan | die Marke selbst, nicht die Arbeitsschrift |

Tokens der Landing liegen zentral in `src/brand.ts` (`BRAND`, `EMAIL`,
`FORMSPREE_ID`, `PLAY_URL`).

---

## 5. Das Feedback von aussen, und meine Gegenrede

Wolf hat eine Rueckmeldung weitergegeben. Was daran gilt und was nicht:

### Unterschrieben

* **„Das Spiel hinter dem Abend"** ist der staerkste Punkt. Ein Abschnitt mit
  drei Bildern nebeneinander (Beamer, Team-Handy, Moderator), darueber „Ein
  System, drei Perspektiven", darunter zwei Saetze. Kostet wenig, verbiegt das
  Kundenversprechen nicht, und liefert die zweite Ebene, um die es geht.
* **Vier belegbare Ungereimtheiten**, alle nachpruefbar:
  „Gruender & Quizmaster" steht zweimal; im FAQ wechselt die Anrede zwischen
  „ihr/eure" und „du/deine"; „Fuer Gruppen von 10 bis 100 Personen" gegen „ab
  sechs Personen" im Geburtstagstext; „Gratis fuer Test-Teams" steht
  gleichwertig neben dem Haupt-CTA und nimmt dem Hero Wertigkeit.
* **Positionierung vor Design.** Eine Seite, die klar sagt was sie ist, sieht
  danach fast automatisch besser aus.

### Widersprochen

* **„Die Seite spricht Firmen, Geburtstage und Bars gleichzeitig an."** Das
  gilt fuer die STARTSEITE, nicht fuer die Seite: `/firmen`, `/locations` und
  `/feiern` sind eigene Routen mit eigenen Texten. Die Trennung existiert
  schon. Damit ist die Aufgabe „eine Startseite ordnen", nicht „eine Seite
  umpositionieren" — ein erheblicher Unterschied im Umfang.
* **„Beamer und Sound bringe ich mit verstaerkt den Dienstleistungscharakter."**
  Fuer einen Barbetreiber ist genau dieser Satz der Kaufgrund. Wer ihn
  streicht, um ein Digitalunternehmen zu beeindrucken, verbiegt die Seite fuer
  Onilo — wovor derselbe Text zwei Absaetze spaeter zu Recht warnt. Der Satz
  bleibt, er darf nur nicht die einzige Tonlage sein.

### Mein eigener Zusatz

Die vorgeschlagenen fuenf Schlagworte (Game Design, UX, Realtime Multiplayer,
Moderation, Produktentwicklung) sind austauschbar. Der Effekt entsteht durch
**Zahlen, die stimmen**: „ueber 1300 Stunden Entwicklung", „drei Ansichten, ein
Server, ein Zustand", „48 Avatare in sechs Kategorien". Der Rezensent schreibt
selbst, dass die spielbare Frage auf der Seite staerker wirkt als zehn Absaetze
Marketing. Dasselbe Prinzip.

---

## 6. Die drei Bilder fuer „Das Spiel hinter dem Abend"

Sie entstehen im Repo `kioskquiz`, nicht hier. Beamer, Team-Handy und
Moderator sind drei Routen derselben App:

```
/beamer      die Leinwand
/team        das Handy
/moderator   das Steuerpult   (PIN-Gate)
```

Der Harness (`scripts/lib/buehne.mjs`) faehrt die Buehne an jede Station des
Abends und macht Aufnahmen bei 1760x990. `node scripts/motion.mjs --liste`
zeigt alle Stationen.

Fuer den Abschnitt braucht es **denselben Spielmoment aus drei Blickwinkeln**,
sonst wirkt es zusammengesetzt. Der ergiebigste Moment ist die laufende Frage:
auf der Leinwand steht sie gross, auf dem Handy stehen die vier Antworten, im
Steuerpult laeuft die Uhr.

---

## 7. Reihenfolge

1. **Bestandsaufnahme.** Repo klonen, alle sieben Routen aufnehmen, ansehen.
   Erst danach entscheiden: Anstrich oder Umbau. Nicht mit dem Umbau anfangen,
   solange „die Seite hat noch das alte Design" eine Erinnerung ist und kein
   Bild.
2. **Die vier Ungereimtheiten** — billig, belegbar, sofort.
3. **Startseite ordnen** (nicht die ganze Seite umpositionieren).
4. **„Das Spiel hinter dem Abend"** einbauen, sobald die Bilder da sind.
5. **Design angleichen**, mit Abschnitt 4 als Ausnahmeliste.

---

## 8. Hausregeln, die auch dort gelten

* Deutsche Oberflaeche, Umlaute direkt tippen. **Keine Em-Dashes**, auch nicht
  in Antworten an Wolf.
* Alles zweisprachig (DE + EN), wenn die Seite es schon ist.
* Nach jeder Aenderung committen und pushen.
* Assets ausmessen, nicht schaetzen.
* **Erst rot, dann gruen.** Einen Missstand belegen, bevor er behoben wird.
  Am 2026-08-26 hat sich zweimal herausgestellt, dass ein Punkt aus dem Plan
  laengst erledigt war und die Arbeit ins Leere gegangen waere.
