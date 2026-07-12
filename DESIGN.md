# CozyArena / CozyQuiz — Design System (facts)

Factual reference. Philosophy lives in DESIGN_BRIEF.md. Tokens: qqDesignTokens.ts.
Category colors: shared/qqCategoryTheme.ts.

## Prescribed rules
- Brand colours **Pink / Magenta / Navy — never gold/amber** in UI chrome.
- **No em-dashes** in player-facing text. German UI, umlauts typed directly.
- `/beamer` **never scrolls** — fixed 1920x1080 canvas + `transform:scale`, sizing in `cqw`/`cqh`.
- Bespoke inline CSS + CSS keyframes only. **No Tailwind / no UI library.**
- Tokens (qqDesignTokens.ts): radii `8/16/24/pill`; weight **700 + 900 only**;
  letter-spacing `0.04 / 0.1 / 0.22em`; shadows max-2-layer; tap-target >=44px.
- Motion handwriting: `--qq-enter/exit/state/carry/celebrate/press`; overshoot only for the ONE hero beat.
- Respect `prefers-reduced-motion`. Team size max 3-4 (CozyQuiz). No public team shaming.

## General colours (main.css :root)
| Role | Value |
|---|---|
| Accent (brand pink) | `--qq-accent: #ec4899` |
| Accent light | `--qq-accent-light: #f472b6` |
| Accent magenta | `--qq-accent-magenta: #a21247` |
| Accent soft (glow) | `--qq-accent-soft: #fce7f3` |
| Brand navy | `#1E2A5A` |
| Text primary | `#ffffff` / token `#F8FAFC` |
| Text muted | `--qq-text-muted: #94a3b8` |
| Text dim | `#64748B` |
| Card bg | `linear-gradient(180deg, #1F1A2E, #14101F)` |

Phase colours (pink escalation to finale magenta): `#F9A8D4 -> #F472B6 -> #EC4899 -> #A21247`.

## Fonts
- Body / UI: **Nunito** (`--qq-font` / `--font-game`)
- Display (numbers/headlines): **Fredoka** (`--font-display`)
- Wordmark (COZYQUIZ/COZYARENA/COZYWOLF): **League Spartan** (`--font-brand`)
- Flags: "Twemoji Country Flags" first in cascade only for flag glyphs.

## Category colours (source: shared/qqCategoryTheme.ts, `accent` = dark-bg variant)
| Category | Accent | Badge gradient |
|---|---|---|
| MUCHO | `#60A5FA` | `#1E3A8A -> #2563EB` |
| Schaetzchen | `#EAB308` | `#A16207 -> #EAB308` |
| 10 von 10 (ZEHN_VON_ZEHN) | `#34D399` | `#065F46 -> #059669` |
| CHEESE | `#A78BFA` | `#4C1D95 -> #7C3AED` |
| Bunte Tuete (BUNTE_TUETE) | `#F87171` | `#991B1B -> #DC2626` |

Each also has a `glow` (alpha) for the question-card halo. `QQ_CATEGORY_COLORS`
(quarterQuizTypes.ts) = the lighter primary variant for light bg / dot markers / builder.
Note: Schaetzchen's yellow is a *category identity* colour, not a violation of the
"no gold" brand rule (which applies to brand chrome, not per-category coding).
