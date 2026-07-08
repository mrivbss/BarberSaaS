import { ReactNode } from 'react';
import { Badge } from './Badge';
import { cn } from '../../lib/cn';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, badge, action, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'mb-10 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div className="space-y-1.5">
        <h1 className="font-serif text-3xl font-normal tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {(badge || action) && (
        <div className="flex shrink-0 items-center gap-3 mt-4 sm:mt-0">
          {badge}
          {action}
        </div>
      )}
    </header>
  );
}

export function TenantBadge({ tenantId }: { tenantId: string }) {
  return (
    <Badge variant="muted" className="font-mono text-[10px]">
      {tenantId.substring(0, 8)}
    </Badge>
  );
}
