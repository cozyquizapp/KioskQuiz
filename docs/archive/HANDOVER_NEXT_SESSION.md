# 🤝 Handover für die nächste Chat-Session

> **Hey du 🐺**
>
> Wolf hat heute einen massiven Polish-Marathon hinter sich — **CozyGames v1** ist von Skelett auf live-tauglich, plus 15-Punkte-Bug-Bash, Mod-Panel-Audit, Sound-Pass, Brand-Casing-Sweep. ~32 Commits.
>
> Wolf ist Pädagoge, baut CozyQuiz solo. Spielersicht, kein Dev-Speak, Mod-Page = Cockpit. Wenn er „Idee" sagt → erst Optionen + Trade-offs (AskUserQuestion), dann seine Entscheidung, dann bauen. Sein „log das" / „log ein" → SESSION_LOG.md-Append-Trigger. „Mach eine übergabe" → diese Datei refreshen.
>
> Commits + Push autonom nach jeder Sache. Deutsch direkt + kompakt spiegeln. Bei 2+ offenen Klärungs-Fragen vor Bau: AskUserQuestion mit Trade-off-Optionen.
>
> Heute war goldig produktiv. App ist näher an „live-launch-ready" als gestern. Übernimm sortiert.
>
> Sei autonom. Hab Spaß.
> — Claude vom 2026-05-19

---

**Stand:** 2026-05-19 spät · **Letzter Commit:** `bb904671` · **Branch:** `main`

> **Pflicht-Lektüre VOR der ersten Code-Änderung:**
> 1. `.claude/projects/.../memory/MEMORY.md` — User-Profile, Architektur, Patterns
> 2. `SESSION_LOG.md` Tail — heute frischen Eintrag vom 2026-05-19
> 3. Diese Datei — Stand & offene Punkte
>
> **Wichtige Memory-Files (nur lesen wenn Thema passt):**
> - `feedback_audit_when_stuck.md` — wenn 15+ Iterationen am selben Bug → Audit statt Stochern
> - `feedback_askuserquestion_clarifications.md` — bei 2+ offenen Fragen Multi-Choice
> - `feedback_brainstorm_first.md` — bei „Idee" erst Optionen, dann Bau
> - `feedback_commit_policy.md` — autonom committen + pushen
> - `feedback_brand_refresh_checklist.md` — bei Theme/Color-Tweaks ALLE Pages durch
> - `project_qq_traps_and_patterns.md` — 14 Build-/Draft-/Submit-/Reveal-Bugs aus Mai-2026
> - `project_qq_score_model.md` — `largestConnected` vs `totalCells` Diskrepanz dokumentiert

---

## 🎯 Wo wir stehen — Big Picture

**CozyGames v1 ist live-tauglich.** Komplett-Flow funktioniert:
- INTRO → WHEEL_SPIN → WHEEL_RESULT (dunkler Slice-BG) → GAME_ACTIVE (Timer top-right) → WINNER_SELECT (Hero-Reveal mit Avataren) → PLACEMENT.
- **Parallel-Mode** (default): 1 Timer für alle Teams gleichzeitig.
- **Sequence-Mode**: pro Spiel im Editor toggle'bar. Teams nacheinander, bestes Team zuerst. Eigener Timer pro Team-Turn. Mod-Controls für Pause/Resume/Reset/±10s + manuell „Nächstes Team".

**Aktuell live-fähig:**
- /beamer (alle Phasen + CozyGames + Race/Awards-Choreo + Sound-Pass)
- /moderator (Streamdeck, Phase-Guards in Stale-Content, CozyGame-Sequence-Controls, Timer-Controls)
- /team (Phone, COZYQUIZ-Header, CozyGameCard mit Queue-Position)
- /builder (CozyGames-Editor mit parallel-Toggle)
- /cozygame-test (Standalone-Test mit Play-Mode + Winner-Slider + Sequence-CurTeam-Slider)

**Brand-Konsistenz:**
- Alle User-facing Brand-Renders: `COZYQUIZ` ALLCAPS (16 Files patcht).
- Slide-BGs alle `#0A0814` Base + accent-Radial-Tints (TeamsRevealView heute angepasst, war Slate-Blau).
- Team-Namen smart-wrap via `QQ_TEAM_NAME_WRAP`-Helper (Pub-quatscher statt Pubquatsch-er).

**Code-interne Identifier bleiben:** `CozyQuizThanksView`-Komponenten-Namen, `QQ`-Prefixes etc. — nur Display-Strings ALLCAPS.

