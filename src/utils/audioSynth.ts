// Dynamic Cinematic Generative Soundtrack Engine with Seamless Narrative Looping for CineStory AI

export type NarrativePhase = 'exposition' | 'rising' | 'climax' | 'resolution';

export interface ThemeChordProfile {
  name: string;
  bassType: OscillatorType;
  leadType: OscillatorType;
  filterCutoffBase: number;
  // Progressions per narrative phase: [root, 3rd, 5th, 7th/9th]
  exposition: number[][];
  rising: number[][];
  climax: number[][];
  resolution: number[][];
}

const THEME_PROFILES: Record<string, ThemeChordProfile> = {
  'Cinematic Orchestral': {
    name: 'Cinematic Orchestral',
    bassType: 'sine',
    leadType: 'triangle',
    filterCutoffBase: 1200,
    exposition: [
      [65.41, 130.81, 196.00, 261.63], // C major warm
      [87.31, 130.81, 174.61, 261.63], // F major / C
    ],
    rising: [
      [73.42, 110.00, 146.83, 220.00, 293.66], // D minor 7 dramatic
      [82.41, 123.47, 164.81, 246.94],         // E minor 7
      [87.31, 130.81, 174.61, 261.63, 329.63], // F major 9
      [98.00, 146.83, 196.00, 246.94, 293.66], // G dominant 9
    ],
    climax: [
      [65.41, 130.81, 155.56, 196.00, 311.13, 392.00], // C minor power swell
      [58.27, 116.54, 146.83, 174.61, 293.66, 349.23], // Bb major epic
      [51.91, 103.83, 130.81, 155.56, 261.63, 311.13], // Ab major brass
      [48.99, 97.98,  146.83, 196.00, 246.94, 392.00], // G triumphant peak
    ],
    resolution: [
      [87.31, 130.81, 174.61, 261.63], // F major soft
      [98.00, 146.83, 196.00, 246.94], // G sus4 -> resolves seamlessly into C
      [65.41, 98.00,  130.81, 196.00], // C tonic drone loop anchor
    ],
  },

  'Cyberpunk Synthwave': {
    name: 'Cyberpunk Synthwave',
    bassType: 'sawtooth',
    leadType: 'sawtooth',
    filterCutoffBase: 1600,
    exposition: [
      [65.41, 130.81, 155.56, 196.00], // C minor ambient neon
      [58.27, 116.54, 146.83, 174.61], // Bb major
    ],
    rising: [
      [51.91, 103.83, 130.81, 155.56, 207.65], // Ab maj7 drive
      [58.27, 116.54, 146.83, 174.61, 233.08], // Bb sus
      [65.41, 130.81, 155.56, 196.00, 261.63], // C minor pulse
      [77.78, 155.56, 196.00, 233.08, 311.13], // Eb major
    ],
    climax: [
      [65.41, 130.81, 155.56, 196.00, 261.63, 392.00], // Heavy bass lead
      [51.91, 103.83, 130.81, 155.56, 261.63, 311.13], // Ab overdrive
      [58.27, 116.54, 146.83, 174.61, 293.66, 349.23], // Bb power
      [43.65, 87.31,  130.81, 164.81, 220.00, 329.63], // F minor peak
    ],
    resolution: [
      [51.91, 103.83, 130.81, 155.56], // Ab maj
      [58.27, 116.54, 146.83, 174.61], // Bb9
      [65.41, 130.81, 196.00, 261.63], // C minor resolution (seamless loop)
    ],
  },

  'Whimsical Fantasy': {
    name: 'Whimsical Fantasy',
    bassType: 'sine',
    leadType: 'triangle',
    filterCutoffBase: 2200,
    exposition: [
      [130.81, 196.00, 246.94, 329.63], // C maj7 airy
      [146.83, 220.00, 261.63, 349.23], // D min7
    ],
    rising: [
      [164.81, 246.94, 293.66, 392.00], // E min7
      [174.61, 261.63, 329.63, 440.00], // F maj7
      [196.00, 293.66, 349.23, 440.00, 523.25], // G maj9
    ],
    climax: [
      [130.81, 196.00, 261.63, 329.63, 392.00, 523.25, 659.25], // Glorious sparkle
      [174.61, 261.63, 349.23, 440.00, 523.25, 698.46],
      [196.00, 293.66, 392.00, 493.88, 587.33, 783.99],
    ],
    resolution: [
      [174.61, 261.63, 329.63, 440.00], // F maj7
      [196.00, 293.66, 349.23, 392.00], // G7 sus
      [130.81, 196.00, 246.94, 329.63], // C maj7 (loops seamlessly)
    ],
  },

  'Suspense Thriller': {
    name: 'Suspense Thriller',
    bassType: 'sawtooth',
    leadType: 'sawtooth',
    filterCutoffBase: 800,
    exposition: [
      [43.65, 87.31, 92.50, 110.00], // F cluster drone
      [41.20, 82.41, 87.31, 98.00],
    ],
    rising: [
      [48.99, 97.98,  103.83, 123.47], // Tension build
      [51.91, 103.83, 110.00, 130.81],
      [55.00, 110.00, 116.54, 138.59],
    ],
    climax: [
      [36.71, 73.42, 110.00, 138.59, 164.81], // Sub-bass cluster impact
      [38.89, 77.78, 116.54, 146.83, 174.61],
      [43.65, 87.31, 130.81, 164.81, 196.00],
    ],
    resolution: [
      [48.99, 97.98, 103.83],
      [41.20, 82.41, 87.31],
      [43.65, 87.31, 92.50, 110.00], // Loops back seamlessly
    ],
  },

  'Gentle Acoustic': {
    name: 'Gentle Acoustic',
    bassType: 'sine',
    leadType: 'triangle',
    filterCutoffBase: 1800,
    exposition: [
      [98.00, 146.83, 196.00, 246.94, 293.66], // G major warm
      [82.41, 123.47, 164.81, 196.00, 246.94], // E minor
    ],
    rising: [
      [110.00, 164.81, 220.00, 261.63, 329.63], // A minor 7
      [87.31,  130.81, 174.61, 220.00, 261.63], // C major 7
      [98.00,  146.83, 196.00, 246.94, 293.66], // D sus
    ],
    climax: [
      [87.31,  130.81, 174.61, 261.63, 329.63, 392.00], // Emotional peak
      [98.00,  146.83, 196.00, 293.66, 370.00, 440.00],
      [82.41,  123.47, 164.81, 246.94, 329.63, 392.00],
    ],
    resolution: [
      [87.31, 130.81, 174.61, 220.00],
      [98.00, 146.83, 196.00, 246.94],
      [98.00, 146.83, 196.00, 246.94, 293.66], // G chord loops seamlessly
    ],
  },

  'Epic Trailer Percussion': {
    name: 'Epic Trailer Percussion',
    bassType: 'sawtooth',
    leadType: 'triangle',
    filterCutoffBase: 1400,
    exposition: [
      [55.00, 110.00, 164.81, 220.00], // A minor march
      [48.99, 97.98,  146.83, 196.00], // G power
    ],
    rising: [
      [43.65, 87.31, 130.81, 174.61], // F heavy
      [48.99, 97.98, 146.83, 196.00], // G heavy
      [55.00, 110.00, 164.81, 220.00, 277.18], // A rising
    ],
    climax: [
      [55.00, 110.00, 164.81, 220.00, 329.63, 440.00], // Maximum trailer power
      [43.65, 87.31,  130.81, 174.61, 261.63, 349.23],
      [48.99, 97.98,  146.83, 196.00, 293.66, 392.00],
      [41.20, 82.41,  123.47, 164.81, 246.94, 329.63],
    ],
    resolution: [
      [43.65, 87.31, 130.81, 174.61],
      [48.99, 97.98, 146.83, 196.00],
      [55.00, 110.00, 164.81, 220.00], // Loops back seamlessly
    ],
  },

  'Dark Fantasy & Lore': {
    name: 'Dark Fantasy & Lore',
    bassType: 'sine',
    leadType: 'triangle',
    filterCutoffBase: 1000,
    exposition: [
      [73.42, 110.00, 146.83, 220.00], // D minor modal
      [65.41, 98.00,  130.81, 196.00], // C major
    ],
    rising: [
      [58.27, 87.31,  116.54, 174.61], // Bb major
      [65.41, 98.00,  130.81, 196.00], // C
      [73.42, 110.00, 146.83, 220.00, 293.66], // D minor 9
    ],
    climax: [
      [73.42, 110.00, 146.83, 174.61, 220.00, 293.66, 349.23], // Eldritch cathedral
      [58.27, 87.31,  116.54, 146.83, 233.08, 293.66],
      [55.00, 110.00, 146.83, 164.81, 220.00, 329.63], // A minor 7
    ],
    resolution: [
      [58.27, 87.31, 116.54, 174.61],
      [65.41, 98.00, 130.81, 196.00],
      [73.42, 110.00, 146.83, 220.00], // Loops back seamlessly
    ],
  },

  'Emotional Neo-Classical': {
    name: 'Emotional Neo-Classical',
    bassType: 'sine',
    leadType: 'triangle',
    filterCutoffBase: 1500,
    exposition: [
      [65.41, 130.81, 164.81, 196.00], // C major warm
      [73.42, 110.00, 146.83, 174.61], // D minor
    ],
    rising: [
      [82.41, 123.47, 164.81, 196.00, 246.94], // E minor 7
      [87.31, 130.81, 174.61, 220.00, 261.63], // F maj7
      [98.00, 146.83, 196.00, 246.94, 293.66], // G add9
    ],
    climax: [
      [82.41, 123.47, 164.81, 246.94, 329.63, 392.00, 493.88], // Heartfelt surge
      [87.31, 130.81, 174.61, 261.63, 349.23, 440.00],
      [65.41, 130.81, 196.00, 261.63, 329.63, 392.00, 523.25],
    ],
    resolution: [
      [87.31, 130.81, 174.61, 261.63],
      [98.00, 146.83, 196.00, 246.94],
      [65.41, 130.81, 164.81, 196.00], // Loops back seamlessly
    ],
  },

  'Sci-Fi Space Ambient': {
    name: 'Sci-Fi Space Ambient',
    bassType: 'sine',
    leadType: 'sine',
    filterCutoffBase: 2400,
    exposition: [
      [65.41, 196.00, 293.66, 392.00], // C sus2 open universe
      [73.42, 220.00, 329.63, 440.00], // D sus2
    ],
    rising: [
      [87.31,  261.63, 349.23, 523.25], // F lydian
      [98.00,  293.66, 392.00, 587.33], // G sus
      [110.00, 329.63, 440.00, 659.25], // A cosmic
    ],
    climax: [
      [65.41, 196.00, 261.63, 392.00, 523.25, 783.99, 1046.50], // Stargate vista
      [87.31, 261.63, 349.23, 523.25, 698.46, 1046.50],
      [98.00, 293.66, 392.00, 587.33, 783.99, 1174.66],
    ],
    resolution: [
      [87.31, 261.63, 349.23, 523.25],
      [98.00, 293.66, 392.00, 587.33],
      [65.41, 196.00, 293.66, 392.00], // Loops back seamlessly
    ],
  },
};

