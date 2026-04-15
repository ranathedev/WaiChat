import { useEffect, useRef, useState } from "react";
import type { Model } from "../hooks/useModels";
import type { StorageMode } from "../storage";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  storageMode: StorageMode;
  onStorageModeChange: (mode: StorageMode) => void;
  defaultModel: string;
  onDefaultModelChange: (model: string) => void;
  systemPrompt: string;
  onSystemPromptChange: (prompt: string) => void;
  models: Model[];
  onClearConversations: (mode: StorageMode) => void;
}

export default function SettingsModal({
  open,
  onClose,
  storageMode,
  onStorageModeChange,
  defaultModel,
  onDefaultModelChange,
  systemPrompt,
  onSystemPromptChange,
  models,
  onClearConversations,
}: SettingsModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Local draft state — only committed on Save
  const [draftStorageMode, setDraftStorageMode] = useState<StorageMode>(storageMode);
  const [draftModel, setDraftModel] = useState(defaultModel);
  const [draftSystemPrompt, setDraftSystemPrompt] = useState(systemPrompt);

  // Sync draft with props when modal opens
  useEffect(() => {
    if (open) {
      setDraftStorageMode(storageMode);
      setDraftModel(defaultModel);
      setDraftSystemPrompt(systemPrompt);
    }
  }, [open, storageMode, defaultModel, systemPrompt]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel();
    };
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    onStorageModeChange(draftStorageMode);
    onDefaultModelChange(draftModel);
    onSystemPromptChange(draftSystemPrompt);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-opacity"
      onClick={(e) => {
        if (e.target === overlayRef.current) handleCancel();
      }}
    >
      <div className="w-full max-w-md bg-[#1e1e20]/95 backdrop-blur-2xl border-[0.5px] border-white/10 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-[0.5px] border-white/10 shrink-0">
          <h2 className="text-base md:text-lg font-semibold text-white/95 tracking-tight">
            Settings
          </h2>
          <button
            onClick={handleCancel}
            className="text-white/40 hover:text-white/95 transition-colors focus:outline-none"
            aria-label="Close settings"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 stroke-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-6 space-y-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
          {/* Preferences */}
          <section>
            <h3 className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">
              Preferences
            </h3>
            <div className="space-y-5">
              {/* Storage mode Segmented Control */}
              <div>
                <label className="block text-[13px] md:text-sm font-medium text-white/80 mb-2">
                  Storage Mode
                </label>
                <div className="flex rounded-xl bg-black/20 p-1 border-[0.5px] border-white/10">
                  {(["cloud", "local"] as StorageMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setDraftStorageMode(mode)}
                      className={`flex-1 py-1.5 text-[13px] md:text-sm font-medium rounded-lg transition-all duration-200 ${
                        draftStorageMode === mode
                          ? "bg-white/15 text-white/95 shadow-sm"
                          : "text-white/65 hover:text-white/95 hover:bg-white/5"
                      }`}
                    >
                      {mode === "cloud" ? "☁️ Cloud (D1)" : "💾 Local (Browser)"}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-white/40 leading-relaxed">
                  {draftStorageMode === "cloud"
                    ? "Conversations saved to Cloudflare D1. Persists across devices."
                    : "Conversations saved in your browser. Never leaves your device."}
                </p>
              </div>

              {/* Default model */}
              <div>
                <label className="block text-[13px] md:text-sm font-medium text-white/80 mb-2">
                  Default Model
                </label>
                <select
                  value={draftModel}
                  onChange={(e) => setDraftModel(e.target.value)}
                  className="w-full text-base md:text-sm bg-black/20 border-[0.5px] border-white/10 rounded-xl px-3 py-2.5 text-white/95 outline-none focus:border-[#0A84FF] focus:bg-black/30 transition-colors [&>option]:bg-[#1e1e20] [&>option]:text-white/95"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* System prompt */}
              <div>
                <label className="block text-[13px] md:text-sm font-medium text-white/80 mb-2">
                  System Prompt
                </label>
                <textarea
                  value={draftSystemPrompt}
                  onChange={(e) => setDraftSystemPrompt(e.target.value)}
                  placeholder="You are a helpful assistant..."
                  rows={4}
                  className="w-full text-base md:text-sm bg-black/20 border-[0.5px] border-white/10 rounded-xl px-3 py-2.5 text-white/95 placeholder:text-white/30 outline-none focus:border-[#0A84FF] focus:bg-black/30 transition-colors resize-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full"
                />
                <p className="mt-1.5 text-xs text-white/40">Applied to all new conversations.</p>
              </div>
            </div>
          </section>

          {/* Conversations */}
          <section>
            <h3 className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">
              Conversations
            </h3>
            <div className="space-y-3">
              {/* Cloud */}
              <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/5 border-[0.5px] border-white/10">
                <div>
                  <p className="text-[13px] md:text-sm font-medium text-white/95">☁️ Cloud (D1)</p>
                  <p className="text-[11px] md:text-xs text-white/40 mt-0.5">
                    Stored in Cloudflare D1
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm("Delete all cloud conversations? This cannot be undone.")) {
                      onClearConversations("cloud");
                    }
                  }}
                  className="text-[11px] md:text-xs font-medium text-red-400 hover:text-red-300 border-[0.5px] border-red-500/30 hover:bg-red-500/20 rounded-lg px-3 py-1.5 transition-all focus:outline-none"
                >
                  Clear
                </button>
              </div>

              {/* Local */}
              <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/5 border-[0.5px] border-white/10">
                <div>
                  <p className="text-[13px] md:text-sm font-medium text-white/95">
                    💾 Local (Browser)
                  </p>
                  <p className="text-[11px] md:text-xs text-white/40 mt-0.5">
                    Stored in browser localStorage
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm("Delete all local conversations? This cannot be undone.")) {
                      onClearConversations("local");
                    }
                  }}
                  className="text-[11px] md:text-xs font-medium text-red-400 hover:text-red-300 border-[0.5px] border-red-500/30 hover:bg-red-500/20 rounded-lg px-3 py-1.5 transition-all focus:outline-none"
                >
                  Clear
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t-[0.5px] border-white/10 flex gap-3 shrink-0 bg-white/[0.02]">
          <button
            onClick={handleCancel}
            className="flex-1 py-2.5 text-[13px] md:text-sm font-medium text-white/80 bg-white/5 border-[0.5px] border-white/10 hover:bg-white/10 hover:text-white/95 rounded-xl transition-all focus:outline-none"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 text-[13px] md:text-sm font-medium text-white bg-[#0A84FF] hover:bg-[#0070E0] rounded-xl shadow-[0_2px_8px_rgba(10,132,255,0.3)] transition-all focus:outline-none"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
