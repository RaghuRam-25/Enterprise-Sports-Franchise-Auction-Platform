import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Award, Settings, Trophy, CheckCircle2, Edit3, X, Save, Loader2, Camera } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAuction } from '../../context/AuctionContext';
import { playerAPI } from '../../services/api';
import api from '../../services/api';
import Navbar from '../../components/Navbar';

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=7c3aed&color=fff&size=256&bold=true&name=';

export default function PlayerDashboard() {
  const { user } = useAuth();
  const { formatCurrency, triggerToast, isRegistrationFrozen } = useAuction();

  const [myPlayer, setMyPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ jerseyName: '', tShirtSize: 'M', tShirtNumber: '' });

  // Load logged-in player's own profile by userId match
  useEffect(() => {
    const loadMyProfile = async () => {
      try {
        setLoading(true);
        // axios interceptor returns response.data already: { success, data: [...] }
        const res = await api.get('/players');
        const allPlayers = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        const mine = allPlayers.find(p =>
          p.userId === user?._id || p.userId === user?.id || p.email === user?.email
        );
        setMyPlayer(mine || null);
      } catch (err) {
        console.error('Failed to load player profile:', err);
      } finally {
        setLoading(false);
      }
    };
    if (user) loadMyProfile();
  }, [user]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);

  const openEdit = () => {
    setEditForm({
      jerseyName: myPlayer?.jerseyName || '',
      tShirtSize: myPlayer?.tShirtSize || 'M',
      tShirtNumber: myPlayer?.tShirtNumber || ''
    });
    setSelectedFile(null);
    setFilePreview(null);
    setRemoveImage(false);
    setEditing(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        triggerToast('Image file size must be less than 5MB', 'error');
        return;
      }
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
      setRemoveImage(false);
    }
  };

  const handleRemovePicture = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setRemoveImage(true);
  };

  const handleSaveProfile = async () => {
    if (!myPlayer) return;
    setSaving(true);
    try {
      const formData = new FormData();
      if (editForm.jerseyName) formData.append('jerseyName', editForm.jerseyName);
      if (editForm.tShirtSize) formData.append('tShirtSize', editForm.tShirtSize);
      formData.append('tShirtNumber', editForm.tShirtNumber || '');

      if (selectedFile) {
        formData.append('picture', selectedFile);
      } else if (removeImage) {
        formData.append('imageUrl', '');
      }

      const res = await playerAPI.updateProfile(myPlayer._id || myPlayer.id, formData);
      const updatedData = res?.data || res;
      if (updatedData) {
        setMyPlayer(prev => ({
          ...prev,
          ...editForm,
          imageUrl: removeImage ? '' : (updatedData.data?.imageUrl ?? updatedData.imageUrl ?? prev.imageUrl)
        }));
        triggerToast('Profile updated successfully!', 'success');
      }
      setEditing(false);
    } catch (err) {
      console.error('Profile update failed:', err);
      triggerToast(err?.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      </div>
    );
  }

  if (!myPlayer) {
    return (
      <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
        <Navbar />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
          <div className="glass-card rounded-2xl p-10 border border-slate-800 text-center text-slate-400 space-y-2">
            <User className="w-12 h-12 mx-auto text-slate-600" />
            <p className="font-bold">No player profile found for your account.</p>
            <p className="text-xs">Please register as a player first.</p>
            <Link to="/player/register" className="inline-block mt-2 px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl">
              Register Now
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-6">

        {/* Profile Header Card */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* GAP 1 & 10 FIX: imageUrl not picture */}
            <img
              src={myPlayer.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80'}
              alt={myPlayer.name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-purple-500/40 shadow-xl"
            />
            <div>
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Self-Serve Player Portal</span>
              <h1 className="text-2xl font-black font-heading text-white">{myPlayer.name}</h1>
              <p className="text-xs text-slate-300">
                {myPlayer.jerseyName} &bull; <span className="font-mono text-slate-400">{myPlayer.studentId}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isRegistrationFrozen ? (
              <span className="px-3 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold rounded-xl flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Read-Only (Registration Frozen)
              </span>
            ) : (
              <button
                onClick={openEdit}
                className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Profile
              </button>
            )}

            <Link
              to="/player/settings"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <Settings className="w-4 h-4" /> Settings
            </Link>

            <Link
              to="/player/results"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow"
            >
              <Trophy className="w-4 h-4" /> Auction Results
            </Link>
          </div>
        </div>

        {/* Status Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Category</span>
            <p className="text-xl font-black font-heading text-amber-400">{myPlayer.category}</p>
            <p className="text-[11px] text-slate-400">
              Base Price: <strong className="font-mono text-emerald-400">{formatCurrency(myPlayer.basePrice)}</strong>
            </p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Academic Session</span>
            <p className="text-base font-extrabold text-white">{myPlayer.session}</p>
            <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified Participant
            </p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Live Auction Status</span>
            <p className="text-xl font-black font-heading capitalize text-blue-400">{myPlayer.status}</p>
            <p className="text-[11px] text-slate-400">
              {myPlayer.status === 'SOLD' ? 'Successfully sold at auction' : 'Waiting for live podium call'}
            </p>
          </div>
        </div>

        {/* Positions & Jersey */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Positions & Jersey</h3>
          <div className="flex flex-wrap gap-2">
            {(myPlayer.positions || []).map(pos => (
              <span
                key={pos}
                className={`px-3 py-1 rounded-lg text-xs font-bold border ${pos === myPlayer.primaryPosition
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'}`}
              >
                {pos} {pos === myPlayer.primaryPosition && '(Primary)'}
              </span>
            ))}
            <span className="px-3 py-1 rounded-lg text-xs font-bold border bg-slate-900 text-slate-300 border-slate-700">
              Jersey: {myPlayer.jerseyName}
            </span>
            <span className="px-3 py-1 rounded-lg text-xs font-bold border bg-slate-900 text-slate-300 border-slate-700">
              T-Shirt Size: {myPlayer.tShirtSize}
            </span>
            <span className="px-3 py-1 rounded-lg text-xs font-bold border bg-slate-900 text-slate-300 border-slate-700">
              T-Shirt No: {myPlayer.tShirtNumber || '—'}
            </span>
          </div>
        </div>

        {/* Become a Team Manager Access Request Section */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Franchise Management</h3>
              <p className="text-xs text-slate-400">Request permission to become a Team Manager and manage a franchise team.</p>
            </div>
            {user?.managerRequestStatus === 'PENDING' && (
              <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold animate-pulse">
                Request Pending Review
              </span>
            )}
            {user?.managerRequestStatus === 'APPROVED' && (
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold">
                Approved — Team Manager
              </span>
            )}
            {user?.managerRequestStatus === 'REJECTED' && (
              <span className="px-3 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold">
                Request Declined
              </span>
            )}
          </div>

          {(!user?.managerRequestStatus || user?.managerRequestStatus === 'NONE' || user?.managerRequestStatus === 'REJECTED') && (
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  try {
                    const res = await api.post('/players/request-manager', { note: 'Interested in leading a team roster.' });
                    if (res?.data?.success || res?.success) {
                      alert('Team Manager request submitted to Super Admin for approval!');
                      window.location.reload();
                    }
                  } catch (err) {
                    alert(err?.response?.data?.message || 'Failed to submit request');
                  }
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg"
              >
                Request Team Manager Role
              </button>
            </div>
          )}
        </div>

      </main>

      {/* Edit Profile Modal — GAP 6 FIX */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm rounded-2xl p-6 border border-slate-700 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black text-white">Edit Profile</h2>
              <button onClick={() => setEditing(false)} className="p-2 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Profile Picture</label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={removeImage ? `${DEFAULT_AVATAR}${encodeURIComponent(myPlayer.name)}` : (filePreview || myPlayer.imageUrl || `${DEFAULT_AVATAR}${encodeURIComponent(myPlayer.name)}`)}
                      alt="Avatar Preview"
                      className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs inline-flex items-center gap-1.5 border border-slate-700">
                      <Camera className="w-3.5 h-3.5 text-purple-400" />
                      <span>{myPlayer.imageUrl || filePreview ? 'Change Photo' : 'Upload Photo'}</span>
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                    {(myPlayer.imageUrl || filePreview) && !removeImage && (
                      <button
                        type="button"
                        onClick={handleRemovePicture}
                        className="block text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Jersey Name (max 15 chars)</label>
                <input
                  type="text"
                  maxLength={15}
                  value={editForm.jerseyName}
                  onChange={e => setEditForm(prev => ({ ...prev, jerseyName: e.target.value.toUpperCase() }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-white font-mono uppercase"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">T-Shirt Size</label>
                <select
                  value={editForm.tShirtSize}
                  onChange={e => setEditForm(prev => ({ ...prev, tShirtSize: e.target.value }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-white bg-slate-900"
                >
                  {['S', 'M', 'L', 'XL', 'XXL'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">T-Shirt Number</label>
                <input
                  type="text"
                  pattern="[0-9]*"
                  value={editForm.tShirtNumber}
                  onChange={e => setEditForm(prev => ({ ...prev, tShirtNumber: e.target.value.replace(/\D/g, '') }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-white font-mono"
                  placeholder="e.g. 7 or 10"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
