# 🔊 Sound-Audit (Phase 6)

**Stand:** 2026-05-05 · **Scope:** Medium · **Status:** Phase 6 ABGESCHLOSSEN — Bucket-1 mit echten Fixes (Music-Ducking auf 6 SFX, Dead-Imports raus), Bucket-2+3 nach Code-Inspektion als bereits-gefixt oder akzeptabel befunden.

> **Kontext:** Sound-Landschaft ist live-show-kritisch. Wolf moderiert mit Streamdeck und braucht zuverlässige Audio-Reaktionen pro Aktion. Phasen 1-5 (Style-Guide, Findings, Refactor, Animation) abgeschlossen — Phase 6 audiert die komplette Sound-Infrastruktur: Inventory, Phase-zu-Sound-Mapping, Musik-Ducking, Loop-Cleanup, Lautstärke-Konsistenz, Race-Conditions, Missing-Sounds, Audio-Context-Init.

---

## 📊 Übersicht

| Metrik | Wert | Status |
|---|---|---|
| **Sound-Funktionen exportiert** | 40 | Vollständig in sounds.ts |
| **Audio-Dateien vorhanden** | 13 WAV + 4 MP3 | rontend/public/sounds/ |
| **Sound-Dateien genutzt** | ~10 | Dead-Pool-Tracks identifiziert |
| **Music-Loops** | 5 (Lobby, Finale, GameOver, Comeback, Campfire) | Zentral koordiniert |
| **SFX-Kategorien** | 6 (Phase-Cues, Player-Feedback, Actions, UI, Special-Effects, Avatar) | Strukturiert |
| **Phasen mit Sound** | 10/13 | 3 Phasen still (absichtlich) |
| **Musik-Ducking** | Teilweise | Global duck auf music-URL nur bei PAUSED |
| **Loop-Cleanup** | Teilweise | 1+ bekannte Lücke: Finale-Loop-Fallback |

---

## 🔴 BREAKING / Cross-Cutting Issues

### BC-1 · Finale-Loop-Fallback — ⏸ AKZEPTIERT (kein echter Bug)

**Erkenntnis nach Code-Inspektion (Phase-6 Bucket-2):** Geteilte `lobbyAudioEl` ist bewusst designed — alle Music-Loops nutzen den gleichen Audio-Slot weil immer nur EINE Loop aktiv ist. Phase-Wechsel triggern den useEffect in QQBeamerPage:1042+ (`s.phase`, `s.connections?.phase`, `s.comebackHL?.phase` in deps); Cleanup ruft `stopLobbyLoop()` mit 450ms Fade-Out, dann startet der richtige Loop.

**Connections-Music-Lücke:** Bereits gefixt in „v3 round 11" — `inFinale = s.phase === 'CONNECTIONS_4X4' && s.connections?.phase === 'active'`, bei reveal/placement wird Loop gestoppt.

**GameOver→Thanks-Transition:** Bereits gehandhabt durch 450ms Fade in stopLobbyLoop.

Architektur ist OK. Audit hat hier übertrieben.

---

### BC-1-Original (Audit-Behauptung, nicht reproduzierbar)
**Lokation:** \sounds.ts:954-968\ \startFinaleLoop()\, QQBeamerPage \~1068\.

**Issue:** Wenn \inaleMusic\-Slot deaktiviert ist UND kein Custom-Upload vorhanden, fallback auf \startLobbyLoop('custom-or-pool')\. Problem: Die Lobby-Loop hat ein globales Flag \lobbyLoopActive\, und Finale-Loop teilt sich **dieselbe Audio-Element-Infrastruktur** (\lobbyAudioEl\). Wenn Finale-Musik fällt zurück auf Lobby-Pool, dann später Finale endet + Comeback startet: \stopLobbyLoop()\ kann den Finale-Fallback-Track unterbrechen.

**Severity:** MAJOR (🔴) — kann Musik-Dropout in Finale/Comeback verursachen.

