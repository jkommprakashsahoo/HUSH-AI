'use client';

import { useState } from 'react';
import { ConnectionStatus, HealthResponse } from '@/types/chat';
import { Cpu, AlertCircle, CheckCircle2, Loader2, ServerOff, Terminal, X } from 'lucide-react';

interface StatusBadgeProps {
  status: ConnectionStatus;
  health: HealthResponse | null;
  onRefresh?: () => void;
}

export function StatusBadge({ status, health, onRefresh }: StatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getStatusConfig = () => {
    switch (status) {
      case 'configuration_missing':
        return {
          label: 'Private AI not configured',
          dotClass: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]',
          badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
          icon: AlertCircle,
        };
      case 'ready':
        return {
          label: 'Local AI ready',
          dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]',
          badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
          icon: CheckCircle2,
        };
      case 'connecting':
        return {
          label: 'Connecting to local AI',
          dotClass: 'bg-amber-400 animate-pulse',
          badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
          icon: Loader2,
        };
      case 'offline':
        return {
          label: 'Ollama is not running',
          dotClass: 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]',
          badgeClass: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
          icon: ServerOff,
        };
      case 'model_missing':
        return {
          label: 'Model not installed',
          dotClass: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]',
          badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
          icon: AlertCircle,
        };
      case 'loading':
        return {
          label: 'Model is loading',
          dotClass: 'bg-hush-violet animate-pulse',
          badgeClass: 'border-hush-violet/30 bg-hush-violet/10 text-hush-lavender',
          icon: Loader2,
        };
      case 'generating':
        return {
          label: 'Generation in progress',
          dotClass: 'bg-hush-violet animate-ping',
          badgeClass: 'border-hush-violet/40 bg-hush-violet/15 text-hush-lavender',
          icon: Loader2,
        };
      case 'failed':
      default:
        return {
          label: 'Request failed',
          dotClass: 'bg-rose-400',
          badgeClass: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
          icon: AlertCircle,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors hover:bg-opacity-25 ${config.badgeClass}`}
        title="Local AI runtime status"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
        <span className="hidden sm:inline">{config.label}</span>
        <span className="sm:hidden">{status === 'ready' ? 'Ready' : 'Status'}</span>
        <span className="text-[10px] opacity-75">({health?.model || 'local'})</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 p-4 rounded-xl bg-hush-surface border border-hush-border shadow-2xl backdrop-blur-md z-50 animate-fade-in text-hush-textSecondary text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-hush-border">
            <div className="flex items-center gap-2 font-semibold text-hush-textPrimary">
              <Cpu className="w-4 h-4 text-hush-violet" />
              <span>Local AI Runtime Status</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-hush-textMuted hover:text-hush-textPrimary hover:bg-hush-surfaceElevated transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 space-y-2.5">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-hush-textMuted">Status</span>
              <span className="font-medium text-hush-textPrimary">{config.label}</span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-hush-textMuted">Target Model</span>
              <code className="px-1.5 py-0.5 rounded bg-hush-surfaceElevated text-hush-lavender font-mono text-[11px] border border-hush-border">
                {health?.model || 'qwen3:4b'}
              </code>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-hush-textMuted">Runtime Engine</span>
              <span className="text-hush-textSecondary">Ollama (/v1 API)</span>
            </div>

            {health?.message && (
              <p className="p-2.5 rounded-lg bg-hush-surfaceSecondary border border-hush-border text-hush-textSecondary leading-relaxed text-[11px]">
                {health.message}
              </p>
            )}

            {health?.suggestedAction && (
              <div className="p-2.5 rounded-lg bg-hush-surfaceElevated border border-hush-violet/30 text-hush-lavender text-[11px]">
                <div className="flex items-center gap-1.5 font-medium mb-1 text-hush-violet">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Terminal Setup Command:</span>
                </div>
                <code className="block p-1.5 rounded bg-hush-bg font-mono text-[10px] text-hush-textPrimary border border-hush-border">
                  {health.suggestedAction}
                </code>
              </div>
            )}

            {health?.modelsAvailable && health.modelsAvailable.length > 0 && (
              <div className="pt-2">
                <span className="text-hush-textMuted block mb-1">Installed Local Models:</span>
                <div className="flex flex-wrap gap-1">
                  {health.modelsAvailable.map((m) => (
                    <span
                      key={m}
                      className="px-1.5 py-0.5 rounded bg-hush-surfaceElevated text-hush-textSecondary font-mono text-[10px] border border-hush-border"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-hush-border flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onRefresh?.();
                }}
                className="px-3 py-1.5 rounded-lg bg-hush-surfaceElevated hover:bg-hush-border text-hush-textPrimary text-xs font-medium transition-colors"
              >
                Re-check Connection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
