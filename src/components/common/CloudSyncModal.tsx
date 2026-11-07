import React, { useState } from 'react';
import { useArchive } from '../../context/ArchiveContext';
import {
  Cloud,
  Database,
  Check,
  AlertTriangle,
  X,
  ExternalLink,
  RefreshCw,
  Server,
  Lock,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose }) => {
  const {
    isCloudSyncActive,
    mongoStatus,
    connectMongoAtlas,
    disconnectMongoAtlas,
    forceCloudSync,
    tools,
    notes,
    media,
    addToast,
  } = useArchive();

  const [mongoUri, setMongoUri] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const totalItems = tools.length + notes.length + media.length;
  const isMongo = mongoStatus?.isMongoConnected;

  const handleConnectMongo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mongoUri.trim()) return;

    setStatusMessage(null);
    setLoading(true);

    try {
      const res = await connectMongoAtlas(mongoUri.trim());
      if (res.ok) {
        setStatusMessage({
          type: 'success',
          text: 'Connected to MongoDB Atlas! Your vault is now synced directly with MongoDB.',
        });
        setMongoUri('');
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message || 'Failed to connect to MongoDB cluster.',
        });
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

  const handleDisconnectMongo = async () => {
    setLoading(true);
    try {
      await disconnectMongoAtlas();
      setStatusMessage({
        type: 'success',
        text: 'Reverted to the built-in persistent cloud store.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForceSync = async () => {
    setSyncingNow(true);
    try {
      await forceCloudSync();
      setStatusMessage({
        type: 'success',
        text: `All ${totalItems} vault items successfully synchronized with the cloud!`,
      });
    } finally {
      setSyncingNow(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg surface-elevated border border-white/[0.1] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white">
              <Cloud className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Cloud Database & Real-Time Sync</h2>
              <p className="text-[11px] text-zinc-400 font-mono">
                Cross-device synchronization across browsers & devices
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
        <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-300 text-xs font-mono space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-semibold text-white">
                {isMongo ? 'MongoDB Atlas Cloud Active' : 'Persistent Cloud Storage Active'}
              </span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Real-Time
            </span>
          </div>
          <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
            Data is automatically saved to the cloud and continuously synced in the background. Changes reflect instantly on any device or browser without refresh or lag.
          </p>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <span className="text-[10px] font-mono uppercase text-zinc-500 block">Tools</span>
            <span className="text-sm font-semibold text-white font-mono">{tools.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <span className="text-[10px] font-mono uppercase text-zinc-500 block">Notes</span>
            <span className="text-sm font-semibold text-white font-mono">{notes.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <span className="text-[10px] font-mono uppercase text-zinc-500 block">Watchlist</span>
            <span className="text-sm font-semibold text-white font-mono">{media.length}</span>
          </div>
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

        {/* Quick Sync Action */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-medium text-white block">Manual Force Sync</span>
            <span className="text-[11px] text-zinc-400">Push immediate snapshot to all connected clients</span>
          </div>
          <button
            type="button"
            onClick={handleForceSync}
            disabled={syncingNow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-mono text-zinc-200 border border-white/[0.1] transition-colors shrink-0 disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingNow ? 'animate-spin' : ''}`} />
            <span>Sync Now</span>
          </button>
        </div>

        {/* Optional MongoDB Atlas Connection */}
        <div className="pt-2 border-t border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>MongoDB Atlas Integration</span>
            </div>
            {isMongo && (
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Connected
              </span>
            )}
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            By default, your data is securely stored in the cloud engine. You can optionally connect your own free MongoDB Atlas cluster to store your vault documents directly in MongoDB.
          </p>

          {isMongo && mongoStatus?.mongoUriMasked && (
            <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.08] flex items-center justify-between gap-2 text-xs font-mono">
              <span className="text-zinc-400 truncate">{mongoStatus.mongoUriMasked}</span>
              <button
                type="button"
                onClick={handleDisconnectMongo}
                disabled={loading}
                className="text-[11px] text-red-400 hover:text-red-300 underline shrink-0"
              >
                Disconnect
              </button>
            </div>
          )}

          <form onSubmit={handleConnectMongo} className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                MongoDB Connection String (URI)
              </label>
              <div className="relative">
                <Server className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="mongodb+srv://username:password@cluster.mongodb.net/0arc_vault"
                  value={mongoUri}
                  onChange={(e) => setMongoUri(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-black/40 border border-white/[0.08] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 font-mono"
                />
              </div>
              <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">
                Free cluster URI from cloud.mongodb.com
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !mongoUri.trim()}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition-all disabled:opacity-40"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
              <span>{isMongo ? 'Switch MongoDB Cluster' : 'Connect MongoDB Atlas'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