export class DynamicCinematicSoundtrack {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  private isPlaying: boolean = false;
  private timer: number | null = null;
  private pulseTimer: number | null = null;

  private currentTheme: string = 'Cinematic Orchestral';
  private currentPhase: NarrativePhase = 'exposition';
  private targetVolume: number = 0.35;
  private seamlessLoopEnabled: boolean = true;
  private dynamicMoodEnabled: boolean = true;
  private intensity: 'subtle' | 'balanced' | 'dramatic' = 'balanced';

  // Callbacks
  public onPhaseChange?: (phase: NarrativePhase, moodLabel: string) => void;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.filterNode = this.ctx.createBiquadFilter();
      this.analyserNode = this.ctx.createAnalyser();

      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(1400, this.ctx.currentTime);

      this.analyserNode.fftSize = 64;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // Pipeline: musicGain -> filterNode -> masterGain -> analyserNode -> destination
      this.musicGain.connect(this.filterNode);
      this.filterNode.connect(this.masterGain);
      this.masterGain.connect(this.analyserNode);
      this.analyserNode.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(volume: number) {
    this.targetVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGain && this.ctx) {
      const mult = this.intensity === 'dramatic' ? 1.25 : this.intensity === 'subtle' ? 0.75 : 1.0;
      this.musicGain.gain.setValueAtTime(Math.min(1.0, this.targetVolume * mult), this.ctx.currentTime);
    }
  }

  public setIntensity(intensity: 'subtle' | 'balanced' | 'dramatic') {
    this.intensity = intensity;
    this.setVolume(this.targetVolume);
  }

  public setSeamlessLoop(enabled: boolean) {
    this.seamlessLoopEnabled = enabled;
  }

  public setDynamicMood(enabled: boolean) {
    this.dynamicMoodEnabled = enabled;
  }

  public start(
    theme: string = 'Cinematic Orchestral',
    volume: number = 0.35,
    initialPhase: NarrativePhase = 'exposition'
  ) {
    this.init();
    if (this.isPlaying) this.stop();

    this.isPlaying = true;
    this.currentTheme = theme;
    this.currentPhase = initialPhase;
    this.setVolume(volume);

    this.playDynamicProgression();
  }

  public stop() {
    this.isPlaying = false;
    if (this.timer) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.pulseTimer) {
      window.clearTimeout(this.pulseTimer);
      this.pulseTimer = null;
    }
    if (this.musicGain && this.ctx) {
      try {
        this.musicGain.gain.setValueAtTime(0, this.ctx.currentTime);
      } catch {}
    }
  }

  public updateNarrativePosition(
    currentTime: number,
    totalDuration: number,
    currentSceneIndex?: number,
    totalScenes?: number
  ) {
    if (!this.isPlaying || !this.dynamicMoodEnabled || totalDuration <= 0) return;

    const progress = Math.max(0, Math.min(1, currentTime / totalDuration));
    let nextPhase: NarrativePhase = 'exposition';

    if (progress < 0.28) {
      nextPhase = 'exposition';
    } else if (progress < 0.62) {
      nextPhase = 'rising';
    } else if (progress < 0.86) {
      nextPhase = 'climax';
    } else {
      nextPhase = 'resolution';
    }

    if (nextPhase !== this.currentPhase) {
      this.currentPhase = nextPhase;
      this.updateFilterAndMood();

      const moodLabels: Record<NarrativePhase, string> = {
        exposition: 'Exposition: World Setup & Atmospheric Drones',
        rising: 'Rising Action: Escalating Pulse & Harmonic Tension',
        climax: 'Climactic Peak: Maximum Resonance & Dramatic Power',
        resolution: 'Resolution: Cathartic Release & Seamless Cadence Loop',
      };

      if (this.onPhaseChange) {
        this.onPhaseChange(this.currentPhase, moodLabels[this.currentPhase]);
      }
    }
  }

  public getPhase(): NarrativePhase {
    return this.currentPhase;
  }

  public getMoodLabel(): string {
    const labels: Record<NarrativePhase, string> = {
      exposition: 'Exposition: Atmospheric Setup',
      rising: 'Rising Action: Building Stakes',
      climax: 'Climax: Peak Intensity',
      resolution: 'Resolution: Seamless Loop Cadence',
    };
    return labels[this.currentPhase] || 'Cinematic Theme';
  }

  public getVisualizerData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(32);
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data);
    return data;
  }

  public isThemePlaying(): boolean {
    return this.isPlaying;
  }

  private updateFilterAndMood() {
    if (!this.filterNode || !this.ctx) return;
    const profile = THEME_PROFILES[this.currentTheme] || THEME_PROFILES['Cinematic Orchestral'];
    const baseFreq = profile.filterCutoffBase;

    let targetFreq = baseFreq;
    if (this.currentPhase === 'exposition') {
      targetFreq = baseFreq * 0.75;
    } else if (this.currentPhase === 'rising') {
      targetFreq = baseFreq * 1.25;
    } else if (this.currentPhase === 'climax') {
      targetFreq = baseFreq * 1.85;
    } else if (this.currentPhase === 'resolution') {
      targetFreq = baseFreq * 0.9;
    }

    this.filterNode.frequency.setTargetAtTime(Math.min(8000, targetFreq), this.ctx.currentTime, 0.8);
  }

  private playDynamicProgression() {
    if (!this.isPlaying || !this.ctx || !this.musicGain) return;

    const profile = THEME_PROFILES[this.currentTheme] || THEME_PROFILES['Cinematic Orchestral'];

    const playChordStep = (stepIndex: number) => {
      if (!this.isPlaying || !this.ctx || !this.musicGain) return;

      const phaseChords = profile[this.currentPhase] || profile.exposition;
      const chord = phaseChords[stepIndex % phaseChords.length];

      // Dynamic chord duration: exposition (4.5s), rising (3.5s), climax (3.0s), resolution (4.0s)
      const durations: Record<NarrativePhase, number> = {
        exposition: 4.5,
        rising: 3.5,
        climax: 3.0,
        resolution: 4.2,
      };
      const duration = durations[this.currentPhase];

      const now = this.ctx.currentTime;

      // 1. Bass Drone Root
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = profile.bassType;
      const rootFreq = chord[0];
      bassOsc.frequency.setValueAtTime(rootFreq * (this.currentPhase === 'climax' ? 0.5 : 1), now);

      bassGain.gain.setValueAtTime(0.001, now);
      bassGain.gain.exponentialRampToValueAtTime(0.18, now + 0.8);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + duration + 0.5);

      bassOsc.connect(bassGain);
      bassGain.connect(this.musicGain);
      bassOsc.start(now);
      bassOsc.stop(now + duration + 0.6);

      // 2. Harmonic Polyphony (Mid & Upper Voices)
      chord.slice(1).forEach((freq, idx) => {
        if (!this.ctx || !this.musicGain) return;
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();

        osc.type = profile.leadType;
        // Subtle detune for rich cinematic stereo chorus feel
        osc.detune.setValueAtTime((idx % 2 === 0 ? 3.5 : -3.5), now);
        osc.frequency.setValueAtTime(freq, now);

        noteGain.gain.setValueAtTime(0.001, now);
        noteGain.gain.exponentialRampToValueAtTime(0.14 / (chord.length - 1), now + 1.1);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + duration + 0.4);

        osc.connect(noteGain);
        noteGain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + duration + 0.5);
      });

      // 3. Climax & Rising Tension Pulse Arpeggio
      if (this.currentPhase === 'rising' || this.currentPhase === 'climax') {
        const pulseCount = this.currentPhase === 'climax' ? 8 : 4;
        const pulseInterval = (duration - 0.5) / pulseCount;

        for (let p = 0; p < pulseCount; p++) {
          const pulseTime = now + 0.2 + p * pulseInterval;
          const pOsc = this.ctx.createOscillator();
          const pGain = this.ctx.createGain();

          pOsc.type = profile.leadType;
          const arpFreq = chord[(p % (chord.length - 1)) + 1] * (this.currentPhase === 'climax' ? 2 : 1);
          pOsc.frequency.setValueAtTime(arpFreq, pulseTime);

          pGain.gain.setValueAtTime(0.001, pulseTime);
          pGain.gain.exponentialRampToValueAtTime(0.07, pulseTime + 0.04);
          pGain.gain.exponentialRampToValueAtTime(0.0001, pulseTime + 0.22);

          pOsc.connect(pGain);
          pGain.connect(this.musicGain);
          pOsc.start(pulseTime);
          pOsc.stop(pulseTime + 0.25);
        }
      }

      // Schedule next chord with smooth overlapping crossfade
      const overlap = 0.6;
      this.timer = window.setTimeout(() => {
        playChordStep(stepIndex + 1);
      }, Math.max(1000, (duration - overlap) * 1000));
    };

    playChordStep(0);
  }
}

export const soundtrackManager = new DynamicCinematicSoundtrack();
