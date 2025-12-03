import { useEffect, useRef, useState } from 'react';
import { connectToRoom } from '../socket';
import { AnyQuestion } from '@shared/quizTypes';

type SocketEvents = {
  currentQuestion?: AnyQuestion | null;
  answers?: Record<string, { answer: unknown }>;
  teams?: Record<string, { name: string }>;
};

export const useQuizSocket = (roomCode: string) => {
  const [events, setEvents] = useState<SocketEvents>({});
  const socketRef = useRef<ReturnType<typeof connectToRoom> | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    const socket = connectToRoom(roomCode);
    socketRef.current = socket;

    const onSync = (payload: any) => {
      // payload may contain question, answers, teams depending on backend broadcast
      const next: SocketEvents = {};
      if (payload.question !== undefined) next.currentQuestion = payload.question;
      if (payload.answers !== undefined) next.answers = payload.answers;
      if (payload.teams !== undefined) next.teams = payload.teams;
      setEvents((prev) => ({ ...prev, ...next }));
    };

    socket.on('syncState', onSync);
    socket.on('currentQuestion', (q: AnyQuestion | null) => setEvents((prev) => ({ ...prev, currentQuestion: q })));
    socket.on('answers', (a: Record<string, { answer: unknown }>) => setEvents((prev) => ({ ...prev, answers: a })));
    socket.on('teams', (t: Record<string, { name: string }>) => setEvents((prev) => ({ ...prev, teams: t })));

    return () => {
      socket.off('syncState', onSync);
      socket.off('currentQuestion');
      socket.off('answers');
      socket.off('teams');
      socket.disconnect();
    };
  }, [roomCode]);

  return events;
};
