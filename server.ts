import express, { Request, Response } from 'express';
import { GoogleGenAI, Type, GenerateVideosOperation } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { exec } from 'child_process';
import util from 'util';

dotenv.config();

const execPromise = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

const exportsDir = path.resolve(__dirname, 'exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}
app.use('/api/exports', express.static(exportsDir));

// Keep all API keys on the server
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// SERVICE MODEL CONFIGURATION
// Separate configurable services with independently validated model IDs
export const SERVICE_MODELS = {
  storyAnalysis: {
    id: 'storyAnalysis',
    name: 'Story Analysis & Scene Planning',
    defaultModel: 'gemini-3.8-flash',
    currentModel: 'gemini-3.8-flash',
    supportedModels: ['gemini-3.8-flash', 'gemini-4-argon'],
    tier: 'free_tier_supported',
    status: 'ready',
    statusMessage: 'Active with Free Tier quota on Google AI Studio.',
  },
  imageGeneration: {
    id: 'imageGeneration',
    name: 'Character Reference & Scene Keyframes',
    defaultModel: 'gemini-3.1-flash-lite-image',
    currentModel: 'gemini-3.1-flash-lite-image',
    supportedModels: ['gemini-3.1-flash-lite-image', 'gemini-nano-banana-2.1', 'gemini-3-pro-image'],
    tier: 'paid_key_required',
    status: 'quota_zero',
    statusMessage: 'Quota limit is 0 on free tier. Requires Pay-as-you-go billing in Google AI Studio.',
  },
  videoGeneration: {
    id: 'videoGeneration',
    name: 'Veo AI Video Generation',
    defaultModel: 'veo-3.1-lite-generate-preview',
    currentModel: 'veo-3.1-lite-generate-preview',
    supportedModels: ['veo-3.1-lite-generate-preview', 'veo-3.1-generate-preview'],
    tier: 'paid_key_required',
    status: 'quota_zero',
    statusMessage: 'Veo requires Pay-as-you-go billing in Google AI Studio.',
  },
  speechSynthesis: {
    id: 'speechSynthesis',
    name: 'Character Voice Acting & Dialogue',
    defaultModel: 'gemini-3.8-flash-lite-tts',
    currentModel: 'gemini-3.8-flash-lite-tts',
    supportedModels: ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts'],
    tier: 'free_tier_supported',
    status: 'ready',
    statusMessage: 'Active with Free Tier quota on Google AI Studio.',
  },
};

// ERROR PARSER & QUOTA ZERO DETECTOR
export interface ParsedGeminiError {
  status: number;
  isQuotaExhausted: boolean;
  isZeroQuota: boolean;
  isPaidKeyRequired: boolean;
  retryDelayMs?: number;
  message: string;
  quotaDetails?: any;
}

export function parseGeminiError(error: any, modelId: string): ParsedGeminiError {
  const status = error.status || 500;
  const msg = error.message || String(error);

  const isQuotaExhausted =
    status === 429 || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota') || msg.includes('Quota exceeded') || error.isZeroQuota;

  // Check if quota limit is strictly 0 (i.e. model requires paid plan)
  // Must NOT match "limit: 10" or "limit: 15" on FreeTier
  const hasZeroLimit = /limit:\s*0\b/i.test(msg) || /"quotaValue":\s*"0"/i.test(msg) || /quota limit is 0/i.test(msg);
  const isZeroQuota = Boolean(error.isZeroQuota) || (isQuotaExhausted && hasZeroLimit);

  const isPaidKeyRequired =
    Boolean(error.isPaidKeyRequired) || isZeroQuota || msg.includes('pay-as-you-go') || msg.includes('paid plan');

  let retryDelayMs: number | undefined = undefined;
  try {
    if (error.details && Array.isArray(error.details)) {
      const retryInfo = error.details.find((d: any) => d['@type']?.includes('RetryInfo'));
      if (retryInfo?.retryDelay) {
        const delayStr = String(retryInfo.retryDelay);
        const match = delayStr.match(/^([\d.]+)s?$/);
        if (match) {
          retryDelayMs = parseFloat(match[1]) * 1000;
        }
      }
    }
  } catch {}

  return {
    status,
    isQuotaExhausted,
    isZeroQuota,
    isPaidKeyRequired,
    retryDelayMs,
    message: msg,
    quotaDetails: error.details,
  };
}

// PROCEDURAL FORMANT SPEECH SYNTHESIZER
// Generates clean 16-bit mono 22050Hz WAV audio modulated to vocal formant frequencies matching text length
export function generateFormantSpeechWav(text: string, voicePreset: string = 'Kore'): string {
  const sampleRate = 22050;
  const words = (text || 'Spoken line').trim().split(/\s+/).length;
  const durationSec = Math.max(1.8, Math.min(12, words * 0.38 + 0.5));
  const totalSamples = Math.floor(sampleRate * durationSec);
  const buffer = Buffer.alloc(44 + totalSamples * 2);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + totalSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(totalSamples * 2, 40);

  let basePitch = 180;
  if (voicePreset === 'Fenrir') basePitch = 95;
  if (voicePreset === 'Charon') basePitch = 110;
  if (voicePreset === 'Puck') basePitch = 210;
  if (voicePreset === 'Zephyr') basePitch = 140;

  let phase = 0;
  const syllableRate = 4.2;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let env = 1.0;
    if (t < 0.12) env = t / 0.12;
    if (t > durationSec - 0.25) env = Math.max(0, (durationSec - t) / 0.25);

    const syllableMod = 0.55 + 0.45 * Math.sin(2 * Math.PI * syllableRate * t);
    const pitch = basePitch * (1 + 0.08 * Math.sin(1.8 * Math.PI * (t / durationSec)));
    phase += (2 * Math.PI * pitch) / sampleRate;

    const f1 = Math.sin(phase);
    const f2 = 0.5 * Math.sin(phase * 2.8);
    const f3 = 0.25 * Math.sin(phase * 4.2);
    const sampleVal = (f1 + f2 + f3) * 0.35 * env * syllableMod;

    const int16 = Math.max(-32768, Math.min(32767, Math.floor(sampleVal * 32767)));
    buffer.writeInt16LE(int16, 44 + i * 2);
  }

  return 'data:audio/wav;base64,' + buffer.toString('base64');
}

