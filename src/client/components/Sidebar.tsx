import { useState } from "react";
import type { Conversation, StorageMode } from "../storage";
import ConfirmModal from "./ConfirmModal";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: (mode?: StorageMode) => void;
  onDelete: (id: string) => void;
  onSettingsOpen: () => void;
  currentMode: StorageMode;
  savedMode: StorageMode;
}

export default function Sidebar({
  conversations,
  activeId,
  isOpen,
  onClose,
  onSelect,
  onNew,
  onDelete,
  onSettingsOpen,
  currentMode,
  savedMode,
}: SidebarProps) {
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);

  return (
    <>
      <aside
        className={`absolute md:relative z-30 flex flex-col w-[280px] h-full bg-[#141416]/60 border-r-[0.5px] border-white/10 shrink-0 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          isOpen
            ? "translate-x-0"
            : "-translate-x-full md:-ml-[280px] opacity-0 invisible md:visible border-none"
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 text-base md:text-lg font-semibold text-white/95 tracking-tight">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="w-5 h-5 text-[#0A84FF]"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            WaiChat
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-white/65 hover:text-white/95 hover:bg-white/5 transition-colors focus:outline-none"
            title="Hide Sidebar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 stroke-2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </button>
        </div>

        {/* Explicit split-button flow to the Sidebar for "New Chat" actions when a user views a deep link
          that differs from their saved default storage mode. The user can now seamlessly opt to return to
          their default workspace or explicitly create a new chat in the temporary storage mode they are viewing,
          preventing accidental database pollution. */}
        <div className="px-4 pb-4 flex flex-col gap-2.5">
          {currentMode === savedMode ? (
            <button
              onClick={() => onNew(currentMode)}
              className="flex items-center gap-2 w-full bg-white/5 hover:bg-white/10 border-[0.5px] border-white/10 text-white/95 rounded-xl px-4 py-2.5 text-[13px] md:text-sm font-medium shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition-all"
            >
              <span className="text-lg font-light leading-none">+</span> New Chat
            </button>
          ) : (
            <>
              <button
                onClick={() => onNew(savedMode)}
                className="flex items-center gap-2 w-full bg-[#0A84FF] hover:bg-[#0070E0] text-white rounded-xl px-4 py-2.5 text-[13px] md:text-sm font-medium shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition-all"
                title={`Return to your default ${savedMode} workspace`}
              >
                New Chat in {savedMode === "cloud" ? "☁️ Cloud" : "💾 Local"}
              </button>
              <button
                onClick={() => onNew(currentMode)}
                className="flex items-center gap-2 w-full bg-white/5 hover:bg-white/10 border-[0.5px] border-white/10 text-white/95 rounded-xl px-4 py-2.5 text-[13px] md:text-sm font-medium transition-all"
                title={`Create a new chat in the current temporary ${currentMode} workspace`}
              >
                New in {currentMode === "cloud" ? "☁️ Cloud" : "💾 Local"}
              </button>
            </>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
          {conversations.length > 0 && (
            <div className="px-4 py-3 pb-2 text-[11px] md:text-xs font-medium text-white/40 uppercase tracking-wider">
              Recent
            </div>
          )}
          {conversations.length === 0 && (
            <p className="text-sm text-white/40 text-center mt-10">No conversations yet</p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer text-[13px] md:text-sm transition-all duration-150 ${
                activeId === c.id
                  ? "bg-[#0A84FF] text-white font-medium"
                  : "text-white/65 hover:bg-white/5 hover:text-white/95"
              }`}
              onClick={() => onSelect(c.id)}
            >
              <span className="truncate">{c.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingDelete(c);
                }}
                className={`p-1.5 rounded-md focus:outline-none transition-all ml-2 shrink-0 ${
                  activeId === c.id
                    ? "text-white/70 hover:text-white opacity-100"
                    : "text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100"
                }`}
                aria-label="Delete conversation"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t-[0.5px] border-white/10 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
            style={{ background: "linear-gradient(135deg, #4A5568, #2D3748)" }}
          >
            WC
          </div>
          <span className="flex-1 text-[13px] md:text-sm text-white/95 font-medium">
            WaiChat User
          </span>
          <button
            onClick={onSettingsOpen}
            className="w-8 h-8 rounded-md flex items-center justify-center text-white/65 hover:text-white/95 hover:bg-white/5 transition-colors focus:outline-none cursor-pointer"
            title="Settings"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 stroke-2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>
      </aside>

      <ConfirmModal
        open={pendingDelete !== null}
        title="Delete conversation?"
        description={pendingDelete ? `"${pendingDelete.title}" will be permanently deleted.` : ""}
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
