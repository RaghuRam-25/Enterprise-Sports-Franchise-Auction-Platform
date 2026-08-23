import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, CheckCircle2, Edit3, X, Save, Loader2,
  Camera, Shield, Hash, Shirt, List, Star, Mail, GraduationCap, BadgeCheck,
  Lock, Upload, Trash2, MapPin, Award, Calendar, Ruler, Footprints, Globe, Activity,
  Goal, TrendingUp, Gavel, Trophy, Rocket, ShieldOff, XCircle, AlertTriangle, Clock
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAuction } from "../../context/AuctionContext";
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
  "GK": { name: "Goalkeeper", x: 6, y: 50 },
  "CB": { name: "Center Back", x: 22, y: 50 },
  "LB": { name: "Left Back", x: 28, y: 16 },
  "RB": { name: "Right Back", x: 28, y: 84 },
  "DM": { name: "Defensive Midfielder", x: 40, y: 50 },
  "CDM": { name: "Defensive Midfielder", x: 40, y: 50 },
  "CM": { name: "Central Midfielder", x: 52, y: 50 },
  "CAM": { name: "Attacking Midfielder", x: 64, y: 50 },
  "LM": { name: "Left Midfielder", x: 55, y: 18 },
  "RM": { name: "Right Midfielder", x: 55, y: 82 },
  "LW": { name: "Left Winger", x: 78, y: 18 },
  "RW": { name: "Right Winger", x: 78, y: 82 },
  "SS": { name: "Second Striker", x: 80, y: 50 },
  "ST": { name: "Striker", x: 88, y: 50 },
  "CF": { name: "Center Forward", x: 86, y: 50 },
};

const CATEGORY_TONE = {
  "Icon Category": { text: "text-warningGold", bg: "bg-warningGold/10", border: "border-warningGold/30" },
  "A Grade": { text: "text-white", bg: "bg-neonGreen/10", border: "border-neonGreen/30" },
  "B Grade": { text: "text-white", bg: "bg-neonGreen/10", border: "border-neonGreen/30" },
  "Emerging Youth": { text: "text-warningGold", bg: "bg-warningGold/10", border: "border-warningGold/30" },
};
const getCategoryTone = (cat) => CATEGORY_TONE[cat] || { text: "text-secondaryText", bg: "bg-surfaceHover/60", border: "border-borderStrong" };

