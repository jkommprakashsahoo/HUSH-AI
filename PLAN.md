# Hush AI Implementation Roadmap

## Scope and planning assumptions

This roadmap is for the anonymous web-first MVP described in `PRD.md`. The app already has a runnable Next.js UI, chat and health routes, Ollama integration, response styles, Thought Trails, browser storage, and opt-in Supabase sync code. The work below prioritizes closing documented gaps, validating vertical user flows, and preparing a safe release; it does not pretend those existing features still need to be built from scratch.

Tasks are sized for roughly 30–90 minutes each. Keep the app runnable with `npm run dev` after every task and phase. Supabase sync uses existing externally provisioned tables; no schema migration is part of this roadmap.

**No login/signup flow is planned:** anonymous Supabase auth exists only to scope explicitly saved conversations. No transcript is synced without a Save action.

## Existing runnable baseline

These slices are already present and should be preserved while the remaining work is completed:

- Next.js landing/workspace shell and responsive components.
- Chat and health API routes with server-side Ollama configuration.
- Four response styles, streamed chat, stop/retry UI, and Markdown rendering.
- Local Thought Trail branching, switching, renaming, and browser storage.
- Session-only storage by default and explicit local-storage choice.
- Anonymous Supabase auth and explicit save/list/load/delete code paths (end-to-end save/load/delete and two-user RLS tests remain pending).

`QA_CHECKLIST.md` records typecheck, lint, and production build as passing. Live generation and browser-based regression flows remain unverified or blocked there.

## Phase 1 — Foundation and API contract

**Goal:** Keep the existing app runnable while aligning implementation with the documented API contract.

- [x] **F1.1 — Unify chat error responses** (45–90 min)  
  **Build:** Return the nested `{ "error": { "code", "message", "details" } }` envelope documented in `API.md`; ensure client error handling still presents safe, useful messages.  
  **Files:** `app/api/chat/route.ts`, `hooks/use-hush-session.ts`, `API.md`.  
  **Verify:** Run `npm run typecheck` and `npm run lint`; send malformed JSON and an invalid payload to `/api/chat` and confirm both return the documented JSON shape and appropriate status.  
  **Depends on:** None.

- [ ] **F1.2 — Confirm unsupported-method behavior** (30–60 min)  
  **Build:** Verify how unsupported methods on `/api/chat` and `/api/health` are returned; document the actual `405` behavior and error envelope, adding explicit handling only if needed for the contract.  
  **Files:** `app/api/chat/route.ts`, `app/api/health/route.ts`, `API.md`.  
  **Verify:** Request an unsupported method from each route and check status and response shape; run `npm run typecheck`.  
  **Depends on:** F1.1.

**Definition of Done:** The development server starts; chat errors use one predictable documented format; the API documentation matches actual route behavior.

## Phase 2 — Anonymous access and privacy

**Goal:** Complete the MVP’s no-account privacy path without adding authentication.

- [x] **P2.1 — Verify storage choice and session reset** (45–90 min)  
  **Build:** Exercise the privacy dialog, default session storage, explicit local-storage opt-in, storage switching, and reset. Fix only defects found in these flows.  
  **Files:** `components/PrivacyModal.tsx`, `lib/storage.ts`, `hooks/use-hush-session.ts`, `app/page.tsx`.  
  **Verify:** In a browser, reload after choosing each storage mode; confirm expected retention, then reset and confirm the session and trails are cleared from both stores.  
  **Depends on:** F1.1.

- [ ] **P2.2 — Verify server-only inference configuration** (30–60 min)  
  **Build:** Confirm the inference URL and optional token remain in server code/environment configuration and are never exposed in client code or API responses. Correct any leakage found.  
  **Files:** `lib/ai.ts`, `app/api/chat/route.ts`, `app/api/health/route.ts`, `.env.example`, `ARCHITECTURE.md`.  
  **Verify:** Inspect client imports and returned payloads; run a production build and confirm no configured token or host credential is included in client-visible output.  
  **Depends on:** None.

**Definition of Done:** A user can use Hush without an account; session-only remains the default; persistence requires explicit choice; reset works; private inference credentials remain server-side.

## Phase 3 — Core feature vertical slices

**Goal:** Verify complete user journeys across UI, client state, and API rather than testing frontend and backend in isolation.

- [x] **C3.1 — Verify streamed chat, stop, and retry** (60–90 min)  
  **Build:** Run the full chat lifecycle and correct any mismatch in prompt preservation, partial output, cancellation, or retry behavior.  
  **Files:** `components/ChatComposer.tsx`, `components/ChatMessage.tsx`, `hooks/use-hush-session.ts`, `app/api/chat/route.ts`.  
  **Verify:** With a working local Ollama model, send a prompt, stop a response, and retry; confirm partial text is retained on stop and retry replaces only the prior assistant response.  
  **Depends on:** F1.1, P2.1.

