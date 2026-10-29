# Hush AI Coding Assistant Rules

## Project summary
1. Hush AI is an anonymous, privacy-conscious AI companion for chat, learning, coding, and brainstorming.
2. The web application uses Next.js App Router, React, TypeScript, and Tailwind CSS.
3. AI responses come only from an authorized Ollama-compatible open-weight inference host; never use cloud-model fallbacks.
4. Thought Trails let users branch conversations while keeping sibling branches independent.
5. Conversation data stays in browser memory/session storage by default; local storage and Supabase sync are separate explicit opt-ins, with Supabase ownership enforced by RLS.

## Sources of truth
When documents disagree, follow this priority order:
1. `PRD.md` — product scope and behavior.
2. `DESIGN.md` — UI and visual requirements.
3. `ARCHITECTURE.md` — technical boundaries and implementation.
4. `DATABASE.md` — active Supabase table contract and separately labeled future design.
5. `API.md` — HTTP API contract.

## DO
- Follow the existing folder structure and established patterns.
- Reuse existing components, utilities, types, and dependencies where practical.
- Keep functions small and focused.
- Add brief comments to clarify complex or non-obvious logic.
- Handle errors explicitly and provide appropriate loading, empty, and failure states.
- Preserve privacy: keep inference credentials and sync encryption keys server-side; never expose a service-role key; avoid logging conversation content.
- Make focused changes and validate them with the relevant existing checks.
- Update directly related documentation when behavior or contracts change.

## DO NOT
- Change the technology stack.
- Add a library or dependency without asking first.
- Modify the database schema without updating `DATABASE.md`.
- Delete or rewrite working code unless the request explicitly asks for it.
- Hardcode secrets, credentials, or environment-specific private values.
- Add or change database tables, accounts, telemetry, or cloud-model fallback without approval.

## Workflow
1. Plan first: inspect the relevant source-of-truth documents and existing code; identify the intended scope.
2. If a request conflicts with any source-of-truth file, stop and ask the user before proceeding.
3. Code only after the scope is clear; preserve existing behavior outside the requested change.
4. Run the smallest relevant validation available and report any checks that could not be run.
5. Finish with a short summary of what changed and the validation performed.
