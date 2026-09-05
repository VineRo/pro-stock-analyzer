export type ShortcutCategory = 'symbol' | 'period' | 'tool' | 'view' | 'modal';

export interface ShortcutDefinition {
  id: string;
  name: string;
  description: string;
  defaultKey: string;
  category: ShortcutCategory;
}

export type ShortcutMap = Record<string, string>;

export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  // 標的切換
  { id: 'nextSymbol', name: '下一檔股票', description: '切換至自選清單下一檔標的', defaultKey: 'Space', category: 'symbol' },
  { id: 'prevSymbol', name: '上一檔股票', description: '自選清單向上移動瀏覽', defaultKey: 'ArrowUp', category: 'symbol' },
  { id: 'nextSymbolDown', name: '向下瀏覽股票', description: '自選清單向下移動瀏覽', defaultKey: 'ArrowDown', category: 'symbol' },
  { id: 'focusSearch', name: '搜尋股票', description: '快速聚焦股票搜尋輸入框', defaultKey: '/', category: 'symbol' },

  // 時間週期
  { id: 'period1m', name: '1 分鐘 K 線', description: '切換為 1 分鐘線 (當沖極短線)', defaultKey: '1', category: 'period' },
  { id: 'period5m', name: '5 分鐘 K 線', description: '切換為 5 分鐘線 (日內波段)', defaultKey: '5', category: 'period' },
  { id: 'period15m', name: '15 分鐘 K 線', description: '切換為 15 分鐘線', defaultKey: '3', category: 'period' },
  { id: 'period1h', name: '1 小時 K 線', description: '切換為 1 小時線', defaultKey: '6', category: 'period' },
  { id: 'period1D', name: '日 K 線', description: '切換為日線 (中期趨勢)', defaultKey: 'd', category: 'period' },
  { id: 'period1W', name: '週 K 線', description: '切換為週線 (長線大格局)', defaultKey: 'w', category: 'period' },

  // 畫線工具
  { id: 'toolTrend', name: '趨勢線工具', description: '啟動趨勢線畫線工具', defaultKey: 'Alt+t', category: 'tool' },
  { id: 'toolHorizontal', name: '水平線工具', description: '標註關鍵支撐與前高壓力位', defaultKey: 'Alt+h', category: 'tool' },
  { id: 'toolFibonacci', name: '斐波那契回撤', description: '黃金分割率抓回檔買點', defaultKey: 'Alt+f', category: 'tool' },
  { id: 'toggleMagnet', name: '磁吸防手抖開關', description: '一鍵開啟/關閉游標自動磁吸', defaultKey: 'm', category: 'tool' },

  // 介面視圖
  { id: 'toggleTheme', name: '切換漲跌色彩', description: '國際 (綠漲紅跌) ⇄ 亞洲 (紅漲綠跌)', defaultKey: 'c', category: 'view' },
  { id: 'toggleWatchlist', name: '自選股側欄', description: '快速收合或展開自選行情欄', defaultKey: 'Tab', category: 'view' },
  { id: 'toggleFullscreen', name: '切換全螢幕', description: '沉浸式全螢幕看盤模式', defaultKey: 'f', category: 'view' },

  // 功能彈窗
  { id: 'openIndicators', name: '指標庫面板', description: '開啟技術指標管理視窗', defaultKey: 'i', category: 'modal' },
  { id: 'openEducation', name: '指標速成百科', description: '查看小白生活化技術教學', defaultKey: '?', category: 'modal' },
  { id: 'openShortcuts', name: '快捷鍵自訂中心', description: '查看並自訂所有按鍵綁定', defaultKey: 'k', category: 'modal' },
];

export const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  symbol: '標的切換',
  period: '週期切換',
  tool: '畫線工具',
  view: '介面視圖',
  modal: '功能彈窗',
};
