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
  subtext?: ReactNode;
}

export function StatCard({ icon: Icon, value, label, loading = false, className, subtext = "vs. ayer" }: StatCardProps) {
  return (
    <Card hover padding="md" className={cn('flex flex-col gap-4 border-2 border-slate-900 rounded-xl bg-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 transition-all', className)}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black tracking-tight uppercase text-slate-900">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-amber-100 border border-slate-900 flex items-center justify-center text-slate-900">
          <Icon className="h-4 w-4" strokeWidth={2.5} />
        </div>
      </div>
      <div>
        {loading ? (
          <Skeleton className="h-9 w-28" />
        ) : (
          <>
            <p className="font-mono font-black text-3xl tracking-tight text-slate-900 tabular-nums">{value}</p>
            {subtext && (
              typeof subtext === 'string' ? (
                <p className="text-[11px] font-medium text-slate-500 mt-1">{subtext}</p>
              ) : (
                <div className="mt-1">{subtext}</div>
              )
            )}
          </>
        )}
      </div>
    </Card>
  );
}