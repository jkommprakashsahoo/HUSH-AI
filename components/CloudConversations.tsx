'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudDownload, CloudUpload, LoaderCircle, Trash2, X } from 'lucide-react';
import { HushSession } from '@/types/chat';
import { SavedConversation, useSupabaseConversations } from '@/hooks/use-supabase-conversations';

interface CloudConversationsProps {
  session: HushSession;
  authStatus: 'loading' | 'ready' | 'error';
  authError: string | null;
  isStreaming: boolean;
  onLoadSession: (session: HushSession) => void;
  onUpdateSync: (sync: NonNullable<HushSession['supabaseSync']>) => void;
  showSave: boolean;
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
}

export function CloudConversations({
  session,
  authStatus,
  authError,
  isStreaming,
  onLoadSession,
  onUpdateSync,
  showSave,
}: CloudConversationsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingLoad, setPendingLoad] = useState<SavedConversation | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedConversation | null>(null);
  const {
    conversations,
    isLoading,
    isSaving,
    deletingId,
    error,
    success,
    refresh,
    save,
    load,
    remove,
  } = useSupabaseConversations();

  useEffect(() => {
    if (isOpen && authStatus === 'ready') void refresh();
  }, [isOpen, authStatus, refresh]);

  const handleLoad = async (conversation: SavedConversation) => {
    if (session.messages.length > 0) {
      setPendingLoad(conversation);
      return;
    }
    const loaded = await load(conversation.id);
    if (loaded) {
      onLoadSession(loaded);
      setIsOpen(false);
    }
  };

  const confirmLoad = async () => {
    if (!pendingLoad) return;
    const loaded = await load(pendingLoad.id);
    if (loaded) {
      onLoadSession(loaded);
      setPendingLoad(null);
      setIsOpen(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {showSave && (
          <button
            type="button"
            onClick={() => void save(session, onUpdateSync)}
            disabled={authStatus !== 'ready' || isStreaming || session.messages.length === 0 || isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-hush-violet/40 bg-hush-violet/10 px-2.5 py-1.5 text-xs font-medium text-hush-lavender transition-colors hover:bg-hush-violet/20 disabled:cursor-not-allowed disabled:opacity-50"
            title="Explicitly save this conversation and its Thought Trails to Supabase"
          >
            {isSaving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CloudUpload className="h-3.5 w-3.5" />}
            <span>{isSaving ? 'Saving…' : 'Save'}</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-hush-border bg-hush-surfaceSecondary px-2.5 py-1.5 text-xs font-medium text-hush-textSecondary transition-colors hover:bg-hush-surfaceElevated hover:text-hush-textPrimary"
          title="Browse conversations explicitly saved to Supabase"
        >
          <Cloud className="h-3.5 w-3.5 text-hush-violet" />
          <span>Saved</span>
        </button>
      </div>
      {success && <p className="text-[10px] text-emerald-300" role="status">{success}</p>}

      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPendingLoad(null);
              setPendingDelete(null);
              setIsOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="cloud-conversations-title"
            className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-hush-border bg-hush-surface shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-hush-border p-4">
              <div>
                <h2 id="cloud-conversations-title" className="text-sm font-semibold text-hush-textPrimary">Saved conversations</h2>
                <p className="mt-1 text-[11px] text-hush-textMuted">Only conversations you explicitly save are stored in Supabase.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close saved conversations"
                className="rounded-lg p-1.5 text-hush-textMuted hover:bg-hush-surfaceElevated hover:text-hush-textPrimary"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {authStatus === 'loading' && (
                <p className="flex items-center gap-2 text-xs text-hush-textMuted" role="status">
                  <LoaderCircle className="h-4 w-4 animate-spin" /> Restoring anonymous sync session…
                </p>
              )}
              {authStatus === 'error' && (
                <p className="rounded-lg border border-rose-400/20 bg-rose-400/5 p-3 text-xs text-rose-200" role="alert">
                  {authError || 'Anonymous Supabase sync is unavailable.'}
                </p>
              )}
              {error && <p className="rounded-lg border border-rose-400/20 bg-rose-400/5 p-3 text-xs text-rose-200" role="alert">{error}</p>}
              {success && <p className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3 text-xs text-emerald-200" role="status">{success}</p>}
              {isLoading && authStatus === 'ready' && (
                <p className="flex items-center gap-2 text-xs text-hush-textMuted" role="status">
                  <LoaderCircle className="h-4 w-4 animate-spin" /> Loading saved conversations…
                </p>
              )}
              {!isLoading && authStatus === 'ready' && conversations.length === 0 && !error && (
                <p className="rounded-lg border border-hush-border bg-hush-surfaceSecondary p-4 text-xs text-hush-textMuted">
                  No saved conversations yet. Use Save when you want to sync the current conversation.
                </p>
              )}
              {conversations.map((conversation) => (
                <article key={conversation.id} className="rounded-xl border border-hush-border bg-hush-surfaceSecondary p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-xs font-medium text-hush-textPrimary">{conversation.title}</h3>
                      <p className="mt-1 text-[10px] text-hush-textMuted">
                        {conversation.style.replaceAll('-', ' ')} · {formatCreatedAt(conversation.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        disabled={isLoading || deletingId !== null}
                        onClick={() => void handleLoad(conversation)}
                        className="inline-flex items-center gap-1 rounded-md border border-hush-border px-2 py-1 text-[10px] text-hush-lavender hover:bg-hush-surfaceElevated disabled:opacity-50"
                      >
                        {isLoading ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <CloudDownload className="h-3 w-3" />}
                        Load
                      </button>
                      <button
                        type="button"
                        disabled={deletingId !== null || isLoading}
                        onClick={() => setPendingDelete(conversation)}
                        aria-label={`Delete saved conversation ${conversation.title}`}
                        className="rounded-md border border-rose-400/20 p-1.5 text-rose-300 hover:bg-rose-400/10 disabled:opacity-50"
                      >
                        {deletingId === conversation.id ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </article>
              ))}

              {pendingLoad && (
                <div className="space-y-2 rounded-xl border border-amber-300/30 bg-amber-300/5 p-3">
                  <p className="text-xs text-amber-100">Loading this conversation will replace the active browser conversation. Save the active one first if you want to keep it.</p>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setPendingLoad(null)} className="rounded-md border border-hush-border px-2.5 py-1 text-[10px] text-hush-textSecondary">Cancel</button>
                    <button type="button" onClick={() => void confirmLoad()} disabled={isLoading} className="rounded-md bg-hush-violet px-2.5 py-1 text-[10px] font-medium text-hush-bg disabled:opacity-50">Load conversation</button>
                  </div>
                </div>
              )}

              {pendingDelete && (
                <div className="space-y-2 rounded-xl border border-rose-300/30 bg-rose-300/5 p-3">
                  <p className="text-xs text-rose-100">Permanently delete “{pendingDelete.title}” and its saved Thought Trails and messages?</p>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setPendingDelete(null)} className="rounded-md border border-hush-border px-2.5 py-1 text-[10px] text-hush-textSecondary">Cancel</button>
                    <button type="button" onClick={() => { void remove(pendingDelete.id); setPendingDelete(null); }} disabled={deletingId !== null} className="rounded-md bg-rose-500/80 px-2.5 py-1 text-[10px] font-medium text-white disabled:opacity-50">Delete permanently</button>
                  </div>
                </div>
              )}
            </div>

            <footer className="flex justify-end border-t border-hush-border p-3">
              <button type="button" onClick={() => void refresh()} disabled={isLoading || authStatus !== 'ready'} className="rounded-lg border border-hush-border px-3 py-1.5 text-[10px] text-hush-textSecondary disabled:opacity-50">
                Refresh list
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