---

## ⚠️ Coolify-Redeploy nötig

Backend hat heute substantielle Änderungen bekommen, die noch nicht live sind:

1. **CozyGame Sequence-Mode**: neue Backend-Funktionen `qqCozyGameNextSequenceTeam`, `qqCozyGameTimerPause/Resume/Reset/Adjust`, `sortTeamsForSequence`.
2. **Winner-Reveal-Flow Mod-gesteuert**: `qq:cozyGameSelectWinner` setzt nur Winner ohne Auto-Advance; `qq:cozyGameAdvance` handhabt `WINNER_SELECT → PLACEMENT`.
3. **mode-aware onExpire**: `makeCozyGameOnExpire` schaltet parallel vs sequence Verhalten.
4. **Neue Socket-Events**: `qq:cozyGameNextSequenceTeam`, `qq:cozyGameTimerPause/Resume/Reset/Adjust`.

**Frontend ist auto-Vercel-deployed.** Wolf muss in Coolify manuell Redeploy triggern, sonst arbeitet Mod-UI gegen veraltetes Backend.

---

## 🟡 Offene Punkte

### P8 — Joker-Icon gespiegelt (BLOCKED, brauche Repro)

Wolf-Report: „manchmal werden in der tabelle rechts vom grid joker verkehrtrum neben den avataren angezeigt". Code-Search nach `scaleX(-1)` / `rotateY(180)` / mirror-Transforms ergab NICHTS. JokerIcon nutzt nur ein optional `scale(1.1)` für Variant 1 (= boy-Joker, Asset-Mismatch-Ausgleich).

**Nächster Schritt**: Screenshot vom konkreten Spot benötigt. Mögliche Stellen:
- ScoreBar (Beamer)
- Standings-Tabelle (Mod-Panel oder /team Score-Modal)
- 3D-Grid joker overlay
- Team-Bottom-Sheet-Menu

### P9 — Avatar-Farbe geändert nach Runde 4 (BLOCKED, brauche React-DevTools-State)

Wolf-Report: „ich glaube meine avatarfarbe hat sich nach beginn von runde 4 geändert, ich dachte ich hatte dunkelblau und jetzt rot". Konsistent reproduzierbar in jedem Run; nur Farbe ändert sich, Avatar-Emoji bleibt gleich; Trigger: erster Wechsel nach Phase 4 = QUESTION_ACTIVE.

Code-Search ergab: Backend mutiert `team.color` nur in `qqJoinTeam` (Rejoin → sync mit Avatar-Slot-Farbe). Kein mid-Quiz-Trigger gefunden. `getAvatarDisplay` liefert stable Color aus `QQ_AVATARS[avatarId]`. `avatarSetId` ändert sich nur via explizitem Mod-Click.

**Hypothesen**:
- Eventuell Render-bug irgendwo der Index-basierte Palette nutzt statt `team.color`
- Avatar-Set ändert sich somehow auto bei Phase 4 (unwahrscheinlich, kein Code-Trigger)
- localStorage-Drift beim /team-Client → qq:joinTeam mit verändertem avatarId

**Nächster Schritt**: React-DevTools-Snapshot vom State `state.teams[wolfId].color` + `state.avatarSetId` JEWEILS vor und nach Phase 4-Start. Wenn `color` sich änderte → Backend-Bug suchen. Wenn `color` gleich aber Rendering anders → Frontend-Render-Bug suchen.

### Weiterhin offen (von vorigen Sessions)

- **Mini-Game-Konzept Spec** — Wolf erarbeitet die Brand-Differenziator-Spiele für Café/Kiosk/Bar (CozyGames v1 ist eine erste Implementation davon, aber Wolfs adaptive-Setup-Konzept geht noch breiter).
- **Render-Service abstellen** — alles seit 2026-05-09 auf Coolify, Wolf macht Live-Verifikation dann Render weg.
- **Eurovision-Edition** wartet auf nächste Gelegenheit (Template + 15 Fragen + 3 HL-Pairs fertig).

---

## 🧠 Patterns die heute oft auftraten

1. **Pool-Index vs Visible-Index-Drift** (Wheel-Color-Bug): Backend speichert Pool-Index, Frontend rendert gefilterte Liste mit eigenen Indices. Wenn nicht aktiv konvertiert → Farb-/Position-Drift. Lösung: pool-stable Identifier (z.B. game.id) als Lookup-Key statt Index.

