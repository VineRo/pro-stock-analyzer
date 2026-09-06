import React, { useState, useEffect } from 'react';
import { X, Keyboard, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { DEFAULT_SHORTCUTS, ShortcutMap, ShortcutCategory, CATEGORY_LABELS } from '../types/shortcuts';
import { formatKeyDisplay, keyEventToString } from '../utils/shortcutManager';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: ShortcutMap;
  onUpdateShortcut: (id: string, newKey: string) => void;
  onResetShortcuts: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
  shortcuts,
  onUpdateShortcut,
  onResetShortcuts,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ShortcutCategory | 'all'>('all');

  // 監聽使用者自訂按鍵輸入
  useEffect(() => {
    if (!editingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // 如果按 Esc 則取消編輯
      if (e.key === 'Escape') {
        setEditingId(null);
        setConflictWarning(null);
        return;
      }

      const keyStr = keyEventToString(e);
      if (!keyStr) return;

      // 檢查是否與其他快捷鍵衝突
      const conflictItem = DEFAULT_SHORTCUTS.find(
        (item) => item.id !== editingId && shortcuts[item.id]?.toLowerCase() === keyStr.toLowerCase()
      );

      if (conflictItem) {
        setConflictWarning(`按鍵「${formatKeyDisplay(keyStr)}」已被「${conflictItem.name}」使用，已自動覆蓋替換！`);
      } else {
        setConflictWarning(null);
      }

      onUpdateShortcut(editingId, keyStr);
      setEditingId(null);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [editingId, shortcuts, onUpdateShortcut]);

  if (!isOpen) return null;

  const categories: (ShortcutCategory | 'all')[] = ['all', 'symbol', 'period', 'tool', 'view', 'modal'];

  const filteredShortcuts = DEFAULT_SHORTCUTS.filter(
    (item) => activeTab === 'all' || item.category === activeTab
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-pro-card border border-pro-border rounded-2xl w-full max-w-3xl shadow-card-elevated overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* 頂部 Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pro-border bg-pro-bg/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Keyboard size={18} />
            </div>
            <div>
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                快捷鍵設定中心
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  自訂快捷鍵
                </span>
              </h3>
              <p className="text-xs text-pro-muted">
                點擊按鍵即可直接按下鍵盤進行自訂；設定會自動保存至本機。
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-pro-hover text-pro-muted hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 分類導航切換 */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-pro-bg/30 border-b border-pro-border text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-3 py-1 rounded-lg transition-all font-medium whitespace-nowrap ${
                  activeTab === cat
                    ? 'bg-pro-accent text-white shadow-sm'
                    : 'text-pro-muted hover:text-white hover:bg-pro-hover'
                }`}
              >
                {cat === 'all' ? '全部功能' : CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (window.confirm('確定要恢復所有快捷鍵至官方預設值嗎？')) {
                onResetShortcuts();
                setConflictWarning(null);
                setEditingId(null);
              }
            }}
            className="flex items-center gap-1 text-pro-muted hover:text-amber-400 px-2 py-1 rounded hover:bg-white/5 transition-colors shrink-0"
            title="恢復預設設定"
          >
            <RotateCcw size={13} />
            <span>恢復預設值</span>
          </button>
        </div>

        {/* 衝突提示橫幅 */}
        {conflictWarning && (
          <div className="mx-6 mt-3 px-3 py-2 bg-amber-500/15 border border-amber-500/30 rounded-lg text-amber-300 text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle size={14} className="shrink-0 text-amber-400" />
            <span>{conflictWarning}</span>
          </div>
        )}

        {/* 快捷鍵列表 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {filteredShortcuts.map((item) => {
            const currentKey = shortcuts[item.id] || item.defaultKey;
            const isEditing = editingId === item.id;
            const isModified = currentKey.toLowerCase() !== item.defaultKey.toLowerCase();

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                  isEditing
                    ? 'bg-blue-600/20 border-blue-500 font-semibold'
                    : 'bg-pro-panel/60 border-pro-border hover:border-white/20 hover:bg-pro-panel'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{item.name}</span>
                      {isModified && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          已自訂
                        </span>
                      )}
                    </div>
                    <p className="text-pro-muted text-[11px] mt-0.5">{item.description}</p>
                  </div>
                </div>

                {/* 按鍵膠囊按鈕 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setConflictWarning(null);
                      setEditingId(isEditing ? null : item.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 min-w-[90px] justify-center border ${
                      isEditing
                        ? 'bg-blue-600 text-white border-blue-400'
                        : 'bg-pro-bg text-pro-textSec border-pro-border hover:border-blue-500 hover:text-white hover:bg-pro-hover'
                    }`}
                  >
                    {isEditing ? (
                      <span className="text-amber-300">請按下任意鍵...</span>
                    ) : (
                      <span>{formatKeyDisplay(currentKey)}</span>
                    )}
                  </button>

                  {isModified && !isEditing && (
                    <button
                      onClick={() => onUpdateShortcut(item.id, item.defaultKey)}
                      className="p-1 text-pro-muted hover:text-white hover:bg-pro-hover rounded"
                      title="恢復此項預設"
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部按鈕 */}
        <div className="p-4 border-t border-pro-border bg-pro-bg/40 flex items-center justify-between px-6">
          <div className="text-[11px] text-pro-muted flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>修改後立即可用，支援單鍵與組合鍵 (如 Alt+T)</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <Check size={15} />
            <span>完成並返回看盤</span>
          </button>
        </div>
      </div>
    </div>
  );
};
