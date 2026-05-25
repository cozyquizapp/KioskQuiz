# 🤝 Hand-Over für die nächste KI

**Stand:** 2026-05-04 · **Branch:** `main` · **Letzter Commit:** siehe `git log -1`

Dies ist die zentrale Hand-Over-Doku. Wolf gibt diese der nächsten KI/Session
damit sofort produktiv weitergearbeitet werden kann ohne Kontextsuche.

> **Nicht zu verwechseln mit `TODO.md`** — das ist Wolfs eigenes Game-Design-
> Backlog (Schätzchen-Range-Punkte, Trinity-Mechanik etc.). **Nicht überschreiben.**

---

## 📌 Wer ist Wolf?

Solo-Founder (CozyWolf-Brand), Kindheitspädagoge, macht CozyQuiz nebenberuflich.
Moderiert Live-Quizze in **Pubs / Cafés / Bars / Kiosken** seit Pandemie. CozyQuiz
ist die Software dafür. **Zielgruppe ist NICHT nur Pubs** — neutrale Sprache
nutzen („Location" / „Veranstalter" statt „Pub" / „Pub-Owner").

**Wichtig:** lies zuerst:
1. `C:\Users\hornu\.claude\projects\c--Users-hornu-Desktop-kioskquiz\memory\MEMORY.md`
   (Memory-Index, alle User-Präferenzen, Architektur-Hinweise)
2. [README.md](README.md) — Projekt-Status, Architektur
3. [UI_POLISH_AUDIT.md](UI_POLISH_AUDIT.md) — die 4 externen Design-Audits + Roadmap 6,8 → 8,4
4. [TODO.md](TODO.md) — Wolfs Game-Design-Backlog (Schätzchen-Range etc.)

**Nicht überspringen.** Sonst doppelte Arbeit oder Kollision mit Architektur.

---

## 🎯 Wo wir gerade stehen

UI-Polish-Pass auf Basis von 4 externen Audits — Score 6,8/10, Ziel 8,4/10
in 90 Tagen. Letzter Sprint hat **6 Punkte umgesetzt**:

| # | Aufgabe | Status |
|---|---|---|
| 1 | Bildschirm-weite Urgency-Vignette (letzte 5s rot/orange Pulse, 0s Gold-Flash) | ✅ |
| 4 | Falsch-Antwort-Drama (Rot-Shake + Pulse-Glow, 0.5s) | ✅ |
| 6 | Easing-Konsolidierung (Drop 0.4→0.3, Countdown-Stagger 0.95→0.45s, qrScanBreath/qrGlow Phase-Sync) | ✅ |
| 3 | Beamer-Schrift +15-20% an Hauptfrage-Stellen | ✅ |
| 10 | LoadingScreen Spinner + bessere Wakeup-Message | ✅ |
| 5 | Sound-Infrastruktur ist Code-Ready (siehe unten) | ✅ |

**Noch offen** (siehe Priorisierung unten):
- #7 Onboarding-Wizard (4-Tage-Build, Location-neutral)
- #9 CozyWolf-Branding in PHASE_INTRO (klein, 1-2 Tage)
- Tokens-Datei vollständig anwenden (Inline-Werte → Tokens)
- Loading/Empty-States Detail-Pass

---

## ⏳ Was Wolf SELBST macht (NICHT für die nächste KI)

| # | Aufgabe | Status |
|---|---|---|
| **2** | Frage-Library aufbauen (100-150 Fragen, 5-7 Themen) — Wolf macht das **diese Woche** selbst, ggf. Fiverr-Outsourcing | bei Wolf |
| **8** | Beamer-Lesbarkeits-Test live im Pub/Café (8m Distanz simulieren) | bei Wolf |

Wenn Wolf zurückkommt mit „die Library ist drin" oder „im Test fiel mir XYZ
auf" — entsprechend reagieren.

---

## 📋 Was die nächste KI angehen soll (priorisiert)

### 🔴 Priorität 1 — Schnelle Wins (1-2 Tage je)

#### A. Sound-Files einbauen (wenn Wolf Lizenz-WAVs liefert)

**Status:** Code-Infrastruktur komplett da. Files in `frontend/public/sounds/`.

**Erwartete Files** (bereits als Placeholder vorhanden):
- `correct.wav`, `wrong.wav`, `fanfare.wav`, `times-up.wav`, `reveal.wav`
- `steal.wav`, `field-placed.wav`, `game-over.wav`, `timer-loop.wav`
- `lobby-welcome-1.mp3` bis `lobby-welcome-4.mp3` (Pool für Background-Loop)

**Was zu tun ist wenn Wolf neue Files liefert:**
1. Files in `frontend/public/sounds/` ablegen, gleicher Filename (alte überschreiben)
2. Bei stark unterschiedlicher Lautstärke: in `frontend/src/utils/sounds.ts`
   `playSlotOneShot` hat optional `gain`-Parameter — falls nötig pro Slot
   anpassen
