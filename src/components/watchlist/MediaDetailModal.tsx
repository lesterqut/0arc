import React from 'react';
import { MediaItem, MediaStatus } from '../../types';
import { X, Star, Film, Edit2, Trash2 } from 'lucide-react';

interface MediaDetailModalProps {
  media: MediaItem | null;
  onClose: () => void;
  onEdit: (media: MediaItem) => void;
  onDelete: (media: MediaItem) => void;
  onToggleFavorite: (id: string) => void;
  onUpdateStatus: (id: string, status: MediaStatus) => void;
}

const STATUS_OPTIONS: { value: MediaStatus; label: string }[] = [
  { value: 'want_to_watch', label: 'Watchlist' },
  { value: 'watching', label: 'Watching' },
  { value: 'completed', label: 'Completed' },
];

const TYPE_LABELS: Record<MediaItem['type'], string> = {
  movie: 'Movie',
  series: 'Series',
  anime: 'Anime',
};

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  media,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onUpdateStatus,
}) => {
  if (!media) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl surface-elevated rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden flex flex-col sm:flex-row max-h-[92dvh] border border-white/[0.08] pb-[env(safe-area-inset-bottom)] sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Poster */}
        <div className="sm:w-5/12 bg-black/40 relative h-44 sm:h-auto sm:min-h-[400px] shrink-0 overflow-hidden flex items-center justify-center">
          {media.posterUrl ? (
            <img
              src={media.posterUrl}
              alt={media.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-zinc-500">
              <div className="w-12 h-12 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <Film className="w-5 h-5 text-zinc-400" />
              </div>
              <span className="text-xs font-mono">{TYPE_LABELS[media.type]}</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:hidden pointer-events-none" />

          {media.rating > 0 && (
            <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/75 backdrop-blur-md border border-white/[0.1] text-xs font-mono font-medium text-amber-400">
              ★ {media.rating}/10
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto overscroll-contain">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-zinc-400 mb-1 font-mono">
                  <span className="text-zinc-300 font-medium">{TYPE_LABELS[media.type]}</span>
                  <span aria-hidden="true">·</span>
                  <span>{media.releaseYear}</span>
                  {media.genre && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{media.genre}</span>
                    </>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-white tracking-tight break-words">
                  {media.title}
                </h2>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onToggleFavorite(media.id)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-white/[0.06] transition-colors"
                  aria-label={media.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star
                    className={`w-4 h-4 ${
                      media.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                    }`}
                  />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <span className="text-xs text-zinc-400 font-mono">Status</span>
              <select
                value={media.status}
                onChange={(e) => onUpdateStatus(media.id, e.target.value as MediaStatus)}
                className="px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/[0.08] text-xs font-mono text-white focus:outline-none focus:border-white/30"
                aria-label="Watchlist status"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <h4 className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
                Synopsis
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed break-words">
                {media.description}
              </p>
            </div>

            {media.notes && (
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1 font-medium">
                  Personal notes
                </h4>
                <p className="text-xs text-zinc-200 leading-relaxed italic break-words">
                  {media.notes}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-white/[0.06] mt-5">
            <span className="text-[10px] font-mono text-zinc-500">
              Saved {new Date(media.createdAt).toLocaleDateString()}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(media)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono text-zinc-200 hover:text-white border border-white/[0.06] transition-colors"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </button>

              <button
                onClick={() => onDelete(media)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-mono text-red-400 border border-red-500/20 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
