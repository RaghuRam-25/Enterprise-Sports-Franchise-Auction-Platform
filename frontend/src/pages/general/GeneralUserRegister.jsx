import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserPlus, Eye, EyeOff, AlertCircle, Server, ArrowLeft, ImagePlus,
  CheckCircle, User, Mail, Phone, Lock, ShieldCheck, Camera, Sparkles, Loader2
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import { useAuth, getDashboardForRole } from '../../context/AuthContext';
import { authAPI } from '../../services/api';

// Simple 0-4 strength score used purely for the visual meter.
const passwordScore = (pw = '') => {
  let s = 0;
  if (pw.length >= 6) s += 1;
  if (pw.length >= 10) s += 1;
  if (/[A-Z]/.test(pw)) s += 1;
  if (/\d/.test(pw)) s += 1;
  return s;
};

const STRENGTH_META = [
  { label: 'Too short', cls: 'bg-urgentRedText' },
  { label: 'Weak', cls: 'bg-urgentRedText' },
  { label: 'Fair', cls: 'bg-warningGold' },
  { label: 'Good', cls: 'bg-secondaryText' },
  { label: 'Strong', cls: 'bg-white' },
];

export default function GeneralUserRegister() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Only fans with an existing account are bounced to their dashboard.
  // Other authenticated roles (or legacy SPECTATOR sessions) must still be
  // able to open this public page — otherwise "JOIN FAN ZONE" feels dead.
  useEffect(() => {
    if (user?.role === 'GENERAL_USER') {
      navigate(getDashboardForRole(user.role), { replace: true });
    }
  }, [user, navigate]);

  const setField = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfilePhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // Convert the selected image to a data URL so it can be stored
  // server-side as the profilePhoto string (same approach as Profile page).
  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const validate = () => {
    if (!form.name.trim() || form.name.trim().length < 2) return 'Full name is required (min 2 characters)';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email address';
    if (!form.phone.trim() || form.phone.trim().length < 6) return 'Please enter a valid mobile phone number';
    if (form.password.length < 6) return 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      // NOTE: role is assigned server-side (GENERAL_USER) — never sent from here.
      const profilePhotoDataUrl = profilePhoto ? await fileToDataUrl(profilePhoto) : '';
      await authAPI.registerGeneral({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        profilePhoto: profilePhotoDataUrl
      });

      // Auto-login after successful registration
      const res = await login({ email: form.email.trim(), password: form.password });
      if (!res.success) {
        navigate('/login', { replace: true });
        return;
      }
      navigate('/general/dashboard', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pwScore = passwordScore(form.password);
  const pwMeta = STRENGTH_META[Math.min(pwScore, STRENGTH_META.length - 1)];

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-primaryText relative overflow-x-clip">
      {/* Ambient brand glows */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#0B2B26]/50 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-20 w-96 h-96 rounded-full bg-[#0B2B26]/35 blur-3xl" />

      <Navbar />

      <main className="relative flex-1 flex items-center justify-center px-4 py-10">
        <div className="glass-card w-full max-w-md rounded-3xl border border-cardBorder shadow-[0_0_60px_rgba(11,43,38,0.65)] overflow-hidden">
          {/* Brand accent strip */}
          <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-[#0B2B26] to-transparent" />

          <div className="p-6 sm:p-8 space-y-5">
            {/* Header */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-[#0B2B26] border border-white/15 flex items-center justify-center shadow-[0_0_34px_rgba(11,43,38,0.9)]">
                  <UserPlus className="w-8 h-8 text-white" />
                </div>
                <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#0B2B26] border border-white/20 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </span>
              </div>
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-black font-heading text-white tracking-wide">Join the Fan Zone</h1>
                <p className="text-[11px] sm:text-xs text-secondaryText">
                  Create your free fan account — follow teams, players & every auction live.
                </p>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2 bg-urgentRed/50 border border-urgentRed/30 rounded-xl p-3 text-xs text-urgentRedText">
                {error.includes('server') || error.includes('port') ? (
                  <Server className="w-4 h-4 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                )}
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Profile photo (optional) */}
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-surfaceHover/50 border border-borderStrong">
                <label className="relative cursor-pointer group shrink-0" title="Upload profile photo (optional)">
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Profile preview"
                      className="w-14 h-14 rounded-full object-cover border-2 border-[#0B2B26] group-hover:border-white/40 transition shadow-lg"
                    />
                  ) : (
                    <span className="w-14 h-14 rounded-full bg-surfaceHover border border-borderStrong flex items-center justify-center text-mutedText group-hover:text-white group-hover:border-[#0B2B26]/85 transition">
                      <ImagePlus className="w-5 h-5" />
                    </span>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0B2B26] border border-white/25 flex items-center justify-center group-hover:border-white/50 transition">
                    <Camera className="w-2.5 h-2.5 text-white" />
                  </span>
                </label>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-secondaryText">Profile photo</p>
                  <p className="text-[11px] text-mutedText">Optional — click the avatar to upload</p>
                </div>
              </div>

              {/* Full name */}
              <div>
                <label htmlFor="gu-reg-name" className="block text-[11px] font-semibold text-secondaryText mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedText pointer-events-none" />
                  <input
                    id="gu-reg-name"
                    type="text"
                    required
                    placeholder="e.g. Rakib Hasan"
                    value={form.name}
                    onChange={setField('name')}
                    className="glass-input w-full rounded-xl pl-10 pr-4 py-2.5 text-xs"
                  />
                </div>
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="gu-reg-email" className="block text-[11px] font-semibold text-secondaryText mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedText pointer-events-none" />
                    <input
                      id="gu-reg-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={setField('email')}
                      className="glass-input w-full rounded-xl pl-10 pr-3 py-2.5 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="gu-reg-phone" className="block text-[11px] font-semibold text-secondaryText mb-1">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedText pointer-events-none" />
                    <input
                      id="gu-reg-phone"
                      type="tel"
                      required
                      placeholder="+8801700000000"
                      value={form.phone}
                      onChange={setField('phone')}
                      className="glass-input w-full rounded-xl pl-10 pr-3 py-2.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="gu-reg-password" className="block text-[11px] font-semibold text-secondaryText mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedText pointer-events-none" />
                  <input
                    id="gu-reg-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Min 6 characters"
                    value={form.password}
                    onChange={setField('password')}
                    className="glass-input w-full rounded-xl pl-10 pr-10 py-2.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-mutedText hover:text-primaryText transition"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength meter */}
                {form.password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${i < pwScore ? pwMeta.cls : 'bg-surfaceHover'}`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-mutedText">Strength: <span className="font-bold text-secondaryText">{pwMeta.label}</span></p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label htmlFor="gu-reg-confirm" className="block text-[11px] font-semibold text-secondaryText mb-1">Confirm Password</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedText pointer-events-none" />
                  <input
                    id="gu-reg-confirm"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    value={form.confirmPassword}
                    onChange={setField('confirmPassword')}
                    className="glass-input w-full rounded-xl pl-10 pr-4 py-2.5 text-xs"
                  />
                </div>
                {form.confirmPassword && form.password === form.confirmPassword && (
                  <p className="flex items-center gap-1 text-[11px] text-white mt-1.5">
                    <CheckCircle className="w-3 h-3" /> Passwords match
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary ui-btn w-full py-3 text-xs shadow-[0_4px_20px_rgba(11,43,38,0.85)]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Create Fan Account
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-secondaryText">
              Already have an account?{' '}
              <Link to="/login" className="text-white hover:text-white font-bold">
                Login
              </Link>
            </p>

            <Link
              to="/"
              className="flex items-center justify-center gap-1.5 text-[11px] text-secondaryText hover:text-white font-semibold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to main website
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
