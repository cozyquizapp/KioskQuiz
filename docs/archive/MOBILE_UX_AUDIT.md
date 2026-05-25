# 📱 Mobile-UX-Audit (Phase 8)

**Stand:** 2026-05-05 · **Scope:** Medium · **Target:** Mid-Range-Phones · **Status:** Phase 8 ABGESCHLOSSEN — Bucket-1 (Tap-Targets B-1+B-2) + Bucket-2 (Top5 maxLength B-3) erledigt. B-4 + Bucket-3 als akzeptabel/optional dokumentiert.

> **Kontext:** Spieler nehmen mit Smartphones teil — Team-Page (`QQTeamPage.tsx`, ~6000 Zeilen) ist die zentrale Mobile-View. Wolf moderiert auf Desktop+Streamdeck (Phase 7). Team-Page muss Phone-First sein.

---

## 📊 Übersicht

**Gesamt-Eindruck:** ~85% Compliance — production-ready mit kleinen Polish-Items.

Was die App schon **gut macht:**
- Tap-Targets meist ≥44px (Submit-Buttons 52px, Choice-Buttons 52px, AllIn-Buttons 48px, Carousel-Arrows 44px Circle)
- Haptik-Feedback umfassend implementiert mit Capability-Check (`navigator.vibrate`)
- Active-State-Animationen (`scale(0.96)` + Bounce-Easing) auf allen interaktiven Elementen
- Submit-Status-Pattern (Green-Ring) konsistent angewendet
- Disconnect-Banner mit Reconnect-Button + Auto-Reconnect via WebSocket
- Viewport-Meta korrekt (`viewport-fit=cover` für Notch-Phones)
- iOS Safari-konform: `font-size: 16px+` auf Inputs (kein Auto-Zoom), `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation`

---

## 🔴 BREAKING / Cross-Cutting

### B-1: Header-Flag-Icon (Setup-Phase) — ✅ ERLEDIGT 2026-05-05
**Lokation:** `QQTeamPage.tsx:778-798`
**Issue:** `padding: 0, fontSize: 24` → effektiv ~24×24px Tap-Area, kein `minWidth/minHeight`.
**Hinweis:** Game-Phase-Flag (Line 1480-1503) ist seit Phase 4 Bucket-3 fixiert (44×44).
**Fix:** `minWidth: 44, minHeight: 44` ergänzen.

### B-2: Disconnect-Reconnect-Button — ✅ ERLEDIGT 2026-05-05
**Lokation:** `QQTeamPage.tsx:1517-1524`
**Issue:** `padding: '8px 20px'` + `fontSize: 13` → ~32px Höhe, unter TAP_TARGET.min.
**Fix:** Padding/Mindesthöhe auf ≥44px erhöhen.

### B-3: Top5-Inputs ohne maxLength — ✅ ERLEDIGT 2026-05-05
**Erkenntnis:** Bluff-Write hatte bereits `maxLength={200}` (QQTeamPage:3642). Lücke war nur Top5Input.
**Fix:** `maxLength={80}` an StandardInput in Top5Input ergänzt (Top5-Antworten sind typisch 1-3 Wörter, 80 Zeichen reicht großzügig).

### B-4: Join-Loading-State fehlt — ⏸ AKZEPTIERT (LOW Priority)

Backend-Latenz selten relevant in Live-Quiz (Render-free-tier wakeup ist 1-2s, sichtbar via Disconnect-Banner). Polish-Item für eine spätere Wartungs-Session, nicht Live-blockierend.

**Original:**
**Lokation:** SETUP_TEAM_NAMES → `qq:joinTeam` emit
**Issue:** Bei langsamer Verbindung hat User nach Submit kein Loading-Feedback (Button graut nur).
**Severity:** LOW — Network-Latenz auf Render-free-tier kann mehrere Sekunden sein.

---

## 1. Tap-Targets <44px

