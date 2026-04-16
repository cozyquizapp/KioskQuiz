// QQ City Lab — Test-Seite um drei Darstellungs-Varianten für das Grid
// nebeneinander zu vergleichen. Nur zum Brainstormen, keine Moderatorenlogik.
//
// Varianten:
//   1. Stilisierte Low-Poly-Stadt (heutiges 3D poliert, klares Dach/Körper-Muster)
//   2. Isometrisches Quartier (feste Iso-Perspektive, "Stadtplan-Look")
//   3. Parzellen-Stil (flache Iso-Tiles mit Nutzungstypen: Park, Platz, Block, Markt)

import { useMemo, useState } from 'react';

type TeamId = 'A' | 'B' | 'C' | 'D' | null;

const TEAMS: Record<Exclude<TeamId, null>, { color: string; emoji: string; name: string }> = {
  A: { color: '#3B82F6', emoji: '🐟', name: 'Blaubeeren' },
  B: { color: '#22C55E', emoji: '🐸', name: 'Moos' },
  C: { color: '#EF4444', emoji: '🦊', name: 'Paprika' },
  D: { color: '#F97316', emoji: '🐯', name: 'Kürbis' },
};

// Demo-Grid: 5×5, etwas gestreut + ein paar Joker
const DEMO_GRID: Array<Array<{ owner: TeamId; joker?: boolean; height?: number }>> = [
  [{ owner: 'A' }, { owner: 'A' }, { owner: null }, { owner: 'B' }, { owner: 'B' }],
  [{ owner: 'A', joker: true }, { owner: 'A', joker: true }, { owner: 'C' }, { owner: 'B' }, { owner: null }],
  [{ owner: null }, { owner: 'C' }, { owner: 'C' }, { owner: 'D' }, { owner: 'D' }],
  [{ owner: 'D' }, { owner: 'C' }, { owner: null }, { owner: 'D' }, { owner: null }],
  [{ owner: 'D' }, { owner: null }, { owner: 'B' }, { owner: 'B' }, { owner: 'A' }],
];

// Stabile Pseudo-Heights aus Row/Col, damit Variante 1 deterministisch ist
function heightFor(r: number, c: number, owner: TeamId): number {
  if (!owner) return 0;
  const seed = (r * 17 + c * 31) % 4; // 0..3
  return 42 + seed * 18; // 42, 60, 78, 96
}

export default function QQCityLabPage() {
  const [variant, setVariant] = useState<1 | 2 | 3>(2);
  const [showAll, setShowAll] = useState(true);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #1e293b 0%, #0b0d14 55%, #050712 100%)',
      color: '#e2e8f0',
      fontFamily: "'Nunito', system-ui, sans-serif",
      padding: '28px 20px 60px',
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <Header variant={variant} setVariant={setVariant} showAll={showAll} setShowAll={setShowAll} />

        {showAll ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 18,
            marginTop: 28,
          }}>
            <Card title="① Stilisierte Stadt" subtitle="Low-Poly, klare Dächer, Team-Farbe am Kopf" accent="#F59E0B">
              <StylizedCity />
            </Card>
            <Card title="② Iso-Quartier" subtitle="Feste Iso-Kamera, Stadtplan-Look" accent="#3B82F6">
              <IsoQuarter />
            </Card>
            <Card title="③ Parzellen-Stil" subtitle="Nutzungstypen statt Gebäude" accent="#22C55E">
              <Parcels />
            </Card>
          </div>
        ) : (
          <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 'min(920px, 100%)' }}>
              <Card
                title={variant === 1 ? '① Stilisierte Stadt' : variant === 2 ? '② Iso-Quartier' : '③ Parzellen-Stil'}
                subtitle={variant === 1 ? 'Low-Poly, klare Dächer, Team-Farbe am Kopf'
                  : variant === 2 ? 'Feste Iso-Kamera, Stadtplan-Look'
                  : 'Nutzungstypen statt Gebäude'}
                accent={variant === 1 ? '#F59E0B' : variant === 2 ? '#3B82F6' : '#22C55E'}
                big
              >
                {variant === 1 && <StylizedCity big />}
                {variant === 2 && <IsoQuarter big />}
                {variant === 3 && <Parcels big />}
              </Card>
            </div>
          </div>
        )}

        <Legend />

        <Notes />
      </div>
    </div>
  );
}

