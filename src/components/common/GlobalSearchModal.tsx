import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useArchive } from '../../context/ArchiveContext';
import { Search, X, Wrench, FileText, Film, ArrowRight, ExternalLink } from 'lucide-react';
import { MediaType, NavigationTab } from '../../types';

const TYPE_LABELS: Record<MediaType, string> = {
  movie: 'Movie',
  series: 'Series',
  anime: 'Anime',
};

interface SearchResultItem {
  id: string;
  category: 'tool' | 'note' | 'media';
  title: string;
  subtitle: string;
  detail?: string;
  targetTab: NavigationTab;
  url?: string;
}

export const GlobalSearchModal: React.FC = () => {
  const {
    searchModalOpen,
    closeSearchModal,
    tools,
    notes,
    media,
    setActiveTab,
  } = useArchive();

  const [query, setQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'tool' | 'note' | 'media'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchModalOpen) {
      setQuery('');
      setActiveCategoryFilter('all');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchModalOpen]);

  // Compute matched results
  const results: SearchResultItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items: SearchResultItem[] = [];

    // Tools
    for (const tool of tools) {
      if (
        !q ||
        tool.title.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.tags.some((t) => t.toLowerCase().includes(q)) ||
        tool.category.toLowerCase().includes(q)
      ) {
        items.push({
          id: tool.id,
          category: 'tool',
          title: tool.title,
          subtitle: `${tool.category} · Tool`,
          detail: tool.description,
          targetTab: 'tools',
          url: tool.url,
        });
      }
    }

    // Notes
    for (const note of notes) {
      if (
        !q ||
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q) ||
        note.category.toLowerCase().includes(q) ||
        note.tags.some((t) => t.toLowerCase().includes(q))
      ) {
        items.push({
          id: note.id,
          category: 'note',
          title: note.title,
          subtitle: `${note.category} · Note`,
          detail: note.content.slice(0, 90),
          targetTab: 'notes',
        });
      }
    }

    // Media
    for (const m of media) {
      if (
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.genre.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        (m.notes && m.notes.toLowerCase().includes(q))
      ) {
        items.push({
          id: m.id,
          category: 'media',
          title: m.title,
          subtitle: `${TYPE_LABELS[m.type]} · ${m.genre} (${m.releaseYear})`,
          detail: m.description,
          targetTab: 'watchlist',
        });
      }
    }

    // Filter by active category tab if selected
    const filtered =
      activeCategoryFilter === 'all'
        ? items
        : items.filter((item) => item.category === activeCategoryFilter);

    // If query is empty, show latest 8 items
    return q ? filtered : filtered.slice(0, 8);
  }, [query, activeCategoryFilter, tools, notes, media]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeSearchModal();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelectItem(results[selectedIndex]);
      }
    }
  };

  const handleSelectItem = (item: SearchResultItem) => {
    setActiveTab(item.targetTab);
    closeSearchModal();
  };

  if (!searchModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-0 sm:pt-24 px-0 sm:px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={closeSearchModal}
    >
      <div
        className="w-full max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[80vh] surface-elevated rounded-none sm:rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 border border-white/[0.08]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/[0.06] gap-3">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search across all archives..."
            className="w-full bg-transparent text-white placeholder-zinc-500 text-sm focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="text-zinc-500 hover:text-white p-1 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="hidden sm:inline text-[10px] font-mono text-zinc-500 uppercase px-1.5 py-0.5 rounded border border-white/[0.08]">
              Esc
            </span>
          )}
        </div>

        {/* Category Pill Filters */}
        <div className="px-4 py-2 border-b border-white/[0.06] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: 'All Results' },
            { id: 'tool', label: 'Tools' },
            { id: 'note', label: 'Notes' },
            { id: 'media', label: 'Watchlist' },
          ].map((cat) => {
            const active = activeCategoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategoryFilter(cat.id as typeof activeCategoryFilter);
                  setSelectedIndex(0);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-white/[0.1] text-white font-medium border border-white/[0.1]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Results Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2">
          {results.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              <p className="font-medium text-zinc-300 mb-1">No matching items found</p>
              <p>Try searching for different keywords or clear filters.</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-mono text-zinc-500 flex justify-between">
                <span>{query ? `${results.length} matches` : 'Recent entries'}</span>
                <span className="hidden sm:inline">Press ↵ to jump</span>
              </div>
              {results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const categoryIcons = {
                  tool: <Wrench className="w-3.5 h-3.5 text-zinc-400" />,
                  note: <FileText className="w-3.5 h-3.5 text-zinc-400" />,
                  media: <Film className="w-3.5 h-3.5 text-zinc-400" />,
                };

                return (
                  <button
                    key={`${item.category}-${item.id}`}
                    onClick={() => handleSelectItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between gap-3 transition-colors ${
                      isSelected
                        ? 'bg-white/[0.08] text-white'
                        : 'text-zinc-400 hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-1.5 rounded-md bg-white/[0.04] border border-white/[0.08] shrink-0">
                        {categoryIcons[item.category]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white truncate">{item.title}</span>
                          <span className="text-[10px] font-mono text-zinc-500 truncate">· {item.subtitle}</span>
                        </div>
                        {item.detail && (
                          <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5 font-mono">
                            {item.detail}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSelected ? (
                        <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-300">
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      ) : (
                        item.url && <ExternalLink className="w-3 h-3 text-zinc-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hints (desktop only) */}
        <div className="px-4 py-2.5 border-t border-white/[0.06] hidden sm:flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="kbd-shortcut">↑</kbd>
              <kbd className="kbd-shortcut">↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="kbd-shortcut">↵</kbd>
              <span>select</span>
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="kbd-shortcut">esc</kbd>
            <span>close</span>
          </span>
        </div>
      </div>
    </div>
  );
};
