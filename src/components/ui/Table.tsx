import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/cn';

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-hidden rounded-xl border-2 border-slate-900 bg-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
      <table className={cn("w-full text-left text-sm text-slate-700", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-slate-100', className)} {...props} />;
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y-2 divide-slate-900', className)} {...props} />;
}

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'transition-colors duration-200 hover:bg-slate-50/50',
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = 'TableRow';

export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-5 py-3 text-xs font-extrabold tracking-wider uppercase text-slate-900',
        'border-b-2 border-slate-900',
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        'px-5 py-4 text-[13px] text-slate-700',
        className
      )}
      {...props}
    />
  );
}