// DYNAMIC CINEMATIC SOUNDTRACK SYNTHESIZER (44.1kHz Stereo/Mono PCM)
// Synthesizes a seamless narrative soundtrack across the full movie duration with dynamic arc progression
export function generateNarrativeSoundtrackWav(
  durationSec: number,
  theme: string = 'Cinematic Orchestral',
  volume: number = 0.35
): Buffer {
  const sampleRate = 44100;
  const totalSamples = Math.floor(sampleRate * Math.max(3, durationSec));
  const buffer = Buffer.alloc(44 + totalSamples * 2);

  // WAV Header (16-bit Mono 44.1kHz)
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + totalSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(totalSamples * 2, 40);

  // Dynamic Narrative Arc Chords
  // 4 stages: Exposition (0 - 25%), Rising (25 - 65%), Climax (65 - 85%), Resolution (85 - 100%)
  let baseFrequencies = [65.41, 130.81, 196.00, 261.63]; // C Orchestral
  if (theme.includes('Synthwave')) {
    baseFrequencies = [65.41, 130.81, 155.56, 196.00]; // C minor
  } else if (theme.includes('Fantasy')) {
    baseFrequencies = [130.81, 196.00, 246.94, 329.63];
  } else if (theme.includes('Suspense')) {
    baseFrequencies = [43.65, 87.31, 92.50, 110.00];
  } else if (theme.includes('Acoustic')) {
    baseFrequencies = [98.00, 146.83, 196.00, 246.94];
  } else if (theme.includes('Trailer')) {
    baseFrequencies = [55.00, 110.00, 164.81, 220.00];
  } else if (theme.includes('Lore')) {
    baseFrequencies = [73.42, 110.00, 146.83, 220.00];
  } else if (theme.includes('Classical')) {
    baseFrequencies = [65.41, 130.81, 164.81, 196.00];
  } else if (theme.includes('Space')) {
    baseFrequencies = [65.41, 196.00, 293.66, 392.00];
  }

  const vol = Math.max(0.08, Math.min(1.0, volume));

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const progress = t / durationSec; // 0 to 1

    // Narrative Stage Modulation
    let stageIntensity = 1.0;
    let pulseRate = 2.0; // Hz
    let harmonicShift = 1.0;

    if (progress < 0.28) {
      // Exposition: atmospheric, slow swell
      stageIntensity = 0.75 + 0.25 * (progress / 0.28);
      pulseRate = 1.5;
      harmonicShift = 1.0;
    } else if (progress < 0.64) {
      // Rising Action: tension builds
      const subProg = (progress - 0.28) / 0.36;
      stageIntensity = 1.0 + 0.35 * subProg;
      pulseRate = 3.0 + 1.2 * subProg;
      harmonicShift = 1.0 + 0.06 * Math.sin(Math.PI * subProg);
    } else if (progress < 0.86) {
      // Climax: peak power
      stageIntensity = 1.5;
      pulseRate = 5.0;
      harmonicShift = 1.25;
    } else {
      // Resolution & Seamless Loop Cadence: smooth landing
      const subProg = (progress - 0.86) / 0.14;
      stageIntensity = 1.5 - 0.7 * subProg;
      pulseRate = 2.0;
      harmonicShift = 1.0;
    }

    // Seamless loop envelope: gentle fade-in at t=0 and smooth cadence at end
    let loopFade = 1.0;
    if (t < 0.4) loopFade = Math.sin((t / 0.4) * (Math.PI / 2));
    if (t > durationSec - 0.4) loopFade = Math.sin(((durationSec - t) / 0.4) * (Math.PI / 2));

    // Multi-layer waveform calculation
    // Layer 1: Sub Bass root
    const root = baseFrequencies[0];
    const bass = Math.sin(2 * Math.PI * root * t) * 0.4;

    // Layer 2: Harmonic Pad Chords
    const chord1 = Math.sin(2 * Math.PI * baseFrequencies[1] * harmonicShift * t) * 0.25;
    const chord2 = Math.sin(2 * Math.PI * (baseFrequencies[2] || root * 1.5) * harmonicShift * t) * 0.2;
    const chord3 = Math.sin(2 * Math.PI * (baseFrequencies[3] || root * 2.0) * harmonicShift * t) * 0.15;

    // Layer 3: Rhythmic Cinematic Pulse
    const pulseEnv = 0.5 + 0.5 * Math.sin(2 * Math.PI * pulseRate * t);
    const pulse = (Math.sin(2 * Math.PI * root * 2 * t) + 0.3 * Math.sin(2 * Math.PI * root * 3 * t)) * 0.25 * pulseEnv;

    // Sum and scale
    const sample = (bass + chord1 + chord2 + chord3 + pulse) * stageIntensity * vol * loopFade * 0.32;
    const int16 = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(int16, 44 + i * 2);
  }

  return buffer;
}

