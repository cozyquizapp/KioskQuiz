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

## Fortschritt: 4 / 21

_(Beim Abhaken hochzählen. Das ist die Dopamin-Anzeige — das sichtbare Ende.)_

---

## Stationen (Spielfluss vorne → hinten)

### Fundament
- [x] **0 — Tokens einfrieren.** ✅ EINGEFROREN (`qqDesignTokens.ts`, reifes System): Radius · Alpha (d0–d4) · Letter-Spacing · Weight (700/900) · Duration · Easing · Stagger · Text-Farben (Kontrast AAA/AA getestet) · Tap-Targets · Beamer-Sizing · Shadow (max 2 Layer) · Z-Index-Zonen · Safe-Margin · Brand-Pink-Eskalation `#F9A8D4→#F472B6→#EC4899→#A21247`.
  - ✅ **Akzent-Palette gelöst (Kolosseum, Wolf-Referenz „das ist der moment"):** Brand-Pink/Magenta = Hauptmarke · **Gold** (`ACCENT_GOLD`) = Sieg/Zeremonie (Pokal/Krönung/Medaillen) · **Violett/Kristall/Glut** (`ARENA_ACCENT`) = Kolosseum-Stimmung (Banner/Scrim/Funken, sparsam). Kein Violett als Text-/CTA-Farbe. Exakte Hex ggf. beim Beamer-Check nachtunen.

### Akt 1 — Einstieg
- [x] **1 — Pre-Game „Setting up".** ✅ EINGEFROREN. Beamer `NeutralWelcomeView` + Team `PreparingScreen` geprüft: DoD erfüllt (Kontrast Muted-Text ≈6.7:1 auf Card, Beamer-Labels ≫3:1; reduced-motion via globalem Kill-Switch in `main.css`+`TEAM_CSS`; keine Scrollbar; DE+EN; Symmetrie Brand-Hero). **Fix:** Sprach-Flag-Button (PreparingScreen + MidGameRejoinView) von ~40px auf 44×44 Touch-Ziel gehoben (Apple HIG/Material). Sonst keine Geschmacks-Änderung — Screens waren reif.
- [x] **2 — Lobby.** ✅ EINGEFROREN (verifiziert, mature — kein Defekt). Beamer `LobbyView`: mehrfach kontrast-auditiert, token-basiert, QR #0A0814/Weiß = max. Kontrast, reduced-motion global, keine Scrollbar, DE+EN, Arena-Magier-Greeter + Kolosseum-BG korrekt gegatet. Team `LobbyCard`: Bereit-Status = Farbe+Text+Dot (nicht color-only), keine Touch-Ziele, sauber. Keine Geschmacks-Änderung (Freeze-Regel).
- [x] **3 — Rules.** ✅ EINGEFROREN. RulesView: reduced-motion korrekt (Glut/Wolf-Bob gegatet), Slide-Farben token-basiert, DE+EN. **Fix:** Arena-Meister-Splash — Eyebrow + Untertitel von Lavendel auf neutral-warmweiß gemäß Station-0-Palette (Gold=Zeremonie, Violett nur Atmosphäre/Glow, nie Text). Gold-Titel + lila Glow bleiben (Glow = erlaubte Atmosphäre). Regel-Auslegung: **streng — kein Violett als Text**, gilt auch für Stationen 11 + 14.

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