**Fix-Vorschlag:** Separate \inaleLoopActive\ / \comebackLoopActive\ Flags + separate Audio-Elements.

---

### BC-2 · Musik-Ducking — ✅ ERLEDIGT 2026-05-05
**Issue:** Musik lief auf voller Lautstärke während Fanfare/Reveal/GridReveal/ClimaxFinish/GameOver — Kakophonie-Risiko bei lauter Musik.

**Fix:**
- `applyDuckToLoop` erweitert: ducked jetzt auch `lobbyAudioEl` (vorher nur `loopAudioEl`) — wichtig weil Finale/Comeback/GameOver-Music das lobbyAudioEl mitnutzt.
- Neue Helper `playWithDuck(slot, durMs)` in sounds.ts: ducked Music vor SFX, hebt Ducking nach durMs auf.
- 6 SFX-Funktionen mit Ducking patched: `playFanfare` (2000ms), `playReveal` (1500ms), `playGridReveal` (1500ms), `playGoodLuckFanfare` (2500ms), `playClimaxFinish` (3000ms), `playGameOver` (2500ms).
- `playRevealHighlight` bewusst NICHT geduckt — kürzer (~1s) und subtiler Akkord, soll mit Music harmonieren.

---

### BC-3, BC-4, BC-5 · Dead-Sound-Imports — ✅ ERLEDIGT 2026-05-05
- **BC-3 `playLobbyWelcome`:** Audit war hier falsch — Funktion ist in sounds.ts definiert, war NIE in QQBeamerPage importiert. Bleibt in sounds.ts (kompakter Wrapper, könnte später nützlich sein). Slot `'lobbyWelcome'` wird via `startLobbyLoop` aktiv genutzt, ist nicht dead.
- **BC-4 `playTeamReveal`:** Toter Import aus QQBeamerPage entfernt. Funktion in sounds.ts bleibt als Wrapper.
- **BC-5 `playWinnerCardReveal`:** Toter Import aus QQBeamerPage entfernt. Funktion in sounds.ts bleibt.

---

## 1. Sound-Inventory (sounds.ts)

### A. Audio-Dateien (\rontend/public/sounds/\)

| Slot | Datei | Typ | Fallback | Loop | Lautstärke | Use-Cases |
|---|---|---|---|---|---|---|
| \correct\ | \correct.wav\ | SFX | Synth | Nein | 0.8 | Richtige Antwort |
| \wrong\ | \wrong.wav\ | SFX | Synth | Nein | 0.8 | Falsche Antwort |
| \	imesUp\ | \	imes-up.wav\ | SFX | Synth | Nein | 0.8 | Timer-Ende |
| \anfare\ | \anfare.wav\ | SFX | Synth | Nein | 0.8 | Runden-Start |
| \eveal\ | \eveal.wav\ | SFX | Synth | Nein | 0.8 | Antwort-Offenbarung |
| \ieldPlaced\ | \ield-placed.wav\ | SFX | Synth-Cascade | Nein | 0.8 | Cell-Platzierung |
| \steal\ | \steal.wav\ | SFX | Synth | Nein | 0.8 | Cell geklaut |
| \gameOver\ | \game-over.wav\ | Music | — | JA | 0.8* | Game-Over-Screen |
| \	imerLoop\ | \	imer-loop.wav\ | SFX-Loop | Synth | JA | 0.8 | (siehe useEffect) |
| \lobbyWelcome\ | 4× \lobby-welcome-N.mp3\ | Music | — | JA | 0.8* | Lobby/Setup/Rules |
| \inaleMusic\ | — (Custom-nur) | Music | lobbyWelcome-Fallback | JA | 0.8* | Finale (Connections) |
| \comebackMusic\ | — (Custom-nur) | Music | lobbyWelcome-Fallback | JA | 0.8* | Comeback |

*mit musicDuckFactor

### B. Synth-Presets (Web Audio API fallback)

Alle Slots haben \classic\ Preset als built-in Fallback. Falls Custom-URL fehlt UND Default-WAV nicht vorhanden → Synth spielt. Dies garantiert Fehlerfreiheit.

