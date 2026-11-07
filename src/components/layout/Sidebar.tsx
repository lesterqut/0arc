import React from 'react';
import { useArchive } from '../../context/ArchiveContext';
import { NavigationTab } from '../../types';
import {
  LayoutDashboard,
  Wrench,
  FileText,
  Film,
  Star,
  Settings,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useArchive();

  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'tools', label: 'Tools', icon: <Wrench className="w-4 h-4" /> },
    { id: 'notes', label: 'Notes', icon: <FileText className="w-4 h-4" /> },
    { id: 'watchlist', label: 'Watchlist', icon: <Film className="w-4 h-4" /> },
    { id: 'favorites', label: 'Favorites', icon: <Star className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="hidden md:flex w-14 shrink-0 bg-[#0c0c0d] border-r border-white/[0.06] flex-col items-center justify-between py-4 select-none z-30">
      {/* Top: 0arc minimal glyph */}
      <div className="flex flex-col items-center gap-6">
        <button
          onClick={() => setActiveTab('overview')}
          className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-mono font-bold text-xs transition-transform hover:scale-105 active:scale-95"
          title="0arc — Overview"
        >
          0
        </button>

        {/* Navigation Icon Rail */}
        <nav className="flex flex-col items-center gap-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                aria-label={item.label}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-white text-black shadow-sm font-semibold'
                    : 'text-zinc-500 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {item.icon}
              </button>
            );
          })}
        </nav>
      </div>

    </aside>
  );
};
