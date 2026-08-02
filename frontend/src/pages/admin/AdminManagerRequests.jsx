import  { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, CheckCircle2, Clock, XCircle, Check, X, Loader2, RefreshCw, AlertTriangle, Users, UserCheck } from 'lucide-react';

import { useAuction } from '../../context/AuctionContext';
import { useSocket } from '../../context/SocketContext';
import { adminAPI } from '../../services/api';

export default function AdminManagerRequests() {
  
  const { triggerToast, refetchTeams } = useAuction();
  const { socket } = useSocket();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [filter, setFilter] = useState('PENDING'); // 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

  // ── Fetch all users who have ever made a manager request ───────────────────
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getManagers();
      const allUsers = Array.isArray(res?.data) ? res.data : [];
      // Only show users who have a managerRequestStatus that is not 'NONE' or undefined
      const requesters = allUsers.filter(u =>
        u.managerRequestStatus && u.managerRequestStatus !== 'NONE'
      );
      setRequests(requesters);
    } catch (err) {
      console.error('[AdminManagerRequests] Failed to fetch requests:', err);
      triggerToast('Failed to load manager requests.', 'error');
    } finally {
      setLoading(false);
    }
  }, [triggerToast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // ── Real-time update when a request is processed ───────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handleTeamUpdate = () => {
      // Refetch when teams change (auto-assignment happened)
      fetchRequests();
      if (typeof refetchTeams === 'function') refetchTeams();
    };
    socket.on('teams:updated', handleTeamUpdate);
    return () => socket.off('teams:updated', handleTeamUpdate);
  }, [socket, fetchRequests, refetchTeams]);

  // ── Approve or Reject handler ──────────────────────────────────────────────
  const handleAction = async (userId, action) => {
    setProcessingId(userId);
    try {
      const res = await adminAPI.updateManagerRequest(userId, action); // PUT /admin/managers/:id/request

      if (res?.success) {
        // Update local state immediately
        setRequests(prev => prev.map(r =>
          (r._id || r.id) === userId
            ? { ...r, role: action === 'APPROVE' ? 'TEAM_MANAGER' : r.role, managerRequestStatus: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' }
            : r
        ));

        if (action === 'APPROVE') {
          const teamInfo = res.teamAssigned
            ? `Assigned to: ${res.teamAssigned.name}`
            : res.noTeamAvailable
              ? '⚠️ No unassigned teams available. Please create a team and assign manually.'
              : '';
          triggerToast(`✅ Approved! ${teamInfo}`, res.noTeamAvailable ? 'warning' : 'success');

          // Refresh teams in context (team was auto-assigned)
          if (typeof refetchTeams === 'function') {
            setTimeout(refetchTeams, 500);
          }
        } else {
          triggerToast('Request rejected. User role remains PLAYER.', 'warning');
        }
      }
    } catch (err) {
      const msg = err?.response?.data?.message || `Failed to ${action === 'APPROVE' ? 'approve' : 'reject'} request.`;
      triggerToast(msg, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // ── Filter requests ────────────────────────────────────────────────────────
  const filtered = filter === 'ALL' ? requests : requests.filter(r => r.managerRequestStatus === filter);
  const pendingCount = requests.filter(r => r.managerRequestStatus === 'PENDING').length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Access Control</span>
            <h1 className="text-2xl font-black font-heading text-white flex items-center gap-2 mt-1">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
              Team Manager Role Requests
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Review and approve player requests to upgrade their account to Team Manager.
              Upon approval, the player is automatically assigned to the next available unassigned team.
            </p>
          </div>
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl border border-slate-800 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'Pending Review', count: requests.filter(r => r.managerRequestStatus === 'PENDING').length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
            { label: 'Approved', count: requests.filter(r => r.managerRequestStatus === 'APPROVED').length, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Rejected', count: requests.filter(r => r.managerRequestStatus === 'REJECTED').length, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
          ].map(stat => (
            <div key={stat.label} className={`p-3 rounded-xl border ${stat.bg} text-center`}>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.count}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Alert Banner */}
      {pendingCount > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-300 text-xs font-semibold">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400 animate-pulse" />
          <span>
            <strong>{pendingCount}</strong> manager request{pendingCount > 1 ? 's' : ''} awaiting your review.
            Approving will automatically assign the next available unassigned team.
          </span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition ${
              filter === f
                ? 'bg-blue-600 text-white border-blue-500 shadow-lg'
                : 'text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {f === 'ALL' ? `All (${requests.length})` : f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No {filter !== 'ALL' ? filter.toLowerCase() : ''} requests found.</p>
            <p className="text-xs mt-1 text-slate-600">
              Players can request Team Manager access from their Settings page.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Player Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Current Role</th>
                  <th className="px-5 py-3">Request Status</th>
                  <th className="px-5 py-3">Requested</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((req) => {
                  const id = req._id || req.id;
                  const isProcessing = processingId === id;
                  const status = req.managerRequestStatus;

                  return (
                    <tr key={id} className="hover:bg-slate-800/30 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs uppercase flex-shrink-0">
                            {req.name?.[0] || '?'}
                          </div>
                          <span className="font-bold text-white">{req.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 font-mono">{req.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          req.role === 'TEAM_MANAGER'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {req.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border ${
                          status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                            : status === 'REJECTED'
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/20'
                        }`}>
                          {status === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
                          {status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                          {status === 'PENDING' && <Clock className="w-3 h-3 animate-pulse" />}
                          {status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-mono">
                        {req.updatedAt ? new Date(req.updatedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {status === 'PENDING' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              id={`approve-manager-${id}`}
                              onClick={() => handleAction(id, 'APPROVE')}
                              disabled={isProcessing}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-lg text-[11px] transition shadow-md"
                            >
                              {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              Approve
                            </button>
                            <button
                              id={`reject-manager-${id}`}
                              onClick={() => handleAction(id, 'REJECT')}
                              disabled={isProcessing}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950 hover:bg-rose-900 disabled:opacity-60 text-rose-300 border border-rose-800 font-bold rounded-lg text-[11px] transition"
                            >
                              {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                              Reject
                            </button>
                          </div>
                        )}
                        {status === 'APPROVED' && (
                          <span className="text-emerald-400 font-semibold text-[11px] flex items-center justify-end gap-1">
                            <UserCheck className="w-3.5 h-3.5" /> Promoted to Manager
                          </span>
                        )}
                        {status === 'REJECTED' && (
                          <span className="text-slate-500 font-semibold text-[11px]">Declined</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
