import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Key, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';

export default function ManagerLogin() {
  const [username, setUsername] = useState('dhaka_mgr');
  const [password, setPassword] = useState('password123');
  const [newPassword, setNewPassword] = useState('');
  const [mustReset, setMustReset] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mustReset && !newPassword.trim()) {
      setError('Please set a new password upon your first login.');
      return;
    }

    const res = await login({ username, password, role: 'manager' });
    if (res.success) {
      if (username === 'ctg_mgr' && !mustReset) {
        setMustReset(true);
        return;
      }
      navigate('/manager/dashboard');
    } else {
      setError(res.message || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-md rounded-2xl p-8 border border-slate-800 space-y-6 shadow-2xl">
          
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 flex items-center justify-center mx-auto shadow-lg">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black font-heading text-white">Team Manager War Room</h1>
            <p className="text-xs text-slate-400">Authenticated Buyer & Franchise Credentials Login</p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Username / Franchise Credential:</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="glass-input w-full px-4 py-2.5 rounded-xl text-xs"
                placeholder="e.g. dhaka_mgr"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-400">Password:</label>
                <Link to="/forgot-password" className="text-[11px] text-blue-400 hover:text-blue-300 transition font-medium">
                  Forgot Password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="glass-input w-full px-4 py-2.5 rounded-xl text-xs"
                placeholder="••••••••"
                required
              />
            </div>

            {mustReset && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Key className="w-4 h-4" /> First Login: Password Reset Required
                </p>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                  placeholder="Enter your new secure password"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <span>{mustReset ? 'Reset & Enter War Room' : 'Authenticate & Enter War Room'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <p className="font-bold text-slate-300">Quick Test Credentials:</p>
            <p>&bull; Dhaka Manager: <code className="text-emerald-400">dhaka_mgr</code></p>
            <p>&bull; Chittagong Manager (First Reset): <code className="text-amber-400">ctg_mgr</code></p>
          </div>

        </div>
      </main>
    </div>
  );
}
