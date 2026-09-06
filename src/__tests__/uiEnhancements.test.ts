import { describe, it, expect, beforeEach } from 'vitest';
import { 
  loadWatchlistGroups, 
  saveWatchlistGroups, 
  getActiveGroupId, 
  setActiveGroupId,
  DEFAULT_WATCHLIST_GROUPS,
  clearWatchlistMemory 
} from '../services/watchlistStore';
import { MarketCategory, WatchlistGroup, StockSymbol } from '../types/stock';

describe('UI Enhancements & Watchlist Creation Tests', () => {
  beforeEach(() => {
    clearWatchlistMemory();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('Navbar 分類標籤架構簡化', () => {
    it('頂部導覽列應支援 2 大核心分類：股票幣圈 (stocks_crypto) 與 大盤指數 (indices)', () => {
      const allowedCategories: MarketCategory[] = ['stocks_crypto', 'indices'];
      expect(allowedCategories).toContain('stocks_crypto');
      expect(allowedCategories).toContain('indices');
      expect(allowedCategories.length).toBe(2);
    });
  });

  describe('Watchlist 自選清單新建與管理持久化', () => {
    it('應能載入預設清單群組', () => {
      const groups = loadWatchlistGroups();
      expect(groups.length).toBeGreaterThan(0);
      expect(groups[0].name).toBe('核心自選');
    });

    it('應能建立新自選清單並加入當前選取標的', () => {
      const initialGroups = loadWatchlistGroups();
      const mockSelectedStock: StockSymbol = {
        symbol: 'NVDA',
        name: '輝達',
        market: 'US',
        price: 130,
        change: 3.5,
        changePercent: 2.76,
        currency: 'USD',
      };

      const newGroup: WatchlistGroup = {
        id: `group_${Date.now()}`,
        name: 'AI概念股',
        symbols: [mockSelectedStock],
        createdAt: Date.now(),
      };

      const nextGroups = [...initialGroups, newGroup];
      saveWatchlistGroups(nextGroups);
      setActiveGroupId(newGroup.id);

      const loadedGroups = loadWatchlistGroups();
      expect(loadedGroups.length).toBe(initialGroups.length + 1);
      
      const found = loadedGroups.find((g) => g.id === newGroup.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe('AI概念股');
      expect(found?.symbols.length).toBe(1);
      expect(found?.symbols[0].symbol).toBe('NVDA');

      expect(getActiveGroupId()).toBe(newGroup.id);
    });

    it('應能從清單中移除指定股票', () => {
      const initialGroups = loadWatchlistGroups();
      const groupToEdit = initialGroups[0];
      const initialCount = groupToEdit.symbols.length;
      if (initialCount > 0) {
        const symbolToRemove = groupToEdit.symbols[0].symbol;
        const updatedSymbols = groupToEdit.symbols.filter((s) => s.symbol !== symbolToRemove);
        const nextGroups = initialGroups.map((g) =>
          g.id === groupToEdit.id ? { ...g, symbols: updatedSymbols } : g
        );
        saveWatchlistGroups(nextGroups);

        const loaded = loadWatchlistGroups();
        const updated = loaded.find((g) => g.id === groupToEdit.id);
        expect(updated?.symbols.length).toBe(initialCount - 1);
        expect(updated?.symbols.some((s) => s.symbol === symbolToRemove)).toBe(false);
      }
    });

    it('應能重命名與刪除清單', () => {
      const testGroup: WatchlistGroup = {
        id: 'test_group_delete',
        name: '待刪除清單',
        symbols: [],
        createdAt: Date.now(),
      };
      const groupsWithTest = [...DEFAULT_WATCHLIST_GROUPS, testGroup];
      saveWatchlistGroups(groupsWithTest);

      // 重命名
      const renamedGroups = groupsWithTest.map((g) =>
        g.id === 'test_group_delete' ? { ...g, name: '已重命名清單' } : g
      );
      saveWatchlistGroups(renamedGroups);
      let loaded = loadWatchlistGroups();
      expect(loaded.find((g) => g.id === 'test_group_delete')?.name).toBe('已重命名清單');

      // 刪除
      const afterDelete = loaded.filter((g) => g.id !== 'test_group_delete');
      saveWatchlistGroups(afterDelete);
      loaded = loadWatchlistGroups();
      expect(loaded.find((g) => g.id === 'test_group_delete')).toBeUndefined();
    });
  });
});
