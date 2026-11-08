/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArchiveProvider, useArchive } from './context/ArchiveContext';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { Header } from './components/layout/Header';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { QuickAddModal } from './components/common/QuickAddModal';
import { ToastContainer } from './components/common/ToastContainer';
import { OverviewView } from './components/overview/OverviewView';
import { ToolsView } from './components/tools/ToolsView';
import { NotesView } from './components/notes/NotesView';
import { WatchlistView } from './components/watchlist/WatchlistView';
import { ImagesView } from './components/images/ImagesView';
import { FavoritesView } from './components/unified/FavoritesView';
import { SettingsView } from './components/settings/SettingsView';

const MainContent: React.FC = () => {
  const { activeTab } = useArchive();

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewView />;
      case 'favorites':
        return <FavoritesView />;
      case 'tools':
        return <ToolsView />;
      case 'notes':
        return <NotesView />;
      case 'watchlist':
        return <WatchlistView />;
      case 'images':
        return <ImagesView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <div className="flex h-[100dvh] w-full bg-[#09090b] text-[#f4f4f5] overflow-hidden selection:bg-white/15 selection:text-white pt-[env(safe-area-inset-top)]">
      {/* Icon-Only Sidebar Rail (desktop) */}
      <Sidebar />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto overscroll-contain pt-4 md:pt-8 px-3 sm:px-4 md:px-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </main>
      </div>

      {/* Bottom tab bar (phones) */}
      <MobileNav />

      {/* Modals & Overlays */}
      <GlobalSearchModal />
      <QuickAddModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <ArchiveProvider>
      <MainContent />
    </ArchiveProvider>
  );
}
