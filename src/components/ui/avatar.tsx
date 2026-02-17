'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt = '', fallback, size = 'md', ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    };

    const showFallback = !src || imageError;

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex shrink-0 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {!showFallback && (
          <img
            src={src}
            alt={alt}
            className="aspect-square h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
        {showFallback && (
          <span className="flex h-full w-full items-center justify-center font-medium text-zinc-600 dark:text-zinc-400">
            {fallback ? getInitials(fallback) : '?'}
          </span>
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';

const AvatarGroup = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex -space-x-3', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AvatarGroup.displayName = 'AvatarGroup';

export { Avatar, AvatarGroup };
