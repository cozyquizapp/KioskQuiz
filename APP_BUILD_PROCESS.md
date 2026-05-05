# 🏗️ App-Build-Vorgehen — Wolf's Playbook

**Erstellt:** 2026-05-05 · **Quelle:** Erfahrung aus CozyQuiz-Build (Wochen Punkt-für-Punkt-Bugfix vs. systematischer Vereinheitlichung)

> **Das Wichtigste in 1 Satz:** Bau erst das System, dann die Features — nicht umgekehrt. Wenn du am Ende bist und merkst „die App fühlt sich nicht einheitlich an", hast du am Anfang das System vergessen.

---

## 🎯 Das große Prinzip

App-Bauen hat zwei Modi:
- **Feature-Modus** = ich baue X (eine neue Folie, einen neuen Button)
- **System-Modus** = ich definiere Regeln/Standards, gegen die alle Features sich messen

Die meisten Anfänger machen 90% Feature-Modus, 10% System-Modus. Resultat: Feature-Salat, der zwar funktioniert, aber sich „unfertig" anfühlt. Polish kostet dann das Doppelte der ursprünglichen Bauzeit.

**Die effiziente Aufteilung:**
- Phase 0–1: ~30% System-Modus (Design-System, Architektur)
- Phase 2–3: ~70% Feature-Modus (das eigentliche Bauen)
- Phase 4: ~50/50 — Audit + gezielter Refactor

---

## 📋 Das 5-Phasen-Vorgehen

### Phase 0 — Konzept (vor Code)

**Was du tust:**
1. **One-Pager schreiben:** Was ist die App in 1 Absatz? Wer nutzt sie wofür?
2. **Pages-Liste:** Welche Folien/Screens gibt es? (Lobby → Frage → Antwort → ... → Endscore)
3. **Mechaniken-Liste:** Was sind die Spielmechaniken / User-Flows?
4. **Zielgruppe & Setting:** Pub vs. Schule, 8m Beamer-Distanz vs. Phone-Hand, etc. — beeinflusst Schriftgrößen, Farben, Tap-Targets

**Output:** `CONCEPT.md` — 1-2 Seiten, klar genug dass jemand anders es nachbauen könnte.

**Zeit:** 1-2h. **Nicht überspringen.** Spätere Tausenden von Stunden hängen daran.

---

### Phase 1 — Design-System BEVOR Code

**Was du tust:**
1. **Token-Datei schreiben** (z.B. `designTokens.ts`):
   - **Colors:** Text-Hierarchie (primary/secondary/muted/dim), Akzent-Brand, Status (success/warning/danger), Theme-Backgrounds
   - **Spacing:** Padding/Gap-Tripel (XL/LG/MD/SM mit clamp-Werten für responsive)
   - **Radii:** 4 Stufen (tight/normal/rounded/pill = z.B. 8/16/24/9999)
   - **Typography:** Hierarchie (Hero/Title/Section/Body/Pill/Eyebrow) mit clamp-Werten + fontWeights (700/900 reichen)
   - **Animation:** Duration (fast/normal/slow), Easing (bounce/smooth/popFast), Stagger (tight/normal/leisurely)
   - **Tap-Targets:** Min-Größen (44px / 48px laut Apple HIG)

2. **Style-Guide schreiben** (`STYLE_GUIDE.md`) — als Doku für die Tokens:
   - Wann welche Farbe verwenden?
   - Wann Hero vs Standard vs Compact Card?
   - Welcher Status-Indikator wofür (z.B. green-Glow für „submitted", ✓/✕ für „korrekt/falsch")?
   - Hard-Rules (z.B. „nie Scrollbar auf der Display-Seite", „Card immer vertikal mittig")

3. **Animation-Vocabulary festlegen** (`animations.css` oder `keyframes.ts`):
   - Welche Animation für welchen Use-Case?
   - 5-10 Standard-Animationen reichen für 80% der Fälle (phasePop, contentReveal, revealCorrect, slideIn, etc.)

**Output:** Drei zentrale Dateien (`designTokens.ts` / `STYLE_GUIDE.md` / Animation-Liste). Jede Code-Zeile später muss sich an diesen Standards orientieren.

**Zeit:** 4-8h. **Wichtig:** Du baust hier WENIG Code, aber sparst später Wochen.

**Falle:** „Ich definiere das später, will erst was sehen" → das ist der Grund warum 80% der Apps nach 6 Monaten unhomogen wirken.

---

### Phase 2 — MVP bauen (Feature-Modus)

**Was du tust:**
1. **Erste 3 Pages bauen** (z.B. Login, Hauptansicht, Detail). Komplette Flows.
2. **STRENG nach Style-Guide** — bei jeder neuen Komponente: nutzt du Tokens? Hast du Standards verletzt?
3. **Keine Custom-Lösungen** wenn Standard funktioniert. „Ich baue das schnell anders" → später Refactor-Hölle.

