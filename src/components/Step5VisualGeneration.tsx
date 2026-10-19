import React, { useState } from 'react';
import { Image, Video, Sparkles, RefreshCw, AlertCircle, ArrowRight, ArrowLeft, Film, ShieldCheck, AlertTriangle, ExternalLink, SlidersHorizontal, Image as ImageIcon } from 'lucide-react';
import { SceneItem, StoryProject } from '../types/cineStory';
import { generateSceneImage, generateVeoVideo, pollVideoStatus, downloadVeoVideo, QuotaExhaustedError } from '../services/api';

interface Step5Props {
  project: StoryProject;
  onUpdateScene: (sceneId: string, updated: Partial<SceneItem>) => void;
  onOpenModelSettings: () => void;
  onNext: () => void;
  onBack: () => void;
  imageModelId: string;
  videoModelId: string;
}

export const Step5VisualGeneration: React.FC<Step5Props> = ({
  project,
  onUpdateScene,
  onOpenModelSettings,
  onNext,
  onBack,
  imageModelId,
  videoModelId,
}) => {
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generationType, setGenerationType] = useState<'keyframes' | 'veo'>('keyframes');
  const [quotaWarning, setQuotaWarning] = useState<{
    message: string;
    actionRequired?: string;
    actionUrl?: string;
  } | null>(null);

  // Single scene keyframe generator
  const handleGenerateKeyframe = async (scene: SceneItem, prevFrameBase64?: string, useFallbackConcept: boolean = false) => {
    onUpdateScene(scene.id, { generationStatus: 'generating-image', errorMessage: undefined });
    setQuotaWarning(null);

    try {
      const sceneChars = project.characters.filter((c) => scene.charactersPresent?.includes(c.id));
      const firstRefImg = sceneChars.find((c) => c.referenceImageUrl)?.referenceImageUrl || prevFrameBase64;

      const res = await generateSceneImage(
        scene,
        project.settings.visualStyle,
        sceneChars,
        project.settings.aspectRatio,
        firstRefImg,
        imageModelId,
        useFallbackConcept
      );

      onUpdateScene(scene.id, {
        keyframeImageUrl: res.imageUrl,
        generationStatus: 'ready',
      });
    } catch (err: any) {
      const qErr = err as QuotaExhaustedError;
      if (qErr.isZeroQuota || err.message?.includes('limit: 0') || err.message?.includes('quota')) {
        setQuotaWarning({
          message: `The model ${imageModelId} has quota limit 0 on the free tier. Google AI Studio requires a Pay-as-you-go billing account for image and video models.`,
          actionRequired: qErr.quotaAction || 'Upgrade your plan or attach a billed API key in Google AI Studio.',
          actionUrl: qErr.actionUrl || 'https://aistudio.google.com/app/plan_information',
        });

        // Use the generated concept card fallback if provided
        if (qErr.fallbackConceptCardUrl) {
          onUpdateScene(scene.id, {
            keyframeImageUrl: qErr.fallbackConceptCardUrl,
            generationStatus: 'ready',
          });
          return;
        }

        onUpdateScene(scene.id, {
          generationStatus: 'quota_exhausted',
          errorMessage: 'Quota limit 0 on free tier. Requires Pay-as-you-go billing.',
        });
      } else {
        onUpdateScene(scene.id, {
          generationStatus: 'error',
          errorMessage: err.message || 'Keyframe generation failed',
        });
      }
    }
  };

  // Veo Video generator with operation polling
  const handleGenerateVeoClip = async (scene: SceneItem) => {
    onUpdateScene(scene.id, { generationStatus: 'generating-video', errorMessage: undefined });
    setQuotaWarning(null);

    try {
      const res = await generateVeoVideo(
        scene.fullPrompt || scene.action,
        scene.keyframeImageUrl,
        project.settings.aspectRatio,
        '720p',
        videoModelId
      );

      const opName = res.operationName;
      onUpdateScene(scene.id, {
        operationName: opName,
        generationStatus: 'polling-video',
      });

      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await pollVideoStatus(opName);
          if (pollRes.done) {
            clearInterval(pollInterval);
            if (pollRes.error) {
              onUpdateScene(scene.id, {
                generationStatus: 'error',
                errorMessage: pollRes.error.message || 'Veo generation error',
              });
            } else {
              const dlRes = await downloadVeoVideo(opName);
              onUpdateScene(scene.id, {
                videoUrl: dlRes.videoUrl,
                generationStatus: 'ready',
              });
            }
          }
        } catch (pollErr: any) {
          clearInterval(pollInterval);
          onUpdateScene(scene.id, {
            generationStatus: 'error',
            errorMessage: pollErr.message || 'Polling failed',
          });
        }
      }, 8000);
    } catch (err: any) {
      const qErr = err as QuotaExhaustedError;
      if (qErr.isZeroQuota || err.message?.includes('limit: 0') || err.message?.includes('quota')) {
        setQuotaWarning({
          message: `Veo video generation requires a Pay-as-you-go billing account on Google AI Studio.`,
          actionRequired: 'Attach a billed API key or use the built-in 2.5D Ken Burns animator which produces cinematic motion clips without quota limits.',
          actionUrl: 'https://aistudio.google.com/app/plan_information',
        });
        onUpdateScene(scene.id, {
          generationStatus: 'quota_exhausted',
          errorMessage: 'Veo video requires billing. Use Ken Burns animation in Video Editor.',
        });
      } else {
        onUpdateScene(scene.id, {
          generationStatus: 'error',
          errorMessage: err.message || 'Veo video job initiation failed',
        });
      }
    }
  };

  // Requirement 7: Allow retrying only failed generation tasks after access is restored
  const failedScenes = project.scenes.filter((s) => !s.keyframeImageUrl && !s.videoUrl);

  const handleRetryFailedOnly = async () => {
    setIsGeneratingAll(true);
    for (const scene of failedScenes) {
      await handleGenerateKeyframe(scene, undefined, false);
    }
    setIsGeneratingAll(false);
  };

  const handleGenerateAllConceptVisuals = async () => {
    setIsGeneratingAll(true);
    for (const scene of project.scenes) {
      if (!scene.keyframeImageUrl) {
        await handleGenerateKeyframe(scene, undefined, true);
      }
    }
    setIsGeneratingAll(false);
  };

  const completedCount = project.scenes.filter((s) => s.keyframeImageUrl || s.videoUrl).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Film className="w-3.5 h-3.5" />
            Visual Generation Bay
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white font-cinema">
            Scene Visuals & Video Clips
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Render high-fidelity cinematic keyframes and Veo AI video clips conditioned on approved character references.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenModelSettings}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Model & Quota Settings</span>
          </button>

          {failedScenes.length > 0 && (
            <button
              onClick={handleRetryFailedOnly}
              disabled={isGeneratingAll}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-xs font-semibold text-amber-300 transition"
              title="Retry only failed scene keyframes"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingAll ? 'animate-spin' : ''}`} />
              <span>Retry Failed ({failedScenes.length})</span>
            </button>
          )}

          <button
            onClick={handleGenerateAllConceptVisuals}
            disabled={isGeneratingAll}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-300 transition"
            title="Generate high-fidelity concept visuals for all ungenerated scenes"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Concept Visuals</span>
          </button>

          <button
            onClick={onNext}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white text-sm font-semibold shadow-lg shadow-rose-500/20 transition cursor-pointer"
          >
            <span>Audio & Dialogue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quota Exhausted / Billing Alert Banner */}
      {quotaWarning && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-white text-sm">Image/Video Quota Limit (Free Tier = 0)</h4>
              <p className="text-slate-300">{quotaWarning.message}</p>
              <p className="text-slate-400">{quotaWarning.actionRequired}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleGenerateAllConceptVisuals}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-bold border border-emerald-500/30 transition"
            >
              Generate Concept Visuals
            </button>
            <a
              href={quotaWarning.actionUrl || 'https://aistudio.google.com/app/plan_information'}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
            >
              <span>AI Studio Billing</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Progress & Generation Options Bar */}
      <div className="bg-[#0f121d] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center font-bold text-amber-400 font-mono-code text-base">
            {completedCount}/{project.scenes.length}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">Visual Assets Ready</span>
              {completedCount === project.scenes.length && (
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono-code">100% Ready</span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Model: <span className="text-slate-300 font-mono-code">{imageModelId}</span> • Aspect Ratio: <span className="text-slate-300 font-mono-code">{project.settings.aspectRatio}</span>
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-white/10 text-xs">
          <button
            onClick={() => setGenerationType('keyframes')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              generationType === 'keyframes'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cinematic Keyframe Visuals
          </button>
          <button
            onClick={() => setGenerationType('veo')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
              generationType === 'veo'
                ? 'bg-rose-500 text-white font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Veo 3.1 AI Video</span>
          </button>
        </div>
      </div>

      {/* Scene Visuals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {project.scenes.map((scene) => {
          const isGenImg = scene.generationStatus === 'generating-image';
          const isGenVideo = scene.generationStatus === 'generating-video' || scene.generationStatus === 'polling-video';

          const presentChars = project.characters.filter((c) =>
            scene.charactersPresent?.includes(c.id)
          );

          return (
            <div
              key={scene.id}
              className="bg-[#0f121d] border border-white/10 rounded-2xl overflow-hidden shadow-xl hover:border-white/20 transition flex flex-col"
            >
              {/* Visual Display Container */}
              <div
                className={`w-full bg-slate-950 relative overflow-hidden flex items-center justify-center ${
                  project.settings.aspectRatio === '9:16'
                    ? 'aspect-[9/16] max-h-[480px]'
                    : project.settings.aspectRatio === '1:1'
                    ? 'aspect-square'
                    : 'aspect-video'
                }`}
              >
                {scene.videoUrl ? (
                  <video
                    src={scene.videoUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : scene.keyframeImageUrl ? (
                  <img
                    src={scene.keyframeImageUrl}
                    alt={scene.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6 space-y-2">
                    <Film className="w-10 h-10 text-slate-700" />
                    <p className="text-xs text-slate-500 max-w-xs">
                      No visual generated yet. Click generate or create concept card below.
                    </p>
                  </div>
                )}

                {/* Loading Overlays */}
                {(isGenImg || isGenVideo) && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4 text-center">
                    <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-semibold text-white">
                      {isGenVideo ? 'Veo 3.1 Generating Video Clip...' : 'Rendering Cinematic Keyframe...'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {isGenVideo ? 'Polling long-running video operation' : 'Conditioning with approved character references'}
                    </span>
                  </div>
                )}

                {/* Scene badge overlay */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="font-mono-code text-[11px] font-bold px-2.5 py-1 rounded-lg bg-black/80 text-amber-300 backdrop-blur-md border border-white/10">
                    SCENE #{scene.sceneNumber}
                  </span>
                  <span className="text-[10px] font-mono-code px-2 py-1 rounded-lg bg-black/80 text-slate-300 backdrop-blur-md">
                    {scene.duration}s
                  </span>
                </div>

                {/* Character reference conditioned pill */}
                {presentChars.length > 0 && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] text-slate-300">
                      Consistent: {presentChars.map((c) => c.name).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Scene Card Meta & Actions */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-white text-base font-cinema">{scene.title}</h4>
                  <p className="text-xs text-slate-300 line-clamp-2">{scene.action}</p>
                </div>

                {/* Error Banner if any */}
                {scene.errorMessage && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{scene.errorMessage}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleGenerateKeyframe(scene, undefined, false)}
                    disabled={isGenImg || isGenVideo}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold transition"
                    title={`Generate with ${imageModelId}`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGenImg ? 'animate-spin' : ''}`} />
                    <span>AI Keyframe</span>
                  </button>

                  <button
                    onClick={() => handleGenerateKeyframe(scene, undefined, true)}
                    disabled={isGenImg || isGenVideo}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition"
                    title="Generate instant concept visual card (bypasses quota limits)"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Concept Visual</span>
                  </button>

                  <button
                    onClick={() => handleGenerateVeoClip(scene)}
                    disabled={isGenImg || isGenVideo}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-semibold transition"
                    title="Generate with Veo AI Video model (requires paid key)"
                  >
                    <Video className={`w-3.5 h-3.5 ${isGenVideo ? 'animate-spin' : ''}`} />
                    <span>Veo Video</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Nav */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Storyboard</span>
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-semibold shadow-lg shadow-rose-500/20 transition cursor-pointer"
        >
          <span>Continue to Audio & Dialogue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
