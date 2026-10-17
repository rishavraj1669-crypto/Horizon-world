/**
 * Title Screen: Spider-Man Metropolis Open World
 * Bespoke Spider insignia SVG, live 3D skyline flyover, start patrol CTA,
 * and clean superhero control hints.
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
    <div className="absolute inset-0 z-40 flex flex-col justify-between p-6 sm:p-12 pointer-events-none select-none bg-gradient-to-t from-black/80 via-black/25 to-black/60">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-black/60 border border-red-500/30 rounded text-xs uppercase tracking-widest text-red-400 font-mono">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          Metropolis Police Dispatch · All Units Alert
        </div>
        <div className="text-xs font-mono text-white/70 tracking-wider">
          3D REALISTIC ENGINE · V10 SUPERCAR
        </div>
      </div>

      {/* Hero Title Lockup & Start CTA */}
      <div className="max-w-2xl flex flex-col items-start gap-5">
        <div className="flex flex-col gap-2">
          {/* Spider-Man Emblem & Subtitle */}
          <div className="flex items-center gap-3">
            <svg
              className="w-10 h-10 text-red-500 drop-shadow-md"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Iconic Spider Crest */}
              <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
              {/* Spider Body */}
              <ellipse cx="24" cy="24" rx="3.5" ry="6" fill="currentColor" />
              <circle cx="24" cy="16" r="3" fill="currentColor" />
              {/* Legs */}
              <path d="M21 21C16 16 12 18 8 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M27 21C32 16 36 18 40 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M20 24C14 24 10 27 6 32" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M28 24C34 24 38 27 42 32" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M21 27C17 31 14 36 11 41" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M27 27C31 31 34 36 37 41" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <span className="text-xs uppercase tracking-[0.35em] text-red-400 font-mono font-bold">
              YOUR FRIENDLY NEIGHBORHOOD
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white drop-shadow-lg uppercase font-sans">
            SPIDER<span className="text-red-500">-</span>MAN
          </h1>
          <div className="text-xl sm:text-2xl font-bold tracking-wider text-blue-400 uppercase -mt-2">
            METROPOLIS OPEN WORLD
          </div>

          <p className="text-sm sm:text-base text-zinc-200/90 max-w-lg leading-relaxed font-sans font-normal pt-1 drop-shadow">
            Web-swing between 160m tall skyscrapers, engage syndicate thugs in high-impact combat combos with Spider-Sense dodges, and drive a high-performance exotic supercar with screaming V10 audio!
          </p>
        </div>

        {/* Start Patrol CTA */}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            type="button"
            data-start="true"
            onClick={onStart}
            className="pointer-events-auto cursor-pointer group flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-extrabold text-base tracking-wider uppercase rounded shadow-lg shadow-red-600/35 transition-all duration-150"
          >
            <span>Start Patrol</span>
            <svg
              className="w-5 h-5 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>

          <span className="text-xs font-mono text-zinc-300">
            Press <kbd className="px-2 py-1 bg-white/15 rounded text-white font-mono font-semibold">Space</kbd> or <kbd className="px-2 py-1 bg-white/15 rounded text-white font-mono font-semibold">Enter</kbd>
          </span>
        </div>
      </div>

      {/* Control Hints Footer */}
      <div className="w-full text-center text-xs font-mono text-zinc-300/80 tracking-wider bg-black/40 py-2 rounded border border-white/5">
        WASD Move · Space Web-Swing / Jump · Q Web-Zip · Left Click / J Attack · E Web-Trap / Enter Supercar · Shift Dodge · Esc Pause
      </div>
    </div>
  );
};
