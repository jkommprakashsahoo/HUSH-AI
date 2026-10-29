# Hush AI MVP Feature Build Guide

## How to use this guide

Build and verify **one feature at a time**. The project already has a runnable MVP baseline; treat existing routes, components, hooks, and storage as implementation to validate and improve, not as blank scaffolding.

1. Select one feature and complete only its listed build steps.
2. Keep the app runnable with `npm run dev`; preserve session-only defaults, explicit browser-local/Supabase consent, anonymous-only auth, and no telemetry or cloud-model fallback.
3. Verify that feature against its acceptance checklist and the relevant `PLAN.md` tasks.
4. Update the completed task checkboxes in `PLAN.md` only after the work and verification actually pass.
5. Stop and ask the user before starting another feature.

Task IDs below refer to `PLAN.md`. They are related roadmap work, not permission to implement multiple features in sequence without confirmation. Cross-cutting roadmap tasks may support more than one feature; do not mark one complete until its full stated scope is verified.

## Shared design and architecture constraints

- Follow `DESIGN.md`: calm, editorial reading space; approved colors, typography, spacing, responsive patterns, and explicit status states.
- Reuse existing UI surfaces: landing page, conversation workspace, assistant message document, composer, status badge, privacy dialog, and desktop Thought Trails inspector/mobile drawer.
- Keep inference server-side. The browser calls Hush routes and never connects directly to Ollama.
- Conversations stay in memory or `sessionStorage` by default; `localStorage` and Supabase sync are separate explicit choices.
- Supabase anonymous auth supports opt-in sync without a login/signup screen. Use the existing externally provisioned tables and owner-based RLS; do not create or alter schema.
- API errors should follow the nested standard envelope in `API.md`. The current chat route still returns flat error fields; treat fixing this as planned work, not as current behavior.
- Keep the app runnable after each feature; run the smallest relevant checks and update `QA_CHECKLIST.md` with evidence where appropriate.

## Feature 1 — Runtime health and honest availability

**What it does:** Shows whether private inference is configured, reachable, and has the configured model installed. It keeps the UI honest when chat cannot run.

**User story:** As an everyday user, I want to see whether AI is available before I send a prompt, so I understand what will happen. As a production visitor, I want an honest unavailable message when inference is not configured, so I am not misled.

**Screens and components (DESIGN.md):**

- Landing surface and active workspace header: `components/LandingView.tsx`, `components/WorkspaceHeader.tsx`.
- Runtime status indicator and detail popover: `components/StatusBadge.tsx`.
- UI composition and refresh action: `app/page.tsx`.
- Server health check/provider: `app/api/health/route.ts`, `lib/ai.ts`.

**Database and API:**

- MVP tables: **None.** Health is derived from server configuration and a live host check; no runtime table exists in `DATABASE.md`.
- Endpoint: `GET /api/health`. Returns HTTP 200 with `ready`, `configuration_missing`, `offline`, `model_missing`, or `error`.
- Chat availability is also surfaced by `POST /api/chat` as 503, 404, 504, or 500 depending on the failure.

**Step-by-step build order:**

1. Keep health evaluation in the server-only provider; verify configuration and model checks without returning host URLs, tokens, or stack traces.
2. Keep the API health response shape and all status values aligned with `API.md`.
3. Wire initial load and manual refresh through the existing page/status components.
4. Render each state with the DESIGN.md status colors and actionable plain-language guidance.
5. Exercise missing configuration, unreachable host, missing model, ready model, and unexpected health failure; record results.

**Edge cases, validation, and UI states:**

- Configuration missing, runtime unreachable, model missing, and unexpected check failure are distinct states; do not represent them as ready.
- No request body or query parameters are used. The configured host and model are server-controlled.
- Loading/connecting: show a neutral loading state while the check is pending; avoid showing ready before model availability is confirmed.
- Empty: no installed-model list when the host is unconfigured or unreachable.
- Error: health-check failures remain sanitized status reports; chat failures use the corresponding API status and code. No fabricated assistant response.

**Acceptance criteria:**

