import React from 'react';
import { DESIGN_SYSTEM } from '../config/designSystem';

export type StatusType = 'connected' | 'waiting' | 'disconnected' | 'idle';

interface StatusIndicatorProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  label?: string;
  labelPosition?: 'right' | 'bottom';
}

/**
 * StatusIndicator Component
 * Visual status indicator with optional label
 * 
 * Statuses:
 * - connected: Team online and ready (#22c55e - green)
 * - waiting: Team online but waiting (#eab308 - amber)
 * - disconnected: Team offline (#ef4444 - red)
 * - idle: Team exists but inactive (#94a3b8 - slate)
 */
const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  animated = true,
  label,
  labelPosition = 'right'
}) => {
  const statusConfig = {
    connected: {
      color: '#22c55e',
      label: 'Verbunden',
      pulse: true,
    },
    waiting: {
      color: '#eab308',
      label: 'Wartet',
      pulse: true,
    },
    disconnected: {
      color: '#ef4444',
      label: 'Getrennt',
      pulse: false,
    },
    idle: {
      color: '#94a3b8',
      label: 'Inaktiv',
      pulse: false,
    },
  };

  const config = statusConfig[status];

  const sizeConfig = {
    sm: { dot: 8, gap: 6, fontSize: 11 },
    md: { dot: 12, gap: 8, fontSize: 12 },
    lg: { dot: 16, gap: 10, fontSize: 14 },
  };

  const size_config = sizeConfig[size];

  const dotStyle: React.CSSProperties = {
    width: size_config.dot,
    height: size_config.dot,
    borderRadius: '50%',
    background: config.color,
    boxShadow: `0 0 ${size_config.dot}px ${config.color}44, inset 0 0 ${size_config.dot / 2}px ${config.color}`,
    display: 'inline-block',
    flexShrink: 0,
    position: 'relative',
  };

  if (animated && config.pulse && status !== 'disconnected' && status !== 'idle') {
    dotStyle.animation = 'pulse-indicator 2s cubic-bezier(0.4, 0, 0.6, 1) infinite';
  }

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: label ? size_config.gap : 0,
    flexDirection: labelPosition === 'bottom' ? 'column' : 'row',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: size_config.fontSize,
    color: config.color,
    fontWeight: 600,
    fontFamily: 'var(--font-game)',
    letterSpacing: '0.01em',
    margin: 0,
    whiteSpace: 'nowrap',
  };

  return (
    <>
      <style>{`
        @keyframes pulse-indicator {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 ${size_config.dot}px ${config.color}44, inset 0 0 ${size_config.dot / 2}px ${config.color};
          }
          50% {
            opacity: 0.7;
            box-shadow: 0 0 ${size_config.dot * 1.5}px ${config.color}66, inset 0 0 ${size_config.dot / 2}px ${config.color};
          }
        }
      `}</style>
      <div style={containerStyle}>
        <div style={dotStyle} />
        {label && <span style={labelStyle}>{label}</span>}
      </div>
    </>
  );
};

export default StatusIndicator;
