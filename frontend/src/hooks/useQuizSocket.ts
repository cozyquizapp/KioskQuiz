import { useEffect, useRef, useState } from 'react';
import { connectToRoom } from '../socket';
import {
  AnswerEntry,
  AnyQuestion,
  QuestionMeta,
  QuestionPhase,
  SyncStatePayload,
  Team,
  StateUpdatePayload,
  CozyGameState,
  // PotatoState, // TODO: removed
  BlitzState,
  NextStageHint,
  RundlaufState
} from '@shared/quizTypes';
import { fetchAnswers } from '../api';

type SocketEvents = {
  currentQuestion?: AnyQuestion | null;
  questionMeta?: QuestionMeta | null;
  questionPhase?: QuestionPhase;
  timerEndsAt?: number | null;
  timerDurationMs?: number | null;
  answers?: Record<string, AnswerEntry & { answer?: unknown }>;
  teams?: Record<string, Team>;
  solution?: string;
  gameState?: CozyGameState;
  scores?: StateUpdatePayload['scores'];
  teamsConnected?: number;
  teamStatus?: StateUpdatePayload['teamStatus'];
  potato?: PotatoState | null;
  blitz?: BlitzState | null;
  rundlauf?: RundlaufState | null;
  questionProgress?: StateUpdatePayload['questionProgress'];
  results?: StateUpdatePayload['results'];
  warnings?: string[];
  config?: StateUpdatePayload['config'];
  nextStage?: NextStageHint | null;
  scoreboardOverlayForced?: boolean;
  avatarsEnabled?: boolean;
};

