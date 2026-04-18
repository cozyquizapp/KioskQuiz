# CozyQuiz · Avatar-Cast Briefing

Illustrator-Briefing für die Erweiterung des CozyWolf-Casts. Der Wolf
(`frontend/public/logo.png`) ist gesetzt und dient als Style-Anker —
alle weiteren Charaktere müssen visuell zur selben Familie gehören.

---

## 🎨 Style Bible

**Voranstellen bei jedem Prompt / jeder Brief-Konversation:**

> Flat vector mascot illustration, front-facing 3/4 view, head and
> shoulders only. Cozy cartoon style: rounded soft shapes, no outlines,
> no gradients, no shading — only solid color fills. Eyes are closed as
> a gentle curved line with a subtle upward lash tip. Small peaceful
> smile. Character wears a chunky pullover hoodie visible from shoulders
> down, hood lying flat behind neck (not up). Composition centered
> inside a thick circular color ring on a pure white background. Ring
> color matches the animal's body color. Style matches the "CozyWolf"
> brand: minimalist, warm, friendly, zen. No text, no logo, square 1:1,
> 1024×1024.

---

## 📐 Unverrückbare Style-Regeln

- **Augen IMMER geschlossen** — sanfter Bogen + kleiner Wimpern-Hinweis nach oben. Das ist die CozyWolf-Signatur, die den gesamten Cast zusammenhält.
- **Keine Outlines** — Farbkanten definieren Formen, keine schwarzen Striche drumherum.
- **Keine Gradients, keine Schatten** — nur Flächenfarben.
- **Pose: 3/4-Ansicht** (Kopf leicht zur Seite), **Komposition: Kopf + Schultern/Brust**.
- **Hoodie:** massiv, bis Brust sichtbar, Kapuze liegt flach im Nacken (nicht hochgezogen).
- **Ring-Stärke:** ca. 8–10 % vom Durchmesser — gleiche Dicke wie beim Wolf-Logo.
- **Ring-Farbe = Körperfarbe** des jeweiligen Tiers.
- **Hintergrund innerhalb des Rings:** reines Weiß.
- **Keine Accessoires** (keine Brillen, Hüte, Blumen, Ketten) — bleibt zeitlos und Team-neutral.

---

## 🎨 Farb- & Charakter-Matrix

**Wichtig:** Die Tier-Körperfarbe ist gleichzeitig **Team-Farbe auf dem
Grid** und **Ring-Farbe** (wie beim Wolf: pink Wolf, pink Ring, pink
Feld). Deshalb sind die Farben gesättigt und bewusst distinkt gewählt
— nicht fotorealistisch. Der Stil trägt das (siehe pink-Koala im
Referenz-Material).

Der Wolf ist **Logo only** — er tritt nicht als spielbares Team an,
seine Magenta-Farbe ist fürs Branding reserviert. Die 8 Team-Avatare
darunter decken 8 distinkte Hue-Bereiche ab.

| # | Tier | Body = Ring = Grid | Hoodie | Team-Farbe |
|---|---|---|---|---|
| — | Wolf *(Logo, spielt nicht)* | Magenta-Pink `#E11D74` | Navy `#1E2A5E` | reserviert |
| 1 | Waschbär | Teal `#14B8A6` (+ schwarze Augenmaske) | Amber `#F59E0B` | Team Teal |
| 2 | Faultier | Lime `#84CC16` | Burgund `#7C2D12` | Team Lime |
| 3 | Pinguin | Royal Blue `#2563EB` (+ weißer Bauch, oranger Schnabel) | Sonnengelb `#FDE047` | Team Blue |
| 4 | Kuh | Orange `#F97316` (+ weiße Flecken) | Deep Plum `#581C87` | Team Orange |
| 5 | Koala | Violet `#8B5CF6` (+ rosa Nase) | Goldgelb `#EAB308` | Team Violet |
| 6 | Giraffe | Gelb `#EAB308` (+ hellbraune Patches) | Deep Purple `#5B21B6` | Team Yellow |
| 7 | Capybara | Rot `#DC2626` | Forest Green `#166534` | Team Red |
| 8 | Shiba Inu | Hot Pink `#EC4899` (+ weiße Schnauze/Bauch) | Sky Blue `#0EA5E9` | Team Pink |

