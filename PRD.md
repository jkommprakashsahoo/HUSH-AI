# Product Requirements Document: Hush AI

**Status:** Draft  
**Product:** Hush AI  
**Platform:** Responsive web application (desktop, tablet, mobile browser)  
**Release:** Web-first MVP

## 1. Product summary

Hush AI is an anonymous, privacy-conscious AI companion for asking questions, learning, coding, brainstorming, and thinking through decisions without creating an account. Its signature feature, **Thought Trails**, lets people branch a conversation into independent paths without losing the original context.

Hush uses open-weight models through Ollama. Google Colab is used only for temporary model experimentation, while the web frontend can deploy to Vercel. Hush must not use commercial cloud-model APIs or fabricate responses when local or authorized inference is unavailable.

## 2. Problem statement

People often want a low-friction place to ask questions, explore unfinished ideas, or get help without creating an account, exposing an identity, or managing a linear, cluttered chat history. Conventional chat products make it difficult to explore alternate lines of reasoning while preserving the original conversation.

Hush solves this by providing an account-free AI chat experience with transparent local/open-weight inference status and Thought Trails for non-destructive branching.

## 3. Target users and personas

### 1. Curious student — Maya
- Wants simple explanations, study support, and a safe place to ask questions without judgment.
- Needs clear, structured answers and the ability to follow a side question without losing her study thread.
- Primarily uses a mobile browser or laptop.

### 2. Privacy-conscious developer — Alex
- Uses an AI assistant for debugging, architecture decisions, code explanation, and exploration of trade-offs.
- Values local/open-weight inference, visible runtime status, markdown/code formatting, and the ability to branch technical approaches.
- Primarily uses a desktop browser.

### 3. Reflective everyday user — Jordan
- Wants help brainstorming, weighing personal decisions, and organizing thoughts without an account or permanent cloud profile.
- Needs a calm, simple experience, clear privacy controls, and optional browser-only persistence.
- Uses desktop and mobile interchangeably.

## 4. Goals

1. Deliver a polished, anonymous AI chat experience that works without account creation.
2. Provide real streamed responses from an Ollama-compatible open-weight model when inference is available.
3. Support four distinct response styles: Quick Fix, Explain It, Think With Me, and Challenge Me.
4. Make Thought Trails genuinely independent, preserving only the relevant ancestor context at each branch point.
5. Provide transparent, actionable states for model configuration, missing models, offline inference, timeouts, cancellation, and errors.
6. Support session-only chat storage by default, explicit opt-in browser-local persistence, and a separate explicit opt-in to Supabase conversation sync.
7. Keep Supabase sync account-free through an anonymous auth session, with owner-based RLS and no login/signup screen.
8. Ship a responsive web interface for desktop, tablet, and mobile browsers.
9. Enable a frontend deployment before production inference is connected, without falsely representing AI availability.

## 5. Non-goals

- Mandatory login, profiles, social features, or account recovery.
- Cloud-model APIs, paid-model fallback, or fabricated responses.
- Unprompted or automatic server-side transcript storage; Supabase writes occur only after an explicit Save action.
- Mandatory accounts, login/signup screens, payments, analytics pipeline, or external telemetry.
- Native iOS, Android, macOS, or Windows applications.
- Treating Google Colab as a permanent public inference host.
- Publicly exposing Ollama port `11434`.
- Multi-user collaboration, shared Thought Trails, or permissions in the MVP.
- Automatic long-term memory beyond the user-selected browser storage option.

## 6. Feature scope

### MVP — must-have

#### Anonymous chat workspace
- Landing page with a clear privacy/local-inference value proposition.
- Composer for submitting prompts with keyboard support.
- Real streamed assistant responses when the configured Ollama host is available.
- Markdown rendering and code block copy actions.
- Visible loading/streaming state, stop generation, retry, and actionable error states.
- No fabricated response when inference is unavailable.

#### Conversation styles
- Quick Fix: concise, actionable answers.
- Explain It: structured, educational explanation.
- Think With Me: collaborative exploration and trade-off analysis.
- Challenge Me: constructive challenge to assumptions and reasoning.
- Style selection applies to the active trail and is sent to the server-side Ollama adapter.

#### Thought Trails
- Create a new branch from an assistant response.
- Carry the parent lineage through the selected assistant response into the new branch.
- Keep new turns independent from parent and sibling branch turns.
- Switch among root and sibling trails.
- Rename trails.
- Show active branch context in the workspace.

#### Privacy and session controls
- No account requirement.
- Session-only browser storage by default.
- Explicit opt-in to persistent browser `localStorage`.
- Anonymous Supabase identity is created without a login/signup screen to support optional remote sync.
- A conversation is written to Supabase only after explicit user action; the anonymous owner identity and RLS scope every operation.
- Saved titles and message content are encrypted by the Hush server before database writes; this is not end-to-end encryption.
- Users can list, load, and delete their explicitly saved conversations and Thought Trails.
- Reset action clears current session and all associated Thought Trails.
- Privacy dialog explains local inference, browser storage, and limitations.

