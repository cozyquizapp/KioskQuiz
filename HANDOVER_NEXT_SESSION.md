# 🤝 Handover für die nächste Chat-Session

**Stand:** 2026-05-05 spät · **Letzter Commit:** `2c6bace9` · **Branch:** `main`

> **Pflicht-Lektüre VOR der ersten Code-Änderung:**
> 1. `MEMORY.md` (im `.claude/projects/...`-Ordner) — User-Profile + Architektur
> 2. `STYLE_GUIDE.md` im Repo-Root — Ground-Truth Design-System
> 3. Diese Datei — Stand & Quer-Bezüge
>
> **Wichtige Audit-Files** (nur lesen wenn Thema passt):
> - `AUDIT_FINDINGS.md` — Phase-4 Style-Guide-Audit (~95% Compliance abgeschlossen)
> - `ANIMATION_AUDIT.md` — Phase-5 Animation
> - `SOUND_AUDIT.md` — Phase-6 Sound
> - `LIVE_WORKFLOW_AUDIT.md` — Phase-7 Streamdeck
> - `MOBILE_UX_AUDIT.md` — Phase-8 Mobile

---

## 🎯 Wo wir stehen — Big Picture

**Phase 4-8 (Style-Guide-Refactor) ✅ abgeschlossen.** Plus: ein langer Wolf-Test-Tag mit ~30 Live-Bugfixes und mehreren neuen Features. App ist deutlich näher an „live-tauglich" als vor 24h.

**Aktuell live-fähig:**
- /beamer (Hauptbildschirm) — alle Phasen + Animationen + Sound
- /moderator (Streamdeck-tauglich, Hotkey-Audio-Feedback)
- /team (Phone, Reconnect via localStorage)
- /builder (QQBuilder mit allen Features)

**Wolf-Workflow:**
1. QQBuilder → Draft erstellen
2. Mod-Page → Draft auswählen → Spiel starten
3. Streamdeck → Hotkeys (Space, R, N, F13-F17, M, P, F, V, ?, Esc, 1-5)

---

## 🚨 Wichtige Schema-/Architektur-Änderungen heute

### 1. team.color = Avatar-Slot-Farbe ÜBERALL
**Geschichte:** Ich habe heute Brett-Palette eingeführt (separater Color-Pool für Cells), Wolf hat das wieder verworfen. **Aktueller Stand:** team.color kommt aus `QQ_AVATARS[avatarId].color` und wird ÜBERALL benutzt (Cells, Standings, Hero, Stats). KEINE separate Brett-Palette mehr.

**Wenn du Code siehst der `qqGetBoardColor()` aufruft:** das ist Legacy aus Phase 4 / heute Vormittag. Für QQ-aktiven Code sollte überall `team.color` reichen. `qqGetBoardColor()` + `QQ_BOARD_PALETTE` bleiben in shared/ als Helper, sind aber nicht mehr im aktiven Renderpfad.

### 2. Avatar-Slot-Farben angepasst
8 Avatare haben jetzt klar unterscheidbare Farben (45° Hue-Spread):
```
fox/Hund:        #F97316 orange
frog/Faultier:   #22C55E grün
panda/Pinguin:   #14B8A6 türkis (war blau)
rabbit/Koala:    #A855F7 lila
unicorn/Giraffe: #FACC15 gelb
raccoon/Waschb.: #3B82F6 blau (übernahm Pandas alte Farbe)
cow/Kuh:         #EC4899 pink (war amber)
cat/Capybara:    #EF4444 rot
```

### 3. Schema-Erweiterungen
- `QQDraft.connections?: QQConnectionsPayload` + `connectionsDurationSec?` + `connectionsMaxFails?` — Custom-Connections-Set pro Draft
- `QQStartGamePayload` reicht diese 3 Felder durch
- `QQRoomState.connectionsPayload` speichert das Custom-Set; null = Fallback
- `FUNNY_TEAM_NAMES_EN` parallel zu DE (28 EN witzige Namen). `getRandomFunnyNames(n, lang='de')` mit lang-Param.
- `QQTeamAvatar` hat optional `bgColor`-Prop (Disc-Override) und `flat`-Prop (kein Disc, nur Emoji).

