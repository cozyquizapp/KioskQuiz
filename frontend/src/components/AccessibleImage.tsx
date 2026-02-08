import React from 'react';

interface AccessibleImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  altText: string;
  imageType?: 'avatar' | 'question' | 'icon' | 'screenshot' | 'other';
}

/**
 * Accessible image component with semantic alt-text
 */
const AccessibleImage = React.forwardRef<HTMLImageElement, AccessibleImageProps>(
  ({ altText, imageType = 'other', ...props }, ref) => (
    <img
      ref={ref}
      alt={altText}
      role="img"
      {...props}
    />
  )
);

AccessibleImage.displayName = 'AccessibleImage';

export default AccessibleImage;
