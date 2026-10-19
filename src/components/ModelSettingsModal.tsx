import React, { useState, useEffect } from 'react';
import { X, Cpu, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, Shield, Sparkles } from 'lucide-react';
import { ModelServicesConfig, ServiceModelInfo } from '../types/cineStory';
import { getModelConfig, testModelService } from '../services/api';

interface ModelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ModelServicesConfig;
  onUpdateConfig: (updated: Partial<ModelServicesConfig>) => void;
}

export const ModelSettingsModal: React.FC<ModelSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
}) => {
  const [servicesInfo, setServicesInfo] = useState<any>(null);
  const [testingService, setTestingService] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isOpen) {
      getModelConfig()
        .then((data) => setServicesInfo(data.services))
        .catch(() => {});
    }
  }, [isOpen]);

  const handleTest = async (serviceName: string, modelId: string) => {
    setTestingService(serviceName);
    try {
      const res = await testModelService(serviceName, modelId);
      setTestResults((prev) => ({ ...prev, [serviceName]: res }));
    } catch (err: any) {
      setTestResults((prev) => ({ ...prev, [serviceName]: { success: false, message: err.message } }));
    } finally {
      setTestingService(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0f121d] border border-white/15 rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-xl font-bold text-white font-cinema">AI Services & Model Architecture</h3>
              <p className="text-xs text-slate-400">Independent service configuration & quota transparency</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quota & Billing Information Box */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Google AI Studio Quota & Billing Notice</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Google Generative Language API provides <strong>free tier access for text analysis and speech</strong> (<code className="text-amber-300">gemini-3.8-flash</code> and <code className="text-amber-300">gemini-3.8-flash-lite-tts</code>).
            However, image generation (<code className="text-amber-300">gemini-3.1-flash-lite-image</code>) and video generation (<code className="text-amber-300">veo-3.1</code>) have a quota limit of 0 on the free tier and require a Pay-as-you-go billing account.
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">Never automatically switches to paid models without your explicit selection.</span>
            <a
              href="https://aistudio.google.com/app/plan_information"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold"
            >
              <span>AI Studio Billing Plans</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* 4 Independent Configurable Services */}
        <div className="space-y-4">
          {/* 1. Story Analysis */}
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs uppercase font-mono-code text-indigo-400 font-bold block">Service 1</span>
                <h4 className="font-bold text-white text-sm">Story Analysis & Scene Planning</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Free Tier Quota Active
                </span>
                <button
                  onClick={() => handleTest('storyAnalysis', config.storyAnalysisModel)}
                  disabled={testingService === 'storyAnalysis'}
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono-code"
                >
                  {testingService === 'storyAnalysis' ? 'Probing...' : 'Test Model'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Configured Model ID</label>
                <select
                  value={config.storyAnalysisModel}
                  onChange={(e) => onUpdateConfig({ storyAnalysisModel: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white"
                >
                  <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended, Fast & Free Tier)</option>
                  <option value="gemini-4-argon">gemini-4-argon (Complex STEM & Reasoning)</option>
                </select>
              </div>
              <div className="flex items-center text-slate-400 text-xs">
                Extracts characters, scene timeline, camera setups, and dialogue from story text.
              </div>
            </div>
            {testResults['storyAnalysis'] && (
              <div className={`p-2 rounded text-[11px] ${testResults['storyAnalysis'].success ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
                {testResults['storyAnalysis'].message}
              </div>
            )}
          </div>

          {/* 2. Image Generation */}
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs uppercase font-mono-code text-rose-400 font-bold block">Service 2</span>
                <h4 className="font-bold text-white text-sm">Character References & Scene Keyframes</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Paid Key Required
                </span>
                <button
                  onClick={() => handleTest('imageGeneration', config.imageGenerationModel)}
                  disabled={testingService === 'imageGeneration'}
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono-code"
                >
                  {testingService === 'imageGeneration' ? 'Probing...' : 'Test Model'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Configured Model ID</label>
                <select
                  value={config.imageGenerationModel}
                  onChange={(e) => onUpdateConfig({ imageGenerationModel: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white"
                >
                  <option value="gemini-3.1-flash-lite-image">gemini-3.1-flash-lite-image (Default Official Image Model)</option>
                  <option value="gemini-nano-banana-2.1">gemini-nano-banana-2.1 (High-Quality 2K/4K Resolution)</option>
                  <option value="gemini-3-pro-image">gemini-3-pro-image (Pro Quality)</option>
                </select>
              </div>
              <div className="flex items-center text-slate-400 text-xs">
                Generates 1:1 character reference portraits and scene visuals. If quota is 0, CineStory AI automatically generates high-fidelity Concept Art Cards as a fallback.
              </div>
            </div>
            {testResults['imageGeneration'] && (
              <div className={`p-2 rounded text-[11px] ${testResults['imageGeneration'].success ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
                {testResults['imageGeneration'].message}
              </div>
            )}
          </div>

          {/* 3. Video Generation */}
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs uppercase font-mono-code text-amber-400 font-bold block">Service 3</span>
                <h4 className="font-bold text-white text-sm">Veo AI Video Generation</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Paid Key Required
                </span>
                <button
                  onClick={() => handleTest('videoGeneration', config.videoGenerationModel)}
                  disabled={testingService === 'videoGeneration'}
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono-code"
                >
                  {testingService === 'videoGeneration' ? 'Probing...' : 'Test Model'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Configured Model ID</label>
                <select
                  value={config.videoGenerationModel}
                  onChange={(e) => onUpdateConfig({ videoGenerationModel: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white"
                >
                  <option value="veo-3.1-lite-generate-preview">veo-3.1-lite-generate-preview (Standard Veo Video)</option>
                  <option value="veo-3.1-generate-preview">veo-3.1-generate-preview (Veo 3.1 High-Quality Preview)</option>
                </select>
              </div>
              <div className="flex items-center text-slate-400 text-xs">
                Creates video clips with camera movement from prompts and keyframes. Alternatively, the built-in FFmpeg & 2.5D Ken Burns animator produces smooth motion clips instantly.
              </div>
            </div>
          </div>

          {/* 4. Speech Synthesis */}
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs uppercase font-mono-code text-emerald-400 font-bold block">Service 4</span>
                <h4 className="font-bold text-white text-sm">Speech & Voice Synthesis (TTS)</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Free Tier Quota Active
                </span>
                <button
                  onClick={() => handleTest('speechSynthesis', config.speechSynthesisModel)}
                  disabled={testingService === 'speechSynthesis'}
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono-code"
                >
                  {testingService === 'speechSynthesis' ? 'Probing...' : 'Test Model'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Configured Model ID</label>
                <select
                  value={config.speechSynthesisModel}
                  onChange={(e) => onUpdateConfig({ speechSynthesisModel: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white"
                >
                  <option value="gemini-3.8-flash-lite-tts">gemini-3.8-flash-lite-tts (Fast & Free Tier)</option>
                  <option value="gemini-3.8-flash-tts">gemini-3.8-flash-tts (Dual-speaker Screenplay TTS)</option>
                </select>
              </div>
              <div className="flex items-center text-slate-400 text-xs">
                Transforms dialogue and narration text into 24kHz WAV vocal performances.
              </div>
            </div>
            {testResults['speechSynthesis'] && (
              <div className={`p-2 rounded text-[11px] ${testResults['speechSynthesis'].success ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
                {testResults['speechSynthesis'].message}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
