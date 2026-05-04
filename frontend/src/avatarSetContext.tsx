// 2026-05-04 — AvatarSetContext
// Zentrale Quelle fuer das aktuell aktive Avatar-Set, damit nicht jeder der
// 40+ QQTeamAvatar-Call-Sites das setId per Prop durchreichen muss.
//
// Top-Level-Pages (QQBeamerPage, QQModeratorPage, QQTeamPage) wickeln ihren
// Inhalt mit <AvatarSetProvider value={state.avatarSetId}> ein. QQTeamAvatar
// konsumiert via useAvatarSet().

import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_SET_ID } from './avatarSets';

const AvatarSetContext = createContext<string>(DEFAULT_SET_ID);

export function AvatarSetProvider({
  value, children,
}: { value: string | undefined; children: ReactNode }) {
  return (
    <AvatarSetContext.Provider value={value ?? DEFAULT_SET_ID}>
      {children}
    </AvatarSetContext.Provider>
  );
}

export function useAvatarSet(): string {
  return useContext(AvatarSetContext);
}
