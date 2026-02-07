import React from 'react';
import { AnswersState } from './types';
import StatusDot from './StatusDot';
import { AVATARS } from '../../config/avatars';

type TeamsListProps = {
  answers: AnswersState | null;
  inputStyle: React.CSSProperties;
  onRefresh: () => void;
  onKickAll: () => void;
  onKickTeam: (teamId: string) => void;
};

const TeamsList: React.FC<TeamsListProps> = ({ answers, inputStyle, onRefresh, onKickAll, onKickTeam }) => {
  const hasTeams = Object.keys(answers?.teams || {}).length > 0;
  const getAvatarById = (avatarId?: string) => AVATARS.find((a) => a.id === avatarId) || AVATARS[0];
  return (
    <section style={{ marginTop: 12, background: 'rgba(10,14,24,0.92)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, boxShadow: '0 14px 32px rgba(0,0,0,0.32)', backdropFilter: 'blur(10px)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
        <div style={{ fontWeight: 800 }}>Aktive Teams</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            style={{
              ...inputStyle,
              background: 'rgba(99,229,255,0.14)',
              color: '#7dd3fc',
              border: '1px solid rgba(99,229,255,0.45)',
              width: 'auto',
              padding: '8px 12px'
            }}
            onClick={onRefresh}
          >
            Teams aktualisieren
          </button>
          {hasTeams && (
            <button
              style={{
                ...inputStyle,
                background: 'rgba(239,68,68,0.16)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.45)',
                width: 'auto',
                padding: '8px 12px'
              }}
              onClick={onKickAll}
            >
              Alle entfernen
            </button>
          )}
        </div>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {Object.entries(answers?.teams || {}).map(([teamId, team]) => (
          <div
            key={teamId}
            style={{
              padding: 10,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StatusDot filled={Boolean(team?.isReady)} tooltip={team?.isReady ? 'Angemeldet' : 'Nicht angemeldet'} />
              {team?.avatarId && (
                <img
                  src={getAvatarById(team.avatarId)?.dataUri}
                  alt=""
                  style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid rgba(255,255,255,0.16)' }}
                />
              )}
              {team?.name ?? 'Team'}
            </span>
            <button
              style={{
                ...inputStyle,
                background: 'rgba(239,68,68,0.14)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.4)',
                width: 'auto',
                padding: '6px 10px'
              }}
              onClick={() => onKickTeam(teamId)}
            >
              Entfernen
            </button>
          </div>
        ))}
        {!hasTeams && <div style={{ color: 'var(--muted)' }}>Noch keine Teams</div>}
      </div>
    </section>
  );
};

export default TeamsList;
