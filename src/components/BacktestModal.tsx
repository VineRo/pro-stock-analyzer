import React, { useState, useMemo } from 'react';
import { 
  X, 
  BarChart3, 
  TrendingUp, 
  Award, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sliders, 
  Plus, 
  Trash2, 
  Sparkles
} from 'lucide-react';
import { KLineData } from 'klinecharts';
import { 
  BacktestConfig, 
  BacktestStrategyType, 
  StockSymbol, 
  BacktestCondition, 
  ConditionLogicMode,
  ConditionIndicatorType,
  ConditionOperatorType
} from '../types/stock';
import { runBacktest } from '../utils/backtestEngine';

interface BacktestModalProps {
  isOpen: boolean;
  onClose: () => void;
  klineData: KLineData[];
  currentSymbol: StockSymbol;
}

export const BacktestModal: React.FC<BacktestModalProps> = ({
  isOpen,
  onClose,
  klineData,
  currentSymbol,
}) => {
  const [strategy, setStrategy] = useState<BacktestStrategyType>('custom');
  const [initialCapital, setInitialCapital] = useState<number>(100000);
  const [fastPeriod, setFastPeriod] = useState<number>(5);
  const [slowPeriod, setSlowPeriod] = useState<number>(20);
  const [rsiBuy, setRsiBuy] = useState<number>(30);
  const [rsiSell, setRsiSell] = useState<number>(70);
  const [stopLoss, setStopLoss] = useState<number>(5);
  const [takeProfit, setTakeProfit] = useState<number>(15);
  const [feeRate, setFeeRate] = useState<number>(0.15);

  // 自訂多條件策略：買進進場條件 (預設 3 個條件，支援 2 個以上自由增減)
  const [buyConditions, setBuyConditions] = useState<BacktestCondition[]>([
    { id: 'b1', indicator: 'PRICE_MA', operator: 'GREATER', param1: 20 },
    { id: 'b2', indicator: 'RSI', operator: 'GREATER', param1: 14, param2: 50 },
    { id: 'b3', indicator: 'VOLUME', operator: 'GREATER', param1: 5, param2: 1.2 },
  ]);
  const [buyLogic, setBuyLogic] = useState<ConditionLogicMode>('AND');

  // 自訂多條件策略：出場賣出條件 (預設 2 個條件)
  const [sellConditions, setSellConditions] = useState<BacktestCondition[]>([
    { id: 's1', indicator: 'PRICE_MA', operator: 'LESS', param1: 20 },
    { id: 's2', indicator: 'RSI', operator: 'GREATER', param1: 14, param2: 75 },
  ]);
  const [sellLogic, setSellLogic] = useState<ConditionLogicMode>('OR');

  const config: BacktestConfig = useMemo(() => ({
    strategy,
    initialCapital,
    fastPeriod,
    slowPeriod,
    rsiBuyThreshold: rsiBuy,
    rsiSellThreshold: rsiSell,
    stopLossPercent: stopLoss,
    takeProfitPercent: takeProfit,
    feeRatePercent: feeRate,
    buyConditions,
    buyLogic,
    sellConditions,
    sellLogic,
  }), [
    strategy, 
    initialCapital, 
    fastPeriod, 
    slowPeriod, 
    rsiBuy, 
    rsiSell, 
    stopLoss, 
    takeProfit, 
    feeRate,
    buyConditions,
    buyLogic,
    sellConditions,
    sellLogic
  ]);

  // 執行回測運算
  const result = useMemo(() => {
    return runBacktest(klineData, config);
  }, [klineData, config]);

  // 條件管理函式
  const handleAddBuyCondition = () => {
    const newCond: BacktestCondition = {
      id: `bc_${Date.now()}`,
      indicator: 'PRICE_MA',
      operator: 'GREATER',
      param1: 20,
    };
    setBuyConditions((prev) => [...prev, newCond]);
  };

  const handleUpdateBuyCondition = (id: string, partial: Partial<BacktestCondition>) => {
    setBuyConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...partial } : c))
    );
  };

  const handleRemoveBuyCondition = (id: string) => {
    if (buyConditions.length <= 1) {
      alert('買進條件組合至少需保留 1 個條件！');
      return;
    }
    setBuyConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddSellCondition = () => {
    const newCond: BacktestCondition = {
      id: `sc_${Date.now()}`,
      indicator: 'PRICE_MA',
      operator: 'LESS',
      param1: 20,
    };
    setSellConditions((prev) => [...prev, newCond]);
  };

  const handleUpdateSellCondition = (id: string, partial: Partial<BacktestCondition>) => {
    setSellConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...partial } : c))
    );
  };

  const handleRemoveSellCondition = (id: string) => {
    setSellConditions((prev) => prev.filter((c) => c.id !== id));
  };

  // 快速套用經典多條件共振範本
  const handleApplyPreset = (preset: 'resonance' | 'reversion' | 'breakout') => {
    if (preset === 'resonance') {
      setBuyConditions([
        { id: `b_${Date.now()}_1`, indicator: 'PRICE_MA', operator: 'GREATER', param1: 20 },
        { id: `b_${Date.now()}_2`, indicator: 'RSI', operator: 'GREATER', param1: 14, param2: 50 },
        { id: `b_${Date.now()}_3`, indicator: 'VOLUME', operator: 'GREATER', param1: 5, param2: 1.2 },
      ]);
      setBuyLogic('AND');
      setSellConditions([
        { id: `s_${Date.now()}_1`, indicator: 'PRICE_MA', operator: 'LESS', param1: 20 },
        { id: `s_${Date.now()}_2`, indicator: 'RSI', operator: 'GREATER', param1: 14, param2: 75 },
      ]);
      setSellLogic('OR');
    } else if (preset === 'reversion') {
      setBuyConditions([
        { id: `b_${Date.now()}_1`, indicator: 'RSI', operator: 'LESS', param1: 14, param2: 30 },
        { id: `b_${Date.now()}_2`, indicator: 'KD', operator: 'CROSS_ABOVE', param1: 9 },
        { id: `b_${Date.now()}_3`, indicator: 'BOLLINGER', operator: 'CROSS_BELOW', param1: 20 },
      ]);
      setBuyLogic('AND');
      setSellConditions([
        { id: `s_${Date.now()}_1`, indicator: 'RSI', operator: 'GREATER', param1: 14, param2: 70 },
        { id: `s_${Date.now()}_2`, indicator: 'KD', operator: 'CROSS_BELOW', param1: 9 },
      ]);
      setSellLogic('OR');
    } else if (preset === 'breakout') {
      setBuyConditions([
        { id: `b_${Date.now()}_1`, indicator: 'PRICE_BREAK', operator: 'GREATER', param1: 20 },
        { id: `b_${Date.now()}_2`, indicator: 'VOLUME', operator: 'GREATER', param1: 5, param2: 1.5 },
        { id: `b_${Date.now()}_3`, indicator: 'MACD', operator: 'GREATER', param1: 12 },
      ]);
      setBuyLogic('AND');
      setSellConditions([
        { id: `s_${Date.now()}_1`, indicator: 'PRICE_BREAK', operator: 'LESS', param1: 10 },
        { id: `s_${Date.now()}_2`, indicator: 'PRICE_MA', operator: 'LESS', param1: 10 },
      ]);
      setSellLogic('OR');
    }
  };

  if (!isOpen) return null;

  // 繪製資金權益曲線 (SVG)
  const renderEquitySvg = () => {
    if (!result.equityCurve || result.equityCurve.length < 2) return null;

    const points = result.equityCurve;
    const minVal = Math.min(...points.map((p) => Math.min(p.equity, p.benchmarkEquity))) * 0.98;
    const maxVal = Math.max(...points.map((p) => Math.max(p.equity, p.benchmarkEquity))) * 1.02;
    const range = maxVal - minVal || 1;

    const width = 600;
    const height = 160;

    const getX = (idx: number) => (idx / (points.length - 1)) * width;
    const getY = (val: number) => height - ((val - minVal) / range) * height;

    const stratPath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.equity).toFixed(1)}`)
      .join(' ');

    const benchPath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.benchmarkEquity).toFixed(1)}`)
      .join(' ');

    return (
      <svg className="w-full h-40 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="stratGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* 基準線 (Buy & Hold) */}
        <path d={benchPath} fill="none" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="4,4" />

        {/* 策略權益線 */}
        <path d={stratPath} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
      </svg>
    );
  };

  const isProfit = result.totalReturnPercent >= 0;

  // 單行條件編輯器組件
  const renderConditionRow = (
    cond: BacktestCondition,
    onUpdate: (partial: Partial<BacktestCondition>) => void,
    onRemove: () => void,
    canRemove = true
  ) => {
    return (
      <div key={cond.id} className="p-2 rounded-lg bg-pro-panel border border-pro-border flex flex-col gap-1.5 text-xs text-pro-text">
        <div className="flex items-center justify-between gap-1.5">
          {/* 指標選擇 */}
          <select
            value={cond.indicator}
            onChange={(e) => {
              const ind = e.target.value as ConditionIndicatorType;
              let op: ConditionOperatorType = 'GREATER';
              let p1 = 20;
              let p2: number | undefined = undefined;

              if (ind === 'PRICE_MA') { op = 'GREATER'; p1 = 20; }
              else if (ind === 'MA_CROSS') { op = 'CROSS_ABOVE'; p1 = 5; p2 = 20; }
              else if (ind === 'RSI') { op = 'GREATER'; p1 = 14; p2 = 50; }
              else if (ind === 'KD') { op = 'CROSS_ABOVE'; p1 = 9; p2 = 30; }
              else if (ind === 'MACD') { op = 'GREATER'; p1 = 12; }
              else if (ind === 'BOLLINGER') { op = 'CROSS_ABOVE'; p1 = 20; }
              else if (ind === 'VOLUME') { op = 'GREATER'; p1 = 5; p2 = 1.2; }
              else if (ind === 'PRICE_BREAK') { op = 'GREATER'; p1 = 20; }

              onUpdate({ indicator: ind, operator: op, param1: p1, param2: p2 });
            }}
            className="flex-1 bg-pro-bg border border-pro-border rounded px-2 py-1 text-xs text-white"
          >
            <option value="PRICE_MA">股價 vs 均線 (MA)</option>
            <option value="MA_CROSS">雙均線交叉 (MA Cross)</option>
            <option value="RSI">RSI 相對強弱指標</option>
            <option value="KD">KD 隨機指標</option>
            <option value="MACD">MACD 指標動能</option>
            <option value="BOLLINGER">布林通道 (Bollinger)</option>
            <option value="VOLUME">成交量均量倍數</option>
            <option value="PRICE_BREAK">價格波段新高/低</option>
          </select>

          {/* 刪除按鈕 */}
          {canRemove && (
            <button
              onClick={onRemove}
              className="p-1 text-pro-muted hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
              title="刪除此條件"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        {/* 條件運算子與參數配置 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {cond.indicator === 'PRICE_MA' && (
            <>
              <span className="text-pro-muted text-[11px]">收盤價</span>
              <select
                value={cond.operator}
                onChange={(e) => onUpdate({ operator: e.target.value as any })}
                className="bg-pro-bg border border-pro-border rounded px-1.5 py-0.5 text-xs text-white"
              >
                <option value="GREATER">大於 (&gt;)</option>
                <option value="LESS">小於 (&lt;)</option>
                <option value="CROSS_ABOVE">金叉突破</option>
                <option value="CROSS_BELOW">死叉跌破</option>
              </select>
              <span className="text-pro-muted text-[11px]">MA</span>
              <input
                type="number"
                value={cond.param1}
                onChange={(e) => onUpdate({ param1: Number(e.target.value) || 5 })}
                className="w-14 bg-pro-bg border border-pro-border rounded px-1.5 py-0.5 text-xs text-white font-mono"
              />
              <span className="text-pro-muted text-[11px]">日</span>
            </>
          )}

          {cond.indicator === 'MA_CROSS' && (
            <>
              <span className="text-pro-muted text-[11px]">快線MA</span>
              <input
                type="number"
                value={cond.param1}
                onChange={(e) => onUpdate({ param1: Number(e.target.value) || 5 })}
                className="w-12 bg-pro-bg border border-pro-border rounded px-1.5 py-0.5 text-xs text-white font-mono"
              />
              <select
                value={cond.operator}
                onChange={(e) => onUpdate({ operator: e.target.value as any })}
                className="bg-pro-bg border border-pro-border rounded px-1.5 py-0.5 text-xs text-white"
              >
                <option value="CROSS_ABOVE">金叉突破</option>
                <option value="CROSS_BELOW">死叉跌破</option>
                <option value="GREATER">大於 (&gt;)</option>
                <option value="LESS">小於 (&lt;)</option>
              </select>
              <span className="text-pro-muted text-[11px]">慢線MA</span>
              <input
                type="number"
                value={cond.param2 || 20}
                onChange={(e) => onUpdate({ param2: Number(e.target.value) || 20 })}
                className="w-12 bg-pro-bg border border-pro-border rounded px-1.5 py-0.5 text-xs text-white font-mono"
              />
            </>
          )}

          {cond.indicator === 'RSI' && (
            <>
              <span className="text-pro-muted text-[11px]">RSI(</span>
              <input
                type="number"
                value={cond.param1}
                onChange={(e) => onUpdate({ param1: Number(e.target.value) || 14 })}
                className="w-10 bg-pro-bg border border-pro-border rounded px-1.5 py-0.5 text-xs text-white font-mono"
              />
              <span className="text-pro-muted text-[11px]">)</span>
              <select
                value={cond.operator}
                onChange={(e) => onUpdate({ operator: e.target.value as any })}
                className="bg-pro-bg border border-pro-border rounded px-1.5 py-0.5 text-xs text-white"
              >
                <option value="GREATER">大於 (&gt;)</option>
                <option value="LESS">小於 (&lt;)</option>
                <option value="CROSS_ABOVE">向上穿越</option>
                <option value="CROSS_BELOW">向下跌破</option>
              </select>
              <input
                type="number"
                value={cond.param2 ?? 50}
                onChange={(e) => onUpdate({ param2: Number(e.target.value) })}
                className="w-12 bg-pro-bg border border-pro-border rounded px-1.5 py-0.5 text-xs text-white font-mono"
              />
            </>
          )}

          {cond.indicator === 'KD' && (
            <>
              <span className="text-pro-muted text-[11px]">KD(</span>
              <input
                type="number"
                value={cond.param1}
                onChange={(e) => onUpdate({ param1: Number(e.target.value) || 9 })}
                className="w-10 bg-pro-bg border border-pro-border rounded px-1.5 py-0.5 text-xs text-white font-mono"
              />
              <span className="text-pro-muted text-[11px]">)</span>
              <select
                value={cond.operator}
                onChange={(e) => onUpdate({ operator: e.target.value as any })}
                className="bg-pro-bg border border-pro-border rounded px-1.5 py-0.5 text-xs text-white"
              >
                <option value="CROSS_ABOVE">K值 金叉突破 D值</option>
                <option value="CROSS_BELOW">K值 死叉跌破 D值</option>
                <option value="GREATER">K值 &gt; D值</option>
                <option value="LESS">K值 &lt; 門檻</option>
              </select>
              {cond.operator === 'LESS' && (
                <input
                  type="number"
                  value={cond.param2 ?? 30}
                  onChange={(e) => onUpdate({ param2: Number(e.target.value) })}
                  className="w-12 bg-pro-bg border border-pro-border rounded px-1.5 py-0.5 text-xs text-white font-mono"
                />
              )}
            </>
          )}

          {cond.indicator === 'MACD' && (
            <>
              <span className="text-pro-muted text-[11px]">MACD</span>
              <select
                value={cond.operator}
                onChange={(e) => onUpdate({ operator: e.target.value as any })}
                className="bg-pro-bg border border-pro-border rounded px-1.5 py-0.5 text-xs text-white"
              >
                <option value="CROSS_ABOVE">DIF 向上金叉 DEA (翻紅)</option>
                <option value="CROSS_BELOW">DIF 向下死叉 DEA (翻綠)</option>
                <option value="GREATER">柱狀圖在 0 軸之上 (&gt;0)</option>
                <option value="LESS">柱狀圖在 0 軸之下 (&lt;0)</option>
              </select>
            </>
          )}

          {cond.indicator === 'BOLLINGER' && (
            <>
              <span className="text-pro-muted text-[11px]">布林(</span>
              <input
                type="number"
                value={cond.param1}
                onChange={(e) => onUpdate({ param1: Number(e.target.value) || 20 })}
                className="w-12 bg-pro-bg border border-pro-border rounded px-1.5 py-0.5 text-xs text-white font-mono"
              />
              <span className="text-pro-muted text-[11px]">)</span>
              <select
                value={cond.operator}
                onChange={(e) => onUpdate({ operator: e.target.value as any })}
                className="bg-pro-bg border border-pro-border rounded px-1.5 py-0.5 text-xs text-white"
              >
                <option value="CROSS_ABOVE">向上突破上軌</option>
                <option value="CROSS_BELOW">跌破下軌超跌</option>
                <option value="LESS">跌破中軌支撐</option>
              </select>
            </>
          )}

          {cond.indicator === 'VOLUME' && (
            <>
              <span className="text-pro-muted text-[11px]">今日成交量</span>
              <select
                value={cond.operator}
                onChange={(e) => onUpdate({ operator: e.target.value as any })}
                className="bg-pro-bg border border-pro-border rounded px-1.5 py-0.5 text-xs text-white"
              >
                <option value="GREATER">大於 (&gt;)</option>
                <option value="LESS">小於 (&lt;)</option>
              </select>
              <input
                type="number"
                step="0.1"
                value={cond.param2 || 1.5}
                onChange={(e) => onUpdate({ param2: Number(e.target.value) || 1.5 })}
                className="w-12 bg-pro-bg border border-pro-border rounded px-1.5 py-0.5 text-xs text-white font-mono"
              />
              <span className="text-pro-muted text-[11px]">倍</span>
              <input
                type="number"
                value={cond.param1}
                onChange={(e) => onUpdate({ param1: Number(e.target.value) || 5 })}
                className="w-10 bg-pro-bg border border-pro-border rounded px-1.5 py-0.5 text-xs text-white font-mono"
              />
              <span className="text-pro-muted text-[11px]">日均量</span>
            </>
          )}

          {cond.indicator === 'PRICE_BREAK' && (
            <>
              <span className="text-pro-muted text-[11px]">收盤價</span>
              <select
                value={cond.operator}
                onChange={(e) => onUpdate({ operator: e.target.value as any })}
                className="bg-pro-bg border border-pro-border rounded px-1.5 py-0.5 text-xs text-white"
              >
                <option value="GREATER">創波段新高</option>
                <option value="LESS">跌破波段新低</option>
              </select>
              <input
                type="number"
                value={cond.param1}
                onChange={(e) => onUpdate({ param1: Number(e.target.value) || 20 })}
                className="w-12 bg-pro-bg border border-pro-border rounded px-1.5 py-0.5 text-xs text-white font-mono"
              />
              <span className="text-pro-muted text-[11px]">日內</span>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-pro-panel border border-pro-border rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-pro-text">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pro-border bg-pro-bg/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                歷史策略回測 (Backtest)
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  {currentSymbol.name} ({currentSymbol.symbol})
                </span>
              </h2>
              <p className="text-xs text-pro-muted">基於歷史 K 線數據模擬進出場，納入手續費以檢驗策略表現</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-pro-border text-pro-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 主體兩欄佈局 (左側策略參數 + 右側績效結果與圖表) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* 左側參數設置 (拓寬至 420px 容納多條件編輯器) */}
          <div className="w-full md:w-[420px] border-r border-pro-border p-5 bg-pro-bg/30 overflow-y-auto space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Sliders className="w-4 h-4 text-blue-400" />
                策略設定與條件配置
              </div>
              {strategy === 'custom' && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  支援 2+ 自訂條件
                </span>
              )}
            </div>

            {/* 策略類型切換 */}
            <div>
              <label className="block text-xs text-pro-muted mb-1.5">核心交易策略模式</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as any)}
                className="w-full bg-pro-bg border border-pro-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value="custom">自訂多條件策略組合 (支援多指標與邏輯運算)</option>
                <option value="ma_crossover">雙均線黃金交叉策略 (MA5 / MA20)</option>
                <option value="rsi_reversion">RSI 超賣築底反彈策略</option>
                <option value="bollinger_break">布林通道軌道突破策略</option>
                <option value="momentum_macd">多頭動能追蹤策略</option>
              </select>
            </div>

            {/* 自訂多條件策略專屬配置區 */}
            {strategy === 'custom' && (
              <div className="space-y-3.5 animate-fade-in">
                {/* 快速載入經典範本 */}
                <div className="p-2.5 rounded-xl bg-blue-950/20 border border-blue-500/20">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-300 mb-1.5">
                    <Sparkles size={13} />
                    常用策略組合範本
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <button
                      onClick={() => handleApplyPreset('resonance')}
                      className="px-2 py-1 text-[10px] rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/30 transition-colors"
                    >
                      三共振 (MA+RSI+量)
                    </button>
                    <button
                      onClick={() => handleApplyPreset('reversion')}
                      className="px-2 py-1 text-[10px] rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/30 transition-colors"
                    >
                      超跌打底 (RSI+KD+布林)
                    </button>
                    <button
                      onClick={() => handleApplyPreset('breakout')}
                      className="px-2 py-1 text-[10px] rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/30 transition-colors"
                    >
                      突破追隨 (創新高+量+MACD)
                    </button>
                  </div>
                </div>

                {/* 1. 買進進場條件區 */}
                <div className="space-y-2 border-t border-pro-border/40 pt-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                      <TrendingUp size={14} />
                      <span>買進進場條件</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                        {buyConditions.length} 個條件
                      </span>
                    </div>

                    {/* 條件組合邏輯切換 */}
                    <div className="flex items-center gap-1 bg-pro-bg p-0.5 rounded border border-pro-border text-[10px]">
                      <button
                        onClick={() => setBuyLogic('AND')}
                        className={`px-1.5 py-0.5 rounded ${
                          buyLogic === 'AND'
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'text-pro-muted hover:text-white'
                        }`}
                        title="全部條件皆成立時才買進 (高勝率過濾)"
                      >
                        全部符合 (AND)
                      </button>
                      <button
                        onClick={() => setBuyLogic('OR')}
                        className={`px-1.5 py-0.5 rounded ${
                          buyLogic === 'OR'
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'text-pro-muted hover:text-white'
                        }`}
                        title="任一條件成立即買進 (高頻機會)"
                      >
                        任一符合 (OR)
                      </button>
                    </div>
                  </div>

                  {/* 買進條件卡片清單 */}
                  <div className="space-y-1.5">
                    {buyConditions.map((cond) =>
                      renderConditionRow(
                        cond,
                        (partial) => handleUpdateBuyCondition(cond.id, partial),
                        () => handleRemoveBuyCondition(cond.id),
                        buyConditions.length > 1
                      )
                    )}
                  </div>

                  <button
                    onClick={handleAddBuyCondition}
                    className="w-full py-1.5 border border-dashed border-emerald-500/40 hover:border-emerald-400 text-emerald-400 hover:bg-emerald-500/10 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    <Plus size={13} />
                    新增買進條件 (可設定 2 個以上任意條件)
                  </button>
                </div>

                {/* 2. 賣出出場條件區 */}
                <div className="space-y-2 border-t border-pro-border/40 pt-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                      <TrendingUp size={14} className="rotate-180" />
                      <span>出場賣出條件</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/10 border border-rose-500/20">
                        {sellConditions.length} 個條件
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-pro-bg p-0.5 rounded border border-pro-border text-[10px]">
                      <button
                        onClick={() => setSellLogic('OR')}
                        className={`px-1.5 py-0.5 rounded ${
                          sellLogic === 'OR'
                            ? 'bg-rose-600 text-white font-bold'
                            : 'text-pro-muted hover:text-white'
                        }`}
                        title="任一條件觸發即出場 (保護本金)"
                      >
                        任一符合 (OR)
                      </button>
                      <button
                        onClick={() => setSellLogic('AND')}
                        className={`px-1.5 py-0.5 rounded ${
                          sellLogic === 'AND'
                            ? 'bg-rose-600 text-white font-bold'
                            : 'text-pro-muted hover:text-white'
                        }`}
                        title="全部條件皆符合才出場"
                      >
                        全部符合 (AND)
                      </button>
                    </div>
                  </div>

                  {/* 賣出條件卡片清單 */}
                  <div className="space-y-1.5">
                    {sellConditions.map((cond) =>
                      renderConditionRow(
                        cond,
                        (partial) => handleUpdateSellCondition(cond.id, partial),
                        () => handleRemoveSellCondition(cond.id),
                        true
                      )
                    )}
                  </div>

                  <button
                    onClick={handleAddSellCondition}
                    className="w-full py-1.5 border border-dashed border-rose-500/40 hover:border-rose-400 text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    <Plus size={13} />
                    新增出場條件
                  </button>
                </div>
              </div>
            )}

            {strategy === 'ma_crossover' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-pro-muted mb-1">快線週期 (日)</label>
                  <input
                    type="number"
                    value={fastPeriod}
                    onChange={(e) => setFastPeriod(Number(e.target.value))}
                    className="w-full bg-pro-bg border border-pro-border rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-pro-muted mb-1">慢線週期 (日)</label>
                  <input
                    type="number"
                    value={slowPeriod}
                    onChange={(e) => setSlowPeriod(Number(e.target.value))}
                    className="w-full bg-pro-bg border border-pro-border rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>
            )}

            {strategy === 'rsi_reversion' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-pro-muted mb-1">RSI 買入超賣位</label>
                  <input
                    type="number"
                    value={rsiBuy}
                    onChange={(e) => setRsiBuy(Number(e.target.value))}
                    className="w-full bg-pro-bg border border-pro-border rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-pro-muted mb-1">RSI 獲利出場位</label>
                  <input
                    type="number"
                    value={rsiSell}
                    onChange={(e) => setRsiSell(Number(e.target.value))}
                    className="w-full bg-pro-bg border border-pro-border rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>
            )}

            {/* 風控與資金管理 */}
            <div className="pt-2 border-t border-pro-border/60 space-y-3">
              <div>
                <label className="block text-[11px] text-pro-muted mb-1">初始投資本金 ($)</label>
                <input
                  type="number"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Number(e.target.value))}
                  className="w-full bg-pro-bg border border-pro-border rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-pro-muted mb-1">強制停損位 (%)</label>
                  <input
                    type="number"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(Number(e.target.value))}
                    className="w-full bg-pro-bg border border-pro-border rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-pro-muted mb-1">目標停利位 (%)</label>
                  <input
                    type="number"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(Number(e.target.value))}
                    className="w-full bg-pro-bg border border-pro-border rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-pro-muted mb-1">預估交易稅與滑點 (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={feeRate}
                  onChange={(e) => setFeeRate(Number(e.target.value))}
                  className="w-full bg-pro-bg border border-pro-border rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* 右側績效結果與圖表 */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {/* 核心 4 大 KPI 卡片 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-xl bg-pro-bg/50 border border-pro-border">
                <div className="text-xs text-pro-muted mb-1">策略總報酬率</div>
                <div className={`text-xl font-bold font-mono flex items-center gap-1 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isProfit ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  {result.totalReturnPercent > 0 ? '+' : ''}{result.totalReturnPercent}%
                </div>
                <div className="text-[11px] text-pro-muted mt-1">
                  基準 (買進持有): {result.benchmarkReturnPercent > 0 ? '+' : ''}{result.benchmarkReturnPercent}%
                </div>
              </div>

              <div className="p-4 rounded-xl bg-pro-bg/50 border border-pro-border">
                <div className="text-xs text-pro-muted mb-1">策略年化報酬率</div>
                <div className="text-xl font-bold font-mono text-white">
                  {result.annualizedReturnPercent > 0 ? '+' : ''}{result.annualizedReturnPercent}%
                </div>
                <div className="text-[11px] text-pro-muted mt-1">
                  年化複利換算 (CAGR)
                </div>
              </div>

              <div className="p-4 rounded-xl bg-pro-bg/50 border border-pro-border">
                <div className="text-xs text-pro-muted mb-1">交易勝率 (Win Rate)</div>
                <div className="text-xl font-bold font-mono text-blue-400">
                  {result.winRatePercent}%
                </div>
                <div className="text-[11px] text-pro-muted mt-1">
                  獲利 {result.winningTrades} 次 / 虧損 {result.losingTrades} 次
                </div>
              </div>

              <div className="p-4 rounded-xl bg-pro-bg/50 border border-pro-border">
                <div className="text-xs text-pro-muted mb-1">最大資金回撤 (MDD)</div>
                <div className="text-xl font-bold font-mono text-rose-400">
                  -{result.maxDrawdownPercent}%
                </div>
                <div className="text-[11px] text-pro-muted mt-1">
                  獲利因子: {result.profitFactor}
                </div>
              </div>
            </div>

            {/* 權益曲線視覺圖表 (SVG) */}
            <div className="p-5 rounded-xl bg-pro-bg/40 border border-pro-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-xs font-bold text-white">策略淨值累積曲線</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-500 ml-4" />
                  <span className="text-xs text-pro-muted">買進持有基準 (Buy & Hold)</span>
                </div>
                <span className="text-[11px] font-mono text-pro-muted">
                  總交易筆數: {result.totalTrades} 次
                </span>
              </div>
              <div className="w-full bg-pro-panel/30 rounded-lg p-2 border border-pro-border/50">
                {renderEquitySvg()}
              </div>
            </div>

            {/* 歷史交易記錄列表 (Trade Logs) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  交易詳細明細記錄 ({result.tradeLogs.length})
                </h3>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-lg border border-pro-border">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-pro-bg/80 text-pro-muted sticky top-0 border-b border-pro-border">
                    <tr>
                      <th className="py-2 px-3">進場日期</th>
                      <th className="py-2 px-3">進場價</th>
                      <th className="py-2 px-3">出場日期</th>
                      <th className="py-2 px-3">出場價</th>
                      <th className="py-2 px-3">報酬率</th>
                      <th className="py-2 px-3">淨損益</th>
                      <th className="py-2 px-3">出場原因</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pro-border/50 font-mono text-[11px]">
                    {result.tradeLogs.map((trade) => {
                      const isTradeProfit = (trade.profit || 0) >= 0;
                      return (
                        <tr key={trade.id} className="hover:bg-pro-hover/40 transition-colors">
                          <td className="py-2 px-3 text-pro-muted">{trade.entryDate}</td>
                          <td className="py-2 px-3 text-white">${trade.entryPrice}</td>
                          <td className="py-2 px-3 text-pro-muted">{trade.exitDate}</td>
                          <td className="py-2 px-3 text-white">${trade.exitPrice}</td>
                          <td className={`py-2 px-3 font-bold ${isTradeProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {trade.profitPercent && trade.profitPercent > 0 ? '+' : ''}{trade.profitPercent}%
                          </td>
                          <td className={`py-2 px-3 font-bold ${isTradeProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {trade.profit && trade.profit > 0 ? '+' : ''}${trade.profit}
                          </td>
                          <td className="py-2 px-3 text-pro-muted font-sans text-[11px]">
                            {trade.reason}
                          </td>
                        </tr>
                      );
                    })}
                    {result.tradeLogs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-pro-muted text-xs font-sans">
                          此歷史區間內未觸發任何進場交易訊號，建議嘗試調整指標參數或放寬條件門檻。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
