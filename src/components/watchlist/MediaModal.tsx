import React, { useEffect, useRef, useState } from 'react';
import { MediaItem, MediaType, MediaStatus } from '../../types';
import { lookupMediaDetails, searchMedia, type MediaCandidate } from '../../lib/mediaLookup';
import { X, Search, Loader2, Check, Film } from 'lucide-react';

interface MediaModalProps {
  isOpen: boolean;
  mediaToEdit: MediaItem | null;
  onClose: () => void;
  onSave: (mediaData: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const STATUS_OPTIONS: { value: MediaStatus; label: string }[] = [
  { value: 'want_to_watch', label: 'Watchlist' },
  { value: 'watching', label: 'Watching' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'dropped', label: 'Dropped' },
];

export const MediaModal: React.FC<MediaModalProps> = ({
  isOpen,
  mediaToEdit,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<MediaStatus>('want_to_watch');
  const [type, setType] = useState<MediaType>('movie');
  const [description, setDescription] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [genre, setGenre] = useState('');
  const [releaseYear, setReleaseYear] = useState<number>(new Date().getFullYear());
  const [rating, setRating] = useState<number>(0);
  const [progressTotal, setProgressTotal] = useState<string>('');
  const [progressCurrent, setProgressCurrent] = useState(0);

  const [imdbCandidates, setImdbCandidates] = useState<MediaCandidate[]>([]);
  const [isSearchingImdb, setIsSearchingImdb] = useState(false);
  const [showCandidates, setShowCandidates] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mediaToEdit) return;
    setTitle(mediaToEdit.title);
    setStatus(mediaToEdit.status);
    setType(mediaToEdit.type);
    setDescription(mediaToEdit.description);
    setPosterUrl(mediaToEdit.posterUrl || '');
    setGenre(mediaToEdit.genre);
    setReleaseYear(mediaToEdit.releaseYear);
    setRating(mediaToEdit.rating);
    setProgressCurrent(mediaToEdit.progressCurrent || 0);
    setProgressTotal(mediaToEdit.progressTotal ? String(mediaToEdit.progressTotal) : '');
    setImdbCandidates([]);
    setShowCandidates(false);
  }, [mediaToEdit]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  if (!isOpen || !mediaToEdit) return null;

  const performImdbSearch = async (query: string) => {
    setIsSearchingImdb(true);
    try {
      const results = await searchMedia(query, type);
      setImdbCandidates(results);
      setShowCandidates(results.length > 0);
    } catch {
      setImdbCandidates([]);
    } finally {
      setIsSearchingImdb(false);
    }
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const trimmed = value.trim();
    if (trimmed.length >= 2) {
      searchTimerRef.current = setTimeout(() => {
        performImdbSearch(trimmed);
      }, 350);
    } else {
      setImdbCandidates([]);
      setShowCandidates(false);
    }
  };

  const handleSelectCandidate = async (candidate: MediaCandidate) => {
    const chosenTitle = candidate.title;
    setTitle(chosenTitle);
    setType(candidate.type);
    if (candidate.year) setReleaseYear(candidate.year);
    if (candidate.posterUrl) setPosterUrl(candidate.posterUrl);
    setShowCandidates(false);

    const detailsOrUndefined = await fillMediaFieldsFromApi(
      chosenTitle,
      candidate.type,
      candidate.posterUrl,
      candidate.id
    );
    if (detailsOrUndefined) {
      if (detailsOrUndefined.description) setDescription(detailsOrUndefined.description);
      if (detailsOrUndefined.posterUrl) setPosterUrl(detailsOrUndefined.posterUrl);
      if (detailsOrUndefined.genre) setGenre(detailsOrUndefined.genre);
      if (detailsOrUndefined.releaseYear) setReleaseYear(Number(detailsOrUndefined.releaseYear));
      if (detailsOrUndefined.rating) setRating(Number(detailsOrUndefined.rating));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    let finalDesc = description.trim();
    let finalPoster = posterUrl.trim();

    if (!finalDesc || !finalPoster) {
      const fillResult = await fillMediaFieldsFromApi(cleanTitle, type, posterUrl);
      if (fillResult?.description) finalDesc = fillResult.description;
      if (fillResult?.posterUrl) finalPoster = fillResult.posterUrl;
      if (fillResult?.genre && !genre.trim()) setGenre(fillResult.genre);
      if (fillResult?.releaseYear) setReleaseYear(Number(fillResult.releaseYear));
      if (fillResult?.rating) setRating(Number(fillResult.rating));
    }

    const total = Number(progressTotal) > 0 ? Number(progressTotal) : undefined;

    onSave({
      title: cleanTitle,
      type,
      status,
      description: finalDesc || 'Saved to your watchlist.',
      posterUrl: finalPoster || undefined,
      genre: genre.trim() || 'Uncategorized',
      releaseYear: releaseYear || new Date().getFullYear(),
      rating: rating || 0,
      progressCurrent: Math.min(progressCurrent, total ?? progressCurrent),
      progressTotal: total,
      isFavorite: mediaToEdit.isFavorite,
    });
    onClose();
  };

  const inputClass =
    'w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/[0.08] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors';

  const fillMediaFieldsFromApi = async (
    title: string,
    type: MediaType,
    existingPoster?: string,
    imdbId?: string
  ) => {
    setIsLoadingDetails(true);
    try {
      return await lookupMediaDetails({
        title,
        type,
        posterUrl: existingPoster || undefined,
        imdbId,
      });
    } catch {
      return undefined;
    } finally {
      setIsLoadingDetails(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-lg surface-elevated rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] border border-white/[0.08] pb-[env(safe-area-inset-bottom)] sm:pb-0">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/15 sm:hidden shrink-0" />

        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/[0.06] shrink-0">
          <h2 className="text-sm font-semibold text-white">Edit entry</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-2 -mr-2 rounded-md hover:bg-white/[0.06] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-mono text-zinc-400">Title</label>                  {isSearchingImdb && (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Searching...</span>
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Title"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onFocus={() => {
                    if (imdbCandidates.length > 0) setShowCandidates(true);
                  }}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => performImdbSearch(title)}
                  disabled={isSearchingImdb || !title.trim()}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-mono text-white transition-colors disabled:opacity-40 shrink-0"
                  aria-label="Search for a match"
                >
                  {isSearchingImdb ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 text-zinc-300" />
                  )}
                  <span className="hidden sm:inline">Find</span>
                </button>
              </div>

