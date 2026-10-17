/**
 * Pause Modal Card: World-matched typography and palette, resume, restart, controls summary.
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 pointer-events-auto select-none">
      <div className="w-full max-w-md bg-zinc-950 border border-white/15 rounded-xl shadow-2xl p-6 flex flex-col gap-5 font-sans animate-fade-in">
        {/* Title */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <h2 className="text-xl font-bold font-sans text-white tracking-wide uppercase">
              Expedition Paused
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
            className="cursor-pointer w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm tracking-wider uppercase rounded-lg shadow-md transition-all duration-150"
          >
            Resume Expedition
          </button>

          <button
            type="button"
            onClick={onRestartVehicle}
            className="cursor-pointer w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-white/10 hover:border-white/20 text-zinc-200 font-semibold text-xs tracking-wider uppercase rounded-lg transition-colors"
          >
            Reset Rover to Camp (Spawn)
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="cursor-pointer w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-white/10 hover:border-white/20 text-zinc-200 font-semibold text-xs tracking-wider uppercase rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span>Audio Status:</span>
            <span className={isMuted ? 'text-rose-400' : 'text-emerald-400'}>
              {isMuted ? 'MUTED' : 'ENABLED'}
            </span>
          </button>

          <button
            type="button"
            onClick={onReturnTitle}
            className="cursor-pointer w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white font-semibold text-xs tracking-wider uppercase rounded-lg transition-colors"
          >
            Return to Title Screen
          </button>
        </div>

        {/* Quick controls breakdown */}
        <div className="p-3 bg-zinc-900/60 rounded border border-white/5 text-[11px] font-mono text-zinc-400 flex flex-col gap-1">
          <div className="text-zinc-300 font-semibold">Quick Reminder:</div>
          <div>• Press <kbd className="text-white font-bold">E</kbd> to exit rover and walk on foot</div>
          <div>• Press <kbd className="text-white font-bold">Shift</kbd> for Nitro Boost / Sprint</div>
          <div>• Press <kbd className="text-white font-bold">C</kbd> to toggle Cockpit / Chase / Orbit camera</div>
        </div>
      </div>
    </div>
  );
};
