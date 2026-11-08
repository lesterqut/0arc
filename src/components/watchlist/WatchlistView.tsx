import React, { useState, useMemo } from 'react';
import { useArchive } from '../../context/ArchiveContext';
import { MediaItem, MediaStatus } from '../../types';
import { MediaModal } from './MediaModal';
import { MediaDetailModal } from './MediaDetailModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { Plus, Search, Star, Film } from 'lucide-react';

const STATUS_LABELS: Partial<Record<MediaStatus, string>> = {
  want_to_watch: 'Watchlist',
  watching: 'Watching',
  completed: 'Completed',
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
    toggleMediaFavorite,
    openQuickAdd,
    settings,
  } = useArchive();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MediaStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | MediaItem['type']>('all');
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
        const matchesType = typeFilter === 'all' || item.type === typeFilter;
        const matchesFavorite = !favoritesOnly || item.isFavorite;

        return matchesQuery && matchesStatus && matchesType && matchesFavorite;
      });
  }, [media, searchQuery, statusFilter, typeFilter, sortBy, favoritesOnly]);

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
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | MediaItem['type'])}
            className={selectClass}
            aria-label="Filter by media type"
          >
            <option value="all">All types</option>
            <option value="movie">Movies</option>
            <option value="series">Series</option>
            <option value="anime">Anime</option>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredMedia.map((item) => {
            return (
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
                className="surface-card rounded-xl overflow-hidden group flex flex-col justify-between cursor-pointer relative hover:border-white/[0.15] transition-all focus:outline-none focus-visible:border-white/30"
              >
                <div className="aspect-[2/3] w-full bg-[#0c0c0e] relative overflow-hidden flex items-center justify-center">
                  {item.posterUrl ? (
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="p-4 text-center text-zinc-600 font-mono text-[10px] uppercase">
                      {TYPE_LABELS[item.type]}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0d] via-transparent to-black/40 pointer-events-none" />

                  {item.rating > 0 && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md border border-white/[0.1] text-[10px] font-mono font-medium text-amber-400">
                      ★ {item.rating}
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMediaFavorite(item.id);
                    }}
                    className="absolute top-1.5 right-1.5 p-2 rounded-lg bg-black/75 backdrop-blur-md border border-white/[0.08] text-zinc-400 hover:text-amber-400 transition-colors"
                    aria-label={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        item.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                      }`}
                    />
                  </button>

                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 text-[10px] font-mono">
                    <span className="text-zinc-300 truncate font-medium">
                      {STATUS_LABELS[item.status] || 'Watchlist'}
                    </span>
                    <span className="text-zinc-500 shrink-0">{item.releaseYear}</span>
                  </div>
                </div>

                <div className="p-3">
                  <h3 className="text-xs font-semibold text-white truncate">{item.title}</h3>
                  <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                    {TYPE_LABELS[item.type]}
                    {item.genre ? ` · ${item.genre}` : ''}
                  </p>

                </div>
              </div>
            );
          })}
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
            setSelectedMedia((selected) => (selected ? { ...selected, status } : selected));
          }}
          onUpdateType={(id, type) => {
            updateMedia(id, { type });
            setSelectedMedia((selected) => (selected ? { ...selected, type } : selected));
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
