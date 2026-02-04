import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchAnswers, overrideAnswer as apiOverrideAnswer } from '../api';
import { AnswerEntry, Team } from '@shared/quizTypes';

export type AnswersState = {
  answers: Record<string, AnswerEntry & { answer?: unknown }>;
  teams: Record<string, Team>;
  solution?: string;
};

/**
 * Hook that polls the server for live answers every 1000ms
 * Maintains answers persistently - only updates when new data is fetched
 */
export const useLiveAnswers = (roomCode: string | null, questionId?: string | null) => {
  const [answers, setAnswers] = useState<AnswersState>({
    answers: {},
    teams: {},
    solution: undefined
  });
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const roomCodeRef = useRef(roomCode);

  // Update roomCode ref
  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);

  const poll = useCallback(async () => {
    if (!roomCodeRef.current) return;
    
    try {
      const res = await fetchAnswers(roomCodeRef.current);
      const nextAnswers = (res.answers ?? {}) as Record<string, AnswerEntry & { answer?: unknown }>;
      const nextTeams = res.teams ?? {};
      const nextSolution = res.solution;
      const hasPayload =
        Object.keys(nextAnswers).length > 0 ||
        Object.keys(nextTeams).length > 0 ||
        nextSolution !== undefined;

      if (hasPayload) {
        setAnswers({
          answers: nextAnswers,
          teams: nextTeams,
          solution: nextSolution
        });
      }
    } catch (err) {
      // Silently ignore errors, keep polling
    }
  }, []);

  const overrideAnswer = useCallback(async (teamId: string, isCorrect: boolean) => {
    if (!roomCodeRef.current) return;
    await apiOverrideAnswer(roomCodeRef.current, teamId, isCorrect);
    // Poll immediately after override to get fresh data
    await poll();
  }, [poll]);

  useEffect(() => {
    setAnswers({ answers: {}, teams: {}, solution: undefined });
  }, [questionId]);

  useEffect(() => {
    if (!roomCode) {
      setAnswers({ answers: {}, teams: {}, solution: undefined });
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    let mounted = true;

    // Initial poll immediately
    poll();

    // Then poll every 1000ms
    pollIntervalRef.current = setInterval(poll, 1000);

    return () => {
      mounted = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [roomCode, poll]);

  return { answers, overrideAnswer };
};



