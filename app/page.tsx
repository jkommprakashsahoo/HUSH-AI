'use client';

import { useState, useRef, useEffect } from 'react';
import { useHushSession } from '@/hooks/use-hush-session';
import { LandingView } from '@/components/LandingView';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { ThoughtTrailsSidebar } from '@/components/ThoughtTrailsSidebar';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatComposer } from '@/components/ChatComposer';
import { PrivacyModal } from '@/components/PrivacyModal';
import { CloudConversations } from '@/components/CloudConversations';
import { GitBranch, CornerDownRight, ArrowLeft } from 'lucide-react';

export default function HomePage() {
  const {
    session,
    activeTrail,
    activeMessages,
    status,
    health,
    isStreaming,
    error,
    currentStyle,
    sendMessage,
    stopGeneration,
    retryLastMessage,
    createBranch,
    switchTrail,
    setStyle,
    setDraftPrompt,
    updateSessionTitle,
    updateTrailName,
    resetSession,
    togglePersistence,
    refreshHealth,
    supabaseAuthStatus,
    supabaseAuthError,
    replaceSession,
    updateSupabaseSync,
  } = useHushSession();

  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isMobileTrailsOpen, setIsMobileTrailsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFreshLanding = session.messages.length === 0;
  const cloudControls = (
    <CloudConversations
      session={session}
      authStatus={supabaseAuthStatus}
      authError={supabaseAuthError}
      isStreaming={isStreaming}
      onLoadSession={replaceSession}
      onUpdateSync={updateSupabaseSync}
      showSave={!isFreshLanding}
    />
  );

  // Auto-scroll when messages update or stream
  useEffect(() => {
    if (activeMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages.length, isStreaming]);

  if (isFreshLanding) {
    return (
      <>
        <LandingView
          onSendMessage={(prompt, style) => sendMessage(prompt, style)}
          status={status}
          health={health}
          persistence={session.persistence}
          currentStyle={currentStyle}
          onSelectStyle={setStyle}
          onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
          onRefreshHealth={refreshHealth}
          cloudControls={cloudControls}
        />
        <PrivacyModal
          isOpen={isPrivacyModalOpen}
          onClose={() => setIsPrivacyModalOpen(false)}
          persistence={session.persistence}
          onTogglePersistence={togglePersistence}
        />
      </>
    );
  }

  // Active trail branch details
  const isBranchTrail = Boolean(activeTrail.parentMessageId);
  const parentTrail = isBranchTrail && activeTrail.parentTrailId ? session.trails[activeTrail.parentTrailId] : null;

  return (
    <div className="flex flex-col h-screen bg-hush-bg text-hush-textPrimary overflow-hidden">
      {/* Workspace Header */}
      <WorkspaceHeader
        sessionTitle={session.title || 'Conversation'}
        onUpdateTitle={updateSessionTitle}
        status={status}
        health={health}
        persistence={session.persistence}
        onResetSession={resetSession}
        onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
        onToggleMobileTrails={() => setIsMobileTrailsOpen(!isMobileTrailsOpen)}
        onRefreshHealth={refreshHealth}
        cloudControls={cloudControls}
      />

      {/* Main Layout Body */}
      <div className="flex flex-1 min-h-0 flex-row-reverse overflow-hidden">
        {/* Thought Trails Sidebar */}
        <ThoughtTrailsSidebar
          session={session}
          activeTrailId={session.activeTrailId}
          onSwitchTrail={switchTrail}
          onUpdateTrailName={updateTrailName}
          isOpenMobile={isMobileTrailsOpen}
          onCloseMobile={() => setIsMobileTrailsOpen(false)}
        />

        {/* Conversation Workspace View */}
        <main className="flex-1 flex flex-col min-w-0 h-full relative">
          {/* Active Trail Banner */}
          <div className="px-4 py-2 bg-hush-surfaceSecondary/70 border-b border-hush-border text-xs flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 truncate">
              {isBranchTrail ? (
                <>
                  <button
                    type="button"
                    onClick={() => parentTrail && switchTrail(parentTrail.id)}
                    className="flex items-center gap-1 text-hush-violet hover:text-hush-lavender font-medium transition-colors"
                    title={`Return to ${parentTrail?.name || 'parent trail'}`}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{parentTrail?.name || 'Main Trail'}</span>
                  </button>
                  <CornerDownRight className="w-3 h-3 text-hush-textMuted" />
                  <span className="font-semibold text-hush-textPrimary truncate">{activeTrail.name}</span>
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-hush-textSecondary">
                  <GitBranch className="w-3.5 h-3.5 text-hush-violet" />
                  <span className="font-medium text-hush-textPrimary">{activeTrail.name}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-hush-textMuted shrink-0">
              <span className="hidden sm:inline">Active Style:</span>
              <span className="px-2 py-0.5 rounded bg-hush-surfaceElevated text-hush-lavender font-medium border border-hush-border">
                {currentStyle.replace('-', ' ')}
              </span>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4">
            <div className="max-w-[700px] mx-auto space-y-3">
              {activeMessages.map((msg, idx) => {
                const isLatestAssistant =
                  msg.role === 'assistant' &&
                  idx === activeMessages.findLastIndex((m) => m.role === 'assistant');

                return (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isLatestAssistant={isLatestAssistant}
                    isStreaming={isStreaming && isLatestAssistant}
                    onBranch={createBranch}
                    onRetry={retryLastMessage}
                    onExecuteAction={(prompt, styleOverride) => sendMessage(prompt, styleOverride)}
                  />
                );
              })}

              <div ref={messagesEndRef} className="h-4" />
            </div>
          </div>

          {/* Bottom Message Composer */}
          <div className="p-3 sm:p-4 bg-hush-bg/95 border-t border-hush-border backdrop-blur-xs shrink-0">
            <ChatComposer
              onSendMessage={(text) => sendMessage(text)}
              onStopGeneration={stopGeneration}
              isStreaming={isStreaming}
              currentStyle={currentStyle}
              onSelectStyle={setStyle}
              initialValue={activeTrail.draftPrompt || ''}
              onValueChange={setDraftPrompt}
            />
          </div>
        </main>
      </div>

      {/* Privacy & Storage Preferences Modal */}
      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        persistence={session.persistence}
        onTogglePersistence={togglePersistence}
      />
    </div>
  );
}
