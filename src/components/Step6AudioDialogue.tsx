import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Play,
  Square,
  Sparkles,
  Mic,
  Sliders,
  Music,
  ArrowRight,
  ArrowLeft,
  Activity,
  Layers,
  Repeat,
  Radio,
  Flame,
  Check,
} from 'lucide-react';
import { SceneItem, StoryProject, MusicTheme } from '../types/cineStory';
import { generateSpeech } from '../services/api';
import { soundtrackManager, NarrativePhase } from '../utils/audioSynth';

interface Step6Props {
  project: StoryProject;
  onUpdateScene: (sceneId: string, updated: Partial<SceneItem>) => void;
  onUpdateSettings: (settings: Partial<StoryProject['settings']>) => void;
  onNext: () => void;
  onBack: () => void;
}

const THEME_OPTIONS: { id: MusicTheme; label: string; description: string; mood: string }[] = [
  {
    id: 'Cinematic Orchestral',
    label: 'Cinematic Orchestral Epic',
    description: 'Rich strings, brass swells, and tympani building to a soaring symphonic climax.',
    mood: 'Heroic, Regal & Emotionally Grand',
  },
  {
    id: 'Cyberpunk Synthwave',
    label: 'Cyberpunk Synthwave',
    description: 'Analog sawtooth basslines, neon arpeggiators, and dark electronic tension.',
    mood: 'Futuristic, Gritty & High-Tech Noir',
  },
  {
    id: 'Dark Fantasy & Lore',
    label: 'Dark Fantasy & Lore',
    description: 'Modal drones, cathedral choir hums, ancient harp motifs, and ominous undertones.',
    mood: 'Mythic, Arcane & Somber Mystery',
  },
  {
    id: 'Suspense Thriller',
    label: 'Suspense Thriller',
    description: 'Low cluster drones, heartbeat sub-bass pulses, and rising dissonance.',
    mood: 'Tense, Claustrophobic & Urgent',
  },
  {
    id: 'Emotional Neo-Classical',
    label: 'Emotional Neo-Classical',
    description: 'Intimate piano voicings, gentle warm cello textures, and cathartic chord cadences.',
    mood: 'Poignant, Reflective & Heartfelt',
  },
  {
    id: 'Sci-Fi Space Ambient',
    label: 'Sci-Fi Space Odyssey',
    description: 'Ethereal cosmic pads, shimmering overtone reverbs, and vast celestial harmony.',
    mood: 'Wonder, Infinite & Atmospheric',
  },
  {
    id: 'Epic Trailer Percussion',
    label: 'Epic Trailer Percussion',
    description: 'Heavy rhythmic war-drums, rising cinematic impacts, and brass stingers.',
    mood: 'Adrenaline, Battle & Action Drive',
  },
  {
    id: 'Whimsical Fantasy',
    label: 'Whimsical Fantasy',
    description: 'Airy major 7th glissandi, playful bell harmonics, and magical storybook lightness.',
    mood: 'Enchanting, Playful & Fairytale',
  },
  {
    id: 'Gentle Acoustic',
    label: 'Gentle Acoustic & Folk',
    description: 'Warm organic guitar harmonies, pastoral storytelling warmth, and sunny acoustic calm.',
    mood: 'Intimate, Peaceful & Earthy',
  },
];

