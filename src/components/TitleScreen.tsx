/**
 * Title Screen with Live 3D World Tour backdrop, bespoke SVG title lockup,
 * primary Start CTA with keyboard binding, and clean control hints.
 */

import React, { useEffect } from 'react';

interface TitleScreenProps {
  onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-between p-8 sm:p-12 pointer-events-none select-none">
      {/* Top ambient title kicker */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-white/10 rounded text-xs uppercase tracking-widest text-emerald-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Simulation Ready · v1.4
        </div>
        <div className="text-xs font-mono text-white/50 tracking-wider">
          OPEN WORLD 3D ENGINE
        </div>
      </div>

      {/* Hero Title Lockup & Start CTA (positioned in bottom-left third for calm negative space) */}
      <div className="max-w-xl flex flex-col items-start gap-6">
        {/* Bespoke inline SVG emblem & Title lockup */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <svg
              className="w-10 h-10 text-emerald-400"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Mountain ridge outline */}
              <path
                d="M4 32L16 12L24 24L30 16L38 32H4Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              {/* Sun crest */}
              <circle cx="28" cy="11" r="3.5" fill="#facc15" />
              {/* Compass cross */}
              <circle cx="20" cy="20" r="16" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>
            <span className="text-xs uppercase tracking-[0.35em] text-emerald-400/90 font-mono font-semibold">
              OVERLAND EXPEDITION
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white drop-shadow-md uppercase font-sans">
            Horizon<span className="text-emerald-400">.</span>World
          </h1>

          <p className="text-sm sm:text-base text-zinc-300/90 max-w-md leading-relaxed font-sans font-normal">
            Traverse procedurally sculpted alpine valleys, endure dynamic weather squalls, drive your rugged 4x4 overland rig, and assist local wayfarers.
          </p>
        </div>

        {/* Start Game Action Handshake */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="button"
            data-start="true"
            onClick={onStart}
            className="pointer-events-auto cursor-pointer group flex items-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-bold text-base tracking-wider uppercase rounded shadow-lg shadow-emerald-500/25 transition-all duration-150"
          >
            <span>Start Expedition</span>
            <svg
              className="w-5 h-5 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>

          <span className="text-xs font-mono text-zinc-400">
            Press <kbd className="px-2 py-1 bg-white/10 rounded text-white font-mono font-semibold">Enter</kbd> or <kbd className="px-2 py-1 bg-white/10 rounded text-white font-mono font-semibold">Space</kbd>
          </span>
        </div>
      </div>

      {/* Flat borderless control hint line in safe margin */}
      <div className="w-full text-center text-xs font-mono text-zinc-400/80 tracking-wider">
        WASD Drive · Shift Boost · Space Brake/Jump · E Exit/Enter & Talk · C Camera · L Lights · H Horn · Esc Pause
      </div>
    </div>
  );
};
