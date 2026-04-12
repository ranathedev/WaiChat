import { useEffect, useState } from "react";
import { useChat } from "./hooks/useChat";
import { useModels, DEFAULT_MODEL_ID } from "./hooks/useModels";
import type { StorageMode } from "./storage";
import Sidebar from "./components/Sidebar";
import MessageList from "./components/MessageList";
import ChatInput from "./components/ChatInput";
import ModelPicker from "./components/ModelPicker";

const STORAGE_MODE_KEY = "waichat:storage-mode";

export default function App() {
  const [storageMode, setStorageMode] = useState<StorageMode>(
    () => (localStorage.getItem(STORAGE_MODE_KEY) as StorageMode) ?? "cloud",
  );
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
  const [model, setModel] = useState(DEFAULT_MODEL_ID);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleNew = async () => {
    await newConversation(model);
  };

  const handleSend = async (content: string) => {
    console.log("[handleSend] called", {
      content,
      activeConversation,
      isStreaming,
    });
    if (isStreaming) return;
    if (!activeConversation) {
      console.log("[handleSend] creating new conversation");
      const convo = await newConversation(model);
      console.log("[handleSend] conversation created", convo);
      await sendMessage(content, model, convo.id, storageMode);
    } else {
      await sendMessage(content, model, activeConversation.id, storageMode);
    }
  };

  const handleStorageToggle = () => {
    const next: StorageMode = storageMode === "cloud" ? "local" : "cloud";
    setStorageMode(next);
    localStorage.setItem(STORAGE_MODE_KEY, next);
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Sidebar
        conversations={conversations}
        activeId={activeConversation?.id ?? null}
        onSelect={selectConversation}
        onNew={handleNew}
        onDelete={deleteConversation}
      />

      <main className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <ModelPicker
            models={models}
            value={model}
            onChange={setModel}
            disabled={isStreaming}
          />
          <button
            onClick={handleStorageToggle}
            className="text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
          >
            {storageMode === "cloud" ? "☁️ Cloud" : "💾 Local"}
          </button>
        </header>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 px-4 py-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Messages */}
        <MessageList messages={messages} isStreaming={isStreaming} />

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </main>
    </div>
  );
}
