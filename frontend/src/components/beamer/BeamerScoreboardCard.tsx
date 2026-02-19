import * as React from 'react';

type Props = {
  rank: number;
  name: string;
  avatarSrc?: string | null;
  score?: number | string | null;
  detail?: string | null;
  highlight?: boolean;
  maxScore?: number;
};

const BeamerScoreboardCard: React.FC<Props> = ({ rank, name, avatarSrc, score, detail, highlight, maxScore }) => {
  const scoreLabel =
    score === null || score === undefined ? '—' : typeof score === 'number' ? score : String(score);
  const numScore = typeof score === 'number' ? score : 0;
  const barWidth = maxScore && maxScore > 0 ? Math.max(4, (numScore / maxScore) * 100) : 0;
  const rankClass = rank <= 3 ? ` rank-${rank}` : '';
  return (
    <div className={`beamer-score-card${highlight ? ' highlight' : ''}${rankClass}`}>
      <div className="beamer-score-rank">
        {rank <= 3 ? ['', '\u{1F947}', '\u{1F948}', '\u{1F949}'][rank] : `${rank}.`}
      </div>
      {avatarSrc && (
        <img
          src={avatarSrc}
          alt=""
          className="beamer-score-avatar"
          style={{ width: 60, height: 60, borderRadius: 12, border: '1px solid rgba(255,255,255,0.16)', objectFit: 'contain' }}
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
      <div className="beamer-score-value">{scoreLabel}</div>
    </div>
  );
};

export default BeamerScoreboardCard;
