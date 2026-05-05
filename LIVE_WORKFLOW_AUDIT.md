# 🎬 Live-Workflow-Audit (Phase 7)

**Stand:** 2026-05-05 · **Scope:** Streamdeck-Mod-Workflow · **User:** Wolf (Solo-Moderator) · **Status:** Phase 7 ABGESCHLOSSEN — Bucket-1+2+3 fixiert (Audio-Feedback Hotkeys, Auto-Skip Standard-Placement-Offline, Music-Muted-Badge). Bucket-4 Mobile geht in Phase 8, Bucket-5 Pre-Game-Checkliste optional.

---

## 📊 Übersicht — Gesamt-Eindruck

**Mod-Page ist grundlegend live-tauglich — Streamdeck-Setup funktioniert.** Hotkey-Abdeckung ist exzellent (Space, R, N, F13-F17, P, M, V, F), Layout skaliert responsive, Status-Visualisierung ist auf dem Beamer sichtbar. 

**Aber: 3 Kategorien von Lücken** 
- **Live-Stress-UX:** Kein Audio-Feedback für Hotkey-Bestätigung, fehlende visuelle Highlighting bei aktiven Notfall-Modi
- **Notfall-Edge-Cases:** Disconnect-Recovery unterspecifiziert, kein visueller Warning bei pendingFor-Offline
- **Mobile-Fallback (wenn Streamdeck ausfällt):** Layout scrollt teilweise, Buttons im kompaktesten Modus unter Tap-Ziel (z.B. Language-Toggle 24×24px statt 44px min)

**Erkenntnis:** Wolf moderiert solo am PC mit Streamdeck. Hotkeys sind das Primär-Interface (Streamdeck sendet Tastatur-Events), Maus-Clicks sind Sekundär (für Bluff-Moderation, Imposter-Team-Kick, Tie-Breaker). Das ist gut designt.

---

## 🔴 BREAKING / Cross-Cutting (Live-Killer)

### BC-1: Audio-Feedback für Hotkey-Presses — ✅ ERLEDIGT 2026-05-05

**Severity:** MAJOR — Wolf nutzt Streamdeck ohne auf Screen zu schauen. Space/R/F-Hotkeys brauchen sofortige Audio-Bestätigung (80ms Synth-Click), nicht 200ms Toast.

**Fix:** Neue `playHotkeyFeedback()` in `sounds.ts` (440Hz Triangle, 50ms ADSR, leise) — klar erkennbar von Timer-Tick (880Hz Square). In QQModeratorPage handleKey nach jedem `e.preventDefault()` aufgerufen — alle 14 Hotkey-Pfade (Space, R, N, ArrowRight, F13-F17, M, P, F, V, ?, Esc/Backspace, 1-5) geben jetzt sofort Audio-Bestätigung.

**Original-Vorschlag (zur Doku):**
```tsx
if (e.code === 'Space') {
  e.preventDefault();
  playTick(); // ← Audio-Feedback (100ms)
  // ... Logik
}
```

**Files:** `frontend/src/utils/sounds.ts` (add playHotkeyFeedback), `frontend/src/pages/QQModeratorPage.tsx` (handleKey ~line 501-764)

---

### BC-2: Skip-Placement bei pendingFor-Offline — ✅ ERLEDIGT 2026-05-05

**Erkenntnis nach Code-Inspektion:** Manueller Skip-Button existierte bereits in `PlacementControls` (line 2854). Lücken waren:
1. Auto-Skip nur für Comeback-Phase (8s), nicht für Standard-Placement.
2. Skip-Button bei Offline-Team gleichfarbig wie sonst — nicht hervorgehoben.
3. confirm()-Dialog auch bei offline-Team — unnötiger Stress-Klick.

**Fix:**
- Auto-Skip in QQModeratorPage:421-435 erweitert: bei pendingTeam offline UND nicht-Comeback → 12s Timeout (länger als 8s Comeback weil Wolf ggf. manuell eingreifen will).
- Skip-Button in PlacementControls: rot statt grau wenn offline, ohne confirm-Dialog (offline = kein Spieler-Beleidigungs-Risiko).

