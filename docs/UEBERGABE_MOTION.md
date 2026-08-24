# Uebergabe: Bewegung. Stand 2026-08-24

> Einstieg fuer die naechste Sitzung. Der Design-Durchgang der Buehne ist durch,
> als naechstes kommt die **Bewegung**, Station fuer Station durch den Abend.
>
> Vorgelagert und weiter gueltig: `docs/UEBERGABE_DESIGN.md` (Auftrag und
> Randbedingungen), `docs/BUEHNEN_DESIGN.md` (Regeln), `docs/MOTION_REFERENZEN.md`
> (Referenzen und die Bausteinliste B1-B11). `todo.md` bleibt die einzige Quelle
> fuer offene Punkte.

---

## 0. Wolfs Arbeitsweise, damit sie nicht verhandelt werden muss

Woertlich am 2026-08-24: **„wir werden sammeln, brainstormen wo was hinpasst,
einfuegen, entscheiden und gegebenenfalls optimieren"** und **„es soll dieses mal
richtig stark werden"**.

Dazu die Schleife, die sich im Design-Durchgang bewaehrt hat und die weiter gilt:

> **Ansicht pruefen → bauen → Vorher/Nachher zeigen → Wolf winkt durch.**

Und der Satz ueber allem, Regel null: **„Ist das fuer die BUEHNE gebaut?"**
2,8 m Bildbreite, gelesen aus zehn Metern, dunkler Raum.

Wolfs Entscheidung vom 2026-08-24 zur Reihenfolge, und sie spart viel Zeit:

> „fuer die motion waere auch eine artefakt ansicht gut, jedes mal in den beamer
> einbauen, am beamer einfangen waere overkill, oder? zumindest am anfang zum
> entscheiden"

Also: **ausgewaehlt wird im Artefakt, eingebaut wird nur, was gewinnt, geprueft
wird am echten Beamer.** Nicht jeden Kandidaten erst bauen, um ihn zu verwerfen.

---

## 1. Wo die Bewegungen liegen

**Die Bausteinliste B1-B11: `docs/MOTION_REFERENZEN.md`, Abschnitt
„Bausteinliste, aus der gewaehlt wird".** Ausgewertet aus vier Referenzen, die
Wolf selbst gesammelt hat (superplay.co, nodeck.online, mana, Twitch Turbo).
Jeder Baustein mit Herkunft, Aufwand und Zielort.

Das gemeinsame Prinzip aller vier steht dort in einem Satz und ist wichtiger als
jeder einzelne Effekt: **etwas bleibt stehen, waehrend sich der Rest aendert.**
Wer nur den Effekt kopiert und den Anker weglaesst, bekommt wieder eine Diashow.

| # | Baustein | Wo es zuerst hingehoert | Stand 24.08. |
|---|---|---|---|
| B1 | Bogen-Wisch statt Schnitt beim Phasenwechsel | Frage nach Aufloesung | als naechstes |
| B2 | Nie ein leeres Bild: alte Szene geht sichtbar ab | alle Szenenwechsel | Station 1, Kandidat K1 |
| B3 | Durchskalieren und im Grund aufloesen | Runden-Intro, Progress Tree | Station 1, Kandidat K3 |
| B4 | Durchlaufendes Objektfeld ueber Szenengrenzen | Buehne generell | offen |
| B5 | Marker-Geste fuer die richtige Antwort | Aufloesung | als naechstes |
| B6 | Wortweiser Textaufbau mit Platzhaltern | Frageanzeige | offen |
| B7 | Requisiten als Zustandstraeger | mit dem Avatarset | offen |
| B8 | Anker-Prinzip: ein Element ueberlebt jeden Wechsel | Wolf auf der Buehne | Station 1, Kandidat K2 |
| B9 | Schrift auf Kreisbahn, halbe Umdrehung | Kategorie-Kranz, Runden-Intro | offen |
| B10 | Karten drehen herein statt zu erscheinen | Reveals, Kategorie-Karten | offen |
| B11 | Grundblende: Flaeche wechselt, Inhalt laeuft weiter | Frage zu Frage | Station 1, Kandidat K2 |

