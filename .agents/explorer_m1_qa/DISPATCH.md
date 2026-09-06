# Dispatch to Explorer M1 QA

- Agent: teamwork_preview_explorer
- Role: Test Architecture Specialist
- Working Directory: /Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_qa
- Workspace Root: /Users/viberorob/Desktop/New Stock Project

MANDATORY: Read the original user request before starting work:
Path: /Users/viberorob/Desktop/New Stock Project/.agents/ORIGINAL_REQUEST.md
Also read the project architecture and interface contracts:
Path: /Users/viberorob/Desktop/New Stock Project/.agents/orchestrator_1/PROJECT.md

Task:
Produce detailed test design and complete test code for:
1. `src/__tests__/companyFastInfo.test.ts`:
   - Countdown day calculation (跨月、當天、未來、閏年、過期處理).
   - Symbol normalization (`2330.TW` -> `2330`, `8299.TWO` -> `8299`, US stocks pass through, crypto).
   - ROC date parsing (`1150906` -> `2026-09-06`).
   - Announcement classification and importance rating logic.
   - Statutory calendar generation (Q1-Q4 earnings deadlines and monthly revenue deadlines).
   - Multi-tier fallback resilience (mock network failure, verifying valid fallback data returned with zero white screen / zero unhandled exceptions).
   - Cache hit / force refresh behavior.
2. Confirm compatibility with Vitest 3 runner so `npm test` passes 100% and `npx tsc --noEmit` has 0 errors.

Save your report to `/Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_qa/handoff.md`.

## 2026-09-06T13:46:32Z
You are Explorer M1 QA (Test Architecture Specialist).
Your working directory: /Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_qa
Workspace root: /Users/viberorob/Desktop/New Stock Project

MANDATORY: You MUST read the original user request before starting work:
Path: /Users/viberorob/Desktop/New Stock Project/.agents/ORIGINAL_REQUEST.md
Also read your dispatch instructions at:
/Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_qa/DISPATCH.md
Also read the project architecture at:
/Users/viberorob/Desktop/New Stock Project/.agents/orchestrator_1/PROJECT.md

Task:
Produce detailed test design and complete test code for:
1. `src/__tests__/companyFastInfo.test.ts`:
   - Countdown day calculation (跨月、當天、未來、閏年、過期處理).
   - Symbol normalization (`2330.TW` -> `2330`, `8299.TWO` -> `8299`, US stocks pass through, crypto).
   - ROC date parsing (`1150906` -> `2026-09-06`).
   - Announcement classification and importance rating logic.
   - Statutory calendar generation (Q1-Q4 earnings deadlines and monthly revenue deadlines).
   - Multi-tier fallback resilience (mock network failure, verifying valid fallback data returned with zero white screen / zero unhandled exceptions).
   - Cache hit / force refresh behavior.
2. Confirm compatibility with Vitest 3 runner so `npm test` passes 100% and `npx tsc --noEmit` has 0 errors.

Save your report to `/Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_qa/handoff.md`.
When done, message your parent with send_message.

