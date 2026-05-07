# 5 Design-Direction-Picks für CozyQuiz-Refresh

**Datum:** 2026-05-07  
**Quelle:** Live-WebFetches (Linear, Stripe, Vercel, Raycast) + Tiefen-Recherche (Awwwards 2025/26, Wes Anderson, Studio Ghibli, Blade Runner, Jeopardy 2024+).  
**Status:** 5 Richtungen live durchklickbar auf `/gekocht`. Wartet auf Wolfs Auswahl welche in echte App übertragen wird.

---

## Die 5 Richtungen

### 1. Aurora Stage *(ersetzt initialen Lounge-Glass-Pick)*
**Vibe:** Mesh-Gradient à la Stripe.com / Paper.app · solide Cards mit Glow-Border · premium dunkel  
**Warum nicht Lounge Glass?** Glassmorphism im Pub/Café-Setting hat Kontrast-Probleme auf 4K-Beamer (Bier, Licht, schräger Blickwinkel) — Aurora Stage liefert gleichen Premium-Vibe ohne Lesbarkeitsverlust.

| Token | Hex |
|---|---|
| Void | `#08090E` |
| Navy | `#0F172A` |
| Surface | `#111827` |
| Magenta | `#E879F9` |
| Cyan | `#22D3EE` |
| Lime | `#A3E635` |
| Bone (Text) | `#F1F5F9` |
| Muted | `#94A3B8` |

**Fonts:** Display Outfit · Body Plus Jakarta Sans  
**Refs:** Linear.app, Vercel Geist, Stripe.com Hero

---

### 2. Café Vintage *(rebranded von „Vintage Pub Quiz")*
**Vibe:** 70er-Café-Tapete · Burnt Orange · Parchment-Cards · Wes-Anderson-Vibe  
**Hinweis:** Wolf-Korrektur „eher Café/Kiosk als Pub" — Palette passt zu 70er-Café-Look sogar besser.

| Token | Hex |
|---|---|
| Ink | `#2A1F14` |
| Walnut | `#3D2317` |
| Parchment | `#F2E4C9` |
| Cream | `#E8D5A8` |
| Burnt Orange | `#C8642B` |
| Mustard | `#D8A24A` |
| Avocado | `#6B7A3A` |
| Rust Brown | `#8B3A1F` |

**Fonts:** Display Fraunces (oder Fraunces Soft) · Body Lora  
**Refs:** Wes Anderson Color Scripts, Magnolia Bakery Branding, „Old Pub" Behance-Cluster

---

### 3. Hand-drawn Cozy
**Vibe:** Studio-Ghibli-Frames · weiche Sky+Sage · Caveat für handgeschrieben

| Token | Hex |
|---|---|
| Cream | `#F4E8D0` |
| Card-Cream | `#FBF6E9` |
| Sky | `#A8C8E1` |
| Sage | `#9DB68C` |
| Terracotta | `#D88B6A` |
| Plum | `#8B6F94` |
| Honey | `#D9A441` |
| Ink (NIE pure black!) | `#3E3A36` |

**Fonts:** Display Caveat · Body Nunito  
**Refs:** Alto's Odyssey, Monument Valley, Untitled Goose Game, ewenme/ghibli-Palette  
**Refinement-Tipp:** Borders idealerweise als SVG mit leichtem `feTurbulence`-Wiggle, sonst Notion-Childish statt Ghibli.

---

### 4. Cinematic Noir
**Vibe:** Blade Runner / Letterboxd · Brass-Spotlight · Bone-on-Pitch

| Token | Hex |
|---|---|
| Pitch (true black-not-black) | `#0A0808` |
| Smoke | `#1C1A18` |
| Char | `#262320` |
| Bone | `#F1E6D6` |
| Brass | `#CBA135` |
| Wine (max 3 % Fläche!) | `#7A1818` |
| Mist | `#7A7585` |
| Rust | `#A85C3D` |

**Fonts:** Display DM Serif Display · Body Newsreader  
**Refs:** Blade Runner 2049 Marketing, Disco Elysium UI, A24 Film Microsites, Letterboxd Premium  
**Refinement-Tipp:** Vignette nicht als radial-gradient, sondern echter `box-shadow: inset … blur(200px)` für Linsen-Effekt.