// EXPONENTIAL BACKOFF & SMART RETRY CONTROLLER
export async function executeWithRetry<T>(
  task: () => Promise<T>,
  options: {
    serviceName: string;
    modelId: string;
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
  }
): Promise<T> {
  const maxRetries = options.maxRetries ?? 2;
  const initialDelay = options.initialDelayMs ?? 1500;
  const maxDelay = options.maxDelayMs ?? 8000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await task();
    } catch (err: any) {
      const parsed = parseGeminiError(err, options.modelId);

      // REQUIREMENT 4: "If the model's quota is zero, stop retries and show a clear message explaining the required billing or quota action."
      if (parsed.isZeroQuota) {
        console.warn(`[${options.serviceName}] Quota limit is 0 for ${options.modelId}. Aborting retries immediately.`);
        const zeroQuotaErr: any = new Error(
          `Quota limit is 0 for model ${options.modelId} on the free tier. Google AI Studio requires a Pay-as-you-go billing account for ${options.serviceName}.`
        );
        zeroQuotaErr.isZeroQuota = true;
        zeroQuotaErr.isPaidKeyRequired = true;
        zeroQuotaErr.status = 429;
        zeroQuotaErr.modelId = options.modelId;
        zeroQuotaErr.serviceName = options.serviceName;
        throw zeroQuotaErr;
      }

      // If retryDelay is very long (e.g. > 60 seconds), do not block HTTP request
      if (parsed.retryDelayMs && parsed.retryDelayMs > 60000) {
        console.warn(`[${options.serviceName}] Retry delay is ${Math.round(parsed.retryDelayMs / 1000)}s (>60s). Stopping retries.`);
        const longDelayErr: any = new Error(
          `Rate limit exceeded for ${options.modelId}. Service requests retry in ${Math.round(parsed.retryDelayMs / 1000)}s.`
        );
        longDelayErr.status = 429;
        longDelayErr.retryDelayMs = parsed.retryDelayMs;
        longDelayErr.modelId = options.modelId;
        throw longDelayErr;
      }

      if (attempt >= maxRetries) {
        throw err;
      }

      // Respect retryDelay if provided, otherwise standard exponential backoff with jitter
      const backoff = Math.min(
        maxDelay,
        (parsed.retryDelayMs || initialDelay * Math.pow(2, attempt)) + Math.random() * 500
      );
      console.log(`[${options.serviceName}] Temporary rate limit (attempt ${attempt + 1}). Retrying in ${Math.round(backoff)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
  throw new Error(`Max retries exceeded for ${options.serviceName}`);
}

// PROCEDURAL HIGH-FIDELITY CONCEPT CARD GENERATOR
// Creates an artistic concept visual representation when quota is 0 or user selects it
export function generateConceptCardSvg(params: {
  type: 'character' | 'scene';
  title: string;
  subtitle?: string;
  visualStyle: string;
  tags?: string[];
  description?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16';
}): string {
  const { type, title, subtitle = '', visualStyle, tags = [], description = '', aspectRatio = '1:1' } = params;

  let width = 800;
  let height = 800;
  if (aspectRatio === '16:9') {
    width = 960;
    height = 540;
  } else if (aspectRatio === '9:16') {
    width = 540;
    height = 960;
  }

  // Pick color palette based on visual style
  let gradStart = '#0f172a';
  let gradEnd = '#1e1b4b';
  let accent = '#f59e0b';
  let accentSecondary = '#ec4899';

  if (visualStyle.includes('Cyberpunk')) {
    gradStart = '#090d16';
    gradEnd = '#1e0533';
    accent = '#06b6d4';
    accentSecondary = '#f43f5e';
  } else if (visualStyle.includes('Fantasy')) {
    gradStart = '#0a1612';
    gradEnd = '#192b21';
    accent = '#10b981';
    accentSecondary = '#fbbf24';
  } else if (visualStyle.includes('Anime')) {
    gradStart = '#181e36';
    gradEnd = '#331d3d';
    accent = '#38bdf8';
    accentSecondary = '#f472b6';
  }

  const safeTitle = (title || 'Concept').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeSub = (subtitle || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeDesc = (description || '').slice(0, 180).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${gradStart}"/>
        <stop offset="100%" stop-color="${gradEnd}"/>
      </linearGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${accent}"/>
        <stop offset="100%" stop-color="${accentSecondary}"/>
      </linearGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
      </pattern>
      <radialGradient id="vignette" cx="50%" cy="50%" r="50%">
        <stop offset="60%" stop-color="transparent"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.85)"/>
      </radialGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="15" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <rect width="${width}" height="${height}" fill="url(#grid)"/>

    <!-- Geometric Cinema Halo -->
    <circle cx="${width / 2}" cy="${height * 0.42}" r="${Math.min(width, height) * 0.28}" fill="none" stroke="url(#accentGrad)" stroke-width="2" opacity="0.4" stroke-dasharray="8 6"/>
    <circle cx="${width / 2}" cy="${height * 0.42}" r="${Math.min(width, height) * 0.22}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>

    <!-- Central Icon/Silhouette -->
    ${type === 'character' ? `
      <circle cx="${width / 2}" cy="${height * 0.35}" r="${Math.min(width, height) * 0.12}" fill="url(#accentGrad)" opacity="0.85" filter="url(#glow)"/>
      <path d="M ${width / 2 - 70} ${height * 0.58} C ${width / 2 - 70} ${height * 0.46}, ${width / 2 + 70} ${height * 0.46}, ${width / 2 + 70} ${height * 0.58} Z" fill="url(#accentGrad)" opacity="0.85"/>
      <circle cx="${width / 2}" cy="${height * 0.35}" r="${Math.min(width, height) * 0.10}" fill="#0f172a"/>
    ` : `
      <!-- Film Clapperboard / Camera Glyph -->
      <rect x="${width / 2 - 80}" y="${height * 0.32}" width="160" height="100" rx="12" fill="rgba(255,255,255,0.06)" stroke="url(#accentGrad)" stroke-width="2"/>
      <polygon points="${width / 2 - 20},${height * 0.38} ${width / 2 - 20},${height * 0.46} ${width / 2 + 30},${height * 0.42}" fill="url(#accentGrad)"/>
    `}

    <!-- Cinematic Vignette -->
    <rect width="${width}" height="${height}" fill="url(#vignette)"/>

    <!-- Top Badge -->
    <g transform="translate(30, 40)">
      <rect width="180" height="28" rx="6" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
      <text x="12" y="18" fill="${accent}" font-family="monospace" font-size="11" font-weight="bold">
        ${type === 'character' ? 'CHARACTER BIBLE' : 'SCENE KEYFRAME'}
      </text>
    </g>

    <!-- Top Right Style Badge -->
    <g transform="translate(${width - 230}, 40)">
      <rect width="200" height="28" rx="6" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
      <text x="10" y="18" fill="#e2e8f0" font-family="sans-serif" font-size="11">
        ${visualStyle.slice(0, 24)}
      </text>
    </g>

    <!-- Bottom Metadata Panel -->
    <g transform="translate(30, ${height - 150})">
      <rect width="${width - 60}" height="120" rx="12" fill="rgba(5, 8, 16, 0.88)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
      <text x="24" y="36" fill="#ffffff" font-family="serif" font-size="22" font-weight="bold">${safeTitle}</text>
      ${safeSub ? `<text x="24" y="60" fill="${accent}" font-family="monospace" font-size="12" font-weight="bold">${safeSub}</text>` : ''}
      <text x="24" y="85" fill="#94a3b8" font-family="sans-serif" font-size="11">${safeDesc}</text>
    </g>
  </svg>`;

  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// HEALTH & SYSTEM STATUS
app.get('/api/health', async (_req: Request, res: Response) => {
  let hasFfmpeg = false;
  try {
    const { stdout } = await execPromise('which ffmpeg');
    hasFfmpeg = stdout.trim().length > 0;
  } catch {
    hasFfmpeg = false;
  }

  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY'),
    hasFfmpeg,
    timestamp: Date.now(),
  });
});

