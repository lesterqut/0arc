import React, { useState } from 'react';
import { useArchive } from '../../context/ArchiveContext';
import { getSupabaseConfig, testSupabaseConnection } from '../../utils/supabase';
import {
  Cloud,
  Database,
  Check,
  AlertTriangle,
  X,
  ExternalLink,
  Copy,
  CheckCheck,
  RefreshCw,
  Server,
  Lock,
} from 'lucide-react';

interface SupabaseConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUPABASE_SCHEMA_SQL = `-- 0arc v1 database schema for Supabase
-- Run this once in the Supabase Dashboard -> SQL Editor

-- 1. Master Vaults Table (Per-user synchronized personal archive)
create table if not exists "0arc_vaults" (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  username     text not null,
  tools        jsonb not null default '[]'::jsonb,
  notes        jsonb not null default '[]'::jsonb,
  media        jsonb not null default '[]'::jsonb,
  settings     jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

alter table "0arc_vaults" enable row level security;

drop policy if exists "vaults: owner full access" on "0arc_vaults";
create policy "vaults: owner full access"
on "0arc_vaults" for all
using ( auth.uid() = user_id )
with check ( auth.uid() = user_id );

-- 2. User Profiles Table
create table if not exists "0arc_users" (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null,
  created_at timestamptz not null default now()
);

alter table "0arc_users" enable row level security;

drop policy if exists "Users: owner reads/writes own profile" on "0arc_users";
create policy "Users: owner reads/writes own profile"
on "0arc_users" for all
using ( auth.uid() = id )
with check ( auth.uid() = id );
`;

export const SupabaseConnectModal: React.FC<SupabaseConnectModalProps> = ({ isOpen, onClose }) => {
  const { isCloudSyncActive, connectSupabase, disconnectSupabase, addToast } = useArchive();
  const currentConfig = getSupabaseConfig();

  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setLoading(true);

    try {
      const res = await connectSupabase(url, anonKey);
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Connected to Supabase! Cross-device sync is now active.' });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to connect to Supabase.' });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Connection failed.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await testSupabaseConnection(url, anonKey);
      if (res.ok) {
        setStatusMessage({ type: 'success', text: 'Connection successful! Project is reachable.' });
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Test failed.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    disconnectSupabase();
    setUrl('');
    setAnonKey('');
    setStatusMessage({ type: 'success', text: 'Supabase disconnected. Using local storage.' });
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    addToast('SQL Copied', 'success', 'Paste and run in your Supabase SQL Editor.');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg surface-elevated border border-white/[0.1] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white">
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Supabase Database</h2>
              <p className="text-[11px] text-zinc-400 font-mono">
                {isCloudSyncActive ? 'Connected' : 'Configure connection'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Status Banner */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-mono ${
            isCloudSyncActive
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isCloudSyncActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="truncate">
              {isCloudSyncActive
                ? `Connected: ${currentConfig.url.replace(/^https?:\/\//, '')}`
                : 'Local Mode (Data saved on this browser only)'}
            </span>
          </div>

          {isCloudSyncActive && (
            <button
              onClick={handleDisconnect}
              className="text-[10px] text-zinc-400 hover:text-red-400 uppercase tracking-wider underline shrink-0"
            >
              Disconnect
            </button>
          )}
        </div>

        {/* Info card */}
        <div className="text-xs text-zinc-300 bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 space-y-1.5">
          <p className="text-zinc-200 font-medium">Why connect Supabase?</p>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            With Supabase connected, your accounts and vault entries (watchlist, notes, tools, settings) are safely stored in your own Supabase project. You can log in on your phone, laptop, or any new browser and access your exact synchronized archive.
          </p>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-red-500/10 border-red-500/20 text-red-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Connection Form */}
        <form onSubmit={handleConnect} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">
              Supabase Project URL
            </label>
            <div className="relative">
              <Server className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                required
                placeholder="https://your-project.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-black/40 border border-white/[0.08] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 font-mono"
              />
            </div>
            <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">
              Found in Project Settings &rarr; API &rarr; Project URL
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">
              Supabase Anon / Public Key (or Service Role Key)
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="eyJhbGciOi..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-black/40 border border-white/[0.08] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 font-mono"
              />
            </div>
            <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">
              Found in Project Settings &rarr; API &rarr; Project API keys (`anon` `public`)
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={loading || !url || !anonKey}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition-all disabled:opacity-40"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
              <span>{isCloudSyncActive ? 'Update Credentials' : 'Connect & Sync'}</span>
            </button>

            <button
              type="button"
              onClick={handleTest}
              disabled={loading || !url || !anonKey}
              className="px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-mono text-zinc-200 border border-white/[0.1] transition-colors disabled:opacity-40"
            >
              Test Ping
            </button>
          </div>
        </form>

        {/* SQL Schema helper toggle */}
        <div className="pt-2 border-t border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowSql(!showSql)}
              className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <span>{showSql ? 'Hide SQL Setup Script' : 'View SQL Setup Script (for Supabase SQL Editor)'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopySql}
              className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-white px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] transition-colors"
            >
              {copiedSql ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
            </button>
          </div>

          {showSql && (
            <div className="relative rounded-lg bg-black/60 border border-white/[0.08] p-3 text-[10px] font-mono text-zinc-300 overflow-x-auto max-h-48">
              <pre>{SUPABASE_SCHEMA_SQL}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
