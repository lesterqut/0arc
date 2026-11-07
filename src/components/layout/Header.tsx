import React from 'react';
import { useArchive } from '../../context/ArchiveContext';
import { Search, Plus, Cloud } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activeTab,
    openSearchModal,
    openQuickAdd,
    openCloudModal,
    isCloudSyncActive,
    mongoStatus,
    tools,
    notes,
    media,
  } = useArchive();

  const breadcrumbLabels: Record<string, { title: string; count?: number }> = {
    overview: { title: 'Overview', count: tools.length + notes.length + media.length },
    favorites: { title: 'Favorites' },
    tools: { title: 'Tools & Resources', count: tools.length },
    notes: { title: 'Notes', count: notes.length },
    watchlist: { title: 'Watchlist', count: media.length },
    settings: { title: 'Settings' },
  };

  const current = breadcrumbLabels[activeTab] || { title: 'Archive' };

  return (
    <header className="h-12 shrink-0 border-b border-white/[0.06] bg-[#0c0c0d]/90 backdrop-blur-md px-3 sm:px-4 md:px-6 flex items-center justify-between gap-3 sticky top-0 z-20 select-none">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 truncate min-w-0">
        <span className="font-semibold text-zinc-300">0arc</span>
        <span className="text-zinc-600">/</span>
        <span className="text-white font-medium truncate">
          {current.title}
        </span>
      </div>

      {/* Middle: Command Search Trigger Button (no shortcut badges) */}
      <button
        onClick={openSearchModal}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.14] hover:bg-white/[0.05] text-zinc-400 hover:text-zinc-200 transition-all text-xs max-w-sm w-full hidden sm:flex group"
      >
        <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
        <span className="text-zinc-400 text-[11px]">Search archive...</span>
      </button>

      {/* Right Actions (no shortcut badges) */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={openSearchModal}
          className="sm:hidden text-zinc-400 hover:text-white p-1.5 rounded-md hover:bg-white/[0.05]"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          onClick={openCloudModal}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] text-xs font-mono text-zinc-300 transition-colors"
          title="Cloud Database & Real-Time Sync"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isCloudSyncActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
          <Cloud className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden md:inline text-[11px] text-zinc-300">
            {mongoStatus?.isMongoConnected ? 'MongoDB' : 'Cloud Sync'}
          </span>
        </button>

        <button
          onClick={() => openQuickAdd()}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-medium shadow-sm transition-all active:scale-[0.98] whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Entry</span>
        </button>
      </div>
    </header>
  );
};
