// 2026-05-04 — AvatarSetContext
// Zentrale Quelle fuer das aktuell aktive Avatar-Set + optional Server-
// gewuerfelte Slot-Emojis (bei Set 'all'), damit nicht jeder der 40+
// QQTeamAvatar-Call-Sites das via Prop durchreichen muss.

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DEFAULT_SET_ID } from './avatarSets';

export type AvatarSetCtxValue = {
  /** Aktuelle Set-ID ('all' | 'cozyAnimals' | 'cozyCast' | …) */
  id: string;
  /** Optionales 8er-Override (bei Set 'all' vom Backend gewuerfelt). */
  emojis?: string[];
};

const AvatarSetContext = createContext<AvatarSetCtxValue>({ id: DEFAULT_SET_ID });

export function AvatarSetProvider({
  value, emojis, children,
}: { value: string | undefined; emojis?: string[]; children: ReactNode }) {
  const ctx = useMemo<AvatarSetCtxValue>(
    () => ({ id: value ?? DEFAULT_SET_ID, emojis }),
    [value, emojis],
  );
  return (
    <AvatarSetContext.Provider value={ctx}>
      {children}
    </AvatarSetContext.Provider>
  );
}

/** Alte API: nur die Set-ID (fuer einfache Konsumenten). */
export function useAvatarSet(): string {
  return useContext(AvatarSetContext).id;
}

/** Neue API: full Context inklusive Server-Override-Emojis. */
export function useAvatarSetCtx(): AvatarSetCtxValue {
  return useContext(AvatarSetContext);
}
