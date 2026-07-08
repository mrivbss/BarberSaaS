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
    <Card hover padding="md" className={cn('flex flex-col gap-5', className)}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">{label}</p>
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-foreground/[0.04]">
          <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        </div>
      </div>
      <div>
        {loading ? (
          <Skeleton className="h-9 w-28" />
        ) : (
          <p className="font-serif text-3xl tracking-tight text-foreground tabular-nums">{value}</p>
        )}
      </div>
    </Card>
  );
}
