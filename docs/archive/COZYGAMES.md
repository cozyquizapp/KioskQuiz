# CozyGames — V1-Spec

**Stand**: 2026-05-17
**Status**: Konzept-V1 freigegeben (Wolf), Implementation steht aus

CozyGames sind analoge Real-Life-Mini-Spiele (Geschicklichkeit / Mund-Atem / Stapel / Wurf) die ins Quiz integriert werden — als Brand-Differenziator weg vom klassischen Pubquiz, passend zu Wolfs Café-/Kiosk-/Bar-Setting.

---

## Mechanik-Spec

### Position im Quiz
- **Nach Runde 1** (= nach 5 Wissens-Fragen): 1× CozyGame als Energy-Reset + Brand-Moment
- **In der Final-Runde**: 1 weiterer Slot — zählt als Final-Kategorie und fließt ins Final-Wager-Bet-Resolve mit ein

### Aktivierung
- **Builder-Toggle** `cozyGamesEnabled: boolean` pro Draft (wie `finalWagerEnabled`)
- ✅ on → CozyGame nach Runde 1 + Final-Slot
- ❌ off → unverändert klassisches Quiz

### Wertung
- **1. Platz = 1 Aktion** in der aktuellen Phase, identisch zur Frage-Sieger-Aktion (FREE / PLACE_1 / PLACE_2 etc.)
- **Gleichstand** → beide Sieger bekommen je 1 Aktion (analog zu Wissens-Frage-Tie)
- **Keine neuen Bonus-Mechaniken** — Belohnung läuft komplett über bestehende Action-Pipeline
- **Score-Modell konsistent**: 1 Mini-Game-Win = 1 Punkt = 1 Brett-Aktion (analog zu 1 Frage = 1 Punkt = 1 Brett-Aktion)

### Tie-Breaker bei Geschick-Gleichstand
Bestehende Quiz-Tie-Mechanik — keine eigene 3-Stufen-Eskalation (Olympiade-Tie-Pattern wurde verworfen, zu komplex).

---

## Glücksrad-UX

### Selektion-Visual
Glücksrad mit **adaptiver Slice-Anzahl** (3-8 Slices, je nachdem wie viele Spiele im Setup aktiv).

- Bei **≤3 aktiven Spielen**: kein Rad-Theater, sondern direkte Reveal-Card („Nächstes Spiel: X")
- Bei **4-8 aktiven Spielen**: vollwertiges Rad mit Spin-Animation
- Slice-Inhalt: Emoji groß + 1-2-Wort-Label

### Spin-Choreo
- **Slow-Start → Accelerate → Decelerate** mit near-miss-Bounce am Stopper
- **Final-Snap** auf Sieger-Slice mit Glow + leichtem Konfetti
- **CozyWolf daneben** als Reaktions-Layer: gespannt-überrascht während Spin, jubel beim Stopp

### Sound-Slots (neu)
- `cozyGameWheelTick` — Pointer-Brrrt während Spin (klassisches Glücksrad-Ticken)
- `cozyGameWheelStop` — Final-Snap-Chord beim Stopp
- (Optional) `cozyGameWheelStart` — Anfangs-Whoosh

Im Mod-Sound-Panel editierbar, Synth-Fallback wie alle anderen Slots.

### Wiederhol-Logik
**Entscheidung offen** — zwei Varianten:
- **A) Shrink** — gespieltes Spiel verschwindet aus Rad für diesen Quiz. Klarer Fortschritt.
- **B) Re-Roll erlaubt** — gleiches Spiel kann nochmal kommen. „Das Rad will Bierdeckel sehen."

Default-Vorschlag: **A (Shrink)**, weil im Quiz max 2 CozyGames vorkommen (Runde 1 + Final) — kein Re-Roll-Bedarf.

---

## V1-Katalog (12 Spiele)

### Mund/Atem (3)

#### 🌬️ Wattebausch-Pusten
**Ablauf**: Wattebausch mit Strohhalm in Zielzone (Teller) pusten. Anzahl in 60s.
**Material**: Wattebäuche, Strohhalme, Teller
**Tags**: 🪑 Tisch · 🔇 leise · ⏱️ 60s · 🌬️ Strohhalm

