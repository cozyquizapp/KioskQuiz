import React from 'react';

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ariaLabel?: string;
  ariaPressed?: boolean;
  ariaDescribedBy?: string;
  children: React.ReactNode;
}

/**
 * Accessible button component with ARIA support
 */
const AccessibleButton = React.forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ ariaLabel, ariaPressed, ariaDescribedBy, children, ...props }, ref) => (
    <button
      ref={ref}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      aria-describedby={ariaDescribedBy}
      {...props}
    >
      {children}
    </button>
  )
);

AccessibleButton.displayName = 'AccessibleButton';

export default AccessibleButton;
