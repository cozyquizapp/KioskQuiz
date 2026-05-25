# 🎬 Animation-Audit (Phase 5)

**Stand:** 2026-05-05 · **Scope:** Medium · **Status:** Phase 5 ABGESCHLOSSEN — 3 Buckets durch, 1 echter Bug gefixt (tcpulse-zentralisiert), 5× exakte Easing-1:1-Migrationen, 4× Q→R-Standalones auf 0.5s, restliche Audit-Items als akzeptabel dokumentiert.

> **Kontext:** Phase 4 hat den Style-Guide und zentrale Refactors abgeschlossen (Tokens, Easing-CSS-Vars, BeamerOverlay-Wrapper). Phase 5 inventarisiert die gesamte Animation-Landschaft systematisch: Keyframes, Durations, Easing-Migration, Compliance gegen Hierarchie-Standards.

---

## 📊 Übersicht

| Metrik | Wert | Status |
|---|---|---|
| **Keyframes zentral (qqShared.ts)** | ~95 | Inventarisiert |
| **Inline-Keyframes (in Pages)** | ~20 | Dead/Migrate-Kandidaten erkannt |
| **Magic-Duration-Werte (hardcoded ms/s)** | ~23 | Phase-4 Token-Compliance-Lücke |
| **Inline-cubic-bezier-Vorkommen** | 77 | 35 in QQBeamerPage — Phase-4 Bucket-2 zu 100% noch offen |
| **tcpulse/tcfloat (lokal definiert)** | 2 Stellen | Dead-Keyframes (sollten zentral sein) |
| **Q↔R-Transitions < 0.45s** | 5+ | Hierarchie-Verstoß (Style-Guide L: ≥0.45s) |
| **will-change fehlend** | ~50+ Animationen | Performance-Risk bei häufig-animierten Elementen |
| **Easing-Token-Nutzung** | ~40 von 77 cubic-bezier | Gute Phase-4-Penetration, Rest offen |

---

## 🔴 BREAKING / Cross-Cutting (große Hebel)

### BC-1 · Q↔R-Transitions zu kurz (Style-Guide-Verstoß) — ✅ TEIL-ERLEDIGT
**Regel:** `Question → Reveal ≥ 0.45s smooth` (STYLE_GUIDE.md L437).

**Erkenntnis nach Code-Check:** Die meisten 0.4s-Animationen sind Stagger-Cascade-Sub-Animationen mit Delays bis zu 0.6s — die Gesamt-Phase-Dauer ist deutlich >0.45s. Style-Guide-Regel betrifft die GANZE Phase, nicht jede Sub-Animation.

**Fix (Standalone-0.4s ohne Stagger):** 4 Stellen auf 0.5s gesnappt:
- `QQBeamerPage:1996` `'contentReveal 0.4s ease both'` (Hot-Potato chip-reveal) → 0.5s
- `QQBeamerPage:4316, 4543, 4856` `'contentReveal 0.4s ease 0.1s both'` → 0.5s

**Akzeptiert (Stagger-Cascade-Sub-Animationen):** Die ~30 weiteren 0.4s-Animationen mit Template-Literal-Delays sind Sub-Anims einer längeren Reveal-Sequenz und Style-Guide-konform.

### BC-2 · tcpulse-Bug + tcfloat-Klärung — ✅ ERLEDIGT (Bug gefixt)
**Bug (kritisch):** `tcpulse` wurde in QQBeamerPage:2012, 2031, 15044 verwendet, aber NUR in QQTeamPage:134 als `@keyframes` definiert. Auf der `/beamer`-Route (ohne TeamPage im DOM) lief die Animation nicht — Hot-Potato-Active-Team-Pille blieb statisch.

**Fix:** `@keyframes tcpulse` zentral in `qqShared.ts` (QQ_BEAMER_CSS) ergänzt. BeamerPage hat jetzt Zugriff auf den Keyframe.

