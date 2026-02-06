import * as React from 'react';
import BeamerHeader from './BeamerHeader';
import BeamerFooter from './BeamerFooter';
import BeamerBadge, { BeamerBadgeTone } from './BeamerBadge';
import './beamerTheme.css';

type Props = {
  scene: string;
  leftLabel: string;
  leftHint?: string;
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  badgeTone?: BeamerBadgeTone;
  progressText?: string;
  progressValue?: number | null;
  timerText?: string;
  footerMessage?: string;
  footerDetail?: string;
  status?: 'active' | 'locked' | 'info' | 'final';
  rightNode?: React.ReactNode;
  hideHeader?: boolean;
  children: React.ReactNode;
};

const BeamerFrame: React.FC<Props> = ({
  scene,
  leftLabel,
  leftHint,
  title,
  subtitle,
  badgeLabel,
  badgeTone,
  progressText,
  progressValue,
  timerText,
  footerMessage,
  footerDetail,
  status,
  rightNode,
  hideHeader,
  children
}) => {
  const normalizedProgress =
    typeof progressValue === 'number' && progressValue !== null
      ? Math.min(1, Math.max(0, progressValue))
      : null;
  return (
    <div className={`beamer-frame beamer-jackbox scene-${scene || 'default'}${normalizedProgress !== null ? ' has-progress' : ''}`}>
      {normalizedProgress !== null && (
        <div className="beamer-frame-progress">
          <div className="beamer-frame-progress-inner" style={{ width: `${normalizedProgress * 100}%` }} />
        </div>
      )}
      {!hideHeader && (
        <BeamerHeader
          leftLabel={leftLabel}
          leftHint={leftHint}
          title={title}
          subtitle={subtitle}
          badge={badgeLabel ? <BeamerBadge label={badgeLabel} tone={badgeTone} /> : undefined}
          progressText={progressText}
          timerText={timerText}
          rightNode={rightNode}
        />
      )}
      <div className="beamer-frame-body">{children}</div>
      <BeamerFooter message={footerMessage} detail={footerDetail} status={status} />
    </div>
  );
};

export default BeamerFrame;
