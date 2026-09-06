import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RefreshCw,
  Calendar,
  FileText,
  Users,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Newspaper,
  Megaphone,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  WifiOff,
  DollarSign,
  BarChart3,
  Building2,
} from 'lucide-react';
import { StockSymbol } from '../types/stock';
import {
  CompanyFastInfoState,
  CalendarEventItem,
  AnnouncementCategory,
  AnnouncementImportance
} from '../types/companyInfo';
import { fetchCompanyFastInfo } from '../services/mopsService';

export interface CompanyFastInfoTabProps {
  symbol: StockSymbol;
  companyName?: string;
  onOpenEducation?: (topic: string) => void;
}

export const CompanyFastInfoTab: React.FC<CompanyFastInfoTabProps> = ({
  symbol,
  companyName,
  onOpenEducation: _onOpenEducation,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [infoData, setInfoData] = useState<CompanyFastInfoState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentMonthLabel = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}年${now.getMonth() + 1}月`;
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<'current_month_important' | 'all' | AnnouncementCategory>('current_month_important');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 載入公司最速報數據 (支援強制重新整理)
  const loadData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await fetchCompanyFastInfo(
        symbol.symbol,
        companyName || symbol.name,
        forceRefresh
      );
      setInfoData(data);
    } catch (err: any) {
      console.error('[CompanyFastInfoTab] Failed to fetch fast info:', err);
      setError(err?.message || '暫時無法連線至公開資訊觀測站或新聞源，請檢查網路連線。');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [symbol.symbol, companyName, symbol.name]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // 切換公告展開/收合狀態
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 分類清單配置 (預設聚焦當月重要消息)
  const categories: { id: 'current_month_important' | 'all' | AnnouncementCategory; label: string }[] = useMemo(() => [
    { id: 'current_month_important', label: '🔥 當月重要消息' },
    { id: 'all', label: '全部歷史公告' },
    { id: 'financial', label: '📊 財報成果' },
    { id: 'conference', label: '🎙️ 法說會' },
    { id: 'revenue', label: '📈 每月營收' },
    { id: 'dividend', label: '💰 股利除息' },
    { id: 'board', label: '🏛️ 董事會' },
    { id: 'material', label: '⚡ 重大營運' },
  ], []);

  // 各分類數量統計
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      current_month_important: 0,
      all: infoData?.announcements?.length || 0,
    };
    if (infoData?.announcements) {
      for (const a of infoData.announcements) {
        counts[a.category] = (counts[a.category] || 0) + 1;
        if (a.isCurrentMonth || a.importance === 'high' || a.importance === 'medium') {
          counts.current_month_important = (counts.current_month_important || 0) + 1;
        }
      }
    }
    return counts;
  }, [infoData?.announcements]);

  // 篩選後的公告列表
  const filteredAnnouncements = useMemo(() => {
    if (!infoData?.announcements) return [];
    if (selectedCategory === 'current_month_important') {
      const curImportant = infoData.announcements.filter(
        (a) => a.isCurrentMonth && (a.importance === 'high' || a.importance === 'medium')
      );
      if (curImportant.length > 0) return curImportant;

      const curAll = infoData.announcements.filter((a) => a.isCurrentMonth);
      if (curAll.length > 0) return curAll;

      const anyImportant = infoData.announcements.filter(
        (a) => a.importance === 'high' || a.importance === 'medium'
      );
      return anyImportant.length > 0 ? anyImportant.slice(0, 3) : infoData.announcements.slice(0, 3);
    }
    if (selectedCategory === 'all') return infoData.announcements;
    return infoData.announcements.filter((a) => a.category === selectedCategory);
  }, [infoData?.announcements, selectedCategory]);


  // 重要性徽章樣式
  const getImportanceBadge = (importance: AnnouncementImportance) => {
    switch (importance) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            🔴 高度重大
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            🟡 重要公告
          </span>
        );
      case 'normal':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-normal bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            🟢 一般常態
          </span>
        );
    }
  };

  // 分類標籤樣式
  const getCategoryBadgeClass = (category: AnnouncementCategory) => {
    switch (category) {
      case 'financial':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'conference':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'revenue':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'dividend':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'board':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      case 'material':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    }
  };

  // 事件圖標渲染
  const renderEventIcon = (eventType: CalendarEventItem['eventType']) => {
    switch (eventType) {
      case 'earnings':
        return <FileText className="w-4 h-4 text-emerald-400" />;
      case 'conference':
        return <Users className="w-4 h-4 text-purple-400" />;
      case 'revenue':
        return <BarChart3 className="w-4 h-4 text-blue-400" />;
      case 'dividend':
        return <DollarSign className="w-4 h-4 text-amber-400" />;
      case 'meeting':
      default:
        return <Sparkles className="w-4 h-4 text-cyan-400" />;
    }
  };

  // 新聞情緒標籤
  const renderSentimentBadge = (sentiment?: 'bullish' | 'bearish' | 'neutral') => {
    if (!sentiment) return null;
    switch (sentiment) {
      case 'bullish':
        return (
          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" /> 看多
          </span>
        );
      case 'bearish':
        return (
          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-0.5">
            <TrendingDown className="w-3 h-3" /> 看空
          </span>
        );
      case 'neutral':
      default:
        return (
          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-500/20 text-slate-300 border border-slate-500/30 flex items-center gap-0.5">
            <Minus className="w-3 h-3" /> 中立
          </span>
        );
    }
  };

  // 1:1 骨架屏載入狀態 (Skeleton Loader)
  if (loading && !infoData) {
    return (
      <div className="space-y-6 animate-pulse select-none">
        {/* 控制列骨架 */}
        <div className="flex items-center justify-end">
          <div className="w-24 h-8 rounded-lg bg-pro-panel" />
        </div>

        {/* 雙倒數卡片骨架 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-44 rounded-xl bg-pro-bg border border-pro-border p-5 space-y-3">
            <div className="flex justify-between items-center">
              <div className="w-32 h-6 rounded bg-pro-panel" />
              <div className="w-20 h-5 rounded-full bg-pro-panel" />
            </div>
            <div className="w-24 h-10 rounded bg-pro-panel mt-2" />
            <div className="w-full h-4 rounded bg-pro-panel" />
            <div className="w-3/4 h-4 rounded bg-pro-panel" />
          </div>

          <div className="h-44 rounded-xl bg-pro-bg border border-pro-border p-5 space-y-3">
            <div className="flex justify-between items-center">
              <div className="w-32 h-6 rounded bg-pro-panel" />
              <div className="w-20 h-5 rounded-full bg-pro-panel" />
            </div>
            <div className="w-24 h-10 rounded bg-pro-panel mt-2" />
            <div className="w-full h-4 rounded bg-pro-panel" />
            <div className="w-3/4 h-4 rounded bg-pro-panel" />
          </div>
        </div>

        {/* 時間軸骨架 */}
        <div className="p-5 rounded-xl bg-pro-bg border border-pro-border space-y-3">
          <div className="w-40 h-5 rounded bg-pro-panel" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-lg bg-pro-panel p-3 space-y-2">
                <div className="w-20 h-4 rounded bg-pro-card" />
                <div className="w-28 h-5 rounded bg-pro-card" />
                <div className="w-full h-3 rounded bg-pro-card" />
              </div>
            ))}
          </div>
        </div>

        {/* 重訊列表骨架 */}
        <div className="p-5 rounded-xl bg-pro-bg border border-pro-border space-y-4">
          <div className="w-48 h-6 rounded bg-pro-panel" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-pro-panel p-4 space-y-2">
              <div className="flex justify-between">
                <div className="w-40 h-4 rounded bg-pro-card" />
                <div className="w-20 h-4 rounded bg-pro-card" />
              </div>
              <div className="w-3/4 h-5 rounded bg-pro-card" />
              <div className="w-1/2 h-3 rounded bg-pro-card" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 完全無數據且遭遇錯誤時的防護 (Zero-White-Screen Principle)
  if (error && !infoData) {
    return (
      <div className="p-8 rounded-2xl bg-pro-bg border border-pro-border text-center space-y-4 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
          <WifiOff className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">資訊最速報資料連線逾時</h3>
          <p className="text-xs text-pro-muted mt-1 max-w-md mx-auto leading-relaxed">
            {error}
          </p>
        </div>
        <button
          onClick={() => loadData(true)}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-xs transition-all shadow-lg shadow-emerald-500/20 inline-flex items-center gap-2 active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          <span>重新嘗試載入</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-pro-text select-text">
      {/* 頂部操作列 (僅保留重新整理按鈕) */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => loadData(true)}
          disabled={isRefreshing || loading}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-pro-panel hover:bg-pro-border border border-pro-border text-white text-xs font-medium transition-all shadow-sm disabled:opacity-50 active:scale-95 shrink-0"
          title="強制自 MOPS 與新聞源重新同步最新資料"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? '同步擷取中...' : '重新整理'}</span>
        </button>
      </div>

      {/* 網路降級警示橫幅 (若展示快取數據但連線有警示) */}
      {error && infoData && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>即時連線受阻，目前呈現最近儲存之快照數據。</span>
          </div>
          <button
            onClick={() => loadData(true)}
            className="text-amber-200 underline hover:text-white text-[11px] ml-2"
          >
            點此重試
          </button>
        </div>
      )}

      {/* 雙倒數核心卡片 (Dual Countdown Hero Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 卡片 1: 下一次預計財報公布時程 (Next Earnings) */}
        {infoData?.nextEarnings ? (
          <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-950/30 via-pro-bg to-pro-panel border border-emerald-500/30 shadow-lg relative overflow-hidden flex flex-col justify-between group hover:border-emerald-500/50 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-emerald-300 tracking-wide uppercase">
                    下一次預計財報公布
                  </span>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {infoData.nextEarnings.statusLabel}
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <div className="text-3xl font-black font-mono tracking-tight text-white">
                  {infoData.nextEarnings.daysRemaining === 0 ? (
                    <span className="text-amber-400 animate-pulse">今日公布</span>
                  ) : infoData.nextEarnings.daysRemaining > 0 ? (
                    <>
                      <span className="text-emerald-400">{infoData.nextEarnings.daysRemaining}</span>
                      <span className="text-xs text-pro-muted font-normal ml-1">天後到期</span>
                    </>
                  ) : (
                    <>
                      <span className="text-pro-muted">{Math.abs(infoData.nextEarnings.daysRemaining)}</span>
                      <span className="text-xs text-pro-muted font-normal ml-1">天前已公布</span>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-1 flex items-center gap-1.5 text-xs text-pro-muted font-mono">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>預定日期：{infoData.nextEarnings.date}</span>
                {infoData.nextEarnings.time && <span>· {infoData.nextEarnings.time}</span>}
              </div>

              <h4 className="text-sm font-bold text-white mt-2">
                {infoData.nextEarnings.title}
              </h4>
            </div>

            {/* 關鍵看點清單 */}
            {infoData.nextEarnings.highlights && infoData.nextEarnings.highlights.length > 0 && (
              <div className="mt-3 pt-3 border-t border-pro-border/70 space-y-1.5">
                <div className="text-[11px] font-semibold text-emerald-400/90 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>核心檢驗重點：</span>
                </div>
                {infoData.nextEarnings.highlights.map((point, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-xs text-pro-textSec leading-relaxed">
                    <span className="text-emerald-400 font-bold shrink-0">•</span>
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-pro-bg border border-pro-border flex flex-col justify-between">
            <div className="flex items-center gap-2 text-pro-muted text-xs">
              <FileText className="w-4 h-4" />
              <span>下一次財報時程待公告</span>
            </div>
            <p className="text-xs text-pro-muted my-4 leading-relaxed">
              台股季報依規分別於 5/15 (Q1)、8/14 (Q2)、11/14 (Q3) 及次年 3/31 (年報) 前完成申報。系統將持續即時追蹤 MOPS 最新動態。
            </p>
            <div className="text-[11px] text-emerald-400 font-mono">法定申報追蹤中</div>
          </div>
        )}

        {/* 卡片 2: 法人說明會日程 (Investor Conference) */}
        {infoData?.nextConference ? (
          <div className="p-5 rounded-xl bg-gradient-to-br from-purple-950/30 via-pro-bg to-pro-panel border border-purple-500/30 shadow-lg relative overflow-hidden flex flex-col justify-between group hover:border-purple-500/50 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-purple-300 tracking-wide uppercase">
                    法人說明會日程 (Conference)
                  </span>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {infoData.nextConference.statusLabel}
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <div className="text-3xl font-black font-mono tracking-tight text-white">
                  {infoData.nextConference.daysRemaining === 0 ? (
                    <span className="text-amber-400 animate-pulse">今日召開</span>
                  ) : infoData.nextConference.daysRemaining > 0 ? (
                    <>
                      <span className="text-purple-400">{infoData.nextConference.daysRemaining}</span>
                      <span className="text-xs text-pro-muted font-normal ml-1">天後召開</span>
                    </>
                  ) : (
                    <>
                      <span className="text-pro-muted">{Math.abs(infoData.nextConference.daysRemaining)}</span>
                      <span className="text-xs text-pro-muted font-normal ml-1">天前已辦畢</span>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-1 flex items-center gap-1.5 text-xs text-pro-muted font-mono">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>會議日期：{infoData.nextConference.date}</span>
                {infoData.nextConference.time && <span>· {infoData.nextConference.time}</span>}
              </div>

              <h4 className="text-sm font-bold text-white mt-2">
                {infoData.nextConference.title}
              </h4>

              {infoData.nextConference.formatOrLocation && (
                <div className="text-xs text-pro-muted mt-0.5">
                  📍 {infoData.nextConference.formatOrLocation}
                </div>
              )}
            </div>

            {/* 法說會重點主題 */}
            {infoData.nextConference.highlights && infoData.nextConference.highlights.length > 0 && (
              <div className="mt-3 pt-3 border-t border-pro-border/70 space-y-1.5">
                <div className="text-[11px] font-semibold text-purple-400/90 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>預期說明重點：</span>
                </div>
                {infoData.nextConference.highlights.map((point, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-xs text-pro-textSec leading-relaxed">
                    <span className="text-purple-400 font-bold shrink-0">•</span>
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-pro-bg border border-pro-border flex flex-col justify-between">
            <div className="flex items-center gap-2 text-pro-muted text-xs">
              <Users className="w-4 h-4" />
              <span>近期無公開法說會排程</span>
            </div>
            <p className="text-xs text-pro-muted my-4 leading-relaxed">
              該公司目前尚未在公開資訊觀測站登記近期的法人說明會或業績發表會。若有最新排程，系統將於每日盤後同步載入。
            </p>
            <div className="text-[11px] text-purple-400 font-mono">已連線 MOPS 監控</div>
          </div>
        )}
      </div>

      {/* 關鍵行事曆時程時間軸 (Upcoming Events Timeline) */}
      <div className="p-5 rounded-xl bg-pro-bg border border-pro-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">關鍵日程時間軸 (Corporate Events Timeline)</h3>
          </div>
          <span className="text-xs text-pro-muted font-mono hidden sm:inline">
            每月營收 · 季度財報 · 法說會 · 除權息
          </span>
        </div>

        {infoData?.timelineEvents && infoData.timelineEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {infoData.timelineEvents.map((event) => {
              const isPast = event.daysRemaining < 0;
              const isToday = event.daysRemaining === 0;

              return (
                <div
                  key={event.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all min-h-[140px] ${
                    isToday
                      ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                      : isPast
                      ? 'bg-pro-panel/40 border-pro-border/60 opacity-70'
                      : 'bg-pro-panel border-pro-border hover:border-pro-borderStrong'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        {renderEventIcon(event.eventType)}
                        <span className="font-mono text-pro-muted text-[11px]">{event.date}</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono ${
                          isToday
                            ? 'bg-amber-400 text-black'
                            : isPast
                            ? 'text-pro-muted bg-white/5'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {isToday ? '今日' : isPast ? `${Math.abs(event.daysRemaining)}天前` : `${event.daysRemaining}天後`}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white mt-2 leading-snug break-words">
                      {event.title}
                    </h4>

                    {event.statusLabel && (
                      <span className="text-[11px] text-pro-muted mt-0.5 block">
                        {event.statusLabel}
                      </span>
                    )}
                  </div>

                  {event.highlights && event.highlights.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-pro-border/50 text-[11px] text-pro-textSec leading-relaxed break-words space-y-1">
                      {event.highlights.map((h, hIdx) => (
                        <p key={hIdx}>{h}</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-pro-muted">
            暫無已登錄之排程事件
          </div>
        )}
      </div>

      {/* 公開資訊觀測站 (MOPS) 重大訊息清單 (Announcements) */}
      <div className="p-5 rounded-xl bg-pro-bg border border-pro-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Megaphone className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              公開資訊觀測站 (MOPS) — 當月重要消息與公告
            </h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {currentMonthLabel} (當月最新)
            </span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              共 {filteredAnnouncements.length} 則
            </span>
          </div>

          <span className="text-xs text-pro-muted">
            依證券交易法第36條及證交所重大訊息處理程序發布
          </span>
        </div>

        {/* 分類篩選按鈕列 (Filter Pills - 單排橫向不換行) */}
        <div className="flex items-center gap-1.5 pb-2 border-b border-pro-border overflow-x-auto no-scrollbar flex-nowrap">
          {categories.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 whitespace-nowrap px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20'
                    : 'bg-pro-panel border border-pro-border text-pro-muted hover:text-white hover:bg-pro-hover'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1 rounded-full ${
                    isSelected ? 'bg-black/25 text-white' : 'bg-black/40 text-pro-muted'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 公告條目列表 */}
        {filteredAnnouncements.length > 0 ? (
          <div className="space-y-3">
            {filteredAnnouncements.map((item) => {
              const isExpanded = expandedIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-pro-panel border border-pro-border hover:border-pro-borderStrong transition-all group"
                >
                  {/* 公告頂部：分類、重要性、當月標記、日期 */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {getImportanceBadge(item.importance)}
                      {item.isCurrentMonth && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1 shrink-0">
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          當月最新
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getCategoryBadgeClass(
                          item.category
                        )}`}
                      >
                        {item.categoryLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-pro-muted">
                      <span>{item.date}</span>
                      {item.time && <span>{item.time}</span>}
                      <span className="text-pro-borderStrong">|</span>
                      <span className="text-[11px]">{item.source}</span>
                    </div>
                  </div>

                  {/* 公告主旨標題 */}
                  <h4
                    onClick={() => toggleExpand(item.id)}
                    className="text-sm font-bold text-white mt-2.5 leading-snug cursor-pointer group-hover:text-emerald-300 transition-colors"
                  >
                    {item.title}
                  </h4>

                  {/* 核心重點摘要清單 (Bullet Points) */}
                  {item.summaryPoints && item.summaryPoints.length > 0 && (
                    <div className="mt-2.5 space-y-1.5">
                      {item.summaryPoints.map((pt, pIdx) => (
                        <div key={pIdx} className="flex items-start gap-2 text-xs text-pro-textSec">
                          <span className="text-emerald-400 font-bold shrink-0">•</span>
                          <span className="leading-relaxed">{pt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 展開/收合完整公告按鈕 */}
                  {item.fullContent && (
                    <div className="mt-3 pt-2 border-t border-pro-border/60 flex items-center justify-between">
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                      >
                        <span>{isExpanded ? '收合完整公告內文' : '展開 MOPS 公告原文'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-pro-muted hover:text-white transition-colors"
                        >
                          <span>觀測站原件</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* 展開之完整公告內文 */}
                  {isExpanded && item.fullContent && (
                    <div className="mt-3 p-3.5 rounded-lg bg-black/40 border border-pro-border text-xs text-pro-text font-mono leading-relaxed whitespace-pre-wrap select-text animate-fade-in">
                      {item.fullContent}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 rounded-xl bg-pro-panel border border-pro-border text-center space-y-2">
            <Filter className="w-6 h-6 text-pro-muted mx-auto opacity-50" />
            <div className="text-xs text-white font-medium">該分類目前無公告</div>
            <p className="text-[11px] text-pro-muted">該公司近期未在「{selectedCategory}」類別發布重大訊息</p>
            <button
              onClick={() => setSelectedCategory('all')}
              className="text-xs text-emerald-400 hover:underline font-medium mt-1 inline-block"
            >
              檢視全部重大公告
            </button>
          </div>
        )}
      </div>

      {/* 權威財經與台灣本土科技即時新聞 (Financial & Taiwan Tech News Feed) */}
      <div className="p-5 rounded-xl bg-pro-bg border border-pro-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Newspaper className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">權威財經與台灣本土科技即時新聞 (個股專屬)</h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              🇹🇼 台灣本土科技報導整合
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              🎯 嚴格個股過濾已啟用
            </span>
          </div>
          <span className="text-xs text-pro-muted">
            已自動過濾無關大盤與總體市場雜訊，包含科技新報、電子時報、數位時代、鉅亨網等專屬報導
          </span>
        </div>

        {infoData?.news && infoData.news.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {infoData.news.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-pro-panel border border-pro-border hover:border-pro-borderStrong transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white/90">{item.source}</span>
                      <span className="text-pro-muted text-[11px]">{item.publishedAt}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.isTaiwanTech && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-0.5">
                          🇹🇼 台灣科技
                        </span>
                      )}
                      {renderSentimentBadge(item.sentiment)}
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        🎯 個股相關
                      </span>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-white mt-2 leading-snug hover:text-emerald-300 transition-colors break-words">
                    {item.title}
                  </h4>

                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {item.matchedKeyword && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-white/5 text-emerald-300 border border-emerald-500/20 shrink-0">
                        #{item.matchedKeyword}
                      </span>
                    )}
                    <p className="text-[11px] text-pro-muted leading-relaxed break-words">
                      {item.summary}
                    </p>
                  </div>
                </div>

                {item.url && (
                  <div className="mt-3 pt-2 border-t border-pro-border/50 flex justify-end">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                    >
                      <span>閱讀完整報導</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center space-y-2 bg-pro-panel rounded-xl border border-pro-border">
            <div className="text-xs text-white font-medium">🛡️ 暫無指名本公司之重大即時新聞</div>
            <p className="text-[11px] text-pro-muted max-w-md mx-auto">
              系統已為您過濾所有無關之大盤與外圍市場雜訊，確保呈現內容 100% 針對本個股。
            </p>
          </div>
        )}
      </div>

      {/* 底部導引與免責聲明 */}
      <div className="p-4 rounded-xl bg-pro-panel border border-pro-border flex items-start gap-3 text-xs">
        <Building2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-white">公開資訊觀測站法規資訊與時效說明：</span>
          <p className="text-pro-muted leading-relaxed">
            本分頁所呈現之重大訊息直接彙整自臺灣證券交易所公開資訊觀測站 (MOPS) 與權威財經新聞資訊流。法說會與財報日程若屬「法定預估」，係根據證券交易法規之申報截止期限推算；若屬「已確認」，則為公司官方公告之會議日程。資料僅供研究分析參考，實際公布內容以公開資訊觀測站最新公告原件為準。
          </p>
        </div>
      </div>
    </div>
  );
};
