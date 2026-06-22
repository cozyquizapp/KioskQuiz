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

## 🌐 Blockiert / extern (kein Code-Task hier)

- **ThanksView „Nächstes Event"-Block** — wartet auf cozywolf.de-Buchungsflow. Layout-Skelett
  ist vorbereitet (`QQBeamerPage.tsx` ThanksView, Suchwort „LINKS: Platzhalter").
- **`hallo@cozywolf.de`** — Mail tatsächlich einrichten (Frontend-Konstante existiert bereits).
- **cozywolf.de Landing** — Impressum/Datenschutz dort ergänzen (App-seitig sind sie live).
  Siehe `COZYWOLF_LANDING.md`.

## 💬 Braucht Wolf-Input

- **EN-Casing-Audit** — Sentence- vs. Title-Case uneinheitlich (z.B. „Real answer" vs
  „Top 5 — Reveal"). Für gezielte Fixes Screenshots der konkreten Stellen nötig.
- **NBC-Phönix Auto-Translate-Quirk** — DeepL lässt Eigennamen manchmal unübersetzt.
  Aktuell: nach Auto-Translate manuell prüfen. Optional später: Eigennamen-Schutz im Translate-Flow.

## 🔧 Vor Umsetzung gegen aktuellen Code prüfen (evtl. durch Mai-Refactors überholt)

Alte Audit-/Backlog-Notizen. Vor dem Anfassen **re-grepen** — vieles wurde durch die großen
Mai-Refactors (Mod-Cockpit-Compact, Live-Settings-Cleanup, Eurovision-Finale-Redesign,
Autoplay-„durchlaufen-überall") vermutlich schon erledigt oder obsolet.

- **Autoplay Failsafe-Timer (~60s)** für Custom-Pipelines (OnlyConnect/Bluff/HotPotato
  „warte-auf-Backend") — im Mod-Page-Code nicht gefunden, daher wahrscheinlich noch offen.
- **Mod-Page UI-Backlog**: Settings-Dropdown-Refactor · Shift+Space→QUESTION_ACTIVE-Sprung ·
  Streamdeck-Action-Toast bei Hotkey · Show-Controls phasenkontextuelles Hide statt grey-out ·
  Host-Notes als Toast · Teams-List Compact-View während Spielzeit.
- **Polish**: Treppchen-Confetti-Storm (evtl. durch Eurovision-Finale überholt) · 4 Animation-
  Easings (ComebackHL/HotPotato/Bluff/Standard) · Layout-Cap-Bumps · justifyContent-Lücken.
  Memory-Zeilennummern sind veraltet → vor Fix re-grepen.

---

*Erledigte Punkte stehen in der Git-History (`git log --oneline`), nicht hier.*
