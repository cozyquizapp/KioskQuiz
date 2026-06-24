// avatarAwake — Event-getriebenes „Augen auf" für cozy3d-Avatare (Wolf-Idee).
//
// Modell (besser als Random-Blink): Ruhezustand = GESCHLOSSENE Augen (schläfrig,
// = der heutige Cozy-Look). Bei einem Spiel-Event „weckt" man Avatare → sie
// zeigen kurz die OFFENEN Augen (<slug>-open.png) und schlafen dann wieder ein.
//
// Zwei Ebenen:
//   - wakeAllAvatars()        → alle Tiere öffnen die Augen (z.B. Teams-Vorstellung)
//   - wakeTeamAvatar(teamId)  → nur ein Team (z.B. „hat einen Punkt / richtig")
//
// Komponenten abonnieren via useAvatarAwake(teamId). Greift visuell nur, wenn
// für den Slug ein open-Asset existiert (COZY3D_BLINK_SLUGS) — sonst no-op.

const WAKE_MS = 2200; // wie lange die Augen offen bleiben pro Event

let _globalUntil = 0;
const _teamUntil = new Map<string, number>();
const _listeners = new Set<() => void>();
let _timer: ReturnType<typeof setTimeout> | null = null;

function _notify() { _listeners.forEach((l) => l()); }

function _scheduleSleep() {
  if (_timer) clearTimeout(_timer);
  // Nach dem längsten aktiven Wake-Fenster ein Re-Render auslösen (→ Augen zu).
  const now = Date.now();
  let maxUntil = _globalUntil;
  _teamUntil.forEach((t) => { if (t > maxUntil) maxUntil = t; });
  const delay = Math.max(0, maxUntil - now) + 30;
  _timer = setTimeout(_notify, delay);
}

/** Alle Avatare wecken (z.B. wenn die Teams vorgestellt werden). */
export function wakeAllAvatars(durationMs = WAKE_MS): void {
  _globalUntil = Math.max(_globalUntil, Date.now() + durationMs);
  _notify();
  _scheduleSleep();
}

/** Einen Team-Avatar wecken (z.B. „richtig geraten" / Punkt bekommen). */
export function wakeTeamAvatar(teamId: string | undefined | null, durationMs = WAKE_MS): void {
  if (!teamId) return;
  _teamUntil.set(teamId, Math.max(_teamUntil.get(teamId) ?? 0, Date.now() + durationMs));
  _notify();
  _scheduleSleep();
}

/** Liefert true, solange das (globale ODER team-spezifische) Wake-Fenster offen ist. */
export function isAvatarAwake(teamId?: string | null): boolean {
  const now = Date.now();
  if (_globalUntil > now) return true;
  if (teamId && (_teamUntil.get(teamId) ?? 0) > now) return true;
  return false;
}

/** React-Subscribe-Helfer (intern von QQTeamAvatar genutzt). */
export function subscribeAwake(cb: () => void): () => void {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}
