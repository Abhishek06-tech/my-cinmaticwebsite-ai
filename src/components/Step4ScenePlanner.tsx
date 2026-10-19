import React, { useState } from 'react';
import { LayoutGrid, Clapperboard, Clock, Video, Users, MessageSquare, ShieldAlert, ArrowRight, ArrowLeft, MoveUp, MoveDown, Trash2, Plus, Edit3, CheckCircle2, AlertTriangle, Sparkles, X } from 'lucide-react';
import { SceneItem, StoryProject } from '../types/cineStory';
import { auditContinuity } from '../services/api';

interface Step4Props {
  project: StoryProject;
  onUpdateScene: (sceneId: string, updated: Partial<SceneItem>) => void;
  onReorderScenes: (startIndex: number, endIndex: number) => void;
  onAddScene: () => void;
  onDeleteScene: (sceneId: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const Step4ScenePlanner: React.FC<Step4Props> = ({
  project,
  onUpdateScene,
  onReorderScenes,
  onAddScene,
  onDeleteScene,
  onNext,
  onBack,
}) => {
  const [selectedSceneForPrompt, setSelectedSceneForPrompt] = useState<SceneItem | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(project.continuityReport || null);

  const handleRunAudit = async () => {
    setIsAuditing(true);
    try {
      const result = await auditContinuity(project.scenes, project.characters);
      setAuditResult(result);
    } catch (err: any) {
      alert(`Audit failed: ${err.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < project.scenes.length) {
      onReorderScenes(index, targetIndex);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <LayoutGrid className="w-3.5 h-3.5" />
            Automatic Scene Storyboard
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white font-cinema">
            Director's Scene Storyboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Story segmented into {project.scenes.length} camera setups. Inspect cinematographic prompts, dialogue lines, and run continuity audits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunAudit}
            disabled={isAuditing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-500/40 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-xs font-semibold transition cursor-pointer"
          >
            <ShieldAlert className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
            <span>{isAuditing ? 'Auditing Continuity...' : 'Continuity Audit'}</span>
          </button>
          <button
            onClick={onAddScene}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Scene</span>
          </button>
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white text-sm font-semibold shadow-lg shadow-rose-500/20 transition cursor-pointer"
          >
            <span>Proceed to Visual Gen</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Continuity Inspection Banner if available */}
      {auditResult && (
        <div className="bg-[#101426] border border-indigo-500/30 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300 font-mono-code">
                {auditResult.score}%
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">
                  Continuity Quality Score: {auditResult.score >= 85 ? 'Excellent Continuity' : 'Minor Discrepancies Detected'}
                </h3>
                <p className="text-xs text-slate-400">{auditResult.summary}</p>
              </div>
            </div>
            <button
              onClick={() => setAuditResult(null)}
              className="text-slate-500 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {auditResult.issues?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-white/5">
              {auditResult.issues.map((issue: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-slate-900/60 border border-white/5 p-2.5 rounded-lg text-xs space-y-1"
                >
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-semibold">Scene {issue.sceneNumber}: {issue.characterName || 'Continuity Note'}</span>
                  </div>
                  <p className="text-slate-300">{issue.message}</p>
                  <p className="text-slate-400 italic">Suggestion: {issue.suggestion}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Storyboard Scene Cards */}
      <div className="space-y-4">
        {project.scenes.map((scene, index) => {
          // Resolve present characters
          const presentChars = project.characters.filter((c) =>
            scene.charactersPresent?.includes(c.id)
          );

          return (
            <div
              key={scene.id}
              className="bg-[#0f121d] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition shadow-lg space-y-4"
            >
              {/* Scene Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono-code font-bold text-xs px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    SCENE #{scene.sceneNumber}
                  </span>
                  <h3 className="font-bold text-white text-base font-cinema">{scene.title}</h3>
                  <div className="flex items-center gap-1 text-slate-400 text-xs font-mono-code">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{scene.duration}s</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    onClick={() => handleMove(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition"
                    title="Move Scene Earlier"
                  >
                    <MoveUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMove(index, 'down')}
                    disabled={index === project.scenes.length - 1}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition"
                    title="Move Scene Later"
                  >
                    <MoveDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSelectedSceneForPrompt(scene)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/20 transition"
                    title="Inspect & Edit Prompt Template"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Prompt Template</span>
                  </button>
                  {project.scenes.length > 1 && (
                    <button
                      onClick={() => onDeleteScene(scene.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Delete Scene"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Card Body: Camera, Action & Characters */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Visual Thumbnail or Placeholder */}
                <div className="md:col-span-3">
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-white/10 relative flex items-center justify-center">
                    {scene.keyframeImageUrl ? (
                      <img
                        src={scene.keyframeImageUrl}
                        alt={scene.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-3">
                        <Clapperboard className="w-8 h-8 text-slate-700 mb-1" />
                        <span className="text-[10px] text-slate-400">Keyframe Ready for Gen</span>
                      </div>
                    )}
                    <span className="absolute bottom-1.5 right-1.5 text-[9px] font-mono-code px-1.5 py-0.5 rounded bg-black/75 text-amber-300">
                      {scene.transition}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="md:col-span-9 space-y-3">
                  {/* Action */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Story Action & Event
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed">{scene.action}</p>
                  </div>

                  {/* Badges: Camera & Environment */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5">
                      📷 {scene.camera?.shotType} • {scene.camera?.angle}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5">
                      🎬 {scene.camera?.movement} • {scene.camera?.lens}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5">
                      📍 {scene.location?.name} ({scene.location?.timeOfDay})
                    </span>
                  </div>

                  {/* Characters present */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-rose-400" />
                      In Scene:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {presentChars.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 border border-white/10 text-xs text-slate-200"
                        >
                          {c.referenceImageUrl && (
                            <img
                              src={c.referenceImageUrl}
                              alt={c.name}
                              className="w-3.5 h-3.5 rounded-full object-cover"
                            />
                          )}
                          <span>{c.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dialogue snippet */}
                  {scene.dialogue && scene.dialogue.length > 0 && (
                    <div className="bg-slate-950/60 border border-white/5 rounded-lg p-2.5 space-y-1">
                      {scene.dialogue.map((d, dIdx) => (
                        <div key={dIdx} className="text-xs flex items-start gap-1.5">
                          <MessageSquare className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                          <span className="font-semibold text-amber-300 shrink-0">{d.speakerName}:</span>
                          <span className="text-slate-300 italic">"{d.text}"</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Structured Prompt Inspector Modal */}
      {selectedSceneForPrompt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f121d] border border-white/15 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-mono-code text-amber-400">
                  SCENE #{selectedSceneForPrompt.sceneNumber} SPECIFICATION
                </span>
                <h3 className="text-xl font-bold text-white font-cinema">
                  {selectedSceneForPrompt.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSceneForPrompt(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1 uppercase tracking-wider text-[10px]">
                  SCENE PURPOSE:
                </label>
                <textarea
                  rows={2}
                  value={selectedSceneForPrompt.promptTemplate?.purpose || ''}
                  onChange={(e) =>
                    onUpdateScene(selectedSceneForPrompt.id, {
                      promptTemplate: {
                        ...selectedSceneForPrompt.promptTemplate,
                        purpose: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1 uppercase tracking-wider text-[10px]">
                  CHARACTERS & ESTABLISHED WARDROBE:
                </label>
                <textarea
                  rows={2}
                  value={selectedSceneForPrompt.promptTemplate?.characters || ''}
                  onChange={(e) =>
                    onUpdateScene(selectedSceneForPrompt.id, {
                      promptTemplate: {
                        ...selectedSceneForPrompt.promptTemplate,
                        characters: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1 uppercase tracking-wider text-[10px]">
                  ENVIRONMENT & LIGHTING:
                </label>
                <textarea
                  rows={2}
                  value={selectedSceneForPrompt.promptTemplate?.environment || ''}
                  onChange={(e) =>
                    onUpdateScene(selectedSceneForPrompt.id, {
                      promptTemplate: {
                        ...selectedSceneForPrompt.promptTemplate,
                        environment: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1 uppercase tracking-wider text-[10px]">
                  ACTION & CHRONOLOGY:
                </label>
                <textarea
                  rows={2}
                  value={selectedSceneForPrompt.promptTemplate?.action || ''}
                  onChange={(e) =>
                    onUpdateScene(selectedSceneForPrompt.id, {
                      promptTemplate: {
                        ...selectedSceneForPrompt.promptTemplate,
                        action: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1 uppercase tracking-wider text-[10px]">
                  CAMERA SETUP & LENS:
                </label>
                <input
                  type="text"
                  value={selectedSceneForPrompt.promptTemplate?.camera || ''}
                  onChange={(e) =>
                    onUpdateScene(selectedSceneForPrompt.id, {
                      promptTemplate: {
                        ...selectedSceneForPrompt.promptTemplate,
                        camera: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1 uppercase tracking-wider text-[10px]">
                  AVOID (NEGATIVE CONSTRAINTS):
                </label>
                <textarea
                  rows={2}
                  value={selectedSceneForPrompt.promptTemplate?.avoid || ''}
                  onChange={(e) =>
                    onUpdateScene(selectedSceneForPrompt.id, {
                      promptTemplate: {
                        ...selectedSceneForPrompt.promptTemplate,
                        avoid: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-rose-300/80"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10">
              <button
                onClick={() => setSelectedSceneForPrompt(null)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Nav */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Character Bible</span>
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-semibold shadow-lg shadow-rose-500/20 transition cursor-pointer"
        >
          <span>Continue to Visual Generation</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