// ── Header ──────────────────────────────────────────────────────────────────

function Header({ variant, setVariant, showAll, setShowAll }: {
  variant: 1 | 2 | 3; setVariant: (v: 1 | 2 | 3) => void;
  showAll: boolean; setShowAll: (v: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: '#F59E0B', fontWeight: 900,
      }}>
        🏙️ City Lab · Test-Seite
      </div>
      <h1 style={{ margin: 0, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-0.01em' }}>
        Grid-Darstellungs-Brainstorming
      </h1>
      <div style={{ color: '#94a3b8', fontSize: 15, maxWidth: 780, lineHeight: 1.5 }}>
        Drei Richtungen für ein "richtiges Stadt-Gefühl" im Quartier-Grid.
        Kein Live-Spiel — nur Demo-Daten (5×5, 4 Teams, ein paar Joker).
        Nichts davon ist final; das ist Brainstorming-Material.
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <TabBtn active={showAll}  onClick={() => setShowAll(true)}>Alle 3 nebeneinander</TabBtn>
        <TabBtn active={!showAll && variant === 1} onClick={() => { setShowAll(false); setVariant(1); }}>Nur ① Stadt</TabBtn>
        <TabBtn active={!showAll && variant === 2} onClick={() => { setShowAll(false); setVariant(2); }}>Nur ② Iso</TabBtn>
        <TabBtn active={!showAll && variant === 3} onClick={() => { setShowAll(false); setVariant(3); }}>Nur ③ Parzellen</TabBtn>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 16px', borderRadius: 10,
      background: active ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.04)',
      border: `1.5px solid ${active ? 'rgba(245,158,11,0.55)' : 'rgba(255,255,255,0.08)'}`,
      color: active ? '#FDE68A' : '#cbd5e1',
      fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
    }}>{children}</button>
  );
}

