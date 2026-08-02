import  { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield, LogIn, Eye, EyeOff,
  AlertCircle, Server, Loader2
} from 'lucide-react';
import { useAuth, getDashboardForRole } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';

export default function ManagerLogin() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();

  // If already logged in redirect to correct dashboard
  useEffect(() => {
    if (user) {
      navigate(getDashboardForRole(user.role), { replace: true });
    }
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
        const targetPath = getDashboardForRole(res.user.role);
        navigate(targetPath, { replace: true });
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
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-md rounded-2xl p-8 border border-slate-800 space-y-6 shadow-2xl">

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 flex items-center justify-center mx-auto shadow-lg">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black font-heading text-white">Auction Platform Login</h1>
            <p className="text-xs text-slate-400">Enter your credentials to access your assigned dashboard</p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl font-medium flex items-start gap-2">
              {error.includes('server') || error.includes('port 5000')
                ? <Server className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              }
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
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
                <label className="block text-xs font-semibold text-slate-400">Password</label>
                <Link to="/forgot-password" className="text-[11px] text-blue-400 hover:text-blue-300 transition font-medium">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
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
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating...</>
                : <><LogIn className="w-4 h-4" /> Authenticate &amp; Enter Portal</>
              }
            </button>
          </form>

          {/* Credential hints for development */}
          <details className="group">
            <summary className="text-[11px] text-slate-500 cursor-pointer hover:text-slate-400 transition select-none">
              🔑 Default test credentials (dev only)
            </summary>
            <div className="mt-3 space-y-1.5 text-[11px]">
              {[
                { role: 'SUPER_ADMIN',  email: 'superadmin@auction.com', pw: 'Admin@1234',   color: 'text-blue-400' },
                { role: 'PODIUM_ADMIN', email: 'podium@auction.com',     pw: 'Podium@1234',  color: 'text-rose-400' },
                { role: 'TEAM_MANAGER', email: 'manager@auction.com',    pw: 'Manager@1234', color: 'text-emerald-400' },
                { role: 'PLAYER',       email: 'player@auction.com',     pw: 'Player@1234',  color: 'text-purple-400' },
              ].map(c => (
                <button
                  key={c.role}
                  type="button"
                  onClick={() => { setEmail(c.email); setPassword(c.pw); setError(''); }}
                  className="w-full text-left p-2 bg-slate-900/60 hover:bg-slate-800/80 rounded-lg border border-slate-800 transition flex items-center justify-between group"
                >
                  <span className={`font-bold font-mono ${c.color}`}>{c.role}</span>
                  <span className="text-slate-500 group-hover:text-slate-300 transition">{c.email}</span>
                </button>
              ))}
              <p className="text-slate-600 text-center pt-1">
                Run <code className="text-slate-400">node src/scripts/seedUsers.js</code> in backend first
              </p>
            </div>
          </details>

          {/* Player registration link */}
          <p className="text-center text-xs text-slate-500">
            Registering as a player?{' '}
            <Link to="/player/register" className="text-purple-400 hover:text-purple-300 font-semibold transition">
              Player Registration →
            </Link>
          </p>

        </div>
      </main>
    </div>
  );
}