**Original-Vorschlag:**

**Severity:** MAJOR — Wenn Team während PLACEMENT disconnected und ist der pendingFor-Team, steckt Spiel fest. Space drücken geht nicht.

**Aktueller State:** Autoplay hat Workaround nur für Comeback (skip nach 8s). Standard-Placement hat keine Fallback.

**Fix-Vorschlag:** 
1. PlacementControls-Button: „⏹ Skip Placement" sichtbar wenn pendingFor && offline
2. Autoplay: Add 12s timeout für Standard-Placement auch

**Files:** `frontend/src/pages/QQModeratorPage.tsx` (PlacementControls), Backend Skip-Handler

---

### BC-3: Music-Muted-Status — ✅ ERLEDIGT 2026-05-05

**Fix:** Persistenter „🔇 Stumm"-Badge im Header (rot pill) wenn `state.globalMuted === true`. Vorher zeigte M-Hotkey nur einen Toast — danach keine Indicator. Wolf weiss jetzt jederzeit ob Mute aktiv ist.

**Original:**

**Severity:** MINOR — Nach M-Press zeigt nur Toast. Danach keine Indicator ob muted oder nicht.

**Fix:** Badge im Header „🔇 Stumm" wenn globalMuted=true

---

## 1. Mod-Page-Layout (ohne Scrollen)

**Resultat:** Hauptsächlich ✓ scroll-frei für Standard-Workflow.

**Standard-Flow:** QUESTION_ACTIVE → [Space/R] → REVEAL → [Buttons sichtbar] → PLACEMENT → [Space/N] → NEXT

Alle Primary-Actions (Reveal, Mark-Correct, Next-Question) sind **ohne Scrollen erreichbar** in Hero-Banner + Action-Bar.

**Edge-Cases mit Scrollen:**
- Bluff-Submission-Review (wenn >6 Teams): Submissions-Tabelle scrolls
- GAME_OVER Team-Highlights (52vh maxHeight): Scrollbar sichtbar (akzeptabel, optional für Talking-Points)

**Fazit:** ✓ Live-tauglich. Streamdeck-Focus = Hotkeys (nicht Maus) → Scrollen ist irrelevant.

---

## 2. Hotkey-Coverage (Streamdeck-Mapping)

**Aktuell implementierte Hotkeys:**

| Hotkey | Aktion | Phase(n) | Streamdeck-fähig |
|---|---|---|---|
| Space | Smart Next (Phase-specific) | All | ✓ |
| R | Reveal Answer | QUESTION_ACTIVE | ✓ |
| N / ArrowRight | Next Question | PLACEMENT | ✓ |
| Esc / Backspace | Mark Wrong | QUESTION_REVEAL | ✓ |
| 1-5 | Mark Team Correct | QUESTION_REVEAL | ✓ |
| F13 | Next (Space-Alias) | All | ✓ |
| F14 | Mark Team 1 Correct | QUESTION_REVEAL | ✓ |
| F15 | Reveal Answer (R-Alias) | QUESTION_ACTIVE | ✓ |
| F16 | Mark Wrong (Esc-Alias) | QUESTION_REVEAL | ✓ |
| F17 | Next Question (N-Alias) | PLACEMENT | ✓ |
| M | Mute All | Global | ✓ |
| P | Pause/Resume | Active Phases | ✓ |
| F | Flyover (3D-Orbit) | PLACEMENT | ✓ |
| V | Toggle 2D/3D | PLACEMENT | ✓ |
| ? / Shift+/ | Hotkey Cheatsheet | All | ✓ |

**Fehlend:** Audio-Feedback (BC-1), Skip-Question-Hotkey, Undo-Hotkey

**Status:** ✓ Exzellent — alle zentralen Aktionen haben Hotkey-Mapping

---

