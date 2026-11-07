import React, { useEffect, useRef, useState } from 'react';
import { useArchive } from '../../context/ArchiveContext';
import { X, Wrench, FileText, Film, Loader2, Check, Search } from 'lucide-react';
import { ToolCategory, MediaType, MediaStatus } from '../../types';
import { lookupMediaDetails, searchMedia, type MediaCandidate } from '../../lib/mediaLookup';

type QuickAddType = 'tool' | 'note' | 'watchlist';

interface MediaPreview {
  title?: string;
  type?: MediaType;
  posterUrl?: string;
  description?: string;
  genre?: string;
  releaseYear?: number;
  rating?: number;
  progressTotal?: number;
}

const ADD_STATUSES: { value: MediaStatus; label: string }[] = [
  { value: 'want_to_watch', label: 'Watchlist' },
  { value: 'watching', label: 'Watching' },
  { value: 'completed', label: 'Completed' },
];

export const QuickAddModal: React.FC = () => {
  const {
    quickAddModalOpen,
    quickAddInitialType,
    closeQuickAdd,
    addTool,
    addNote,
    addMedia,
  } = useArchive();

  const [selectedType, setSelectedType] = useState<QuickAddType>('tool');

  // Tool
  const [toolTitle, setToolTitle] = useState('');
  const [toolDesc, setToolDesc] = useState('');
  const [toolUrl, setToolUrl] = useState('');
  const [toolCategory, setToolCategory] = useState<ToolCategory>('Productivity');
  const [toolTags, setToolTags] = useState('');

  // Note
  const [noteTitle, setNoteTitle] = useState('');
  const [noteCategory, setNoteCategory] = useState('General');
  const [noteContent, setNoteContent] = useState('');

  // Watchlist
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaStatus, setMediaStatus] = useState<MediaStatus>('want_to_watch');
  const [mediaLoading, setMediaLoading] = useState(false);
  const [imdbCandidates, setImdbCandidates] = useState<MediaCandidate[]>([]);
  const [isSearchingImdb, setIsSearchingImdb] = useState(false);
  const [showCandidates, setShowCandidates] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetForm = () => {
    setToolTitle('');
    setToolDesc('');
    setToolUrl('');
    setToolCategory('Productivity');
    setToolTags('');
    setNoteTitle('');
    setNoteCategory('General');
    setNoteContent('');
    setMediaTitle('');
    setMediaStatus('want_to_watch');
    setMediaPreview(null);
    setMediaLoading(false);
    setImdbCandidates([]);
    setShowCandidates(false);
  };

  // Start every "New Entry" from a clean form, pre-selecting the requested section.
  useEffect(() => {
    if (!quickAddModalOpen) return;
    resetForm();
    if (quickAddInitialType === 'notes') setSelectedType('note');
    else if (quickAddInitialType === 'watchlist') setSelectedType('watchlist');
    else setSelectedType('tool');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickAddModalOpen, quickAddInitialType]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  if (!quickAddModalOpen) return null;

  const searchImdbCandidates = async (queryToSearch: string) => {
    setIsSearchingImdb(true);
    try {
      const results = await searchMedia(queryToSearch);
      setImdbCandidates(results);
      setShowCandidates(results.length > 0);
    } catch {
      // Offline — the entry can still be saved manually.
      setImdbCandidates([]);
    } finally {
      setIsSearchingImdb(false);
    }
  };

  const handleMediaTitleChange = (value: string) => {
    setMediaTitle(value);
    setMediaPreview(null);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    const trimmed = value.trim();
    if (trimmed.length >= 2) {
      searchTimerRef.current = setTimeout(() => searchImdbCandidates(trimmed), 350);
    } else {
      setImdbCandidates([]);
      setShowCandidates(false);
    }
  };

  const fetchDetails = async (body: {
    title: string;
    year?: number;
    type?: MediaType;
    imdbId?: string;
    posterUrl?: string;
  }): Promise<MediaPreview | null> => {
    try {
      return await lookupMediaDetails(body);
    } catch {
      return null;
    }
  };

  const handleSelectCandidate = async (candidate: MediaCandidate) => {
    setMediaTitle(candidate.title);
    setShowCandidates(false);
    setMediaPreview({ title: candidate.title, type: candidate.type, posterUrl: candidate.posterUrl });
    setMediaLoading(true);
    const details = await fetchDetails({
      title: candidate.title,
      year: candidate.year,
      type: candidate.type,
      imdbId: candidate.id,
      posterUrl: candidate.posterUrl,
    });
    if (details) setMediaPreview({ ...details, posterUrl: details.posterUrl || candidate.posterUrl });
    setMediaLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedType === 'tool') {
      if (!toolTitle.trim() || !toolDesc.trim()) return;
      const tagsArray = toolTags
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);
      addTool({
        title: toolTitle.trim(),
        description: toolDesc.trim(),
        url: toolUrl.trim() || undefined,
        category: toolCategory,
        tags: tagsArray.length > 0 ? tagsArray : [toolCategory.toLowerCase()],
        isFavorite: false,
      });
    } else if (selectedType === 'note') {
      if (!noteTitle.trim()) return;
      addNote({
        title: noteTitle.trim(),
        content: noteContent.trim(),
        category: noteCategory.trim() || 'General',
        tags: [],
        isFavorite: false,
      });
    } else {
      const title = mediaTitle.trim();
      if (!title) return;

      let preview = mediaPreview;
      if (!preview?.description) {
        setMediaLoading(true);
        preview = (await fetchDetails({ title, type: preview?.type })) || preview;
        setMediaLoading(false);
      }

      addMedia({
        title: preview?.title || title,
        type: preview?.type || 'movie',
        description: preview?.description || 'Saved to your watchlist.',
        posterUrl: preview?.posterUrl,
        genre: preview?.genre || 'Uncategorized',
        releaseYear: preview?.releaseYear || new Date().getFullYear(),
        rating: preview?.rating || 0,
        status: mediaStatus,
        progressCurrent: 0,
        progressTotal: preview?.progressTotal,
        isFavorite: false,
      });
    }

    closeQuickAdd();
  };

  const typeOptions: { id: QuickAddType; label: string; icon: React.ReactNode }[] = [
    { id: 'tool', label: 'Tool', icon: <Wrench className="w-3.5 h-3.5" /> },
    { id: 'note', label: 'Note', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'watchlist', label: 'Watchlist', icon: <Film className="w-3.5 h-3.5" /> },
  ];

  const inputClass =
    'w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/[0.08] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/30';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-lg surface-elevated rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] border border-white/[0.08] pb-[env(safe-area-inset-bottom)] sm:pb-0">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/15 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/[0.06] shrink-0">
          <h2 className="text-sm font-semibold text-white">New Entry</h2>
          <button
            onClick={closeQuickAdd}
            className="text-zinc-400 hover:text-white p-2 -mr-2 rounded-md hover:bg-white/[0.06] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Entry type selector */}
        <div className="px-4 sm:px-5 py-3 border-b border-white/[0.06] shrink-0">
          <div className="grid grid-cols-3 gap-1 p-1 bg-white/[0.03] rounded-lg border border-white/[0.06]">
            {typeOptions.map((option) => {
              const active = selectedType === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setSelectedType(option.id);
                    setShowCandidates(false);
                  }}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs transition-colors ${
                    active
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {option.icon}
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
            {selectedType === 'tool' && (
              <>
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">Name</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Cursor, Linear, Raycast"
                    value={toolTitle}
                    onChange={(e) => setToolTitle(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">
                    Description
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="What makes this tool worth keeping?"
                    value={toolDesc}
                    onChange={(e) => setToolDesc(e.target.value)}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">
                      URL (optional)
                    </label>
                    <input
                      type="url"
                      inputMode="url"
                      placeholder="https://..."
                      value={toolUrl}
                      onChange={(e) => setToolUrl(e.target.value)}
                      className={`${inputClass} font-mono text-[13px]`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">
                      Category
                    </label>
                    <select
                      value={toolCategory}
                      onChange={(e) => setToolCategory(e.target.value as ToolCategory)}
                      className={`${inputClass} font-mono`}
                    >
                      <option value="AI Tools">AI Tools</option>
                      <option value="Development">Development</option>
                      <option value="Design">Design</option>
                      <option value="Productivity">Productivity</option>
                      <option value="Websites">Websites</option>
                      <option value="Software">Software</option>
                      <option value="Learning">Learning</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. dev, design, utility"
                    value={toolTags}
                    onChange={(e) => setToolTags(e.target.value)}
                    className={`${inputClass} font-mono text-[13px]`}
                  />
                </div>
              </>
            )}

            {selectedType === 'note' && (
              <>
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">Title</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Note title"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="General"
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">Content</label>
                  <textarea
                    rows={5}
                    placeholder="Write your note here..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </>
            )}

            {selectedType === 'watchlist' && (
              <>
                <div className="relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-mono text-zinc-400">Title</label>
                    {isSearchingImdb && (
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
                      autoFocus
                      placeholder="e.g. Dune, Severance, Frieren"
                      value={mediaTitle}
                      onChange={(e) => handleMediaTitleChange(e.target.value)}
                      onFocus={() => {
                        if (imdbCandidates.length > 0) setShowCandidates(true);
                      }}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => searchImdbCandidates(mediaTitle)}
                      disabled={isSearchingImdb || !mediaTitle.trim()}
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
                        <span>Pick the exact match</span>
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

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">Status</label>
                  <select
                    value={mediaStatus}
                    onChange={(e) => setMediaStatus(e.target.value as MediaStatus)}
                    className={`${inputClass} font-mono`}
                  >
                    {ADD_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                {mediaPreview?.description && (
                  <div className="p-3 rounded-lg bg-white/[0.025] border border-white/[0.08] flex gap-3 items-start">
                    {mediaPreview.posterUrl ? (
                      <img
                        src={mediaPreview.posterUrl}
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
                      <p className="text-xs font-semibold text-white truncate">
                        {mediaPreview.title || mediaTitle}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-400">
                        {mediaPreview.releaseYear}
                        {mediaPreview.genre ? ` · ${mediaPreview.genre}` : ''}
                        {mediaPreview.rating ? ` · ★ ${mediaPreview.rating}/10` : ''}
                      </p>
                      <p className="text-[11px] text-zinc-300 line-clamp-2 leading-relaxed">
                        {mediaPreview.description}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
                        <Check className="w-3 h-3" />
                        <span>Poster & synopsis added</span>
                      </div>
                    </div>
                  </div>
                )}

                {!mediaPreview?.description && (
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Start typing to auto-fill the poster, synopsis, and rating. You can always save
                    with just a title.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="shrink-0 flex items-center gap-2 px-4 sm:px-5 py-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={closeQuickAdd}
              className="flex-1 sm:flex-none px-4 py-2.5 sm:py-1.5 text-xs text-zinc-400 hover:text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mediaLoading}
              className="flex-1 sm:flex-none px-4 py-2.5 sm:py-1.5 text-xs font-semibold text-black bg-white hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {mediaLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Entry</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