- [x] Initial load checks runtime health and presents the returned state.
- [x] Manual refresh rechecks status and updates the indicator.
- [x] `ready`, `configuration_missing`, `offline`, `model_missing`, and `error` are visibly distinct and truthful.
- [x] No server secret, raw host URL, prompt, or stack trace is exposed.
- [x] Frontend remains usable without an inference host.
- [x] Relevant `PLAN.md` work is verified before marking it complete.

**Plan links:** P2.2, I4.1, I4.3, L6.1, L6.2.

## Feature 2 — Anonymous chat, streaming, stop, and retry

**What it does:** Lets a user submit a prompt without an account, stream a real Ollama response, stop generation, and retry while preserving the original user turn.

**User stories:** As a student, I want to ask a question without creating an account. As a developer, I want readable Markdown and code. As a user, I want to stop a response and retry without recreating context.

**Screens and components (DESIGN.md):**

- Empty landing and prompt entry: `components/LandingView.tsx`, `components/ChatComposer.tsx`.
- Reading workspace and streamed assistant document/actions: `app/page.tsx`, `components/ChatMessage.tsx`.
- Loading, failure, and availability cues: `components/StatusBadge.tsx`.
- Session orchestration: `hooks/use-hush-session.ts`.

**Database and API:**

- MVP tables: **None.** Messages remain browser-side; the future `messages` table is not read or written.
- Endpoint: `POST /api/chat`, sending only user/assistant history and optional style.
- Request validation: JSON content type; 1–50 messages; strict message shape; role `user` or `assistant`; trimmed content length 1–12,000 characters; total content and raw request each bounded to 64 KiB.
- Success: streamed UTF-8 `text/plain` body with `X-Hush-Style`.

**Step-by-step build order:**

1. Confirm the landing composer creates a user turn in the active local session.
2. Resolve and send the relevant active-trail history to `POST /api/chat`; keep provider configuration and credentials server-only.
3. Read the text stream incrementally and update the assistant message without replacing the page.
4. Add/verify stop behavior: abort the request, preserve partial text, and mark the response as stopped rather than failed.
5. Add/verify retry: preserve the user message, replace only the corresponding assistant result, and stream a new real response.
6. Render Markdown and code blocks safely; make code-copy available on code blocks.
7. Align client error parsing with the standard nested error envelope as implemented in the API-contract task.

**Edge cases, validation, and UI states:**

- Reject invalid JSON (400), invalid schema (400), oversize body (413), wrong content type (415), rate limit (429), unconfigured/offline runtime (503), missing model (404), timeout (504), and unexpected generation error (500).
- While streaming, show progress and Stop; disable duplicate submission.
- On stop or failure, retain the prompt and partial output; do not show fabricated replacement text.
- On empty session, show the landing view and no transcript placeholder messages.
- On stream failure, show a clear inline error and offer Retry only when a valid original user turn exists.
- Client cancellation may close the stream without a JSON error response.
- Respect API request bounds before sending; server validation remains authoritative.

**Acceptance criteria:**

- [x] A user can submit a prompt without login.
- [x] Valid requests produce actual streamed model text or a truthful actionable error.
- [x] Stop aborts generation and preserves any partial response.
- [x] Retry retains the user turn and replaces only the previous assistant response.
- [x] Markdown is readable and code-copy works.
- [x] Invalid and unavailable requests never become fake assistant messages.
- [x] Chat errors use the single documented error envelope after the contract task is complete.

**Plan links:** F1.1, F1.2, C3.1, I4.2.

## Feature 3 — Conversation styles

**What it does:** Allows each active trail to use Quick Fix, Explain It, Think With Me, or Challenge Me, and sends that choice to the server-side model adapter.

**User stories:** A student wants an accessible explanation; a busy user wants a concise fix; a reflective user wants collaborative exploration; a developer wants assumptions challenged.

**Screens and components (DESIGN.md):**

- Style selector on landing and composer: `components/StyleSelector.tsx`, `components/LandingView.tsx`, `components/ChatComposer.tsx`.
- Active style context: `app/page.tsx`.
- Style metadata and model instructions: `lib/styles.ts`.

