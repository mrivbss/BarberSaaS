import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';

export interface ToastMessage {
  id: number;
  tone: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
  duration?: number;
}

export const PlatformToast = memo(function PlatformToast({ toast, onDismiss, duration = 4200 }: ToastProps) {
  const onDismissRef = useRef(onDismiss);
  const remainingRef = useRef(duration);
  const timerStartedAtRef = useRef(0);
  const [paused, setPaused] = useState(false);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    remainingRef.current = duration;
    setPaused(false);
  }, [duration, toast?.id, toast?.message]);

  useEffect(() => {
    if (!toast || toast.tone === 'error' || duration <= 0 || paused) return;
    timerStartedAtRef.current = performance.now();
    const timer = window.setTimeout(() => onDismissRef.current(), remainingRef.current);
    return () => {
      window.clearTimeout(timer);
      remainingRef.current = Math.max(
        0,
        remainingRef.current - (performance.now() - timerStartedAtRef.current),
      );
    };
  }, [duration, paused, toast?.id, toast?.message, toast?.tone]);

  if (!toast) return null;

  const Icon = toast.tone === 'success' ? CheckCircle2 : toast.tone === 'error' ? AlertCircle : Info;

  return (
    <div className="platform-toast-viewport" aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}>
      <div
        className={`platform-toast platform-toast--${toast.tone}${paused ? ' is-paused' : ''}`}
        role={toast.tone === 'error' ? 'alert' : 'status'}
        style={{ '--platform-toast-duration': `${duration}ms` } as CSSProperties}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <span className="platform-toast__icon" aria-hidden="true"><Icon /></span>
        <span className="platform-toast__copy">
          <strong>{toast.tone === 'success' ? 'Listo' : toast.tone === 'error' ? 'Atención' : 'Información'}</strong>
          <span>{toast.message}</span>
        </span>
        <button type="button" onClick={onDismiss} aria-label="Cerrar notificación">
          <X aria-hidden="true" />
        </button>
        {toast.tone !== 'error' && <span className="platform-toast__timer" aria-hidden="true" />}
      </div>
    </div>
  );
});