function Card({ title, subtitle, accent, children, big }: {
  title: string; subtitle: string; accent: string;
  children: React.ReactNode; big?: boolean;
}) {
  return (
    <div style={{
      borderRadius: 18, padding: 16,
      background: 'rgba(255,255,255,0.03)',
      border: '1.5px solid rgba(255,255,255,0.08)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 8,
        paddingBottom: 8, borderBottom: `1px solid ${accent}33`,
      }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: accent }}>{title}</div>
        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{subtitle}</div>
      </div>
      <div style={{
        height: big ? 620 : 360,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(180deg, rgba(15,23,42,0.25), rgba(5,7,18,0.6))',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
}

// ── ① Stilisierte Stadt (Low-Poly, klare Dächer) ─────────────────────────────
// Perspektivische 3D-Kamera (ähnlich aktuell), aber mit bewusster Art-Direction:
// - Körper fast neutral (dunkelgrau), Dach in Team-Farbe → Lesbarkeit wie Flaggen
// - 4 Höhen-Presets, dadurch Skyline-Rhythmus
// - Freie Felder = niedrige Plätze (fast Boden-Level) statt Löcher
//   → das Raster bleibt, fühlt sich aber nicht "halb-fertig" an
function StylizedCity({ big }: { big?: boolean }) {
  const cell = big ? 82 : 56;
  const gap  = 3;
  const size = 5;
  const totalW = size * cell + (size - 1) * gap;

  return (
    <div style={{
      perspective: '1400px',
      perspectiveOrigin: '50% 40%',
      width: totalW + 80, height: (big ? 520 : 300),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        transformStyle: 'preserve-3d',
        transform: 'rotateX(58deg) rotateZ(-35deg)',
      }}>
        {/* Boden */}
        <div style={{
          position: 'absolute',
          left: -20, top: -20,
          width: totalW + 40, height: totalW + 40,
          background: 'linear-gradient(135deg, #1a2238, #0f1424)',
          border: '1px solid rgba(148,163,184,0.15)',
          borderRadius: 6,
          transform: 'translateZ(0px)',
        }} />

        {DEMO_GRID.flatMap((row, r) => row.map((c, col) => {
          const x = col * (cell + gap);
          const y = r * (cell + gap);
          const h = heightFor(r, col, c.owner);
          const team = c.owner ? TEAMS[c.owner] : null;
          return (
            <StyBox
              key={`${r}-${col}`}
              x={x} y={y} w={cell} d={cell} h={h}
              team={team} joker={c.joker}
            />
          );
        }))}
      </div>
    </div>
  );
}

function StyBox({ x, y, w, d, h, team, joker }: {
  x: number; y: number; w: number; d: number; h: number;
  team: { color: string; emoji: string } | null; joker?: boolean;
}) {
  if (!team) {
    // Leeres Feld: flache "Plaza"-Platte, fast bodennah
    return (
      <div style={{
        position: 'absolute', left: x, top: y, width: w, height: d,
        transformStyle: 'preserve-3d',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: '#141b2e',
          border: '1px solid rgba(148,163,184,0.1)',
          transform: 'translateZ(4px)',
        }} />
      </div>
    );
  }
  const body = '#1f2638';
  const roof = team.color;
  const bodyShade = '#131826';
  const roofShade = shade(team.color, -0.25);
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, height: d,
      transformStyle: 'preserve-3d',
    }}>
      {/* Dach (top) */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(135deg, ${shade(roof, 0.1)}, ${roof})`,
        border: `1px solid ${shade(roof, -0.35)}`,
        transform: `translateZ(${h}px)`,
        boxShadow: joker ? `inset 0 0 0 3px #FDE68A, 0 0 12px ${roof}88` : 'none',
      }} />
      {/* Front */}
      <div style={{
        position: 'absolute', left: 0, bottom: 0, width: w, height: h,
        background: body,
        borderLeft: `1px solid ${bodyShade}`, borderRight: `1px solid ${bodyShade}`,
        transformOrigin: 'bottom center', transform: 'rotateX(-90deg)',
      }}>
        {/* Fenster-Raster */}
        <WindowGrid w={w} h={h} />
      </div>
      {/* Right */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: h, height: d,
        background: bodyShade,
        transformOrigin: 'center right', transform: 'rotateY(90deg)',
      }}>
        <WindowGrid w={h} h={d} vertical />
      </div>
      {/* Kleiner Team-Emoji-Flag am Dach-Rand */}
      <div style={{
        position: 'absolute', left: w/2 - 10, top: d/2 - 10,
        width: 20, height: 20, borderRadius: 4,
        background: roofShade, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12,
        transform: `translateZ(${h + 1}px)`,
      }}>
        {team.emoji}
      </div>
    </div>
  );
}

function WindowGrid({ w, h, vertical }: { w: number; h: number; vertical?: boolean }) {
  const cols = Math.max(2, Math.floor(w / 14));
  const rows = Math.max(2, Math.floor(h / 14));
  const cells: JSX.Element[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push(
        <div key={`${r}-${c}`} style={{
          position: 'absolute',
          left: `${(c + 0.5) / cols * 100}%`,
          top: `${(r + 0.5) / rows * 100}%`,
          width: vertical ? 3 : 4, height: vertical ? 3 : 5,
          transform: 'translate(-50%, -50%)',
          background: (r + c) % 3 === 0 ? 'rgba(251,191,36,0.45)' : 'rgba(203,213,225,0.12)',
          borderRadius: 1,
        }} />
      );
    }
  }
  return <>{cells}</>;
}

