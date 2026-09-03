import { useState, useEffect } from 'react';
import { X, Loader2, Mail, Lock, User as UserIcon, KeyRound, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type Mode = 'login' | 'signup';

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsGuest, exchangeAuthCode } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Manual code paste helper for when Supabase redirects to an old 404 URL
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const currentRedirectUrl = `${window.location.origin}/auth/callback`;

  useEffect(() => {
    if (!open) {
      setError(null);
      setEmail('');
      setPassword('');
      setLoading(false);
      setShowCodeInput(false);
      setAuthCode('');
    }
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await signInWithGoogle();
      if (!res.success) {
        setLoading(false);
        if (res.error === 'POPUP_BLOCKED') {
          setError('Pop-up window was blocked by your browser. Please allow pop-ups for this window, or tap "Quick Demo Access" below.');
        } else {
          setError(res.error || 'Could not start Google sign-in. Please try again.');
        }
      } else {
        // Modal will close automatically once session is established
        setTimeout(() => setLoading(false), 2500);
      }
    } catch {
      setLoading(false);
      setError('Could not start Google sign-in. Please try again or use Quick Demo Access.');
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authCode.trim()) return;
    setCodeLoading(true);
    setError(null);
    const res = await exchangeAuthCode(authCode.trim());
    setCodeLoading(false);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Could not verify this code. Please try again.');
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentRedirectUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Fallback if clipboard API restricted
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const result = mode === 'login'
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-saathi-900/50 backdrop-blur-sm" />
      <div
        className="relative hero-box p-8 max-w-md w-full animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-lg text-saathi-400 hover:bg-saathi-50 hover:text-saathi-600 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 rounded-2xl bg-saathi-50 flex items-center justify-center mx-auto mb-5 overflow-hidden">
          <img src="/Logo/Logo.png" alt="Saathi logo" className="w-full h-full object-cover" />
        </div>

        <h2 className="text-xl font-bold text-saathi-900 mb-1 text-center">
          {mode === 'login' ? 'Welcome back to Saathi' : 'Create your Saathi account'}
        </h2>
        <p className="text-saathi-600 text-sm mb-6 text-center">
          {mode === 'login'
            ? 'Sign in to access your farming tools'
            : 'Join thousands of farmers using Saathi'}
        </p>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-3 bg-white border-2 border-saathi-100 text-saathi-800 font-semibold px-6 py-3 rounded-xl hover:border-saathi-300 hover:bg-saathi-50 active:scale-95 transition-all duration-200 disabled:opacity-60 mb-4"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-saathi-500" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          Continue with Google
        </button>

        <button
          onClick={() => {
            signInAsGuest();
            onClose();
          }}
          type="button"
          className="w-full inline-flex items-center justify-center gap-2 bg-saathi-50 border border-saathi-200 text-saathi-700 font-medium px-4 py-2.5 rounded-xl hover:bg-saathi-100 active:scale-95 transition-all text-sm mb-3"
        >
          <span>🌱</span>
          Quick Demo Access (Explore as Farmer)
        </button>

        {/* 404 Codespace Redirect Recovery */}
        <div className="mb-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-left">
          <button
            type="button"
            onClick={() => setShowCodeInput(!showCodeInput)}
            className="w-full flex items-center justify-between text-xs font-semibold text-emerald-800 hover:text-emerald-900"
          >
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
              Saw 404 on congenial-yodel page? Tap here
            </span>
            {showCodeInput ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showCodeInput && (
            <div className="mt-2.5 pt-2.5 border-t border-emerald-200/70 space-y-2.5 text-xs text-emerald-900">
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Copy the URL from that 404 window address bar (or the <code>code=...</code> value) and paste it below to instantly complete login:
              </p>
              <form onSubmit={handleCodeSubmit} className="space-y-2">
                <input
                  type="text"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="Paste URL (https://.../?code=...) or code"
                  className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={codeLoading || !authCode.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  {codeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Verify & Complete Sign In
                </button>
              </form>

              <div className="pt-2 border-t border-emerald-200/60">
                <p className="text-[10px] text-emerald-700 mb-1 font-semibold">To fix permanently in Supabase Dashboard:</p>
                <div className="flex items-center justify-between gap-2 bg-white/80 p-1.5 rounded border border-emerald-200 text-[10px]">
                  <span className="truncate font-mono text-emerald-900">{currentRedirectUrl}</span>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="shrink-0 text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 text-[10px]"
                  >
                    {copiedUrl ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedUrl ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-saathi-100" />
          <span className="text-saathi-400 text-xs font-medium">OR</span>
          <div className="flex-1 h-px bg-saathi-100" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-saathi-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="input-field pl-10"
              autoComplete="email"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-saathi-400" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              className="input-field pl-10"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-accent w-full disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <UserIcon className="w-5 h-5" />
            )}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-saathi-500 text-sm mt-4">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
            className="text-saathi-600 font-semibold hover:text-saathi-700 transition-colors"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
