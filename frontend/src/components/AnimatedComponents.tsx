import React, { CSSProperties } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: CSSProperties;
  className?: string;
}

export const Skeleton = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 8,
  style,
  className = ''
}: SkeletonProps) => (
  <div
    className={`skeleton ${className}`}
    style={{
      width,
      height,
      borderRadius,
      ...style
    }}
  />
);

interface SkeletonTextProps {
  lines?: number;
  gap?: number;
}

export const SkeletonText = ({ lines = 3, gap = 8 }: SkeletonTextProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap }}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton 
        key={i} 
        height={16} 
        width={i === lines - 1 ? '70%' : '100%'} 
      />
    ))}
  </div>
);

interface SkeletonCardProps {
  style?: CSSProperties;
}

export const SkeletonCard = ({ style }: SkeletonCardProps) => (
  <div
    style={{
      padding: 26,
      borderRadius: 32,
      border: '1px solid rgba(255, 255, 255, 0.08)',
      background: 'rgba(255, 255, 255, 0.001)',
      backdropFilter: 'blur(50px) saturate(200%) brightness(1.15)',
      ...style
    }}
  >
    <Skeleton width={120} height={24} style={{ marginBottom: 16 }} />
    <Skeleton width="100%" height={40} style={{ marginBottom: 12 }} />
    <SkeletonText lines={2} />
  </div>
);

interface PulseIndicatorProps {
  className?: string;
  style?: CSSProperties;
}

export const PulseIndicator = ({ className = '', style }: PulseIndicatorProps) => (
  <div className={`pulse-indicator ${className}`} style={style}>
    <span />
    <span />
    <span />
  </div>
);
