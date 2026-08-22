import { createPortal } from 'react-dom';

/**
 * DetailsViewport — THE single reusable, viewport-level container for ALL
 * Team/Player detail views (landing page, team cards, player cards, admin
 * dashboards, super-admin dashboards, management pages, etc.).
 *
 * Rendered through a PORTAL to document.body so it can never be affected by
 * ancestor transforms/filters/animations — position depends ONLY on the
 * device viewport, never on the clicked card or its containers.
 *
 * Contract:
 *  - position: fixed, inset: 0 → always relative to the real viewport.
 *  - Card EXACTLY CENTERED within the visible area (flex center).
 *  - padding-top = live navbar height (--navbar-height, measured at runtime)
 *    so the card can never hide behind / slide under the fixed navbar.
 *  - Side/bottom padding keeps the card fully inside every screen edge;
 *    inner panel scrolls itself if content is taller than available space.
 *  - z-index 9999 above all page content; dark blurred backdrop behind it.
 *
 * Consumers lock background scrolling via useModalScrollLock and mark their
 * scrollable panel with [data-modal-scroll].
 */
export default function DetailsViewport({ onClose, children }) {
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[9999]"
    >
      {/* Full-screen dark backdrop */}
      <div className="absolute inset-0 bg-black/[0.65] backdrop-blur-[4px] animate-in fade-in duration-200" aria-hidden="true" />

      {/* Centered content area — navbar space reserved via dynamic padding */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-5 pt-[var(--navbar-height)]">
        {children}
      </div>
    </div>,
    document.body,
  );
}