              {showCandidates && imdbCandidates.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 surface-card rounded-xl border border-white/[0.12] shadow-2xl overflow-hidden max-h-56 overflow-y-auto overscroll-contain divide-y divide-white/[0.04]">
                  <div className="px-3 py-2 text-[10px] font-mono text-zinc-400 bg-white/[0.03] flex items-center justify-between sticky top-0">
                    <span className="text-zinc-400">Pick the exact match</span>
                    <button
                      type="button"
                      onClick={() => setShowCandidates(false)}
                      className="hover:text-white px-2 py-1 -my-1"
                    >
                      Close
                    </button>
                  </div>
                  {imdbCandidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => handleSelectCandidate(candidate)}
                      className="w-full text-left p-2.5 flex items-center gap-3 hover:bg-white/[0.06] active:bg-white/[0.08] transition-colors"
                    >
                      {candidate.posterUrl ? (
                        <img
                          src={candidate.posterUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-9 h-12 object-cover rounded bg-black shrink-0 border border-white/[0.08]"
                        />
                      ) : (
                        <div className="w-9 h-12 rounded bg-black/60 shrink-0 border border-white/[0.08] flex items-center justify-center">
                          <Film className="w-4 h-4 text-zinc-500" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-white truncate">
                            {candidate.title}
                          </span>
                          {candidate.year && (
                            <span className="text-[10px] font-mono px-1 rounded bg-white/[0.06] text-zinc-400 shrink-0">
                              {candidate.year}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-500 truncate mt-0.5 font-mono uppercase">
                          {candidate.rawType || candidate.type}
                          {candidate.stars ? ` · ${candidate.stars}` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as MediaStatus)}
                  className={`${inputClass} font-mono`}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {type !== 'movie' ? (
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">
                    Episodes
                  </label>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    placeholder="12"
                    value={progressTotal}
                    onChange={(e) => setProgressTotal(e.target.value)}
                    className={`${inputClass} font-mono`}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">
                    Year
                  </label>
                  <input
                    type="number"
                    min={1888}
                    max={2100}
                    inputMode="numeric"
                    value={releaseYear}
                    onChange={(e) => setReleaseYear(Number(e.target.value))}
                    className={`${inputClass} font-mono`}
                  />
                </div>
              )}
            </div>

            {(posterUrl || description) && (
              <div className="p-3 rounded-lg bg-white/[0.025] border border-white/[0.08] flex gap-3 items-start">
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-14 h-20 object-cover rounded bg-black/60 shrink-0 border border-white/[0.1]"
                  />
                ) : (
                  <div className="w-14 h-20 rounded bg-black/60 shrink-0 border border-white/[0.08] flex items-center justify-center">
                    <Film className="w-4 h-4 text-zinc-500" />
                  </div>
                )}

                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs font-semibold text-white truncate">{title || 'Preview'}</p>
                  <p className="text-[10px] font-mono text-zinc-400">
                    {releaseYear}
                    {genre ? ` · ${genre}` : ''}
                    {rating ? ` · ★ ${rating}/10` : ''}
                  </p>

                  {isLoadingDetails ? (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 py-1">
                      <Loader2 className="w-3 h-3 animate-spin text-zinc-300" />
                      <span>Loading details...</span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-300 line-clamp-3 leading-relaxed">
                      {description}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 pt-0.5">
                    <Check className="w-3 h-3" />
                    <span>Poster & synopsis</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 flex items-center gap-2 px-4 sm:px-5 py-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 sm:py-1.5 text-xs text-zinc-400 hover:text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoadingDetails || !title.trim()}
              className="flex-1 sm:flex-none px-4 py-2.5 sm:py-1.5 text-xs font-semibold text-black bg-white hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-40"
            >
              {isLoadingDetails ? 'Loading...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
