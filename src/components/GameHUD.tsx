/**
 * Spider-Man & Supercar GameHUD
 * Displays live Spider-Man suit telemetry (Health, Web Fluid, Spider-Sense alert, Combo Streak, Score),
 * Supercar digital speedometer and roaring RPM tachometer when driving,
 * City compass radar, and action prompts.
 */

import React from 'react';
import { Quest } from '../game/npcData';
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
  spidermanHealth?: number;
  webFluid?: number;
  isSwinging?: boolean;
  comboCount?: number;
  spiderSenseActive?: boolean;
  totalScore?: number;
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
  spidermanHealth = 100,
  webFluid = 100,
  isSwinging = false,
  comboCount = 0,
  spiderSenseActive = false,
  totalScore = 0,
  onToggleMute,
  onPause,
  onInteract,
}) => {
  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none flex flex-col justify-between p-3 sm:p-5 font-sans">
      {/* Top Header Bar: Spider-Man Suit Telemetry (Left) & City Weather / Audio / Pause (Right) */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Spider-Man Suit Health & Web Fluid Gauge */}
        <div className="flex flex-col gap-2">
          {/* Superhero Suit Identity */}
          <div className="flex items-center gap-3 px-3 py-1.5 bg-black/75 border border-red-500/40 rounded-lg shadow-lg">
            {/* Spider Emblem */}
            <div className="w-6 h-6 rounded-full bg-red-600/30 flex items-center justify-center border border-red-500">
              <span className="text-red-400 text-xs font-bold">🕷</span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-red-400 font-mono">
                  SUIT INTEGRITY
                </span>
                <span className="text-xs font-mono font-bold text-white tabular-nums">
                  {Math.round(spidermanHealth)}%
                </span>
              </div>
              {/* Health Progress Bar */}
              <div className="w-36 sm:w-44 h-2 bg-zinc-800 rounded-full overflow-hidden mt-0.5">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-150"
                  style={{ width: `${Math.max(0, Math.min(100, spidermanHealth))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Web Fluid Cartridges Gauge */}
          <div className="flex items-center gap-2 px-3 py-1 bg-black/60 border border-blue-500/30 rounded-md">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400">
              WEB FLUID
            </span>
            <div className="w-24 sm:w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 transition-all duration-150"
                style={{ width: `${Math.max(0, Math.min(100, webFluid))}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-blue-300 tabular-nums">
              {Math.round(webFluid)}%
            </span>
          </div>

          {/* Compass & City Coordinates */}
          <div className="flex items-center gap-2 px-2.5 py-1 bg-black/50 border border-white/10 rounded font-mono text-xs text-zinc-300">
            <span className="text-emerald-400 font-bold">{headingDeg}°</span>
            <span className="text-zinc-500">|</span>
            <span className="text-zinc-400">METROPOLIS</span>
            <span className="text-zinc-400 tabular-nums">X:{coordX} Z:{coordZ}</span>
          </div>
        </div>

        {/* Right: City Clock, BGM/Mute, Pause */}
        <div className="flex items-center gap-2">
          {/* Score & Combo */}
          <div className="hidden sm:flex flex-col items-end px-3 py-1 bg-black/60 border border-white/10 rounded">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">SCORE</span>
            <span className="text-sm font-mono font-bold text-amber-400 tabular-nums">
              {totalScore.toLocaleString()}
            </span>
          </div>

          {/* Time & Weather */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/70 border border-white/10 rounded-md text-xs font-mono">
            <span className="text-amber-400 font-bold">{formatTimeOfDay(timeOfDay)}</span>
            <span className="text-zinc-500">|</span>
            <span className="text-zinc-300 uppercase">{weather}</span>
          </div>

          {/* Audio BGM Mute Toggle */}
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute Audio & BGM' : 'Mute Audio & BGM'}
            className="pointer-events-auto cursor-pointer p-2 bg-black/70 hover:bg-black/90 active:scale-95 border border-white/15 rounded-md text-zinc-200 transition-all"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          {/* Pause Button */}
          <button
            type="button"
            onClick={onPause}
            aria-label="Pause Game"
            className="pointer-events-auto cursor-pointer px-3 py-1.5 bg-black/70 hover:bg-black/90 active:scale-95 border border-white/15 rounded-md text-zinc-200 font-mono text-xs font-bold transition-all"
          >
            PAUSE
          </button>
        </div>
      </div>

      {/* Center Alerts: Spider-Sense Warning & Combo Counter */}
      <div className="flex flex-col items-center justify-center gap-2 w-full my-auto">
        {/* SPIDER-SENSE WARNING BANNER */}
        {spiderSenseActive && (
          <div className="animate-bounce flex items-center gap-2 px-5 py-2 bg-red-600/90 border-2 border-yellow-300 rounded-full shadow-2xl shadow-red-500/50 backdrop-blur-none">
            <span className="text-yellow-300 text-lg font-black">⚠️</span>
            <span className="text-white font-extrabold tracking-wider uppercase text-sm sm:text-base font-sans drop-shadow">
              SPIDER-SENSE TINGLING! [SHIFT] TO COUNTER DODGE!
            </span>
          </div>
        )}

        {/* COMBO COUNTER */}
        {comboCount > 1 && (
          <div className="flex flex-col items-center animate-pulse">
            <div className="text-2xl sm:text-4xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 drop-shadow-lg">
              COMBO x{comboCount}
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-yellow-300">
              {comboCount >= 10 ? 'SPECTACULAR!' : comboCount >= 5 ? 'AMAZING!' : 'HEROIC!'}
            </div>
          </div>
        )}

        {/* WEB SWINGING INDICATOR */}
        {isSwinging && (
          <div className="flex items-center gap-2 px-3 py-1 bg-black/60 border border-blue-400/40 rounded-full">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span className="text-xs font-bold tracking-wider text-blue-300 uppercase font-mono">
              WEB SWINGING ACTIVE · RELEASE TO SOAR
            </span>
          </div>
        )}
      </div>

      {/* Interactive Action Prompt (Center-bottom above dock) */}
      {interactPrompt && (
        <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <button
            type="button"
            onClick={onInteract}
            className="cursor-pointer group flex items-center gap-3 px-6 py-3 bg-black/90 hover:bg-black active:scale-95 border-2 border-red-500 rounded-full shadow-2xl shadow-red-600/35 transition-all"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white font-extrabold text-sm sm:text-base tracking-wide font-sans">
              {interactPrompt}
            </span>
          </button>
        </div>
      )}

      {/* Bottom Bar: Supercar Telemetry */}
      <div className="flex flex-col sm:flex-row items-end justify-end w-full gap-4">

        {/* Bottom Right: Supercar Speedometer & Roaring RPM Tachometer (when driving) */}
        {inVehicle && (
          <div className="flex flex-col items-end gap-1 px-4 py-3 bg-black/85 border border-red-500/50 rounded-xl shadow-2xl">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-5xl font-black font-mono text-white tabular-nums tracking-tight">
                {speedKmh}
              </span>
              <span className="text-xs font-mono font-bold text-red-400 uppercase">KM/H</span>
              <span className="ml-2 px-2 py-0.5 bg-red-600/30 border border-red-500 rounded text-xs font-mono font-bold text-red-300">
                GEAR {gear === -1 ? 'R' : gear}
              </span>
            </div>

            {/* Roaring RPM Gauge */}
            <div className="flex flex-col w-44 sm:w-56 gap-0.5">
              <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                <span>RPM: {Math.round(rpm)}</span>
                <span className="text-red-400 font-bold">9000 REDLINE</span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-600 transition-all duration-75"
                  style={{ width: `${Math.min(100, (rpm / 8800) * 100)}%` }}
                />
              </div>
            </div>

            {/* Nitro Boost Gauge */}
            <div className="flex items-center gap-2 w-full mt-1">
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase">
                NITRO
              </span>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-100"
                  style={{ width: `${Math.max(0, Math.min(100, fuel))}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-cyan-300">{Math.round(fuel)}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
