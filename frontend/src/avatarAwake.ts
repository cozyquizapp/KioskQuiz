// avatarAwake — Event-„Reaktion" für cozy3d-Avatare (Wolf-Idee).
//
// Modell (2026-06-25, Hybrid-Blinzeln): Ruhezustand = OFFENE Augen mit ruhigem
// Idle-Blinzeln (QQTeamAvatar/ImageAvatar). Bei einem Spiel-Event „weckt" man die
// Avatare → sie blinzeln kurz SCHNELLER (sichtbare Reaktion), danach wieder Idle.
//
// Zwei Ebenen:
//   - wakeAllAvatars()        → alle Tiere reagieren (z.B. Teams-Vorstellung)
//   - wakeTeamAvatar(teamId)  → nur ein Team (z.B. „hat einen Punkt / richtig")
//
// QQTeamAvatar liest aktuell das GLOBALE Wake-Fenster (isAvatarAwake()) für den
// Speedup. Greift visuell nur bei Slugs mit -blink-Asset (COZY3D_BLINK_SLUGS).

const WAKE_MS = 2200; // wie lange die Augen offen bleiben pro Event

let _globalUntil = 0;
const _teamUntil = new Map<string, number>();
const _listeners = new Set<() => void>();
let _timer: ReturnType<typeof setTimeout> | null = null;

function _notify() { _listeners.forEach((l) => l()); }

function _scheduleSleep() {
  if (_timer) { clearTimeout(_timer); _timer = null; }
  // Auf die NÄCHSTE (früheste) noch offene Ablaufzeit planen — nicht die
  // späteste. Sonst werden Zwischen-Ablaufzeiten verschluckt und einzelne
  // Avatare gehen zu spät wieder zu. Beim Feuern neu planen (Kaskade).
  const now = Date.now();
  const futures: number[] = [];
  if (_globalUntil > now) futures.push(_globalUntil);
  _teamUntil.forEach((t, id) => { if (t > now) futures.push(t); else _teamUntil.delete(id); });
  if (!futures.length) return;
  const nextExpiry = Math.min(...futures);
  _timer = setTimeout(() => { _timer = null; _notify(); _scheduleSleep(); }, Math.max(0, nextExpiry - now) + 30);
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
