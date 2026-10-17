/**
 * Pause Modal: Spider-Man Metropolis
 * Controls summary, audio toggles, and position reset.
 */

import React from 'react';

interface PauseModalProps {
  onResume: () => void;
  onRestartVehicle: () => void;
  onReturnTitle: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestartVehicle,
  onReturnTitle,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 pointer-events-auto select-none">
      <div className="w-full max-w-md bg-zinc-950 border border-red-500/30 rounded-xl shadow-2xl p-6 flex flex-col gap-5 font-sans">
        {/* Title */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-xl font-bold font-sans text-white tracking-wide uppercase">
              Patrol Paused
            </h2>
          </div>
          <span className="text-xs font-mono text-zinc-400">Esc to Resume</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onResume}
            className="cursor-pointer w-full py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm tracking-wider uppercase rounded-lg shadow-md transition-all duration-150"
          >
            Resume Patrol
          </button>

          <button
            type="button"
            onClick={onRestartVehicle}
            className="cursor-pointer w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-zinc-200 font-semibold text-xs tracking-wider uppercase rounded-lg transition-colors"
          >
            Reset Supercar to Midtown Square
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="cursor-pointer w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-zinc-200 font-semibold text-xs tracking-wider uppercase rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span>Audio & BGM Soundtrack:</span>
            <span className={isMuted ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
              {isMuted ? 'MUTED' : 'PLAYING'}
            </span>
          </button>

          <button
            type="button"
            onClick={onReturnTitle}
            className="cursor-pointer w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white font-semibold text-xs tracking-wider uppercase rounded-lg transition-colors"
          >
            Return to Title Screen
          </button>
        </div>

        {/* Controls Cheatsheet */}
        <div className="p-3.5 bg-zinc-900/80 rounded border border-white/10 text-xs font-mono text-zinc-300 flex flex-col gap-1.5">
          <div className="text-red-400 font-bold uppercase tracking-wider text-[11px]">
            Superhero & Supercar Controls:
          </div>
          <div>• <kbd className="text-white font-bold bg-white/10 px-1 rounded">Space</kbd> : Web-Swing (Hold & Release at peak to soar)</div>
          <div>• <kbd className="text-white font-bold bg-white/10 px-1 rounded">Q</kbd> : Web-Zip (Launch to skyscraper rooftop)</div>
          <div>• <kbd className="text-white font-bold bg-white/10 px-1 rounded">Click / J</kbd> : Combat Attack Combo</div>
          <div>• <kbd className="text-white font-bold bg-white/10 px-1 rounded">E</kbd> : Web-Shoot Immobilize / Enter Supercar</div>
          <div>• <kbd className="text-white font-bold bg-white/10 px-1 rounded">Shift</kbd> : Spider-Sense Reflex Counter Dodge / Nitro Boost</div>
        </div>
      </div>
    </div>
  );
};
