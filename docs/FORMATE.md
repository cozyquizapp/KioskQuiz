# Wo CozyQuiz und CrowdQuiz auseinanderlaufen

Erzeugt am 2026-08-29 von `scripts/formate-vergleich.mjs`. **Nicht von Hand pflegen.**
Neu erzeugen mit `node scripts/formate-vergleich.mjs`.

Wolf 2026-08-29: „wichtig waere vlt einmal die UNTERSCHIEDE zwischen cozyquiz
und crowdquiz zu identifizieren, anhandessen kann entschieden werden, was
gewollt und was nicht ist."

## Wie das hier zu lesen ist

**Teil 1** sind die Stellen, die CrowdQuiz zu CrowdQuiz machen: die Regeln auf
dem Server und die Register. Nur die kann man abwaehlen, und nur dort ist
„gewollt oder nicht" ueberhaupt eine sinnvolle Frage. Vollstaendig, mit dem,
was jeweils passiert.

**Teil 2** sind die Folgen in den Ansichten. Die entscheidet man nicht einzeln,
die liest man nach, wenn eine Folie komisch aussieht. Eine Zeile je Weiche.

Das Zitat hinter einer Weiche ist der Kommentar, der im Code darueber steht.
Dort stehen meist Datum und Begruendung.

Eine Weiche, die mit `nur ueber einen lokalen Alias gefunden` markiert ist,
nennt das Format nicht selbst. Fast jede Ansicht schreibt es sich einmal in
eine eigene Variable (`const largeGroup = ...`) und fragt danach nur die ab -
ohne diese Spur faende man von einer Ansicht keine einzige Weiche. Der Preis
ist Genauigkeit: heisst eine Variable zufaellig so, rutscht sie mit durch.
Deshalb markiert statt versteckt.

⚠️ **Was hier NICHT steht, und das ist die wichtigere Haelfte.** Nur
Unterschiede, die im Code als Weiche STEHEN. Nicht gefunden werden:

* Unterschiede, die daraus entstehen, dass dieselbe Ansicht mit vierzig statt
  acht Teams laeuft (Zeilenhoehen, Umbrueche, Gedraenge).
* Alles, was in CrowdQuiz FEHLT, ohne dass es jemand abgeschaltet hat.
* Text, der in CrowdQuiz schlicht falsch ist, weil er von CozyQuiz erzaehlt.

Dafuer gibt es die Bild-Werkzeuge: `crowd-abgleich.mjs` (der Abend, Station
fuer Station), `crowd-ankommen.mjs` (die Diaschau) und `crowd-zeremonie.mjs`
(die Siegerehrung Takt fuer Takt).

**409 Weichen** in 38 Dateien:
46 definierende, 363 in den Ansichten.

---

# Teil 1: Was CrowdQuiz zu CrowdQuiz macht


## Regeln des Spiels (Server) (23)


### `backend/src/quarterQuiz/qqRooms.ts`

**Zeile 230**

```ts
megaAwards?: import('../../../shared/quarterQuizTypes').QQMegaAwards | null;
```

**Zeile 651**

```ts
const maxTeams = room.largeGroupMode ? QQ_MAX_TEAMS_LARGE : QQ_MAX_TEAMS;
```

**Zeile 652**

```ts
if (existingCount >= maxTeams) {
  throw new QQError('ROOM_FULL', `Maximale Teamanzahl (${maxTeams}) erreicht.`);
```

`nur ueber einen lokalen Alias gefunden, kann ein Fehltreffer sein`

**Zeile 665**

```ts
if (room.largeGroupMode) {
  const factionIds = QQ_MEGA_FACTIONS.map(f => f.avatarId);
  const counts = new Map<string, number>(factionIds.map(id => [id, 0]));
  for (const t of Object.values(room.teams)) {
  const c = counts.get(t.avatarId);
  if (c !== undefined) counts.set(t.avatarId, c + 1);
  }
  const min = Math.min(...factionIds.map(id => counts.get(id) ?? 0));
  const requested = counts.get(avatarId);
  if (requested === undefined || requested > min) {
  effectiveAvatarId = factionIds.find(id => (counts.get(id) ?? 0) === min) ?? avatarId;
  }
```

**Zeile 683**

```ts
if (avatarTaken && !room.largeGroupMode) {
  throw new QQError('AVATAR_TAKEN', 'Diese Farbe ist bereits vergeben.');
```

**Zeile 691**

```ts
if (emoji && emoji.trim() && !room.largeGroupMode) {
  const emojiTaken = Object.values(room.teams).some(t => t.emoji === emoji);
  if (emojiTaken) {
  throw new QQError('EMOJI_TAKEN', 'Dieses Emoji ist bereits vergeben.');
  }
```