// ── ② Iso-Quartier (klassische Iso-Perspektive) ──────────────────────────────
// Feste Iso-Projektion — jede Zelle ist eine Raute, gestapelte Kanten simulieren
// einen kleinen Block. Viel lesbarer für ein Quiz, sehr "Stadtplan".
function IsoQuarter({ big }: { big?: boolean }) {
  const tile = big ? 70 : 48;
  const blockH = big ? 28 : 18;

  // Iso-Projektion: x,y → Bildschirm
  const project = (c: number, r: number) => ({
    sx: (c - r) * tile,
    sy: (c + r) * tile / 2,
  });

  // Zellen in Reihenfolge rendern (hinten → vorne) damit Überlappung stimmt
  const cells = useMemo(() => {
    const arr: Array<{ r: number; c: number; cell: typeof DEMO_GRID[0][0] }> = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) arr.push({ r, c, cell: DEMO_GRID[r][c] });
    arr.sort((a, b) => (a.r + a.c) - (b.r + b.c));
    return arr;
  }, []);

  return (
    <div style={{
      position: 'relative',
      width: 5 * tile * 2, height: 5 * tile,
    }}>
      {/* Zentrieren: Grid ist symmetrisch um (0,0) in Iso-Koordinaten */}
      <div style={{
        position: 'absolute', left: '50%', top: big ? 70 : 40,
        transform: 'translateX(-50%)',
      }}>
        {cells.map(({ r, c, cell }) => {
          const { sx, sy } = project(c, r);
          const team = cell.owner ? TEAMS[cell.owner] : null;
          return (
            <IsoTile
              key={`${r}-${c}`}
              sx={sx} sy={sy} tile={tile} blockH={blockH}
              team={team} joker={cell.joker}
            />
          );
        })}
      </div>
    </div>
  );
}

function IsoTile({ sx, sy, tile, blockH, team, joker }: {
  sx: number; sy: number; tile: number; blockH: number;
  team: { color: string; emoji: string } | null; joker?: boolean;
}) {
  const w = tile * 2;
  const h = tile;

  // Diamant-Basis via clip-path
  const diamond = (color: string, borderColor: string, extraStyle: React.CSSProperties = {}) => (
    <div style={{
      position: 'absolute', left: -tile, top: -h/2,
      width: w, height: h,
      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
      background: color,
      ...extraStyle,
      // Fake-Border via Inset-Shadow
      boxShadow: `inset 0 0 0 1px ${borderColor}`,
    }} />
  );

  if (!team) {
    // Leer: blasse Plaza
    return (
      <div style={{ position: 'absolute', left: sx, top: sy }}>
        {diamond('rgba(30,41,59,0.85)', 'rgba(148,163,184,0.18)')}
      </div>
    );
  }

  const roof = team.color;
  const bodyL = shade(team.color, -0.35);
  const bodyR = shade(team.color, -0.55);

  return (
    <div style={{ position: 'absolute', left: sx, top: sy }}>
      {/* Linke Seitenwand (Parallelogramm) */}
      <div style={{
        position: 'absolute', left: -tile, top: -h/2,
        width: tile, height: h/2 + blockH,
        background: bodyL,
        clipPath: `polygon(0% ${(h/2) / (h/2 + blockH) * 100}%, 100% 0%, 100% ${(blockH) / (h/2 + blockH) * 100 + (h/2) / (h/2 + blockH) * 50}%, 100% 100%, 0% ${(h/2 + blockH - h/4) / (h/2 + blockH) * 100}%)`,
      }} />
      {/* Rechte Seitenwand */}
      <div style={{
        position: 'absolute', left: 0, top: -h/2,
        width: tile, height: h/2 + blockH,
        background: bodyR,
        clipPath: `polygon(0% 0%, 100% ${(h/2) / (h/2 + blockH) * 100}%, 100% ${(h/2 + blockH - h/4) / (h/2 + blockH) * 100}%, 0% 100%)`,
      }} />
      {/* Dach-Diamant, nach oben verschoben */}
      <div style={{ position: 'absolute', left: 0, top: -blockH }}>
        {diamond(roof, shade(roof, -0.4), {
          background: `linear-gradient(135deg, ${shade(roof, 0.18)}, ${roof})`,
          filter: joker ? `drop-shadow(0 0 8px ${roof})` : 'none',
        })}
      </div>
      {/* Joker-Markierung */}
      {joker && (
        <div style={{
          position: 'absolute', left: -10, top: -blockH - 6,
          width: 20, height: 20, borderRadius: '50%',
          background: '#FDE68A', color: '#78350f',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 900,
          boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
        }}>★</div>
      )}
      {/* Team-Emoji oben */}
      <div style={{
        position: 'absolute', left: -8, top: -blockH - 2,
        width: 16, height: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13,
      }}>
        {team.emoji}
      </div>
    </div>
  );
}

