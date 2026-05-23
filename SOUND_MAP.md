# 🔊 QQ Sound-Map

**Generiert: 2026-05-23** — vollständige Map aller Sound-Slots + ihrer Trigger-Locations im Code. Hilft beim Befüllen des Mod-Sound-Panels mit MP3s.

**Lesehilfe:**
- **Slot:** der Key in der QQSoundConfig (= Mod-Panel-Dropdown)
- **Funktion:** `play*()` aus `utils/sounds.ts`
- **Trigger-Locations:** wo im Code der Sound feuert (file:line)
- **Wann hörbar:** kurz erklärt was visuell passiert

---

## 🏠 LOBBY & SETUP

| Slot | Funktion | Wann hörbar | Triggers |
|---|---|---|---|
| `lobbyWelcome` | `playLobbyWelcome` | ❌ Defined but NEVER called from React | 0 |
| `teamJoin` | `playTeamJoin` | Wenn neues Team in Lobby joint | 2 (FinalBettingView + QQBeamerPage) |
| — | `playWolfHowl` | Distant Wolf-Howl: bei Lobby-Mount (700ms), GameOver (900ms nach Climax), 1× im Beamer-Idle-Stinger | 3 |

---

## 🎬 RULES & TEAM REVEAL (Pre-Game)

| Slot | Funktion | Wann hörbar | Triggers |
|---|---|---|---|
| `teamReveal` | `playTeamReveal` | Im FinalReveal-Component, NICHT im TeamsRevealView | 1 |
| `goodLuckFanfare` | `playGoodLuckFanfare` | Am Ende der Team-Cascade ("Heute spielen → Viel Glück!"), Connections-Start, FinalBetting, Comeback | 4 |
| — | `playWoodKnock` | Card-Slam-Thump bei Team-Reveal-Cards + Action-Cards (Place/Steal/Stack) | 2 |
| — | `playAvatarCascadeNote` | Pentatonik-Cascade pro Team beim Reveal (TeamsReveal, GameOver, Question-Bingo) | 8 |
| — | `playAvatarJingle` | 250ms-gestaffelt pro Avatar-Reveal | 1 (QQBeamerPage) |

> ⚠️ **Hinweis „Heute spielen"-Title:** Aktuell KEIN dedizierter Entry-Sound für den Titel — nur die per-Team-Cascade folgt danach. Wenn du da was rein willst, müsste ein `playReveal()`-Call im TeamsRevealView ergänzt werden (Code-Change nötig).

---

## 🎯 PHASE INTRO (Runden-Start)

| Slot | Funktion | Wann hörbar | Triggers |
|---|---|---|---|
| `roundStart` | `playRoundStart` | Beim Phase/Round-Wechsel (QQBeamerPage:846) | 1 |
| `actionMenuReveal` | `playActionMenuReveal` | ❌ Defined but NEVER called | 0 |
| `revealHighlight` | `playRevealHighlight` | Bei Cat-Reveal (intro step 2), Question-Reveal-Stages | **8** ⭐ |
| `gridReveal` | `playGridReveal` | Wenn Spielbrett am Anfang aufgedeckt wird | 2 |

---

## ❓ QUESTION ACTIVE

| Slot | Funktion | Wann hörbar | Triggers |
|---|---|---|---|
| `questionStart` | `playQuestionStart` | Bei Fragenstart (Standard) | 2 |
| `questionStart{Cat}` | `playQuestionStartFor(cat)` | Kategorie-spezifischer Fragenstart-Sound | 2 |
| `timerLoop` | (via `startTimerLoop`) | Hintergrund-Loop während Frage läuft | implizit |
| `timerTick` | `playTick` | Tick-Sound bei ≤10s Restzeit + Final-Reveal Race-Countdown + PhaseIntro Sub-Step + Buzz-In | **8** ⭐ |
| `timerUrgent` | `playUrgentTick` | Schneller Tick bei ≤5s Restzeit | 2 |
| `timesUp` | `playTimesUp` | Wenn Timer auf 0 fällt | 3 |

