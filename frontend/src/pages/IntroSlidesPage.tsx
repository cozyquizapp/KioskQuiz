import React, { useEffect, useState } from 'react';
import { introSlides as slides } from '../introSlides';

const IntroSlidesPage: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  const slide = slides[index];

  const go = (dir: number) => {
    setFade(false);
    setTimeout(() => {
      setIndex((prev) => {
        const next = prev + dir;
        if (next < 0) return slides.length - 1;
        if (next >= slides.length) return 0;
        return next;
      });
      setFade(true);
    }, 160);
  };

  useEffect(() => {
    const t = setInterval(() => go(1), 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 20% 20%, rgba(111,142,255,0.16), transparent 45%), radial-gradient(circle at 80% 10%, rgba(248,180,0,0.15), transparent 40%), #0c111a',
        color: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          borderRadius: 24,
          padding: 24,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(135deg, rgba(15,18,28,0.92), rgba(18,22,32,0.82))',
          boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: 12,
              letterSpacing: '0.12em',
              textTransform: 'uppercase'
            }}
          >
            {slide.badge ?? 'Info'}
          </div>
          <div style={{ fontSize: 13, color: '#cbd5e1' }}>
            {index + 1}/{slides.length}
          </div>
        </div>

        <div
          style={{
            transition: 'opacity 180ms ease, transform 180ms ease',
            opacity: fade ? 1 : 0,
            transform: fade ? 'translateY(0)' : 'translateY(8px)'
          }}
        >
          <div style={{ fontSize: 16, color: '#cbd5e1', marginBottom: 4 }}>{slide.subtitle}</div>
          <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.25, marginBottom: 10 }}>{slide.title}</div>
          <div style={{ fontSize: 16, color: '#e2e8f0', lineHeight: 1.5 }}>{slide.body}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.04)',
                color: '#f8fafc',
                cursor: 'pointer'
              }}
              onClick={() => go(-1)}
            >
              Zurück
            </button>
            <button
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(109,213,250,0.12)',
                color: '#f8fafc',
                cursor: 'pointer'
              }}
              onClick={() => go(1)}
            >
              Weiter
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {slides.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: i === index ? '#fbbf24' : 'rgba(255,255,255,0.25)',
                  transform: i === index ? 'scale(1.2)' : 'scale(1)',
                  transition: 'all 140ms ease'
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

export default IntroSlidesPage;
