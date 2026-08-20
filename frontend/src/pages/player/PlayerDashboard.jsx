import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, CheckCircle2, Edit3, X, Save, Loader2,
  Camera, Shield, Hash, Shirt, List, Star, Mail, GraduationCap, BadgeCheck,
  Lock, Upload, Trash2, Phone, MapPin, Award, Calendar, Ruler, Footprints, Globe, Activity
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAuction } from "../../context/AuctionContext";
import FullscreenWrapper from "../../components/auction/FullscreenWrapper";
import FootballField from "../../components/common/FootballField";
import { playerAPI } from "../../services/api";
import api from "../../services/api";
import { getImageUrl } from "../../utils/imageUrl";
import { playerFallback } from "../../utils/playerFallback";

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?background=7c3aed&color=fff&size=256&bold=true&name=";
const POSITIONS = ["Goalkeeper", "Center Back", "Left Back", "Right Back", "Defensive Midfielder", "Central Midfielder", "Attacking Midfielder", "Left Winger", "Right Winger", "Striker", "Second Striker"];
const TSHIRT_SIZES = ["S", "M", "L", "XL", "XXL"];
const FOOT_PREFERENCES = ["Left", "Right", "Both"];

// Fallback pitch coordinates keyed by position CODE (positions are stored as
// codes like 'ST'/'CB'). Live config positions (from /config/positions, which
// carry fieldX/fieldY) take priority; this map covers positions whose code is
// not in the current config, so the pitch always renders.
const POSITION_CODE_MAP = {
  "GK":   { name: "Goalkeeper",           x: 6,  y: 50 },
  "CB":   { name: "Center Back",          x: 22, y: 50 },
  "LB":   { name: "Left Back",            x: 28, y: 16 },
  "RB":   { name: "Right Back",           x: 28, y: 84 },
  "DM":   { name: "Defensive Midfielder", x: 40, y: 50 },
  "CDM":  { name: "Defensive Midfielder", x: 40, y: 50 },
  "CM":   { name: "Central Midfielder",   x: 52, y: 50 },
  "CAM":  { name: "Attacking Midfielder", x: 64, y: 50 },
  "LM":   { name: "Left Midfielder",      x: 55, y: 18 },
  "RM":   { name: "Right Midfielder",     x: 55, y: 82 },
  "LW":   { name: "Left Winger",          x: 78, y: 18 },
  "RW":   { name: "Right Winger",         x: 78, y: 82 },
  "SS":   { name: "Second Striker",       x: 80, y: 50 },
  "ST":   { name: "Striker",              x: 88, y: 50 },
  "CF":   { name: "Center Forward",       x: 86, y: 50 },
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
  const { formatCurrency, triggerToast, isRegistrationFrozen, positions } = useAuction();
  const [myPlayer, setMyPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", jerseyName: "", tShirtSize: "M", tShirtNumber: "", positions: [], primaryPosition: "", session: "", bio: "", address: "", age: "", height: "", preferredFoot: "", nationality: "" });
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const fileInputRef = useRef(null);
  const [activePos, setActivePos] = useState(null);

  // Code → { name, fieldX, fieldY } from the live /config/positions list.
  const positionInfo = useMemo(() => {
    const map = {};
    (Array.isArray(positions) ? positions : []).forEach(p => {
      const key = String(p.code || p.name || '').toUpperCase();
      if (key) {
        map[key] = {
          name: p.name || p.code,
          x: Number.isFinite(p.fieldX) ? p.fieldX : null,
          y: Number.isFinite(p.fieldY) ? p.fieldY : null,
        };
      }
    });
    return map;
  }, [positions]);

  // Resolve a stored position code (or name) to { code, name, x, y }. Uses the
  // live config's fieldX/fieldY, falling back to the canonical code map so the
  // marker always lands in the right place on the pitch.
  const resolvePosition = (code) => {
    const key = String(code || '').toUpperCase();
    const cfg = positionInfo[key];
    const fb = POSITION_CODE_MAP[key];
    const x = cfg?.x != null ? cfg.x : (fb ? fb.x : null);
    const y = cfg?.y != null ? cfg.y : (fb ? fb.y : null);
    if (x == null || y == null) return null;
    return { code, name: (cfg ? cfg.name : fb.name), x, y };
  };

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
      address: myPlayer?.address || "",
      age: myPlayer?.age ?? "",
      height: myPlayer?.height || "",
      preferredFoot: myPlayer?.preferredFoot || "",
      nationality: myPlayer?.nationality || ""
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

      if (editForm.age !== "") fd.append("age", editForm.age);
      if (editForm.height) fd.append("height", editForm.height);
      if (editForm.preferredFoot) fd.append("preferredFoot", editForm.preferredFoot);
      if (editForm.nationality) fd.append("nationality", editForm.nationality);

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
  const pitchMarks = (myPlayer.positions || []).map(resolvePosition).filter(Boolean);
  const primaryName = (resolvePosition(myPlayer.primaryPosition)?.name) || (myPlayer.primaryPosition || "");
  const isSold = myPlayer.status === "SOLD";

  // Consolidated info list — every field appears exactly once across the page.
  // ("Jersey No." lives on the profile card below; "Status" lives on the card too.)
  const infoFields = [
    { label: "Student ID", value: myPlayer.studentId, icon: Hash, mono: true },
    { label: "Session", value: myPlayer.session, icon: GraduationCap },
    { label: "Email", value: myPlayer.email, icon: Mail },
    { label: "Phone", value: myPlayer.phone, icon: Phone },
    { label: "Jersey Name", value: myPlayer.jerseyName, icon: BadgeCheck, mono: true },
    { label: "Kit Size", value: myPlayer.tShirtSize, icon: Shirt },
    { label: "Base Price", value: myPlayer.basePrice != null ? formatCurrency(myPlayer.basePrice) : null, icon: Award },
  ];

  // Premium profile card stats — each sourced live from the loaded player.
  const profileStats = [
    { label: "Age", value: myPlayer.age != null ? `${myPlayer.age}` : null, icon: Calendar },
    { label: "Height", value: myPlayer.height || null, icon: Ruler },
    { label: "Foot", value: myPlayer.preferredFoot || null, icon: Footprints },
    { label: "Jersey Number", value: myPlayer.tShirtNumber ? `#${myPlayer.tShirtNumber}` : null, icon: Hash },
    { label: "Nationality", value: myPlayer.nationality || null, icon: Globe },
    { label: "Status", value: isSold ? "Sold" : "Registered", icon: Activity },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── Premium Two-Panel Player Profile Card ─────────────────────── */}
      <div className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-900 shadow-2xl transition-shadow duration-300 hover:shadow-purple-950/40">
        {/* Ambient glow + faint dot texture */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />
        <div className="absolute -top-24 -right-16 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top bar: portal label + status/edit controls */}
        <div className="relative z-20 flex items-center justify-between px-5 pt-5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold tracking-wider uppercase text-purple-300 backdrop-blur-sm">
            Player Portal
          </span>

          {isRegistrationFrozen ? (
            <span className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center" title="Read-only — registration frozen">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            </span>
          ) : (
            <button
              onClick={openEdit}
              title="Edit Profile"
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Two-panel split */}
        <div className="relative z-10 grid grid-cols-1 gap-6 p-5 sm:p-7 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-center">
          {/* ── LEFT PANEL — Profile Photograph ─────────────────────────── */}
          <div className="relative flex items-center justify-center">
            {/* Ghost jersey number behind the photo */}
            <span
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[9rem] sm:text-[11rem] font-black text-white/[0.04] leading-none select-none"
              aria-hidden="true"
            >
              {myPlayer.tShirtNumber || "00"}
            </span>

            {/* Glow halo */}
            <div className="absolute h-52 w-52 sm:h-64 sm:w-64 rounded-full bg-purple-600/25 blur-3xl pointer-events-none transition-opacity duration-300 group-hover:opacity-100 opacity-70" />

            {/* Framed photograph */}
            <div className="relative rounded-[1.75rem] bg-white/5 p-[3px] shadow-[0_20px_60px_rgba(0,0,0,0.55)] ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-[1.02]">
              <div className="rounded-[1.6rem] bg-gradient-to-tr from-purple-600/40 via-indigo-500/20 to-emerald-400/30 p-[2px]">
                <img
                  src={getImageUrl(myPlayer.imageUrl, myPlayer.imageUrl ? playerFallback('emerald') : `${DEFAULT_AVATAR}${encodeURIComponent(myPlayer.name)}`)}
                  alt={myPlayer.name}
                  className="h-52 w-52 sm:h-64 sm:w-64 rounded-[1.55rem] object-cover"
                />
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL — Identity + Stats ─────────────────────────── */}
          <div className="flex flex-col justify-center gap-4 text-center md:text-left">
            {/* PLAYER label */}
            <span className="inline-flex items-center justify-center gap-2 md:justify-start">
              <span className="h-px w-5 bg-purple-500/60" />
              <span className="text-[10px] font-black uppercase tracking-[0.35em] text-purple-300">Player</span>
            </span>

            {/* Name — hero typography */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-none text-white [text-shadow:0_0_40px_rgba(139,92,246,0.35)]">
              {myPlayer.name}
            </h1>

            {/* Position */}
            <p className="text-xs sm:text-sm font-black uppercase tracking-[0.3em] text-cyan-300">
              {primaryName || "Position Not Set"}
            </p>

            {/* Category + Status badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider ${catTone.bg} ${catTone.text} ${catTone.border}`}>
                <Award className="h-3 w-3" />
                {myPlayer.category || 'Unranked'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-200 backdrop-blur-sm">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${isSold ? 'bg-emerald-400' : 'bg-cyan-400'} animate-pulse`} />
                {isSold ? "Sold" : "Registered"}
              </span>
            </div>

            {/* Structured stats grid */}
            <div className="mt-1 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {profileStats.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/10 bg-slate-950/50 p-3 backdrop-blur-sm transition-colors duration-200 hover:border-purple-500/40 hover:bg-slate-900/60"
                >
                  <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                    <Icon className="h-3 w-3 text-purple-400" /> {label}
                  </span>
                  <span className="mt-1 block truncate text-sm font-black text-white">
                    {value || <span className="font-semibold text-slate-600">—</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Consolidated Player Info (each fact shown exactly once) ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 glass-card rounded-2xl border border-slate-800 p-6">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Player Information</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {infoFields.map(({ label, value, icon: Icon, mono }) => (
              <div key={label} className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Icon className="w-3 h-3" /> {label}
                </span>
                <span className={`text-sm font-black text-white truncate ${mono ? 'font-mono' : ''}`}>
                  {value || <span className="text-slate-600 font-normal">—</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pitch diagram derived from primaryPosition */}
        <div className="lg:col-span-2 glass-card rounded-2xl border border-slate-800 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Position on Pitch</h3>
            <div className="flex items-center gap-2">
              {myPlayer.primaryPosition && (
                <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {primaryName}
                </span>
              )}
              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-300">
                Live
              </span>
            </div>
          </div>

          {/* Full regulation pitch — clean green turf, white line markings,
              recreated in pure SVG (no image background, no text/watermark). */}
          <FullscreenWrapper className="relative h-[220px] sm:h-[260px] w-full rounded-xl overflow-hidden border border-emerald-900/60">
            <FootballField className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" />

            {/* Player markers — positioned from backend fieldX/fieldY (percentages),
                drawn with the player's uploaded profile picture. */}
            {pitchMarks.length > 0 ? (
              pitchMarks.map(mark => {
                const isPrimary = String(mark.code).toUpperCase() === String(myPlayer.primaryPosition).toUpperCase();
                return (
                  <button
                    key={mark.code}
                    type="button"
                    onClick={() => setActivePos(mark.code)}
                    className="absolute z-10 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group/pos"
                    style={{ left: `${mark.x}%`, top: `${mark.y}%` }}
                    aria-label={`${mark.name} (${mark.code})`}
                  >
                    {isPrimary ? (
                      <>
                        {/* Expanding heartbeat ripple rings */}
                        {[0, 1, 2].map(i => (
                          <motion.span
                            key={i}
                            className="pointer-events-none absolute top-1/2 left-1/2 h-3 w-3 rounded-full border border-amber-400/60"
                            style={{ margin: '-6px 0 0 -6px' }}
                            initial={{ scale: 0.6, opacity: 0.9 }}
                            animate={{ scale: [0.6, 2.6], opacity: [0.9, 0] }}
                            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
                          />
                        ))}
                        {/* Primary glowing marker with a clear heartbeat tick */}
                        <motion.span
                          className="relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border-2 border-amber-300/80 bg-slate-950/70 shadow-[0_0_20px_rgba(251,191,36,0.65)] backdrop-blur-sm"
                          animate={{ scale: [1, 1.12, 1] }}
                          transition={{ duration: 0.45, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <img
                            src={getImageUrl(myPlayer.imageUrl, myPlayer.imageUrl ? playerFallback('emerald') : `${DEFAULT_AVATAR}${encodeURIComponent(myPlayer.name)}`)}
                            alt={mark.name}
                            className="h-9 w-9 rounded-full object-cover transition group-hover/pos:scale-110"
                          />
                        </motion.span>
                      </>
                    ) : (
                      <>
                        {/* Soft secondary glow for supporting positions */}
                        <motion.span
                          className="pointer-events-none absolute top-1/2 left-1/2 h-9 w-9 rounded-full bg-emerald-300/20"
                          style={{ margin: '-18px 0 0 -18px' }}
                          animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.8, 1.3, 0.8] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <span className="relative block h-9 w-9 sm:h-10 sm:w-10 rounded-full border-2 border-white/90 bg-slate-950/70 p-0.5 shadow-[0_0_10px_rgba(52,211,153,0.45)] backdrop-blur-sm">
                          <img
                            src={getImageUrl(myPlayer.imageUrl, myPlayer.imageUrl ? playerFallback('emerald') : `${DEFAULT_AVATAR}${encodeURIComponent(myPlayer.name)}`)}
                            alt={mark.name}
                            className="h-full w-full rounded-full object-cover transition group-hover/pos:scale-110"
                          />
                        </span>
                      </>
                    )}
                    <span className={`pointer-events-none mt-1 rounded px-1 py-px text-[9px] font-black uppercase tracking-widest shadow-sm ${isPrimary ? "bg-amber-300/90 text-amber-950" : "bg-slate-950/75 text-emerald-300/90"}`}>
                      {mark.code}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] text-white/45 font-semibold bg-slate-950/40 rounded-full px-3 py-1">No positions set</span>
              </div>
            )}

            {/* Selected marker → player info popover */}
            <AnimatePresence>
              {activePos && (
                <motion.div
                  key="player-info"
                  className="absolute inset-x-3 bottom-3 z-20 mx-auto flex items-center justify-center"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/90 p-3 shadow-2xl backdrop-blur-md">
                    <img
                      src={getImageUrl(myPlayer.imageUrl, myPlayer.imageUrl ? playerFallback('emerald') : `${DEFAULT_AVATAR}${encodeURIComponent(myPlayer.name)}`)}
                      alt={myPlayer.name}
                      className="h-12 w-12 rounded-xl object-cover border border-slate-700"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-white">{myPlayer.name}</p>
                      <p className="truncate text-[11px] font-semibold text-cyan-300">
                        {resolvePosition(activePos)?.name || activePos} <span className="text-slate-500">· {activePos}</span>
                      </p>
                      <p className="truncate text-[10px] text-slate-400">
                        {myPlayer.tShirtNumber && <>#{myPlayer.tShirtNumber} · </>}
                        {myPlayer.jerseyName}
                        {myPlayer.category || myPlayer.primaryPosition ? <> · {myPlayer.category || 'Unranked'}</> : null}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePos(null)}
                      className="shrink-0 rounded-full border border-slate-700 p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                      aria-label="Close player info"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </FullscreenWrapper>
        </div>
      </div>

      {/* ── Positions ──────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-purple-400" /> Positions</h3>
        <div className="flex flex-wrap gap-2">
          {(myPlayer.positions || []).map(pos => {
            const info = resolvePosition(pos);
            const label = info ? info.name : pos;
            const isPrimary = String(pos).toUpperCase() === String(myPlayer.primaryPosition).toUpperCase();
            return (
              <span key={pos} className={`px-3 py-1 rounded-lg text-xs font-bold border ${isPrimary ? "bg-purple-500/20 text-purple-300 border-purple-500/40" : "bg-slate-800 text-slate-400 border-slate-700"}`}>
                {isPrimary && <Star className="w-3 h-3 inline mr-1 text-yellow-400" />}{label}{isPrimary && " (Primary)"}
              </span>
            );
          })}
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-purple-400" /> Age</label>
                      <input type="number" min="5" max="120" value={editForm.age ?? ""} onChange={e => setEditForm(prev => ({ ...prev, age: e.target.value.replace(/\D/g, "").slice(0, 3) }))} className="glass-input w-full px-3 py-2.5 rounded-xl text-white" placeholder="e.g. 21" />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5"><Ruler className="w-3.5 h-3.5 text-purple-400" /> Height</label>
                      <input type="text" value={editForm.height} onChange={e => setEditForm(prev => ({ ...prev, height: e.target.value }))} className="glass-input w-full px-3 py-2.5 rounded-xl text-white" placeholder="e.g. 5ft 10in / 178cm" />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5"><Footprints className="w-3.5 h-3.5 text-purple-400" /> Preferred Foot</label>
                      <select value={editForm.preferredFoot} onChange={e => setEditForm(prev => ({ ...prev, preferredFoot: e.target.value }))} className="glass-input w-full px-3 py-2.5 rounded-xl text-white appearance-none">
                        <option value="">Select foot</option>
                        {FOOT_PREFERENCES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-purple-400" /> Nationality</label>
                      <input type="text" value={editForm.nationality} onChange={e => setEditForm(prev => ({ ...prev, nationality: e.target.value }))} className="glass-input w-full px-3 py-2.5 rounded-xl text-white" placeholder="e.g. Bangladesh" />
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "photo" && (
                <div className="space-y-5 text-xs">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <img src={getImageUrl(currentAvatar, playerFallback('emerald'))} alt="Preview" className="w-28 h-28 rounded-2xl object-cover border-2 border-purple-500/40 shadow-2xl" />
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