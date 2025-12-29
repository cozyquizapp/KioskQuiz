import * as React from 'react';

type Props = {
  rank: number;
  name: string;
  score?: number | string | null;
  detail?: string | null;
  highlight?: boolean;
};

const BeamerScoreboardCard: React.FC<Props> = ({ rank, name, score, detail, highlight }) => {
  const scoreLabel =
    score === null || score === undefined ? '—' : typeof score === 'number' ? score : String(score);
  return (
    <div className={`beamer-score-card${highlight ? ' highlight' : ''}`}>
      <div className="beamer-score-rank">{rank}.</div>
      <div className="beamer-score-content">
        <div className="beamer-score-name">{name}</div>
        {detail && <div className="beamer-score-detail">{detail}</div>}
      </div>
      <div className="beamer-score-value">{scoreLabel}</div>
    </div>
  );
};

export default BeamerScoreboardCard;
