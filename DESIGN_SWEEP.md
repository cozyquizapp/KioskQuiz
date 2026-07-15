# Design-Sweep — der einmalige Durchlauf

> **Ziel:** Das Quiz (Beamer **und** Team) **einmal** von vorne bis hinten im Design
> optimieren — dann Design **einfrieren** und nur noch an Funktionalität arbeiten.
>
> **Kontext:** ~760 / 1000 h im Repo. Dieser Sweep ist der **Design-Schlussstrich**.
> Danach gilt: neues Design nur noch bei echtem Defekt, nie bei Geschmack.

---

## Die 6 Regeln (nicht verhandelbar)

1. **Eine Richtung, kein Zurück.** Spielfluss *einmal* vorne → hinten. Kein Rumspringen.
2. **Zeit-Box pro Station** (Timer ~30–45 Min). Klingelt er → Station **fertig**, Haken, weiter. Die Box ist ein *Deckel*, keine Prognose.
3. **Definition of Done = die Checkliste unten**, nicht „perfekt". Erfüllt → eingefroren.
4. **Freeze.** Abgehakte Station ist gesperrt. Wieder aufmachen NUR bei echtem Defekt (kaputtes Layout/Kontrast), **nie** für „wäre schöner".
5. **Global entscheiden, lokal anwenden.** Farbe/Typo/Spacing/Radius/Motion werden in **Station 0** festgelegt. Danach nur noch *anwenden*. Token-Wunsch → global ändern, nicht pro Screen basteln.
6. **Ideen-Parkplatz statt Ablenkung.** Jeder „ich könnte…"-Gedanke → unten in `Ideen-Parkplatz`, unterbricht den Durchlauf **nicht**.

---

## Definition of Done — gilt für JEDE Station

- [ ] **Kontrast** ok (Text ≥ 4.5:1, groß ≥ 3:1, UI/Icons ≥ 3:1) — light + dark
- [ ] **Spacing / Typo / Radius** nur aus Tokens (`qqDesignTokens.ts`), keine Magic-Numbers
- [ ] **Motion** da, aber ruhig (Ein/Aus-Transition, `prefers-reduced-motion` respektiert)
- [ ] **Keine Scrollbar** auf `/beamer`, Safe-Margins eingehalten
- [ ] **DE und EN** geprüft (kein Text-Overflow, keine Em-Dashes)
- [ ] **Beamer und Team** für diesen Moment geprüft
- [ ] **Arena und Classic** kurz gegengecheckt (wo der Screen in beiden existiert)

→ Alle Haken = **Station eingefroren**.

**Ablauf je Station:** Skills laden (`ui-ux-pro-max` + `impeccable` + `animate` + `color-contrast`) → anwenden → DoD durchgehen → Haken → Fortschritt +1.

---

## Fortschritt: 0 / 21

_(Beim Abhaken hochzählen. Das ist die Dopamin-Anzeige — das sichtbare Ende.)_

---

## Stationen (Spielfluss vorne → hinten)

### Fundament
- [ ] **0 — Tokens einfrieren.** Farbe, Typo-Skala, Spacing-Skala, Radius, Motion-Primitives, Safe-Margins in `qqDesignTokens.ts`/`qqShared.ts` final festziehen. **Einzige Entscheidungs-Station.** ⚠️ Offene Grundsatzfrage vorher klären: Gold (Krönung/Medaillen `ACCENT_GOLD`) — Ausnahme oder raus?

### Akt 1 — Einstieg
- [ ] **1 — Pre-Game „Setting up".** Beamer `NeutralWelcomeView` · Team Join-Screen (`/team` Eingang).
- [ ] **2 — Lobby.** Beamer: QR, Team-Karten, Wolf-Greeter (Arena: Magier) · Team: Lobby/Warten.
- [ ] **3 — Rules.** Beamer: Welcome-Overlay → (Arena) Arena-Meister-Splash → Regel-Intro → Regel-Folien · Team: Warten.

### Akt 2 — Teams & Runde
- [ ] **4 — Teams-Reveal.** Beamer (Aufstellung/Wappen).
- [ ] **5 — Runden-Intro / Journey + Kategorie-Reveal.** Beamer · Team: Warten.

### Akt 3 — Frage & Antwort (je Kategorie: Frage + Team-Eingabe + Reveal)
- [ ] **6 — Schätzchen** (Distanz-Strahl-Reveal).
- [ ] **7 — MUCHO.**
- [ ] **8 — Bunte Tüte** (Sub-Games: Top5 / Order / Map / Umfrage / Schwarm / Hot Potato).
- [ ] **9 — 10v10 „All In".**
- [ ] **10 — Cheese „Schau mal".**

### Akt 4 — Wertung
- [ ] **11 — PLACEMENT.** Beat A „Wertung" (`scoring`-BG) → Beat B „Gesamtstand" (`standing`-BG) · Team: Standing.

### Akt 5 — Finale
- [ ] **12 — Comeback Higher/Lower.** Beamer + Team.
- [ ] **13 — Final-Wager.** Betting (Beamer + Team-Eingabe) → Final-Reveal (Beamer).

### Akt 6 — Abschluss
- [ ] **14 — Siegerehrung.** Award-Beats → Kolosseum-Krönung → Endstand (Beamer).
- [ ] **15 — Thanks + Summary/Recap + QR.** Beamer + Team + `/summary`-Seite.
- [ ] **16 — Pause-Screen.** Beamer + Team.

### Akt 7 — Querschnitt (einmal über ALLES)
- [ ] **17 — Motion-Konsistenz.** Ein/Aus-Transitions, Press-Feedback, `--qq-state`, reduced-motion.
- [ ] **18 — Bilingual DE/EN.** Jeder Text beide Sprachen, kein Overflow.
- [ ] **19 — Kontrast / A11y.** `color-contrast` über alle Screens, Focus-States.
- [ ] **20 — Skins + Arena-vs-Classic.** Alle 4 Skins + beide Modi Sichtprüfung.

---

## Ideen-Parkplatz (später / nie)

_(Hier landen alle „wäre schöner"-Ideen während des Sweeps. Sie unterbrechen NICHTS.
Nach dem Sweep entscheidest du bewusst: umsetzen oder streichen.)_

- …

---

## Danach: Funktionalitäts-Modus

Ab dem letzten Haken (**21 / 21**) gilt:

- **Design ist eingefroren.** Neue Arbeit = nur Funktionalität / Bugs / Inhalte.
- Design-Änderung nur bei **Defekt** (kaputter Kontrast/Layout), nie bei Geschmack.
- Geschmacks-Ideen → Parkplatz, gesammelt, bewusst als eigenes (Mini-)Projekt oder gar nicht.

Das ist der Punkt, an dem „endlos polieren" aufhört.
