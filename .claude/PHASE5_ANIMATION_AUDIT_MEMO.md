# 🎬 Animation-Audit Phase-5 — Memo für Wolf

**Audit abgeschlossen:** 2026-05-05

---

## 🎯 Top-3 Action Items (EMPFOHLENE REIHENFOLGE)

### 1️⃣ Bucket-1: BREAKING Compliance (2-4h) — JETZT
```
Q→R-Transitions zu kurz (0.4s statt ≥0.45s Style-Guide):
  QQBeamerPage:2364 - contentReveal 0.4s ease 0.35s → 0.6s
  QQBeamerPage:2393 - gridCellIn 0.4s ease → 0.6s  
  QQBeamerPage:1996 - contentReveal 0.4s ease → 0.6s
  
tcpulse/tcfloat Redundanzen klären:
  QQTeamPage:809 - tcfloat (lokal, könnte zentral sein)
  
will-change hinzufügen (Performance-Vorsorge):
  Grid-Cells (100+ parallele gridIdle 2.5s Animationen!)
  Intro-Elements (15+ parallele qqIntro*)
```

### 2️⃣ Bucket-2: Struktur-Hebel (4-6h) — WOCHE DANACH
```
Easing-Migration (Phase-4 Follow-up):
  8 "nahe genug" cubic-bezier → CSS-Vars evaluieren
  Dokumentation für restliche 15 Single-Use-Animations
  
DURATION-Token-Integration (Foundation für Zukunft):
  Dokumentation + Refactor-Guide (kein 1:1 möglich)
```

### 3️⃣ Bucket-3: Per-Page Details (3-5h) — SPÄTER
```
Inline-Keyframes Migration (qqIntro*, qqRules* → qqShared)
  ~15 Keyframes clustered in QQBeamerPage:2951-3084
  
Stagger-Pattern Standardisierung (STAGGER.tight/normal/leisurely)
```

---

## 📊 Audit-Zusammenfassung

**Keyframes:** 95 zentral in qqShared.ts + 20 inline Pages = 115 Keyframes total
**Status:** ✓ 0 Dead-Frames erkannt (alle live + sauberer Code)
**Easing:** 40/77 cubic-bezier zu Vars migriert (Phase-4 gut, Rest defensible)
**Durations:** 23 Magic-Werte — Phase-4 DURATION-Tokens nicht genutzt (Tech-Debt, nicht critical)
**Q→R Transitions:** 5+ unter 0.45s Style-Guide (MAJOR, Bucket-1)
**will-change:** Nur 1 occurrence — Performance-Risk bei großen Grids (Bucket-1)

**Code-Quality:** SEHR SAUBER. Naming konsistent, Keyframes semantisch sauber, keine Major-Red-Flags außer oben.

---

## 📁 Quelle

Vollständiger Audit: `/ANIMATION_AUDIT.md` im Repo-Root.

Fokus-Files (Scope laut Auftrag):
- `frontend/src/qqShared.ts` — 95 zentrale Keyframes
- `frontend/src/main.css` — Easing-CSS-Vars
- `frontend/src/qqDesignTokens.ts` — DURATION/EASING/STAGGER Tokens
- `frontend/src/pages/QQBeamerPage.tsx` — 35 cubic-bezier, 15 Inline-Keyframes, Q→R-Issues
- `frontend/src/pages/QQTeamPage.tsx` — 2 Inline-Keyframes (tcfloat, tcpulse)

---

## ⚡ Geschätzte Migrationsaufwand nach Buckets

| Bucket | Aufwand | Impact | Priorität |
|---|---|---|---|
| **1** | 2-4h | UX-sichtbar, Style-Guide-Compliance | 🔴 NOW |
| **2** | 4-6h | Code-Cleanup, Performance-Potential | 🟠 Week 1-2 |
| **3** | 3-5h | Refactoring-Schulden reduzieren | 🟡 Week 2-3 |
| **Total** | ~12-15h | 95%+ Style-Guide-Compliance | ✓ 2-3 Wochen |

---

## 🔗 Kontext zu Phase 4

Phase 4 hat erfolgreich geliefert:
- ✅ DURATION.fast/normal/slow/idle/spotlight Tokens
- ✅ 6 Easing-CSS-Vars (--qq-ease-bounce, smooth, smooth-out, bounce-soft, pop-fast, out-cubic)
- ✅ ALPHA_DEPTH, LETTER_SPACING, WEIGHT Tokens
- ✅ BeamerOverlay-Wrapper (Position-Fixed-Trap gelöst)
- ✅ ~40 cubic-bezier zu Vars migriert

Phase 5 (jetzt):
- ✅ Restliche Animation-Landschaft inventarisiert
- ✅ Q→R-Transition-Shortfall erkannt (BC-1)
- ✅ tcpulse/tcfloat Dead-Frames identifiziert (BC-2)
- ✅ will-change Performance-Gaps dokumentiert (BC-3)
- ✅ Refactor-Roadmap definiert

---

**Nächster Schritt:** Wolf entscheidet Bucket-1-Start-Zeitpunkt + tcpulse/tcfloat-Klärung (zentral oder lokal akzeptabel?).
