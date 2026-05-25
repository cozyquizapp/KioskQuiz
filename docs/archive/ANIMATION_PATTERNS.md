# Text- & Card-Animation-Patterns für CozyQuiz

**Datum:** 2026-05-07  
**Quelle:** Tiefen-Recherche-Agent + Live-WebFetches (Linear, Stripe, Vercel, Raycast, Awwwards 2025/26).  
**Status:** Recherche, noch nicht implementiert. Auswahl + Sprint-Plan steht aus.

---

## TL;DR — Top 6 Patterns für Live-Quiz-Show

| # | Pattern | Wo? | Effort |
|---|---|---|---|
| 1 | **Slide-Off + Push** (Q→Reveal Transition) | Frage→Antwort-Wechsel (häufigster State pro Game) | Easy |
| 2 | **Line-Mask Reveal** (Frage zeilenweise) | Frage-Card-Mount | Medium |
| 3 | **Spring Pop-Scale** (Standard-Mount) | Default für ALLE Cards | Easy |
| 4 | **Slot-Machine Score-Update** | Score-Reveal nach jeder Frage | Medium |
| 5 | **View Transitions API** (native Browser) | Phase-Wechsel Runde 1→2 | Medium |
| 6 | **Word Stagger Fade-Up** | MUCHO/ZvZ-Antwort-Optionen | Easy |

**Bonus:** **3D Card-Flip (Hearthstone-Style)** für MUCHO-Reveal — nur 1× pro Game, sonst Cringe.

---

## Library-Empfehlung 2026

| Tool | Wofür | Warum |
|---|---|---|
| **Motion** (motion.dev, ex-Framer-Motion) | Card-Mount/Exit + Layout-Animations | Hybrid-Engine: Web Animations API + ScrollTimeline für 120fps. Kleineres Bundle als alte framer-motion. |
| **GSAP SplitText** | Text-Reveals (Line/Word/Char) | **Seit GSAP 3.13 komplett FREE** (war früher Premium). Line-Mask-Reveal out-of-the-box. |
| **View Transitions API** (nativ) | Phase/Route-Wechsel | Baseline seit Oktober 2025 (Chrome/Edge/FF 134+/Safari 18+). Progressive Enhancement → bei alten Browsern kein Fehler, nur kein Anim. |

3 Tools, klare Zuständigkeiten, kein Overlap.

---

## Easing & Timing — State-of-the-Art 2026