export const Step6AudioDialogue: React.FC<Step6Props> = ({
  project,
  onUpdateScene,
  onUpdateSettings,
  onNext,
  onBack,
}) => {
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [isSynthesizingAll, setIsSynthesizingAll] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<NarrativePhase>('exposition');
  const [visualizerHeights, setVisualizerHeights] = useState<number[]>(Array(24).fill(8));

  const animFrameRef = useRef<number | null>(null);

  // Sync settings defaults
  const seamlessLoop = project.settings.seamlessNarrativeLoop ?? true;
  const dynamicMood = project.settings.dynamicMoodProgression ?? true;
  const intensity = project.settings.musicIntensity ?? 'balanced';

  // Live visualizer loop
  useEffect(() => {
    const updateVisualizer = () => {
      if (soundtrackManager.isThemePlaying()) {
        const data = soundtrackManager.getVisualizerData();
        if (data && data.length > 0) {
          const heights: number[] = [];
          const step = Math.max(1, Math.floor(data.length / 24));
          for (let i = 0; i < 24; i++) {
            const val = data[i * step] || 0;
            heights.push(Math.max(6, Math.min(48, Math.round((val / 255) * 44) + 6)));
          }
          setVisualizerHeights(heights);
        }
      } else {
        setVisualizerHeights((prev) => prev.map((h) => Math.max(6, Math.round(h * 0.9))));
      }
      animFrameRef.current = requestAnimationFrame(updateVisualizer);
    };

    animFrameRef.current = requestAnimationFrame(updateVisualizer);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Update soundtrack settings on change
  useEffect(() => {
    soundtrackManager.setVolume(project.settings.musicVolume);
    soundtrackManager.setIntensity(intensity);
    soundtrackManager.setSeamlessLoop(seamlessLoop);
    soundtrackManager.setDynamicMood(dynamicMood);
  }, [project.settings.musicVolume, intensity, seamlessLoop, dynamicMood]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      soundtrackManager.stop();
      if (currentAudio) currentAudio.pause();
    };
  }, []);

  // Play audio snippet with browser speech accompaniment
  const handlePlayAudio = (url: string, text?: string, voicePreset?: string) => {
    if (currentAudio) {
      currentAudio.pause();
    }
    const audio = new Audio(url);
    audio.volume = project.settings.voiceVolume;
    setCurrentAudio(audio);
    setActiveAudioUrl(url);
    audio.play().catch(() => {});
    audio.onended = () => {
      setActiveAudioUrl(null);
    };

    if (text && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (voicePreset === 'Fenrir' || voicePreset === 'Charon') {
        utterance.pitch = 0.8;
        utterance.rate = 0.95;
      } else if (voicePreset === 'Puck') {
        utterance.pitch = 1.25;
        utterance.rate = 1.05;
      } else if (voicePreset === 'Kore') {
        utterance.pitch = 1.1;
        utterance.rate = 1.0;
      }
      window.speechSynthesis.speak(utterance);
    }
  };

  // Toggle soundtrack preview
  const handleToggleMusic = () => {
    if (isPlayingMusic) {
      soundtrackManager.stop();
      setIsPlayingMusic(false);
    } else {
      soundtrackManager.start(
        project.settings.musicTheme,
        project.settings.musicVolume,
        selectedPhase
      );
      setIsPlayingMusic(true);
    }
  };

  // Switch Theme
  const handleSelectTheme = (theme: MusicTheme) => {
    onUpdateSettings({ musicTheme: theme });
    if (isPlayingMusic) {
      soundtrackManager.start(theme, project.settings.musicVolume, selectedPhase);
    }
  };

  // Audition specific Narrative Phase
  const handleAuditionPhase = (phase: NarrativePhase) => {
    setSelectedPhase(phase);
    if (isPlayingMusic) {
      soundtrackManager.start(project.settings.musicTheme, project.settings.musicVolume, phase);
    }
  };

  // Synthesize single dialogue line
  const handleSynthesizeDialogue = async (sceneId: string, lineIndex: number) => {
    const scene = project.scenes.find((s) => s.id === sceneId);
    if (!scene || !scene.dialogue?.[lineIndex]) return;

    const line = scene.dialogue[lineIndex];
    const char = project.characters.find(
      (c) => c.id === line.speakerId || c.name === line.speakerName
    );
    const voicePreset = char?.voicePreset || 'Kore';

    try {
      const res = await generateSpeech(line.text, voicePreset, line.emotion, line.speakerName);
      if (res?.audioUrl) {
        const updatedLines = [...scene.dialogue];
        updatedLines[lineIndex] = {
          ...line,
          audioUrl: res.audioUrl,
        };
        onUpdateScene(sceneId, { dialogue: updatedLines });
      }
    } catch (err: any) {
      console.warn('Speech synthesis note:', err.message);
    }
  };

  // Synthesize Scene Narration
  const handleSynthesizeNarration = async (scene: SceneItem) => {
    if (!scene.narration && !scene.action) return;
    const textToSpeak = scene.narration || scene.action;

    try {
      const res = await generateSpeech(textToSpeak, 'Fenrir', 'Cinematic narrative', 'Narrator');
      if (res?.audioUrl) {
        onUpdateScene(scene.id, { narrationAudioUrl: res.audioUrl });
      }
    } catch (err: any) {
      console.warn('Narration synthesis note:', err.message);
    }
  };

  // Synthesize All Voiceovers & Dialogue Lines cleanly per-scene
  const handleSynthesizeAll = async () => {
    setIsSynthesizingAll(true);
    for (const scene of project.scenes) {
      let narrationAudioUrl = scene.narrationAudioUrl;
      if (!narrationAudioUrl && (scene.narration || scene.action)) {
        try {
          const res = await generateSpeech(
            scene.narration || scene.action,
            'Fenrir',
            'Cinematic narrative',
            'Narrator'
          );
          if (res?.audioUrl) {
            narrationAudioUrl = res.audioUrl;
          }
        } catch (e: any) {
          console.warn('Narration synthesis notice:', e?.message);
        }
      }

      let updatedDialogue = scene.dialogue ? [...scene.dialogue] : [];
      let dialogueChanged = false;

      if (updatedDialogue.length > 0) {
        for (let i = 0; i < updatedDialogue.length; i++) {
          const line = updatedDialogue[i];
          if (!line.audioUrl) {
            const char = project.characters.find(
              (c) => c.id === line.speakerId || c.name === line.speakerName
            );
            const voicePreset = char?.voicePreset || 'Kore';
            try {
              const res = await generateSpeech(
                line.text,
                voicePreset,
                line.emotion,
                line.speakerName
              );
              if (res?.audioUrl) {
                updatedDialogue[i] = { ...line, audioUrl: res.audioUrl };
                dialogueChanged = true;
              }
            } catch (e: any) {
              console.warn('Dialogue line synthesis notice:', e?.message);
            }
          }
        }
      }

      if (dialogueChanged || narrationAudioUrl !== scene.narrationAudioUrl) {
        onUpdateScene(scene.id, {
          narrationAudioUrl,
          dialogue: updatedDialogue,
        });
      }
    }
    setIsSynthesizingAll(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Music className="w-3.5 h-3.5" />
            Dynamic Theme & Sound Design Studio
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white font-cinema">
            Dynamic Theme & Narrative Audio
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Seamless multi-layer harmonic theme that dynamically adapts across your story arc and loops continuously across the entire film.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSynthesizeAll}
            disabled={isSynthesizingAll}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold transition cursor-pointer shadow-lg shadow-emerald-500/10"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isSynthesizingAll ? 'animate-spin' : ''}`} />
            <span>{isSynthesizingAll ? 'Synthesizing Audio...' : 'Synthesize All Audio'}</span>
          </button>
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white text-sm font-semibold shadow-lg shadow-rose-500/20 transition cursor-pointer"
          >
            <span>Video Editor</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dynamic Narrative Soundtrack Master Studio Card */}
      <div className="bg-[#0c0f18] border border-amber-500/25 rounded-2xl p-6 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/4 right-1/4 h-1 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

        {/* Section Title & Play/Stop Preview Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400 animate-pulse" />
              <h2 className="text-lg font-bold text-white font-cinema">
                Dynamic Cinematic Theme Engine
              </h2>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Seamless Loop
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Generates cohesive orchestral, synthwave, or ambient themes with harmonic movement tuned to your story's exposition, rise, climax, and resolution.
            </p>
          </div>

          <button
            onClick={handleToggleMusic}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border shadow-lg transition cursor-pointer shrink-0 ${
              isPlayingMusic
                ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-rose-500/20 animate-pulse'
                : 'bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-extrabold border-transparent shadow-amber-500/20'
            }`}
          >
            {isPlayingMusic ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>Stop Theme Preview</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Audition Dynamic Theme</span>
              </>
            )}
          </button>
        </div>

        {/* Real-Time Spectrum Visualizer Bar */}
        <div className="bg-slate-950/80 border border-white/5 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Radio className={`w-4 h-4 ${isPlayingMusic ? 'text-amber-400 animate-ping' : 'text-slate-600'}`} />
            <div>
              <span className="text-xs font-semibold text-white block">
                {isPlayingMusic ? `Playing: ${project.settings.musicTheme}` : 'Theme Ready for Audition'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono-code">
                {soundtrackManager.getMoodLabel()}
              </span>
            </div>
          </div>

          {/* Waveform EQ Spectrum */}
          <div className="flex items-end gap-1.5 h-10 px-2">
            {visualizerHeights.map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}px` }}
                className={`w-1.5 rounded-full transition-all duration-75 ${
                  isPlayingMusic
                    ? 'bg-gradient-to-t from-amber-500 via-rose-500 to-cyan-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                    : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Narrative Arc Stage Audition Tabs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Dynamic Story Arc Progression (Click to Audition Specific Narrative Stage):
            </span>
            <span className="text-[11px] font-mono-code text-amber-400/90">
              {dynamicMood ? 'Auto-adapts with playhead' : 'Manual lock'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              {
                id: 'exposition' as NarrativePhase,
                label: '1. Exposition / Setup',
                detail: 'Atmospheric pad & warm root drone (Scenes 1-2)',
                color: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10',
              },
              {
                id: 'rising' as NarrativePhase,
                label: '2. Rising Tension',
                detail: 'Rhythmic pulse & minor 7th tension (Scenes 3-4)',
                color: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
              },
              {
                id: 'climax' as NarrativePhase,
                label: '3. Climactic Peak',
                detail: 'Full harmonic surge & driving bass (Scene 5)',
                color: 'border-rose-500/40 text-rose-300 bg-rose-500/10',
              },
              {
                id: 'resolution' as NarrativePhase,
                label: '4. Resolution & Loop',
                detail: 'Cadence release resolving to start (Finale)',
                color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
              },
            ].map((st) => {
              const isSelected = selectedPhase === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => handleAuditionPhase(st.id)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer space-y-1 ${
                    isSelected
                      ? `${st.color} shadow-lg ring-1 ring-amber-400/50`
                      : 'border-white/5 bg-slate-900/40 text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{st.label}</span>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-current animate-ping" />}
                  </div>
                  <p className="text-[10px] leading-tight opacity-80">{st.detail}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Theme Grid Selector */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300 block">
            Select Project Cinematic Music Theme (Mixed seamlessly into timeline & MP4 video):
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {THEME_OPTIONS.map((theme) => {
              const isCurrent = project.settings.musicTheme === theme.id;
              return (
                <div
                  key={theme.id}
                  onClick={() => handleSelectTheme(theme.id)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer text-xs space-y-1 relative ${
                    isCurrent
                      ? 'bg-amber-500/15 border-amber-500/60 text-white shadow-lg shadow-amber-500/10'
                      : 'bg-slate-900/40 border-white/5 text-slate-400 hover:bg-slate-900/80 hover:text-slate-200 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{theme.label}</span>
                    {isCurrent && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">{theme.description}</p>
                  <div className="pt-1">
                    <span className="text-[10px] font-mono-code text-amber-300/80">
                      Mood: {theme.mood}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Theme & Seamless Loop Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/10 text-xs">
          {/* Seamless Loop Toggle */}
          <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                Seamless Narrative Loop
              </span>
              <button
                onClick={() => onUpdateSettings({ seamlessNarrativeLoop: !seamlessLoop })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  seamlessLoop ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    seamlessLoop ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Harmonic cadence resolves the ending chord smoothly into the opening motif without clicks or silence.
            </p>
          </div>

          {/* Dynamic Mood Progression Toggle */}
          <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Dynamic Mood Arc
              </span>
              <button
                onClick={() => onUpdateSettings({ dynamicMoodProgression: !dynamicMood })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  dynamicMood ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    dynamicMood ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Theme automatically shifts from atmospheric setup to driving tension at the story climax.
            </p>
          </div>

          {/* Intensity Selector */}
          <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 space-y-1.5">
            <span className="font-semibold text-white block">Soundtrack Intensity</span>
            <div className="grid grid-cols-3 gap-1 pt-1">
              {(['subtle', 'balanced', 'dramatic'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => onUpdateSettings({ musicIntensity: lvl })}
                  className={`py-1 rounded text-[11px] font-bold capitalize transition cursor-pointer ${
                    intensity === lvl
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Audio Mixing Sliders (Soundtrack & Dialogue) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-white/10 text-xs">
          {/* Music Volume */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-300 font-medium">Soundtrack Volume in Master Mix</span>
              <span className="font-mono-code text-amber-300 font-bold">
                {Math.round(project.settings.musicVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={project.settings.musicVolume}
              onChange={(e) => {
                const vol = parseFloat(e.target.value);
                onUpdateSettings({ musicVolume: vol });
                soundtrackManager.setVolume(vol);
              }}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Voice Volume */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-300 font-medium">Dialogue & Voice Volume</span>
              <span className="font-mono-code text-emerald-300 font-bold">
                {Math.round(project.settings.voiceVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={project.settings.voiceVolume}
              onChange={(e) => onUpdateSettings({ voiceVolume: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Per-Scene Dialogue & Narration List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <h3 className="text-base font-bold text-white font-cinema flex items-center gap-2">
            <Mic className="w-4 h-4 text-emerald-400" />
            Dialogue & Narration Vocal Tracks
          </h3>
          <span className="text-xs text-slate-400">
            {project.scenes.length} Scenes in Narrative Order
          </span>
        </div>

        {project.scenes.map((scene) => (
          <div
            key={scene.id}
            className="bg-[#0f121d] border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg"
          >
            {/* Scene Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-mono-code text-xs font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                  SCENE #{scene.sceneNumber}
                </span>
                <h4 className="font-bold text-white text-sm font-cinema">{scene.title}</h4>
              </div>

              {/* Narration synthesis button */}
              <div className="flex items-center gap-2">
                {scene.narrationAudioUrl ? (
                  <button
                    onClick={() =>
                      handlePlayAudio(
                        scene.narrationAudioUrl!,
                        scene.narration || scene.action,
                        'Fenrir'
                      )
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30 hover:bg-emerald-500/30 transition cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Play Scene Narration</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSynthesizeNarration(scene)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 transition cursor-pointer"
                  >
                    <Mic className="w-3 h-3 text-amber-400" />
                    <span>Synthesize Narration (Fenrir)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Narration script text */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 text-xs text-slate-300 space-y-1">
              <span className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wider block">
                Scene Narration / Action Voiceover
              </span>
              <p>{scene.narration || scene.action}</p>
            </div>

            {/* Dialogue lines */}
            {scene.dialogue && scene.dialogue.length > 0 ? (
              <div className="space-y-2">
                <span className="text-[10px] font-mono-code text-amber-400 uppercase tracking-wider block">
                  Character Spoken Dialogue ({scene.dialogue.length} lines)
                </span>
                {scene.dialogue.map((line, lIdx) => {
                  const char = project.characters.find(
                    (c) => c.id === line.speakerId || c.name === line.speakerName
                  );
                  const isPlayingThis = activeAudioUrl === line.audioUrl;

                  return (
                    <div
                      key={lIdx}
                      className="bg-slate-900/60 border border-white/5 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-300">{line.speakerName}</span>
                          <span className="text-[10px] text-slate-400">({line.emotion})</span>
                          <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-white/5 text-slate-300">
                            Voice: {char?.voicePreset || 'Kore'}
                          </span>
                        </div>
                        <p className="text-slate-200 italic">"{line.text}"</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {line.audioUrl ? (
                          <button
                            onClick={() =>
                              handlePlayAudio(line.audioUrl!, line.text, char?.voicePreset || 'Kore')
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 hover:bg-emerald-500/30 transition cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>{isPlayingThis ? 'Playing...' : 'Play Audio'}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSynthesizeDialogue(scene.id, lIdx)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-semibold border border-white/10 transition cursor-pointer"
                          >
                            <Mic className="w-3.5 h-3.5 text-amber-400" />
                            <span>Synthesize Line</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">
                No spoken dialogue in this scene. Driven by narration and dynamic theme soundtrack.
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Nav */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Visual Generation</span>
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-semibold shadow-lg shadow-rose-500/20 transition cursor-pointer"
        >
          <span>Open Interactive Video Editor</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
