/**
 * Standard Bot AI — Final-Bets + Question-Active Answer-Simulation.
 *
 * 2026-05-24 (Refactor #3.6): aus qqSocketHandlers.ts extrahiert. Bei
 * Standard-Bot-Answer-Bugs (FINAL_BETTING / QUESTION_ACTIVE submit-Pipeline)
 * nur dieses File anfassen.
 *
 * Public:
 *  - maybeAutoFinalBets:        Bots tippen vor letzter Runde (random Target)
 *  - maybeAutoSimulateAnswers:  Bots antworten gestaffelt im Timer-Fenster
 *
 * NICHT in diesem File:
 *  - maybeAutoPlace + dispatchFreeChoice + afterDispatchTick + isPlacementCtx:
 *    bleiben in qqSocketHandlers, weil sie der zentrale Hub fuer alle
 *    Bot-Action-Pfade sind (HotPotato/Connections/ComebackHL rufen sie alle
 *    via Lazy-Require auf).
 */

import type { Server as SocketIOServer } from 'socket.io';
import {
  getQQRoom, qqSubmitAnswer, qqSubmitFinalBet,
} from './qqRooms';
import { broadcastQQ } from './qqSocketHandlers';

function hasDummyTeams(room: import('./qqRooms').QQRoomState): boolean {
  return Object.values(room.teams).some((t: any) => t._dummy);
}

/** Bot-Answer-Picker. Per Kategorie eigene Logic (MUCHO=Index, SCHAETZCHEN=Noise,
 *  ZEHN_VON_ZEHN=Punkte-Verteilung, BUNTE_TUETE/CHEESE=Text). */
