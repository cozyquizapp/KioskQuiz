# Backend Refactoring Plan

## Current State
- **File:** `src/server.ts` - 5367 Zeilen (zu groß!)
- **Routes:** 55+ HTTP-Endpoints + Socket.IO Events
- **Probleme:**
  - Monolithische Struktur
  - Schwierig zu testen
  - Schwierig zu maintainen

## Ziel-Struktur

```
backend/src/
├── server.ts (100-150 Zeilen - nur Setup)
├── app.ts (Express-App-Setup)
├── socket.ts (Socket.IO-Setup)
├── constants.ts ✅ (bereits vorhanden)
├── config/
│   └── introSlides.ts ✅
├── data/
│   ├── questions.ts ✅
│   ├── quizzes.ts ✅
│   └── questionUsage.json
├── game/
│   └── stateMachine.ts ✅
├── routes/
│   ├── studio.ts ✅ (bereits vorhanden)
│   ├── health.ts (Healthcheck-Endpoint)
│   ├── rooms.ts (Room-Management)
│   ├── questions.ts (Fragen-CRUD)
│   ├── quizzes.ts (Quiz-Management)
│   ├── upload.ts (File-Upload)
│   ├── stats.ts (Statistiken)
│   ├── bingo.ts (Bingo-Funktionalität)
│   └── timer.ts (Timer-Management)
├── services/
│   ├── roomService.ts (Room State Management)
│   ├── questionService.ts (Question Logic)
│   ├── answerService.ts (Answer Evaluation)
│   ├── bingoService.ts (Bingo Board Logic)
│   ├── blitzService.ts (Fotoblitz Logic)
│   ├── rundlaufService.ts (Rundlauf Logic)
│   ├── potatoService.ts (Potato Logic)
│   └── statsService.ts (Stats Persistence)
├── mechanics/
│   ├── index.ts ✅
│   ├── multipleChoice.ts
│   ├── estimate.ts
│   ├── betting.ts
│   ├── imageQuestion.ts
│   └── bunteTuete.ts
├── sockets/
│   ├── teamHandlers.ts (Team Join/Answer Events)
│   ├── moderatorHandlers.ts (Moderator Control Events)
│   └── syncHandlers.ts (State Sync)
└── types/
    └── studio.ts ✅

```

## Migrations-Plan (Priorität)

### Phase 1: Extrahiere Services (HIGH PRIORITY)
**Nutzen:** Testbarkeit, Wiederverwendbarkeit

1. **`services/roomService.ts`** (~500 Zeilen)
   ```typescript
   export class RoomService {
     private rooms: Map<string, RoomState> = new Map();
     
     ensureRoom(roomCode: string): RoomState { ... }
     getRoomState(roomCode: string): RoomState | null { ... }
     addTeam(roomCode: string, team: Team): void { ... }
     removeTeam(roomCode: string, teamId: string): void { ... }
     cleanupIdleRooms(): void { ... }
   }
   ```

2. **`services/answerService.ts`** (~400 Zeilen)
   ```typescript
   export class AnswerService {
     evaluateEstimateAnswer(answer: number, target: number): Evaluation { ... }
     evaluateBettingAnswer(answer: [number, number, number], ...): Evaluation { ... }
     evaluateBunteTuete(submission: BunteTueteSubmission, ...): Evaluation { ... }
   }
   ```

3. **`services/blitzService.ts`** (~300 Zeilen)
   ```typescript
   export class BlitzService {
     startBlitz(room: RoomState, themes: QuizBlitzTheme[]): void { ... }
     submitBlitzAnswers(roomCode: string, teamId: string, answers: string[]): void { ... }
     evaluateBlitzRound(): BlitzSetResult { ... }
   }
   ```

### Phase 2: Extrahiere Routes (MEDIUM PRIORITY)
**Nutzen:** Klare Separation of Concerns

1. **`routes/rooms.ts`** - Alle `/api/rooms/:roomCode/*` Endpoints
2. **`routes/questions.ts`** - Alle `/api/questions/*` Endpoints
3. **`routes/quizzes.ts`** - Alle `/api/quizzes/*` Endpoints
4. **`routes/upload.ts`** - File-Upload-Endpoints

### Phase 3: Extrahiere Socket Handlers (LOW PRIORITY)
**Nutzen:** Übersichtlichere Socket-Logik

1. **`sockets/teamHandlers.ts`**
   - `team:join`
   - `team:answer`
   - `team:ready`
   
2. **`sockets/moderatorHandlers.ts`**
   - `mod:next-question`
   - `mod:reveal`
   - `mod:timer-start`

## Quick Win: Extract Small Modules

Diese können sofort extrahiert werden (je ~50-100 Zeilen):

1. **`routes/health.ts`**
   ```typescript
   import { Router } from 'express';
   const router = Router();
   router.get('/health', (_req, res) => res.json({ ok: true }));
   export default router;
   ```

2. **`services/statsService.ts`**
   - persistStats()
   - loadStats()
   - updateQuestionUsage()

3. **`routes/timer.ts`**
   - `/api/rooms/:roomCode/timer/start`
   - `/api/rooms/:roomCode/timer/stop`

## Benefits nach Refactoring

✅ **Testbarkeit:** Services können isoliert getestet werden
✅ **Maintainability:** Kleinere Module = einfacher zu verstehen
✅ **Skalierbarkeit:** Klare Grenzen zwischen Modulen
✅ **Onboarding:** Neue Entwickler finden sich schneller zurecht
✅ **Code Reuse:** Services können wiederverwendet werden

## Estimated Effort

- Phase 1 (Services): ~8-12 Stunden
- Phase 2 (Routes): ~4-6 Stunden
- Phase 3 (Socket Handlers): ~3-4 Stunden

**Total:** ~15-22 Stunden für vollständiges Refactoring

## Quick Win Implementations (jetzt möglich)

Wir können sofort mit den kleineren Modulen starten:
1. `routes/health.ts` (5 min)
2. `routes/timer.ts` (15 min)
3. `services/statsService.ts` (20 min)

Soll ich mit diesen Quick Wins beginnen?
