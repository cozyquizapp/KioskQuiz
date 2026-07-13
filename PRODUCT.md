# PRODUCT.md — CozyQuiz / CozyArena

> Kontext-Anker für Design-Skills (impeccable, design-taste-frontend, ui-ux-pro-max).
> Tiefer: [CREATIVE_DIRECTION.md](CREATIVE_DIRECTION.md) (Philosophie, höchste Prio) ·
> [DESIGN.md](DESIGN.md) (Fakten/Tokens) · [DESIGN_BRIEF.md](DESIGN_BRIEF.md) ·
> Tokens `frontend/src/qqDesignTokens.ts` · Kategoriefarben `shared/qqCategoryTheme.ts`.

## Was es ist
Eine **live moderierte Gameshow**, kein Dashboard, keine Präsentationssoftware.
Der Beamer IST das Produkt, Handys sind Controller, der Moderator (Wolf) ist der Regisseur.
Das Publikum soll sich an **Momente erinnern, nicht an Interfaces**.
- **CozyQuiz** = kleine Runden (3-4 Teams, 5×5-Grid, größtes verbundenes Gebiet). Tier-Avatare (cozy3d).
- **CozyArena** = großes Event (bis 40 Handys → 8 Fraktionen mit **Wappen**, Bar-Race, 0-100-Wertung).

Soll sich anfühlen wie: Nintendo · Mario Party · Jackbox · Fernsehen · cozy Brettspiel · Live-Event.
NICHT wie: Kahoot · Mentimeter · Slido · PowerPoint · Jira · Notion · Enterprise.

## Register (für impeccable)
- **Beamer (`/beamer`) = BRAND-Register** — Design IST der Moment. Expressive Gameshow-Inszenierung,
  Reveals als choreografierte Momente. Hier wird gestaltet, nicht nur bedient.
- **Moderator / Team-Handy = PRODUCT-Register** — Design DIENT (schnell, klar, streamdeck-tauglich).
- **Plattform:** web (PWA). Beamer = fixe 1920×1080-Canvas + `transform:scale`, **niemals Scroll**.

## Marke (non-negotiable, Wolf 2026-07-12 — Identity-Preservation gilt)
- Logo-Farben MÜSSEN in der App leben: **Pink #EC4899 · Magenta #A21247 · Navy #1E2A5A**.
  In UI-Chrome **nie** Gold/Amber. ABER: **Kategoriefarben bleiben** (MUCHO blau, Schätzchen gelb
  #EAB308, 10v10 grün, CHEESE lila, Bunte Tüte rot) — Gold ist als *Schätzchen-Kategoriefarbe* erlaubt,
  nicht als Chrome. **Fraktions-/Teamfarben bleiben.**
- Muss **cozy + warm UND Quiz-Event zugleich** sein — nie nur eins.
- Fonts (committed): Body/UI **Nunito**, Display/Zahlen **Fredoka**, Wortmarke **League Spartan**.
- **Keine Em-Dashes** im Spielertext. Deutsche UI, Umlaute direkt. Bilingual DE/EN (Handy DE / Beamer EN
  im Arena-Modus ist Absicht).
- Bespoke Inline-CSS + CSS-Keyframes. **Kein Tailwind, keine UI-Library, kein framer-motion/GSAP.**
- Motion-Handschrift (Tokens): `--qq-enter/exit/state/carry/celebrate/press`. **Overshoot nur für den
  EINEN Held-Beat** (sonst ease-out, kein Bounce). `prefers-reduced-motion` respektieren.
- Charakter: der Wolf ist Teil des Erlebnisses (Maskottchen + Sprechblase = das Logo). Fireflies, soft depth.
- Keine öffentliche Team-Bloßstellung. Tap-Targets ≥44px.

## Leitfrage pro Screen (Teilnehmer-Prio-Linse)
„Was braucht der/die Teilnehmende JETZT auf dem Screen? Was ist interessant, in welcher Priorität?"

## Aktueller Fokus
CozyArena Live-Event (~Anfang Aug 2026, EN, ~25-40 Handys). Design-Delight-Pass Screen für Screen;
Reveals-Lesbarkeit zuerst (vollgepackte Wappen → klarere Viz je Kategorie), dann Game-Over-Zeremonie.
