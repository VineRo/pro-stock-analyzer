import React from 'react';
import { X, HelpCircle, Check, Sparkles } from 'lucide-react';
import { INDICATORS_DATA } from '../education/indicatorsData';

interface IndicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mainIndicators: string[];
  subIndicators: string[];
  onToggleMain: (name: string) => void;
  onToggleSub: (name: string) => void;
  onOpenEducation: (indicatorId: string) => void;
  onApplyPreset: (preset: 'novice' | 'oscillator' | 'trend') => void;
}

export const IndicatorModal: React.FC<IndicatorModalProps> = ({
  isOpen,
  onClose,
  mainIndicators,
  subIndicators,
  onToggleMain,
  onToggleSub,
  onOpenEducation,
  onApplyPreset,
}) => {
  if (!isOpen) return null;

  const mainList = ['MA', 'EMA', 'BOLL', 'SAR', 'VWAP'];
  const subList = ['VOL', 'MACD', 'RSI', 'KDJ', 'ATR', 'OBV'];

  // 指標對應色樣預覽
  const getIndicatorColorSwatch = (id: string) => {
    switch (id) {
      case 'MA':
        return (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#fbc02d]" title="MA5" />
            <span className="w-2 h-2 rounded-full bg-[#00bcd4]" title="MA10" />
            <span className="w-2 h-2 rounded-full bg-[#e91e63]" title="MA20" />
            <span className="w-2 h-2 rounded-full bg-[#00e676]" title="MA60" />
          </div>
        );
      case 'EMA':
        return (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#00bcd4]" />
            <span className="w-2 h-2 rounded-full bg-[#e91e63]" />
          </div>
        );
      case 'BOLL':
        return (
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-1.5 rounded-sm bg-[#2962ff]/80" title="布林通道" />
          </div>
        );
      case 'SAR':
        return <span className="w-2 h-2 rounded-full bg-[#ff9800]" />;
      case 'VWAP':
        return <span className="w-3 h-1 rounded-sm bg-[#06b6d4]" />;
      case 'MACD':
        return (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#2962ff]" title="DIF" />
            <span className="w-2 h-2 rounded-full bg-[#ff6d00]" title="DEA" />
          </div>
        );
      case 'RSI':
        return <span className="w-2.5 h-2.5 rounded-full bg-[#9c27b0]" />;
      case 'VOL':
        return (
          <div className="flex items-center gap-0.5">
            <span className="w-1.5 h-3 bg-[#089981] rounded-xs" />
            <span className="w-1.5 h-2 bg-[#f23645] rounded-xs" />
          </div>
        );
      case 'KDJ':
        return (
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#ffeb3b]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff4081]" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-pro-card border border-pro-border rounded-2xl w-full max-w-2xl shadow-card-elevated overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 頂部標題 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pro-border bg-pro-bg/50">
          <div>
            <h3 className="text-white font-bold text-base">技術指標庫管理</h3>
            <p className="text-xs text-pro-muted">自由勾選主圖與副圖指標，點擊「?」可查閱指標原理與實戰觀念</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-pro-hover text-pro-muted hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 推薦指標配置快捷列 */}
        <div className="px-6 py-3 bg-pro-bg/30 border-b border-pro-border flex items-center gap-2 text-xs overflow-x-auto">
          <span className="text-pro-muted flex items-center gap-1 shrink-0">
            <Sparkles size={14} className="text-amber-400" />
            常用指標配置：
          </span>
          <button
            onClick={() => onApplyPreset('novice')}
            className="px-2.5 py-1 bg-pro-panel hover:bg-pro-hover text-pro-text hover:text-white rounded-lg border border-pro-border transition-all shrink-0 font-medium"
          >
            🔰 經典均線量能 (MA + VOL)
          </button>
          <button
            onClick={() => onApplyPreset('oscillator')}
            className="px-2.5 py-1 bg-pro-panel hover:bg-pro-hover text-pro-text hover:text-white rounded-lg border border-pro-border transition-all shrink-0 font-medium"
          >
            🌊 震盪反彈 (BOLL + RSI)
          </button>
          <button
            onClick={() => onApplyPreset('trend')}
            className="px-2.5 py-1 bg-pro-panel hover:bg-pro-hover text-pro-text hover:text-white rounded-lg border border-pro-border transition-all shrink-0 font-medium"
          >
            🚀 趨勢主升 (EMA + MACD)
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
          {/* 主圖指標 */}
          <div>
            <h4 className="text-xs font-bold text-pro-accent uppercase tracking-wider mb-3">
              主圖疊加指標 (直接畫在 K 線主圖上)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mainList.map((id) => {
                const info = INDICATORS_DATA[id];
                const isActive = mainIndicators.includes(id);
                return (
                  <div
                    key={id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-blue-600/15 border-blue-500 font-semibold'
                        : 'bg-pro-panel/70 border-pro-border hover:border-white/20'
                    }`}
                  >
                    <button
                      onClick={() => onToggleMain(id)}
                      className="flex-1 flex items-center gap-3 text-left"
                    >
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                          isActive
                            ? 'bg-pro-accent border-pro-accent text-white'
                            : 'border-pro-muted/50 bg-pro-bg'
                        }`}
                      >
                        {isActive && <Check size={13} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{info?.shortName || id}</span>
                          {getIndicatorColorSwatch(id)}
                        </div>
                        <div className="text-[11px] text-pro-muted">{info?.tagline}</div>
                      </div>
                    </button>

                    <button
                      onClick={() => onOpenEducation(id)}
                      className="p-1.5 text-pro-muted hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors ml-2"
                      title="查看指標觀念解析"
                    >
                      <HelpCircle size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 副圖指標 */}
          <div>
            <h4 className="text-xs font-bold text-pro-accent uppercase tracking-wider mb-3">
              副圖獨立指標 (顯示於圖表下方專屬視窗)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subList.map((id) => {
                const info = INDICATORS_DATA[id];
                const isActive = subIndicators.includes(id);
                return (
                  <div
                    key={id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-blue-600/15 border-blue-500 font-semibold'
                        : 'bg-pro-panel/70 border-pro-border hover:border-white/20'
                    }`}
                  >
                    <button
                      onClick={() => onToggleSub(id)}
                      className="flex-1 flex items-center gap-3 text-left"
                    >
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                          isActive
                            ? 'bg-pro-accent border-pro-accent text-white'
                            : 'border-pro-muted/50 bg-pro-bg'
                        }`}
                      >
                        {isActive && <Check size={13} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{info?.shortName || id}</span>
                          {getIndicatorColorSwatch(id)}
                        </div>
                        <div className="text-[11px] text-pro-muted">{info?.tagline}</div>
                      </div>
                    </button>

                    <button
                      onClick={() => onOpenEducation(id)}
                      className="p-1.5 text-pro-muted hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors ml-2"
                      title="查看指標觀念解析"
                    >
                      <HelpCircle size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="p-4 border-t border-pro-border bg-pro-bg/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            完成設定
          </button>
        </div>
      </div>
    </div>
  );
};
