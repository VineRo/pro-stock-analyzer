# BRIEFING — 2026-09-06T13:45:00Z

## Mission
Investigate existing data fetching patterns, IPC bridges, caching, CORS/network, symbol normalization, and recommend MOPS announcement / news / calendar data service architecture.

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: Data Flow & Electron Architecture Explorer
- Working directory: /Users/viberorob/Desktop/New Stock Project/.agents/survey_explorer_1
- Original parent: 65ba7ffd-4e99-4d51-ac9e-7234e2353c66
- Milestone: Investigation & Architecture Survey

## 🔒 Key Constraints
- Read-only investigation — do NOT implement / modify source code
- Operations restricted strictly to src/ and electron/ (and reading .agents/)
- Preserve existing 16 test suites, 135 tests (100% pass)
- No modifications to versions_archive/, dist/, release/, docs/

## Current Parent
- Conversation ID: 65ba7ffd-4e99-4d51-ac9e-7234e2353c66
- Updated: 2026-09-06T13:42:00Z

## Investigation State
- **Explored paths**:
  - `electron/main.cjs` & `electron/preload.cjs` (IPC handlers, allowedHosts whitelist, timeout, fallback)
  - `src/data/stockApi.ts` & `src/data/stockService.ts` (Yahoo/Binance fetching, symbol mapping, simulation fallbacks)
  - `src/data/cacheService.ts` & `src/services/quoteService.ts` (localStorage and memory caching, concurrency/throttling)
  - `src/data/stockDirectory.ts`, `twseFullRegistry.json`, `tpexFullRegistry.json` (TWSE/TPEx registry, code mapping)
  - `src/components/FundamentalModal.tsx` & `src/App.tsx` (Tab navigation, data injection)
  - TWSE/TPEx OpenAPI (`openapi.twse.com.tw`), MOPS endpoints, Yahoo Finance Search/QuoteSummary APIs
- **Key findings**:
  - Electron IPC `fetch-market-data` uses Node native fetch with strict `allowedHosts` whitelist: `query1.finance.yahoo.com`, `query2.finance.yahoo.com`, `api.binance.com`.
  - Adding `openapi.twse.com.tw`, `www.tpex.org.tw`, and `mops.twse.com.tw` to `allowedHosts` enables zero-CORS official MOPS/TWSE fetching without altering `preload.cjs` IPC API.
  - Yahoo Finance `query1.finance.yahoo.com/v1/finance/search?q={sym}&newsCount=15` provides real-time news for TW & US tickers.
  - Yahoo Finance `query1.finance.yahoo.com/v10/finance/quoteSummary/{sym}?modules=calendarEvents,earnings` provides upcoming earnings dates and calendar.
  - TWSE/TPEx symbols format: bare 4-5 digits (e.g. `2330`, `8299`) can be extracted easily; Yahoo symbols are `2330.TW` (TWSE) and `8299.TWO` (TPEx).
  - 4-tier zero blank-screen fallback: Remote API -> Local Cache -> Curated Official Benchmark -> Deterministic Statutory Calendar (法定財報時程推算).
- **Unexplored areas**: None remaining for this survey.

## Key Decisions Made
- Recommend 3-layer architecture for MOPS announcement/news/calendar:
  1. IPC Whitelist enhancement (`electron/main.cjs`)
  2. Pure unified service (`src/services/mopsService.ts` or `announcementService.ts`) with dual-engine (TWSE OpenAPI + Yahoo Finance news/calendar) + multi-tier caching
  3. Integrated UI tab in `FundamentalModal.tsx` (`news_events` tab with countdown hero card, timeline, filterable announcements, loading skeleton, refresh button)

## Artifact Index
- `DISPATCH.md` — Dispatch instructions from Orchestrator
- `BRIEFING.md` — Situational awareness working memory
- `progress.md` — Liveness heartbeat and step tracker
- `handoff.md` — Final structured report
