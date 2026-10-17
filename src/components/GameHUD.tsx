/**
 * GameHUD: World-Matched, Low-Occlusion Perimeter HUD Clusters
 * Unobstructed center, tabular numerals, live mechanics parity.
 */

import React from 'react';
import { Quest } from '../game/npcData';
import { LANDMARK_COORDS } from '../game/terrain';
import { formatTimeOfDay, WeatherType } from '../game/weather';

interface GameHUDProps {
  speedKmh: number;
  rpm: number;
  gear: number;
  inVehicle: boolean;
  headlightsOn: boolean;
  fuel: number;
  timeOfDay: number;
  weather: WeatherType;
  coordX: number;
  coordZ: number;
  headingDeg: number;
  interactPrompt: string | null;
  activeQuests: Quest[];
  isMuted: boolean;
  showTouchHUD?: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onInteract: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  speedKmh,
  rpm,
  gear,
  inVehicle,
  headlightsOn,
  fuel,
  timeOfDay,
  weather,
  coordX,
  coordZ,
  headingDeg,
  interactPrompt,
  activeQuests,
  isMuted,
  showTouchHUD = false,
  onToggleMute,
  onPause,
  onInteract,
}) => {
  // Nearest landmark distance calculation
  let nearestLandmark = LANDMARK_COORDS[0];
  let minLandmarkDist = 999;
  for (const lm of LANDMARK_COORDS) {
    const dist = Math.hypot(coordX - lm.x, coordZ - lm.z);
    if (dist < minLandmarkDist) {
      minLandmarkDist = dist;
      nearestLandmark = lm;
    }
  }

  // Active incomplete quest
  const currentQuest = activeQuests.find((q) => !q.isCompleted) || activeQuests[0];
  const questDist = currentQuest ? Math.round(Math.hypot(coordX - currentQuest.targetX, coordZ - currentQuest.targetZ)) : 0;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Bar: Compass Tape + Telemetry (Left) & Weather / System Controls (Right) */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Compass Tape & Coordinates */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3 px-3 py-1.5 bg-zinc-950/75 border border-white/10 rounded-md shadow-md">
            {/* Compass Heading */}
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="text-emerald-400 font-bold">{headingDeg}°</span>
              <span className="text-zinc-400 font-medium">
                {headingDeg >= 338 || headingDeg < 23
                  ? 'N'
                  : headingDeg < 68
                  ? 'NE'
                  : headingDeg < 113
                  ? 'E'
                  : headingDeg < 158
                  ? 'SE'
                  : headingDeg < 203
                  ? 'S'
                  : headingDeg < 248
                  ? 'SW'
                  : headingDeg < 293
                  ? 'W'
                  : 'NW'}
              </span>
            </div>

            <div className="w-[1px] h-3.5 bg-white/20" />

            {/* Coordinates */}
            <div className="font-mono text-xs text-zinc-300 tabular-nums">
              <span className="text-zinc-500 mr-1">LOC</span>
              <span>X:{coordX}</span> <span className="text-zinc-500">·</span> <span>Z:{coordZ}</span>
            </div>

            <div className="w-[1px] h-3.5 bg-white/20" />

            {/* Sector Landmark */}
            <div className="text-xs text-emerald-300 font-mono hidden sm:inline">
              {nearestLandmark.name} ({Math.round(minLandmarkDist)}m)
            </div>
          </div>

          {/* Compact Mini Telemetry for Mobile when Touch HUD is active */}
          {showTouchHUD && inVehicle && (
            <div className="sm:hidden flex items-center gap-2 px-2.5 py-1 bg-zinc-950/80 border border-white/10 rounded-md text-xs font-mono shadow-md w-fit">
              <span className="text-lg font-black text-white tabular-nums">{Math.round(speedKmh)}</span>
              <span className="text-[10px] text-zinc-400 font-bold">KM/H</span>
              <span className="text-zinc-600">·</span>
              <span className="text-emerald-400 font-bold text-[11px]">GEAR {gear === -1 ? 'R' : gear}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-sky-400 text-[11px] font-semibold tabular-nums">{Math.round(fuel)}% BOOST</span>
            </div>
          )}
        </div>

        {/* Top-Right: Time of Day, Weather State, Utility Buttons */}
        <div className="flex items-center gap-2">
          {/* Time & Weather */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-zinc-950/75 border border-white/10 rounded-md shadow-md text-xs font-mono">
            <span className="text-amber-300 font-semibold tabular-nums">{formatTimeOfDay(timeOfDay)}</span>
            <div className="w-[1px] h-3 bg-white/20" />
            <span className="uppercase text-zinc-200 capitalize">{weather}</span>
          </div>

          {/* Mute Button */}
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="pointer-events-auto cursor-pointer p-2 bg-zinc-950/75 hover:bg-zinc-800 border border-white/10 rounded-md text-zinc-300 hover:text-white transition-colors"
          >
            {isMuted ? (
              <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>

          {/* Pause Button */}
          <button
            type="button"
            onClick={onPause}
            aria-label="Pause Game"
            className="pointer-events-auto cursor-pointer p-2 bg-zinc-950/75 hover:bg-zinc-800 border border-white/10 rounded-md text-zinc-300 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Center Screen: Interactive Contextual Prompt (Press [E]) */}
      <div className="flex items-center justify-center">
        {interactPrompt && (
          <button
            type="button"
            onClick={onInteract}
            className="pointer-events-auto cursor-pointer px-5 py-2.5 bg-zinc-950/85 border border-emerald-400/60 rounded-full shadow-2xl flex items-center gap-3 animate-fade-in hover:scale-105 transition-transform"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
            <span className="font-mono text-sm font-semibold tracking-wide text-white">
              {interactPrompt}
            </span>
          </button>
        )}
      </div>

      {/* Bottom Perimeter Clusters: Left Dashboard & Right Objective Card */}
      <div className="flex items-end justify-between w-full pb-20 sm:pb-0">
        {/* Bottom-Left: Vehicle Telemetry Dashboard (on mobile with touch HUD, shown in top-left instead) */}
        <div className={`flex flex-col gap-2 p-3 bg-zinc-950/85 border border-white/10 rounded-lg shadow-xl backdrop-blur-none max-w-[210px] sm:max-w-xs ${
          showTouchHUD ? 'hidden sm:flex' : 'flex'
        }`}>
          {/* Status Header: In Vehicle or On Foot */}
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <span className={`w-2 h-2 rounded-full ${inVehicle ? 'bg-emerald-400' : 'bg-sky-400'}`} />
              {inVehicle ? '4X4 ROVER' : 'ON FOOT'}
            </span>
            {inVehicle && (
              <span className={`font-semibold ${headlightsOn ? 'text-amber-300' : 'text-zinc-600'}`}>
                {headlightsOn ? 'LIGHTS' : 'OFF'}
              </span>
            )}
          </div>

          {inVehicle ? (
            <div className="flex items-baseline gap-3 pt-0.5">
              {/* Hero Speedometer */}
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-4xl font-black font-mono text-white tabular-nums tracking-tight">
                  {Math.round(speedKmh)}
                </span>
                <span className="text-[10px] sm:text-xs uppercase font-mono text-zinc-400 font-bold">KM/H</span>
              </div>

              {/* Gear & RPM indicator */}
              <div className="flex flex-col gap-1 text-[11px] sm:text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400">GEAR</span>
                  <span className="font-bold text-emerald-400 text-xs sm:text-sm">
                    {gear === -1 ? 'R' : gear === 0 ? 'N' : gear}
                  </span>
                </div>
                {/* RPM Bar */}
                <div className="w-16 sm:w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 transition-all duration-75"
                    style={{ width: `${Math.min(100, (rpm / 6500) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-[11px] sm:text-xs font-mono text-zinc-400 leading-tight">
              Walking mode. Press <kbd className="text-white font-bold bg-white/10 px-1 py-0.5 rounded">E</kbd> near rover.
            </div>
          )}

          {/* Nitro / Boost Fuel Gauge */}
          {inVehicle && (
            <div className="flex flex-col gap-0.5 pt-0.5">
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-zinc-400">
                <span>BOOST</span>
                <span className="text-sky-400 font-semibold tabular-nums">{Math.round(fuel)}%</span>
              </div>
              <div className="w-full h-1 sm:h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 transition-all duration-100"
                  style={{ width: `${fuel}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom-Right: Active Expedition Objective */}
        {currentQuest && (
          <div className="p-3 bg-zinc-950/85 border border-white/10 rounded-lg shadow-xl max-w-xs text-xs font-mono hidden md:flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-zinc-400 uppercase tracking-wider text-[10px]">
              <span className="text-amber-400 font-bold">Active Objective</span>
              {currentQuest.isCompleted ? (
                <span className="text-emerald-400 font-bold">COMPLETED</span>
              ) : (
                <span className="text-zinc-300 tabular-nums">{questDist}m away</span>
              )}
            </div>

            <div className="text-white font-semibold text-sm">
              {currentQuest.title}
            </div>

            <p className="text-zinc-300 text-[11px] leading-tight">
              {currentQuest.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