export const useQuizSocket = (roomCode: string) => {
  const [events, setEvents] = useState<SocketEvents>({});
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<ReturnType<typeof connectToRoom> | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    const socket = connectToRoom(roomCode);
    socketRef.current = socket;
    setConnected(socket.connected);
    let active = true;

    const mapAnswers = (input?: Record<string, AnswerEntry>) => {
      if (!input) return {};
      const normalized: Record<string, AnswerEntry & { answer?: unknown }> = {};
      Object.entries(input).forEach(([id, entry]) => {
        normalized[id] = { ...entry, answer: (entry as any).answer ?? entry.value };
      });
      return normalized;
    };

    // Note: loadAnswers via REST API is no longer called on init
    // Answers now come exclusively via server:stateUpdate with liveAnswers/results
    // This prevents race conditions and unnecessary network requests

    const onSync = (payload: SyncStatePayload) => {
      const next: SocketEvents = {
        questionPhase: payload.questionPhase,
        timerEndsAt: payload.timerEndsAt
      };
      if (payload.question !== undefined) next.currentQuestion = payload.question;
      if (payload.questionMeta !== undefined) next.questionMeta = payload.questionMeta;
      setEvents((prev) => ({ ...prev, ...next }));
    };

    const onBeamerQuestion = ({ question, meta }: { question: AnyQuestion; meta?: QuestionMeta | null }) => {
      setEvents((prev) => {
        // Only clear answers if we're switching from one question to a different one
        // Not when starting a new session (prev.currentQuestion is null)
        const shouldClearAnswers = prev.currentQuestion && prev.currentQuestion.id !== question.id;
        return {
          ...prev,
          currentQuestion: question,
          questionMeta: meta ?? prev.questionMeta ?? null,
          questionPhase: 'answering',
          answers: shouldClearAnswers ? {} : prev.answers
        };
      });
    };

    const onTeamQuestion = ({ question }: { question: AnyQuestion | null }) => {
      if (!question) return;
      setEvents((prev) => {
        // Only clear answers if we're switching from one question to a different one
        // Not when starting a new session (prev.currentQuestion is null)
        const shouldClearAnswers = prev.currentQuestion && prev.currentQuestion.id !== question.id;
        return {
          ...prev,
          currentQuestion: question,
          questionPhase: 'answering',
          answers: shouldClearAnswers ? {} : prev.answers
        };
      });
    };

    const onTeamsReady = ({ teams }: { teams: Team[] }) => {
      const byId = teams.reduce((acc: Record<string, Team>, t) => ({ ...acc, [t.id]: t }), {});
      setEvents((prev) => ({ ...prev, teams: byId }));
    };

    // Note: onAnswerReceived no longer loads answers via REST API
    // because answers are now provided via server:stateUpdate with liveAnswers
    const onAnswerReceived = () => {
      // No-op: answers come via stateUpdate
    };

    const onAnswersEvaluated = ({ answers, solution }: { answers: Record<string, AnswerEntry>; solution?: string }) => {
      setEvents((prev) => ({
        ...prev,
        answers: mapAnswers(answers),
        solution: solution ?? prev.solution,
        questionPhase: 'evaluated'
      }));
    };

    const onTeamResult = ({
      teamId,
      isCorrect,
      deviation,
      bestDeviation
    }: {
      teamId: string;
      isCorrect?: boolean;
      deviation?: number | null;
      bestDeviation?: number | null;
    }) => {
      setEvents((prev) => {
        const existing = prev.answers ? { ...prev.answers } : {};
        if (!existing[teamId]) return prev;
        existing[teamId] = { ...existing[teamId], isCorrect, deviation, bestDeviation };
        return { ...prev, answers: existing };
      });
    };

    const onEvaluationStarted = () => setEvents((prev) => ({ ...prev, questionPhase: 'evaluated' }));
    const onEvaluationRevealed = () => setEvents((prev) => ({ ...prev, questionPhase: 'revealed' }));
    const onQuizEnded = ({ reason }: { reason?: string }) => {
      // Disable reconnection by clearing the socket
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      // Signal to UI that quiz has ended
      setEvents((prev) => ({ ...prev, gameState: 'QUIZ_ENDED' as any }));
    };
    const onTimerStarted = ({ endsAt }: { endsAt: number }) =>
      setEvents((prev) => ({ ...prev, timerEndsAt: endsAt }));
    const onTimerStopped = () => setEvents((prev) => ({ ...prev, timerEndsAt: null }));
    const onStateUpdate = (payload: StateUpdatePayload) => {
      // Only update answers if we have new data. 
      // If liveAnswers or results are provided, use them.
      // Otherwise keep previous answers.
      let nextAnswers: Record<string, AnswerEntry> | undefined;
      
      if (payload.liveAnswers !== undefined && payload.liveAnswers.length > 0) {
        // Update with liveAnswers only if there are answers
        nextAnswers = payload.liveAnswers.reduce(
          (acc, item) => {
            acc[item.teamId] = { value: item.answer };
            return acc;
          },
          {} as Record<string, AnswerEntry>
        );
      } else if (payload.results !== undefined && payload.results.length > 0) {
        // Or use results if liveAnswers not present
        nextAnswers = payload.results.reduce(
          (acc, item) => {
            acc[item.teamId] = { 
              value: item.answer, 
              isCorrect: item.isCorrect,
              awardedPoints: item.awardedPoints ?? undefined,
              awardedDetail: item.awardedDetail ?? undefined
            };
            return acc;
          },
          {} as Record<string, AnswerEntry>
        );
      }
      // If neither liveAnswers nor results have data, keep previous answers (undefined)
      setEvents((prev) => {
        // Clear answers if switching to a new question
        const isSwitchingQuestion = payload.currentQuestion !== undefined && 
          prev.currentQuestion && 
          prev.currentQuestion.id !== payload.currentQuestion.id;
        
        return {
          ...prev,
          currentQuestion:
            payload.currentQuestion !== undefined ? payload.currentQuestion : prev.currentQuestion,
          questionPhase: payload.phase,
          timerEndsAt: payload.timer?.endsAt ?? prev.timerEndsAt,
          timerDurationMs: payload.timer?.durationMs ?? prev.timerDurationMs,
          gameState: payload.state,
          scores: payload.scores,
          teamsConnected: payload.teamsConnected,
          teamStatus: payload.teamStatus ?? prev.teamStatus,
          potato: payload.potato ?? prev.potato,
          blitz: payload.blitz ?? prev.blitz,
          rundlauf: payload.rundlauf ?? prev.rundlauf,
          questionProgress: payload.questionProgress ?? prev.questionProgress,
          results: payload.results ?? prev.results,
          // Clear answers if switching question, otherwise use nextAnswers or previous
          answers: isSwitchingQuestion ? {} : (nextAnswers !== undefined ? nextAnswers : prev.answers),
          warnings: payload.warnings ?? prev.warnings,
          config: payload.config ?? prev.config,
          nextStage: payload.nextStage ?? prev.nextStage,
          scoreboardOverlayForced: payload.scoreboardOverlayForced ?? prev.scoreboardOverlayForced,
          avatarsEnabled: payload.avatarsEnabled ?? prev.avatarsEnabled
        };
      });
    };

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('syncState', onSync);
    socket.on('beamer:show-question', onBeamerQuestion);
    socket.on('team:show-question', onTeamQuestion);
    socket.on('teamsReady', onTeamsReady);
    socket.on('answerReceived', onAnswerReceived);
    socket.on('answersEvaluated', onAnswersEvaluated);
    socket.on('teamResult', onTeamResult);
    socket.on('evaluation:started', onEvaluationStarted);
    socket.on('evaluation:revealed', onEvaluationRevealed);
    socket.on('quizEnded', onQuizEnded);
    socket.on('timerStarted', onTimerStarted);
    socket.on('timerStopped', onTimerStopped);
    socket.on('server:stateUpdate', onStateUpdate);

    return () => {
      active = false;
      socket.off('connect');
      socket.off('disconnect');
      socket.off('syncState', onSync);
      socket.off('beamer:show-question', onBeamerQuestion);
      socket.off('team:show-question', onTeamQuestion);
      socket.off('teamsReady', onTeamsReady);
      socket.off('answerReceived', onAnswerReceived);
      socket.off('answersEvaluated', onAnswersEvaluated);
      socket.off('teamResult', onTeamResult);
      socket.off('evaluation:started', onEvaluationStarted);
      socket.off('evaluation:revealed', onEvaluationRevealed);
      socket.off('quizEnded', onQuizEnded);
      socket.off('timerStarted', onTimerStarted);
      socket.off('timerStopped', onTimerStopped);
      socket.off('server:stateUpdate', onStateUpdate);
      socket.disconnect();
    };
  }, [roomCode]);

  const emit = (event: string, ...args: unknown[]) => {
    if (!socketRef.current?.connected) return false;
    socketRef.current.emit(event, ...args);
    return true;
  };

  return { ...events, emit, connected };
};