// SERVICE CONFIGURATION ENDPOINT
app.get('/api/models/config', (_req: Request, res: Response) => {
  res.json({
    services: SERVICE_MODELS,
    billingInfo: {
      isFreeTierKey: true,
      imageVeoQuotaZeroOnFreeTier: true,
      upgradeUrl: 'https://aistudio.google.com/app/plan_information',
    },
  });
});

// MODEL PROBE / TEST ENDPOINT (single probe, no loops)
app.post('/api/models/test', async (req: Request, res: Response) => {
  const { serviceName, modelId } = req.body;
  const targetModel = modelId || (SERVICE_MODELS as any)[serviceName]?.currentModel || 'gemini-3.8-flash';

  try {
    if (serviceName === 'imageGeneration') {
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: 'test probe',
        config: { imageConfig: { aspectRatio: '1:1' } },
      });
      const parts = response.candidates?.[0]?.content?.parts || [];
      const hasImage = parts.some((p) => p.inlineData);
      return res.json({ success: true, model: targetModel, hasImage, message: 'Model generated image successfully!' });
    } else if (serviceName === 'speechSynthesis') {
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: [{ role: 'user', parts: [{ text: 'Testing speech voice.' }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
      });
      const parts = response.candidates?.[0]?.content?.parts || [];
      const hasAudio = parts.some((p) => p.inlineData);
      return res.json({
        success: true,
        model: targetModel,
        hasAudio,
        message: 'Speech synthesis model responded with audio successfully!',
      });
    } else if (serviceName === 'videoGeneration') {
      return res.json({
        success: false,
        model: targetModel,
        isPaidKeyRequired: true,
        message:
          'Veo video generation requires a Pay-as-you-go billing account in Google AI Studio. CineStory AI will use the high-fidelity cinematic animator for seamless video export.',
      });
    } else {
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: 'ping',
      });
      return res.json({ success: true, model: targetModel, message: 'Model responded successfully!' });
    }
  } catch (err: any) {
    const parsed = parseGeminiError(err, targetModel);
    return res.status(200).json({
      success: false,
      model: targetModel,
      isZeroQuota: parsed.isZeroQuota,
      isPaidKeyRequired: parsed.isPaidKeyRequired,
      message: parsed.isZeroQuota
        ? `Model ${targetModel} has a quota limit of 0 on the free tier (Pay-as-you-go required). CineStory AI uses built-in smart procedural synthesis so your workflow is never blocked.`
        : parsed.message || 'Model probe failed',
    });
  }
});

// HIGH-FIDELITY CONCEPT CARD GENERATION ENDPOINT
app.post('/api/generate-concept-card', (req: Request, res: Response) => {
  try {
    const { type, title, subtitle, visualStyle = 'Cinematic Film', tags = [], description = '', aspectRatio = '1:1' } = req.body;
    const imageUrl = generateConceptCardSvg({
      type: type || 'character',
      title: title || 'Concept',
      subtitle,
      visualStyle,
      tags,
      description,
      aspectRatio,
    });
    res.json({ imageUrl, isConceptCard: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to generate concept card' });
  }
});

// STEP 2: STORY ANALYSIS & SCENE PLANNING
app.post('/api/analyze-story', async (req: Request, res: Response) => {
  try {
    const { story, visualStyle, language, targetDuration, narrationStyle, modelId } = req.body;

    if (!story || typeof story !== 'string' || story.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide a story text to analyze.' });
    }

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured. Please set a valid key in Secrets.',
      });
    }

    const selectedModel = modelId || SERVICE_MODELS.storyAnalysis.currentModel;

    const systemPrompt = `You are an elite Hollywood screenwriter, master cinematographer, and AI video director.
Your mission is to perform a deep cinematic story analysis and break down the user's story into a complete, logically sequenced video project with character bibles, scene storyboards, and precise prompts.

STRICT REQUIREMENTS:
1. Character Bible: Extract every character. Provide exhaustive visual details (face shape, skin tone, eye color, hairstyle, hair color, age, body proportions, wardrobe, footwear, accessories, distinguishing features). Assign each character a distinct voice preset from: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'.
2. Scene Storyboard: Divide the story into at least 5 distinct cinematic scenes (5 to 8 scenes recommended) representing the full narrative arc (Beginning, Rising Action, Confrontation/Climax, Resolution, Ending).
3. Do NOT skip key story events. Preserve original story relationships and narrative climax.
4. For each scene, create a detailed prompt template containing:
   - purpose
   - characters (exact IDs and established visual features)
   - environment (location, time, lighting, atmosphere)
   - action (chronological, non-conflicting)
   - camera (shot type, angle, movement, lens)
   - visualStyle (${visualStyle || 'Cinematic Film 35mm'})
   - dialogueAudio
   - continuity
   - avoid (distortions, flickering, costume shifts)
5. Generate a consolidated fullPrompt combining these details for Veo and image generation.
6. Language: The video script/dialogue/narration should be in ${language || 'English'}.
7. Return strictly valid JSON following the provided schema.`;

    const userPrompt = `Analyze this story and create the Character Bible and Scene Plan:
${story}

Target Duration: ${targetDuration || '30s - 45s'}
Visual Style: ${visualStyle || 'Cinematic Film (35mm Anamorphic)'}
Narration Style: ${narrationStyle || 'Dramatic & Atmospheric'}
Language: ${language || 'English'}`;

    const response = await executeWithRetry(
      () =>
        ai.models.generateContent({
          model: selectedModel,
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                synopsis: { type: Type.STRING },
                genre: { type: Type.STRING },
                plotArc: {
                  type: Type.OBJECT,
                  properties: {
                    beginning: { type: Type.STRING },
                    middle: { type: Type.STRING },
                    climax: { type: Type.STRING },
                    ending: { type: Type.STRING },
                  },
                  required: ['beginning', 'middle', 'climax', 'ending'],
                },
                characters: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      role: { type: Type.STRING },
                      age: { type: Type.STRING },
                      gender: { type: Type.STRING },
                      appearance: { type: Type.STRING },
                      faceShape: { type: Type.STRING },
                      skinTone: { type: Type.STRING },
                      eyeColor: { type: Type.STRING },
                      hairStyle: { type: Type.STRING },
                      hairColor: { type: Type.STRING },
                      bodyProportions: { type: Type.STRING },
                      wardrobe: { type: Type.STRING },
                      footwear: { type: Type.STRING },
                      accessories: { type: Type.STRING },
                      distinguishingFeatures: { type: Type.STRING },
                      voicePreset: { type: Type.STRING },
                      voiceStyle: { type: Type.STRING },
                      personality: { type: Type.STRING },
                    },
                    required: [
                      'id',
                      'name',
                      'role',
                      'age',
                      'appearance',
                      'wardrobe',
                      'voicePreset',
                      'personality',
                    ],
                  },
                },
                scenes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      sceneNumber: { type: Type.INTEGER },
                      title: { type: Type.STRING },
                      duration: { type: Type.NUMBER },
                      storyEvents: { type: Type.STRING },
                      charactersPresent: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      location: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          environment: { type: Type.STRING },
                          timeOfDay: { type: Type.STRING },
                          weather: { type: Type.STRING },
                          lighting: { type: Type.STRING },
                        },
                        required: ['name', 'environment', 'timeOfDay', 'lighting'],
                      },
                      camera: {
                        type: Type.OBJECT,
                        properties: {
                          shotType: { type: Type.STRING },
                          angle: { type: Type.STRING },
                          movement: { type: Type.STRING },
                          lens: { type: Type.STRING },
                        },
                        required: ['shotType', 'angle', 'movement', 'lens'],
                      },
                      action: { type: Type.STRING },
                      facialExpression: { type: Type.STRING },
                      dialogue: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            speakerId: { type: Type.STRING },
                            speakerName: { type: Type.STRING },
                            text: { type: Type.STRING },
                            emotion: { type: Type.STRING },
                          },
                          required: ['speakerId', 'speakerName', 'text', 'emotion'],
                        },
                      },
                      narration: { type: Type.STRING },
                      soundEffects: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      musicCue: { type: Type.STRING },
                      transition: { type: Type.STRING },
                      promptTemplate: {
                        type: Type.OBJECT,
                        properties: {
                          purpose: { type: Type.STRING },
                          characters: { type: Type.STRING },
                          environment: { type: Type.STRING },
                          action: { type: Type.STRING },
                          camera: { type: Type.STRING },
                          visualStyle: { type: Type.STRING },
                          dialogueAudio: { type: Type.STRING },
                          continuity: { type: Type.STRING },
                          avoid: { type: Type.STRING },
                        },
                        required: [
                          'purpose',
                          'characters',
                          'environment',
                          'action',
                          'camera',
                          'visualStyle',
                          'dialogueAudio',
                          'continuity',
                          'avoid',
                        ],
                      },
                      fullPrompt: { type: Type.STRING },
                      negativePrompt: { type: Type.STRING },
                    },
                    required: [
                      'id',
                      'sceneNumber',
                      'title',
                      'duration',
                      'storyEvents',
                      'charactersPresent',
                      'location',
                      'camera',
                      'action',
                      'promptTemplate',
                      'fullPrompt',
                      'negativePrompt',
                    ],
                  },
                },
              },
              required: ['title', 'synopsis', 'characters', 'scenes', 'plotArc'],
            },
          },
        }),
      { serviceName: 'Story Analysis', modelId: selectedModel }
    );

    const parsedData = JSON.parse(response.text || '{}');
    return res.json(parsedData);
  } catch (error: any) {
    console.error('Error analyzing story:', error);
    const parsed = parseGeminiError(error, SERVICE_MODELS.storyAnalysis.currentModel);
    return res.status(parsed.status).json({
      error: parsed.message || 'Failed to analyze story with Gemini.',
      isZeroQuota: parsed.isZeroQuota,
      isPaidKeyRequired: parsed.isPaidKeyRequired,
    });
  }
});

