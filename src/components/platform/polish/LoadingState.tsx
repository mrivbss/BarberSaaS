import { Orbit } from 'lucide-react';

interface LoadingStateProps {
  label: string;
  compact?: boolean;
}

export function LoadingState({ label, compact = false }: LoadingStateProps) {
  return (
    <div
      className={`platform-loading-panel${compact ? ' platform-loading-panel--compact' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="platform-loading-panel__signal" aria-hidden="true">
        <span /><span /><Orbit />
      </div>
      <div className="platform-loading-panel__copy">
        <strong>{label}</strong>
        <span>Sincronizando datos seguros</span>
      </div>
      <div className="platform-loading-panel__skeleton" aria-hidden="true">
        <span /><span /><span />
      </div>
    </div>
  );
}
