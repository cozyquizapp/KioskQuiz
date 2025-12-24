import React, { useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
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
  gap: 10,
  width: '100%',
  height: '100%'
};

const sheetSize = '180mm';
const sheetMaxWidth = 'calc(100% - 20mm)';
const sheetPadding = 8;

const imageCache = new Map<string, HTMLImageElement>();

const loadIcon = async (src: string) => {
  if (imageCache.has(src)) return imageCache.get(src)!;
  return new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => resolve(img);
    img.src = src;
  });
};

const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, radius: number) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + size - radius, y);
  ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
  ctx.lineTo(x + size, y + size - radius);
  ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
  ctx.lineTo(x + radius, y + size);
  ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
};

const drawCell = async (
  ctx: CanvasRenderingContext2D,
  cell: BingoBoard[number],
  x: number,
  y: number,
  size: number
) => {
  const color = categoryColors[cell.category] ?? theme.colors.card;
  const radius = Math.max(24, size * 0.16);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.fillStyle = color;
  drawRoundedRect(ctx, x, y, size, radius);
  ctx.fill();

  const sheen = ctx.createLinearGradient(x, y, x + size, y + size);
  sheen.addColorStop(0, 'rgba(255,255,255,0.16)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.05)');
  ctx.fillStyle = sheen;
  ctx.fill();

  ctx.lineWidth = Math.max(2, size * 0.012);
  ctx.strokeStyle = 'rgba(15,23,42,0.14)';
  ctx.stroke();

  const iconUrl = categoryIcons[cell.category];
  if (iconUrl) {
    const icon = await loadIcon(iconUrl);
    const inset = Math.max(18, size * 0.12);
    const iconSize = size - inset * 2;
    ctx.globalAlpha = 0.96;
    ctx.drawImage(icon, x + inset, y + inset, iconSize, iconSize);
  }

  ctx.restore();
};

const renderBoardCanvas = async (board: BingoBoard, size: number, padding = 36) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const cellSize = (size - padding * 2) / 5;
  ctx.clearRect(0, 0, size, size);

  for (let i = 0; i < board.length; i += 1) {
    const x = padding + (i % 5) * cellSize;
    const y = padding + Math.floor(i / 5) * cellSize;
    // eslint-disable-next-line no-await-in-loop
    await drawCell(ctx, board[i], x, y, cellSize);
  }

  return canvas;
};

const renderSingleCellCanvas = async (cell: BingoBoard[number], size: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, size, size);
  await drawCell(ctx, cell, 0, 0, size);
  return canvas;
};

const renderBackCanvas = async (size: number, logoSrc: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  if (logoSrc) {
    const logo = await loadIcon(logoSrc);
    const logoScale = 0.64;
    const logoSize = size * logoScale;
    const offset = (size - logoSize) / 2;
    ctx.globalAlpha = 0.12;
    ctx.drawImage(logo, offset, offset, logoSize, logoSize);
  }

  return canvas;
};