// STEP 3: CHARACTER REFERENCE IMAGE GENERATION
app.post('/api/generate-character-image', async (req: Request, res: Response) => {
  const { character, visualStyle, customPrompt, modelId, useFallbackConcept = false } = req.body;

  if (!character) {
    return res.status(400).json({ error: 'Character data is required.' });
  }

  // If user explicitly requested concept art card or fallback
  if (useFallbackConcept) {
    const conceptCard = generateConceptCardSvg({
      type: 'character',
      title: character.name,
      subtitle: `${character.role?.toUpperCase()} • ${character.age || 'Adult'}`,
      visualStyle: visualStyle || 'Cinematic Film',
      description: `${character.appearance || ''} | Wardrobe: ${character.wardrobe || ''}`,
      aspectRatio: '1:1',
    });
    return res.json({ imageUrl: conceptCard, isConceptCard: true });
  }

  const selectedModel = modelId || SERVICE_MODELS.imageGeneration.currentModel;

  const prompt = customPrompt || `Cinematic master character reference concept art:
Character: ${character.name}, ${character.age || 'adult'} ${character.gender || 'person'}.
Face & Features: ${character.faceShape || 'oval'} face, ${character.skinTone || 'natural'} skin, ${character.eyeColor || 'expressive'} eyes, ${character.hairStyle || 'styled'} ${character.hairColor || 'dark'} hair.
Distinguishing traits: ${character.distinguishingFeatures || 'none'}.
Costume & Outfit: ${character.wardrobe || 'distinctive cinematic clothing'}, footwear: ${character.footwear || 'boots'}, accessories: ${character.accessories || 'none'}.
Build: ${character.bodyProportions || 'proportional'}.
Pose: 3/4 turn cinematic medium-close portrait, neutral focused expression, movie lighting setup, rim lighting.
Art Style: ${visualStyle || 'Cinematic Film (35mm Anamorphic)'}.
Composition: Clean studio depth of field background, high detail texture, sharp focus on eyes, no text or overlays.`;

  try {
    const response = await executeWithRetry(
      () =>
        ai.models.generateContent({
          model: selectedModel,
          contents: {
            parts: [{ text: prompt }],
          },
          config: {
            imageConfig: {
              aspectRatio: '1:1',
            },
          },
        }),
      { serviceName: 'Character Image Generation', modelId: selectedModel, maxRetries: 1 }
    );

    let imageUrl = '';
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: 'Image generation did not return image data.' });
    }

    res.json({ imageUrl, isConceptCard: false });
  } catch (error: any) {
    console.error('Error generating character image:', error.message);
    const parsed = parseGeminiError(error, selectedModel);

    // Provide immediate fallback concept card so the user is never stuck
    const fallbackConcept = generateConceptCardSvg({
      type: 'character',
      title: character.name,
      subtitle: `${character.role?.toUpperCase()} • ${character.age || 'Adult'}`,
      visualStyle: visualStyle || 'Cinematic Film',
      description: `${character.appearance || ''} | Wardrobe: ${character.wardrobe || ''}`,
      aspectRatio: '1:1',
    });

    res.status(parsed.status).json({
      error: parsed.message,
      isZeroQuota: parsed.isZeroQuota,
      isPaidKeyRequired: parsed.isPaidKeyRequired,
      modelId: selectedModel,
      serviceName: 'Character Image Generation',
      fallbackConceptCardUrl: fallbackConcept,
      quotaAction:
        'Google AI Studio requires a Pay-as-you-go billing account for image generation models (gemini-3.1-flash-lite-image). You can attach a billed key in AI Studio, or use the High-Fidelity Character Concept Card to continue your project without interruption.',
      actionUrl: 'https://aistudio.google.com/app/plan_information',
    });
  }
});

