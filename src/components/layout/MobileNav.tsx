import React from 'react';
import { useArchive } from '../../context/ArchiveContext';
import { NavigationTab } from '../../types';
import { LayoutDashboard, Wrench, FileText, Film, Image as ImageIcon, Star, Settings } from 'lucide-react';

const NAV_ITEMS: { id: NavigationTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Home', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
  { id: 'tools', label: 'Tools', icon: <Wrench className="w-[18px] h-[18px]" /> },
  { id: 'notes', label: 'Notes', icon: <FileText className="w-[18px] h-[18px]" /> },
  { id: 'watchlist', label: 'Watchlist', icon: <Film className="w-[18px] h-[18px]" /> },
  { id: 'images', label: 'Images', icon: <ImageIcon className="w-[18px] h-[18px]" /> },
  { id: 'favorites', label: 'Saved', icon: <Star className="w-[18px] h-[18px]" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-[18px] h-[18px]" /> },
];

/** Bottom tab bar shown on phones only; the icon rail takes over from md upwards. */
export const MobileNav: React.FC = () => {
  const { activeTab, setActiveTab } = useArchive();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.08] bg-[#0c0c0d]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex-1 min-w-0 flex flex-col items-center justify-center gap-1 text-[10px] leading-none transition-colors ${
                isActive ? 'text-white' : 'text-zinc-500 active:text-zinc-300'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-white" />
              )}
              {item.icon}
              <span className="truncate max-w-full px-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
