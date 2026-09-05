import React, { useState } from 'react';
import { 
  MousePointer, 
  Magnet, 
  TrendingUp, 
  Minus, 
  ArrowUpRight, 
  Slash, 
  Columns, 
  Layers, 
  Square, 
  Type, 
  Trash2,
  Palette
} from 'lucide-react';
import { DrawingToolType } from '../types/stock';
import { ShortcutMap } from '../types/shortcuts';
import { formatKeyDisplay } from '../utils/shortcutManager';
import { DISTINCT_DRAWING_COLORS } from '../services/drawingStore';

interface DrawingToolbarProps {
  activeTool: DrawingToolType;
  onSelectTool: (tool: DrawingToolType) => void;
  isMagnet: boolean;
  onToggleMagnet: () => void;
  onClearAll: () => void;
  shortcuts?: ShortcutMap;
  selectedColor?: string;
  onSelectColor?: (color: string) => void;
  drawingCount?: number;
  showLastPriceLine?: boolean;
  onToggleLastPriceLine?: () => void;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  activeTool,
  onSelectTool,
  isMagnet,
  onToggleMagnet,
  onClearAll,
  shortcuts,
  selectedColor = 'auto',
  onSelectColor,
  drawingCount = 0,
  showLastPriceLine = true,
  onToggleLastPriceLine,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const getKeyLabel = (id: string, fallback: string) => {
    const key = shortcuts ? shortcuts[id] : fallback;
    return key ? `[${formatKeyDisplay(key)}]` : '';
  };

  const tools: { type: DrawingToolType; label: string; shortcutKey?: string; icon: React.ReactNode; desc: string }[] = [
    { type: 'none', label: '標準游標', shortcutKey: 'Esc', icon: <MousePointer size={17} />, desc: '拖曳與縮放圖表 (取消畫線)' },
    { type: 'trendLine', label: '趨勢線', shortcutKey: getKeyLabel('toolTrend', 'Alt+T'), icon: <TrendingUp size={17} />, desc: '連接關鍵高點或低點判斷主升降趨勢' },
    { type: 'horizontalStraightLine', label: '水平線 (支撐/壓力)', shortcutKey: getKeyLabel('toolHorizontal', 'Alt+H'), icon: <Minus size={17} />, desc: '標註關鍵前高壓力或前低支撐位' },
    { type: 'rayLine', label: '射線', icon: <ArrowUpRight size={17} />, desc: '單向延伸趨勢指引線' },
    { type: 'segment', label: '線段', icon: <Slash size={17} />, desc: '固定長度波段測量線' },
    { type: 'priceChannelLine', label: '平行通道', icon: <Columns size={17} />, desc: '劃定上升或下降軌道箱型' },
    { type: 'fibonacciLine', label: '斐波那契回撤', shortcutKey: getKeyLabel('toolFibonacci', 'Alt+F'), icon: <Layers size={17} />, desc: '黃金分割率 (0.382 / 0.5 / 0.618) 抓回檔買點' },
    { type: 'rect', label: '矩形箱體', icon: <Square size={17} />, desc: '框出打底洗盤或籌碼密集區間' },
    { type: 'text', label: '文字標註', icon: <Type size={17} />, desc: '在 K 線關鍵轉折處寫下記錄' },
  ];

  return (
    <div className="w-11 bg-pro-panel border-r border-pro-border flex flex-col items-center py-2.5 select-none z-20 shrink-0">
      {/* 磁吸模式開關 (無發光，清晰對比按鈕) */}
      <div className="relative group mb-2.5">
        <button
          onClick={onToggleMagnet}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border ${
            isMagnet
              ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-bold'
              : 'text-pro-muted hover:text-white hover:bg-pro-hover border-transparent'
          }`}
        >
          <Magnet size={17} />
        </button>
        {/* Tooltip (向右清晰彈出，垂直置中，不遮蔽按鈕) */}
        <div className="absolute left-[38px] top-1/2 -translate-y-1/2 ml-2 bg-pro-card text-white text-xs px-3 py-2 rounded-xl border border-pro-border shadow-card-elevated whitespace-nowrap hidden group-hover:block z-50 pointer-events-none animate-in fade-in">
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-pro-card border-l border-b border-pro-border rotate-45" />
          <p className="font-bold flex items-center gap-1.5 text-amber-300">
            <span>🧲 磁吸模式：{isMagnet ? '已開啟' : '已關閉'}</span>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {getKeyLabel('toggleMagnet', 'M')}
            </span>
          </p>
          <p className="text-pro-muted text-[11px] mt-0.5">游標靠近 K 線時自動吸附最高價、最低價，畫線防手抖</p>
        </div>
      </div>

      {/* 調色盤選色器 */}
      <div className="relative mb-2.5">
        <button
          onClick={() => setShowColorPicker((prev) => !prev)}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all relative border ${
            showColorPicker
              ? 'bg-blue-600/20 border-blue-500 text-white font-bold'
              : 'text-pro-muted hover:text-white hover:bg-pro-hover border-transparent'
          }`}
        >
          {selectedColor === 'auto' ? (
            <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-blue-500 via-emerald-400 to-amber-400 border border-white/40 shadow-sm" />
          ) : (
            <div 
              className="w-4 h-4 rounded-full border border-white/60 shadow-sm" 
              style={{ backgroundColor: selectedColor }}
            />
          )}
        </button>

