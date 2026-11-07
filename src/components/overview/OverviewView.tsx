import React from 'react';
import { useArchive } from '../../context/ArchiveContext';
import { Wrench, FileText, Film, Star, ArrowRight, ExternalLink } from 'lucide-react';
import { MediaType } from '../../types';

const TYPE_LABELS: Record<MediaType, string> = {
  movie: 'Movie',
  series: 'Series',
  anime: 'Anime',
};

export const OverviewView: React.FC = () => {
  const {
    tools,
    notes,
    media,
    setActiveTab,
    addNote,
  } = useArchive();

  const totalArchives = tools.length + notes.length + media.length;
  const favoritesCount =
    tools.filter((t) => t.isFavorite).length +
    notes.filter((n) => n.isFavorite).length +
    media.filter((m) => m.isFavorite).length;

  // Recent items
  const recentTools = [...tools]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  const recentMedia = [...media]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  const recentFavorites = [
    ...tools.filter((item) => item.isFavorite).map((item) => ({
      title: item.title,
      subtitle: `${item.category} · Tool`,
      detail: item.description,
      updatedAt: item.updatedAt,
    })),
    ...notes.filter((item) => item.isFavorite).map((item) => ({
      title: item.title,
      subtitle: `${item.category} · Note`,
      detail: item.content.replace(/[#*`_>]/g, '').slice(0, 120),
      updatedAt: item.updatedAt,
    })),
    ...media.filter((item) => item.isFavorite).map((item) => ({
      title: item.title,
      subtitle: `${TYPE_LABELS[item.type]} · Watchlist`,
      detail: item.description,
      updatedAt: item.updatedAt,
    })),
  ]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  // Time-aware greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Editorial Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
            {greeting}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {totalArchives} items archived across your collection.
          </p>
        </div>
        <div className="text-xs font-mono text-zinc-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Precision Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Tools */}
        <div
          onClick={() => setActiveTab('tools')}
          className="surface-card rounded-xl p-4 cursor-pointer group hover:border-white/[0.15] transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Tools</span>
            <Wrench className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold font-mono tabular-nums text-white">
                {tools.length}
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">saved</span>
            </div>
            <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden mt-2.5">
              <div
                className="h-full bg-zinc-400"
                style={{ width: `${Math.min(100, tools.length * 10)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div
          onClick={() => setActiveTab('notes')}
          className="surface-card rounded-xl p-4 cursor-pointer group hover:border-white/[0.15] transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Notes</span>
            <FileText className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold font-mono tabular-nums text-white">
                {notes.length}
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">documents</span>
            </div>
            <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden mt-2.5">
              <div
                className="h-full bg-zinc-400"
                style={{ width: `${Math.min(100, notes.length * 12)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Watchlist */}
        <div
          onClick={() => setActiveTab('watchlist')}
          className="surface-card rounded-xl p-4 cursor-pointer group hover:border-white/[0.15] transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Watchlist</span>
            <Film className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold font-mono tabular-nums text-white">
                {media.length}
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">tracked</span>
            </div>
            <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden mt-2.5">
              <div
                className="h-full bg-zinc-400"
                style={{ width: `${Math.min(100, media.length * 10)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Favorites */}
        <div
          onClick={() => setActiveTab('favorites')}
          className="surface-card rounded-xl p-4 cursor-pointer group hover:border-white/[0.15] transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Favorites</span>
            <Star className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400 transition-colors" />
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold font-mono tabular-nums text-white">
                {favoritesCount}
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">starred</span>
            </div>
            <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden mt-2.5">
              <div
                className="h-full bg-amber-400/80"
                style={{ width: `${Math.min(100, favoritesCount * 15)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Text feeds: Watchlist & Favorites */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="surface-card rounded-xl p-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Film className="w-3.5 h-3.5 text-zinc-400" />
              <span>Watchlist</span>
            </div>
            <button onClick={() => setActiveTab('watchlist')} className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1">
              <span>All ({media.length})</span><ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {recentMedia.length === 0 ? (
              <p className="py-5 text-[11px] text-zinc-500">No watchlist titles yet.</p>
            ) : recentMedia.map((item) => (
              <button key={item.id} onClick={() => setActiveTab('watchlist')} className="w-full text-left py-3 group">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-white truncate group-hover:text-zinc-300">{item.title}</span>
                  <span className="text-[10px] font-mono text-amber-400 shrink-0">
                    {item.rating > 0 && item.rating !== 8.5 ? `★ ${item.rating}/10` : 'Rating unavailable'}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">
                  {TYPE_LABELS[item.type]} · {item.releaseYear} · {item.status.replaceAll('_', ' ')}
                </p>
                <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">{item.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="surface-card rounded-xl p-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span>Favorites</span>
            </div>
            <button onClick={() => setActiveTab('favorites')} className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1">
              <span>All ({favoritesCount})</span><ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {recentFavorites.length === 0 ? (
              <p className="py-5 text-[11px] text-zinc-500">No favorites yet.</p>
            ) : recentFavorites.map((item) => (
              <button key={`${item.subtitle}-${item.title}`} onClick={() => setActiveTab('favorites')} className="w-full text-left py-3 group">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-white truncate group-hover:text-zinc-300">{item.title}</span>
                  <span className="text-[10px] font-mono text-zinc-500 shrink-0">Favorite</span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">{item.subtitle}</p>
                <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">{item.detail}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Split Feeds: Recent Tools & Recent Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tools Section */}
        <div className="surface-card rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Wrench className="w-3.5 h-3.5 text-zinc-400" />
                <span>Recently Added Tools</span>
              </div>
              <button
                onClick={() => setActiveTab('tools')}
                className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>All ({tools.length})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {recentTools.map((t) => (
                <div key={t.id} className="py-2.5 flex items-center justify-between gap-3 group">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white group-hover:text-zinc-300 transition-colors truncate">
                        {t.title}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">· {t.category}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{t.description}</p>
                  </div>

                  {t.url && (
                    <a
                      href={t.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors shrink-0"
                      title="Open link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="surface-card rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span>Recently Edited Notes</span>
              </div>
              <button
                onClick={() => setActiveTab('notes')}
                className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>All ({notes.length})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {recentNotes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => setActiveTab('notes')}
                  className="py-2.5 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white group-hover:text-zinc-300 transition-colors truncate">
                      {n.title}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                      {new Date(n.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5 font-mono">
                    {n.content.replace(/[#*`_>]/g, '').slice(0, 75)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
