import { useEffect, useRef, useState } from "react";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault(); // Prevent page reload if triggered via form submission
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");

    // Reset height after sending
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full flex justify-center pb-6 pt-2 px-4 md:px-8 shrink-0">
      <div className="w-full max-w-[720px] relative">
        <form
          onSubmit={handleSend}
          className="relative flex flex-col bg-black/25 focus-within:bg-black/35 border-[0.5px] border-white/10 focus-within:border-white/20 rounded-2xl p-3 shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-200"
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message WaiChat..."
            disabled={disabled}
            rows={1}
            className="w-full bg-transparent border-none text-white/95 text-base outline-none resize-none leading-relaxed min-h-[24px] max-h-[200px] pr-12 placeholder:text-white/40 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full"
          />

          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className="absolute right-3 top-2.5 w-8 h-8 bg-white/10 border-[0.5px] border-white/10 rounded-full flex items-center justify-center text-white/80 hover:bg-white hover:text-black hover:scale-105 disabled:opacity-40 disabled:hover:bg-white/10 disabled:hover:text-white/80 disabled:hover:scale-100 transition-all duration-200 cursor-pointer"
            aria-label="Send message"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="w-4 h-4 stroke-[2.5]"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>

          <div className="flex justify-between items-center mt-3 border-t-[0.5px] border-white/5 pt-2">
            <button
              type="button"
              className="flex items-center gap-2 bg-transparent border-none text-white/50 hover:text-white/95 text-[13px] md:text-sm font-medium cursor-pointer transition-colors focus:outline-none"
              aria-label="Attach file"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="w-5 h-5 stroke-[1.5]"
              >
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
              </svg>
              Attach
            </button>
          </div>
        </form>

        <div className="text-center text-xs text-white/40 mt-3 hidden md:block tracking-wide">
          Press Enter to send · Shift + Enter for new line
        </div>
      </div>
    </div>
  );
}
