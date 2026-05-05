# 🤝 Hand-Over für nächste Session — Phase 4 (Polish-Refactor)

**Stand:** 2026-05-05 abend · **Letzter Commit:** `73b0b552` · **Branch:** `main`

> **Pflicht-Lektüre VOR der ersten Code-Änderung:**
> 1. `MEMORY.md` (im `.claude/projects/...`-Ordner) — User-Profile + Architektur
> 2. `STYLE_GUIDE.md` im Repo-Root — die Ground-Truth gegen die alles geprüft wird
> 3. `AUDIT_FINDINGS.md` im Repo-Root — die priorisierte Liste was zu tun ist
> 4. Diese Datei
>
> **Nicht überspringen.** Sonst wird der Refactor inkonsistent oder doppelt.

---

## 🎯 Wo wir stehen

Wolf hat erkannt dass wochenlanges fragmentiertes Bugfixen ineffizient ist. Wir haben deshalb ein **Vereinheitlichungs-Audit** gestartet. Stand:

| Phase | Status |
|---|---|
| **1. Style-Guide aus Code rausziehen** | ✅ Fertig (`STYLE_GUIDE.md`, 427 Zeilen) |
| **2. Page-by-Page-Audit (4 parallele Subagenten)** | ✅ Fertig (`AUDIT_FINDINGS.md`, 18 Pages, 36 Major-Findings) |
| **3. Wolf priorisiert die Findings** | ⏸ **WARTET — du musst hier starten** |
| **4. Polish-Refactor in Clustern** | ⏳ folgt nach Phase 3 |

---

## 🔴 Was zuerst zu tun ist

**Frag Wolf** welche der 5 Buckets aus `AUDIT_FINDINGS.md` er angehen will:

1. **Bucket-1: BREAKING** (Pflicht-Fix, ~1.5h)
   - CC-3 Bluff-Submit-Status fehlt Green-Ring
   - CC-4 Position-Fixed-Trap (2 Stellen)

2. **Bucket-2: Cross-Cutting (große Hebel-Wirkung, ~3-4h)**
   - CC-1 Magic-Numbers → Tokens (Codemod-Script)
   - CC-2 Inline-cubic-bezier → CSS-Vars
   - CC-5 PHASE_COLORS-Token zentral

3. **Bucket-3: Per-Page-Detail-Findings** (langer Tail, ~3-4h)

4. **Bucket-4: Style-Guide-Lücken-Patches** (1h, **MUSS VOR Phase 4 gemacht werden** wenn Tokens erweitert werden sollen)
   - 10 Lücken in `AUDIT_FINDINGS.md` aufgelistet (L1-L10)

5. **Bucket-5: Akzeptiert** (bewusst nicht fixen — Wolf-Entscheidung)

**Empfohlene Reihenfolge laut AUDIT_FINDINGS.md:**
1. Style-Guide-Lücken patchen (Bucket-4) — 1h
2. CC-3 Bluff-Fix — 20 Min
3. CC-2 Easing — 30 Min
4. CC-5 PHASE_COLORS — 30 Min
5. CC-1 Magic-Numbers Codemod — 2-3h **(größter Hebel)**
6. CC-4 BeamerOverlay-Wrapper — 1h
7. Bucket-3 Detail-Findings — 2-3h

**Total geschätzt:** 8-10h Refactor in Phase 4.

---

## 🚫 Was NICHT zu tun ist

**Während Phase 4:** keine spontanen Bug-Reports verarbeiten außer Live-Killer (App hängt, Daten weg, Crash). Sonst überlappen sich Refactors.

Wenn Wolf während Phase 4 was meldet: in `BUGS.md` (oder ähnlich) sammeln, NICHT spontan fixen. Erst wenn Phase 4 abgeschlossen ist, geht's wieder normal weiter.

---

## 📝 Pro Cluster: Workflow

1. Lies die relevanten Findings in `AUDIT_FINDINGS.md`
2. Lies Style-Guide-Section dafür
3. Plane Edit (Codemod oder gezielt)
4. Mach 1 Commit pro Cluster (NICHT mischen!)
5. Push
6. Update `AUDIT_FINDINGS.md` mit „✅ erledigt" für die fertigen Findings
7. Nächster Cluster

