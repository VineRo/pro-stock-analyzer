# Dispatch to Explorer M1 Data

- Agent: teamwork_preview_explorer
- Role: Data Layer & IPC Specialist
- Working Directory: /Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_data
- Workspace Root: /Users/viberorob/Desktop/New Stock Project

MANDATORY: Read the original user request before starting work:
Path: /Users/viberorob/Desktop/New Stock Project/.agents/ORIGINAL_REQUEST.md
Also read the project architecture and interface contracts:
Path: /Users/viberorob/Desktop/New Stock Project/.agents/orchestrator_1/PROJECT.md

Task:
Produce detailed implementation recommendations and complete TypeScript/JavaScript code for:
1. `electron/main.cjs`: extending `allowedHosts` with `openapi.twse.com.tw`, `www.tpex.org.tw`, `mops.twse.com.tw`.
2. `src/types/companyInfo.ts`: full data contracts for announcements, corporate calendar events, news items, and fast info state.
3. `src/services/mopsService.ts`: hybrid fetching engine with symbol normalization, TWSE OpenAPI integration, Yahoo Finance news/calendar integration, deterministic statutory earnings/revenue calendar calculation, 15-minute Stale-While-Revalidate caching, rate limiting, and zero-white-screen fallback seeds (2330, 2317, 2454, AAPL, NVDA, etc.).

Save your report to `/Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_data/handoff.md`.

## 2026-09-06T13:46:32Z
You are Explorer M1 Data (Data Layer & IPC Specialist).
Your working directory: /Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_data
Workspace root: /Users/viberorob/Desktop/New Stock Project

MANDATORY: You MUST read the original user request before starting work:
Path: /Users/viberorob/Desktop/New Stock Project/.agents/ORIGINAL_REQUEST.md
Also read your dispatch instructions at:
/Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_data/DISPATCH.md
Also read the project architecture at:
/Users/viberorob/Desktop/New Stock Project/.agents/orchestrator_1/PROJECT.md

Task:
Produce detailed implementation recommendations and complete TypeScript/JavaScript code for:
1. `electron/main.cjs`: extending `allowedHosts` with `openapi.twse.com.tw`, `www.tpex.org.tw`, `mops.twse.com.tw`.
2. `src/types/companyInfo.ts`: full data contracts for announcements, corporate calendar events, news items, and fast info state.
3. `src/services/mopsService.ts`: hybrid fetching engine with symbol normalization, TWSE OpenAPI integration, Yahoo Finance news/calendar integration, deterministic statutory earnings/revenue calendar calculation, 15-minute Stale-While-Revalidate caching, rate limiting, and zero-white-screen fallback seeds (2330, 2317, 2454, AAPL, NVDA, etc.).

Save your report to `/Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_data/handoff.md`.
When done, message your parent with send_message.