**Database and API:**

- MVP tables: **None.** The active trail style is stored in browser session state. Future `user_preferences` is not used.
- Endpoint: `POST /api/chat`; `style` is optional and must be `quick-fix`, `explain-it`, `think-with-me`, or `challenge-me`. Missing style defaults to `quick-fix`.

**Step-by-step build order:**

1. Reuse the canonical style IDs and labels from `lib/styles.ts`; do not create a second style list.
2. Confirm selection updates the active trail and remains visible in the selector/active-trail UI.
3. Include the selected style in every chat request.
4. Validate the style against the server allowlist and map it to its corresponding style instruction.
5. Verify the response header reports the resolved `X-Hush-Style`; test each style with real Ollama output.

**Edge cases, validation, and UI states:**

- Missing style resolves to Quick Fix.
- Unknown style is rejected as an invalid payload; never silently claim a different selected style.
- Loading/streaming keeps the selected style visible and prevents accidental duplicate sends.
- Empty state shows the default style with no implied previous response.
- Inference errors follow chat error handling; style selection must not produce placeholder output.

**Acceptance criteria:**

- [x] All four styles are selectable in the landing/composer surfaces.
- [x] The chosen style applies to the active trail and is submitted with chat.
- [x] Server-side style instructions match the chosen style.
- [x] The response header matches the resolved style.
- [x] Invalid styles are rejected; omitted style defaults as documented.

**Plan links:** C3.3, C3.1.

## Feature 4 — Thought Trails

**What it does:** Branches from a completed assistant response, carries only ancestor context up to that branch point, keeps child turns independent, and lets the user switch and rename trails.

**User stories:** A user wants to branch from an answer, compare sibling trails, prevent sibling turns from contaminating context, and rename a trail for recognition.

**Screens and components (DESIGN.md):**

- Assistant message branch action: `components/ChatMessage.tsx`.
- Desktop trail inspector and mobile drawer/bottom sheet: `components/ThoughtTrailsSidebar.tsx`.
- Active branch/ancestor context and workspace composition: `app/page.tsx`.
- Branch lineage and message context: `hooks/use-hush-session.ts`, `types/chat.ts`.

**Database and API:**

- MVP tables: **None.** Trails and messages live in browser session state/storage. Future `conversations`, `thought_trails`, and `messages` tables are not used.
- There is no trail API endpoint. When a child trail sends a prompt, it uses `POST /api/chat` with the branch's resolved message lineage only.

**Step-by-step build order:**

1. Allow branch creation only from a completed assistant response; set parent trail and anchor message identifiers.
2. Create and activate a child trail without editing parent or sibling messages.
3. Resolve context by walking parent lineage through the anchor message, then append only the active child trail's own turns.
4. Render active, parent, and sibling trails in the desktop inspector and mobile drawer using DESIGN.md branch cues.
5. Implement trail switching and renaming while preserving branch histories.
6. Verify that the chat request contains no sibling-only turns; record the exact scenario in QA.

**Edge cases, validation, and UI states:**

- Do not branch from an incomplete/streaming or failed assistant response.
- Ignore or prevent an anchor message that is missing or belongs to an unrelated trail.
- Parent context ends at the selected assistant anchor; later parent turns are excluded.
- Sibling messages are never included in the active trail request.
- Empty child trail shows inherited context and an empty composer state; it has no local child turns yet.
- Switching trails during active generation must not attach the response to the wrong trail; stop or safely retain generation ownership according to the existing session behavior.
- Rename rejects blank trimmed names; cancel leaves the previous name intact.

**Acceptance criteria:**

- [ ] A completed assistant response can create a child trail anchored to that response.
- [ ] Child trail displays its branch/parent relationship.
- [ ] Context includes ancestor turns only through the anchor plus active-trail turns.
- [ ] Sibling-only turns never enter another trail's API request.
- [ ] User can switch among root and sibling trails without losing their messages.
- [ ] User can rename a trail; blank names do not overwrite a valid name.
- [ ] Desktop and mobile trail navigation remain usable.

**Plan links:** C3.2, C3.1, R5.1.