- [ ] **C3.2 — Verify Thought Trail lineage isolation** (60–90 min)  
  **Build:** Validate branch creation from an assistant answer, parent lineage through the anchor, independent sibling turns, switching, and trail renaming; fix any observed defect.  
  **Files:** `hooks/use-hush-session.ts`, `types/chat.ts`, `components/ThoughtTrailsSidebar.tsx`, `app/page.tsx`.  
  **Verify:** Create two sibling trails, add distinct turns to each, switch between them, and confirm outgoing context includes ancestor messages only through each branch anchor plus that branch’s own turns.  
  **Depends on:** C3.1.

- [x] **C3.3 — Verify styles and rendered answers** (45–90 min)  
  **Build:** Check that all four style selections reach the server and that streamed Markdown/code answers remain readable and copyable.  
  **Files:** `components/StyleSelector.tsx`, `components/ChatMessage.tsx`, `lib/styles.ts`, `app/api/chat/route.ts`, `scripts/test-styles.js`.  
  **Verify:** Run `npm run test:styles` against a running Hush server and responsive Ollama model; confirm each response has non-empty output and its matching `X-Hush-Style` header; manually check Markdown and code copy.  
  **Depends on:** C3.1.

**Definition of Done:** Chat, cancellation/retry, all four styles, Markdown, and Thought Trail branching/isolation work in an end-to-end browser session using real model output. Unavailable inference never produces fabricated assistant content.

## Phase 4 — Inference and deployment integration

**Goal:** Validate honest runtime states locally and prepare a safe frontend deployment.

- [x] **I4.1 — Verify health and inference failure states** (45–90 min)  
  **Build:** Exercise missing configuration, unreachable host, missing model, ready host, and generation timeout/error states; fix discrepancies between routes, status UI, and `API.md`.  
  **Files:** `lib/ai.ts`, `app/api/health/route.ts`, `app/api/chat/route.ts`, `components/StatusBadge.tsx`, `API.md`.  
  **Verify:** Check `/api/health` and chat behavior with no configured host, a stopped host, an unavailable model, and a working local model; confirm safe status messages and HTTP codes.  
  **Depends on:** F1.1, P2.2.

- [ ] **I4.2 — Validate bounded requests and rate limiting** (45–90 min)  
  **Build:** Check the documented content type, JSON, schema, body-size, message-count, and per-process rate-limit behavior; reconcile any mismatch in the API documentation.  
  **Files:** `app/api/chat/route.ts`, `API.md`, `ARCHITECTURE.md`.  
  **Verify:** Send representative malformed, oversized, and over-limit requests; confirm the documented status, safe error response, and that valid requests still work.  
  **Depends on:** F1.1.

- [ ] **I4.3 — Prepare a frontend-only deployment preview** (45–90 min)  
  **Build:** Follow the deployment checklist for a preview without `OLLAMA_BASE_URL`; preserve the truthful configuration-missing experience. Do not select or replace a GitHub/Vercel target without authorization.  
  **Files:** `DEPLOYMENT_CHECKLIST.md`, `.env.example`, `README.md`.  
  **Verify:** Run `npm run build`; in an authorized preview deployment, check the landing page, `GET /api/health`, and the `503` chat response with no inference host configured.  
  **Depends on:** I4.1, I4.2.

- [ ] **I4.4 — Verify explicit Supabase conversation sync and RLS isolation** (60–90 min)  
  **Build:** Exercise anonymous session reuse/creation, explicit save/list/load/delete, branch relationships, server-side encryption, and owner isolation using two independent anonymous identities. Fix only confirmed defects and update the database/API/integration documentation to match. Do not create or alter tables.  
  **Files:** `app/api/conversations/route.ts`, `lib/supabase/`, `hooks/use-supabase-conversations.ts`, `components/CloudConversations.tsx`, `DATABASE.md`, `API.md`, `ARCHITECTURE.md`, `INTEGRATIONS.md`, `QA_CHECKLIST.md`.  
  **Verify:** Save a test conversation with at least one branch, reload it and compare parent/source IDs and messages, delete it, then use a second identity to confirm list/load/update/delete of the known first-user UUID are denied. Record each result; do not mark unperformed cross-user checks as passing.  
  **Depends on:** P2.1, C3.2.

**Definition of Done:** Runtime states and request limits match the API contract; a frontend-only deployment can run without an inference host and does not imply AI is ready.