- **Text-Reveal-Standard:** `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo) — überall.
- **Spring vs Cubic-Bezier:**
  - Spring → wenn Element „lebt" (Cards, Drag, Hover). Stiffness 200–300, Damping 18–25.
  - Cubic-Bezier → wenn Timing **exakt** sein muss (Sound-Sync, sequenzierte Choreo).
- **Exit = 50–60 % der Mount-Dauer** (Material-Motion-Prinzip). Lange Exits fühlen sich „klebrig".
- **Lange Texte (60+ Zeichen):** Line-by-line statt Char-by-char. Char-Stagger ab 1.5 s = zäh.
  - Empfohlen: 3 Zeilen × `stagger:0.08s` × `duration:0.45s` = ~0.7 s gesamt.
- **3D-Effekte sparsam:** 1× pro Game = magisch, 5× = Cringe.

---

## Detail-Tabelle: Alle Patterns

### 1. Text-Reveal-Animationen

| Pattern | Beschreibung | Easing/Timing | Lib | Difficulty |
|---|---|---|---|---|
| **Line-Mask Reveal** | Zeile slidet von unten in `overflow:hidden`-Maske; nichts ragt heraus | `cubic-bezier(0.16,1,0.3,1)` 0.6 s, stagger 0.08 s | GSAP SplitText `mask:"lines"` | Mittel |
| **Word Stagger Fade-Up** | Jedes Wort separat, 12 px y-offset + opacity 0→1 | `ease-out` 0.4 s, stagger 0.05 s | Motion Variants | Einfach |
| **Char Blur-In** | Char-by-char: `filter:blur(12px)` 0→0, opacity, scale 0.9→1 | `ease-out` 0.5 s, stagger 0.02 s | CSS @keyframes / Motion | Mittel |
| **Slot-Machine / Drum-Roll** | Chars rollen 3D-vertikal in Position | Spring 120/20 | Motion + perspective:1000px | Hoch |
| **Typewriter mit Caret** | Char-by-char Echtzeit-Tippen + blinkender Cursor | Linear 30–60 ms/char | Pure CSS / JS | Einfach |
| **Gradient Shimmer Sweep** | Text fertig sichtbar, Gradient-Mask wandert einmal drüber | `ease-in-out` 1.2 s | Pure CSS `background-clip:text` | Einfach |
| **Variable-Font Weight Roll** | Buchstaben morphen `font-weight` 100→900 sequentiell | `ease-out` 0.8 s, stagger 0.04 s | Pure CSS (Variable Font nötig) | Mittel |
| **Split-Flip Departure-Board** | Chars klappen mechanisch (3D-X-Rotation) | Spring 200/25 | Motion / GSAP | Hoch |
| **Scale-Pop Word** | Jedes Wort poppt von scale 0.6→1.05→1 (overshoot) | Spring 300/18 | Motion | Einfach |
| **Two-Layer Reveal (BG-Wipe + Text)** | Farb-Block wischt drüber, daneben enthüllt sich Text | `cubic-bezier(0.77,0,0.18,1)` 0.7 s | CSS `clip-path` 2-Layer | Mittel |

### 2. Card-Mount-Animationen

| Pattern | Beschreibung | Easing/Timing | Lib | Difficulty |
|---|---|---|---|---|
| **Spring Pop-Scale** | scale 0.85→1.02→1, opacity 0→1 | Spring 260/22 | Motion | Einfach |
| **Material Container-Transform** | Card wächst aus Trigger-Element raus | `cubic-bezier(0.4,0,0.2,1)` 0.4 s | View Transitions API / Motion `layoutId` | Mittel |
| **3D Card-Flip (Hearthstone)** | Y-Rotate 180°, peak Light-Burst | `ease-in-out` 0.6 s | CSS `transform-style:preserve-3d` | Hoch |
| **Origami Unfold** | Card faltet sich aus 2–3 Segmenten in 3D auf | Sequenziert 0.2 s/Segment | Motion / GSAP | Sehr hoch |
| **Slide-Up + Spring-Settle** | y:60→0 mit overshoot | Spring 180/20 | Motion | Einfach |
| **Scale-from-Origin** | scale 0→1 von Klick-Position aus | `cubic-bezier(0.34,1.56,0.64,1)` 0.5 s | CSS `transform-origin` | Mittel |
| **Bottom-Sheet (iOS-Style)** | Card slidet von unten + Backdrop-Fade | `cubic-bezier(0.32,0.72,0,1)` 0.5 s | Motion / Vaul | Einfach |
| **Layered Stagger Mount** | Card-Frame fadet, dann Title, dann Body, dann Footer | je 0.3 s, stagger 0.1 s | Motion Variants `staggerChildren` | Einfach |

### 3. Card-Exit-Animationen

| Pattern | Beschreibung | Easing/Timing | Lib | Difficulty |
|---|---|---|---|---|
| **Fast Fade + Scale-Down** | scale 1→0.95, opacity 1→0 | `ease-in` 0.2 s | Motion `exit` | Einfach |
| **Slide-Off + Push** | Outgoing slidet links raus, Incoming kommt rechts rein | `ease-in-out` 0.35 s | Motion `AnimatePresence mode="popLayout"` | Mittel |
| **Stack-Push (Karten-Deck)** | Card schiebt nach hinten in Stack, neue legt sich davor | `ease-out` 0.4 s | Motion z-index + scale | Mittel |
| **Iris-Close** | clip-path collabiert von außen zur Mitte | `ease-in-out` 0.4 s | Pure CSS clip-path | Mittel |
| **Drop-Below + Fade** | y:0→40, opacity 1→0, slight tilt | `ease-in` 0.25 s | Motion | Einfach |

### 4. Page/View-Transitions

| Pattern | Beschreibung | Easing/Timing | Lib | Difficulty |
|---|---|---|---|---|
| **Default Cross-Fade** | Old-Snapshot fadet aus, New fadet ein | 0.25 s | View Transitions API (1 Zeile) | Trivial |
| **Shared Element Morph** | Element mit gleichem `view-transition-name` morpht Position+Size | `ease-in-out` 0.4 s | View Transitions API + CSS | Mittel |
| **Slide-Push View** | Ganze View slidet, alte raus / neue rein | `cubic-bezier(0.4,0,0.2,1)` 0.4 s | View Transitions + `::view-transition-*` | Mittel |
| **Iris-Wipe Phase** | Nächste View zentriert via clip-path | 0.6 s ease-in-out | View Transitions + custom CSS | Mittel |

---

## Implementierung — Code-Snippet-Sketch

### View Transitions API (minimal, kein Build-Step nötig)

```js
// Same-Document (SPA, z. B. React Router):
if (!document.startViewTransition) { updateDOM(); return; }
document.startViewTransition(() => updateDOM());
```

```css
/* Standard-Cross-Fade */
::view-transition-old(root) { animation: fade-out 0.3s ease both; }
::view-transition-new(root) { animation: fade-in  0.4s ease both; }

