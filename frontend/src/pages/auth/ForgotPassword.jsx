import  { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Mail, ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';
import { authAPI } from '../../services/api';
import Navbar from '../../components/Navbar';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [isResetDone, setIsResetDone] = useState(false);

  const handleSendResetLink = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await authAPI.forgotPassword(email);
      setSuccessMsg(res.message || 'Password reset link sent to your registered Gmail / Email address.');
      if (res.resetToken) {
        setResetToken(res.resetToken);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to send reset link. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await authAPI.resetPassword({ email, token: resetToken, newPassword });
      setIsResetDone(true);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-primaryText">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full glass-card rounded-2xl p-8 border border-cardBorder space-y-6 shadow-2xl">
          
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-warningGold/10 text-warningGold rounded-2xl border border-warningGold/20 flex items-center justify-center mx-auto shadow-lg">
              <KeyRound className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black font-heading text-white">Reset Password</h1>
            <p className="text-xs text-secondaryText">
              {isResetDone
                ? 'Your password has been reset successfully'
                : resetToken
                ? 'Enter your new password below'
                : 'Enter your registered Gmail / Email to recover access'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-urgentRed/10 border border-urgentRed/30 text-urgentRedText text-xs rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isResetDone ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 bg-neonGreen/20 text-white rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white">Password Reset Complete!</p>
              <Link
                to="/manager/login"
                className="btn-primary block w-full py-3 text-center text-xs shadow-lg"
              >
                Go to Login
              </Link>
            </div>
          ) : resetToken ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#A3A3A3] mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="glass-input w-full px-4 py-2.5 rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A3A3A3] mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="glass-input w-full px-4 py-2.5 rounded-xl text-xs"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-xs shadow-xl disabled:opacity-50"
              >
                {loading ? 'Updating Password...' : 'Set New Password'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSendResetLink} className="space-y-4">
              {successMsg && (
                <div className="p-3 bg-[#0B2B26] border border-[#0B2B26]/40 text-white text-xs rounded-xl flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#A3A3A3] mb-1">Registered Gmail / Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#666666] absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. player@gmail.com"
                    className="glass-input w-full pl-9 pr-4 py-2.5 rounded-xl text-xs"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-xs shadow-xl disabled:opacity-50"
              >
                {loading ? 'Sending Request...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="text-center pt-2">
            <Link to="/manager/login" className="inline-flex items-center gap-1.5 text-xs text-secondaryText hover:text-white transition">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
