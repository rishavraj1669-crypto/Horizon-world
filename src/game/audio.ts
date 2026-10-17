/**
 * Zero-dependency Procedural Web Audio Engine
 * Real-time synthesis for:
 * 1. Supercar Sound: Screaming high-RPM V10/V12 engine, turbo spool whistle, blowoff valve flutter,
 *    tire screech drift sounds, and exhaust backfire pops.
 * 2. Game BGM: Dynamic superhero cinematic orchestral soundtrack with heroic brass,
 *    driving strings ostinato, deep bass, and rhythmic percussion.
 * 3. Spider-Man FX: Iconic "THWIP!" web shooter, web-zip whoosh, spider-sense alert chime,
 *    combat punch/kick impacts, and enemy knockout audio.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;

  // Supercar Audio Nodes
  private carEngineOsc1: OscillatorNode | null = null;
  private carEngineOsc2: OscillatorNode | null = null;
  private carEngineOscSub: OscillatorNode | null = null;
  private carEngineGain: GainNode | null = null;
  private carEngineFilter: BiquadFilterNode | null = null;
  private turboWhistleOsc: OscillatorNode | null = null;
  private turboGain: GainNode | null = null;
  private tireScreechNode: AudioBufferSourceNode | null = null;
  private tireScreechGain: GainNode | null = null;

  // Noise Buffer for Turbo Blowoff & Tire Screeches & Weather
  private noiseBuffer: AudioBuffer | null = null;

  // Dynamic Superhero BGM System
  private bgmPlaying: boolean = false;
  private bgmStepIndex: number = 0;
  private bgmTimer: number | null = null;
  private bgmIntensity: 'ambient' | 'action' = 'ambient';

  private isInitialized: boolean = false;

  public init(): void {
    if (this.isInitialized) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.55, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);

      this.createNoiseBuffer();
      this.setupSupercarSound();
      this.startSuperheroBGM();

      this.isInitialized = true;
    } catch {
      // AudioContext unavailable or autoplay blocked
    }
  }

  private createNoiseBuffer(): void {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  // ==========================================
  // SUPERCAR ROARING ENGINE & TURBO SYNTHESIS
  // ==========================================
  private setupSupercarSound(): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;

    // Master Car Engine Channel
    this.carEngineGain = this.ctx.createGain();
    this.carEngineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.carEngineFilter = this.ctx.createBiquadFilter();
    this.carEngineFilter.type = 'lowpass';
    this.carEngineFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
    this.carEngineFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    // Roaring V10/V12 Oscillators
    this.carEngineOsc1 = this.ctx.createOscillator();
    this.carEngineOsc1.type = 'sawtooth';
    this.carEngineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

    this.carEngineOsc2 = this.ctx.createOscillator();
    this.carEngineOsc2.type = 'triangle';
    this.carEngineOsc2.frequency.setValueAtTime(67.5, this.ctx.currentTime); // 1.5x harmonic

    this.carEngineOscSub = this.ctx.createOscillator();
    this.carEngineOscSub.type = 'square';
    this.carEngineOscSub.frequency.setValueAtTime(22.5, this.ctx.currentTime); // Sub rumble

    this.carEngineOsc1.connect(this.carEngineFilter);
    this.carEngineOsc2.connect(this.carEngineFilter);
    this.carEngineOscSub.connect(this.carEngineFilter);
    this.carEngineFilter.connect(this.carEngineGain);
    this.carEngineGain.connect(this.sfxGain);

    // Turbocharger high-pitched whistling spool
    this.turboGain = this.ctx.createGain();
    this.turboGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.turboWhistleOsc = this.ctx.createOscillator();
    this.turboWhistleOsc.type = 'sine';
    this.turboWhistleOsc.frequency.setValueAtTime(1400, this.ctx.currentTime);
    this.turboWhistleOsc.connect(this.turboGain);
    this.turboGain.connect(this.sfxGain);

    // Drifting Tire Screech
    this.tireScreechGain = this.ctx.createGain();
    this.tireScreechGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const tireFilter = this.ctx.createBiquadFilter();
    tireFilter.type = 'bandpass';
    tireFilter.frequency.setValueAtTime(2200, this.ctx.currentTime);
    tireFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    this.tireScreechNode = this.ctx.createBufferSource();
    this.tireScreechNode.buffer = this.noiseBuffer;
    this.tireScreechNode.loop = true;
    this.tireScreechNode.connect(tireFilter);
    tireFilter.connect(this.tireScreechGain);
    this.tireScreechGain.connect(this.sfxGain);

    try {
      this.carEngineOsc1.start();
      this.carEngineOsc2.start();
      this.carEngineOscSub.start();
      this.turboWhistleOsc.start();
      this.tireScreechNode.start();
    } catch {}
  }

  /**
   * Update supercar audio pitch, throttle roar, turbo spool, and tire screeching
   */
  public updateEngine(
    rpm: number,
    gear: number,
    speedKmh: number,
    isBoosting: boolean,
    isDrifting: boolean,
    inCar: boolean = true
  ): void {
    if (!this.ctx || !this.carEngineGain || !this.carEngineFilter || !this.carEngineOsc1) return;

    if (!inCar) {
      // Fade out engine if player is out of supercar
      this.carEngineGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.1);
      if (this.turboGain) this.turboGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.1);
      if (this.tireScreechGain) this.tireScreechGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.1);
      return;
    }

    // High revving V10/V12 Pitch mapping (800 to 9000 RPM)
    const baseFreq = 38 + (rpm / 8500) * 165;
    this.carEngineOsc1.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.04);
    if (this.carEngineOsc2) {
      this.carEngineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, this.ctx.currentTime, 0.04);
    }
    if (this.carEngineOscSub) {
      this.carEngineOscSub.frequency.setTargetAtTime(baseFreq * 0.5, this.ctx.currentTime, 0.04);
    }

    // Filter opens up aggressively on high RPM and boost
    const filterFreq = 350 + (rpm / 8500) * 3600 + (isBoosting ? 1500 : 0);
    this.carEngineFilter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.05);

    // Roaring volume based on throttle / speed
    const engineVol = 0.06 + Math.min((rpm / 8500) * 0.18 + (isBoosting ? 0.08 : 0), 0.28);
    this.carEngineGain.gain.setTargetAtTime(engineVol, this.ctx.currentTime, 0.04);

    // Turbo spool whistle rises with speed
    if (this.turboGain && this.turboWhistleOsc) {
      const turboRatio = Math.min(speedKmh / 260, 1.0);
      const turboPitch = 1200 + turboRatio * 2400 + (isBoosting ? 600 : 0);
      this.turboWhistleOsc.frequency.setTargetAtTime(turboPitch, this.ctx.currentTime, 0.08);
      const turboVol = turboRatio > 0.15 ? (turboRatio - 0.15) * 0.06 : 0;
      this.turboGain.gain.setTargetAtTime(turboVol, this.ctx.currentTime, 0.08);
    }

    // Tire Screech on drift or hard brake
    if (this.tireScreechGain) {
      const screechVol = isDrifting && speedKmh > 20 ? Math.min((speedKmh / 150) * 0.12, 0.16) : 0;
      this.tireScreechGain.gain.setTargetAtTime(screechVol, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Supercar Turbo Blowoff Valve / Wastegate Dump ("tss-psshhh!")
   */
  public playTurboBlowoff(): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2600, now);
      filter.frequency.exponentialRampToValueAtTime(1400, now + 0.35);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + 0.36);
    } catch {}
  }

  /**
   * Supercar Exhaust Backfire Crack / Pop
   */
  public playExhaustPop(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.09);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.11);
    } catch {}
  }

  /**
   * Exotic dual-tone Supercar horn
   */
  public playSupercarHorn(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(440, now); // A4
      osc2.frequency.setValueAtTime(554.37, now); // C#5

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.sfxGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);
    } catch {}
  }

  // ==========================================
  // SPIDER-MAN HERO SOUND EFFECTS
  // ==========================================

  /**
   * Iconic "THWIP!" Web Shooter Sound
   */
  public playWebShoot(): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;

      // Resonant whip crack filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.frequency.exponentialRampToValueAtTime(800, now + 0.12);
      filter.Q.setValueAtTime(4.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + 0.15);

      // High tone snap
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.15, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  /**
   * Web Zip Launch Whoosh
   */
  public playWebZip(): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(2400, now + 0.2);
      filter.frequency.exponentialRampToValueAtTime(600, now + 0.4);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + 0.42);
    } catch {}
  }

  /**
   * Spider-Sense Psychic Alert Warning Chime
   */
  public playSpiderSense(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // Dual high ringing harmonics
      const freqs = [880, 1320, 1760];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.06, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35 + idx * 0.04);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(now + idx * 0.04);
        osc.stop(now + 0.36 + idx * 0.04);
      });
    } catch {}
  }

  /**
   * Combat Punch/Kick Impact Thud
   */
  public playCombatHit(isKnockout: boolean = false): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;

      // Heavy punch impact sub-bass
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.15);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(isKnockout ? 0.32 : 0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.17);

      // Slap noise
      if (this.noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800, now);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.14, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.sfxGain);

        noise.start(now);
        noise.stop(now + 0.09);
      }
    } catch {}
  }

  /**
   * Web Trap Splat Sound
   */
  public playWebTrap(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.18);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  /**
   * Dodge flip whoosh
   */
  public playDodgeWhoosh(): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(1800, now + 0.15);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + 0.22);
    } catch {}
  }

  // ==========================================
  // DYNAMIC SUPERHERO GAME BGM SOUNDTRACK
  // ==========================================
  /**
   * Procedural Superhero Symphonic BGM Generator
   * Plays heroic chord progressions (C minor -> Ab major -> Bb major -> G minor)
   * with driving strings ostinato, brass lead fanfare, and sub-bass rhythm.
   */
  public startSuperheroBGM(): void {
    if (this.bgmPlaying || !this.ctx) return;
    this.bgmPlaying = true;
    this.bgmStepIndex = 0;

    const chords = [
      // Chord 0: C minor (C, Eb, G)
      { bass: 65.41, notes: [261.63, 311.13, 392.0], lead: 523.25 },
      // Chord 1: Ab major (Ab, C, Eb)
      { bass: 51.91, notes: [207.65, 261.63, 311.13], lead: 415.30 },
      // Chord 2: Bb major (Bb, D, F)
      { bass: 58.27, notes: [233.08, 293.66, 349.23], lead: 466.16 },
      // Chord 3: G minor / G power (G, D, G)
      { bass: 49.00, notes: [196.00, 293.66, 392.0], lead: 392.00 },
    ];

    const stepDuration = 550; // ms per beat

    const playBgmStep = () => {
      if (!this.bgmPlaying || !this.ctx || this.isMuted) {
        this.bgmTimer = window.setTimeout(playBgmStep, stepDuration);
        return;
      }

      try {
        const chordIdx = Math.floor(this.bgmStepIndex / 4) % chords.length;
        const beatInChord = this.bgmStepIndex % 4;
        const currentChord = chords[chordIdx];
        const now = this.ctx.currentTime;

        // 1. Deep Superhero Bass Note on beat 0 and beat 2
        if (beatInChord === 0 || beatInChord === 2) {
          const bassOsc = this.ctx.createOscillator();
          bassOsc.type = 'sawtooth';
          bassOsc.frequency.setValueAtTime(currentChord.bass, now);

          const bassFilter = this.ctx.createBiquadFilter();
          bassFilter.type = 'lowpass';
          bassFilter.frequency.setValueAtTime(180, now);

          const bassGain = this.ctx.createGain();
          bassGain.gain.setValueAtTime(0.12, now);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

          bassOsc.connect(bassFilter);
          bassFilter.connect(bassGain);
          bassGain.connect(this.bgmGain!);

          bassOsc.start(now);
          bassOsc.stop(now + 0.48);
        }

        // 2. Cinematic Strings Arpeggio
        const noteFreq = currentChord.notes[beatInChord % currentChord.notes.length];
        const stringOsc = this.ctx.createOscillator();
        stringOsc.type = 'triangle';
        stringOsc.frequency.setValueAtTime(noteFreq, now);

        const stringGain = this.ctx.createGain();
        stringGain.gain.setValueAtTime(0.045, now);
        stringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

        stringOsc.connect(stringGain);
        stringGain.connect(this.bgmGain!);
        stringOsc.start(now);
        stringOsc.stop(now + 0.45);

        // 3. Heroic Brass Lead Motif (every 2 beats)
        if (beatInChord === 0 || beatInChord === 3) {
          const brassOsc = this.ctx.createOscillator();
          brassOsc.type = 'sawtooth';
          brassOsc.frequency.setValueAtTime(currentChord.lead, now);

          const brassFilter = this.ctx.createBiquadFilter();
          brassFilter.type = 'lowpass';
          brassFilter.frequency.setValueAtTime(
            this.bgmIntensity === 'action' ? 1400 : 700,
            now
          );

          const brassGain = this.ctx.createGain();
          const brassVol = this.bgmIntensity === 'action' ? 0.08 : 0.035;
          brassGain.gain.setValueAtTime(brassVol, now);
          brassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);

          brassOsc.connect(brassFilter);
          brassFilter.connect(brassGain);
          brassGain.connect(this.bgmGain!);

          brassOsc.start(now);
          brassOsc.stop(now + 0.54);
        }

        // 4. Action Rhythmic Percussion Pulse (in action / swinging mode)
        if (this.bgmIntensity === 'action') {
          const kickOsc = this.ctx.createOscillator();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(110, now);
          kickOsc.frequency.exponentialRampToValueAtTime(30, now + 0.12);

          const kickGain = this.ctx.createGain();
          kickGain.gain.setValueAtTime(0.12, now);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

          kickOsc.connect(kickGain);
          kickGain.connect(this.bgmGain!);
          kickOsc.start(now);
          kickOsc.stop(now + 0.14);
        }

        this.bgmStepIndex++;
      } catch {}

      this.bgmTimer = window.setTimeout(playBgmStep, stepDuration);
    };

    playBgmStep();
  }

  public setBgmIntensity(intensity: 'ambient' | 'action'): void {
    this.bgmIntensity = intensity;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public setBgmVolume(volume: number): void {
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(Math.max(0, Math.min(volume, 1.0)), this.ctx.currentTime, 0.05);
    }
  }

  public setSfxVolume(volume: number): void {
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(Math.max(0, Math.min(volume, 1.0)), this.ctx.currentTime, 0.05);
    }
  }

  public playQuestComplete(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.12, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.36);
      });
    } catch {}
  }
}

export const soundEngine = new SoundEngine();
