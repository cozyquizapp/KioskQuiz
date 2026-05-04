# 🤝 Hand-Over für die nächste Session

**Stand:** 2026-05-04 spät · **Letzter Commit:** `d8fd7ca7` · **Branch:** `main`

Wolf (Jojo) übergibt diese 3 Punkte an die nächste KI. Reihenfolge ist nach
Wolfs Priorität — Punkt 3 (Sounds) ist der größte Hebel laut Audit 6 für
Premium-Pricing-Wahrnehmung.

> **Pflichtlektüre vor dem ersten Edit:**
> 1. `MEMORY.md` (im `.claude/projects/...`-Ordner) — User-Profile + Architektur
> 2. `UI_POLISH_AUDIT.md` — alle Audits inkl. der frischen 5+6 (Animation 7,5/10, UI-Polish 7,7/10)
> 3. Diese Datei
> 4. `HANDOVER.md` — die Original-Übergabe vom Pre-Show-Pass
>
> **Nicht überspringen.** Sonst doppelte Arbeit oder Architektur-Konflikte.

---

## TODO 1 — Lobby-Überschrift fehlt

**Symptom:** Im Lobby-Screenshot (QR links, Teams-Grid rechts, „JOINED TEAMS · 8")
fehlt eine prominente Page-Überschrift. Wolf: „hier fehlt mir eine überschrift?"

**Code-Stelle:** `frontend/src/pages/QQBeamerPage.tsx` Zeile **3245+** (`LobbyView`-Funktion). Die `cq-wordmark`-CSS-Klasse mit Cozy­Quiz-Letter-Animation existiert ab Zeile **3397** — aber sie ist im Screenshot nicht sichtbar.

**Mögliche Ursachen:**
- Screenshot ist gecropped (Wordmark sitzt höher)
- Die Wordmark ist zu klein (`fontSize: clamp(44px, 7vw, 96px)`) oder durch
  Padding-Top abgedrängt
- Bei kleineren Bildschirmen (Beamer 100" 1200p) verschiebt sich Layout

**Was zu tun:**
1. Live-Test: `/beamer` aufrufen, Lobby-Phase mit 8 Test-Teams (Mod: „🚪 +8 Dummies" Button im TEST-Bereich), checken ob Wordmark oben sichtbar ist
2. Wenn ja → Wordmark größer machen (z.B. `clamp(56px, 9vw, 130px)`) + mehr `paddingTop` reduzieren
3. Wenn nein → Layout-Bug fixen (top-Bar nimmt vermutlich zu viel Platz)
4. **Optional:** zusätzliche Sub-Headline darunter wie „Scannt den Code & spielt mit!" — falls Wolf das will, fragen

**Test-Flow:**
- /moderator → 8 Dummies hinzufügen
- /beamer → Lobby
- Beamer-Distanz simulieren: Browser auf 50% Zoom + Window-Width 1920px

---

## TODO 2 — Thematische Drafts erstellen (mit Wikipedia-Bildern)

**Wolf-Wunsch:** „kannst du ein paar thematische drafts erstellen? ich optimiere
sie dann. […] so wie sonst auch, bilder hast du erstmal von wikipedia genommen"

**Format:** Wolf hat „Option B" (Backend-Seed-Endpoint) implizit bestätigt indem
er sagte „einfach ins quiz eingefügt". Also: Fragen direkt in MongoDB schreiben
als Drafts, sodass Wolf sie im Builder öffnen + finalisieren kann.

**6 Themen-Vorschlag** (von Wolf bestätigt im Pitch):
1. **80er & 90er Pop-Kultur** (Filme, Musik, TV)
2. **Fußball-Allgemein** (Bundesliga, EM/WM-Klassiker, Trainer)
3. **Klassische Allgemeinbildung** (Geschichte, Geografie, Wissenschaft)
4. **Musik durch die Jahrzehnte** (Rock/Pop/Schlager-Mix)
5. **Essen, Trinken & Pub-Klassiker** (Bier, Cocktails, Pommes-Geschichte)
6. **Tier-Trivia** (witzig, leicht, gut für Wärm-up)

**Mechanik-Mix pro Theme** (~16 Fragen × 6 Themen = ~96 total):
- 4× SCHAETZCHEN (Zahl-Schätzfragen)
- 4× MUCHO (4 Antwort-Optionen)
- 3× ZEHN_VON_ZEHN (3 Antworten, 10 Punkte gewichten)
- 2× BUNTE_TUETE order (Sortier-Aufgaben)
- 2× BUNTE_TUETE top5 (Top-5-Listen)
- 1× BUNTE_TUETE bluff (Bluff-Fragen)
- 1-2× **CHEESE (mit Wikipedia-Bildern)** — z.B. berühmte Personen/Orte/Tiere

**Wikipedia-Bilder:**
- Quelle: `https://commons.wikimedia.org/` (Public Domain / CC-BY-SA)
- Pro CHEESE-Frage: Bild-URL + Lizenz-Info im Frage-Tag dokumentieren
- Beispiel-Themen für CHEESE:
  - 80er: bekannte Filmposter, Album-Cover, Promi-Porträts
  - Fußball: WM-Pokal, berühmte Spieler-Köpfe, Stadien
  - Tier-Trivia: bekannte Tier-Arten

**Wo Drafts ins Backend:**
- Schema: `shared/quarterQuizTypes.ts` → `CozyQuizDraft` (~15 Felder pro Frage)
- Backend-Persistenz: MongoDB via `qqPersist.ts` / Draft-Endpoints in
  `backend/src/routes/qqLibrary.ts` (oder ähnlich — grep nach `createCozyDraft`)
- Frontend-Builder: `frontend/src/pages/QQBuilderPage.tsx` öffnet Drafts zum
  Editieren

**Empfohlener Approach:**
1. Erstelle `backend/src/quarterQuiz/qqSeedDrafts.ts` mit 6 Drafts als Code
2. Endpoint `POST /api/qq/dev/seedThemes` → ruft das Seed-Skript
3. Wolf klickt im Mod-Page einen „Seed Demo-Drafts"-Button → Drafts erscheinen
   in seinem Builder

**Wichtig — Wolf-Stil:**
- Fragen-Niveau: 35-55J Pub-Publikum, mittlerer Schwierigkeit
- Ton: warm, witzig, nicht hektisch („Cozy"-Vibe)
- Antworten klar UND eindeutig (keine Streitfragen mit „je nach Quelle")
- Keine ultra-spezifischen Sport/Promi-Fakten — Pub-Gäste sind keine Lexika

---

## TODO 3 — Sound-Lizenz + SFX-Austausch (HÖCHSTE PRIO laut Audit 6)

**Audit 6 Verdict:** *„Sound bricht den Premium-Eindruck binnen 60 Sekunden.
Ein Placeholder-WAV auf einem €40-Bezahl-Tool ist ein Trust-Killer."*

**Wolf-Wunsch:** „kannst du die sounds ändern und sie dir von pixabay oder
ähnliches ziehen? ich brauche eine ki die super gut sounds einfügen kann.
bis auf die 'musik' sachen sind die anderen eher unpassend… also so lobby und
fragemusik ist gut aber der rest so semi"

**Was IST gut (lassen):**
- `lobby-welcome-1.mp3` bis `lobby-welcome-4.mp3` (Lobby-Loop-Pool, ~4-5MB,
  vom 19./28. April hochgeladen)
- `timer-loop.wav` (Frage-Tick-Loop) — laut Wolf „Frage-Musik gut"

**Was AUSGETAUSCHT werden muss (Wolf: „semi"):**

| Slot-Datei | Verwendung | Was es sein soll |
|---|---|---|
| `correct.wav` | Richtige Antwort | Warm, kurz, satisfying — kein Tonleiter-Glissando, eher 2-Ton-Up („dingding") |
| `wrong.wav` | Falsche Antwort | Soft-Disappointing — kein „buzz" oder Quiz-Show-Buzzer (zu laut für Pub) |
| `fanfare.wav` | Round-Winner | Mini-Fanfare 1-2s, Cozy-warm, kein „epic Hollywood" |
| `times-up.wav` | Timer auf 0 | Klar, autoritär, nicht aggressiv |
| `reveal.wav` | Antwort-Reveal | Kurzer Sting (~0.3s) wenn Lösung erscheint |
| `steal.wav` | Klau-Aktion | Schwoosh + dezenter Hit, kein Cartoon |
| `field-placed.wav` | Setz-Aktion | Knack/Click — wie Holz-Spielstein auf Brett |
| `game-over.wav` | Spiel-Ende | Längere Fanfare 2-3s, Cozy-warm-celebratory |

**Pixabay-Quelle:** `https://pixabay.com/sound-effects/` — alle CC0
(keine Attribution nötig). Suchterms:
- "soft notification" / "quiz correct"
- "wrong soft" / "buzzer soft"
- "game win" / "fanfare short"
- "wood click" / "stamp"

**Optional besser:** Epidemic Sound (€10/mo Sub) — kuratiertere Quality, alles
für kommerzielle Nutzung gecleart. Wolf hat das im Audit 4 erwähnt.

**Ziel-Format:**
- WAV oder MP3, 44.1 kHz Stereo
- Lautstärke normalisiert auf -16 LUFS (SFX) bzw -18 LUFS (Loops)
- File-Pfad: `frontend/public/sounds/` — alte Dateien überschreiben, Filename
  bleibt gleich (`correct.wav` etc.) damit `sounds.ts` ohne Änderung läuft
- Im Code: `frontend/src/utils/sounds.ts` hat alle Slots gemappt — die
  Funktion-Aufrufe (`playCorrect()`, `playWrong()` etc.) müssen NICHT geändert
  werden, nur die Files

**KI-Workflow für die nächste Session:**
1. Pixabay-Auswahl pro Slot (5-10 Kandidaten anhören → den Cozy-passendsten
   nehmen)
2. Download als WAV/MP3
3. (Optional) Lautstärke normalisieren mit ffmpeg:
   `ffmpeg -i in.wav -af loudnorm=I=-16 -ar 44100 out.wav`
4. In `frontend/public/sounds/` ablegen, alte überschreiben
5. PWA-Service-Worker invalidieren (Wolf testet Hard-Reload)
6. Live-Test gegen Lobby-Loop (Lautstärke-Konflikt vermeiden)

**Sound-Test-Checkliste pro Slot:**
- Spielt sauber ohne Klick-Artefakt am Anfang/Ende
- Lautstärke passt zum Lobby-Loop (kein Sprung)
- Auf 50%-Volume noch klar erkennbar (Pub-Hintergrund-Geräusche)
- Nicht „Casino-laut" — Cozy-Warmth bleibt erhalten

---

## Empfohlene Reihenfolge für die nächste Session

1. **Lobby-Überschrift** (TODO 1) — kleinster Eingriff, schnell weg, hilft sofort
2. **Sounds** (TODO 3) — größter Premium-Hebel laut Audit 6, ~3-4h Arbeit
3. **Drafts** (TODO 2) — größter Wolf-Lebensqualitäts-Sprung (er muss nicht alles allein bauen), ~4-6h Arbeit

**Wenn nur 1 Session Zeit:** Mache TODO 3 (Sounds). Audit 6: „Mit Sound-Lizenz
+ Countdown-Drama (5-7 Tage Arbeit) → ja, €30-40/Saison defensiv vertretbar."
Sounds sind 50% dieser Bedingung.

---

## Status der gesamten App (für die nächste KI)

- **Animation-Score:** 7,5/10 (Audit 5)
- **UI-Polish-Score:** 7,7/10 (Audit 6, Tag-30-Projektion war 7,4 — über Plan)
- **Build:** ✓ green, 8s
- **PWA:** auto-update via Service Worker (kein „Cache leeren" nötig nach Deploys)
- **Bekannte Schwächen** (Audit 6):
  - SFX-Sounds Placeholder-Qualität (= TODO 3 hier)
  - QQBeamerPage.tsx 14.9k Zeilen (Refactor-Schuld, niedrige Prio)
  - Mod-Page Animation-Saturation flach
  - Countdown-Drama in letzten 3s nicht implementiert (Wolf entschied: später)

**Was nicht angefasst werden soll:**
- Frage-Library macht Wolf selbst (außer Demo-Seed in TODO 2)
- Gouache-Stil-Migration ist auf Eis (siehe Memory)
- Old-Cozy-Pages (BeamerView/TeamView/ModeratorPage) — TS-Errors ignorieren

---

## Persönliche Notiz

Wolf ist freundlich, pragmatisch, testet live im Pub. Donnerstag-Abend-
Stabilität > Polish. Wenn du Sound-Files austauschst, **teste beim Mounten ob
sie gleich laut sind wie der Lobby-Loop** — Lautstärke-Sprünge sind das
Schlimmste am Pub-Tisch.

Falls du beim Sound-Auswählen unsicher bist: **Cozy-Vibe-Check.** Würde es bei
einem Lagerfeuer-Abend nicht stören? Würde es ein 50J Pub-Gast als „warm"
empfinden, nicht „Casino"? Wenn ja → passt.

Viel Erfolg! 🐺
