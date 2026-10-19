import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2, Sliders, Clapperboard, Clock, Music, MessageSquare, ArrowRight, ArrowLeft, RefreshCw, Layers, Sparkles, Repeat, Activity, Flame } from 'lucide-react';
import { AspectRatio, SceneItem, StoryProject } from '../types/cineStory';
import { soundtrackManager } from '../utils/audioSynth';

interface Step7Props {
  project: StoryProject;
  onUpdateScene: (sceneId: string, updated: Partial<SceneItem>) => void;
  onReorderScenes: (startIndex: number, endIndex: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export const Step7VideoEditor: React.FC<Step7Props> = ({
  project,
  onUpdateScene,
  onReorderScenes,
  onNext,
  onBack,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(project.settings.seamlessNarrativeLoop ?? true);
  const [activeMoodLabel, setActiveMoodLabel] = useState<string>('Exposition: Atmospheric Setup');
  const [activeDialogueSubtitle, setActiveDialogueSubtitle] = useState<string>('');

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const scenes = project.scenes;
  const activeScene = scenes[activeSceneIndex] || scenes[0];

  // Calculate cumulative times for each scene
  const sceneStartTimes: number[] = [];
  let totalDuration = 0;
  scenes.forEach((s) => {
    sceneStartTimes.push(totalDuration);
    totalDuration += s.duration || 5;
  });

  // Playhead scrubber step
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (activeAudioRef.current) activeAudioRef.current.pause();
      soundtrackManager.stop();
      return;
    }

    // Start background soundtrack if not muted
    if (!isMuted) {
      soundtrackManager.start(project.settings.musicTheme, project.settings.musicVolume * 0.45);
      soundtrackManager.updateNarrativePosition(currentTime, totalDuration, activeSceneIndex, scenes.length);
      setActiveMoodLabel(soundtrackManager.getMoodLabel());
    }

    const interval = 100; // 100ms tick
    timerRef.current = window.setInterval(() => {
      setCurrentTime((prev) => {
        const nextTime = prev + 0.1;

        if (nextTime >= totalDuration) {
          if (isLooping) {
            // Seamless narrative loop: resolve finale and circle back to exposition
            soundtrackManager.updateNarrativePosition(0, totalDuration, 0, scenes.length);
            setActiveMoodLabel(soundtrackManager.getMoodLabel());
            setActiveSceneIndex(0);
            return 0;
          } else {
            setIsPlaying(false);
            soundtrackManager.stop();
            return 0;
          }
        }

        // Check which scene we are in
        let sIdx = 0;
        for (let i = 0; i < sceneStartTimes.length; i++) {
          if (nextTime >= sceneStartTimes[i]) {
            sIdx = i;
          }
        }

        if (sIdx !== activeSceneIndex) {
          setActiveSceneIndex(sIdx);
        }

        // Dynamically modulate soundtrack along the story arc
        soundtrackManager.updateNarrativePosition(nextTime, totalDuration, sIdx, scenes.length);
        setActiveMoodLabel(soundtrackManager.getMoodLabel());

        return nextTime;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, totalDuration, activeSceneIndex, isMuted, isLooping, project.settings.musicTheme, project.settings.musicVolume]);

  // Handle Scene Change Speech Playback
  useEffect(() => {
    if (!isPlaying || isMuted || !activeScene) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    // Check if active scene has audio
    const audioUrl = activeScene.dialogue?.[0]?.audioUrl || activeScene.narrationAudioUrl;
    if (audioUrl) {
      if (activeAudioRef.current) activeAudioRef.current.pause();
      const audio = new Audio(audioUrl);
      audio.volume = project.settings.voiceVolume;
      audio.play().catch(() => {});
      activeAudioRef.current = audio;
    }

    // Articulate line via speech synthesis
    const lineToSpeak = activeScene.dialogue?.[0]?.text || activeScene.narration;
    if (lineToSpeak && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(lineToSpeak);
      const speakerChar = project.characters.find(
        (c) => c.id === activeScene.dialogue?.[0]?.speakerId || c.name === activeScene.dialogue?.[0]?.speakerName
      );
      const preset = speakerChar?.voicePreset || 'Kore';
      if (preset === 'Fenrir' || preset === 'Charon') utterance.pitch = 0.8;
      else if (preset === 'Puck') utterance.pitch = 1.25;
      else utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }

    // Set subtitle
    if (activeScene.dialogue && activeScene.dialogue.length > 0) {
      setActiveDialogueSubtitle(`${activeScene.dialogue[0].speakerName}: "${activeScene.dialogue[0].text}"`);
    } else if (activeScene.narration) {
      setActiveDialogueSubtitle(activeScene.narration);
    } else {
      setActiveDialogueSubtitle(activeScene.action || '');
    }
  }, [activeSceneIndex, isPlaying, isMuted]);

  const togglePlay = () => {
    setIsPlaying((p) => !p);
  };

  const jumpToScene = (index: number) => {
    setActiveSceneIndex(index);
    setCurrentTime(sceneStartTimes[index]);
  };

  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sliders className="w-3.5 h-3.5" />
            Interactive Timeline & Cinema Player
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white font-cinema">
            Director's Video Suite
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Preview the continuous assembled film, adjust clip durations, transitions, dialogue synchronization, and camera motion.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white text-sm font-semibold shadow-lg shadow-rose-500/20 transition cursor-pointer"
          >
            <span>Final MP4 Export</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Cinema Player Stage */}
      <div className="bg-[#0b0d14] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col items-center">
        {/* Aspect Ratio Video Container */}
        <div
          className={`relative overflow-hidden rounded-xl bg-black border border-white/10 shadow-2xl flex items-center justify-center transition-all ${
            project.settings.aspectRatio === '9:16'
              ? 'w-full max-w-[340px] aspect-[9/16]'
              : project.settings.aspectRatio === '1:1'
              ? 'w-full max-w-[480px] aspect-square'
              : 'w-full max-w-[854px] aspect-video'
          }`}
        >
          {/* Visual Presentation: Veo video or 2.5D Ken Burns animated keyframe */}
          {activeScene?.videoUrl ? (
            <video
              src={activeScene.videoUrl}
              autoPlay={isPlaying}
              muted={isMuted}
              loop
              className="w-full h-full object-cover"
            />
          ) : activeScene?.keyframeImageUrl ? (
            <img
              src={activeScene.keyframeImageUrl}
              alt={activeScene.title}
              className={`w-full h-full object-cover transition-transform duration-[6000ms] ease-out ${
                isPlaying ? 'scale-110 translate-y-[-2%]' : 'scale-100'
              }`}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-600">
              <Clapperboard className="w-12 h-12 mb-2" />
              <span className="text-xs font-mono-code">Visual Keyframe Pending</span>
            </div>
          )}

          {/* Letterbox & Cinema Glow Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/30" />

          {/* Scene Title Watermark */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-black/75 backdrop-blur-md text-[11px] font-mono-code text-amber-400 border border-white/10 font-bold">
              SCENE {activeScene?.sceneNumber || 1}/{scenes.length}
            </span>
            <span className="text-xs font-bold text-white drop-shadow font-cinema">
              {activeScene?.title}
            </span>
          </div>

          {/* Subtitles Overlay */}
          {project.settings.subtitlesEnabled && activeDialogueSubtitle && (
            <div className="absolute bottom-6 inset-x-6 z-20 flex justify-center text-center pointer-events-none">
              <div
                className={`max-w-xl px-4 py-2 rounded-lg text-sm sm:text-base leading-snug tracking-wide transition-all ${
                  project.settings.subtitleStyle === 'cinematic-gold'
                    ? 'bg-black/80 text-amber-300 font-bold shadow-2xl font-cinema border border-amber-500/20'
                    : project.settings.subtitleStyle === 'cyber-neon'
                    ? 'bg-black/90 text-cyan-300 font-mono-code font-bold drop-shadow-[0_0_10px_rgba(6,182,212,0.9)] border border-cyan-500/30'
                    : 'bg-black/80 text-white font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]'
                }`}
              >
                {activeDialogueSubtitle}
              </div>
            </div>
          )}
        </div>

        {/* Player Transport Controls */}
        <div className="w-full max-w-[854px] mt-4 flex items-center justify-between text-xs text-slate-300 border-t border-white/5 pt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => jumpToScene(Math.max(0, activeSceneIndex - 1))}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
              title="Previous Scene"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={togglePlay}
              className="p-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-lg shadow-amber-500/20"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>
            <button
              onClick={() => jumpToScene(Math.min(scenes.length - 1, activeSceneIndex + 1))}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
              title="Next Scene"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Timecode display */}
          <div className="font-mono-code text-sm font-bold tracking-wider text-amber-400">
            {formatTimecode(currentTime)} / {formatTimecode(totalDuration)}
          </div>

          {/* Dynamic Narrative Theme Status Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-white/10 text-[11px] text-slate-300">
            <Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-amber-300 font-bold">{project.settings.musicTheme}:</span>
            <span className="truncate max-w-[200px]">{activeMoodLabel}</span>
          </div>

          {/* Seamless Loop Toggle & Volume */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                isLooping
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
              title="Seamless Loop Across Entire Narrative"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isLooping ? 'Loop ON' : 'Loop OFF'}</span>
            </button>

            <button
              onClick={() => setIsMuted((m) => !m)}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Track Visual Timeline */}
      <div className="bg-[#0f121d] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Multi-Track Timeline Sequence
          </h3>
          <span className="text-xs text-slate-400">Click any clip to scrub playhead</span>
        </div>

        {/* Timeline Tracks */}
        <div className="space-y-2 pt-2">
          {/* Visual Track */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[11px] font-mono-code text-slate-400">
              <Clapperboard className="w-3.5 h-3.5 text-amber-400" />
              <span>Track 1: Video / Visuals</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
              {scenes.map((scene, idx) => {
                const isActive = idx === activeSceneIndex;
                const widthPercent = Math.max(12, (scene.duration / totalDuration) * 100);

                return (
                  <div
                    key={scene.id}
                    onClick={() => jumpToScene(idx)}
                    style={{ minWidth: `${widthPercent * 4}px` }}
                    className={`h-20 rounded-xl overflow-hidden border cursor-pointer relative group transition flex-shrink-0 ${
                      isActive
                        ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg'
                        : 'border-white/10 hover:border-white/30 opacity-75 hover:opacity-100'
                    }`}
                  >
                    {scene.keyframeImageUrl ? (
                      <img
                        src={scene.keyframeImageUrl}
                        alt={scene.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center text-[10px] text-slate-500 font-mono-code">
                        Scene {scene.sceneNumber}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5 justify-between">
                      <span className="text-[10px] font-bold text-white truncate max-w-[80px]">
                        #{scene.sceneNumber} {scene.title}
                      </span>
                      <span className="text-[9px] font-mono-code text-amber-300 bg-black/60 px-1 rounded">
                        {scene.duration}s
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dialogue & Narration Track */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[11px] font-mono-code text-slate-400">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Track 2: Spoken Voiceover & Speech Audio</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {scenes.map((scene, idx) => {
                const isActive = idx === activeSceneIndex;
                const hasSpeech = Boolean(scene.dialogue?.[0]?.audioUrl || scene.narrationAudioUrl);

                return (
                  <div
                    key={scene.id}
                    onClick={() => jumpToScene(idx)}
                    className={`h-8 rounded-lg border px-2.5 flex items-center justify-between text-xs transition cursor-pointer flex-1 min-w-[120px] ${
                      isActive
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                        : hasSpeech
                        ? 'bg-slate-900/60 border-white/10 text-slate-300'
                        : 'bg-slate-950 border-white/5 text-slate-600'
                    }`}
                  >
                    <span className="truncate text-[11px]">
                      {scene.dialogue?.[0]?.speakerName || 'Narrator'}
                    </span>
                    <span className="text-[10px] font-mono-code">
                      {hasSpeech ? '✓ Audio' : 'No Voice'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Theme & Seamless Narrative Track */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400">
              <div className="flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-white font-semibold">Track 3: Dynamic Theme ({project.settings.musicTheme})</span>
              </div>
              <span className="text-amber-400 flex items-center gap-1.5 text-[10px]">
                <Repeat className="w-3 h-3 text-emerald-400" />
                Seamless Narrative Loop Active
              </span>
            </div>

            {/* 4 Dynamic Narrative Arc Segments with Visual Scrubber */}
            <div className="h-7 rounded-lg overflow-hidden border border-white/10 flex text-[10px] font-mono-code relative bg-slate-950">
              <div
                style={{ width: '28%' }}
                className="bg-cyan-950/40 border-r border-cyan-500/30 flex items-center justify-center text-cyan-300 font-semibold px-2 truncate"
                title="1. Exposition: World Setup & Atmospheric Drones"
              >
                1. Exposition
              </div>
              <div
                style={{ width: '36%' }}
                className="bg-amber-950/40 border-r border-amber-500/30 flex items-center justify-center text-amber-300 font-semibold px-2 truncate"
                title="2. Rising Tension: Escalating Pulse & Minor 7th Harmonics"
              >
                2. Rising Tension
              </div>
              <div
                style={{ width: '22%' }}
                className="bg-rose-950/40 border-r border-rose-500/30 flex items-center justify-center text-rose-300 font-semibold px-2 truncate"
                title="3. Climactic Peak: Deep Sub-Bass & Harmonic Surge"
              >
                3. Climax Peak
              </div>
              <div
                style={{ width: '14%' }}
                className="bg-emerald-950/40 flex items-center justify-center text-emerald-300 font-semibold px-2 truncate"
                title="4. Resolution & Loop: Seamless Cadence back to Start"
              >
                4. Resolution ↺
              </div>

              {/* Progress Playhead Scrubber on Track 3 */}
              <div
                style={{ left: `${Math.min(100, Math.max(0, (currentTime / (totalDuration || 1)) * 100))}%` }}
                className="absolute top-0 bottom-0 w-1 bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,1)] transition-all pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Trim & Quick Controls for Active Scene */}
        {activeScene && (
          <div className="bg-slate-950/60 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mt-3">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-white">Active Scene #{activeScene.sceneNumber}:</span>
              <span className="text-slate-300">{activeScene.title}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Duration:</span>
                <button
                  onClick={() =>
                    onUpdateScene(activeScene.id, {
                      duration: Math.max(3, (activeScene.duration || 5) - 1),
                    })
                  }
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white font-mono-code font-bold"
                >
                  -1s
                </button>
                <span className="font-mono-code text-amber-300 font-bold px-1">
                  {activeScene.duration}s
                </span>
                <button
                  onClick={() =>
                    onUpdateScene(activeScene.id, {
                      duration: Math.min(15, (activeScene.duration || 5) + 1),
                    })
                  }
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white font-mono-code font-bold"
                >
                  +1s
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Transition:</span>
                <select
                  value={activeScene.transition}
                  onChange={(e) =>
                    onUpdateScene(activeScene.id, {
                      transition: e.target.value as any,
                    })
                  }
                  className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-slate-200"
                >
                  <option value="fade-black">Fade to Black</option>
                  <option value="cross-dissolve">Cross Dissolve</option>
                  <option value="cut">Direct Cut</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Nav */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Audio & Dialogue</span>
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-semibold shadow-lg shadow-rose-500/20 transition cursor-pointer"
        >
          <span>Export Final MP4 Video</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
