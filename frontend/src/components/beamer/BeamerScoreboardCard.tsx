import * as React from 'react';

type Props = {
  rank: number;
  name: string;
  avatarSrc?: string | null;
  score?: number | string | null;
  detail?: string | null;
  highlight?: boolean;
  maxScore?: number;
  scoreDelta?: number | null;
};

const BeamerScoreboardCard: React.FC<Props> = ({ rank, name, avatarSrc, score, detail, highlight, maxScore, scoreDelta }) => {
  const scoreLabel =
    score === null || score === undefined ? '—' : typeof score === 'number' ? score : String(score);
  const numScore = typeof score === 'number' ? score : 0;
  const barWidth = maxScore && maxScore > 0 ? Math.max(4, (numScore / maxScore) * 100) : 0;
  const rankClass = rank <= 3 ? ` rank-${rank}` : '';
  
  // Trophy with special styling
  const getTrophyIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}.`;
  };

  const getTrophyStyle = (rank: number): React.CSSProperties => {
    if (rank === 1) return {
      fontSize: '32px',
      animation: 'trophy-bounce 2s ease-in-out infinite, trophy-glow-gold 2s ease-in-out infinite'
    };
    if (rank === 2) return {
      fontSize: '28px',
      animation: 'trophy-bounce 2.2s ease-in-out infinite, trophy-glow-silver 2.2s ease-in-out infinite'
    };
    if (rank === 3) return {
      fontSize: '26px',
      animation: 'trophy-bounce 2.4s ease-in-out infinite, trophy-glow-bronze 2.4s ease-in-out infinite'
    };
    return {};
  };

  return (
    <div className={`beamer-score-card${highlight ? ' highlight' : ''}${rankClass}`}>
      <div className="beamer-score-rank" style={getTrophyStyle(rank)}>
        {getTrophyIcon(rank)}
      </div>
      {avatarSrc && (
        <img
          src={avatarSrc}
          alt=""
          className="beamer-score-avatar"
          style={{ width: 60, height: 60, borderRadius: 12, border: '1px solid #e5e7eb', objectFit: 'contain' }}
        />
      )}
      <div className="beamer-score-content">
        <div className="beamer-score-name">{name}</div>
        {detail && <div className="beamer-score-detail">{detail}</div>}
        {barWidth > 0 && (
          <div style={{ marginTop: 4 }}>
            <div className="scoreboard-race-bar" style={{ width: `${barWidth}%` }} />
          </div>
        )}
      </div>
      <div className="beamer-score-value" style={{ position: 'relative' }}>
        {scoreLabel}
        {scoreDelta != null && scoreDelta > 0 && (
          <span
            key={`delta-${scoreDelta}-${scoreLabel}`}
            style={{
              position: 'absolute',
              top: -18,
              right: 0,
              fontSize: '0.7em',
              fontWeight: 900,
              color: '#22c55e',
              animation: 'scoreDeltaPop 1.4s ease-out forwards',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            +{scoreDelta}
          </span>
        )}
      </div>
    </div>
  );
};

export default BeamerScoreboardCard;
