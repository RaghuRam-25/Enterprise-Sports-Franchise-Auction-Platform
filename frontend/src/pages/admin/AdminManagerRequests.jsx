import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, CheckCircle2, Clock, XCircle, Check, X, Loader2, RefreshCw,
  AlertTriangle, Users, UserCheck, Crown, MonitorPlay, Shield
} from 'lucide-react';

import { useAuction } from '../../context/AuctionContext';
import { useSocket } from '../../context/SocketContext';
import { adminAPI } from '../../services/api';

// ── Request type registry ────────────────────────────────────────────────────
// Adding a new upgradeable role = one entry here + a backend status field.
const REQUEST_TYPES = [
  {
    key: 'MANAGER',
    label: 'Team Manager',
    tabLabel: 'Team Manager Requests',
    icon: Crown,
    statusKey: 'managerRequestStatus',
    noteKey: 'managerRequestNote',
    approveApi: (id) => adminAPI.updateManagerRequest(id, 'APPROVE'),
    rejectApi: (id) => adminAPI.updateManagerRequest(id, 'REJECT'),
    approveText: 'Promoted to Team Manager',
    bannerText: 'Approving will promote the user to Team Manager and auto-assign an unassigned team.',
  },
  {
    key: 'PODIUM_ADMIN',
    label: 'Podium Admin',
    tabLabel: 'Podium Admin Requests',
    icon: MonitorPlay,
    statusKey: 'podiumAdminRequestStatus',
    noteKey: 'podiumAdminRequestNote',
    approveApi: (id) => adminAPI.updateAdminRoleRequest(id, 'PODIUM_ADMIN', 'APPROVE'),
    rejectApi: (id) => adminAPI.updateAdminRoleRequest(id, 'PODIUM_ADMIN', 'REJECT'),
    approveText: 'Promoted to Podium Admin',
    bannerText: 'Approving will promote the user to Podium Admin (broadcast & display control).',
  },
  {
    key: 'SUPER_ADMIN',
    label: 'Super Admin',
    tabLabel: 'Super Admin Requests',
    icon: Shield,
    statusKey: 'superAdminRequestStatus',
    noteKey: 'superAdminRequestNote',
    approveApi: (id) => adminAPI.updateAdminRoleRequest(id, 'SUPER_ADMIN', 'APPROVE'),
    rejectApi: (id) => adminAPI.updateAdminRoleRequest(id, 'SUPER_ADMIN', 'REJECT'),
    approveText: 'Promoted to Super Admin',
    bannerText: 'Approving grants FULL platform control. Review carefully.',
  },
  {
    key: 'PLAYER',
    label: 'Player',
    tabLabel: 'Player Requests',
    icon: Users,
    statusKey: 'playerRequestStatus',
    noteKey: 'playerRequestNote',
    approveApi: (id) => adminAPI.updatePlayerRequest(id, 'APPROVE'),
    rejectApi: (id) => adminAPI.updatePlayerRequest(id, 'REJECT'),
    approveText: 'Promoted to Player',
    bannerText: 'Approving will promote the user to Player role and create their player pool record.',
  },
];

