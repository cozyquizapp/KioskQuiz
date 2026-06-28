# Beamer-View — Stück-für-Stück-Review-Landkarte

Landkarte aller Beamer-Screens (Publikums-/Projektor-Ansicht) für den Design-Review.
Reihenfolge = grober Spielablauf. Jeder Screen: **Phase/Trigger → Komponente (Datei:Zeile) → was auf dem Schirm ist.**

**Zentraler Phasen-Router:** `frontend/src/pages/QQBeamerPage.tsx:1988-2018`
**Phasen-Typ `QQPhase`:** `shared/quarterQuizTypes.ts:95-111`

> ⚠️ **Deaktivierte Features** (Code existiert, wird aber NICHT angezeigt — beim Review überspringen):
> **Bluff**, **4 gewinnt** (onlyConnect), **Imposter** (oneOfEight), **Brett-Twists** Frost/Schild/Sanduhr/Tausch.
> Reveal-Dateien dazu liegen noch in `components/reveals/`, sind aber tot. Nicht mit-reviewen, außer Wolf reaktiviert sie.

---

## A — Vor dem Spiel

| # | Screen | Phase / Trigger | Komponente (Datei) | Inhalt |
|---|--------|-----------------|--------------------|--------|
| 1 | **Lobby (Pre-Setup)** | `LOBBY` & `!setupDone` | `PausedView` mode="preGame" · `CozyQuizPausedView.tsx` | Wolf-Co-Moderator + Rekorde-Panel, „gleich geht's los" |
| 2 | **Lobby (Join aktiv)** | `LOBBY` & `setupDone` | `LobbyView` · `CozyQuizLobbyView.tsx` | QR-Code mittig, beigetretene Team-Karten, Wolf-Greeter |
| 3 | **Welcome-Splash** | `RULES` & `rulesIdx === -2` | `QuizIntroOverlay` (inline QQBeamerPage) | Begrüßung + optionales Welcome-Video |
| 4 | **Regel-Intro-Übergang** | `RULES` & `rulesIdx === -1` | `RulesIntroOverlay` (inline) | Überleitungs-Slide vor erster Regel |

## B — Regeln & Team-Reveal

| # | Screen | Phase / Trigger | Komponente | Inhalt |
|---|--------|-----------------|------------|--------|
| 5 | **Regel-Karussell** | `RULES` (`rulesIdx ≥ 0`) | `RulesView` · `CozyQuizRulesView.tsx` | Multi-Slide-Präsentation; Slide-Anzahl hängt an `totalPhases`, Connections/CozyGames/Comeback-Toggles |
| 6 | **Teams-Reveal** | `TEAMS_REVEAL` | `TeamsRevealView` · `CozyQuizTeamsRevealView.tsx` | Epische Team-„Slot-Machine" (3-Akt), Wolf Augen auf |

## C — Pro Runde (wiederholt sich 2/3/4×)

| # | Screen | Phase / Trigger | Komponente | Inhalt |
|---|--------|-----------------|------------|--------|
| 7 | **Runden-Intro** | `PHASE_INTRO` (`introStep` 0-3) | `PhaseIntroView` · `CozyQuizPhaseIntroView.tsx` | 3-Akt: Runden-Zähler rollt rein → Kategorie-Baum-Sweep (5 Dots, Wolf-Hop) → Aktions-Karte (Platzieren/Klauen/Stapeln, 3D-Reveal bei neuer Fähigkeit) |

### C1 — Frage aktiv (Teams antworten, Timer läuft) · `QUESTION_ACTIVE`
Alle via `QuestionView` (`CozyQuizQuestionView.tsx`), Routing nach Kategorie:

| Kategorie | Marke | Anzeige |
|-----------|-------|---------|
| SCHAETZCHEN | Close Call 🎯 | Frage + Zielwert-Banner + Schätz-Range |
| MUCHO | Mu-Cho | Frage + Options-Grid |
| ZEHN_VON_ZEHN | All In | Frage + 10er-Options-Grid |
| CHEESE | Picture This | Frage + Bild |
| BUNTE_TÜTE | Lucky Bag | je nach Sub-Mechanik (siehe C3) |

Timer-Pille oben rechts (Shake bei ≤5s), `CozyQuizBeamerTimer.tsx`.

### C2 — Frage-Reveal (Antwort + Gewinner-Kaskade) · `QUESTION_REVEAL`
| Kategorie | Reveal-Komponente | Inhalt |
|-----------|-------------------|--------|
| SCHAETZCHEN | `reveals/SchaetzchenReveal.tsx` | Zielwert + Top-5 nächste Schätzungen (Distanz-Balken) + Gewinner-Karte |
| MUCHO | `MuchoOptionsReveal` (inline QQBeamerPage) | Options-Grid + Voter-Avatare-Kaskade + Lock-Grün + Gewinner |
| ZEHN_VON_ZEHN | inline `CozyQuizQuestionView` | 10er-Grid + Bet-Avatare pro Option + Gewinner |
| CHEESE | inline `CozyQuizQuestionView` | Bild + richtige Antwort + Gewinner |

### C3 — BUNTE-TÜTE-Sub-Mechaniken (Reveal)
| Sub | Marke | Reveal-Komponente | Status |
|-----|-------|-------------------|--------|
| top5 | Top 5 | `reveals/Top5Reveal.tsx` | aktiv |
| order | Fix It | `reveals/OrderReveal.tsx` | aktiv |
| map | Pin It / CozyGuessr | `reveals/CozyGuessrReveal.tsx` | aktiv (Leaflet-Karte + Distanz-Linien + Top-5) |
| hotPotato | Hot Potato | inline QQBeamerPage (`HotPotatoSlotMachine` ~2214-2350) | aktiv (Slot-Machine-Intro → Turn-Taking) |
| onlyConnect | 4 gewinnt | `reveals/OnlyConnectBeamerView.tsx` | ⛔ deaktiviert |
| bluff | Bluff | `reveals/Bluff.tsx` | ⛔ deaktiviert |
| oneOfEight | Imposter | inline `CozyQuizQuestionView` | ⛔ deaktiviert |