#### 🍭 M&M-Strohhalm-Transport
**Ablauf**: Strohhalm an M&M ansaugen, zum zweiten Teller tragen, fallenlassen. Anzahl in 60s.
**Material**: 2 Teller, Strohhalme, ~50 M&Ms (oder Erbsen/Linsen)
**Tags**: 🪑 Tisch · 🔇 leise · ⏱️ 60s · 🌬️ Strohhalm · 🍭 Süßigkeit

#### 🎈 Luftballon-Pusten-Hochhalten
**Ablauf**: Ballon nur durch Anpusten in der Luft halten, keine Hände. Zeit bis Bodenberührung.
**Material**: Luftballons (Reserve mitbringen)
**Tags**: 🚶 Steh · 🔇 leise · ⏱️ variabel · 🎈 Ballon

### Stapel/Bau (3)

#### 🪙 Münzturm einhändig
**Ablauf**: Eine Hand baut, andere bleibt unter dem Tisch. Höchster Turm in 60s.
**Material**: 20-30 gleichgroße Münzen
**Tags**: 🪑 Tisch · 🔇 leise · ⏱️ 60s · 🪙 Münzen

#### 🃏 Karten-Haus 3 Stockwerke
**Ablauf**: Schnellste Zeit für stabiles 3-Stockwerk-Kartenhaus. Niemand schafft's in 60s → höchster Versuch zählt.
**Material**: 1 Kartenset pro Team, windstiller Tisch
**Tags**: 🪑 Tisch · 🔇 leise · ⏱️ 60s · 🃏 Karten

#### 🥤 Sport-Stacking Becher-Pyramide
**Ablauf**: 10 Becher zu 3-2-1 Pyramide aufbauen + wieder abbauen. Schnellste Zeit.
**Material**: 10 stapelbare Plastikbecher (Action), Stoppuhr/App-Timer
**Tags**: 🪑 Tisch · 🔇 leise · ⏱️ 10-30s · 🥤 Becher · 🛒 Action-Set

### Wurf/Ziel (5)

#### 🛟 Bierdeckel-Rettungsringe mit Münzen
**Ablauf**: Bierdeckel schwimmen als „Rettungsringe", Spieler wirft Münzen aus Distanz drauf. Treffer in 60s.
**Material**: Bierdeckel, Münzen, Wasserschale (oder Tisch), Wurflinie
**Tags**: 🪑 Tisch · 🔇 leise · ⏱️ 60s · 🛟 Bierdeckel · 🪙 Münzen
**Wolf-Spec offen**: genauer Ablauf bestätigen

#### 🥢 Stäbchen-Eimer
**Ablauf**: Mit Essstäbchen TT-Bälle aufnehmen und in Eimer befördern. Treffer in 60s. Kein Fingerwurf erlaubt.
**Material**: Essstäbchen, ~20 TT-Bälle, Eimer, Wurflinie
**Tags**: 🪑 Tisch · 🔇 leise · ⏱️ 60s · 🥢 Stäbchen · 🏓 TT-Ball · 🪣 Eimer

#### 🪢 Ringwurf auf Flaschenhals
**Ablauf**: Wurfringe auf Flaschenhals werfen, Treffer (Ring bleibt am Hals) in 60s.
**Material**: 1 Flasche (Glas/Holz), 8-10 Wurfringe (Action Holz-Ringwurf-Set), Wurflinie
**Tags**: 🪑 Tisch · 🔇 leise · ⏱️ 60s · 🪢 Wurfringe · 🛒 Action-Set

#### 🧷 Wäscheklammer in Glas
**Ablauf**: Spieler steht über Glas, hält Klammer auf Brust-Höhe (Hand am Kinn), lässt fallen. Treffer in 60s.
**Material**: 20+ Wäscheklammern, hohes Glas/Vase, evtl. Stuhl für Höhe
**Tags**: 🚶 Steh · 🔇 leise · ⏱️ 60s · 🧷 Wäscheklammer