const BingoPrintPage = () => {
  const [version, setVersion] = useState(0);
  const boards = useMemo(() => Array.from({ length: 16 }, generateBoard), [version]);
  const printPages = useMemo(
    () => boards.flatMap((board) => [{ kind: 'front' as const, board }, { kind: 'back' as const, board }]),
    [boards]
  );

  const handleShuffle = () => setVersion((v) => v + 1);
  const handlePrint = () => window.print();

  const exportBoardPng = async (board: BingoBoard, idx: number) => {
    const canvas = await renderBoardCanvas(board, 2400, 48);
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `bingo-${idx + 1}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, 'image/png');
  };

  const exportBoardPdf = async (board: BingoBoard, idx: number) => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const targetSize = Math.min(pageWidth - 14, pageHeight - 28);

    for (let i = 0; i < board.length; i += 1) {
      const canvas = await renderSingleCellCanvas(board[i], 2400);
      const dataUrl = canvas.toDataURL('image/png');
      const x = (pageWidth - targetSize) / 2;
      const y = (pageHeight - targetSize) / 2;
      pdf.addImage(dataUrl, 'PNG', x, y, targetSize, targetSize, undefined, 'FAST');
      if (i < board.length - 1) pdf.addPage();
    }

    pdf.save(`bingo-felder-${idx + 1}.pdf`);
  };

  const exportBackPdf = async (idx: number) => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const targetSize = Math.min(pageWidth - 14, pageHeight - 28);

    const canvas = await renderBackCanvas(2400, '/logo.png');
    const dataUrl = canvas.toDataURL('image/png');
    const x = (pageWidth - targetSize) / 2;
    const y = (pageHeight - targetSize) / 2;
    pdf.addImage(dataUrl, 'PNG', x, y, targetSize, targetSize, undefined, 'FAST');

    pdf.save(`bingo-back-${idx + 1}.pdf`);
  };

  const exportStandaloneBackPdf = async () => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const targetSize = Math.min(pageWidth - 14, pageHeight - 28);

    const canvas = await renderBackCanvas(2400, '/logo.png');
    const dataUrl = canvas.toDataURL('image/png');
    const x = (pageWidth - targetSize) / 2;
    const y = (pageHeight - targetSize) / 2;
    pdf.addImage(dataUrl, 'PNG', x, y, targetSize, targetSize, undefined, 'FAST');

    pdf.save('bingo-back.pdf');
  };

  return (
    <div
      className="bingo-print-page"
      style={{
        minHeight: '100vh',
        color: '#0f172a',
        padding: '18px 18px 80px',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      <style>
        {`
        .bingo-print-page {
          background: #f8fafc;
        }
        @media print {
          .bingo-print-page {
            background: white !important;
          }
          .sheet,
          .sheet-back {
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          .bingo-cell {
            border: none !important;
            box-shadow: none !important;
          }
          @page { size: A4 portrait; margin: 8mm; }
          .no-print { display: none !important; }
          body { background: white !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-grid { display: block !important; }
          .sheet {
            display: block !important;
            width: ${sheetSize} !important;
            max-width: ${sheetMaxWidth} !important;
            margin: 0 auto 10mm auto !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .sheet-back {
            display: block !important;
            width: ${sheetSize} !important;
            max-width: ${sheetMaxWidth} !important;
            margin: 0 auto 10mm auto !important;
            break-after: page !important;
            page-break-after: always !important;
          }
        }
        @media screen {
          .sheet-back {
            display: none;
          }
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
          <button
            className="no-print"
            onClick={exportStandaloneBackPdf}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid rgba(15,23,42,0.18)',
              background: '#111827',
              color: '#e5e7eb',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Back PDF
          </button>
        </div>
      </header>

      <section
        className="no-print"
        style={{
          marginBottom: 20,
          background: '#fff',
          borderRadius: 14,
          padding: 14,
          border: '1px solid rgba(15,23,42,0.08)',
          boxShadow: '0 8px 18px rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap'
        }}
      >
        <div
          style={{
            width: 160,
            height: 160,

            borderRadius: 18,
            position: 'relative',
            overflow: 'hidden',
            background: '#fff',
            flexShrink: 0
          }}
        >
          <img
            src="/logo.png"
            alt="Back Logo"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '64%',
              height: '64%',
              transform: 'translate(-50%, -50%)',
              objectFit: 'contain',
              opacity: 0.12,
              mixBlendMode: 'multiply'
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Rückseite (Back)</div>
          <div style={{ color: '#64748b', marginBottom: 10 }}>
            Weißer Hintergrund, transparentes Logo, gleiche Größe wie das Bingofeld. PDF als einzelne A4-Seite.
          </div>
          <button
            onClick={exportStandaloneBackPdf}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid rgba(15,23,42,0.12)',
              background: '#111827',
              color: '#e5e7eb',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 10px 18px rgba(0,0,0,0.12)'
            }}
          >
            Back PDF Download
          </button>
        </div>
      </section>

      <div
        className="print-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16
        }}
      >
        {printPages.map((page, idx) =>
          page.kind === 'front' ? (
            <div
              key={`front-${idx}`}
              className="sheet"
              style={{
                background: '#ffffff',
                borderRadius: 16,
                padding: sheetPadding,
                border: '1px solid rgba(15,23,42,0.08)',
                boxShadow: '0 8px 18px rgba(0,0,0,0.06)',
                width: sheetSize,
                maxWidth: sheetMaxWidth,
                margin: '0 auto'
              }}
            >
              <div style={{ position: 'relative', padding: 0, width: '100%', aspectRatio: '1 / 1' }}>
                <div className="bingo-grid" style={{ ...bingoGridStyle, width: '100%', height: '100%' }}>
                  {page.board.map((cell, cellIdx) => {
                    const color = categoryColors[cell.category] ?? theme.colors.card;
                    const icon = categoryIcons[cell.category];
                    return (
                      <div
                        className="bingo-cell"
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
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 12px 26px rgba(0,0,0,0.08)'
                        }}
                      >
                        {icon && (
                          <img
                            src={icon}
                            alt=""
                            style={{
                              position: 'absolute',
                              inset: 10,
                              opacity: 0.94,
                              objectFit: 'contain',
                              imageRendering: 'high-quality',
                              filter: 'drop-shadow(0 12px 20px rgba(0,0,0,0.18))'
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="no-print" style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => exportBoardPng(page.board, Math.floor(idx / 2))}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid rgba(15,23,42,0.12)',
                    background: '#0f172a',
                    color: '#e2e8f0',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  PNG Download
                </button>
                <button
                  onClick={() => exportBoardPdf(page.board, Math.floor(idx / 2))}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(15,23,42,0.12)',
                    background: '#f59e0b',
                    color: '#0f172a',
                    fontWeight: 800,
                    cursor: 'pointer',
                    marginLeft: 8,
                    boxShadow: '0 10px 18px rgba(0,0,0,0.12)'
                  }}
                >
                  PDF (A4 Einzelfelder)
                </button>
                <button
                  onClick={() => exportBackPdf(Math.floor(idx / 2))}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(15,23,42,0.12)',
                    background: '#111827',
                    color: '#e5e7eb',
                    fontWeight: 800,
                    cursor: 'pointer',
                    marginLeft: 8,
                    boxShadow: '0 10px 18px rgba(0,0,0,0.12)'
                  }}
                >
                  PDF Back
                </button>
              </div>
            </div>
          ) : (
            <div
              key={`back-${idx}`}
              className="sheet sheet-back"
              style={{
                background: '#ffffff',
                borderRadius: 16,
                padding: sheetPadding,
                border: '1px solid rgba(15,23,42,0.08)',
                boxShadow: '0 8px 18px rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: sheetSize,
                maxWidth: sheetMaxWidth,
                margin: '0 auto'
              }}
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
      
                  borderRadius: 18,
                  position: 'relative',
                  overflow: 'hidden',
                  background: '#fff'
                }}
              >
                <img
                  src="/logo.png"
                  alt=""
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '64%',
                    height: '64%',
                    transform: 'translate(-50%, -50%)',
                    objectFit: 'contain',
                    opacity: 0.1,
                    mixBlendMode: 'multiply'
                  }}
                />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default BingoPrintPage;