---

### 5. Neo-Retro Game Show
**Vibe:** Jeopardy 2024+ / Family Feud · Chrome-Bevels · Bold-Display

| Token | Hex |
|---|---|
| Stage | `#0C1838` |
| Royal | `#1E3A8A` |
| Cobalt | `#2563EB` |
| Hot Magenta | `#EC4899` |
| Turbo Yellow | `#FACC15` |
| Feud Gold | `#F4B83E` |
| White | `#FFFFFF` |
| Mint | `#3DDC84` |

**Fonts:** Display Bowlby One (nur 1–3 Worte!) · Body Archivo Black  
**Refs:** Jeopardy! 2024+ On-Air-Design, Jackbox „Trivia Murder Party 2", The Wall (NBC), Press Your Luck Reboot  
**Refinement-Tipp:** Game-Show-Magie zu 60 % aus Chrome-Bevels + Light-Strips an Card-Kanten, nicht aus Farbe allein.

---

## Wo gemeinsam?

Alle 5 Designs bekommen im Lab v4:
- **Universal Grain-Overlay** (4 % opacity, SVG feTurbulence) → buchstäblich „cozy"-Branding
- **View-Switch-Cascade** beim Lobby/Frage/Pause-Wechsel (gestaffeltes Hereinfaden)
- **Hover-Lift** auf allen Cards (translateY -3 px, brightness 1.04)
- **Mini-Fireflies** (Default-Element der Brand)

Spezifisch:
- **Aurora Stage:** animierter Mesh-Gradient (60 s slow drift + breathing, Stripe-Style)
- **Cinematic Noir:** animated Film-Grain (3-Frame Flicker @ 24 fps, Recherche-Tipp)
- **Game Show:** Chrome-Bevels via gestackte box-shadows
- **Café Vintage:** 2-Layer Parchment via inset-shadow Stockflecken-Vignette

---

## Kategorie-Farben pro Design

| Cat | Aurora | Café | Hand-drawn | Noir | Game Show |
|---|---|---|---|---|---|
| Schätzchen | `#FBBF24` | `#D8A24A` | `#D9A441` | `#CBA135` | `#FACC15` |
| Mu-Cho | `#22D3EE` | `#3D5A80` | `#A8C8E1` | `#5B82A6` | `#2563EB` |
| Bunte Tüte | `#FB7185` | `#C8642B` | `#D88B6A` | `#7A1818` | `#EC4899` |
| 10 von 10 | `#A3E635` | `#6B7A3A` | `#9DB68C` | `#7A9572` | `#3DDC84` |
| Schau mal! | `#C084FC` | `#7B4B94` | `#8B6F94` | `#9B7AAE` | `#A855F7` |

---

## Quellen

- [Linear.app](https://linear.app)
- [Vercel Geist Design](https://vercel.com/geist/colors)
- [Vercel Brand — Mobbin](https://mobbin.com/colors/brand/vercel)
- [Stripe.com](https://stripe.com)
- [Raycast.com](https://www.raycast.com)
- [Studio Ghibli ewenme/ghibli](https://ewenme.github.io/ghibli/)
- [70s Retro Color Palette Guide](https://www.myvintage.uk/post/70s-retro-colour-palette-guide)
- [14 Best 70s Color Palettes with HEX](https://logosbynick.com/70s-color-palettes-with-hex/)
- [Film Noir Color Palette — color-hex](https://www.color-hex.com/color-palette/1027690)
- [Jeopardy! Set + Branding](https://en.wikipedia.org/wiki/Jeopardy!)
- [Awwwards: Interactive and Animated Quiz](https://www.awwwards.com/inspiration/interactive-and-animated-quiz)
- [Mobile UI Patterns 2026 — Muzli](https://muz.li/blog/whats-changing-in-mobile-app-design-ui-patterns-that-matter-in-2026/)
- [Dark Glassmorphism: 2026-Aesthetic — Medium](https://medium.com/@developer_89726/dark-glassmorphism-the-aesthetic-that-will-define-ui-in-2026-93aa4153088f)
- [Glassmorphism + Accessibility — Axess Lab](https://axesslab.com/glassmorphism-meets-accessibility-can-frosted-glass-be-inclusive/)
