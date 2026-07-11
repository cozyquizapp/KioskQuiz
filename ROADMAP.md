# CozyQuiz — Roadmap: der Weg zu „verkaufsbereit"

> **Zweck dieser Datei:** eine **Ziellinie** definieren, damit Polish nicht endlos
> wird. „Fertig" gibt es bei einem Produkt nie — aber **stabil + verkaufsbereit**
> schon. Das ist erreichbar, nicht 3 Jahre entfernt.
>
> **Arbeitsteilung:** `ROADMAP.md` (diese Datei) = die großen Meilensteine + was
> „fertig" heißt. `todo.md` = die granularen offenen Tasks. Jede gemeinsame Session
> startet mit einem Blick hierher: *Sind wir noch auf dem aktuellen Meilenstein?*
>
> *(Die alte Infra-Sprint-Roadmap von 2026-05-08, alle Sprints erledigt, liegt in
> der Git-History.)*

---

## 📍 Wo wir stehen (ehrlich)

Die App ist **LIVE**, echte Pub-Quizze laufen damit, die Kernschleife
(Setup → Spiel → Reveal → Finale → Summary) funktioniert. **Das ist bereits ein
Produkt**, kein Prototyp. Es fehlt nicht „die App" — es fehlt der Nachweis, dass sie
bei **echtem Einsatz + Skalierung + Englisch** wasserdicht ist, plus das Schließen
einer Handvoll bekannter Rauheiten.

---

## 🎯 Definition of Done (die Ziellinie)

Die App ist **verkaufsbereit**, wenn all das steht:

- [ ] Kernschleife läuft stabil + ohne sichtbare Bugs für **2–8 Teams** UND **25–40 Teams** (Arena).
- [ ] Ein **Fremder joint ohne Erklärung** und spielt mit (Onboarding wasserdicht).
- [ ] Voll spielbar auf **Deutsch UND Englisch**.
- [ ] **Nachweislich skaliert** auf ein echtes Event (Lasttest bestanden).
- [ ] **Solo moderierbar** (Streamdeck-Flow, keine Panik-Momente vor Publikum).

**Alles darüber hinaus = Wachstum, nicht „fertig".** Wenn diese 5 Haken sitzen,
hast du ein Produkt, das du guten Gewissens verkaufst.

---

## 🧭 Meilensteine

### M1 — CozyArena Event-Ready 🔥 (JETZT, ~4 Wochen)
Der Event-Plan in `todo.md` ist die **Forcing Function**: Er zwingt genau die
schwersten Done-Kriterien (Skalierung, Englisch, Onboarding) durch. Wenn M1 steht,
ist der **Löwenanteil der Definition of Done erledigt.**
- [x] Team-Cap 25→40 · Lobby-Anzeige ehrlich · Fraktions-Auto-Balance
- [ ] 40-Geräte-Lasttest (echte Verbindungen, nicht In-Process-Bots)
- [ ] EN-Content des Event-Drafts vollständig (`*En`-Felder)
- [ ] Join-Onboarding EN wasserdicht (QR, „3–4 pro Handy", klare Beitreten-Seite)
- [ ] Kompletter Trockenlauf + Backend-Redeploy (Coolify)

### M2 — Stabil & Verkaufsbereit (direkt nach dem Event)
Aus dem echten Event lernen, statt spekulativ zu polieren:
- [ ] Was das Event an Bugs/Rauheiten zeigt, **fixen** (echte Funde, kein Raten).
- [ ] Die bekannten **No-Repro-Bugs** (`todo.md` „Beobachten") beim nächsten Auftreten schließen.
- [ ] **Voll-Review Standard-Modus (2–8 Teams) + Gesamt-App** — analog zum Arena-Event-Review
      (2026-07-11), aber über die GANZE App: alle Phasen DE+EN, Korrektheit, alle Features/Modi
      (nicht nur Arena). Deckt die **2–8-Team-Seite der Definition of Done** ab. Wolf-Wunsch, auf M2.
- [ ] Kern-Loop-Politur **nur wo es im echten Einsatz auffiel**.
- → **Danach ist die Ziellinie erreicht. Die App ist verkaufsbereit.**

### M3 — Wachstum / neue Zielgruppen (optional, markt-getrieben)
North Star: **Pub → Corporate → Events → Schule.** Diese Dinge baut man, **WEIL ein
Kunde/Markt sie zieht**, nicht um „fertig zu werden":
- Theme/Skin-System fertig (Studio Mono ✅; SoftPop/Neo-Brutal **nur wenn ein Corporate-Kunde es braucht**).
- Weitere Formate/Modi nach **echter Nachfrage**.
- Buchungs-/Erlös-Flow auf cozywolf.de.

---

## 🅿️ PARK — bewusst NICHT jetzt (deine Erlaubnis zu stoppen)

Damit aus 4 Wochen keine 3 Jahre werden. Alles hier ist **legitim aufgeschoben**:
- Spekulative Mikro-Animationen / Easing-Feinschliff **ohne konkrete Beanstandung**.
- **SoftPop + Neo-Brutal** Skins (bis ein Kunde sie zahlt).
- Ideen-Projekte (Pixel-Canvas Corporate, School-Pixel-Quiz, Per-Draft-Intro-Video, …).
- Interne Altlasten ohne User-Nutzen (z. B. `avatarId`-Keys `fox/frog/…` umbenennen).
- Jeder Polish-Fix, der **nicht im echten Einsatz aufgefallen** ist.

**Die eine Regel:** Dient es M1/M2 oder zieht es ein zahlender Kunde? Nein → **PARK.**

---

## 🔁 Arbeitsweise pro Session
1. **Hierher schauen:** Sind wir noch auf M1? (Solange M1 offen ist, hat M1 Vorrang.)
2. Konkrete Tasks: **`todo.md`**.
3. **Neue Idee?** → PARK, außer sie dient M1/M2 oder einem echten Kunden.

---

*Meilenstein-Fortschritt wird hier abgehakt. Granulare Erledigungen leben in der
Git-History + `todo.md`, nicht als Altlast hier.*
