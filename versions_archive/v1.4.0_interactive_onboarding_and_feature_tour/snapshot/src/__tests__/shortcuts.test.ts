import { describe, it, expect, beforeEach } from 'vitest';
import { loadShortcuts, saveShortcuts, resetShortcuts, matchKeyEvent, formatKeyDisplay } from '../utils/shortcutManager';

describe('Customizable Shortcuts System', () => {
  beforeEach(() => {
    resetShortcuts();
  });

  it('should load default shortcuts initially', () => {
    const shortcuts = loadShortcuts();
    expect(shortcuts.nextSymbol).toBe('Space');
    expect(shortcuts.period1D).toBe('d');
    expect(shortcuts.toolTrend).toBe('Alt+t');
    expect(shortcuts.toggleMagnet).toBe('m');
  });

  it('should allow saving and loading custom shortcut overrides', () => {
    const custom = { nextSymbol: 'Enter', period1D: 'Shift+d' };
    saveShortcuts(custom);
    const loaded = loadShortcuts();
    expect(loaded.nextSymbol).toBe('Enter');
    expect(loaded.period1D).toBe('Shift+d');
  });

  it('should reset shortcuts to default', () => {
    saveShortcuts({ nextSymbol: 'Tab' });
    const reset = resetShortcuts();
    expect(reset.nextSymbol).toBe('Space');
  });

  it('should accurately match keyboard events with keybindings', () => {
    // 模擬空白鍵
    const spaceEvent = { key: ' ', altKey: false, ctrlKey: false, metaKey: false, shiftKey: false } as unknown as KeyboardEvent;
    expect(matchKeyEvent(spaceEvent, 'Space')).toBe(true);

    // 模擬 Alt+t
    const altTEvent = { key: 't', altKey: true, ctrlKey: false, metaKey: false, shiftKey: false } as unknown as KeyboardEvent;
    expect(matchKeyEvent(altTEvent, 'Alt+t')).toBe(true);

    // 模擬不相符的事件
    expect(matchKeyEvent(altTEvent, 'Alt+h')).toBe(false);
  });

  it('should format key labels for clear UI presentation', () => {
    expect(formatKeyDisplay('Space')).toContain('空白鍵');
    expect(formatKeyDisplay('ArrowUp')).toContain('↑');
    expect(formatKeyDisplay('Alt+t')).toContain('ALT + T');
  });
});
