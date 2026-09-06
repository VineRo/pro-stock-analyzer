# Project: 公司資訊最速報 (Company Fast Information / MOPS & Corporate Calendar)

## Architecture
- **Desktop Host (Electron)**:
  - `electron/main.cjs`: Extend `allowedHosts` in `fetch-market-data` handler to permit `openapi.twse.com.tw`, `www.tpex.org.tw`, and `mops.twse.com.tw`.
- **Data & Service Layer**:
  - `src/types/companyInfo.ts`: TypeScript contracts for `CompanyAnnouncement`, `CorporateCalendarEvent`, `StockNewsItem`, `CompanyFastInfoData`.
  - `src/services/mopsService.ts`: Hybrid fetching engine supporting official TWSE MOPS filings, Yahoo Finance news/calendar, deterministic statutory earnings/revenue calendar, multi-tier Stale-While-Revalidate caching (15m TTL), and zero-white-screen fallback.
- **Presentation Layer (React)**:
  - `src/components/CompanyFastInfoTab.tsx`: Modular child component with Hero countdown banner, events timeline, filterable MOPS announcements, financial news, skeleton loader, and empty states.
  - `src/components/FundamentalModal.tsx`: Extends `activeTab` to include `'fast_info'`, adds tab button, and renders `CompanyFastInfoTab`.
- **Testing Layer (Vitest)**:
  - `src/__tests__/companyFastInfo.test.ts`: Comprehensive unit tests validating calendar calculations, announcement classification, caching, offline fallbacks, and edge cases.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | IPC Host Whitelist Expansion | Add TWSE and TPEx open data hosts to `allowedHosts` in `electron/main.cjs` | M1 | Survey |
| 2 | Data Contracts & Types | Define `CompanyAnnouncement`, `CorporateCalendarEvent`, `StockNewsItem`, `CompanyFastInfoData` in `src/types/companyInfo.ts` | M1 | Survey |
| 3 | MOPS & News Fetching Engine | Fetch official daily material announcements and Yahoo news with symbol normalization and error handling | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Corporate Calendar & Statutory Engine | Track confirmed investor conferences (法說會) and compute statutory filing deadlines (季報、每月營收) with countdown calculation | M1 | ORIGINAL_REQUEST §R2 |
| 5 | Multi-Tiered Cache & Fallback | 15-min `localStorage` cache, manual refresh cooldown, curated benchmark seeds for major stocks (2330, 2317, AAPL, NVDA), zero-white-screen guarantee | M1 | ORIGINAL_REQUEST §R1, §R4 |
| 6 | Fast Info Tab UI Component | Modern dark-theme component with hero countdown cards, timeline, filterable announcements, news, skeleton loader, empty states | M2 | ORIGINAL_REQUEST §R3, §R4 |
| 7 | FundamentalModal Integration | Add `'fast_info'` tab ("⚡ 資訊最速報 / 重訊日程") to `FundamentalModal.tsx` | M2 | ORIGINAL_REQUEST §R3 |
| 8 | Comprehensive Unit Testing & Typecheck | Vitest test suite `companyFastInfo.test.ts` ensuring all 16 existing + new tests pass 100% and `npx tsc --noEmit` is 0 errors | M3 | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | 公司資訊最速報 全功能實作與整合 | `electron/main.cjs`, `src/types/companyInfo.ts`, `src/services/mopsService.ts`, `src/components/CompanyFastInfoTab.tsx`, `src/components/FundamentalModal.tsx`, `src/__tests__/companyFastInfo.test.ts` | Survey | DONE (All 18 test suites / 225 tests pass, 0 tsc errors, build succeeds, Reviewers APPROVE, Challengers APPROVE, Auditor CLEAN) |

## Interface Contracts
### `src/types/companyInfo.ts` ↔ `src/services/mopsService.ts` ↔ `src/components/CompanyFastInfoTab.tsx`
```typescript
export type AnnouncementCategory =
  | 'financial'       // 財務報告 / 季報
  | 'conference'      // 法說會
  | 'board'           // 董事會決議
  | 'revenue'         // 營收公告
  | 'dividend'        // 股利分派 / 除權息
  | 'material'        // 重大營運與資產取得
  | 'other';

export type EventStatus = 'upcoming' | 'confirmed' | 'estimated' | 'past';
export type AnnouncementImportance = 'high' | 'medium' | 'normal';

export interface CompanyAnnouncement {
  id: string;
  symbol: string;
  date: string;              // 'YYYY/MM/DD'
  time?: string;             // 'HH:mm'
  title: string;
  summaryPoints: string[];   // Bulleted key takeaways
  fullContent?: string;      // Expandable full text
  category: AnnouncementCategory;
  categoryLabel: string;     // e.g. "董事會決議"
  importance: AnnouncementImportance;
  source: string;            // "公開資訊觀測站 (MOPS)"
  url?: string;
}

export interface CalendarEventItem {
  id: string;
  symbol: string;
  title: string;             // e.g. "2026 Q3 法人說明會"
  date: string;              // 'YYYY/MM/DD'
  time?: string;             // '14:00'
  daysRemaining: number;     // Days remaining (0 = today, >0 = future, <0 = past)
  eventType: 'earnings' | 'conference' | 'revenue' | 'dividend' | 'meeting';
  status: EventStatus;
  statusLabel: string;       // "即將召開", "已排程", "法定預估"
  formatOrLocation?: string; // "線上視訊會議 (Webcast)"
  highlights: string[];      // Key takeaways / agenda
}

export interface CompanyNewsFeedItem {
  id: string;
  symbol: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url?: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
}

export interface CompanyFastInfoState {
  symbol: string;
  name: string;
  market: 'TW' | 'US' | 'CRYPTO';
  lastUpdated: number;
  isLive: boolean;
  dataSourceDesc: string;
  nextEarnings?: CalendarEventItem;
  nextConference?: CalendarEventItem;
  timelineEvents: CalendarEventItem[];
  announcements: CompanyAnnouncement[];
  news: CompanyNewsFeedItem[];
}

export function fetchCompanyFastInfo(
  symbol: string,
  companyName?: string,
  forceRefresh?: boolean
): Promise<CompanyFastInfoState>;
```

## Code Layout
- `electron/main.cjs` (owned by M1)
- `src/types/companyInfo.ts` (owned by M1)
- `src/services/mopsService.ts` (owned by M1)
- `src/components/CompanyFastInfoTab.tsx` (owned by M2)
- `src/components/FundamentalModal.tsx` (owned by M2)
- `src/__tests__/companyFastInfo.test.ts` (owned by M3)
