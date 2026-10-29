# Hush QA Checklist

Last updated: 2026-10-29

## Automated verification

| Area | Status | Evidence / limitation |
| --- | --- | --- |
| TypeScript | PASS | `npm run typecheck` completed successfully after Supabase documentation and saved-title response changes. |
| Lint | PASS WITH WARNING | `npm run lint` completed. Next.js reports the existing Google-font warning in `app/layout.tsx`; it is not a lint failure. |
| Production build | PASS | `npm run build` passed in an isolated project copy so the active development server's `.next` output was not changed. The only warning is the existing Google-font lint warning in `app/layout.tsx`. |
| Unit tests | NOT IMPLEMENTED | No test runner or unit-test script is configured in `package.json`. |
| Integration tests | NOT IMPLEMENTED | No integration-test framework is configured. |
| API health states | PASS | Local dev server `/api/health` returned HTTP 200 for `ready`, `configuration_missing`, `offline`, and `model_missing`; the client `error` state was exercised with a browser response mock. |
| Chat inference failures | PASS | Local dev server returned `503 INFERENCE_NOT_CONFIGURED`, `503 OLLAMA_OFFLINE`, `404 MODEL_NOT_FOUND`, and `504 TIMEOUT`; errors were sanitized. |
| Chat error envelope | PASS | Malformed JSON, invalid schema, and unconfigured inference returned nested `error.code`, `error.message`, and `error.details` fields with the documented HTTP status. |
| Successful streamed inference | PASS | Local dev server with `qwen3:4b` returned HTTP 200 and a real streamed `OK` response. |
| Invalid JSON handling | PASS | Local production server returned HTTP 400 for malformed `/api/chat` JSON. |
| Invalid message role | PASS | Local production server returned HTTP 400 for a disallowed `system` role. |

## Manual application checks

| Flow | Status | Notes |
| --- | --- | --- |
| Runtime status and refresh | PASS | Browser showed truthful ready, configuration-missing, and health-error details; a mocked offline-to-ready refresh updated the status. |
| Landing page and composer | PASS | Submitted an anonymous prompt and received real local-model output in the workspace. |
| Workspace, Markdown, code-copy | PASS | Rendered mocked Markdown/code and confirmed the code-copy action changed to “Copied”. |
| Stream, stop, retry | PASS | Real streamed output completed; a long response was stopped with partial output retained; retry replaced a failed assistant result without removing its user turn. |
| Four response styles | PASS | `npm run test:styles` produced non-empty local-model output and matching `X-Hush-Style` values for all four styles; browser checks confirmed selection, active-trail state, request IDs, and reload persistence. Omitted style returned `quick-fix`; unknown style returned HTTP 400 `INVALID_PAYLOAD`. |
| Active-trail style selection | PASS | Verified the style from a landing suggestion updates both the assistant message and active trail; directly selected styles persisted across reload. |
| Thought Trail creation/switching/isolation | NOT IMPLEMENTED | Implemented in `use-hush-session`; requires browser QA with an assistant response. |
| Session-only/local-storage behavior | PASS | Confirmed session-only is the default, local opt-in survives reload, switching back moves the session and removes the other copy, and reset clears messages from both storage locations. |
| Anonymous Supabase session creation/reuse | UNVERIFIED | Auth endpoint was previously checked, but automatic browser session restoration/creation and reuse through the current UI have not been verified end to end. |
| Explicit Supabase save/list/load/delete | UNVERIFIED | API/UI paths exist; no complete save-load-delete browser round trip has been verified in this checkout. |
| Saved conversations dialog click | BLOCKED | The existing development server returns 404 for `/_next/static/chunks/main-app.js` and `app-pages-internals.js`; React does not hydrate, so the Saved button cannot open its dialog. Do not stop or restart the pre-existing server without authorization. |
| Thought Trail Supabase relationships | UNVERIFIED | Parent conversation IDs, source message IDs, and independent branch histories require an end-to-end save/load comparison. |
| Supabase RLS isolation | UNVERIFIED | Test with two independent anonymous identities, including access attempts using a known foreign conversation UUID. |
| Privacy dialog keyboard behavior | NOT IMPLEMENTED | Escape, focus restoration, and focus trapping are implemented; requires browser QA. |
| Mobile layout | NOT IMPLEMENTED | Requires viewport/browser QA. |
| Deployed UI | BLOCKED | No GitHub repository or Vercel project/authorization target is configured. |
| Deployed AI request | BLOCKED | No authorized production inference host or deployment exists. |

## Required manual regression pass

1. Start Ollama with `qwen3:4b` available and run `npm run dev`.
2. Send a prompt in each response style; verify streaming and stop behavior.
3. Retry the latest response and confirm only the assistant response is replaced.
4. Create at least two Thought Trails, continue each, and confirm sibling histories remain isolated.
5. Switch persistence between session and local storage, reload, and verify expected retention.
6. Test the privacy dialog with keyboard only: open, Tab/Shift+Tab, Escape, and focus restoration.
7. Repeat the workspace and Thought Trails flow at a mobile viewport.
8. Configure Supabase anonymously, save a test conversation with a branch, verify both parent/source references on reload, and confirm deletion.
9. Repeat ownership attempts as a second anonymous user; list/load/upsert/delete of the first user's known UUID must not reveal or mutate its rows.
