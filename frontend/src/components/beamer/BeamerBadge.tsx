import * as React from 'react';

export type BeamerBadgeTone = 'default' | 'accent' | 'warning' | 'success' | 'muted';

type Props = {
  label: string;
  tone?: BeamerBadgeTone;
  title?: string;
};

const BeamerBadge: React.FC<Props> = ({ label, tone = 'default', title }) => {
  return (
    <span className={`beamer-badge tone-${tone}`} title={title}>
      {label}
    </span>
  );
};

export default BeamerBadge;