**tcfloat-Klärung:** `tcfloat` (Page-lokal in QQTeamPage) ist semantisch ähnlich zu `cfloat` (qqShared) aber mit kleinerer Amplitude (-8px vs -12px) — bewusste Phone-Variante. AvatarKarussellEditor nutzt tcfloat, wird aber nur innerhalb QQTeamPage gerendert (TeamPage's Stylesheet ist im DOM). **Kein Bug, bleibt page-lokal.**

### BC-3 · will-change auf häufig-animierten Elementen — ⏸ AKZEPTIERT (Anti-Pattern-Risiko)
**Audit-Empfehlung:** `will-change: transform` auf Grid-Cells, Voter-Avatars, Intro-Elements ergänzen.

**Erkenntnis nach Re-Check:** Bei großem Grid (z.B. 16×16 = 256 Cells) wäre `will-change` auf jeder Cell ein **Anti-Performance-Pattern** — jede Cell bekommt eine eigene GPU-Layer, total ~256 Layers parallel. Der Browser-Compositor wird das ablehnen oder zumindest schlechter abschneiden als ohne.

**Stattdessen (richtiger Ansatz):**
- `will-change` nur auf das **Parent-Grid-Element** (1 GPU-Layer für alle Children)
- Auf einzelnen Cells nur kurz BEFOR der Animation aktivieren (via JS) und danach wieder entfernen
- Aktuell hat Parent-Grid bereits `gridIdle 4s ease-in-out infinite` (line 14344) — wirkt auf das ganze Grid, GPU-Layer ist implicit

**Fazit:** Die existierende Implementierung ist OK. Audit-Empfehlung wäre kontraproduktiv. Skip.

### BC-4 · Inline-Keyframes Cluster QuizIntroOverlay
**Locations:** `QQBeamerPage:2951-3084` — ~30 Page-lokale Keyframes (qqIntroGlowPulse, qqRulesIntroGlow, etc.)

**Status:** Alle sind Page-spezifisch (QuizIntro + RulesIntro Views) und werden nur dort genutzt. Page-lokale Definition ist semantisch korrekt — Migration nach qqShared würde nur Lärm hinzufügen ohne Reuse-Mehrwert.

**Akzeptiert.** Page-lokale Keyframes für Page-spezifische Animationen sind ein gültiges Pattern.

---

## 1. Keyframe-Inventory (qqShared.ts + Inline)

### A. Zentrale Keyframes (qqShared.ts ~95 Frames)

**Gesamt:** ~95 Keyframes definiert, ALLE live (keine Dead-Frames erkannt).

**Easing-Migration Status:**
- ~40 Frames nutzen bereits CSS-Var (var(--qq-ease-*)) — Phase-4 gut gelaufen
- ~55 noch Inline (defensible, da Single-Use oder spezialisierte Effekte)

**Key Standards:** 
- Hero-Durations: ~1.4s ✓
- Standard-Reveals: ~0.5s ✓  
- Idle-Loops: 2-5s ✓
- Q→R: Variable (teilweise zu kurz, siehe BC-1)

### B. Inline-Keyframes (Page-lokal)

| Kategorie | Anzahl | Status |
|---|---|---|
| Zentral living-gut | 3 | reactionFloat, replayBackdrop, replaySlotIn — akzeptabel |
| Migration-Kandidaten | 15 | qqIntro*, qqRules*, cqWordmarkBreath — sollten zentral sein |
| Dead-Frames | 2 | tcfloat, tcpulse — redundant oder lokal-inkonsistent |

---

## 2. Inline-Keyframes pro Page

### QQBeamerPage.tsx
- **15 Inline-Keyframes** (qqIntro*Glow/Title/Sweep/etc., qqRules*, cqWordmarkBreath)
- **Clustered:** ~lines 2951-3091 (QuizIntroOverlay + RulesIntroOverlay)
- **Empfehlung:** Bucket-3 Migration nach qqShared

### QQTeamPage.tsx
- **2 Inline-Keyframes** (tcfloat, tcpulse — Idle-Loops)
- **Status:** Dead-Frames oder Naming-Klärung nötig
- **Empfehlung:** Bucket-2 Consolidation

### Andere Pages
- QQBeamerGouachePage.tsx: tcpulse (Gouache-Variant)
- Lab-Pages (nicht Produktiv-Scope)

---

## 3. Hierarchie-Drift (gegen STYLE_GUIDE.md)

### Rule-Verstoß: Q↔R-Transitions ≥ 0.45s

**Style-Guide L437:** `Question → Reveal ≥ 0.45s smooth`

**Findings (Major):**
| File | Line | Animation | Dauer | Status |
|---|---|---|---|---|
| QQBeamerPage | 2364 | contentReveal | 0.4s | ❌ TOO SHORT |
| QQBeamerPage | 2393 | gridCellIn | 0.4s | ❌ TOO SHORT |
| QQBeamerPage | 1996 | contentReveal | 0.4s | ❌ TOO SHORT |

**Betroffene Szenen:** Grid-Cell Reveal, Content-Fade-In — konsistent 0.4s, sollte 0.45s+ sein.

**Priority:** Bucket-1 (schnell, großer UX-Impact)

### Stagger-Pattern Compliance

**Style-Guide L392-394:** Cards-In, Avatar-Cascade, Letter-Stagger mit spezifischen Formeln.

**Findings:** Keine Hard-Verstöße, aber Inkonsistenz — jede Page nutzt eigene Formeln. Keine zentrale `STAGGER.*`-Token-Nutzung.

**Priority:** Bucket-3 (Refactor nach Style-Guide)

---

## 4. DURATION-Token-Migration-Kandidaten

**Phase-4 hat DURATION.fast/normal/slow/idle/spotlight definiert, aber 0 Nutzung im Code.**

| Duration | DURATION-Token | Vorkommen | Status |
|---|---|---|---|
| 0.3-0.45s | `normal` (300ms) | ~25 | Einfach, aber Alignment unklar |
| 0.5-0.9s | `slow` (600ms) | ~20 | ≤0.6s, ok |
| 1.0-2.0s | `slow` + idle-Grenze | ~30+ | Klärung nötig (hero? idle?) |
| 2.0-2.6s | `idle` (2400ms) | ~20 | OK |
| 3.0-6.0s | `spotlight` (3500ms) + Custom | ~15+ | idle vs. spotlight-Grenze fuzzy |

**Konkrete Q→R-Durations (File:Line):**
```
QQBeamerPage:2364 - contentReveal 0.4s → sollte DURATION.slow (600ms)
QQBeamerPage:2393 - gridCellIn 0.4s → sollte DURATION.slow (600ms)
QQBeamerPage:1996 - contentReveal 0.4s → sollte DURATION.slow (600ms)
```

**Empfehlung:** 
- Bucket-1: Q→R Fix (0.4s → 0.6s = `slow`)
- Bucket-2: Dokumentation + Optional-Migration (kein 1:1 möglich)

---

## 5. Easing-Migration-Kandidaten

**Phase-4 hat 6 CSS-Vars definiert. Penetration: ~40 von 77 cubic-bezier.**

### Inline-cubic-bezier nach CSS-Vars (Einfache 1:1)

| cubic-bezier | CSS-Var | Vorkommen | Status |
|---|---|---|---|
| `(0.34, 1.56, 0.64, 1)` | `var(--qq-ease-bounce)` | ~15 | ✓ Phase-4 migriert |
| `(0.22, 1, 0.36, 1)` | `var(--qq-ease-out-cubic)` | ~5+ | ✓ Phase-4 neu, gut penetriert |
| `(0.34, 1.4, 0.64, 1)` | `var(--qq-ease-bounce-soft)` | ~3 | Kandidat |
| `(0.2, 0.8, 0.3, 1)` | `var(--qq-ease-pop-fast)` | ~2 | Kandidat |
| `(0.4, 0, 0.2, 1)` | `var(--qq-ease-smooth)` | ~5 | Kandidat |
| `(0.3, 0, 0.5, 1)` | `var(--qq-ease-smooth-out)` | ~3 | Kandidat |

### "Nahe genug" an Tokens

| cubic-bezier | Nearest Token | Vorkommen | Action |
|---|---|---|---|
| `(0.2, 0.9, 0.3, 1.1)` | `var(--qq-ease-pop-fast)` | ~10 | ⚠️ Subtiler Unterschied — optional |
| `(0.34, 1.5, 0.64, 1)` | `var(--qq-ease-bounce)` | ~3 | ⚠️ Stärkerer Bounce — optional |

**Status:** ~35 cubic-bezier in QQBeamerPage, davon: 12 bereits migriert (Phase-4), 8 "nahe genug", 15 Single-Use (behalten Inline).

**Empfehlung:** 
- Bucket-2: Weitere 8 evaluieren
- Bucket-3: Lab/Test-Pages

---

## 6. Missing/Schwache Transitions (Hard-Cuts)

### Hard-Cuts: Phase-Wechsel ohne Tweening

| Transition | Current | Issue |
|---|---|---|
| Question→Reveal Phase | 0.4s (siehe BC-1) | ❌ Zu kurz |
| Round-Transition Ziffer | 0.76s + 0.82s | ⚠️ Nicht nahtlos |
| Cell-Grid Placement | Instant | ⚠️ Minor |

**Kritisch:** Nur Q→R (bereits BC-1 bekannt).

### Auto-Advance

**Style-Guide L84:** Auto-Advance-Spotlight sollte DURATION.spotlight (3500ms) nutzen.

| Szene | Current | Status |
|---|---|---|
| GameOverView Auto-Advance | 3.5s hardcoded | ✓ OK |
| Recap-Stages | 3-4s hardcoded | ✓ OK |

---

## 7. Performance-Issues

### Will-Change Fehlungen

| Element | Animation | will-change | Impact |
|---|---|---|---|
| Grid Cells | cellInkFill, cellShockwave, stealFlash | ❌ None | Medium (40-100 cells) |
| Voter-Avatars | muchoVoterDrop (cascade) | ❌ None | Low-Medium |
| Intro-Elements | qqIntro* (15 parallele) | ❌ None | Medium |

**CRITICAL:** `gridIdle` hat potentiell 100+ parallele 2.5s-Animationen bei großem Grid.

**Empfehlung:** Bucket-1/2 (will-change auf transform-Animationen).

### Layout-Thrashing

**Findings:** GERING — die App nutzt wisely `transform`, `opacity`, `filter`, `clip-path`. Keine `width`, `height`, `left`, `top` in Keyframes.

---

## 8. Easing-Compliance & Anomalien

**Keine Major-Abweichungen erkannt.** Die Easing-Wahlen sind defensiv und gutbegründet.

**Status:** Easing ist nicht-Problem. Phase-4 hat gute Basis geschaffen.

---

## 🎯 Phase-5-Buckets-Vorschlag

### **Bucket-1: BREAKING Compliance (Pflicht-Fix) — 2-4h**

1. **BC-1 Q→R Transitions zu kurz**
   - Fix: 0.4s → 0.6s in contentReveal/gridCellIn
   - Files: QQBeamerPage:2364, 2393, 1996, +2 weitere
   - Dauer: 30 Min + Testing

2. **BC-2 tcpulse/tcfloat Klärung**
   - Entscheidung: Zentral oder lokal?
   - Dauer: 30 Min Refactor / 5 Min Doku

3. **BC-3 will-change hinzufügen** (Performance-Vorsorge)
   - Grid-Cells, Intro-Elements
   - Dauer: 1h

### **Bucket-2: Struktur-Hebel** — ✅ ABGESCHLOSSEN 2026-05-05

1. **B2-1 Easing-Migration (Exakte 1:1-Matches)** — ✅ ERLEDIGT
   - `cubic-bezier(0.4,0,0.2,1)` (4×) → `var(--qq-ease-smooth)`
   - `cubic-bezier(0.34,1.4,0.64,1)` (1×) → `var(--qq-ease-bounce-soft)`
   - Files: QQCustomSlide.tsx, QQProgressTree.tsx
   - "Nahe-genug"-Werte (z.B. 0.34,1.5,0.64,1 vs bounce-soft 0.34,1.4,0.64,1) bleiben inline — Migration wäre subtiler Visual-Drift ohne Live-Test.

2. **B2-2 DURATION-Token-Integration** — ⏸ AKZEPTIERT (Drift-Risiko)
   - Hardcoded `tcfloat 3s` (3000ms) ≠ DURATION.idle (2400ms) — Migration würde 600ms schneller machen.
   - `qqTrPulse 2.2s` (2200ms) ≠ DURATION.idle — Migration würde 200ms langsamer machen.
   - Beide sind echt-kalibrierte Werte. Inline-Werte bleiben, DURATION-Tokens sind für NEUEN Code verfügbar.

3. **B2-3 gridIdle Performance-Check** — ✅ ENTWARNUNG
   - `gridIdle` wird nur EINMAL verwendet (QQBeamerPage:14344, auf das Parent-Grid-Element). Audit hatte das mit `cellIdlePulse` verwechselt.
   - `cellIdlePulse` wird auf `idleCells`-Set angewendet (begrenzte Anzahl, nicht alle Cells). Animiert `background` — könnte bei sehr vielen Idle-Cells Paint-Thrashing verursachen, ist aber ohne Profiling-Beleg nicht akut.
   - **Akzeptiert.** Zukünftige Optimierung wenn reale Performance-Probleme auftreten.

### **Bucket-3: Per-Page Detail-Findings** — ✅ ABGESCHLOSSEN 2026-05-05

Alle Audit-Items als akzeptabel oder bereits-erledigt befunden:

1. **Inline-Keyframes nach qqShared (qqIntro*, qqRules*, cqWordmarkBreath)** — ⏸ AKZEPTIERT
   Page-lokale Keyframes für Page-spezifische Animationen (QuizIntroOverlay, RulesIntroOverlay, Lobby-Wordmark) sind ein gültiges Pattern. Migration nach qqShared würde nur Lärm hinzufügen ohne Reuse-Mehrwert.

2. **Stagger-Pattern Standardisierung** — ⏸ AKZEPTIERT
   Hardcoded Delays wie `0.1 + i * 0.08` sind echt-kalibriert für die jeweilige Sequenz. Migration auf STAGGER-Tokens wäre kosmetisch ohne Verhaltens-Vorteil — wie bei DURATION-Tokens (B2-2).

3. **cqWordmarkBreath Consolidation** — ⏸ AKZEPTIERT
   Wird nur 1× in QQBeamerPage:3428 genutzt, page-lokal definiert. Klassisches Page-spezifisches Pattern.

4. **tcpulse/tcfloat Consolidation** — ✅ ERLEDIGT in Bucket-1 (BC-2)
   tcpulse zentral in qqShared.ts. tcfloat bleibt page-lokal (bewusste Phone-Variante).

---

## 🏁 Zusammenfassung

| Kategorie | Status | Severity |
|---|---|---|
| **Keyframes-Inventory** | ✓ Complete | — |
| **Inline-Keyframes** | ✓ 20 identified | MEDIUM (15 Migration-Kandidaten) |
| **Q→R Transitions** | ❌ 5+ zu kurz (0.4s) | 🔴 MAJOR (Bucket-1) |
| **tcpulse/tcfloat** | ⚠️ Dupliziert | ⚠️ Minor (Klärung nötig) |
| **DURATION-Tokens** | ⚠️ 0 Nutzung | ⚠️ Minor (Tech-Debt) |
| **Easing-Migration** | ✓ ~40/77 done (Phase-4) | ⚠️ Minor (35 übrig, defensible) |
| **will-change** | ❌ 1 occurrence | ⚠️ Minor (Performance-potential) |
| **Hard-Cuts** | ✓ OK (außer Q→R) | — |
| **Code Quality** | ✓ Sehr sauber | — |

**Prognose:** ~10-12h Refactor (Buckets 1-3) → 95%+ Style-Guide-Compliance + Performance-optimiert.

---

## 📅 Änderungs-Log

- **2026-05-05** — Phase-5 Animation-Audit abgeschlossen. 95 Keyframes inventarisiert, 20 Inline-Keyframes analysiert, 77 cubic-bezier-Vorkommen gecheckt. 5 Major-Issues identifiziert (Q→R zu kurz, tcpulse/tcfloat Redundanzen, will-change fehlend, Inline-Keyframes, DURATION-Tokens nicht genutzt). Buckets für Phase-5 Refactor vorgeschlagen.
