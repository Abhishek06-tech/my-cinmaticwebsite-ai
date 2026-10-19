import React, { useState, useEffect } from 'react';
import { X, Save, FolderOpen, Download, Upload, Trash2, Clock, Check } from 'lucide-react';
import { StoryProject } from '../types/cineStory';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: StoryProject;
  onLoadProject: (project: StoryProject) => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  onLoadProject,
}) => {
  const [savedProjects, setSavedProjects] = useState<StoryProject[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSavedProjectsList();
    }
  }, [isOpen]);

  const loadSavedProjectsList = () => {
    try {
      const raw = localStorage.getItem('cinestory_saved_projects');
      if (raw) {
        const list = JSON.parse(raw);
        setSavedProjects(list);
      }
    } catch (e) {
      console.warn('Failed to load projects from storage:', e);
    }
  };

  const handleSaveCurrent = () => {
    try {
      const raw = localStorage.getItem('cinestory_saved_projects');
      let list: StoryProject[] = raw ? JSON.parse(raw) : [];

      // Update existing or add new
      const index = list.findIndex((p) => p.id === currentProject.id);
      const updatedProject = {
        ...currentProject,
        updatedAt: Date.now(),
      };

      if (index >= 0) {
        list[index] = updatedProject;
      } else {
        list.unshift(updatedProject);
      }

      localStorage.setItem('cinestory_saved_projects', JSON.stringify(list));
      setSavedProjects(list);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e: any) {
      alert(`Save failed: ${e.message}`);
    }
  };

  const handleDeleteSaved = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = savedProjects.filter((p) => p.id !== projectId);
      localStorage.setItem('cinestory_saved_projects', JSON.stringify(updated));
      setSavedProjects(updated);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentProject, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${currentProject.settings.title || 'cinestory'}_project.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && parsed.scenes && parsed.characters) {
            onLoadProject(parsed);
            onClose();
          } else {
            alert('Invalid project JSON structure.');
          }
        } catch (err: any) {
          alert(`Error reading JSON file: ${err.message}`);
        }
      };
      reader.readAsText(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0f121d] border border-white/15 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-amber-400" />
            <h3 className="text-xl font-bold text-white font-cinema">Project Management</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Row */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSaveCurrent}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow cursor-pointer"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-950" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Current Project</span>
              </>
            )}
          </button>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Project JSON</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 cursor-pointer transition">
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Import Project JSON</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
        </div>

        {/* Saved Projects List */}
        <div className="space-y-3">
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block">
            Saved Projects ({savedProjects.length})
          </span>

          {savedProjects.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-4 text-center bg-slate-950/40 rounded-xl border border-white/5">
              No saved projects yet. Click "Save Current Project" to store your screenplay, characters, and scenes.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {savedProjects.map((proj) => {
                const isCurrent = proj.id === currentProject.id;
                return (
                  <div
                    key={proj.id}
                    onClick={() => {
                      onLoadProject(proj);
                      onClose();
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition group ${
                      isCurrent
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : 'bg-slate-900/50 hover:bg-slate-900 border-white/5'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm group-hover:text-amber-300">
                          {proj.settings?.title || 'Untitled Project'}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono-code">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{proj.scenes?.length || 0} scenes</span>
                        <span>•</span>
                        <span>{proj.characters?.length || 0} characters</span>
                        <span>•</span>
                        <span>{new Date(proj.updatedAt || proj.createdAt).toLocaleDateString()}</span>
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleDeleteSaved(proj.id, e)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Delete saved project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