export default function PlayerDashboard() {
  const { user, setUser } = useAuth();
  const { formatCurrency, triggerToast, isRegistrationFrozen, positions, teams, podiumPlayer, currentBid, bidHistory } = useAuction();
  const [myPlayer, setMyPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", jerseyName: "", tShirtSize: "M", tShirtNumber: "", positions: [], primaryPosition: "", session: "", bio: "", address: "", age: "", height: "", preferredFoot: "", nationality: "", matchesPlayed: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, cleanSheets: 0 });
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const fileInputRef = useRef(null);
  const [activePos, setActivePos] = useState(null);
  // Manager request cancellation
  const [showCancelRequestModal, setShowCancelRequestModal] = useState(false);
  const [cancellingRequest, setCancellingRequest] = useState(false);

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
      nationality: myPlayer?.nationality || "",
      matchesPlayed: myPlayer?.matchesPlayed ?? 0,
      goals: myPlayer?.goals ?? 0,
      assists: myPlayer?.assists ?? 0,
      yellowCards: myPlayer?.yellowCards ?? 0,
      redCards: myPlayer?.redCards ?? 0,
      cleanSheets: myPlayer?.cleanSheets ?? 0
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
      if (editForm.matchesPlayed !== 0) fd.append("matchesPlayed", editForm.matchesPlayed);
      if (editForm.goals !== 0) fd.append("goals", editForm.goals);
      if (editForm.assists !== 0) fd.append("assists", editForm.assists);
      if (editForm.yellowCards !== 0) fd.append("yellowCards", editForm.yellowCards);
      if (editForm.redCards !== 0) fd.append("redCards", editForm.redCards);
      if (editForm.cleanSheets !== 0) fd.append("cleanSheets", editForm.cleanSheets);

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

  // Withdraw a PENDING Team Manager request. Status returns to NONE so a new
  // request can be submitted afterwards. AuthContext + localStorage stay in
  // sync; other open sessions update live via the user:request_cancelled event.
  const handleCancelManagerRequest = async () => {
    setCancellingRequest(true);
    try {
      await api.post("/players/request-manager/cancel");
      triggerToast("Team Manager request cancelled.", "success");
      if (setUser) {
        setUser(prev => {
          if (!prev) return prev;
          const next = { ...prev, managerRequestStatus: "NONE" };
          localStorage.setItem("user", JSON.stringify(next));
          return next;
        });
      }
      setShowCancelRequestModal(false);
    } catch (e) {
      const msg = e?.response?.data?.message || "";
      if (msg.includes("No pending") || msg.includes("not found") || msg.includes("already")) {
        triggerToast("No pending request found. Status refreshed.", "info");
        if (setUser) {
          setUser(prev => {
            if (!prev) return prev;
            const next = { ...prev, managerRequestStatus: "NONE" };
            localStorage.setItem("user", JSON.stringify(next));
            return next;
          });
        }
        setShowCancelRequestModal(false);
      } else {
        triggerToast(msg || "Failed to cancel request.", "error");
      }
    } finally {
      setCancellingRequest(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-warningGold" /></div>;

  if (!myPlayer) return (
    <div className="max-w-5xl w-full mx-auto px-4 py-8">
      <div className="glass-card rounded-2xl p-10 border border-cardBorder text-center text-secondaryText space-y-2">
        <User className="w-12 h-12 mx-auto text-mutedText" />
        <p className="font-bold">No player profile found.</p>
        <Link to="/player/register" className="inline-block mt-2 px-4 py-2 bg-warningGold text-darkBg text-xs font-bold rounded-xl">Register Now</Link>
      </div>
    </div>
  );

  const currentAvatar = removeImage ? `${DEFAULT_AVATAR}${encodeURIComponent(myPlayer?.name || "P")}` : (filePreview || myPlayer?.imageUrl || `${DEFAULT_AVATAR}${encodeURIComponent(myPlayer?.name || "P")}`);
  const activePositionCode = myPlayer.assignedTeamPosition || myPlayer.primaryPosition || "";
  const primaryName = (resolvePosition(activePositionCode)?.name) || activePositionCode || "";
  const catTone = getCategoryTone(myPlayer.category);

  // Pitch marker positions — safe here because both early returns have already fired.
  const pitchMarks = (() => {
    const mainMark = resolvePosition(activePositionCode);
    const otherMarks = (myPlayer.positions || [])
      .filter(p => String(p).toUpperCase() !== String(activePositionCode).toUpperCase())
      .map(resolvePosition)
      .filter(Boolean);
    return mainMark ? [mainMark, ...otherMarks] : (myPlayer.positions || []).map(resolvePosition).filter(Boolean);
  })();

  const isSold = myPlayer.status === "SOLD";
  const isHalted = myPlayer.status === "WITHDRAWN" || myPlayer.status === "BANNED";

  // Live auction signals — only meaningful when THIS player is the current podium
  // player. Values are real socket state, never fabricated.
  const podiumId = String(podiumPlayer?._id || podiumPlayer?.id || '');
  const myId = String(myPlayer?._id || myPlayer?.id || '');
  const isLiveMe = !!podiumId && podiumId === myId;
  const liveBids = isLiveMe ? (bidHistory?.length ?? 0) : null;
  const liveHighest = isLiveMe ? (currentBid ?? null) : (isSold ? myPlayer.finalPrice : null);
  const finalBid = isSold ? myPlayer.finalPrice : (isLiveMe ? currentBid : null);
  const winningTeamName =
    myPlayer.soldToTeam?.name ||
    (Array.isArray(teams) ? teams.find(t => String(t?._id || t?.id) === String(myPlayer.soldToTeam))?.name : null) ||
    null;

  // Bid status → label + tone (every status the backend can emit).
  const AUCTION_STATUS_META = {
    REGISTERED: { label: "Registered", tone: "text-white bg-neonGreen/10 border-neonGreen/30" },
    APPROVED: { label: "Verified", tone: "text-white bg-neonGreen/10 border-neonGreen/30" },
    ON_PODIUM: { label: "On Podium", tone: "text-warningGold bg-warningGold/10 border-warningGold/30" },
    SOLD: { label: "Sold", tone: "text-white bg-neonGreen/10 border-neonGreen/30" },
    UNSOLD: { label: "Unsold", tone: "text-urgentRedText bg-urgentRed/10 border-urgentRed/30" },
    WITHDRAWN: { label: "Withdrawn", tone: "text-secondaryText bg-surfaceActive/10 border-borderStrong/30" },
    BANNED: { label: "Banned", tone: "text-urgentRedText bg-urgentRed/10 border-urgentRed/30" },
  };
  const statusMeta = AUCTION_STATUS_META[myPlayer.status] || AUCTION_STATUS_META.REGISTERED;

  // Performance Statistics — committed match stats from the player record, live
  // auction counters from real-time socket state. Anything unavailable = "—".
  const perfStats = [
    { label: "Matches Played", value: myPlayer.matchesPlayed ?? 0, icon: Activity },
    { label: "Goals", value: myPlayer.goals ?? 0, icon: Goal },
    { label: "Assists", value: myPlayer.assists ?? 0, icon: Footprints },
    { label: "Yellow Cards", value: myPlayer.yellowCards ?? 0, icon: Shield },
    { label: "Red Cards", value: myPlayer.redCards ?? 0, icon: Shield },
    { label: "Clean Sheets", value: myPlayer.cleanSheets ?? 0, icon: Shield },
    { label: "Total Bids", value: liveBids, icon: TrendingUp },
    { label: "Highest Bid", value: liveHighest, icon: Gavel, currency: true },
  ];

  // Auction Summary — authoritative player/auction/team values from the backend.
  const auctionRows = [
    { label: "Base Price", value: myPlayer.basePrice != null ? formatCurrency(myPlayer.basePrice) : null, icon: Award },
    { label: "Highest Bid", value: liveHighest != null ? formatCurrency(liveHighest) : null, icon: TrendingUp },
    { label: "Final Bid", value: finalBid != null ? formatCurrency(finalBid) : null, icon: Gavel },
    { label: "Winning Team", value: winningTeamName, icon: Trophy },
  ];

  // Auction Timeline — Registered → Verified → Selected → Pushed to Auction → Sold/Unsold.
  const TIMELINE_STEPS = ["Registered", "Verified", "Selected", "Pushed to Auction", isSold ? "Sold" : "Unsold"];
  const TIMELINE_MAP = { REGISTERED: 0, APPROVED: 1, ON_PODIUM: 3, SOLD: 4, UNSOLD: 4 };
  const activeStage = TIMELINE_MAP[myPlayer.status] ?? (isHalted ? -1 : 0);

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

      {/* ── Top Player Section ────────────────────────────────────────── */}
      <div className="group relative overflow-hidden rounded-3xl border border-cardBorder bg-gradient-to-br from-darkBg via-warningGold/20 to-cardBg shadow-2xl transition-shadow duration-300 hover:shadow-warningGold/40">
        {/* Ambient glow + faint dot texture */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />
        <div className="absolute -top-24 -right-16 w-72 h-72 bg-warningGold/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-warningGold/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top bar: portal label + status/edit controls */}
        <div className="relative z-20 flex items-center justify-between px-5 pt-5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold tracking-wider uppercase text-warningGold backdrop-blur-sm">
            Player Portal
          </span>

          {isRegistrationFrozen ? (
            <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-warningGold/10 border border-warningGold/25 text-[10px] font-black uppercase tracking-widest text-warningGold" title="Read-only — registration frozen">
              <Lock className="w-3.5 h-3.5" /> Locked
            </span>
          ) : (
            <button
              onClick={openEdit}
              title="Edit Profile"
              aria-label="Edit Profile"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neonGreen/15 border border-neonGreen/50 text-white hover:bg-[#0B2B26] hover:text-white hover:border-[#0B2B26] active:scale-[0.97] font-black text-xs uppercase tracking-wider transition shadow-lg shadow-neonGreen/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2B26]/70 ui-focus"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Profile
            </button>
          )}
        </div>

        {/* Two-panel split */}
        <div className="relative z-10 grid grid-cols-1 gap-6 p-5 sm:p-7 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-center">
          {/* ── LEFT PANEL — Profile Photograph ─────────────────────────── */}
          <div className="relative flex items-center justify-center min-h-[220px]">
            {/* Ghost jersey number behind the photo */}
            <span
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[9rem] sm:text-[11rem] font-black text-white/[0.04] leading-none select-none"
              aria-hidden="true"
            >
              {myPlayer.tShirtNumber || "00"}
            </span>

            {/* Glow halo */}
            <div className="absolute h-52 w-52 sm:h-64 sm:w-64 rounded-full bg-warningGold/25 blur-3xl pointer-events-none transition-opacity duration-300 group-hover:opacity-100 opacity-70" />

            {/* Framed photograph */}
            <div className="relative rounded-[1.75rem] bg-white/5 p-[3px] shadow-[0_20px_60px_rgba(0,0,0,0.55)] ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-[1.02]">
              <div className="rounded-[1.6rem] bg-gradient-to-tr from-neonGreen/40 via-neonGreen/20 to-successGreen/30 p-[2px]">
                <img
                  src={getImageUrl(myPlayer.imageUrl, myPlayer.imageUrl ? playerFallback('emerald') : `${DEFAULT_AVATAR}${encodeURIComponent(myPlayer.name)}`)}
                  alt={myPlayer.name}
                  className="h-52 w-52 sm:h-64 sm:w-64 rounded-[1.55rem] object-cover"
                />
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL — Identity ─────────────────────────── */}
          <div className="flex flex-col justify-center gap-3.5 text-center md:text-left py-2">
            {/* PLAYER label */}
            <span className="inline-flex items-center justify-center gap-2 md:justify-start">
              <span className="h-px w-5 bg-warningGold/60" />
            </span>

            {/* Name — hero typography */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-none text-white [text-shadow:0_0_40px_rgba(244,197,66,0.35)]">
              {myPlayer.name}
            </h1>

            {/* Position */}
            <p className="text-xs sm:text-sm font-black uppercase tracking-[0.3em] text-white">
              {primaryName || "Position Not Set"}
            </p>

            {/* Category + Status badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start pt-1">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider ${catTone.bg} ${catTone.text} ${catTone.border}`}>
                <Award className="h-3 w-3" />
                {myPlayer.category || 'Unranked'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primaryText backdrop-blur-sm">
                <span className={`inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse`} />
                {isSold ? "Sold" : "Registered"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Player Information & Position on Pitch ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Card: PLAYER INFORMATION */}
        <div className="glass-card rounded-2xl border border-cardBorder p-5 sm:p-6 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-4 border-b border-cardBorder/80 pb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-secondaryText flex items-center gap-2">
              <User className="w-4 h-4 text-warningGold" /> Player Information
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
            <div className="rounded-xl border border-white/10 bg-darkBg/50 p-3.5 flex flex-col justify-center">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-mutedText">
                <Hash className="w-3.5 h-3.5 text-warningGold" /> Student ID
              </span>
              <span className="mt-1 block text-sm font-bold text-white font-mono truncate">
                {myPlayer.studentId || "—"}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-darkBg/50 p-3.5 flex flex-col justify-center">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-mutedText">
                <GraduationCap className="w-3.5 h-3.5 text-white" /> Session
              </span>
              <span className="mt-1 block text-sm font-bold text-white truncate">
                {myPlayer.session || "—"}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-darkBg/50 p-3.5 flex flex-col justify-center sm:col-span-2">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-mutedText">
                <Mail className="w-3.5 h-3.5 text-white" /> Email Address
              </span>
              <span className="mt-1 block text-sm font-bold text-white font-mono truncate">
                {myPlayer.email || "—"}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-darkBg/50 p-3.5 flex flex-col justify-center">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-mutedText">
                <Shirt className="w-3.5 h-3.5 text-warningGold" /> Jersey Name
              </span>
              <span className="mt-1 block text-sm font-bold text-white uppercase font-mono truncate">
                {myPlayer.jerseyName || "—"}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-darkBg/50 p-3.5 flex flex-col justify-center">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-mutedText">
                <List className="w-3.5 h-3.5 text-warningGold" /> Kit Size
              </span>
              <span className="mt-1 block text-sm font-bold text-white uppercase truncate">
                {myPlayer.tShirtSize || "—"}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-darkBg/50 p-3.5 flex flex-col justify-center">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-mutedText">
                <Award className="w-3.5 h-3.5 text-warningGold" /> Base Price
              </span>
              <span className="mt-1 block text-sm font-black text-white truncate">
                {myPlayer.basePrice != null ? formatCurrency(myPlayer.basePrice) : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Card: POSITION ON PITCH */}
        <div className="glass-card rounded-2xl border border-cardBorder p-5 sm:p-6 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-4 border-b border-cardBorder/80 pb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-secondaryText flex items-center gap-2">
              <MapPin className="w-4 h-4 text-white" /> Position on Pitch
            </h3>
            {myPlayer.primaryPosition && (
              <span className="text-[10px] font-bold text-warningGold flex items-center gap-1">
                <Star className="w-3 h-3 text-warningGold" /> {primaryName}
              </span>
            )}
          </div>

          <div className="relative w-full aspect-[105/68] rounded-xl overflow-hidden border border-successGreen/60 bg-darkBg flex items-center justify-center my-auto">
            <FootballField width="100%" height="100%" preserveAspectRatio="xMidYMid meet" className="w-full h-full" />

            {/* Player markers overlay */}
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
                        {[0, 1, 2].map(i => (
                          <motion.span
                            key={i}
                            className="pointer-events-none absolute top-1/2 left-1/2 h-3 w-3 rounded-full border border-warningGold/60"
                            style={{ margin: '-6px 0 0 -6px' }}
                            initial={{ scale: 0.6, opacity: 0.9 }}
                            animate={{ scale: [0.6, 2.6], opacity: [0.9, 0] }}
                            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
                          />
                        ))}
                        <motion.span
                          className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 border-warningGold/80 bg-darkBg/70 shadow-[0_0_20px_rgba(244,197,66,0.65)] backdrop-blur-sm"
                          animate={{ scale: [1, 1.12, 1] }}
                          transition={{ duration: 0.45, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <img
                            src={getImageUrl(myPlayer.imageUrl, myPlayer.imageUrl ? playerFallback('emerald') : `${DEFAULT_AVATAR}${encodeURIComponent(myPlayer.name)}`)}
                            alt={mark.name}
                            className="h-8 w-8 rounded-full object-cover transition group-hover/pos:scale-110"
                          />
                        </motion.span>
                      </>
                    ) : (
                      <>
                        <motion.span
                          className="pointer-events-none absolute top-1/2 left-1/2 h-8 w-8 rounded-full bg-white/10"
                          style={{ margin: '-16px 0 0 -16px' }}
                          animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.8, 1.3, 0.8] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <span className="relative block h-8 w-8 sm:h-9 sm:w-9 rounded-full border-2 border-white/90 bg-darkBg/70 p-0.5 shadow-[0_0_10px_rgba(11, 43, 38,0.45)] backdrop-blur-sm">
                          <img
                            src={getImageUrl(myPlayer.imageUrl, myPlayer.imageUrl ? playerFallback('emerald') : `${DEFAULT_AVATAR}${encodeURIComponent(myPlayer.name)}`)}
                            alt={mark.name}
                            className="h-full w-full rounded-full object-cover transition group-hover/pos:scale-110"
                          />
                        </span>
                      </>
                    )}
                    <span className={`pointer-events-none mt-1 rounded px-1 py-px text-[9px] font-black uppercase tracking-widest shadow-sm ${isPrimary ? "bg-warningGold/90 text-warningGold" : "bg-darkBg/75 text-white/90"}`}>
                      {mark.code}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] text-white/45 font-semibold bg-darkBg/40 rounded-full px-3 py-1">No positions set</span>
              </div>
            )}

            {/* Selected marker info popover */}
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
                  <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-white/10 bg-darkBg/90 p-3 shadow-2xl backdrop-blur-md">
                    <img
                      src={getImageUrl(myPlayer.imageUrl, myPlayer.imageUrl ? playerFallback('emerald') : `${DEFAULT_AVATAR}${encodeURIComponent(myPlayer.name)}`)}
                      alt={myPlayer.name}
                      className="h-10 w-10 rounded-xl object-cover border border-borderStrong"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black text-white">{myPlayer.name}</p>
                      <p className="truncate text-[10px] font-semibold text-white">
                        {resolvePosition(activePos)?.name || activePos} <span className="text-mutedText">· {activePos}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePos(null)}
                      className="shrink-0 rounded-full border border-borderStrong p-1 text-secondaryText transition hover:bg-surfaceHover hover:text-white"
                      aria-label="Close player info"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Franchise Management ──────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6 border border-cardBorder space-y-4">
        <div className="flex items-center justify-between">
          <div><h3 className="text-sm font-bold text-white uppercase tracking-wider">Franchise Management</h3></div>
          {user?.managerRequestStatus === "PENDING" && (
            <span className="px-3 py-1 bg-warningGold/20 text-warningGold border border-warningGold/30 rounded-lg text-xs font-bold animate-pulse flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Pending
            </span>
          )}
          {user?.managerRequestStatus === "APPROVED" && <span className="px-3 py-1 bg-neonGreen/20 text-white border border-neonGreen/30 rounded-lg text-xs font-bold">Approved</span>}
          {user?.managerRequestStatus === "REJECTED" && <span className="px-3 py-1 bg-urgentRed/20 text-urgentRedText border border-urgentRed/30 rounded-lg text-xs font-bold">Declined</span>}
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
          }} className="px-4 py-2.5 bg-gradient-to-r from-neonGreen to-successGreen hover:from-neonGreen hover:to-neonGreen text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg">
            Request Team Manager Role
          </button>
        )}

        {user?.managerRequestStatus === "PENDING" && (
          <div className="p-4 rounded-xl bg-warningGold/10 border border-warningGold/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-secondaryText leading-relaxed max-w-md">
              Your Team Manager request has been submitted and is awaiting <span className="text-warningGold font-bold">Super Admin review</span>. You can withdraw it at any time.
            </p>
            <button
              onClick={() => setShowCancelRequestModal(true)}
              disabled={cancellingRequest}
              aria-label="Cancel Team Manager request"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-urgentRed/15 border border-urgentRed/50 text-urgentRedText hover:bg-[#B00012] hover:text-white hover:border-[#B00012] active:scale-[0.97] font-black text-xs uppercase tracking-wider transition shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B00012]/70 ui-focus whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="w-4 h-4" /> Cancel Request
            </button>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="glass-card w-full max-w-2xl rounded-2xl border border-borderStrong shadow-2xl my-6">
            <div className="flex justify-between items-center px-6 py-4 border-b border-cardBorder">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2"><Edit3 className="w-5 h-5 text-warningGold" /> Edit My Profile</h2>
                <p className="text-[11px] text-secondaryText mt-0.5">Update your player information</p>
              </div>
              <button onClick={() => setEditing(false)} className="btn-secondary w-8 h-8 flex items-center justify-center rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex border-b border-cardBorder px-6 overflow-x-auto">
              {[{ id: "stats", label: "Stats", icon: Goal }, { id: "personal", label: "Personal", icon: User }, { id: "photo", label: "Photo", icon: Camera }, { id: "sports", label: "Positions", icon: Shield }, { id: "kit", label: "Kit & Jersey", icon: Shirt }].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${activeTab === tab.id ? "border-[#0B2B26] text-white" : "border-transparent text-[#F5F5F5] bg-transparent hover:text-white"}`}>
                  <tab.icon className="w-3.5 h-3.5" />{tab.label}
                </button>
              ))}
            </div>
            <div className="p-6 space-y-5">
              {activeTab === "personal" && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-secondaryText mb-1.5 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-white" /> Full Name</label>
                      <input type="text" value={editForm.name} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} className="glass-input w-full px-3 py-2.5 rounded-xl text-white" placeholder="Your full name" />
                    </div>
                    <div>
                      <label className="block font-semibold text-secondaryText mb-1.5 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-warningGold" /> Student ID <span className="text-mutedText font-normal ml-1">(read-only)</span></label>
                      <input type="text" value={myPlayer.studentId || ""} readOnly disabled className="glass-input w-full px-3 py-2.5 rounded-xl text-secondaryText font-mono cursor-not-allowed opacity-70" placeholder="—" />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-secondaryText mb-1.5 flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 text-white" /> Academic Session</label>
                    <input type="text" value={editForm.session} onChange={e => setEditForm(prev => ({ ...prev, session: e.target.value }))} className="glass-input w-full px-3 py-2.5 rounded-xl text-white" placeholder="e.g. 2020-2021" />
                  </div>
                  <div className="p-3 bg-darkBg/60 rounded-xl border border-cardBorder flex items-start gap-2">
                    <Mail className="w-3.5 h-3.5 text-mutedText mt-0.5 flex-shrink-0" />
                    <div><span className="text-mutedText font-semibold">Email (read-only)</span><p className="text-white font-mono mt-0.5">{myPlayer.email}</p></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-secondaryText mb-1.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-warningGold" /> Age</label>
                      <input type="number" min="5" max="120" value={editForm.age ?? ""} onChange={e => setEditForm(prev => ({ ...prev, age: e.target.value.replace(/\D/g, "").slice(0, 3) }))} className="glass-input w-full px-3 py-2.5 rounded-xl text-white" placeholder="e.g. 21" />
                    </div>
                    <div>
                      <label className="block font-semibold text-secondaryText mb-1.5 flex items-center gap-1.5"><Ruler className="w-3.5 h-3.5 text-warningGold" /> Height</label>
                      <input type="text" value={editForm.height} onChange={e => setEditForm(prev => ({ ...prev, height: e.target.value }))} className="glass-input w-full px-3 py-2.5 rounded-xl text-white" placeholder="e.g. 5ft 10in / 178cm" />
                    </div>
                    <div>
                      <label className="block font-semibold text-secondaryText mb-1.5 flex items-center gap-1.5"><Footprints className="w-3.5 h-3.5 text-warningGold" /> Preferred Foot</label>
                      <select value={editForm.preferredFoot} onChange={e => setEditForm(prev => ({ ...prev, preferredFoot: e.target.value }))} className="glass-input w-full px-3 py-2.5 rounded-xl text-white appearance-none">
                        <option value="">Select foot</option>
                        {FOOT_PREFERENCES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block font-semibold text-secondaryText mb-1.5 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-warningGold" /> Nationality</label>
                      <input type="text" value={editForm.nationality} onChange={e => setEditForm(prev => ({ ...prev, nationality: e.target.value }))} className="glass-input w-full px-3 py-2.5 rounded-xl text-white" placeholder="e.g. Bangladesh" />
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "stats" && (
                <div className="space-y-4 text-xs">
                  <div>
                    <p className="text-[11px] text-mutedText mb-3 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-white" /> Match performance stats — used in the Player Overview.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-secondaryText mb-1.5 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-white" /> Matches Played</label>
                        <input type="number" min="0" max="9999" value={editForm.matchesPlayed === 0 ? "" : editForm.matchesPlayed ?? ""} onChange={e => setEditForm(prev => ({ ...prev, matchesPlayed: e.target.value.replace(/\D/g, "").slice(0, 4) }))} className="glass-input w-full px-3 py-2.5 rounded-xl text-white" placeholder="e.g. 25" />
                      </div>
                      <div>
                        <label className="block font-semibold text-secondaryText mb-1.5 flex items-center gap-1.5"><Goal className="w-3.5 h-3.5 text-white" /> Goals</label>
                        <input type="number" min="0" max="9999" value={editForm.goals === 0 ? "" : editForm.goals ?? ""} onChange={e => setEditForm(prev => ({ ...prev, goals: e.target.value.replace(/\D/g, "").slice(0, 4) }))} className="glass-input w-full px-3 py-2.5 rounded-xl text-white" placeholder="e.g. 15" />
                      </div>
                      <div>
                        <label className="block font-semibold text-secondaryText mb-1.5 flex items-center gap-1.5"><Footprints className="w-3.5 h-3.5 text-white" /> Assists</label>
                        <input type="number" min="0" max="9999" value={editForm.assists === 0 ? "" : editForm.assists ?? ""} onChange={e => setEditForm(prev => ({ ...prev, assists: e.target.value.replace(/\D/g, "").slice(0, 4) }))} className="glass-input w-full px-3 py-2.5 rounded-xl text-white" placeholder="e.g. 10" />
                      </div>
                      <div>
                        <label className="block font-semibold text-secondaryText mb-1.5 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-warningGold" /> Yellow Cards</label>
                        <input type="number" min="0" max="9999" value={editForm.yellowCards === 0 ? "" : editForm.yellowCards ?? ""} onChange={e => setEditForm(prev => ({ ...prev, yellowCards: e.target.value.replace(/\D/g, "").slice(0, 4) }))} className="glass-input w-full px-3 py-2.5 rounded-xl text-white" placeholder="e.g. 5" />
                      </div>
                      <div>
                        <label className="block font-semibold text-secondaryText mb-1.5 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-urgentRedText" /> Red Cards</label>
                        <input type="number" min="0" max="9999" value={editForm.redCards === 0 ? "" : editForm.redCards ?? ""} onChange={e => setEditForm(prev => ({ ...prev, redCards: e.target.value.replace(/\D/g, "").slice(0, 4) }))} className="glass-input w-full px-3 py-2.5 rounded-xl text-white" placeholder="e.g. 1" />
                      </div>
                      <div>
                        <label className="block font-semibold text-secondaryText mb-1.5 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-white" /> Clean Sheets</label>
                        <input type="number" min="0" max="9999" value={editForm.cleanSheets === 0 ? "" : editForm.cleanSheets ?? ""} onChange={e => setEditForm(prev => ({ ...prev, cleanSheets: e.target.value.replace(/\D/g, "").slice(0, 4) }))} className="glass-input w-full px-3 py-2.5 rounded-xl text-white" placeholder="e.g. 8" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-darkBg/60 rounded-xl border border-cardBorder text-[10px] text-mutedText">
                    Total Bids and Highest Bid are pulled live from the auction engine and are not manually editable.
                  </div>
                </div>
              )}
              {activeTab === "photo" && (
                <div className="space-y-5 text-xs">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <img src={getImageUrl(currentAvatar, playerFallback('emerald'))} alt="Preview" className="w-28 h-28 rounded-2xl object-cover border-2 border-warningGold/40 shadow-2xl" />
                      {filePreview && !removeImage && <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-successGreen text-white text-[9px] font-bold rounded-full">NEW</span>}
                    </div>
                    <p className="text-mutedText">Profile photo preview</p>
                  </div>
                  <div className="border-2 border-dashed border-borderStrong hover:border-warningGold/50 rounded-2xl p-8 text-center cursor-pointer transition group" onClick={() => fileInputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith("image/")) { if (f.size > 5 * 1024 * 1024) { triggerToast("Max 5MB", "error"); return; } setSelectedFile(f); setFilePreview(URL.createObjectURL(f)); setRemoveImage(false); } }}>
                    <Upload className="w-10 h-10 mx-auto text-mutedText group-hover:text-warningGold transition mb-2" />
                    <p className="font-semibold text-secondaryText group-hover:text-primaryText transition">Click or drag and drop to upload</p>
                    <p className="text-mutedText mt-1">PNG, JPG, WEBP up to 5MB</p>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </div>
                  {selectedFile && !removeImage && (
                    <div className="flex items-center justify-between p-3 bg-warningGold/10 border border-warningGold/30 rounded-xl">
                      <span className="text-warningGold font-semibold truncate max-w-[200px]">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                      <button onClick={() => { setSelectedFile(null); setFilePreview(null); }} className="text-urgentRedText hover:text-urgentRedText"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                  {myPlayer.imageUrl && !removeImage && (
                    <button onClick={() => { setSelectedFile(null); setFilePreview(null); setRemoveImage(true); }} className="w-full py-2.5 border border-urgentRed/50 text-urgentRedText hover:bg-urgentRed/30 rounded-xl font-bold transition flex items-center justify-center gap-2">
                      <Trash2 className="w-3.5 h-3.5" /> Remove Current Photo
                    </button>
                  )}
                  {removeImage && <div className="p-3 bg-urgentRed/20 border border-urgentRed/40 rounded-xl text-center text-urgentRedText text-xs font-semibold">Photo will be removed on save. <button onClick={() => setRemoveImage(false)} className="underline ml-1 hover:text-urgentRedText">Undo</button></div>}
                </div>
              )}
              {activeTab === "sports" && (
                <div className="space-y-5 text-xs">
                  <div>
                    <label className="block font-semibold text-secondaryText mb-2 flex items-center gap-1.5"><List className="w-3.5 h-3.5 text-warningGold" /> Select Positions</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {POSITIONS.map(pos => (
                        <button key={pos} type="button" onClick={() => togglePosition(pos)} className={`py-2 px-3 rounded-xl border text-left font-semibold transition ${editForm.positions.includes(pos) ? "bg-warningGold/20 border-warningGold/50 text-warningGold" : "bg-[#151515] border-[#333333] text-[#F5F5F5] hover:border-warningGold/50 hover:text-warningGold"}`}>
                          {editForm.positions.includes(pos) && <CheckCircle2 className="w-3 h-3 inline mr-1 text-warningGold" />}{pos}
                        </button>
                      ))}
                    </div>
                  </div>
                  {editForm.positions.length > 0 && (
                    <div>
                      <label className="block font-semibold text-secondaryText mb-2 flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-warningGold" /> Choose Primary Position</label>
                      <div className="flex flex-wrap gap-2">
                        {editForm.positions.map(pos => (
                          <button key={pos} type="button" onClick={() => setEditForm(prev => ({ ...prev, primaryPosition: pos }))} className={`py-1.5 px-3 rounded-xl border font-bold transition ${editForm.primaryPosition === pos ? "bg-warningGold/20 border-warningGold/50 text-warningGold" : "bg-[#151515] border-[#333333] text-[#F5F5F5] hover:border-warningGold/50"}`}>
                            {editForm.primaryPosition === pos && <Star className="w-3 h-3 inline mr-1 text-warningGold" />}{pos}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {editForm.positions.length === 0 && <p className="text-warningGold text-xs font-semibold text-center p-3 bg-warningGold/10 border border-warningGold/20 rounded-xl">Select at least one position above.</p>}
                </div>
              )}
              {activeTab === "kit" && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-secondaryText mb-1.5 flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-warningGold" /> Jersey Name <span className="text-mutedText font-normal ml-1">(max 15 chars)</span></label>
                    <input type="text" maxLength={15} value={editForm.jerseyName} onChange={e => setEditForm(prev => ({ ...prev, jerseyName: e.target.value.toUpperCase() }))} className="glass-input w-full px-3 py-2.5 rounded-xl text-white font-mono uppercase tracking-wider" placeholder="E.G. RONALDO" />
                    <p className="text-mutedText mt-1">{editForm.jerseyName.length}/15</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-secondaryText mb-1.5 flex items-center gap-1.5"><Shirt className="w-3.5 h-3.5 text-white" /> T-Shirt Size</label>
                      <div className="flex gap-1.5">
                        {TSHIRT_SIZES.map(s => (
                          <button key={s} type="button" onClick={() => setEditForm(prev => ({ ...prev, tShirtSize: s }))} className={`flex-1 py-2 rounded-xl border font-bold transition text-xs ${editForm.tShirtSize === s ? "bg-[#0B2B26]/20 border-[#0B2B26]/50 text-white" : "bg-[#151515] border-[#333333] text-[#F5F5F5] hover:border-[#0B2B26]/50"}`}>{s}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold text-secondaryText mb-1.5 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-warningGold" /> T-Shirt Number</label>
                      <input type="text" value={editForm.tShirtNumber} onChange={e => setEditForm(prev => ({ ...prev, tShirtNumber: e.target.value.replace(/\D/g, "") }))} className="glass-input w-full px-3 py-2.5 rounded-xl text-white font-mono text-lg text-center" placeholder="7" maxLength={3} />
                    </div>
                  </div>
                  <div className="p-4 bg-darkBg/60 rounded-2xl border border-cardBorder">
                    <span className="text-[10px] font-bold text-mutedText uppercase">Kit Preview</span>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="w-14 h-14 rounded-xl bg-warningGold/10 border-2 border-warningGold/30 flex items-center justify-center">
                        <span className="text-2xl font-black text-warningGold font-mono">{editForm.tShirtNumber || "#"}</span>
                      </div>
                      <div>
                        <p className="font-black font-mono text-white text-base uppercase tracking-wider">{editForm.jerseyName || "JERSEY NAME"}</p>
                        <p className="text-mutedText text-[11px]">Size: <strong className="text-secondaryText">{editForm.tShirtSize}</strong></p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-cardBorder bg-darkBg/40 rounded-b-2xl">
              <button onClick={() => setEditing(false)} className="btn-secondary flex-1 py-2.5 rounded-xl text-xs">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? "Saving..." : "Save All Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Manager Request Confirmation ─────────────────────── */}
      {showCancelRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm rounded-2xl border border-urgentRed/40 bg-cardBg shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-urgentRed/20 border border-urgentRed/50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-urgentRedText" />
              </span>
              <h3 className="text-base font-extrabold text-white leading-snug">Cancel Manager Request?</h3>
            </div>
            <p className="text-xs text-secondaryText leading-relaxed">
              Your pending Team Manager request will be withdrawn and Super Admin review will stop. You can submit a new request at any time.
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowCancelRequestModal(false)} disabled={cancellingRequest} className="btn-secondary flex-1 py-2.5 rounded-xl text-xs">Keep Request</button>
              <button onClick={handleCancelManagerRequest} disabled={cancellingRequest} className="btn-danger flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 ui-focus">
                {cancellingRequest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                {cancellingRequest ? "Cancelling..." : "Yes, Cancel It"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