**Disziplin-Hebel:**
- Bei jedem Inline-Hex (`#FBBF24`) musst du dich fragen: gibt's das im Token-System? Wenn ja, importieren. Wenn nein, neuen Token erstellen.
- Bei jeder neuen Animation: nutze ich was Existing? Wenn nein, brauche ich wirklich was Neues, oder geht's mit Standard-Animation?

**Output:** Minimal-Funktionsfähige App, klein aber konsistent.

**Zeit:** abhängig vom Scope. Bei mittlerer App: 2-4 Wochen.

---

### Phase 3 — Iterativ erweitern (Feature-Modus + Mini-Audits)

**Was du tust:**
1. **Pro neuer Page: Mini-Audit** — checke gegen Style-Guide BEVOR du commitest
2. **Bei wiederkehrenden Inkonsistenzen:** zurück zu Phase 1, Style-Guide aktualisieren statt jedes Symptom einzeln fixen
3. **User-Feedback einholen** — aber Tausende kleine Bugs HÄUFEN sich. Sammle sie strukturiert (z.B. in `BUGS.md` oder Issue-Tracker), nicht „heute höre ich von Wolf was XY ist und fixe es spontan"

**Disziplin-Hebel:**
- **Batch-Fix-Sessions** statt Reagieren-auf-jeden-Report. Wolf-Beispiel: 2x pro Woche eine 90-Min-Session in der ALLE Bugs der Woche durchgegangen werden.
- Bei jedem Bug fragen: ist das ein Symptom (1 Stelle) oder ein Pattern (10 Stellen)? Pattern-Fixes haben 10× Hebel.

**Output:** Funktional komplette App.

---

### Phase 4 — Polish-Audit (System-Modus zurück)

**Wann starten:** wenn du 50+ Pages/Screens hast UND mindestens 1 fertige Spiel-Session damit gemacht hast.

**Was du tust:**

1. **Style-Guide aus dem aktuellen Code rausziehen** (1-2h):
   - Was ist tatsächlich überall verwendet?
   - Stimmt das mit deinem Phase-1-Style-Guide überein?
   - Gibt's neue Patterns die du in Phase 1 nicht voraussehen konntest?
   - → Style-Guide aktualisieren

2. **Page-by-Page-Audit** (parallel via mehrerer Auditor-Subagenten / oder Mini-Sessions):
   - Pro Page: Checkliste durchgehen
     - [ ] Tokens verwendet (kein Magic Number)?
     - [ ] Status-Indikatoren konsistent?
     - [ ] Card-Variant passend zum Use-Case?
     - [ ] Animationen aus dem Vocabulary?
     - [ ] Typography-Hierarchie sinnvoll?
   - Findings als Major / Minor / Nitpick klassifizieren
   - → `AUDIT_FINDINGS.md` mit allen Findings + Datei:Zeile-Refs

3. **Cross-Cutting-Patterns identifizieren** (das wichtigste!):
   - Was kommt in 3+ Pages vor?
   - Beispiel: „inline `#FBBF24` statt `ACCENT_GOLD.bright`" in 15 Pages → 1 Codemod fixt 15 Stellen.
   - DAS ist die Hebel-Wirkung, nicht „1-Stunden-Fix pro Page = 50 Stunden".

4. **Priorisieren in 5 Buckets:**
   - Bucket-1: BREAKING-Inkonsistenzen (Style-Guide-Verletzung mit User-Impact) → Pflicht
   - Bucket-2: Strukturelle Hebel (Cross-Cutting-Patterns) → großer Effizienz-Gewinn
   - Bucket-3: Per-Page-Detail-Findings → langer Tail
   - Bucket-4: Style-Guide-Lücken-Patches (vor Refactor!)
   - Bucket-5: Akzeptiert / Nitpicks → bewusst „nicht fixen"

5. **Refactor in Cluster-Sessions:**
   - Reihenfolge: Bucket-4 (Style-Guide updaten) → 1 (BREAKING) → 2 (Cross-Cutting) → 3 (Details)
   - Pro Cluster 1-2 Sessions, sauberer Commit

**Wichtig während Phase 4:**
- **KEINE spontanen Bug-Reports während Audit** außer Live-Killer (App hängt, Daten weg). Sonst überlappen sich Refactors.
- **Code-Änderungen NUR nach Findings-Liste** — kein Neugierde-Refactor.

**Output:** ~95% Compliance gegen Style-Guide. Die App fühlt sich „aus einem Guss" an.

---

## 🪤 Die 7 häufigsten Fallen

### Falle 1: „Ich definiere die Tokens später"
**Wahrheit:** „Später" wird nie. Das System wird IMPLIZIT durch jede Code-Zeile gesetzt — wenn du nicht explizit definierst, ist es chaotisch.

### Falle 2: „Ich brauche ne Custom-Animation hier"
**Wahrheit:** 95% der Custom-Animationen sind „leicht andere" Standard-Animationen. Wenn du die zentrale Animation um 0.05s langsamer brauchst, dann ändere die zentrale, nicht baue ne neue.

