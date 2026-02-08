import * as React from 'react';

type Props = {
  rank: number;
  name: string;
  avatarSrc?: string | null;
  score?: number | string | null;
  detail?: string | null;
  highlight?: boolean;
};

const BeamerScoreboardCard: React.FC<Props> = ({ rank, name, avatarSrc, score, detail, highlight }) => {
  const scoreLabel =
    score === null || score === undefined ? '—' : typeof score === 'number' ? score : String(score);
  return (
    <div className={`beamer-score-card${highlight ? ' highlight' : ''}`}>
      <div className="beamer-score-rank">{rank}.</div>
      {avatarSrc && (
        avatarSrc.endsWith('.mp4') ? (
          <video
            src={avatarSrc}
            autoPlay
            loop
            muted
            playsInline
            className="beamer-score-avatar"
            style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,0.16)' }}
          />
        ) : (
          <img
            src={avatarSrc}
            alt=""
            className="beamer-score-avatar"
            style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,0.16)' }}
          />
        )
      )}
      <div className="beamer-score-content">
        <div className="beamer-score-name">{name}</div>
        {detail && <div className="beamer-score-detail">{detail}</div>}
      </div>
      <div className="beamer-score-value">{scoreLabel}</div>
    </div>
  );
};

export default BeamerScoreboardCard;
