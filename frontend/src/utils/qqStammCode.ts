/**
 * qqStammCode — Format-Helpers fuer Team-IDs ↔ Stamm-Code.
 *
 * 2026-05-02 (Stamm-Team-Code): teamId hat Format `team-abc123`. Wir
 * formatieren das als `T-ABC123` fuer die Anzeige + akzeptieren das beim
 * Eingeben (case-insensitive, mit/ohne Bindestrich). Andere Eingaben werden
 * trotzdem normalisiert versucht (User koennte z.B. "ABC123" tippen).
 *
 * Genutzt im Setup-Flow (parse), GameOverCard (format) und Re-Join.
 *
 * Extrahiert aus QQTeamPage.tsx 2026-05-13 (Refactor Phase 3.1).
 */

export function formatStammCode(teamId: string): string {
  const suffix = teamId.replace(/^team-/i, '').toUpperCase();
  return suffix ? `T-${suffix}` : teamId.toUpperCase();
}

export function parseStammCodeToTeamId(input: string): string {
  const cleaned = input.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  // Entferne fuehrendes "t" (T-Prefix).
  const suffix = cleaned.replace(/^t/, '');
  if (suffix.length < 4) return ''; // zu kurz, ignorieren
  return `team-${suffix}`;
}
