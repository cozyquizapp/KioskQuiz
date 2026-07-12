# CozyArena / CozyQuiz — Creative Direction & Design Workflow
#
# Read this file BEFORE implementing or redesigning any screen.
# This file has higher priority than previous design decisions.
#
# Philosophy first. Components second. Code last.

---

# What CozyArena is
CozyArena is NOT a SaaS application. NOT a dashboard. NOT presentation software.
CozyArena is a **live hosted gameshow**.
The projector is the product. Phones are controllers. The moderator is the director.
The audience should remember **moments, not interfaces**.

# The Product
Should feel like: Nintendo · Mario Party · Jackbox · Television · Friends playing together
· a cozy board game · a live event.
NOT: Kahoot · Mentimeter · Slido · PowerPoint · Jira · Notion · Analytics · Enterprise software.

# Brand
Warm. Friendly. Playful. Storybook. Fireflies. Soft depth. Character-driven.
Never cold. Never futuristic. Never cyberpunk. Never luxury.
The wolf is not decoration — the wolf is part of the experience.

# Colors (non-negotiable, Wolf 2026-07-12)
The logo brand colours MUST live in the app: pink #EC4899, magenta #A21247, navy #1E2A5A.
Category colours STAY (MUCHO blue, Schätzchen yellow, 10v10 green, CHEESE purple, Bunte Tüte red).
Faction / team colours STAY. It must be cozy + warm AND quiz-event at the same time — never only one.

# Participant-first priority (the lens for EVERY screen, Wolf 2026-07-12)
Before composing any screen, answer in this order — do NOT start from a metaphor or decoration:
1. What does the participant need on screen RIGHT NOW?
2. What is interesting / emotionally alive here?
3. In what PRIORITY? Rank it. The top item becomes the hero; the rest support it.
Build the hierarchy from that ranking. This is the anti-circling gate: no composition without it.

# Emotional Design
Every screen has EXACTLY ONE emotional purpose. Examples:
Lobby → Arrival · Question → Suspense · Countdown → Pressure · Reveal → Surprise ·
Leaderboard → Orientation · Winner → Celebration.
If multiple emotions compete, the design is wrong.

# Hero Rule
Every screen has ONE dominant hero. Everything else supports it (~60% of visual attention).
Never let five elements compete equally.

# Think in Scenes
Never think in pages. Think in scenes. This is television.
Every screen exists for one moment, not for permanent information.

# Composition — question every layout
Why is this a card? A rectangle? Aligned? Symmetrical? On the right?
Could television graphics solve this better? Could a game? Could this exist without cards?

# Break the Grid
Avoid: equal-sized panels · two-column dashboards · floating cards everywhere ·
analytics layouts · KPI widgets · generic glassmorphism · Bootstrap thinking ·
Material Design · PowerPoint composition · SaaS spacing.
Not every object needs a card. Use asymmetry. Use negative space. Let important objects escape the grid.

# Typography
Typography is more important than decoration. Big numbers. Big headlines. Strong hierarchy.
Never compensate weak layouts with glow.

# Motion
Motion explains hierarchy. Never animate everything. ONE Hero Beat per screen.
Cinematic, never decorative.

# Sound
Every reveal should feel like applause — even with the sound muted.

# Functional Invariants (NEVER broken)
Projector never scrolls · fixed 1920×1080 canvas · transform: scale · cqw/cqh sizing ·
readable from 10 meters · works with 40+ phones · 60 FPS · respects prefers-reduced-motion.
Performance is part of the design.

# Design Tokens
Always respect existing tokens. Do NOT invent new typography scales, radii, spacing, or
motion systems. Design freedom comes from **composition**, not random styling.

# Workflow (ONE screen only)
1. Understand the emotional goal — one sentence.
2. Critique the current screen — list every dashboard convention.
3. Create THREE radically different layout concepts (no code yet): A / B / C.
4. Compare; choose the strongest; explain why.
5. Only now implement.

# Anti Patterns — stop immediately if it looks like
Jira · Notion · ClickUp · Linear · Airtable · Power BI · Grafana · Google Analytics · admin dashboards.
This means the direction is wrong.

# Success Criteria
A player should never say "Nice interface." They should say "That reveal was awesome" or
"That felt like a real gameshow." The experience is remembered, not the UI.

# Final Question
Before finishing any screen: **If Nintendo built this, would they ship it?**
If no — keep exploring. Do not optimize. Challenge. Replace. Surprise. Create moments, not dashboards.
