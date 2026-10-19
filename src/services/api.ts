import { CharacterItem, ProjectSettings, SceneItem, StoryProject } from '../types/cineStory';

export interface QuotaExhaustedError extends Error {
  isZeroQuota: boolean;
  isPaidKeyRequired: boolean;
  modelId?: string;
  quotaAction?: string;
  actionUrl?: string;
  fallbackConceptCardUrl?: string;
}

export async function checkHealth() {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Failed to reach backend server');
  return res.json() as Promise<{
    status: string;
    hasGeminiKey: boolean;
    hasFfmpeg: boolean;
  }>;
}

export async function getModelConfig() {
  const res = await fetch('/api/models/config');
  if (!res.ok) throw new Error('Failed to fetch model configuration');
  return res.json();
}

export async function testModelService(serviceName: string, modelId?: string) {
  const res = await fetch('/api/models/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceName, modelId }),
  });
  return res.json();
}

export async function generateConceptCard(params: {
  type: 'character' | 'scene';
  title: string;
  subtitle?: string;
  visualStyle: string;
  tags?: string[];
  description?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16';
}): Promise<{ imageUrl: string; isConceptCard: boolean }> {
  const res = await fetch('/api/generate-concept-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to generate concept visual');
  return res.json();
}

export async function analyzeStory(
  story: string,
  settings: ProjectSettings,
  modelId?: string
): Promise<{
  title: string;
  synopsis: string;
  genre: string;
  plotArc: { beginning: string; middle: string; climax: string; ending: string };
  characters: CharacterItem[];
  scenes: SceneItem[];
}> {
  const res = await fetch('/api/analyze-story', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      story,
      visualStyle: settings.visualStyle,
      language: settings.language,
      targetDuration: settings.targetDuration,
      narrationStyle: settings.narrationStyle,
      modelId,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Server error (${res.status}) while analyzing story`);
  }

  return res.json();
}

export async function generateCharacterImage(
  character: CharacterItem,
  visualStyle: string,
  customPrompt?: string,
  modelId?: string,
  useFallbackConcept: boolean = false
): Promise<{ imageUrl: string; isConceptCard?: boolean }> {
  const res = await fetch('/api/generate-character-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ character, visualStyle, customPrompt, modelId, useFallbackConcept }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err: QuotaExhaustedError = new Error(
      errorData.error || errorData.quotaAction || 'Failed to generate character image'
    ) as QuotaExhaustedError;
    err.isZeroQuota = Boolean(errorData.isZeroQuota);
    err.isPaidKeyRequired = Boolean(errorData.isPaidKeyRequired);
    err.modelId = errorData.modelId;
    err.quotaAction = errorData.quotaAction;
    err.actionUrl = errorData.actionUrl;
    err.fallbackConceptCardUrl = errorData.fallbackConceptCardUrl;
    throw err;
  }

  return res.json();
}

export async function generateSceneImage(
  scene: SceneItem,
  visualStyle: string,
  characters: CharacterItem[],
  aspectRatio: string,
  referenceImageBase64?: string,
  modelId?: string,
  useFallbackConcept: boolean = false
): Promise<{ imageUrl: string; isConceptCard?: boolean }> {
  const res = await fetch('/api/generate-scene-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scene,
      visualStyle,
      characters,
      aspectRatio,
      referenceImageBase64,
      modelId,
      useFallbackConcept,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err: QuotaExhaustedError = new Error(
      errorData.error || errorData.quotaAction || 'Failed to generate scene visual'
    ) as QuotaExhaustedError;
    err.isZeroQuota = Boolean(errorData.isZeroQuota);
    err.isPaidKeyRequired = Boolean(errorData.isPaidKeyRequired);
    err.modelId = errorData.modelId;
    err.quotaAction = errorData.quotaAction;
    err.actionUrl = errorData.actionUrl;
    err.fallbackConceptCardUrl = errorData.fallbackConceptCardUrl;
    throw err;
  }

  return res.json();
}

export async function generateVeoVideo(
  prompt: string,
  startingImageBase64?: string,
  aspectRatio: string = '16:9',
  resolution: string = '720p',
  modelName?: string
): Promise<{ operationName: string }> {
  const res = await fetch('/api/generate-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      startingImageBase64,
      aspectRatio,
      resolution,
      modelName,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err: QuotaExhaustedError = new Error(
      errorData.error || errorData.quotaAction || 'Failed to initiate Veo video generation'
    ) as QuotaExhaustedError;
    err.isZeroQuota = Boolean(errorData.isZeroQuota);
    err.isPaidKeyRequired = Boolean(errorData.isPaidKeyRequired);
    throw err;
  }

  return res.json();
}

export async function pollVideoStatus(operationName: string): Promise<{
  done?: boolean;
  error?: any;
  response?: any;
}> {
  const res = await fetch('/api/video-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operationName }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to poll video status');
  }

  return res.json();
}

export async function downloadVeoVideo(operationName: string): Promise<{
  videoUrl: string;
  filename: string;
}> {
  const res = await fetch('/api/video-download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operationName }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to download Veo video');
  }

  return res.json();
}

export async function generateSpeech(
  text: string,
  voicePreset: string,
  emotion: string = 'Expressive',
  speaker: string = 'Narrator',
  modelId?: string
): Promise<{ audioUrl: string; voiceName: string }> {
  const res = await fetch('/api/generate-speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voicePreset, emotion, speaker, modelId }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to synthesize speech');
  }

  return res.json();
}

export async function auditContinuity(
  scenes: SceneItem[],
  characters: CharacterItem[],
  modelId?: string
): Promise<{
  score: number;
  summary: string;
  issues: Array<{
    type: 'warning' | 'error' | 'info';
    sceneNumber: number;
    characterName?: string;
    message: string;
    suggestion: string;
  }>;
}> {
  const res = await fetch('/api/audit-continuity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenes, characters, modelId }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to run continuity audit');
  }

  return res.json();
}

export async function exportFinalVideo(
  scenes: SceneItem[],
  settings: ProjectSettings,
  title: string
): Promise<{
  success: boolean;
  videoUrl: string;
  filename: string;
  duration: number;
  fileSizeMb: number;
  resolution: string;
  aspectRatio: string;
}> {
  const res = await fetch('/api/export-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenes, settings, title }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to export final video');
  }

  return res.json();
}
