/**
 * TouchHUD: Multi-touch Superhero Controls for Mobile & Tablet
 * Dynamic controls for Spider-Man (Web Swing, Web Zip, Combat Attack, Web Shoot, Dodge)
 * and Supercar (Gas, Brake/Drift, Nitro Boost, Horn, Headlights, Enter/Exit Vehicle).
 */

import React, { useRef, useState, useCallback } from 'react';
import { InputState } from '../game/physics';

interface TouchHUDProps {
  inputs: InputState;
  inVehicle: boolean;
  headlightsOn: boolean;
  interactPrompt: string | null;
  onInteract: () => void;
  onToggleLights: () => void;
  onCycleCamera: () => void;
  onWebSwing?: () => void;
  onWebZip?: () => void;
  onAttack?: () => void;
  onWebShoot?: () => void;
  onDodge?: () => void;
}

export const TouchHUD: React.FC<TouchHUDProps> = ({
  inputs,
  inVehicle,
  headlightsOn,
  interactPrompt,
  onInteract,
  onToggleLights,
  onCycleCamera,
  onWebSwing,
  onWebZip,
  onAttack,
  onWebShoot,
  onDodge,
}) => {
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isStickActive, setIsStickActive] = useState<boolean>(false);
  const stickPointerIdRef = useRef<number | null>(null);

  const STICK_RADIUS = 46;

  // Joystick Pointer Handlers
  const handleStickDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    stickPointerIdRef.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsStickActive(true);
  }, []);

  const handleStickMove = useCallback(
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

      const normX = clampedX / STICK_RADIUS;
      const normY = -clampedY / STICK_RADIUS;

      inputs.steerAxis = -normX;
      inputs.throttleAxis = normY;

      inputs.left = normX < -0.25;
      inputs.right = normX > 0.25;

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

  const handleStickUp = useCallback((e: React.PointerEvent) => {
    if (stickPointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    stickPointerIdRef.current = null;
    setIsStickActive(false);
    setKnobPos({ x: 0, y: 0 });

    inputs.steerAxis = 0;
    inputs.throttleAxis = 0;
    inputs.forward = false;
    inputs.backward = false;
    inputs.left = false;
    inputs.right = false;
  }, [inputs]);

  return (
    <div className="fixed inset-0 z-30 pointer-events-none select-none flex justify-between items-end p-4 sm:p-8">
      {/* Left: Virtual Thumbstick for Movement / Steering */}
      <div className="pointer-events-auto flex flex-col items-center gap-2">
        <div
          ref={joystickBaseRef}
          onPointerDown={handleStickDown}
          onPointerMove={handleStickMove}
          onPointerUp={handleStickUp}
          onPointerCancel={handleStickUp}
          className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-black/60 border-2 border-white/20 backdrop-blur-none flex items-center justify-center touch-none shadow-2xl active:border-red-500/60"
        >
          {/* Directional Crosshair Guides */}
          <div className="absolute w-full h-[1px] bg-white/10" />
          <div className="absolute h-full w-[1px] bg-white/10" />

          {/* Draggable Knob */}
          <div
            className={`w-12 h-12 rounded-full border-2 transition-transform duration-75 flex items-center justify-center shadow-lg ${
              isStickActive
                ? 'bg-red-600 border-white scale-110'
                : 'bg-zinc-800 border-white/40'
            }`}
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            }}
          >
            <div className="w-4 h-4 rounded-full bg-white/60" />
          </div>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
          {inVehicle ? 'STEER / DRIVE' : 'MOVE / SPRINT'}
        </span>
      </div>

      {/* Right: Dynamic Superhero Action Buttons Cluster */}
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        {/* Secondary Row: Utilities (Camera, Lights, Enter/Exit) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCycleCamera}
            className="w-10 h-10 rounded-full bg-black/70 border border-white/20 text-xs font-mono text-white flex items-center justify-center active:scale-90"
            aria-label="Change Camera"
          >
            📷
          </button>

          <button
            type="button"
            onClick={onToggleLights}
            className={`w-10 h-10 rounded-full border text-xs font-mono flex items-center justify-center active:scale-90 ${
              headlightsOn ? 'bg-amber-500/40 border-amber-400 text-amber-200' : 'bg-black/70 border-white/20 text-zinc-400'
            }`}
            aria-label="Toggle Lights"
          >
            💡
          </button>

          {/* Enter / Exit Supercar Toggle Button */}
          <button
            type="button"
            onClick={onInteract}
            className={`px-3 py-2 rounded-full border text-xs font-bold font-sans flex items-center gap-1 active:scale-95 shadow-lg ${
              inVehicle
                ? 'bg-red-600 border-white text-white'
                : interactPrompt
                ? 'bg-emerald-600 border-white text-white animate-pulse'
                : 'bg-black/60 border-white/20 text-zinc-400'
            }`}
            aria-label={inVehicle ? 'Exit Supercar' : 'Enter Supercar'}
          >
            {inVehicle ? '🚗 EXIT' : '🚗 DRIVE'}
          </button>
        </div>

        {/* Primary Action Buttons Matrix */}
        {inVehicle ? (
          /* Supercar Controls */
          <div className="grid grid-cols-2 gap-2.5">
            {/* Nitro Boost */}
            <button
              type="button"
              onPointerDown={() => { inputs.boost = true; }}
              onPointerUp={() => { inputs.boost = false; }}
              className="w-16 h-16 rounded-2xl bg-cyan-600/80 border-2 border-cyan-300 active:bg-cyan-500 text-white font-extrabold text-xs flex flex-col items-center justify-center shadow-lg active:scale-95"
            >
              <span>⚡</span>
              <span>NITRO</span>
            </button>

            {/* Gas / Accelerate */}
            <button
              type="button"
              onPointerDown={() => { inputs.forward = true; }}
              onPointerUp={() => { inputs.forward = false; }}
              className="w-16 h-16 rounded-2xl bg-emerald-600/90 border-2 border-emerald-300 active:bg-emerald-500 text-white font-extrabold text-sm flex flex-col items-center justify-center shadow-lg active:scale-95"
            >
              <span>▲</span>
              <span>GAS</span>
            </button>

            {/* Handbrake / Drift */}
            <button
              type="button"
              onPointerDown={() => { inputs.brake = true; }}
              onPointerUp={() => { inputs.brake = false; }}
              className="w-16 h-16 rounded-2xl bg-amber-600/80 border-2 border-amber-300 active:bg-amber-500 text-white font-extrabold text-xs flex flex-col items-center justify-center shadow-lg active:scale-95"
            >
              <span>🛑</span>
              <span>DRIFT</span>
            </button>

            {/* Reverse / Brake */}
            <button
              type="button"
              onPointerDown={() => { inputs.backward = true; }}
              onPointerUp={() => { inputs.backward = false; }}
              className="w-16 h-16 rounded-2xl bg-zinc-800 border-2 border-white/30 active:bg-zinc-700 text-white font-extrabold text-xs flex flex-col items-center justify-center shadow-lg active:scale-95"
            >
              <span>▼</span>
              <span>REV</span>
            </button>
          </div>
        ) : (
          /* Spider-Man Hero Controls */
          <div className="grid grid-cols-2 gap-2.5">
            {/* Web Swing (Big primary button) */}
            <button
              type="button"
              onClick={onWebSwing}
              className="w-16 h-16 rounded-2xl bg-red-600 border-2 border-white active:bg-red-500 text-white font-black text-xs flex flex-col items-center justify-center shadow-xl shadow-red-600/40 active:scale-95"
            >
              <span className="text-base">🕸️</span>
              <span>SWING</span>
            </button>

            {/* Melee Attack Combo */}
            <button
              type="button"
              onClick={onAttack}
              className="w-16 h-16 rounded-2xl bg-amber-600 border-2 border-amber-200 active:bg-amber-500 text-white font-black text-xs flex flex-col items-center justify-center shadow-xl shadow-amber-600/40 active:scale-95"
            >
              <span className="text-base">👊</span>
              <span>ATTACK</span>
            </button>

            {/* Web Zip Launch */}
            <button
              type="button"
              onClick={onWebZip}
              className="w-16 h-16 rounded-2xl bg-blue-600 border-2 border-blue-200 active:bg-blue-500 text-white font-black text-xs flex flex-col items-center justify-center shadow-xl shadow-blue-600/40 active:scale-95"
            >
              <span className="text-base">🚀</span>
              <span>WEB ZIP</span>
            </button>

            {/* Spider-Sense Dodge / Web Trap */}
            <button
              type="button"
              onClick={onDodge}
              className="w-16 h-16 rounded-2xl bg-purple-700 border-2 border-purple-200 active:bg-purple-600 text-white font-black text-xs flex flex-col items-center justify-center shadow-xl shadow-purple-600/40 active:scale-95"
            >
              <span className="text-base">⚡</span>
              <span>DODGE</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
