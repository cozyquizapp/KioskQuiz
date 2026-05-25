# Modern UI Patterns für CozyQuiz — Live-Show, Multi-User, 2025/26-Trends

**Datum:** 2026-05-07  
**Quelle:** Tiefen-Recherche-Agent (Jackbox / TV-Game-Shows / Awwwards 2025/26 / Figma / Discord / Slido).  
**Status:** Recherche, teilweise im Lab `/gekocht` v4 schon umgesetzt.

---

## TL;DR — Top 5 Must-Haves für CozyQuiz

| # | Pattern | Angle | Effort | Why |
|---|---------|-------|---------|---------|
| **1** | **Dramatic-Pause-Before-Reveal** | Game-Show | Easy | Free Goosebumps; nur Timing-Tweak. Verändert Vibe von „Speed-Quiz" zu „Show-Quiz". |
| **2** | **Number-Counter-Tickup mit Bouncy Easing + Audio-First-Sting** | Game-Show | Easy | Score-Reveal wird zum Mini-Moment statt UI-Update. <1 Stunde Arbeit kombiniert. |
| **3** | **Avatar-Stack-Pulse + „X/Y submitted" Flow-Bar** | Presence | Easy–Med | Beamer wird lebendig; löst Frage „wer fehlt noch?" ohne Text-Spam. Direkter Mehrwert für Live-Moderation. |
| **4** | **Grain-Texture-Overlay** | Modern | Easy | 1 SVG-Filter, ~20 min Arbeit. **Brandet die App buchstäblich als „cozy"** — kein Wettbewerber hat das. |
| **5** | **View-Transitions-API für Q→R-Card-Flip** | Modern | Med | Killt eigene Memory-Regel „Q↔R ≥ 0.45 s" mit zwei CSS-Zeilen. Strategischer Refactor. |

**Bewusst nicht in Top 5:**
- **Confetti** (in WOW-Features schon teilweise da, nicht doppelt bauen)
- **Liquid Glass** (Hard + 4K-Performance-Risiko)
- **Audio-Reactive Wolf** (Hard, aber **Brand-Defining** → eigener Sprint wert)
- **Magnetic Cursor** (Wolf moderiert mit Streamdeck → ROI minimal)

---

## Status im Design-Lab `/gekocht`

