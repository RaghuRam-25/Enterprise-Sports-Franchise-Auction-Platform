# Unused Code Audit — Enterprise Sports Franchise Auction Platform

**Date:** 2026-08-02
**Scope:** `frontend/src` static reference analysis (read-only)
**Policy for this pass:** _Document only — delete nothing._ Per the project decision
"Keep all, just document," every item below is **retained**. This report exists so a
future maintainer can make an informed removal decision with full reference data.

> ⚠️ Verification note: The production build (`npm run build`) and lint (`npm run lint`)
> could **not** be executed during this session due to a persistent tool-classifier
> outage. All findings below are from static `grep`/read analysis only. Please run
> `cd frontend && npm run build && npm run lint` to confirm before acting on anything here.

---

## 1. Unused npm dependency

| Package | Version | References in `src` | Recommendation |
|---|---|---|---|
| `lottie-react` | ^2.4.1 | **0** | Candidate for removal. No `import` or `Lottie` usage anywhere in source. Kept for now. |

**Evidence:** `grep -r "lottie\|Lottie" frontend/src` → no matches.

**If you later remove it:** `npm remove lottie-react` (frontend). Zero source impact expected,
but re-run the build afterward.

---

## 2. Barrel-only exported components/hooks (defined + exported, never imported by a consumer)

These are exported from `frontend/src/components/auction/index.js` but no page/component
imports them. They are **complete, working, production-quality** modules — likely intended
as a reusable kit for future auction UIs. **Retained.**

| Symbol | File | Status | Notes |
|---|---|---|---|
| `PremiumBidButton` | `components/auction/PremiumBidButton.jsx` | Barrel-only | Cinematic CTA button kit. No current consumer. |
| `BidHistory` | `components/auction/BidHistory.jsx` | Barrel-only | Scrolling bid ledger component. Pages render bid history inline instead (via `bidHistory` state), so this component is currently redundant but functional. |
| `CountdownTimer` | `components/auction/CountdownTimer.jsx` | Barrel-only | Standalone animated timer. Pages use inline timer rendering. |
| `useBidEffects` | `hooks/useBidEffects.js` | Barrel-only | Bid visual/audio effect hook. No current consumer. |
| `useWinnerAnimation` | `hooks/useWinnerAnimation.js` | Barrel-only | Winner sequence orchestration hook. `WinnerAnimation.jsx` self-orchestrates instead. |

**Evidence:** full-tree grep shows each symbol appears **only** in its own definition file
and in `index.js` (export). No `import { X }` consumer exists.

**Why kept:** Removing a barrel export can silently break an external/lazy import that a
static grep won't catch, and these are polished, on-brand modules. They cost only bundle
size *if* tree-shaking fails to drop them — Vite/Rollup tree-shaking should exclude them
from the production bundle automatically since nothing imports them.

---

## 3. Confirmed IN USE (previously suspected, now cleared)

Re-verification promoted these from "suspect" to **actively used** — do **not** remove:

| Symbol | Consumers |
|---|---|
| `RosterAnimation` | `PublicLiveView.jsx`, `ManagerDashboard.jsx`, `PodiumDashboard.jsx` |
| `FloatingParticles` | `WaitingAnimation.jsx`, `PlayerRevealAnimation.jsx` |
| `SpotlightBackground` | `WaitingAnimation.jsx`, `PlayerRevealAnimation.jsx` |
| `WaitingAnimation`, `PlayerRevealAnimation`, `WinnerAnimation` | `PublicLiveView.jsx` (+ podium/manager views) |
| `soundManager`, `AUCTION_SOUNDS` | animation components |
| `useAuctionAnimation`, `ANIM_STATES` | `PublicLiveView.jsx` and peers |
| `gsap` | `SpotlightBackground`, `RosterAnimation`, `BidHistory`, `CountdownTimer`, `useBidEffects`, `useWinnerAnimation` (6 files) — **stays** |

---

## 4. Summary

- **Safe-to-remove candidates (documented, NOT removed):** 1 npm package (`lottie-react`),
  5 barrel-only modules.
- **Nothing was deleted** in accordance with the "Keep all, just document" decision and the
  project rule "If uncertain whether something is used, DO NOT DELETE IT."
- **Action required from you:** run `npm run build && npm run lint` to validate the current
  tree, then decide independently whether to prune the Section 1 & 2 items.
