# Voting / „Top-Antworten" — Bau-Spec (Cozy Arena)

**Format:** Freitext-Top-Antworten im Family-Feud-Stil. Alle tippen frei EIN Wort, gleiche
Antworten werden gebündelt, eine Top-5-Tafel deckt auf, Fraktionen punkten wenn ihre Antwort
auf der Tafel steht. Wolfs „Lieblingspizza"-Idee.

**Interner kind:** `bunteTuete.kind = 'crowdTop'` (neue Bunte-Tüte-Unterart, Vorbild `top5`).
**Player-Name (DE):** „Top-Antworten" bzw. „Die Menge sagt…" (final von Wolf).
**Status:** Draft — zwei offene Entscheidungen unten (⚠️ vor Implementierung).
**Geräte-Schwelle:** sinnvoll ab ~10–12 Handys, richtig gut ab 15–20+ (siehe Memory).

---

## 1. Spielablauf (aus Spielersicht)

1. Beamer zeigt die Frage: *„Nenne eine Pizza-Zutat."* Timer ~25 s.
2. Jedes Handy berät im Team und tippt **EIN freies Wort** ab (kein Zeitdruck fürs Punkten).
3. Reveal: eine Tafel mit bis zu 5 Slots deckt von unten nach oben auf (Family-Feud-„Ding"):
   `1. Salami (34)` · `2. Käse (28)` · `3. Champignon (19)` … + „12 weitere Antworten".
4. Pro Slot leuchten die Fraktionen auf, die diese Antwort genannt haben (Wappen-Cluster).
5. Punkte fließen in die Bar-Race-Wertung.

---

## 2. Datenmodell

Neuer kind in `shared/quarterQuizTypes.ts` (Bunte-Tüte-Union + `QQQuestion.bunteTuete`):

```ts
// bunteTuete.kind erweitern:
kind: 'hotPotato' | 'top5' | 'order' | 'onlyConnect' | 'map' | 'bluff' | 'crowdTop'

// Neue Felder auf bunteTuete (nur bei kind='crowdTop' genutzt):
crowdTop?: {
  answers: Array<{           // vom Autor vorgegebene erwartbare Antworten (bis 8)
    label: string;           // Anzeige auf der Tafel, z.B. "Salami"
    labelEn?: string;
    aliases: string[];       // Synonyme/Schreibweisen, z.B. ["salami","peperoni-salami"]
    aliasesEn?: string[];
  }>;
  // Board-Rang ergibt sich zur LAUFZEIT aus der Stimmen-Anzahl, NICHT aus der Autor-Reihenfolge.
}
```

**Warum vorgegeben (pre-seeded) statt rein emergent:** eine „Synonym-Liste je Frage" (Wolf-Wahl)
setzt bekannte Antworten voraus. Deterministisch, kein Live-Clustering-KI nötig, Autor behält
Kontrolle. Downside: eine nicht vorgesehene Antwort punktet nicht — abgefedert durch den
„sonstiges"-Zähler + optionale Auto-Surface (siehe Entscheidung A).

---

## 3. Builder-Felder

Andockpunkt: `QQBuilderPage.tsx` → `BunteTueteFields()` (~Z. 2623-2892), neuer Zweig
`kind==='crowdTop'` analog zum top5-Editor (Z. 2645-2665). Vorbild für Synonyme: OnlyConnects
`acceptedAnswers` (Z. 2819).

Felder pro Frage:
- **Frage-Text** DE/EN (Standard, `text`-Section).
- **Erwartbare Antworten** (2–8 Zeilen), je Zeile:
  - `label` (DE) + `labelEn`
  - `aliases` — Komma-getrennt, DE (+ `aliasesEn`)
- Hinweis-Text im Editor: „Antworten müssen NICHT in Reihenfolge — die Tafel sortiert nach
  Stimmen. Aliase großzügig pflegen (Tippfehler, Singular/Plural, Synonyme)."
- Kein Bild-Pflichtfeld.

`makeEmptyQuestion()` (Z. 264-277): `crowdTop`-Default mit 4 leeren Antwort-Zeilen anlegen.
Beim kind-Wechsel: Confirm-Dialog + Reset wie bei den anderen (Z. 2557-2583).

---

## 4. Eingabe am Handy (/team)

Andockpunkt: `AnswerInput`-Router `CozyQuizTeamQuestionCard.tsx:172-200` → neuer Zweig für
`crowdTop`, rendert das bestehende **Freitext-`TextInput`** (nicht numeric), Event unverändert
`qq:submitAnswer {roomCode,teamId,answer}`.

⚠️ **Mobile-P1 (aus Ergonomie-Audit) — für dieses Format nötig:**
- `StandardInput` (`CozyQuizTeamInputs.tsx:65-85`) neue Props durchreichen:
  `autoCorrect="off" autoCapitalize="off" spellCheck={false}` — sonst macht iOS aus „Kohl"→„Kohle".
- `maxLength≈24` an `TextInput` weiterreichen (ein Wort, kein Satz).
- Auto-Focus-Policy: im Groß-Modus fokussieren sonst alle Handys gleichzeitig → Frage von Tastatur
  verdeckt. Für `crowdTop` Auto-Focus **weglassen** (erst Tap öffnet Tastatur).

Revoke/„Antwort ändern" (`SubmittedBadge` + `onRevoke`) greift automatisch — deckt 1-Handy/3-Leute ab.

---

## 5. Backend: Normalizer + Bündelung + Wertung

### 5.1 Normalizer (neu, z.B. `qqRooms.ts` Helfer)
```
normalize(s) = s
  .toLowerCase().trim()
  .replace(mehrfach-whitespace → ' ')
  .replace(führende Artikel "der|die|das|ein|eine|the|a " → '')
  .foldUmlauts (ä→ae, ö→oe, ü→ue, ß→ss)   // konsistent für Match
  .replace(Satzzeichen → '')
```
Match: normalisierte Eingabe == normalisiertem `label` ODER einem normalisierten `alias`
→ fällt in diesen Bucket. Sonst → `sonstiges`.

### 5.2 Bündelung & Board
- Zähle Stimmen je Bucket über ALLE Handy-Abgaben (`room.answers`, `qqRooms.ts:1018`).
- Sortiere Buckets nach Stimmen absteigend → Board = Top 5 (Klein-Fallback: Top 3).
- `sonstiges` = Summe unmatched (nur als Zähler angezeigt, nicht scorebar in v1).

### 5.3 Wertung
**Kleingruppe:** Dispatcher `qqEvaluateAnswers` (`qqRooms.ts:1390`), neue `evalCrowdTop()`.
Ein Team = eine Abgabe = ein Board-Slot (oder sonstiges=0).
**Arena/Fraktionen:** in `qqMegaEventScore` (`qqRooms.ts:2213-2305`) einhängen — gleiche Form
wie bestehende Mega-Wertung: Fraktion-perf = Summe der Slot-Punkte ihrer Handys; Fraktionen
ranken; `+1 Basis` bei perf>0, Top-5-Fraktionen zusätzlich `[5,4,3,2,1]`.

⚠️ **Slot→Punkte:** siehe Entscheidung B unten.

---

## 6. Reveal-View (Beamer)

Neue Komponente `frontend/src/components/reveals/CrowdTopReveal.tsx`, Vorbild `Top5Reveal.tsx`.
Dispatch-Zweig in `CozyQuizQuestionView.tsx` (~Z. 1292):
```tsx
const isCrowdTop = revealed && q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'crowdTop';
if (isCrowdTop) return <CrowdTopReveal state={s} lang={lang} />;
```
Layout:
- **Links:** Frage + (Arena) Sieger-Fraktion.
- **Rechts:** Tafel, 5 Slots, Cascade von unten (#5→#1), je Slot: Rang · Antwort · Stimmen-Balken ·
  `FactionCountAvatars` der Nenner (`QQFactionCrest.tsx:25`, Fraktions-Bündelung `qqFactionBuckets`
  `qqShared.ts:93` greift schon). Unten „N weitere Antworten".
- `isMega` (nestedTeams | doppelte avatarIds) wie in Top5Reveal.

---

## 7. Autoplay-Timing

`QQModeratorPage.tsx:783-1016`, neuer QUESTION_REVEAL-Zweig für `crowdTop`:
~2400 ms/Slot (wie Top5) → 5 Slots ≈ 12 s + Intro. largeGroupMode-Stretch ×1.3 greift (Z. 943).
Sound je Slot: bestehendes `playAvatarCascadeNote()` + `playRevealHighlight()` (ersetzbar).

---

## 8. Staged Build (jede Stufe end-to-end per Bots testbar)

1. **Types + Builder** — `crowdTop`-Frage anlegbar & speicherbar (Draft).
2. **/team-Eingabe** — Freitext-Wort + Mobile-P1-Fixes + Submission.
3. **Backend Normalizer + Bündelung + Wertung (Kleingruppe)** — Punkte fließen.
4. **Reveal-View** — Tafel-Cascade auf dem Beamer.
5. **Arena-Fraktions-Aggregation** — Wappen-Cluster + Mega-Scoring.
6. **Autoplay + Sound + Politur.**

⚠️ **Ab Stufe 3 Backend-Änderung → Coolify-Redeploy beim Ship** (Push allein reicht nicht).

---

## 9. ✅ Design-Entscheidungen (Wolf, 2026-07-04 — GESETZT)

**A — Antwort-Modell: Vorgegeben + Auto-Surface.** Autor gibt erwartbare Antworten + Synonyme vor
(deterministisch scorebar). ZUSÄTZLICH: unmatched Abgaben werden nach normalisiertem String
gruppiert; erreicht ein Auto-Cluster einen Schwellwert (z.B. ≥3 Stimmen ODER genug für einen
Top-5-Platz), erscheint es als eigener Board-Slot und ist ebenfalls scorebar. So punktet auch eine
nicht vorgesehene Antwort, die viele identisch tippen. `sonstiges` = Rest darunter (nur Zähler).

**B — Punkte: Rang-basiert `[5,4,3,2,1]`.** Board-Platz 1 = 5 … Platz 5 = 1. Konsistent mit dem
Arena-Speed-Bonus (`qqLargeGroupAwardPoints`/`qqMegaEventScore`). Fraktion-perf = Summe der
Slot-Punkte ihrer Handys; `+1 Basis` bei perf>0; Top-5-Fraktionen zusätzlich `[5,4,3,2,1]` (wie
bestehende Mega-Wertung).
