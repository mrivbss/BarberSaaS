import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingMap = {
  none: '',
  sm: 'p-5',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, padding = 'md', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-border/80 bg-surface shadow-premium',
        'transition-all duration-300 ease-out',
        hover && 'hover:shadow-premium-hover hover:-translate-y-[2px] hover:border-border/60',
        paddingMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

Card.displayName = 'Card';
