import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, ArrowRight, UserPlus } from 'lucide-react';
import { useAuth, getDashboardForRole } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';

export default function PlayerLogin() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Auto redirect if already logged in
  useEffect(() => {
    if (user) {
      const target = getDashboardForRole(user.role);
      navigate(target, { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login({ username: identifier, password, role: 'player' });
      if (res.success && res.user) {
        const targetDashboard = getDashboardForRole(res.user.role);
        navigate(targetDashboard, { replace: true });
      } else {
        setError(res?.message || 'Authentication failed. Check your credentials.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4">
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 50% 35% at 50% 25%, rgba(168,85,247,0.07) 0%, transparent 70%)'
          }}
        />

        <div className="relative glass-card w-full max-w-md rounded-2xl p-8 border border-slate-800 space-y-6 shadow-2xl">

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20 flex items-center justify-center mx-auto shadow-lg">
              <User className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black font-heading text-white">Player Portal</h1>
            <p className="text-xs text-slate-400">Sign in with your registered player credentials</p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Email / Student ID:
              </label>
              <input
                id="player-login-identifier"
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                className="glass-input w-full px-4 py-2.5 rounded-xl text-xs"
                placeholder="Enter your email or student ID"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-400">Password:</label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-purple-400 hover:text-purple-300 transition font-medium"
                >
                  Forgot Password?
                </Link>
              </div>
              <input
                id="player-login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="glass-input w-full px-4 py-2.5 rounded-xl text-xs"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              id="player-login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-lg shadow-purple-500/20 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Player Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Register CTA */}
          <div className="pt-2 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-500">
              Not registered yet?{' '}
              <Link
                to="/player/register"
                className="text-purple-400 hover:text-purple-300 font-semibold transition inline-flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" />
                Register Now
              </Link>
            </p>
          </div>

          {/* Manager login redirect */}
          <p className="text-center text-[11px] text-slate-600">
            Team Manager or Official?{' '}
            <Link to="/manager/login" className="text-emerald-500 hover:text-emerald-400 transition font-medium">
              Go to Manager / Official Login
            </Link>
          </p>

        </div>
      </main>
    </div>
  );
}
