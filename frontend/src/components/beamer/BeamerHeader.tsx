import * as React from 'react';

type Props = {
  leftLabel: string;
  leftHint?: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  progressText?: string;
  timerText?: string;
  rightNode?: React.ReactNode;
};

const BeamerHeader: React.FC<Props> = ({
  leftLabel,
  leftHint,
  title,
  subtitle,
  badge,
  progressText,
  timerText,
  rightNode
}) => {
  return (
    <header className="beamer-header">
      <div className="beamer-header-block">
        <span className="beamer-label">{leftLabel}</span>
        {leftHint && <span className="beamer-hint">{leftHint}</span>}
      </div>
      <div className="beamer-header-center">
        <div className="beamer-header-title">{title}</div>
        {subtitle && <div className="beamer-header-subtitle">{subtitle}</div>}
      </div>
      <div className="beamer-header-right">
        {badge}
        {progressText && <div className="beamer-header-progress">{progressText}</div>}
        {timerText && <div className="beamer-header-timer">{timerText}</div>}
        {rightNode}
      </div>
    </header>
  );
};

export default BeamerHeader;