**Palette-Prinzip:**
- 8 distinkte Team-Hues: Teal, Lime, Blue, Orange, Violet, Yellow, Red, Pink — garantiert Grid-Lesbarkeit auch bei vollem Feld
- Hoodie ist **komplementär / kontrastierend** zur Körperfarbe — jeder Charakter hat eigenen Pop
- Tier-typische Akzente (Waschbär-Maske, Pinguin-Bauch, Kuh-Flecken, Shiba-weißer-Bauch) sitzen ON TOP der Signature-Farbe, ersetzen sie nicht
- **Wolf-Magenta `#E11D74` ≠ Shiba-Hot-Pink `#EC4899`:** nebeneinander sichtbar unterschiedlich (Wolf = Magenta-Richtung, Shiba = Pink-Richtung). Trotzdem: Wolf bleibt Logo-only, damit nie Verwechslung entsteht.

---

## 📝 Einzel-Prompts (v2 · copy-paste ready)

Jeder Prompt ist **komplett eigenständig** — Style Bible ist bereits
eingearbeitet. Einfach den Code-Block kopieren und direkt in den
Bild-Generator (Midjourney, ChatGPT/DALL·E, Leonardo, etc.) einfügen.

**Alternativ:** Live-Kopier-Buttons im Design Lab →
`/design-lab.html` → Abschnitt „Avatar-Prompts (v2 · copy-paste)".

**v2-Änderungen nach erstem Test-Render:**
- 3/4-Pose explizit eingefordert (v1 → fast frontale Figur)
- Ring-Dicke **8–10 %** als harte Anweisung (v1 → zu dünn)
- Hoodie explizit als Pullover-Hoodie mit sichtbarer Kapuze (v1 → Dufflecoat mit Knebeln)
- „Absolutely flat, no edge shadows, no rim lighting" (v1 → subtile Hoodie-Kante)
- „Highly saturated, do not desaturate, match hex codes exactly"

**v2.1-Härtung nach zweitem Test-Render (Waschbär):**
- **Augen-Symmetrie** hart eingefordert — in v2 hatte ein Auge eine
  sichtbare Pupille/Punkt, das andere die Closed-Eye-Kurve. Neue
  Formulierung: *„Both eyes are IDENTICAL and fully closed … No visible
  pupils, no dots, no eyeballs, no open-eye elements on either side."*

### 1. Waschbär — Team Teal

```
Flat vector mascot illustration in the exact style of the "CozyWolf" brand logo. 3/4 view with the head clearly turned slightly to one side (NOT straight-on front-facing). Head and shoulders only. Cozy cartoon style with rounded soft shapes. Absolutely flat: no outlines, no gradients, no shading, no edge shadows, no rim lighting, no darker color lip at hoodie edges — only pure solid color fills. Both eyes are IDENTICAL and fully closed — each eye is a gentle symmetric curved line with a subtle upward lash tip at the outer corner. No visible pupils, no dots, no eyeballs, no open-eye elements on either side. Both eye shapes must mirror each other perfectly in size, position and curvature. Small peaceful closed-mouth smile. Character wears a chunky pullover HOODIE (NOT a coat, NOT a duffle coat, NO toggles, NO buttons, NO zippers) visible from shoulders down, with a soft rounded hood clearly visible as a fold of fabric lying flat behind the neck and shoulders. Composition centered inside a VERY THICK circular color ring — ring thickness approximately 8 to 10 percent of the image diameter, bold and chunky, never thin. Ring color matches the animal's body color exactly. Highly saturated brand colors, do not desaturate, match hex codes exactly. Pure white background inside and outside the ring. Style must match the CozyWolf wolf logo as a sibling character. No text, no logo marks, square 1:1, 1024x1024. Raccoon character, saturated teal #14B8A6 fur, signature black bandit-mask across the eyes (still clearly visible even with the eyes closed), small rounded ears with teal inner fur, tiny black nose. Wearing amber-orange hoodie #F59E0B. Teal circle ring matching the body color exactly.
```

