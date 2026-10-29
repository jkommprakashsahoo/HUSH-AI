'use client';

import { useState } from 'react';
import { Sparkles, GitBranch, ShieldCheck, RotateCcw, Edit2, Check, X } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { ConnectionStatus, HealthResponse } from '@/types/chat';
import { ReactNode } from 'react';

interface WorkspaceHeaderProps {
  sessionTitle: string;
  onUpdateTitle: (newTitle: string) => void;
  status: ConnectionStatus;
  health: HealthResponse | null;
  persistence: 'session' | 'local';
  onResetSession: () => void;
  onOpenPrivacyModal: () => void;
  onToggleMobileTrails: () => void;
  onRefreshHealth: () => void;
  cloudControls: ReactNode;
}

export function WorkspaceHeader({
  sessionTitle,
  onUpdateTitle,
  status,
  health,
  persistence,
  onResetSession,
  onOpenPrivacyModal,
  onToggleMobileTrails,
  onRefreshHealth,
  cloudControls,
}: WorkspaceHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(sessionTitle);

  const handleSaveTitle = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (titleText.trim()) {
      onUpdateTitle(titleText.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="h-14 border-b border-hush-border bg-hush-surface flex items-center justify-between px-3 sm:px-5 shrink-0 select-none">
      {/* Left: Brand & Mobile Sidebar Toggle */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileTrails}
          className="lg:hidden p-1.5 rounded-lg bg-hush-surfaceSecondary text-hush-textSecondary hover:text-hush-textPrimary border border-hush-border"
          title="Thought Trails"
        >
          <GitBranch className="w-4 h-4 text-hush-violet" />
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 rounded-lg bg-hush-surfaceElevated border border-hush-border flex items-center justify-center text-hush-violet">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs tracking-wider text-hush-textPrimary hidden sm:inline">
            HUSH
          </span>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-hush-border hidden sm:block" />

        {/* Editable Title */}
        <div className="min-w-0 flex-1">
          {isEditingTitle ? (
            <form onSubmit={handleSaveTitle} className="flex items-center gap-1 max-w-xs">
              <input
                type="text"
                autoFocus
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                className="w-full bg-hush-bg px-2 py-0.5 rounded text-xs text-hush-textPrimary border border-hush-border focus:outline-none focus:border-hush-violet"
              />
              <button
                type="submit"
                className="p-1 rounded text-emerald-400 hover:bg-hush-surfaceElevated"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingTitle(false)}
                className="p-1 rounded text-rose-400 hover:bg-hush-surfaceElevated"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div
              onClick={() => {
                setTitleText(sessionTitle);
                setIsEditingTitle(true);
              }}
              className="flex items-center gap-1.5 cursor-pointer group py-1 px-1.5 rounded hover:bg-hush-surfaceElevated transition-colors"
              title="Click to rename conversation"
            >
              <span className="text-xs font-medium text-hush-textSecondary group-hover:text-hush-textPrimary truncate max-w-[140px] sm:max-w-xs">
                {sessionTitle}
              </span>
              <Edit2 className="w-2.5 h-2.5 text-hush-textMuted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={status} health={health} onRefresh={onRefreshHealth} />
        {cloudControls}

        <button
          type="button"
          onClick={onOpenPrivacyModal}
          className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium text-hush-textSecondary hover:text-hush-textPrimary bg-hush-surfaceSecondary hover:bg-hush-surfaceElevated border border-hush-border transition-colors flex items-center gap-1.5"
          title="Privacy and persistence options"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-hush-violet" />
          <span className="hidden sm:inline">
            {persistence === 'session' ? 'Session' : 'Local'}
          </span>
        </button>

        <button
          type="button"
          onClick={onResetSession}
          className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors flex items-center gap-1.5"
          title="Clear current session and reset all trails"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </header>
  );
}