export default function AdminManagerRequests() {
  const { triggerToast, refetchTeams } = useAuction();
  const { socket } = useSocket();

  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // Outer request type tab (see REQUEST_TYPES) | inner status filter
  const [typeTab, setTypeTab] = useState('MANAGER');
  const [filter, setFilter] = useState('PENDING');

  const activeType = REQUEST_TYPES.find(t => t.key === typeTab) || REQUEST_TYPES[0];

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
    // A player withdrew their PENDING request → drop it from the list live.
    socket.on('user:request_cancelled', handleUpdate);
    return () => {
      socket.off('teams:updated', handleUpdate);
      socket.off('user:role_updated', handleUpdate);
      socket.off('user:request_cancelled', handleUpdate);
    };
  }, [socket, fetchRequests, refetchTeams]);

  // ── Per-type request lists ────────────────────────────────────────────────
  const listsByType = Object.fromEntries(
    REQUEST_TYPES.map(t => [
      t.key,
      allUsers.filter(u => u[t.statusKey] && u[t.statusKey] !== 'NONE')
    ])
  );

  const currentList = listsByType[typeTab] || [];
  const pendingCountByType = Object.fromEntries(
    REQUEST_TYPES.map(t => [
      t.key,
      (listsByType[t.key] || []).filter(r => r[t.statusKey] === 'PENDING').length
    ])
  );
  const currentPendingCount = pendingCountByType[typeTab] || 0;

  // ── Approve or Reject handler ──────────────────────────────────────────────
  const handleAction = async (userId, action) => {
    setProcessingId(userId);
    try {
      let res;
      if (action === 'APPROVE') res = await activeType.approveApi(userId);
      else res = await activeType.rejectApi(userId);

      if (res?.success) {
        setAllUsers(prev => prev.map(r => {
          if ((r._id || r.id) === userId) {
            return {
              ...r,
              ...(action === 'APPROVE' && typeTab !== 'PLAYER' ? { role: typeTab } : {}),
              ...(action === 'APPROVE' && typeTab === 'PLAYER' ? { role: 'PLAYER' } : {}),
              [activeType.statusKey]: action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
            };
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
            triggerToast(`✅ ${activeType.label} request approved!`, 'success');
          }
        } else {
          triggerToast('Request rejected. Role unchanged.', 'warning');
        }
      }
    } catch (err) {
      const msg = err?.response?.data?.message || `Failed to ${action === 'APPROVE' ? 'approve' : 'reject'} request.`;
      triggerToast(msg, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = filter === 'ALL'
    ? currentList
    : currentList.filter(r => r[activeType.statusKey] === filter);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-cardBg/90 rounded-2xl p-6 border border-cardBorder">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-warningGold">Access Control</span>
            <h1 className="text-2xl font-black font-heading text-white flex items-center gap-2 mt-1">
              <ShieldAlert className="w-6 h-6 text-warningGold" />
              Member Role Requests
            </h1>
          </div>
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="btn-secondary p-2.5 rounded-xl disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Category Request Tabs */}
        <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-cardBorder/80">
          {REQUEST_TYPES.map(t => {
            const Icon = t.icon;
            const count = pendingCountByType[t.key] || 0;
            const isActive = typeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => { setTypeTab(t.key); setFilter('PENDING'); }}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                  isActive
                    ? 'bg-[#0B2B26] text-white shadow-lg shadow-[#0B2B26]/40 border border-[#0B2B26]'
                    : 'bg-[#151515] text-[#F5F5F5] border border-[#333333] hover:border-[#0B2B26] hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{t.tabLabel}</span>
                <span className="sm:hidden">{t.label}</span>
                {count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold ${
                    isActive ? 'bg-black/40 text-white border border-white/10' : 'bg-[#0B2B26]/20 text-white border border-[#0B2B26]/40'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Stats Row for active tab */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'Pending Review', count: currentList.filter(r => r[activeType.statusKey] === 'PENDING').length, color: 'text-warningGold', bg: 'bg-warningGold/10 border-warningGold/20' },
            { label: 'Approved', count: currentList.filter(r => r[activeType.statusKey] === 'APPROVED').length, color: 'text-white', bg: 'bg-neonGreen/10 border-neonGreen/20' },
            { label: 'Rejected', count: currentList.filter(r => r[activeType.statusKey] === 'REJECTED').length, color: 'text-urgentRedText', bg: 'bg-urgentRed/10 border-urgentRed/20' },
          ].map(stat => (
            <div key={stat.label} className={`p-3 rounded-xl border ${stat.bg} text-center`}>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.count}</p>
              <p className="text-[10px] text-secondaryText uppercase tracking-wider font-semibold mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Alert Banner */}
      {currentPendingCount > 0 && (
        <div className="p-4 bg-warningGold/10 border border-warningGold/30 rounded-2xl flex items-center gap-3 text-warningGold text-xs font-semibold">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-warningGold animate-pulse" />
          <span>
            <strong>{currentPendingCount}</strong> {activeType.label} request{currentPendingCount > 1 ? 's' : ''} awaiting your review.
            {' '}{activeType.bannerText}
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
                ? 'bg-[#0B2B26] text-white border-[#0B2B26] shadow-lg font-extrabold'
                : 'bg-[#151515] text-[#F5F5F5] border border-[#333333] hover:border-[#0B2B26] hover:text-white'
            }`}
          >
            {f === 'ALL' ? `All (${currentList.length})` : f}
          </button>
        ))}
      </div>

      {/* Requests Table */}
      <div className="bg-cardBg/90 rounded-2xl border border-cardBorder overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-mutedText">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No {filter !== 'ALL' ? filter.toLowerCase() : ''} {activeType.label} requests found.</p>
            <p className="text-xs mt-1 text-mutedText">
              Users can submit {activeType.label} role requests from their Profile page.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-darkBg text-secondaryText uppercase font-mono border-b border-cardBorder">
                <tr>
                  <th className="px-5 py-3">Applicant</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Current Role</th>
                  <th className="px-5 py-3">Note</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cardBorder/60">
                {filtered.map((req) => {
                  const id = req._id || req.id;
                  const isProcessing = processingId === id;
                  const status = req[activeType.statusKey];
                  const note = req[activeType.noteKey];

                  return (
                    <tr key={id} className="hover:bg-surfaceHover/30 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          {req.profilePhoto ? (
                            <img src={req.profilePhoto} alt="" className="w-7 h-7 rounded-full object-cover border border-borderStrong shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-neonGreen to-successGreen flex items-center justify-center text-white font-bold text-xs uppercase flex-shrink-0">
                              {req.name?.[0] || '?'}
                            </div>
                          )}
                          <span className="font-bold text-white">{req.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-secondaryText font-mono">{req.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          req.role === 'TEAM_MANAGER'
                            ? 'bg-neonGreen/20 text-white'
                            : req.role === 'PLAYER'
                            ? 'bg-warningGold/20 text-warningGold'
                            : 'bg-neonGreen/20 text-white'
                        }`}>
                          {req.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-secondaryText max-w-xs truncate" title={note}>
                        {note || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border ${
                          status === 'APPROVED'
                            ? 'bg-neonGreen/20 text-white border-neonGreen/20'
                            : status === 'REJECTED'
                            ? 'bg-urgentRed/20 text-urgentRedText border-urgentRed/20'
                            : 'bg-warningGold/20 text-warningGold border-warningGold/20'
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
                          <span className="text-white font-semibold text-[11px] flex items-center justify-end gap-1">
                            <UserCheck className="w-3.5 h-3.5" />
                            {activeType.approveText}
                          </span>
                        )}
                        {status === 'REJECTED' && (
                          <span className="text-mutedText font-semibold text-[11px]">Declined</span>
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
