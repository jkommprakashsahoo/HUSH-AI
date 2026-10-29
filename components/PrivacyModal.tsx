'use client';

import { ShieldCheck, HardDrive, Cpu, AlertTriangle, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  persistence: 'session' | 'local';
  onTogglePersistence: (pref: 'session' | 'local') => void;
}

export function PrivacyModal({
  isOpen,
  onClose,
  persistence,
  onTogglePersistence,
}: PrivacyModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="privacy-dialog-title" aria-describedby="privacy-dialog-description" className="w-full max-w-lg rounded-2xl bg-hush-surface border border-hush-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-hush-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-hush-violet/10 border border-hush-violet/20 text-hush-violet">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="privacy-dialog-title" className="text-sm sm:text-base font-semibold text-hush-textPrimary">Privacy & Architecture</h2>
              <p id="privacy-dialog-description" className="text-xs text-hush-textMuted">Ollama inference, browser storage, and optional cloud sync</p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close privacy dialog"
            className="p-1.5 rounded-lg text-hush-textMuted hover:text-hush-textPrimary hover:bg-hush-surfaceElevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto text-xs text-hush-textSecondary leading-relaxed">
          {/* 100% Local Inference */}
          <div className="p-3.5 rounded-xl bg-hush-surfaceSecondary border border-hush-border space-y-2">
            <div className="flex items-center gap-2 font-medium text-hush-textPrimary">
              <Cpu className="w-4 h-4 text-hush-violet" />
              <span>Open-Weight Inference Runtime</span>
            </div>
            <p className="text-hush-textMuted text-[11px] leading-relaxed">
              Hush sends prompts only to its configured, authorized Ollama-compatible host. In local development this
              is usually <code className="text-hush-lavender font-mono">http://127.0.0.1:11434</code>. A deployed
              instance may use an operator-managed host. Hush does not use a commercial cloud-model fallback.
            </p>
            <div className="pt-1 flex flex-wrap gap-1.5 text-[10px]">
              <span className="px-2 py-0.5 rounded bg-hush-surfaceElevated text-hush-textMuted border border-hush-border">
                Ollama-Compatible Only
              </span>
              <span className="px-2 py-0.5 rounded bg-hush-surfaceElevated text-hush-textMuted border border-hush-border">
                No Paid Model Fallback
              </span>
              <span className="px-2 py-0.5 rounded bg-hush-surfaceElevated text-hush-textMuted border border-hush-border">
                Server-Side Credentials
              </span>
            </div>
          </div>

          {/* Browser Storage Controls */}
          <div className="p-3.5 rounded-xl bg-hush-surfaceSecondary border border-hush-border space-y-2.5">
            <div className="flex items-center gap-2 font-medium text-hush-textPrimary">
              <HardDrive className="w-4 h-4 text-hush-lavender" />
              <span>Local Storage Preferences</span>
            </div>
            <p className="text-hush-textMuted text-[11px]">
              Hush has no login or signup screen. It creates an anonymous Supabase session for optional sync, but does
              not upload conversations unless you explicitly choose Save. Choose how your browser remembers the active
              conversation:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onTogglePersistence('session')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  persistence === 'session'
                    ? 'border-hush-violet bg-hush-violet/10 text-hush-textPrimary'
                    : 'border-hush-border bg-hush-surface text-hush-textMuted hover:border-hush-borderLight'
                }`}
              >
                <div className="font-medium text-[11px] mb-1 flex items-center justify-between">
                  <span>Session Only (Default)</span>
                  {persistence === 'session' && (
                    <span className="text-[9px] text-hush-violet font-semibold uppercase tracking-wider">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-hush-textMuted leading-normal">
                  Kept in <code className="text-hush-lavender">sessionStorage</code>. Cleared automatically as soon as
                  you close this tab.
                </div>
              </button>

              <button
                type="button"
                onClick={() => onTogglePersistence('local')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  persistence === 'local'
                    ? 'border-hush-violet bg-hush-violet/10 text-hush-textPrimary'
                    : 'border-hush-border bg-hush-surface text-hush-textMuted hover:border-hush-borderLight'
                }`}
              >
                <div className="font-medium text-[11px] mb-1 flex items-center justify-between">
                  <span>Persist in Browser</span>
                  {persistence === 'local' && (
                    <span className="text-[9px] text-hush-violet font-semibold uppercase tracking-wider">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-hush-textMuted leading-normal">
                  Saved in <code className="text-hush-lavender">localStorage</code>. Persists across browser restarts
                  until manually reset.
                </div>
              </button>
            </div>
            <p className="pt-1 text-[10px] text-hush-textMuted">
              Supabase sync is separate from these browser settings. Saving sends the selected conversation to the Hush
              server, which encrypts titles and message content before storing them. Loading and deleting saved
              conversations require the same anonymous browser session.
            </p>
          </div>

          {/* Transparent Disclosure */}
          <div className="p-3.5 rounded-xl bg-hush-surfaceElevated border border-hush-border space-y-1 text-hush-textSecondary">
            <div className="flex items-center gap-1.5 font-medium text-amber-300 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Transparent Disclosure</span>
            </div>
            <p className="text-[10.5px] text-hush-textMuted leading-relaxed">
              Supabase sync is optional and is not end-to-end encryption: the Hush server must decrypt saved content to
              load it. Use only a trusted deployment, keep TLS enabled, and protect the server-side encryption key.
              Session-only browser storage remains the default. Prompts and session IDs are never placed in URL
              parameters.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-hush-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-hush-violet hover:bg-hush-lavender text-hush-bg font-semibold text-xs transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