        {/* 彈出式專業調色盤 (完全位於工具列右側外，不擋住工具按鈕) */}
        {showColorPicker && (
          <div className="absolute left-[38px] top-0 ml-2 bg-pro-card p-2.5 rounded-xl border border-pro-border shadow-card-elevated z-50 animate-in fade-in w-44">
            <div className="text-[11px] font-bold text-white mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Palette size={13} className="text-blue-400" />
                劃線專屬色盤
              </span>
              {selectedColor === 'auto' && (
                <span className="text-[9px] px-1 rounded bg-blue-500/20 text-blue-300 font-mono">
                  智能互斥
                </span>
              )}
            </div>
            <p className="text-[10px] text-pro-muted mb-2">
              不同工具與連續畫線自動分配高對比鮮明色彩，亦可手動固定顏色：
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {DISTINCT_DRAWING_COLORS.map((c) => {
                const isSelected = selectedColor === c.value;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectColor?.(c.value);
                      setShowColorPicker(false);
                    }}
                    className={`flex items-center gap-1.5 p-1 rounded-lg text-[10px] transition-all border ${
                      isSelected
                        ? 'border-pro-accent bg-pro-accent/20 text-white font-bold ring-1 ring-pro-accent/50'
                        : 'border-pro-border/40 hover:bg-pro-hover text-pro-muted hover:text-white'
                    }`}
                  >
                    {c.value === 'auto' ? (
                      <span className="w-3 h-3 rounded-full bg-gradient-to-tr from-blue-500 via-emerald-400 to-amber-400 shrink-0" />
                    ) : (
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-white/30"
                        style={{ backgroundColor: c.value }}
                      />
                    )}
                    <span className="truncate">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 最新現價線開關 (左側邊欄獨立控制，切換橫貫 K 線之最新收盤/現價水平線) */}
      <div className="relative group mb-2.5">
        <button
          onClick={onToggleLastPriceLine}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border ${
            showLastPriceLine
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/60 font-bold'
              : 'text-pro-muted hover:text-white hover:bg-pro-hover border-transparent'
          }`}
          title="最新現價線"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="3 3" />
            <circle cx="17" cy="12" r="3" fill="currentColor" />
          </svg>
        </button>
        {/* Tooltip (向右彈出，不遮蔽按鈕) */}
        <div className="absolute left-[38px] top-1/2 -translate-y-1/2 ml-2 bg-pro-card text-white text-xs px-3 py-2 rounded-xl border border-pro-border shadow-card-elevated whitespace-nowrap hidden group-hover:block z-50 pointer-events-none animate-in fade-in">
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-pro-card border-l border-b border-pro-border rotate-45" />
          <p className="font-bold flex items-center gap-1.5 text-rose-400">
            <span>📌 最新現價線：{showLastPriceLine ? '已開啟' : '已關閉'}</span>
          </p>
          <p className="text-pro-muted text-[11px] mt-0.5">切換顯示橫貫 K 線圖的最新收盤現價水平虛線（點擊切換）</p>
        </div>
      </div>

      <div className="w-5 h-px bg-pro-border mb-2.5" />

      {/* 畫線工具列表 */}
      <div className="flex flex-col gap-1 flex-1">
        {tools.map((item) => {
          const isActive = activeTool === item.type;
          return (
            <div key={item.type} className="relative group">
              <button
                onClick={() => onSelectTool(item.type)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold border-blue-400 shadow-sm'
                    : 'text-pro-muted hover:text-white hover:bg-pro-hover border-transparent'
                }`}
              >
                {item.icon}
              </button>
              {/* Tooltip (清晰向右偏離，垂直置中對齊按鈕，並具備 pointer-events-none 與指示箭頭) */}
              <div className="absolute left-[38px] top-1/2 -translate-y-1/2 ml-2 bg-pro-card text-white text-xs px-3 py-2 rounded-xl border border-pro-border shadow-card-elevated whitespace-nowrap hidden group-hover:block z-50 pointer-events-none animate-in fade-in">
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-pro-card border-l border-b border-pro-border rotate-45" />
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{item.label}</span>
                  {item.shortcutKey && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-pro-muted">
                      {item.shortcutKey}
                    </span>
                  )}
                </div>
                <p className="text-pro-muted text-[11px] mt-0.5">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="w-5 h-px bg-pro-border mb-2.5" />

      {/* 清空畫線與計數 */}
      <div className="relative group flex flex-col items-center gap-1">
        {drawingCount > 0 && (
          <span 
            className="text-[9px] font-mono font-bold px-1 rounded bg-blue-600/30 text-blue-300 border border-blue-500/40"
          >
            {drawingCount}
          </span>
        )}
        <button
          onClick={onClearAll}
          disabled={drawingCount === 0}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            drawingCount === 0 
              ? 'text-pro-muted/40 cursor-not-allowed' 
              : 'text-pro-muted hover:text-pro-down hover:bg-rose-500/10'
          }`}
        >
          <Trash2 size={16} />
        </button>
        <div className="absolute left-[38px] top-1/2 -translate-y-1/2 ml-2 bg-pro-card text-white text-xs px-3 py-1.5 rounded-xl border border-pro-border shadow-card-elevated whitespace-nowrap hidden group-hover:block z-50 pointer-events-none">
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-pro-card border-l border-b border-pro-border rotate-45" />
          <p className="text-rose-400 font-bold">
            {drawingCount > 0 ? `清除此圖表所有畫線 (共 ${drawingCount} 條)` : '目前無畫線標記'}
          </p>
        </div>
      </div>
    </div>
  );
};