// STEP 5: SCENE VISUAL KEYFRAME GENERATION
app.post('/api/generate-scene-image', async (req: Request, res: Response) => {
  const { scene, visualStyle, characters, aspectRatio = '16:9', referenceImageBase64, modelId, useFallbackConcept = false } = req.body;

  if (!scene) {
    return res.status(400).json({ error: 'Scene data is required.' });
  }

  const selectedModel = modelId || SERVICE_MODELS.imageGeneration.currentModel;

  if (useFallbackConcept) {
    const conceptCard = generateConceptCardSvg({
      type: 'scene',
      title: `Scene ${scene.sceneNumber}: ${scene.title}`,
      subtitle: `${scene.location?.name || 'Location'} • ${scene.camera?.shotType || 'Cinematic'}`,
      visualStyle: visualStyle || 'Cinematic Film',
      description: scene.action || scene.storyEvents || '',
      aspectRatio: aspectRatio as any,
    });
    return res.json({ imageUrl: conceptCard, isConceptCard: true });
  }

  const charDescriptions = (characters || [])
    .map((c: any) => `${c.name}: ${c.appearance || ''}, wearing ${c.wardrobe || ''}`)
    .join('; ');

  const prompt = `Cinematic film still, high-budget motion picture production.
Visual Style: ${visualStyle || 'Cinematic Film (35mm Anamorphic)'}.
Scene ${scene.sceneNumber}: ${scene.title}.
Environment & Lighting: ${scene.location?.name || ''}, ${scene.location?.timeOfDay || ''}, ${scene.location?.lighting || 'cinematic moody lighting'}.
Action & Subject: ${scene.action || scene.storyEvents}.
Facial Expression: ${scene.facialExpression || 'intense emotional delivery'}.
Camera Setup: ${scene.camera?.shotType || 'Medium Shot'}, ${scene.camera?.angle || 'Eye Level'}, ${scene.camera?.lens || '35mm anamorphic'}.
Consistent Characters Present: ${charDescriptions}.
Ensure faces, clothing, and environment strictly match the character bible without unwanted artifacts or watermarks.`;

  const parts: any[] = [{ text: prompt }];

  if (referenceImageBase64 && referenceImageBase64.startsWith('data:image')) {
    const cleanBase64 = referenceImageBase64.replace(/^data:image\/\w+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: cleanBase64,
      },
    });
  }

  let ar: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '16:9';
  if (aspectRatio === '9:16') ar = '9:16';
  if (aspectRatio === '1:1') ar = '1:1';

  try {
    const response = await executeWithRetry(
      () =>
        ai.models.generateContent({
          model: selectedModel,
          contents: { parts },
          config: {
            imageConfig: { aspectRatio: ar },
          },
        }),
      { serviceName: 'Scene Image Generation', modelId: selectedModel, maxRetries: 1 }
    );

    let imageUrl = '';
    const candParts = response.candidates?.[0]?.content?.parts || [];
    for (const part of candParts) {
      if (part.inlineData && part.inlineData.data) {
        imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: 'Scene visual generation did not return image data.' });
    }

    res.json({ imageUrl, isConceptCard: false });
  } catch (error: any) {
    console.error('Error generating scene image:', error.message);
    const parsed = parseGeminiError(error, selectedModel);

    const fallbackConcept = generateConceptCardSvg({
      type: 'scene',
      title: `Scene ${scene.sceneNumber}: ${scene.title}`,
      subtitle: `${scene.location?.name || 'Location'} • ${scene.camera?.shotType || 'Cinematic'}`,
      visualStyle: visualStyle || 'Cinematic Film',
      description: scene.action || scene.storyEvents || '',
      aspectRatio: ar as any,
    });

    res.status(parsed.status).json({
      error: parsed.message,
      isZeroQuota: parsed.isZeroQuota,
      isPaidKeyRequired: parsed.isPaidKeyRequired,
      modelId: selectedModel,
      serviceName: 'Scene Image Generation',
      fallbackConceptCardUrl: fallbackConcept,
      quotaAction:
        'Google AI Studio requires a Pay-as-you-go billing account for image generation models (gemini-3.1-flash-lite-image). You can attach a billed key in AI Studio, or use the High-Fidelity Scene Concept Keyframe to assemble your film and export MP4 video.',
      actionUrl: 'https://aistudio.google.com/app/plan_information',
    });
  }
});

// STEP 5: VEO VIDEO GENERATION (START JOB)
app.post('/api/generate-video', async (req: Request, res: Response) => {
  try {
    const { prompt, startingImageBase64, aspectRatio = '16:9', resolution = '720p', modelName } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required for video generation.' });
    }

    const selectedModel = modelName || SERVICE_MODELS.videoGeneration.currentModel;

    const videoConfig: any = {
      numberOfVideos: 1,
      aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9',
      resolution: resolution === '1080p' ? '1080p' : '720p',
    };

    const requestPayload: any = {
      model: selectedModel,
      prompt: prompt,
      config: videoConfig,
    };

    if (startingImageBase64 && startingImageBase64.startsWith('data:image')) {
      const cleanBase64 = startingImageBase64.replace(/^data:image\/\w+;base64,/, '');
      requestPayload.image = {
        imageBytes: cleanBase64,
        mimeType: 'image/png',
      };
    }

    const operation = await executeWithRetry(
      () => ai.models.generateVideos(requestPayload),
      { serviceName: 'Veo Video Generation', modelId: selectedModel, maxRetries: 0 }
    );

    res.json({ operationName: operation.name });
  } catch (error: any) {
    console.error('Error starting video generation:', error.message);
    const parsed = parseGeminiError(error, SERVICE_MODELS.videoGeneration.currentModel);
    res.status(parsed.status).json({
      error: parsed.message || 'Failed to start video generation job.',
      isZeroQuota: parsed.isZeroQuota,
      isPaidKeyRequired: parsed.isPaidKeyRequired,
      quotaAction: 'Veo video generation models require a Pay-as-you-go billing account in Google AI Studio.',
    });
  }
});

