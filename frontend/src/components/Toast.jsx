import React from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';
import { useAuction } from '../context/AuctionContext';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES = {
  success: 'bg-emerald-950/95 border-emerald-500/50 text-emerald-300',
  error: 'bg-rose-950/95 border-rose-500/50 text-rose-300',
  warning: 'bg-amber-950/95 border-amber-500/50 text-amber-300',
  info: 'bg-blue-950/95 border-blue-500/50 text-blue-300',
};

export default function Toast() {
  const { lastActionToast } = useAuction();

  if (!lastActionToast) return null;

  const Icon = ICONS[lastActionToast.type] || Info;
  const style = STYLES[lastActionToast.type] || STYLES.info;

  return (
    <div className="fixed top-5 right-5 z-[9999] animate-slide-in-right">
      <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-2xl backdrop-blur-md text-xs font-semibold ${style}`}>
        <Icon className="w-4.5 h-4.5 flex-shrink-0" />
        <span>{lastActionToast.msg}</span>
      </div>
    </div>
  );
}
