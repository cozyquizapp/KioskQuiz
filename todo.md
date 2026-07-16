# CozyQuiz — TODO (Single Source of Truth)

> **Regel (gegen Stale-Listen):** Diese Datei listet **nur genuin offene** Punkte.
> Erledigt → im **selben Commit hier löschen** (die Git-History ist der Beleg, dass
> es das Todo mal gab). `SESSION_LOG.md` ist reines **Verlaufsprotokoll**, KEIN
> Tracker. README/ROADMAP nur grobe Blöcke, keine Einzel-Todos.
>
> **Reconciliation 2026-06-22** (gegen Code + Git verifiziert): Der Großteil der
> alten „Offen"-Liste war längst erledigt — entfernt. Verifiziert **erledigt** u.a.:
> Summary-Link-Stale-Bug (`/summary/by-id/:gameId` live), Impressum/Datenschutz,
> `hallo@cozywolf.de`-Konstante, Schätzchen-Range-Treffer (`schaetzchenRangeAbs` +
> Range-Winner in `evalSchaetzchen`), Autoplay decodeFinalStep-Shared, L1–L11.

---

## 🔴 AKTUELLER LIVETEST-BATCH (Wolf 2026-07-16) — ZUERST

> Wolf-Livetest CozyArena. Reihenfolge: 🟢 klein → 🟠 mittel → 🔴 Redesign.
> **Bereits gefixt (gepusht) diese Session:** Rules-Wolf (echter CozyWolf) + Bildband-
> Übergang stärker + Stepper-Schiene unter die Pillen · Teams-Reveal graues Wappen raus +
> Größe höhen-gedeckelt · Arena-Runden-Farbe **Gold→Magenta konstant alle Runden** (Titel+
> Tree+Umrahmung) · MUCHO-Balken niedriger · Schätzchen-Entzerrung enger · Placement-Tabelle
> ins Rahmen-Band gehoben · CozyGuessr-Panel halbtransparent.

**Locked Entscheidungen (Wolf):**
- **Schätzchen-Reveal:** Strahl OBEN (nur farbige Ticks + Wahrheit, KEINE Werte am Strahl) +
  Rangliste DARUNTER **2-spaltig (4×2 bei 8 Teams)**, design-optimiert. Zielscheibe verworfen
  (Werte sind 1D). Sieger-Krönung in Arena RAUS.
- **10v10:** Wappen der Höchst-Bieter **unter die 1/2/3-Felder** (nicht drüber/transparent).
- **MUCHO:** Frage-aktiv **2×2-Raster** → beim Reveal auf **4 Reihen + Frage kleiner**, smooth transition.
- **Kuchendiagramm:** möglich bei **MUCHO** (A/B/C/D-Split) oder **10v10** (3 Optionen). Noch nicht
  entschieden ob bauen. War nie fest einer Kategorie zugeordnet (todo Reveal-Rethink).

**✅ Erledigt (gepusht 2026-07-16):**
- 🟢 CozyGuessr rechts: rotes Bunte-Tüte-Gradient hinterm halbtransparenten Panel (`6d61fc8d`+`CozyGuessr`).
- 🟢 Kronen raus aus Arena-Reveals (StandingsRow/Endstand/Winner-Chip/Führung-Callout 👑→📈); Champion bleibt via Krönungs-Beat+Hero.
- 🟢 10v10: Wappen komplett unter die Felder + opaker (Arena).
- 🟢 Finale ×2/×3: Mid-Reveal-Banner raus → Ansage im Runden-Intro (adaptiv ×2/×3), `arenaFinaleMult` in PhaseIntroView.
- 🟠 Cheese-Reveal (Arena): Anzahl-richtig pro Fraktion + Rang nach Anzahl (Speed = Tiebreak).
- 🟠 Scoring-Tabelle: beide PLACEMENT-Beats nutzen jetzt Standings-Board-BG (`standing`); scoring.webp ungenutzt.
- 🔴 Schätzchen-Reveal Redesign: Strahl oben (nur Ticks + Wahrheit) + 2-spaltige Rangliste (4×2), Chip-Lanes/Connectors/Krone raus.
- 🔴 MUCHO Arena: 2×2 aktiv → 4 Reihen beim Reveal (flex-wrap 50%→100%, animiert) + Frage kleiner, Höhen-Caps gegen Overflow.
- 🔴 Top5 Arena: kein „Rundensieger"-Krönung mehr → neutrales „Meiste Treffer" (Akzent statt Gold), konsistent mit Kronen-raus.
- 🔴 Team-Vorstellung: TEAMS_REVEAL-BG → arena-main, Content in Sky (Titel oben) / Boden (Aufstellung unten), klar von gemalten Bannern getrennt.

**Nachgezogen (Wolf-Feedback 2026-07-16, gepusht):**
- **Schätzchen-Reveal → v4 „NUR STRAHL"** (`88d68cde`..`41cb8f78`): 2-spalt. Liste war verwirrend → Wolf-Wahl „nur Strahl, keine Liste". Wappen an ihrer Tipp-Position in ZWEI Lanes (oben/unten am Strahl, `spread` MIN=12%), kurzer Stiel zur Schiene, Wert+Delta(+Punkte Arena) am Wappen. Alles GOLD/GELB (kein Pink). ⚠️ **Beamer-Check: überlappungsfrei bei 8 Fraktionen mit engen Tipps?** (sonst MIN/Wappen-Größe nachdrehen).
- **Kategorie-Intro-Farben gefixt** (`88d68cde`): catColor war in Arena auf Pink geforced → alle Kategorie-Intro-Texte pink. Jetzt: Kategorie-Intros in EIGENER Farbe (Schätzchen gold, MUCHO blau…), NUR Progress-Tree-Pages bleiben pink (`color`/`displayColor`).
- **🏆 ARENA-SIEGEREHRUNG umgebaut** (Wolf-Feedback Bild 8, Konzept via Mockup abgestimmt): ganze Finalsequenz neu.
  - **Krönung = „Banner-Entzündung"** (neuer `MegaCrownCeremony`, Roulette-Timing): Arena dunkelt → Erleuchtung springt **zufällig** über die 8 Wandbanner (schnell→auslaufend, Deceleration) → **Blink** auf dem Sieger → **Weiß-Flash + Schockwelle + Lock** → Halt → **Treppchen (Top 3)** steigt auf, „Champions der Arena" gold-Slam, Konfetti. Banner in STABILER Fraktions-Reihenfolge (Position verrät Sieger nicht). Sound (Fanfare+Wolf-Howl) erst beim Einrasten. reduced-motion: direkt Lock+Podium.
  - **Award-Beats:** „Stat zuerst, dann Enthüllung" — Icon → Titel+Leistung → Pause → **Banner der Gewinnerfraktion entrollt** sich (gleiche Banner-Geste wie Krönung). Label **Silber** (Gold exklusiv Champion).
  - **Endstand aufgeräumt:** Mini-`MegaAwardsStrip` raus (Awards schon in Beats zelebriert; Strip bleibt für Summary/Recap).
  - Skills angewandt: `animate` (Easing-Tokens, Exits<Enters, reduced-motion), `ui-ux-pro-max` (ein Hero-Moment/Step), `color-contrast`. Mockup: claude.ai Artifact (Roulette→Treppchen).
  - ⚠️ **Beamer-Verify:** Roulette-Timing/Blink-Tempo, Treppchen-Sitz (kein Scrollbar), 8-Banner-Zeile passt, Award-Banner-Entrollung überlappt Stat nicht.
- **Bild 2 — Round-Intro-Pille** (PhaseIntroView): „Runde X von Y" ging auf dem Vortex-BG unter → kräftigerer Verlauf-BG + stärkere Border + **weißer Text** mit Dark-Halo + Farb-Glow. (BG-Zentrierung ist asset-abhängig, nicht angefasst.)
- **Bild 6 — Farb-Balken pro Option** (QQBeamerPage `MegaOptionBar`): MUCHO-Arena statt Wappen+×N-Reihe jetzt liegender, gestapelter Farbbalken je Option (Fraktions-Segmente, skaliert auf stimmenstärkste Option wie Standings) + grosse Gesamtzahl + Mini-Wappen in breiten Segmenten. Alte `MegaMuchoVoterPills` bleibt ungenutzt im Code (Reuse). ⚠️ Beamer-Verify: Segment-Lesbarkeit/Balken-Breite bei 8 Fraktionen.
- **Gold in Krönung: bewusst OK** (Wolf 2026-07-16) — Zeremonie-Ausnahme bestätigt, Gold-Grundsatzfrage für Krönung erledigt.
- **Gruppe-B-Icons:** ✅ `fx-book` + `fx-shield-faction` da. **Fehlen noch: `fx-clapperboard` (🎬), `fx-swords` (⚔️), `fx-lightning` (⚡ fix)** — Wolf malt, dann wire ich.