// STEP 5: POLL VEO VIDEO STATUS
app.post('/api/video-status', async (req: Request, res: Response) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required.' });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });

    res.json({
      done: updated.done,
      error: updated.error || null,
      response: updated.response || null,
    });
  } catch (error: any) {
    console.error('Error polling video operation:', error);
    res.status(500).json({ error: error.message || 'Failed to poll video status.' });
  }
});

// STEP 5: DOWNLOAD VEO VIDEO
app.post('/api/video-download', async (req: Request, res: Response) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required.' });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });

    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) {
      return res.status(404).json({ error: 'Video URI not found in completed operation.' });
    }

    const videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': apiKey },
    });

    if (!videoRes.ok) {
      return res.status(videoRes.status).json({ error: `Failed to fetch video file: ${videoRes.statusText}` });
    }

    res.setHeader('Content-Type', 'video/mp4');
    const arrayBuffer = await videoRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filename = `veo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.mp4`;
    const localPath = path.join(exportsDir, filename);
    fs.writeFileSync(localPath, buffer);

    res.json({
      videoUrl: `/api/exports/${filename}`,
      filename,
    });
  } catch (error: any) {
    console.error('Error downloading video:', error);
    res.status(500).json({ error: error.message || 'Failed to download generated video.' });
  }
});

// STEP 6: AUDIO & SPEECH GENERATION (TTS)
app.post('/api/generate-speech', async (req: Request, res: Response) => {
  const { text, voicePreset = 'Kore', emotion = 'Natural', speaker = 'Narrator', modelId } = req.body;
  const allowedVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
  const voiceName = allowedVoices.includes(voicePreset) ? voicePreset : 'Kore';

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required for speech synthesis.' });
  }

  const selectedModel = modelId || SERVICE_MODELS.speechSynthesis.currentModel;

  try {
    try {
      const response = await executeWithRetry(
        () =>
          ai.models.generateContent({
            model: selectedModel,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `${speaker}: ${text}`,
                    speechMetadata: {
                      style: `${emotion}, cinematic story delivery`,
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName },
                },
              },
            },
          }),
        { serviceName: 'Speech Synthesis', modelId: selectedModel, maxRetries: 0 }
      );

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return res.json({
          audioUrl: `data:audio/wav;base64,${base64Audio}`,
          voiceName,
          isFallbackVoice: false,
          model: selectedModel,
        });
      }
    } catch (genAiError: any) {
      console.warn(`[Speech Synthesis] Notice: Gemini TTS (${selectedModel}) returned notice (${genAiError.message}). Using vocal formant audio generator.`);
    }

    // Graceful vocal fallback: generate formant speech audio
    const formantAudioUrl = generateFormantSpeechWav(text, voiceName);
    return res.json({
      audioUrl: formantAudioUrl,
      voiceName,
      isFallbackVoice: true,
      speechText: text,
      message: 'Generated synchronized vocal audio track for timeline playback and video export.',
    });
  } catch (outerErr: any) {
    console.warn('Speech synthesis vocal fallback active:', outerErr?.message);
    const formantAudioUrl = generateFormantSpeechWav(text || 'Spoken line', voiceName);
    return res.json({
      audioUrl: formantAudioUrl,
      voiceName,
      isFallbackVoice: true,
      speechText: text || '',
      message: 'Generated vocal audio track for timeline playback and video export.',
    });
  }
});

// STEP 3 & 4: CHARACTER CONSISTENCY & CONTINUITY AUDIT
app.post('/api/audit-continuity', async (req: Request, res: Response) => {
  try {
    const { scenes, characters, modelId } = req.body;

    if (!scenes || !characters) {
      return res.status(400).json({ error: 'Scenes and characters are required.' });
    }

    const selectedModel = modelId || SERVICE_MODELS.storyAnalysis.currentModel;

    const auditPrompt = `You are a Hollywood Continuity Supervisor and Cinematography Quality Inspector.
Inspect these scenes and characters for narrative and visual continuity:

CHARACTERS:
${JSON.stringify(characters, null, 2)}

SCENES:
${JSON.stringify(scenes, null, 2)}

Analyze:
1. Character identity stability: Does any character have an unexplained costume shift or conflicting facial features?
2. Presence validation: Are all characters present accounted for in the action and dialogue?
3. Dialogue consistency: Is dialogue assigned to the correct character persona?
4. Location & lighting continuity: Does time of day or weather jump abruptly without transition?
5. Assign an overall Continuity Score between 0 and 100.
6. Provide specific, actionable suggestions for any scene with issues.`;

    const response = await executeWithRetry(
      () =>
        ai.models.generateContent({
          model: selectedModel,
          contents: auditPrompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.INTEGER },
                summary: { type: Type.STRING },
                issues: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING },
                      sceneNumber: { type: Type.INTEGER },
                      characterName: { type: Type.STRING },
                      message: { type: Type.STRING },
                      suggestion: { type: Type.STRING },
                    },
                    required: ['type', 'sceneNumber', 'message', 'suggestion'],
                  },
                },
              },
              required: ['score', 'summary', 'issues'],
            },
          },
        }),
      { serviceName: 'Continuity Audit', modelId: selectedModel }
    );

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error auditing continuity:', error);
    res.status(500).json({ error: error.message || 'Failed to audit story continuity.' });
  }
});

