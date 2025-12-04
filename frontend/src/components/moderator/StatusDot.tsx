import React from 'react';

type StatusDotProps = {
  filled: boolean;
  tooltip?: string;
};

const StatusDot: React.FC<StatusDotProps> = ({ filled, tooltip }) => (
  <span
    title={tooltip}
    aria-label={tooltip}
    style={{
      display: 'inline-block',
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: filled ? '#22c55e' : '#9ca3af',
      boxShadow: filled ? '0 0 0 2px rgba(34,197,94,0.2)' : '0 0 0 1px rgba(255,255,255,0.1)'
    }}
  />
);

export default StatusDot;
