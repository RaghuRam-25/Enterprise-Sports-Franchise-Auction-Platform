import 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import { useLocation } from 'react-router-dom';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES = {
  success: 'bg-[#0B0B0B] border-successGreen/50 text-white',
  error: 'bg-[#0B0B0B] border-urgentRed/60 text-urgentRedText',
  warning: 'bg-[#0B0B0B] border-warningGold/50 text-warningGold',
  info: 'bg-[#0B0B0B] border-neonGreen/40 text-white',
};

export default function Toast() {
  const { lastActionToast } = useAuction();
  const location = useLocation();

  // Hide toasts on immersive full-screen views to avoid distraction.
  // This includes the public /live view and authenticated immersive views.
  const isImmersiveLiveView = [
    '/live',
    '/podium/live',
    '/manager/podium',
    '/manager/bid-center',
  ].includes(location.pathname);

  const Icon = lastActionToast ? (ICONS[lastActionToast.type] || Info) : Info;
  const style = lastActionToast ? (STYLES[lastActionToast.type] || STYLES.info) : STYLES.info;

  return (
    <AnimatePresence>
      {lastActionToast && !isImmersiveLiveView && (
        <motion.div
          key={lastActionToast.id}
          className="fixed top-5 right-5 z-[9999]"
          initial={{ opacity: 0, x: 60, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 60, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        >
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-2xl backdrop-blur-md text-xs font-semibold ${style}`}>
            <Icon className="w-4.5 h-4.5 flex-shrink-0" />
            <span>{lastActionToast.msg}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
