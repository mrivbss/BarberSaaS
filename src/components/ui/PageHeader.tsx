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
        'mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between animate-slide-up',
        className
      )}
    >
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {(badge || action) && (
        <div className="flex shrink-0 items-center gap-3">
          {badge}
          {action}
        </div>
      )}
    </header>
  );
}

export function TenantBadge({ tenantId }: { tenantId: string }) {
  return (
    <Badge variant="muted" className="font-mono text-[11px] tracking-wide">
      Tenant · {tenantId.substring(0, 8)}…
    </Badge>
  );
}
