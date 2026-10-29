'use client';

import { useState } from 'react';
import { ThoughtTrail, HushSession } from '@/types/chat';
import { GitBranch, MessageSquare, Edit2, Check, X, ChevronRight, Layers } from 'lucide-react';

interface ThoughtTrailsSidebarProps {
  session: HushSession;
  activeTrailId: string;
  onSwitchTrail: (trailId: string) => void;
  onUpdateTrailName: (trailId: string, name: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function ThoughtTrailsSidebar({
  session,
  activeTrailId,
  onSwitchTrail,
  onUpdateTrailName,
  isOpenMobile,
  onCloseMobile,
}: ThoughtTrailsSidebarProps) {
  const [editingTrailId, setEditingTrailId] = useState<string | null>(null);
  const [editNameText, setEditNameText] = useState('');

  const trailsList = Object.values(session.trails);

  const handleStartEdit = (trail: ThoughtTrail, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTrailId(trail.id);
    setEditNameText(trail.name);
  };

  const handleSaveEdit = (trailId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editNameText.trim()) {
      onUpdateTrailName(trailId, editNameText.trim());
    }
    setEditingTrailId(null);
  };

  const handleCancelEdit = () => {
    setEditingTrailId(null);
  };

  // Count messages for each trail (direct messages)
  const getMessageCount = (trailId: string) => {
    return session.messages.filter((m) => m.trailId === trailId).length;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-hush-surface border-l border-hush-border w-full lg:w-72 select-none">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-hush-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-hush-violet" />
          <span className="text-xs font-semibold uppercase tracking-wider text-hush-textSecondary">
            Thought Trails
          </span>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-hush-surfaceElevated text-hush-lavender font-mono">
          {trailsList.length}
        </span>
      </div>

      {/* Trails List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {trailsList.map((trail) => {
          const isActive = trail.id === activeTrailId;
          const isBranch = Boolean(trail.parentMessageId);
          const msgCount = getMessageCount(trail.id);
          const isEditing = editingTrailId === trail.id;

          return (
            <div
              key={trail.id}
              onClick={() => {
                onSwitchTrail(trail.id);
                onCloseMobile();
              }}
              className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
                isActive
                  ? 'bg-hush-surfaceElevated border-hush-violet/40 text-hush-textPrimary shadow-sm'
                  : 'bg-hush-surfaceSecondary/40 border-transparent text-hush-textSecondary hover:bg-hush-surfaceSecondary hover:border-hush-border'
              } ${isBranch ? 'ml-3 border-l-2' : ''}`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {isBranch ? (
                  <GitBranch
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-hush-violet' : 'text-hush-textMuted'
                    }`}
                  />
                ) : (
                  <MessageSquare
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-hush-violet' : 'text-hush-textMuted'
                    }`}
                  />
                )}

                {isEditing ? (
                  <form
                    onSubmit={(e) => handleSaveEdit(trail.id, e)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 flex-1 mr-1"
                  >
                    <input
                      type="text"
                      autoFocus
                      value={editNameText}
                      onChange={(e) => setEditNameText(e.target.value)}
                      className="w-full bg-hush-bg px-2 py-0.5 rounded text-xs text-hush-textPrimary border border-hush-border focus:outline-none focus:border-hush-violet"
                    />
                    <button
                      type="submit"
                      className="p-1 rounded hover:bg-hush-surface text-emerald-400"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="p-1 rounded hover:bg-hush-surface text-rose-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate" title={trail.name}>
                      {trail.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-hush-textMuted mt-0.5">
                      <span>{trail.style.replace('-', ' ')}</span>
                      <span>•</span>
                      <span>{msgCount} msgs</span>
                    </div>
                  </div>
                )}
              </div>

              {!isEditing && (
                <div className="flex items-center gap-1 shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => handleStartEdit(trail, e)}
                    className="p-1 rounded text-hush-textMuted hover:text-hush-textPrimary hover:bg-hush-surface"
                    title="Rename Trail"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-hush-border text-[11px] text-hush-textMuted flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-hush-lavender" />
          <span>Independent branch trees</span>
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block shrink-0 h-full">{sidebarContent}</aside>

      {/* Mobile Drawer / Bottom Sheet */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex items-end">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-full max-h-[82dvh] h-[min(680px,82dvh)] shadow-2xl z-10 animate-fade-in rounded-t-2xl overflow-hidden border border-hush-border">
            <div className="absolute top-3 right-3 z-20">
              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg bg-hush-surfaceElevated text-hush-textMuted hover:text-hush-textPrimary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

