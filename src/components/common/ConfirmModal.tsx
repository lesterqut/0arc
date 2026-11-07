import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md surface-elevated border border-white/[0.08] rounded-t-2xl sm:rounded-xl shadow-2xl p-5 relative animate-in zoom-in-95 duration-150 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5">
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 text-zinc-400 hover:text-white p-2 rounded-md hover:bg-white/[0.06] transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5">
          <div
            className={`p-2 rounded-lg shrink-0 ${
              isDestructive
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-white/[0.06] text-zinc-300 border border-white/[0.08]'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>

          <div className="flex-1 pr-6">
            <h3 className="text-sm font-semibold text-white tracking-tight">{title}</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 pt-3 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 sm:flex-none px-3 py-2.5 sm:py-1.5 text-xs text-zinc-400 hover:text-white rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 sm:flex-none px-3.5 py-2.5 sm:py-1.5 text-xs font-medium rounded-lg transition-colors ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-white hover:bg-zinc-200 text-black'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
