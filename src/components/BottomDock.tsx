/**
 * Collapsible Bottom Control Dock
 * Fast switching for City Atmosphere / Time of Day, Camera Views,
 * Touch Controls Toggle, and Controls Cheatsheet.
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
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [activeTab, setActiveTab] = useState<'city' | 'time' | 'camera' | 'guide'>('city');

  const weatherOptions: { id: WeatherType; label: string; icon: string }[] = [
    { id: 'clear', label: 'Clear Day', icon: '☀️' },
    { id: 'overcast', label: 'Dramatic Sky', icon: '☁️' },
    { id: 'rain', label: 'Neon Rain', icon: '🌧️' },
    { id: 'thunder', label: 'Thunderstorm', icon: '⚡' },
    { id: 'snow', label: 'Winter Blizzard', icon: '❄️' },
    { id: 'mist', label: 'Gotham Fog', icon: '🌫️' },
  ];

  return (
    <div
      className={`fixed bottom-2 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center transition-transform duration-300 pointer-events-auto select-none max-w-[94vw] w-full sm:w-auto ${
        isCollapsed ? 'translate-y-[calc(100%-2.25rem)]' : 'translate-y-0'
      }`}
    >
      {/* Collapse / Expand Toggle Button */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? 'Show Controls Dock' : 'Hide Controls (Cinema Mode)'}
        className="cursor-pointer px-4 py-1.5 bg-black/90 hover:bg-black border-t border-x border-red-500/40 rounded-t-lg text-xs font-mono font-bold text-red-400 hover:text-red-300 flex items-center gap-1.5 shadow-xl"
      >
        <span>{isCollapsed ? '▴ City Settings & Controls' : '▾ Cinema Mode'}</span>
      </button>

      {/* Main Dock Container */}
      <div className="bg-black/95 border border-red-500/30 rounded-xl shadow-2xl p-2.5 sm:p-3.5 flex flex-col gap-2.5 w-full">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between gap-1 border-b border-white/10 pb-2 text-xs font-mono">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('city')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'city'
                  ? 'bg-red-600/30 text-red-400 font-bold border border-red-500/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Atmosphere
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('time')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'time'
                  ? 'bg-red-600/30 text-red-400 font-bold border border-red-500/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Lighting
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'camera'
                  ? 'bg-red-600/30 text-red-400 font-bold border border-red-500/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Camera
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'guide'
                  ? 'bg-red-600/30 text-red-400 font-bold border border-red-500/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Controls
            </button>
          </div>

          {/* Touch HUD Toggle */}
          <button
            type="button"
            onClick={onToggleTouchHUD}
            className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
              showTouchHUD
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/40'
                : 'bg-zinc-900 text-zinc-500 border-zinc-700'
            }`}
          >
            Touch HUD: {showTouchHUD ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Tab 1: City Atmosphere */}
        {activeTab === 'city' && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {weatherOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onWeatherChange(opt.id)}
                className={`cursor-pointer px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  weather === opt.id
                    ? 'bg-red-600/25 border-red-500 text-red-300 font-bold'
                    : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Tab 2: Time of Day & Lighting */}
        {activeTab === 'time' && (
          <div className="flex flex-col sm:flex-row items-center gap-3 py-1">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-mono text-zinc-400 whitespace-nowrap">
                Time: {Math.floor(timeOfDay).toString().padStart(2, '0')}:
                {Math.floor((timeOfDay % 1) * 60).toString().padStart(2, '0')}
              </span>
              <input
                type="range"
                min="0"
                max="23.9"
                step="0.25"
                value={timeOfDay}
                onChange={(e) => onTimeChange(parseFloat(e.target.value))}
                className="w-36 sm:w-48 accent-red-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onTimeChange(14.0)}
                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 rounded border border-white/10 text-[11px] font-mono text-zinc-300"
              >
                Noon
              </button>
              <button
                type="button"
                onClick={() => onTimeChange(18.5)}
                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 rounded border border-white/10 text-[11px] font-mono text-amber-300"
              >
                Sunset
              </button>
              <button
                type="button"
                onClick={() => onTimeChange(22.0)}
                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 rounded border border-white/10 text-[11px] font-mono text-blue-300"
              >
                Night (Neon)
              </button>
              <button
                type="button"
                onClick={onToggleAutoTime}
                className={`px-2 py-1 rounded border text-[11px] font-mono ${
                  autoTime
                    ? 'bg-red-500/20 text-red-400 border-red-500/40'
                    : 'bg-zinc-900 text-zinc-400 border-white/10'
                }`}
              >
                Auto: {autoTime ? 'ON' : 'PAUSED'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Camera Modes */}
        {activeTab === 'camera' && (
          <div className="flex items-center gap-2 py-1">
            {(['chase', 'cockpit', 'orbit'] as CameraMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onCameraChange(mode)}
                className={`cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-mono uppercase tracking-wider transition-all ${
                  cameraMode === mode
                    ? 'bg-red-600/30 border-red-500 text-red-300 font-bold'
                    : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                {mode === 'chase' ? 'Hero Chase' : mode === 'cockpit' ? 'Cockpit' : 'Orbit'}
              </button>
            ))}
          </div>
        )}

        {/* Tab 4: Controls Cheatsheet */}
        {activeTab === 'guide' && (
          <div className="text-[11px] font-mono text-zinc-300 py-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <div><span className="text-red-400 font-bold">Space</span> : Web-Swing / Acrobat Jump</div>
            <div><span className="text-blue-400 font-bold">Q</span> : Web-Zip Launch to Rooftop</div>
            <div><span className="text-amber-400 font-bold">Left Click / J</span> : Combat Attack Combo</div>
            <div><span className="text-purple-400 font-bold">E</span> : Web-Trap / Enter Supercar</div>
            <div><span className="text-red-400 font-bold">Shift</span> : Spider-Sense Counter Dodge</div>
            <div><span className="text-cyan-400 font-bold">W / Gas</span> : Roaring V10 Acceleration</div>
          </div>
        )}
      </div>
    </div>
  );
};