function pickDummyAnswer(
  q: import('./qqRooms').QQRoomState['currentQuestion'],
  correctRate = 0.6,
): string {
  if (!q) return 'Dummy';
  const beCorrect = Math.random() < correctRate;
  if (q.category === 'MUCHO' && Array.isArray(q.options) && q.options.length > 0) {
    const validCorrect = q.correctOptionIndex != null
      && q.correctOptionIndex >= 0
      && q.correctOptionIndex < q.options.length;
    const idx = beCorrect && validCorrect
      ? q.correctOptionIndex!
      : Math.floor(Math.random() * q.options.length);
    return String(idx);
  }
  if (q.category === 'SCHAETZCHEN') {
    const target = Number.isFinite(q.targetValue) ? (q.targetValue as number) : 100;
    const noise = beCorrect ? Math.abs(target) * 0.1 : Math.abs(target) * (0.5 + Math.random());
    return String(Math.max(0, Math.round(target + (Math.random() - 0.5) * noise * 2)));
  }
  if (q.category === 'ZEHN_VON_ZEHN' && Array.isArray(q.options) && q.options.length > 0) {
    const validCorrect = q.correctOptionIndex != null
      && q.correctOptionIndex >= 0
      && q.correctOptionIndex < q.options.length;
    // Bei korrekt: meistens auf die richtige Option legen.
    if (beCorrect && validCorrect) {
      const pts = Array(q.options.length).fill(0);
      const main = 6 + Math.floor(Math.random() * 4); // 6-9 Punkte auf richtig
      pts[q.correctOptionIndex!] = main;
      let remaining = 10 - main;
      while (remaining > 0) {
        const idx = Math.floor(Math.random() * q.options.length);
        const give = Math.min(remaining, Math.ceil(Math.random() * 3));
        pts[idx] += give;
        remaining -= give;
      }
      return pts.join(',');
    }
    const pts = Array(q.options.length).fill(0);
    let remaining = 10;
    while (remaining > 0) {
      const idx = Math.floor(Math.random() * q.options.length);
      const give = Math.min(remaining, Math.ceil(Math.random() * 5));
      pts[idx] += give;
      remaining -= give;
    }
    return pts.join(',');
  }
  if (q.category === 'BUNTE_TUETE' && q.bunteTuete) {
    const bt = q.bunteTuete;
    // CozyGuessr (map): Pin als "lat,lng".
    // 2026-04-30 v3 round 9 (User-Wunsch 'dummys smarter bei cozyguessr'):
    // Jitter bei correct: ~110km, wrong: regional ±15° (~1650km, gleicher Kontinent).
    if (bt.kind === 'map') {
      if (beCorrect) {
        const lat = bt.lat + (Math.random() - 0.5) * 2;
        const lng = bt.lng + (Math.random() - 0.5) * 2;
        return `${lat.toFixed(4)},${lng.toFixed(4)}`;
      }
      const lat = bt.lat + (Math.random() - 0.5) * 30;
      const lng = bt.lng + (Math.random() - 0.5) * 30;
      const clampedLat = Math.max(-85, Math.min(85, lat));
      const clampedLng = ((lng + 540) % 360) - 180;
      return `${clampedLat.toFixed(4)},${clampedLng.toFixed(4)}`;
    }
    // Top5: eine der gültigen Antworten
    if (bt.kind === 'top5') {
      const answers = (bt.answers || []).filter((a: string) => !!a && a.trim().length > 0);
      if (beCorrect && answers.length) {
        return answers[Math.floor(Math.random() * answers.length)];
      }
      return `Dummy-${Math.random().toString(36).slice(2, 6)}`;
    }
    // Order (Fix It): Pipe-separated Items in Reihenfolge.
    if (bt.kind === 'order') {
      const correct = bt.correctOrder || [];
      const items = bt.items || [];
      if (correct.length === 0 || items.length === 0) {
        return `Dummy-${Math.random().toString(36).slice(2, 6)}`;
      }
      const seq = beCorrect
        ? correct.map(idx => items[idx] ?? '')
        : [...correct].sort(() => Math.random() - 0.5).map(idx => items[idx] ?? '');
      return seq.join('|');
    }
    // hotPotato / oneOfEight / onlyConnect / bluff: eigene Auto-Handler.
    const fallback = (q as any).answer || 'Test';
    return beCorrect ? String(fallback) : `Dummy-${Math.random().toString(36).slice(2, 6)}`;
  }
  if (q.category === 'CHEESE') {
    const fallback = (q as any).answer || 'Test';
    return beCorrect ? String(fallback) : `Dummy-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `Dummy-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * 2026-05-09 (Tipp-Variante Refactor): Bots tippen automatisch ein zufälliges
 * anderes Team (oder gelegentlich sich selbst — 20%). Gestaffelt 0.5-2.5s.
 * Aufgerufen von qq:startFinalBetting nach broadcast.
 */
export function maybeAutoFinalBets(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room) return;
  if (room.phase !== 'FINAL_BETTING') return;
  if ((room as any).botsPaused) return;
  if (!hasDummyTeams(room)) return;
  const dummies = Object.values(room.teams).filter((t: any) => t._dummy && !room.finalBettingSubmitted?.[t.id]) as any[];
  if (dummies.length === 0) return;
  const teamIds = Object.keys(room.teams);
  if (teamIds.length === 0) return;
  dummies.forEach((dummy: any, idx: number) => {
    const delay = 500 + idx * 350 + Math.random() * 600;
    setTimeout(() => {
      const live = getQQRoom(roomCode);
      if (!live || live.phase !== 'FINAL_BETTING') return;
      if (live.finalBettingSubmitted?.[dummy.id]) return;
      const others = teamIds.filter(id => id !== dummy.id);
      const pickSelf = others.length === 0 || Math.random() < 0.2;
      const target = pickSelf ? dummy.id : others[Math.floor(Math.random() * others.length)];
      try { qqSubmitFinalBet(live, dummy.id, { targetTeamId: target }); } catch {}
      broadcastQQ(io, roomCode);
    }, delay);
  });
}

/**
 * QUESTION_ACTIVE + Dummies → gestaffelt antworten (gleichmäßig im Timer-Fenster
 * mit Jitter). Echte Teams bleiben unberührt — sie antworten selbst via Socket.
 *
 * Skippt Hot-Potato/Imposter/OnlyConnect/Bluff — die haben eigene maybeAuto*-
 * Handler.
 */
export function maybeAutoSimulateAnswers(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room) return;
  if (room.phase !== 'QUESTION_ACTIVE') return;
  if ((room as any).botsPaused) return;
  if (!hasDummyTeams(room)) return;
  const q = room.currentQuestion;
  if (!q) return;

  if (q.category === 'BUNTE_TUETE' && (q.bunteTuete?.kind === 'hotPotato' || q.bunteTuete?.kind === 'oneOfEight')) {
    return;
  }
  if (q.category === 'BUNTE_TUETE' && (q.bunteTuete?.kind === 'onlyConnect' || q.bunteTuete?.kind === 'bluff')) {
    return;
  }

  const dummies = Object.values(room.teams).filter((t: any) =>
    t._dummy && !room.answers.some((a: any) => a.teamId === t.id)
  ) as any[];
  if (dummies.length === 0) return;

  // Dummies immer als connected markieren (sonst blockiert allAnswered)
  for (const t of dummies) t.connected = true;

  const now = Date.now();
  const rawRemaining = room.timerEndsAt ? room.timerEndsAt - now : 15_000;
  const safeWindow = Math.min(18_000, rawRemaining - 1_200);

  if (safeWindow < 500) {
    for (const t of dummies) {
      try { qqSubmitAnswer(room, t.id, pickDummyAnswer(q)); } catch { /* skip */ }
    }
    broadcastQQ(io, roomCode);
    return;
  }

  const slot = safeWindow / dummies.length;
  const order = [...dummies].sort(() => Math.random() - 0.5);
  order.forEach((t: any, i: number) => {
    const base = 250 + slot * i;
    const jitter = slot * 0.3 * (Math.random() - 0.5);
    const delay = Math.max(250, Math.min(safeWindow, base + jitter));
    setTimeout(() => {
      const live = getQQRoom(roomCode);
      if (!live || live.phase !== 'QUESTION_ACTIVE' || live.currentQuestion?.id !== q.id) return;
      if (live.answers.some((a: any) => a.teamId === t.id)) return;
      try {
        qqSubmitAnswer(live, t.id, pickDummyAnswer(q));
        broadcastQQ(io, roomCode);
      } catch { /* skip */ }
    }, delay);
  });
}
