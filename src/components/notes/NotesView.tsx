import React, { useState, useMemo } from 'react';
import { useArchive } from '../../context/ArchiveContext';
import { NoteItem } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
import { Plus, Search, Star, Trash2, FileText, ChevronLeft } from 'lucide-react';

export const NotesView: React.FC = () => {
  const {
    notes,
    addNote,
    updateNote,
    deleteNote,
    toggleNoteFavorite,
    settings,
  } = useArchive();

  const [activeNoteId, setActiveNoteId] = useState<string | null>(notes[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [noteToDelete, setNoteToDelete] = useState<NoteItem | null>(null);
  // Phones show either the list or the editor, never both at once.
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0] || null;

  // Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => {
      if (n.category) set.add(n.category);
    });
    return ['All', ...Array.from(set)];
  }, [notes]);

  // Filtered notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === 'All' || n.category === selectedCategory;

      const matchesFav = !favoritesOnly || n.isFavorite;

      return matchesQuery && matchesCategory && matchesFav;
    });
  }, [notes, searchQuery, selectedCategory, favoritesOnly]);

  const handleCreateNewNote = () => {
    const newNote = addNote({
      title: '',
      content: '',
      category: 'General',
      tags: [],
      isFavorite: false,
    });
    setActiveNoteId(newNote.id);
    setMobileEditorOpen(true);
  };

  const handleTitleChange = (newTitle: string) => {
    if (!activeNote) return;
    setSaveStatus('saving');
    updateNote(activeNote.id, { title: newTitle });
    setTimeout(() => setSaveStatus('saved'), 350);
  };

  const handleContentChange = (newContent: string) => {
    if (!activeNote) return;
    setSaveStatus('saving');
    updateNote(activeNote.id, { content: newContent });
    setTimeout(() => setSaveStatus('saved'), 350);
  };

  const handleCategoryChange = (cat: string) => {
    if (!activeNote) return;
    updateNote(activeNote.id, { category: cat });
  };

  // Stats
  const wordCount = useMemo(() => {
    if (!activeNote || !activeNote.content) return 0;
    return activeNote.content.trim().split(/\s+/).filter(Boolean).length;
  }, [activeNote]);

  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="flex flex-col animate-in fade-in duration-150 md:h-[calc(100dvh-8rem)]">
      {/* Two-Column Clean Notes Workspace */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-0 border border-white/[0.08] rounded-2xl overflow-hidden bg-[#111113]">
        {/* Left Column: Note List */}
        <div
          className={`md:col-span-4 border-r border-white/[0.08] bg-[#0e0e10] flex-col h-[calc(100dvh-11rem)] md:h-full ${
            mobileEditorOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header & Search */}
          <div className="p-3 border-b border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Notes</span>
              <button
                onClick={handleCreateNewNote}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-medium transition-all active:scale-95 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/[0.2]"
              />
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-0.5">
              {categories.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-white/[0.1] text-white font-medium'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03]">
            {filteredNotes.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                <FileText className="w-6 h-6 mx-auto mb-2 text-zinc-600" />
                <p>No notes found</p>
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isActive = activeNote?.id === note.id;
                const previewText = note.content.replace(/[#*`_>]/g, '').trim() || 'Empty note...';
                const formattedDate = new Date(note.updatedAt || note.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div
                    key={note.id}
                    onClick={() => {
                      setActiveNoteId(note.id);
                      setMobileEditorOpen(true);
                    }}
                    className={`p-3 cursor-pointer transition-colors relative group ${
                      isActive
                        ? 'bg-white/[0.06] text-white'
                        : 'hover:bg-white/[0.02] text-zinc-400'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className={`text-xs font-semibold truncate ${
                          isActive ? 'text-white' : 'text-zinc-300 group-hover:text-white'
                        }`}
                      >
                        {note.title.trim() || 'Untitled Note'}
                      </h3>
                      {note.isFavorite && (
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0 mt-0.5" />
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-500 line-clamp-1 mt-1 font-sans">
                      {previewText}
                    </p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-600 mt-2">
                      <span>{formattedDate}</span>
                      <span className="text-zinc-500">{note.category}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Clean Distraction-Free Note Canvas */}
        <div
          className={`md:col-span-8 flex-col h-[calc(100dvh-11rem)] md:h-full bg-[#111113] ${
            mobileEditorOpen ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeNote ? (
            <>
              {/* Document Header Controls */}
              <div className="px-3 sm:px-6 py-3 border-b border-white/[0.06] flex items-center justify-between gap-2 text-xs text-zinc-400 select-none">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <button
                    onClick={() => setMobileEditorOpen(false)}
                    className="md:hidden p-2 -ml-2 rounded-lg text-zinc-400 hover:text-white transition-colors shrink-0"
                    aria-label="Back to notes list"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Category selector */}
                  <select
                    value={activeNote.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="bg-transparent border border-white/[0.08] hover:border-white/[0.2] px-2 py-0.5 rounded text-[11px] font-mono text-zinc-300 focus:outline-none cursor-pointer"
                  >
                    <option value="General" className="bg-[#18181a]">General</option>
                    <option value="Ideas" className="bg-[#18181a]">Ideas</option>
                    <option value="Design" className="bg-[#18181a]">Design</option>
                    <option value="Engineering" className="bg-[#18181a]">Engineering</option>
                    <option value="Writing" className="bg-[#18181a]">Writing</option>
                    <option value="Inbox" className="bg-[#18181a]">Inbox</option>
                  </select>

                  <span className="text-zinc-600">·</span>

                  <span className="font-mono text-[11px] text-zinc-500">
                    {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-zinc-500 hidden sm:inline">
                    {wordCount} words · {readTime} min read
                  </span>

                  <button
                    onClick={() => toggleNoteFavorite(activeNote.id)}
                    className="p-1 rounded text-zinc-400 hover:text-amber-400 transition-colors"
                    title={activeNote.isFavorite ? 'Unfavorite' : 'Favorite'}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        activeNote.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                      }`}
                    />
                  </button>

                  <button
                    onClick={() => {
                      if (settings.confirmBeforeDelete) {
                        setNoteToDelete(activeNote);
                      } else {
                        deleteNote(activeNote.id);
                      }
                    }}
                    className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
                    title="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Note Paper Canvas */}
              <div className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col overflow-y-auto overscroll-contain">
                <input
                  type="text"
                  placeholder="Note Title"
                  value={activeNote.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full text-2xl md:text-3xl font-semibold text-white bg-transparent outline-none placeholder:text-zinc-700 tracking-tight mb-4"
                />

                <textarea
                  placeholder="Start typing your note here..."
                  value={activeNote.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="w-full flex-1 bg-transparent resize-none outline-none text-zinc-200 text-base leading-relaxed placeholder:text-zinc-700 font-sans min-h-[45dvh] md:min-h-[350px]"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
              <FileText className="w-8 h-8 mb-2 text-zinc-600" />
              <p className="text-sm font-medium text-zinc-300">No note selected</p>
              <button
                onClick={handleCreateNewNote}
                className="mt-3 px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-medium transition-all"
              >
                Create a Note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(noteToDelete)}
        title="Delete Note"
        description={`Are you sure you want to delete "${noteToDelete?.title || 'Untitled Note'}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (noteToDelete) {
            deleteNote(noteToDelete.id);
            setNoteToDelete(null);
            setMobileEditorOpen(false);
          }
        }}
        onCancel={() => setNoteToDelete(null)}
      />
    </div>
  );
};
