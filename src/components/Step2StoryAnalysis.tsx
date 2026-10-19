import React from 'react';
import { Sparkles, Users, Clapperboard, CheckCircle2, ArrowRight, ArrowLeft, RefreshCw, Layers } from 'lucide-react';
import { StoryProject } from '../types/cineStory';

interface Step2Props {
  project: StoryProject;
  onNext: () => void;
  onBack: () => void;
  onReanalyze: () => void;
  isLoading: boolean;
}

export const Step2StoryAnalysis: React.FC<Step2Props> = ({
  project,
  onNext,
  onBack,
  onReanalyze,
  isLoading,
}) => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Gemini 3.8 Story Analysis Complete
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white font-cinema">
            {project.settings.title || 'Screenplay Architecture'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Story synthesized into {project.characters.length} persistent characters and {project.scenes.length} structured cinematic scenes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onReanalyze}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Re-analyze</span>
          </button>
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white text-sm font-semibold shadow-lg shadow-rose-500/20 transition cursor-pointer"
          >
            <span>Proceed to Character Bible</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Narrative Arc Visualizer */}
      <div className="bg-[#0f121d] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          Cinematic Narrative Arc & Structure
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-white/5 p-4 rounded-xl space-y-2">
            <span className="text-[11px] font-mono-code uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              1. Beginning / Setup
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {project.plotArc?.beginning || 'Introduction of characters and establishing the visual world.'}
            </p>
          </div>

          <div className="bg-slate-900/60 border border-white/5 p-4 rounded-xl space-y-2">
            <span className="text-[11px] font-mono-code uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              2. Rising Tension
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {project.plotArc?.middle || 'Escalation of conflicts, investigation, or quest progression.'}
            </p>
          </div>

          <div className="bg-slate-900/60 border border-white/5 p-4 rounded-xl space-y-2">
            <span className="text-[11px] font-mono-code uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              3. Dramatic Climax
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {project.plotArc?.climax || 'The peak confrontation, revelation, or emotional turning point.'}
            </p>
          </div>

          <div className="bg-slate-900/60 border border-white/5 p-4 rounded-xl space-y-2">
            <span className="text-[11px] font-mono-code uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              4. Resolution
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {project.plotArc?.ending || 'Aftermath, resolution of character arcs, and cinematic finale.'}
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Extracted Characters & Scene Outline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Characters Overview */}
        <div className="bg-[#0f121d] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-rose-400" />
              Identified Characters ({project.characters.length})
            </h3>
            <span className="text-[11px] text-amber-400 font-mono-code">Step 3 next</span>
          </div>

          <div className="space-y-3">
            {project.characters.map((char) => (
              <div
                key={char.id}
                className="bg-slate-900/50 border border-white/5 rounded-xl p-3.5 space-y-2 hover:border-white/10 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">{char.name}</span>
                  <span className="text-[10px] uppercase font-mono-code px-2 py-0.5 rounded bg-white/5 text-amber-300">
                    {char.role}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {char.appearance || char.wardrobe}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>Voice: <strong className="text-slate-300">{char.voicePreset}</strong></span>
                  <span>•</span>
                  <span>Age: <strong className="text-slate-300">{char.age}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scene Outline */}
        <div className="lg:col-span-2 bg-[#0f121d] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clapperboard className="w-4 h-4 text-amber-400" />
              Cinematic Scene Plan ({project.scenes.length} Scenes)
            </h3>
            <span className="text-xs text-slate-400">
              Total Duration: ~{project.scenes.reduce((acc, s) => acc + (s.duration || 5), 0)}s
            </span>
          </div>

          <div className="space-y-2.5">
            {project.scenes.map((scene) => (
              <div
                key={scene.id}
                className="bg-slate-900/50 border border-white/5 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/10 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono-code font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10">
                      SCENE {scene.sceneNumber}
                    </span>
                    <h4 className="text-sm font-semibold text-white">{scene.title}</h4>
                    <span className="text-[11px] text-slate-400 font-mono-code">{scene.duration}s</span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-1">{scene.action}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span>Camera: <span className="text-slate-300">{scene.camera?.shotType}</span></span>
                    <span>•</span>
                    <span>Location: <span className="text-slate-300">{scene.location?.name}</span></span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1 shrink-0">
                  <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {scene.camera?.movement || 'Cinematic Push'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Nav */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Story Input</span>
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-semibold shadow-lg shadow-rose-500/20 transition cursor-pointer"
        >
          <span>Review Character Bible</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