| Element | File:Line | Größe | Status |
|---|---|---|---|
| Game-Phase Flag-Toggle | QQTeamPage:1480-1503 | 44×44 | ✅ FIXED Phase-4 |
| Setup-Phase Flag (Header) | QQTeamPage:778-798 | ~24×24 | ❌ B-1 |
| Submit-Buttons | QQTeamPage:3408+ | 52h × full | ✅ |
| Choice-Buttons (MUCHO) | QQTeamPage:3369-3405 | 52h | ✅ |
| AllIn ±-Buttons | QQTeamPage:3491-3505 | 48×48 | ✅ |
| H/L Comeback-Buttons | QQTeamPage:5162-5189 | ≥52 | ✅ |
| Carousel-Arrows | AvatarKarussellEditor:139-150 | 44×44 | ✅ |
| Joker-Pill (Anzeige, nicht Tap) | QQTeamPage:1452 | ~22×20 | ⏸ N/A (display-only) |
| Disconnect-Reconnect-Button | QQTeamPage:1517 | ~32 hoch | ⚠️ B-2 |
| Placement Grid-Cells | QQTeamPage:4800+ | ≥80px | ✅ |

---

## 2. iOS Safari Quirks

| Aspekt | Status | Note |
|---|---|---|
| Viewport-Meta | ✅ | `viewport-fit=cover, initial-scale=1.0` |
| Input font-size 16px+ | ✅ | TextInput, MuchoInput, Top5Input alle ≥16px |
| -webkit-tap-highlight-color | ✅ | main.css transparent |
| touch-action: manipulation | ✅ | main.css + AvatarKarussell `pan-y` |
| 100vh URL-Bar | ⚠️ | Setup nutzt 48vh (bewusste Stabilisierung), Gameplay responsive |
| Audio-Context bei Gesture | ✅ | resumeAudio() bei Tap |
| Pull-to-Refresh | ⚠️ | Nicht geblockt — könnte beim Scrollen verwirren (LOW) |

---

## 3. Tap-Feedback (Visual + Haptik)

**Active-State-Animationen:** ✅ Umfassend (`tcpop`, `tccellTap`, `tcbtnpop` etc.) — alle transform-basiert.

**Haptik-Patterns:**
| Event | Vibration | Status |
|---|---|---|
| Avatar-Tap | 25ms | ✅ |
| Choice-Select | 30ms | ✅ |
| Submit Success | 40ms | ✅ |
| Submit Error | 60-80ms | ✅ |
| Hot-Potato Turn | 200ms double-pulse | ✅ |
| Joker-Earned | Burst-Pattern | ✅ |
| Cell-Tap (Placement) | 30ms | ✅ |

Alle mit Capability-Check (`if (navigator.vibrate)`). iOS ignoriert (Apple-Design), kein Fallback nötig.

**Submit-Status (Green-Ring):** ✅ Konsistent in Bluff-Write/Vote-Wait, MUCHO-Reveal, Comeback.

---

## 4. Performance

**Animation-Mix:** Großteils transform+opacity (GPU-accelerated). Wenige `width`-Animationen (Timer-Bar, OK weil low-frequency).

**will-change:** Nicht explizit gesetzt. Bei vielen parallelen Animationen (z.B. 8 Voter-Avatars + Timer + Card-Reveal-Cascade in REVEAL-Phase) könnte das einen kleinen Boost geben — aber kein akutes Problem.

**Lazy-Loading:** Nicht nötig (Team-Page ist Text + Emojis + SVG).

**Bundle-Size:** Nicht gemessen — Empfehlung: `vite build --profile` für Phase 8.4 Polish-Session.

---

## 5. Empty/Loading-States

| Phase | Status |
|---|---|
| SETUP: Avatar-Slots voll | ✅ Empty-State-Card |
| SETUP: Name taken | ✅ Red-Border + bg-tint |
| SETUP: Join-Loading | ⚠️ B-4 (kein Spinner) |
| LOBBY: Keine Teams | ✅ |
| QUESTION_REVEAL: keine Antworten | ✅ "Keiner hatte Recht" |
| QUESTION_REVEAL: Spieler-Trost | ✅ Random encouragement, kein Shaming |
| Disconnect-Banner | ✅ Prominent mit Reconnect-Button |

