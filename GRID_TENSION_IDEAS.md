# CozyQuiz Grid-Tension-Mechaniken — Recherche-Pool

**Datum:** 2026-05-07  
**Status:** Recherche abgeschlossen, Auswahl + Implementation steht aus.  
**Plan-Reihenfolge (Wolf):** Erst Design + Animations klären, dann Mechaniken aus 1-5 picken.

Wolf hat **#1, #2, #3, #4, #5** als „super interessant" markiert.

---

## TL;DR — Wolfs Top-5-Pick + Newbie-Test

| # | Mechanik | Effort | Impact | **Newbie-tauglich?** |
|---|----------|--------|--------|---------------------|
| 1 | Final-Frage-Wager | Medium | Sehr hoch | ✅ Ja (eine Entscheidung pro Game) |
| 2 | Daily-Double-Zelle | Easy | Hoch | ⚠️ Teilweise (Wager-Slider könnte verwirren) |
| 3 | Pointless-Multiplier | Easy | Hoch | ✅✅ Super-easy (passiv, keine Entscheidung nötig) |
| 4 | Jackpot-Rollover | Easy | Hoch | ✅✅ Super-easy (passiv, baut Hype von selbst) |
| 5 | Carcassonne-Cluster-Bonus | Medium | Sehr hoch | ⚠️ Braucht Onboarding (Strategie-Mechanik) |

**Kurzfazit zur Newbie-Frage:**
- **3 von 5 sind passiv** (#3, #4, teilweise #1) → Newbies merken nur, dass es spannender ist, ohne aktive Entscheidung
- **#1 hat nur 1 aktive Entscheidung pro Game** → niedriger kognitiver Load
- **#2 mit Wager-Prompt ist mittel-komplex** → mit klarer UI machbar; alternativ als „free 2×"-Variante simplifizieren
- **#5 ist die anspruchsvollste** für Newbies → braucht 1-Slide-Onboarding („benachbarte Zellen geben Bonus"), aber Cluster-Reveal mit Glow am Rundenende erklärt es visuell von selbst

**Empfehlung für Newbie-Tauglichkeit:**
> Sprint 1 mit #3 + #4 (beide passiv) + simplifiziertes #2 (free 2× ohne Wager) → max Spannung, null Lernkurve.  
> Sprint 2 mit #1 → ein neuer aktiver Moment am Game-Ende, low pressure (geheim, parallel).  
> Sprint 3 mit #5 → braucht Tutorial-Slide / Mod-Erklärung in Rules, dafür der größte konzeptionelle Hebel.

---

## Wolf's Constraints (immer mitchecken)

1. **Keine öffentliche Bloßstellung** von Verlierer-Teams (Memory `feedback_no_public_shaming.md`)
2. Mechaniken müssen auf **Beamer + Phone** funktionieren (kein Card-Hand-Hidden-Info)
3. Standard-Setting: 4-8 Teams, 3-4h Dauer, gemütliche Watchparty / Café-Atmosphäre
4. **Cozy bleibt Cozy** — kein Battle-Royale-Vibe

---

## Die 12 Mechaniken aus der Recherche

### 1. Daily-Double-Zelle ⭐ (Wolf-Pick)
**Wie:** Zu Rundenbeginn wird genau 1 Zelle im Grid zufällig „geheim markiert" (Beamer zeigt nur „Daily Double aktiv in dieser Runde"). Wer als Erstes auf diese Zelle setzt, bekommt einen Wager-Prompt: 0–3 weitere Zellen aus eigenem Pool als Einsatz. Richtig = +Wager, Falsch = Wager geht an die Bank zurück.

**Tension:** Jede Zellen-Wahl könnte DIE Zelle sein. Späte-Runde-Comebacks plötzlich möglich. Publikum schreit, wenn der Wager-Slider hochfährt.

**Newbie-Tauglichkeit:** ⚠️ Konzept easy ("versteckter Bonus"), Wager-Slider mittel-komplex.  
**Newbie-Variante:** Daily Double = automatisches +2× ohne Wager-Prompt → null Lernkurve.

**Vorbild:** Jeopardy! Daily Double  
**Difficulty:** Easy (Backend rollt 1× pro Runde)

---

