import React, { useState, useMemo } from 'react';
import { useArchive } from '../../context/ArchiveContext';
import { Star, Wrench, FileText, Film, ExternalLink, Layers } from 'lucide-react';
import { MediaType, NavigationTab } from '../../types';

const TYPE_LABELS: Record<MediaType, string> = {
  movie: 'Movie',
  series: 'Series',
  anime: 'Anime',
};

interface FavoriteEntry {
  id: string;
  category: 'tool' | 'note' | 'media';
  title: string;
  subtitle: string;
  description: string;
  url?: string;
  rating?: number;
  createdAt: string;
  targetTab: NavigationTab;
}

export const FavoritesView: React.FC = () => {
  const {
    tools,
    notes,
    media,
    setActiveTab,
    toggleToolFavorite,
    toggleNoteFavorite,
    toggleMediaFavorite,
  } = useArchive();

  const [categoryFilter, setCategoryFilter] = useState<'all' | 'tool' | 'note' | 'media'>('all');

  const favoritesList: FavoriteEntry[] = useMemo(() => {
    const list: FavoriteEntry[] = [];

    tools
      .filter((t) => t.isFavorite)
      .forEach((t) => {
        list.push({
          id: t.id,
          category: 'tool',
          title: t.title,
          subtitle: `${t.category} · Tool`,
          description: t.description,
          url: t.url,
          createdAt: t.createdAt,
          targetTab: 'tools',
        });
      });

    notes
      .filter((n) => n.isFavorite)
      .forEach((n) => {
        list.push({
          id: n.id,
          category: 'note',
          title: n.title,
          subtitle: `${n.category} · Note`,
          description: n.content.replace(/[#*`_>]/g, '').slice(0, 100),
          createdAt: n.createdAt,
          targetTab: 'notes',
        });
      });

    media
      .filter((m) => m.isFavorite)
      .forEach((m) => {
        list.push({
          id: m.id,
          category: 'media',
          title: m.title,
          subtitle: `${TYPE_LABELS[m.type]} · ${m.genre} (${m.releaseYear})`,
          description: m.description,
          rating: m.rating,
          createdAt: m.createdAt,
          targetTab: 'watchlist',
        });
      });

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tools, notes, media]);

  const filteredFavorites = useMemo(() => {
    if (categoryFilter === 'all') return favoritesList;
    return favoritesList.filter((item) => item.category === categoryFilter);
  }, [favoritesList, categoryFilter]);

  const handleUnfavorite = (e: React.MouseEvent, item: FavoriteEntry) => {
    e.stopPropagation();
    if (item.category === 'tool') toggleToolFavorite(item.id);
    else if (item.category === 'note') toggleNoteFavorite(item.id);
    else if (item.category === 'media') toggleMediaFavorite(item.id);
  };

  const handleOpenItem = (item: FavoriteEntry) => {
    setActiveTab(item.targetTab);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Favorites
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {favoritesList.length} starred items across your archive.
          </p>
        </div>

        {/* Filter categories */}
        <div className="flex items-center gap-1 p-0.5 bg-white/[0.03] border border-white/[0.08] rounded-lg overflow-x-auto self-start sm:self-auto">
          {[
            { id: 'all', label: 'All', icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'tool', label: 'Tools', icon: <Wrench className="w-3.5 h-3.5" /> },
            { id: 'note', label: 'Notes', icon: <FileText className="w-3.5 h-3.5" /> },
            { id: 'media', label: 'Watchlist', icon: <Film className="w-3.5 h-3.5" /> },
          ].map((tab) => {
            const active = categoryFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id as typeof categoryFilter)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-white/[0.1] text-white font-medium border border-white/[0.08]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Favorites Feed */}
      {filteredFavorites.length === 0 ? (
        <div className="surface-card rounded-xl p-10 text-center space-y-2">
          <Star className="w-6 h-6 text-zinc-600 mx-auto" />
          <h3 className="text-xs font-medium text-white">No favorites yet</h3>
          <p className="text-[11px] text-zinc-500">
            Click the star icon on any tool, note, or watchlist item to add it to your favorites.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredFavorites.map((item) => {
            const icons = {
              tool: <Wrench className="w-3.5 h-3.5 text-zinc-400" />,
              note: <FileText className="w-3.5 h-3.5 text-zinc-400" />,
              media: <Film className="w-3.5 h-3.5 text-zinc-400" />,
            };

            return (
              <div
                key={`${item.category}-${item.id}`}
                onClick={() => handleOpenItem(item)}
                className="surface-card rounded-xl p-4 group flex flex-col justify-between cursor-pointer hover:border-white/[0.15] transition-all"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="p-1 rounded bg-white/[0.04] border border-white/[0.06]">
                        {icons[item.category]}
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">{item.subtitle}</span>
                    </div>

                    <button
                      onClick={(e) => handleUnfavorite(e, item)}
                      className="p-1 rounded text-amber-400 hover:opacity-75 transition-opacity"
                      title="Unmark favorite"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                    </button>
                  </div>

                  <h3 className="text-xs font-semibold text-white group-hover:text-zinc-200 transition-colors truncate">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>

                  {item.rating && (
                    <span className="font-medium text-amber-400">★ {item.rating}/10</span>
                  )}

                  {item.url && (
                    <span className="flex items-center gap-1 text-zinc-400">
                      <span>Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
