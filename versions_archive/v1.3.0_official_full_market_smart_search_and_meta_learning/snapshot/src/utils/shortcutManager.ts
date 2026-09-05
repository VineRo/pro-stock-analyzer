import { DEFAULT_SHORTCUTS, ShortcutMap } from '../types/shortcuts';

const STORAGE_KEY = 'prostock_custom_shortcuts_v1';

let memoryStore: Record<string, string> = {};

function safeGet(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {}
  return memoryStore[key] || null;
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {}
  memoryStore[key] = value;
}

function safeRemove(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {}
  delete memoryStore[key];
}

/**
 * 載入使用者客製化快捷鍵設定
 */
export function loadShortcuts(): ShortcutMap {
  const initialMap: ShortcutMap = {};
  DEFAULT_SHORTCUTS.forEach((item) => {
    initialMap[item.id] = item.defaultKey;
  });

  const saved = safeGet(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return { ...initialMap, ...parsed };
    } catch {}
  }

  return initialMap;
}

/**
 * 儲存客製化快捷鍵設定
 */
export function saveShortcuts(shortcuts: ShortcutMap): void {
  safeSet(STORAGE_KEY, JSON.stringify(shortcuts));
}

/**
 * 恢復預設快捷鍵
 */
export function resetShortcuts(): ShortcutMap {
  safeRemove(STORAGE_KEY);
  const initialMap: ShortcutMap = {};
  DEFAULT_SHORTCUTS.forEach((item) => {
    initialMap[item.id] = item.defaultKey;
  });
  return initialMap;
}

/**
 * 將 KeyboardEvent 轉換為標準化的字串表示 (如 'Alt+t', 'Space', '1')
 */
export function keyEventToString(e: KeyboardEvent): string | null {
  // 忽略純修飾鍵按下
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
    return null;
  }

  const parts: string[] = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey && e.key.length > 1) parts.push('Shift');
  if (e.metaKey) parts.push('Cmd');

  let mainKey = e.key;
  if (mainKey === ' ') mainKey = 'Space';
  else if (mainKey === 'Escape') mainKey = 'Esc';
  else if (mainKey.length === 1) mainKey = mainKey.toLowerCase();

  parts.push(mainKey);
  return parts.join('+');
}

/**
 * 比對鍵盤事件是否命中綁定的快捷鍵
 */
export function matchKeyEvent(e: KeyboardEvent, keyBinding: string): boolean {
  if (!keyBinding) return false;

  const parts = keyBinding.split('+');
  const mainKey = parts[parts.length - 1];
  const requiresAlt = parts.includes('Alt');
  const requiresCtrl = parts.includes('Ctrl');
  const requiresMeta = parts.includes('Cmd') || parts.includes('Meta');
  const requiresShift = parts.includes('Shift');

  if (Boolean(e.altKey) !== requiresAlt) return false;
  if (Boolean(e.ctrlKey) !== requiresCtrl) return false;
  if (Boolean(e.metaKey) !== requiresMeta) return false;
  if (requiresShift && !e.shiftKey) return false;

  let eventKey = e.key;
  if (eventKey === ' ') eventKey = 'Space';
  else if (eventKey === 'Escape') eventKey = 'Esc';

  return eventKey.toLowerCase() === mainKey.toLowerCase();
}

/**
 * 格式化顯示按鍵標籤 (在 UI 呈現精美膠囊標籤)
 */
export function formatKeyDisplay(key: string): string {
  if (!key) return '';
  return key
    .replace('Space', '空白鍵 ␣')
    .replace('ArrowUp', '↑ 向上鍵')
    .replace('ArrowDown', '↓ 向下鍵')
    .replace('ArrowLeft', '←')
    .replace('ArrowRight', '→')
    .replace('Alt+', '⌥ Alt + ')
    .replace('Ctrl+', '⌃ Ctrl + ')
    .replace('Cmd+', '⌘ Cmd + ')
    .replace('Shift+', '⇧ Shift + ')
    .toUpperCase();
}