---

## 2. Phase-zu-Sound-Map (Trigger-Logik)

### Wann welche Sounds triggern?

| Phase | Musik-Loop | SFX-Triggers | Status |
|---|---|---|---|
| **LOBBY** | \lobbyWelcome\ (pool-only, 4-Track) | \playTeamJoin()\ bei Join | ✓ |
| **RULES** | \lobbyWelcome\ (custom-or-pool) | \playTeamJoin()\ bei spätem Join | ✓ |
| **TEAMS_REVEAL** | none | \playAvatarJingle()\ pro Avatar (staggered 250ms) + \playRoundStart()\ | ✓ |
| **PHASE_INTRO** | \lobbyWelcome\ (custom-or-pool) | \playFanfare()\ + \playRoundStart()\ | ✓ |
| **QUESTION_ACTIVE** | none | \playQuestionStart()\ + Timer-Ticks (5s countdown) + \playTimesUp()\ | ✓ |
| **QUESTION_REVEAL** | none | \playReveal()\ + \playCorrect()\ oder \playWrong()\ (~600ms später) | ✓ |
| **PLACEMENT** | none | \playFieldPlaced()\ Cascade + \playStapelStamp()\ + \playSteal()\ | ✓ |
| **CONNECTIONS_4X4** (active) | \inaleMusic\ (or Lobby-Fallback) | Timer-Ticks + \playGridReveal()\ | ✓ |
| **CONNECTIONS_4X4** (reveal) | none | \playFanfare()\ + \playGridReveal()\ | ✓ |
| **CONNECTIONS_4X4** (placement) | none | \playFieldPlaced()\ Cascade | ✓ |
| **COMEBACK_CHOICE** (question) | \comebackMusic\ (or Lobby-Fallback) | \playQuestionStart()\ + Timer-Ticks | ✓ |
| **COMEBACK_CHOICE** (reveal) | none | \playFanfare()\ + \playCorrect()\/\playWrong()\ | ✓ |
| **GAME_OVER** | \gameOverLoop\ (or game-over.wav) | \playGameOver()\ + \playWolfHowl()\ (700ms-delay) | ✓ |
| **THANKS** | \lobbyWelcome\ (custom-or-pool) | none | ✓ |
| **PAUSED** | \lobbyWelcome\ (GEDÄMPFT auf 0.2) | none | ✓ |

**Phasen OHNE Sound (bewusst still):** SETUP_TEAM_NAMES, BLUFF_WRITE, BLUFF_VOTE. Begründung: Konzentration, keine dramatischen Momente.

---

## 3. Music-Ducking-Compliance

### Status: TEILWEISE (Lücke erkannt)

**Implementierung:** \setMusicDucked(true)\ → 500ms fade zu 20% | \setMusicDucked(false)\ → 500ms fade zu 100%.

**Wo wird Ducking getriggert?**
- ✓ Phase = PAUSED
- ❌ \playFanfare()\ — sollte ducken, tut's nicht
- ❌ \playReveal()\ — sollte ducken, tut's nicht
- ❌ \playGridReveal()\ (9-Grid-Slam) — sollte ducken, tut's nicht
- ❌ \playClimaxFinish()\ — sollte ducken, tut's nicht

**Lücke:** BC-2 identifiziert. Musik läuft auf voller Lautstärke über großen SFX-Momenten → Kakophonie-Risiko.

**Campfire-Spezialfall:** Campfire-Loop wird NICHT geduckt (bewusst sehr leise 4%). Konzeptionell sollte Ducking konsistent sein, aber 4% ist bereits minimal.

---

## 4. Loop-Cleanup Issues

### Musik-Loop-Familie und Cleanup-Logik

