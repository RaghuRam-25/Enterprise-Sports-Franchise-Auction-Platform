import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  User, Settings, Trophy, CheckCircle2, Edit3, X, Save, Loader2,
  Camera, Shield, Hash, Shirt, List, Star, Mail, GraduationCap, BadgeCheck,
  Lock, Upload, Trash2, Phone, MapPin, Calendar, Award, Zap
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAuction } from "../../context/AuctionContext";
import { playerAPI } from "../../services/api";
import api from "../../services/api";

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?background=7c3aed&color=fff&size=256&bold=true&name=";
const POSITIONS = ["Goalkeeper", "Center Back", "Left Back", "Right Back", "Defensive Midfielder", "Central Midfielder", "Attacking Midfielder", "Left Winger", "Right Winger", "Striker", "Second Striker"];
const TSHIRT_SIZES = ["S", "M", "L", "XL", "XXL"];

// Approximate pitch coordinates (percent-based, left-to-right full pitch) per
// position — used only to place a dot on the pitch diagram, not fabricated
// player stats.
const POSITION_PITCH_MAP = {
  "Goalkeeper": { x: 8, y: 50 },
  "Center Back": { x: 22, y: 50 },
  "Left Back": { x: 25, y: 15 },
  "Right Back": { x: 25, y: 85 },
  "Defensive Midfielder": { x: 42, y: 50 },
  "Central Midfielder": { x: 55, y: 50 },
  "Attacking Midfielder": { x: 68, y: 50 },
  "Left Winger": { x: 75, y: 15 },
  "Right Winger": { x: 75, y: 85 },
  "Striker": { x: 90, y: 50 },
  "Second Striker": { x: 82, y: 50 },
};