### 2. Faultier — Team Lime

```
Flat vector mascot illustration in the exact style of the "CozyWolf" brand logo. 3/4 view with the head clearly turned slightly to one side (NOT straight-on front-facing). Head and shoulders only. Cozy cartoon style with rounded soft shapes. Absolutely flat: no outlines, no gradients, no shading, no edge shadows, no rim lighting, no darker color lip at hoodie edges — only pure solid color fills. Both eyes are IDENTICAL and fully closed — each eye is a gentle symmetric curved line with a subtle upward lash tip at the outer corner. No visible pupils, no dots, no eyeballs, no open-eye elements on either side. Both eye shapes must mirror each other perfectly in size, position and curvature. Small peaceful closed-mouth smile. Character wears a chunky pullover HOODIE (NOT a coat, NOT a duffle coat, NO toggles, NO buttons, NO zippers) visible from shoulders down, with a soft rounded hood clearly visible as a fold of fabric lying flat behind the neck and shoulders. Composition centered inside a VERY THICK circular color ring — ring thickness approximately 8 to 10 percent of the image diameter, bold and chunky, never thin. Ring color matches the animal's body color exactly. Highly saturated brand colors, do not desaturate, match hex codes exactly. Pure white background inside and outside the ring. Style must match the CozyWolf wolf logo as a sibling character. No text, no logo marks, square 1:1, 1024x1024. Sloth character, bright lime-green #84CC16 fur, slightly shaggy cheek tufts, rounded head, tiny dark nose, dreamy closed-eye smile. Wearing deep burgundy hoodie #7C2D12. Lime-green circle ring matching the body color exactly.
```

### 3. Pinguin — Team Blue

```
Flat vector mascot illustration in the exact style of the "CozyWolf" brand logo. 3/4 view with the head clearly turned slightly to one side (NOT straight-on front-facing). Head and shoulders only. Cozy cartoon style with rounded soft shapes. Absolutely flat: no outlines, no gradients, no shading, no edge shadows, no rim lighting, no darker color lip at hoodie edges — only pure solid color fills. Both eyes are IDENTICAL and fully closed — each eye is a gentle symmetric curved line with a subtle upward lash tip at the outer corner. No visible pupils, no dots, no eyeballs, no open-eye elements on either side. Both eye shapes must mirror each other perfectly in size, position and curvature. Small peaceful closed-mouth smile. Character wears a chunky pullover HOODIE (NOT a coat, NOT a duffle coat, NO toggles, NO buttons, NO zippers) visible from shoulders down, with a soft rounded hood clearly visible as a fold of fabric lying flat behind the neck and shoulders. Composition centered inside a VERY THICK circular color ring — ring thickness approximately 8 to 10 percent of the image diameter, bold and chunky, never thin. Ring color matches the animal's body color exactly. Highly saturated brand colors, do not desaturate, match hex codes exactly. Pure white background inside and outside the ring. Style must match the CozyWolf wolf logo as a sibling character. No text, no logo marks, square 1:1, 1024x1024. Penguin character, saturated royal blue #2563EB body and head with a white belly/chest patch peeking above the hoodie collar, small orange beak, rounded head. Wearing bright sun-yellow hoodie #FDE047. Royal-blue circle ring matching the body color exactly.
```

### 4. Kuh — Team Orange

