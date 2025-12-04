import { useEffect, useRef, useState } from 'react';
import { connectToRoom } from '../socket';
import { AnswerEntry, AnyQuestion, QuestionMeta, QuestionPhase, SyncStatePayload, Team } from '@shared/quizTypes';
import { fetchAnswers } from '../api';

type SocketEvents = {
  currentQuestion?: AnyQuestion | null;
  questionMeta?: QuestionMeta | null;
  questionPhase?: QuestionPhase;
  timerEndsAt?: number | null;
  answers?: Record<string, AnswerEntry & { answer?: unknown }>;
  teams?: Record<string, Team>;
  solution?: string;
};

export const useQuizSocket = (roomCode: string) => {
  const [events, setEvents] = useState<SocketEvents>({});
  const socketRef = useRef<ReturnType<typeof connectToRoom> | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    const socket = connectToRoom(roomCode);
    socketRef.current = socket;
    let active = true;

    const mapAnswers = (input?: Record<string, AnswerEntry>) => {
      if (!input) return {};
      const normalized: Record<string, AnswerEntry & { answer?: unknown }> = {};
      Object.entries(input).forEach(([id, entry]) => {
        normalized[id] = { ...entry, answer: (entry as any).answer ?? entry.value };
      });
      return normalized;
    };

    const loadAnswers = async () => {
      try {
        const res = await fetchAnswers(roomCode);
        if (!active) return;
        setEvents((prev) => ({
          ...prev,
          answers: mapAnswers(res.answers) ?? prev.answers ?? {},
          teams: res.teams ?? prev.teams ?? {},
          solution: res.solution ?? prev.solution
        }));
      } catch {
        // ignore fetch errors in passive listener
      }
    };

    // initial hydrate of teams/answers
    loadAnswers().catch(() => undefined);

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
      setEvents((prev) => ({
        ...prev,
        currentQuestion: question,
        questionMeta: meta ?? prev.questionMeta ?? null,
        questionPhase: 'answering'
      }));
    };

    const onTeamQuestion = ({ question }: { question: AnyQuestion | null }) => {
      if (!question) return;
      setEvents((prev) => ({ ...prev, currentQuestion: question, questionPhase: 'answering' }));
    };

    const onTeamsReady = ({ teams }: { teams: Team[] }) => {
      const byId = teams.reduce((acc: Record<string, Team>, t) => ({ ...acc, [t.id]: t }), {});
      setEvents((prev) => ({ ...prev, teams: byId }));
    };

    const onAnswerReceived = () => loadAnswers();

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
    const onTimerStarted = ({ endsAt }: { endsAt: number }) =>
      setEvents((prev) => ({ ...prev, timerEndsAt: endsAt }));
    const onTimerStopped = () => setEvents((prev) => ({ ...prev, timerEndsAt: null }));

    socket.on('syncState', onSync);
    socket.on('beamer:show-question', onBeamerQuestion);
    socket.on('team:show-question', onTeamQuestion);
    socket.on('teamsReady', onTeamsReady);
    socket.on('answerReceived', onAnswerReceived);
    socket.on('answersEvaluated', onAnswersEvaluated);
    socket.on('teamResult', onTeamResult);
    socket.on('evaluation:started', onEvaluationStarted);
    socket.on('evaluation:revealed', onEvaluationRevealed);
    socket.on('timerStarted', onTimerStarted);
    socket.on('timerStopped', onTimerStopped);

    return () => {
      active = false;
      socket.off('syncState', onSync);
      socket.off('beamer:show-question', onBeamerQuestion);
      socket.off('team:show-question', onTeamQuestion);
      socket.off('teamsReady', onTeamsReady);
      socket.off('answerReceived', onAnswerReceived);
      socket.off('answersEvaluated', onAnswersEvaluated);
      socket.off('teamResult', onTeamResult);
      socket.off('evaluation:started', onEvaluationStarted);
      socket.off('evaluation:revealed', onEvaluationRevealed);
      socket.off('timerStarted', onTimerStarted);
      socket.off('timerStopped', onTimerStopped);
      socket.disconnect();
    };
  }, [roomCode]);

  const emit = (event: string, ...args: unknown[]) => {
    socketRef.current?.emit(event, ...args);
  };

  return { ...events, emit };
};
