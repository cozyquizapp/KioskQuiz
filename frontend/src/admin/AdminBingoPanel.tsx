import { useState } from 'react';
import { BingoBoard, Team } from '@shared/quizTypes';
import { theme } from '../theme';
import { categoryColors } from '../categoryColors';

interface AdminBingoPanelProps {
  teamBoards: Record<string, BingoBoard>;
  teams: Record<string, Team>;
}

// Einfaches Bingo/Progress-Panel statt Punkte
const AdminBingoPanel = ({ teamBoards, teams }: AdminBingoPanelProps) => {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div style={panelStyle}>
      <div style={headerRow}>
        <h3 style={{ margin: 0 }}>Bingo / Fortschritt</h3>
        <button style={toggleButton} onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? 'Aufklappen' : 'Zuklappen'}
        </button>
      </div>
      {collapsed ? (
        <p style={{ color: 'var(--muted)', margin: 0 }}>Aktuellen Stand bei Bedarf aufklappen.</p>
      ) : (
        <>
          {Object.entries(teamBoards).length === 0 && <p style={{ color: 'var(--muted)' }}>Noch keine Teams.</p>}
          <div style={{ display: 'grid', gap: 10 }}>
            {Object.entries(teamBoards).map(([teamId, board]) => (
              <div key={teamId} style={teamRow}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{teams[teamId]?.name ?? 'Team'}</div>
                <div style={gridStyle}>
                  {board.map((cell, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: cell.marked ? '#0b0f19' : categoryColors[cell.category] ?? 'var(--surface)',
                        border: cell.marked ? '2px solid #22c55e' : '1px solid #2b3444',
                        color: cell.marked ? '#22c55e' : '#0d0f14',
                        borderRadius: 6,
                        fontWeight: 800,
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        aspectRatio: '1 / 1'
                      }}
                    >
                      {cell.marked ? 'X' : ''}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const panelStyle: React.CSSProperties = {
  background: 'var(--surface-2)',
  borderRadius: theme.radius,
  padding: theme.spacing(1),
  border: '1px solid #1f2836'
};

const teamRow: React.CSSProperties = {
  background: 'var(--surface)',
  borderRadius: theme.radius,
  border: '1px solid #2b3444',
  padding: '8px 10px'
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: 4
};

const headerRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8
};

const toggleButton: React.CSSProperties = {
  background: 'var(--surface)',
  color: 'white',
  border: '1px solid #2b3444',
  borderRadius: theme.radius,
  padding: '6px 10px',
  cursor: 'pointer',
  fontWeight: 700
};

export default AdminBingoPanel;
