import { ReactNode } from 'react';

interface PlaceholderViewProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  message: string;
}

export function PlaceholderView({ title, subtitle, icon, message }: PlaceholderViewProps) {
  return (
    <div className="animate-fade-in">
      <header className="mb-8 animate-slide-up">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
      </header>
      <div className="rounded-lg border border-border bg-card p-12 text-center transition-all duration-150 hover:border-border/80">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white/[0.04] border border-border-subtle">
          {icon}
        </div>
        <p className="text-sm text-muted">{message}</p>
      </div>
    </div>
  );
}
