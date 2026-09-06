import React, { useState, useMemo } from 'react';
import { 
  X, 
  Building2, 
  ShieldCheck, 
  DollarSign, 
  Activity, 
  PieChart, 
  Info, 
  Sliders, 
  Sparkles, 
  HelpCircle, 
  BarChart2, 
  AlertCircle,
  Dice5,
  Layers,
  ArrowRight
} from 'lucide-react';
import { StockSymbol } from '../types/stock';
import { getFundamentalData } from '../data/stockService';
import { 
  calculateDCFValuation, 
  generateComprehensiveValuation, 
  runMonteCarloSimulation 
} from '../utils/valuationEngine';
import { CompanyFastInfoTab } from './CompanyFastInfoTab';

interface FundamentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: StockSymbol;
  onOpenEducation?: (indicatorId: string) => void;
}

export const FundamentalModal: React.FC<FundamentalModalProps> = ({
  isOpen,
  onClose,
  symbol,
  onOpenEducation,
}) => {
  const [activeTab, setActiveTab] = useState<'fast_info' | 'football' | 'dcf' | 'pe_bands' | 'monte_carlo' | 'health'>('football');
  const [showBeginnerGuide, setShowBeginnerGuide] = useState<boolean>(true);

  // 取得個股基本面數據
  const fundamental = useMemo(() => {
    return getFundamentalData(symbol.symbol, symbol.price);
  }, [symbol.symbol, symbol.price]);

  // 1. DCF 互動滑桿狀態 (預設讀取真實財務參數)
  const [wacc, setWacc] = useState<number>(() => fundamental.wacc || 8.5);
  const [growthRate5Y, setGrowthRate5Y] = useState<number>(() => fundamental.growthRateNext5Y || fundamental.revenueGrowthYoY || 12.0);
  const [terminalGrowth, setTerminalGrowth] = useState<number>(() => fundamental.terminalGrowthRate || 2.5);

  // 2. 即時動態計算 DCF
  const dcfResult = useMemo(() => {
    if (!isOpen) return null;
    const fcfBase = fundamental.freeCashFlow || symbol.price * 0.045 * (fundamental.sharesOutstanding || 10);
    return calculateDCFValuation({
      currentPrice: symbol.price,
      freeCashFlow: fcfBase,
      growthRate5Y,
      terminalGrowthRate: terminalGrowth,
      wacc,
      netDebt: fundamental.netDebt || 0,
      sharesOutstanding: fundamental.sharesOutstanding || 10,
    });
  }, [isOpen, symbol.price, fundamental, growthRate5Y, terminalGrowth, wacc]);

  // 3. 橄欖球場綜合估值模型
  const comprehensive = useMemo(() => {
    if (!isOpen) return null;
    return generateComprehensiveValuation(symbol.symbol, symbol.price, symbol.currency, fundamental);
  }, [isOpen, symbol.symbol, symbol.price, symbol.currency, fundamental]);

  // 4. 蒙地卡羅 1,000 次路徑模擬
  const monteCarlo = useMemo(() => {
    if (!isOpen) return null;
    const beta = fundamental.beta || 1.1;
    const histVol = Math.max(18, Math.min(65, 22 * beta));
    return runMonteCarloSimulation(symbol.price, histVol, 8.0, 60, 1000);
  }, [isOpen, symbol.price, fundamental.beta]);

  if (!isOpen || !dcfResult || !comprehensive || !monteCarlo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 md:p-6 animate-fade-in">
      <div className="bg-pro-panel border border-pro-border rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden text-pro-text">
        {/* 頂部導航列 Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pro-border bg-pro-bg/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  {fundamental.name} ({fundamental.symbol})
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal">
                    {fundamental.sector}
                  </span>
                </h2>
                <span className="text-xs font-mono font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                  現價: {symbol.currency} ${symbol.price.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-pro-muted mt-0.5">
                市值 {fundamental.marketCap} • 綜合評價：
                <span className={`font-semibold ml-1 ${
                  comprehensive.overallRating.includes('低估') ? 'text-emerald-400' : 'text-yellow-400'
                }`}>
                  {comprehensive.overallRating}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBeginnerGuide(!showBeginnerGuide)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                showBeginnerGuide 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                  : 'bg-pro-bg text-pro-muted border-pro-border hover:text-white'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>估值觀念速覽</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-pro-border text-pro-muted hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 6 大功能頁籤分頁 Tab Bar */}
        <div className="px-6 py-2 border-b border-pro-border bg-pro-bg/40 flex items-center justify-between shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'fast_info', label: '⚡ 資訊最速報 / 重訊日程', desc: '即時重大訊息與法說會財報日程' },
              { id: 'football', label: '🏈 綜合估值區間圖', desc: '多模型公允價值重疊交集' },
              { id: 'dcf', label: '🧮 互動式 DCF 精算器', desc: '自由現金流折現與5x5敏感度' },
              { id: 'pe_bands', label: '🌊 歷史估值河流圖', desc: 'P/E 本益比倍數水位' },
              { id: 'monte_carlo', label: '🎲 蒙地卡羅 1,000 次模擬', desc: '隨機機率路徑與95% VaR' },
              { id: 'health', label: '📊 核心財務體質卡', desc: 'EPS、殖利率與營收成長' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20'
                    : 'text-pro-muted hover:text-pro-text hover:bg-pro-panel'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 主內容區塊 (滾動) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* 估值工具核心邏輯指引 (可開關) */}
          {showBeginnerGuide && activeTab !== 'fast_info' && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-pro-panel to-blue-500/10 border border-amber-500/20 text-xs animate-fade-in relative">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-amber-200 text-sm flex items-center gap-2">
                    估值工具核心邏輯：這 5 大指標在算什麼？
                  </div>
                  <p className="text-pro-muted mt-1 leading-relaxed">
                    投資股票本質上是持有企業部分所有權。除了看短期的量價走勢與動能（技術面），也需要評估企業長期能創造多少自由現金流（DCF）、當前價格相對於歷史與同業是否偏貴（本益比河流圖），以及在極端情境下的風險承受度（安全邊際與蒙地卡羅模擬）。
                  </p>
                  <div className="mt-2.5 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="p-2 rounded bg-black/30 border border-white/5">
                      <span className="font-bold text-emerald-300">1. 安全邊際 (MoS)：</span>
                      <span className="text-pro-muted ml-1">像買車附贈的防撞氣囊。如果公允價 $100，現價 $70，你的安全邊際就是 30%，越厚越抗跌！</span>
                    </div>
                    <div className="p-2 rounded bg-black/30 border border-white/5">
                      <span className="font-bold text-blue-300">2. DCF 現金流折現：</span>
                      <span className="text-pro-muted ml-1">假設這家店未來 5 年每年給你分紅，把未來的錢按折現率換算成「今天的價值」。</span>
                    </div>
                    <div className="p-2 rounded bg-black/30 border border-white/5">
                      <span className="font-bold text-purple-300">3. 蒙地卡羅 1,000 次模擬：</span>
                      <span className="text-pro-muted ml-1">讓電腦擲 1,000 次骰子模擬未來黑天鵝行情，算出 95% 信心水準下的最大可能下跌底線。</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 0: 資訊最速報與重訊日程 (Company Fast Info & MOPS Announcements) */}
          {activeTab === 'fast_info' && (
            <div className="space-y-6 animate-fade-in">
              <CompanyFastInfoTab 
                symbol={symbol} 
                companyName={fundamental.name} 
                onOpenEducation={onOpenEducation}
              />
            </div>
          )}

          {/* TAB 1: 綜合估值區間圖 (Football Field Summary) */}
          {activeTab === 'football' && (
            <div className="space-y-6 animate-fade-in">
              {/* 頂部綜合定價總結卡 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-pro-bg border border-pro-border flex flex-col justify-between">
                  <div className="text-xs text-pro-muted">多模型綜合公允價值區間</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
                    ${comprehensive.sweetSpotRange[0]} — ${comprehensive.sweetSpotRange[1]}
                  </div>
                  <div className="text-[11px] text-pro-muted mt-1">
                    各估值模型與共識目標價交集核心
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-pro-bg border border-pro-border flex flex-col justify-between">
                  <div className="text-xs text-pro-muted">目前股價折溢價水準</div>
                  <div className={`text-2xl font-bold font-mono mt-2 flex items-center gap-1 ${
                    comprehensive.overallDiscountPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {comprehensive.overallDiscountPercent >= 0 ? '折價 ' : '溢價 '}
                    {Math.abs(comprehensive.overallDiscountPercent)}%
                  </div>
                  <div className="text-[11px] text-pro-muted mt-1">
                    {comprehensive.overallDiscountPercent >= 15 
                      ? '具備顯著長線安全邊際，買點優良' 
                      : comprehensive.overallDiscountPercent <= -15 
                      ? '價格高於公允水準，需提防估值回歸' 
                      : '價格處於公允合理定價中樞'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-pro-bg border border-pro-border flex flex-col justify-between">
                  <div className="text-xs text-pro-muted">機構綜合推薦動作</div>
                  <div className="text-xl font-bold text-white mt-2 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span>{comprehensive.overallRating}</span>
                  </div>
                  <div className="text-[11px] text-emerald-300/80 mt-1">
                    法人評等：{fundamental.analystConsensus}
                  </div>
                </div>
              </div>

              {/* 華爾街橄欖球場視覺化圖表 (SVG Football Field Chart) */}
              <div className="p-5 rounded-xl bg-pro-bg border border-pro-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-emerald-400" />
                      多模型估值區間橫向對比 (Football Field Valuation Chart)
                    </h3>
                    <p className="text-xs text-pro-muted mt-0.5">
                      高盛、摩根士丹利機構研報同款格式：垂直虛線代表當前市價 (${symbol.price})
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5 text-pro-muted">
                      <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500"></span>
                      基本面模型
                    </span>
                    <span className="flex items-center gap-1.5 text-pro-muted">
                      <span className="w-3 h-3 rounded bg-blue-500/30 border border-blue-500"></span>
                      乘數估值
                    </span>
                    <span className="flex items-center gap-1.5 text-pro-muted">
                      <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500"></span>
                      市場與投行
                    </span>
                  </div>
                </div>

                {/* SVG 繪製區 */}
                <div className="relative py-4">
                  {(() => {
                    const allLows = comprehensive.models.map((m) => m.lowPrice).concat(symbol.price);
                    const allHighs = comprehensive.models.map((m) => m.highPrice).concat(symbol.price);
                    const minPrice = Math.min(...allLows) * 0.85;
                    const maxPrice = Math.max(...allHighs) * 1.15;
                    const range = maxPrice - minPrice || 1;

                    const getXPercent = (p: number) => {
                      return Math.max(0, Math.min(100, ((p - minPrice) / range) * 100));
                    };

                    const currentX = getXPercent(symbol.price);
                    const sweetX1 = getXPercent(comprehensive.sweetSpotRange[0]);
                    const sweetX2 = getXPercent(comprehensive.sweetSpotRange[1]);

                    return (
                      <div className="space-y-4 relative">
                        {/* 甜蜜區間背景光帶 */}
                        <div 
                          className="absolute top-0 bottom-0 bg-emerald-500/10 border-x border-emerald-500/30 pointer-events-none z-0 rounded"
                          style={{
                            left: `${sweetX1}%`,
                            width: `${sweetX2 - sweetX1}%`,
                          }}
                        >
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-400 bg-pro-panel px-1.5 py-0.5 rounded border border-emerald-500/30">
                            公允價值交集區
                          </span>
                        </div>

                        {/* 當前市價垂直定位線 */}
                        <div 
                          className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-20 pointer-events-none"
                          style={{ left: `${currentX}%` }}
                        >
                          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-bold font-mono text-yellow-400 bg-black px-1.5 py-0.2 rounded border border-yellow-400/40">
                            現價 ${symbol.price}
                          </span>
                        </div>

                        {/* 模型條目列表 */}
                        {comprehensive.models.map((item, idx) => {
                          const leftPct = getXPercent(item.lowPrice);
                          const rightPct = getXPercent(item.highPrice);
                          const widthPct = Math.max(2, rightPct - leftPct);
                          const midPct = getXPercent(item.midPrice);

                          const colorClass =
                            item.category === 'fundamental'
                              ? 'bg-emerald-500/25 border-emerald-500 text-emerald-300'
                              : item.category === 'multiples'
                              ? 'bg-blue-500/25 border-blue-500 text-blue-300'
                              : 'bg-amber-500/25 border-amber-500 text-amber-300';

                          return (
                            <div key={idx} className="relative z-10 py-1">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-semibold text-white">{item.modelName}</span>
                                <span className="text-pro-muted font-mono text-[11px]">
                                  ${item.lowPrice} — <span className="text-white font-bold">${item.midPrice}</span> — ${item.highPrice}
                                </span>
                              </div>

                              <div className="h-6 w-full bg-pro-panel/60 rounded-lg relative overflow-hidden border border-pro-border/50">
                                <div 
                                  className={`absolute top-1 bottom-1 rounded border ${colorClass} flex items-center justify-center transition-all`}
                                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                >
                                  {/* 中位數圓點 */}
                                  <div 
                                    className="w-2.5 h-2.5 rounded-full bg-white shadow-md border border-black absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                                    style={{ left: `${((midPct - leftPct) / widthPct) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 實戰判讀參考 */}
              <div className="p-4 rounded-xl bg-pro-panel border border-pro-border flex items-start gap-3 text-xs">
                <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">實戰判讀參考：當前價位如何解讀？</span>
                  <p className="text-pro-muted mt-1 leading-relaxed">
                    目前股價相較於公允估值區間處於
                    <span className="font-bold text-white mx-1">{comprehensive.overallRating}</span>
                    狀態。若現價低於綠色公允區間下緣，代表市場價格低於估值中軸，具備較佳的安全邊際，可搭配技術面均線或 FVG 回踩評估分批建倉；若現價已突破區間上緣，代表短期預期已高度反映，追高宜留意均值回歸的拉回整理。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 互動式 DCF 精算器與 5x5 敏感度矩陣 */}
          {activeTab === 'dcf' && (
            <div className="space-y-6 animate-fade-in">
              {/* 互動式參數滑桿調整區 */}
              <div className="p-5 rounded-xl bg-pro-bg border border-pro-border space-y-4">
                <div className="flex items-center justify-between border-b border-pro-border pb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">互動式 DCF 參數微調器 (即時連動試算)</h3>
                  </div>
                  <span className="text-xs text-pro-muted">
                    拖曳滑桿可立即觀察內在價值與敏感度變化
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* 滑桿 1: WACC */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-pro-muted flex items-center gap-1">
                        折現率 (WACC)
                        <Info className="w-3 h-3 text-pro-muted" />
                      </span>
                      <span className="font-bold font-mono text-emerald-400 text-sm">{wacc.toFixed(1)}%</span>
                    </div>
                    <input
                      type="range"
                      min={5.0}
                      max={14.0}
                      step={0.1}
                      value={wacc}
                      onChange={(e) => setWacc(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="text-[11px] text-pro-muted">
                      資本加權成本，可視為您要求的最低及格年化報酬率。
                    </div>
                  </div>

                  {/* 滑桿 2: 前 5 年預估成長率 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-pro-muted flex items-center gap-1">
                        前 5 年複合增長率 (5Y Growth)
                        <Info className="w-3 h-3 text-pro-muted" />
                      </span>
                      <span className="font-bold font-mono text-blue-400 text-sm">{growthRate5Y.toFixed(1)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.0}
                      max={40.0}
                      step={0.5}
                      value={growthRate5Y}
                      onChange={(e) => setGrowthRate5Y(parseFloat(e.target.value))}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                    <div className="text-[11px] text-pro-muted">
                      預期未來 5 年這家公司每年自由現金流的增長速度。
                    </div>
                  </div>

                  {/* 滑桿 3: 永續增長率 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-pro-muted flex items-center gap-1">
                        永續增長率 (Terminal g)
                        <Info className="w-3 h-3 text-pro-muted" />
                      </span>
                      <span className="font-bold font-mono text-purple-400 text-sm">{terminalGrowth.toFixed(1)}%</span>
                    </div>
                    <input
                      type="range"
                      min={1.0}
                      max={4.0}
                      step={0.1}
                      value={terminalGrowth}
                      onChange={(e) => setTerminalGrowth(parseFloat(e.target.value))}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                    <div className="text-[11px] text-pro-muted">
                      成熟期後每年與全球 GDP 相當的永續增長率 (通常為 2%~3%)。
                    </div>
                  </div>
                </div>
              </div>

              {/* DCF 運算核心成果卡 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-pro-bg border border-pro-border">
                  <div className="text-xs text-pro-muted">每股內在公允價值 (Fair Value)</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    ${dcfResult.intrinsicValuePerShare}
                  </div>
                  <div className="text-[11px] text-pro-muted mt-1">現價 ${dcfResult.currentPrice}</div>
                </div>

                <div className="p-4 rounded-xl bg-pro-bg border border-pro-border">
                  <div className="text-xs text-pro-muted">安全邊際 (Margin of Safety)</div>
                  <div className={`text-2xl font-bold font-mono mt-1 ${
                    dcfResult.marginOfSafetyPercent >= 20 ? 'text-emerald-400' : 'text-yellow-400'
                  }`}>
                    {dcfResult.marginOfSafetyPercent > 0 ? '+' : ''}{dcfResult.marginOfSafetyPercent}%
                  </div>
                  <div className="text-[11px] text-pro-muted mt-1">
                    {dcfResult.marginOfSafetyPercent >= 20 ? '具備充足防撞安全緩衝' : '安全邊際偏低或負值'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-pro-bg border border-pro-border">
                  <div className="text-xs text-pro-muted">企業價值 (Enterprise Value)</div>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    ${dcfResult.enterpriseValue} 億
                  </div>
                  <div className="text-[11px] text-pro-muted mt-1">
                    5年現值: ${dcfResult.presentValueOfExplicitPeriod}億
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-pro-bg border border-pro-border">
                  <div className="text-xs text-pro-muted">終值占比 (Terminal Value %)</div>
                  <div className="text-xl font-bold font-mono text-purple-400 mt-1">
                    {Number(((dcfResult.presentValueOfTerminalValue / dcfResult.enterpriseValue) * 100).toFixed(0))}%
                  </div>
                  <div className="text-[11px] text-pro-muted mt-1">
                    永續經營期占總企業價值比例
                  </div>
                </div>
              </div>

              {/* 5x5 敏感度矩陣熱力表 (Sensitivity Heatmap) */}
              <div className="p-5 rounded-xl bg-pro-bg border border-pro-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      5x5 雙變數敏感度矩陣 (WACC vs 永續增長率)
                    </h3>
                    <p className="text-xs text-pro-muted mt-0.5">
                      綠色 = 內在價值高於現價（低估特價）；紅色 = 內在價值低於現價（溢價偏貴）
                    </p>
                  </div>
                  <span className="text-xs text-pro-muted font-mono">單位：每股價值 (折溢價%)</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-center border-collapse">
                    <thead>
                      <tr className="border-b border-pro-border text-pro-muted">
                        <th className="p-2 text-left font-mono">WACC \ 永續 g</th>
                        {dcfResult.sensitivityMatrix.growthRange.map((g, idx) => (
                          <th key={idx} className="p-2 font-mono">{g.toFixed(1)}%</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dcfResult.sensitivityMatrix.grid.map((row, rIdx) => {
                        const currentWaccVal = dcfResult.sensitivityMatrix.waccRange[rIdx];
                        const isCurrentWaccRow = Math.abs(currentWaccVal - wacc) < 0.3;

                        return (
                          <tr key={rIdx} className={`border-b border-pro-border/50 ${isCurrentWaccRow ? 'bg-white/5' : ''}`}>
                            <td className="p-2 text-left font-mono font-semibold text-white">
                              {currentWaccVal.toFixed(1)}%
                            </td>
                            {row.map((cell, cIdx) => {
                              const isGreen = cell.discountOrPremiumPercent >= 0;
                              const isExtreme = Math.abs(cell.discountOrPremiumPercent) > 25;
                              const cellBg = isGreen 
                                ? (isExtreme ? 'bg-emerald-500/25 text-emerald-300' : 'bg-emerald-500/10 text-emerald-400')
                                : (isExtreme ? 'bg-rose-500/25 text-rose-300' : 'bg-rose-500/10 text-rose-400');

                              return (
                                <td key={cIdx} className="p-2">
                                  <div className={`p-1.5 rounded font-mono font-semibold ${cellBg}`}>
                                    <div>${cell.intrinsicValue}</div>
                                    <div className="text-[10px] opacity-80">
                                      {cell.discountOrPremiumPercent > 0 ? '+' : ''}{cell.discountOrPremiumPercent}%
                                    </div>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 歷史估值河流圖 (P/E Bands) */}
          {activeTab === 'pe_bands' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-5 rounded-xl bg-pro-bg border border-pro-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-emerald-400" />
                      歷史本益比河流圖通道 (Historical P/E Valuation River)
                    </h3>
                    <p className="text-xs text-pro-muted mt-0.5">
                      當前滾動 EPS: ${fundamental.eps} • 目前本益比: {fundamental.peRatio}x
                    </p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                    同業中位數 ~ 24.5x
                  </span>
                </div>

                {/* 河流圖水位條 */}
                <div className="space-y-3 py-2">
                  {[
                    { label: '40x 歷史高估警戒線', mult: 40, color: 'bg-rose-500/30 text-rose-400 border-rose-500/50' },
                    { label: '30x 樂觀景氣水位線', mult: 30, color: 'bg-amber-500/30 text-amber-400 border-amber-500/50' },
                    { label: '22x 歷史公允中軸線', mult: 22, color: 'bg-blue-500/30 text-blue-400 border-blue-500/50' },
                    { label: '15x 歷史低估支撐線', mult: 15, color: 'bg-emerald-500/30 text-emerald-400 border-emerald-500/50' },
                  ].map((band, idx) => {
                    const bandPrice = Number((fundamental.eps * band.mult).toFixed(2));
                    const isAbove = symbol.price >= bandPrice;

                    return (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-pro-panel border border-pro-border">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${band.color}`}>
                            {band.mult}x
                          </span>
                          <div>
                            <span className="text-xs font-semibold text-white">{band.label}</span>
                            <div className="text-[11px] text-pro-muted">
                              對應目標股價：<span className="font-mono font-bold text-white">${bandPrice}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-xs font-semibold font-mono ${
                            isAbove ? 'text-rose-400' : 'text-emerald-400'
                          }`}>
                            {isAbove ? '已突破上水線' : '現價於此線下方'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 彼得林區與葛拉漢公式輔助檢驗 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-pro-bg border border-pro-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">彼得·林區本益成長比 (PEG)</span>
                    <span className="font-mono text-emerald-400 font-bold">{comprehensive.peg.peg}</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white mt-2">
                    公允價: ${comprehensive.peg.fairValue}
                  </div>
                  <p className="text-[11px] text-pro-muted mt-1 leading-relaxed">
                    評等：<span className="text-emerald-400 font-semibold">{comprehensive.peg.evaluation}</span>。
                    彼得林區法則認為，健康的成長股其本益比應大致等於未來盈餘增長率（PEG ~ 1.0）。
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-pro-bg border border-pro-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">班傑明·葛拉漢修正公式 (Graham)</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      安全邊際 {comprehensive.graham.marginOfSafetyPercent}%
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white mt-2">
                    內在價值: ${comprehensive.graham.intrinsicValue}
                  </div>
                  <p className="text-[11px] text-pro-muted mt-1 leading-relaxed">
                    評等：<span className="text-emerald-400 font-semibold">{comprehensive.graham.evaluation}</span>。
                    將無風險公債利率 ({comprehensive.graham.riskFreeRate}%) 代入修正後的百年價值投資基準。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 蒙地卡羅 1,000 次路徑模擬 (Monte Carlo GBM) */}
          {activeTab === 'monte_carlo' && (
            <div className="space-y-6 animate-fade-in">
              {/* 頂部機率指標統計 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-pro-bg border border-pro-border">
                  <div className="text-xs text-pro-muted">60天中期期望價 (50% 中位數)</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    ${monteCarlo.expectedMedianPrice}
                  </div>
                  <div className="text-[11px] text-pro-muted mt-1">
                    預期變動：{Number((((monteCarlo.expectedMedianPrice - symbol.price) / symbol.price) * 100).toFixed(1))}%
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-pro-bg border border-pro-border">
                  <div className="text-xs text-pro-muted">95% 信賴區間範圍</div>
                  <div className="text-lg font-bold font-mono text-white mt-1">
                    ${monteCarlo.confidenceInterval95[0]} — ${monteCarlo.confidenceInterval95[1]}
                  </div>
                  <div className="text-[11px] text-pro-muted mt-1">統計學 95% 走勢將落在該範圍</div>
                </div>

                <div className="p-4 rounded-xl bg-pro-bg border border-pro-border">
                  <div className="text-xs text-pro-muted">跌破 -10% 停損點機率</div>
                  <div className={`text-2xl font-bold font-mono mt-1 ${
                    monteCarlo.breakdownProbabilityPercent < 20 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {monteCarlo.breakdownProbabilityPercent}%
                  </div>
                  <div className="text-[11px] text-pro-muted mt-1">
                    {monteCarlo.breakdownProbabilityPercent < 20 ? '下檔破位風險可控' : '需注意下行破線風險'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-pro-bg border border-pro-border">
                  <div className="text-xs text-pro-muted">95% 單日在險價值 (Daily VaR)</div>
                  <div className="text-2xl font-bold font-mono text-yellow-400 mt-1">
                    {monteCarlo.valueAtRisk95Percent}%
                  </div>
                  <div className="text-[11px] text-pro-muted mt-1">
                    年化歷史波動率: {monteCarlo.historicalVolatility}%
                  </div>
                </div>
              </div>

              {/* 蒙地卡羅扇形分佈圖表 (SVG Path Rendering) */}
              <div className="p-5 rounded-xl bg-pro-bg border border-pro-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Dice5 className="w-4 h-4 text-purple-400" />
                      未來 60 天幾何布朗運動 (GBM) 扇形機率分佈 (1,000 次路徑)
                    </h3>
                    <p className="text-xs text-pro-muted mt-0.5">
                      中位數黃線為最高機率路徑；外圍陰影為 90% 機率擴散邊界
                    </p>
                  </div>
                  <span className="text-xs text-pro-muted font-mono">
                    隨機微分方程: dS = μS·dt + σS·dW
                  </span>
                </div>

                <div className="h-48 w-full relative flex items-end pt-6 pb-2">
                  {/* SVG 繪製扇形圖 */}
                  <svg className="w-full h-full overflow-visible">
                    {(() => {
                      const points = monteCarlo.paths;
                      const maxP = Math.max(...points.map((p) => p.p95)) * 1.05;
                      const minP = Math.min(...points.map((p) => p.p10)) * 0.95;
                      const range = maxP - minP || 1;

                      const getSvgX = (day: number) => {
                        return `${(day / 60) * 100}%`;
                      };

                      const getSvgY = (price: number) => {
                        return (1 - (price - minP) / range) * 100;
                      };

                      // 構建 10%~90% 陰影多邊形
                      const poly1090 = points.map((p) => `${getSvgX(p.day)},${getSvgY(p.p90)}%`).join(' ') +
                        ' ' +
                        points.slice().reverse().map((p) => `${getSvgX(p.day)},${getSvgY(p.p10)}%`).join(' ');

                      // 構建 25%~75% 陰影多邊形
                      const poly2575 = points.map((p) => `${getSvgX(p.day)},${getSvgY(p.p75)}%`).join(' ') +
                        ' ' +
                        points.slice().reverse().map((p) => `${getSvgX(p.day)},${getSvgY(p.p25)}%`).join(' ');

                      // 50% 中位數折線
                      const line50 = points.map((p) => `${getSvgX(p.day)},${getSvgY(p.p50)}%`).join(' ');

                      return (
                        <>
                          {/* 10~90 淺色陰影 */}
                          <polygon points={poly1090} className="fill-purple-500/15" />
                          {/* 25~75 深色陰影 */}
                          <polygon points={poly2575} className="fill-purple-500/30" />
                          {/* 50% 中位數主線 */}
                          <polyline 
                            points={line50} 
                            className="stroke-yellow-400 fill-none" 
                            strokeWidth="2.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                          />
                        </>
                      );
                    })()}
                  </svg>
                </div>

                <div className="flex items-center justify-between text-xs text-pro-muted border-t border-pro-border pt-3">
                  <span>Day 0 (今天: ${symbol.price})</span>
                  <span>Day 15</span>
                  <span>Day 30 (一個月)</span>
                  <span>Day 45</span>
                  <span>Day 60 (期末目標)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: 核心財務體質 (Financial Health) */}
          {activeTab === 'health' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-6 rounded-xl bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-pro-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-pro-panel border border-pro-border flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-yellow-400">{fundamental.healthScore}</span>
                    <span className="text-[10px] text-pro-muted">體質評分</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      整體財務體質健全 (領先同業 85% 企業)
                    </div>
                    <p className="text-xs text-pro-muted mt-0.5">
                      法人機構綜合評等：<span className="text-emerald-400 font-semibold">{fundamental.analystConsensus}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-pro-muted">52 週交易區間</div>
                  <div className="text-xs font-semibold text-white mt-1">
                    ${fundamental.low52w} — ${fundamental.high52w}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-pro-bg border border-pro-border rounded-xl p-4">
                  <div className="text-xs text-pro-muted flex items-center justify-between">
                    <span>本益比 (P/E)</span>
                    <Info className="w-3 h-3 text-pro-muted" />
                  </div>
                  <div className="text-xl font-bold text-white mt-1.5">{fundamental.peRatio}x</div>
                  <div className="text-[11px] text-pro-muted mt-1">
                    {fundamental.peRatio > 35 ? '估值偏高 (高成長股)' : fundamental.peRatio < 15 ? '估值低廉 (價值股)' : '合理估值區間'}
                  </div>
                </div>

                <div className="bg-pro-bg border border-pro-border rounded-xl p-4">
                  <div className="text-xs text-pro-muted flex items-center justify-between">
                    <span>股價淨值比 (P/B)</span>
                    <PieChart className="w-3 h-3 text-pro-muted" />
                  </div>
                  <div className="text-xl font-bold text-white mt-1.5">{fundamental.pbRatio}x</div>
                  <div className="text-[11px] text-pro-muted mt-1">每股淨值資產倍數</div>
                </div>

                <div className="bg-pro-bg border border-pro-border rounded-xl p-4">
                  <div className="text-xs text-pro-muted flex items-center justify-between">
                    <span>現金股息殖利率</span>
                    <DollarSign className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div className="text-xl font-bold text-emerald-400 mt-1.5">{fundamental.dividendYield}%</div>
                  <div className="text-[11px] text-pro-muted mt-1">穩定現金流配息回報</div>
                </div>

                <div className="bg-pro-bg border border-pro-border rounded-xl p-4">
                  <div className="text-xs text-pro-muted flex items-center justify-between">
                    <span>每股盈餘 (EPS)</span>
                    <Activity className="w-3 h-3 text-blue-400" />
                  </div>
                  <div className="text-xl font-bold text-blue-400 mt-1.5">${fundamental.eps}</div>
                  <div className="text-[11px] text-pro-muted mt-1">近四季累計獲利</div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* 底部功能列 Footer */}
        <div className="px-6 py-3 border-t border-pro-border bg-pro-bg/80 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2 text-pro-muted">
            <Info className="w-3.5 h-3.5" />
            <span>需要更深入了解估值理論？</span>
            <button
              onClick={() => {
                onClose();
                if (onOpenEducation) onOpenEducation('DCF');
              }}
              className="text-emerald-400 hover:underline flex items-center gap-0.5 font-medium"
            >
              開啟指標與估值百科全書 <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-pro-panel border border-pro-border hover:bg-pro-border text-white transition-colors"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};
