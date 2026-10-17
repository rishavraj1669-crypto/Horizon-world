/**
 * Collapsible Bottom Control Dock (Zero Viewport Occlusion)
 * Allows weather selection, time-of-day slider, camera view switching,
 * and collapses completely into Cinema / Zen Mode.
 */

import React, { useState } from 'react';
import { CameraMode } from '../game/worldScene';
import { WeatherType } from '../game/weather';

interface BottomDockProps {
  weather: WeatherType;
  timeOfDay: number;
  cameraMode: CameraMode;
  autoTime: boolean;
  showTouchHUD: boolean;
  onWeatherChange: (w: WeatherType) => void;
  onTimeChange: (hour: number) => void;
  onCameraChange: (cam: CameraMode) => void;
  onToggleAutoTime: () => void;
  onToggleTouchHUD: () => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  weather,
  timeOfDay,
  cameraMode,
  autoTime,
  showTouchHUD,
  onWeatherChange,
  onTimeChange,
  onCameraChange,
  onToggleAutoTime,
  onToggleTouchHUD,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768
  );
  const [activeTab, setActiveTab] = useState<'weather' | 'time' | 'camera' | 'controls'>('weather');

  const weatherOptions: { id: WeatherType; label: string; icon: string }[] = [
    { id: 'clear', label: 'Clear Sun', icon: '☀️' },
    { id: 'overcast', label: 'Overcast', icon: '☁️' },
    { id: 'rain', label: 'Downpour', icon: '🌧️' },
    { id: 'thunder', label: 'Thunder', icon: '⚡' },
    { id: 'snow', label: 'Snowstorm', icon: '❄️' },
    { id: 'mist', label: 'Valley Mist', icon: '🌫️' },
  ];

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center transition-transform duration-300 pointer-events-auto select-none max-w-[94vw] w-full sm:w-auto ${
        isCollapsed ? 'translate-y-[calc(100%-2.25rem)]' : 'translate-y-0'
      }`}
    >
      {/* Collapse / Expand Toggle Button */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? 'Show Controls Dock' : 'Hide Controls (Zen Mode)'}
        className="cursor-pointer px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 border-t border-x border-white/20 rounded-t-lg text-xs font-mono font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 shadow-lg"
      >
        <span>{isCollapsed ? '▴ Expand Controls' : '▾ Cinema Mode'}</span>
      </button>

      {/* Main Dock Container */}
      <div className="bg-zinc-950/95 border border-white/15 rounded-xl shadow-2xl p-2 sm:p-3 flex flex-col gap-2 w-full">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between gap-1 border-b border-white/10 pb-2 text-xs font-mono">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('weather')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'weather'
                  ? 'bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Weather
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('time')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'time'
                  ? 'bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Time
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'camera'
                  ? 'bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Camera
            </button>
          </div>

          <div className="flex items-center gap-1">
            {/* Touch HUD Toggle Button */}
            <button
              type="button"
              onClick={onToggleTouchHUD}
              aria-label="Toggle Touch Controls HUD"
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors border ${
                showTouchHUD
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                  : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-zinc-200'
              }`}
            >
              Touch: {showTouchHUD ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('controls')}
              className={`px-2 py-1 rounded text-[11px] transition-colors ${
                activeTab === 'controls'
                  ? 'bg-zinc-800 text-amber-300 font-semibold border border-amber-400/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Keys
            </button>
          </div>
        </div>

        {/* Tab 1: Weather Selector */}
        {activeTab === 'weather' && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 sm:gap-2">
            {weatherOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onWeatherChange(opt.id)}
                className={`flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 rounded text-[11px] sm:text-xs font-mono transition-all ${
                  weather === opt.id
                    ? 'bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-500/25'
                    : 'bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 border border-white/5'
                }`}
              >
                <span>{opt.icon}</span>
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Tab 2: Day & Night Time Controls */}
        {activeTab === 'time' && (
          <div className="flex flex-col sm:flex-row items-center gap-3 text-xs font-mono px-1">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-zinc-400 text-xs">Hour:</span>
              <input
                type="range"
                min="0"
                max="23.9"
                step="0.1"
                value={timeOfDay}
                onChange={(e) => onTimeChange(parseFloat(e.target.value))}
                className="w-full sm:w-48 accent-emerald-500 cursor-pointer"
              />
              <span className="text-amber-300 font-bold w-12 text-center tabular-nums">
                {Math.floor(timeOfDay).toString().padStart(2, '0')}:
                {Math.floor((timeOfDay % 1) * 60).toString().padStart(2, '0')}
              </span>
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-start">
              <button
                type="button"
                onClick={() => onTimeChange(6.0)}
                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 rounded border border-white/5 text-[11px] text-zinc-300"
              >
                Dawn
              </button>
              <button
                type="button"
                onClick={() => onTimeChange(12.0)}
                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 rounded border border-white/5 text-[11px] text-zinc-300"
              >
                Noon
              </button>
              <button
                type="button"
                onClick={() => onTimeChange(18.0)}
                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 rounded border border-white/5 text-[11px] text-zinc-300"
              >
                Sunset
              </button>
              <button
                type="button"
                onClick={() => onTimeChange(23.5)}
                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 rounded border border-white/5 text-[11px] text-zinc-300"
              >
                Night
              </button>

              <button
                type="button"
                onClick={onToggleAutoTime}
                className={`ml-1 px-2.5 py-1 rounded text-[11px] font-semibold border ${
                  autoTime
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-zinc-900 text-zinc-400 border-white/10'
                }`}
              >
                {autoTime ? 'Auto Cycle: ON' : 'Auto Cycle: OFF'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Camera Modes */}
        {activeTab === 'camera' && (
          <div className="flex items-center gap-2 text-xs font-mono">
            <button
              type="button"
              onClick={() => onCameraChange('chase')}
              className={`flex-1 px-3 py-1.5 rounded-md transition-colors ${
                cameraMode === 'chase'
                  ? 'bg-emerald-500 text-zinc-950 font-bold'
                  : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-white/5'
              }`}
            >
              Third-Person Chase
            </button>
            <button
              type="button"
              onClick={() => onCameraChange('cockpit')}
              className={`flex-1 px-3 py-1.5 rounded-md transition-colors ${
                cameraMode === 'cockpit'
                  ? 'bg-emerald-500 text-zinc-950 font-bold'
                  : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-white/5'
              }`}
            >
              Driver Cockpit
            </button>
            <button
              type="button"
              onClick={() => onCameraChange('orbit')}
              className={`flex-1 px-3 py-1.5 rounded-md transition-colors ${
                cameraMode === 'orbit'
                  ? 'bg-emerald-500 text-zinc-950 font-bold'
                  : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-white/5'
              }`}
            >
              Cinematic Orbit
            </button>
          </div>
        )}

        {/* Tab 4: Controls Key Reference */}
        {activeTab === 'controls' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-zinc-300 p-1">
            <div>
              <span className="text-emerald-400 font-bold">W / A / S / D</span>: Accelerate / Steer
            </div>
            <div>
              <span className="text-emerald-400 font-bold">Space</span>: Handbrake Drift / Jump
            </div>
            <div>
              <span className="text-emerald-400 font-bold">Shift</span>: Nitro Boost / Sprint
            </div>
            <div>
              <span className="text-emerald-400 font-bold">E</span>: Exit / Enter Rover & Talk
            </div>
            <div>
              <span className="text-emerald-400 font-bold">L</span>: Toggle Headlights
            </div>
            <div>
              <span className="text-emerald-400 font-bold">H</span>: Vehicle Horn
            </div>
            <div>
              <span className="text-emerald-400 font-bold">C</span>: Cycle Camera View
            </div>
            <div>
              <span className="text-emerald-400 font-bold">R</span>: Reset Rover Orientation
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
