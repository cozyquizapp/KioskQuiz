import { useCallback, useRef, useEffect } from 'react';
import { AvatarState } from '../config/avatarStates';

interface IdleSchedulerConfig {
  /** Minimum seconds before showing idle pause */
  minDelay?: number;
  /** Maximum seconds before showing idle pause */
  maxDelay?: number;
  /** Minimum seconds for idle pause duration */
  minDuration?: number;
  /** Maximum seconds for idle pause duration */
  maxDuration?: number;
  /** Enable debug logging */
  debug?: boolean;
}

interface IdleSchedulerCallbacks {
  /** Called when avatar should transition to new state */
  onStateChange: (state: AvatarState) => void;
  /** Get current avatar state */
  getCurrentState: () => AvatarState;
  /** Check if a sequence is currently active */
  isSequenceActive: () => boolean;
}

/**
 * Custom hook for managing avatar idle scheduling
 * Handles periodic idle pauses during walking animation
 */
export function useAvatarIdleScheduler(
  enabled: boolean,
  config: IdleSchedulerConfig = {},
  callbacks: IdleSchedulerCallbacks
) {
  const {
    minDelay = 2,
    maxDelay = 6,
    minDuration = 0.8,
    maxDuration = 1.4,
    debug = false
  } = config;

  const timersRef = useRef<number[]>([]);

  const log = useCallback((...args: any[]) => {
    if (debug) console.log('⏸️ [IdleScheduler]', ...args);
  }, [debug]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const scheduleIdleCycle = useCallback(() => {
    if (!enabled) {
      log('disabled, skipping');
      return;
    }

    const idleDelay = (minDelay + Math.random() * (maxDelay - minDelay)) * 1000;
    const idleDuration = (minDuration + Math.random() * (maxDuration - minDuration)) * 1000;

    log('scheduling idle in', Math.round(idleDelay / 100) / 10, 's');

    const idleTimer = window.setTimeout(() => {
      // If a sequence is active, reschedule instead
      if (callbacks.isSequenceActive()) {
        log('sequence active, rescheduling');
        scheduleIdleCycle();
        return;
      }

      const currentState = callbacks.getCurrentState();
      
      // Only transition to idle if currently walking
      if (currentState === 'walking') {
        log('showing idle for', Math.round(idleDuration), 'ms');
        callbacks.onStateChange('idle');

        const resumeTimer = window.setTimeout(() => {
          if (callbacks.getCurrentState() === 'idle') {
            log('resuming walk');
            callbacks.onStateChange('walking');
          }
          // Reschedule next idle cycle
          scheduleIdleCycle();
        }, idleDuration);

        timersRef.current.push(resumeTimer);
        return;
      }

      // If not walking, reschedule
      log('not walking (state:', currentState, '), rescheduling');
      scheduleIdleCycle();
    }, idleDelay);

    timersRef.current.push(idleTimer);
  }, [enabled, minDelay, maxDelay, minDuration, maxDuration, log, callbacks]);

  // Auto-cleanup on unmount or when disabled
  useEffect(() => {
    return clearTimers;
  }, [clearTimers]);

  return {
    scheduleIdleCycle,
    clearTimers
  };
}
