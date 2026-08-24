import  { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Shield, LogIn, Eye, EyeOff,
  AlertCircle, Server, Loader2, UserPlus
} from 'lucide-react';
import { useAuth, getDashboardForRole } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';

// Where each role is allowed to land. Mirrors the App.jsx route table so a
// stale "return to" path from a PREVIOUS session/role never dumps a freshly
// logged-in user onto a route their new role cannot access (Access Denied).
const ROLE_ALLOWED_PREFIXES = {
  SUPER_ADMIN: ['/admin', '/podium', '/manager', '/player'],
  PODIUM_ADMIN: ['/podium', '/manager', '/player'],
  TEAM_MANAGER: ['/manager'],
  PLAYER: ['/player'],
  GENERAL_USER: ['/general'],
};

// Public, no-auth sections every signed-in role may browse.
const PUBLIC_PREFIXES = ['/matches', '/live', '/players', '/teams', '/about'];

const isPathAllowedForRole = (pathname, role) => {
  if (!pathname || pathname === '/login') return false;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  const allowed = ROLE_ALLOWED_PREFIXES[role] || [];
  return allowed.some((p) => pathname === p || pathname.startsWith(`${p}/`));
};

export default function ManagerLogin() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Where the user was actually headed when auth intercepted them
  // (ProtectedRoute stores it in location.state.from). Only honored when the
  // logged-in role may actually access it — otherwise the role dashboard.
  const resolvePostLoginPath = (role) => {
    const from = location.state?.from?.pathname;
    if (from && isPathAllowedForRole(from, role)) return from;
    return getDashboardForRole(role);
  };

  // If already logged in redirect to correct dashboard
  useEffect(() => {
    if (user) {
      navigate(resolvePostLoginPath(user.role), { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Pass credentials directly — AuthContext handles all role resolution
      // from the backend JWT.  No role is inferred here.
      const res = await login({ email: email.trim(), password });

      if (res?.success && res?.user) {
        navigate(resolvePostLoginPath(res.user.role), { replace: true });
      } else {
        setError(res?.message || 'Authentication failed. Check your credentials.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-primaryText">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-md rounded-2xl p-8 border border-cardBorder space-y-6 shadow-2xl">

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-neonGreen/10 text-white rounded-2xl border border-neonGreen/20 flex items-center justify-center mx-auto shadow-lg">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black font-heading text-white">Auction Platform Login</h1>
            <p className="text-xs text-secondaryText">Enter your credentials to access your assigned dashboard</p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-urgentRed/10 border border-urgentRed/30 text-urgentRedText text-xs rounded-xl font-medium flex items-start gap-2">
              {error.includes('server') || error.includes('port 5000')
                ? <Server className="w-4 h-4 flex-shrink-0 mt-0.5 text-warningGold" />
                : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              }
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-secondaryText mb-1">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="glass-input w-full px-4 py-2.5 rounded-xl text-xs"
                placeholder="e.g. superadmin@auction.com"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-secondaryText">Password</label>
                <Link to="/forgot-password" className="text-[11px] text-white hover:text-white transition font-medium">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="glass-input w-full px-4 py-2.5 pr-10 rounded-xl text-xs"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondaryText hover:text-white transition"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-xs shadow-xl flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating...</>
                : <><LogIn className="w-4 h-4" /> Authenticate &amp; Enter Portal</>
              }
            </button>
          </form>

          {/* General User Registration */}
          <Link
            to="/general/register"
            className="w-full py-3 flex items-center justify-center gap-2 rounded-xl border border-neonGreen/30 bg-[#0B2B26]/25 text-white text-xs font-bold uppercase tracking-wider hover:bg-[#0B2B26]/45 hover:border-[#0B2B26]/60 transition"
          >
            <UserPlus className="w-4 h-4" />
            General Register
          </Link>



        </div>
      </main>
    </div>
  );
}