// ── ③ Parzellen-Stil (Nutzungstypen statt Gebäude) ──────────────────────────
// Flache Iso-Diamanten, aber KEINE Gebäude — stattdessen unterschiedliche
// "Nutzungen": Park (Baum), Platz (Brunnen), Häuserblock (dichte Punkte),
// Markt (Stände). Team-Farbe ist nur der Rahmen / die Beleuchtung.
// Joker-Felder = Wahrzeichen (Kirche, Turm).
type Parcel = 'park' | 'plaza' | 'block' | 'market' | 'landmark';

function parcelFor(r: number, c: number, joker?: boolean): Parcel {
  if (joker) return 'landmark';
  const seed = (r * 7 + c * 13) % 4;
  return (['park', 'plaza', 'block', 'market'] as Parcel[])[seed];
}

function Parcels({ big }: { big?: boolean }) {
  const tile = big ? 72 : 50;

  const project = (c: number, r: number) => ({
    sx: (c - r) * tile,
    sy: (c + r) * tile / 2,
  });

  const cells = useMemo(() => {
    const arr: Array<{ r: number; c: number; cell: typeof DEMO_GRID[0][0] }> = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) arr.push({ r, c, cell: DEMO_GRID[r][c] });
    arr.sort((a, b) => (a.r + a.c) - (b.r + b.c));
    return arr;
  }, []);

  return (
    <div style={{
      position: 'relative',
      width: 5 * tile * 2, height: 5 * tile,
    }}>
      <div style={{
        position: 'absolute', left: '50%', top: big ? 70 : 40,
        transform: 'translateX(-50%)',
      }}>
        {cells.map(({ r, c, cell }) => {
          const { sx, sy } = project(c, r);
          const team = cell.owner ? TEAMS[cell.owner] : null;
          const parcel = parcelFor(r, c, cell.joker);
          return (
            <ParcelTile
              key={`${r}-${c}`} sx={sx} sy={sy} tile={tile}
              team={team} parcel={parcel}
            />
          );
        })}
      </div>
    </div>
  );
}

function ParcelTile({ sx, sy, tile, team, parcel }: {
  sx: number; sy: number; tile: number;
  team: { color: string; emoji: string } | null;
  parcel: Parcel;
}) {
  const w = tile * 2;
  const h = tile;

  // Basisfarbe je Parzelle
  const baseColor =
    parcel === 'park'   ? '#14532d' :
    parcel === 'plaza'  ? '#334155' :
    parcel === 'block'  ? '#1e293b' :
    parcel === 'market' ? '#7c2d12' :
                          '#3f3f46'; // landmark

  const border = team ? team.color : 'rgba(148,163,184,0.25)';
  const tint = team ? `${team.color}22` : 'transparent';

  return (
    <div style={{ position: 'absolute', left: sx, top: sy }}>
      {/* Diamant-Basis */}
      <div style={{
        position: 'absolute', left: -tile, top: -h/2,
        width: w, height: h,
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        background: `linear-gradient(180deg, ${baseColor}, ${shade(baseColor, -0.25)})`,
        boxShadow: `inset 0 0 0 2px ${border}, inset 0 0 24px ${tint}`,
      }} />
      {/* Inhalt je Parzelle */}
      <ParcelContent parcel={parcel} tile={tile} team={team} />
    </div>
  );
}