## Phase 5 — Polish and release readiness

**Goal:** Close manual QA gaps and make the release status evidence-based.

- [ ] **R5.1 — Complete responsive and keyboard regression pass** (60–90 min)  
  **Build:** Check landing, workspace, trail drawer, privacy dialog, composer, and status/error states at desktop and mobile widths and with keyboard-only interaction. Fix only issues within existing design requirements.  
  **Files:** `app/page.tsx`, `components/ChatComposer.tsx`, `components/PrivacyModal.tsx`, `components/ThoughtTrailsSidebar.tsx`, `components/WorkspaceHeader.tsx`, `DESIGN.md`.  
  **Verify:** Complete the applicable desktop/mobile and keyboard scenarios in `QA_CHECKLIST.md`; confirm focus, escape/close behavior, and usable loading/error states.  
  **Depends on:** C3.1, C3.2, I4.1.

- [ ] **R5.2 — Record MVP QA evidence** (30–60 min)  
  **Build:** Update pass/blocked/not-implemented results with actual outcomes; do not mark live inference or browser flows as passing without running them.  
  **Files:** `QA_CHECKLIST.md`, `README.md`.  
  **Verify:** Re-run `npm run typecheck`, `npm run lint`, and `npm run build`; ensure the checklist accurately reports the results and any remaining blockers.  
  **Depends on:** C3.1, C3.2, C3.3, I4.1, R5.1.

- [ ] **R5.3 — Decide whether to add browser automation** (30–60 min)  
  **Build:** Review the remaining manual regression burden and propose a narrow browser-test scope. Add no package until the user approves a new dependency.  
  **Files:** `PRD.md`, `QA_CHECKLIST.md`, `package.json` only if dependency addition is approved.  
  **Verify:** If approved, select a single critical flow and run its automated check; otherwise record the decision and retain accurate manual QA status.  
  **Depends on:** R5.2.

**Definition of Done:** Desktop, mobile, keyboard, storage, branching, streaming, and unavailable states have evidence in the QA checklist; typecheck, lint, and build results are recorded; no unapproved dependency was added.

## Phase 6 — Launch

**Goal:** Release only after deployment target and inference-host prerequisites are authorized and verified.

- [ ] **L6.1 — Confirm publication target and deploy preview** (45–90 min)  
  **Build:** Use the user-authorized repository and hosting project; deploy the frontend-only preview first.  
  **Files:** `DEPLOYMENT_CHECKLIST.md`, `README.md`; deployment configuration only if required by the selected target.  
  **Verify:** Confirm the preview serves the app and health route, reports configuration missing without a host, and passes the release checks in `QA_CHECKLIST.md`.  
  **Depends on:** R5.2, I4.3.

- [ ] **L6.2 — Enable production inference only after host approval** (45–90 min)  
  **Build:** Configure server-side environment values for an authorized, reachable Ollama-compatible host; require TLS/authorization as appropriate and never expose port `11434` publicly. Do not use a Colab tunnel as production hosting.  
  **Files:** `DEPLOYMENT_CHECKLIST.md`, `README.md`; hosting environment configuration (no secrets committed to source).  
  **Verify:** Confirm health reports the configured model ready and a real streaming chat succeeds; confirm credentials are not returned to the browser. If no approved host exists, keep production frontend-only and report this task blocked.  
  **Depends on:** L6.1, I4.1.

- [ ] **L6.3 — Complete release go/no-go review** (30–60 min)  
  **Build:** Check all PRD MVP release criteria, unresolved blockers, and deployment rollback guidance; record the release decision.  
  **Files:** `QA_CHECKLIST.md`, `DEPLOYMENT_CHECKLIST.md`, `README.md`.  
  **Verify:** Confirm automated checks pass, manual MVP flows are complete, and production inference is either verified or explicitly disabled with an honest unavailable state.  
  **Depends on:** L6.1, L6.2.

**Definition of Done:** The authorized preview and release checks pass. Production AI is enabled only with a verified authorized inference host; otherwise launch remains explicitly frontend-only.

## Deferred scope and approval gates

- **Mandatory accounts and sign-up are not MVP work.** Supabase anonymous auth supports explicitly opted-in sync. Existing tables are managed outside this repository; no schema migrations, retention jobs, export, or key rotation/recovery are implemented. Define these policies before expanding persistence.
- **V2 features** (export, trail search/delete/archive, model selection, attachments, diagnostics, and browser automation) are not launch blockers. Add them as separate, sized tasks only after MVP release priorities are confirmed.
- Preserve the current API paths for compatible changes. Introduce a new path version for breaking API changes, as specified by `API.md`.
