import { useCallback, useRef } from 'react';
import { AvatarState } from '../config/avatarStates';

interface SequenceStep {
  state: AvatarState;
  duration: number;
}

interface SequenceCallbacks {
  /** Called when state should change */
  onStateChange: (state: AvatarState) => void;
  /** Called after sequence completes */
  onSequenceComplete?: () => void;
}

/**
 * Custom hook for managing avatar animation sequences
 * Handles timed state transitions (tap gestures, results, etc)
 */
export function useAvatarSequenceRunner(callbacks: SequenceCallbacks) {
  const timersRef = useRef<number[]>([]);
  const activeRef = useRef(false);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const isSequenceActive = useCallback(() => {
    return activeRef.current;
  }, []);

  const runSequence = useCallback(
    (steps: SequenceStep[]) => {
      if (steps.length === 0) return false;

      clearTimers();
      activeRef.current = true;

      let delay = 0;
      steps.forEach((step) => {
        const timer = window.setTimeout(() => {
          callbacks.onStateChange(step.state);
        }, delay);
        timersRef.current.push(timer);
        delay += step.duration;
      });

      // Mark sequence as complete after all steps
      const endTimer = window.setTimeout(() => {
        activeRef.current = false;
        callbacks.onSequenceComplete?.();
      }, delay);
      timersRef.current.push(endTimer);

      return true;
    },
    [callbacks, clearTimers]
  );

  const cancel = useCallback(() => {
    clearTimers();
    activeRef.current = false;
  }, [clearTimers]);

  return {
    runSequence,
    isSequenceActive,
    cancel,
    clearTimers
  };
}