Im Lab v4 schon umgesetzt:
- ✅ Universal Grain-Overlay (Pattern #4)
- ✅ Avatar-Pulse Demo (Pattern #3a)
- ✅ Submit-Flow-Bar (Pattern #3b)
- ✅ Heartbeat-BG-Pulse (Letzte-10s-Druck)
- ✅ Score-Tickup mit Bouncy Easing (Pattern #2 ohne Audio)
- ✅ Variable-Font-Weight-Surge

Wartet auf Live-App-Integration:
- ⏳ Dramatic-Pause-Before-Reveal (Pattern #1)
- ⏳ View-Transitions-API für Q→R-Flip (Pattern #5)
- ⏳ Audio-First-Sting (50–80 ms Audio-Lead vor Visual)
- ⏳ Audio-Reactive Wolf-Avatar (Web-Audio-API)

---

## Detail: Alle 21 Patterns aus 3 Angles

### Angle 1 — Live Game-Show Transition + Reveal Patterns

1. **Dramatic-Pause-Before-Reveal** — 1.5–3 s Schweigen vor Reveal, dann Stinger. Spannung trägt von selbst.  
2. **Number-Counter-Tickup mit Bouncy End-Easing** — Score 0→Ziel in 1.0–1.5 s, `cubic-bezier(.25,1.6,.3,1)` overshoot.  
3. **Letter-by-Letter Stagger Reveal** — Stagger 0.04–0.06 s, Auge folgt. CozyQuiz hat schon `qqCatNameWave` keyframe.  
4. **Spotlight-Sweep über Gewinner-Zone** — Radial-Gradient-Mask wandert vom Rand auf Gewinner zu (Family-Feud-DNA).  
5. **Slide-Up-Reveal mit Curtain-Mask** — Antwort versteckt unter Vorhang, `clip-path` wegrollen.  
6. **Audio-First-Sting + Visual-Lag (50–80 ms)** — Sound startet 80 ms vor Visual, „professionell produziert"-Effekt.  
7. **Particle-Burst beim Final-Score** — `canvas-confetti`, 100 particles, nur am Game-End.

### Angle 2 — Multi-User Presence + Activity

1. **Avatar-Stack mit Live-Pulse-Glow** — Pulsing während Team tippt, Scale-Up bei Submit.  
2. **„X von Y haben geantwortet" Flow-Bar** — 4 px hohe Bar oben am Beamer, füllt sich pro Submit.  
3. **Typing-Dots-Bubble pro Team (Discord-DNA)** — Drei pulsende Dots, stoppt 2 s nach letztem Keystroke.  
4. **Team-Beitritt Toast-Slide-In** — Toast unten rechts, slide-in 300 ms, hält 2 s, slide-out.  
5. **„Last-Submitter-Glow"** — Erstes submitted Team bekommt 800 ms Lightning + Sparkle (kein Public-Shaming für Letzte).  
6. **Heartbeat-Background-Pulse während Letzte-10 s** — Subtle BG-Pulse, kein Grell-Rot, in Akzentfarbe.  
7. **Co-Cursor / „Team-Marker-Move"** — Avatar-Dots schwimmen langsam im BG (Figma-DNA, optional).

### Angle 3 — Modern Micro-Interactions 2025/26

1. **View-Transitions API für Card-Flip Q→R** — Single-line CSS, browser interpoliert.  
2. **Variable-Font-Weight Animation auf State-Change** — `font-weight: 600 → 900`. Nunito hat Variable-Axis.  
3. **Grain-Texture-Overlay für Cozy-Authenticity** — SVG `feTurbulence`, opacity 0.04, mix-blend-mode overlay.  
4. **Liquid-Glass-Card-Surface (iOS 26)** — `backdrop-filter: blur(20px) saturate(180%)` + SVG `feDisplacementMap` für edge-distortion.  
5. **Magnetic-Button auf Mod-Tablet** — Cursor zieht 4 px Richtung Button-Center innerhalb 12 px Radius.  
6. **Scroll-Triggered Numbers für Recap-Page** — `/summary/:roomCode`-Page wird scroll-storytelling.  
7. **Audio-Reactive Visuals beim Wolf-Sprechen** — `AnalyserNode.getByteFrequencyData()`, mappe Lautstärke → CSS-Var → Avatar-Bounce.

---

## Sprint-Plan (sobald Live-App-Polish dran ist)

### Sprint 1 — Game-Show-Polish (~1–2 Tage)
- Dramatic-Pause-Before-Reveal (1.5–3 s Stille vor jedem Reveal-Trigger)
- Audio-First-Sting (Sound 80 ms vor Visual)
- Number-Counter-Tickup live aktiv (Score-Update-Calls aus Backend → AnimatedNumber)

### Sprint 2 — Multi-User-Presence (~1 Tag)
- Submit-Flow-Bar live aktiv (Backend-Submit-Counter → CSS-Width)
- Avatar-Pulse via Socket-Event `team:typing` / `team:submitted`
- Team-Beitritt Toast unten rechts (slide-in/out)

### Sprint 3 — Strategischer Refactor (~3 Tage)
- View Transitions API für Q→R + Phase-Wechsel
- Audio-Reactive Wolf-Avatar (Web-Audio-API + CSS-Var-Mapping) — Brand-defining

---

## Quellen (alle aus Recherche-Agent verifiziert)

**Game-Show / Reveals:**
- [TV Tropes — Dramatic Pause](https://tvtropes.org/pmwiki/pmwiki.php/Main/DramaticPause)
- [Jackbox Design Principles — Built In Chicago](https://www.builtinchicago.org/articles/jackbox-games-design-party-pack)
- [Behind the Scenes Jackbox PP10 Art](https://www.jackboxgames.com/blog/behind-the-scenes-of-pp10-art)
- [CSS-Tricks — Animating Number Counters](https://css-tricks.com/animating-number-counters/)
- [canvas-confetti GitHub](https://github.com/catdad/canvas-confetti)
- [Frontend Masters — CSS Spotlight Effect](https://frontendmasters.com/blog/css-spotlight-effect/)

**Multi-User Presence:**
- [Figma — Multiplayer Editing](https://www.figma.com/blog/multiplayer-editing-in-figma/)
- [Atlassian Design — Avatar Presence](https://atlassian.design/components/avatar/avatar-presence/)
- [Game UI Database — Matchmaking Lobby](https://www.gameuidatabase.com/index.php?scrn=181)
- [Slido vs Mentimeter Comparison](https://www.g2.com/compare/mentimeter-vs-slido)

**Modern Micro-Interactions:**
- [Awwwards — 8 Steps to Microinteraction Design](https://www.awwwards.com/8-steps-to-amazing-microinteraction-design.html)
- [Awwwards Trends Report 2025](https://www.awwwards.com/inspiration/trends-artlist-trend-report-2025)
- [LogRocket — CSS/SVG Liquid Glass Effects](https://blog.logrocket.com/how-create-liquid-glass-effects-css-and-svg/)
- [Apple — Liquid Glass Documentation](https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass)
- [Followup Media — Textured Grains 2025](https://followupmedia.com/textured-grains-design-trend-2025/)
- [MDN — prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)
