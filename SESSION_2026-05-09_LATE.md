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
1. **Gestackte (gestapelte) Felder auf /team besser markieren**
   - Aktuell semi-gut erkennbar
   - **Wolf-Idee**: Schloss-Symbol drauf statt Avatar, BG bleibt Teamfarbe → klar dass „nicht klaubar"
2. **Bluff Intro/Badge Emoji-Inkonsistenz**
   - Im Intro 🎁 (Geschenk)
   - Als Badge ein anderer Emoji (vermutlich 🎭)
   - → Eine Variante wählen, überall konsistent
3. **Standings: Text noch größer**
   - Wolf glaubt nicht ganz dass letzter Fix gegriffen hat → nochmal prüfen ob die rowH/avatarSize-Bumps tatsächlich live sind

### Performance
4. **Standings-Slide laggt** (auf /beamer)
   - Vermutlich die qqRecapSwap-Anim + Tickup-Anim + viele Teams-divs gleichzeitig
   - Mögliche Hebel: `will-change: transform`, weniger gestaffelte Animationen, requestAnimationFrame-Tickup statt mehrere parallele timer

### Thank-You Page (Screenshot 2 zeigt Bugs)
5. **Polaroid leer** — Avatar wird nicht im Polaroid-Foto gerendert (nur grünes BG sichtbar)
6. **News-Ticker dreifach am Ende** — Ticker-Loop scheint Sonja-Card 3× hintereinander zu zeigen statt 1× pro Loop
7. **Layout grundsätzlich** — könnte Polish brauchen (Wolf zeigt's auf Screenshot, ggf. mehr Bugs)

### Mid-size Refactor
8. **Auflösung-Flow Anpassungen** (Wolf will explizit besprechen):
   - Bet-Auflösung
   - Special-Awards-Auflösung
   - End-Auflösung
   - → Wolf bringt Vorschläge in nächster Session

### Bug-Investigation
9. **Autoplay Runde 3 Card-Drehung geskippt**
   - 3D-Action-Card-Reveal wurde übersprungen (zu schnell weiter)
   - Card sah kleiner aus (eventuell ungesyncter Halo-Fix?)
   - Wolf vermutet: vor Hard-Reload aufgenommen → ggf. nicht mehr aktuell, trotzdem prüfen ob Autoplay-Delay genug ist für 3D-Slam+Settle+Flip

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
