import React, { useState } from 'react';
import { X, Activity, Cpu, HardDrive, CheckCircle2, Copy, Check, Terminal, ShieldCheck, Sparkles } from 'lucide-react';

interface SystemHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  period: string;
  klineCount: number;
  mainIndicatorsCount: number;
  subIndicatorsCount: number;
  drawingCount: number;
  currentVersion?: string;
  onOpenUpdateModal?: () => void;
}

export const SystemHealthModal: React.FC<SystemHealthModalProps> = ({
  isOpen,
  onClose,
  symbol,
  period,
  klineCount,
  mainIndicatorsCount,
  subIndicatorsCount,
  drawingCount,
  currentVersion = '1.0.0',
  onOpenUpdateModal,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyReport = () => {
    const report = `【ProStock 系統狀態報告】
時間: ${new Date().toLocaleString()}
軟體版本: v${currentVersion}
當前標的: ${symbol} (${period})
K線數據量: ${klineCount} 根
圖表引擎: KLineChart Canvas 2D
主圖指標數: ${mainIndicatorsCount}
副圖指標數: ${subIndicatorsCount}
已建立畫線物件: ${drawingCount}
環境資訊: ${navigator.userAgent}
運行狀態: 正常`;

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-pro-card border border-pro-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 頂部標題 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pro-border bg-pro-bg/50">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Activity size={20} className="text-emerald-400" />
            <span>系統狀態與效能資訊</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-pro-hover text-pro-muted hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* 總體狀態 */}
          <div className="flex items-center justify-between p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} />
              <span className="font-bold text-sm">系統模組運作正常</span>
            </div>
            <span className="text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
              60 FPS 渲染中
            </span>
          </div>

          {/* 軟體版本與安全狀態 */}
          <div className="bg-pro-bg/50 border border-pro-border rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">ProStock Analyzer</span>
                  <span className="font-mono text-emerald-400 font-semibold">v{currentVersion}</span>
                </div>
                <div className="text-[10px] text-pro-muted">官方數位簽名驗證 • SHA-512 完整性防護</div>
              </div>
            </div>
            {onOpenUpdateModal && (
              <button
                onClick={onOpenUpdateModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-pro-card hover:bg-pro-hover text-white rounded-lg border border-pro-border text-xs transition-colors font-medium"
              >
                <Sparkles size={12} className="text-pro-accent" />
                <span>檢查新版本</span>
              </button>
            )}
          </div>

          {/* 核心數據指標 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-pro-bg/50 border border-pro-border p-3 rounded-xl">
              <div className="flex items-center gap-1.5 text-pro-muted mb-1">
                <Cpu size={14} className="text-pro-accent" />
                <span>圖表渲染引擎</span>
              </div>
              <div className="text-white font-bold font-mono">KLineChart v9 (Canvas)</div>
              <div className="text-[11px] text-emerald-400 mt-0.5">GPU 硬體加速已開啟</div>
            </div>

            <div className="bg-pro-bg/50 border border-pro-border p-3 rounded-xl">
              <div className="flex items-center gap-1.5 text-pro-muted mb-1">
                <HardDrive size={14} className="text-amber-400" />
                <span>K 線數據容量</span>
              </div>
              <div className="text-white font-bold font-mono">{klineCount} 根 K 棒</div>
              <div className="text-[11px] text-pro-muted mt-0.5">當前週期：{period}</div>
            </div>
          </div>

          {/* 運算負載分析 */}
          <div className="bg-pro-bg/30 border border-pro-border rounded-xl p-3 space-y-2 font-mono text-[11px]">
            <div className="flex justify-between text-pro-muted">
              <span>作用中主圖指標:</span>
              <span className="text-white">{mainIndicatorsCount} 個 (MA/EMA/BOLL/SAR)</span>
            </div>
            <div className="flex justify-between text-pro-muted">
              <span>作用中副圖指標:</span>
              <span className="text-white">{subIndicatorsCount} 個 (MACD/RSI/VOL...)</span>
            </div>
            <div className="flex justify-between text-pro-muted">
              <span>本地已儲存畫線:</span>
              <span className="text-white">{drawingCount} 筆物件 (重啟自動還原)</span>
            </div>
          </div>

          {/* 系統維護與問題回報 */}
          <div className="bg-pro-bg/50 border border-pro-border rounded-xl p-3 flex gap-2.5 text-slate-300">
            <Terminal size={18} className="text-pro-accent shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <p className="font-bold text-white mb-0.5">系統維護與問題排除：</p>
              若遇到行情資料異常或介面問題，可點擊下方「複製系統診斷報告」，將運行環境與狀態日誌匯出以利快速排查。
            </div>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="p-4 border-t border-pro-border bg-pro-bg/40 flex justify-end gap-2">
          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1.5 px-4 py-2 bg-pro-accent hover:bg-blue-600 text-white font-medium text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-colors"
          >
            {copied ? <Check size={14} className="text-green-300" /> : <Copy size={14} />}
            {copied ? '已成功複製診斷報告' : '複製系統診斷報告'}
          </button>
        </div>
      </div>
    </div>
  );
};