```
Flat vector mascot illustration in the exact style of the "CozyWolf" brand logo. 3/4 view with the head clearly turned slightly to one side (NOT straight-on front-facing). Head and shoulders only. Cozy cartoon style with rounded soft shapes. Absolutely flat: no outlines, no gradients, no shading, no edge shadows, no rim lighting, no darker color lip at hoodie edges — only pure solid color fills. Both eyes are IDENTICAL and fully closed — each eye is a gentle symmetric curved line with a subtle upward lash tip at the outer corner. No visible pupils, no dots, no eyeballs, no open-eye elements on either side. Both eye shapes must mirror each other perfectly in size, position and curvature. Small peaceful closed-mouth smile. Character wears a chunky pullover HOODIE (NOT a coat, NOT a duffle coat, NO toggles, NO buttons, NO zippers) visible from shoulders down, with a soft rounded hood clearly visible as a fold of fabric lying flat behind the neck and shoulders. Composition centered inside a VERY THICK circular color ring — ring thickness approximately 8 to 10 percent of the image diameter, bold and chunky, never thin. Ring color matches the animal's body color exactly. Highly saturated brand colors, do not desaturate, match hex codes exactly. Pure white background inside and outside the ring. Style must match the CozyWolf wolf logo as a sibling character. No text, no logo marks, square 1:1, 1024x1024. Cow character, bright orange #F97316 coat with a few irregular pure-white spot patches on the head, small pink muzzle, tiny rounded horns peeking out, floppy ears. Wearing deep plum hoodie #581C87. Orange circle ring matching the body color exactly.
```

### 5. Koala — Team Violet

```
Flat vector mascot illustration in the exact style of the "CozyWolf" brand logo. 3/4 view with the head clearly turned slightly to one side (NOT straight-on front-facing). Head and shoulders only. Cozy cartoon style with rounded soft shapes. Absolutely flat: no outlines, no gradients, no shading, no edge shadows, no rim lighting, no darker color lip at hoodie edges — only pure solid color fills. Both eyes are IDENTICAL and fully closed — each eye is a gentle symmetric curved line with a subtle upward lash tip at the outer corner. No visible pupils, no dots, no eyeballs, no open-eye elements on either side. Both eye shapes must mirror each other perfectly in size, position and curvature. Small peaceful closed-mouth smile. Character wears a chunky pullover HOODIE (NOT a coat, NOT a duffle coat, NO toggles, NO buttons, NO zippers) visible from shoulders down, with a soft rounded hood clearly visible as a fold of fabric lying flat behind the neck and shoulders. Composition centered inside a VERY THICK circular color ring — ring thickness approximately 8 to 10 percent of the image diameter, bold and chunky, never thin. Ring color matches the animal's body color exactly. Highly saturated brand colors, do not desaturate, match hex codes exactly. Pure white background inside and outside the ring. Style must match the CozyWolf wolf logo as a sibling character. No text, no logo marks, square 1:1, 1024x1024. Koala character, saturated violet #8B5CF6 fur, big fluffy round ears, large pink heart-shaped nose, fuzzy cheeks. Wearing golden-yellow hoodie #EAB308. Violet circle ring matching the body color exactly.
```

### 6. Giraffe — Team Yellow

```
Flat vector mascot illustration in the exact style of the "CozyWolf" brand logo. 3/4 view with the head clearly turned slightly to one side (NOT straight-on front-facing). Head and shoulders only. Cozy cartoon style with rounded soft shapes. Absolutely flat: no outlines, no gradients, no shading, no edge shadows, no rim lighting, no darker color lip at hoodie edges — only pure solid color fills. Both eyes are IDENTICAL and fully closed — each eye is a gentle symmetric curved line with a subtle upward lash tip at the outer corner. No visible pupils, no dots, no eyeballs, no open-eye elements on either side. Both eye shapes must mirror each other perfectly in size, position and curvature. Small peaceful closed-mouth smile. Character wears a chunky pullover HOODIE (NOT a coat, NOT a duffle coat, NO toggles, NO buttons, NO zippers) visible from shoulders down, with a soft rounded hood clearly visible as a fold of fabric lying flat behind the neck and shoulders. Composition centered inside a VERY THICK circular color ring — ring thickness approximately 8 to 10 percent of the image diameter, bold and chunky, never thin. Ring color matches the animal's body color exactly. Highly saturated brand colors, do not desaturate, match hex codes exactly. Pure white background inside and outside the ring. Style must match the CozyWolf wolf logo as a sibling character. No text, no logo marks, square 1:1, 1024x1024. Giraffe character, bright yellow #EAB308 coat with soft light-brown irregular patches, long slender neck emerging from the hoodie collar, small ossicones (horn-stumps) on the head, tiny dark nose. Wearing deep-purple hoodie #5B21B6. Yellow circle ring matching the body color exactly.
```

