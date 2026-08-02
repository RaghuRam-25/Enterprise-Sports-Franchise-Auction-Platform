import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Trophy, X } from 'lucide-react';
import PitchSVG from '../../components/auction/PitchSVG';
import SpotlightBackground from '../../components/auction/SpotlightBackground';
import FloatingParticles from '../../components/auction/FloatingParticles';
import { playerAPI } from '../../services/api';

/* FieldPositionReveal — immersive "where you'll play" reveal.
 *
 * Rendered INSIDE DashboardLayout (see App.jsx) so the sidebar/navbar stay
 * put — the page fills the main content area as a rounded, full-height panel
 * rather than the whole viewport. The pitch fills that panel and the player's
 * marker drops onto it at (fieldX, fieldY) — stored as percentages so it stays
 * correct at any panel size.
 *
 * Cinematic language is lifted from PlayerRevealAnimation (the "সরাসরি" live
 * reveal used on the podium): dark premium backdrop, SpotlightBackground +
 * FloatingParticles, GPU-accelerated transform/opacity, cyan→emerald glow, and
 * prefers-reduced-motion jumps straight to the revealed state.
 *
 * Data: GET /api/players/field-position
 *   - 200 → reveal the pitch + marker
 *   - 404 (code NOT_SOLD or message "not been drafted") → "not drafted yet"
 *   - any other error → retry state with a manual reload
 */

const EASE = [0.16, 1, 0.3, 1];