> Emoji exclusivity: bei explizitem Override darf der Emoji nicht schon von einem anderen Team gewaehlt worden sein. Bei kein-Override wird der Default aus dem Set genommen (Set-eigene Eindeutigkeit ueber Slot-Index). Mega Event: mehrere Sub-Teams teilen Faktion (Avatar/Emoji) + Faktions-Namen → Emoji-/Namens-Eindeutigkeit hier relaxen (Unterscheidung via „Handy N").

**Zeile 700**

```ts
if (nameLower && !room.largeGroupMode) {
  const nameTaken = Object.values(room.teams).some(t => (t.name ?? '').trim().toLowerCase() === nameLower);
  if (nameTaken) {
  throw new QQError('NAME_TAKEN', 'Dieser Team-Name ist bereits vergeben.');
  }
```

**Zeile 716**

```ts
const finalName = reassigned ? qqMegaFactionName(effectiveAvatarId, factionLang) : teamName;
```

**Zeile 718**

```ts
? qqMegaFactionSlug(effectiveAvatarId)
```

**Zeile 872**

```ts
if (isArenaStart) {
  const before = processedQuestions.length;
  processedQuestions = processedQuestions.filter(
  q => !(q.category === 'BUNTE_TUETE'
  && (QQ_BUNTE_TUETE_COZY_ONLY as readonly string[]).includes(
  (q as any).bunteTuete?.kind ?? '')),
  );
  const removed = before - processedQuestions.length;
  if (removed > 0) console.log(`[arena] ${removed} Frage(n) nur-CozyQuiz-Mechanik im Gross-Modus herausgefiltert.`);
```

`nur ueber einen lokalen Alias gefunden, kann ein Fehltreffer sein`

**Zeile 977**

```ts
room.largeGroupMode = largeGroupMode === true || nestedTeams === true;
```

> 2026-07-01: Groß-Gruppen-Modus aus Draft. Default off. 2026-07-02 (Wolf): Mega Event = IMMER genestet (flaches 25er verworfen) — largeGroupMode und nestedTeams sind gekoppelt (large ⟺ nested).

**Zeile 985**

```ts
if (room.largeGroupMode) {
  room.finalWagerEnabled = false;
  room.connectionsEnabled = false;
  room.comebackEnabled = false;
```

> 2026-07-01: Groß-Modus deaktiviert grid-basierte End-Game-Mechaniken hart — kein Grid, also würden Comeback (Cell-Steal), Connections-4×4 und Final-Wager (wettet auf Grid-Punkte) crashen bzw. sinnlos laufen. Wolf-Entscheidung: grid-Add-ons im Groß-Modus ausblenden. CozyGames-Auto-Flow ist separat in qqNextQuestion auf !largeGroupMode gegated. Spielverlauf: Runden → GAME_OVER.

**Zeile 996**

```ts
if (room.largeGroupMode) { room.cozyGamesEnabled = false; room.cozyGamesPool = []; }
```

> 2026-07-01: Groß-Modus — CozyGames (grid-Add-on) default aus.

**Zeile 1989**

```ts
if (room.largeGroupMode) return;
```

> 2026-07-02 (Wolf): Hot Potato passt NICHT ins Mega Event (rundenbasiert, ein Team nach dem anderen — bei 8×3 sinnlos). Defensiv: Turn-Mechanik gar nicht starten. Frontend rendert die Frage dann als normale gleichzeitige Frage. Sauberer Weg bleibt: kuratierte Mega-Drafts ohne Hot Potato (Wizard-Filter).

**Zeile 2677**

```ts
if (entries.length === 0) { room.megaAwards = null; return; }
```

**Zeile 2724**

```ts
if (!room.largeGroupMode) {
  throw new QQError('WRONG_PHASE', 'Siegerehrung nur im Arena-Modus.');
```

**Zeile 2742**

```ts
if (room.largeGroupMode) {
  qqMegaEventScore(room);
  room.pendingFor = null;
  room.pendingAction = null;
  room.megaStandingsRevealed = false; // 2026-07-12: Beat A (Wertung) hält, bis Mod weiterdrückt
  room.phase = 'PLACEMENT';
  room.lastActivityAt = Date.now();
  return;
```

> ── Groß-Gruppen-Modus: kein Grid. Speed-Punkte vergeben, dann Standings- ── Beat (Bar-Race) im PLACEMENT-Slot; Beamer rendert das gegated (Stufe 3). pendingFor/pendingAction bleiben null → qqNextQuestion schaltet per Mod- Space direkt weiter (kein Placement-Pending-Block).

**Zeile 4294**

```ts
&& !room.largeGroupMode // Groß-Modus: grid-basierte Add-ons deaktiviert
```

**Zeile 4349**

```ts
if (room.largeGroupMode) { qqComputeMegaAwards(room); room.awardCeremonyStep = 0; }
```

> Mega Event: 3 Faktions-Awards aus den kumulierten Farb-Statistiken.

**Zeile 4498**

```ts
if (room.largeGroupMode) return;
```

> Groß-Gruppen-Modus: kein Grid — totalCells/largestConnected werden per qqLargeGroupAwardPoints direkt als Punkte verwaltet. Ein Grid-Recompute würde sie auf 0 überschreiben, daher hier no-op.

**Zeile 4874**

```ts
avatarSetId: room.avatarSetId ?? qqDefaultAvatarSetId(room.largeGroupMode),
```

> 2026-08-28: hier stand `?? 'all'` - der gewuerfelte Emoji-Mix -, waehrend die Raumanlage 'cozyquiz' setzt. Dieselbe Doppel-Vorgabe wie beim Design eine Zeile darueber. Die Vorgabe haengt am FORMAT: CrowdQuiz hat eigene Fraktions-Wappen, die an Name und Farbe gebunden sind (Wolf: „crowdquiz hat spezifische emojis neu fuer die fraktionen die auch fest sind in namen und farbe").

**Zeile 4888**

```ts
if ((room.avatarSetId ?? qqDefaultAvatarSetId(room.largeGroupMode)) !== 'all') return room.avatarSetEmojis;
```

**Zeile 5021**

```ts
if ((room as any).largeGroupMode) return 4 - 1; // Arena hat ein eigenes Set
```


## Ereignisse (Server) (13)


### `backend/src/quarterQuiz/qqSocketHandlers.ts`

**Zeile 168**

```ts
if (!stuck) {
  if (r._cbOfflineTimer) { clearTimeout(r._cbOfflineTimer); r._cbOfflineTimer = null; }
  r._cbOfflineArmedFor = null;
  return;
```

`nur ueber einen lokalen Alias gefunden, kann ein Fehltreffer sein`

**Zeile 466**

```ts
avatarSetId: room.avatarSetId ?? qqDefaultAvatarSetId(room.largeGroupMode), // 2026-08-28: eine Vorgabe, siehe qqRooms.ts
```

**Zeile 481**

```ts
largeGroupMode: (room as any).largeGroupMode ?? false,
```

> 2026-07-02 (Mega Event): Modus-Flags + 3 Faktions-Awards persistieren, damit Summary/Recap den Groß-Modus sauber erkennen (statt Heuristik) und die Faktions-Awards zeigen können.

**Zeile 482**

```ts
nestedTeams: (room as any).nestedTeams ?? false,
```

**Zeile 483**

```ts
megaAwards: (room as any).megaAwards ?? null,
```

**Zeile 1186**

```ts
qqStartGame(room, payload.questions, payload.language, payload.phases ?? 4, payload.theme, payload.draftId, payload.draftTitle, payload.slideTemplates, payload.soundConfig, payload.connectio
```

> Default 4 statt 3 — die Standard-Drafts (qq-vol-*) sind 4-Runden-Sets, und ein silent-3 wenn frontend den Wert nicht sendet hat schon einmal zu 'nur 3 Runden im Tree' geführt.

**Zeile 1547**

```ts
&& room.largeGroupMode
```

**Zeile 2900**

```ts
if (room.mapRevealStep >= 1 && room.mapRevealStep < 1 + validPinCount) {
  scheduleMapAutoAdvance(payload.roomCode);
```

`nur ueber einen lokalen Alias gefunden, kann ein Fehltreffer sein`

> Nach step 1 (Target gezeigt) Auto-Advance für Pins starten. Nach allPinsStep (alle Pins) stoppen — Moderator entscheidet über Ranking.

**Zeile 3380**

```ts
payload: { roomCode: string; connectionsEnabled?: boolean; shuffleQuestionsInRound?: boolean; cozyGamesEnabled?: boolean; cozyGamesPool?: string[]; comebackEnabled?: boolean; largeGroupMode?
```

**Zeile 3403**

```ts
if (typeof payload.largeGroupMode === 'boolean') {
  room.largeGroupMode = payload.largeGroupMode;
```

**Zeile 3406**

```ts
if (payload.nestedTeams === true) {
  room.largeGroupMode = true;
```

**Zeile 3419**

```ts
if (room.phase === 'LOBBY' && prevLarge !== !!room.largeGroupMode) {
  for (const id of Object.keys(room.teams)) qqKickTeam(room, id);
  const autoSets = ['cozyquiz', 'cozy3d', 'cozyArena', 'cozyAnimals', 'all'];
  const curSet = room.avatarSetId;
  if (!curSet || autoSets.includes(curSet)) {
  room.avatarSetId = room.largeGroupMode ? 'cozyArena' : 'cozyquiz';
  }
```

> 2026-07-14 (Wolf 'wechsel cozyarena<->cozyquiz geht nicht; alle cozyquiz- elemente muessen aktiv sein, sonst fatal'): Arena- und CozyQuiz-Teams sind strukturell UNVEREINBAR — Arena erlaubt doppelte avatarIds (Fraktions-Slots, Unique-Check ist auf !largeGroupMode gegated), Quiz verlangt eindeutige. qqIsMega() erkennt Arena u.a. an genau diesen doppelten avatarIds → nach dem Zurueckschalten blieben echte Arena-Teams li

**Zeile 3432**

```ts
room.avatarSetId = room.largeGroupMode ? 'cozyArena' : 'cozyquiz';
```


## Register und Konstanten (10)


### `shared/quarterQuizTypes.ts`

**Zeile 126**

```ts
&& !(QQ_BUNTE_TUETE_COZY_ONLY as readonly string[]).includes(kind);
```

**Zeile 156**

```ts
|| (!!kind && (QQ_BUNTE_TUETE_ARENA_ONLY as readonly string[]).includes(kind));
```

**Zeile 1687**

```ts
megaAwards?: QQMegaAwards | null;
```

> Mega Event: 3 Faktions-Awards am Spielende (avatarId je Award, null wenn keiner). Vom Backend am Spielende berechnet. */

**Zeile 1826**

```ts
export interface QQStartGamePayload { roomCode: string; questions: QQQuestion[]; language: QQLanguage; phases: 2 | 3 | 4; theme?: QQTheme; draftId?: string; draftTitle?: string; slideTemplat
```

**Zeile 1952**

```ts
return QQ_MEGA_FACTIONS.find(f => f.avatarId === avatarId);
```

**Zeile 1957**

```ts
return f ? (lang === 'en' ? f.mottoEn : f.mottoDe) : '';
```

`nur ueber einen lokalen Alias gefunden, kann ein Fehltreffer sein`

**Zeile 1961**

```ts
return f ? (lang === 'en' ? f.nameEn : f.nameDe) : avatarId;
```

`nur ueber einen lokalen Alias gefunden, kann ein Fehltreffer sein`

**Zeile 1965**

```ts
return qqMegaFaction(avatarId)?.slug;
```

**Zeile 1970**

```ts
return av ? qqMegaFaction(av.id) : undefined;
```

**Zeile 1981**

```ts
export function qqIsMega(s: { teams?: { avatarId: string }[] } & Record<string, any>): boolean {
  if (!s) return false;
  if (s.largeGroupMode || s.nestedTeams) return true;
  const teams = s.teams ?? [];
  return teams.length > 0 && new Set(teams.map(t => t.avatarId)).size < teams.length;
```

> Kanonische CozyArena-/Mega-Erkennung. VORHER divergierten die Checks quer durch den Code (`largeGroupMode` im Moderator vs. `nestedTeams` vs. Avatar-Dedup in den Reveals) → Reveal bündelte auf 8 Fraktionen, Moderator zählte 40 → „Pin 1/40", Auto-Advance über die 8 sichtbaren Pins hinaus, Leaflet-Hänger. Ein Wappen-Slot (avatarId) mehrfach vergeben = Sub-Teams unter einer Fraktion = Mega. Ab jetzt ÜBERALL diese eine F


---

# Teil 2: Die Folgen in den Ansichten

Eine Zeile je Weiche. Zum Nachschlagen, nicht zum Durchentscheiden.


## Buehne (149)


### `frontend/src/components/ArenaBeamerBg.tsx` (1)

* **47** `if (!qqIsMega(s) || isThemed()) return null;`

### `frontend/src/components/AvatarKarussellEditor.tsx` (2)

* **179** `if (!slug) return null;`
* **389** `{factionMode && qqMegaFactionSlug(avatarId) ? (`

### `frontend/src/components/CozyQuizGameOverView.tsx` (1)

* **126** `if ((s as any).largeGroupMode) return <LargeGroupGameOverView state={s} />;`

### `frontend/src/components/CozyQuizLargeGroupView.tsx` (23)

* **173** `const beat: 'question' | 'standings' = hasRanking && !state.megaStandingsRevealed ? 'question' : 'standings';`
* **175** `if (beat === 'question' && hasRanking) {`  →  return <MegaQuestionRanking state={state} ranking={ranking} de={de} />;
* **203** `const name = qqMegaFactionName(r.avatarId, de ? 'de' : 'en');`
* **271** `const sorted = state.nestedTeams ? qqSortedGroups(state) : qqSortedTeams(state);`
* **497** `const name = qqMegaFactionName(it.av!, de ? 'de' : 'en');`
* **591** `const ceremonyFont = arenaLook ? 'var(--font-arena)' : 'var(--font-game)';`
* **681** `<QQTeamAvatar avatarId={t.avatarId} teamEmoji={qqMegaFactionSlug(t.avatarId)} size={big ? 'clamp(42px, 5.2cqw,`
* **708** `<TeamNameLabel name={qqMegaFactionName(t.avatarId, de ? 'de' : 'en')} maxLines={1} shrinkAfter={12} color={t.c`
* **723** `{arenaLook && <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', back`
* **754** `{locked ? qqMegaFactionName(winner.avatarId, de ? 'de' : 'en') : (de ? 'Wer krönt sich?' : 'Who takes the crow`
* **790** `const ceremonyFont = arenaLook ? 'var(--font-arena)' : 'var(--font-game)';`
* **791** `const sorted = state.nestedTeams ? qqSortedGroups(state) : qqSortedTeams(state);`
* **805** `const motto = winner ? qqMegaFactionMotto(winner.avatarId, de ? 'de' : 'en') : '';`
* **837** `const awardBeatBg = (step < crownStep && state.megaAwards)`
* **838** `? megaAwardBeat(awardKeys[step], state.megaAwards, de) : null;`
* **839** `const awardWinSlug = awardBeatBg ? (qqMegaFactionSlug(awardBeatBg.av) ?? COZY_ARENA_CREST_SLUGS[0]) : null;`
* **844** `if (!awardWinSlug) return;`
* **845** `if (reduceMotion) { setAwardBgSlug(awardWinSlug); setAwardBgLocked(true); return; }`
* **854** `const slug = k === N - 1 ? awardWinSlug : COZY_ARENA_CREST_SLUGS[(k + step + 1) % COZY_ARENA_CREST_SLUGS.lengt`
* **862** `if (step < crownStep && state.megaAwards) {`  →  const beat = megaAwardBeat(awardKeys[step], state.megaAwards, de);
* **880** `{arenaLook && <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage`
* **890** `{awardKeys.map((_, i) => (`
* **934** `return <MegaCrownCeremony state={state} sorted={sorted} winner={winner} wColor={wColor} de={de} />;`

### `frontend/src/components/CozyQuizLobbyView.tsx` (23)

* **361** `if (!nested) return [] as Array<{ avatarId: string; emoji?: string; color: string; label: string; subs: typeof`
* **370** `emoji: qqMegaFactionSlug(t.avatarId) ?? t.emoji,`
* **372** `label: qqMegaFactionName(t.avatarId, de ? 'de' : 'en') || (meta ? (de ? meta.label : meta.labelEn) : t.name),`
* **393** `const qrSize = (nested || veryMany) ? 'min(40cqh, 400px)' : 'min(66cqh, 640px)';`
* **402** `const arenaLobbyBg = (s as any).largeGroupMode && (s as any).arenaBackgrounds !== false && !isThemed() && !s.t`
* **407** `const arenaCardBg = arenaLobbyBg ? 'rgba(10,8,18,0.82)' : undefined;`
* **464** `{arenaLobbyBg && <ArenaMainVideo opacity={0.4} />}`
* **468** `{arenaLobbyBg && (`
* **549** `fontFamily: arenaLobbyBg ? 'var(--font-arena-body)' : fontFam,`
* **732** `: ((s as any).largeGroupMode ? 'CROWDQUIZ' : 'COZYQUIZ');`
* **747** `&& !arenaLobbyBg && !istBuehne;`
* **750** `{showArenaHero && (`
* **938** `{nested && !s.showJoinLink && (`
* **972** `justifyContent: arenaLobbyBg ? 'flex-start' : 'center', gap: 12,`
* **975** `...(arenaLobbyBg ? {`  →  alignSelf: 'flex-start', width: 'auto',
* **982** `<span style={{ opacity: arenaLobbyBg ? 0.95 : 0.7 }}>{de ? 'Angemeldete Teams' : 'Joined Teams'}</span>`
* **1019** `{nested ? (`
* **1093** `}}>„{qqMegaFactionMotto(g.avatarId, de ? 'de' : 'en')}"</div>`
* **1155** `gap: veryMany ? 'clamp(6px, 0.7cqw, 10px)' : 'clamp(14px, 1.8cqh, 30px)',`
* **1247** `gap: quirkSet ? 0 : (veryMany ? 'clamp(8px, 0.9cqw, 12px)' : compact ? 'clamp(14px, 1.5cqw, 20px)' : 'clamp(14`
* **1327** `<QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} teamId={t.id} size={veryMany ? 'clamp(38px, 3.6cqw, 52`
* **1375** `...(istBuehne && !veryMany && t.name.length > 14 ? {`  →  whiteSpace: 'normal',
* **1399** `{!veryMany && (t.gamesPlayed ?? 0) > 0 && (`

### `frontend/src/components/CozyQuizPausedView.tsx` (10)

* **334** `if (largeGroup) return;`
* **687** `if (!largeGroup && sortedTeams.length > 0) {`  →  panels.push({ key: 'schonDa', node: (
* **766** `if (!largeGroup) panels.push({ key: 'avatare', node: (`
* **799** `if (largeGroup) {`  →  panels.push({ key: 'megaFactions', node: (
* **931** `if (!largeGroup) panels.push({ key: 'currentGrid', node: (`
* **1069** `const standingsSource = largeGroup ? qqSortedGroups(s) : sortedTeams;`
* **1131** `<span style={{ fontSize: unitSize, color: 'var(--qq-text-muted)', fontWeight: 800 }}>{largeGroup ? (de ? 'Pkt'`
* **1178** `<span style={{ fontSize: unitSize, color: 'var(--qq-text-muted)', fontWeight: 700 }}>{largeGroup ? (de ? 'Pkt'`
* **1544** `if (sortedTeams.length >= 2 && mode === 'pause' && !largeGroup) {`  →  const leader = sortedTeams[0];
* **2160** `}}>{qqIsMega(s) ? 'CROWDQUIZ' : 'COZYQUIZ'}</span>`

### `frontend/src/components/CozyQuizPhaseIntroView.tsx` (20)

* **363** `: (s as any).largeGroupMode ? ARENA_ROUND_COLOR`
* **368** `const arenaTitleFont = qqArenaType(s) ? 'var(--font-arena)' : fontFam;`
* **373** `const arenaSubFont = qqArenaType(s) ? 'var(--font-arena-body)' : fontFam;`
* **670** `: (s as any).largeGroupMode ? ARENA_ROUND_COLOR`
* **696** `const prevPhaseDesc = (s as any).largeGroupMode ? phaseDesc : (prevIdx < 1 ? phaseDesc : phaseDescsRaw[prevIdx`
* **699** `const displayPhaseDesc = transitioning ? prevPhaseDesc : phaseDesc;`
* **811** `if (step === 0 && (s as any).largeGroupMode) {`  →  S = 1.35;
* **858** `if ((s as any).largeGroupMode) {`  →  S = Math.min(2.9, Math.max(2.1, (camVp.w * 0.7) / (phaseWidths[pi] || camVp.w)));
* **867** `if (istBuehneP() && !(s as any).largeGroupMode) vAnchor = BUEHNE_CLUSTER_V;`
* **915** `if ((s as any).largeGroupMode) {`  →  S1 = Math.min(2.9, Math.max(2.1, (camVp.w * 0.7) / (phaseWidths[pi] || camVp.w)));
* **966** `if (!megaArena) {`  →  return (
* **1206** `{megaArena ? (() => {`  →  const GEM = 'polygon(6% 0, 94% 0, 100% 50%, 94% 100%, 6% 100%, 0 50%)';
* **1424** `fontSize: 'clamp(36px, 5cqw, 68px)', fontWeight: megaArena ? 700 : 900,`
* **1453** `fontSize: 'clamp(36px, 5cqw, 68px)', fontWeight: megaArena ? 700 : 900,`
* **1501** `bottom: (s as any).largeGroupMode ? 'clamp(78px, 12cqh, 180px)' : 'clamp(26px, 5cqh, 72px)',`
* **1534** `const lead = (lang === 'en' ? roundRules.en : roundRules.de)[0];`
* **1545** `if ((s as any).largeGroupMode) return null;`
* **1785** `{megaArena ? (`
* **1924** `fontWeight: i === 0 ? (megaArena ? 700 : 800) : 600,`
* **2036** `{megaArena ? (`

### `frontend/src/components/CozyQuizQuestionView.tsx` (20)

* **344** `&& !(s as any).largeGroupMode)`
* **541** `const reservesWinnerSlot = cat !== 'SCHAETZCHEN' && !(s as any).largeGroupMode;`
* **551** `&& !(q?.category === 'BUNTE_TUETE' && q?.bunteTuete?.kind === 'hotPotato' && !(s as any).largeGroupMode);`
* **553** `const bandDauerhaft = reservesWinnerSlot && bandGefuellt;`
* **1768** `? { ...rawWinnerTeam, name: qqMegaFactionName(rawWinnerTeam.avatarId, lang), emoji: qqMegaFactionSlug(rawWinne`
* **1935** `if (nested) {`  →  const navSize = isCheesePortrait ? 116 : 150;
* **2057** `&& !(s as any).largeGroupMode; // Mega Event: Hot Potato = normale Frage`
* **2225** `const muchoArenaExpanded = q.category === 'MUCHO' && !!(s as any).largeGroupMode`
* **2227** `const compactCard = hpCompact || muchoArenaExpanded;`
* **2255** `const cardFontSize = muchoArenaExpanded ? 'clamp(22px, min(3.2cqw, 4.6cqh), 46px)'`
* **2817** `{revealed && q.category === 'ZEHN_VON_ZEHN' && q.options && !(s as any).nestedTeams && (`
* **2991** `teamEmoji={isMegaTeams ? qqMegaFactionSlug(ct.team.avatarId) : undefined}`
* **3553** `const dispName = isMegaTeams ? qqMegaFactionName(w.team.avatarId, lang) : w.team.name;`
* **3554** `const dispEmoji = isMegaTeams ? (qqMegaFactionSlug(w.team.avatarId) ?? w.team.emoji) : w.team.emoji;`
* **3592** `{reservesWinnerSlot && (`
* **3741** `team = { ...rawWinner, name: qqMegaFactionName(rawWinner.avatarId, lang), emoji: qqMegaFactionSlug(rawWinner.a`
* **4020** `{revealed && !s.correctTeamId && !reservesWinnerSlot && (`
* **4045** `{!revealed && s.teams.length > 0 && !(q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato' && !(`
* **4093** `if (nested) {`  →  const groups = new Map<string, { rep: typeof s.teams[number]; total: number; answered: num
* **4180** `{q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato' && !(s as any).largeGroupMode && (`

### `frontend/src/components/CozyQuizRulesView.tsx` (4)

* **777** `fontFamily: qqArenaType(s) ? 'var(--font-arena)' : undefined,`
* **778** `letterSpacing: qqArenaType(s) ? '0.01em' : undefined,`
* **1047** `fontFamily: qqArenaType(s) ? 'var(--font-arena-body)' : fontFam,`
* **1099** `{mega && (`

### `frontend/src/components/CozyQuizThanksView.tsx` (9)

* **91** `const winner = nested ? (qqSortedGroups(s)[0] ?? winnerTeam) : winnerTeam;`
* **112** `() => (nested ? [] : qqFinalSortedTeams(s).map(t => ({ team: t, punkte: qqFinalTotal(s, t.id) }))),`
* **115** `const zeigeTabelle = !nested && rangliste.length >= 2;`
* **243** `const megaArena = qqIsMega(s) && !themed && (s as any).arenaBackgrounds !== false && !s.theme?.lobbyBackground`
* **281** `fontFamily: megaArena ? 'var(--font-arena-body)' : fontFam,`
* **298** `{megaArena && (`
* **537** `}}>{qqIsMega(s) ? 'CROWDQUIZ' : 'COZYQUIZ'}</span>`
* **628** `...(megaArena ? qqArenaGlass() : {}),`
* **777** `}}>{nested ? (de ? 'Fraktion' : 'Faction') : 'Team'}</div>`

### `frontend/src/components/CozyQuizTieBreakerView.tsx` (2)

* **40** `return arena ? qqMegaFactionName(t.avatarId, de ? 'de' : 'en') : t.name;`
* **75** `fontFamily: qqArenaType(s) ? 'var(--font-arena-body)'`

### `frontend/src/components/QQFactionCrest.tsx` (2)

* **100** `{qqMegaFactionName(avatarId, de ? 'de' : 'en')}`
* **109** `„{qqMegaFactionMotto(avatarId, de ? 'de' : 'en')}"`

### `frontend/src/components/reveals/CozyGuessrReveal.tsx` (3)

* **117** `if (!isMega) return scored;`
* **326** `const arenaBgVisible = isMega && (s as any).arenaBackgrounds !== false;`
* **616** `? { ...rawTeam, name: qqMegaFactionName(rawTeam.avatarId, lang), emoji: qqMegaFactionSlug(rawTeam.avatarId) ??`

### `frontend/src/components/reveals/CrowdEstimateReveal.tsx` (3)

* **331** `const name = isMega ? qqMegaFactionName(f.avatarId, lang) : (rep?.name ?? f.avatarId);`
* **360** `<QQTeamAvatar avatarId={f.avatarId} teamEmoji={qqFactionAvatarEmoji(f.avatarId, rep?.emoji, isMega)} size="cla`
* **390** `{isMega && (`

### `frontend/src/components/reveals/CrowdTopReveal.tsx` (3)

* **53** `if (isMega) {`  →  const agg = new Map<string, { pts: number; total: number }>();
* **220** `{!isMega && hitters.length > 6 && (`
* **275** `{isMega ? (`

### `frontend/src/components/reveals/OrderReveal.tsx` (2)

* **281** `isMega ? <FactionCountAvatars teams={hitters} de={lang === 'de'} size={'clamp(46px, 4.6cqw, 68px)'} />`
* **339** `{isMega ? (`

### `frontend/src/components/reveals/SchaetzchenReveal.tsx` (5)

* **105** `const CONTENT_INSET = isMega ? 11 : (istBuehne ? 4 : 0); // % Rand je Seite`
* **119** `if (!isMega) return ranked;`
* **126** `.map(r => ({ ...r, team: { ...r.team, name: qqMegaFactionName(r.team.avatarId, lang), emoji: qqMegaFactionSlug`
* **142** `const samePts = !isMega || ptsOfAvatar(w.team.avatarId) === ptsOfAvatar(second.team.avatarId);`
* **563** `{isMega && <span style={{ color: isWin && lit ? GOLD_BRIGHT : GOLD, marginLeft: 6 }}>· {ptsOfAvatar(r.team.ava`

### `frontend/src/components/reveals/Top5Reveal.tsx` (7)

* **280** `isMega ? <FactionCountAvatars teams={hitters} de={lang === 'de'} size={'clamp(48px, 4.8cqw, 72px)'} />`
* **347** `border: istBuehne ? '2px solid var(--qq-hairline)' : (isMega ? '2.5px solid rgba(var(--qq-accent-rgb),0.6)' : `
* **348** `boxShadow: istBuehne ? 'none' : (isMega ? '0 0 44px rgba(var(--qq-accent-rgb),0.22)' : '0 0 48px rgba(250,204,`
* **356** `{isMega ? (`
* **382** `color: istBuehne ? '#12100E' : (isMega ? 'var(--qq-accent)' : QQ_COLORS.yellow300),`
* **386** `: (isMega ? 'rgba(var(--qq-accent-rgb),0.16)' : 'rgba(250,204,21,0.14)'),`
* **387** `border: istBuehne ? 'none' : (isMega ? '1.5px solid rgba(var(--qq-accent-rgb),0.5)' : '1.5px solid rgba(250,20`

### `frontend/src/pages/QQBeamerPage.tsx` (9)

* **1068** `if ((s as any).largeGroupMode) playArenaStandings();`
* **2115** `fontFamily: isThemed() ? 'var(--qq-font)' : (qqArenaType(s) ? 'var(--font-arena-body)' : fontFam),`
* **2269** `data-qq-mega={renderState.largeGroupMode ? '1' : '0'}`
* **2374** `{renderState.phase === 'PLACEMENT' && !renderState.largeGroupMode && <PlacementView key={'place-${renderState.`
* **2375** `{renderState.phase === 'PLACEMENT' && renderState.largeGroupMode && <LargeGroupStandingsView key={'lg-stand-${`
* **2436** `<QuizIntroOverlay language={s.language} visible={welcomeActive} arena={qqIsMega(s)} arenaBg={qqIsMega(s) && (s`
* **6115** `const arenaWelcomeBg = qqIsMega(s) && !themed && !s.theme?.lobbyBackgroundUrl;`
* **6143** `{qqIsMega(s) && qqArenaBgEnabled(s)`
* **6156** `}}>{qqIsMega(s) ? 'CROWDQUIZ' : 'COZYQUIZ'}</span>`

## Handy (59)


### `frontend/src/components/CozyQuizTeamBottomSheet.tsx` (3)

* **109** `if (largeMode && myTeam) {`  →  const byFaction = new Map<string, number>();
* **279** `{!largeMode && state.gridSize > 0 && (`
* **498** `{helpOpen && <HelpModal lang={lang} onClose={() => setHelpOpen(false)} largeMode={largeMode} />}`

### `frontend/src/components/CozyQuizTeamPhaseCards.tsx` (12)

* **73** `{s.teams.length === 0 ? (de ? 'Noch keine Teams' : 'No teams yet') : '${s.teams.length} ${largeMode ? 'Handys'`
* **546** `return arena ? qqMegaFactionName(t.avatarId, de ? 'de' : 'en') : t.name;`
* **551** `const eligible = tb.candidateIds.includes(myTeamId) || (arena && !!myTeam?.avatarId && candidateAvatars.has(my`
* **576** `const iWon = tb.winnerId && (arena`
* **686** `const sorted = largeMode ? qqSortedGroups(s) : qqSortedTeams(s);`
* **688** `const myTeam = largeMode ? sorted.find(t => t.avatarId === myRaw?.avatarId) : myRaw;`
* **1211** `const sorted = largeMode ? qqSortedGroups(s) : qqFinalSortedTeams(s);`
* **1213** `const myTeam = largeMode ? sorted.find(t => t.avatarId === myRaw?.avatarId) : myRaw;`
* **1223** `const connectedLabel = largeMode ? (lang === 'de' ? 'Punkte' : 'pts') : (lang === 'de' ? 'verbunden' : 'connec`
* **1259** `const cellCount = largeMode ? 0 : s.grid.flatMap(row => row.filter(c => c.ownerId === tm.id)).length;`
* **1279** `{largeMode ? tm.largestConnected : qqFinalTotal(s, tm.id)} {connectedLabel}`
* **1281** `{!largeMode && <div style={{ fontSize: 11, color: QQ_COLORS.slate400 }}>{cellCount} {lang === 'de' ? 'gesamt' `

### `frontend/src/components/CozyQuizTeamsRevealView.tsx` (16)

* **101** `const arenaFont = arenaType ? 'var(--font-arena)' : undefined;`
* **102** `const arenaQuoteFont = arenaType ? 'var(--font-arena-quote)' : undefined;`
* **159** `return slug && isCrestSlug(slug) ? crestSrc(slug) : null;`
* **223** `}}>{qqMegaFactionName(f.avatarId, de ? 'de' : 'en')}</div>`
* **330** `}}>{qqMegaFactionName(f.avatarId, de ? 'de' : 'en')}</div>`
* **347** `{qqMegaFactionName(cur.avatarId, de ? 'de' : 'en')}`
* **352** `„<ArenaTypewriter text={qqMegaFactionMotto(cur.avatarId, de ? 'de' : 'en')} color={curColor} />"`
* **422** `if ((s as any).nestedTeams) return <ArenaEntranceView state={s} />;`
* **444** `if (!nested) return base;`
* **453** `g = { ...t, id: 'grp-${t.avatarId}', emoji: qqMegaFactionSlug(t.avatarId) ?? t.emoji, name: qqMegaFactionName(`
* **919** `const slug = slotIdx >= 0 ? quirk2ForSlot(slotIdx) : t.emoji;`
* **921** `return <img src={quirk2Src(q?.id ?? 'prisma', 'open')} alt={quirk2Label(slug)} draggable={false}`
* **928** `const slug = slotIdx >= 0 ? blockzForSlot(slotIdx) : t.emoji;`
* **930** `return <img src={blockzSrc(b?.id ?? 'solo', 'base')} alt={blockzLabel(slug)} draggable={false}`
* **946** `const slug = (slotIdx >= 0 ? COZY_WOLVES[slotIdx]?.slug : undefined) ?? t.emoji;`
* **947** `return <img src={cozyWolfSrc(slug)} alt={cozyWolfLabel(slug)} draggable={false}`

### `frontend/src/pages/QQTeamPage.tsx` (28)

* **234** `const largeGroup = !!(state as any)?.largeGroupMode;`
* **235** `if (largeGroup) {`  →  if (!state) return; // auf State warten
* **256** `}, [connected, kicked, (state as any)?.largeGroupMode]);`
* **340** `const largeGroup = !!(state as any)?.largeGroupMode;`
* **341** `const finalName = largeGroup ? qqMegaFactionName(avatarId, lang) : teamName.trim();`
* **342** `if (!finalName) return;`
* **438** `if (!(state as any)?.largeGroupMode) return (state?.teams ?? []).map(t => t.avatarId);`
* **447** `}, [state?.teams, (state as any)?.largeGroupMode]);`
* **450** `const takenEmojis = (state as any)?.largeGroupMode ? [] : (state?.teams ?? []).map(t => t.emoji).filter(Boolea`
* **477** `const large = !!(state as any)?.largeGroupMode;`
* **522** `if ((state as any)?.largeGroupMode) return;`
* **531** `const myEmojiInvalid = chosenEmoji && (takenEmojis.includes(chosenEmoji) || !pool.includes(chosenEmoji));`
* **533** `const freeList = pool.filter(e => !takenEmojis.includes(e));`
* **539** `}, [takenEmojis.join(','), setId, state?.avatarSetEmojis?.join(','), joined]);`
* **613** `largeGroup={!!(state as any)?.largeGroupMode}`
* **694** `const arenaFactionBg = largeGroup && !eurovisionMode`
* **695** `? '/arena-bg/faction-${qqMegaFactionSlug(avatarId)}.webp' : null;`
* **701** `if (largeGroup && avatarId) {`  →  setTeamName(qqMegaFactionName(avatarId, lang));
* **711** `const nameTaken = !largeGroup && trimmedNameLower.length > 0 && takenTeamNamesLower.includes(trimmedNameLower)`
* **825** `{largeGroup ? 'CROWDQUIZ' : t.header[lang]}`
* **969** `{!largeGroup && (<>`
* **1532** `if ((s as any).largeGroupMode) return;`
* **1667** `? qqMegaFactionSlug(myTeam?.avatarId ?? '') : undefined;`
* **1668** `const arenaFactionBg = arenaFactionSlug ? '/arena-bg/faction-${arenaFactionSlug}.webp' : null;`
* **1923** `{!(s as any).largeGroupMode && s.phase === 'COMEBACK_CHOICE' && (`
* **1926** `{!(s as any).largeGroupMode && s.phase === 'CONNECTIONS_4X4' && (() => {`  →  if (s.connections?.phase === 'placement' && s.pendingFor === myTeamId) {
* **2030** `jokersAvailable={(s as any).largeGroupMode ? 0 : Math.max(0, 2 - (s.teamPhaseStats[myTeamId]?.jokersEarned ?? `
* **2031** `jokersTotal={(s as any).largeGroupMode ? 0 : 2}`

## Steuerpult und Wizard (85)


### `frontend/src/pages/QQModeratorPage.tsx` (70)

* **73** `if (!(s as any).largeGroupMode) return false;`
* **77** `const step = Math.max(0, Math.min(standingsStep, s.awardCeremonyStep ?? 0));`
* **78** `return step < standingsStep;`
* **237** `else if (state.phase === 'PLACEMENT') pushToast((state as any).largeGroupMode ? 'Wertung & Standings' : 'Platz`
* **276** `if (ack.ok) setJoined(true);`
* **340** `const wantArena = /[?&](arena|mega)=1/i.test(window.location.search);`
* **539** `const ack = await emit('qq:startGame', { roomCode, questions, language: state?.language ?? 'both', phases, the`
* **540** `if (!ack.ok) {`  →  alert('Fehler beim Starten: ${ack.error ?? 'Unbekannt'}');
* **562** `if ((state as any)?.largeGroupMode) setBotCount(c => (c <= 8 ? 24 : c));`
* **564** `}, [(state as any)?.largeGroupMode]);`
* **711** `if (last !== 'arena' && last !== 'quiz') { formatRestoreRef.current = true; return; }`
* **716** `const nextSet = arena ? 'cozyArena' : 'cozyquiz';`
* **748** `if (!(st as any).largeGroupMode || st.themeId !== 'cozy') return;`
* **755** `}, [connected, joined, state?.themeId, (state as any)?.largeGroupMode]);`
* **776** `if (ack && (ack as { ok?: boolean }).ok === false) {`  →  const a = ack as { error?: string; code?: string };
* **1370** `if ((s as any).largeGroupMode && delayMs > 0 && s.phase !== 'TEAMS_REVEAL' && s.phase !== 'RULES') {`  →  delayMs = Math.round(delayMs * 1.3);
* **1446** `state?.megaAwards, // 2026-07-15: Award-Anzahl bestimmt Beat-Zahl`
* **2008** `if ((s as any).largeGroupMode) return { text: 'WERTUNG & STANDINGS', color: QQ_COLORS.violet500, sub: 'Punkte `
* **2463** `const accent = arena ? '#A78BFA' : '#EC4899';`
* **2489** `{arena && (cd?.megaWarnCount ?? 0) > 0 && (`
* **2502** `{ k: 'Format', v: arena ? '🏟️ CrowdQuiz' : '🍺 CozyQuiz' },`
* **2507** `...(arena ? [{ k: 'Look', v: ((s.themeId ?? 'buehne') === 'cozy' && (s as any).arenaBackgrounds !== false) ? '`
* **2576** `{(s as any).nestedTeams ? (`
* **2657** `const botMax = (s as any)?.largeGroupMode ? 40 : 8;`
* **2658** `const presets = (s as any)?.largeGroupMode ? [8, 24, 40] : [2, 4, 6, 8];`
* **2663** `<div style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.0`
* **2667** `<button style={{ ...stepBtn, opacity: cnt >= botMax ? 0.4 : 1 }} disabled={cnt >= botMax} onClick={() => setBo`
* **2670** `{presets.map(n => (`
* **2676** `style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid ${cnt === botMax ? 'rgba(52,211,153,0.9)' : `
* **3274** `const isAutoPhase = step >= 1 && step < 1 + validPins;`
* **3278** `? '⏩ Auto: Pin ${step}/${validPins} …'`
* **3380** `<PrimaryBtn color={megaHold ? QQ_COLORS.brandPink : QQ_COLORS.green500} onClick={() => emit('qq:nextQuestion',`
* **3452** `return (s as any).largeGroupMode`
* **3453** `? qqMegaFactionName(t.avatarId, s.language === 'en' ? 'en' : 'de')`
* **3510** `⚔ STECHEN — gleicher Endstand bei {tieCands.length} {(s as any).largeGroupMode ? 'Fraktionen' : 'Teams'}`
* **3569** `{(s as any).largeGroupMode && !tieActive ? (() => {`  →  const awardKeys = qqMegaAwardKeys(s.megaAwards);
* **3642** `const highlights = (s as any).largeGroupMode ? [] : computeTeamHighlights(s, tm.id);`
* **3665** `}}>{tm.largestConnected} {(s as any).largeGroupMode ? 'Pkt' : 'F'}</span>`
* **3667** `{highlights.length === 0 ? (`
* **3668** `(s as any).largeGroupMode ? null : (`
* **3675** `{highlights.map((h, i) => (`
* **4032** `{!(s as any).largeGroupMode && (`
* **4043** `<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, flex: 'none' }} t`
* **4045** `<div style={{ fontSize: 9, fontWeight: 800, color: QQ_COLORS.slate500, letterSpacing: '0.04em', marginTop: 1 }`
* **4147** `if ((s as any).largeGroupMode) {`  →  const byAv = new Map<string, any[]>();
* **4233** `<CollapsibleRanking teams={(s as any).largeGroupMode ? qqSortedGroups(s) : teamList} phase={s.phase} />`
* **4348** `{!(s as any).largeGroupMode && s.grid && <CollapsibleGrid state={s} />}`
* **4576** `const baseNote = (arenaMode && HOST_NOTES_ARENA_DE[phase]) || HOST_NOTES_DE[phase] || { title: phase, text: 'K`
* **4874** `const rows = (largeMode ? qqSortedGroups(s) : sorted).map((t, idx) => {`  →  if (largeMode) {
* **6029** `if (rank === 1) highlights.push({ icon: '🥇', label: 'Sieger', value: 'Platz 1 — größtes Gebiet', importance: `
* **6030** `else if (rank === 2) highlights.push({ icon: '🥈', label: 'Vize-Sieger', value: 'Platz 2 — knapp am Sieg vorbe`
* **6031** `else if (rank === 3) highlights.push({ icon: '🥉', label: 'Bronze', value: 'Platz 3 — auf dem Treppchen', impo`
* **6035** `if (jokers >= 2) highlights.push({ icon: '🃏', label: 'Joker-Master', value: '${jokers} Joker verdient', impor`
* **6036** `else if (jokers === 1) highlights.push({ icon: '🃏', label: 'Joker', value: '1 Joker verdient', importance: 35`
* **6040** `if (steals >= 4) highlights.push({ icon: '⚔️', label: 'Räuber', value: '${steals}× Felder geklaut', importance`
* **6041** `else if (steals >= 2) highlights.push({ icon: '⚔️', label: 'Klau-Aktiv', value: '${steals}× geklaut', importan`
* **6042** `else if (steals === 1) highlights.push({ icon: '⚔️', label: 'Klau-Erstling', value: '1× geklaut', importance: `
* **6046** `if (stapels >= 3) highlights.push({ icon: '🏯', label: 'Stapel-King', value: '${stapels}× gestapelt', importan`
* **6047** `else if (stapels >= 1) highlights.push({ icon: '🏯', label: 'Stapler', value: '${stapels}× gestapelt', importa`
* **6051** `if (connectGroups >= 4) highlights.push({ icon: '🧩', label: 'Connections-Profi', value: 'alle 4 Gruppen gefun`
* **6052** `else if (connectGroups >= 2) highlights.push({ icon: '🧩', label: 'Connections-Stark', value: '${connectGroups`
* **6053** `else if (connectGroups === 1) highlights.push({ icon: '🧩', label: 'Connections', value: '1 Gruppe gefunden', `
* **6058** `if ((bluffPts.blufferBonus ?? 0) >= 4) highlights.push({ icon: '🎭', label: 'Bluff-Master', value: '${bluffPts`
* **6059** `else if ((bluffPts.blufferBonus ?? 0) >= 2) highlights.push({ icon: '🎭', label: 'Bluff-Erfolg', value: '${blu`
* **6060** `if ((bluffPts.foundReal ?? 0) >= 3) highlights.push({ icon: '🔍', label: 'Wahrheits-Sucher', value: '${bluffPt`
* **6065** `if (score >= 12) highlights.push({ icon: '🏆', label: 'Mega-Gebiet', value: '${score} verbundene Felder', impo`
* **6066** `else if (score >= 8) highlights.push({ icon: '🏆', label: 'Großes Gebiet', value: '${score} verbundene Felder'`
* **6067** `else if (score === 0) highlights.push({ icon: '🌱', label: 'Mitspielen zählt', value: 'Hat tapfer durchgehalte`
* **6071** `if (totalCells >= 12 && totalCells - score >= 4) highlights.push({ icon: '📦', label: 'Vielspieler', value: '$`
* **6075** `return highlights.slice(0, 3);`

### `frontend/src/pages/QQModPortablePage.tsx` (1)

* **265** `PLACEMENT: (s as any).largeGroupMode ? '📊 Wertung' : '📍 Setzen',`

### `frontend/src/pages/QQSetupFlow.tsx` (14)

* **63** `const accent = arena ? VIOLET : PINK;`
* **92** `if (!arena && preferredSet && preferredSet !== s.avatarSetId) emit('qq:setAvatarSet', { roomCode, avatarSetId:`
* **93** `else if (!arena && !preferredSet && s.avatarSetId === 'esc') emit('qq:setAvatarSet', { roomCode, avatarSetId: `
* **175** `if (arena === ar) {`  →  try { window.localStorage.setItem('qqLastFormat', ar ? 'arena' : 'quiz'); } catch { /* ign
* **181** `try { window.localStorage.setItem('qqLastFormat', ar ? 'arena' : 'quiz'); } catch { /* ignore */ }`
* **209** `const lookLabel = arena ? (kolosseumAn ? 'Mit Kolosseum' : 'CozyQuiz Standard') : (QQ_THEMES[(s.themeId ?? 'bu`
* **270** `const active = arena === f.ar && !!(s as any).formatSelected;`
* **296** `{arena ? (`
* **420** `{arena && (d.megaWarnCount ?? 0) > 0 && (`
* **434** `{arena && selectedDraft && (selectedDraft.megaWarnCount ?? 0) > 0 && (`
* **509** `{arena ? (`
* **544** `{QQ_COMEBACK_ENABLED && !arena && (`
* **592** `{ k: 'Format', v: '${arena ? '🏟️ CrowdQuiz' : '🍺 CozyQuiz'}' },`
* **638** `style={{ padding: '11px 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, ${accent`

## Sonstiges (70)


### `backend/src/server.ts` (40)

* **771** `if (!payload?.id || !payload?.name || !Array.isArray(payload.questionIds)) {`  →  return res.status(400).json({ error: 'id, name, questionIds erforderlich' });
* **1869** `const entry = teamStats.get(name) || { wins: 0, games: 0, totalScore: 0, scoredGames: 0 };`
* **1876** `const entry = teamStats.get(name) || { wins: 0, games: 0, totalScore: 0, scoredGames: 0 };`
* **1884** `const entry = teamStats.get(name) || { wins: 0, games: 0, totalScore: 0, scoredGames: 0 };`
* **2569** `return (a.name || '').localeCompare(b.name || '');`
* **2651** `return a.name.localeCompare(b.name, 'de', { sensitivity: 'base' });`
* **3952** `const newTeam: Team = { id: uuid(), name: cleanName, score: 0, isReady: false, avatarId: avatarId || undefined`
* **4592** `teamName: room.teams[teamId]?.name ?? teamId,`
* **4607** `teamName: room.teams[teamId]?.name ?? teamId,`
* **4899** `if (!name || !Array.isArray(questionIds)) return res.status(400).json({ error: 'name oder questionIds fehlen' `
* **5698** `const teamTiming = timings.find(t => t.teamName === room.teams[teamId]?.name);`
* **5887** `teamName: room.teams[teamIdValidation.value]?.name || 'Unknown',`
* **6200** `const name = teamName || 'Unknown';`
* **7376** `winners: winners.length > 0 ? winners : Object.keys(room.teams).map(id => room.teams[id].name),`
* **9210** `if (!body.name || typeof body.name !== 'string') {`  →  return res.status(400).json({ error: 'name-Feld fehlt' });
* **9315** `if (t?.name) {`  →  gamesPlayed[t.name] = (gamesPlayed[t.name] || 0) + 1;
* **9329** `.map(([name, w]) => ({`  →  name,
* **9340** `teams: Array.isArray(r.teams) ? r.teams.map((t: any) => ({ name: t.name, score: t.score })) : [],`
* **9391** `if (t?.score != null && t.name && (!todayHighlight || t.score > todayHighlight.score)) {`  →  todayHighlight = { teamName: t.name, score: t.score, draftTitle: r.draftTitle ?? '' };
* **9398** `if (!t?.name) continue;`
* **9400** `jokerTotals[t.name] = (jokerTotals[t.name] || 0) + t.jokersEarned;`
* **9403** `stealTotals[t.name] = (stealTotals[t.name] || 0) + t.stealsUsed;`
* **9408** `if (t?.score != null && t.name && (!highestScore || t.score > highestScore.score)) {`  →  highestScore = { teamName: t.name, score: t.score, draftTitle: r.draftTitle ?? '' };
* **9440** `if (t?.id && t.name) idToName[t.id] = t.name;`
* **9542** `.map((t: any) => ({ name: t?.name, score: preScore[t?.name] ?? 0 }))`
* **9543** `.filter((x: any) => !!x.name);`
* **9546** `const isLoserBeforeLast = preEntries.some((x: any) => x.name === r.winner && x.score === minScore);`
* **9604** `.map(([name, cats]) => [name, Object.values(cats).reduce((a, b) => a + b, 0)] as [string, number])`
* **9625** `const cnt = speedRankCount[name] || 0;`
* **9639** `const g = gamesPlayed[name] || w;`
* **9745** `megaAwards: (hit as any).megaAwards ?? null,`
* **9791** `megaAwards: (hit as any).megaAwards ?? null,`
* **9975** `const cap = (room.nestedTeams || room.largeGroupMode) ? QQ_MAX_TEAMS_LARGE : 8;`
* **9976** `const count = Math.min(cap, Math.max(1, Number(req.body?.count) || cap));`
* **9982** `const usedNames = new Set(Object.values(room.teams).map((t: any) => (t.name ?? '').toLowerCase()));`
* **10006** `if (room.nestedTeams) {`  →  const countByAv = new Map<string, number>();
* **10041** `const name = qqMegaFactionName(targetAv, botLang === 'en' ? 'en' : 'de');`
* **10050** `} else if (room.largeGroupMode) {`
* **10058** `const name = namePicks[added] ?? 'Team ${added + 1}';`
* **10078** `const name = wolf?.name ?? namePicks[added] ?? 'Team ${av.label}';`

### `frontend/src/cozyQuizShared.ts` (10)

* **284** `if (!s.largeGroupMode) return 1;`
* **298** `const a = s as { largeGroupMode?: boolean; arenaBackgrounds?: boolean } | null | undefined;`
* **299** `return !!a?.largeGroupMode && !isThemed() && a.arenaBackgrounds !== false;`
* **303** `if (a === 'STEAL_1') return bt.action.steal[lang];`
* **304** `if (a === 'COMEBACK') return bt.action.comeback[lang];`
* **308** `if (a === 'STAPEL_BONUS' || a === 'STAPEL_1') return lang === 'en' ? '🏯 Stack' : '🏯 Stapeln';`
* **313** `if (a === 'PLACE_1') return bt.action.choose1[lang];`
* **314** `if (a === 'PLACE_2') return bt.action.choose2[lang].replace('{n}', String(stats?.placementsLeft ?? 2));`
* **315** `if (a === 'STEAL_1') return bt.action.stealDesc[lang];`
* **316** `if (a === 'FREE') return bt.action.freeDesc[lang];`

### `frontend/src/pages/QQCarouselPage.tsx` (3)

* **88** `const meta = FACTION_META[f.slug] ?? { accent: PINK, char: '' };`
* **133** `{QQ_MEGA_FACTIONS.map((f, i) => (`
* **168** `...QQ_MEGA_FACTIONS.map((_, i) => () => teamSlide(i)),`

### `frontend/src/pages/QQFactionQuizPage.tsx` (4)

* **46** `...QQ_MEGA_FACTIONS.map((_, i) => ({ key: 'fac-${i}', dur: 3500 })),`
* **266** `{QQ_MEGA_FACTIONS.map((f, i) => (`
* **304** `if (!f) return null;`
* **305** `const meta = FACTION_META[f.slug] ?? { accent: PINK, char: '' };`

### `frontend/src/pages/QQRecapIndexPage.tsx` (1)

* **24** `if (!g) { g = { id: 'grp-${t.color}', name: qqMegaFactionByColor(t.color)?.nameDe ?? t.name, color: t.color, s`

### `frontend/src/pages/QQRecapPage.tsx` (4)

* **59** `megaAwards?: QQMegaAwards | null;`
* **99** `if (!g) { g = { id: 'grp-${t.avatarId}', name: colorLabel(t.avatarId), color: colorHex(t.avatarId, t.color), a`
* **111** `if (nested && t) return colorLabel(t.avatarId);`
* **172** `{nested && recap.megaAwards && (`

### `frontend/src/pages/QQSummaryPage.tsx` (4)

* **55** `megaAwards?: QQMegaAwards | null;`
* **571** `const arenaBgSlug = arenaSummary ? (qqMegaFactionSlug(ranking[0]?.avatarId ?? '') ?? null) : null;`
* **756** `{summary.nested && summary.megaAwards ? (`
* **864** `const arenaBgUrl = arenaOn ? '/arena-bg/faction-${arenaBgSlug ?? 'letztesekunde'}.webp' : null;`

### `frontend/src/pages/QQThanksTestPage.tsx` (1)

* **192** `...(mega ? { largeGroupMode: true, nestedTeams: true, arenaBackgrounds: true } : {}),`

### `frontend/src/qqShared.ts` (3)

* **62** `return isArena ? (qqMegaFactionSlug(avatarId) ?? rawEmoji) : rawEmoji;`
* **87** `name: qqMegaFactionName(avatarId, de ? 'de' : 'en'),`
* **142** `name: qqMegaFactionName(avatarId, de ? 'de' : 'en'),`