### Falle 3: „Spontan fixen weil User es gesagt hat"
**Wahrheit:** User-Reports sind Symptome. Frag immer: „Ist das ein Pattern?" Wenn ja, sammle, fix als Cluster. Sonst patcht du 50× das gleiche Pattern und übersiehst die Wurzel.

### Falle 4: „Ich mache meine Style-Guide-Doku am Ende"
**Wahrheit:** Style-Guide am Ende = Beobachtung des Chaos. Style-Guide am Anfang = Plan für Ordnung. Beides hat seinen Platz, aber nur der Plan-Modus verhindert Chaos.

### Falle 5: „Cross-Cutting-Refactors sind risky, ich mach lieber Detail-Fixes"
**Wahrheit:** Cross-Cutting fixt 60-80% der Findings auf einmal. Detail-Fixes 2-3% pro Stunde. Mathematik ist klar — Cross-Cutting ist 20× effizienter.

### Falle 6: „Ich habe keine Zeit für Audit, ich bin spät dran"
**Wahrheit:** Der Audit SPART Zeit. Eine 4h-Audit-Session vs. 50h fragmentierter Bugfix — der ROI ist klar.

### Falle 7: „Style-Guide ist Bürokratie"
**Wahrheit:** Style-Guide ist Speicher. Du kannst dir nicht 200 Detail-Entscheidungen merken. Geschriebene Standards = du musst nicht jedes Mal neu nachdenken.

---

## 🛠️ Konkrete Tools / Patterns die immer helfen

### Token-Imports statt Magic Numbers
```ts
// ❌ Schlecht
borderRadius: 16
color: '#FBBF24'
boxShadow: '0 0 22px rgba(251,191,36,0.55)'

// ✅ Gut
import { RADII, ACCENT_GOLD, ALPHA_DEPTH } from './designTokens';
borderRadius: RADII.normal
color: ACCENT_GOLD.bright
boxShadow: `0 0 22px ${ACCENT_GOLD.bright}${ALPHA_DEPTH.d2}`
```

### CSS-Variablen für Easing & Theme
```css
:root {
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
}
/* Dann überall: animation: pop 0.5s var(--ease-bounce); */
```

### Ein Memory/Notes-Ordner für KI-assisted Development
- `MEMORY.md` Index aller Patterns, Regeln, Architektur-Hinweise
- Pro Topic eine eigene `.md` (z.B. `feedback_brainstorm_first.md`)
- Mit Auto-Memory-System sammelt sich das ZeitLinear an, jede Session profitiert von vorher

### Tracking-Doku pro Session
- Was wurde gebaut + warum (Commit-Messages)
- Was wurde verworfen + warum (HANDOVER_NEXT.md)
- Was steht offen + Priorität (TODO)

### Audit-Subagenten parallel laufen lassen
- Bei großen Codebases: 1 Auditor pro Cluster (5-6 Pages)
- Parallel laufen → 4 Cluster in 5 Min statt sequentiell 20 Min
- Konsolidieren in einem Master-Findings-Dokument

---

## 📅 Zeit-Faustregel für eine mittlere App

| Phase | Anteil |
|---|---:|
| 0. Konzept | 5% |
| 1. Design-System | 15% |
| 2. MVP (3 Pages) | 25% |
| 3. Erweitern + Mini-Audits | 40% |
| 4. Polish-Audit + Refactor | 15% |

**Wenn du Phase 1 überspringst, wird Phase 4 zu 40-50% der Gesamtzeit (statt 15%).** Das ist die Wahrheit hinter „diese App ist fast fertig, ich brauche nur noch ein bisschen Polish" — Polish ohne System ist Sysiphos.

---

## 🎯 Wenn du eine neue App startest

1. Lies dieses Doc.
2. Mach Phase 0 (CONCEPT.md) — 1-2h.
3. Mach Phase 1 (Tokens + Style-Guide + Animation-Vocabulary) — 4-8h.
4. **Erst dann** öffne den Code-Editor für Phase 2.

Diszipliniere dich für die ersten Wochen STRENG. Nach 3-4 Wochen wird's automatisch.

Wenn du dabei mit einer KI arbeitest:
- Style-Guide & Tokens als Memory-MD speichern
- Bei jedem Feature-Build: KI explizit auf Tokens hinweisen
- Cross-Cutting-Audits regelmäßig (monatlich) statt am Ende

Das ist der Unterschied zwischen „ich pixele 6 Monate an einer App" und „ich habe in 3 Monaten eine App die sich fertig anfühlt".

---

**Wolf, 2026-05-05** — Notes aus dem Cozy-Quiz-Build, geschrieben nach der Erkenntnis dass fragmentiertes Bugfixen nicht effizient ist und ein systematisches Audit nötig war. Hoffentlich hilft's beim nächsten Projekt.
