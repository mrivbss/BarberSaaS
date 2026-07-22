import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-foreground text-background shadow-premium hover:shadow-premium-hover hover:bg-foreground/90',
  secondary:
    'bg-surface shadow-input hover:shadow-premium border border-border text-foreground hover:bg-black/[0.02]',
  ghost:
    'bg-transparent text-muted-foreground hover:text-foreground hover:bg-black/[0.04]',
  danger:
    'bg-transparent border border-destructive/30 text-destructive hover:bg-destructive/10',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-xs font-semibold',
  md: 'px-6 py-2.5 text-sm font-semibold',
  lg: 'px-8 py-3.5 text-sm font-semibold',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', fullWidth = false, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      data-ui-button=""
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg',
        'transition-all duration-300',
        'active:scale-[0.97]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

Button.displayName = 'Button';
