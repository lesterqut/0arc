import React, { useState, useEffect, useRef } from 'react';
import { ToolItem, ToolCategory } from '../../types';
import { X, Sparkles } from 'lucide-react';

interface ToolModalProps {
  isOpen: boolean;
  toolToEdit?: ToolItem | null;
  onClose: () => void;
  onSave: (toolData: Omit<ToolItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const ToolModal: React.FC<ToolModalProps> = ({
  isOpen,
  toolToEdit,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<ToolCategory>('Development');
  const [tags, setTags] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFinding, setIsFinding] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiFilled, setAiFilled] = useState(false);
  const originalFields = useRef({ title: '', description: '', url: '', category: 'Development' as ToolCategory, tags: '' });

  useEffect(() => {
    if (toolToEdit) {
      setTitle(toolToEdit.title);
      setDescription(toolToEdit.description);
      setUrl(toolToEdit.url || '');
      setCategory(toolToEdit.category);
      setTags(toolToEdit.tags.join(', '));
      setIsFavorite(toolToEdit.isFavorite);
    } else {
      setTitle('');
      setDescription('');
      setUrl('');
      setCategory('Development');
      setTags('');
      setIsFavorite(false);
    }
  }, [toolToEdit, isOpen]);

  if (!isOpen) return null;

  const handleFind = async () => {
    if (aiFilled) {
      setTitle(originalFields.current.title);
      setDescription(originalFields.current.description);
      setUrl(originalFields.current.url);
      setCategory(originalFields.current.category);
      setTags(originalFields.current.tags);
      setAiFilled(false);
      setAiError('');
      return;
    }

    if (!title.trim()) {
      setAiError('Enter a tool name before finding details.');
      return;
    }

    originalFields.current = { title, description, url, category, tags };
    setIsFinding(true);
    setAiError('');
    try {
      const response = await fetch('/api/ai/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'tool', title, description, url, category, tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean) }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok || !payload.data) throw new Error(payload.error || 'Unable to find details.');
      const data = payload.data;
      setTitle(title.trim() || data.title || '');
      setDescription(description.trim() || data.description || '');
      setUrl(url.trim() || data.url || '');
      setCategory(data.category || category);
      setTags(tags.trim() || (data.tags || []).join(', '));
      setAiFilled(true);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Unable to find details right now.');
    } finally {
      setIsFinding(false);
    }
  };

  const handleCorrect = async () => {
    setIsCorrecting(true);
    setAiError('');
    try {
      const response = await fetch('/api/ai/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: description,
          tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok || !payload.data) throw new Error(payload.error || 'Unable to correct text.');
      setTitle(payload.data.title || title);
      setDescription(payload.data.content || description);
      setTags((payload.data.tags || []).join(', '));
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Unable to correct text right now.');
    } finally {
      setIsCorrecting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const tagsArray = tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    onSave({
      title: title.trim(),
      description: description.trim(),
      url: url.trim() || undefined,
      category,
      tags: tagsArray.length > 0 ? tagsArray : [category.toLowerCase()],
      isFavorite,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-lg surface-elevated rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] border border-white/[0.08] pb-[env(safe-area-inset-bottom)] sm:pb-0">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/15 sm:hidden shrink-0" />
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/[0.06] shrink-0">
          <h2 className="text-sm font-semibold text-white tracking-tight">
            {toolToEdit ? 'Edit Tool' : 'Add Tool'}
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCorrect}
              disabled={isCorrecting}
              className="flex items-center gap-1.5 rounded-md border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-200 transition-colors hover:bg-emerald-400/20 disabled:cursor-wait disabled:opacity-60"
              title="Fix spelling and capitalization"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isCorrecting ? 'Fixing...' : 'Fix text'}
            </button>
            <button
              type="button"
              onClick={handleFind}
              disabled={isFinding}
              className="flex items-center gap-1.5 rounded-md border border-violet-400/25 bg-violet-400/10 px-2.5 py-1.5 text-[11px] font-medium text-violet-200 transition-colors hover:bg-violet-400/20 disabled:cursor-wait disabled:opacity-60"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isFinding ? 'Finding...' : aiFilled ? 'Clear found' : 'Find details'}
            </button>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-2 -mr-2 rounded-md hover:bg-white/[0.06] transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4"
        >
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Cursor, Linear, Raycast"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/[0.08] text-sm sm:text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="What makes this tool worth archiving?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/[0.08] text-sm sm:text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 resize-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">
                URL (optional)
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                inputMode="url"
                className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/[0.08] text-sm sm:text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors font-mono sm:text-[11px]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ToolCategory)}
                className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/[0.08] text-sm sm:text-xs text-white focus:outline-none focus:border-white/30 transition-colors font-mono sm:text-[11px]"
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
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/[0.08] text-sm sm:text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors font-mono sm:text-[11px]"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="tool-modal-fav"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="rounded bg-black/40 border-white/[0.2] accent-white"
            />
            <label htmlFor="tool-modal-fav" className="text-xs text-zinc-300 cursor-pointer select-none">
              Favorite
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-3 py-2.5 sm:py-1.5 text-xs text-zinc-400 hover:text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-none px-3.5 py-2.5 sm:py-1.5 text-xs font-medium text-black bg-white hover:bg-zinc-200 rounded-lg transition-colors"
            >
              {toolToEdit ? 'Save Changes' : 'Add Tool'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
