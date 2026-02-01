import { useEffect, useRef, useState } from 'react';
import { fetchAnswers } from '../api';
import { AnswerEntry, Team } from '@shared/quizTypes';

export type AnswersState = {
  answers: Record<string, AnswerEntry & { answer?: unknown }>;
  teams: Record<string, Team>;
  solution?: string;
};

/**
 * Hook that polls the server for live answers every 500ms
 * This is independent of socket events and avoids all the race conditions
 */
export const useLiveAnswers = (roomCode: string | null) => {
  const [answers, setAnswers] = useState<AnswersState>({
    answers: {},
    teams: {},
    solution: undefined
  });
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!roomCode) {
      setAnswers({ answers: {}, teams: {}, solution: undefined });
      return;
    }

    let mounted = true;
    let pollInterval: NodeJS.Timeout | null = null;

    const poll = async () => {
      try {
        const res = await fetchAnswers(roomCode);
        if (!mounted) return;
        
        // Only update if we actually got data
        if (res && (res.answers || res.teams)) {
          setAnswers({
            answers: (res.answers ?? {}) as Record<string, AnswerEntry & { answer?: unknown }>,
            teams: res.teams ?? {},
            solution: res.solution
          });
          lastUpdateRef.current = Date.now();
        }
      } catch (err) {
        // Silently fail, keep previous state
      }
    };

    // Initial poll
    poll();

    // Poll every 500ms
    pollInterval = setInterval(poll, 500);

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [roomCode]);

  return answers;
};

