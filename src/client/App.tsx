import { useEffect, useState } from "react";
import { useChat } from "./hooks/useChat";
import { useModels, DEFAULT_MODEL_ID } from "./hooks/useModels";
import type { StorageMode } from "./storage";
import Sidebar from "./components/Sidebar";
import MessageList from "./components/MessageList";
import ChatInput from "./components/ChatInput";
import ModelPicker from "./components/ModelPicker";
import SettingsModal from "./components/SettingsModal";

const STORAGE_MODE_KEY = "waichat:storage-mode";
const SYSTEM_PROMPT_KEY = "waichat:system-prompt";
const DEFAULT_MODEL_KEY = "waichat:default-model";

export default function App() {
  const [storageMode, setStorageMode] = useState<StorageMode>(() => {
    const stored = localStorage.getItem(STORAGE_MODE_KEY);
    return stored === "local" ? "local" : "cloud";
  });

  const {
    conversations,
    activeConversation,
    messages,
    isStreaming,
    error,
    loadConversations,
    selectConversation,
    newConversation,
    deleteConversation,
    sendMessage,
  } = useChat(storageMode);

  const { models } = useModels();
  const [model, setModel] = useState(
    () => localStorage.getItem(DEFAULT_MODEL_KEY) ?? DEFAULT_MODEL_ID
  );
  const [systemPrompt, setSystemPrompt] = useState(
    () => localStorage.getItem(SYSTEM_PROMPT_KEY) ?? ""
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleNew = async () => {
    await newConversation(model);
  };

  const handleSend = async (content: string) => {
    if (isStreaming) return;
    if (!activeConversation) {
      const convo = await newConversation(model);
      await sendMessage(content, model, convo.id, storageMode, systemPrompt);
    } else {
      await sendMessage(content, model, activeConversation.id, storageMode, systemPrompt);
    }
  };

  const handleStorageToggle = (next: StorageMode) => {
    setStorageMode(next);
    localStorage.setItem(STORAGE_MODE_KEY, next);
  };

  const handleDefaultModelChange = (m: string) => {
    setModel(m);
    localStorage.setItem(DEFAULT_MODEL_KEY, m);
  };

  const handleSystemPromptChange = (prompt: string) => {
    setSystemPrompt(prompt);
    localStorage.setItem(SYSTEM_PROMPT_KEY, prompt);
  };

  const handleClearConversations = async (mode: StorageMode) => {
    if (mode === "cloud") {
      await fetch("/api/conversations", { method: "DELETE" });
    } else {
      // Clear localStorage conversations and messages
      const keys = Object.keys(localStorage).filter(
        (k) => k.startsWith("waichat:conversations") || k.startsWith("waichat:messages:")
      );
      keys.forEach((k) => localStorage.removeItem(k));
    }
    await loadConversations();
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Sidebar
        conversations={conversations}
        activeId={activeConversation?.id ?? null}
        onSelect={selectConversation}
        onNew={handleNew}
        onDelete={deleteConversation}
        onSettingsOpen={() => setSettingsOpen(true)}
      />

      <main className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <ModelPicker
            models={models}
            value={model}
            onChange={handleDefaultModelChange}
            disabled={isStreaming}
          />
          <div className="relative group">
            <button className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 transition-colors">
              {storageMode === "cloud" ? "☁️ Cloud" : "💾 Local"}
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 8L1 3h10z" />
              </svg>
            </button>
            <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              {(["cloud", "local"] as StorageMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleStorageToggle(mode)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    storageMode === mode ? "bg-indigo-50 dark:bg-indigo-950" : ""
                  }`}
                >
                  <span className="text-base mt-0.5">{mode === "cloud" ? "☁️" : "💾"}</span>
                  <div>
                    <p className={`text-sm font-medium ${storageMode === mode ? "text-indigo-600 dark:text-indigo-400" : "text-gray-700 dark:text-gray-300"}`}>
                      {mode === "cloud" ? "Cloud (D1)" : "Local (Browser)"}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">
                      {mode === "cloud"
                        ? "Syncs across devices via Cloudflare D1"
                        : "Stays in your browser, never uploaded"}
                    </p>
                  </div>
                  {storageMode === mode && (
                    <span className="ml-auto text-indigo-600 dark:text-indigo-400 text-xs mt-1">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </header>

        {error && (
          <div className="mx-6 mt-4 px-4 py-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <MessageList messages={messages} isStreaming={isStreaming} />
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        storageMode={storageMode}
        onStorageModeChange={handleStorageToggle}
        defaultModel={model}
        onDefaultModelChange={handleDefaultModelChange}
        systemPrompt={systemPrompt}
        onSystemPromptChange={handleSystemPromptChange}
        models={models}
        onClearConversations={handleClearConversations}
      />
    </div>
  );
}
