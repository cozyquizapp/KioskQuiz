# Session 2026-05-09 (Late) — Zusammenfassung + offene TODOs

## Was diese Session fertig wurde (live auf main)

### Big Refactors
- **Final-Wager-Refactor** — Tipp-Variante mit 1-Tipp-pro-Team, Sympathie-Bonus mutual, kein Verlust. End-Reveal in 3 Akten (Cluster-Visual → Wager → Awards) + Ranking-Slides + Thanks
- **Connect-4-Reform** — alle 4 Hints sofort sichtbar, 1 Tipp pro Team, schnellste richtig zuerst (statt progressive Hint-Mechanik mit Strikes)
- **Bluff-Reveal Konzept D** — Hero-Real-Card riesig + Sieger-Banner + Mini-Bluff-Pills unten
- **TeamsRevealView Welcome** — „Herzlich Willkommen!"-Hero zuerst, dann Subtitle, Teams flippen parallel mit Stagger (5s statt 15s)
- **HotPotato-Polish** — Halbkreis-Layout, Side-Teams transparent + nur Avatare, Kartoffel rechts neben Active-Card, Wrap-Anim disabled
- **Final-Recap als eigene Seite** (nicht Overlay) mit 0B-Score-Cascade-Animation
- **Polaroid-Thanks-Page** — Polaroid + QR + Schlafwolf + News-Ticker

### Defaults
- `connectionsEnabled` default → **false** (4×4-Connections aus, durch FinalBets ersetzt)
- `finalWagerEnabled` default → **true** (FinalBets neuer Standard-Quiz-Flow)

### Backend-Fixes
- `qqTickFinalPhaseWin` nutzt `_currentQuestionWinners` (alle korrekten Teams +1, nicht nur schnellstes)
- `qqActivateQuestion` resettet `placementsLeft=0` für alle Teams (Joker-State-Bug behoben)
- Comeback-Steal Dummy-AI: Leader-Filter auch im FREE-Branch
- `maybeAutoFinalBets` zu `qq:comebackHLStep`/`qq:comebackHLSkip` Handlern

### Frontend-Fixes
- Pre-existing TS-Errors (5 Stück) alle weg
- Wolf-PNG durch neuen Pink-Wolf ersetzt
- ProgressTree-Wolf bouncen entfernt (Kreis fix, nur Kopf wackelt subtil)
- Star-Border umlaufend per SVG-stroke-trace (nicht conic-gradient-Sweep)
- /team Grid: aspectRatio auf Container, gridTemplateRows: 1fr → garantiert square
- /team Cells: solid Team-Color BG (kein Gradient mehr — kein Kreis-Eindruck)
- /team Cat-Intros mit Beamer-Texten synchronisiert (CHEESE/Map/Connect4/Top5)
- ActionCard 3D-Reveal: Halo konsistent ab Slamming (kein Größen-Sprung beim Flip)
- HotPotato „all possible answers": neue xxl-Stufe + xl/lg vergrößert + maxHeight 78vh
- /mopo Sub-Step-Flow (vollständige Hotkey-Logik aus Mod-Page)
- Autoplay-Ref-Timer (kollabiert nicht mehr bei Bot-Antworten)
- Higher/Lower correct = grün (war pink, irreführend)

---

## OFFENE TODOs (für nächste Session)

