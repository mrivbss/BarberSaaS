import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({ value, duration = 620, className = '' }: AnimatedCounterProps) {
  const reducedMotion = useReducedMotion();
  const displayRef = useRef<HTMLSpanElement>(null);
  const displayedValueRef = useRef(reducedMotion ? value : 0);

  useEffect(() => {
    const startValue = displayedValueRef.current;

    if (reducedMotion || duration <= 0 || startValue === value) {
      displayedValueRef.current = value;
      if (displayRef.current) displayRef.current.textContent = String(value);
      return;
    }

    let frameId = 0;
    const startTime = performance.now();
    const difference = value - startValue;

    const update = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(startValue + difference * eased);
      displayedValueRef.current = nextValue;
      if (displayRef.current) displayRef.current.textContent = String(nextValue);
      if (progress < 1) frameId = requestAnimationFrame(update);
    };

    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [duration, reducedMotion, value]);

  return (
    <span className={`platform-animated-counter ${className}`.trim()} aria-label={String(value)}>
      <span ref={displayRef} aria-hidden="true">{displayedValueRef.current}</span>
    </span>
  );
}
