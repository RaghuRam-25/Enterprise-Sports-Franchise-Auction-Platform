import { useEffect } from 'react';

/**
 * Locks background page scroll while a modal is open and restores the
 * previous scroll behavior on close/unmount. Compensates for scrollbar
 * width so the page doesn't shift when the scrollbar disappears.
 */
export default function useModalScrollLock(isOpen) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Block every scroll gesture (wheel / touch drag) that does not originate
    // inside an element marked [data-modal-scroll]. This also neutralises
    // nested app scroll containers (e.g. dashboard <main>) and scroll chaining.
    const guardScroll = (e) => {
      if (e.target instanceof Element && e.target.closest('[data-modal-scroll]')) return;
      e.preventDefault();
    };

    window.addEventListener('wheel', guardScroll, { passive: false });
    window.addEventListener('touchmove', guardScroll, { passive: false });

    return () => {
      window.removeEventListener('wheel', guardScroll);
      window.removeEventListener('touchmove', guardScroll);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isOpen]);
}
