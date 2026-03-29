import { useState } from 'react';

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('qq_admin_unlocked') === '1');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (unlocked) return <>{children}</>;

  function submit() {
    const correct = import.meta.env.VITE_ADMIN_PIN ?? '2506';
    if (pin === correct) {
      sessionStorage.setItem('qq_admin_unlocked', '1');
      setUnlocked(true);
    } else {
      setError(true);
      setPin('');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b0d14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <div style={{ fontSize: 40 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#e2e8f0' }}>Staff-Bereich</div>
        <input
          type="password"
          inputMode="numeric"
          maxLength={8}
          value={pin}
          onChange={e => { setPin(e.target.value); setError(false); }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          autoFocus
          placeholder="PIN eingeben"
          style={{ padding: '12px 20px', fontSize: 20, borderRadius: 12, border: error ? '2px solid #EF4444' : '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', outline: 'none', textAlign: 'center', letterSpacing: '0.3em', width: 200, boxSizing: 'border-box' }}
        />
        {error && <div style={{ color: '#EF4444', fontSize: 13, fontWeight: 700 }}>Falscher PIN</div>}
        <button onClick={submit} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: '#3B82F6', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
          Weiter →
        </button>
      </div>
    </div>
  );
}