/* Shared Element Morph (z. B. Team-Card behält ihre Position) */
.team-card { view-transition-name: team-3; }
```

### GSAP SplitText (Line-Mask Reveal)

```js
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
gsap.registerPlugin(SplitText);

const split = SplitText.create('.question-text', { type: 'lines', mask: 'lines' });
gsap.from(split.lines, {
  y: '100%',
  duration: 0.45,
  stagger: 0.08,
  ease: 'expo.out',
});
```

### Motion Spring-Pop

```jsx
import { motion } from 'motion/react';

<motion.div
  initial={{ scale: 0.85, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
/>
```

---

## Implementation-Reihenfolge (sobald Animations dran sind)

### Sprint A — Lab-Demo (~2 h)
- Pattern 1 + 2 + 3 als v5-Demo im `/gekocht`
- Wolf sieht alle 5 Designs mit modernen Animations

### Sprint B — Live-App-Polish (~3-5 Tage)
- Motion + GSAP SplitText installieren
- Q→Reveal-Transition (#1) — direkter Polish auf häufigsten State-Wechsel
- Score-Slot-Machine (#4) — feiert jeden Punkt
- View Transitions API für Phase-Wechsel (#5)
- Eigene Sprints + Live-Tests vor Watchparty

---

## Quellen

- [GSAP SplitText Docs](https://gsap.com/docs/v3/Plugins/SplitText/)
- [Motion (motion.dev) Docs](https://motion.dev/docs)
- [Motion React Quick Start](https://motion.dev/docs/react-quick-start)
- [Framer Motion → Motion Migration](https://motion.dev/docs/react-upgrade-guide)
- [Framer Blog: 8 Text Animation Techniques](https://www.framer.com/blog/text-animations/)
- [Best React Animation Libraries 2026 (LogRocket)](https://blog.logrocket.com/best-react-animation-libraries/)
- [Maxime Heckel: Physics behind Spring Animations](https://blog.maximeheckel.com/posts/the-physics-behind-spring-animations/)
- [Material Design 3: Easing & Duration](https://m3.material.io/styles/motion/easing-and-duration)
- [Material Design 3: Motion Overview](https://m3.material.io/styles/motion/overview/how-it-works)
- [View Transition API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
- [Can I Use: View Transitions](https://caniuse.com/view-transitions)
- [Chrome: View Transitions in 2025](https://developer.chrome.com/blog/view-transitions-in-2025)
- [Chrome: Smooth Transitions with View Transition API](https://developer.chrome.com/docs/web-platform/view-transitions)
- [React Router: View Transitions](https://reactrouter.com/how-to/view-transitions)
- [Hearthstone-Inspired 3D Card Animations](https://spidergl.org/crafting-hearthstone-inspired-3d-card-animations-for-boosting-promotions.php)
- [Awwwards: Words in Motion — Kinetic Typography](https://www.awwwards.com/words-in-motion-kinetic-typography.html)
- [Equal Design: 5 Rules for Motion in UI Transitions](https://www.equal.design/blog/5-rules-for-motion-in-ui-transitions)