function ParcelContent({ parcel, tile, team }: {
  parcel: Parcel; tile: number;
  team: { color: string; emoji: string } | null;
}) {
  const size = tile * 0.7;
  const commonWrap: React.CSSProperties = {
    position: 'absolute', left: -size/2, top: -size/2 - 2,
    width: size, height: size,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: Math.round(tile * 0.38),
    pointerEvents: 'none',
  };
  const icon =
    parcel === 'park'     ? '🌳' :
    parcel === 'plaza'    ? '⛲' :
    parcel === 'block'    ? '🏘️' :
    parcel === 'market'   ? '🏪' :
                            '⛪'; // landmark
  return (
    <>
      <div style={commonWrap}>{icon}</div>
      {team && (
        <div style={{
          position: 'absolute', left: -12, top: tile * 0.1,
          width: 24, height: 24, borderRadius: '50%',
          background: team.color,
          border: '2px solid rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13,
          boxShadow: `0 0 10px ${team.color}88`,
        }}>
          {team.emoji}
        </div>
      )}
    </>
  );
}

// ── Legende & Notizen ───────────────────────────────────────────────────────

function Legend() {
  return (
    <div style={{
      marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 14,
      padding: 14, borderRadius: 12,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Teams im Demo
      </div>
      {(Object.keys(TEAMS) as Array<keyof typeof TEAMS>).map(id => {
        const t = TEAMS[id];
        return (
          <div key={id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '4px 10px', borderRadius: 999,
            background: `${t.color}22`, border: `1px solid ${t.color}66`,
          }}>
            <span style={{ fontSize: 16 }}>{t.emoji}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: t.color }}>{t.name}</span>
          </div>
        );
      })}
      <div style={{ flex: 1 }} />
      <div style={{ fontSize: 12, color: '#64748b' }}>
        ★ = Joker-Feld. Leere Felder sind noch nicht gesetzt.
      </div>
    </div>
  );
}

function Notes() {
  return (
    <div style={{
      marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14,
    }}>
      <Note title="① Stilisierte Stadt" color="#F59E0B">
        <b>Pro:</b> nah am aktuellen 3D — klein aufrüstbar. Dach in Team-Farbe
        = Flaggen-Effekt, sofort erkennbar. Höhen-Rhythmus = Skyline-Feeling.
        <br /><b>Contra:</b> perspektivisches 3D bleibt schräg; Lesbarkeit in
        hinteren Reihen schwächer; viele CSS-3D-Layer = Perf-Kosten bei 8 Teams.
      </Note>
      <Note title="② Iso-Quartier" color="#3B82F6">
        <b>Pro:</b> maximale Lesbarkeit. "Stadtplan"-Metapher trifft direkt.
        Kein 3D-Stack, nur clip-path-Diamanten — superleicht performant.
        Skaliert sauber auf 8 Teams.
        <br /><b>Contra:</b> weniger "wow" als volles 3D; fühlt sich ruhiger
        an — was für ein Quiz eher ein Plus ist.
      </Note>
      <Note title="③ Parzellen-Stil" color="#22C55E">
        <b>Pro:</b> "Quartier" wörtlich — Park, Platz, Markt, Wahrzeichen. Team-
        Farbe nur als Rahmen, sehr elegant. Joker = Wahrzeichen ist narrativ stark.
        <br /><b>Contra:</b> braucht Content-Design (Parzellen-Typen pflegen);
        Team-Zuordnung subtiler, bei vielen Teams evtl. schwerer zu trennen.
      </Note>
    </div>
  );
}

function Note({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{
      padding: 14, borderRadius: 12,
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${color}44`,
    }}>
      <div style={{ fontSize: 13, fontWeight: 900, color, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

function shade(hex: string, amount: number): string {
  // amount: -1..1 (negativ = dunkler, positiv = heller)
  const m = hex.match(/#(..)(..)(..)/);
  if (!m) return hex;
  const rgb = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  const adj = rgb.map(v => {
    if (amount >= 0) return Math.round(v + (255 - v) * amount);
    return Math.round(v * (1 + amount));
  });
  return `#${adj.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;
}