#### Runtime health and deployment-safe behavior
- Health endpoint distinguishes configuration missing, Ollama unreachable, model missing, ready, and request failure states.
- Production deployment without an authorized model endpoint builds and serves the frontend.
- In that state, chat returns a truthful service-unavailable response and provides next steps.
- Environment variables remain server-side; no secrets reach the browser.

#### Responsive and accessible UI
- Desktop workspace with Thought Trails inspector.
- Tablet/mobile trail drawer or bottom sheet.
- Keyboard-accessible composer, dialog, controls, and close actions.
- Usable empty, offline, error, and streaming states.

### V2 — should-have

- Export a trail or conversation as Markdown/text.
- Search/filter Thought Trails within the active browser session.
- Per-trail delete/archive controls.
- More complete streaming diagnostics such as first-token latency and token rate, where safely available.
- Configurable local model selection from installed Ollama models.
- Optional prompt attachments that remain client/local-host scoped.
- Better browser storage quota handling and recovery UI.
- Playwright or equivalent automated browser regression coverage.

### Later — nice-to-have

- Self-hosted, privacy-preserving account system only if users explicitly request cross-device sync.
- Encrypted export/import bundles controlled entirely by the user.
- Additional authorized local inference backends such as llama.cpp or LM Studio, retaining the same no-cloud-fallback guarantee.
- Team/self-hosted deployment guidance for organizations.
- Optional offline-first/PWA support.
- Native applications after responsive web quality and privacy requirements are proven.

## 7. User stories

### Anonymous chat
- As a student, I want to ask a question without creating an account, so that I can start learning immediately.
- As an everyday user, I want to see whether AI is available before I send a prompt, so that I understand what will happen to my request.
- As a developer, I want markdown and code formatting, so that technical answers remain readable and reusable.
- As a user, I want to stop a response in progress, so that I can regain control when it is no longer useful.
- As a user, I want to retry a failed or weak response, so that I can continue without manually recreating context.

### Conversation styles
- As a student, I want to select Explain It, so that I receive accessible, structured explanations.
- As a busy user, I want to select Quick Fix, so that I get a concise next step.
- As a reflective user, I want to select Think With Me, so that I can explore a decision collaboratively.
- As a developer, I want to select Challenge Me, so that I can stress-test assumptions and trade-offs.

### Thought Trails
- As a user, I want to branch from an assistant answer, so that I can explore a tangent without losing the original conversation.
- As a user, I want to switch between sibling trails, so that I can compare independent lines of thought.
- As a user, I want branch context isolated from sibling turns, so that a tangent does not pollute the original reasoning.
- As a user, I want to rename a trail, so that I can recognize it later.

### Privacy and storage
- As a privacy-conscious user, I want session-only storage by default, so that my conversation is removed when I close the tab.
- As a returning user, I want to explicitly choose browser-local persistence, so that I can keep a conversation on this device.
- As a user, I want a separate explicit Save action for Supabase, so that no transcript is uploaded just because anonymous auth exists.
- As an anonymous user, I want to load and delete only my own saved conversations, so that remote sync does not require a login screen or expose another user's data.
- As a user, I want to reset my session, so that I can remove the active conversation and its trails.
- As a production visitor, I want an honest unavailable message when inference is not configured, so that I am not misled by fake AI behavior.

## 8. Key user flows

### Flow A: Start an anonymous conversation
1. User opens Hush in a browser.
2. Landing page shows the privacy promise and current runtime status.
3. User selects a conversation style or keeps the default.
4. User enters a prompt and submits via send button or Enter.
5. Hush creates a local session and sends a validated request to the server-side Ollama adapter.
6. If inference is ready, Hush displays the streamed response in the workspace.
7. If inference is unavailable, Hush displays the actual configuration/offline/model error and recovery guidance.

### Flow B: Explore a Thought Trail
1. User receives an assistant response in the main trail.
2. User selects the Thought Trail action on that response.
3. Hush creates a child trail anchored to that assistant message and switches to it.
4. The child workspace displays ancestor context through the branch anchor.
5. User sends a follow-up in the child trail.
6. Hush sends only the inherited lineage plus the child trail turns to the model.
7. User uses Thought Trails to return to the parent or switch to a sibling branch.

### Flow C: Stop and retry generation
1. User sends a prompt and sees a streaming assistant response.
2. User selects Stop.
3. Hush aborts the client/server request and marks the partial response as stopped.
4. User selects Retry on the latest response.
5. Hush retains the original user turn, replaces only the prior assistant response, and streams a new real response.