### 2. Pointless-Reward (Rare-Answer-Multiplier) ⭐ (Wolf-Pick)
**Wie:** Bei Multi-Choice-Fragen: Backend wertet, wie viele Teams die richtige Antwort gewählt haben. Wenn nur 1 Team richtig hat → diese Zelle zählt **doppelt** beim End-Scoring (visuell: goldener Rand, „Pointless"-Sound). 2 Teams richtig = 1.5×.

**Tension:** Bei „schweren" Fragen wird Risiko belohnt. Mod-Kommentar: „Letzte Sekunde — und nur Team Fuchs hatte recht — Pointless!"

**Newbie-Tauglichkeit:** ✅✅ Super-easy. Komplett passiv — Newbies müssen nichts entscheiden, sie merken nur dass die Zelle leuchtet und mehr zählt.

**Vorbild:** Pointless (BBC) — „richtig + selten = Jackpot-Boost"  
**Difficulty:** Easy (Backend zählt richtig-Antworten ohnehin)

---

### 3. Whammy-Zelle (NICHT empfohlen)
**Wie:** 1–2 Zellen im Grid sind zu Rundenbeginn als „Whammy" geheim markiert. Wer dort setzt: Cell wird platziert, **aber** das Team verliert eine zufällige andere eigene Zelle.

**Vorbild:** Press Your Luck — Whammy-Loss-Mechanik

**❌ Wolf-Constraint-Verletzung:** „Du verlierst Zellen ohne eigene Schuld" → kann bei 3-4h Pub-Quiz frusten. Battle-Royale-Vibe passt nicht zu Cozy.

---

### 4. Pushback-Steal (NICHT empfohlen)
**Wie:** Wenn ein Team eine Frage falsch hat UND ein anderes Team richtig hat, darf das Richtig-Team eine eigene Zelle direkt **neben** eine Zelle des Falsch-Teams setzen.

**Vorbild:** The Chase Pushback + Risk Adjacent-Attack  
**❌ Skip:** Räumlich elegant, aber Adjacency-UI auf Phone wird eng. Erst wenn Grid auf 8×8 wirklich groß ist.

---

### 5. Jackpot-Rollover-Zelle ⭐ (Wolf-Pick)
**Wie:** Jede Frage, die KEIN Team richtig hat, lädt eine „Jackpot-Zelle" auf dem Brett auf (visuell: pulsierende leere Zelle in Goldrand). Sobald jemand die nächste Frage richtig hat, kassiert das Team **alle** rolled-over Punkte als Bonus-Zellen on top.

**Tension:** Schwere Fragen werden zum Hype: „Wenn niemand das weiß, geht das nächste richtig in den Jackpot!"

**Newbie-Tauglichkeit:** ✅✅ Super-easy. Passiv — pulsierende Goldzelle ist selbsterklärend, Newbies sehen sie wachsen und freuen sich auf den Pay-out.

**Vorbild:** Pointless Jackpot-Rollover  
**Difficulty:** Easy (Counter erhöhen, bei nächster Richtig-Antwort ausschütten)

---

### 6. Wager-Cell-Doppeln (Alternative zu #1)
**Wie:** Zwischen Frage und Reveal: Jedes Team kann GENAU 1 eigene Zelle markieren als „Wette". Bei richtig = Zelle wird golden + zählt 2× im End-Score. Bei falsch = Zelle vom Brett. Limit: 1× pro Runde pro Team.

**Tension:** Pure Risk/Reward.

**Hinweis:** Quasi „Daily Double light für jeden". Wenn #1 zu zufällig ist, ist #6 die deterministische Alternative. Beide gemeinsam wären zu viel.

**Vorbild:** Jeopardy Daily Double + The Chase Final Chase  
**Difficulty:** Easy

---

### 7. Carcassonne-Cluster-Bonus ⭐ (Wolf-Pick)
**Wie:** End-of-Round-Scoring: Wer **zusammenhängende** Zellen hat (orthogonal benachbart), bekommt Bonus = Cluster-Größe². So: 3 Zellen alleine = 3 Punkte; 3 Zellen verbunden = 9 Punkte. Visuell: Cluster werden bei Reveal mit Glow-Outline gezeigt.

**Tension:** Platzierungs-Strategie wird wichtig — nicht nur „irgendwohin", sondern „neben mein Team-Cluster". Ende-Runde-Reveal wird zum Highlight: Wessen Cluster ist am größten?

**Newbie-Tauglichkeit:** ⚠️ Anspruchsvollste der 5. Konzept easy („benachbarte Zellen geben Bonus"), exakte Scoring-Math (n²) komplexer. **ABER:** Cluster-Reveal mit Glow-Outline am Rundenende erklärt es visuell von selbst. Newbies machen erste Runde naiv, ab Runde 2 bauen sie Cluster.  
**Onboarding-Tipp:** 1-Slide in Rules-Editor mit Beispiel „3 verbunden = 9, 3 verstreut = 3".

**Vorbild:** Carcassonne Feature-Closing + Area-Majority  
**Difficulty:** Medium (Cluster-Detection BFS, Reveal-Animation)

---

### 8. Sicherheits-Stufen (Lock-Cells)
**Wie:** Nach jeder Runde darf jedes Team 1 eigene Zelle als „Locked" markieren. Locked-Zellen können nicht mehr durch Whammy/Steal/Imposter verloren werden. Aber: nur 3 Locks pro Spiel verfügbar.

**Tension:** Endgame-Strategie: „Wann verbrenne ich den letzten Lock?"  
**Vorbild:** Wer wird Millionär Sicherheitsstufen  
**Difficulty:** Easy

---

### 9. Wits-&-Wagers-Bet-on-Other-Team
**Wie:** Bei Number-Fragen (Schätzfragen): Nach Submit-Phase aller Teams sehen alle anonym die anderen Tipps. Dann darf jedes Team 1 eigene Zelle „auf einen anderen Team-Tipp wetten". Wenn der Tipp gewinnt → wettendes Team bekommt 1 zusätzliche Zelle.

**Tension:** Soziale Dynamik. „Trau ich Team Eule oder Team Fuchs mehr?"  
**Vorbild:** Wits & Wagers Pari-Mutuel  
**Difficulty:** Hard (neue Sub-Phase, Anonymisierung, neuer Frage-Typ — aber GROSSER Effekt für Pub-Atmosphäre)

---

### 10. Streak-Heat-Zone (riskant für Cozy-Vibe)
**Wie:** Wer 3 Fragen in Folge richtig hat, bekommt einen „Heat"-Status. Während Heat darf das Team Zellen platzieren, die bereits anderen gehören → das Heat-Team „überlagert" sie und erhält bei End-Scoring 50 % der Punkte dieser Zelle.

**Vorbild:** Kahoot Streak + Risk Overlay  
**⚠️ Risiko:** Hot-Hand-Effekt mächtig, aber Overlap-UI komplex und Streaks fühlen sich für andere Teams unfair an.

---

### 11. Codenames-Trap-Cell (NICHT empfohlen)
**Wie:** Vor Spielstart setzt der Mod (oder Backend) 1 „Trap-Cell" pro Runde. Unsichtbar. Wenn ein Team draufsetzt → Zelle wird neutral, niemand bekommt Punkte.

**Vorbild:** Codenames Assassin  
**❌ Wolf-Constraint:** Selbst abgemildert — Newbies fühlen sich bestraft ohne eigene Schuld.

---

### 12. Final-Frage-Wager (End-Game-Climax) ⭐ (Wolf-Pick)
**Wie:** Vor der allerletzten Frage des Quiz: Jedes Team setzt geheim, **wieviele** eigene Zellen es wettet (0 bis alle). Frage wird gestellt — richtig: gewettete Zellen verdoppelt; falsch: gewettete Zellen weg. Reveal-Reihenfolge: niedrigste Wager zuerst, höchste zuletzt → maximale Drama-Eskalation.

**Tension:** Comeback-Möglichkeit für Underdog (alles wagen) + Schutz für Leader (0 wagen). Klassisches Final-Jeopardy-Tension-Curve.

**Newbie-Tauglichkeit:** ✅ Eine Entscheidung pro Game → niedriger kognitiver Load. Geheim-Wager → kein Public-Shaming wenn jemand verliert (man hat selbst gewagt). UI: ein Slider 0-N mit klaren Labels „Sicher / All-In".

**Vorbild:** Final Jeopardy + Trivia Murder Party Final  
**Difficulty:** Medium (Slider + Phase + Sequenz-Reveal)

---

## Implementation-Reihenfolge (sobald Mechaniken dran sind)

### Sprint 1 — Passive Modifier (~1 Tag, Newbie-Safe)
- ✅ #3 Pointless-Multiplier (passive Score-Modifier, golden Border + Sound)
- ✅ #4 Jackpot-Rollover (pulsierende Goldzelle, Pay-out bei nächstem Richtig)
- ✅ #2 Daily-Double in **Newbie-Variante** (auto +2× ohne Wager-Prompt)

→ Sofort spürbar mehr Spannung, null Lernkurve, keine UI-Phasen.

### Sprint 2 — End-Game-Climax (~1-2 Tage)
- ✅ #1 Final-Frage-Wager (eigene UI-Phase mit Slider + Sequenz-Reveal)

→ DAS Finale, ein atemloser Schlussmoment. Reicht eine Entscheidung pro Game.

### Sprint 3 — Strategischer Hebel (~2-3 Tage, mit Onboarding)
- ✅ #5 Carcassonne-Cluster-Bonus (Cluster-Detection BFS + Reveal-Animation)
- → Plus 1-Slide im Rules-Editor mit Beispiel-Visualisierung

→ Größter konzeptioneller Hebel. Macht Grid-Platzierung zu echtem taktischem Spiel.

### Optional Sprint 4 — Falls #2 in Newbie-Variante zu zufällig
- ✅ #6 Wager-Cell-Doppeln statt #2 (deterministisch, jedes Team kann selbst wählen)

---

## Quellen (alle aus Recherche-Agent verifiziert)

- [Jeopardy Daily Double — Wikipedia](https://en.wikipedia.org/wiki/Jeopardy!)
- [Wagering Strategy 101 — Final Jeopardy](https://thejeopardyfan.com/final-jeopardy-betting)
- [Strategies and skills of Jeopardy! champions — Wikipedia](https://en.wikipedia.org/wiki/Strategies_and_skills_of_Jeopardy!_champions)
- [Press Your Luck — Wikipedia](https://en.wikipedia.org/wiki/Press_Your_Luck)
- [Push Your Luck — BoardGameGeek Mechanic](https://boardgamegeek.com/boardgamemechanic/2661/push-your-luck)
- [The Chase — Wikipedia](https://en.wikipedia.org/wiki/The_Chase_(British_game_show))
- [Final Chase — The Chase Wiki](https://the-chase.fandom.com/wiki/Final_Chase)
- [Pointless — Wikipedia](https://en.wikipedia.org/wiki/Pointless)
- [Trivia Murder Party — Jackboxpedia](https://jackbox.wiki/wiki/Trivia_Murder_Party)
- [Wits & Wagers — BoardGameGeek](https://boardgamegeek.com/boardgame/20100/wits-and-wagers)
- [Area Majority / Influence — BoardGameGeek](https://boardgamegeek.com/boardgamemechanic/2080/area-majority-influence)
- [Carcassonne — Official Rules PDF](https://images.zmangames.com/filer_public/d5/20/d5208d61-8583-478b-a06d-b49fc9cd7aaa/zm7810_carcassonne_rules.pdf)
- [Family Feud — Wikipedia](https://en.wikipedia.org/wiki/Family_Feud)
- [Kahoot Answer Streak — Inside Kahoot Medium](https://medium.com/inside-kahoot/experimenting-with-answer-streaks-to-help-make-learning-awesome-3b3357e42595)
- [Tension and Escalation in Games — Tabletop Games Blog](https://tabletopgamesblog.com/2024/05/14/boiling-point-why-tension-and-escalation-matters-in-games-topic-discussion/)
- [How to Create Tension in Your Game — Board Game Design Course](https://boardgamedesigncourse.com/game-mechanics-how-to-create-tension-in-your-game/)
- [Wer wird Millionär — Wikipedia](https://de.wikipedia.org/wiki/Wer_wird_Million%C3%A4r)
- [Trivial Pursuit — Wikipedia](https://en.wikipedia.org/wiki/Trivial_Pursuit)
- [Codenames — Wikipedia](https://en.wikipedia.org/wiki/Codenames_(board_game))