### 4. Sound-Architektur
- `setMusicDucked(true)` ducked jetzt **alle** Music-Loops (lobbyAudioEl + loopAudioEl). Vorher nur loopAudioEl.
- Helper `playWithDuck(slot, durMs)` in sounds.ts wraped Slot-Plays mit Auto-Ducking.
- Connections-Phase-Wechsel-Sound-Tracker in QQBeamerPage (active→reveal Cascade + reveal→placement + done-ClimaxFinish).
- `playStapelStamp` nur noch in PLACEMENT-Phase (vorher feuerte er bei Phase-Wechseln auch).
- `playHotkeyFeedback()` (440Hz Triangle, 50ms) für Mod-Hotkey-Audio-Bestätigung.
- Cheese-Reveal-Bug: `hasRenderableWinner` checkt jetzt currentQuestionWinners + verifiziert dass das Team in s.teams existiert.

### 5. Tokens (Phase-4)
- `qqDesignTokens.ts` hat jetzt: `ALPHA_DEPTH d0 (1A) + d4 (B3)`, `LETTER_SPACING.hero (0.22em)`, `DURATION.idle (2400ms) + spotlight (3500ms)`, `QQ_PHASE_COLORS = ['#3B82F6','#F59E0B','#EF4444']`, `EASING.outCubic`.
- CSS-Var `--qq-ease-out-cubic` in main.css.
- `<BeamerOverlay>` Wrapper-Komponente (Position-Fixed-Trap-Schutz für QuizIntro/RulesIntro).

### 6. 4-Gewinnt (OnlyConnect) Refactor
- Backend: `qqOnlyConnectGlobalMinHint` filtert jetzt locked + winners aus der min-Logik. Beamer kann Hint 2+ zeigen sobald die übrigen aktiven Teams weiter sind.
- /team: Hint-Slots sind klickbar (Tap auf nächsten Slot = freischalten). Punkte-Logik komplett raus, nur 1 Zeile Regel oben.
- Backend `qqStapelBonusCell` (CONNECTIONS_4X4 + STAPEL_BONUS) — Bots rufen jetzt diese Funktion statt qqStuckCell (war Mismatch-Bug).

### 7. Joker-PNGs
- `frontend/public/images/jokers/1.png` + `2.png` (m/w im Wechsel)
- `<JokerIcon i={index} size={N} />` Component — `i % 2 === 0` → 1.png, sonst 2.png
- 5 Stellen ersetzt (TeamPage Header, Beamer Cell-jokerFormed, Beamer Star-Fly, Mod Mini-Grid)

### 8. Avatar-Sync
- `teamEmoji`-Prop wird jetzt überall durchgereicht (~12 Stellen, davor inkonsistent → User wählte Octopus, sah Maus)
- `<AvatarSetProvider>` auf /team hat jetzt `emojis={state.avatarSetEmojis}`-Prop (war auf Game-View vergessen)
- CozyGuessr-Pin-Marker (Beamer Map): `getAvatarDisplay()` mit serverEmojis + team.emoji

### 9. Reconnect
- /team Daten (qq_teamName, qq_avatarId, qq_emoji, qq_lang) sind jetzt in **localStorage** (war sessionStorage → wurde beim Tab-Schließen gelöscht). Auto-Rejoin nach Reload funktioniert jetzt.

### 10. CozyGuessr-Erweiterungen
- Optional Bild im Builder via `q.image` — auf /team mit cat-Color-Frame (Cheese-Stil), auf /beamer via Standard-Layout-System
- Plus-Code-Eingabe im MapEditor (FULL Codes clientside via `utils/plusCode.ts`, SHORT via Nominatim-Geocoding)
- Bild-Upload mit Auto-Komprimierung (Canvas-Resize bis <2MB)

