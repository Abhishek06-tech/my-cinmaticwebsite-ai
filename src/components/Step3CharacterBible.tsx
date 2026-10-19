import React, { useState } from 'react';
import { Users, Sparkles, CheckCircle2, Lock, Unlock, RefreshCw, Upload, Plus, Trash2, ArrowRight, ArrowLeft, ShieldCheck, AlertTriangle, ExternalLink, SlidersHorizontal, Image as ImageIcon } from 'lucide-react';
import { CharacterItem, StoryProject } from '../types/cineStory';
import { generateCharacterImage, QuotaExhaustedError } from '../services/api';

interface Step3Props {
  project: StoryProject;
  onUpdateCharacter: (characterId: string, updated: Partial<CharacterItem>) => void;
  onAddCharacter: (character: CharacterItem) => void;
  onDeleteCharacter: (characterId: string) => void;
  onOpenModelSettings: () => void;
  onNext: () => void;
  onBack: () => void;
  imageModelId: string;
}

export const Step3CharacterBible: React.FC<Step3Props> = ({
  project,
  onUpdateCharacter,
  onAddCharacter,
  onDeleteCharacter,
  onOpenModelSettings,
  onNext,
  onBack,
  imageModelId,
}) => {
  const [generatingIds, setGeneratingIds] = useState<Record<string, boolean>>({});
  const [activeCharId, setActiveCharId] = useState<string>(project.characters[0]?.id || '');
  const [quotaWarning, setQuotaWarning] = useState<{
    message: string;
    actionRequired?: string;
    actionUrl?: string;
    charId?: string;
  } | null>(null);

  const activeChar = project.characters.find((c) => c.id === activeCharId) || project.characters[0];

  const handleGeneratePortrait = async (character: CharacterItem, useFallbackConcept: boolean = false) => {
    setGeneratingIds((prev) => ({ ...prev, [character.id]: true }));
    setQuotaWarning(null);

    try {
      const res = await generateCharacterImage(
        character,
        project.settings.visualStyle,
        undefined,
        imageModelId,
        useFallbackConcept
      );

      onUpdateCharacter(character.id, {
        referenceImageUrl: res.imageUrl,
        isApproved: true,
      });
    } catch (err: any) {
      const qErr = err as QuotaExhaustedError;
      if (qErr.isZeroQuota || err.message?.includes('limit: 0') || err.message?.includes('quota')) {
        setQuotaWarning({
          message: `The model ${imageModelId} has quota limit 0 on the free tier. Google AI Studio requires a Pay-as-you-go billing account for image generation.`,
          actionRequired: qErr.quotaAction || 'Upgrade your plan or attach a billed API key in Google AI Studio.',
          actionUrl: qErr.actionUrl || 'https://aistudio.google.com/app/plan_information',
          charId: character.id,
        });

        // If the server provided a fallback concept card, allow the user to use it immediately
        if (qErr.fallbackConceptCardUrl) {
          onUpdateCharacter(character.id, {
            referenceImageUrl: qErr.fallbackConceptCardUrl,
            isApproved: true,
          });
        }
      } else {
        alert(`Generation error: ${err.message}`);
      }
    } finally {
      setGeneratingIds((prev) => ({ ...prev, [character.id]: false }));
    }
  };

  // Requirement 7: Allow retrying only failed generation tasks after access is restored
  const failedCharacters = project.characters.filter((c) => !c.referenceImageUrl);

  const handleRetryFailedOnly = async () => {
    for (const char of failedCharacters) {
      await handleGeneratePortrait(char, false);
    }
  };

  const handleGenerateAllConceptCards = async () => {
    for (const char of project.characters) {
      if (!char.referenceImageUrl) {
        await handleGeneratePortrait(char, true);
      }
    }
  };

  const handleCustomUpload = (charId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onUpdateCharacter(charId, {
            referenceImageUrl: reader.result,
            isApproved: true,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateNewCharacter = () => {
    const newId = `char_${Date.now()}`;
    const newChar: CharacterItem = {
      id: newId,
      name: 'New Character',
      role: 'supporting',
      age: '28',
      gender: 'Any',
      appearance: 'Distinctive cinematic figure',
      faceShape: 'Oval',
      skinTone: 'Warm olive',
      eyeColor: 'Hazel',
      hairStyle: 'Short textured',
      hairColor: 'Dark brown',
      bodyProportions: 'Athletic, 5ft 10in',
      wardrobe: 'Tailored leather jacket, dark jeans',
      footwear: 'Combat boots',
      accessories: 'Silver signet ring',
      distinguishingFeatures: 'Slight scar across right cheek',
      voicePreset: 'Kore',
      voiceStyle: 'Calm, measured',
      personality: 'Observant, loyal',
      isApproved: false,
    };
    onAddCharacter(newChar);
    setActiveCharId(newId);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Character Consistency Engine
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white font-cinema">
            Project Character Bible
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Establish permanent visual and vocal specifications for each character. Approved references will condition every scene.
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

          {failedCharacters.length > 0 && (
            <button
              onClick={handleRetryFailedOnly}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-xs font-semibold text-amber-300 transition"
              title="Retry only characters without reference images"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Failed ({failedCharacters.length})</span>
            </button>
          )}

          <button
            onClick={handleGenerateAllConceptCards}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-300 transition"
            title="Generate high-fidelity concept art cards for all characters"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Concept Cards</span>
          </button>

          <button
            onClick={onNext}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white text-sm font-semibold shadow-lg shadow-rose-500/20 transition cursor-pointer"
          >
            <span>Proceed to Storyboard</span>
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
              <h4 className="font-bold text-white text-sm">Image Model Quota Limit (Free Tier = 0)</h4>
              <p className="text-slate-300">{quotaWarning.message}</p>
              <p className="text-slate-400">{quotaWarning.actionRequired}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {quotaWarning.charId && (
              <button
                onClick={() => {
                  const c = project.characters.find((x) => x.id === quotaWarning.charId);
                  if (c) handleGeneratePortrait(c, true);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-bold border border-emerald-500/30 transition"
              >
                Use Concept Card
              </button>
            )}
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

      {/* Main Studio Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Character List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
              Characters ({project.characters.length})
            </span>
            <button
              onClick={handleCreateNewCharacter}
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Character</span>
            </button>
          </div>

          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {project.characters.map((char) => {
              const isActive = activeChar?.id === char.id;
              const isGen = generatingIds[char.id];

              return (
                <div
                  key={char.id}
                  onClick={() => setActiveCharId(char.id)}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex items-center gap-3 group relative ${
                    isActive
                      ? 'bg-[#151928] border-amber-500/60 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-900/40 hover:bg-slate-900/80 border-white/5'
                  }`}
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-950 border border-white/10 shrink-0 flex items-center justify-center relative">
                    {char.referenceImageUrl ? (
                      <img
                        src={char.referenceImageUrl}
                        alt={char.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="w-6 h-6 text-slate-600" />
                    )}
                    {isGen && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-white text-sm truncate group-hover:text-amber-300">
                        {char.name}
                      </h4>
                      {char.isApproved ? (
                        <span title="Reference Locked & Approved">
                          <Lock className="w-3.5 h-3.5 text-emerald-400" />
                        </span>
                      ) : (
                        <span title="Draft / Unapproved">
                          <Unlock className="w-3.5 h-3.5 text-slate-500" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 capitalize">
                      {char.role} • {char.age} yrs • {char.voicePreset}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono-code truncate block">
                      {char.wardrobe || 'Costume unassigned'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Character Detail & Reference Studio */}
        {activeChar && (
          <div className="lg:col-span-8 bg-[#0f121d] border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white font-cinema">{activeChar.name}</h3>
                  <span className="text-xs uppercase font-mono-code px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {activeChar.role}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  ID: <span className="font-mono-code text-slate-300">{activeChar.id}</span> • Voice: <span className="text-slate-300">{activeChar.voicePreset}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    onUpdateCharacter(activeChar.id, { isApproved: !activeChar.isApproved })
                  }
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    activeChar.isApproved
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {activeChar.isApproved ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Approved & Locked</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Click to Approve</span>
                    </>
                  )}
                </button>

                {project.characters.length > 1 && (
                  <button
                    onClick={() => onDeleteCharacter(activeChar.id)}
                    className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Delete Character"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Reference Image + Studio Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6">
              {/* Reference Image Preview */}
              <div className="sm:col-span-5 flex flex-col items-center">
                <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-white/15 relative shadow-xl group">
                  {activeChar.referenceImageUrl ? (
                    <img
                      src={activeChar.referenceImageUrl}
                      alt={activeChar.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                      <Users className="w-12 h-12 text-slate-700 mb-2" />
                      <p className="text-xs text-slate-500">
                        No reference portrait yet. Click generate or create concept card below.
                      </p>
                    </div>
                  )}

                  {generatingIds[activeChar.id] && (
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-amber-300 font-mono-code">Generating Reference...</span>
                    </div>
                  )}
                </div>

                {/* Portrait Actions */}
                <div className="flex flex-wrap items-center gap-2 w-full mt-3">
                  <button
                    onClick={() => handleGeneratePortrait(activeChar, false)}
                    disabled={generatingIds[activeChar.id]}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold transition"
                    title="Generate with configured Gemini Image Model"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${generatingIds[activeChar.id] ? 'animate-spin' : ''}`} />
                    <span>AI Generate</span>
                  </button>

                  <button
                    onClick={() => handleGeneratePortrait(activeChar, true)}
                    disabled={generatingIds[activeChar.id]}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition"
                    title="Create instant concept card (bypasses quota limits)"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Concept Card</span>
                  </button>

                  <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleCustomUpload(activeChar.id, e)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Physical Traits & Visual Specification */}
              <div className="sm:col-span-7 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 font-medium block mb-1">Character Name</label>
                    <input
                      type="text"
                      value={activeChar.name}
                      onChange={(e) => onUpdateCharacter(activeChar.id, { name: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-medium block mb-1">Voice Preset</label>
                    <select
                      value={activeChar.voicePreset}
                      onChange={(e) =>
                        onUpdateCharacter(activeChar.id, { voicePreset: e.target.value as any })
                      }
                      className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Kore">Kore (Warm, Resolute, Melodic)</option>
                      <option value="Puck">Puck (Energetic, Inquisitive, Sharp)</option>
                      <option value="Fenrir">Fenrir (Deep, Authoritative, Resonant)</option>
                      <option value="Charon">Charon (Calm, Deep, Mysterious)</option>
                      <option value="Zephyr">Zephyr (Smooth, Analytical, Modern)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-slate-400 font-medium block mb-1">Age</label>
                    <input
                      type="text"
                      value={activeChar.age}
                      onChange={(e) => onUpdateCharacter(activeChar.id, { age: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-medium block mb-1">Hair Style / Color</label>
                    <input
                      type="text"
                      value={`${activeChar.hairStyle || ''} ${activeChar.hairColor || ''}`}
                      onChange={(e) => onUpdateCharacter(activeChar.id, { hairStyle: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-medium block mb-1">Eye Color</label>
                    <input
                      type="text"
                      value={activeChar.eyeColor}
                      onChange={(e) => onUpdateCharacter(activeChar.id, { eyeColor: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <label className="text-slate-400 font-medium block">
                    Permanent Costume & Wardrobe (Conditioned in Every Scene)
                  </label>
                  <textarea
                    rows={2}
                    value={activeChar.wardrobe}
                    onChange={(e) => onUpdateCharacter(activeChar.id, { wardrobe: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white text-xs resize-none"
                  />
                </div>

                <div className="text-xs space-y-1">
                  <label className="text-slate-400 font-medium block">
                    Distinguishing Features & Accessories
                  </label>
                  <textarea
                    rows={2}
                    value={`${activeChar.accessories || ''}. ${activeChar.distinguishingFeatures || ''}`}
                    onChange={(e) =>
                      onUpdateCharacter(activeChar.id, {
                        distinguishingFeatures: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white text-xs resize-none"
                  />
                </div>

                <div className="bg-slate-950/80 border border-white/5 rounded-xl p-3 flex items-center gap-3 text-xs text-slate-300">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Consistency Rule:</strong> When approved, this character's visual tags and portrait reference are injected into every scene prompt where they appear.
                  </span>
                </div>
              </div>
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
          <span>Back to Analysis</span>
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-semibold shadow-lg shadow-rose-500/20 transition cursor-pointer"
        >
          <span>Continue to Scene Storyboard</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