**Die Lautstaerke-Treppe**, ebenfalls aus den Referenzen, entscheidet mehr als
die Auswahl selbst: *je haeufiger ein Uebergang laeuft, desto leiser gehoert er
gesetzt.* Frage zu Frage laeuft fuenfzehnmal am Abend (B11, leise). Die
Aufloesung genauso oft, darf aber eine Geste haben (B5). Der Rundenwechsel
viermal, darf gross sein (B3). Der Auftritt am Anfang laeuft einmal und darf
alles.

**Zweite Quelle, aelter, und ACHTUNG: die Seite gibt es nicht mehr.** Die frueher
hier empfohlene Seite `/animations` (`AnimationsLabPage.tsx`) wurde am
2026-07-08 mit `9d028288` geloescht („tote Lab-/Demo-Seiten loeschen"). Diese
Uebergabe hat bis zum 24.08. weiter darauf verwiesen; nachgeprueft und
korrigiert.

Der INHALT ist trotzdem noch da, nur nicht mehr als Seite:

* Wolfs Urteile ueber die einzelnen Demos stehen in `SESSION_LOG.md`
  (Zeilen um 360-375), zum Beispiel „**M (Game-Show, live)**" und
  „N (Spark - Wolf abgelehnt)". Slot P ist die Fliegende Kartoffel, die als
  Hot-Potato-Bild die Slot-Machine ersetzt hat.
* Der gebaute Code der 28 Kandidaten laesst sich mit
  `git show 9d028288^:frontend/src/pages/AnimationsLabPage.tsx` wieder
  herausholen.

**Die Motion-Werkstatt (Artefakt):**
https://claude.ai/code/artifact/6f1e7fc4-460e-422f-975a-9a883c8e2cc6
Enthaelt den gemessenen Ist-Zustand von Station 1, drei Kandidaten live
nebeneinander (einzeln, alle gleichzeitig, Zeitlupe 0,4x) und die volle
Bausteinliste. Quelle liegt NICHT im Repo (Artefakte werden aus dem Scratchpad
veroeffentlicht); wer sie neu braucht, baut sie aus diesem Dokument nach.

---

## 2. Der erste gemessene Befund, und er ist der Startpunkt

Aufgenommen mit dem neuen Werkzeug auf der echten Buehne:

```bash
node scripts/motion.mjs willkommen --film --fenster-ms=4200 --frisch
```

**Station 1, Wechsel Lobby → Willkommen, gemessen:**

| Zeit | Was passiert |
|---|---|
| 365 ms | die alte Szene ist weg |
| 1200 ms | erstes Element der neuen Szene (`qqIntroWelcomeCard`) |
| 1600 ms | Titel beginnt (`qqIntroTitleLetter`, gestaffelt bis 2020) |
| 2600 ms | Wolf (`qqIntroWolfStack`) |
| 3200 ms | Unterzeile (`qqWordFadeUp`, gestaffelt bis 3600) |
| 4154 ms | Folie steht |

**Dazwischen liegen 835 ms, in denen auf 2,8 m Bildbreite praktisch nichts
steht.** Genau der Punkt, den Baustein B2 benennt. Das ist keine Vermutung,
sondern der Kontaktbogen.

Die drei Kandidaten dagegen (alle im Artefakt spielbar):

* **K1 · B2 · Der Abgang** — die alte Szene geht sichtbar weg, nach oben und
  kleiner, waehrend die neue von unten schon unterwegs ist. 1640 ms.
* **K2 · B11 + B8 · Grundblende mit Anker** — die Wortmarke ueberlebt den
  Wechsel, sie wird nicht neu aufgebaut, sie waechst nur an ihren neuen Platz.
  1320 ms, die einzige Fassung ohne einen einzigen leeren Moment.
* **K3 · B3 · Durchskalieren** — die alte Szene faehrt auf den Betrachter zu und
  loest sich im Grund auf, die neue kommt aus der Tiefe nach. 1560 ms.

**Wolf hat noch nicht entschieden.** Das ist der naechste Schritt.

---

## 3. Das Werkzeug fuer Bewegung

### `scripts/motion.mjs`

```bash
node scripts/motion.mjs willkommen --inventar          # was laeuft hier?
node scripts/motion.mjs frage --film --fenster-ms=2400 # Kontaktbogen
node scripts/motion.mjs --liste                        # alle 32 Stationen
```

**`--inventar`** liest `document.getAnimations()` aus der laufenden Seite und
meldet Name, Dauer, Verzoegerung, Kurve, Wiederholung und Ziel. Das ist die
Wahrheit zur Laufzeit, nicht die Vermutung aus dem CSS. Willkommen hat danach
80 laufende Animationen aus 18 verschiedenen Keyframes.

**`--film`** legt einen Kontaktbogen an: N Bilder ueber ein Fenster, jedes mit
seiner **echten** Zeit beschriftet, ueber CDP-Screencast. Der Ausloeser laeuft
innerhalb der Aufnahme, sonst faengt der Streifen die Bewegung erst in der Mitte
auf.

**Zwei Fallen, beide schon hineingetreten und behoben. Nicht wiederholen:**

1. Die Kurve steht **nicht** in `getTiming().easing`. Von dort gelesen meldet
   jede Animation der App „linear", was heissen wuerde, das ganze Haus laeuft
   ohne Beschleunigung. Auf Effekt-Ebene ist `easing` die Vorgabe; die echte
   Kurve haengt als `animation-timing-function` am Element.
2. Ein Kontaktbogen aus `page.screenshot()` in einer Schleife ist **unbrauchbar**:
   gemessen 570 ms pro Bild. Aus einem 4200-ms-Fenster werden 6798 ms und der
   Streifen zeigt zwoelfmal den Endzustand. Screencast statt Screenshots.

### `scripts/lib/buehne.mjs`

Browser, Socket, Raumaufbau, die 32 Stationen des Abends und die Helfer, die
dorthin fahren. Wird von `beamer-view.mjs` **und** `motion.mjs` benutzt, damit
beide denselben Abend fahren. Wer ein drittes Werkzeug baut: hier andocken, nicht
kopieren.

### `scripts/beamer-view.mjs`

Standbilder, Kaesten messen (`--dom`), Textgrade zaehlen (`--grade`). Seit dem
Umbau nur noch das, was mit dem BILD passiert.

**`--frisch` ist Pflicht bei jedem ernst gemeinten Lauf.** Es setzt den Raum
zurueck UND entfernt die Bots. Ohne das erbt jeder Lauf still die Teams des
allerersten Laufs (siehe Abschnitt 5).

---

## 4. Was am 2026-08-24 gebaut wurde

Alles auf `main` und auf `claude/buehne-2a-uebergabe`, beide Zweige zeigen auf
denselben Commit.

| Commit | Inhalt |
|---|---|
| `fb75ca5e` | Raender oben und unten: Schau mal und Zwischenstand |
| `c98fbc42` | Statuszeile und Fragehoehe, eine Kante und eine Hoehe auf allen Fragen |
| `2eb52614` | Antwortbereich mittig, Frage bleibt oben fest |
| `bd950d66` | Aufloesungen auf dieselbe Kante wie die Fragefolie |
| `15bfad7a` | Harness: Unterspiele der Bunten Tuete in `--kategorie` dokumentiert |
| `4ca9a095` | Heute spielen: Kachel zeigt wieder den Avatar, nicht sein Kuerzel |
| `a757612d` | Buehnen-Maschine nach `lib/buehne.mjs` |
| `065d9cfc` | `motion.mjs`: sehen, was sich bewegt |

Frueher am selben Tag (vor dem Kontextwechsel): Regel-Folien laufen voll und
schalten nach 15 s selbst weiter (`d0973228`), 161 Zeichen entfringt
(`48ecc841`), CozyGames-Zeichen in den Regeln (`360c3a82`), Design und
Emoji-Set als Standard „CozyQuiz" (`b2f1238e`).

### Die Zahlen, gemessen statt geschaetzt

| Was | Vorher | Nachher |
|---|---|---|
| Schau-mal-Bildrahmen | x28 y32, 1704x944 (drei verschiedene Raender) | x28 y28, 1704x934 |
| Statuszeile Fragefolie | x16 y16, 1728x204 | x28 y28, 1704x96 |
| Oberkante Fragetext | y246 / y284 / y341 / y483 je Kategorie | y150 auf allen |
| Antwortbereich Mu-Cho | y617 | y405, endet 685, Team-Reihe ab 839 |
| Kategorie-Pille Aufloesungen | x50 y26 bzw. x48 y22 | x28 y28 auf allen dreien |
| Zwischenstand-Streifen (Fenster 1470x908) | 2x 41 px Kategorie-Gold | keine |

---

## 5. Erkenntnisse, die Zeit kosten, wenn man sie nicht kennt

### Der immer gleiche Verdrahtungsfehler

`isThemed()` heisst **nicht** „Buehne", sondern „nicht Cozy" und umfasst Studio
Mono, Soft Pop und Neo-Brutalism. Wer die Buehne meint, muss sie benennen
(`getActiveThemeId() === BUEHNE_THEME_ID`). Dieselbe Klasse: `isCozyLook()` und
`isQuirkTileSet()`, das der Buehnen-Pruefung *fast* entspricht.

### Set-Ketten laufen in rohen Text aus

Mehrere Stellen loesen den Avatar aus `team.emoji` ueber eine Kette von
`isXSlug()`-Pruefungen auf und enden mit `if (t.emoji) return <>{t.emoji}</>`.
Wer ein neues Avatar-Set einzieht und diese Ketten nicht anfasst, bekommt das
Kuerzel als Text in die Kachel. **Das ist 2026-08-24 zum dritten Mal passiert**
(vorher 07-03 die Wappen, 07-21 die Woelfe, jetzt CozyQuiz). Bekannte Fundorte:
`CozyQuizTeamsRevealView.tsx` (`avatarInner`) und `QQTeamAvatar.tsx`
(`CountryFlagOrEmoji`). Beide sind jetzt versorgt.

### Zwei Bezugsgroessen auf einem 16:9-Bild ergeben drei Raender

`cqw` (Breite) und `cqh` (Hoehe) fuer verschiedene Seiten desselben Kastens ist
die Ursache fast aller schiefen Raender dieser Sitzung. **Ein Wert, ein Bezug,
alle vier Seiten**: `QQ_BUEHNE_RAND` in `qqTheme.ts`, hergeleitet aus der
Zeitleiste (12 px Leiste plus 16 px Luft, Oberkante 28).

Ebenfalls falsch: `vh` innerhalb der Buehne. Die Buehne wird skaliert, `vh` misst
das echte Browserfenster; der Abstand laeuft dann gegen die Skalierung statt mit
ihr.

### Der Beamer wird im Browser beurteilt, und der ist nicht 16:9

`SlideStage` skaliert mit `min(w/1760, h/990)`. Bei jedem anderen
Seitenverhaeltnis bleiben oben und unten Streifen frei, die zeigen, was der
Phasen-Root malt. Ein Fehler, der auf 16:9 null Pixel gross ist, kann im Browser
40 px hoch sein. Dafuer gibt es `--fenster=1470x908`.

### Der Harness hat zweimal etwas anderes gemessen als den Abend

1. `dev/fillTeams` bekommt die Avatar-Kuerzel des aktiven Sets als `setAvatars`
   vom Moderator-Frontend. Der Harness hat das Feld nie mitgeschickt.
2. `qq:resetRoom` setzt das **Spiel** zurueck, behaelt die Teams. `dev/fillTeams`
   meldet danach „added: 0, total: 8" und trotzdem 200.

Beides zusammen: alle Aufnahmen vor dem 24.08. zeigten einen Avatar-Pfad, den am
Abend niemand sieht. Beides ist in `--frisch` behoben.

### Raum-Reset niemals ueber `rm`

`rm -f backend/.qq-rooms/*.json` ist **wirkungslos**: der Server schreibt seine
offenen Speicherungen beim Herunterfahren noch einmal weg. Reset laeuft ueber den
Socket (`qq:resetRoom`), Bots ueber `dev/clearBots`.

---

## 6. Was jetzt ansteht

1. **Station 1 entscheiden.** K1, K2 oder K3 aus der Motion-Werkstatt. Danach
   einbauen und mit `motion.mjs --film` gegenpruefen: der Streifen muss zeigen,
   dass die 835 ms Leere weg sind.
2. **Weiter durch den Abend**, Station fuer Station, in derselben Schleife.
   Reihenfolge der Stationen siehe `motion.mjs --liste`.
3. **B1 + B5 an der Aufloesung.** Steht in `MOTION_REFERENZEN.md` als „erster
   Kandidat, wenn nichts dagegen spricht": beide klein, beide ohne neue
   Abhaengigkeit, beide an einer Stelle, die pro Abend zwanzig Mal laeuft und
   heute hart schneidet.
4. **„Das Brett faellt"** (`55db717d`) liegt gebaut auf dem Zweig, wurde aber
   **vorgezogen** und ist von Wolf nie abgenommen worden. Gehoert in den
   Motion-Durchgang eingereiht und dort beurteilt.
5. **Danach erst** `/team` (nur Einzelheiten, nicht der Aufbau) und die
   Hotkey-/Stream-Deck-Runde. Beides ausdruecklich nach Design und Motion.

### Offene Fragen an Wolf

* Soll `cozyGamesEnabled` bei echten Events auf AN stehen? Im Raum ist es per
  Vorgabe AUS, kein Entwurf schaltet es an.
* Das Beispielraster auf der Regel-Folie zeigt auf der Buehne graue Kacheln statt
  Teamfarben.
* `CozyGuessrReveal` (die Karte beim Geo-Raten) malt in der Aufloesung einen
  eigenen Grund ueber die Kategoriefarbe, gleiche Klasse wie der behobene
  Zwischenstand. Dort deckt die Karte fast alles ab, faellt also kaum auf.
  Nicht angefasst, weil nicht gemessen und nicht gemeldet.
* Das Avatar-Raster auf dem Handy (`CountryFlagOrEmoji`) hat den CozyQuiz-Zweig
  jetzt, war im aktuellen Handy-Ablauf aber nicht erreichbar. Geschlossene
  Luecke, kein nachgewiesener Fehler. Beim Handy-Durchgang pruefen.

---

## 7. Die Skills, und warum sie fehlen

CLAUDE.md verlangt fuer Design- und Motion-Arbeit die Skills `ui-ux-pro-max`,
`animate` und `color-contrast`. **In einer Web-Sitzung sind sie nicht da.**

Nachgemessen am 2026-08-24: eine Web-Sitzung laeuft in einem Container in der
Cloud. Dorthin synchronisiert werden nur Skills aus dem **claude.ai-Konto**
(gefunden: docx, import-memory, morning, pdf, pptx, skill-creator, xlsx). Wolfs
eigene Skills liegen unter `C:\Users\hornu\.claude\skills` auf seinem Rechner und
sind von dort aus nicht erreichbar. Der Egress-Proxy blockt ausserdem fast alle
Domains (`collectivebrain.de` gibt 403); erreichbar sind unter anderem
`raw.githubusercontent.com`, `registry.npmjs.org` und `fonts.googleapis.com`.

**Zwei Wege, die funktionieren:**

* **Skills ins Repo legen**, unter `.claude/skills/<name>/SKILL.md`. Der
  Mechanismus laeuft hier nachweislich, `.claude/skills/session-start-hook/`
  liegt bereits im Repo. Damit kommen sie mit jedem Klon mit und gelten in jeder
  Sitzung.
* **Lokal arbeiten** (`claude` im Repo-Ordner im Terminal). Dann sind Wolfs
  Skills da, das Netz ist offen, und er kann waehrenddessen den echten Beamer
  unter `localhost:5173/beamer` im eigenen Browser mitlaufen lassen. Fuer
  Bewegungs-Feintuning ist das der deutlich bessere Ort.

Solange sie fehlen: aus Wolfs eigenen Referenzen arbeiten und messen. Das ist
kein Ersatz, aber es ist nachpruefbar.