**Wichtig:** Saubere Commits. Wenn Phase 4 fertig ist, sollte die git history zeigen: Cluster für Cluster, nicht 50 Mini-Commits.

---

## 🔧 Tools / Patterns die helfen

### Codemod-Script für CC-1 (Magic-Numbers)

Beispiel-Strategie:
```bash
# 1. Find häufigste Inline-Werte
grep -rh "borderRadius: " frontend/src/ | sort | uniq -c | sort -n | tail -20

# 2. Find/Replace pro Token (mit Kontext-Check)
sed -i 's/borderRadius: 16/borderRadius: RADII.normal/g' frontend/src/pages/...

# 3. Imports am Datei-Anfang ergänzen
```

Pragmatisch: nicht alle 200 Stellen auf einmal. Pro Page durchgehen, Token-Imports ergänzen, Inline-Werte ersetzen, committen. ~10 Min pro Page × 18 Pages = 3h, aber dann zu 95% sauber.

### BeamerOverlay-Wrapper für CC-4

Neue Komponente (z.B. in `frontend/src/components/BeamerOverlay.tsx`):
```tsx
export function BeamerOverlay({ children, zIndex = 50, ... }) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex,
      // alle Overlay-Defaults
    }}>
      {children}
    </div>
  );
}
```

Dann QuizIntroOverlay + RulesIntroOverlay refactoren auf `<BeamerOverlay>`-Wrapper statt Inline-`position: fixed`.

### Find-Replace für CC-2 (Easing)

```bash
# Liste aller Inline-cubic-bezier
grep -rn "cubic-bezier(" frontend/src/

# Für jeden häufigen Wert: globaler Replace
sed -i 's/cubic-bezier(0.22, 1, 0.36, 1)/var(--qq-ease-smooth-out)/g' frontend/src/pages/QQBeamerPage.tsx
```

CSS-Vars müssen in `main.css` definiert sein (sind sie schon laut Style-Guide).

---

## 📚 Memory-MDs die relevant sind

Schon vorhanden — bei Bedarf updaten wenn Refactor abgeschlossen:

- `MEMORY.md` (Index)
- `project_qq_architecture.md` (App-Architektur, Brett-Palette, Stapel-Bonus etc.)
- `feedback_brainstorm_first.md` (bei Idee/Vorschlag erst brainstormen)
- `feedback_beamer_no_scrollbar.md` (Hard-Rule)
- `feedback_md_continuous_updates.md` (Memory-Pflege-Regel)

---

## ✅ Was nach Phase 4 erledigt sein sollte

- `AUDIT_FINDINGS.md` mit allen Findings als ✅ markiert (oder bewusst akzeptiert)
- `STYLE_GUIDE.md` aktualisiert wenn Lücken gepatcht wurden
- 4-6 saubere Commits, einer pro Cluster
- App-Compliance gegen Style-Guide auf ~95%
- Wolf testet eine komplette Live-Session und meldet ob's „aus einem Guss" wirkt

Danach: Phase-4-Doku ergänzen mit dem was im Refactor gelernt wurde, ggf. neue Memory-MDs anlegen.

---

## 🆘 Edge-Cases

**Wenn Codemod-Script Sachen kaputtmacht:**
- Pro Page einzeln mit Type-Check verifizieren (`npx tsc --noEmit`)
- Sample-Test im Browser (`/beamer`, `/moderator`, `/team`)
- Bei Fehler: revert this commit, manueller Fix für die Page

**Wenn Style-Guide-Lücken Wolf-Entscheidung brauchen:**
- Im Stil von „L4 — strict halten oder erweitern? Pro/Contra: …"
- Wolf entscheidet, dann patchen, dann weiter

**Wenn neue Inkonsistenzen im Refactor entdeckt werden:**
- Nicht spontan fixen → in `AUDIT_FINDINGS.md` als „Phase 4.1" ergänzen
- Erst aktuellen Cluster fertig machen

---

## 🎬 Wenn alles erledigt ist

Wolf sagen: „Phase 4 fertig. App ist auf X% Compliance gegen Style-Guide. Empfehle Live-Test mit kompletter Session bevor wir weiter machen."

Dann auf Wolf-Feedback warten. Bei „passt" → zurück in den Feature-Modus für neue Features. Bei „noch was": gezielter Mini-Refactor.

---

**Viel Erfolg! 🐺**