### 11. Connections-Builder
- Neues Modal in QQBuilder (Top-Bar-Button „🏆 4×4 Finale")
- 4 Gruppen × 4 Items, DE/EN, Schwierigkeit
- Speichert in `draft.connections`, Mod-Page reicht durch

### 12. Slide-Editor
- Aus QQBuilder-Top-Bar entfernt, aus Hauptmenü → in Extras-Sektion verschoben
- Code bleibt funktional (für Editieren bestehender Drafts mit slideTemplates)

### 13. EN-Translate-Bug
- Vorher: skipped Felder die schon textEn hatten → DE-Änderungen kamen nicht durch
- Jetzt: Confirm-Dialog + überschreibt unconditional

---

## ⚠️ Was noch offen / zu beachten

### Bekannte Edge-Cases (nicht akut, aber merken)
- **Slide-Editor** ist visuell chaotisch — Wolf nutzt ihn nicht mehr aktiv. Bei Bedarf später komplett löschen (Schema + Routes + Page).
- **Sound-Files** (WAV/MP3 in `frontend/public/sounds/`) — Spielende haben Feedback gegeben dass sie nicht gut sind. Wolf wollte „später" angehen (Sound-Designer-Aufgabe oder AI-Sound-Gen). Code ist nicht das Problem.
- **Pre-Game-Checkliste** (Phase 7 Bucket 5) — als optional skipped, Wolf hat eigene Routine.
- **Mobile-Layout-Fallback ohne Streamdeck** (Phase 7 Bucket 4) — als „kann später" skipped.
- **`tcfloat 3s` und ähnliche hardcoded Idle-Loop-Durations** — bewusst nicht auf DURATION.idle migriert (würde Animation-Drift sein), Inline OK.
- **Bluff-Reveal-Cards 2-Schicht-Shadow** — Audit hatte das als „Hero brauchen 3-Schicht" markiert, ist aber laut Style-Guide korrekt (Reveal-Cards = STANDARD, nicht HERO).

### Memory-Files die JETZT veraltet sein könnten
- `project_phase_4_to_8_complete.md` referenziert Brett-Palette als laufenden Stand → **wurde heute revertiert**, siehe Punkt 1 oben. Memory-File braucht Update wenn relevant.

### Wolf-Test-TODO (vom 2026-05-05 Test-Session)
**Alle erledigt** außer (von Wolf bewusst zurückgestellt):
- Sound-Datei-Qualität verbessern (Designer-Aufgabe)
- 4-Gewinnt-Teampage-Refactor war geplant aber jetzt bereits umgesetzt nach Wolfs Klärung
- Spätere Polish-Items (Mobile-Layout etc.)

---

## 📝 Workflow-Erinnerungen für die nächste Session

### Auto-Mode + Wolfs Stil
- Wolf nutzt **Auto-Mode** — handle autonom, frag nur bei Mehrdeutigkeit
- **Commits + Push nach jeder abgeschlossenen Aufgabe** (siehe `feedback_commit_policy.md`)
- Wolf moderiert mit **Streamdeck** — Mod-Page muss live-tauglich bleiben
- **Keine Zeitschätzungen** — Wolf hat dazu klar gesagt „die stimmen nie, dauert eh 5-10 Min"
- **Bei „Idee" oder „Vorschlag"**: erst brainstormen mit Optionen, auf Wolfs Entscheidung warten, DANN bauen
- **Wolfs Tonalität:** sehr direkt, kompakt, deutsch — gleiche Tonalität zurück

### Was du NICHT tun solltest
- KEINE Avatare-Color-Änderungen ohne Wolf-OK (heute schon viel hin und her)
- KEINE Brett-Palette-Reaktivierung (Wolf hat das verworfen)
- KEINE Mass-Replaces ohne explizit zu erklären was du tust
- KEIN Slide-Editor-Refactor (Wolf will das eher gelöscht als gefixt)
- KEINE Sound-File-Änderungen (Wolf macht das selbst)

### Tools-Hints
- **TypeScript-Check:** `cd frontend && npx tsc --noEmit` — viele Pre-Existing Errors in Legacy-Pages (Gouache, CreatorWizardPage, QQBuiltinSlide etc.) — die sind laut Memory zu ignorieren. Filter sie raus mit `grep -v "Gouache\|CreatorWizardPage\|QQBuiltinSlide\|QQCustomSlide"`.
- **Backend Type-Check:** `cd backend && npx tsc --noEmit`
- **Memory-Inkonsistenzen:** Wenn ein Memory-File etwas anderes sagt als der aktuelle Code — vertraue dem Code. Memory updaten oder ignorieren.

---

## 📊 Session-Statistik 2026-05-05

- **~50 Commits** insgesamt (Phase-4-8 + Wolf-Test-Bugfixes + Builder-Features)
- **5 neue Dateien:**
  - `frontend/src/components/JokerIcon.tsx`
  - `frontend/src/components/BeamerOverlay.tsx`
  - `frontend/src/components/ConnectionsEditor.tsx`
  - `frontend/src/utils/imageCompress.ts`
  - `frontend/src/utils/plusCode.ts`
- **2 neue PNGs:** `frontend/public/images/jokers/1.png + 2.png`
- **5 Audit-Files** im Repo-Root (Phase 4-8 Doku)

---

## 🎬 Wenn der Mod-Loop noch hakt

Falls Wolf in der nächsten Session noch einen neuen Bug meldet, geh zur Bug-Triage so vor:
1. **Frag konkret:** Phase, was war erwartet, was passiert?
2. **Reproduziere mental:** welche State-Variable, welche Component?
3. **grep zuerst, fix dann** — verstehe bevor du editierst.
4. **Type-Check + Commit + Push pro Bug** (kein Bundle-Commit für unrelated Bugs).
5. **Update relevante Memory-MDs** wenn du eine neue Erkenntnis hast.

**Viel Erfolg! 🐺**
