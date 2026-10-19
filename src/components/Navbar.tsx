import React from 'react';
import { Film, Clapperboard, Users, LayoutGrid, Image, Volume2, Sliders, Download, Save, FolderOpen, Sparkles, CheckCircle2 } from 'lucide-react';
import { StoryProject } from '../types/cineStory';

interface NavbarProps {
  project: StoryProject;
  activeStep: number;
  onSelectStep: (step: number) => void;
  onOpenProjectManager: () => void;
  onOpenModelSettings: () => void;
  onNewProject: () => void;
  systemHealth: { hasGeminiKey: boolean; hasFfmpeg: boolean } | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  project,
  activeStep,
  onSelectStep,
  onOpenProjectManager,
  onOpenModelSettings,
  onNewProject,
  systemHealth,
}) => {
  const steps = [
    { num: 1, label: 'Story', icon: Film },
    { num: 2, label: 'Analysis', icon: Sparkles },
    { num: 3, label: 'Characters', icon: Users },
    { num: 4, label: 'Storyboard', icon: LayoutGrid },
    { num: 5, label: 'Visuals', icon: Image },
    { num: 6, label: 'Audio', icon: Volume2 },
    { num: 7, label: 'Editor', icon: Sliders },
    { num: 8, label: 'Export', icon: Download },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0c0e17]/95 backdrop-blur-md border-b border-white/10 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Project Title */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onSelectStep(1)}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Clapperboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-cinema font-bold text-lg tracking-wider text-white">
                  CINESTORY<span className="text-amber-400 font-sans text-xs ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/30">AI</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                {project.settings.title || 'Untitled Cinematic Story'}
              </p>
            </div>
          </div>

          {/* Quick Action buttons for Project Save & Load */}
          <div className="flex items-center gap-1.5 md:ml-4">
            <button
              onClick={onOpenProjectManager}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition"
              title="Save or Load Project"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Projects</span>
            </button>
            <button
              onClick={onNewProject}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition"
              title="Create New Project"
            >
              <span className="hidden sm:inline">+ New</span>
            </button>
          </div>
        </div>

        {/* Workflow Steps Tracker */}
        <nav className="flex items-center gap-1 overflow-x-auto max-w-full py-1 px-2 rounded-xl bg-slate-900/60 border border-white/5 shadow-inner">
          {steps.map((s) => {
            const Icon = s.icon;
            const isActive = activeStep === s.num;
            const isCompleted = activeStep > s.num;
            const isAvailable = s.num === 1 || project.scenes.length > 0 || (s.num === 2 && project.rawStory);

            return (
              <button
                key={s.num}
                onClick={() => isAvailable && onSelectStep(s.num)}
                disabled={!isAvailable}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/90 to-rose-600 text-white shadow-md shadow-rose-500/20'
                    : isCompleted
                    ? 'text-slate-300 hover:text-white hover:bg-white/5'
                    : isAvailable
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : isCompleted ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{s.label}</span>
                {isCompleted && <CheckCircle2 className="w-2.5 h-2.5 text-amber-400/80 -ml-0.5" />}
              </button>
            );
          })}
        </nav>

        {/* System Status Indicators & Model Config */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono-code">
          <button
            onClick={onOpenModelSettings}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition cursor-pointer"
            title="Inspect AI Models & Quota Status"
          >
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="font-semibold">AI Models & Quotas</span>
          </button>
          <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-white/5">
            <span className={`w-2 h-2 rounded-full ${systemHealth?.hasFfmpeg ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            <span>FFmpeg Export</span>
          </div>
        </div>
      </div>
    </header>
  );
};
