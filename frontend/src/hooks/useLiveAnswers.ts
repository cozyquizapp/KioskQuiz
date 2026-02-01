import { useEffect, useState } from 'react';
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
  const [answers, setAnswers] = useState<AnswersState | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!roomCode) {
      setAnswers(null);
      return;
    }

    let mounted = true;
    let pollInterval: NodeJS.Timeout | null = null;

    const poll = async () => {
      try {
        setLoading(true);
        const res = await fetchAnswers(roomCode);
        if (!mounted) return;
        
        setAnswers({
          answers: (res.answers ?? {}) as Record<string, AnswerEntry & { answer?: unknown }>,
          teams: res.teams ?? {},
          solution: res.solution
        });
      } catch (err) {
        // Silently fail, keep previous state
      } finally {
        setLoading(false);
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

  return { answers, loading };
};
