'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage as ChatMessageType, HushStyle } from '@/types/chat';
import { CONTEXTUAL_ANSWER_ACTIONS } from '@/lib/styles';
import {
  Copy,
  Check,
  GitBranch,
  RotateCcw,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
  isLatestAssistant: boolean;
  isStreaming: boolean;
  onBranch: (messageId: string) => void;
  onRetry: () => void;
  onExecuteAction: (prompt: string, styleOverride?: HushStyle) => void;
}

export function ChatMessage({
  message,
  isLatestAssistant,
  isStreaming,
  onBranch,
  onRetry,
  onExecuteAction,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const isUser = message.role === 'user';

  const handleCopyAnswer = () => {
    if (!message.content) return;
    void navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => undefined);
  };

  const handleCopyCode = (codeText: string) => {
    void navigator.clipboard.writeText(codeText).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }).catch(() => undefined);
  };

  if (isUser) {
    return (
      <div className="flex justify-end my-3 sm:my-4">
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 bg-hush-surfaceElevated border border-hush-border text-hush-textPrimary shadow-sm">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="my-4 sm:my-6 rounded-2xl p-4 sm:p-5 bg-hush-surface border border-hush-border transition-all hover:border-hush-borderLight">
      {/* Header bar of message */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-hush-border/60">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-hush-violet/10 text-hush-violet border border-hush-violet/20">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-hush-textPrimary">Hush</span>
          {message.style && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-hush-surfaceElevated border border-hush-border text-hush-lavender font-medium">
              {message.style.replace('-', ' ')}
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyAnswer}
            disabled={!message.content}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-hush-textMuted hover:text-hush-textPrimary hover:bg-hush-surfaceElevated transition-colors"
            title="Copy answer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onBranch(message.id)}
            disabled={message.isStreaming}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-hush-lavender hover:bg-hush-surfaceElevated border border-hush-border hover:border-hush-violet/40 transition-colors"
            title="Branch this thought into an independent Thought Trail"
          >
            <GitBranch className="w-3 h-3 text-hush-violet" />
            <span className="hidden sm:inline">Thought Trail</span>
            <span className="sm:hidden">Trail</span>
          </button>

          {isLatestAssistant && !message.isStreaming && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isStreaming}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-hush-textMuted hover:text-hush-textPrimary hover:bg-hush-surfaceElevated transition-colors"
              title="Regenerate this response"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Retry</span>
            </button>
          )}
        </div>
      </div>

      {/* Message Content or Error */}
      {message.error ? (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-2">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>Generation Failed</span>
          </div>
          <p className="text-[11.5px] leading-relaxed text-rose-200/90">{message.error}</p>
          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-medium border border-rose-500/30 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry with Ollama</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }: React.ComponentProps<'code'> & { node?: unknown }) {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');
                const isBlock = Boolean(match) || codeString.includes('\n');

                if (isBlock) {
                  return (
                    <div className="relative my-3 rounded-xl overflow-hidden bg-hush-bg border border-hush-border">
                      <div className="flex items-center justify-between px-3.5 py-1.5 bg-hush-surfaceSecondary border-b border-hush-border text-[11px] text-hush-textMuted font-mono">
                        <span>{match?.[1] || 'code'}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(codeString)}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-hush-surfaceElevated hover:text-hush-textPrimary transition-colors"
                        >
                          {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <pre className="p-3.5 overflow-x-auto text-xs text-hush-textPrimary font-mono">
                        <code>{children}</code>
                      </pre>
                    </div>
                  );
                }

                return (
                  <code
                    className="px-1.5 py-0.5 rounded bg-hush-surfaceElevated text-hush-lavender font-mono text-[12px] border border-hush-border"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>

          {/* Streaming cursor */}
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-hush-violet animate-pulse align-middle" />
          )}
        </div>
      )}

      {/* Contextual Follow-up Action Chips */}
      {!message.isStreaming && !message.error && message.content && (
        <div className="mt-4 pt-3 border-t border-hush-border/50">
          <div className="flex items-center gap-1.5 text-[10.5px] text-hush-textMuted mb-2">
            <span>Contextual Actions:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CONTEXTUAL_ANSWER_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={isStreaming}
                onClick={() =>
                  onExecuteAction(action.prompt(message.content), action.styleChange)
                }
                className="px-2.5 py-1 rounded-lg text-xs bg-hush-surfaceSecondary hover:bg-hush-surfaceElevated border border-hush-border text-hush-textSecondary hover:text-hush-textPrimary hover:border-hush-violet/30 transition-all disabled:opacity-50"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

