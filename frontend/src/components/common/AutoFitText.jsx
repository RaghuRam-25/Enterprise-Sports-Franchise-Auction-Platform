import { useEffect, useRef, useState } from 'react';

/**
 * AutoFitText — renders a value on a single line and automatically shrinks
 * the font size (down to minSize) until the ENTIRE value fits the available
 * width of its container. Recalculates via ResizeObserver whenever the card
 * or viewport resizes, and after webfonts finish loading.
 *
 * - No truncation, ellipsis, clipping or abbreviated values.
 * - Font size scales down from maxSize (~34px) toward minSize (~18px).
 * - Styling (font family, weight, color) is inherited from `className`.
 */
export default function AutoFitText({
  children,
  minSize = 18,
  maxSize = 34,
  className = '',
}) {
  const wrapRef = useRef(null);
  const probeRef = useRef(null);
  const [size, setSize] = useState(maxSize);

  useEffect(() => {
    const wrap = wrapRef.current;
    const probe = probeRef.current;
    if (!wrap || !probe) return undefined;

    let raf = 0;
    const fit = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const available = wrap.clientWidth;
        if (!available) return;

        // Natural width of the full value rendered at maxSize (hidden probe).
        // A small safety margin absorbs sub-pixel rounding so the tail
        // characters (e.g. the "BDT" suffix) are never clipped.
        const usable = available * 0.96;
        const natural = probe.getBoundingClientRect().width;
        if (!natural) return;

        if (natural <= usable) {
          setSize(maxSize);
          return;
        }
        setSize(Math.max(minSize, Math.floor((maxSize * usable) / natural)));
      });
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    window.addEventListener('resize', fit);
    if (document.fonts && typeof document.fonts.ready === 'object') {
      document.fonts.ready.then(fit).catch(() => {});
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [children, minSize, maxSize]);

  return (
    <div
      ref={wrapRef}
      className={`relative w-full min-w-0 box-border overflow-hidden ${className}`}
    >
      {/* Hidden measurement copy at max size */}
      <span
        ref={probeRef}
        aria-hidden="true"
        className="invisible absolute top-0 left-0 whitespace-nowrap pointer-events-none"
        style={{ fontSize: `${maxSize}px`, lineHeight: 1.2 }}
      >
        {children}
      </span>

      {/* Visible, fitted value */}
      <span
        className="block whitespace-nowrap overflow-hidden"
        style={{ fontSize: `${size}px`, lineHeight: 1.2 }}
      >
        {children}
      </span>
    </div>
  );
}
