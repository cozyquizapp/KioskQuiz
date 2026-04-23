# QQ Rundenplan-Refactor + CozyGuessr-Bugs — TODO

**Status:** in Arbeit (2026-04-23)
**Ziel:** Vom alten Rundenplan (mit Bombe, Place überall, Schild bis Phasenende) auf den neuen, klimaktischen Plan.

---

## Finaler Rundenplan (vom User abgesegnet)

| Runde | Aktionen pro Frage |
|---|---|
| 1 | Place (1 Feld) |
| 2 | Place (2) oder Steal |
| 3 | Place (2) / Steal / **Bann** (frei wählbar, 3 Fragen Lock) / **Schild** (max 2× pro Team, **bis Spielende**) |
| 4 | Steal / Stapel / **Swap** (kein Place mehr) |
| Comeback | Place 1 / Steal 1 — **Cap auf 3 Felder** (Joker bleibt aktiv aber gecappt) |

**Joker (2×2):** unverändert, max 2 pro Spiel pro Team.

---

## Phase A — CozyGuessr Bugs (kleiner separater Commit, ZUERST)

- [ ] **Bug 1**: Neue Avatare fehlen auf der CozyGuessr-Karte (Reveal). Map-Marker zeigen alte Avatare/Farben.
- [ ] **Bug 2**: km-Zahlen in der rechten Spalte des CozyGuessr-Reveals + Nummerierung sollen die normale Quiz-Font verwenden (nicht die aktuelle Spezial-Font).

Files (vermutlich): QQBeamerPage.tsx (Reveal-View), evtl. eine GuessrMap-Komponente.

---

## Phase B — Rundenplan-Refactor (großer Commit)

### B1. Bombe komplett entfernen
- [ ] Backend `qqRooms.ts`: `BOMB`-Action raus, `qqBombCell` handler raus, `bombUsed` flag raus, `BOMB_1` aus `pendingAction`-Union
- [ ] Backend `qqSocketHandlers.ts`: `qq:bombCell` listener raus
- [ ] Shared types: `BOMB_1` aus PendingAction-Union, `bombUsed` aus PhaseStats
- [ ] Frontend `QQTeamPage.tsx`: Bomb-Button im Action-Menü raus, Bomb-Cell-Click raus, Bomb-Overlay raus, `BOMB` aus FreeAction
- [ ] Frontend `QQModeratorPage.tsx`: BOMB_1 aus actionLabel raus
- [ ] Frontend `QQBeamerPage.tsx`: BOMB-Erwähnungen aus Regeln/Intros raus
- [ ] Backend `qqDummyAI.ts`: BOMB-Action raus, `bombUsed` raus
- [ ] Sound-Slots: BOMB sound — wenn vorhanden, raus oder umwidmen

### B2. Schild: Lifetime → bis Spielende, Limit 2× pro Team
- [ ] Backend: `shieldUsed: boolean` → `shieldsUsed: number` (count), Cap bei 2
- [ ] `shielded` flag auf Cell: Reset am Phasen-Ende ENTFERNEN, bleibt permanent bis Spielende
- [ ] Phase-Start-Reset von `shielded` raus
- [ ] Frontend: Schild-Button im Action-Menü zeigt verbleibende Schilde (z.B. "2/2"), disabled wenn 0 übrig
- [ ] Schild-Overlay-Text in Team-View: "bis Spielende" statt "bis Phasenende"
- [ ] Regeln & Round-Intros: "Schild — schützt 1 Feld bis Spielende, 2× pro Team"

### B3. Sanduhr → Bann (Rename + Budget weg)
- [ ] Texte überall: "Sanduhr", "Sanduhr-Sperre" → "Bann" (DE) / "Ban" (EN)
- [ ] Action-Kind bleibt intern `SANDUHR` (kein Break der Sockets), nur Display-Strings ändern
- [ ] Backend: `sandUsed` flag entfernen — Bann ist pro Frage frei wählbar wie Place/Steal
- [ ] `sandLockTtl = 3` bleibt unverändert (3 Fragen Lock)
- [ ] Icon: Sanduhr-PNG bleibt (`marker-sanduhr` etc.)
- [ ] Dummy AI: `sandUsed`-Check raus, Bann immer wählbar in R3+

### B4. Runde 4 Action-Gates
- [ ] Backend: PLACE in R4 → blockieren (action gate)
- [ ] Frontend: Place-Button in R4-Menü ausblenden
- [ ] SWAP existiert bereits, in R4 freischalten (war eh R4)
- [ ] STAPEL bleibt R4
- [ ] STEAL bleibt R4
- [ ] R4-Menü zeigt: Steal / Swap / Stapel (3 Buttons)

### B5. Comeback Cap auf 3
- [ ] `qqComebackAutoApplySteal` (qqRooms.ts:1954): max 3 Targets, bei mehr Leadern random pick
- [ ] Comeback-PLACE_2 + Joker-Bonus: Joker-Bonus während Comeback auf max +1 statt +2 (so dass Place_2 + Joker ≤ 3)
- [ ] Logik prüfen wo Joker-Bonus während Comeback addiert wird

### B6. Regeln + Round-Intros + UI-Texte
- [ ] `buildRulesSlidesDe/En` (QQBeamerPage.tsx ~954): Bombe raus, "Bann" statt "Sanduhr-Sperre", Schild-Lifetime "bis Spielende, max 2"
- [ ] `ROUND_RULES[3]` und `[4]`-Texte aktualisieren
- [ ] PHASE_INTRO-Texte für R3/R4 anpassen
- [ ] Moderator-Page Action-Labels (`actionLabel` ~1906) prüfen

### B7. Dummy AI Anpassungen
- [ ] `qqDummyAI.ts`: BOMB raus
- [ ] Schild-Limit-Check: shieldUsed → shieldsUsed < 2
- [ ] Bann (SANDUHR): kein sandUsed-Check mehr
- [ ] R4: keine PLACE-Aktionen mehr enumerieren

---

## Sound für Bann (Optional, später)
- Aktuell vermutlich `sanduhr.wav` slot — ggf. umbenennen zu `bann.wav` oder Slot-Label updaten.

---

## Commits-Plan
1. `fix(qq): cozyguessr reveal — neue avatare auf karte + normale font für km/nummerierung`
2. `feat(qq): rundenplan v2 — bombe raus, schild bis spielende (2x), bann unbudgetiert, R4 swap statt place, comeback cap 3`

(Wenn der Refactor zu groß wird, in 2-3 commits splitten: Bombe-Removal, Schild-Lifetime, R4-Gates+Comeback.)