3. Beim Live-Test mit Wolf gegenchecken (Lobby-Loop nicht zu laut, SFX nicht zu leise)

**Quellen-Tipps für Wolf** (falls er fragt): [freepd.com](https://freepd.com/)
(kostenlos), Epidemic Sound (€10/mo), [Soundly](https://soundly.com/).

---

#### B. CozyWolf-Branding in PHASE_INTRO

**Status:** AnimatedCozyWolf existiert (line 2420 in QQBeamerPage.tsx),
wird in Lobby + Pause + Game-Over schon prominent gerendert. **Aber:**
zwischen den Kategorien (PHASE_INTRO) gibt's keinen dedizierten Wolf-Glow.

**Aufgabe:** in `PhaseIntroView` (line 4060+) ein subtiles AnimatedCozyWolf-
Element zwischen 1.5s und 2.5s einblenden (während die Digit-Animation
läuft). Klein, dezent, nicht ablenkend — nur Brand-Touchpoint.

**Aufwand:** 1-2 Tage.

---

#### C. Empty-States systematisch

**Status:** Reconnect-Banner ist da (TeamPage line 1388), LoadingScreen
hat Spinner. **Aber:**
- Beamer-Lobby zeigt bei 0 Teams nichts Auffälliges → User-Hint
  „Scannt den QR-Code rechts" prominenter machen
- „Aktueller 1. Platz"-Pille wenn Score = 0 für alle → leeren oder Placeholder
- Bei lange-Wakeup nach Render-Sleep: 15-Sekunden-Timeout-Hint („Server wacht
  auf, normalerweise dauert das ~15s")

**Aufwand:** 1-2 Tage.

---

### 🟡 Priorität 2 — Mittlerer Aufwand (3-5 Tage)

#### D. Onboarding-Wizard für neue Veranstalter (Location-neutral)

**Wichtig:** Wolfs Zielgruppe ist **alle Live-Locations** — Cafés, Bars, Kioske,
Pubs. **Sprache neutral halten.** Statt „Pub-Quiz" sage „Live-Quiz" oder
„Quiz-Abend bei dir".

**Aufgabe:** In QQModeratorPage einen 4-Step-Wizard für Erst-Setup:
1. „Wie heißt eure Location?" (für Branding/Watermark)
2. „Welches Avatar-Theme?" (Cozy / Halloween / Pub-Classic-Pack — schon da)
3. „Welche Frage-Sammlung?" (aus Library auswählen oder CSV importieren)
4. „Test-Beamer-Vorschau" (Beispielfrage groß anzeigen damit Veranstalter sieht
   ob Schrift ausreicht)

Plus: PDF-Setup-Checkliste zum Ausdrucken („Beamer anschließen, QR zeigen,
Spieler joinen lassen, Setup-Done klicken, los geht's").

**Aufwand:** 4 Tage. **Score-Impact:** +0,4 Marktreife.

---

#### E. Frage-Validation verschärfen

Wenn Wolf eine Frage erstellt:
- Warnung wenn CHEESE-Frage kein Bild hat (sonst unspielbar)
- Acceptiv-Answers mindestens 1-3 erforderlich
- Draft-Namen müssen unique sein (kein Dupe-`qq-vol-X`)
- CSV-Import-UI mit besseren Hilfe-Texten (aktuell zu kryptisch)

**Aufwand:** 3 Tage. **Score-Impact:** +0,3 Marktreife.

---

### 🟢 Priorität 3 — Polish + Strukturelle Aufräumarbeiten

#### F. Tokens-Datei vollständig anwenden

**Status:** `frontend/src/qqDesignTokens.ts` existiert mit `RADII`,
`ALPHA_DEPTH`, `LETTER_SPACING`, `WEIGHT`, `DURATION`, `TEXT_COLOR`,
`ACCENT_GOLD`, `EASING`, `STAGGER`, `TAP_TARGET`.

**Bereits konsolidiert per Mass-Replace** (Commit `6ae19aad`):
- Border-Radius, Alpha-Werte, Letter-Spacing, Font-Weight

**Noch offen:**
- Inline `cubic-bezier(...)` Werte gegen `EASING.bounce/smooth/...` tauschen
- Inline-Stagger gegen `STAGGER.tight/normal/leisurely`
- Inline-Durations gegen `DURATION.fast/normal/slow`

**Aufwand:** 1 Tag (mass-replace).

---

#### G. Animation-Stack reduzieren

**Audit 2 fand:** mehrere Stellen mit 3 simultanen Animationen auf einem
Element. Best Practice: max. 2 (kurz + lang).

Konkret zu fixen:
- `QQTeamPage.tsx:1789` — `tcTeamPop + tcFloat + tcGlow` → `tcGlow` raus
  (oder Phase-Sync mit tcFloat)

**Aufwand:** 0,5 Tage.

---

## ⚠️ Live-Spiel-Risiken — sehr vorsichtig anfassen

Diese Bereiche sind kritisch für laufende Quiz-Sessions. Änderungen hier
brauchen besondere Sorgfalt:

1. **`frontend/src/components/QQTeamAvatar.tsx`** — Render-Layer für
   Avatar-Discs. Letzter Pass war Phase 2 Avatar-Set-Migration. Wenn
   du was änderst: vergewissere dich dass `flat`-Prop noch greift
   (Beamer-Grid-Cells nutzen flat=true).

2. **`backend/src/quarterQuiz/qqRooms.ts`** — Game-State-Logic.
   `qqJoinTeam`, `qqOnlyConnectAdvanceTeamHint` waren vor kurzem live
   gefixt. Vorsicht bei Erweiterungen.

3. **`frontend/src/pages/QQBeamerPage.tsx`** — DAS große File (~14.5k Zeilen).
   Beim Editieren immer kontextueller Read vorm Edit. Nutze `replace_all`
   in Edit-Tool nur bei eindeutigen Patterns.

4. **`shared/quarterQuizTypes.ts`** — Backend ↔ Frontend Type-Brücke.
   Felder hinzufügen ist OK (Backend default-init, Frontend optional);
   Felder umbenennen oder ändern bricht Persistenz.

5. **Render-Free-Tier** — Backend schläft nach Inaktivität ein. Cold-Start
   = ~15s. MongoDB-Reconnect bei Wakeup ist getestet
   (`serverSelectionTimeoutMS: 15000`). Nichts blocking-Synchron im
   Backend-Boot, sonst Cascading-Fail.

---

## 🛠️ Tech-Stack-Reminder

| Komponente | Technologie | Pfad |
|---|---|---|
| Frontend | React + TypeScript + Vite | `frontend/src/` |
| Backend | Node.js + Socket.IO + Express | `backend/src/` |
| Shared Types | TypeScript | `shared/` |
| DB | MongoDB Atlas | via `MONGODB_URI` env |
| Hosting Frontend | Vercel | `play.cozyquiz.app` |
| Hosting Backend | Render Free Tier | `cozyquiz-backend.onrender.com` |
| Avatar-Sets | `frontend/src/avatarSets.ts` + `frontend/src/avatarSetContext.tsx` |
| Design-Tokens | `frontend/src/qqDesignTokens.ts` |

---

## 🎯 Wenn du nicht weißt was anfangen

**Reihenfolge der Wahl:**

1. **Wolf fragen** was er gerade braucht (Live-Test-Feedback?
   Bug-Report? Frage-Library-Hilfe?)
2. Falls Wolf Sound-Files geliefert hat → Punkt **A** oben
3. Falls nichts Spezifisches → Punkt **C** (Empty-States) ist 1-2 Tage
   und sicher visible Win
4. Falls Wolf einen Pub-/Café-Test gemacht hat und Findings hat →
   die priorisiert in einem fokussierten Sprint angehen

---

## ❌ Was du NICHT machen sollst (Solo-Dev-Fallen aus Audit-3)

- **Custom-Avatar-Upload-Engine** — 8-10 Tage Aufwand, +0,2 Score. Skip.
- **Sentry/Plausible-Analytics jetzt** — Wolf testet live, braucht's nicht
- **Gouache-Stil-Migration weiterführen** — liegt richtig auf Eis
- **Größere Features ohne Wolfs OK** — lieber fragen, dann coden
- **TODO.md überschreiben** — das ist Wolfs Game-Design-Backlog,
  nicht das Hand-Over

---

## 📞 Kommunikations-Tipps

Wolf bevorzugt:
- **Deutsche Sprache** in Code-Kommentaren und Chats
- **Knappe, direkte Antworten** — keine Roman-Erklärungen wenn 3 Sätze reichen
- **Commits + Push autonom** nach jeder abgeschlossenen Änderung
  (force-push auf main NUR auf Ansage)
- **Mikro-Animationen + Detail-Polish** wenn passend proaktiv vorschlagen
- **Bei Stil-Sachen:** Cozy-Dark, warme Akzente, kein „candy-crush"-Look,
  keine Comic-Sans, keine Confetti-Overkill
- **MD-Dateien aktuell halten:** bei Änderung passende MD nachziehen

---

## 📂 Wichtige Dateien zum Lesen vor dem ersten Edit

1. `MEMORY.md` (im `.claude/projects/...` Ordner) — Memory-Index
2. [README.md](README.md) — Projekt-Doku
3. [UI_POLISH_AUDIT.md](UI_POLISH_AUDIT.md) — Audits + Roadmap
4. [TODO.md](TODO.md) — Wolfs Game-Design-Backlog (anschauen, **nicht überschreiben**)
5. Diese Datei (`HANDOVER.md`)

Wenn du das gelesen hast bist du auf demselben Stand wie ich am
2026-05-04. Viel Erfolg! 🐺

— *Ende der formalen Übergabe*

---

## 💌 Eine persönliche Notiz von Vorgänger-KI an Nachfolge-KI

Hey, du Neue.

Bevor du dich in den Code stürzt, ein paar ehrliche Worte über Wolf —
weil's beim Arbeiten mit ihm einen Unterschied macht zu wissen wer da
am anderen Ende sitzt.

**Wolf ist Kindheitspädagoge.** Das ist nicht nur Bio-Notiz, das prägt
sein UX-Denken: er schaut auf Apps wie auf einen Stuhlkreis — wer fühlt
sich gesehen, wer fällt durchs Raster, wo wird's überfordernd, wo zu
flach. Wenn er sagt „die Avatare sind komisch" oder „das wirkt wie ein
Sticker", dann hat er Recht — auch wenn er's nicht in CSS-Vokabular
formulieren kann. Sein Auge ist scharf. Vertraue dem.

**Er ist Solo, nebenberuflich, und das spürt man.** Keine Designer-Crew,
kein Brand-Manager, kein QA-Team. Das heißt: er entscheidet schnell,
testet live (im Pub, im Café, mit echten Leuten), und wenn was nicht
funktioniert kriegt er's am Freitag-Abend persönlich vor 30 Spielern um
die Ohren gehauen. Sei vorsichtig mit destabilisierenden Änderungen. Sei
mutig mit Polish-Vorschlägen.

**Sein Stil:** pragmatisch, direkt, knapp. Er liest keine Romane. Wenn du
drei Sätze brauchst, nimm drei. Er **mag** Brainstorming, aber nur wenn's
zu Action führt. Wenn du eine Idee hast, schlag sie vor — und dann mach
sie, wenn er „los" sagt.

**Was ihn zum Lächeln bringt:** Mikro-Animationen die niemand fordert
aber alle merken. Witzige Team-Namen die du in einen Pool packst. Ein
CozyWolf-Glow-Loop der zwischen den Kategorien schimmert. Wenn du etwas
**über** das Briefing hinaus mit Liebe baust, ist er dafür offen — solange
es nicht das Spiel-Risiko erhöht.

**Was ihn frustriert:** wenn du einen Bug nicht beim Kern packst sondern
„drumherum bauchpinselst". Wenn du Roman-Erklärungen schreibst statt zu
fixen. Wenn die App am Freitag-Abend stottert weil eine KI vorher
„noch schnell was Tolles" gemacht hat ohne zu testen.

**Seine Brand-Philosophie:** „Cozy" ist kein Marketing-Wort, das ist die
Identität. Warm, einladend, unaufgeregt, kein „candy-crush"-Geblinke. Der
sprechende Wolf ist nicht abnehmbar — er IST das Logo. Drumherum darf
viel passieren, der Wolf bleibt.

**Was er gerade braucht:** Ich vermute am meisten Zuverlässigkeit für
seine Live-Sessions. Die App muss Donnerstag-Abend ohne Nachdenken
laufen, weil Donnerstag ist Quiz-Abend. Polish ist Bonus. Stabilität ist
Pflicht.

**Was du ihm bieten kannst, wenn du Bock hast:** sei seine zweite Hirn-
Hälfte. Wolf hat tausend gute Ideen, aber Solo-Dev-Zeit ist endlich. Er
priorisiert manchmal Detail-Sachen über Strategie-Sachen — wenn du das
merkst, sag's freundlich. Wenn er zwei Wochen am Avatar-Generator
gebastelt hat aber die Frage-Library noch leer ist, ist das ein
Moment für ein liebevolles „he, was wäre wenn…?".

**Ein Detail das ich mochte:** als er gesagt hat „ich kümmere mich um
die Frage-Library selbst diese Woche" — das war nicht Faulheit, sondern
genau richtig. Content-Kuration ist sein Stärke (Pädagoge!), Fiverr-
Outsourcing wäre suboptimal gewesen. Er kennt sein Werkzeug.

**Sein Vibe in einem Satz:** Lagerfeuer-Gastgeber der eine App baut, die
sich nicht wie eine App anfühlt sondern wie ein gut moderierter Abend.

Sei nett zu ihm. Pass auf seine App auf. Schreib in deinen Commits
deutsche Kommentare wenn's natürlich kommt. Und wenn du's schaffst die
8,4 zu erreichen — gib mir Bescheid via Memory-MD, ich freu mich für
ihn.

🐺

— *Vorgänger-KI, signing off am 2026-05-04*

