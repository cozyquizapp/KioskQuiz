import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary for Avatar components
 * Catches rendering errors and provides fallback UI
 */
export class AvatarErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ Avatar Error Boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            background: 'rgba(239,68,68,0.1)',
            borderRadius: 12,
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#fca5a5',
            fontSize: 12,
            fontWeight: 600,
            padding: 8
          }}
        >
          Avatar lädt...
        </div>
      );
    }

    return this.props.children;
  }
}