### 7. Capybara — Team Red

```
Flat vector mascot illustration in the exact style of the "CozyWolf" brand logo. 3/4 view with the head clearly turned slightly to one side (NOT straight-on front-facing). Head and shoulders only. Cozy cartoon style with rounded soft shapes. Absolutely flat: no outlines, no gradients, no shading, no edge shadows, no rim lighting, no darker color lip at hoodie edges — only pure solid color fills. Both eyes are IDENTICAL and fully closed — each eye is a gentle symmetric curved line with a subtle upward lash tip at the outer corner. No visible pupils, no dots, no eyeballs, no open-eye elements on either side. Both eye shapes must mirror each other perfectly in size, position and curvature. Small peaceful closed-mouth smile. Character wears a chunky pullover HOODIE (NOT a coat, NOT a duffle coat, NO toggles, NO buttons, NO zippers) visible from shoulders down, with a soft rounded hood clearly visible as a fold of fabric lying flat behind the neck and shoulders. Composition centered inside a VERY THICK circular color ring — ring thickness approximately 8 to 10 percent of the image diameter, bold and chunky, never thin. Ring color matches the animal's body color exactly. Highly saturated brand colors, do not desaturate, match hex codes exactly. Pure white background inside and outside the ring. Style must match the CozyWolf wolf logo as a sibling character. No text, no logo marks, square 1:1, 1024x1024. Capybara character, saturated red #DC2626 fur, blunt rounded muzzle, tiny round ears, gentle smiling expression. Wearing forest-green hoodie #166534. Red circle ring matching the body color exactly.
```

### 8. Shiba Inu — Team Pink

```
Flat vector mascot illustration in the exact style of the "CozyWolf" brand logo. 3/4 view with the head clearly turned slightly to one side (NOT straight-on front-facing). Head and shoulders only. Cozy cartoon style with rounded soft shapes. Absolutely flat: no outlines, no gradients, no shading, no edge shadows, no rim lighting, no darker color lip at hoodie edges — only pure solid color fills. Both eyes are IDENTICAL and fully closed — each eye is a gentle symmetric curved line with a subtle upward lash tip at the outer corner. No visible pupils, no dots, no eyeballs, no open-eye elements on either side. Both eye shapes must mirror each other perfectly in size, position and curvature. Small peaceful closed-mouth smile. Character wears a chunky pullover HOODIE (NOT a coat, NOT a duffle coat, NO toggles, NO buttons, NO zippers) visible from shoulders down, with a soft rounded hood clearly visible as a fold of fabric lying flat behind the neck and shoulders. Composition centered inside a VERY THICK circular color ring — ring thickness approximately 8 to 10 percent of the image diameter, bold and chunky, never thin. Ring color matches the animal's body color exactly. Highly saturated brand colors, do not desaturate, match hex codes exactly. Pure white background inside and outside the ring. Style must match the CozyWolf wolf logo as a sibling character. No text, no logo marks, square 1:1, 1024x1024. Shiba Inu dog character, saturated hot pink #EC4899 fur with a white muzzle and white chest-patch peeking above the hoodie collar, small triangular upright pointed ears, pointed fox-like snout, tiny black nose, hint of a curled tail behind the shoulder. Wearing sky-blue hoodie #0EA5E9. Hot-pink circle ring matching the body color exactly.
```

---

## 📦 Deliverables pro Tier

Vom Illustrator/AI erwartet:

1. **SVG** (vektoriell, editierbar) — primäres Format, damit Farben
   später nachjustierbar sind
2. **PNG 512×512** (transparent background) — für Web-Avatare
3. **PNG 1024×1024** (transparent background) — für Hero-Momente, Beamer
4. **Quelle** (AI, Figma, Illustrator) — falls später Animation dazukommt

**Dateinamen:** `avatar-<tier>.svg` / `avatar-<tier>-512.png` etc., im
Ordner `frontend/public/avatars/cozy-cast/`.

---

## 🔧 Technische Liefer-Spec