### Flow D: Manage privacy and persistence
1. User opens Privacy & Architecture.
2. Hush explains local inference, storage behavior, and limitations.
3. User chooses Session Only or Persist in Browser.
4. Hush moves the stored session to the selected browser storage area when available; this does not enable remote sync.
5. Hush creates or restores an anonymous Supabase identity without asking for signup.
6. Only after the user selects Save does Hush encrypt and write the conversation/tree to Supabase.
7. User may list, load, or delete their saved conversation; all remote operations remain owner-scoped by RLS.
8. User may select Reset to clear browser session data. Remote saved rows are deleted only through the explicit saved-conversation deletion action.

### Flow E: Frontend-only production deployment
1. Operator deploys the Next.js frontend to Vercel without `OLLAMA_BASE_URL`.
2. User opens the deployed UI.
3. `/api/health` reports `configuration_missing`.
4. The UI clearly shows that private AI is not configured.
5. `/api/chat` returns HTTP 503 with setup guidance; no answer is fabricated.
6. Once an authorized, reachable inference host is configured server-side, the operator verifies a real streaming request before enabling production use.

## 9. Success metrics

### MVP product metrics
- 90%+ of successful chat submissions show first streamed content within 10 seconds on a warmed, supported local inference environment.
- 95%+ of valid client requests receive either a real streamed response or a clear actionable error state.
- 100% of unavailable/model-missing/configuration-missing states avoid fabricated assistant content.
- 100% of created Thought Trails retain ancestor context only through their branch anchor and do not include sibling-only turns.
- 100% of reset actions remove the active session from supported selected browser storage.
- 0 account-creation steps required to send a chat prompt.

### Quality metrics
- Production build, TypeScript validation, and lint complete without errors.
- Core desktop and mobile user flows pass manual QA before release.
- No environment secrets, model tokens, or conversation transcripts are committed to source control.
- No transcript is written to Supabase without an explicit user Save action; no external telemetry service is introduced in the MVP.

## 10. Risks, assumptions, and open questions

### Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| No authorized production inference host | Vercel UI cannot return model responses | Deploy frontend honestly with `configuration_missing`; do not fake success; complete host setup separately. |
| Colab runtime is temporary/restricted | Experiment cannot become production service | Treat Colab strictly as model validation; do not create tunnels or public proxies. |
| qwen3:4b resource requirements | Slow generation or timeouts on limited hardware | Surface timeouts clearly; document GPU/RAM requirements; permit server-side timeout configuration. |
| Browser storage unavailable or quota-limited | Conversations cannot persist | Gracefully fall back to in-memory/session behavior and explain storage limitations. |
| Sensitive user prompts in browser storage | Privacy expectations could be violated | Default to session-only storage; require explicit persistence opt-in; disclose browser storage limitations. |
| Anonymous Supabase identity is mistaken for guaranteed anonymity | Users may misunderstand third-party session and network data | Disclose that anonymous auth creates a pseudonymous provider identity and is not end-to-end anonymity. |
| RLS or cookie session is misconfigured | Saved conversations could be unavailable or improperly scoped | Use publishable credentials only, require owner policies on every table, and test with two independent anonymous identities before release. |
| Sync encryption key is lost or exposed | Saved content may become unreadable or disclosed | Keep a server-only 32-byte key in deployment secrets, back it up securely, and never commit or expose it. |
| Public inference host abuse | Cost, availability, and privacy risk | Require authorized access, TLS where appropriate, server-side credentials, validation, and rate limits. |
| Branch context bugs | Incorrect or polluted Thought Trail answers | Test lineage resolution and sibling isolation manually and with future automated coverage. |

### Assumptions

- Users accept that local/browser storage is not equivalent to encryption.
- A supported Ollama-compatible host can be operated later for real production inference.
- Users can run Ollama locally for development and testing.
- The initial model is `qwen3:4b`, but the model remains configurable server-side.
- Vercel is used for the frontend/Next.js backend only; it does not host a persistent Ollama process.

### Open questions

1. Which authorized, secure Ollama-compatible infrastructure will serve production inference from Vercel?
2. What latency and hardware budget is acceptable for `qwen3:4b` in the target production environment?
3. Should browser-local persistence include an explicit per-conversation delete option in MVP or V2?
4. What accessibility standard and supported-browser matrix are required before public launch?
5. What abuse-prevention policy is required if a public frontend can invoke an authorized private inference host?
6. What retention window and key rotation/recovery process should apply to opt-in Supabase sync?

## 11. MVP release criteria

The MVP is ready for release when:

1. All MVP flows work in supported desktop, tablet, and mobile browsers.
2. A real Ollama test validates streaming for all four styles in the selected environment.
3. Thought Trail branching, switching, isolation, reset, and persistence behavior pass manual QA.
4. Health/error states accurately distinguish configuration missing, offline, missing model, timeout, and request failure.
5. TypeScript, lint, and production build checks pass.
6. Supabase anonymous auth, explicit save/load/delete, and cross-user RLS isolation pass tests.
7. A GitHub repository and Vercel Preview are created through an authorized account.
7. A real deployed streaming request succeeds only after a supported, secure production inference endpoint is configured; otherwise the deployment remains explicitly frontend-only.
