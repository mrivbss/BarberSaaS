import { Check, Clipboard, X } from 'lucide-react';
import { memo, useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react';

export interface CopyFeedback {
  tone: 'success' | 'error';
  message: string;
}

interface CopyButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'onError'> {
  value: string;
  subject: string;
  showLabel?: boolean;
  onFeedback?: (feedback: CopyFeedback) => void;
}

type CopyState = 'idle' | 'copied' | 'error';

export const CopyButton = memo(function CopyButton({
  value,
  subject,
  showLabel = false,
  onFeedback,
  className = '',
  disabled,
  ...props
}: CopyButtonProps) {
  const [state, setState] = useState<CopyState>('idle');
  const resetTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    },
    [],
  );

  const copy = async () => {
    if (disabled) return;
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
      onFeedback?.({ tone: 'success', message: `Enlace público de ${subject} copiado.` });
    } catch {
      setState('error');
      onFeedback?.({
        tone: 'error',
        message: `No se pudo copiar automáticamente. Copia este enlace: ${value}`,
      });
    }

    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => setState('idle'), 1800);
  };

  const Icon = state === 'copied' ? Check : state === 'error' ? X : Clipboard;
  const label = state === 'copied' ? 'Copiado' : state === 'error' ? 'Reintentar' : 'Copiar';

  return (
    <button
      type="button"
      className={`platform-copy-button${state !== 'idle' ? ` is-${state}` : ''}${className ? ` ${className}` : ''}`}
      onClick={() => void copy()}
      disabled={disabled}
      aria-label={`${label} enlace público de ${subject}`}
      title={`${label} enlace público`}
      {...props}
    >
      <span className="platform-copy-button__icon" aria-hidden="true"><Icon /></span>
      {showLabel && <span>{label}</span>}
      <span className="sr-only" aria-live="polite">{state === 'copied' ? 'Enlace copiado' : ''}</span>
    </button>
  );
});