## 3. Notfall-Aktionen (immer erreichbar)

| Aktion | Sichtbar | Hotkey | Status |
|---|---|---|---|
| Pause Game | ✓ Secondary-Button | ✓ P | ✓ |
| Skip Placement (if pending) | ❌ Nur DangerMenu | ❌ | ⚠️ |
| Mute All | ✓ Optional | ✓ M | ✓ |
| Mark Wrong | ✓ Primary (Reveal) | ✓ F16 | ✓ |
| Reset Game | ❌ DangerMenu hidden | ❌ | ⚠️ |
| Disconnect-Recovery | N/A Backend-handled | — | ✓ |

**Critical Gap:** Skip-Placement-Action fehlt. Muss über DangerMenu gehen (3-Click mit Confirm). **Fix:** Inline-Button wenn pendingFor.

---

## 4. Visual-Cues für Moderator

✓ **Hero-Banner** — Phase, Runde, Frage, Answer-Progress, Timer, alle sichtbar  
✓ **Team-Status-Badges** — Online/Offline/Correct/Answered klar  
⚠️ **Music-Muted-Status** — Nur Toast, kein permanenter Badge  
⚠️ **Pending-For-Offline-Warning** — Border wird rot, aber visuell subtil

---

## 5. Edge-Case-Handling

### Team disconnected während Placement
- ✓ Comeback-Placement: Auto-skip nach 8s
- ❌ Standard-Placement: Keine Fallback → Spiel stuck

### All Teams disconnected
- ✓ Moderator kann weitermachen (Hotkeys funktionieren)
- ⚠️ Neue Teams können nicht joinen (Game läuft noch)

### Bluff-Phase stuck (zu wenige eingereicht)
- ✓ Badge zeigt Count
- ⚠️ Kein Auto-Advance, Moderator muss Button klicken

### OnlyConnect all hints shown
- ✓ Funktioniert, Reveal startet bei Space

---

## 6. Mobile-Mod-Page (Fallback ohne Streamdeck)

**Responsiv:** Hauptsächlich ja, aber:
- Sidebar 360px-fixed → auf 375px Viewport praktisch bildschirmfüllend
- Team-Action-Buttons (rename/kick) sind 30-36px → unter TAP_TARGET.min (44px)

**Recommendation:** Media-Query für <768px, Sidebar als toggled Modal statt fixed.

---

## 7. Live-Stress-Lesbarkeit

✓ **Large-Text (Hero, Buttons):** Exzellent lesbar aus 50-70cm  
✓ **Medium-Text:** Gut lesbar  
⚠️ **Small-Text (Highlights, Stats):** Grenzfall in schlechtem Licht

**Status-Farben:** Alle prominent außer einige dunkle Team-Colors auf dark-bg (z.B. Purple).

---

## 8. Audio-Feedback für Mod-Aktionen

**Aktuell:** Toast für Phase-Wechsel (200ms+ Delay)  
**Fehlt:** SFX-Sound für Hotkey-Press (sofort, <100ms)

**Impact:** Streamdeck-Moderator BRAUCHT diesen Ton, um zu wissen dass Input registriert wurde.

---

## 9. Pre-Game-Checkliste (vor der Show)

**Aktuell:** SetupView mit Fragensatz, Runden, Timer, Sound-Config.

**Fehlt:** 
- Audio-Test Button
- Beamer-Sichtbarkeits-Test
- Team-Connection-Verification
- Streamdeck-Key-Test

**Status:** ⏸ OPTIONAL — Wolf hat vermutlich eigene Routine.

---

## 10. Show-Recap nach dem Spiel

**Aktuell:**
- ✓ Team-Highlights Spickzettel (Top-3 Facts pro Team)
- ✓ CSV-Export für Event-Manager
- ✓ Tie-Breaker UI

**Fehlt:** Hall-of-Fame, Personal-Records, Comeback-Highlights (würde Server-Persistent erfordern).

---

## 🎯 Phase-7-Buckets-Vorschlag

