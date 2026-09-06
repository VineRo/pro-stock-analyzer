/**
 * 公司資訊最速報與重大訊息行事曆數據契約 (Data Contracts)
 * 定義重大訊息公告、法定行事曆事件、財經新聞與快報狀態結構
 */

export type AnnouncementCategory =
  | 'financial'       // 財務報告 / 季報 / 自結損益
  | 'conference'      // 法人說明會 / 投資論壇
  | 'board'           // 董事會決議 / 人事異動
  | 'revenue'         // 營業收入公告
  | 'dividend'        // 股利分派 / 除權息 / 增資
  | 'material'        // 重大營運變更 / 擴產 / 訴訟
  | 'other';          // 其他重要訊息 / 澄清公告

export type EventStatus = 'upcoming' | 'confirmed' | 'estimated' | 'past';

export type AnnouncementImportance = 'high' | 'medium' | 'normal';

export interface CompanyAnnouncement {
  id: string;
  symbol: string;
  date: string;              // 'YYYY/MM/DD' 或 'YYYY-MM-DD'
  time?: string;             // 'HH:mm'
  title: string;
  summaryPoints: string[];   // 條列式核心看點提煉
  fullContent?: string;      // 完整內文說明 (可展開)
  category: AnnouncementCategory;
  categoryLabel: string;     // 中文分類標籤 (如 "財務報告", "法人說明會")
  importance: AnnouncementImportance;
  source: string;            // 資料來源 (如 "公開資訊觀測站 (MOPS)")
  url?: string;
  isCurrentMonth?: boolean;  // 是否為當月發布之重要消息
}

export interface CalendarEventItem {
  id: string;
  symbol: string;
  title: string;             // 事件標題 (如 "2026 Q3 財務報告公告法定截止")
  date: string;              // 'YYYY/MM/DD'
  time?: string;             // '14:00'
  daysRemaining: number;     // 倒數剩餘自然天 (0 = 當天, >0 = 未來, <0 = 已截止)
  eventType: 'earnings' | 'conference' | 'revenue' | 'dividend' | 'meeting';
  status: EventStatus;
  statusLabel: string;       // "即將召開", "已排程", "法定預估", "法定截止"
  formatOrLocation?: string; // "線上視訊會議 (Webcast)", "證交所大樓"
  highlights: string[];      // 會議議程或法規看點
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
  matchedKeyword?: string;      // 命中的個股關聯字 (如 "台積電", "2330", "TSMC")
  isStrictlyRelevant?: boolean; // 是否為嚴格通過個股關聯過濾之報導
  isTaiwanTech?: boolean;       // 是否為台灣本土科技媒體報導 (如科技新報、DIGITIMES、數位時代、鉅亨科技等)
  mediaCategory?: 'taiwan_tech' | 'financial' | 'general';
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

/**
 * 官方 TWSE OpenAPI t187ap04_L 原始回傳結構
 */
export interface TwseOpenApiAnnouncement {
  出表日期?: string;
  發言日期: string;
  發言時間: string;
  公司代號: string;
  公司名稱: string;
  主旨: string;
  符合條款?: string;
  事實發生日?: string;
  說明: string;
}

/**
 * 分類標籤中文映射對照表
 */
export const ANNOUNCEMENT_CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  financial: '財務報告',
  conference: '法人說明會',
  board: '董事會決議',
  revenue: '營收公告',
  dividend: '除權息與股利',
  material: '重大營運變更',
  other: '其他重要訊息',
};

/**
 * 事件類型中文標籤對照表
 */
export const EVENT_TYPE_LABELS: Record<CalendarEventItem['eventType'], string> = {
  earnings: '財報發布',
  conference: '法人說明會',
  revenue: '月營收公告',
  dividend: '除權息基準日',
  meeting: '股東常會/特別會',
};
