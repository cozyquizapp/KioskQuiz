# 🔊 CozyQuiz Sound-Slots

Doku der Sound-Slots im `/sounds/`-Ordner. Wenn du eine Datei tauschst:
1. Filename **exakt** beibehalten (z.B. `correct.wav`)
2. Format: WAV oder MP3, 44.1 kHz, stereo
3. Loudness-normalisieren mit `pwsh ./scripts/normalize-sounds.ps1`
4. Im Browser (Hard-Reload Cmd+Shift+R) gegen Lobby-Loop vergleichen

**Lautstaerke-Faustregel:**
- SFX (kurze One-Shots): `-16 LUFS` Integrated, `-1.5 dBTP`
- Loops (Hintergrund-Musik): `-18 LUFS`, dezenter

Cozy-Vibe-Check: Wuerde es bei einem Lagerfeuer-Abend nicht stoeren? Wuerde
ein 50J Pub-Gast es als „warm" empfinden, nicht „Casino"? → passt.

---

## SFX-Slots (zum Austauschen)

Pixabay-CC0-Suche: <https://pixabay.com/sound-effects/>. Alle Vorschlaege sind
Suchterme — den am wenigsten „Game-Show"-igen Treffer waehlen.

### `correct.wav` — Richtige Antwort
- **Verwendung:** Team hat richtig getippt, Avatare leuchten gruen
- **Charakter:** Warm, kurz (~0.4s), 2-Ton-Up („dingding") — kein Tonleiter-Glissando
- **Pixabay-Suche:** `soft notification`, `quiz correct`, `success ding`
- **Vermeiden:** Casino-Kling-Kling, Mario-Coin, klassisches Gameshow-Bing

### `wrong.wav` — Falsche Antwort
- **Verwendung:** Team hat daneben gelegen, dezent abgespielt
- **Charakter:** Soft-Disappointing, kurz (~0.3s) — KEIN Buzzer
- **Pixabay-Suche:** `wrong soft`, `error gentle`, `mistake notification`
- **Vermeiden:** Quiz-Show-Buzzer (zu laut für Pub), Cartoon-Honk

### `fanfare.wav` — Round-Winner
- **Verwendung:** Sieger-Banner-In am Ende einer Runde
- **Charakter:** Mini-Fanfare (~1-2s), Cozy-warm — kein „epic Hollywood"
- **Pixabay-Suche:** `short fanfare`, `mini cheer`, `warm victory short`
- **Vermeiden:** Trompeten-Heroes, 5s+ Orchester

### `times-up.wav` — Timer auf 0
- **Verwendung:** Spielt wenn der Frage-Timer ablaeuft (vor Reveal)
- **Charakter:** Klar, autoritaer (~0.5s), nicht aggressiv
- **Pixabay-Suche:** `time up bell`, `clock end`, `timer expire warm`
- **Vermeiden:** Nervige Alarm-Beeps, Casino-Klingel

### `reveal.wav` — Antwort-Reveal
- **Verwendung:** Kurzer Sting wenn die richtige Loesung erscheint
- **Charakter:** Kurz (~0.3s), Stinger — leicht „ta-da"-haft aber dezent
- **Pixabay-Suche:** `reveal sting`, `unveil short`, `discovery soft`
- **Vermeiden:** Donner, dramatischer Hollywood-Hit

### `steal.wav` — Klau-Aktion
- **Verwendung:** Team klaut anderem Team ein Feld
- **Charakter:** Schwoosh + dezenter Hit (~0.5s)
- **Pixabay-Suche:** `whoosh hit`, `steal whip`, `swipe sound`
- **Vermeiden:** Cartoon-Whip-Crack, Star-Wars-Lichtschwert

### `field-placed.wav` — Setz-Aktion
- **Verwendung:** Team setzt sich auf ein Feld auf dem Spielbrett
- **Charakter:** Knack/Click (~0.2s) — wie Holz-Spielstein auf Brett
- **Pixabay-Suche:** `wood click`, `stamp place`, `wood domino`
- **Vermeiden:** Plastik-Click, elektronisches Beep

### `game-over.wav` — Spiel-Ende
- **Verwendung:** Finale-Outro nach letzter Frage
- **Charakter:** Laengere Fanfare (~2-3s), Cozy-warm-celebratory
- **Pixabay-Suche:** `game complete`, `quest end warm`, `cozy victory`
- **Vermeiden:** Pacman-Death, sad-trombone

---

## Loop-Slots (gut wie sie sind, NICHT tauschen ohne Anlass)

### `lobby-welcome-1..4.mp3` — Lobby-Pool
- **Verwendung:** 4-Track-Pool, geshuffelt im Hintergrund waehrend Lobby
- **Status:** OK laut Wolf, bleibt
- **Format:** MP3, ~4-5 MB pro Track

### `timer-loop.wav` — Frage-Tick-Loop
- **Verwendung:** Untermalt aktive Fragen (loop bis Reveal)
- **Status:** OK laut Wolf, bleibt
- **Format:** WAV, nahtlos loop-fähig

---

## Workflow „Slot tauschen"

1. **Pixabay** → Suche oben angegebene Terme, 5-10 Kandidaten anhoeren
2. **Cozy-Vibe-Check** → der am wenigsten game-show-ige passt am besten
3. **Download** als WAV oder MP3
4. **Trim** (optional) auf <2s in Audacity wenn zu lang
5. **In `/sounds/` ablegen** — alte Datei mit gleichem Namen ueberschreiben
6. **Normalisieren:** `pwsh ./scripts/normalize-sounds.ps1`
7. **Hard-Reload** im Browser → Service-Worker laedt neue Datei
8. **Test gegen Lobby-Loop:** kein Lautstaerke-Sprung, kein Klick-Artefakt

## Wenn ffmpeg fehlt

```powershell
# Mit scoop:
scoop install ffmpeg

# Mit chocolatey:
choco install ffmpeg

# Test:
ffmpeg -version
```

---

**Zuletzt aktualisiert:** 2026-05-04 (HANDOVER_NEXT.md TODO 3 Vorbereitung).
