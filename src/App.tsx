import React, { useState, useEffect } from 'react';
import { StoryProject, CharacterItem, SceneItem, ModelServicesConfig } from './types/cineStory';
import { SAMPLE_STORIES } from './data/sampleStories';
import { checkHealth, analyzeStory } from './services/api';
import { Navbar } from './components/Navbar';
import { Step1StoryInput } from './components/Step1StoryInput';
import { Step2StoryAnalysis } from './components/Step2StoryAnalysis';
import { Step3CharacterBible } from './components/Step3CharacterBible';
import { Step4ScenePlanner } from './components/Step4ScenePlanner';
import { Step5VisualGeneration } from './components/Step5VisualGeneration';
import { Step6AudioDialogue } from './components/Step6AudioDialogue';
import { Step7VideoEditor } from './components/Step7VideoEditor';
import { Step8FinalExport } from './components/Step8FinalExport';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { ModelSettingsModal } from './components/ModelSettingsModal';

const createDefaultProject = (): StoryProject => {
  const defaultSample = SAMPLE_STORIES[0]; // Cyberpunk Detective & Android
  return {
    id: `proj_${Date.now()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    rawStory: defaultSample.text,
    synopsis: defaultSample.synopsis,
    plotArc: {
      beginning: 'Aiden Cross and Maya-7 track the encrypted ghost signal beneath Neo-Shinjuku.',
      middle: 'They breach the abandoned subterranean server vault amid leaking conduits.',
      climax: 'An ancient deleted artificial consciousness awakens and questions their mission.',
      ending: 'Maya aims her pulse carbine, but Aiden hesitates, seeing the pre-blackout city archive.',
    },
    settings: {
      title: defaultSample.title,
      language: 'English',
      visualStyle: 'Cyberpunk Neo-Noir',
      aspectRatio: '16:9',
      targetDuration: '30s - 45s (5 scenes)',
      narrationStyle: 'Cinematic Noir & Atmospheric',
      subtitlesEnabled: true,
      subtitleStyle: 'cinematic-gold',
      musicTheme: 'Cyberpunk Synthwave',
      musicVolume: 0.35,
      voiceVolume: 0.85,
      soundEffectsEnabled: true,
    },
    characters: [],
    scenes: [],
    currentStep: 1,
  };
};

export default function App() {
  const [project, setProject] = useState<StoryProject>(() => {
    try {
      const stored = localStorage.getItem('cinestory_active_project');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return createDefaultProject();
  });

  const [activeStep, setActiveStep] = useState<number>(1);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState<boolean>(false);
  const [isModelSettingsOpen, setIsModelSettingsOpen] = useState<boolean>(false);
  const [systemHealth, setSystemHealth] = useState<{ hasGeminiKey: boolean; hasFfmpeg: boolean } | null>(null);

  // Independent configurable services with validated model IDs
  const [modelConfig, setModelConfig] = useState<ModelServicesConfig>({
    storyAnalysisModel: 'gemini-3.8-flash',
    imageGenerationModel: 'gemini-3.1-flash-lite-image',
    videoGenerationModel: 'veo-3.1-lite-generate-preview',
    speechSynthesisModel: 'gemini-3.8-flash-lite-tts',
  });

  // Sync to local storage for automatic autosave
  useEffect(() => {
    try {
      localStorage.setItem('cinestory_active_project', JSON.stringify(project));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [project]);

  // Initial health check
  useEffect(() => {
    checkHealth()
      .then((health) => setSystemHealth(health))
      .catch(() => setSystemHealth({ hasGeminiKey: false, hasFfmpeg: false }));
  }, []);

  // Update Project helper
  const handleUpdateProject = (updated: Partial<StoryProject>) => {
    setProject((prev) => ({
      ...prev,
      ...updated,
      updatedAt: Date.now(),
    }));
  };

  // Step 1 -> Step 2: Trigger Gemini Story Analysis
  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const analyzed = await analyzeStory(project.rawStory, project.settings, modelConfig.storyAnalysisModel);

      setProject((prev) => ({
        ...prev,
        synopsis: analyzed.synopsis || prev.synopsis,
        plotArc: analyzed.plotArc || prev.plotArc,
        characters: (analyzed.characters || []).map((c) => ({
          ...c,
          isApproved: false,
        })),
        scenes: (analyzed.scenes || []).map((s) => ({
          ...s,
          generationStatus: 'idle',
        })),
        settings: {
          ...prev.settings,
          title: analyzed.title || prev.settings.title,
        },
        currentStep: 2,
        updatedAt: Date.now(),
      }));

      setActiveStep(2);
    } catch (err: any) {
      alert(`Story analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 3 Character management
  const handleUpdateCharacter = (charId: string, updated: Partial<CharacterItem>) => {
    setProject((prev) => ({
      ...prev,
      characters: prev.characters.map((c) => (c.id === charId ? { ...c, ...updated } : c)),
      updatedAt: Date.now(),
    }));
  };

  const handleAddCharacter = (newChar: CharacterItem) => {
    setProject((prev) => ({
      ...prev,
      characters: [...prev.characters, newChar],
      updatedAt: Date.now(),
    }));
  };

  const handleDeleteCharacter = (charId: string) => {
    setProject((prev) => ({
      ...prev,
      characters: prev.characters.filter((c) => c.id !== charId),
      updatedAt: Date.now(),
    }));
  };

  // Step 4 Scene management
  const handleUpdateScene = (sceneId: string, updated: Partial<SceneItem>) => {
    setProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) => (s.id === sceneId ? { ...s, ...updated } : s)),
      updatedAt: Date.now(),
    }));
  };

  const handleReorderScenes = (startIndex: number, endIndex: number) => {
    setProject((prev) => {
      const reordered = Array.from(prev.scenes);
      const [removed] = reordered.splice(startIndex, 1);
      reordered.splice(endIndex, 0, removed);
      // Renumber scenes sequentially
      const updated = reordered.map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
      return {
        ...prev,
        scenes: updated,
        updatedAt: Date.now(),
      };
    });
  };

  const handleAddScene = () => {
    setProject((prev) => {
      const nextNum = prev.scenes.length + 1;
      const newScene: SceneItem = {
        id: `scene_${Date.now()}`,
        sceneNumber: nextNum,
        title: `Scene ${nextNum}: Narrative Development`,
        duration: 5,
        storyEvents: 'New dramatic sequence in story order.',
        charactersPresent: prev.characters.map((c) => c.id).slice(0, 2),
        location: {
          name: 'Atmospheric Set',
          environment: 'Indoor chamber',
          timeOfDay: 'Night',
          weather: 'Overcast',
          lighting: 'Cinematic rim lighting',
        },
        camera: {
          shotType: 'Medium Push-In',
          angle: 'Eye Level',
          movement: 'Slow Dolly In',
          lens: '35mm Anamorphic',
        },
        action: 'Characters exchange intense observations.',
        facialExpression: 'Focused, determined',
        dialogue: [],
        narration: 'The tension in the chamber reached its apex.',
        soundEffects: ['low drone', 'atmospheric hum'],
        musicCue: 'Subtle rising chords',
        transition: 'cross-dissolve',
        promptTemplate: {
          purpose: 'Advance character relationship',
          characters: prev.characters.map((c) => `${c.name}: ${c.appearance}`).join(', '),
          environment: 'Atmospheric Set with volumetric lights',
          action: 'Characters step forward into the spotlight',
          camera: 'Medium Push-In, 35mm Anamorphic',
          visualStyle: prev.settings.visualStyle,
          dialogueAudio: 'Clear voiceover, ambient drone',
          continuity: 'Preserve established wardrobe and facial features',
          avoid: 'Duplicate characters, sudden costume shifts, distorted hands',
        },
        fullPrompt: `Cinematic movie still, ${prev.settings.visualStyle}. Scene ${nextNum}. Characters in dialogue.`,
        negativePrompt: 'blurry, morphing faces, inconsistent clothes, distorted limbs',
        generationStatus: 'idle',
      };

      return {
        ...prev,
        scenes: [...prev.scenes, newScene],
        updatedAt: Date.now(),
      };
    });
  };

  const handleDeleteScene = (sceneId: string) => {
    setProject((prev) => {
      const filtered = prev.scenes.filter((s) => s.id !== sceneId);
      const renumbered = filtered.map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
      return {
        ...prev,
        scenes: renumbered,
        updatedAt: Date.now(),
      };
    });
  };

  const handleNewProject = () => {
    if (window.confirm('Create a new project? Any unsaved edits will be cleared.')) {
      setProject(createDefaultProject());
      setActiveStep(1);
    }
  };

  const handleLoadProject = (loaded: StoryProject) => {
    setProject(loaded);
    setActiveStep(loaded.scenes?.length > 0 ? 4 : 1);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Top Navigation */}
      <Navbar
        project={project}
        activeStep={activeStep}
        onSelectStep={setActiveStep}
        onOpenProjectManager={() => setIsProjectManagerOpen(true)}
        onOpenModelSettings={() => setIsModelSettingsOpen(true)}
        onNewProject={handleNewProject}
        systemHealth={systemHealth}
      />

      {/* Main Studio Views */}
      <main className="flex-1 pb-16">
        {activeStep === 1 && (
          <Step1StoryInput
            project={project}
            onUpdateProject={handleUpdateProject}
            onStartAnalysis={handleStartAnalysis}
            isLoading={isAnalyzing}
          />
        )}

        {activeStep === 2 && (
          <Step2StoryAnalysis
            project={project}
            onNext={() => setActiveStep(3)}
            onBack={() => setActiveStep(1)}
            onReanalyze={handleStartAnalysis}
            isLoading={isAnalyzing}
          />
        )}

        {activeStep === 3 && (
          <Step3CharacterBible
            project={project}
            onUpdateCharacter={handleUpdateCharacter}
            onAddCharacter={handleAddCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onOpenModelSettings={() => setIsModelSettingsOpen(true)}
            imageModelId={modelConfig.imageGenerationModel}
            onNext={() => setActiveStep(4)}
            onBack={() => setActiveStep(2)}
          />
        )}

        {activeStep === 4 && (
          <Step4ScenePlanner
            project={project}
            onUpdateScene={handleUpdateScene}
            onReorderScenes={handleReorderScenes}
            onAddScene={handleAddScene}
            onDeleteScene={handleDeleteScene}
            onNext={() => setActiveStep(5)}
            onBack={() => setActiveStep(3)}
          />
        )}

        {activeStep === 5 && (
          <Step5VisualGeneration
            project={project}
            onUpdateScene={handleUpdateScene}
            onOpenModelSettings={() => setIsModelSettingsOpen(true)}
            imageModelId={modelConfig.imageGenerationModel}
            videoModelId={modelConfig.videoGenerationModel}
            onNext={() => setActiveStep(6)}
            onBack={() => setActiveStep(4)}
          />
        )}

        {activeStep === 6 && (
          <Step6AudioDialogue
            project={project}
            onUpdateScene={handleUpdateScene}
            onUpdateSettings={(updated) =>
              setProject((prev) => ({
                ...prev,
                settings: { ...prev.settings, ...updated },
              }))
            }
            onNext={() => setActiveStep(7)}
            onBack={() => setActiveStep(5)}
          />
        )}

        {activeStep === 7 && (
          <Step7VideoEditor
            project={project}
            onUpdateScene={handleUpdateScene}
            onReorderScenes={handleReorderScenes}
            onNext={() => setActiveStep(8)}
            onBack={() => setActiveStep(6)}
          />
        )}

        {activeStep === 8 && (
          <Step8FinalExport
            project={project}
            onUpdateExportResult={(exportResult) =>
              setProject((prev) => ({ ...prev, exportResult }))
            }
            onBack={() => setActiveStep(7)}
          />
        )}
      </main>

      {/* Project Manager Modal */}
      <ProjectManagerModal
        isOpen={isProjectManagerOpen}
        onClose={() => setIsProjectManagerOpen(false)}
        currentProject={project}
        onLoadProject={handleLoadProject}
      />

      {/* Model Services & Quota Modal */}
      <ModelSettingsModal
        isOpen={isModelSettingsOpen}
        onClose={() => setIsModelSettingsOpen(false)}
        config={modelConfig}
        onUpdateConfig={(up) => setModelConfig((prev) => ({ ...prev, ...up }))}
      />
    </div>
  );
}
