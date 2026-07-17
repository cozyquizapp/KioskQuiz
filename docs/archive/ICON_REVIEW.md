# Icon- & Grafik-Review (alles außer Team-Avatare)

Stand 2026-06-27. Team-Avatare = `cozy3d` (schon neu, separat). Hier alle **anderen**
Grafiken im Quiz, gruppiert nach Zweck, mit Datei-Pfad + wo sie auftauchen.
Hak ab, was du neu machen / behalten willst.

Dateiformat-Hinweis: `/icons/` sind PNGs (Slug = Dateiname). `/categories/` +
`/decorations/` gibt's je als `.png` **und** `.webp` (gleiches Motiv).

---

## 1) Kategorie-Icons (5) — AKTIV
Klein-Icons auf Frage-Card, Badges, Mod-UI. Pfad `/icons/cat-*.png` (via `qqCatSlug`).
- [ ] **Mu-Cho** — `cat-mucho.png`
- [ ] **Schätzchen** — `cat-schaetzchen.png`
- [ ] **Bunte Tüte** — `cat-bunte-tuete.png`
- [ ] **10 von 10** — `cat-zehn-von-zehn.png`
- [ ] **Cheese / „Schau mal!"** — `cat-cheese.png`

## 2) Bunte-Tüte Sub-Mechaniken — AKTIV (4) + Lücken
Pfad `/icons/sub-*.png` (via `qqSubSlug`).
- [ ] **Heiße Kartoffel** — `sub-hotpotato.png`
- [ ] **Top 5** — `sub-top5.png`
- [ ] **Fix It (Reihenfolge)** — `sub-order.png`
- [ ] **Pin It (Karte)** — `sub-map.png`
- ⚠️ **Bluff** — *kein eigenes Icon* (fällt auf 🎭-Emoji zurück) → ggf. neu machen
- ⚠️ **4 gewinnt / Only Connect** — *kein eigenes Icon* (🧩-Emoji) → ggf. neu machen
- 🚫 **Imposter (oneOfEight)** — deaktiviert, braucht kein Icon

## 3) Aktions-/Spielmechanik-Icons
Auf dem Brett (Marker) + Aktions-Karten im /team.
- [ ] **Frost / einfrieren** — `/icons/marker-frost.png` (Brett-Zelle)
- [ ] **Schild** — `/icons/marker-shield.png` (Brett-Zelle)
- [ ] **Sanduhr / Bann** — `/icons/marker-sanduhr.png` (Brett-Zelle)
- [ ] **Tausch / Swap** — `/icons/marker-swap.png`
- [ ] **Platzieren (Place)** — `/icons/fx-place.png` (📍)
- [ ] **Stapeln (Stack)** — `/icons/fx-stack.png` (🏯) *(akt. teils Emoji)*
- [ ] **Hot Potato** — `/icons/fx-potato.png` (🥔)
- ⚠️ **Klauen (Steal)** — *KEIN eigenes Icon!* nutzt aktuell ⚡/⚔️-Emoji + Scherben-
  Animation auf dem Brett. **Kandidat für ein neues Icon**, da du „steal" explizit nennst.

## 4) Allgemeine FX-Icons (Reveals, Standings, UI)
Pfad `/icons/fx-*.png`, gerendert via Emoji→Icon-Mapping (`QQEmojiIcon`).
Manche sind aktiv, ein paar wurden bewusst auf Plain-Emoji zurückgedreht (z.B.
`fx-lightning`, `fx-stack`) — bei Bedarf sage ich dir pro Icon den genauen Status.
- [ ] **Pokal** — `fx-trophy.png` (🏆)
- [ ] **Medaillen** — `fx-medal-gold.png` / `fx-medal-silver.png` / `fx-medal-bronze.png`
- [ ] **Richtig / Falsch** — `fx-check.png` (✅) / `fx-cross.png` (❌)
- [ ] **Ziel** — `fx-target.png` (🎯)
- [ ] **Blitz / Feuer** — `fx-lightning.png` (⚡) / `fx-fire.png` (🔥)
- [ ] **Handy** — `fx-phone.png` (📱)
- [ ] **Sparkles / Stern / Konfetti** — `fx-sparkles.png` ✨ / `fx-star.png` ⭐ / `fx-confetti.png` 🎉
- [ ] **Schwindel** — `fx-dizzy.png` (😵)
- [ ] **Chart / Detektiv / Globus / Karte** — `fx-chart.png` 📊 / `fx-detective.png` 🕵️ / `fx-globe.png` 🌍 / `fx-map.png` 🗺️

## 5) Joker
Pfad `/images/jokers/`.
- [ ] **Joker normal** — `1.png` + `2.png` (zwei Varianten, abwechselnd)
- [ ] **Joker Eurovision-Mode** — `eu 1.png` (rund) + `eu 2.png` (eckig, Grid)

## 6) Große Kategorie-Bilder / Logos
Splash/Intro-Grafiken pro Kategorie. Pfad `/categories/` (`*_logo` + Vollbild).
- [ ] **Mu-Cho** — `mucho_logo.png` + `mucho.png`
- [ ] **Schätzchen** — `schaetzchen_logo.png` + `schaetzchen.png`
- [ ] **Bunte Tüte** — `buntetuete_logo.png` + `buntetuete.png`
- [ ] **Cheese** — `cheese_logo.png` + `cheese.png`
- [ ] **„Stimmts" / Punktlandung** — `stimmts.png` + `punktlandung_logo.png`
  ⚠️ *Legacy-Namen* (alte Kategorie-Bezeichnungen) — prüfen ob noch gewünscht/benutzt.

## 7) Dekorationen (schwebende Deko-Objekte pro Frage/Kategorie)
Pfad `/decorations/` (je png + webp).
- [ ] book · camera · cheese · dice · earth · film-strip · lightbulb ·
  measuring-cup · moon · question-bag · ruler · stopwatch · target (13 Stück)

---

## Separat / wohl nicht „Avatar"-Redesign
- **CozyWolf-Maskottchen** — `/avatars/cozywolf/` (22 Posen) = dein Logo/Co-Moderator.
- **Streamdeck-Icons** — `/streamdeck/*.svg` (6: start/cancel/pause/mute/placement/brand) — deine Steuerung.
- **Eurovision-Theme** — `/themes/*` (ESC-Backgrounds/Herzen) — Nischen-Edition.

## Alternate / aktuell NICHT verdrahtet (Doubletten)
Es existiert ein paralleler **`fx-`-Satz** für Kategorien/Subs/Marker, der NICHT
automatisch genutzt wird (`fx-cat-*`, `fx-sub-*`, `fx-marker-*`) + Alt-Varianten
(`fx-mucho-alt-*`, `fx-zvz-alt-*`). Beim Redesign entscheiden: vereinheitlichen
oder aufräumen (kann ich nach Wahl ins `_archive/`).

---

### Empfehlung / Lücken zum Befüllen
1. **Steal-Icon** neu (fehlt komplett — du nennst es explizit).
2. **Bluff** + **4 gewinnt** Sub-Icons (fehlen, nutzen nur Emoji).
3. Legacy-Kategorie-Bilder (`stimmts`/`punktlandung`) klären.
4. Doppelten `fx-cat/sub/marker`-Satz vereinheitlichen.

> Sag mir, welche Gruppe du zuerst angehst — ich kann dir zu jeder Datei die **exakte
> Render-Stelle** (welche View, welche Größe) raussuchen, damit du Format/Stil triffst.