### Bucket 1: Audio-Feedback für Hotkeys (BLOCKING)
**Effort:** 3-4h · **Impact:** Critical für Streamdeck-Moderator

1. playHotkeyFeedback() Helfer in sounds.ts (kurzer Synth-Click 100ms)
2. In handleKey() nach Space/R/N/F*/P aufrufen
3. Test mit Streamdeck simulieren

**Files:** sounds.ts, QQModeratorPage.tsx (line 501-764)

---

### Bucket 2: Skip-Action für pendingFor-Offline (CRITICAL)
**Effort:** 2-3h · **Impact:** Prevent Game-Stuck bei Disconnect

1. PlacementControls: Show „⏹ Skip" wenn offline
2. Autoplay: Add 12s timeout für Standard-Placement
3. Socket-Handler: skipCurrentTeam mit force-Flag

**Files:** QQModeratorPage.tsx, qqSocketHandlers.ts

---

### Bucket 3: Visual-Badge für Music-Muted (NICE-TO-HAVE)
**Effort:** 1-2h · **Impact:** Moderator weiß sofort ob Musik an/aus

Header-Badge 🔇 wenn globalMuted=true

**Files:** QQModeratorPage.tsx (Header section, line 837+)

---

### Bucket 4: Mobile-Layout-Responsive (NICE-TO-HAVE)
**Effort:** 2-3h · **Impact:** Fallback ohne Streamdeck wird brauchbar

1. Sidebar nur auf desktop (>768px)
2. Tap-Target-Fix: Team-Buttons → 44px min
3. Responsive Button-Scaling

**Files:** QQModeratorPage.tsx (main grid, Team-list)

---

### Bucket 5: Pre-Game-Checkliste Modal (OPTIONAL)
**Effort:** 4-6h · **Impact:** Visuelles Reminder vor Show-Start

New ChecklistModal component mit Audio-Test, Beamer-Test, Team-Ready, Streamdeck-Calib

**Files:** ChecklistModal.tsx (new), QQModeratorPage.tsx

---

## Zusammenfassung — Action-Items

### 🔴 MUST DO (Live-blockers)
- BC-1: Audio-Feedback für Hotkeys (Bucket 1)
- BC-2: Skip-Placement bei pendingFor-Offline (Bucket 2)

### 🟡 SHOULD DO (Live-Convenience)
- BC-3: Music-Muted-Badge (Bucket 3)
- Mobile-Layout-Fix (Bucket 4)

### 🟢 NICE-TO-HAVE (Polish)
- Pre-Game-Checkliste (Bucket 5)
- Comeback-Highlights in GAME_OVER Spickzettel

---

## Vergleich zu Memory-Feedback

| Memory-Datei | Befund | Status |
|---|---|---|
| feedback_streamdeck_setup | „Mod MUSS ohne Scrollen" | ✓ Erfüllt (⚠️ mit Sidebar-Scrollbar bei vielen Teams) |
| feedback_no_public_shaming | „Reveal feiern Gewinner, nicht loser" | ✓ Mod zeigt nur Winner-Actions |
| Phase-6 Sound-Audit | „Sound-Hotkeys Phase-7-Item" | ❌ Nicht impl. → Bucket 1 |

---

## 🎬 Final Empfehlung

**Live-Setup ist functional und streaming-ready.** Hotkey-System ist durchdacht, Layout hauptsächlich scroll-frei, Status-Visualisierung existiert.

**Aber: 2 Critical Gaps vor Wolf's Live-Show:**
1. **Audio-Feedback für Hotkeys** — Streamdeck-Moderator braucht Ton, nicht nur Toast
2. **Skip-Placement bei Offline** — Game kann nicht stuck-werden

**Danach:** Optional Polish (Music-Badge, Mobile-Fallback, Checkliste) für nächste Sessions.

---

**Audit durchgeführt:** 2026-05-05 · **Scope:** Comprehensive · **Phase:** 7/7
