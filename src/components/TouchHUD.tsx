/**
 * Dedicated Touch Control HUD for Mobile and Touch Devices
 * Ergonomic Left Virtual Thumbstick + Right Action Buttons Cluster
 * Multi-touch enabled with Pointer Events, zero scroll interference, and clean visual feedback.
 */

import React, { useRef, useState, useCallback } from 'react';
import { InputState } from '../game/physics';

interface TouchHUDProps {
  inputs: InputState;
  inVehicle: boolean;
  headlightsOn: boolean;
  onInteract: () => void;
  onToggleLights: () => void;
  onCycleCamera: () => void;
  interactPrompt: string | null;
}

export const TouchHUD: React.FC<TouchHUDProps> = ({
  inputs,
  inVehicle,
  headlightsOn,
  onInteract,
  onToggleLights,
  onCycleCamera,
  interactPrompt,
}) => {
  // Joystick State
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isStickActive, setIsStickActive] = useState<boolean>(false);
  const stickPointerIdRef = useRef<number | null>(null);

  // Active button states for visual feedback
  const [activeGas, setActiveGas] = useState<boolean>(false);
  const [activeBrake, setActiveBrake] = useState<boolean>(false);
  const [activeBoost, setActiveBoost] = useState<boolean>(false);
  const [activeHorn, setActiveHorn] = useState<boolean>(false);

  const STICK_RADIUS = 48; // Max displacement in px

  // --- Virtual Joystick Handlers ---
  const handleStickPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    stickPointerIdRef.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsStickActive(true);
    if ('vibrate' in navigator) navigator.vibrate?.(8);
  }, []);

  const handleStickPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (stickPointerIdRef.current !== e.pointerId || !joystickBaseRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      const rect = joystickBaseRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const rawDx = e.clientX - centerX;
      const rawDy = e.clientY - centerY;

      const distance = Math.hypot(rawDx, rawDy);
      const angle = Math.atan2(rawDy, rawDx);

      const clampedDist = Math.min(distance, STICK_RADIUS);
      const clampedX = Math.cos(angle) * clampedDist;
      const clampedY = Math.sin(angle) * clampedDist;

      setKnobPos({ x: clampedX, y: clampedY });

      // Normalized coordinates (-1 to 1)
      const normX = clampedX / STICK_RADIUS;
      const normY = -clampedY / STICK_RADIUS; // Up is positive

      // Apply to inputs
      inputs.steerAxis = -normX; // positive steerAxis turns right
      inputs.throttleAxis = normY; // positive throttleAxis accelerates forward

      inputs.left = normX < -0.25;
      inputs.right = normX > 0.25;

      // When driving with joystick, up = forward, down = reverse
      if (normY > 0.2) {
        inputs.forward = true;
        inputs.backward = false;
      } else if (normY < -0.2) {
        inputs.forward = false;
        inputs.backward = true;
      } else {
        inputs.forward = false;
        inputs.backward = false;
      }
    },
    [inputs]
  );

  const handleStickPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (stickPointerIdRef.current !== e.pointerId) return;
      e.preventDefault();
      e.stopPropagation();
      stickPointerIdRef.current = null;
      setIsStickActive(false);
      setKnobPos({ x: 0, y: 0 });

      // Reset directional inputs
      inputs.steerAxis = 0;
      inputs.throttleAxis = 0;
      inputs.left = false;
      inputs.right = false;
      inputs.forward = false;
      inputs.backward = false;
    },
    [inputs]
  );

  return (
    <div
      className="fixed inset-0 z-30 pointer-events-none select-none flex justify-between items-end p-4 sm:p-8 touch-none font-sans"
      style={{ touchAction: 'none' }}
    >
      {/* ================= LEFT: Virtual Analog Thumbstick ================= */}
      <div className="pointer-events-auto flex flex-col items-center gap-1.5 mb-2 sm:mb-6">
        <div
          ref={joystickBaseRef}
          onPointerDown={handleStickPointerDown}
          onPointerMove={handleStickPointerMove}
          onPointerUp={handleStickPointerUp}
          onPointerCancel={handleStickPointerUp}
          className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-zinc-950/70 border-2 border-emerald-500/40 shadow-2xl flex items-center justify-center cursor-pointer transition-colors active:border-emerald-400"
        >
          {/* Directional Guides */}
          <span className="absolute top-1.5 text-[9px] font-mono text-zinc-400">▲</span>
          <span className="absolute bottom-1.5 text-[9px] font-mono text-zinc-400">▼</span>
          <span className="absolute left-1.5 text-[9px] font-mono text-zinc-400">◀</span>
          <span className="absolute right-1.5 text-[9px] font-mono text-zinc-400">▶</span>

          {/* Inner Deadzone Ring */}
          <div className="w-12 h-12 rounded-full border border-white/10 pointer-events-none" />

          {/* Movable Thumbstick Knob */}
          <div
            className={`absolute w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg pointer-events-none flex items-center justify-center transition-transform duration-75 ${
              isStickActive
                ? 'bg-emerald-500 text-zinc-950 scale-105'
                : 'bg-zinc-800/90 text-zinc-300 border border-white/20'
            }`}
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            }}
          >
            <div className="w-3 h-3 rounded-full bg-current opacity-80" />
          </div>
        </div>

        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
          Steer / Move
        </span>
      </div>

      {/* ================= RIGHT: Action Buttons Cluster ================= */}
      <div className="pointer-events-auto flex flex-col items-end gap-2 mb-2 sm:mb-6">
        {/* Top Utility Row (Lights, Camera, Horn) */}
        <div className="flex items-center gap-2 mb-0.5">
          {/* Headlights Toggle */}
          <button
            type="button"
            onClick={onToggleLights}
            aria-label="Toggle Headlights"
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-mono border shadow-md active:scale-90 transition-transform ${
              headlightsOn
                ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                : 'bg-zinc-900/80 border-white/10 text-zinc-400'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>

          {/* Horn Button */}
          {inVehicle && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                inputs.horn = true;
                setActiveHorn(true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                inputs.horn = false;
                setActiveHorn(false);
              }}
              onPointerCancel={() => {
                inputs.horn = false;
                setActiveHorn(false);
              }}
              aria-label="Vehicle Horn"
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-mono border shadow-md active:scale-90 transition-transform ${
                activeHorn
                  ? 'bg-amber-500 text-zinc-950 font-bold border-amber-300'
                  : 'bg-zinc-900/80 border-white/10 text-zinc-300'
              }`}
            >
              H
            </button>
          )}

          {/* Camera View Switch */}
          <button
            type="button"
            onClick={onCycleCamera}
            aria-label="Cycle Camera View"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-900/80 border border-white/10 text-zinc-300 active:scale-90 flex items-center justify-center text-xs font-mono shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        {/* Primary Action Cluster (Ergonomic 2x2 layout) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Boost / Sprint Button */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              inputs.boost = true;
              setActiveBoost(true);
              if ('vibrate' in navigator) navigator.vibrate?.(12);
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              inputs.boost = false;
              setActiveBoost(false);
            }}
            onPointerCancel={() => {
              inputs.boost = false;
              setActiveBoost(false);
            }}
            aria-label={inVehicle ? 'Nitro Boost' : 'Sprint'}
            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center text-xs font-mono font-bold border shadow-xl active:scale-90 transition-all ${
              activeBoost
                ? 'bg-sky-400 text-zinc-950 border-sky-300 scale-105'
                : 'bg-zinc-900/85 border-sky-500/40 text-sky-400'
            }`}
          >
            <span className="text-sm">⚡</span>
            <span className="text-[9px] uppercase tracking-tighter">
              {inVehicle ? 'Boost' : 'Run'}
            </span>
          </button>

          {/* Interact / Enter-Exit Rover / Talk Button */}
          <button
            type="button"
            onClick={() => {
              onInteract();
              if ('vibrate' in navigator) navigator.vibrate?.(15);
            }}
            aria-label="Interact or Exit/Enter"
            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center text-xs font-mono font-bold border shadow-xl active:scale-90 transition-all ${
              interactPrompt
                ? 'bg-emerald-500 text-zinc-950 border-emerald-300 animate-pulse'
                : 'bg-zinc-900/85 border-white/20 text-zinc-200'
            }`}
          >
            <span className="text-sm">{inVehicle ? '🚪' : '🚙'}</span>
            <span className="text-[9px] uppercase font-bold tracking-tighter">
              {inVehicle ? 'Exit' : 'Enter'}
            </span>
          </button>

          {/* Brake / Reverse / Jump Pedal */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              inputs.brake = true;
              if (inVehicle) inputs.backward = true;
              setActiveBrake(true);
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              inputs.brake = false;
              if (inVehicle) inputs.backward = false;
              setActiveBrake(false);
            }}
            onPointerCancel={() => {
              inputs.brake = false;
              if (inVehicle) inputs.backward = false;
              setActiveBrake(false);
            }}
            aria-label={inVehicle ? 'Brake and Reverse' : 'Jump'}
            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center text-xs font-mono font-bold border shadow-xl active:scale-90 transition-all ${
              activeBrake
                ? 'bg-rose-500 text-zinc-950 border-rose-300 scale-105'
                : 'bg-zinc-900/85 border-rose-500/40 text-rose-400'
            }`}
          >
            <span className="text-sm">{inVehicle ? '🛑' : '⬆️'}</span>
            <span className="text-[9px] uppercase tracking-tighter">
              {inVehicle ? 'Brake' : 'Jump'}
            </span>
          </button>

          {/* Gas / Accelerate Pedal */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              inputs.forward = true;
              setActiveGas(true);
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              inputs.forward = false;
              setActiveGas(false);
            }}
            onPointerCancel={() => {
              inputs.forward = false;
              setActiveGas(false);
            }}
            aria-label={inVehicle ? 'Accelerate Gas Pedal' : 'Move Forward'}
            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center text-xs font-mono font-bold border-2 shadow-2xl active:scale-95 transition-all ${
              activeGas
                ? 'bg-emerald-400 text-zinc-950 border-white scale-105 shadow-emerald-400/50'
                : 'bg-emerald-600/90 border-emerald-400 text-white'
            }`}
          >
            <span className="text-sm">▲</span>
            <span className="text-[9px] uppercase font-black tracking-wider">
              {inVehicle ? 'GAS' : 'GO'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
