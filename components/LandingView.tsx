'use client';

import { useState } from 'react';
import { ArrowUp, Sparkles, ShieldCheck, Lock, Terminal, GitBranch, MessageSquare, Brain, SlidersHorizontal, Plus, Trash2, Paperclip, Check } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { StyleSelector } from './StyleSelector';
import { LANDING_SUGGESTION_CHIPS } from '@/lib/styles';
import { ConnectionStatus, HealthResponse, HushStyle } from '@/types/chat';
import { ReactNode } from 'react';

interface LandingViewProps {
  onSendMessage: (text: string, style?: HushStyle) => void;
  status: ConnectionStatus;
  health: HealthResponse | null;
  persistence: 'session' | 'local';
  currentStyle: HushStyle;
  onSelectStyle: (style: HushStyle) => void;
  onOpenPrivacyModal: () => void;
  onRefreshHealth: () => void;
  cloudControls: ReactNode;
}

export function LandingView({ onSendMessage, status, health, persistence, currentStyle, onSelectStyle, onOpenPrivacyModal, onRefreshHealth, cloudControls }: LandingViewProps) {
  const [prompt, setPrompt] = useState('');
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim()) return;
    onSendMessage(prompt.trim(), currentStyle);
  };

  return (
    <div className="hush-landing min-h-screen h-screen flex flex-col overflow-hidden bg-hush-bg text-hush-textPrimary">
      <header className="hush-topbar h-[70px] shrink-0 flex items-center justify-between gap-4 px-5 border-b border-hush-border bg-[#0e0e15]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="brand-mark"><Sparkles className="w-4 h-4" /></div>
          <span className="font-serif text-2xl">Hush</span>
          <span className="hidden lg:inline-flex items-center gap-2 rounded-full border border-hush-border bg-hush-surfaceSecondary px-3 py-1 text-xs text-hush-textSecondary"><span className="h-1.5 w-1.5 rounded-full bg-hush-lavender" />Ephemeral Thought Studio · Local Ollama</span>
        </div>
        <div className="hidden md:flex items-center gap-2 rounded-lg border border-hush-border bg-hush-surface px-4 py-2 text-xs text-hush-textSecondary"><Brain className="w-4 h-4 text-hush-lavender" /><span>Quiet sanctuary active</span><span className="mx-1 h-4 w-px bg-hush-border" /><span className="font-mono text-hush-lavender">ZERO EGRESS</span></div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} health={health} onRefresh={onRefreshHealth} />
          {cloudControls}
          <button type="button" onClick={onOpenPrivacyModal} className="hush-icon-button" aria-label="Privacy controls" title="Privacy controls"><ShieldCheck className="w-4 h-4" /></button>
        </div>
      </header>
      <div className="flex flex-1 min-h-0">
        <aside className="hush-rail hidden md:flex w-[260px] shrink-0 flex-col border-r border-hush-border bg-[#0e0e15] px-5 py-5">
          <div className="mb-5 flex items-center justify-between text-[11px] font-semibold tracking-[.12em] text-hush-textMuted"><span>COGNITIVE THREADS</span><button type="button" title="New conversation" className="hover:text-hush-lavender"><Plus className="w-4 h-4" /></button></div>
          <nav className="space-y-1 text-sm">
            <div className="flex items-center gap-3 rounded-md border border-hush-border bg-hush-surfaceElevated px-3 py-3 text-hush-textPrimary"><MessageSquare className="w-4 h-4 text-hush-lavender" />Current Stream</div>
            <div className="flex items-center gap-3 rounded-md px-3 py-3 text-hush-textSecondary"><GitBranch className="w-4 h-4" />Thought Trails</div>
            <div className="flex items-center gap-3 rounded-md px-3 py-3 text-hush-textSecondary"><Brain className="w-4 h-4" />Memory Vectors</div>
            <div className="flex items-center gap-3 rounded-md px-3 py-3 text-hush-textSecondary"><SlidersHorizontal className="w-4 h-4" />Runtime &amp; Weights</div>
          </nav>
          <div className="mt-auto rounded-lg border border-hush-border bg-hush-surface p-3 text-xs"><div className="mb-1 flex items-center gap-2 font-medium"><span className="h-2 w-2 rounded-full bg-emerald-400" />Zero Egress Active</div><p className="leading-relaxed text-hush-textMuted">Prompts stay on your configured local Ollama instance.</p></div>
        </aside>
        <main className="hush-landing-main relative flex min-w-0 flex-1 flex-col overflow-y-auto px-4 sm:px-8 lg:px-12">
          <div className="landing-glow pointer-events-none absolute inset-x-0 top-0 h-[440px]" />
          <div className="relative mx-auto flex w-full max-w-[1080px] flex-1 flex-col justify-center py-10 lg:py-12">
            <div className="mb-6 flex justify-center"><span className="inline-flex items-center gap-2 rounded-full border border-hush-border bg-hush-surfaceSecondary/80 px-4 py-2 text-[11px] uppercase tracking-[.13em] text-hush-textSecondary"><Sparkles className="h-3.5 w-3.5 text-hush-lavender" />Ephemeral Thought Sanctuary <span className="text-hush-textMuted">/</span><span className="normal-case tracking-normal text-hush-lavender">Private &amp; Offline</span></span></div>
            <h1 className="text-center font-serif text-[42px] font-normal leading-[1.12] tracking-[-.025em] text-[#f4effa] sm:text-[54px] lg:text-[58px]">Quiet thoughts take form here.</h1>
            <p className="mx-auto mb-8 mt-4 max-w-[620px] text-center font-serif text-lg italic leading-relaxed tracking-wide text-hush-textSecondary sm:text-xl">An anonymous cognitive sanctuary. No accounts. Zero telemetry. Ephemeral by default.</p>
            <form onSubmit={handleSubmit} className="landing-composer rounded-2xl border border-hush-border bg-[#12121b]/95 p-4 sm:p-5">
              <label htmlFor="thought-input" className="sr-only">Input your thought</label>
              <textarea id="thought-input" value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }} placeholder="Whisper a hypothesis, sketch an inquiry, or let a thought unfurl..." rows={3} className="min-h-[96px] w-full resize-none bg-transparent p-1 text-[15px] leading-relaxed text-hush-textPrimary outline-none placeholder:text-hush-textMuted sm:text-base" />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-hush-border/60 pt-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2"><button type="button" className="h-8 w-8 rounded-lg text-hush-textSecondary hover:bg-hush-surfaceElevated" title="Attach context"><Paperclip className="mx-auto h-4 w-4" /></button><StyleSelector currentStyle={currentStyle} onSelectStyle={onSelectStyle} compact /></div>
                <div className="ml-auto flex items-center gap-4"><span className="hidden font-mono text-[11px] text-hush-textMuted sm:inline">Enter to dispatch · Shift+Enter newline</span><button type="submit" disabled={!prompt.trim()} className="flex h-10 w-10 items-center justify-center rounded-full bg-hush-lavender text-hush-bg transition hover:shadow-[0_0_20px_rgba(157,139,255,.35)] disabled:opacity-30" title="Send thought to local instance"><ArrowUp className="h-5 w-5" /></button></div>
              </div>
            </form>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {LANDING_SUGGESTION_CHIPS.map((chip, index) => <button key={chip.id} type="button" onClick={() => onSendMessage(chip.prompt, chip.style)} className="group flex min-h-11 items-center gap-2.5 rounded-xl border border-hush-border/70 bg-[#12121b]/90 px-3 py-2.5 text-left transition hover:border-hush-violet/40 hover:bg-hush-surfaceSecondary"><span className="text-sm text-hush-lavender">{['✦', '◈', '✺', '◇'][index % 4]}</span><span className="truncate text-xs text-hush-textSecondary group-hover:text-hush-lavender">{chip.title}</span></button>)}
            </div>
            <div className="mt-7 flex flex-col items-start justify-between gap-4 rounded-xl border border-hush-border/70 bg-[#12121b]/80 p-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-hush-border bg-hush-surfaceSecondary text-hush-lavender"><GitBranch className="h-5 w-5" /></div><div><div className="flex flex-wrap items-center gap-2 text-sm font-medium">Thought Trails Philosophy<span className="rounded bg-hush-surfaceElevated px-2 py-0.5 text-[10px] text-hush-lavender">Non-linear thinking</span></div><p className="mt-1 text-xs leading-relaxed text-hush-textMuted">Explore divergent branches without polluting the root context.</p></div></div>
              <div className="hidden items-center gap-3 rounded-lg border border-hush-border/60 bg-hush-bg px-3 py-2 text-[11px] text-hush-textSecondary sm:flex"><span className="text-hush-lavender">● Root</span><span className="text-hush-textMuted">┬</span><span>● Trail α<br />● Trail β</span></div>
            </div>
            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-hush-textMuted"><Lock className="h-3.5 w-3.5 text-hush-lavender" />No account required · {persistence === 'session' ? 'Temporary by default' : 'Saved in this browser'} · Runs locally via Ollama</div>
          </div>
          <footer className="relative flex flex-col gap-3 border-t border-hush-border/50 py-4 text-[11px] text-hush-textMuted sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap items-center gap-x-5 gap-y-2"><span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-hush-violet" />Local model: {health?.model || 'Ollama'} (localhost:11434)</span><span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Persistence: {persistence === 'session' ? 'Temporary session' : 'Local storage'}</span><span className="hidden items-center gap-2 md:inline-flex"><Check className="h-3 w-3 text-hush-lavender" />No telemetry or tracking</span></div><div className="flex items-center gap-3"><button type="button" onClick={onOpenPrivacyModal} className="inline-flex items-center gap-1.5 rounded border border-hush-border px-2.5 py-1.5 hover:text-hush-textPrimary"><ShieldCheck className="h-3.5 w-3.5" />Privacy controls</button><button type="button" onClick={onOpenPrivacyModal} className="inline-flex items-center gap-1.5 rounded border border-hush-border px-2.5 py-1.5 hover:text-hush-textPrimary"><Trash2 className="h-3.5 w-3.5" />Clear memory</button><span className="hidden lg:inline-flex items-center gap-1.5"><Terminal className="h-3.5 w-3.5" />Local inference</span></div></footer>
        </main>
      </div>
    </div>
  );
}
