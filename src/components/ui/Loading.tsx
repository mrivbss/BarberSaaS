import { cn } from '../../lib/cn';

interface LoadingProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
};

export function Loading({ className, size = 'md', label }: LoadingProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-border border-t-foreground/60',
          sizeMap[size]
        )}
        role="status"
        aria-label={label || 'Cargando'}
      />
      {label && <p className="text-sm text-muted">{label}</p>}
    </div>
  );
}
