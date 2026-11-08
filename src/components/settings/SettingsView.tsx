import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useArchive } from '../../context/ArchiveContext';
import {
  Shield,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  FileJson,
  AlertTriangle,
  Check,
  Wrench,
  FileText,
  Film,
  Cloud,
  HardDrive,
} from 'lucide-react';
import { NavigationTab } from '../../types';
import { fetchStorageUsage, type StorageUsage } from '../../utils/cloudSync';

const FREE_PLAN_LIMIT_BYTES = 512 * 1024 * 1024;

/** 1.4 MB / 512 MB — short, readable sizes. */
const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : value >= 100 ? 0 : 1)} ${units[exponent]}`;
};

const utf8Bytes = (value: unknown): number =>
  new TextEncoder().encode(JSON.stringify(value ?? null)).length;

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    tools,
    notes,
    media,
    exportAllJSON,
    exportCollectionJSON,
    importJSON,
    clearAllData,
    resetToSampleData,
    addToast,
    isCloudSyncActive,
    mongoStatus,
  } = useArchive();

  // Import state
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear modal state
  const [showClearModal, setShowClearModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  // Storage allowance against the MongoDB Atlas free plan
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchStorageUsage().then((usage) => {
      if (mounted) setStorageUsage(usage);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const storage = useMemo(() => {
    if (storageUsage) {
      return {
        usedBytes: storageUsage.usedBytes,
        limitBytes: storageUsage.limitBytes,
        remainingBytes: storageUsage.remainingBytes,
        percentUsed: storageUsage.percentUsed,
        breakdown: storageUsage.breakdown,
        measuredLive: storageUsage.measuredBy === 'atlas-dbstats',
      };
    }

    // Fallback when the API is unreachable: measure the vault saved in this browser.
    const breakdown = [
      { label: 'Tools', bytes: utf8Bytes(tools), count: tools.length },
      { label: 'Notes', bytes: utf8Bytes(notes), count: notes.length },
      { label: 'Watchlist', bytes: utf8Bytes(media), count: media.length },
      { label: 'Settings', bytes: utf8Bytes(settings), count: 1 },
    ];
    const usedBytes = breakdown.reduce((sum, entry) => sum + entry.bytes, 0);

    return {
      usedBytes,
      limitBytes: FREE_PLAN_LIMIT_BYTES,
      remainingBytes: Math.max(0, FREE_PLAN_LIMIT_BYTES - usedBytes),
      percentUsed: (usedBytes / FREE_PLAN_LIMIT_BYTES) * 100,
      breakdown,
      measuredLive: false,
    };
  }, [storageUsage, tools, notes, media, settings]);

  const storageBarWidth = Math.min(
    100,
    Math.max(storage.usedBytes > 0 ? 1 : 0, storage.percentUsed)
  );

  const totalItems = tools.length + notes.length + media.length;

  const handleConfirmToggle = (checked: boolean) => {
    updateSettings({ confirmBeforeDelete: checked });
  };

  const handleDefaultViewChange = (tab: NavigationTab) => {
    updateSettings({ defaultArchiveView: tab });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) {
        setImportError('File is empty.');
        return;
      }

      const result = importJSON(content, importMode);
      if (result.success) {
        setImportSuccess(result.message);
      } else {
        setImportError(result.message);
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.onerror = () => {
      setImportError('Failed to read selected file.');
    };

    reader.readAsText(file);
  };

  const handleExecuteClear = () => {
    if (confirmInput.trim().toUpperCase() === 'CLEAR') {
      clearAllData();
      setShowClearModal(false);
      setConfirmInput('');
    } else {
      addToast('Confirmation Failed', 'error', 'Type CLEAR to confirm deletion.');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl animate-in fade-in duration-150 pb-8">
      {/* Header */}
      <div className="pb-4 border-b border-white/[0.06]">
        <h1 className="text-xl font-semibold text-white tracking-tight">
          Settings
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Vault preferences and data management for your private archive.
        </p>
      </div>

      {/* Cloud Sync & Database */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <Cloud className="w-3.5 h-3.5 text-zinc-400" />
          <span>Cloud Sync & Database</span>
        </div>

        <div className="surface-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isCloudSyncActive ? 'bg-white animate-pulse' : 'bg-zinc-600'
                }`}
              />
              <span className="text-xs font-mono font-medium text-white">
                {isCloudSyncActive ? 'Real-Time Cross-Device Sync Active' : 'Offline / Local Mode'}
              </span>
              <span className="text-[10px] bg-white/[0.06] text-zinc-300 px-2 py-0.5 rounded font-mono border border-white/[0.08]">
                {mongoStatus?.isMongoConnected ? 'MongoDB Atlas' : 'Persistent Cloud Store'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Synchronizing automatically in the background across browsers and devices with 0ms lag.
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[11px] font-mono text-zinc-300">Automatic background saving</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">MongoDB Atlas</p>
          </div>
        </div>
      </div>

      {/* Storage Usage vs MongoDB free plan */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
          <span>Storage</span>
        </div>

        <div className="surface-card rounded-xl p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-mono text-zinc-500">MongoDB Atlas · M0 free plan</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-semibold font-mono tabular-nums text-white">
                  {formatBytes(storage.usedBytes)}
                </span>
                <span className="text-[11px] font-mono text-zinc-500">
                  of {formatBytes(storage.limitBytes)} used
                </span>
              </div>
            </div>

            <span className="shrink-0 px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.04] text-[10px] font-mono text-zinc-300 tabular-nums">
              {storage.percentUsed > 0 && storage.percentUsed < 1
                ? '<1%'
                : `${storage.percentUsed.toFixed(1)}%`}
            </span>
          </div>

          <div className="w-full h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-white/80"
              style={{ width: `${storageBarWidth}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-mono">
            <span className="text-zinc-200">
              {formatBytes(storage.remainingBytes)} still available
            </span>
            <span className="text-zinc-500">
              {storage.measuredLive ? 'Live from Atlas' : 'Estimated from saved data'}
            </span>
          </div>

          <div className="pt-3 border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-3">
            {storage.breakdown.map((entry) => (
              <div key={entry.label}>
                <p className="text-[10px] font-mono text-zinc-500">
                  {entry.label} <span className="text-zinc-600">({entry.count})</span>
                </p>
                <p className="text-[11px] font-mono text-zinc-200 tabular-nums mt-0.5">
                  {formatBytes(entry.bytes)}
                </p>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Atlas M0 clusters include 512 MB of free storage. This covers everything saved in your vault;
            Atlas also counts indexes and cluster overhead.
          </p>
        </div>
      </div>

      {/* 1. Vault Preferences Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <Shield className="w-3.5 h-3.5 text-zinc-400" />
          <span>Vault Preferences</span>
        </div>

        <div className="surface-card rounded-xl p-4 space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
              Default View on Launch
            </label>
            <select
              value={settings.defaultArchiveView}
              onChange={(e) => handleDefaultViewChange(e.target.value as NavigationTab)}
              className="w-full sm:w-64 px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.08] text-xs font-mono text-white focus:outline-none focus:border-white/30"
            >
              <option value="overview">Overview</option>
              <option value="tools">Tools & Resources</option>
              <option value="notes">Personal Notes</option>
              <option value="watchlist">Watchlist</option>
              <option value="images">Images</option>
              <option value="favorites">Favorites</option>
            </select>
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white">Confirm Deletions</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Display safety confirmation dialog before deleting an archive item.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={settings.confirmBeforeDelete}
              aria-label="Confirm deletions"
              onClick={() => handleConfirmToggle(!settings.confirmBeforeDelete)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                settings.confirmBeforeDelete ? 'bg-white' : 'bg-white/[0.1]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                  settings.confirmBeforeDelete ? 'bg-black translate-x-5' : 'bg-zinc-400 translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Export Data Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <Download className="w-3.5 h-3.5 text-zinc-400" />
          <span>Export Data</span>
        </div>

        <div className="surface-card rounded-xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold text-white">Complete Archive Snapshot</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Download a clean JSON backup file containing all {totalItems} items.
              </p>
            </div>

            <button
              onClick={exportAllJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-medium transition-colors shrink-0"
            >
              <Download className="w-3 h-3" />
              <span>Download JSON</span>
            </button>
          </div>

          {/* Export Individual Sections */}
          <div className="pt-3 border-t border-white/[0.06]">
            <p className="text-[11px] font-mono text-zinc-500 mb-2">Export by Section:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => exportCollectionJSON('tools')}
                className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] text-xs text-zinc-300 hover:text-white border border-white/[0.06] transition-colors font-mono text-[11px]"
              >
                <Wrench className="w-3 h-3 text-zinc-400" />
                <span>Tools JSON</span>
              </button>
              <button
                onClick={() => exportCollectionJSON('notes')}
                className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] text-xs text-zinc-300 hover:text-white border border-white/[0.06] transition-colors font-mono text-[11px]"
              >
                <FileText className="w-3 h-3 text-zinc-400" />
                <span>Notes JSON</span>
              </button>
              <button
                onClick={() => exportCollectionJSON('watchlist')}
                className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] text-xs text-zinc-300 hover:text-white border border-white/[0.06] transition-colors font-mono text-[11px]"
              >
                <Film className="w-3 h-3 text-zinc-400" />
                <span>Watchlist JSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Import Data Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <Upload className="w-3.5 h-3.5 text-zinc-400" />
          <span>Import Data</span>
        </div>

        <div className="surface-card rounded-xl p-4 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-white">Restore from Backup</h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Load an existing 0arc JSON file into your active account.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <span className="text-[11px] font-mono text-zinc-400">Mode:</span>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-zinc-200">
                <input
                  type="radio"
                  name="import-mode"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="accent-white"
                />
                <span className="text-xs">Merge (keep existing)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-zinc-200">
                <input
                  type="radio"
                  name="import-mode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="accent-white"
                />
                <span className="text-xs text-zinc-300">Replace All</span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
              id="json-file-picker"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1] text-xs font-mono transition-colors"
            >
              <FileJson className="w-3.5 h-3.5 text-zinc-400" />
              <span>Select JSON File</span>
            </button>
            <span className="text-[11px] font-mono text-zinc-500">.json snapshots</span>
          </div>

          {importSuccess && (
            <div className="p-3 rounded-lg bg-white/[0.05] border border-white/[0.12] text-xs text-zinc-100 flex items-center gap-2 font-mono">
              <Check className="w-4 h-4 shrink-0" />
              <span>{importSuccess}</span>
            </div>
          )}

          {importError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2 font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Danger Zone Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span>Danger Zone</span>
        </div>

        <div className="surface-card rounded-xl p-4 space-y-4 border-red-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold text-white">Reset to Curated Sample Vault</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Restores the standard sample set of tools, notes, and watchlist items.
              </p>
            </div>

            <button
              onClick={resetToSampleData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] text-xs font-mono text-zinc-200 transition-colors shrink-0"
            >
              <RotateCcw className="w-3 h-3 text-zinc-400" />
              <span>Restore Samples</span>
            </button>
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold text-red-400">Clear All Vault Data</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Permanently wipes all saved items from your account.
              </p>
            </div>

            <button
              onClick={() => {
                setConfirmInput('');
                setShowClearModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-mono text-red-400 transition-colors shrink-0"
            >
              <Trash2 className="w-3 h-3" />
              <span>Erase All</span>
            </button>
          </div>
        </div>
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4 animate-in fade-in duration-150">
          <div className="w-full sm:max-w-md surface-elevated border border-red-500/30 rounded-t-2xl sm:rounded-xl p-5 sm:p-6 shadow-2xl space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Erase Vault Data?</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  This action cannot be undone. All entries in your account will be permanently deleted.
                </p>
              </div>
            </div>

            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
              <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">
                Type <span className="text-red-400 font-bold">CLEAR</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="CLEAR"
                className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.1] text-xs font-mono text-white uppercase tracking-wider focus:outline-none focus:border-red-400"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="flex-1 sm:flex-none px-3 py-2.5 sm:py-1.5 text-xs text-zinc-400 hover:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteClear}
                disabled={confirmInput.trim().toUpperCase() !== 'CLEAR'}
                className="flex-1 sm:flex-none px-3.5 py-2.5 sm:py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-500 disabled:opacity-40 rounded-lg transition-colors"
              >
                Permanently Erase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
