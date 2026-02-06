import React, { useEffect, useMemo, useState } from 'react';
import { introSlides } from '../introSlides';
import { Language } from '@shared/quizTypes';

const IntroSlidesPage: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [language, setLanguage] = useState<Language>('de');

  const slides = useMemo(() => {
    if (language === 'de' || language === 'en') return introSlides[language];
    // bilingual: combine
    return introSlides.de.map((deSlide, i) => {
      const enSlide = introSlides.en[i] ?? introSlides.en[introSlides.en.length - 1];
      const combine = (deVal: string, enVal: string) => {
        if (deVal === enVal) return deVal;
        return `${deVal} / ${enVal}`;
      };
      return {
        title: combine(deSlide.title, enSlide.title),
        subtitle: combine(deSlide.subtitle, enSlide.subtitle),
        body: combine(deSlide.body, enSlide.body),
        badge: combine(deSlide.badge ?? 'Info', enSlide.badge ?? 'Info')
      };
    });
  }, [language]);

  const slide = slides[index] ?? slides[0];

  const go = (dir: number) => {
    setFade(false);
    setTimeout(() => {
      setIndex((prev) => {
        const next = prev + dir;
        if (next < 0) return Math.max(slides.length - 1, 0);
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
      className="page-transition-enter-active tool-page"
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: 'var(--font)'
      }}
    >
      <div
        className="card-tilt tool-card"
        style={{
          width: '100%',
          maxWidth: 720,
          position: 'relative',
          borderRadius: 24,
          padding: 24,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(15,23,42,0.6)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
          overflow: 'hidden',
          backdropFilter: 'blur(16px)'
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
          <div style={{ fontSize: 13, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 10 }}>
            {index + 1}/{slides.length}
            <div style={{ display: 'flex', gap: 6 }}>
              {(['de', 'en', 'both'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className="tap-squish"
                  style={{
                    padding: '6px 10px',
                    borderRadius: 10,
                    border: language === lang ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.15)',
                    background: language === lang ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    fontWeight: 800
                  }}
                  type="button"
                >
                  {lang === 'de' ? 'DE' : lang === 'en' ? 'EN' : 'DE+EN'}
                </button>
              ))}
            </div>
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
              className="tap-squish"
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
              className="tap-squish"
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
