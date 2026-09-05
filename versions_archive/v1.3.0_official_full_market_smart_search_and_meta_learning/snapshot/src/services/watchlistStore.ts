import { WatchlistGroup } from '../types/stock';
import { POPULAR_SYMBOLS } from '../data/stockService';

const GROUPS_STORAGE_KEY = 'prostock_watchlist_groups_v2';
const ACTIVE_GROUP_ID_KEY = 'prostock_active_group_id_v2';
const LEGACY_STORAGE_KEY = 'prostock_custom_watchlist_v1';

let memoryStore: Record<string, string> = {};

function safeGet(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(key);
      if (val) return val;
    }
  } catch {}
  return memoryStore[key] || null;
}

function safeSet(key: string, val: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val);
    }
  } catch {}
  memoryStore[key] = val;
}

export function clearWatchlistMemory(): void {
  memoryStore = {};
}

export const DEFAULT_WATCHLIST_GROUPS: WatchlistGroup[] = [
  {
    id: 'group_core',
    name: '核心自選',
    symbols: POPULAR_SYMBOLS,
    createdAt: 1700000000000,
  },
  {
    id: 'group_us',
    name: '美股精選',
    symbols: POPULAR_SYMBOLS.filter((s) => s.market === 'US'),
    createdAt: 1700000000001,
  },
  {
    id: 'group_tw',
    name: '台股權值',
    symbols: POPULAR_SYMBOLS.filter((s) => s.market === 'TW'),
    createdAt: 1700000000002,
  },
];

/**
 * 載入所有自選股清單群組 (具備舊版平滑升級與容錯)
 */
export function loadWatchlistGroups(): WatchlistGroup[] {
  try {
    const raw = safeGet(GROUPS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // 嘗試從 v1 升級
    const legacyRaw = safeGet(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacySymbols = JSON.parse(legacyRaw);
      if (Array.isArray(legacySymbols) && legacySymbols.length > 0) {
        const upgraded: WatchlistGroup[] = [
          {
            id: 'group_core',
            name: '我的核心自選',
            symbols: legacySymbols,
            createdAt: Date.now(),
          },
          ...DEFAULT_WATCHLIST_GROUPS.slice(1),
        ];
        saveWatchlistGroups(upgraded);
        return upgraded;
      }
    }
  } catch (err) {
    console.warn('[watchlistStore] Failed to load groups:', err);
  }

  saveWatchlistGroups(DEFAULT_WATCHLIST_GROUPS);
  return DEFAULT_WATCHLIST_GROUPS;
}

/**
 * 儲存所有自選股群組
 */
export function saveWatchlistGroups(groups: WatchlistGroup[]): void {
  try {
    safeSet(GROUPS_STORAGE_KEY, JSON.stringify(groups));
  } catch (err) {
    console.warn('[watchlistStore] Failed to save groups:', err);
  }
}

/**
 * 獲取當前啟用的自選清單 ID
 */
export function getActiveGroupId(): string {
  try {
    const saved = safeGet(ACTIVE_GROUP_ID_KEY);
    if (saved) return saved;
  } catch {
    // ignore
  }
  return 'group_core';
}

/**
 * 儲存當前啟用的自選清單 ID
 */
export function setActiveGroupId(id: string): void {
  try {
    safeSet(ACTIVE_GROUP_ID_KEY, id);
  } catch {
    // ignore
  }
}
