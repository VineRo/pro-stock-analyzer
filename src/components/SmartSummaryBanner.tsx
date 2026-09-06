import React, { useState } from 'react';
import { Sparkles, AlertCircle, TrendingUp, TrendingDown, ChevronDown, ChevronUp, BookOpen, Building2 } from 'lucide-react';
import { TechnicalSummary } from '../types/stock';

interface SmartSummaryBannerProps {
  summary: TechnicalSummary;
  symbolName: string;
  onOpenEducation: () => void;
  onOpenFundamentals?: () => void;
}

export const SmartSummaryBanner: React.FC<SmartSummaryBannerProps> = ({
  summary,
  symbolName,
  onOpenEducation,
  onOpenFundamentals,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  if (!summary) {
    return null;
  }

  const getRatingStyle = (rating: TechnicalSummary['overallRating']) => {
    switch (rating) {
      case '強烈看多':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 font-semibold';
      case '偏多震盪':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/40 font-semibold';
      case '中立觀望':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/40 font-semibold';
      case '偏空震盪':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/40 font-semibold';
      case '空方主導':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/40 font-semibold';
      default:
        return 'bg-blue-500/15 text-blue-400 border-blue-500/40 font-semibold';
    }
  };

  return (
    <div className="bg-pro-panel/95 backdrop-blur-md border-b border-pro-border px-4 py-2 text-xs transition-all select-none text-pro-text">
      <div className="flex items-center justify-between">
        {/* 左側：綜合診斷與多空評分 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-white font-bold text-xs">
            <Sparkles size={15} className="text-amber-400" />
            <span>盤面即時訊號速覽</span>
            <span className="text-white font-extrabold bg-[#131722] border border-[#363a45] px-2 py-0.5 rounded font-mono text-[11px] shadow-sm">
              {symbolName}
            </span>
          </div>

          {/* 多空評分膠囊標籤 (標註日K權威基準定錨，切換時間線時評分固定不亂跳) */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold font-mono transition-all ${getRatingStyle(
              summary.overallRating
            )}`}
            title="【日K基準多空評分】：以日K趨勢、基本面指標與籌碼結構綜合評估，數值以日線為準，切換時間週期不隨意跳動。"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
            <span className="text-[10px] px-1 py-0.2 bg-black/30 rounded border border-current/20 font-sans tracking-tight">日K基準</span>
            <span>{summary.overallRating}</span>
            <span className="opacity-90">· 多空評分: {summary.score}分</span>
          </div>

          {/* 趨勢狀態橫向預覽 */}
          {!collapsed && (
            <div className="hidden xl:flex items-center gap-2 text-pro-muted text-[11px]">
              <span className="flex items-center gap-1 text-white/90">
                {summary.trend === 'bullish' ? (
                  <TrendingUp size={13} className="text-pro-up" />
                ) : (
                  <TrendingDown size={13} className="text-pro-down" />
                )}
                {summary.trendText}
              </span>
            </div>
          )}
        </div>

        {/* 右側：個股基本面 & 指標指南按鈕 & 收合按鈕 */}
        <div className="flex items-center gap-2">
          {onOpenFundamentals && (
            <button
              onClick={onOpenFundamentals}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30 text-[11px] font-medium transition-colors shadow-sm"
              title="查看個股基本面與財務體質"
            >
              <Building2 size={13} className="text-emerald-400" />
              <span className="hidden sm:inline">個股基本面</span>
            </button>
          )}

          <button
            onClick={onOpenEducation}
            className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/30 text-[11px] font-medium transition-colors shadow-sm"
            title="查看指標觀念指南"
          >
            <BookOpen size={13} />
            <span className="hidden sm:inline">指標指南</span>
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-pro-muted hover:text-white rounded-lg hover:bg-pro-hover transition-colors"
            title={collapsed ? '展開詳細動能與實戰提醒' : '收合分析橫幅'}
          >
            {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
        </div>
      </div>

      {/* 展開後的詳細動能與避坑提示 (三層認知架構) */}
      {!collapsed && (
        <div className="mt-2 pt-2 border-t border-pro-border/50 space-y-2 text-[11px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center justify-between gap-2 bg-[#181c27] px-2.5 py-1 rounded-lg border border-pro-border/70">
              <div className="flex items-start gap-1.5 text-pro-text min-w-0">
                <span className="text-pro-accent font-bold shrink-0">⚡ 動能判讀：</span>
                <span className="leading-relaxed text-white/90">{summary.momentumText}</span>
              </div>
              {onOpenFundamentals && (
                <button
                  onClick={onOpenFundamentals}
                  className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition-all shadow-sm active:scale-95 hover:border-emerald-400"
                  title="開啟個股基本面診斷（本益比、殖利率、營收、財務指標）"
                >
                  <Building2 size={13} className="text-emerald-400" />
                  <span>個股基本面</span>
                </button>
              )}
            </div>

            <div className="flex items-start gap-1.5 text-amber-200/90 bg-amber-500/5 px-2 py-1 rounded-lg border border-amber-500/20">
              <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{summary.warningText}</span>
            </div>
          </div>

          {/* 機構訂單流 (SMC) 與估值共振橫幅 */}
          {summary.institutionalNote && (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300">
              <span className="font-bold text-emerald-400 shrink-0">🏛️ 機構共振視角：</span>
              <span className="truncate">{summary.institutionalNote}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
