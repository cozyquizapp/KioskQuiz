# Handoff: Connect-Welle + Steal-Ruck → CozyQuizGridDisplay.tsx

**Ziel:** Zwei neue Beamer-Effekte vorsichtig in die bestehende App einbauen, ohne
funktionierende Logik umzubauen. Beide Änderungen sind **rein additiv** (neue
Keyframes + neue Overlay-Layer + ein neues Ref) und **vollständig reversibel**.

Prototyp/Referenz: `CozyQuiz Beamer Effekt-Labor.dc.html` (Tempo & Easing sind dort final getunt).

> **Goldene Regel für diesen Einbau:** Bestehende Animationen (`cellInkFill`,
> `cellShockwave`, `cellSparkle`, `cellShard`, `cellEmojiDrop`, `cellNeighborDuck`,
> `boardShake`) bleiben **unangetastet**. Wir ergänzen, wir ersetzen nichts.
> Jede der zwei Effekte ist einzeln ein- und ausbaubar.

---

## Kontext: wie der bestehende Code tickt (zur Sicherheit)

In `frontend/src/components/CozyQuizGridDisplay.tsx`:

- Beim Grid-Diff (`if (gridKey !== prevGridRef.current)`, ~Z.91) werden befüllt:
  - `newCellsRef.current` = Set von `"r-c"` neu platzierter Felder (vorher leer)
  - `stolenCellsRef.current` = Set von `"r-c"` geklauter Felder (Besitzerwechsel)
  - `neighborCellsRef.current` = 4-Nachbarn der geänderten Felder
  - Danach `setShakeTick(...)` + ein `setTimeout(... , 1200)` der die Refs leert.
- Im Render bekommt jede Zelle:
  - **Color-Layer-Div** (~Z.317–338): `animation: (isNew||isStolen) ? 'cellInkFill 0.9s var(--qq-ease-out-cubic) both' : undefined`
  - **Avatar-Wrapper-Div** (~Z.575): `animation: (isNew||isStolen) ? 'cellEmojiDrop 0.6s var(--qq-ease-bounce) 0.3s both' : undefined`
  - **Bridges** (`nRight`/`nBottom` Divs, ~Z.341–358) mit `background: bridgeBg`.
- Keyframes leben global in **`frontend/src/main.css`** (NICHT in der Komponente).

**Wichtige Subtilität (betrifft Steal):** Wenn das Diff feuert, ist `cell.ownerId`
**schon der neue Besitzer**. Der Avatar-Wrapper rendert also bereits das klauende
Team. Den *alten* Avatar „rauszureißen" geht nur, wenn wir den `prevOwner` (den der
Diff-Block kennt) kurz als Ghost weiterrendern. Siehe Steal-Stufe B.

---

# EFFEKT 1 — Gebiet-Connect-Welle  ⭐

**Was es macht:** Wenn ein neu platziertes Feld ein zusammenhängendes Team-Gebiet
bildet/erweitert, läuft eine Glow-Welle vom Auslöser-Feld durch das ganze
verbundene Gebiet (BFS-Distanz = Verzögerung pro Feld). Die Brücken zwischen den
Feldern blitzen mit. Liest sich als „die Felder erkennen sich gegenseitig".

Rein additiv: ein neues Ref (`waveDelayRef`), ein Block im bestehenden Diff, ein
neuer Overlay-Layer pro Zelle. Keine bestehende Zeile wird ersetzt.

### 1a) Keyframes → ans Ende von `frontend/src/main.css` anhängen

```css
/* ── Connect-Welle (CozyQuizGridDisplay) ─────────────────────────────── */
@keyframes cellConnectWave {
  0%   { opacity: 0;   transform: scale(0.92); }
  35%  { opacity: 0.85; transform: scale(1.06); }
  100% { opacity: 0;   transform: scale(1); }
}
@keyframes bridgeConnectFlash {
  0%   { filter: brightness(1); }
  40%  { filter: brightness(2.4) saturate(1.25); }
  100% { filter: brightness(1); }
}
```

### 1b) Neues Ref deklarieren — neben den bestehenden Refs (~Z.87–89)

NACH `const neighborCellsRef = useRef<Set<string>>(new Set());` einfügen:

```ts
  // Connect-Welle: cellKey → Verzögerung (ms) für die gestaffelte Glow-Welle.
  const waveDelayRef = useRef<Map<string, number>>(new Map());
```

### 1c) Welle im bestehenden Diff-Block berechnen

Im `if (gridKey !== prevGridRef.current) { ... }`-Block, **direkt vor**
`newCellsRef.current = newSet;` (~Z.114) einfügen:

```ts
    // ── Connect-Welle: BFS über das verbundene Gebiet jedes neuen Feldes ──
    const waveDelays = new Map<string, number>();
    const STEP_MS = 140;          // Abstand zwischen den Wellen-Ringen
    const ownerAt = (r: number, c: number): string | null => {
      if (r < 0 || c < 0 || r >= s.gridSize || c >= s.gridSize) return null;
      return s.grid[r][c].ownerId ?? null;
    };
    newSet.forEach(key => {
      const [sr, sc] = key.split('-').map(Number);
      const owner = ownerAt(sr, sc);
      if (!owner) return;
      // BFS nur über gleichfarbige, verbundene Felder
      const seen = new Set<string>([key]);
      const queue: Array<[number, number, number]> = [[sr, sc, 0]];
      while (queue.length) {
        const [r, c, d] = queue.shift()!;
        const prev = waveDelays.get(`${r}-${c}`);
        if (prev === undefined || d * STEP_MS < prev) waveDelays.set(`${r}-${c}`, d * STEP_MS);
        for (const [nr, nc] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]] as const) {
          const k = `${nr}-${nc}`;
          if (!seen.has(k) && ownerAt(nr, nc) === owner) { seen.add(k); queue.push([nr, nc, d + 1]); }
        }
      }
    });
    waveDelayRef.current = waveDelays;
```

Und im bestehenden `setTimeout(() => { ... }, 1200)` (der die Refs leert) eine Zeile ergänzen:

```ts
      setTimeout(() => {
        newCellsRef.current = new Set();
        stolenCellsRef.current = new Set();
        neighborCellsRef.current = new Set();
        waveDelayRef.current = new Map();   // ← NEU
      }, 1200);
```

### 1d) Overlay-Layer im Render — pro Zelle

In der Cell-Render-Funktion, am einfachsten direkt **nach** dem Color-Layer-Div
(dem `<div>` mit `animation: (isNew||isStolen) ? 'cellInkFill ...'`, ~Z.338 schließendes `/>`).
Du hast dort `team`, `r`, `c`, `cellRadius`, `tColor` im Scope:

```tsx
                  {/* Connect-Welle Glow-Overlay (nur während Welle aktiv) */}
                  {waveDelayRef.current.has(`${r}-${c}`) && (
                    <div style={{
                      position: 'absolute', inset: -2, borderRadius: fusedRadius,
                      background: `radial-gradient(circle, ${tColor}cc 0%, transparent 70%)`,
                      animation: `cellConnectWave 0.6s ease-out ${waveDelayRef.current.get(`${r}-${c}`)}ms both`,
                      pointerEvents: 'none', zIndex: 4,
                    }} />
                  )}
```

> Verwende denselben Radius-Namen wie der Color-Layer (im File `fusedRadius`).
> `tColor` ist die Team-Hexfarbe; `${tColor}cc` = ~80% Alpha.

### 1e) (Optional, empfohlen) Brücken mitblitzen

An den beiden Bridge-Divs (`nRight` & `nBottom`, ~Z.341–358) jeweils die Welle
durchreichen — `animation` ergänzen, wenn die anliegende Zelle in der Welle ist:

```tsx
                  {nRight && (
                    <div style={{
                      position: 'absolute', right: -gap - 1, top: bridgeOffset,
                      width: gap + 2, height: bridgeSpan, background: bridgeBg,
                      zIndex: 2, pointerEvents: 'none',
                      animation: waveDelayRef.current.has(`${r}-${c}`)
                        ? `bridgeConnectFlash 0.44s ease-out ${waveDelayRef.current.get(`${r}-${c}`)}ms both`
                        : undefined,
                    }} />
                  )}
```

(analog für `nBottom`.)

**Risiko:** sehr niedrig. Alles additiv; wenn `waveDelayRef` leer ist (Normalfall),
rendert nichts Zusätzliches. Bestehende Place-Animation läuft unverändert weiter.

---

# EFFEKT 2 — Steal mit „Ruck"

**Was es heute tut:** Ein geklautes Feld läuft durch denselben Pfad wie ein platziertes
(`cellInkFill` + `cellEmojiDrop`) plus Shards/Shockwave/Neighbor-Duck/Shake.

**Was wir hinzufügen:** Ein spürbarer „Ruck" — neue Farbe wischt über die alte und
der neue Avatar *knallt* rein (statt sanft zu droppen). Zwei Stufen, nach Risiko.

## Stufe A — Slam + Farb-Wipe (minimal, empfohlen zum Start)

Kein struktureller Eingriff. Wir geben **geklauten** Feldern andere Keyframes als
platzierten. Risiko: minimal.

### A1) Keyframes → ans Ende von `main.css`

```css
/* ── Steal-Ruck (CozyQuizGridDisplay) ────────────────────────────────── */
@keyframes cellStealWipe {
  0%   { clip-path: circle(0% at 16% 16%); }
  100% { clip-path: circle(170% at 16% 16%); }
}
@keyframes cellStealSlam {
  0%   { transform: scale(1.7); opacity: 0; }
  55%  { transform: scale(0.9); opacity: 1; }
  78%  { transform: scale(1.08); }
  100% { transform: scale(1); opacity: 1; }
}
```

### A2) Color-Layer: bei Steal die Wipe-Animation fahren (~Z.335)

