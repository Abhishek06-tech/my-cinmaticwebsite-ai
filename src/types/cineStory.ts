export type AspectRatio = '16:9' | '9:16' | '1:1';

export type VisualStyle = 
  | 'Cinematic Film (35mm Anamorphic)'
  | 'Anime / Studio Ghibli'
  | 'Pixar / Disney 3D Animation'
  | 'Cyberpunk Neo-Noir'
  | 'Dark Fantasy Epic'
  | 'Vintage 1970s Panavision'
  | 'Hyperrealistic Documentary'
  | 'Graphic Novel Noir';

export type VoicePreset = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export type MusicTheme = 
  | 'Cinematic Orchestral'
  | 'Cyberpunk Synthwave'
  | 'Whimsical Fantasy'
  | 'Suspense Thriller'
  | 'Gentle Acoustic'
  | 'Epic Trailer Percussion'
  | 'Dark Fantasy & Lore'
  | 'Emotional Neo-Classical'
  | 'Sci-Fi Space Ambient';

export interface CharacterItem {
  id: string;
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'narrator';
  age: string;
  gender: string;
  appearance: string;
  faceShape: string;
  skinTone: string;
  eyeColor: string;
  hairStyle: string;
  hairColor: string;
  bodyProportions: string;
  wardrobe: string;
  footwear: string;
  accessories: string;
  distinguishingFeatures: string;
  voicePreset: VoicePreset;
  voiceStyle: string;
  personality: string;
  referenceImageUrl?: string;
  isApproved: boolean;
  notes?: string;
}

export interface DialogueLine {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  emotion: string;
  audioUrl?: string;
  isGeneratingAudio?: boolean;
}

export interface ScenePromptTemplate {
  purpose: string;
  characters: string;
  environment: string;
  action: string;
  camera: string;
  visualStyle: string;
  dialogueAudio: string;
  continuity: string;
  avoid: string;
}

export interface SceneItem {
  id: string;
  sceneNumber: number;
  title: string;
  duration: number; // in seconds (e.g. 5, 6, 8)
  storyEvents: string;
  charactersPresent: string[]; // character IDs
  location: {
    name: string;
    environment: string;
    timeOfDay: string;
    weather: string;
    lighting: string;
  };
  camera: {
    shotType: string; // e.g. "Wide Establishing Shot", "Extreme Close-Up"
    angle: string;    // e.g. "Low Angle", "Eye Level", "Dutch Tilt"
    movement: string; // e.g. "Slow Push-In", "Tracking Pan", "Aerial Crane"
    lens: string;     // e.g. "35mm Anamorphic", "85mm f/1.4 Portrait"
  };
  action: string;
  facialExpression: string;
  dialogue: DialogueLine[];
  narration?: string;
  narrationAudioUrl?: string;
  soundEffects: string[];
  musicCue: string;
  transition: 'fade-black' | 'cross-dissolve' | 'cut' | 'wipe';
  promptTemplate: ScenePromptTemplate;
  fullPrompt: string;
  negativePrompt: string;
  keyframeImageUrl?: string;
  videoUrl?: string;
  operationName?: string;
  generationStatus: 'idle' | 'generating-image' | 'generating-video' | 'polling-video' | 'ready' | 'error' | 'quota_exhausted';
  generationProgress?: number;
  errorMessage?: string;
  isZeroQuotaError?: boolean;
}

export interface ServiceModelInfo {
  id: 'storyAnalysis' | 'imageGeneration' | 'videoGeneration' | 'speechSynthesis';
  name: string;
  selectedModel: string;
  supportedModels: string[];
  tier: 'free_tier_supported' | 'paid_key_required';
  status: 'ready' | 'quota_zero' | 'error' | 'untested';
  statusMessage?: string;
}

export interface ModelServicesConfig {
  storyAnalysisModel: string;
  imageGenerationModel: string;
  videoGenerationModel: string;
  speechSynthesisModel: string;
}

export interface ProjectSettings {
  title: string;
  language: string;
  visualStyle: VisualStyle;
  aspectRatio: AspectRatio;
  targetDuration: string; // e.g. "30s - 45s (5-6 scenes)"
  narrationStyle: string;
  subtitlesEnabled: boolean;
  subtitleStyle: 'cinematic-gold' | 'clean-white' | 'cyber-neon';
  musicTheme: MusicTheme;
  musicVolume: number; // 0 to 1
  dynamicMoodProgression?: boolean; // Progress theme across Exposition -> Rising -> Climax -> Resolution
  seamlessNarrativeLoop?: boolean; // Seamless harmonic loop connecting conclusion back to start
  musicIntensity?: 'subtle' | 'balanced' | 'dramatic';
  voiceVolume: number; // 0 to 1
  soundEffectsEnabled: boolean;
}

export interface StoryProject {
  id: string;
  createdAt: number;
  updatedAt: number;
  rawStory: string;
  synopsis: string;
  plotArc: {
    beginning: string;
    middle: string;
    climax: string;
    ending: string;
  };
  settings: ProjectSettings;
  characters: CharacterItem[];
  scenes: SceneItem[];
  currentStep: number; // 1: Story Input, 2: Analysis, 3: Character Bible, 4: Storyboard, 5: Visual Gen, 6: Audio & Dialogue, 7: Video Editor, 8: Export
  continuityReport?: {
    score: number;
    issues: Array<{
      type: 'warning' | 'error' | 'info';
      sceneNumber: number;
      characterName?: string;
      message: string;
      suggestion: string;
    }>;
  };
  exportResult?: {
    videoUrl: string;
    filename: string;
    duration: number;
    fileSizeMb?: number;
    resolution: string;
    aspectRatio: AspectRatio;
  };
}
