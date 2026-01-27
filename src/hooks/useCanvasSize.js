import { useState, useEffect, useCallback } from 'react';

const ASPECT_RATIO = 9 / 19.5;
const MIN_WIDTH = 280;

/**
 * Computes responsive canvas dimensions maintaining 9:19.5 aspect ratio.
 * Uses ResizeObserver for efficient updates.
 */
export function useCanvasSize() {
  const [size, setSize] = useState(() => computeSize());

  const handleResize = useCallback(() => {
    setSize(computeSize());
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 100);
    });
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  return size;
}

function computeSize() {
  const ww = window.innerWidth;
  const wh = window.innerHeight;

  let cw, ch;
  if (ww / wh > ASPECT_RATIO) {
    ch = wh;
    cw = wh * ASPECT_RATIO;
  } else {
    cw = ww;
    ch = ww / ASPECT_RATIO;
  }

  if (cw < MIN_WIDTH) {
    cw = MIN_WIDTH;
    ch = MIN_WIDTH / ASPECT_RATIO;
  }

  return { width: Math.floor(cw), height: Math.floor(ch) };
}