## Feature 5 — Privacy, browser storage, and reset

**What it does:** Keeps sessions temporary by default, supports explicit opt-in browser persistence, explains storage limitations, and clears stored session data on reset.

**User stories:** A privacy-conscious user wants session-only storage by default; a returning user opts into local browser persistence; a user can reset the conversation and trails.

**Screens and components (DESIGN.md):**

- Privacy disclosure and storage selector: `components/PrivacyModal.tsx`.
- Header privacy action and reset: `components/WorkspaceHeader.tsx`.
- Landing privacy entry and modal composition: `components/LandingView.tsx`, `app/page.tsx`.
- Validation, hydration, persistence, and clearing: `lib/storage.ts`, `hooks/use-hush-session.ts`.

**Database and API:**

- MVP tables: **None.** Browser memory, `sessionStorage`, and explicitly selected `localStorage` only.
- API endpoints: none. Reset and storage preference changes are client-side operations.

**Step-by-step build order:**

1. Initialize a new anonymous session in memory with session-only persistence.
2. Hydrate only validated session data from the selected browser store without overwriting it during initial load.
3. Explain local inference and browser storage limitations in the privacy dialog.
4. On explicit opt-in, switch the session to local storage and remove the previous stored copy when possible.
5. On switch back, move to session storage and remove the local copy when possible.
6. On reset, cancel active generation, clear the session key from both supported stores, and initialize a fresh session.
7. Verify behavior when browser storage is disabled, corrupt, or quota-limited; preserve in-memory use and communicate limitations without claiming persistence succeeded.

**Edge cases, validation, and UI states:**

- Session-only is always the default; do not silently opt users into local storage.
- Reject malformed stored session shapes and avoid hydrating references to missing trails.
- Storage APIs may throw or be unavailable. Continue in memory and provide accurate UX; do not indicate persistence succeeded if it did not.
- Switching storage must not leave a stale duplicate as the active session copy.
- Empty/new session loads the landing state.
- Reset during generation aborts the request and prevents old output from repopulating the new session.

**Acceptance criteria:**

- [ ] Fresh users start with session-only persistence.
- [ ] Local persistence occurs only after an explicit user choice.
- [ ] Reload behavior matches the selected storage mode.
- [ ] Invalid storage payloads do not crash the app or corrupt session state.
- [ ] Reset removes the active session from both supported stores and creates a fresh session.
- [ ] UI clearly discloses browser storage is not equivalent to encryption.
- [ ] No transcript is sent to Supabase without the explicit Save action.

**Plan links:** P2.1, C3.1, R5.1.

## Feature 6 — Responsive, accessible workspace

**What it does:** Presents the landing page and conversation workspace in a responsive, keyboard-usable layout with clear empty, loading, streaming, and failure states.

**User stories:** Users on desktop, tablet, and mobile need a readable workspace, accessible composer and dialogs, and usable empty/offline/error/streaming states.

**Screens and components (DESIGN.md):**

- Landing sanctuary: `components/LandingView.tsx`.
- Conversation workspace and header: `app/page.tsx`, `components/WorkspaceHeader.tsx`.
- Prompt composer and style controls: `components/ChatComposer.tsx`, `components/StyleSelector.tsx`.
- Message reading/action surface: `components/ChatMessage.tsx`.
- Mobile trail drawer: `components/ThoughtTrailsSidebar.tsx`.
- Privacy dialog and status detail: `components/PrivacyModal.tsx`, `components/StatusBadge.tsx`.
- Tokens, typography, breakpoints, and interaction patterns: `app/globals.css`, `DESIGN.md`.

**Database and API:**

- MVP tables: **None.** Layout and transient UI state are client-side.
- Uses existing `GET /api/health` and `POST /api/chat` only through their corresponding product flows; layout itself adds no endpoint.

**Step-by-step build order:**

