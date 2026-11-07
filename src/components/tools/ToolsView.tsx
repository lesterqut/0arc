import React, { useState, useMemo } from 'react';
import { useArchive } from '../../context/ArchiveContext';
import { ToolItem, ToolCategory } from '../../types';
import { ToolModal } from './ToolModal';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Plus,
  Search,
  Star,
  ExternalLink,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  LayoutGrid,
  List,
  Wrench,
  Check,
} from 'lucide-react';

export const ToolsView: React.FC = () => {
  const {
    tools,
    addTool,
    updateTool,
    deleteTool,
    toggleToolFavorite,
    settings,
    addToast,
  } = useArchive();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alpha'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolItem | null>(null);
  const [toolToDelete, setToolToDelete] = useState<ToolItem | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories: string[] = [
    'All',
    'AI Tools',
    'Development',
    'Design',
    'Productivity',
    'Websites',
    'Software',
    'Learning',
    'Other',
  ];

  const filteredTools = useMemo(() => {
    return tools
      .filter((tool) => {
        const matchesQuery =
          tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tool.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory =
          selectedCategory === 'All' || tool.category === selectedCategory;

        const matchesFavorite = !favoritesOnly || tool.isFavorite;

        return matchesQuery && matchesCategory && matchesFavorite;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'alpha') {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
  }, [tools, searchQuery, selectedCategory, favoritesOnly, sortBy]);

  const handleCopyLink = (tool: ToolItem) => {
    if (!tool.url) return;
    navigator.clipboard.writeText(tool.url);
    setCopiedId(tool.id);
    addToast('Link Copied', 'info', tool.url);
    setTimeout(() => setCopiedId(null), 2000);
    setActiveMenuId(null);
  };

  const handleSaveTool = (toolData: Omit<ToolItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingTool) {
      updateTool(editingTool.id, toolData);
      setEditingTool(null);
    } else {
      addTool(toolData);
    }
  };

  const handleDeleteConfirm = () => {
    if (toolToDelete) {
      deleteTool(toolToDelete.id);
      setToolToDelete(null);
    }
  };

  const getDomainFromUrl = (urlString?: string) => {
    if (!urlString) return null;
    try {
      const parsed = new URL(urlString);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Tools & Resources
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {tools.length} saved tools, developer utilities, and web bookmarks.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingTool(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-medium transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Tool</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 sm:py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/[0.2]"
            />
          </div>

          {/* Controls: Favorites, Sort, View Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setFavoritesOnly((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-2 sm:py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                favoritesOnly
                  ? 'bg-amber-400/10 border-amber-400/30 text-amber-400'
                  : 'bg-white/[0.03] border-white/[0.08] text-zinc-400 hover:text-white'
              }`}
            >
              <Star
                className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-amber-400 text-amber-400' : ''}`}
              />
              <span>Favorites</span>
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'alpha')}
              className="px-2.5 py-2 sm:py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-zinc-300 focus:outline-none focus:border-white/[0.2]"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="alpha">Alphabetical</option>
            </select>

            <div className="flex items-center p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.08]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded text-xs transition-colors ${
                  viewMode === 'grid' ? 'bg-white/[0.1] text-white' : 'text-zinc-500 hover:text-white'
                }`}
                title="Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded text-xs transition-colors ${
                  viewMode === 'list' ? 'bg-white/[0.1] text-white' : 'text-zinc-500 hover:text-white'
                }`}
                title="List"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-white/[0.1] text-white font-medium border border-white/[0.1]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      {filteredTools.length === 0 ? (
        <div className="surface-card rounded-xl p-10 text-center space-y-2">
          <Wrench className="w-6 h-6 text-zinc-600 mx-auto" />
          <h3 className="text-xs font-medium text-white">No tools found</h3>
          <p className="text-[11px] text-zinc-500">
            Try adjusting your search query or filters.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTools.map((tool) => {
            const domain = getDomainFromUrl(tool.url);

            return (
              <div
                key={tool.id}
                className="surface-card rounded-xl p-4 flex flex-col justify-between group relative hover:border-white/[0.15] transition-all"
              >
                <div>
                  {/* Top Bar with Category & Actions */}
                  <div className="flex items-center justify-between text-xs text-zinc-500 mb-2.5">
                    <span className="text-[10px] font-mono font-medium text-zinc-400 uppercase tracking-wider">
                      {tool.category}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleToolFavorite(tool.id)}
                        className="p-1.5 rounded text-zinc-500 hover:text-amber-400 transition-colors"
                        title={tool.isFavorite ? 'Unfavorite' : 'Favorite'}
                        aria-label={tool.isFavorite ? 'Unfavorite' : 'Favorite'}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            tool.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                          }`}
                        />
                      </button>

                      <div className="relative">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === tool.id ? null : tool.id)}
                          className="p-1.5 rounded text-zinc-500 hover:text-white transition-colors"
                          aria-label="Entry actions"
                          aria-expanded={activeMenuId === tool.id}
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {activeMenuId === tool.id && (
                          <div className="absolute right-0 top-full mt-1 w-36 surface-elevated rounded-lg shadow-xl z-20 py-1 text-xs border border-white/[0.08]">
                            <button
                              onClick={() => {
                                setEditingTool(tool);
                                setModalOpen(true);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-3 py-2.5 sm:py-1.5 flex items-center gap-2 text-zinc-300 hover:text-white hover:bg-white/[0.06]"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            {tool.url && (
                              <button
                                onClick={() => handleCopyLink(tool)}
                                className="w-full text-left px-3 py-2.5 sm:py-1.5 flex items-center gap-2 text-zinc-300 hover:text-white hover:bg-white/[0.06]"
                              >
                                {copiedId === tool.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>Copy Link</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                if (settings.confirmBeforeDelete) {
                                  setToolToDelete(tool);
                                } else {
                                  deleteTool(tool.id);
                                }
                              }}
                              className="w-full text-left px-3 py-2.5 sm:py-1.5 flex items-center gap-2 text-red-400 hover:bg-white/[0.06]"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Title & Initial Icon */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-300 shrink-0 font-mono text-[11px] font-medium">
                      {tool.title.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-semibold text-white truncate">
                        {tool.title}
                      </h3>
                      {domain && (
                        <p className="text-[10px] text-zinc-400 font-mono truncate">{domain}</p>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-zinc-400 mt-2 line-clamp-3 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                {/* Footer with tags & external link */}
                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-zinc-400">
                  <div className="flex items-center gap-1.5 flex-wrap truncate font-mono">
                    {tool.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-zinc-500">
                        #{tag}
                      </span>
                    ))}
                    {tool.tags.length > 2 && (
                      <span className="text-zinc-600">+{tool.tags.length - 2}</span>
                    )}
                  </div>

                  {tool.url && (
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-400 hover:text-white flex items-center gap-1 font-mono transition-colors shrink-0"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="surface-card rounded-xl divide-y divide-white/[0.04] overflow-hidden">
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center font-mono text-[10px] text-zinc-400 font-medium shrink-0">
                  {tool.title.charAt(0)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">
                      {tool.title}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">· {tool.category}</span>
                    {tool.tags.slice(0, 2).map((t) => (
                      <span key={t} className="text-[10px] font-mono text-zinc-600 hidden md:inline">
                        #{t}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{tool.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                {tool.url && (
                  <a
                    href={tool.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-white"
                  >
                    <span>Visit</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                <button
                  onClick={() => toggleToolFavorite(tool.id)}
                  className="p-1.5 rounded text-zinc-500 hover:text-amber-400 transition-colors"
                  aria-label={tool.isFavorite ? 'Unfavorite' : 'Favorite'}
                >
                  <Star
                    className={`w-3.5 h-3.5 ${
                      tool.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                    }`}
                  />
                </button>

                <button
                  onClick={() => {
                    setEditingTool(tool);
                    setModalOpen(true);
                  }}
                  className="p-1.5 rounded text-zinc-500 hover:text-white transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    if (settings.confirmBeforeDelete) {
                      setToolToDelete(tool);
                    } else {
                      deleteTool(tool.id);
                    }
                  }}
                  className="p-1.5 rounded text-zinc-500 hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tool Modal */}
      <ToolModal
        isOpen={modalOpen}
        toolToEdit={editingTool}
        onClose={() => {
          setModalOpen(false);
          setEditingTool(null);
        }}
        onSave={handleSaveTool}
      />

      <ConfirmModal
        isOpen={Boolean(toolToDelete)}
        title="Delete Tool?"
        description={`Are you sure you want to delete "${toolToDelete?.title}"?`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setToolToDelete(null)}
      />
    </div>
  );
};
