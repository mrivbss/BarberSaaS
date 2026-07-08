import { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-foreground/[0.04]', className)}
      {...props}
    />
  );
}

export function TableSkeleton({ rows = 3, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-border/40">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <td key={colIndex} className="px-5 py-4">
              <Skeleton className="h-4 w-full max-w-[120px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