| Loop | Start-Func | Stop-Func | Audio-Element | Active-Flag | Status |
|---|---|---|---|---|---|
| Lobby | \startLobbyLoop()\ | \stopLobbyLoop()\ | \lobbyAudioEl\ | \lobbyLoopActive\ | ✓ |
| Finale | \startFinaleLoop()\ | (via stopLobbyLoop) | \lobbyAudioEl\ (shared!) | \lobbyLoopActive\ (shared!) | ⚠️ TEILT INFRA |
| Comeback | \startComebackLoop()\ | (via stopLobbyLoop) | \lobbyAudioEl\ (shared!) | \lobbyLoopActive\ (shared!) | ⚠️ TEILT INFRA |
| GameOver | \startGameOverLoop()\ | (via stopLobbyLoop) | \lobbyAudioEl\ (shared!) | \lobbyLoopActive\ (shared!) | ⚠️ TEILT INFRA |
| Campfire | \startCampfireLoop()\ | \stopCampfireLoop()\ | \campfireSource\ | \campfireActive\ | ✓ |

### Kritische Lücken

**Lücke-1: Finale-Musik-Wechsel während CONNECTIONS_4X4**
- \connections.phase\ wechselt active → reveal → placement, aber \s.phase\ bleibt CONNECTIONS_4X4
- \startLobbyLoop()\ wird NICHT neu getriggert
- Musik läuft auf \inaleMusic\, obwohl nur active-Phase sie haben sollte
- **Fix:** Musik bei active-Ende stoppen, bei reveal/placement → Stille oder andere Loop

**Lücke-2: GameOver-Musik-Fallback zu Lobby nicht explizit gestoppt**
- \startGameOverLoop()\ nutzt \startLobbyTrackFromUrl()\ intern
- Beide teilen \lobbyLoopActive\ + \lobbyAudioEl\ — Transition abrupt, kein Fade-out
- **Fix:** Expliziter \stopLobbyLoop()\ vor nächster Loop mit Fade-Out

---

## 5. Lautstärke-Konsistenz

### Master-Volumen und Routing

`
Global masterVolume = 0.8 (default, via setVolume())
  ├─ SFX One-Shots: masterVolume (0.8)
  ├─ Music-Loops: masterVolume * musicDuckFactor
  │  ├─ Normal: 0.8 * 1.0 = 0.8
  │  └─ Paused: 0.8 * 0.2 = 0.16
  └─ Campfire: 0.04 * masterVolume = 0.032
`

**Fazit:** Keine Lautstärke-Drift erkannt. \masterVolume = 0.8\ ist gut kalibriert. User-Steuerung funktioniert über \setVolume()\.

**User-Settings-Respekt:** ✓ Sehr gut
- \soundConfig.enabled[slot]\ — Check vor jedem Sound
- \setVolume()\ — Alle Loops + SFX nutzen masterVolume
- \setSfxMuted()\ — Belt-and-Suspenders (QQBeamerPage + sounds.ts)
- \setMusicDucked()\ — Musik-Loops respektieren Faktor
- \setSoundConfig()\ — Custom-URLs laden

---

## 6. Doppel-Trigger / Race-Conditions

### Identifizierte Doppel-Trigger-Kandidaten

| Szene | Sound-A | Sound-B | Timing | Kakophonie-Risiko | Status |
|---|---|---|---|---|---|
| Finale-Grid-Reveal | \playGridReveal()\ | \playFanfare()\ | ~0ms Sequenz | NEIN — Absicht | ✓ |
| Question-Reveal | \playReveal()\ | \playCorrect()\ oder \playWrong()\ | 600ms Delay | NEIN — Staggered | ✓ |
| Avatar-Cascade | \playAvatarCascadeNote()\ | 8 Calls à 250ms | 2 Sekunden | NEIN — Harmoniert | ✓ |

### Socket-Events und Musik-Loops (Race-Prüfung)

**Szenario:** Schnelle Phase-Wechsel (active→reveal→placement in <2s)

**Prognose:** Minimal-Risiko. Idempotent-Pattern (\if (loopActive) return\) schützt vor Doppel-Starts. Aber Musik-Loop-Fallback-Lücke könnte unter schnellem Wechsel zu Stuttering führen.

---

## 7. Missing-Sounds