---

## ✅ ANSWER REVEAL

| Slot | Funktion | Wann hörbar | Triggers |
|---|---|---|---|
| `correct` | `playCorrect` | Richtige Antwort eines Teams | 3 |
| `correctSchaetzchen/Mucho/...` | `playCorrectFor(cat)` | ❌ Defined but NEVER called (Fallback over correct funktioniert trotzdem) | 0 |
| `wrong` | `playWrong` | Falsche Antwort / Time-Out | 3 |
| `wrong{Cat}` | `playWrongFor(cat)` | Kategorie-Wrong-Sound | 1 |
| `reveal` | `playReveal` | Antwort wird aufgelöst (Highlight grün), nach Special-Award-Reveal-1 | 2 |
| `reveal{Cat}` | `playRevealFor(cat)` | Kategorie-Reveal-Sound | 1 |
| `fanfare` | `playFanfare` | Sieger-Highlight nach Reveal, Final-Reveal-Schwester, GameOver, Phase-Trans (4×), CozyGame-Winner | **8** ⭐ |

---

## 📍 PLACEMENT / ACTION CARDS

| Slot | Funktion | Wann hörbar | Triggers |
|---|---|---|---|
| `fieldPlaced` | `playFieldPlaced` | Team setzt eine Zelle (📍 Place-Action), nach diversen Reveal-Flips | **8** ⭐ |
| `steal` | `playSteal` | Team klaut Zelle (⚡ Steal-Action) | 2 |
| `stapelStamp` | `playStapelStamp` | Stapel-Aktion (🏯 Stack), bei neuen "stuck"-Zellen, Wolf-Howl-Combo | 3 |
| — | `playScoreUp` | Wenn Team korrekt antwortet (Score-Bump) | 1 |

---

## 🦊 COMEBACK / SPECIAL VIEWS

| Slot | Funktion | Wann hörbar | Triggers |
|---|---|---|---|
| `comebackMusic` | (Loop) | Hintergrund-Loop in Comeback-Phase | implizit |
| — | `playClimaxFinish` | CozyGame-Winner, Comeback-Climax, Question-Wave-Last, GameOver-Winner | 6 |

---

## 🪅 COZY GAMES

| Slot | Funktion | Wann hörbar | Triggers |
|---|---|---|---|
| `cozyGameIntro` | `playCozyGameIntro` | Anticipation-Chime beim 🪅-Mount | 1 |
| `cozyGameWheelTick` | `playCozyGameWheelTick` | Während Glücksrad dreht | 1 |
| `cozyGameWheelStop` | `playCozyGameWheelStop` | Glücksrad stoppt (Snap) | 1 |
| `cozyGameStart` | `playCozyGameStart` | Cozy-Mini-Game beginnt | 1 |

---

## 🏁 FINAL REVEAL / RACE / PODIUM

| Slot | Funktion | Wann hörbar | Triggers |
|---|---|---|---|
| `specialAwardReveal` | `playSpecialAwardReveal` | 3× im Drumroll-Build-up zu Award-Reveals (Award 1/2/3) | 3 |
| — | `playTeamReveal` (im FinalReveal) | Pro Team beim Final-Reveal | 1 |
| `winnerCardReveal` | `playWinnerCardReveal` | Sieger-Card-Einblendung, Connections-Reveal, Race-GO | 3 |
| `raceCountdown` | `playRaceCountdown` | Vor dem Race startet | 1 |
| `raceLoop` | `playRaceLoop` | ❌ Defined but NEVER called direkt (wird via startRaceLoop intern getriggert) | 0 |
| `raceTeamFall` | `playRaceTeamFall` | Team scheidet aus im Race | 1 |
| `raceWinner` | `playRaceWinner` | Race-Winner-Moment | 1 |
| `racePodium` | `playRacePodium` | Treppchen-Einblendung | 1 |
| `gameOver` | `playGameOver` | ❌ Defined but NEVER called | 0 |

