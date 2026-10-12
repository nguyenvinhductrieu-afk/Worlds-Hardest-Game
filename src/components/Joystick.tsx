import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  onDirection: (dx: number, dy: number) => void;
  size?: number;
}

interface JoystickState {
  active: boolean;
  baseX: number;
  baseY: number;
  stickX: number;
  stickY: number;
}

const BASE_RADIUS = 60;
const STICK_RADIUS = 28;
const MAX_DIST = 40;

export function Joystick({ onDirection, size = 120 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);
  const [state, setState] = useState<JoystickState>({
    active: false,
    baseX: 0,
    baseY: 0,
    stickX: 0,
    stickY: 0,
  });

  const updateDirection = useCallback(
    (dx: number, dy: number) => {
      onDirection(dx, dy);
    },
    [onDirection],
  );

  const handleStart = useCallback(
    (clientX: number, clientY: number, touchId?: number) => {
      if (touchId !== undefined) {
        touchIdRef.current = touchId;
      }
      setState({
        active: true,
        baseX: clientX,
        baseY: clientY,
        stickX: clientX,
        stickY: clientY,
      });
    },
    [],
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      setState((prev) => {
        if (!prev.active) return prev;
        let dx = clientX - prev.baseX;
        let dy = clientY - prev.baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > MAX_DIST) {
          dx = (dx / dist) * MAX_DIST;
          dy = (dy / dist) * MAX_DIST;
        }

        const normX = dx / MAX_DIST;
        const normY = dy / MAX_DIST;
        updateDirection(normX, normY);

        return {
          ...prev,
          stickX: prev.baseX + dx,
          stickY: prev.baseY + dy,
        };
      });
    },
    [updateDirection],
  );

  const handleEnd = useCallback(() => {
    touchIdRef.current = null;
    setState({
      active: false,
      baseX: 0,
      baseY: 0,
      stickX: 0,
      stickY: 0,
    });
    updateDirection(0, 0);
  }, [updateDirection]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (touchIdRef.current !== null) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      handleStart(touch.clientX, touch.clientY, touch.identifier);
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (touchIdRef.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchIdRef.current) {
          handleMove(touch.clientX, touch.clientY);
          break;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          handleEnd();
          break;
        }
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      handleStart(e.clientX, e.clientY);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!state.active) return;
      handleMove(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      if (state.active) handleEnd();
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: false });
    container.addEventListener('touchcancel', onTouchEnd, { passive: false });
    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [handleStart, handleMove, handleEnd, state.active]);

  return (
    <div
      ref={containerRef}
      className="relative touch-none"
      style={{ width: size, height: size }}
    >
      {/* Base ring */}
      <div
        className="absolute rounded-full border-2 transition-opacity duration-150"
        style={{
          width: BASE_RADIUS * 2,
          height: BASE_RADIUS * 2,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          borderColor: state.active ? 'rgba(59,130,246,0.6)' : 'rgba(100,116,139,0.35)',
          backgroundColor: state.active ? 'rgba(59,130,246,0.08)' : 'rgba(15,23,42,0.4)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Inner direction guides */}
      <div
        className="absolute rounded-full transition-opacity duration-150"
        style={{
          width: 4,
          height: 4,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(100,116,139,0.3)',
        }}
      />

      {/* Stick knob */}
      <div
        className="absolute rounded-full transition-all duration-75 ease-out shadow-lg"
        style={{
          width: STICK_RADIUS * 2,
          height: STICK_RADIUS * 2,
          left: state.active ? state.stickX : 0,
          top: state.active ? state.stickY : 0,
          transform: state.active
            ? `translate(-50%, -50%)`
            : `translate(${size / 2 - STICK_RADIUS}px, ${size / 2 - STICK_RADIUS}px)`,
          backgroundColor: state.active ? '#3b82f6' : '#475569',
          border: '2px solid rgba(255,255,255,0.15)',
          opacity: state.active ? 1 : 0.6,
        }}
      />
    </div>
  );
}
