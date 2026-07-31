import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Loader2, Users, Trophy, DollarSign, AlertCircle, FileText, Clock } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { useAuction } from '../../context/AuctionContext';

export default function AdminReports() {
  const { formatCurrency, triggerToast } = useAuction();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadReport = async () => {
      try {
        const res = await adminAPI.getReports();
        setReport(res?.data || null);
      } catch (err) {
        triggerToast('Failed to load reports', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, [triggerToast]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await adminAPI.exportReports();
      const exportData = res?.data || res;
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auction-report-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      triggerToast('Report exported successfully!', 'success');
    } catch (err) {
      triggerToast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const formatLogDetails = (details) => {
    if (!details) return '';
    if (typeof details === 'string') return details;
    if (typeof details === 'object') {
      try {
        return Object.entries(details)
          .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
          .join(' | ');
      } catch (_) {
        return JSON.stringify(details);
      }
    }
    return String(details);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  const summary = report?.summary || {};

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Super Admin Analytics</span>
          <h1 className="text-2xl font-black font-heading text-white">Reports & System Analytics</h1>
          <p className="text-xs text-slate-400 mt-1">Auction performance overview, transaction ledger, and audit trail.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-xs rounded-xl transition shadow-lg"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export Full Report
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Total Players</p>
              <h3 className="text-2xl font-black text-white mt-1">{summary.totalPlayers || 0}</h3>
              <p className="text-[11px] text-emerald-400 mt-1">{summary.soldPlayers || 0} Sold &bull; {summary.unsoldPlayers || 0} Unsold</p>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Registered (Pending)</p>
              <h3 className="text-2xl font-black text-white mt-1">{summary.registeredPlayers || 0}</h3>
              <p className="text-[11px] text-amber-400 mt-1">Awaiting approval</p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Total Teams</p>
              <h3 className="text-2xl font-black text-white mt-1">{summary.totalTeams || 0}</h3>
              <p className="text-[11px] text-blue-400 mt-1">Active franchise buyers</p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Trophy className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Total Spent</p>
              <h3 className="text-xl font-black text-white mt-1">{formatCurrency(summary.totalSpent)}</h3>
              <p className="text-[11px] text-emerald-400 mt-1">Across all transactions</p>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Team Budget Summary */}
      {report?.teams && report.teams.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" /> Franchise Budget Overview
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-bold text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Franchise</th>
                  <th className="py-3 px-4">Total Purse</th>
                  <th className="py-3 px-4">Remaining</th>
                  <th className="py-3 px-4">Spent</th>
                  <th className="py-3 px-4">Roster</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {report.teams.map(team => (
                  <tr key={team._id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-white">{team.name}</td>
                    <td className="py-3 px-4 font-mono">{formatCurrency(team.totalBudget)}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400">{formatCurrency(team.remainingBudget)}</td>
                    <td className="py-3 px-4 font-mono text-rose-400">{formatCurrency((team.totalBudget || 0) - (team.remainingBudget || 0))}</td>
                    <td className="py-3 px-4 font-bold">{team.currentRosterCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" /> Recent Auction Transactions
        </h3>
        {report?.recentTransactions && report.recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-bold text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4">Sold Price</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {report.recentTransactions.slice(0, 20).map((tx, idx) => (
                  <tr key={tx._id || idx} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-white">{tx.playerName || 'Unknown'}</td>
                    <td className="py-3 px-4 text-blue-400 font-semibold">{tx.teamName || 'Unknown'}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-bold">{formatCurrency(tx.soldPrice)}</td>
                    <td className="py-3 px-4 text-slate-400">{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500 space-y-1">
            <p className="font-bold text-slate-400 text-xs">No auction transactions recorded yet.</p>
            <p className="text-[11px]">Transaction logs will appear as soon as players are sold during live auctions.</p>
          </div>
        )}
      </div>

      {/* Audit Log */}
      {report?.recentAuditLogs && report.recentAuditLogs.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" /> Recent Audit Trail
          </h3>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {report.recentAuditLogs.slice(0, 30).map((log, idx) => (
              <div key={log._id || idx} className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white">{log.action || log.event}</span>
                  <span className="text-slate-400 ml-2 font-mono text-[11px]">{formatLogDetails(log.details || log.description)}</span>
                </div>
                <span className="text-[10px] text-slate-500 flex-shrink-0 ml-4">
                  {log.createdAt ? new Date(log.createdAt).toLocaleString() : log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