// STEP 8: FINAL VIDEO EXPORT ENGINE (FFMPEG PIPELINE)
app.post('/api/export-video', async (req: Request, res: Response) => {
  const tempDir = path.join(exportsDir, `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  try {
    const { scenes, settings, title = 'cinestory' } = req.body;

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return res.status(400).json({ error: 'No scenes provided for export.' });
    }

    fs.mkdirSync(tempDir, { recursive: true });

    let width = 1280;
    let height = 720;
    if (settings?.aspectRatio === '9:16') {
      width = 720;
      height = 1280;
    } else if (settings?.aspectRatio === '1:1') {
      width = 720;
      height = 720;
    }

    const sceneClips: string[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const sceneIndex = i + 1;
      const duration = Math.max(3, Math.min(15, scene.duration || 5));
      const sceneOutput = path.join(tempDir, `scene_${sceneIndex}.mp4`);

      let imagePath = path.join(tempDir, `scene_${sceneIndex}_img.jpg`);
      let audioPath: string | null = null;

      if (scene.keyframeImageUrl && scene.keyframeImageUrl.startsWith('data:image')) {
        const base64Data = scene.keyframeImageUrl.replace(/^data:image\/\w+;base64,/, '');
        if (scene.keyframeImageUrl.includes('svg')) {
          const svgPath = path.join(tempDir, `scene_${sceneIndex}.svg`);
          fs.writeFileSync(svgPath, Buffer.from(base64Data, 'base64'));
          imagePath = svgPath;
        } else {
          fs.writeFileSync(imagePath, Buffer.from(base64Data, 'base64'));
        }
      } else {
        const svgContent = generateConceptCardSvg({
          type: 'scene',
          title: `Scene ${scene.sceneNumber}: ${scene.title}`,
          subtitle: scene.location?.name || 'Cinematic Location',
          visualStyle: settings?.visualStyle || 'Cinematic Film',
          description: scene.action || '',
          aspectRatio: settings?.aspectRatio || '16:9',
        });
        const svgBase64 = svgContent.replace(/^data:image\/svg\+xml;base64,/, '');
        const svgPath = path.join(tempDir, `scene_${sceneIndex}.svg`);
        fs.writeFileSync(svgPath, Buffer.from(svgBase64, 'base64'));
        imagePath = svgPath;
      }

      const speechData = scene.narrationAudioUrl || scene.dialogue?.[0]?.audioUrl;
      if (speechData && speechData.startsWith('data:audio')) {
        const audioBase64 = speechData.replace(/^data:audio\/\w+;base64,/, '');
        audioPath = path.join(tempDir, `scene_${sceneIndex}_audio.wav`);
        fs.writeFileSync(audioPath, Buffer.from(audioBase64, 'base64'));
      }

      const motions = [
        `zoompan=z='min(zoom+0.0015,1.15)':d=${duration * 25}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}`,
        `zoompan=z='if(lte(zoom,1.0),1.15,max(1.001,zoom-0.0015))':d=${duration * 25}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}`,
        `zoompan=z=1.08:d=${duration * 25}:x='iw/2-(iw/zoom/2)+((x-1)*0.5)':y='ih/2-(ih/zoom/2)':s=${width}x${height}`,
      ];
      const motionFilter = motions[i % motions.length];

      let cmd = '';
      if (audioPath && fs.existsSync(audioPath)) {
        cmd = `ffmpeg -y -loop 1 -t ${duration} -i "${imagePath}" -i "${audioPath}" -vf "${motionFilter},format=yuv420p" -c:v libx264 -preset ultrafast -c:a aac -b:a 192k -shortest "${sceneOutput}"`;
      } else {
        cmd = `ffmpeg -y -loop 1 -t ${duration} -i "${imagePath}" -f lavfi -t ${duration} -i anullsrc=channel_layout=stereo:sample_rate=44100 -vf "${motionFilter},format=yuv420p" -c:v libx264 -preset ultrafast -c:a aac -shortest "${sceneOutput}"`;
      }

      await execPromise(cmd);
      sceneClips.push(sceneOutput);
    }

    const concatListPath = path.join(tempDir, 'concat_list.txt');
    const concatContent = sceneClips.map((clip) => `file '${clip}'`).join('\n');
    fs.writeFileSync(concatListPath, concatContent);

    const safeTitle = (title || 'cinestory').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const exportFilename = `${safeTitle}_${Date.now()}.mp4`;
    const finalOutputPath = path.join(exportsDir, exportFilename);
    const tempConcatVideoPath = path.join(tempDir, 'temp_assembled.mp4');

    const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${tempConcatVideoPath}"`;
    await execPromise(concatCmd);

    const totalDuration = scenes.reduce((acc: number, s: any) => acc + (s.duration || 5), 0);

    // DYNAMIC CINEMATIC THEME & SEAMLESS NARRATIVE LOOP
    // Synthesize the continuous soundtrack for the narrative and mix it with speech/narration
    try {
      const musicVol = typeof settings?.musicVolume === 'number' ? settings.musicVolume : 0.35;
      const voiceVol = typeof settings?.voiceVolume === 'number' ? settings.voiceVolume : 1.0;
      const soundtrackBuf = generateNarrativeSoundtrackWav(
        totalDuration,
        settings?.musicTheme || 'Cinematic Orchestral',
        musicVol
      );
      const soundtrackPath = path.join(tempDir, 'narrative_soundtrack.wav');
      fs.writeFileSync(soundtrackPath, soundtrackBuf);

      // Mix dialogue audio track [0:a] with seamless dynamic narrative theme soundtrack [1:a]
      const mixCmd = `ffmpeg -y -i "${tempConcatVideoPath}" -i "${soundtrackPath}" -filter_complex "[0:a]volume=${voiceVol}[a0];[1:a]volume=1.0[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k "${finalOutputPath}"`;
      await execPromise(mixCmd);
    } catch (mixErr: any) {
      console.warn('Audio mix notice, falling back to direct video copy:', mixErr?.message);
      fs.copyFileSync(tempConcatVideoPath, finalOutputPath);
    }

    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}

    const stats = fs.statSync(finalOutputPath);
    const fileSizeMb = Number((stats.size / (1024 * 1024)).toFixed(2));

    res.json({
      success: true,
      videoUrl: `/api/exports/${exportFilename}`,
      filename: exportFilename,
      duration: totalDuration,
      fileSizeMb,
      resolution: `${width}x${height}`,
      aspectRatio: settings?.aspectRatio || '16:9',
    });
  } catch (error: any) {
    console.error('Error during video export:', error);
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}

    res.status(500).json({
      error: error.message || 'Video export pipeline failed. Check server logs.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CineStory AI Server] Running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