### C4 — Platzierung (Sieger setzt/klaut/stapelt) · `PLACEMENT`
`PlacementView` (`CozyQuizPlacementView.tsx`) → Grid mittig (`CozyQuizGridDisplay.tsx`) + ScoreBar rechts (`CozyQuizScoreBar.tsx`).
Cell-Flash bei gerade gesetzt/geklaut; Connect-Welle + Steal-Ruck-Animationen; 3D-Modus optional.
**Flash-Overlay:** `placementFlash` rendert kurz `PlacementView` mit `flashCell` (QQBeamerPage:1998-2000).

## D — Comeback (vor Runde 3)

| # | Screen | Phase | Komponente | Inhalt |
|---|--------|-------|------------|--------|
| 8 | **Comeback-Wahl** | `COMEBACK_CHOICE` | `ComebackView` · `CozyQuizComebackView.tsx` | Letztplatziertes Team wählt: Higher/Lower-Minigame ODER Platzieren×2/Klauen×1 |

## E — Finale

| # | Screen | Phase | Komponente | Inhalt |
|---|--------|-------|------------|--------|
| 9 | **Final-Tipps** | `FINAL_BETTING` | `FinalBettingView` · `CozyQuizFinalBettingView.tsx` | Intro-Slide → Tipp-Phase: jedes Team tippt auf anderes Team (Bonus) |
| 10 | **Connections 4×4** | `CONNECTIONS_4X4` | `ConnectionsBeamerView` · `CozyQuizConnectionsBeamerView.tsx` | 4×4-Begriffs-Grid, Sub-Phasen `intro/active/placement/complete`, Gruppenfarben, Strike-Counter |
| 11 | **Final-Reveal** | `FINAL_REVEAL` | `FinalRevealView` · `CozyQuizFinalRevealView.tsx` | Title-Hold → Grid-Reveal → Bet-Auflösung pro Team → Awards (Underdog/Speedy/Meisterklauer/Bet/Sympathie) → Sternenfeld-Race → Podium. Zwischen-Recap: `FinalRoundRecapSlide` |

## F — Mini-Game & Pause

| # | Screen | Phase | Komponente | Inhalt |
|---|--------|-------|------------|--------|
| 12 | **Cozy-Game** | `COZY_GAME` | `CozyGameView` · `CozyGameView.tsx` | Reales Zwischen-Minigame; Sub-Phasen in `cozyGame.phase` |
| 13 | **Pause** | `PAUSED` | `PausedView` · `CozyQuizPausedView.tsx` | Wolf-Co-Moderator + eingefrorene Rekorde/Leaderboard; Musik auf 20% geduckt |

## G — Spielende

| # | Screen | Phase | Komponente | Inhalt |
|---|--------|-------|------------|--------|
| 14 | **Game-Over** | `GAME_OVER` | `GameOverView` · `CozyQuizGameOverView.tsx` | Sieger-Spotlight → Standings-Tabelle → Bonus-Boxen → optional QR zur Summary; Wolf-Jubel + Konfetti |
| 15 | **Thanks** | `THANKS` | `ThanksView` · `CozyQuizThanksView.tsx` | Recap-Ticker + Sieger-Hero + QR zur Summary; Konfetti, Rekorde, Fun-Stats |

---

## Globale Overlays (phasenübergreifend, QQBeamerPage)

| Overlay | Trigger | Zeile | Inhalt |
|---------|---------|-------|--------|
| **Get-Ready-Countdown** | `getReady` (nach Pause-Resume / RULES→PHASE_INTRO) | 2055-2131 | Vollbild-Dim + Wolf + „Get ready" + 3-2-1 (CSS-only) |
| **Soft-Zoom-Flash** | `flashKey > 0` & nicht LOBBY | 2133-2159 | Radial-Dim + weicher weißer Blur-Puls (0.52s) zwischen Slides |
| **Timer-Urgency-Vignette** | `timerUrgent` & QUESTION_ACTIVE | 2041-2048 | Pulsierende rote Rand-Vignette bei ≤5s |
| **Konfetti** | Gewinner / Game-Over | — | `CozyQuizConfettiOverlay.tsx` |
| **Ambient** | Hintergrund | — | Fireflies / EurovisionHearts (`CozyQuizAmbient.tsx`), CategoryParticles (`CozyQuizCategoryParticles.tsx`) |

## Wolf-Komponenten (inline QQBeamerPage)
`AnimatedCozyWolf` (Avatar + Sprechblase + Emotes), `WolfCoModerator`, `WolfUeberraschtWithBubble`, `WolfJubelWithBubble`.

## Layout/Transitions (Kontext für Review)
- Root: `100cqh × 100cqw` (Container-Query-Units, skaliert auf Viewport). Optional Fixed-Canvas `SlideStage` (1920×1080 transform:scale).
- Phasen-Eintritt: `qqSlideIn` (720ms Y-Slide); Frage→Frage: `qqStageSlideInRight` (550ms) + pink Sweep.
- **Harte Regel:** `/beamer` zeigt NIE eine Scrollbar — Inhalt anpassen statt scrollen.
- Card-BG default `#14101F` (Navy-Hoodie), per Skin überschreibbar (`--qq-bg/-font/-text/-accent`).

---
*Erstellt 2026-06-28 als Review-Vorlage. Zeilennummern sind Momentaufnahme — bei großen Edits in QQBeamerPage.tsx neu verifizieren.*
