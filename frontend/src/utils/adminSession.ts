const adminTokenKey = (roomCode: string) => `admin-token-${roomCode}`;

export const ensureAdminSession = async (roomCode: string): Promise<string | null> => {
  if (!roomCode || typeof window === 'undefined') return null;
  const key = adminTokenKey(roomCode);
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  try {
    const storedPin = sessionStorage.getItem('qq_admin_pin') || '';
    const res = await fetch(`/api/rooms/${roomCode}/admin-session?pin=${encodeURIComponent(storedPin)}`, { method: 'GET' });
    if (!res.ok) return null;
    const { token } = await res.json();
    if (token) {
      sessionStorage.setItem(key, token);
      return token as string;
    }
  } catch {
    // Silent fail - proceed without token
  }
  return null;
};
