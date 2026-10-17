/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WorldScene, CameraMode } from './game/worldScene';
import { WeatherType } from './game/weather';
import { INITIAL_QUESTS, NPCDefinition, Quest } from './game/npcData';
import { soundEngine } from './game/audio';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { BottomDock } from './components/BottomDock';
import { DialogueModal } from './components/DialogueModal';
import { PauseModal } from './components/PauseModal';
import { TouchHUD } from './components/TouchHUD';

type GameState = 'title' | 'playing' | 'paused';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<WorldScene | null>(null);

  // High-level game state
  const [gameState, setGameState] = useState<GameState>('title');
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [timeOfDay, setTimeOfDay] = useState<number>(13.5);
  const [autoTime, setAutoTime] = useState<boolean>(true);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showTouchHUD, setShowTouchHUD] = useState<boolean>(true);

  // HUD telemetry
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [rpm, setRpm] = useState<number>(800);
  const [gear, setGear] = useState<number>(1);
  const [inVehicle, setInVehicle] = useState<boolean>(true);
  const [headlightsOn, setHeadlightsOn] = useState<boolean>(true);
  const [fuel, setFuel] = useState<number>(100);
  const [coordX, setCoordX] = useState<number>(0);
  const [coordZ, setCoordZ] = useState<number>(0);
  const [headingDeg, setHeadingDeg] = useState<number>(0);

  // Interactive prompts & Dialogue
  const [interactPrompt, setInteractPrompt] = useState<string | null>(null);
  const [activeNpc, setActiveNpc] = useState<NPCDefinition | null>(null);
  const [currentDialogueNodeId, setCurrentDialogueNodeId] = useState<string | null>(null);
  const [quests, setQuests] = useState<Quest[]>(INITIAL_QUESTS);

  // Auto-start query param check
  const autoStartRequested = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  // Sync state to body dataset
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Mount Three.js World once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const initialIsTitle = !autoStartRequested;
    if (autoStartRequested) {
      setGameState('playing');
    }

    const world = new WorldScene(
      canvasMountRef.current,
      {
        onSpeedChange: (speed, newRpm, newGear) => {
          setSpeedKmh(speed);
          setRpm(newRpm);
          setGear(newGear);
        },
        onVehicleStateChange: (isInVeh, lights, currentFuel) => {
          setInVehicle(isInVeh);
          setHeadlightsOn(lights);
          setFuel(currentFuel);
        },
        onInteractPrompt: (prompt, npc) => {
          setInteractPrompt(prompt);
          setActiveNpc(npc);
        },
        onQuestUpdate: (updatedQuests) => {
          setQuests(updatedQuests);
        },
        onCoordinatesChange: (x, z, heading) => {
          setCoordX(x);
          setCoordZ(z);
          setHeadingDeg(heading);
        },
      },
      INITIAL_QUESTS,
      initialIsTitle
    );

    worldRef.current = world;

    return () => {
      world.destroy();
      worldRef.current = null;
    };
  }, [autoStartRequested]);

  // Start expedition handler
  const handleStartGame = useCallback(() => {
    soundEngine.init();
    if (worldRef.current) {
      worldRef.current.isTitleScreen = false;
      worldRef.current.isPaused = false;
    }
    setGameState('playing');
  }, []);

  // Pause / Resume handler
  const handlePause = useCallback(() => {
    if (gameState === 'playing') {
      if (worldRef.current) worldRef.current.isPaused = true;
      setGameState('paused');
    } else if (gameState === 'paused') {
      if (worldRef.current) worldRef.current.isPaused = false;
      setGameState('playing');
    }
  }, [gameState]);

  // Weather switch handler
  const handleWeatherChange = useCallback((newWeather: WeatherType) => {
    setWeather(newWeather);
    if (worldRef.current) {
      worldRef.current.setWeather(newWeather);
    }
  }, []);

  // Time change handler
  const handleTimeChange = useCallback((newHour: number) => {
    setTimeOfDay(newHour);
    if (worldRef.current) {
      worldRef.current.setTimeOfDay(newHour);
    }
  }, []);

  const handleToggleAutoTime = useCallback(() => {
    setAutoTime((prev) => {
      const next = !prev;
      if (worldRef.current) {
        worldRef.current.autoTimeProgression = next;
      }
      return next;
    });
  }, []);

  // Camera switch handler
  const handleCameraChange = useCallback((mode: CameraMode) => {
    setCameraMode(mode);
    if (worldRef.current) {
      worldRef.current.setCameraMode(mode);
    }
  }, []);

  // Audio mute handler
  const handleToggleMute = useCallback(() => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  }, []);

  // Vehicle reset handler
  const handleResetVehicle = useCallback(() => {
    if (worldRef.current) {
      worldRef.current.resetVehicleOrientation();
    }
    if (gameState === 'paused') {
      handlePause();
    }
  }, [gameState, handlePause]);

  // Interact trigger (E key or clicking prompt)
  const handleInteract = useCallback(() => {
    if (activeNpc) {
      // Open dialogue with this NPC
      setCurrentDialogueNodeId(activeNpc.introDialogId);
    } else if (worldRef.current) {
      // Toggle enter/exit vehicle
      worldRef.current.toggleVehicleMount();
    }
  }, [activeNpc]);

  // Dialogue choice selection
  const handleSelectDialogueOption = useCallback(
    (index: number) => {
      if (!activeNpc || !currentDialogueNodeId) return;
      const node = activeNpc.dialogues[currentDialogueNodeId];
      if (!node) return;

      const opt = node.options[index];
      if (!opt) return;

      // Handle quest actions
      if (opt.questAction === 'accept' && activeNpc.assignedQuestId) {
        soundEngine.playQuestComplete();
      }

      if (opt.nextDialogId && activeNpc.dialogues[opt.nextDialogId]) {
        setCurrentDialogueNodeId(opt.nextDialogId);
      } else {
        // End conversation
        setCurrentDialogueNodeId(null);
      }
    },
    [activeNpc, currentDialogueNodeId]
  );

  // Global Keyboard Event Dispatcher
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!worldRef.current) return;
      const inputs = worldRef.current.inputs;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') inputs.forward = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') inputs.backward = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') inputs.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') inputs.right = true;
      if (e.code === 'Space') inputs.brake = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') inputs.boost = true;
      if (e.code === 'KeyH') inputs.horn = true;

      // Single-frame edge triggers:
      if (e.code === 'KeyE') {
        e.preventDefault();
        handleInteract();
      }

      if (e.code === 'KeyL') {
        e.preventDefault();
        worldRef.current.toggleHeadlights();
      }

      if (e.code === 'KeyR') {
        e.preventDefault();
        worldRef.current.resetVehicleOrientation();
      }

      if (e.code === 'KeyC') {
        e.preventDefault();
        const nextCam: CameraMode =
          cameraMode === 'chase' ? 'cockpit' : cameraMode === 'cockpit' ? 'orbit' : 'chase';
        handleCameraChange(nextCam);
      }

      if (e.code === 'KeyM') {
        e.preventDefault();
        handleToggleMute();
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (currentDialogueNodeId) {
          setCurrentDialogueNodeId(null);
        } else if (gameState === 'playing' || gameState === 'paused') {
          handlePause();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!worldRef.current) return;
      const inputs = worldRef.current.inputs;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') inputs.forward = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') inputs.backward = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') inputs.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') inputs.right = false;
      if (e.code === 'Space') inputs.brake = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') inputs.boost = false;
      if (e.code === 'KeyH') inputs.horn = false;
    };

    const handleWindowBlur = () => {
      if (worldRef.current) {
        const inputs = worldRef.current.inputs;
        inputs.forward = false;
        inputs.backward = false;
        inputs.left = false;
        inputs.right = false;
        inputs.brake = false;
        inputs.boost = false;
        inputs.horn = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [
    gameState,
    cameraMode,
    currentDialogueNodeId,
    handleInteract,
    handleCameraChange,
    handleToggleMute,
    handlePause,
  ]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950 font-sans select-none">
      {/* 3D WebGL Canvas isolated Mount Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* Screen 1: Title Screen */}
      {gameState === 'title' && <TitleScreen onStart={handleStartGame} />}

      {/* Screen 2: Playing State HUD and Bottom Controls Dock */}
      {gameState === 'playing' && (
        <>
          <GameHUD
            speedKmh={speedKmh}
            rpm={rpm}
            gear={gear}
            inVehicle={inVehicle}
            headlightsOn={headlightsOn}
            fuel={fuel}
            timeOfDay={timeOfDay}
            weather={weather}
            coordX={coordX}
            coordZ={coordZ}
            headingDeg={headingDeg}
            interactPrompt={interactPrompt}
            activeQuests={quests}
            isMuted={isMuted}
            showTouchHUD={showTouchHUD}
            onToggleMute={handleToggleMute}
            onPause={handlePause}
            onInteract={handleInteract}
          />

          {showTouchHUD && worldRef.current && (
            <TouchHUD
              inputs={worldRef.current.inputs}
              inVehicle={inVehicle}
              headlightsOn={headlightsOn}
              onInteract={handleInteract}
              onToggleLights={() => worldRef.current?.toggleHeadlights()}
              onCycleCamera={() => {
                const nextCam: CameraMode =
                  cameraMode === 'chase' ? 'cockpit' : cameraMode === 'cockpit' ? 'orbit' : 'chase';
                handleCameraChange(nextCam);
              }}
              interactPrompt={interactPrompt}
            />
          )}

          <BottomDock
            weather={weather}
            timeOfDay={timeOfDay}
            cameraMode={cameraMode}
            autoTime={autoTime}
            showTouchHUD={showTouchHUD}
            onWeatherChange={handleWeatherChange}
            onTimeChange={handleTimeChange}
            onCameraChange={handleCameraChange}
            onToggleAutoTime={handleToggleAutoTime}
            onToggleTouchHUD={() => setShowTouchHUD((prev) => !prev)}
          />
        </>
      )}

      {/* Screen 3: Pause Modal */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={handlePause}
          onRestartVehicle={handleResetVehicle}
          onReturnTitle={() => {
            if (worldRef.current) {
              worldRef.current.isTitleScreen = true;
              worldRef.current.isPaused = false;
            }
            setGameState('title');
          }}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* NPC Interactive Branching Dialogue Modal */}
      {activeNpc && currentDialogueNodeId && activeNpc.dialogues[currentDialogueNodeId] && (
        <DialogueModal
          npc={activeNpc}
          currentNode={activeNpc.dialogues[currentDialogueNodeId]}
          onSelectOption={handleSelectDialogueOption}
          onClose={() => setCurrentDialogueNodeId(null)}
        />
      )}
    </div>
  );
}
