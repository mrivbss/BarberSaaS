/*
 * Adapted for BarberSaaS from React Bits' LineSidebar component.
 * Copyright (c) 2026 David Haz. See THIRD_PARTY_NOTICES.md.
 */
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

export interface DetailNavigationItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

interface LineSidebarProps {
  items: readonly DetailNavigationItem[];
  initialActiveId?: string;
  ariaLabel?: string;
  className?: string;
  proximityRadius?: number;
  maxShift?: number;
  smoothing?: number;
}

const ACTIVE_LINE_OFFSET = 190;

function preferredIndex(items: readonly DetailNavigationItem[], initialActiveId?: string): number {
  const hashId = window.location.hash.slice(1);
  const match = items.findIndex((item) => item.id === (hashId || initialActiveId));
  return match >= 0 ? match : 0;
}

function LineSidebar({
  items,
  initialActiveId,
  ariaLabel = 'Secciones de la barbería',
  className = '',
  proximityRadius = 100,
  maxShift = 12,
  smoothing = 110,
}: LineSidebarProps) {
  const reducedMotion = useReducedMotion();
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const targetEffectsRef = useRef<number[]>(items.map(() => 0));
  const currentEffectsRef = useRef<number[]>(items.map(() => 0));
  const animationFrameRef = useRef<number | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const pointerPositionRef = useRef({ x: 0, y: 0 });
  const scrollFrameRef = useRef<number | null>(null);
  const previousFrameRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const activeIndexRef = useRef(preferredIndex(items, initialActiveId));
  const [activeIndex, setActiveIndex] = useState(activeIndexRef.current);

  activeIndexRef.current = activeIndex;

  const applyEffects = useCallback(() => {
    itemRefs.current.forEach((element, index) => {
      if (!element) return;
      const target = Math.max(
        targetEffectsRef.current[index] ?? 0,
        activeIndexRef.current === index ? 1 : 0,
      );
      currentEffectsRef.current[index] = target;
      element.style.setProperty('--line-effect', target.toFixed(4));
      element.parentElement?.style.setProperty('--line-effect', target.toFixed(4));
    });
  }, []);

  const runFrame = useCallback((now: number) => {
    const delta = Math.min((now - previousFrameRef.current) / 1000, 0.05);
    previousFrameRef.current = now;
    const easing = 1 - Math.exp(-delta / Math.max(smoothing, 1) * 1000);
    let moving = false;

    itemRefs.current.forEach((element, index) => {
      if (!element) return;
      const target = Math.max(
        targetEffectsRef.current[index] ?? 0,
        activeIndexRef.current === index ? 1 : 0,
      );
      const current = currentEffectsRef.current[index] ?? 0;
      const next = current + (target - current) * easing;
      const settled = Math.abs(target - next) < 0.0015;
      const value = settled ? target : next;
      currentEffectsRef.current[index] = value;
      element.style.setProperty('--line-effect', value.toFixed(4));
      element.parentElement?.style.setProperty('--line-effect', value.toFixed(4));
      if (!settled) moving = true;
    });

    animationFrameRef.current = moving ? requestAnimationFrame(runFrame) : null;
  }, [smoothing]);

  const startAnimation = useCallback(() => {
    if (reducedMotionRef.current) {
      applyEffects();
      return;
    }
    if (animationFrameRef.current !== null) return;
    previousFrameRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(runFrame);
  }, [applyEffects, runFrame]);

  const updatePointerEffects = useCallback(() => {
    pointerFrameRef.current = null;
    const list = listRef.current;
    if (!list || reducedMotionRef.current) return;
    const isHorizontal = window.getComputedStyle(list).flexDirection === 'row';
    const pointerPosition = isHorizontal
      ? pointerPositionRef.current.x
      : pointerPositionRef.current.y;

    itemRefs.current.forEach((element, index) => {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const center = isHorizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
      const proximity = Math.max(0, 1 - Math.abs(pointerPosition - center) / proximityRadius);
      targetEffectsRef.current[index] = proximity * proximity * (3 - 2 * proximity);
    });
    startAnimation();
  }, [proximityRadius, startAnimation]);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLUListElement>) => {
    pointerPositionRef.current = { x: event.clientX, y: event.clientY };
    if (pointerFrameRef.current === null) {
      pointerFrameRef.current = requestAnimationFrame(updatePointerEffects);
    }
  }, [updatePointerEffects]);

  const resetPointerEffects = useCallback(() => {
    if (pointerFrameRef.current !== null) {
      cancelAnimationFrame(pointerFrameRef.current);
      pointerFrameRef.current = null;
    }
    targetEffectsRef.current = items.map(() => 0);
    startAnimation();
  }, [items, startAnimation]);

  const focusItem = (index: number) => {
    const normalizedIndex = (index + items.length) % items.length;
    itemRefs.current[normalizedIndex]?.focus();
    itemRefs.current[normalizedIndex]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLAnchorElement>, index: number) => {
    const isHorizontal = window.getComputedStyle(listRef.current ?? event.currentTarget).flexDirection === 'row';
    const previousKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';

    if (event.key === previousKey) {
      event.preventDefault();
      focusItem(index - 1);
    } else if (event.key === nextKey) {
      event.preventDefault();
      focusItem(index + 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusItem(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusItem(items.length - 1);
    } else if (event.key === ' ') {
      event.preventDefault();
      event.currentTarget.click();
    }
  };

  const selectSection = (index: number, id: string) => {
    setActiveIndex(index);
    const section = document.getElementById(id);
    if (!section) return;
    section.scrollIntoView({
      behavior: reducedMotionRef.current ? 'auto' : 'smooth',
      block: 'start',
    });
    window.history.replaceState(window.history.state, '', `#${id}`);
  };

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
    if (reducedMotion && animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    startAnimation();
  }, [reducedMotion, startAnimation]);

  useEffect(() => {
    const updateActiveSection = () => {
      scrollFrameRef.current = null;
      let nextIndex = 0;
      const offset = Math.min(ACTIVE_LINE_OFFSET, window.innerHeight * 0.3);

      items.forEach((item, index) => {
        const section = document.getElementById(item.id);
        if (section && section.getBoundingClientRect().top <= offset) nextIndex = index;
      });

      setActiveIndex((current) => (current === nextIndex ? current : nextIndex));
    };

    const scheduleUpdate = () => {
      if (scrollFrameRef.current !== null) return;
      scrollFrameRef.current = requestAnimationFrame(updateActiveSection);
    };

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('hashchange', scheduleUpdate);
    scheduleUpdate();

    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('hashchange', scheduleUpdate);
      if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
    };
  }, [items]);

  useEffect(() => {
    startAnimation();
  }, [activeIndex, startAnimation]);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current);
    },
    [],
  );

  return (
    <nav
      className={`detail-line-sidebar${className ? ` ${className}` : ''}`}
      aria-label={ariaLabel}
      style={
        {
          '--line-max-shift': `${maxShift}px`,
          '--line-smoothing': `${smoothing}ms`,
        } as CSSProperties
      }
    >
      <ul
        ref={listRef}
        className="detail-line-sidebar__list"
        onPointerMove={handlePointerMove}
        onPointerLeave={resetPointerEffects}
      >
        {items.map(({ id, label, description, icon: Icon }, index) => (
          <li key={id} className="detail-line-sidebar__item">
            <span className="detail-line-sidebar__marker" aria-hidden="true" />
            <a
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              href={`#${id}`}
              className="detail-line-sidebar__link"
              aria-current={activeIndex === index ? 'location' : undefined}
              onClick={(event) => {
                event.preventDefault();
                selectSection(index, id);
              }}
              onKeyDown={(event) => handleKeyDown(event, index)}
              onFocus={() => {
                targetEffectsRef.current[index] = 1;
                startAnimation();
              }}
              onBlur={() => {
                targetEffectsRef.current[index] = 0;
                startAnimation();
              }}
            >
              <span className="detail-line-sidebar__index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="detail-line-sidebar__icon" aria-hidden="true"><Icon /></span>
              <span className="detail-line-sidebar__copy">
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default memo(LineSidebar);