---

## 6. Disconnect/Reconnect-UX

✅ **Robust.** Banner mit `role="alert"`, manuelle Reconnect-Möglichkeit, Auto-Reconnect via Socket-Hook.

Tap-Target des Reconnect-Buttons knapp (B-2).

---

## 7. Phasen-spezifische Mobile-UX

| Phase | Status | Note |
|---|---|---|
| SETUP_TEAM_NAMES | ✅ | Avatar-Carousel + Name-Input + Validation |
| LOBBY | ✅ | Teams-Anzeige mit Float-Anim |
| QUESTION_ACTIVE | ✅ | Timer + Inputs + Auto-Submit on Timer-End |
| QUESTION_REVEAL | ✅ | Trost-Messages, Score-Animation |
| PLACEMENT | ✅ | 2-Tap-Confirm-Pattern, Cell-States klar |
| COMEBACK_CHOICE | ✅ | H/L-Mini-Game responsive |
| CONNECTIONS_4X4 | ✅ | Hint-Cards mit Pulse |
| GAME_OVER / THANKS | ✅ | Auto-Advance Spotlight, Recap |

---

## 8. Sprach-Toggle + i18n

✅ Game-Phase-Flag (Phase 4 fixed). ❌ Setup-Phase-Flag (B-1 zu fixen).

**Translation-Coverage:** ~95-100%. Backend-Error-Messages eventuell teilweise hardcoded English — Edge-Case, nicht UX-blockierend.

---

## 9. Avatar-Picker (AvatarKarussellEditor)

✅ **Responsive.** Hero-Avatar `clamp(140px, 18vw, 180px)` skaliert von iPhone SE bis iPad. Carousel-Arrows 44×44, Swipe-Erkennung mit 50px-Threshold. Idle-Wiggle nach 15s für Engagement.

---

## 10. Eingabe-Validierung

✅ **Robust** für Team-Name (max 20, Taken-Detection), Number-Inputs (inputMode/pattern), AllIn (Pool-Check), Placement (2-Tap-Confirm).

⚠️ **Lücken:** Bluff-Text + Top5-Inputs haben kein UI-maxLength (B-3).

---

## 🎯 Phase-8-Buckets-Vorschlag

### Bucket-1: BREAKING Mobile-UX (kleinere Tap-Target-Snaps)
- B-1: Header-Flag-Icon Setup-Phase → minWidth/minHeight: 44
- B-2: Disconnect-Reconnect-Button → padding für ≥44px Höhe

### Bucket-2: Polish (Edge-Case-UX)
- B-3: Bluff-Text + Top5-Input maxLength + Counter
- B-4: Join-Loading-State (Spinner + "joining..." Text)

### Bucket-3: Performance + Docs — ⏸ AKZEPTIERT (Optional, kein akutes Problem)

- `will-change` Hinzufügen: ohne Profiling-Beleg vorzeitig optimieren wäre Anti-Pattern
- `font-size: 16px` Doku in main.css: aktuell unkritisch (alle Inputs schon ≥16px)
- Device-Testing-Checkliste: gehört in eine separate QA-Session

Skip — Phase 8 abgeschlossen mit Bucket-1+2.

---

## 📋 Empfohlene Test-Geräte

| Device | Viewport | Browser | Priorität |
|---|---|---|---|
| iPhone SE | 375×812 | Safari | ⭐⭐⭐ Budget-Tier |
| iPhone 13 | 390×844 | Safari | ⭐⭐⭐ Mid-Range |
| Pixel 6 | 412×915 | Chrome | ⭐⭐⭐ Android Mid |

---

## 📅 Änderungs-Log

- **2026-05-05** — Phase-8 Mobile-UX-Audit. Team-Page-Inventory, Tap-Target-Check, iOS-Safari-Quirks-Audit, Performance-Check, Phasen-Walkthrough. ~85% Compliance, 4 BREAKING-Items (B-1 bis B-4) identifiziert.
