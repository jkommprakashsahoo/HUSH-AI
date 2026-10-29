'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ArrowUp, Square, Sparkles } from 'lucide-react';
import { StyleSelector } from './StyleSelector';
import { HushStyle } from '@/types/chat';

interface ChatComposerProps {
  onSendMessage: (text: string) => void;
  onStopGeneration: () => void;
  isStreaming: boolean;
  currentStyle: HushStyle;
  onSelectStyle: (style: HushStyle) => void;
  initialValue?: string;
  onValueChange?: (val: string) => void;
  placeholder?: string;
}

export function ChatComposer({
  onSendMessage,
  onStopGeneration,
  isStreaming,
  currentStyle,
  onSelectStyle,
  initialValue = '',
  onValueChange,
  placeholder = 'Ask a question, test an idea, or think through a decision...',
}: ChatComposerProps) {
  const [input, setInput] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external draft
  useEffect(() => {
    setInput(initialValue);
  }, [initialValue]);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  }, [input]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    onValueChange?.(val);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput('');
    onValueChange?.('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative rounded-2xl bg-hush-surface border border-hush-border shadow-lg p-2.5 sm:p-3 focus-within:border-hush-violet/60 transition-colors">
        {/* Style Selector Bar */}
        <div className="flex items-center justify-between pb-2 mb-1 border-b border-hush-border/40 overflow-x-auto">
          <StyleSelector currentStyle={currentStyle} onSelectStyle={onSelectStyle} compact />
          <div className="hidden sm:flex items-center gap-1.5 text-[10.5px] text-hush-textMuted px-2">
            <span>Shift + Enter for new line</span>
          </div>
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={2}
          className="w-full bg-transparent text-sm text-hush-textPrimary placeholder:text-hush-textMuted resize-none focus:outline-none p-1.5 min-h-[56px] max-h-[220px]"
        />

        {/* Footer controls */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <span className="text-[10px] text-hush-textMuted px-1">
            {input.length > 0 ? `${input.length} chars` : 'Local AI inference'}
          </span>

          <div className="flex items-center gap-2">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-colors font-medium text-xs"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim()}
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-hush-violet hover:bg-hush-lavender disabled:opacity-30 disabled:hover:bg-hush-violet text-hush-bg font-semibold transition-all shadow-md"
                title="Send message (Enter)"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

