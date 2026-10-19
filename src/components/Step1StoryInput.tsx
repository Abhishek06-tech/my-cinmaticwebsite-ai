import React, { useState } from 'react';
import { Sparkles, Wand2, BookOpen, Upload, Video, Music, Globe, SlidersHorizontal, AlertCircle, ArrowRight, Check } from 'lucide-react';
import { StoryProject, VisualStyle, AspectRatio, MusicTheme } from '../types/cineStory';
import { SAMPLE_STORIES, SampleStory } from '../data/sampleStories';

interface Step1Props {
  project: StoryProject;
  onUpdateProject: (updated: Partial<StoryProject>) => void;
  onStartAnalysis: () => void;
  isLoading: boolean;
}

export const Step1StoryInput: React.FC<Step1Props> = ({
  project,
  onUpdateProject,
  onStartAnalysis,
  isLoading,
}) => {
  const [selectedSampleId, setSelectedSampleId] = useState<string>('');
  const [charImgPreview, setCharImgPreview] = useState<string | null>(null);

  const visualStyles: { name: VisualStyle; description: string; icon: string }[] = [
    { name: 'Cinematic Film (35mm Anamorphic)', description: 'Panavision lenses, deep depth of field, warm film grain', icon: '🎬' },
    { name: 'Cyberpunk Neo-Noir', description: 'Neon rain, holograms, volumetric steam, chromatic aberration', icon: '🌆' },
    { name: 'Dark Fantasy Epic', description: 'Ethereal mist, mystical ruins, bioluminescent flora, ancient armor', icon: '⚔️' },
    { name: 'Anime / Studio Ghibli', description: 'Hand-painted landscapes, vibrant colors, expressive emotional art', icon: '🎨' },
    { name: 'Pixar / Disney 3D Animation', description: 'Stylized 3D characters, charming lighting, expressive physics', icon: '✨' },
    { name: 'Vintage 1970s Panavision', description: 'Warm nostalgic tones, soft blooms, technicolor aesthetic', icon: '📽️' },
    { name: 'Hyperrealistic Documentary', description: 'Natural daylight, IMAX clarity, authentic cinematic realism', icon: '🌍' },
  ];

  const aspectRatios: { value: AspectRatio; label: string; sub: string }[] = [
    { value: '16:9', label: '16:9 Landscape', sub: 'Cinema, YouTube, TV' },
    { value: '9:16', label: '9:16 Vertical', sub: 'TikTok, Reels, Shorts' },
    { value: '1:1', label: '1:1 Square', sub: 'Instagram Feed, Square' },
  ];

  const musicThemes: { value: MusicTheme; desc: string }[] = [
    { value: 'Cinematic Orchestral', desc: 'Lush strings, brass swells, emotional drama' },
    { value: 'Cyberpunk Synthwave', desc: 'Analog synthesizers, pulsing bass, neon beats' },
    { value: 'Dark Fantasy & Lore', desc: 'Modal drones, cathedral choir, arcane mystery' },
    { value: 'Suspense Thriller', desc: 'Tense sub-bass, ominous strings, ticking' },
    { value: 'Emotional Neo-Classical', desc: 'Intimate piano voicings, warm cello textures' },
    { value: 'Sci-Fi Space Ambient', desc: 'Cosmic shimmer, celestial overtone reverbs' },
    { value: 'Epic Trailer Percussion', desc: 'Thunderous war-drums, cinematic impacts' },
    { value: 'Whimsical Fantasy', desc: 'Harps, wooden flutes, enchanting bells' },
    { value: 'Gentle Acoustic', desc: 'Fingerpicked guitar, peaceful piano, warm wood' },
  ];

  const handleSelectSample = (sample: SampleStory) => {
    setSelectedSampleId(sample.id);
    onUpdateProject({
      rawStory: sample.text,
      settings: {
        ...project.settings,
        title: sample.title,
        visualStyle: sample.visualStyle as VisualStyle,
      },
    });
  };

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setCharImgPreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const wordCount = project.rawStory.trim() ? project.rawStory.trim().split(/\s+/).length : 0;
  const isReady = project.rawStory.trim().length > 30;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Hero Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold tracking-wide uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          Professional AI Story-to-Video Engine
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white font-cinema tracking-wide">
          Transform Any Story Into a <span className="bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-400 bg-clip-text text-transparent">Cinematic Video</span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
          Input your narrative. CineStory AI orchestrates Gemini 3.8 and Veo to extract characters, plan cinematic scenes, synthesize voice acting, and render a downloadable MP4 video.
        </p>
      </div>

      {/* Preset Story Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            Quick Start: Load a Multi-Scene Sample Story
          </h2>
          <span className="text-xs text-slate-400">Click to load instantly</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SAMPLE_STORIES.map((sample) => {
            const isSelected = selectedSampleId === sample.id;
            return (
              <button
                key={sample.id}
                onClick={() => handleSelectSample(sample)}
                className={`text-left p-3.5 rounded-xl border transition group relative overflow-hidden ${
                  isSelected
                    ? 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-900/40 hover:bg-slate-900/80 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-mono-code px-2 py-0.5 rounded bg-white/5 text-amber-300">
                    {sample.genre}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <h3 className="font-semibold text-white text-sm group-hover:text-amber-300 transition line-clamp-1">
                  {sample.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {sample.synopsis}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Story Input Area */}
      <div className="bg-[#0f121d] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
          <label className="text-sm font-semibold text-white flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-amber-400" />
            Story Script & Narrative
          </label>
          <div className="flex items-center gap-4 text-xs font-mono-code text-slate-400">
            <span>{wordCount} words</span>
            <span>{project.rawStory.length} characters</span>
          </div>
        </div>

        <textarea
          value={project.rawStory}
          onChange={(e) => onUpdateProject({ rawStory: e.target.value })}
          placeholder="Paste or write your story here... Supports short stories, film scripts, fantasy adventures, educational tales, or fictional lore with dialogues and descriptions."
          rows={9}
          className="w-full bg-slate-950/70 border border-white/10 rounded-xl p-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 font-sans text-sm leading-relaxed resize-y"
        />

        {project.rawStory.length > 0 && project.rawStory.length < 30 && (
          <div className="flex items-center gap-2 text-xs text-amber-400/90 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Please enter at least a few sentences so Gemini can extract recurring characters and plan 5+ cinematic scenes.</span>
          </div>
        )}
      </div>

      {/* Cinematic Direction Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visual Style Selection */}
        <div className="bg-[#0f121d] border border-white/10 rounded-2xl p-5 space-y-3">
          <label className="text-sm font-semibold text-white flex items-center gap-2">
            <Video className="w-4 h-4 text-rose-400" />
            Cinematic Visual Style
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {visualStyles.map((style) => {
              const active = project.settings.visualStyle === style.name;
              return (
                <button
                  key={style.name}
                  onClick={() =>
                    onUpdateProject({
                      settings: { ...project.settings, visualStyle: style.name },
                    })
                  }
                  className={`text-left p-3 rounded-xl border transition flex flex-col justify-between ${
                    active
                      ? 'bg-rose-950/25 border-rose-500/60 shadow-md shadow-rose-500/10 text-white'
                      : 'bg-slate-900/40 hover:bg-slate-900/80 border-white/5 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{style.icon}</span>
                    <span className="text-xs font-semibold">{style.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">{style.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Aspect Ratio & Format */}
        <div className="bg-[#0f121d] border border-white/10 rounded-2xl p-5 space-y-4">
          <label className="text-sm font-semibold text-white flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
            Aspect Ratio & Format
          </label>
          <div className="grid grid-cols-3 gap-3">
            {aspectRatios.map((ar) => {
              const active = project.settings.aspectRatio === ar.value;
              return (
                <button
                  key={ar.value}
                  onClick={() =>
                    onUpdateProject({
                      settings: { ...project.settings, aspectRatio: ar.value },
                    })
                  }
                  className={`text-center p-3 rounded-xl border transition flex flex-col items-center justify-center gap-1 ${
                    active
                      ? 'bg-indigo-950/30 border-indigo-500/60 shadow-md shadow-indigo-500/10 text-white'
                      : 'bg-slate-900/40 hover:bg-slate-900/80 border-white/5 text-slate-300'
                  }`}
                >
                  <div className={`border-2 border-current rounded ${
                    ar.value === '16:9' ? 'w-10 h-6' : ar.value === '9:16' ? 'w-6 h-10' : 'w-7 h-7'
                  }`} />
                  <span className="text-xs font-bold mt-1">{ar.label}</span>
                  <span className="text-[10px] text-slate-400">{ar.sub}</span>
                </button>
              );
            })}
          </div>

          {/* Duration & Pacing */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Target Video Duration</span>
              <span className="text-amber-400 font-mono-code">{project.settings.targetDuration}</span>
            </div>
            <select
              value={project.settings.targetDuration}
              onChange={(e) =>
                onUpdateProject({
                  settings: { ...project.settings, targetDuration: e.target.value },
                })
              }
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="30s - 45s (5 scenes)">30s - 45s (5 scenes - Standard Quick Story)</option>
              <option value="45s - 60s (6-7 scenes)">45s - 60s (6-7 scenes - Extended Cinematic Arc)</option>
              <option value="60s - 90s (8 scenes)">60s - 90s (8 scenes - Epic Narrative Experience)</option>
            </select>
          </div>

          {/* Language Selector */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                Audio & Subtitle Language
              </span>
            </div>
            <select
              value={project.settings.language}
              onChange={(e) =>
                onUpdateProject({
                  settings: { ...project.settings, language: e.target.value },
                })
              }
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish (Español)</option>
              <option value="French">French (Français)</option>
              <option value="Japanese">Japanese (日本語)</option>
              <option value="German">German (Deutsch)</option>
              <option value="Hindi">Hindi (हिन्दी)</option>
              <option value="Portuguese">Portuguese (Português)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audio, Music & Subtitles Settings */}
      <div className="bg-[#0f121d] border border-white/10 rounded-2xl p-5 space-y-4">
        <label className="text-sm font-semibold text-white flex items-center gap-2">
          <Music className="w-4 h-4 text-emerald-400" />
          Soundtrack & Subtitle Styling
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Background Music Theme */}
          <div className="space-y-1.5">
            <span className="text-xs text-slate-300 font-medium">Soundtrack Theme</span>
            <select
              value={project.settings.musicTheme}
              onChange={(e) =>
                onUpdateProject({
                  settings: { ...project.settings, musicTheme: e.target.value as MusicTheme },
                })
              }
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              {musicThemes.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.value}
                </option>
              ))}
            </select>
          </div>

          {/* Subtitle Style */}
          <div className="space-y-1.5">
            <span className="text-xs text-slate-300 font-medium">Subtitle Styling</span>
            <select
              value={project.settings.subtitleStyle}
              onChange={(e) =>
                onUpdateProject({
                  settings: { ...project.settings, subtitleStyle: e.target.value as any },
                })
              }
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="cinematic-gold">Cinematic Gold (Yellow Gold font with dark shadow)</option>
              <option value="clean-white">Bold Clean White (Netflix style with black stroke)</option>
              <option value="cyber-neon">Cyber Neon (Cyan neon glowing typography)</option>
            </select>
          </div>

          {/* Optional Character Reference Image Upload */}
          <div className="space-y-1.5">
            <span className="text-xs text-slate-300 font-medium flex items-center justify-between">
              <span>Optional Character Image</span>
              {charImgPreview && <span className="text-emerald-400 text-[10px]">Loaded</span>}
            </span>
            <label className="flex items-center justify-center gap-2 w-full p-2.5 bg-slate-950 border border-dashed border-white/15 rounded-xl cursor-pointer hover:border-amber-400/50 transition text-xs text-slate-400 hover:text-white">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>{charImgPreview ? 'Change Image...' : 'Upload Reference Image'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleCustomImageUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Prominent Action Button */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <button
          onClick={onStartAnalysis}
          disabled={!isReady || isLoading}
          className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all shadow-xl ${
            isReady && !isLoading
              ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:via-rose-400 hover:to-indigo-500 text-white shadow-rose-500/25 hover:shadow-rose-500/40 hover:scale-[1.02] cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Analyzing Story & Directing Scenes...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5 text-amber-300" />
              <span>Create My Video</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
