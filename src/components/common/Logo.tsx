import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showTagline = false }) => {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const glyphSizeClasses = {
    sm: 'w-4 h-4 text-[10px]',
    md: 'w-5 h-5 text-xs',
    lg: 'w-6 h-6 text-sm',
  };

  return (
    <div className="flex items-center gap-2 select-none group cursor-pointer">
      {/* Precision styled 0 glyph badge */}
      <div
        className={`${glyphSizeClasses[size]} rounded-md bg-white text-black flex items-center justify-center font-mono font-bold shrink-0 transition-transform group-hover:scale-105`}
      >
        <span className="leading-none">0</span>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className={`font-semibold tracking-tight text-white ${sizeClasses[size]}`}
          >
            arc
          </span>
        </div>
        {showTagline && (
          <span className="text-[10px] text-zinc-500 font-mono tracking-tight mt-0.5">
            Everything worth keeping
          </span>
        )}
      </div>
    </div>
  );
};
