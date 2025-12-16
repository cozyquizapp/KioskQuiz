import React, { useMemo, useState } from 'react';
import { BingoBoard, QuizCategory } from '@shared/quizTypes';
import { categoryColors } from '../categoryColors';
import { categoryLabels } from '../categoryLabels';
import { categoryIcons } from '../categoryAssets';
import { theme } from '../theme';

const categories: QuizCategory[] = ['Schaetzchen', 'Mu-Cho', 'Stimmts', 'Cheese', 'GemischteTuete'];

const generateBoard = (): BingoBoard => {
  const pool: QuizCategory[] = [];
  categories.forEach((c) => {
    for (let i = 0; i < 5; i += 1) pool.push(c);
  });
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.map((category) => ({ category, marked: false }));
};

const bingoGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  gap: 6,
  width: '100%',
  height: '100%'
};

const BingoPrintPage = () => {
  const [version, setVersion] = useState(0);
  const boards = useMemo(() => Array.from({ length: 8 }, generateBoard), [version]);

  const handleShuffle = () => setVersion((v) => v + 1);
  const handlePrint = () => window.print();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        color: '#0f172a',
        padding: '18px 18px 80px',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      <style>
        {`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          .no-print { display: none !important; }
          body { background: white !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-grid { display: block !important; }
          .sheet {
            display: inline-block !important;
            width: calc(50% - 8mm) !important;
            margin: 0 4mm 8mm 4mm !important;
            vertical-align: top !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .sheet:nth-of-type(2n) { page-break-after: always; break-after: page; }
        }
        `}
      </style>
      <header className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 800 }}>
            Bingo Printer
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>8 Zufalls-Bingofelder zum Ausdrucken</h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8' }}>
            Layout wie Team-Bingo. Nutze "Neu mischen" und dann "Drucken/PDF".
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="no-print"
            onClick={handleShuffle}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'linear-gradient(120deg, rgba(79, 70, 229, 0.45), rgba(56, 189, 248, 0.4))',
              color: '#0b0c10',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 14px 30px rgba(0,0,0,0.35)'
            }}
          >
            Neu mischen
          </button>
          <button
            className="no-print"
            onClick={handlePrint}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.18)',
              background: '#0f172a',
              color: '#e2e8f0',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Drucken / PDF
          </button>
        </div>
      </header>

      <div
        className="print-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16
        }}
      >
        {boards.map((board, idx) => (
          <div
            key={idx}
            className="sheet"
            style={{
              background: '#ffffff',
              borderRadius: 14,
              padding: 10,
              border: '1px solid rgba(15,23,42,0.08)',
              boxShadow: '0 8px 18px rgba(0,0,0,0.06)'
            }}
          >
            <div style={{ position: 'relative', padding: 4 }}>
              <div style={bingoGridStyle}>
                {board.map((cell, cellIdx) => {
                  const color = categoryColors[cell.category] ?? theme.colors.card;
                  const icon = categoryIcons[cell.category];
                  return (
                    <div
                      key={cellIdx}
                      style={{
                        aspectRatio: '1 / 1',
                        borderRadius: 12,
                        border: '1px solid rgba(15,23,42,0.08)',
                        background: color,
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)'
                      }}
                    >
                      {icon && (
                        <img
                          src={icon}
                          alt=""
                          style={{ position: 'absolute', inset: 10, opacity: 0.28, objectFit: 'contain' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BingoPrintPage;