#### 🎯 Gummi-Pyramide
**Ablauf**: Pappbecher-Pyramide steht, mit Haushaltsgummis abschießen. Anzahl umgefallener Becher in 60s. Bei alle weg: schnellste Zeit gewinnt.
**Material**: ~10-15 Pappbecher (Pyramide jedem Team neu aufgebaut), Haushaltsgummis, Wurflinie
**Tags**: 🪑 Tisch · 🔇 leise · ⏱️ 60s · 🥤 Pappbecher · 🎯 Gummis

### Hand-Geschick (1)

#### 🏓 TT-Ball-Sammeln (Hase)
**Ablauf**: Start mit TT-Ball in Hand. Sequenz: Ball hoch → 1 Spielstein aufnehmen → Ball fangen → Ball hoch → 2. Stein aufnehmen → … Steine bleiben in Hand. Beste Serie in 60s.
**Material**: 1 TT-Ball, ~10 Spielsteine pro Team
**Tags**: 🪑 Tisch · 🔇 leise · ⏱️ 60s · 🏓 TT-Ball

---

## Setting-Verteilung V1

| Tag | Anzahl | Spiele |
|---|---|---|
| 🪑 Tisch | 9 | Wattebausch, M&M, Münzturm, Karten-Haus, Sport-Stacking, Bierdeckel, Stäbchen-Eimer, Ringwurf, Gummi-Pyramide, TT-Ball |
| 🚶 Steh | 2 | Luftballon-Pusten, Wäscheklammer |
| 🧱 Wand | 0 | — |
| 🌍 Boden | 0 | — |

Alle 12 sind Café-tauglich, alles mit Alltags-Material oder günstigen Action-Sets.

---

## Backlog für V2 (bewusst aus V1 raus)

Diese 8 Spiele kommen rein wenn Material gekauft / Spec-Klärung erfolgt:

| Spiel | Grund für V1-Exklusion |
|---|---|
| 🧲 Magnete an Wand | Braucht magnetische Wand/Tafel (Sonder-Location) |
| 🎯 Magnet-Dart | Action-Set, mehr Material |
| 🏀 Fingerflick-Basketball | Action-Set (Mini-Korb) |
| 🏗️ Turmbau (Fuchs) | 40+ Bausteine pro Team zu transportieren |
| 🎈🍴 Luftballon-Gabel-Parkour | Braucht Steh-Bereich + Hindernisse |
| 🎈🏀 Ballon-Basketball auf Nadeln | Ungewöhnliches Material (Nadel-Korb) |
| 🚗🎯 Boccia mit Spielzeugautos | Braucht Bodenfläche + 9 Autos |
| 🎣 Faden-Flasche | Wolf-Spec noch unklar |

---

## Builder-Integration

### Im normalen QQ-Builder (pro Quiz)
1. **Toggle „CozyGames aktivieren"** im Setup-Bereich (neben `finalWagerEnabled`)
2. Bei ✅: Häkchen-Liste „Welche CozyGames heute aktiv" (Material-basiert)
3. Max 8 Spiele für das Rad (System verhindert mehr Häkchen)
4. **Material-Tag-Filter-Chips** oberhalb der Liste (Multi-Select): „heute hab ich Stäbchen + Becher dabei" → Liste filtert auf passende Spiele
5. **Zufällige-8-Button** als Lazy-Shortcut

### Builder-Polish (später, V2+)
- ⭐ **Pin/Favoriten** pro Spiel — sticky-Häkchen für „Standard-Set"
- 📐 **Location-Filter** (Tisch / Steh / Wand / Boden)
- 🔊 **Lärm-Filter** (leise / mittel)

---

## CozyGames-Editor (neuer Tab)

### Route
**`/cozygames`** im Menu (analog zu `/fragen`, `/katalog`)

### Editor-Felder pro Spiel
- 🎴 **Emoji** (Picker oder Freitext)
- 📝 **Name** (kurz, 1-3 Worte)
- 📖 **Ablauf-Beschreibung** (Markdown, 2-4 Zeilen)
- 🏷️ **Material-Tags** (Multi-Select-Chip-Picker aus globalem Tag-Pool)
- 📐 **Setting** (Tisch / Steh / Wand / Boden) — Single-Select
- 🔊 **Lärm-Level** (leise / mittel / laut) — Single-Select
- ⏱️ **Wertungs-Typ** (Anzahl-in-60s / Zeit-bis-Erfolg / Distanz / Höhe) — Single-Select
- 📐 **Wertungs-Notiz** (optional Freitext für Edge-Cases)