VORHER:
```tsx
                    animation: (isNew || isStolen) ? 'cellInkFill 0.9s var(--qq-ease-out-cubic) both' : undefined,
```
NACHHER:
```tsx
                    animation: isStolen
                      ? 'cellStealWipe 0.6s var(--qq-ease-out-cubic) both'
                      : isNew
                        ? 'cellInkFill 0.9s var(--qq-ease-out-cubic) both'
                        : undefined,
```

### A3) Avatar-Wrapper: bei Steal slammen statt droppen (~Z.575)

VORHER:
```tsx
                  animation: (isNew || isStolen) ? 'cellEmojiDrop 0.6s var(--qq-ease-bounce) 0.3s both' : undefined,
```
NACHHER:
```tsx
                  animation: isStolen
                    ? 'cellStealSlam 0.5s var(--qq-ease-bounce) 0.18s both'
                    : isNew
                      ? 'cellEmojiDrop 0.6s var(--qq-ease-bounce) 0.3s both'
                      : undefined,
```

Das war's für Stufe A. Shards/Shockwave/Neighbor-Duck/Shake bleiben wie sie sind und
verstärken den Ruck zusätzlich.

## Stufe B — Alter Avatar wird rausgerissen (optional, mehr Wow, mehr Risiko)

Nur machen, wenn Stufe A sitzt. Zeigt zusätzlich den *alten* Avatar, der mit Trail
rausfliegt, bevor die Farbe wischt. Erfordert, den `prevOwner` der geklauten Felder
kurz mitzurendern.

### B1) Keyframe → `main.css`

```css
@keyframes cellStealYank {
  0%   { transform: translate(0,0) scale(1) rotate(0); opacity: 1; }
  100% { transform: translate(-22%, -26%) scale(0.3) rotate(-180deg); opacity: 0; }
}
```

### B2) prevOwner pro geklautem Feld stashen

Im Diff-Block, wo `stolenSet.add(...)` passiert, parallel eine Map füllen:

```ts
  const stolenPrevRef = useRef<Map<string, string>>(new Map());  // neben den anderen Refs deklarieren
```
```ts
    // in der s.grid.forEach-Schleife, im else-if-Zweig für Steal:
    else if (cell.ownerId && prevOwner && prevOwner !== cell.ownerId) {
      stolenSet.add(`${r}-${c}`);
      stolenPrev.set(`${r}-${c}`, prevOwner);   // stolenPrev = new Map() oben im Block anlegen
    }
```
`stolenPrevRef.current = stolenPrev;` setzen und im 1200ms-Cleanup mit leeren.

### B3) Ghost-Avatar des alten Teams rendern

Im Avatar-Bereich, vor dem normalen Avatar, wenn `isStolen` und ein prevOwner
existiert: den alten Team-Avatar als absolut positionierten Ghost mit
`animation: 'cellStealYank 0.5s cubic-bezier(.45,0,.7,.35) both'` rendern.
Team-Lookup: `s.teams.find(t => t.id === stolenPrevRef.current.get(\`${r}-${c}\`))`.
Avatar-Komponente/Slug analog zum bestehenden Avatar-Render verwenden.

> Stufe B ist visuell am stärksten, fügt aber einen bedingten Render-Zweig hinzu.
> Wenn ihr Zeit/Risiko knapphaltet: Stufe A liefert schon ~80 % des Effekts.

---

## Testabfolge (vorsichtig verifizieren)

1. **Build/Typecheck** muss sauber sein (`waveDelayRef`, evtl. `stolenPrevRef` korrekt typisiert).
2. **Place:** Feld platzieren → bestehende InkFill/Drop **unverändert**; zusätzlich
   läuft die Connect-Welle durchs verbundene Gebiet (bei isolierten Feldern: nur 1 Ring).
3. **Steal:** Feld klauen → Wipe + Slam statt sanftem Drop; Shards/Shake wie bisher.
4. **Performance:** Großes Gebiet (>15 Felder) → Welle bleibt flüssig (Overlay ist
   1 Div/Zelle, läuft nur während der 1200ms-Fensters).
5. **Andere Effekte** (Joker, Frost, Stack, Idle-Pulse) müssen unberührt laufen.

## Rollback

- **Connect-Welle aus:** den Overlay-Block (1d/1e) entfernen ODER `waveDelayRef`
  nie befüllen (1c weglassen). Keyframes dürfen bleiben (ungenutzt = harmlos).
- **Steal-Ruck aus:** A2/A3 auf die alten Ternaries zurücksetzen. Fertig.

## Tuning (aus dem getunten Prototyp)

- `STEP_MS = 140` → Wellen-Tempo. Höher = langsamer/ruhiger.
- `cellConnectWave` Dauer `0.6s`, Easing `ease-out`.
- `cellStealSlam` Delay `0.18s` (nach dem Wipe-Start), Bounce-Easing.
- Connect-Welle Glow-Alpha: `${tColor}cc` (~80 %). Dezenter: `99` (~60 %).