export default function FieldPositionReveal() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [state, setState] = useState('loading'); // loading | not-sold | error | ready
  const [errorMsg, setErrorMsg] = useState('');
  const [data, setData] = useState(null);
  const [phase, setPhase] = useState(0); // 0 scan → 1 marker → 2 info → 3 stable

  // Pull the fetch into a callback so the "Try again" button can re-run it.
  const load = useCallback(async () => {
    setState('loading');
    setErrorMsg('');
    try {
      const res = await playerAPI.getFieldPosition();
      const payload = res?.data?.data || res?.data || null;
      if (!payload || !Number.isFinite(payload.fieldX) || !Number.isFinite(payload.fieldY)) {
        throw new Error('Field position response was missing coordinates');
      }
      setData(payload);
      setPhase(0);
      setState('ready');
    } catch (err) {
      const status = err?.response?.status;
      const body = err?.response?.data;
      const notSold =
        status === 404 &&
        (body?.code === 'NOT_SOLD' || /draft/i.test(body?.message || ''));
      if (notSold) {
        setState('not-sold');
      } else {
        setErrorMsg(body?.message || 'Failed to load your field position.');
        setState('error');
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Cinematic phase scheduler — build up the scene like PlayerRevealAnimation.
  useEffect(() => {
    if (state !== 'ready' || reduceMotion) {
      if (state === 'ready' && reduceMotion) setPhase(3);
      return undefined;
    }
    setPhase(0);
    const timers = [
      setTimeout(() => setPhase(1), 1600), // scan completes → marker drops
      setTimeout(() => setPhase(2), 2600), // position + team info animates in
      setTimeout(() => setPhase(3), 3600), // stable hold
    ];
    return () => timers.forEach(clearTimeout);
  }, [state, reduceMotion]);

  const fieldX = data?.fieldX ?? 50;
  const fieldY = data?.fieldY ?? 50;
  const team = data?.team || {};
  const positionCode = data?.assignedFieldPosition || '—';
  const positionName = data?.positionName || positionCode;
  const soldPrice = data?.soldPrice || 0;

  return (
    <div className="relative h-[calc(100vh-8rem)] min-h-[520px] w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl">
      <SpotlightBackground theme="default" spotlightEnabled={state === 'ready' && phase >= 1} />
      <FloatingParticles count={28} theme="default" />

      {/* ── LOADING ─────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {state === 'loading' && (
          <motion.div
            key="loading"
            className="absolute inset-0 flex flex-col items-center justify-center gap-4"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="h-10 w-10 rounded-full border-2 border-slate-700 border-t-cyan-400 animate-spin" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
              Loading field position…
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ERROR (retry) ────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {state === 'error' && (
          <motion.div
            key="error"
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="glass-card max-w-md rounded-2xl border border-rose-800/60 p-8 text-slate-300">
              <X className="mx-auto mb-3 h-8 w-8 text-rose-400" />
              <h1 className="text-lg font-black text-white">Couldn't load your reveal</h1>
              <p className="mt-1 text-sm text-slate-400">{errorMsg}</p>
              <button
                type="button"
                onClick={load}
                className="mt-5 rounded-xl bg-cyan-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-cyan-500"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={() => navigate('/player/dashboard')}
                className="mt-2 block w-full rounded-xl border border-slate-700 px-5 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-800"
              >
                Back to Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NOT SOLD YET ────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {state === 'not-sold' && (
          <motion.div
            key="not-sold"
            className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="glass-card max-w-md rounded-2xl border border-slate-800 p-8">
              <Trophy className="mx-auto mb-3 h-10 w-10 text-amber-400/80" />
              <h1 className="text-xl font-black text-white">You haven't been drafted yet</h1>
              <p className="mt-2 text-sm text-slate-400">
                Your field position reveal will appear here once you're sold to a
                franchise team. Check back after the auction!
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/live')}
                  className="rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-cyan-500"
                >
                  Watch the Live Auction
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/player/dashboard')}
                  className="rounded-xl border border-slate-700 px-5 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-slate-800"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── READY — the reveal ──────────────────────────────────────────── */}
      {state === 'ready' && (
        <>
          {/* Exit / nav control — full-bleed page has no sidebar, so this is
              the only way back. */}
          <motion.button
            type="button"
            onClick={() => navigate('/player/dashboard')}
            className="absolute left-4 top-4 z-30 flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-300 backdrop-blur-md transition hover:border-white/30 hover:text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 1 ? 1 : 0 }}
            transition={{ duration: 0.4 }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </motion.button>

          {/* Full-viewport pitch */}
          <div className="absolute inset-0">
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: EASE }}
            >
              <PitchSVG />
            </motion.div>

            {/* Spotlight sweep during the SCAN phase */}
            <motion.div
              className="pointer-events-none absolute inset-0"
              initial={false}
              animate={
                phase === 0
                  ? { opacity: 1 }
                  : { opacity: 0 }
              }
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="absolute inset-y-0 w-1/3"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(56,189,248,0.10), transparent)',
                  filter: 'blur(20px)',
                }}
                initial={{ left: '-40%' }}
                animate={{ left: ['-40%', '110%'] }}
                transition={{
                  duration: 1.4,
                  ease: 'easeInOut',
                  repeat: 1,
                  repeatType: 'mirror',
                }}
              />
            </motion.div>
          </div>

          {/* The position marker — positioned by fieldX/fieldY as percentages
              of the pitch, so it's correct at any viewport size. */}
          <div className="absolute inset-0">
            <motion.div
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${fieldX}%`, top: `${fieldY}%`, willChange: 'transform' }}
              initial={{ scale: 0, opacity: 0 }}
              animate={
                phase >= 1
                  ? { scale: [0, 1.35, 1], opacity: 1 }
                  : { scale: 0, opacity: 0 }
              }
              transition={{ duration: 0.7, ease: EASE }}
            >
              {/* Glow pulse */}
              <motion.div
                className="absolute -inset-6 rounded-full bg-cyan-400/30 blur-2xl"
                animate={
                  phase >= 1
                    ? { opacity: [0.4, 0.9, 0.4], scale: [0.9, 1.15, 0.9] }
                    : { opacity: 0 }
                }
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              {/* Jersey puck */}
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-cyan-300/70 bg-slate-900/90 shadow-[0_0_30px_rgba(56,189,248,0.5)] backdrop-blur-md">
                <span className="font-black text-cyan-300" style={{ fontSize: '1.6rem' }}>
                  {positionCode.slice(0, 3)}
                </span>
              </div>
            </motion.div>
          </div>

          {/* Bottom info bar — team + position + price */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-5">
            <motion.div
              className="pointer-events-auto flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-center backdrop-blur-md sm:flex-row sm:justify-between sm:text-left"
              initial={{ opacity: 0, y: 40 }}
              animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <div className="flex items-center gap-3">
                {team.logoUrl ? (
                  <img
                    src={team.logoUrl}
                    alt={team.name}
                    className="h-10 w-10 rounded-xl border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-lg">
                    {team.shortCode?.[0] || '🏆'}
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Your Team
                  </p>
                  <p className="font-black text-white">{team.name || 'Franchise Team'}</p>
                </div>
              </div>

              <div className="text-center sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Position
                </p>
                <p className="font-black text-cyan-300">
                  {positionCode} <span className="text-sm font-semibold text-slate-300">· {positionName}</span>
                </p>
              </div>

              <div className="text-center sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Sold For
                </p>
                <p className="font-mono font-black text-emerald-400">
                  ৳{soldPrice.toLocaleString('en-IN')}
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