### CRUD-Operations
- Liste aller Spiele mit Quick-Filter
- „Neues Spiel"-Button → Editor öffnet leer
- Edit pro Spiel → Editor mit existierenden Werten
- Delete mit Confirm-Modal
- Duplicate für „ähnliches Spiel" (spart Tipparbeit)

---

## Implementation-Plan

### Backend
- [ ] Neue MongoDB-Collection `cozygames` mit Schema (id, emoji, name, ablauf, materialTags[], setting, noiseLevel, scoringType, scoringNote)
- [ ] Seed-Funktion für 12 V1-Spiele bei erstem Backend-Start (analog zu Default-Drafts)
- [ ] CRUD-API: `GET/POST/PUT/DELETE /api/cozygames`
- [ ] Neuer QQ-Phase-Type: `COZY_GAME` mit Sub-States `WHEEL_SPIN` → `WHEEL_RESULT` → `GAME_ACTIVE` → `WINNER_SELECT`
- [ ] Mod-Aktion `cozyGameSelectWinner(roomCode, teamIds[])` — Mod wählt 1 oder mehrere Sieger
- [ ] Action-Pipeline: nach Winner-Select normale `pendingAction` setzen (FREE / PLACE_1 / etc.), läuft durch bestehende Place-Mechanik

### Shared Types
- [ ] `CozyGame` Type in `shared/cozyGameTypes.ts` (neu)
- [ ] `QQDraft` bekommt `cozyGamesEnabled: boolean` + `cozyGamesPool: string[]` (Spiel-IDs)
- [ ] `QQState` bekommt `cozyGame?: { activeGameId, phase, winnerTeamIds[] }`

### Frontend — `/cozygames`-Editor
- [ ] Neue Page `frontend/src/pages/CozyGamesEditorPage.tsx`
- [ ] Routes-Eintrag in App.tsx + Menu-Link in MenuPage
- [ ] Form-Komponenten: TagPicker (Multi-Select-Chips), EmojiPicker, Setting-Radio, NoiseLevel-Radio, ScoringType-Radio

### Frontend — Builder-Integration
- [ ] CozyGames-Toggle im `QQBuilderPage.tsx` Setup-Bereich
- [ ] Häkchen-Liste mit Material-Tag-Filter-Chips
- [ ] Random-8-Button

### Frontend — Beamer (Glücksrad + GameActive)
- [ ] Neue Komponente `CozyGameWheelView.tsx` (SVG-Rad, adaptive Slices, Spin-Animation)
- [ ] Neue Komponente `CozyGameActiveView.tsx` (Spiel-Karte mit Ablauf-Text + Material-Liste, 60s-Timer)
- [ ] Sound-Slots `cozyGameWheelTick` + `cozyGameWheelStop` in `sounds.ts`
- [ ] CozyWolf-Reaction-Layer (gespannt während Spin, jubel beim Stopp)

### Frontend — Moderator
- [ ] Mod-UI für `COZY_GAME`-Phase: Spin-Auslösen, nach Stopp Winner-Auswahl-Buttons (1 pro Team)
- [ ] Mehrfach-Auswahl für Tie-Fall („mehrere Sieger" → mehrere Aktionen)

### Backlog (Editor-Polish)
- [ ] Pin/Favoriten
- [ ] Location/Lärm-Filter
- [ ] Duplicate-Spiel-Button

---

## Offene Entscheidungen

1. **Wiederhol-Logik im Rad** (Shrink vs Re-Roll) — Default-Vorschlag: Shrink
2. **Bierdeckel-Rettungsringe-Ablauf** — Wolf bestätigen ob meine Interpretation passt
3. **Faden-Flasche-Ablauf** — Wolf-Spec ausstehend (in V2-Backlog)
4. **Material-Tag-Pool** — globale Tag-Liste vs free-text? Vorschlag: vordefinierter Pool + „Custom Tag"-Eingabe für Spezialfälle

---

🦖 Konzept-V1 freigegeben. Implementation startet, sobald Mini-Game-Konzept aus dem Brainstorm raus ist (Wolf entscheidet wann).
