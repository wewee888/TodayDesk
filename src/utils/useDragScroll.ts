import React, { useEffect, useRef, useState } from 'react';

/**
 * Enables PC desktop left-mouse-button hold-and-drag horizontal scrolling
 * on any overflow-x-auto container while preserving normal clicks on child buttons.
 * Uses window-level mousemove/mouseup listeners during active drag so dragging
 * remains smooth even if the cursor leaves the strip bounds.
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>() {
  const containerRef = useRef<T | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const stateRef = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    hasMoved: false,
  });

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!stateRef.current.isDown) return;
      const el = containerRef.current;
      if (!el) return;

      const walk = e.clientX - stateRef.current.startX;
      if (Math.abs(walk) > 3) {
        if (!stateRef.current.hasMoved) {
          stateRef.current.hasMoved = true;
          setIsDragging(true);
        }
        e.preventDefault();
        el.scrollLeft = stateRef.current.scrollLeft - walk * 1.25;
      }
    };

    const handleWindowMouseUp = () => {
      if (!stateRef.current.isDown) return;
      stateRef.current.isDown = false;
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove, {
      passive: false,
    });
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, []);

  const onMouseDown = (e: React.MouseEvent<T>) => {
    if (e.button !== 0) return; // Only left mouse button
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT'
    ) {
      return;
    }
    const el = containerRef.current;
    if (!el) return;

    stateRef.current.isDown = true;
    stateRef.current.hasMoved = false;
    stateRef.current.startX = e.clientX;
    stateRef.current.scrollLeft = el.scrollLeft;
  };

  const onDragStart = (e: React.DragEvent<T>) => {
    e.preventDefault();
  };

  const onClickCapture = (e: React.MouseEvent<T>) => {
    if (stateRef.current.hasMoved) {
      e.stopPropagation();
      e.preventDefault();
      stateRef.current.hasMoved = false;
    }
  };

  return {
    ref: containerRef,
    isDragging,
    dragProps: {
      ref: containerRef,
      onMouseDown,
      onDragStart,
      onClickCapture,
    },
  };
}
