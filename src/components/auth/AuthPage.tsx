import React, { useState } from 'react';
import { useArchive } from '../../context/ArchiveContext';
import { Logo } from '../common/Logo';
import { Lock, User, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, register, isCloudSyncActive } = useArchive();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await register(username, password);
        if (!res.success) {
          setError(res.error || 'Registration failed');
        }
      } else {
        const res = await login(username, password);
        if (!res.success) {
          setError(res.error || 'Invalid credentials');
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login('demo', 'demo123');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center px-4 py-5 pb-[max(2rem,env(safe-area-inset-bottom))] bg-[#09090b] text-[#f4f4f5]">
      <div className="w-full max-w-xs">
        <div className="flex flex-col items-center text-center mb-3">
          <Logo size="md" showTagline={false} />
        </div>

        <div className="surface-card rounded-2xl p-5 border border-white/[0.08] shadow-2xl backdrop-blur-xl space-y-4">
          <div className="grid grid-cols-2 p-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`py-2 rounded-md transition-all ${
                !isRegister
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
              className={`py-2 rounded-md transition-all ${
                isRegister
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 leading-snug">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-mono text-zinc-500 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  spellCheck="false"
                  placeholder="e.g. curator"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-black/40 border border-white/[0.08] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 font-mono transition-colors"
                />
              </div>
              <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                Letters, numbers, underscores · 3-30 chars
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-zinc-500 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-8 pr-9 py-2 rounded-lg bg-black/40 border border-white/[0.08] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 font-mono transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-zinc-500 hover:text-zinc-300 absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                Minimum 6 characters
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition-all active:scale-[0.99] disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="pt-3 border-t border-white/[0.06] text-center">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="text-[11px] text-zinc-500 hover:text-white transition-colors font-mono underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-400"
            >
              Demo account (instant preview)
            </button>
          </div>
        </div>

        {/* Cloud Status indicator */}
        <div className="mt-3.5 flex items-center justify-center gap-1.5 text-center text-[11px] font-mono">
          {isCloudSyncActive ? (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span>Cloud sync active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-zinc-500">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>Local mode</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