const CATEGORY_TONE = {
  "Icon Category": { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  "A Grade": { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  "B Grade": { text: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/30" },
  "Emerging Youth": { text: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
};
const getCategoryTone = (cat) => CATEGORY_TONE[cat] || { text: "text-slate-400", bg: "bg-slate-800/60", border: "border-slate-700" };

export default function PlayerDashboard() {
  const { user, setUser } = useAuth();
  const { formatCurrency, triggerToast, isRegistrationFrozen } = useAuction();
  const [myPlayer, setMyPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", jerseyName: "", tShirtSize: "M", tShirtNumber: "", positions: [], primaryPosition: "", session: "", bio: "", address: "" });
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const res = await playerAPI.getMyProfile();
        const profileData = res?.data?.data || res?.data || null;
        if (profileData && (profileData._id || profileData.id)) {
          setMyPlayer(profileData);
          return;
        }
        throw new Error("No direct profile shape returned");
      } catch (err) {
        console.warn("Direct /me profile lookup fallback:", err);
        try {
          const res2 = await api.get('/players');
          const all = Array.isArray(res2?.data) ? res2.data : Array.isArray(res2) ? res2 : [];
          const mine = all.find(p =>
            p.userId === user?._id || p.userId === user?.id || p.email === user?.email || p.name === user?.name
          );
          setMyPlayer(mine || null);
        } catch {
          setMyPlayer(null);
        }
      } finally {
        setLoading(false);
      }
    };
    if (user) loadProfile();
  }, [user]);

  const openEdit = () => {
    setEditForm({
      name: myPlayer?.name || "",
      phone: myPlayer?.phone || "",
      jerseyName: myPlayer?.jerseyName || "",
      tShirtSize: myPlayer?.tShirtSize || "M",
      tShirtNumber: myPlayer?.tShirtNumber || "",
      positions: myPlayer?.positions || [],
      primaryPosition: myPlayer?.primaryPosition || "",
      session: myPlayer?.session || "",
      bio: myPlayer?.bio || "",
      address: myPlayer?.address || ""
    });
    setSelectedFile(null); setFilePreview(null); setRemoveImage(false); setActiveTab("personal"); setEditing(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { triggerToast("Max 5MB allowed", "error"); return; }
    setSelectedFile(file); setFilePreview(URL.createObjectURL(file)); setRemoveImage(false);
  };

  const togglePosition = (pos) => {
    if (isRegistrationFrozen) return;
    setEditForm(prev => {
      const has = prev.positions.includes(pos);
      const newPos = has ? prev.positions.filter(p => p !== pos) : [...prev.positions, pos];
      const newPrimary = has && prev.primaryPosition === pos ? "" : prev.primaryPosition;
      return { ...prev, positions: newPos, primaryPosition: newPrimary };
    });
  };

  const handleSave = async () => {
    if (!myPlayer) return;
    if (editForm.positions.length === 0) { triggerToast("Select at least one position", "error"); return; }
    if (!editForm.primaryPosition) { triggerToast("Select a primary position", "error"); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      if (editForm.name) fd.append("name", editForm.name);
      if (editForm.phone !== undefined) fd.append("phone", editForm.phone);
      if (editForm.jerseyName) fd.append("jerseyName", editForm.jerseyName);
      if (editForm.tShirtSize) fd.append("tShirtSize", editForm.tShirtSize);
      fd.append("tShirtNumber", editForm.tShirtNumber || "");
      if (editForm.bio !== undefined) fd.append("bio", editForm.bio);
      if (editForm.address !== undefined) fd.append("address", editForm.address);

      if (!isRegistrationFrozen) {
        if (editForm.session) fd.append("session", editForm.session);
        editForm.positions.forEach(p => fd.append("positions[]", p));
        if (editForm.primaryPosition) fd.append("primaryPosition", editForm.primaryPosition);
      }

      if (selectedFile) fd.append("picture", selectedFile);
      else if (removeImage) fd.append("imageUrl", "");

      const res = await playerAPI.updateProfile(myPlayer._id || myPlayer.id, fd);
      const updated = res?.data?.data || res?.data || res;
      if (updated) {
        setMyPlayer(prev => ({
          ...prev,
          ...editForm,
          imageUrl: removeImage ? "" : (updated.imageUrl ?? prev.imageUrl)
        }));

        // Real-time AuthContext user sync (Navbar & Sidebar avatars update immediately)
        if (setUser) {
          setUser(prev => {
            if (!prev) return prev;
            const updatedUser = { ...prev, name: editForm.name || prev.name };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            return updatedUser;
          });
        }

        triggerToast("Profile updated successfully!", "success");
      }
      setEditing(false);
    } catch (err) {
      triggerToast(err?.response?.data?.message || "Failed to update profile", "error");
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>;

  if (!myPlayer) return (
    <div className="max-w-5xl w-full mx-auto px-4 py-8">
      <div className="glass-card rounded-2xl p-10 border border-slate-800 text-center text-slate-400 space-y-2">
        <User className="w-12 h-12 mx-auto text-slate-600" />
        <p className="font-bold">No player profile found.</p>
        <Link to="/player/register" className="inline-block mt-2 px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl">Register Now</Link>
      </div>
    </div>
  );

  const currentAvatar = removeImage ? `${DEFAULT_AVATAR}${encodeURIComponent(myPlayer.name)}` : (filePreview || myPlayer.imageUrl || `${DEFAULT_AVATAR}${encodeURIComponent(myPlayer.name)}`);
  const catTone = getCategoryTone(myPlayer.category);
  const pitchDot = POSITION_PITCH_MAP[myPlayer.primaryPosition] || null;
  const isSold = myPlayer.status === "SOLD";

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── Player ID Card (dark hero, matches app theme) ─────────────── */}
      <div className="relative overflow-hidden rounded-3xl shadow-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-900">
        {/* Ambient glow + faint dot texture */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />
        <div className="absolute -top-24 -right-16 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative px-6 sm:px-10 pt-8 sm:pt-10 pb-0 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          {/* Left: Name / Position / Session */}
          <div className="text-center sm:text-left order-2 sm:order-1">
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Player Portal</span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-none uppercase mt-1">
              {myPlayer.name}
            </h1>
            <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">
              {myPlayer.primaryPosition || "Position Not Set"}
            </p>
            {myPlayer.session && (
              <div className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-slate-500">
                <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                Session {myPlayer.session}
              </div>
            )}
          </div>

          {/* Right: Category badge */}
          <div className="flex flex-col items-center sm:items-end gap-2 order-1 sm:order-2">
            <div className={`w-16 h-16 rounded-2xl ${catTone.bg} border ${catTone.border} flex flex-col items-center justify-center shadow-lg`}>
              <Award className={`w-6 h-6 ${catTone.text}`} />
            </div>
            <p className={`text-[11px] font-black uppercase tracking-wider ${catTone.text}`}>{myPlayer.category || 'Unranked'}</p>
            <p className="text-[10px] text-slate-500 font-semibold">
              {isSold ? "Auction Status: Sold" : "Auction Status: Registered"}
            </p>
          </div>
        </div>

        {/* Center: Player Photo + ghost jersey number */}
        <div className="relative flex items-end justify-center px-6 -mt-4 sm:-mt-10">
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[9rem] sm:text-[11rem] font-black text-white/[0.04] leading-none select-none pointer-events-none">
            {myPlayer.tShirtNumber || "00"}
          </span>
          <img
            src={myPlayer.imageUrl || `${DEFAULT_AVATAR}${encodeURIComponent(myPlayer.name)}`}
            alt={myPlayer.name}
            className="relative w-44 h-44 sm:w-56 sm:h-56 rounded-3xl object-cover border-4 border-slate-800 shadow-2xl z-10"
          />
        </div>

        {/* Action buttons row */}
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 px-6 pb-6 pt-4">
          {isRegistrationFrozen ? (
            <span className="px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold rounded-xl flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Read-Only
            </span>
          ) : (
            <button onClick={openEdit} className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5" /> Edit Profile
            </button>
          )}
          <Link to="/player/settings" className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5">
            <Settings className="w-4 h-4" /> Settings
          </Link>
          <Link to="/player/results" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow">
            <Trophy className="w-4 h-4" /> Auction Results
          </Link>
        </div>
      </div>

      {/* ── Personal Information Strip ─────────────────────────────────── */}
      <div className="glass-card rounded-2xl border border-slate-800 p-5">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Personal Information</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Hash className="w-3 h-3" /> Student ID</span>
            <span className="text-sm font-black text-white font-mono">{myPlayer.studentId || '—'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Shirt className="w-3 h-3" /> Kit Size</span>
            <span className="text-sm font-black text-white">{myPlayer.tShirtSize || '—'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Hash className="w-3 h-3" /> Jersey No.</span>
            <span className="text-sm font-black text-white font-mono">#{myPlayer.tShirtNumber || '--'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</span>
            <span className="text-sm font-black text-white">{myPlayer.phone || '—'}</span>
          </div>
        </div>
      </div>

      {/* ── Player Overview + Position Pitch Diagram ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 glass-card rounded-2xl border border-slate-800 p-6 space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Player Overview</h3>
          {[
            { label: "Primary Position", value: myPlayer.primaryPosition || '—' },
            { label: "Jersey Name", value: myPlayer.jerseyName || '—' },
            { label: "Category", value: myPlayer.category || 'Unranked' },
            { label: "Base Price", value: formatCurrency(myPlayer.basePrice) },
            { label: "Email", value: myPlayer.email || '—' },
            { label: "Auction Status", value: (myPlayer.status || 'Registered') },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/60 last:border-0">
              <span className="text-slate-500 font-semibold">{label}</span>
              <span className="text-white font-bold text-right truncate max-w-[60%]">{value}</span>
            </div>
          ))}
        </div>

        {/* Pitch diagram derived from primaryPosition */}
        <div className="lg:col-span-2 glass-card rounded-2xl border border-slate-800 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Position on Pitch</h3>
            {myPlayer.primaryPosition && (
              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {myPlayer.primaryPosition}
              </span>
            )}
          </div>
          <div className="relative flex-1 min-h-[200px] rounded-xl overflow-hidden border border-emerald-900/40 bg-gradient-to-b from-emerald-800 to-emerald-900">
            {/* Pitch lines */}
            <div className="absolute inset-3 border border-white/25 rounded-sm" />
            <div className="absolute top-1/2 left-3 right-3 h-px bg-white/25" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-white/25" />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-16 border border-white/25 border-l-0" />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-16 border border-white/25 border-r-0" />
            {/* Faint direction arrow so left = own goal, right = attack */}
            <span className="absolute bottom-1.5 right-2.5 text-[9px] font-bold text-white/30 uppercase tracking-wider">Attack →</span>

            {pitchDot ? (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={{ left: `${pitchDot.x}%`, top: `${pitchDot.y}%` }}
              >
                <span className="absolute w-8 h-8 rounded-full bg-amber-400/30 animate-ping" />
                <span className="relative w-4 h-4 rounded-full bg-amber-400 border-2 border-white shadow-lg" />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] text-white/40 font-semibold">No primary position set</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Positions ──────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-purple-400" /> Positions</h3>
        <div className="flex flex-wrap gap-2">
          {(myPlayer.positions || []).map(pos => (
            <span key={pos} className={`px-3 py-1 rounded-lg text-xs font-bold border ${pos === myPlayer.primaryPosition ? "bg-purple-500/20 text-purple-300 border-purple-500/40" : "bg-slate-800 text-slate-400 border-slate-700"}`}>
              {pos === myPlayer.primaryPosition && <Star className="w-3 h-3 inline mr-1 text-yellow-400" />}{pos}{pos === myPlayer.primaryPosition && " (Primary)"}
            </span>
          ))}
          {(!myPlayer.positions || myPlayer.positions.length === 0) && (
            <p className="text-xs text-slate-600 italic">No positions selected yet.</p>
          )}
        </div>
      </div>

      {/* ── Franchise Management ──────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div><h3 className="text-sm font-bold text-white uppercase tracking-wider">Franchise Management</h3><p className="text-xs text-slate-400">Request permission to become a Team Manager.</p></div>
          {user?.managerRequestStatus === "PENDING" && <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold animate-pulse">Pending</span>}
          {user?.managerRequestStatus === "APPROVED" && <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold">Approved</span>}
          {user?.managerRequestStatus === "REJECTED" && <span className="px-3 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold">Declined</span>}
        </div>
        {(!user?.managerRequestStatus || user?.managerRequestStatus === "NONE" || user?.managerRequestStatus === "REJECTED") && (
          <button onClick={async () => {
            try {
              const r = await api.post("/players/request-manager", { note: "Interested." });
              if (r?.data?.success || r?.success || r?.data) {
                triggerToast("Team Manager request submitted! Awaiting Super Admin review.", "success");
                if (setUser) {
                  setUser(prev => {
                    if (!prev) return prev;
                    const next = { ...prev, managerRequestStatus: "PENDING" };
                    localStorage.setItem("user", JSON.stringify(next));
                    return next;
                  });
                }
              }
            } catch (e) {
              triggerToast(e?.response?.data?.message || "Failed to submit request.", "error");
            }
          }} className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg">
            Request Team Manager Role
          </button>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="glass-card w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl my-6">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2"><Edit3 className="w-5 h-5 text-purple-400" /> Edit My Profile</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Update your player information</p>
              </div>
              <button onClick={() => setEditing(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex border-b border-slate-800 px-6 overflow-x-auto">
              {[{ id: "personal", label: "Personal", icon: User }, { id: "photo", label: "Photo", icon: Camera }, { id: "sports", label: "Positions", icon: Shield }, { id: "kit", label: "Kit & Jersey", icon: Shirt }].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${activeTab === tab.id ? "border-purple-500 text-purple-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
                  <tab.icon className="w-3.5 h-3.5" />{tab.label}
                </button>
              ))}
            </div>
            <div className="p-6 space-y-5">
              {activeTab === "personal" && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-blue-400" /> Full Name</label>
                      <input type="text" value={editForm.name} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} className="glass-input w-full px-3 py-2.5 rounded-xl text-white" placeholder="Your full name" />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-amber-400" /> Student ID <span className="text-slate-600 font-normal ml-1">(read-only)</span></label>
                      <input type="text" value={myPlayer.studentId || ""} readOnly disabled className="glass-input w-full px-3 py-2.5 rounded-xl text-slate-400 font-mono cursor-not-allowed opacity-70" placeholder="—" />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 text-emerald-400" /> Academic Session</label>
                    <input type="text" value={editForm.session} onChange={e => setEditForm(prev => ({ ...prev, session: e.target.value }))} className="glass-input w-full px-3 py-2.5 rounded-xl text-white" placeholder="e.g. 2020-2021" />
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                    <div><span className="text-slate-500 font-semibold">Email (read-only)</span><p className="text-blue-300 font-mono mt-0.5">{myPlayer.email}</p></div>
                  </div>
                </div>
              )}
              {activeTab === "photo" && (
                <div className="space-y-5 text-xs">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <img src={currentAvatar} alt="Preview" className="w-28 h-28 rounded-2xl object-cover border-2 border-purple-500/40 shadow-2xl" />
                      {filePreview && !removeImage && <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-emerald-600 text-white text-[9px] font-bold rounded-full">NEW</span>}
                    </div>
                    <p className="text-slate-500">Profile photo preview</p>
                  </div>
                  <div className="border-2 border-dashed border-slate-700 hover:border-purple-500/50 rounded-2xl p-8 text-center cursor-pointer transition group" onClick={() => fileInputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith("image/")) { if (f.size > 5 * 1024 * 1024) { triggerToast("Max 5MB", "error"); return; } setSelectedFile(f); setFilePreview(URL.createObjectURL(f)); setRemoveImage(false); } }}>
                    <Upload className="w-10 h-10 mx-auto text-slate-600 group-hover:text-purple-400 transition mb-2" />
                    <p className="font-semibold text-slate-400 group-hover:text-slate-200 transition">Click or drag and drop to upload</p>
                    <p className="text-slate-600 mt-1">PNG, JPG, WEBP up to 5MB</p>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </div>
                  {selectedFile && !removeImage && (
                    <div className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                      <span className="text-purple-300 font-semibold truncate max-w-[200px]">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                      <button onClick={() => { setSelectedFile(null); setFilePreview(null); }} className="text-rose-400 hover:text-rose-300"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                  {myPlayer.imageUrl && !removeImage && (
                    <button onClick={() => { setSelectedFile(null); setFilePreview(null); setRemoveImage(true); }} className="w-full py-2.5 border border-rose-800/50 text-rose-400 hover:bg-rose-950/30 rounded-xl font-bold transition flex items-center justify-center gap-2">
                      <Trash2 className="w-3.5 h-3.5" /> Remove Current Photo
                    </button>
                  )}
                  {removeImage && <div className="p-3 bg-rose-950/20 border border-rose-800/40 rounded-xl text-center text-rose-400 text-xs font-semibold">Photo will be removed on save. <button onClick={() => setRemoveImage(false)} className="underline ml-1 hover:text-rose-300">Undo</button></div>}
                </div>
              )}
              {activeTab === "sports" && (
                <div className="space-y-5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-400 mb-2 flex items-center gap-1.5"><List className="w-3.5 h-3.5 text-purple-400" /> Select Positions</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {POSITIONS.map(pos => (
                        <button key={pos} type="button" onClick={() => togglePosition(pos)} className={`py-2 px-3 rounded-xl border text-left font-semibold transition ${editForm.positions.includes(pos) ? "bg-purple-600/20 border-purple-500/50 text-purple-300" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200"}`}>
                          {editForm.positions.includes(pos) && <CheckCircle2 className="w-3 h-3 inline mr-1 text-purple-400" />}{pos}
                        </button>
                      ))}
                    </div>
                  </div>
                  {editForm.positions.length > 0 && (
                    <div>
                      <label className="block font-semibold text-slate-400 mb-2 flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-yellow-400" /> Choose Primary Position</label>
                      <div className="flex flex-wrap gap-2">
                        {editForm.positions.map(pos => (
                          <button key={pos} type="button" onClick={() => setEditForm(prev => ({ ...prev, primaryPosition: pos }))} className={`py-1.5 px-3 rounded-xl border font-bold transition ${editForm.primaryPosition === pos ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300" : "bg-slate-900 border-slate-700 text-slate-400 hover:border-yellow-500/30"}`}>
                            {editForm.primaryPosition === pos && <Star className="w-3 h-3 inline mr-1 text-yellow-400" />}{pos}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {editForm.positions.length === 0 && <p className="text-amber-400 text-xs font-semibold text-center p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">Select at least one position above.</p>}
                </div>
              )}
              {activeTab === "kit" && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-purple-400" /> Jersey Name <span className="text-slate-600 font-normal ml-1">(max 15 chars)</span></label>
                    <input type="text" maxLength={15} value={editForm.jerseyName} onChange={e => setEditForm(prev => ({ ...prev, jerseyName: e.target.value.toUpperCase() }))} className="glass-input w-full px-3 py-2.5 rounded-xl text-white font-mono uppercase tracking-wider" placeholder="E.G. RONALDO" />
                    <p className="text-slate-600 mt-1">{editForm.jerseyName.length}/15</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5"><Shirt className="w-3.5 h-3.5 text-blue-400" /> T-Shirt Size</label>
                      <div className="flex gap-1.5">
                        {TSHIRT_SIZES.map(s => (
                          <button key={s} type="button" onClick={() => setEditForm(prev => ({ ...prev, tShirtSize: s }))} className={`flex-1 py-2 rounded-xl border font-bold transition text-xs ${editForm.tShirtSize === s ? "bg-blue-600/20 border-blue-500/50 text-blue-300" : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300"}`}>{s}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-amber-400" /> T-Shirt Number</label>
                      <input type="text" value={editForm.tShirtNumber} onChange={e => setEditForm(prev => ({ ...prev, tShirtNumber: e.target.value.replace(/\D/g, "") }))} className="glass-input w-full px-3 py-2.5 rounded-xl text-white font-mono text-lg text-center" placeholder="7" maxLength={3} />
                    </div>
                  </div>
                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Kit Preview</span>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="w-14 h-14 rounded-xl bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center">
                        <span className="text-2xl font-black text-purple-300 font-mono">{editForm.tShirtNumber || "#"}</span>
                      </div>
                      <div>
                        <p className="font-black font-mono text-white text-base uppercase tracking-wider">{editForm.jerseyName || "JERSEY NAME"}</p>
                        <p className="text-slate-500 text-[11px]">Size: <strong className="text-slate-300">{editForm.tShirtSize}</strong></p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/40 rounded-b-2xl">
              <button onClick={() => setEditing(false)} className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs font-semibold transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-60 shadow-lg">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? "Saving..." : "Save All Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}