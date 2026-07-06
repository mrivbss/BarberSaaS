import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from './Card';
import { Skeleton } from './Skeleton';
import { cn } from '../../lib/cn';

interface StatCardProps {
  icon: LucideIcon;
  value: ReactNode;
  label: string;
  loading?: boolean;
  className?: string;
}

export function StatCard({ icon: Icon, value, label, loading = false, className }: StatCardProps) {
  return (
    <Card hover className={cn('flex items-center gap-5', className)}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] border border-border-subtle">
        <Icon className="h-5 w-5 text-muted" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        {loading ? (
          <>
            <Skeleton className="mb-2 h-7 w-20" />
            <Skeleton className="h-4 w-28" />
          </>
        ) : (
          <>
            <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
            <p className="mt-0.5 text-sm text-muted">{label}</p>
          </>
        )}
      </div>
    </Card>
  );
}
