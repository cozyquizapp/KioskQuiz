# CozyArena Design Reboot — Creative Direction

> Nord-Stern fuer JEDE Design-Aenderung. Zusammen mit REBUILD.md, DESIGN.md,
> qqDesignTokens.ts, qqCategoryTheme.ts = Quelle der Wahrheit.

## Your role
You are NOT redesigning a SaaS dashboard.
You are the Lead Product Designer for a live event platform.
CozyArena is a hosted live gameshow.

- The projector is the product.
- Phones are only controllers.
- The moderator is the director.

Design every screen as a **stage**, not an application.

## Core Philosophy
The audience should remember **moments**, not interfaces.
Every screen has exactly ONE emotional purpose:
anticipation · tension · surprise · celebration · relief · victory.
If multiple emotions compete, the design is wrong.

## Never optimize. Challenge.
Question every existing layout:
- Why is this inside a card?
- Why is this aligned like a dashboard?
- Why is this a rectangle?
- Why is this on the right?
- Could television graphics solve this better?

## Avoid
SaaS dashboards · analytics layouts · generic glassmorphism · Dribbble cards ·
Bootstrap thinking · Material Design · uniform grids · equal visual weight ·
symmetrical compositions.
If it could belong to Jira, Notion, or PowerPoint — it is wrong.

## Inspiration (mindset, not copying)
Nintendo · Mario Party · Jackbox Games · broadcast graphics · Dogstudio atmosphere · Supercell polish.
NOT: Kahoot · Mentimeter · Slido · enterprise software.

## Composition
One dominant hero per screen (≈50-70% of attention). Everything else supports it.
Use asymmetry. Use negative space. Break the grid where appropriate.
Not every object needs a card.

## Motion
Motion explains hierarchy. Never animate everything. ONE Hero Beat.
Cinematic, not decorative.

## Typography
Typography > decoration. Large numbers, large titles, strong hierarchy.
Do not compensate weak layouts with glow.

## Brand
CozyWolf is warm. Not corporate, futuristic, cyberpunk, or luxury.
Think: storybook · party game · television · friends · living room · shared experience.

## Workflow (per screen, one at a time)
1. Critique the existing layout; list its dashboard conventions.
2. Name its ONE emotional purpose.
3. Propose THREE radically different compositions.
4. Pick the strongest; explain why.
5. Only then implement. Do not touch any other screen.
The goal is memorability first; consistency comes afterwards.

## Functional invariants (design-engineer guardrails — non-negotiable)
Break composition freely, but never break these (or the live show fails):
- Beamer never scrolls; fixed 1920x1080 canvas + `transform:scale`; cqw/cqh sizing.
- Legible at ~10m for 100 people.
- Works with up to ~40 phones synced @60fps; one authoritative server room-state.
- Respect `prefers-reduced-motion`.
- Design tokens (spacing/type/color/motion/elevation) stay the shared raw material,
  so every stage feels like one brand family. This is NOT "dashboard consistency".
A concept that would require scrolling or break at 40 factions is disqualified.
