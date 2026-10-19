import React, { useState } from 'react';
import { Download, Film, CheckCircle2, AlertCircle, RefreshCw, Play, Sparkles, FileVideo, HardDrive, ArrowLeft, Share2 } from 'lucide-react';
import { StoryProject } from '../types/cineStory';
import { exportFinalVideo } from '../services/api';

interface Step8Props {
  project: StoryProject;
  onUpdateExportResult: (result: StoryProject['exportResult']) => void;
  onBack: () => void;
}

export const Step8FinalExport: React.FC<Step8Props> = ({
  project,
  onUpdateExportResult,
  onBack,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [progressStage, setProgressStage] = useState<string>('');

  const exportResult = project.exportResult;
  const totalDuration = project.scenes.reduce((acc, s) => acc + (s.duration || 5), 0);

  const handleStartExport = async () => {
    setIsExporting(true);
    setExportError(null);
    setProgressStage('Initializing FFmpeg compilation pipeline...');

    try {
      setTimeout(() => setProgressStage('Rendering scene motion frames and transitions...'), 1500);
      setTimeout(() => setProgressStage('Multiplexing synthesized speech and soundtrack...'), 3500);
      setTimeout(() => setProgressStage('Encoding H.264 MP4 high-definition video...'), 5500);

      const res = await exportFinalVideo(
        project.scenes,
        project.settings,
        project.settings.title || 'cinestory'
      );

      onUpdateExportResult({
        videoUrl: res.videoUrl,
        filename: res.filename,
        duration: res.duration,
        fileSizeMb: res.fileSizeMb,
        resolution: res.resolution,
        aspectRatio: project.settings.aspectRatio,
      });
      setProgressStage('Export completed successfully!');
    } catch (err: any) {
      console.error('Export failed:', err);
      setExportError(err.message || 'Failed to export video via FFmpeg engine.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider">
          <Film className="w-3.5 h-3.5" />
          Production Master Export
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white font-cinema">
          Export Your Master Film
        </h1>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          Stitch all {project.scenes.length} cinematic scenes, synchronized character dialogue, and atmospheric score into an MP4 video file.
        </p>
      </div>

      {/* Main Export Card */}
      <div className="bg-[#0f121d] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Specifications Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 p-4 rounded-xl bg-slate-950/70 border border-white/5 text-xs">
          <div>
            <span className="text-slate-500 block uppercase font-mono-code text-[10px]">Project Title</span>
            <span className="font-semibold text-white truncate block">{project.settings.title || 'CineStory'}</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase font-mono-code text-[10px]">Scenes & Duration</span>
            <span className="font-semibold text-white">{project.scenes.length} Scenes • ~{totalDuration}s</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase font-mono-code text-[10px]">Aspect Ratio</span>
            <span className="font-semibold text-white font-mono-code">{project.settings.aspectRatio}</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase font-mono-code text-[10px]">Dynamic Theme</span>
            <span className="font-semibold text-amber-300 truncate block">{project.settings.musicTheme}</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase font-mono-code text-[10px]">Narrative Audio Loop</span>
            <span className="font-semibold text-emerald-400 font-mono-code flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Seamless Loop
            </span>
          </div>
        </div>

        {/* Video Player if already exported */}
        {exportResult ? (
          <div className="space-y-4">
            <div className="w-full bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
              <video
                src={exportResult.videoUrl}
                controls
                autoPlay
                className="w-full max-h-[500px] object-contain"
              />
            </div>

            {/* Video File Specs */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="font-bold text-white text-sm">Film Ready for Download</h4>
                  <p className="text-slate-400">
                    Resolution: <span className="text-slate-200">{exportResult.resolution}</span> • Size: <span className="text-slate-200">{exportResult.fileSizeMb} MB</span>
                  </p>
                </div>
              </div>

              {/* Clear Download MP4 Button */}
              <div className="flex items-center gap-3">
                <a
                  href={exportResult.videoUrl}
                  download={exportResult.filename}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download MP4 Video</span>
                </a>
                <button
                  onClick={handleStartExport}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition"
                  title="Re-render Video"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-export</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Pre-export Call to Action */
          <div className="flex flex-col items-center justify-center p-8 border border-dashed border-white/15 rounded-xl bg-slate-950/40 text-center space-y-4">
            <FileVideo className="w-16 h-16 text-amber-400/80" />
            <div className="space-y-1">
              <h3 className="font-bold text-white text-base font-cinema">
                Ready to Assemble Your Motion Picture
              </h3>
              <p className="text-xs text-slate-400 max-w-md">
                FFmpeg will stitch your scenes in chronological story order, animate camera movement, synchronize speech audio, and generate a downloadable MP4 video.
              </p>
            </div>

            <button
              onClick={handleStartExport}
              disabled={isExporting}
              className={`px-8 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2.5 transition shadow-xl cursor-pointer ${
                isExporting
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:via-rose-400 hover:to-indigo-500 text-white shadow-rose-500/25'
              }`}
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Rendering & Compiling Video...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Render & Export MP4 Video</span>
                </>
              )}
            </button>

            {isExporting && (
              <div className="text-xs text-amber-400 font-mono-code animate-pulse">
                {progressStage}
              </div>
            )}
          </div>
        )}

        {/* Error Notification */}
        {exportError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">Video Export Issue</span>
              <p>{exportError}</p>
              <button
                onClick={handleStartExport}
                className="mt-2 px-3 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-white font-semibold transition"
              >
                Retry Export Pipeline
              </button>
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
          <span>Back to Video Editor</span>
        </button>
      </div>
    </div>
  );
};
