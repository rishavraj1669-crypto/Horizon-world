/**
 * Zero-dependency Procedural Web Audio Engine
 * Real-time synthesis for vehicle engine pitch, transmission hum, horn,
 * weather ambient layers (rain, wind, thunder strikes), and dialogue/UI audio.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Engine sound nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  // Weather sound nodes
  private rainNoiseNode: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;

  private windNoiseNode: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;

  private isInitialized: boolean = false;

  public init(): void {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupEngineSound();
      this.setupWeatherAmbience();
      this.isInitialized = true;
    } catch {
      // AudioContext unavailable or blocked by autoplay
    }
  }

  private setupEngineSound(): void {
    if (!this.ctx || !this.masterGain) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(450, this.ctx.currentTime);

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(22.5, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    try {
      this.engineOsc1.start();
      this.engineOsc2.start();
    } catch {}
  }

  private setupWeatherAmbience(): void {
    if (!this.ctx || !this.masterGain) return;

    // Create 4-second looping white noise buffer for rain & wind
    const bufferSize = this.ctx.sampleRate * 4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Rain Ambience
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.rainFilter = this.ctx.createBiquadFilter();
    this.rainFilter.type = 'bandpass';
    this.rainFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    this.rainFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

    this.rainNoiseNode = this.ctx.createBufferSource();
    this.rainNoiseNode.buffer = noiseBuffer;
    this.rainNoiseNode.loop = true;
    this.rainNoiseNode.connect(this.rainFilter);
    this.rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);

    // Wind Ambience
    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

    this.windNoiseNode = this.ctx.createBufferSource();
    this.windNoiseNode.buffer = noiseBuffer;
    this.windNoiseNode.loop = true;
    this.windNoiseNode.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    try {
      this.rainNoiseNode.start();
      this.windNoiseNode.start();
    } catch {}
  }

  public updateEngine(rpm: number, speed: number, inVehicle: boolean): void {
    if (!this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (!inVehicle) {
      // Vehicle is idling in distance
      this.engineGain.gain.setTargetAtTime(0.015, this.ctx.currentTime, 0.1);
      this.engineOsc1.frequency.setTargetAtTime(38, this.ctx.currentTime, 0.1);
      this.engineOsc2.frequency.setTargetAtTime(19, this.ctx.currentTime, 0.1);
      return;
    }

    // Map RPM (800 - 6500) to oscillator frequencies (35Hz - 160Hz)
    const baseFreq = 35 + (rpm / 6500) * 115;
    const filterFreq = 300 + (rpm / 6500) * 850 + Math.abs(speed) * 15;
    const volume = 0.04 + Math.min(0.08, (rpm / 6500) * 0.08);

    this.engineOsc1.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 0.5, this.ctx.currentTime, 0.05);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.05);
    this.engineGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
  }

  public updateWeatherAudio(weatherType: string, windSpeed: number): void {
    if (!this.ctx || !this.rainGain || !this.windGain || !this.windFilter) return;

    let targetRain = 0;
    if (weatherType === 'rain') targetRain = 0.18;
    else if (weatherType === 'thunder') targetRain = 0.28;
    else if (weatherType === 'snow') targetRain = 0.04;

    this.rainGain.gain.setTargetAtTime(targetRain, this.ctx.currentTime, 0.5);

    // Wind modulation
    const targetWind = 0.03 + (windSpeed / 15) * 0.12;
    const windFreq = 220 + (windSpeed / 15) * 450;
    this.windGain.gain.setTargetAtTime(targetWind, this.ctx.currentTime, 0.5);
    this.windFilter.frequency.setTargetAtTime(windFreq, this.ctx.currentTime, 0.5);
  }

  public playHorn(): void {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.value = 392; // G4
      osc2.frequency.value = 493.88; // B4

      gain.gain.setValueAtTime(0.14, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start();
      osc2.start();
      osc1.stop(this.ctx.currentTime + 0.36);
      osc2.stop(this.ctx.currentTime + 0.36);
    } catch {}
  }

  public playThunder(): void {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(65, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(25, this.ctx.currentTime + 1.2);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(160, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 1.85);
    } catch {}
  }

  public playDriftSqueal(): void {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(680 + Math.random() * 80, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.19);
    } catch {}
  }

  public playToggleClick(): void {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1100, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.09, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.055);
    } catch {}
  }

  public playQuestComplete(): void {
    if (!this.ctx || !this.masterGain) return;
    try {
      const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = this.ctx.currentTime + idx * 0.1;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(startTime);
        osc.stop(startTime + 0.36);
      });
    } catch {}
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}

export const soundEngine = new SoundEngine();