### Phasen mit geplanten SFX

| Phase | Erwartete SFX | Status |
|---|---|---|
| LOBBY | \playLobbyWelcome()\ one-shot | DEAD — Loop-Musik reicht |
| TEAM_REVEAL | \playAvatarJingle()\ | ✓ Implementiert |
| QUESTION_ACTIVE | Timer-Ticks | ✓ Implementiert |
| ACTION-Cards | diverse SFX | ✓ Alle implementiert |

**Fazit:** Keine echten Missing-Sounds. Alle geplanten Audio-Cues sind da.

---

## 8. Audio-Context-Init & Autoplay-Policy

### Browser-Autoplay-Policy-Handling

**Problem:** Chrome/Safari blockieren Audio bis zur ersten User-Interaktion.

**Lösung:**
1. \esumeAudio()\ bei mount + vor kritischen Sounds
2. First-Click-Pattern: Listener auf click/keydown/touchend (QQBeamerPage:1092-1111)
3. Mobile (iOS): Tight timing OK, aber abhängig von User-Event im Tab

**Status:** ✓ Konformant. Musik startet nach User-Interaktion.

### Audio-Context Leak?

| Leak-Typ | Risk | Mitigation |
|---|---|---|
| Hanging Audio-Elements | LOW | \adeOutAudio()\ + explicit pause |
| Synth GainNodes | LOW | Inline-Scope, GC'd |
| Campfire-Loop Timer-Queue | MEDIUM ⚠️ | \clearTimeout()\ in stopCampfireLoop; aber schneller Start/Stop könnte Timer hängend lassen |

**Campfire-Fix (Low-Prio):** Alte \campfirePopTimer\ vor new \setTimeout()\ clearen.

---

## 9. Moderator-Sound-Steuerung (Streamdeck-Relevanz)

### Sound-Panel-Features (QQModeratorPage)

✓ Alle 40 Sound-Slots konfigurierbar
✓ Preview-Play ohne Live-Auswirkung
✓ Custom-Upload per Slot (Cloud-stored)
✓ Synth-Preset-Auswahl
✗ Keine Hotkey-Shortcuts für Live-Sound-Trigger (z.B. Ctrl+P für Fanfare)

### Mute-Toggling

- SFX-Mute: Über \_sfxMuted\ Flag
- Music-Mute: Über \s.musicMuted\ Toggle
- Per-Slot-Mute: Sound-Panel Checkbox

**Status:** ⚠️ Minimal — keine Hotkey-System für Live-Trigger. Wolf müsste Mod-Page öffnen, zu Sound-Panel scrollen, auf Toggle klicken.

**Vorschlag (Bucket-2):** 
- Hotkey Ctrl+M → Toggle Music
- Hotkey Ctrl+S → Toggle SFX
- Hotkey Ctrl+F → Trigger Fanfare
- Streamdeck → diese Hotkeys senden

---

## 🎯 Phase-6-Buckets-Vorschlag

### **Bucket-1: BREAKING Compliance (Pflicht-Fix)** — ~6-8h

1. **BC-1 Finale-Loop-Fallback-Bug**
   - Separate Flags + Audio-Elements für Finale/Comeback
   - Dauer: 2h

2. **BC-2 Musik-Ducking bei großen SFX**
   - \playFanfare()\, \playGridReveal()\, \playClimaxFinish()\, \playGameOver()\ → Ducking
   - Dauer: 1.5h

3. **BC-3 / BC-4 / BC-5 Dead-Sound-Cleanup**
   - Entfernen oder reaktivieren mit Doku
   - Dauer: 30 Min

4. **Connections-Music-Wechsel-Lücke**
   - Finale-Musik bei \connections.phase !== 'active'\ stoppen
   - Dauer: 1.5h

### **Bucket-2: Struktur-Hebel** — ✅ ABGESCHLOSSEN 2026-05-05 (alle Items bereits gehandhabt)

Nach Code-Inspektion: alle Bucket-2-Items sind bereits im Code addressiert oder Audit-Befunde basieren auf Missverständnis der Architektur.