### Klein/schnell
1. ~~**Gestackte (gestapelte) Felder auf /team besser markieren**~~ ✅ **GEFIXT 2026-05-09 v2** (`bf33e613`)
   - Cell-Picker: 🏯 → 🔒 (Burg-Verb → Schloss-Resultat „lock")
   - Mini-Map: Avatar+Pink-Ring → 🔒, BG bleibt Teamfarbe
2. ~~**Bluff Intro/Badge Emoji-Inkonsistenz**~~ ✅ **GEFIXT 2026-05-09 v2** (`bf33e613`)
   - News-Ticker zog Cat-Emoji (🎁) statt Sub-Emoji für Bunte-Tüte-Subs.
   - Backend: `bunteTueteKind` in questionHistory + Live-State, Frontend nutzt SUB_EMOJI-Map.
3. ~~**Standings: Text noch größer**~~ ✅ **GEFIXT 2026-05-09 v3** (`bf33e613`)
   - Verifiziert: vorheriger Bump war live. v3 nochmal hochgezogen (rowH 78→92 / 92→108 / 110→130, Name+Score min/max).

### Performance
4. ~~**Standings-Slide laggt**~~ ✅ **GEFIXT 2026-05-09 v3** (`4335da9f`)
   - Root-Cause: 8 parallele rAF-Loops mit setState-Tickup → 8× React-Re-Renders pro Frame.
   - Fix: direkte DOM-Manipulation via useRef.textContent + style.color, KEIN setState. Plus contain: 'layout paint style' auf Team-Rows.

### Thank-You Page
5. ~~**Polaroid leer**~~ ✅ **GEFIXT 2026-05-09 v2** (`06c21fd5`)
   - Avatar `size="70%"` → CSS font-size: calc(70%*0.6) ist relativ zur Parent-Font-Size, nicht Container-Width → 6.7px Mini-Glyph. Fix: absolute Pixel-Sizes.
6. ~~**News-Ticker dreifach am Ende**~~ ✅ **GEFIXT 2026-05-09 v2** (`06c21fd5`)
   - Root-Cause: questionHistory war nur im Summary-Save-Payload, nicht im Live-State. Frontend bekam undefined → strip = [sonja, sonja, sonja]. Jetzt im Live-State (slim).
7. ~~**Layout grundsätzlich**~~ ✅ **REFACTORED 2026-05-09 v3** (`3cf48cf3`)
   - Polaroid → runder Sticker (Sonjas Wunsch), Wolf-Decoration weiter unten + überlappend Card-Rand (statt über Text), QR rechts, Sticker mittig groß als Hero, Award-Reihe horizontal unter Hero. Text-Bump für Beamer-Lesbarkeit (Headline 28→40/72px etc).

### Mid-size Refactor
8. ~~**Auflösung-Flow Anpassungen**~~ ✅ **GEFIXT 2026-05-09 v3** (Commits `b4bdf72e` Awards+Bet, `77a9c310` Treppchen)
   - Bet-Auflösung: Card minimal größer + Innen-Cascade per animation-delay (Team-Card → Tipp-Team @0.55s → Punkte/Sympathie @1.1s)
   - Special-Awards: 1 Slide mit 3 Cards nebeneinander (statt 6 separate Slides), alle gleich groß (BG+Front identisch dimensioniert), Space flippt 3D links→mitte→rechts. Backend qqFinalRevealMaxStep 2N+8 → 2N+6.
   - Treppchen: ab Platz 2 Treppchen sichtbar (Platz 3), bei Platz 1 voll (Platz 2 + Sieger-Lücke + Platz 3) mit echten Stufen-Höhen. Plätze N..3 nur prominent + verschwinden.

### Bug-Investigation
9. ~~**Autoplay Runde 3 Card-Drehung geskippt**~~ ✅ **GEFIXT 2026-05-09 v2** (`9db05f14`)
   - Root-Cause: R3 Stack-Card (isNew @ index 2) fertig erst bei 7350ms (850 + 2×1500 + 600 + 2900 SLAM+SETTLE+FLIP), Autoplay schaltete bei 5500ms weiter → Card noch im Slam, Halo+Flip nicht fertig (Wolfs „kleiner aussehen"-Eindruck).
   - Fix: Delay ph-abhängig (R1=5850, R2=7350, R3=8850, R4=5750)

### KLÄRUNG NÖTIG
10. ~~**Autoplay-Stop bei Final-Standings**~~ ✅ **GEFIXT 2026-05-09 v2** (Commit `84e50c05`)
    - Wolf-Klärung: Autoplay soll durchlaufen, kein Stop.
    - Früherer Return-Block (`if (s.finalRecapStep === 1) return;`) entfernt.
    - Stattdessen im PLACEMENT-Case längerer Delay: `inFinalRecap ? 8000 : 3500` ms — gibt der 0B-Score-Cascade (~3s Anim) + Lese-Zeit Raum, bevor zur nächsten Final-Frage geschaltet wird.

---

## Letzte Commits (chronologisch)
- `addce3ff` TeamsReveal-Welcome + HotPotato-Polish + /team-Grid + CozyGuessr-Fixes
- `cadcd58d` Wolf-PNG + Tree-Bounce + TS-Cleanup + Star-Border-Polish
- `a52a5a61` Star-Border SVG-stroke-trace
- `a4c20f39` Star-Border Bottom bündig
- `89c5e5ba` Star-Border Wrapper-Height + drop-shadow weg
- `c57eac79` Star-Border-Regression + ActionCard-Halo
- `1ba723a6` Bluff-Reveal Konzept-D
- `adc7a882` Star-Border-Trace 9% kürzer
- `184fc339` HP Kartoffel + Side-Slots + Wrap-Anim + AllAnswers Skalierung
- `c309824d` /team Cat-Intros mit Beamer abgleichen
- `e32479b8` /team Grid square via Container-aspectRatio
- `8e5410f6` /team Cells solid BG + Joker-State-Bug Backend-Fix
- `1f1d793a` H/L green + Final-Recap-Polish + Comeback-Steal-Leader + Bet-Skip + /team Recap-Hint

---

## Memory-Stand (für Auto-Memory beim Compact)
- Final-Wager Tipp-Variante final + Implementiert
- Connect-4-Reform live (Single-Guess statt Progressive-Hints)
- 4×4-Finale default OFF, FinalBets default ON
- HotPotato in halbkreis-layout mit Side-Slot-Logik
- Recap zwischen Final-Fragen ist eigene Page (kein Overlay), nur bei finalWagerEnabled
- /team-Grid square via Container-aspectRatio
- Wolf-PNG: `frontend/public/avatars/cozywolf/pink.png` (1000×1000, 890 KB)
- Star-Border: SVG-rect mit stroke-dashoffset (nicht conic-gradient)