**Transparenz:** Außerhalb des Rings komplett transparent, innerhalb
des Rings reines Weiß (genau wie das Wolf-Logo). Der Ring + das Weiß
gehören zur Grafik — nur der Bereich **außenrum** ist Alpha. Dadurch
funktioniert der Avatar als „Sticker" auf jedem Hintergrund (dunkler
Beamer, helles Menü, farbige Team-Pill).

### SVG (Pflicht, primäres Format)

- `viewBox="0 0 1024 1024"`, quadratisch
- Vektorpfade mit **exakten Hex-Farben aus der Matrix oben** — keine gerundeten/approximierten Werte
- **Kein eingebettetes Raster** (keine `<image>`-Tags, keine base64-PNGs, keine externen Abhängigkeiten)
- Hintergrund außerhalb des Rings: kein Fill (transparent)
- Nach Möglichkeit pro Charakter benannte Gruppen/IDs:
  - `#ring` — der farbige Kreis-Ring
  - `#body` — Tier-Körper/-Kopf (die Signature-Farbe)
  - `#hoodie` — Pullover/Kapuze
  - `#accent` — tier-typische Akzente (Augenmaske, weißer Bauch, Flecken etc.)
- Dadurch können Farben später per Code nachjustiert werden, falls ein Hue sich im Live-Test als schlecht lesbar herausstellt.

### PNG mit Alpha (Fallback + schnelle Ladezeit)

- **512×512** — für Team-Pills, Moderator-Panel, Grid-Badges
- **1024×1024** — für Hero-Momente, Winner-Reveal, Beamer-Stage
- RGBA (24-bit + Alpha), **nicht indiziert** (kein PNG-8)
- Keine Weichzeichner-Kanten am Ring — harte Alpha-Kante außenrum

### Dateinamen (ASCII, lowercase, keine Umlaute)

```
avatar-waschbaer.svg   avatar-waschbaer-512.png   avatar-waschbaer-1024.png
avatar-faultier.svg    avatar-faultier-512.png    avatar-faultier-1024.png
avatar-pinguin.svg     avatar-pinguin-512.png     avatar-pinguin-1024.png
avatar-kuh.svg         avatar-kuh-512.png         avatar-kuh-1024.png
avatar-koala.svg       avatar-koala-512.png       avatar-koala-1024.png
avatar-giraffe.svg     avatar-giraffe-512.png     avatar-giraffe-1024.png
avatar-capybara.svg    avatar-capybara-512.png    avatar-capybara-1024.png
avatar-shiba.svg       avatar-shiba-512.png       avatar-shiba-1024.png
```

### Zielordner im Repo

```
frontend/public/avatars/cozy-cast/
```

### Optional: Lottie (Phase 2)

- Format: `.json` (oder `.lottie`)
- Canvas: transparent
- Alle Assets **inline/flat** — keine externen PNG-Referenzen
- viewBox 1024×1024, Framerate 30 oder 60
- Dateiname: `avatar-<tier>.lottie.json`

---

## 🎬 Optional: Lottie-Animation

Zweite Phase (nur wenn Budget/Zeit da):

- **Idle-Loop** (2–3 Sek): sanftes Atmen/Wippen, minimale Bewegung
- **Celebration-Trigger** (1.5 Sek, einmalig): Hüpfer + Sparkle-Ring beim Winner-Reveal

Zum Testen in `/design-lab.html` droppen (dort ist die Drop-Zone live).

---

## ✅ Akzeptanz-Checklist

Pro Tier prüfen, bevor als „fertig" abgenommen wird:

- [ ] Augen sind geschlossen (Bogenlinie), kein offenes Auge
- [ ] Keine Outlines, keine Gradients, keine Schatten
- [ ] 3/4-Pose, Kopf + Schultern
- [ ] Hoodie sichtbar bis Brust, Kapuze liegt flach
- [ ] Ring-Farbe stimmt mit Körperfarbe überein
- [ ] Weißer Hintergrund innerhalb des Rings
- [ ] Stil wirkt neben dem Wolf als „Geschwister", nicht als Fremdkörper
- [ ] Keine Accessoires
- [ ] Export als SVG + PNG 512 + PNG 1024 vorhanden
