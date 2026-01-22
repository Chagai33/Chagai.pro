import React from 'react';

interface Props {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const sizeClasses = {
  small: 'h-4 w-4',
  medium: 'h-8 w-8',
  large: 'h-12 w-12'
};

export const LoadingSpinner: React.FC<Props> = ({ size = 'medium', className = '' }) => {
  return (
    <div className={`animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]} ${className}`} />
  );
};