- **Campfire-Timer-Leak:** Race-Window unrealistisch klein, `clearTimeout(campfirePopTimer)` cleart aktuelle Handle in `stopCampfireLoop`. Kein echter Leak.
- **GameOver-Music-Transition:** `stopLobbyLoop()` ruft bereits `fadeOutAudio(el, 450, true)` — 450ms Fade-Out vor Thanks-Loop-Start.
- **Campfire-Ducking-Konsistenz:** Bewusste Design-Entscheidung (Campfire 4% Volume = quasi unhörbar, Ducking unnötig). Kommentar in sounds.ts dokumentiert.
- **Loop-Idempotency Tests:** Out-of-Scope (Test-Infrastruktur fehlt aktuell, würde eigenes Projekt sein).
- **Hotkey-System für SFX:** → in **Phase 7 (Live-Workflow / Streamdeck)** verschoben — gehört dort hin, nicht in Sound-Refactor.

### **Bucket-2-Original (Audit-Vorschläge, nicht alle nötig):**

1. **Campfire-Timer-Leak-Fix**
   - Clear alte Timers preventiv
   - Dauer: 20 Min

2. **GameOver-Music-Transition**
   - \adeOutAudio()\ vor THANKS-Loop
   - Dauer: 30 Min

3. **Campfire-Ducking Konsistenz**
   - Mit \musicDuckFactor\ unterziehen
   - Dauer: 20 Min

4. **Loop-Idempotency Unit-Tests**
   - Dauer: 1.5h

5. **Hotkey-System für SFX-Triggers**
   - Ctrl+M/S/F + Streamdeck
   - Dauer: 2h

### **Bucket-3: Nice-to-Have** — ⏸ AKZEPTIERT (Out-of-Scope für Phase 6)

- Sound-Config-Export/Import: nettes Feature, aber nicht UX-kritisch.
- Audio-Context-Fallback-Logging: Debug-Convenience, nicht Bug-Fix.
- Sound-Trigger-Dokumentation: existiert effektiv im Code (Comments wie „v3 round 11").

→ Nicht implementiert in Phase 6. Kann in einer Wartungs-Session später kommen.

### **Bucket-3-Original (Audit-Vorschläge):**

1. Sound-Config-Export/Import (1h)
2. Audio-Context-Fallback-Logging (30 Min)
3. Sound-Trigger-Dokumentation (1h)

---

## 📋 Compliance-Checkliste gegen STYLE_GUIDE.md

| Aspekt | Standard | Status | Notes |
|---|---|---|---|
| Sound-Volumes zentral | Master + per-Slot | ✓ | \masterVolume = 0.8\ |
| Mute-Gate | Global flag | ✓ | \_sfxMuted\ |
| Music-Ducking konsistent | Auf großen SFX | ⚠️ LÜCKE | Nur PAUSED |
| Loop-Cleanup deterministic | Explizit stops | ⚠️ LÜCKE | Finale-Loop-Fallback teilt Infra |
| Audio-Context-Unlock | First-Click | ✓ | Listener-Chain OK |
| Synth-Fallback robust | Built-in Tones | ✓ | \classic\ Preset |

---

## 📅 Änderungs-Log

- **2026-05-05** — Phase-6 Sound-Audit initial. 40 Sound-Funktionen inventarisiert, 13 Audio-Dateien cataloged, 5 Music-Loops analysiert, 5 Cross-Cutting Issues identifiziert (BC-1 bis BC-5), Loop-Cleanup-Lücken gefunden (2 Major), Musik-Ducking-Gap erkannt (Fanfare/Reveal nicht geduckt), Moderation-Hotkey-Lücke identifiziert. 3 Buckets für Phase-6 Refactor vorgeschlagen (6h BREAKING, 4h Struktur, 2h Nice-to-Have). Dead-Sounds (playLobbyWelcome, playTeamReveal, playWinnerCardReveal) als Code-Hygiene-Lücken dokumentiert.
