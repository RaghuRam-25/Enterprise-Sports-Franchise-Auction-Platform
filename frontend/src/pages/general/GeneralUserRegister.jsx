import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, AlertCircle, Server, ArrowLeft, ImagePlus, CheckCircle } from 'lucide-react';
import Navbar from '../../components/Navbar';
import { useAuth, getDashboardForRole } from '../../context/AuthContext';
import { authAPI } from '../../services/api';

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

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="glass-card w-full max-w-md rounded-2xl p-8 border border-slate-800 space-y-6 shadow-2xl">
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 bg-sky-500/10 text-sky-400 rounded-2xl border border-sky-500/20 flex items-center justify-center">
              <UserPlus className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Join the Fan Zone</h1>
              <p className="text-xs text-slate-400 mt-1">
                Free spectator account — no approval needed. Follow live auctions, matches and your favourite teams.
              </p>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 bg-rose-950/50 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300">
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
            <div className="flex items-center gap-3">
              <label className="relative cursor-pointer group shrink-0" title="Upload profile photo (optional)">
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile preview" className="w-12 h-12 rounded-full object-cover border-2 border-sky-500/40" />
                ) : (
                  <span className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 group-hover:text-sky-400 group-hover:border-sky-500/40 transition">
                    <ImagePlus className="w-5 h-5" />
                  </span>
                )}
              </label>
              <p className="text-[11px] text-slate-500">Profile photo (optional)</p>
            </div>

            <div>
              <label htmlFor="gu-reg-name" className="block text-[11px] font-semibold text-slate-400 mb-1">Full Name</label>
              <input
                id="gu-reg-name"
                type="text"
                required
                placeholder="e.g. Rakib Hasan"
                value={form.name}
                onChange={setField('name')}
                className="glass-input w-full rounded-xl px-4 py-2.5 text-xs"
              />
            </div>

            <div>
              <label htmlFor="gu-reg-email" className="block text-[11px] font-semibold text-slate-400 mb-1">Email</label>
              <input
                id="gu-reg-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={setField('email')}
                className="glass-input w-full rounded-xl px-4 py-2.5 text-xs"
              />
            </div>

            <div>
              <label htmlFor="gu-reg-phone" className="block text-[11px] font-semibold text-slate-400 mb-1">Mobile Phone Number</label>
              <input
                id="gu-reg-phone"
                type="tel"
                required
                placeholder="e.g. +8801700000000"
                value={form.phone}
                onChange={setField('phone')}
                className="glass-input w-full rounded-xl px-4 py-2.5 text-xs"
              />
            </div>

            <div>
              <label htmlFor="gu-reg-password" className="block text-[11px] font-semibold text-slate-400 mb-1">Password</label>
              <div className="relative">
                <input
                  id="gu-reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={setField('password')}
                  className="glass-input w-full rounded-xl px-4 py-2.5 text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="gu-reg-confirm" className="block text-[11px] font-semibold text-slate-400 mb-1">Confirm Password</label>
              <input
                id="gu-reg-confirm"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={setField('confirmPassword')}
                className="glass-input w-full rounded-xl px-4 py-2.5 text-xs"
              />
              {form.confirmPassword && form.password === form.confirmPassword && (
                <p className="flex items-center gap-1 text-[11px] text-emerald-400 mt-1">
                  <CheckCircle className="w-3 h-3" /> Passwords match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-xs shadow-lg"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

          <p className="text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-sky-400 hover:text-sky-300 font-bold">
              Login
            </Link>
          </p>

          <Link
            to="/"
            className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 font-semibold transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to main website
          </Link>
        </div>
      </main>
    </div>
  );
}