**Offen (braucht Wolf / Beamer):**
- ✅ **Bild 1 — Wappen fliegen an die Stände** (Wolf: arena-main.webp, „deckungsgleich einrasten"): ArenaEntranceView
      umgebaut — nach jeder Vorstellung fliegt das Wappen hoch an sein gemaltes Banner (`BANNER_ANCHORS` per avatarId,
      fox→cat = Banner-Reihe) und rastet deckungsgleich ein (`qqBannerLand` + `qqBannerGlow` + Nameplate). Boden-Lineup
      raus, Wand = Startaufstellung, Center-Finale = „Los geht's!". ⚠️ **Beamer-Nudge:** `BANNER_ANCHORS` x/y feinjustieren
      falls Wappen leicht neben dem gemalten Banner sitzt.
- [ ] **Beamer-Verify** der visuellen Tunings dieses Batches (Wolf am Beamer): **Schätzchen v4** (Zwei-Lane
      überlappungsfrei bei 8 Fraktionen?) · **Kategorie-Intros** (jede Kategorie in ihrer Farbe, Tree pink?) ·
      MUCHO 2×2→4-Reihen-Morph + Frage-Shrink (Overflow? smooth?) · Team-Vorstellung arena-main (Titel/Einzug/
      Aufstellung überschneiden Banner nicht mehr?) · Scoring nutzt Standings-BG (sitzt im Board?) · Cheese
      Anzahl-richtig-Layout · 10v10 Wappen unter Feldern · CozyGuessr rotes BG · Finale-Ansage im Intro (×2/×3) ·
      **Design-Audit-Fixes** (Kontrast/Touch-44px/reduced-motion — auch im KLASSISCHEN CozyQuiz, nicht nur Arena).

> **Verworfen:** 🎂 Kuchendiagramm für MUCHO (Vorschau gezeigt 2026-07-16 → Wolf „passt nicht so gut");
> aktueller MUCHO-Balken-Reveal (2×2→4 Reihen) bleibt.

### 🔍 DESIGN-AUDIT 2026-07-16 (4 Skill-Auditoren: color-contrast · ui-ux-pro-max · animate)
**✅ ROT gefixt (5 Pakete, gepusht):** A Kontrast-Pass (slate600/500→400/300, Alpha-Text raus, dim-Token)
· B Touch-Targets 44px (Team-Buttons) · C reduced-motion für JS/RAF (Count-ups + Leaflet-flyTo; CSS ist
global gegatet) · D Beamer-Standings responsive (Beat A dense) + dunkle Row-BGs überm Foto · E FinalReveal
reduced-motion-Guard.
**✅ GELB gefixt (sicher):** Distanz-Fonts (CozyGuessr km-Labels, Score-Unterzeile) · Mystery-Dots-Kontrast.
**✅ Nachgezogen 2026-07-16:**
- **FinalReveal `left`→`transform`** — 9s-Drift jetzt GPU-composited (Container-Breite per ResizeObserver → `translate(calc(px−50%))`, kein cqw-Leak, pixel-identisch). Reflow weg.

**❌ VERWORFEN (Wolf-Entscheid 2026-07-16 „Lassen"):**
- **Token-Massen-Refactor** — Prüfung ergab: (1) `qqDesignTokens` dokumentiert selbst „kein Mass-Replace auf einen Schwung", (2) `#f472a0` (Skin-Akzent m. eigenem rgb/soft/gradient) + avatarSets-Tints sind ABSICHT, keine Bugs, (3) die meisten rohen Pinks liegen in EINGEFRORENEN Sweep-Stationen → aufmachen wäre Freeze-Verstoß bei 0 sichtbarem Effekt. Gradual-Policy des Codes bleibt.

**🟡 Offene Judgment-Calls (Wolf am Beamer):** Schätzchen-Antwort in Gold (wirkt bewusst?) · CHEESE-Kategorie-Titel violett (= Kategorie-Eigenfarbe) · Fraktionsnamen-Ellipsis→Wrap (Risiko fürs arena-main-Layout).

---

## 🎨 DESIGN-SWEEP (Anti-ADHS-Schlussstrich)

**→ [`DESIGN_SWEEP.md`](DESIGN_SWEEP.md)** = der einmalige Design-Durchlauf (Beamer+Team,
21 Stationen, vorne→hinten, dann Design eingefroren → nur noch Funktionalität).
Arbeitszeit-Kontext: ~895/1000 h über alle 3 Repos (kioskquiz ~760 · wonky ~108 · landing ~27),
noch ~105 h bis zum selbstgesetzten Ende. Sweep-Fortschritt steht in der Datei.

---

## 🔜 HIER STARTEN (Handoff 2026-07-15)

**🎁 WOLF-ASSET-LIEFERUNG integriert (2026-07-15, `c9724547`+`+Wappen-Header`):** aus `Desktop/für claude`.
- ✅ **3D-Buch** `fx-book` — 📖 global auto-3D (QQIcon-Map), LIVE im Regel-Intro.
- ✅ **Neutrales Wappen** `fx-shield-faction` — als Fraktionen-Header in der Team-Vorstellung (Titel-Marker). LIVE.
- ✅ Assets abgelegt: `avatars/cozywolf/cozywolf-arena-{hi,cheer,calm,master}.png` (Magier-Posen, freigestellt), `arena-bg/arena-master.webp` (16:9-Szene).
- ✅ **Asset-Verdrahtung GEBAUT (2026-07-15, FE+BE tsc-gruen):**
  1. **Begruessungs-Wolf (`ArenaMageWolf`)** — 3 Magier-Posen (calm/hi/cheer, webp), in Lobby-Greeter + Welcome-Overlay + Pre-Game. **Gated auf isMega && Kolosseum-Toggle** (Wolf: „gehoert zur Kolosseum-Auswahl, nicht Standard"). **Body-Wackeln GELOEST (Wolf-Idee):** calm = statische Basis, nur die maskierte Gesichtsregion (Augen+Mund) der offenen Pose wird per weicher CSS-Maske (`FACE_MASK`) darueber geblendet → Body/Staff bewegen sich nie, nur das Gesicht flappt. → **Wolf-Beamer-Check:** sitzt die `FACE_MASK`-Ellipse genau (ggf. Konstante justieren)?
  2. **Arena-Meister-Splash** (`ArenaMasterSplash`, `arena-master.webp` = fertige 16:9-Szene) — zwischen Willkommen und Regeln (Wolf-Wahl „direkt vor den Regeln"). RULES-Flow: Arena+Kolosseum startet bei -3 (Willkommen), -2 = Meister-Splash, -1 = Regel-Intro (`qqRulesMinIndex`). → **Wolf-Beamer-Check** (Titel/Pacing).
- ✅ **Award-Zeremonie GEBAUT** (Step-State + Socket + Mod-Buttons + Frontend-Zeremonie + Kolosseum-Kroenung) — s.u. „SIEGEREHRUNG". → **Wolf-Beamer-Check.**
- (Joker fuer Arena: von Wolf verworfen, Arena hat keine Joker.)


**Neu gebaut+gepusht (2026-07-15, FE typecheck-gruen):**
- **PLACEMENT-BGs gesplittet** (`b5678fe8`) — Wolf-Assets scoring.webp/standing.webp (lila Kolosseum m. Board) in `public/arena-bg/`. Beat A „Wertung" → `scoring`, Beat B „Gesamtstand" → `standing` (via `megaStandingsRevealed` in `ArenaBeamerBg`). Alte `standings.webp` verwaist (liegt noch da). → Beamer-Check: sitzt Content im Board-Rahmen?
- **Schätzchen-Distanzstrahl auf die Schale gezogen** (`2e1e3d30`) — in der Arena Bühne in zentrales Band (11% Rand/Seite), damit Wappen/Strahl nicht in den dunklen Bildrand laufen/abgeschnitten werden. → Beamer-Check: 11% ok bei 8 Fraktionen? (ggf. `CONTENT_INSET` nachdrehen). Evtl. gleiche Logik für CrowdEstimate/CrowdTop prüfen.
- **Team-Vorstellung: Wappen verteilt** (`093abaa9`) — Finale-Aufstellung breit ueber die Arena-Flaeche (space-evenly + Zickzack) statt zentral geclustert. → Beamer-Check.
- **Order-Reveal → Top5-v2** (`093abaa9`) — Mystery-Tafel-Look (`· · ·`-Rows, Sieger-Banner poppt am Ende, n×-Zaehler), Wert-Pille + Kriterium erhalten. → Beamer-Check.
- **„Fuehrung!"-Callout ⚔️→👑** (`849548ee`, fx-crown 3D). ⚠️ Anfuehrer traegt am Rang schon 👑 → evtl. Doppel-Krone bei Fuehrungswechsel; falls stoerend → `fx-chart`. Beamer-Check.

**✅ RULES-REDESIGN gebaut+gepusht (`8bf9dcd7`, typecheck-gruen):** gerichteter Tiefen-Uebergang · Signatur-Hero-Motion pro Regel (Buch/Pokal/Map/Ziel/Haende) · Stepper-Schiene + Wolf laeuft mit · Divider-Draw · Arena-Glut (Mega) · ⚡→🎯. → **Wolf-Beamer-Check.**
  - Deferred (optional, wenn gewuenscht): Bonus-Chips (5·4·3·2·1) + Count-up „4·5" auf How-to-score/Journey · lastSlideHint „🎬 Los geht's" → fx-arena (braucht Icon-statt-Text-Render) · Stepper-Wolf ist OS-🐺 (koennte echte cozywolf-Pose werden).

**➡️ IN ARBEIT: CozyArena-SIEGEREHRUNG neu (Wolf 2026-07-15, Konzept steht, Vorschau abgenommen bis auf Pacing):**
- **Reihenfolge:** erst **Special Awards** (Spotlight-Beat je Award), DANN **Champion-Kroenung** als Hoehepunkt, dann Endstand. (Wolf: „Awards VOR der Siegerehrung".)
- **Award-Zeremonie:** je Award ein Beat — Icon-Pop + Shine, Titel, Sieger-Fraktion faehrt ein, Funken, Stat-Zeile. Vorschau-Artifact gebaut+abgenommen.
- **5 Awards** = 3 bestehende (⚡ Speedy, 🎯 Scharfschuetze, 📈 Aufholjagd) + **2 neue (Wolf-Wahl): 🙌 Vollzaehlig** (hoechste Beteiligungsquote = answered/verbundene Handys) + **⚖️ Bestaendig** (geringste Streuung der Per-Frage-Scores). Backend: `megaColorStats` erweitern (possible-Nenner + scores[]), `qqComputeMegaAwards` + `QQMegaAwards`-Type + `MegaAwardsStrip`.
- **Kroenung = „A · Kolosseum-Kroenung"**: Sieger-Wappen steigt zentral, Riesen-Banner entrollt sich (Fraktionsfarbe), Lorbeer senkt sich, Fackeln, Crowd-Roar, Konfetti. In `LargeGroupGameOverView` (crown-Phase ausbauen).
- **Stats in den Beats:** JA (real, Backend rechnet sie mit).
- **Pacing: MODERATOR-GESTEUERT** (Wolf klickt je Beat weiter, Streamdeck) — braucht Backend-Step-State + Socket + Mod-Buttons.
- ✅ **Backend-Fundament gebaut+gepusht (`e9c11c4a`):** Vollzaehlig + Bestaendig + Stat-Werte in `qqComputeMegaAwards`, `megaColorStats` erweitert, `QQMegaAwards`-Type, `MegaAwardsStrip` (Summary/Recap). typecheck+Scoring-Gate ok.
- ✅ **GEBAUT (2026-07-15, FE+BE tsc-gruen, Scoring-Gate ok):** kompletter Zeremonie-Chunk.
  1. **Step-State**: Room-Feld `awardCeremonyStep` (0..n-1 Awards → n Kroenung → n+1 Endstand), Reset+Init bei GAME_OVER, Socket `qq:awardStep` (vor/zurueck, geklemmt), Broadcast. Shared-SSOT `qqMegaAwardKeys` + `QQ_MEGA_AWARD_ORDER` (Backend-Clamp + FE-Render einig).
  2. **Moderator** (QQModeratorPage GAME_OVER): Zeremonie-Status + „◀ Zurueck" + Primary „Naechster Award / Kroenung / Endstand / Danke-Folie". Space + Autoplay laufen die Beats durch (7s/Beat), dann Thanks. Nur wenn kein offenes Stechen.
  3. **Frontend** `LargeGroupGameOverView`: Award-Beats (Icon-Pop+Shine, Fortschritts-Dots, Titel, Sieger-Fraktion faehrt ein, Funken, Stat) → **Kolosseum-Kroenung** (Banner entrollt, Lorbeer senkt sich, Fackeln, Trophy, Konfetti, Motto) → Endstand. Sounds: `playSpecialAwardReveal` je Award, `playRaceWinner`+`playWolfHowl` bei Kroenung. reduced-motion-safe.
- ⏳ **Wolf-Beamer-Check:** Beat-Pacing, Banner-/Lorbeer-/Fackel-Optik bei 8 Fraktionen, Krone-Layout, Award-Stat-Texte (DE/EN) ok? Streamdeck-Weiter/Zurueck.

**🎨 ICON-ENTSCHEIDUNGEN (2026-07-15, final) — Wolf malt nur noch 2 PNGs + 1 CozyGame:**
- Wolf zeichnet: **`fx-book`** (📖 Regel-Intro) · **neutrales Wappen** (Fraktionen-Header). (`cg-marshmallow-fang` 2026-07-15 bewusst ausgelassen → 🍡-Fallback bleibt.)
- Wiederverwendet (schon da, via QQEmojiIcon-Auto-Map Emoji→3D): **Los geht's = `fx-arena`** (🏟️) · **Fuehrung = `fx-crown`** (👑, wired) · **How to score = `fx-target`** (🎯).
- Noch zu verdrahten beim Rules-Umbau: „So gibt es Punkte"-Slide-Icon ⚡→🎯 (fx-target) · lastSlideHint „🎬 Los geht's" → fx-arena. `fx-swords`/`fx-clapperboard`/`fx-lightning` werden NICHT mehr gebraucht.

**Aeltere neu-Punkte (`ff0e87bb`, FE+BE typecheck-gruen, Scoring-Gate ok):**
- **Moderator-Toggle „Arena-Backgrounds an/aus"** (`4ec204cc`) — Wizard-Schritt „Design", nur Arena: „Mit Kolosseum" (Default) vs „Schlicht" (ruhiger dunkler BG). Flow: `shared arenaBackgrounds?` → Room-Default true → State-Builder → `setQuizOptions` → zentraler Gate `qqArenaBgEnabled(s)`. Greift auf Beamer-BG, Lobby-Video, Welcome-Overlay-BG (Wortmarke „COZYARENA" bleibt).
- **MUCHO Arena Layout 1** (`ff0e87bb`) — 2x2 → EINE Spalte mit vollbreiten Antwort-Balken, Fraktions-Wappen gross inline rechts (`MegaMuchoVoterPills big`), Balken-Mindesthoehe gegen Clipping. Nicht-Arena bleibt 2x2.

**⏳ Wolf-Check offen:** Toggle „Schlicht" wirklich ueberall sauber (Beamer/Lobby/Welcome)? · MUCHO-Layout-1 Wappen-Groesse ok, brauchen sie Fraktions-NAMEN drunter (Preview hatte Namen; gebaut ist Wappen+×Anzahl)?
**⏳ MUCHO-Delight-Hebel offen** (Wolf muss Preview anschauen, dann waehlen): A Vote-Tally · B Light-Sweep · C Pre-Lock-Drumroll · D Doppelblink→Settle. Interaktive Vorschau als Artifact gebaut (Layout+Hebel).

**Zustand vorher:** working tree sauber, alles gepusht (HEAD `d3fa55af`). Session-Historie gebaut+gepusht (viel):
- **Arena-Background-Set komplett ausgerollt** + **arena-main als Ambient-Loop-Video** in der Lobby (ffmpeg via winget installiert; mp4 2,7MB/webm 1,9MB). rundenintro-BG in Journey-Schritt 1+2. Details [[project-arena-background-set]].
- **Format-Wechsel CozyQuiz/CozyArena sauber** (`71749ada`) + **A11y-Batch 2** (`ab0c048e`, Skill-Review-Boden fertig).
- **Wolfs Reveal-Redesign v2 integriert** (ZIP „Ansicht optimieren fuer cozyarena"): Schaetzchen/Top5/CrowdEstimate/CrowdTop. **Distanz-Reveals exakt auf Backend-Wertung** (neue `shared/qqDistanceScore.ts`, per-Handy, gated isMega). Details [[project-cozyarena-showdown-concept]] „Batch 1/2".
- **2 Screenshot-Feedback-Runden**: Sieger-Banner nur Wappen, „All In" ohne untere Breakdown, Abgabe-Wappen groesser, Lobby-Transparenzen, Welcome-Overlay-Umbau (Wolf ueberlappt Card unten-links), **Distanz-Strahl 2-Lanes** (ueber/unter, minimal-verschoben zentriert = Wappen am Tick), Cheese-Blur-BG in Arena weg.

**⏳ ZUERST: Wolf-Beamer-Check** aller obigen Fixes (hart neuladen). Besonders: Distanz-Strahl-Lanes bei 8 Fraktionen (Kollision mit Antwort-Tafel?), Welcome-Overlay-Wolf-Position, Cheese-Arena-BG.

**➡️ OFFENE ENTSCHEIDUNGEN (Wolf):**
- MUCHO: Layout 1 gebaut; **Delight-Hebel** (A Tally/B Sweep/C Drumroll/D Settle) — Wolf muss Preview anschauen + waehlen. Fraktions-Namen unter Layout-1-Wappen ja/nein?
- ~~Order/Bluff Reveals~~ ERLEDIGT/geklaert: **Order** ist aktiv + hat Reveal (nicht offen). **Bluff bleibt raus** (Wolf 2026-07-14 „nur neugierig", Mechanik-Grund 1-Phone/Team gilt weiter).
- **Backend-Refactor** `qqMegaEventScore`-Distanzzweige auf shared `qqDistanceScore` (beseitigt Drift-Risiko, braucht Redeploy) — angeboten, wartet auf OK.
- arena-main-Video auch aufs Welcome-Overlay/andere Stellen? (nur wenn Lobby-Video gefaellt)

**DANACH = UX-Delight- & Motion-Elevation-Pass.** Wolf-Wunsch: „Design, Effekte, Motions richtig nice". Kreativ, Screen fuer Screen, Wolf im Loop, Delight-Brille via `animate`+`ui-ux-pro-max`+`web-design-guidelines`. Reihenfolge: „Boden fertig, dann Delight-Pass".

---

## 🔜 (aelterer Handoff 2026-07-12 frueh, Endphase)

**Zustand:** Alle Commits gepusht, working tree sauber, Backend auto-redeployt (Coolify). Voller Batch-Detail in Memory [[project-cozyarena-live-event-2026-08]] (Abschnitt „Screenshot-Review-Batch Runde 2").

**⚠️ ZUERST — TEST-GATE (sonst wirken neue Fixes „kaputt"):**
1. Beamer **UND** Moderator **hart neuladen** (Strg+Shift+R). Wolfs letzte Screenshots liefen auf ALTEM Frontend (Beweis: „Vollbild" statt „Fullscreen").
2. **Autoplay AUS** — sonst drückt Autoplay den Mod-Pacing-Space selbst; der Halt (Wertung → Space → Standings → Space → Frage) zeigt sich nur manuell. Bots dürfen weiter antworten.

**Diese Session gebaut + gepusht (12 Commits, alle typecheck-grün):** Ø-Antwortzeit im Scoring · app-weiter Gedankenstrich-Sweep (~130) · Fairness-Nenner = aktive Handys · größere Abgabe-Wappen · CozyGuessr rang-basiert · preGame-Wolf verkleinert · CHEESE-Reflow-Fix · **Epic Standings** (verifiziert, `Desktop/standings-epic-neu.png`) · „Now the rules"-Karte · **Brand-Rename „CozyArena" ein Wort** (+ 4× „CozyQuiz"). Auch: „Let's go!"-Komposition (`Desktop/arena-letsgo-neu.png`), Vollbild→Fullscreen EN, Mod-Pacing 2-Beat.

**WARTET AUF WOLF:**
- [ ] **Gruppe-B-Icons designen** (kein 3D-Asset da → Wolf malt PNGs transparent, dann wire ich): `fx-book` (📖 Regel-Intro/how-it-works), `fx-shield-faction` (🛡️ Fraktionen-Header), `fx-clapperboard` (🎬 „Los geht's"), `fx-swords` (⚔️ „Führung!"-Callout). Plus **`fx-lightning.png` fixen** (⚡).
- [ ] **40-Bot-Gegencheck** aller Fixes am echten (neu geladenen) Beamer → Feedback fließt in nächste Runde.

**DEFERRED (bewusst, mit Grund — nicht vergessen aber nicht blind bauen):**
- Round-Intro-Balance → Journey-Zoom-Kamerasystem (Bug-Hotspot #2), hohes Risiko; „oben-lastig" evtl. nur Transition-Frame → erst am echten Lauf prüfen ob's stört.
- Icon-Fidelity 📖/📋 → deckt sich mit Gruppe B (Assets fehlen).

**OFFENE VISUELLE BESTÄTIGUNGEN (am echten Lauf/Beamer):** preGame-Wolf-Overlap weg? · CHEESE-Reflow weg? · Kontrast „Wing It"(Blau)/„Objection"(Pink) auf Distanz · Lobby bei 40 Handys kein Scroll.

**🧰 NEUE WERKZEUGE (seit 2026-07-12, global installiert):** Claude-Code-Skills verfügbar — **Remotion** (Reels/Trailer programmatisch), **Marketing** (copywriting/cro/seo für cozywolf.de + Akquise), **UI-UX-Pro-Max** (Beamer-Politur). Nutzung: `/skillname` oder in Sprache. Regel: Skills nie gegen gesperrte Marken-/Design-Entscheidungen. Passt zu Roadmap-Items Reel-Studio, Landing-Ausbau, Beamer-Motion. Details: Memory [[reference-installed-skills]].

---

## 🎯 CozyArena LIVE-EVENT — HÖCHSTE PRIO (Ziel ~Anfang Aug 2026)

**Kontext:** Erstes CozyArena-Event mit **echten Geräten**. Firma lädt ein, **50–100 Leute**
(theoret. bis 200), **Tech + UX-Designer** (kritisches Publikum!), **komplett Englisch**,
**kostenloses Testevent**, **Wolf moderiert solo**. 3–4 Leute pro Handy → ~25–40 Handys/Teams.
Zeitachse: 3–4 Wochen ab 2026-07-10.

**🔒 Gelockte Entscheidungen (2026-07-10):**
- **Fraktions-Verteilung = A + Variante 1:** Server balanciert per **Soft-Cap pro Fraktion**
  (`ceil(Teams/8)`), aber **freie Wahl bleibt** — leerste Fraktion vorgeschlagen, volle gesperrt.
  (Behält Identitäts-Moment, garantiert faires Rennen, null Einlass-Orga für Solo-Host.)
- **Team-Cap 25 → 40** (`QQ_MAX_TEAMS_LARGE`, 5×8). Notbremse, keiner wird abgewiesen.
- **3 vs 4 pro Handy = Vor-Ort-Ansage**, kein Code. Wir last-testen auf volle 40.
- **Progressives Fraktions-Öffnen:** v1 NICHT, beim Trockenlauf entscheiden (nur Optik bei wenig Andrang).
- **Sprache = gelöst im Code:** Raum auf EN → Handy+Beamer+Fraktionen komplett EN. Mod-Konsole
  bleibt DE (Wolf moderiert). **Einziger echter Rest = Content:** EN erscheint nur bei gefüllten
  `*En`-Feldern.

**Audit-Befund (2 Explore-Agents, 2026-07-10):** Layout skaliert (Arena bündelt auf 8 Fraktions-
Balken, alles `overflow:hidden`, Join-Cap greift, keine Crash-Pfade). Echte Risiken = (1) Fraktions-
Balance ungesteuert, (2) per-answer Full-State-Broadcast bei vielen Geräten ungetestet.

### Woche 1 — De-risk
- [x] ~~Cap 25 → 40~~ + Bot-Fill 24 → 40 + Mod-Stepper + hardcoded-Audit — **erledigt** `3b830e18`.
- [x] ~~Lobby „X/3"-Pille~~ → reine Count-Zahl + Dots flexWrap — **erledigt** `3b830e18`.
- [x] ~~Fraktions-Soft-Cap + Auto-Balance~~ — **erledigt** `bb11a88d`. Backend-Safety-Net (`qqRooms.ts`
      join: nur `count==min` waehlbar, sonst leerste zugewiesen, Name/Emoji/Farbe kohaerent) + Frontend
      (`takenAvatarIds`=ueber-Minimum-Fraktionen → Auto-Switch/Karussell greift). ⏳ Live-Validierung im 40-Geraete-Lasttest.
- [ ] **EN-Content-Verify:** Event-Draft Frage für Frage — jedes `textEn/answerEn/optionsEn/unitEn`
      gefüllt? Leere Felder fallen auf DE zurück. **Wolf macht den Event-Draft erst wenn die App steht** → dieser Punkt kommt später.

### Woche 2 — Last & Join
- [x] ~~40-Geräte-Lasttest (Server-Seite)~~ — **erledigt** (`backend/scripts/loadtest-arena.mjs`, 40 echte
      Socket-Verbindungen). Ergebnis: 40/40 Joins ok, Broadcast-Fan-out an alle 40 in **33 ms**, Payload
      15,3 KB @ 40 Teams, **Fraktions-Balance perfekt 5×8** (alle wollten dieselbe Fraktion). Server ist
      NICHT der Flaschenhals → **Broadcast-Throttle vorerst nicht nötig.**
- [ ] **Rest-Validierung Last** (nur am echten Gerät/WLAN möglich): Venue-WLAN-Latenz + in-Frage-Payload
      (Antworten-Array) beim Trockenlauf (Woche 4) gegenprüfen. Bei Lag dann Broadcast drosseln/Delta.
- [x] ~~Join-Onboarding bilingual~~ — **erledigt** `0827eb1e`: `/team` folgt Browser- dann Raumsprache
      (nicht mehr hart DE); Beamer-Lobby zeigt im Arena-Modus „Ein Handy pro Gruppe / One phone per group".
      `/team` nutzt Singleton-Raum `'default'` → QR ohne Raumcode ist korrekt. Gruppengröße (3–4) kommt in die
      **Event-Einladung** (Text DE+EN steht bereit), nicht rigide in die App.
- [ ] **Setup-Flow am echten Gerät gegenprüfen** (EN durchklicken: Fraktion wählen → beitreten), beim Trockenlauf.

### Arena-Verifikation (Review-Agent 2026-07-11) — erledigt
- [x] Voller Arena-Flow (Lobby→Frage→Reveal→Bar-Race→Finale→Thanks) auf DE/EN + Fraktions-
      Gruppierung bei 40 Teams geprüft. **Sauber** bis auf 1 Bug (gefixt): „Abgaben" statt
      „submitted" auf CHEESE/Foto-Fragen im Arena-EN (`CozyQuizQuestionView.tsx:1192`).
- **🧨 Schlafende Landminen (deaktivierte Features → kein Live-Risiko, NICHT jetzt fixen):**
  wenn Bluff/OnlyConnect je reaktiviert werden → `Bluff.tsx:511/640` + `OnlyConnectBeamerView.tsx:321`
  iterieren rohe `s.teams` (40 statt 8 Fraktionen → Overflow); ebenso Final-Wager/Comeback in Arena
  (`CozyQuizFinalBettingView`/`FinalRevealView`), aktuell backend-seitig in Arena aus. Vor Reaktivierung
  Fraktions-Bucketing (`isMega`/`qqFactionBuckets`) ergänzen.

### Visueller Dry-Run (40 Bots, Arena, EN) — Screenshots ausgewertet 2026-07-12
Gesamturteil: **stark, premium, designer-tauglich.** Volle Auswertung: [[project-cozyarena-live-event-2026-08]].
Offene Punkte (priorisiert):
- [x] 🔴 **Mod-Pacing Scoring→Standings** — GEBAUT+GEPUSHT 2026-07-12. Backend-Flag `megaStandingsRevealed`
      (Reset in `qqStartPlacement`, im State broadcastet); `qq:nextQuestion` fängt ersten Weiter im largeGroup-
      PLACEMENT ab (Flag=true statt Advance), zweiter schaltet zur Frage. Beamer nutzt Flag statt `setTimeout`.
      Mod: Flag im Autoplay-`fireKey`, Pacing 11s→2×6s, Label „→ Gesamtstand zeigen" vs „→ Nächste Frage".
      Streamdeck: gleiche Space-Taste, 1 Druck extra. Typechecks grün. ⚠️ Live-Trockentest steht aus.
- [x] 🔴 **CHEESE-Scoring: Ø-Speed statt Hero-Handy** — GEBAUT+GEPUSHT 2026-07-12. Wolf wählte „Ø-Speed der
      richtigen Handys" + „überall wo's passt". Speed-Tiebreak in `qqMegaEventScore` nutzt jetzt die DURCHSCHNITTS-
      Abgabezeit der richtigen Handys (`avgSpeed` via `speedSum`/`speedCount`) statt `bestSpeed` (single-fastest) —
      gilt für MUCHO/10v10/CHEESE/Top-5. Distanz-Kategorien (Schätzchen/Schwarm) unberührt. `bestSpeed` bleibt fürs
      „Schnellstes-Team"-Award. Backend-Typecheck grün. ⚠️ Live-Trockentest steht aus.
- [x] 🟠 **„Vollbild (F11)" bilingual** — EN-Beamer zeigt „Fullscreen (F11)". ERLEDIGT 2026-07-12.
- [x] 🟠 **Gedankenstriche** raus: Arena-Scoring-Footer + CozyGuessr-Subtitle (DE+EN). ERLEDIGT 2026-07-12.
- [x] 🟡 **„Let's go!"-Komposition** ausbalanciert — GEBAUT+GEPUSHT 2026-07-12. Im Finale Titel + Aufstellung als
      eine zentrierte Gruppe, Wappen größer. Per Showroom-Screenshot verifiziert (`Desktop/arena-letsgo-neu.png`).
- [ ] 🟡 **Kontrast am echten Beamer:** „Wing It" (Blau) + „Objection" (Pink) Fraktionsnamen auf Dunkel prüfen.

### 🖼️ Screenshot-Review-Batch 2026-07-12 (2. Runde, 40-Bot-Lauf)
GEBAUT+GEPUSHT (alle typecheck-grün):
- [x] **Scoring Ø-Antwortzeit** pro Fraktion („5/5 · ⚡Ø 3,2s") — macht Speed-Tiebreak transparent (Bild 10).
- [x] **App-weiter Gedankenstrich-Sweep** (~130 spielersichtbare Strings, DE+EN, Kommentare/deaktivierte Features aus).
- [x] **Fairness-Nenner = nur aktive Handys** (toter Tab drückt Quote nicht mehr; alle Kategorien per-capita bestätigt, inkl. 10v10 = schon Ø).
- [x] **Größere Abgabe-Wappen** in aktiver Frage (Arena: 8 Wappen → 124px statt 80).
- [x] **CozyGuessr rang-basiert** (Top-5 5/4/3/2/1 statt nur Platz 1; Map zeigt schon 1 besten Pin/Fraktion).
- [x] **preGame-Wolf verkleinert** (überlappte „Die Fraktionen"-Karte) — visuell bestätigen.
- [x] **Reflow-Fix** „X/Y submitted"-Zeile (rechte Spalte sprang bei Timer-Ende) + systemische Regel dokumentiert.
- [x] 🔴 **Epic Standings** — voller Rennen-Umbau GEBAUT+VERIFIZIERT (`standings-epic-neu.png`): Leader-Spotlight (Glow-Rahmen + hüpfende Krone + größer), Komet-Spitzen an Balken-Front, Renn-Lane-Track, hochzählende Werte (useCountUp), FLIP + Führungs-Blitz bleiben.
- [x] **„Now the rules"-Karte** voller (Vorschau-Zeile) + Stepper-Titel-Dopplung raus.
DEFERRED (bewusst, mit Grund):
- [ ] **Round-Intro-Balance** — DEFERRED: tief mit dem Journey-Zoom-Kamerasystem verzahnt (Bug-Hotspot #2), hohes Bruchrisiko; „oben-lastig" evtl. nur Transition-Frame. Erst am echten Trockenlauf prüfen, ob's überhaupt stört.
- [ ] **Icon-Fidelity** (📖/📋 flach) — DEFERRED: kein 3D-Book/Clipboard-Asset vorhanden. Wolf designt die PNGs (wie Cozy-Game-Icons), dann wire ich sie.
- [ ] **Reflow-Audit Frage-View** breiter (Timer/Badges) — falls CHEESE-Shift nach dem Fix bleibt, Timer-Element prüfen.
- ⚠️ Vieles davon war im alten Frontend-Screenshot NICHT drin → Wolf: Beamer hart neuladen (Strg+Shift+R) + Autoplay AUS zum echten Mod-Pacing-Test.
- [ ] Lobby bei 40 Handys am echten Beamer prüfen (kein Scroll) — im Dry-Run ok aussehend, final am Projektor.

### 🏟️ Showdown-Wertung (Modell C) — Spannung + Fairness fürs Grossevent
Kontext: „1. Team gewinnt einfach, Strategie fehlt". Konzept + Fairness/Spannungs-Analyse
(Monte-Carlo) voll in Memory [[project-cozyarena-showdown-concept]]. Mockup aller Kategorie-
Formen: https://claude.ai/code/artifact/b22fbb30-0679-40a4-ac83-788e6aa345b4

> 🎨 **REVEAL-DESIGN = Wolf macht es selbst in Claude Design (2026-07-14).** Der KI-seitige
> Reveal-Rethink (smarte Viz pro Kategorie / Kuchendiagramm / Zahlenstrahl / Füll-Kacheln,
> Scoring+Standings-Merge-DESIGN) ist **gestrichen** — nicht bauen, nicht brainstormen. Wir
> setzen nur Wolfs fertige Designs um, wenn sie kommen. Backend-Wertung bleibt unsere Domäne.
> ✅ Scoring-Coverage komplett: top5 + order sind in `qqMegaEventScore` (kein Loch mehr).
- [x] **PHASE 1 (Backend) GEBAUT+GEPUSHT** `2bdfe2bb` — `qqMegaEventScore` auf einheitliche
      **0–100-Skala**: jedes aktive Handy → 0–100, Fraktion = Ø der Punkte (Rang-Punkte [5,4,3,2,1]
      raus, waren größen-unfair). Distanz = Nähe-Punkte pro Handy gemittelt (nicht die Tipps →
      guter Tipp zieht immer hoch). **Finale-Multiplikator** letzte Phase ×2 / letzte Frage ×3
      (Monte-Carlo-Sweet-Spot: dreht ~1/3 der Spiele, stärkste gewinnt noch 63%). Typecheck grün,
      nur largeGroupMode. ⚠️ **Coolify-Auto-Deploy läuft; Live-Trockentest steht aus.**
- [x] **PHASE 2a (Anzeige) GEBAUT+GEPUSHT** `33dd68ca` — Standings-Layout für 4-stellige Summen
      (standVal 90→132), Footer-Copy korrigiert (Speed = nur Tiebreak, „bis 100 pro Frage").
- [x] **Finale-Banner GEBAUT+GEPUSHT** `0ef6077d` — „🔥 FINALE ×2 / SCHLUSSFRAGE ×3" in Reveal +
      Standings; Multiplikator frontend-seitig spiegelbildlich zum Backend abgeleitet.
- [x] **Wertungs-Anzeige-Audit GEBAUT+GEPUSHT** `e2fd7bf3` — 3 Bruchstellen gefixt: Reveal-Sieger
      = Spotlight (nicht mehr „gewinnt", Wolf-Wahl A) · Unterzeile kategorie-abhängig (erklärt jetzt
      die Punkte: 10v10 „Ø X/10", Distanz „Ø X% dran", binär „X/Y richtig") · Footer neutral ·
      Schätzchen-Reveal aufs Fraktions-Wappen gemappt + 🏆→🎯.
- [ ] **PHASE 2b REST (episch, droppbar):** Showdown-Zone (Top-Gruppe leuchtet durchgehend) ·
      Cut-Moment (einmalige Wolf-Ansage + Awards-Feier, Akt 2) · Showdown-Look (dunkle Bühne/
      Spotlight im Finale) · persönliche Handy-Anzeige `/team` bei Distanz („Du: 96!"). Größer/
      design-sensibel (Beamer 16k Z.) → eigener Pass. Phase 1 + 2a + Banner shippen allein.
- [ ] **Tuning am Trockenlauf:** Finale=„letzte Phase" ok? · Nähe-Kurve K=3 / Map-Cap 25° am
      echten Content justieren · Reveal zeigt jetzt 0–100 (bis 300 im Finale) → in Phase 2 stylen.

### Woche 4 — Puffer
- [ ] Kompletter Trockenlauf mit mehreren echten Geräten (voller Durchlauf, EN).
- [ ] **Coolify-Backend-Redeploy** (Cap, Faction-Balance, ggf. Broadcast-Throttle).
- [ ] Progressives Fraktions-Öffnen entscheiden (falls Bars dünn).

---

## ✅ Backend-Redeploy erledigt (2026-07-05)

Coolify-Redeploy durch, Backend gesund (health 200, db connected). Damit LIVE:
Security-Fixes (Feedback/Drafts-POST ohne PIN → 403 verifiziert), **Stechen**,
**Comeback-Auto-Skip**, Pitch-Demo-Draft, ältere Backend-Änderungen.

**Noch offen (Verhalten am Screen, kein Deploy):** Trockentest **Stechen** —
künstlichen Gleichstand herstellen ist der fummelige Teil; einmal beide Modi
(normal + Arena) durchspielen und Auto-Reveal-Timer prüfen.

## 🆕 Offene Follow-ups (2026-06-26)

**Team-View-Audit** (P0 + 2 billige P1 schon gefixt — Commit `f08414da`). Noch offen,
weil Geräte-Test / Verhaltensänderung nötig:
- **Tastatur verdeckt Eingabefeld** auf kleinen Phones (iPhone SE). Fix-Kandidat:
  `scrollIntoView({block:'center'})` nach Fokus — aber Vorsicht, `preventScroll:true`
  wurde bewusst gegen Header-Springen gesetzt. Erst am echten Gerät testen.

**Brand-Farb-Sweep:** ✅ erledigt (verifiziert 2026-07-13). Beide genannten Spots sind
schon brand-konform: `QQLandingPage` hat kein Amber mehr, `FinalRecapHintCard` nutzt
`brandPink`. Restliche Amber-Vorkommen sind SEMANTISCH (Builder-Warnungen, Status
„waiting", Countdown 3·2·1) oder bewusst festlich (Wimpel-Mix) → bleiben. Offene
Gold-Grundsatzfrage (Medaillen/Krönung `ACCENT_GOLD`) ist separat und wartet auf Wolf.

## 🐛 Beobachten — Bugs ohne Repro (warten aufs nächste Auftreten)

Kein Fix ohne Snapshot — beim nächsten Live-Vorkommen DevTools-Network `qq:stateUpdate`-Payload ziehen.

- **Team-Color rot↔blau-Swap am Final-Start** — beim Auftreten `teams[i].color` vor/nach
  dem Final-Start vergleichen.
- **Joker-Re-Detection nach Steal-Roundtrip** (Wolf-Entscheid: erst snapshotten) —
  `state.grid[r][c]` für die 4 markierten Cells (`ownerId`/`jokerFormed`/`jokerCounted`/`stuck`)
  + `teamPhaseStats[teamId].jokersThisPhase/jokersEarned`. Fix-Optionen: (a) `cells.every(...)`
  statt `some(...)` in `qqBfs.ts` detectNewJokers, oder (b) `jokerCounted` bei Steal NICHT
  resetten. Files: `qqBfs.ts:122+`, `qqRooms.ts` handleJokerDetection.
- **/team Joker-False-Positive** — Pragma-Patch ist drin (`myJokersThisPhase > 0`-Gate). Wenn
  trotzdem nochmal: `state-update`-Payload mit `pendingAction`/`placementsLeft`/`teamPhaseStats`.
- **Beamer-Clipping bei 10+ NICHT-genesteten Teams** (Pre-Pitch-Audit 2026-07-05, kein Scroll,
  nur Clipping am Stage-Rand): `CozyQuizLargeGroupView` CumulativeStandings (10×88px ≈ 970px, an
  der 990er-Kante) + `CozyQuizGameOverView` Normal-Recap (`cols=1` ohne Höhen-Cap bei vielen
  Teams). 3-4er-Teams unkritisch; genestete Arena (8 Fraktionen) sicher. Am echten Screen mit
  genau 10+ echten Teams prüfen, dann ggf. Höhen-Cap/2-Spalten. Nicht blind fixen (Layout-Regress).

## 🌐 Blockiert / extern (kein Code-Task hier)

- **ThanksView „Nächstes Event"-Block** — wartet auf cozywolf.de-Buchungsflow. Layout-Skelett
  ist vorbereitet (`QQBeamerPage.tsx` ThanksView, Suchwort „LINKS: Platzhalter").
- **cozywolf.de Landing** — Impressum/Datenschutz dort ergänzen (App-seitig sind sie live).
  Siehe `COZYWOLF_LANDING.md`.

## 🔧 Rest-Backlog (2026-06-22 gegen Code verifiziert)

Verifiziert **erledigt/obsolet** und daher entfernt: Host-Notes-Toast (jetzt default collapsed
in Frage-Phasen) · Teams-List Compact-View (Compact-Mode bei >5 Teams) · Show-Controls/
Settings (Mod-Cockpit-Compact + Live-Settings-Cleanup) · Shift+Space→QUESTION_ACTIVE-Sprung
(obsolet — Shift+Space ist jetzt „Slide zurück") · Treppchen-Confetti-Storm (durch Eurovision-
Finale-Redesign überholt) · **Autoplay-Failsafe für Custom-Pipelines** (kein echtes Todo:
HotPotato ist timer-getrieben — `qqArmHotPotatoTimer` Turn-Timeout + Pause/Resume + Validierungs-
Guard gegen Solo-Hang; OnlyConnect ist deaktiviert; nur Bluff braucht wegen manuellem Mod-Review
einen Watchdog, der existiert `_bluffReviewWatchdog`).

Genuin offen (alle niedrige Prio, live-test-getrieben):

- **Streamdeck-Action-Toast bei Hotkey-Press** — nicht umgesetzt; optional. Streamdeck ist
  sonst voll verdrahtet (F13–F19, Bounce-Locks), Skip-Toast existiert → geringer Mehrwert.
- **Mikro-Polish** (4 Animation-Easings · Layout-Cap-Bumps · justifyContent-Lücken) —
  speculative Audit-Notizen, Zeilennummern veraltet. Nur anfassen, wenn Wolf die Stelle
  konkret im Live-Test bemängelt; vor Fix re-grepen.

---

## 🎨 Theme-System (Skins je Location) — Foundation + Proof LIVE (2026-06-23)

**STAND 2026-06-25 (Mono live-reviewed & poliert):** Über mehrere Sessions die ganze
`/beamer` in **Studio Mono** durchgeklickt + gefixt: Shape-Tokens (`--qq-card-radius` +
`--qq-pill-radius`, Mono pill=3px), alle Fenster/Cards/Badges eckig (inkl. systemischer
`cozyCard()`-Hebel), Farben skin-konform (kein Rest-Pink/unlesbarer Text), **Cheese-Mono-
Redesign** (solide weiße Cards statt dunkel-frosted), **Avatare bleiben bewusst RUND**
(Editorial-Kontrast, Wolf-Entscheid), **Quiet-Motion** (Mono = ruhig: Shockwave/Shimmer/
Title-Waves aus via `isQuietMotion()` + `data-quiet-motion`-CSS-Hebel). Volle Detail-Doku:
Memory `project-theme-skin-system`.

**Update 2026-06-25 (späte Session):** Weitere Mono-Fixes:
- **Regel-/Hero-Titel sichtbar:** Quiet-Motion-CSS killte per Substring-Match auch die
  Entrance-Animation (opacity:0→1) → Titel unsichtbar. Fix: Regel zusätzlich `opacity:1`
  erzwingen (main.css `data-quiet-motion`). Deckt Rules/Paused/Thanks/Beamer-Rules + phasePop.
- **Phase-Intro „Schau mal" / Kategorie-Intro** (beide Branches in CozyQuizPhaseIntroView)
  war un-gethemt → lila Titel/unsichtbarer Untertitel/rundes Window gefixt; **Progress-Tree-
  Discs bleiben RUND** (wie Avatare), Linie/Ring auf Accent.
- **Cheese:** ohne Bild weiße Card-Fläche statt dunkel-lila (Mono); „X/Y Teams"-Zähler als
  lesbarer Chip; Pink-Leak im schnellsten Zeit-Pill raus.
- **Ambient in Mono AUS** (Wolf-Entscheid): Fireflies (zentral in CozyQuizAmbient),
  Placement-Sweep, Paused-preGame Glow/Spotlight/Partikel — via `isQuietMotion()`. CozyWolf bleibt.
- **Summary skin-aware migriert:** Backend reicht `themeId` durch, `setActiveThemeId` beim
  Laden; `--sum-*`-Var-Rampe + theme-aware `summaryBrand` (Cozy byte-identisch). Offen als
  Polish: Mono-Ästhetik **eckig + Hard-Shadow** (Radius/Schatten noch rund/weich).

**NOCH OFFEN (gegen Code verifiziert 2026-06-25):**
- **SoftPop + Neo-Brutal** noch NICHT am Live-Screen durchgesehen — kommen lt. Wolf **erst wenn
  Mono perfekt** (Mono hat Prio, am ehesten für Corporate).
- **Augen-Review am Screen** (kein Code mehr): Comeback-View in Mono + Summary-Mono eckig/Hard-Shadow.
- Wolf-Sprechblase im Logo ist oval (vor Änderung fragen).

Verifiziert **erledigt** (raus): ~~Mod-Theme-Picker~~ (Skin im Setup pickbar, `room.themeId`
verdrahtet Beamer/Team/Summary) · ~~Comeback-Mono-Migration~~ (Code fertig) · ~~Summary-Mono
eckig+Hard-Shadow~~ (Commit `cd28323e`: sumR/sumPill/sumSh-Shape-Tokens, Avatare bewusst rund).

**Marketing-Seiten (2026-06-25, LIVE):** `/about` (A4-One-Pager, PNG/PDF-Download via
html2canvas+jsPDF) + `/trailer` (9:16 IG-Trailer). Doku: Memory `project-marketing-pages`.
Optionale Follow-ups: (a) `/about` 1-Seiten-Fit am Druck verifizieren, (b) optionaler
MediaRecorder→WebM-Download-Button im Trailer, (c) Trailer-Tempo/Tiere nach Wolf-Review.
**Wichtig:** Bei Mechanik-Änderungen beide Seiten mitziehen (Inhalt ist aus den Regeln abgeleitet).

**Update 2026-06-23 (Commit `03106c88`):** Wolf-Klarstellung — es geht NICHT um
Event-Kostüme (Weihnachten/Halloween), sondern um **subtile Grunddesigns je
Location/Setting** (Café · Bar · Corporate · Glass), per Klick umschaltbar.
Gebaut: `qqTheme.ts` (ResolvedTheme + QQ_THEMES cozy/glass + Runtime + `applyThemeVars`),
**Cozy↔Glass-Umschalter im `/showroom`** über den echten Beamer-Views.

**Wichtiger Befund (Commit `4d2acd1f`):** `getBrandColors` ist NICHT der breite
Chokepoint — die Views hardcoden Pink direkt (131× `#ec4899`, 391× `rgba(236,72,153)`).
→ Echte Foundation = **CSS-Custom-Properties** `--qq-accent*` (main.css :root, Default
= Pink = zero-visual-change). `applyThemeVars` schreibt die Skin-Akzente per Wechsel
auf `:root`. **3 Views migriert** (QuestionView/TeamsRevealView/GameOverView, 65 Stellen)
→ Showroom-Flip wechselt Frage/Reveal/Teams/Treppchen sichtbar Pink↔Indigo.

### ▶ AKTUELLER PLAN (2026-06-23) — 3 Skins, Beamer-only, Flagship zuerst

**Designziele festgelegt (Vorschau live auf `/skins`, `QQSkinsPage.tsx`):**
1. **Studio Mono** — editorial, heller BG (#F3F2EC), weiße Karten, 2px schwarzer Rand,
   6px Hard-Shadow, Lime-Akzent (#C9F227), Display-Bold. (markenneutral, Akzent=Kundenfarbe)
2. **Soft Pop** — warm-heller BG, bunte runde Pillen (Gelb/Rosé/Mint/Blau), weiche Schatten,
   keine Ränder, Konfetti, Nunito-Bold. (Team-Building/Schule)
3. **Neo-Brutalism** — lila Verlauf-BG, weiße Karten + 3px schwarzer Rand + 6px Hard-Shadow,
   Selected = Electric-Blau (#2D4BFF), eckige Badges, Sterne-Deko. (modern/bold)

**🔒 REGEL (Wolf, 2026-06-23 präzisiert): Endergebnis sieht VOM DESIGN aus wie die
`/skins`-Mockups** — Farben, Ränder, Schatten, Formen, Badges, Schrift, Deko voll übernehmen,
sonst „sehen sie gar nicht aus wie die Skins". NUR die **Positionen** bleiben ungefähr wie
heute (nicht zum Mockup-Layout umarrangieren). Also: volles Skin-Aussehen, kein Re-Arrangieren.
Technik: Treatment-Tokens + `isThemed()`-Switch (Cozy bleibt exakt) + Deko-Overlay (`SkinDeco`).
**Fortschritt QuestionView:** Text-Farben ✓ · Font ✓ · Haupt-Card-Treatment ✓ · Deko ✓ ·
Sub-Flächen/Overlays/Borders ✓ · Timer-Track ✓. Reveals (Schätzchen/Bluff/Order/Top5) ✓.

**🎯 ZIEL präzisiert (Wolf 2026-06-23): die GANZE `/beamer`-View in 4 Designs** (Cozy +
Studio Mono + Soft Pop + Neo-Brutalism) — **alle Phasen-Screens**, nicht nur die 3
Showroom-Szenen. Der `/showroom`-Umschalter ist NUR ein Vorschau-Tool; echtes Ziel = `/beamer`.
Noch zu migrieren (selbes Token+`isThemed`+`SkinDeco`-Muster): Lobby · Rules · PhaseIntro ·
Placement · Comeback · FinalReveal · GameOver(Treppchen) · Thanks · TeamsReveal · Summary ·
Paused + restliche Reveals (CozyGuessr/OnlyConnect) + QQBeamerPage-Rahmen/BG.

**🔀 SKIN-WAHL = beim Quiz-EINRICHTEN, nicht in-game** (Wolf): KEIN Ecken-Toggle im Spiel
(das ist nur der Showroom). Skin wird wie `avatarSetId` vorher im Mod-Setup gewählt →
`room.themeId` (Backend-State, Whitelist + Default 'cozy') → Broadcast → Beamer ruft
`applyThemeVars(resolveTheme(state.themeId))` bei jedem stateUpdate. Picker analog zum
bestehenden Avatar-Set-Picker (`qq:setAvatarSet` → neues `qq:setTheme`).

**Scope:** **Beamer-only** zuerst (Team-Handy später). **Start:** Flagship = **Frage + Reveal**
(`CozyQuizQuestionView.tsx`) end-to-end in allen 3 Skins, live beurteilen, dann restliche
~13 Screens (Lobby/Regeln/Phasen-Intro/Placement/Comeback/Finale/Treppchen/Thanks/Summary/…).

**Token-Architektur (CSS-Vars, main.css :root = cozy-Default = zero-visual-change):**
- Akzent (existiert schon): `--qq-accent · -rgb · -soft · -light · -magenta`
- NEU: `--qq-bg · --qq-text · --qq-text-muted · --qq-card-bg · --qq-card-border ·
  --qq-card-radius · --qq-card-shadow · --qq-font`
- **WICHTIG `--qq-card-text` getrennt von `--qq-text`:** Neo-Brutalism hat WEISSEN Text auf
  lila BG **und** DUNKLEN Text auf weißen Karten → ein einzelnes Text-Token reicht nicht.
- `applyThemeVars` (qqTheme.ts) schreibt den ganzen Satz auf :root beim Skin-Wechsel.

**⚠️ ALL-OR-NOTHING bei hellen Skins:** 2 von 3 Skins sind hell. In `CozyQuizQuestionView`
(3585 Z.) ~**44 helle Textfarben** (#fff/rgba(255)) + **62 slate** (#e2e8f0/#94a3b8…) +
**54 dunkle BG/Card** auf Tokens umstellen. Jede vergessene weiße Textstelle = unsichtbar auf
hell → der Flagship-Screen muss **vollständig** migriert sein, bevor man helle Skins zeigt.
Vorsicht (wie bei Pink): Farben, die an Canvas/Confetti/Farb-Mathe gehen, NICHT auf `var()`.

**Reihenfolge:** (1) Token-Fundament main.css + qqTheme (3 Skins voll spezifiziert).
(2) QuestionView komplett auf Tokens (Flagship). (3) Showroom-Umschalter auf die 3 Skins →
Wolf beurteilt am echten Screen. (4) restliche Screens nachziehen. (5) Mod-Theme-Picker +
Room-State-Feld + Broadcast (Per-Event-Wahl, Persistenz).

---

## 🎨 Geplante Initiative: Theme-System generalisieren (Stand 2026-06-22, teils überholt)

**Ziel (Wolf):** Design pro **Event/Setting** umschaltbar — aber **komplett einheitlich**
über alle audience-facing Pages (Beamer · Team · Summary · Thanks · Showroom). Ein Theme
wählen → alles folgt. Moderator-Page bleibt neutral (Cockpit, kein Bühnenbild).

**Ist-Stand:** Skelett existiert, aber **3 konkurrierende Quellen** → nie vollständig:
1. `QQ_THEME_PRESETS` (`shared/quarterQuizTypes.ts:602`) — `default/dark/neon/retro/nature`
   (bg/card/accent). Theme fließt via `s.theme` schon zu Beamer+Team.
2. `getBrandColors(eurovisionMode)` (`QQBeamerPage.tsx:94`) — **binärer** Zweig (Eurovision
   vs. Default), liefert den Pink-Akzent in den meisten Views, liest aber **NICHT**
   `theme.accentColor`. → Eurovision und Preset sind getrennte Systeme.
3. **~124× hardcoded `#ec4899`** (+ weitere Inline-Brand-Werte) direkt in Views → reagieren
   auf gar kein Theme. (Grund für die Memory-Regel „Brand-Refresh — alle Pages mit-checken".)

**Plan:**
1. **Ein Resolver:** `resolveTheme(theme?)` → vollständiges `ResolvedTheme` (accent/accentRgb/
   accentSoft/gradient · bg · cardBg · font · **+ die `qqStyleTokens`** radius/shadow/spacing/
   motion · Kategorie-Palette · Ambient an/aus · Logo). `getBrandColors` wird dünner Wrapper
   darauf — **Eurovision = nur EIN Preset**, kein Sonderzweig. State-lose Seiten:
   `resolveTheme(undefined)` = Default.
2. **Alles liest daraus** — die ~124 Pinks + Inline-Brand-Werte page-by-page auf
   `theme.accentHex` etc. umstellen.
3. **Theme-Picker pro Event** — Presets zu sauberem Dropdown generalisieren.

**Kosten (ehrlich):** Fundament (Resolver + Eurovision-als-Preset + 1–2 neue volle Presets +
`getBrandColors` delegiert + 1 Fläche als Proof, am besten Showroom) = ~½ Tag. „Komplett
einheitlich über ALLE Pages" = Langschwanz, **graduell** migrieren (gezielter Sweep ODER beim
nächsten Anfassen, wie bei der Farb-Tokenisierung). Kein Wochenend-Projekt.

**Entscheidung offen:** Fundament bauen? Wenn ja: welche **Event-Themes zuerst** (Weihnachten /
Firmenfeier / Geburtstag / Halloween)? → die als erste echte Presets anlegen.

---

*Erledigte Punkte stehen in der Git-History (`git log --oneline`), nicht hier.*
