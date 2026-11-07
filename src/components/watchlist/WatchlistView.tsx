import React, { useState, useMemo } from 'react';
import { useArchive } from '../../context/ArchiveContext';
import { MediaItem, MediaStatus } from '../../types';
import { MediaModal } from './MediaModal';
import { MediaDetailModal } from './MediaDetailModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { Plus, Search, Star, Film } from 'lucide-react';

const STATUS_LABELS: Record<MediaStatus, string> = {
  want_to_watch: 'Watchlist',
  watching: 'Watching',
  completed: 'Completed',
  on_hold: 'On Hold',
  dropped: 'Dropped',
};

const TYPE_LABELS: Record<MediaItem['type'], string> = {
  movie: 'Movie',
  series: 'Series',
  anime: 'Anime',
};

export const WatchlistView: React.FC = () => {
  const {
    media,
    updateMedia,
    deleteMedia,
    updateMediaProgress,
    toggleMediaFavorite,
    openQuickAdd,
    settings,
  } = useArchive();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MediaStatus>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'year' | 'alpha'>('recent');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<MediaItem | null>(null);

  const filteredMedia = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return media
      .filter((item) => {
        const matchesQuery =
          !query ||
          item.title.toLowerCase().includes(query) ||
          item.genre.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query);

        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        const matchesFavorite = !favoritesOnly || item.isFavorite;

        return matchesQuery && matchesStatus && matchesFavorite;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'year') return b.releaseYear - a.releaseYear;
        if (sortBy === 'alpha') return a.title.localeCompare(b.title);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [media, searchQuery, statusFilter, sortBy, favoritesOnly]);

  const handleSaveMedia = (mediaData: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingMedia) return;
    updateMedia(editingMedia.id, mediaData);
    setEditingMedia(null);
  };

  const handleDeleteConfirm = () => {
    if (!mediaToDelete) return;
    deleteMedia(mediaToDelete.id);
    if (selectedMedia?.id === mediaToDelete.id) setSelectedMedia(null);
    setMediaToDelete(null);
  };

  const selectClass =
    'px-2.5 py-2 sm:py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-zinc-300 focus:outline-none focus:border-white/[0.2]';

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Watchlist</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {media.length} {media.length === 1 ? 'title' : 'titles'} you want to watch or are
            watching.
          </p>
        </div>

        <button
          onClick={() => openQuickAdd('watchlist')}
          className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-medium transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>

      {/* Search + filters */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            placeholder="Search titles, genres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 sm:py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/[0.2]"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | MediaStatus)}
            className={selectClass}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {(Object.keys(STATUS_LABELS) as MediaStatus[]).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'rating' | 'year' | 'alpha')}
            className={selectClass}
            aria-label="Sort watchlist"
          >
            <option value="recent">Recent</option>
            <option value="rating">Highest rated</option>
            <option value="year">Release year</option>
            <option value="alpha">A–Z</option>
          </select>

          <button
            onClick={() => setFavoritesOnly((prev) => !prev)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg border text-xs transition-colors col-span-2 sm:col-span-1 sm:w-auto ${
              favoritesOnly
                ? 'bg-amber-400/10 border-amber-400/30 text-amber-400'
                : 'bg-white/[0.03] border-white/[0.08] text-zinc-400 hover:text-white'
            }`}
            aria-pressed={favoritesOnly}
          >
            <Star className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-amber-400' : ''}`} />
            <span>Favorites</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      {filteredMedia.length === 0 ? (
        <div className="surface-card rounded-xl p-10 text-center space-y-2">
          <Film className="w-6 h-6 text-zinc-600 mx-auto" />
          <h3 className="text-xs font-medium text-white">
            {media.length === 0 ? 'Your watchlist is empty' : 'No titles found'}
          </h3>
          <p className="text-[11px] text-zinc-500">
            {media.length === 0
              ? 'Press “Add” to save your first movie, series, or anime.'
              : 'Try a different search or filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMedia.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedMedia(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedMedia(item);
                }
              }}
              className="surface-card rounded-xl p-4 cursor-pointer group hover:border-white/[0.15] transition-all focus:outline-none focus-visible:border-white/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-white group-hover:text-zinc-200">{item.title}</h3>
                    <span className="text-[10px] font-mono text-zinc-500">{TYPE_LABELS[item.type]}</span>
                    <span className="text-[10px] font-mono text-zinc-500">{item.releaseYear}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {item.genre || 'Uncategorized'} · {STATUS_LABELS[item.status]}
                  </p>
                  <p className="text-xs text-zinc-300 mt-2 line-clamp-2 leading-relaxed">{item.description}</p>
                  {item.progressTotal ? (
                    <p className="text-[10px] font-mono text-zinc-500 mt-2">
                      Progress: {item.progressCurrent || 0}/{item.progressTotal}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono text-amber-400">
                    {item.rating > 0 && item.rating !== 8.5 ? `★ ${item.rating}/10` : 'Rating unavailable'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMediaFavorite(item.id);
                    }}
                    className="p-1 rounded text-zinc-400 hover:text-amber-400 transition-colors"
                    aria-label={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star className={`w-4 h-4 ${item.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <MediaDetailModal
        media={selectedMedia}
        onClose={() => setSelectedMedia(null)}
        onEdit={(item) => {
          setSelectedMedia(null);
          setEditingMedia(item);
        }}
        onDelete={(item) => {
          if (settings.confirmBeforeDelete) {
            setMediaToDelete(item);
          } else {
            deleteMedia(item.id);
            setSelectedMedia(null);
          }
        }}
        onToggleFavorite={toggleMediaFavorite}
        onUpdateStatus={(id, status) => {
          updateMedia(id, { status });
          setSelectedMedia((current) => (current ? { ...current, status } : current));
        }}
        onUpdateProgress={(id, current) => {
          updateMediaProgress(id, current);
          setSelectedMedia((selected) =>
            selected ? { ...selected, progressCurrent: current } : selected
          );
        }}
      />

      <MediaModal
        isOpen={Boolean(editingMedia)}
        mediaToEdit={editingMedia}
        onClose={() => setEditingMedia(null)}
        onSave={handleSaveMedia}
      />

      <ConfirmModal
        isOpen={Boolean(mediaToDelete)}
        title="Remove title?"
        description={`Are you sure you want to remove "${mediaToDelete?.title}" from your watchlist?`}
        confirmLabel="Remove"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setMediaToDelete(null)}
      />
    </div>
  );
};
