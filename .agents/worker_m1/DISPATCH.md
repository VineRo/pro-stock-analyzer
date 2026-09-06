# Dispatch to Worker M1

## 2026-09-06T13:59:44Z

- Agent: teamwork_preview_worker
- Role: Implementation & Verification Worker
- Working Directory: /Users/viberorob/Desktop/New Stock Project/.agents/worker_m1
- Workspace Root: /Users/viberorob/Desktop/New Stock Project

MANDATORY: Read the original user request before starting work:
Path: /Users/viberorob/Desktop/New Stock Project/.agents/ORIGINAL_REQUEST.md
Also read the project architecture:
Path: /Users/viberorob/Desktop/New Stock Project/.agents/orchestrator_1/PROJECT.md

## Exclusive Write Ownership
You have exclusive write ownership over these files:
- `electron/main.cjs`
- `src/types/companyInfo.ts`
- `src/services/mopsService.ts`
- `src/components/CompanyFastInfoTab.tsx`
- `src/components/FundamentalModal.tsx`
- `src/__tests__/companyFastInfo.test.ts`
Do NOT modify any files outside `src/` and `electron/`. Never touch `versions_archive/`, `dist/`, or `release/`.

## Input Blueprints Provided by Explorers
1. Data Layer:
   - `/Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_data/proposed_main.cjs.patch`
   - `/Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_data/proposed_companyInfo.ts`
   - `/Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_data/proposed_mopsService.ts`
   - `/Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_data/handoff.md`
2. UI Layer:
   - `/Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_ui/proposed_CompanyFastInfoTab.tsx`
   - `/Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_ui/proposed_FundamentalModal.patch`
   - `/Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_ui/handoff.md`
3. QA & Test Layer:
   - `/Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_qa/proposed_companyFastInfo.test.ts`
   - `/Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_qa/handoff.md`

## Implementation Steps
1. Apply `electron/main.cjs` whitelist extension.
2. Create `src/types/companyInfo.ts`.
3. Create `src/services/mopsService.ts`. Ensure any function imports used across modules or tests (`extractTaiwanStockCode`, `formatRocDateToIso`, `calculateDaysRemaining`, `classifyAnnouncement`, `calculateStatutoryDeadlines`, `fetchCompanyFastInfo`, etc.) are exported and match between `mopsService.ts` and `companyFastInfo.test.ts`.
4. Create `src/components/CompanyFastInfoTab.tsx`.
5. Integrate tab `'fast_info'` into `src/components/FundamentalModal.tsx`.
6. Create `src/__tests__/companyFastInfo.test.ts`.
7. Run and verify:
   - `npm test` (all 16 existing suites + new suite must pass 100%)
   - `npx tsc --noEmit` (0 TypeScript errors)
   If any tests fail or typecheck errors occur, fix them until both pass cleanly.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Provide your handoff report at `/Users/viberorob/Desktop/New Stock Project/.agents/worker_m1/handoff.md`.