1. Verify the landing view at supported desktop, tablet, and mobile widths using approved DESIGN.md tokens.
2. Verify active workspace reading width, scroll behavior, composer placement, and header controls.
3. Verify Thought Trails inspector switches to the documented mobile drawer/bottom-sheet pattern.
4. Verify keyboard operation for composer, dialogs, close controls, and trail navigation.
5. Verify reduced-motion behavior and focus visibility using existing design rules.
6. Correct only observed mismatches; run build/type/lint checks and update QA evidence.

**Edge cases, validation, and UI states:**

- Long prompts, long assistant messages, code blocks, and many trails must remain readable/scrollable without obscuring controls.
- Empty session displays the landing view; a non-empty session displays the active workspace.
- Health loading/unavailable and chat streaming/error states must be distinguishable and actionable.
- Dialog/drawer close via supported controls and keyboard; focus must remain visible and be restored appropriately.
- Respect reduced motion; avoid relying on animation alone to communicate status.

**Acceptance criteria:**

- [ ] Landing and active workspace are usable at desktop, tablet, and mobile widths.
- [ ] Mobile Thought Trails navigation can open, select a trail, and close.
- [ ] Composer and dialog controls are keyboard-accessible with visible focus.
- [ ] Empty, loading, streaming, offline, and error states are understandable.
- [ ] Typography, colors, spacing, and branch/status cues follow `DESIGN.md`.
- [ ] Automated build/type/lint checks pass and manual results are recorded in `QA_CHECKLIST.md`.

**Plan links:** R5.1, R5.2.

## Feature 7 — Deployment-safe MVP release

**What it does:** Makes the frontend deployable without an inference host, then enables real inference only after an authorized host is configured and verified.

**User story:** A production visitor sees an honest configuration-missing state on frontend-only deployments. Operators can enable real AI only through an authorized, reachable, protected Ollama-compatible host.

**Screens and components (DESIGN.md):**

- Landing/workspace availability states: `components/LandingView.tsx`, `components/StatusBadge.tsx`.
- Health and chat routes: `app/api/health/route.ts`, `app/api/chat/route.ts`.
- Server-only configuration: `lib/ai.ts`, `.env.example`.
- Release steps/evidence: `DEPLOYMENT_CHECKLIST.md`, `QA_CHECKLIST.md`, `README.md`.

**Database and API:**

- MVP tables: **None.** Do not add database setup to deployment.
- `GET /api/health`: reports configuration/runtime/model state.
- `POST /api/chat`: returns a truthful error if inference is not available; streams real output only when configured.

**Step-by-step build order:**

1. Run typecheck, lint, production build, and the complete MVP browser regression pass.
2. Deploy a preview using an authorized hosting target, with `OLLAMA_BASE_URL` unset.
3. Verify the preview serves the UI, health endpoint reports configuration missing, and chat does not fabricate a response.
4. Only after host approval, configure server-side inference values and verify connectivity/model readiness.
5. Verify one genuine streaming chat response and that no credentials appear in client responses.
6. Complete the go/no-go checklist and leave deployment frontend-only if inference prerequisites remain unresolved.

**Edge cases, validation, and UI states:**

- No host configured: frontend remains usable; health identifies configuration missing; chat returns 503.
- Host unreachable or unauthorized: show safe offline/error state; do not leak credentials or host internals.
- Host has no configured model: report model missing; do not claim readiness.
- Preview/deployment target is not authorized: stop before creating or replacing external projects.
- Colab localhost/tunnels are never production inference endpoints; never expose Ollama port 11434 publicly.

**Acceptance criteria:**

- [ ] Production build succeeds without an inference host.
- [ ] Frontend-only deployment reports configuration missing truthfully.
- [ ] Authorized host is configured only with server-side values and is protected appropriately.
- [ ] Real chat is verified before enabling production AI; otherwise AI remains clearly unavailable.
- [ ] Release QA and rollback guidance are complete.

**Plan links:** I4.3, L6.1, L6.2, L6.3, R5.2.

## Feature 8 — Explicit Supabase conversation sync

**What it does:** Creates/reuses an anonymous Supabase identity and lets the user explicitly save, list, load, or permanently delete a conversation and its Thought Trail tree. The browser remains the default storage; auth alone never uploads chat content.