---

## 🎛️ UI / HOTKEYS / DIVERSES

| Slot | Funktion | Wann hörbar | Triggers |
|---|---|---|---|
| — | `playHotkeyFeedback` | Wenn du Mod-Hotkey drückst (F13/F14/Digit1-8/Space etc.) | **8+** (QQModeratorPage) |
| — | `playSynthPreset` | Synth-Engine für Slots ohne MP3 (Fallback) | dynamic |

---

## 🔍 Entfernte / nicht-im-React-Code-referenzierte Sounds

**2026-05-23 Update:** 4 nicht aufgerufene `play*()`-Funktionen wurden aus `sounds.ts` entfernt (Dead Code). Die Slot-Keys in `QQSoundConfig` bleiben erhalten — Wolfs eventuelle MP3-Uploads sind sicher und werden beim späteren Wire-Up wieder benutzt.

| Sound | Slot | Status |
|---|---|---|
| ~~`playLobbyWelcome`~~ | `lobbyWelcome` | Funktion 2026-05-23 entfernt. Slot bleibt. Wiederbeleben: Funktion + Call bei Lobby-Mount ergänzen. |
| ~~`playGameOver`~~ | `gameOver` | Funktion 2026-05-23 entfernt (`startGameOverLoop` übernimmt schon). Slot bleibt. |
| ~~`playActionMenuReveal`~~ | `actionMenuReveal` | Funktion 2026-05-23 entfernt. Heute übernehmen `playWoodKnock` + `playFieldPlaced/Steal/StapelStamp`. Slot bleibt. |
| ~~`playCorrectFor`~~ | `correct{Cat}` | Funktion 2026-05-23 entfernt. Generic `playCorrect` reicht. Kategorie-Slots bleiben (falls Wolf später per-Cat-Sound will, neuer Wrapper). |
| `playRaceLoop` | `raceLoop` | Bleibt — wird intern via `startRaceLoop()` getriggert. Slot wird befüllt sobald MP3 da ist. |

---

## 📊 Top-Usage-Sounds (kommen am häufigsten vor)

Diese hörst du am häufigsten — wenn du etwas Markanten hochlädst, wirkt's überall:

1. **`fanfare`** (8 Trigger) — Sieger-Moments + Phase-Transitions + GameOver
2. **`fieldPlaced`** (8 Trigger) — jeder Zellen-Place
3. **`revealHighlight`** (8 Trigger) — Cat-Reveals + Answer-Reveals
4. **`timerTick`** (8 Trigger) — letzte 10 Sek + Race-Countdown
5. **`correct`** (3 Trigger) — bei richtigen Antworten
6. **`wrong`** (3 Trigger) — bei falschen Antworten

> 💡 **Empfehlung:** Wenn du den Quiz markanter machen willst, fang mit diesen 6 Slots an. Jeder Upload ändert mehrere Spielmomente gleichzeitig.

---

## 🛠️ Sound nicht-zugeordnet (keine Slot-Datei für MP3-Upload)

Diese Sounds sind **Synth-only** (kein Mod-Panel-Slot):
- `playWolfHowl` — distant Wolf-Howl-Signature (custom Asset)
- `playWoodKnock` — Card-Slam-Thump (Synth)
- `playAvatarCascadeNote` — Pentatonik-Cascade (Synth)
- `playAvatarJingle` — Avatar-spezifischer Stinger (Synth)
- `playScoreUp` — Score-Bump (Synth)
- `playClimaxFinish` — Climax-Hit (Synth)
- `playHotkeyFeedback` — Hotkey-Click (Synth)

Wenn du da MP3-Slots haben willst → Code-Change in `shared/quarterQuizTypes.ts` (QQSoundSlot erweitern) + `sounds.ts` (Funktionen anpassen).
