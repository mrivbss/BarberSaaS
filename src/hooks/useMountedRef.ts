import { useEffect, useRef, type MutableRefObject } from 'react';

export function useMountedRef(): MutableRefObject<boolean> {
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return mountedRef;
}