**User story:** As a Hush user, I want to save selected conversations across visits without creating an account, and I want to load or permanently delete my own saved data without accessing another anonymous user's records.

**Screens and components (DESIGN.md):**

- `components/CloudConversations.tsx`: explicit Save and Saved controls, list/load/delete confirmations, loading, empty, success, and error states.
- `components/WorkspaceHeader.tsx`, `components/LandingView.tsx`, and `app/page.tsx`: place the controls in the workspace while preserving the existing chat UI.
- No login/signup screen is added.

**Database tables and API endpoints:**

- Existing external tables only: `public.conversations` and `public.messages`; see the active schema contract in `DATABASE.md`. Do not create/drop/alter them.
- `GET /api/conversations`: list up to 100 saved roots; `GET /api/conversations?id=<uuid>`: load one root tree.
- `POST /api/conversations`: save/upsert the full conversation and trails only on explicit action.
- `DELETE /api/conversations?id=<uuid>`: permanently delete the root tree.
- The browser calls `ensureAnonymousSupabaseSession()` before sync. Route handlers use cookie-backed identity, `auth.getUser()`, owner filters, and RLS; never use a service-role key.
- Encrypt titles, trail names, and message content with server-only `HUSH_SYNC_ENCRYPTION_KEY`; disclose that this is not end-to-end encryption.

**Build order:**

1. Verify Supabase URL/publishable-key configuration, browser/server clients, cookie session restoration, and anonymous sign-in.
2. Verify Save maps each root/branch to stable remote UUIDs and stores the authenticated user's actual owner ID.
3. Verify branch parent conversation IDs and source message IDs survive save/load with independent Thought Trail histories.
4. Verify saved-list refresh, title rendering, load confirmation/replacement, delete confirmation, and all operation states.
5. Test with two distinct anonymous users that list/load/upsert/delete remain isolated, including a known foreign UUID.
6. Update `DATABASE.md`, `API.md`, `ARCHITECTURE.md`, `INTEGRATIONS.md`, `QA_CHECKLIST.md`, and `README.md` with only verified behavior.

**Edge cases, validation, and UI states:**

- Missing/malformed environment configuration, anonymous sign-in disabled, expired session, and network/policy errors must not be reported as success.
- Reject malformed UUIDs, unsupported styles/roles, invalid tree/source mappings, oversized payloads, and trees over the API caps before persistence.
- A partial save/delete can leave partial rows because the route does not use a transaction; surface the error and allow safe retry where possible.
- Foreign and nonexistent root IDs both return not found; test that users cannot access a known foreign UUID.
- Saved titles/content are server-decrypted only for the owner. A lost encryption key prevents reads; do not silently display ciphertext as a title.
- Saving is disabled for an empty or currently streaming session. Loading over active content requires confirmation. Deletion requires explicit confirmation.
- Browser `sessionStorage`/`localStorage` choice is separate from remote sync and reset does not delete Supabase copies.

**Acceptance criteria:**

- [ ] Anonymous session is restored or created without a login/signup screen.
- [ ] Auth-only use does not upload transcript data.
- [ ] Explicit save persists all root/branch/message rows with the actual authenticated user ID and server-encrypted sensitive text.
- [ ] Load preserves independent trails, parent IDs, source message IDs, styles, and message ownership.
- [ ] Save/load/delete show success only after server confirmation and have loading/error/empty states.
- [ ] Deletion removes the selected root tree only after user confirmation.
- [ ] A second anonymous user cannot list, load, update, or delete the first user's records, even with a known UUID.
- [ ] Supabase table definitions are not recreated or changed by the app.

**Plan links:** I4.4.

## Feature-level sequencing

This guide documents implementation order within each feature; it does not authorize parallel feature implementation. Select one feature, complete its steps and acceptance criteria, update only the corresponding verified `PLAN.md` checkboxes, then stop for user confirmation before beginning another feature. Cross-feature dependencies in `PLAN.md` remain binding.

Authentication, PostgreSQL persistence, migrations, and seed data are explicitly deferred and are not MVP features. Revisit them only after the `DATABASE.md` adoption gate is satisfied and `PRD.md` approves the scope.
