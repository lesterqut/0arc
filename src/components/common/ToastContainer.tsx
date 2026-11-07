import React from 'react';
import { useArchive } from '../../context/ArchiveContext';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useArchive();

  return (
    <div className="fixed z-50 flex flex-col gap-2 pointer-events-none left-3 right-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:left-auto sm:right-5 sm:bottom-5 sm:max-w-sm sm:w-full">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
            info: <Info className="w-3.5 h-3.5 text-zinc-300 shrink-0" />,
            warning: <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
            error: <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />,
          };

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl surface-elevated border border-white/[0.08] shadow-2xl backdrop-blur-xl group"
            >
              <div className="mt-0.5">{icons[toast.type]}</div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-white leading-snug tracking-tight">
                  {toast.title}
                </h4>
                {toast.message && (
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed break-words font-mono">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-zinc-500 hover:text-white p-2 -mr-2 -mt-2 rounded-md hover:bg-white/[0.06] transition-colors"
                aria-label="Dismiss toast"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