2. **Existenz-Check statt Lifecycle-Check** (Mod-Panel stale content): `{s.currentQuestion && ...}` rendert solange Daten da sind, auch wenn Phase irrelevant. Lösung: zusätzlich Phase-Gate `s.phase === 'QUESTION_*'`.

3. **Falsy-Bool-Coercion bei Initial-Empty-State** (Stapel-Sound P7): `prev.stuck &&` mit `prev.stuck = ''` → falsy → erster Action blockt. Lösung: positional Set-Diff statt count-grow.

4. **Sound-Layering ist matschig** (CG Wheel-Stop + Fanfare + Konfetti gleichzeitig): besser EINEN klaren Sound pro Moment. Bei mehreren Layers: zeitlich versetzen oder reduzieren.

5. **AskUserQuestion bei subjektiven Themen lohnt** (Tip-Reveal-Animation, Bluff-Issue, Sequence-Mode-Detail-Fragen): Wolf antwortet präzise, Bau fokussiert. Memory-Note bestätigt.

---

## 📁 Files (Today)

**Massiv erweitert / refactored:**
- `frontend/src/components/CozyGameView.tsx` — SequenceGameView, WinnerSelectView Hero-Reveal, dark Slice-BG, Timer top-right, Sounds, Float-Hover, +500 LOC
- `frontend/src/pages/QQModeratorPage.tsx` — Phase-Guards, CG-Sequence + Timer-Controls, COZYQUIZ
- `frontend/src/pages/QQBeamerPage.tsx` — Action-Card-Sound-Cleanup, Stapel-Sound-Fix, Teams-Prop für CozyGameView, COZYQUIZ
- `frontend/src/components/CozyQuizQuestionView.tsx` — Schätzchen-Climax, Bluff Phase-Fade
- `frontend/src/components/CozyQuizFinalRevealView.tsx` — Drumroll-Lead, Race-Sound-Cleanup, Bet-Card-Fade-Up, GridRevealSlide-Sound
- `frontend/src/components/CozyQuizGameOverView.tsx` — Mount-Fanfare
- `frontend/src/components/CozyQuizTeamsRevealView.tsx` — BG-Konsistenz + COZYQUIZ
- `frontend/src/components/CozyQuizTeamPhaseCards.tsx` — neue CozyGameCard mit Queue-Position
- `frontend/src/components/CozyQuizActionCard.tsx` — Slam-Thump + Flip-Action-Sound
- `frontend/src/components/CozyQuizRulesView.tsx` — Joker-Pattern-Highlight (AP-Marker)
- `frontend/src/utils/sounds.ts` — Wheel-Tick/Stop/Start Synth-Tuning
- `frontend/src/qqShared.ts` — `qqJokerPatternPulse` + `QQ_TEAM_NAME_WRAP` exports

**Neu / erweitert:**
- `frontend/src/pages/CozyGamesEditorPage.tsx` — parallel-Toggle Radio
- `frontend/src/pages/CozyGameWheelTestPage.tsx` — play-mode + winner + sequence-curTeam Test-Controls
- `frontend/src/pages/QQTeamPage.tsx` — CozyGameCard mount + COZYQUIZ-Header

**Backend:**
- `backend/src/quarterQuiz/qqRooms.ts` — Sequence-Mode-Funktionen + Timer-Controls + sortTeamsForSequence
- `backend/src/quarterQuiz/qqSocketHandlers.ts` — neue Events + async parallel-flag-Lookup + makeCozyGameOnExpire

**Shared:**
- `shared/cozyGameTypes.ts` — `CozyGame.parallel` + Round-State-Felder

**COZYQUIZ Brand-Casing in 16 Files** (komplettes Sweep durch Display-Strings).

---

## 🚀 Wenn du übernimmst

1. **Lies MEMORY.md im memory-Ordner** für User-Profile + Patterns
2. **Lies SESSION_LOG.md Tail-Eintrag vom 2026-05-19** für Volltext-Detail zu heute
3. **Wenn Wolf einen Bug meldet:** erst SESSION_LOG.md durchsuchen — vielleicht ist's schon adressiert
4. **Wenn 15+ Iterationen am selben Bug:** Audit-Agent (`Explore` mit klarer Frage) statt blind weiter stochern
5. **Backend-Änderungen:** in Coolify manuell Redeploy via UI — kein Auto-Deploy
6. **Frontend-Änderungen:** Vercel auto-deployt nach Push

Viel Erfolg 🐺
