import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, CheckCircle2, Clock, XCircle, Check, X, Loader2, RefreshCw, AlertTriangle, Users, UserCheck, Crown, Shield } from 'lucide-react';

import { useAuction } from '../../context/AuctionContext';
import { useSocket } from '../../context/SocketContext';
import { adminAPI } from '../../services/api';

export default function AdminManagerRequests() {
  const { triggerToast, refetchTeams } = useAuction();
  const { socket } = useSocket();

  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  
  // Outer request type tab: 'MANAGER' | 'PLAYER'
  const [typeTab, setTypeTab] = useState('MANAGER');
  // Inner status filter: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [filter, setFilter] = useState('PENDING');

  // ── Fetch all users ────────────────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getManagers();
      const raw = Array.isArray(res?.data) ? res.data : [];
      setAllUsers(raw);
    } catch (err) {
      console.error('[AdminManagerRequests] Failed to fetch requests:', err);
      triggerToast('Failed to load role requests.', 'error');
    } finally {
      setLoading(false);
    }
  }, [triggerToast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // ── Real-time socket update ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchRequests();
      if (typeof refetchTeams === 'function') refetchTeams();
    };
    socket.on('teams:updated', handleUpdate);
    socket.on('user:role_updated', handleUpdate);
    return () => {
      socket.off('teams:updated', handleUpdate);
      socket.off('user:role_updated', handleUpdate);
    };
  }, [socket, fetchRequests, refetchTeams]);

  // ── Filter manager & player requests ─────────────────────────────────────
  const managerRequests = allUsers.filter(u => u.managerRequestStatus && u.managerRequestStatus !== 'NONE');
  const playerRequests = allUsers.filter(u => u.playerRequestStatus && u.playerRequestStatus !== 'NONE');

  const currentList = typeTab === 'MANAGER' ? managerRequests : playerRequests;
  const statusKey = typeTab === 'MANAGER' ? 'managerRequestStatus' : 'playerRequestStatus';
  const noteKey = typeTab === 'MANAGER' ? 'managerRequestNote' : 'playerRequestNote';

  const filtered = filter === 'ALL' ? currentList : currentList.filter(r => r[statusKey] === filter);
  const pendingManagerCount = managerRequests.filter(r => r.managerRequestStatus === 'PENDING').length;
  const pendingPlayerCount = playerRequests.filter(r => r.playerRequestStatus === 'PENDING').length;
  const currentPendingCount = typeTab === 'MANAGER' ? pendingManagerCount : pendingPlayerCount;

  // ── Approve or Reject handler ──────────────────────────────────────────────
  const handleAction = async (userId, action) => {
    setProcessingId(userId);
    try {
      let res;
      if (typeTab === 'MANAGER') {
        res = await adminAPI.updateManagerRequest(userId, action);
      } else {
        res = await adminAPI.updatePlayerRequest(userId, action);
      }

      if (res?.success) {
        setAllUsers(prev => prev.map(r => {
          if ((r._id || r.id) === userId) {
            if (typeTab === 'MANAGER') {
              return {
                ...r,
                role: action === 'APPROVE' ? 'TEAM_MANAGER' : r.role,
                managerRequestStatus: action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
              };
            } else {
              return {
                ...r,
                role: action === 'APPROVE' ? 'PLAYER' : r.role,
                playerRequestStatus: action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
              };
            }
          }
          return r;
        }));

        if (action === 'APPROVE') {
          if (typeTab === 'MANAGER') {
            const teamInfo = res.teamAssigned
              ? `Assigned to: ${res.teamAssigned.name}`
              : res.noTeamAvailable
                ? '⚠️ No unassigned teams available. Create & assign manually.'
                : '';
            triggerToast(`✅ Team Manager Request Approved! ${teamInfo}`, res.noTeamAvailable ? 'warning' : 'success');
            if (typeof refetchTeams === 'function') setTimeout(refetchTeams, 500);
          } else {
            triggerToast('✅ Player Request Approved! User promoted to Player role.', 'success');
          }
        } else {
          triggerToast(`Request rejected. Role unchanged.`, 'warning');
        }
      }
    } catch (err) {
      const msg = err?.response?.data?.message || `Failed to ${action === 'APPROVE' ? 'approve' : 'reject'} request.`;
      triggerToast(msg, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Access Control</span>
            <h1 className="text-2xl font-black font-heading text-white flex items-center gap-2 mt-1">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
              Member Role Requests
            </h1>
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

        {/* Category Request Tabs (Manager Requests vs Player Requests) */}
        <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => { setTypeTab('MANAGER'); setFilter('PENDING'); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
              typeTab === 'MANAGER'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-950/40'
                : 'bg-slate-950/80 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Crown className="w-4 h-4" />
            Team Manager Requests
            {pendingManagerCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950 text-amber-400 font-mono font-extrabold border border-amber-500/40">
                {pendingManagerCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { setTypeTab('PLAYER'); setFilter('PENDING'); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
              typeTab === 'PLAYER'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-950/40'
                : 'bg-slate-950/80 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Player Requests
            {pendingPlayerCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-950 text-sky-300 font-mono font-extrabold border border-sky-500/40">
                {pendingPlayerCount}
              </span>
            )}
          </button>
        </div>

        {/* Stats Row for active tab */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'Pending Review', count: currentList.filter(r => r[statusKey] === 'PENDING').length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
            { label: 'Approved', count: currentList.filter(r => r[statusKey] === 'APPROVED').length, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Rejected', count: currentList.filter(r => r[statusKey] === 'REJECTED').length, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
          ].map(stat => (
            <div key={stat.label} className={`p-3 rounded-xl border ${stat.bg} text-center`}>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.count}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Alert Banner */}
      {currentPendingCount > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-300 text-xs font-semibold">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400 animate-pulse" />
          <span>
            <strong>{currentPendingCount}</strong> {typeTab === 'MANAGER' ? 'Team Manager' : 'Player'} request{currentPendingCount > 1 ? 's' : ''} awaiting your review.
            {typeTab === 'MANAGER'
              ? ' Approving will promote the user to Team Manager and auto-assign an unassigned team.'
              : ' Approving will promote the user to Player role and create their player pool record.'}
          </span>
        </div>
      )}

      {/* Status Filter Tabs */}
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
            {f === 'ALL' ? `All (${currentList.length})` : f}
          </button>
        ))}
      </div>

      {/* Requests Table */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No {filter !== 'ALL' ? filter.toLowerCase() : ''} {typeTab === 'MANAGER' ? 'manager' : 'player'} requests found.</p>
            <p className="text-xs mt-1 text-slate-600">
              Users can submit {typeTab === 'MANAGER' ? 'Team Manager' : 'Player'} role requests from their Profile/Settings page.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Applicant</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Current Role</th>
                  <th className="px-5 py-3">Note</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((req) => {
                  const id = req._id || req.id;
                  const isProcessing = processingId === id;
                  const status = req[statusKey];
                  const note = req[noteKey];

                  return (
                    <tr key={id} className="hover:bg-slate-800/30 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          {req.profilePhoto ? (
                            <img src={req.profilePhoto} alt="" className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs uppercase flex-shrink-0">
                              {req.name?.[0] || '?'}
                            </div>
                          )}
                          <span className="font-bold text-white">{req.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 font-mono">{req.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          req.role === 'TEAM_MANAGER'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : req.role === 'PLAYER'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-sky-500/20 text-sky-400'
                        }`}>
                          {req.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 max-w-xs truncate" title={note}>
                        {note || '—'}
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
                      <td className="px-5 py-3.5 text-right">
                        {status === 'PENDING' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              id={`approve-req-${id}`}
                              onClick={() => handleAction(id, 'APPROVE')}
                              disabled={isProcessing}
                              className="btn-primary"
                            >
                              {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              Approve
                            </button>
                            <button
                              id={`reject-req-${id}`}
                              onClick={() => handleAction(id, 'REJECT')}
                              disabled={isProcessing}
                              className="btn-danger"
                            >
                              {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                              Reject
                            </button>
                          </div>
                        )}
                        {status === 'APPROVED' && (
                          <span className="text-emerald-400 font-semibold text-[11px] flex items-center justify-end gap-1">
                            <UserCheck className="w-3.5 h-3.5" />
                            {typeTab === 'MANAGER' ? 'Promoted to Manager' : 'Promoted to Player'}
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

