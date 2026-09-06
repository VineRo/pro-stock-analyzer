# Dispatch to Survey Explorer 3

- Agent Type: teamwork_preview_explorer
- Role: UI Architecture & FundamentalModal Explorer
- Working Directory: /Users/viberorob/Desktop/New Stock Project/.agents/survey_explorer_3
- Workspace Root: /Users/viberorob/Desktop/New Stock Project
- Parent Orchestrator: /Users/viberorob/Desktop/New Stock Project/.agents/orchestrator_1

## Objective
Investigate the frontend structure, specifically:
1. `src/components/FundamentalModal.tsx` — how tabs are structured, state management, props, data passing, theme (Tailwind dark mode styling), icons (Lucide/etc.), and subcomponents.
2. How other modals or widgets handle loading skeletons/spinners, empty states, and error handling.
3. Design recommendation for the new tab: "資訊最速報 / 重訊日程" (Company Fast Information / MOPS & Calendar):
   - Fast info / announcements card list
   - Earnings & Investor Conference calendar countdown card
   - News feed section
   - Refresh button and skeleton loader
4. Existing test patterns in `src/__tests__/` (especially UI or modal tests, mock data, vitest configuration).
5. Provide a detailed report at `/Users/viberorob/Desktop/New Stock Project/.agents/survey_explorer_3/handoff.md`.
