import React from 'react';
import StatusIndicator, { StatusType } from './StatusIndicator';
import { DESIGN_SYSTEM } from '../config/designSystem';

interface TeamCardProps {
  teamId: string;
  teamName: string;
  status: StatusType;
  avatarSrc?: string | null;
  score?: number | null;
  isConnected?: boolean;
  isReady?: boolean;
  onClick?: () => void;
  highlight?: boolean;
}

/**
 * TeamCard Component
 * Displays individual team info with status indicator
 * 
 * Features:
 * - Status indicator (connected/waiting/disconnected/idle)
 * - Optional avatar image
 * - Score display
 * - Clickable for selection
 * - Highlight state for active team
 */
const TeamCard: React.FC<TeamCardProps> = ({
  teamId,
  teamName,
  status,
  avatarSrc,
  score,
  isConnected = true,
  isReady = false,
  onClick,
  highlight = false,
}) => {
  const containerStyle: React.CSSProperties = {
    padding: DESIGN_SYSTEM.spacing[4],
    borderRadius: DESIGN_SYSTEM.radius['2xl'],
    background: highlight 
      ? 'rgba(240, 95, 178, 0.12)' 
      : 'rgba(30, 42, 69, 0.6)',
    border: highlight
      ? `1px solid rgba(240, 95, 178, 0.28)`
      : DESIGN_SYSTEM.border.light,
    boxShadow: highlight
      ? `0 0 24px rgba(240, 95, 178, 0.2)`
      : DESIGN_SYSTEM.shadow.sm,
    display: 'flex',
    alignItems: 'center',
    gap: DESIGN_SYSTEM.spacing[3],
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 280ms cubic-bezier(0.22, 1, 0.36, 1)',
    transform: highlight ? 'scale(1.02)' : 'scale(1)',
    opcity: isConnected ? 1 : 0.7,
  };

  const avatarStyle: React.CSSProperties = {
    width: 48,
    height: 48,
    borderRadius: DESIGN_SYSTEM.radius.md,
    border: DESIGN_SYSTEM.border.light,
    objectFit: 'contain',
    background: 'rgba(10, 22, 44, 0.6)',
    flexShrink: 0,
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: DESIGN_SYSTEM.spacing[1],
  };

  const teamNameStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 700,
    fontFamily: 'var(--font-game)',
    color: highlight ? '#f05fb2' : '#f1f5f9',
    margin: 0,
    letterSpacing: '0.01em',
  };

  const scoreStyle: React.CSSProperties = {
    fontSize: 13,
    color: '#94a3b8',
    fontFamily: 'var(--font)',
    margin: 0,
    fontWeight: 500,
  };

  const statusContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: DESIGN_SYSTEM.spacing[2],
    marginLeft: 'auto',
    flexShrink: 0,
  };

  const statusLabelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'var(--font-game)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: status === 'connected' ? '#22c55e' 
          : status === 'waiting' ? '#eab308'
          : status === 'disconnected' ? '#ef4444'
          : '#94a3b8',
    margin: 0,
    whiteSpace: 'nowrap',
  };

  const handleClick = () => {
    if (onClick) onClick();
  };

  return (
    <div 
      style={containerStyle}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : -1}
      aria-label={`Team ${teamName}`}
    >
      {avatarSrc && (
        <img 
          src={avatarSrc} 
          alt={teamName}
          style={avatarStyle}
        />
      )}
      
      <div style={contentStyle}>
        <p style={teamNameStyle}>{teamName}</p>
        {score !== null && score !== undefined && (
          <p style={scoreStyle}>
            Score: {typeof score === 'number' ? score : '—'}
          </p>
        )}
      </div>

      <div style={statusContainerStyle}>
        {isReady && (
          <span style={{ fontSize: 20 }}>✓</span>
        )}
        <StatusIndicator 
          status={status}
          size="sm"
          animated={status === 'connected' || status === 'waiting'}
        />
      </div>
    </div>
  );
};

export default TeamCard;
