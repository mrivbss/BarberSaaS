import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full h-10 rounded-lg border border-border bg-surface px-3',
            'text-sm text-foreground shadow-input placeholder:text-muted/60',
            'outline-none transition-all duration-200',
            'hover:border-foreground/20',
            'focus:shadow-input-focus focus:border-foreground',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-destructive focus:border-destructive',
            className
          )}
          {...props}
        />
        {error && <p className="text-[11px] text-destructive mt-0.5">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
