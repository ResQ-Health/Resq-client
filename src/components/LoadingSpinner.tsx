import React from 'react';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  fullScreen = true,
  className = '',
  size = 'lg'
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-4',
  };

  const spinner = (
    <div 
      className={`animate-spin rounded-full border-[#06202E] border-t-transparent ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="loading"
      data-testid="loading-spinner"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-gray-50/50">
        {spinner}
      </div>
    );
  }

  return spinner;
};

