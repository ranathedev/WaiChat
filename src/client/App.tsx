import { useEffect, useState, useRef } from "react";
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
const MOBILE_BREAKPOINT = 768;

export default function App() {
  // Track the actual saved preference in localStorage separately
  const [savedStorageMode, setSavedStorageMode] = useState<StorageMode>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_MODE_KEY);
      return stored === "local" ? "local" : "cloud";
    }
    return "cloud";
  });

  // Check the URL for a forced storage mode first, fallback to localStorage
  const [storageMode, setStorageMode] = useState<StorageMode>(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path.startsWith("/c/local/")) return "local";
      if (path.startsWith("/c/cloud/")) return "cloud";
    }
    return savedStorageMode;
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
    clearConversation,
    sendMessage,
  } = useChat(storageMode);

  const { models } = useModels();
  const [model, setModel] = useState(
    () => localStorage.getItem(DEFAULT_MODEL_KEY) ?? DEFAULT_MODEL_ID,
  );
  const [systemPrompt, setSystemPrompt] = useState(
    () => localStorage.getItem(SYSTEM_PROMPT_KEY) ?? "",
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Storage dropdown state for mobile-friendly click toggling
  const [storageDropdownOpen, setStorageDropdownOpen] = useState(false);

  // Sidebar state: Open by default on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return typeof window !== "undefined" ? window.innerWidth >= MOBILE_BREAKPOINT : true;
  });

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const initialLoadDone = useRef(false);

  // Safely parse the new URL format on initial render
  useEffect(() => {
    if (initialLoadDone.current) return;

    const path = window.location.pathname;
    if (path.startsWith("/c/")) {
      const parts = path.split("/");
      const mode = parts[2];
      const id = parts[3];

      if ((mode === "cloud" || mode === "local") && id) {
        selectConversation(id);
      } else {
        // Invalid path format, just go back home cleanly
        window.history.replaceState({}, "", "/");
      }
    }

    initialLoadDone.current = true;
  }, [selectConversation]);

  // Handle browser Back/Forward with cross-mode support
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith("/c/")) {
        const parts = path.split("/");
        const mode = parts[2] as StorageMode;
        const id = parts[3];

        if ((mode === "cloud" || mode === "local") && id) {
          if (mode !== storageMode) {
            // If the user hits "Back" and it crosses into a different storage mode,
            // the safest way to re-initialize all hooks and state is a hard reload.
            window.location.reload();
            return;
          }
          selectConversation(id);
        } else {
          // Invalid URL format, act as if we hit home
          clearConversation();
          window.history.replaceState({}, "", "/");
        }
      } else {
        clearConversation();
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectConversation, clearConversation, storageMode]);

  // Update the URL format to include the storage mode
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (activeConversation) {
      const expectedPath = `/c/${storageMode}/${activeConversation.id}`;
      if (currentPath !== expectedPath) {
        window.history.pushState({}, "", expectedPath);
      }
    } else if (currentPath !== "/") {
      window.history.pushState({}, "", "/");
    }
  }, [activeConversation, storageMode]);

  // Close storage dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest(".storage-dropdown-container")) {
        setStorageDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStorageDropdownOpen(false);
    };

    if (storageDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [storageDropdownOpen]);

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < MOBILE_BREAKPOINT) {
      setSidebarOpen(false);
    }
  };

  const handleSelectConversation = (id: string) => {
    selectConversation(id);
    closeSidebarOnMobile();
  };

  const handleStorageToggle = (next: StorageMode) => {
    setStorageMode(next);
    setSavedStorageMode(next); // Sync saved mode when manually toggled
    localStorage.setItem(STORAGE_MODE_KEY, next);
    setStorageDropdownOpen(false);
  };

  // Wrapper for new chat with mode support
  const handleNew = async (targetMode: StorageMode = storageMode) => {
    if (targetMode !== storageMode) {
      // User opted to return to their default mode. We toggle state and reset home.
      handleStorageToggle(targetMode);
      clearConversation();
      window.history.pushState({}, "", "/");
    } else {
      // Standard new chat in the current mode
      await newConversation(model);
    }
    closeSidebarOnMobile();
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
      const keys = Object.keys(localStorage).filter(
        (k) => k.startsWith("waichat:conversations") || k.startsWith("waichat:messages:"),
      );
      keys.forEach((k) => localStorage.removeItem(k));
    }
    await loadConversations();
  };

  return (
    <div
      className="relative flex h-screen w-full overflow-hidden font-sans text-white/95"
      style={{
        background:
          "radial-gradient(circle at 15% 50%, #1a1e36, #000 50%), radial-gradient(circle at 85% 30%, #2a1635, #000 50%)",
        backgroundColor: "#000",
      }}
    >
      {/* Full-screen glassmorphism base layer */}
      <div className="absolute inset-0 bg-[#1e1e20]/75 backdrop-blur-[40px] backdrop-saturate-[180%] pointer-events-none z-0" />

      {/* Interactive Content Wrapper */}
      <div className="relative z-10 flex h-full w-full">
        {/* Mobile Backdrop Overlay */}
        {sidebarOpen && (
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-20 md:hidden transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <Sidebar
          conversations={conversations}
          activeId={activeConversation?.id ?? null}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelect={handleSelectConversation}
          onNew={handleNew}
          onDelete={deleteConversation}
          onSettingsOpen={() => setSettingsOpen(true)}
          currentMode={storageMode}
          savedMode={savedStorageMode}
        />

        <main className="flex flex-col flex-1 min-w-0 h-full">
          {/* TOPBAR */}
          <header className="flex items-center justify-between px-5 py-4 border-b-[0.5px] border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-white/65 hover:text-white/95 hover:bg-white/5 transition-colors focus:outline-none"
                  aria-label="Open sidebar"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="w-5 h-5 stroke-2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="9" y1="3" x2="9" y2="21"></line>
                  </svg>
                </button>
              )}

              <div className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border-[0.5px] border-white/10 rounded-full pl-3 pr-2 py-1.5 transition-all">
                <div className="w-2 h-2 rounded-full bg-[#0A84FF]"></div>
                <div className="flex-1 min-w-0 text-xs md:text-sm font-medium text-white/65 [&_select]:text-white/65 [&_select]:bg-transparent [&_select]:border-none [&_select]:py-0 [&_select]:pl-0 [&_select]:pr-4 [&_select]:outline-none [&_select]:cursor-pointer [&_select]:appearance-none">
                  <ModelPicker
                    models={models}
                    value={model}
                    onChange={handleDefaultModelChange}
                    disabled={isStreaming}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative storage-dropdown-container shrink-0">
                <button
                  onClick={() => setStorageDropdownOpen(!storageDropdownOpen)}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border-[0.5px] border-white/10 rounded-full px-3 py-1.5 text-white/65 hover:text-white/95 text-xs md:text-sm font-medium cursor-pointer transition-all focus:outline-none"
                  aria-expanded={storageDropdownOpen}
                >
                  {storageMode === "cloud" ? (
                    <div className="w-2 h-2 rounded-full bg-[#34C759] shadow-[0_0_4px_rgba(52,199,89,0.5)]"></div>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-[#FF9F0A] shadow-[0_0_4px_rgba(255,159,10,0.5)]"></div>
                  )}
                  {storageMode === "cloud" ? "Cloud" : "Local"}
                  <svg className="w-3 h-3 ml-1" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M6 8L1 3h10z" />
                  </svg>
                </button>

                <div
                  role="menu"
                  className={`absolute right-0 top-full mt-2 w-64 bg-[#1e1e20]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-200 z-50 origin-top-right ${
                    storageDropdownOpen
                      ? "opacity-100 scale-100 visible"
                      : "opacity-0 scale-95 invisible"
                  }`}
                >
                  {(["cloud", "local"] as StorageMode[]).map((mode) => (
                    <button
                      key={mode}
                      role="menuitem"
                      onClick={() => handleStorageToggle(mode)}
                      className={`w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-white/10 transition-colors ${
                        storageMode === mode ? "bg-[#0A84FF]/10" : ""
                      }`}
                    >
                      <span className="text-base md:text-lg mt-0.5">
                        {mode === "cloud" ? "☁️" : "💾"}
                      </span>
                      <div>
                        <p
                          className={`text-sm md:text-base font-medium ${storageMode === mode ? "text-[#0A84FF]" : "text-white/95"}`}
                        >
                          {mode === "cloud" ? "Cloud (D1)" : "Local (Browser)"}
                        </p>
                        <p className="text-xs md:text-sm text-white/40 mt-0.5">
                          {mode === "cloud" ? "Syncs across devices" : "Stays in your browser"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleNew(storageMode)}
                className="w-8 h-8 rounded-md flex items-center justify-center text-white/65 hover:text-white/95 hover:bg-white/5 transition-colors"
                title="New Chat"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="w-5 h-5 stroke-2"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
            </div>
          </header>

          {error && (
            <div className="mx-6 mt-4 px-4 py-3 bg-red-900/30 border border-red-500/30 rounded-lg text-sm text-red-400">
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
    </div>
  );
}
