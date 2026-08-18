import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { QQ_ALLOWED_THEME_IDS, coerceQQThemeId, QQ_DEFAULT_THEME_ID } from '../shared/qqThemeIds';

// ─────────────────────────────────────────────────────────────────────────────
// Drift-Wache fuer die Buehnen-Designs (2026-08-18).
//
// Anlass: der Handler `qq:setTheme` pflegte seine eigene Liste erlaubter IDs.
// Ein im Frontend registriertes Theme, das dort fehlte, wurde vom Server STILL
// auf 'cozy' zurueckgesetzt — kein Fehler, kein Log, der Skin-Klick blieb
// wirkungslos. Gekostet hat das eine komplette Verifikations-Runde.
//
// Der Test liest die Theme-Registry des Frontends als TEXT (kein Import: die
// Datei zieht React und CSS-Vars nach) und vergleicht die Schluessel mit der
// gemeinsamen Liste. Neues Theme nur im Frontend = roter Test.
// ─────────────────────────────────────────────────────────────────────────────

function frontendThemeIds(): string[] {
  const src = readFileSync(new URL('../frontend/src/qqTheme.ts', import.meta.url), 'utf-8');
  const block = src.match(/export const QQ_THEMES: Record<string, ResolvedTheme> = \{([\s\S]*?)\n\};/);
  if (!block) throw new Error('QQ_THEMES-Block in frontend/src/qqTheme.ts nicht gefunden');
  return [...block[1].matchAll(/^\s*([A-Za-z0-9_]+)\s*:/gm)].map((m) => m[1]);
}

describe('QQ-Theme-IDs (Frontend-Registry vs. Server-Allowlist)', () => {
  it('jedes im Frontend registrierte Theme ist serverseitig erlaubt', () => {
    const missing = frontendThemeIds().filter((id) => !(QQ_ALLOWED_THEME_IDS as readonly string[]).includes(id));
    expect(missing, `Theme(s) fehlen in shared/qqThemeIds.ts: ${missing.join(', ')}`).toEqual([]);
  });

  it('jede erlaubte ID existiert auch im Frontend (keine Karteileichen)', () => {
    const fe = frontendThemeIds();
    const orphans = QQ_ALLOWED_THEME_IDS.filter((id) => !fe.includes(id));
    expect(orphans, `ID(s) ohne Theme-Objekt: ${orphans.join(', ')}`).toEqual([]);
  });

  it('unbekannte IDs fallen auf den Default zurueck', () => {
    expect(coerceQQThemeId('gibtsNicht')).toBe(QQ_DEFAULT_THEME_ID);
    expect(coerceQQThemeId(undefined)).toBe(QQ_DEFAULT_THEME_ID);
    expect(coerceQQThemeId('cozyKino')).toBe('cozyKino');
  });
});
