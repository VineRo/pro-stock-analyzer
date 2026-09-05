export type Period = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1D' | '1W' | '1M';

export type ColorTheme = 'international' | 'asia'; // international: 綠漲紅跌, asia: 紅漲綠跌

export type DataStatus = 'live' | 'cache' | 'simulated';

export type MarketCategory = 'domestic' | 'foreign' | 'indices' | 'crypto';

export type MarketType = 'US' | 'TW' | 'JP' | 'KR' | 'CN' | 'HK' | 'CRYPTO';

export interface StockSymbol {
  symbol: string;
  name: string;
  market: MarketType;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  high24h?: number;
  low24h?: number;
  volume24h?: string;
  yahooSymbol?: string;
  isIndex?: boolean;
}

export type DrawingToolType =
  | 'none'
  | 'trendLine'              // 趨勢線
  | 'horizontalStraightLine'// 水平線 (支撐/壓力)
  | 'verticalStraightLine'  // 垂直時間線
  | 'rayLine'               // 射線
  | 'segment'               // 線段
  | 'priceChannelLine'      // 平行通道
  | 'fibonacciLine'         // 斐波那契回撤 (黃金分割)
  | 'rect'                  // 矩形箱體
  | 'text';                 // 文字標註

export interface TechnicalSummary {
  trend: 'bullish' | 'bearish' | 'neutral';
  trendText: string;
  momentumText: string;
  warningText: string;
  overallRating: '強烈看多' | '偏多震盪' | '中立觀望' | '偏空震盪' | '空方主導';
  score: number; // 0 - 100
  institutionalNote?: string; // 機構訂單流與內在估值共振診斷
}

// 籌碼 Volume Profile 結果
export interface VolumeProfileTier {
  price: number;
  volume: number;
  percent: number;
}

export interface VolumeProfileResult {
  tiers: VolumeProfileTier[];
  poc: number; // Point of Control 最密集籌碼價位
  vah: number; // Value Area High 70%價值區間上限
  val: number; // Value Area Low 70%價值區間下限
  totalVolume: number;
}

// 基本面體質數據與機構級財務參數
export interface FundamentalData {
  symbol: string;
  name: string;
  peRatio: number;          // 本益比 P/E
  pbRatio: number;          // 股價淨值比 P/B
  dividendYield: number;    // 殖利率 %
  eps: number;              // 每股盈餘 EPS
  revenueGrowthYoY: number; // 營收年增率 %
  high52w: number;          // 52 週最高
  low52w: number;           // 52 週最低
  marketCap: string;        // 市值
  sector: string;           // 產業板塊
  healthScore: number;      // 體質評分 0-100
  analystConsensus: '強烈買進' | '買進' | '持有' | '減持';
  
  // 機構級估值模型擴充字段
  freeCashFlow?: number;       // 自由現金流 (FCF) 億元/億美元
  netDebt?: number;            // 淨負債 (總負債 - 現金及等價物) 億元/億美元
  sharesOutstanding?: number;  // 流通股數 (億股)
  beta?: number;               // 貝塔係數 (相對於大盤波動度)
  wacc?: number;               // 加權平均資本成本 % (如 8.5%)
  growthRateNext5Y?: number;   // 未來 5 年複合盈餘/現金流成長率 % (如 12.0%)
  dividendPerShare?: number;   // 每股現金股利
  terminalGrowthRate?: number; // 永續增長率 % (通常設 2%~3%)
  analystTargetPrice?: number; // 華爾街投行共識目標價
}

// ---------------------------
// 股價估值模型 (Valuation Models)
// ---------------------------

// 1. DCF 現金流折現模型
export interface DCFInput {
  currentPrice: number;
  freeCashFlow: number;       // 基期自由現金流
  growthRate5Y: number;       // 前 5 年預估複合成長率 % (如 15%)
  terminalGrowthRate: number; // 永續成長率 % (如 2.5%)
  wacc: number;               // 折現率 % (如 8.5%)
  netDebt: number;            // 淨負債
  sharesOutstanding: number;  // 流通股數
}

export interface SensitivityCell {
  wacc: number;
  terminalGrowthRate: number;
  intrinsicValue: number;
  discountOrPremiumPercent: number; // 相對於現價折溢價 %
}

export interface SensitivityMatrix {
  waccRange: number[];
  growthRange: number[];
  grid: SensitivityCell[][];
}

export interface DCFResult {
  projectedFCF: { year: number; fcf: number; pv: number }[];
  presentValueOfExplicitPeriod: number;
  terminalValue: number;
  presentValueOfTerminalValue: number;
  enterpriseValue: number;
  equityValue: number;
  intrinsicValuePerShare: number;
  currentPrice: number;
  marginOfSafetyPercent: number; // 安全邊際 % (公允價 - 現價) / 公允價
  isUndervalued: boolean;
  sensitivityMatrix: SensitivityMatrix;
}

// 2. 班傑明·葛拉漢修正公式模型
export interface GrahamResult {
  currentPrice: number;
  eps: number;
  growthRate: number;
  riskFreeRate: number;        // 當前 10 年期公債殖利率 (如 4.2%)
  intrinsicValue: number;      // 葛拉漢公允價值
  marginOfSafetyPercent: number; // 安全邊際 %
  evaluation: '大幅低估 (充足防撞安全邊際)' | '合理估值區間' | '估值偏高' | '嚴重泡沫';
}

// 3. 彼得·林區本益成長比 (PEG) 模型
export interface PEGResult {
  currentPrice: number;
  peRatio: number;
  growthRate: number;
  peg: number;
  fairValue: number;           // 公允目標價 (EPS * g)
  evaluation: '極佳買點 (成長低估)' | '合理成長定價' | '成長透支高估';
}

// 4. 高登股利折現模型 (DDM)
export interface DDMResult {
  currentPrice: number;
  dividendPerShare: number;
  requiredReturn: number;      // 要求報酬率 %
  dividendGrowthRate: number;  // 股息成長率 %
  intrinsicValue: number;
  isApplicable: boolean;       // 是否適用 (配息且 r > g)
}

// 5. 蒙地卡羅 1,000 次隨機路徑幾何布朗運動 (GBM)
export interface MonteCarloPathPoint {
  day: number;
  p10: number;  // 10% 分位數 (悲觀下限)
  p25: number;  // 25% 分位數
  p50: number;  // 50% 分位數 (中位數期望值)
  p75: number;  // 75% 分位數
  p90: number;  // 90% 分位數 (樂觀上限)
  p95: number;  // 95% 信賴區間上限
}

export interface MonteCarloResult {
  currentPrice: number;
  historicalVolatility: number; // 年化歷史波動率 %
  drift: number;                // 預期年化漂移率 %
  simulationsCount: number;     // 模擬次數 (通常 1000)
  forecastDays: number;         // 預測天數 (通常 60 天)
  paths: MonteCarloPathPoint[];
  expectedMedianPrice: number;  // 期末中位數期望價
  confidenceInterval95: [number, number]; // [下限, 上限]
  breakdownProbabilityPercent: number;    // 跌破 -10% 停損點的機率
  valueAtRisk95Percent: number;           // 95% 日在險價值 (VaR %)
}

// 6. 橄欖球場綜合估值 (Football Field Summary)
export interface FootballFieldItem {
  modelName: string;
  category: 'fundamental' | 'multiples' | 'market';
  lowPrice: number;
  midPrice: number;
  highPrice: number;
  description: string;
}

export interface ComprehensiveValuationResult {
  symbol: string;
  currentPrice: number;
  currency: string;
  models: FootballFieldItem[];
  sweetSpotRange: [number, number]; // 綜合各模型重疊交集的公允價值區間
  overallDiscountPercent: number;   // 綜合折溢價率 % (正值為折價便宜，負值為溢價昂貴)
  overallRating: '顯著低估 (強烈安全邊際)' | '公允合理' | '偏高溢價' | '過度透支';
  dcf: DCFResult;
  graham: GrahamResult;
  peg: PEGResult;
  ddm: DDMResult;
  monteCarlo: MonteCarloResult;
}

// ---------------------------
// Smart Money Concepts (SMC) 機構訂單流
// ---------------------------

// 價值失衡區 (Fair Value Gap)
export interface FairValueGap {
  id: string;
  type: 'bullish' | 'bearish'; // 看漲失衡 (支撐) / 看跌失衡 (壓力)
  startIndex: number;
  endIndex: number;
  topPrice: number;
  bottomPrice: number;
  consequentEncroachment: number; // CE 50% 核心吸引線
  isMitigated: boolean;           // 是否已被後續價格回踩填補
}

// 機構訂單塊 (Order Block)
export interface OrderBlock {
  id: string;
  type: 'bullish' | 'bearish';
  index: number;
  topPrice: number;
  bottomPrice: number;
  volume: number;
  isMitigated: boolean;
}

// SMC 綜合分析結果
export interface SMCAnalysisResult {
  fvgs: FairValueGap[];
  orderBlocks: OrderBlock[];
  nearestSupport?: number;
  nearestResistance?: number;
  structureStatus: '強勢機構推進' | '回踩失衡區吸籌' | '遇壓力受阻' | '盤整流動性聚集';
}


// 智慧選股器篩選條件
export interface ScreenerFilter {
  trend: 'all' | 'bullish' | 'bearish';
  maGoldenCross: boolean;    // 短期均線黃金交叉
  above200MA: boolean;       // 站上年線 200MA
  rsiOversold: boolean;      // RSI < 35 超賣反彈
  rsiOverbought: boolean;    // RSI > 70 強勢超買
  volumeBreakout: boolean;   // 成交量放大突破 (今日量 > 5MA量 1.5倍)
  near52wHigh: boolean;      // 逼近 52 週新高 (距離 <= 5%)
  minHealthScore: number;    // 最低基本面體質評分
}

// 智慧告警
export interface StockAlert {
  id: string;
  symbol: string;
  name: string;
  type: 'price_above' | 'price_below' | 'rsi_overbought' | 'rsi_oversold';
  threshold: number;
  active: boolean;
  createdAt: number;
  triggeredAt?: number;
}

// 自選股清單群組 (支援自訂清單名稱與多清單管理)
export interface WatchlistGroup {
  id: string;
  name: string;
  symbols: StockSymbol[];
  createdAt: number;
}

// 回測策略配置
export type BacktestStrategyType =
  | 'ma_crossover'     // 雙均線交叉策略 (MA5 / MA20)
  | 'rsi_reversion'    // RSI 均值回歸 (買超賣超)
  | 'bollinger_break'  // 布林通道突破軌道策略
  | 'momentum_macd'    // MACD 零軸動能追蹤策略
  | 'custom';          // 使用者自訂多條件組合策略 (支援 2+ 任意條件)

// 自訂條件支援的指標類型
export type ConditionIndicatorType =
  | 'PRICE_MA'        // 股價與均線 (如: 股價 > MA20)
  | 'MA_CROSS'        // 均線交叉 (如: MA5 金叉 MA20)
  | 'RSI'             // RSI 指標 (如: RSI14 < 30 或 > 50)
  | 'KD'              // KD 隨機指標 (如: K > D 或 K < 25)
  | 'MACD'            // MACD 動能 (如: DIF > DEA 翻紅 或 DIF > 0)
  | 'BOLLINGER'       // 布林通道 (如: 突破上軌 或 站上中軌)
  | 'VOLUME'          // 成交量 (如: 今日成交量 > 1.5倍 5日均量)
  | 'PRICE_BREAK';    // 價格突破 (如: 創 20 日新高 / 破 20 日新低)

// 條件比較運算子
export type ConditionOperatorType =
  | 'GREATER'         // 大於 >
  | 'LESS'            // 小於 <
  | 'CROSS_ABOVE'     // 向上穿越 / 金叉
  | 'CROSS_BELOW';    // 向下跌破 / 死叉

// 單一回測自訂條件
export interface BacktestCondition {
  id: string;
  indicator: ConditionIndicatorType;
  operator: ConditionOperatorType;
  param1: number;      // 主週期或主參數 (如 MA週期 20, RSI週期 14, 突破天數 20)
  param2?: number;     // 門檻值或副週期 (如 慢線週期 60, RSI門檻 30, 成交量倍數 1.5)
}

// 條件組合邏輯
export type ConditionLogicMode = 'AND' | 'OR'; // AND: 全部滿足 (嚴格), OR: 任一滿足 (寬鬆)

export interface BacktestConfig {
  strategy: BacktestStrategyType;
  initialCapital: number;    // 起始資金
  fastPeriod: number;        // 快線週期
  slowPeriod: number;        // 慢線週期
  rsiBuyThreshold: number;   // RSI 買入閥值
  rsiSellThreshold: number;  // RSI 賣出閥值
  stopLossPercent: number;   // 停損百分比 (如 5%)
  takeProfitPercent: number; // 停利百分比 (如 15%)
  feeRatePercent: number;    // 手續費與交易稅 % (如 0.15%)

  // 自訂多條件策略配置 (支援 2 個以上自由組合)
  buyConditions?: BacktestCondition[];
  buyLogic?: ConditionLogicMode;
  sellConditions?: BacktestCondition[];
  sellLogic?: ConditionLogicMode;
}

export interface TradeLog {
  id: string;
  type: 'BUY' | 'SELL';
  entryDate: string;
  entryPrice: number;
  exitDate?: string;
  exitPrice?: number;
  shares: number;
  profit?: number;
  profitPercent?: number;
  reason: string;
}

export interface EquityPoint {
  date: string;
  equity: number;
  benchmarkEquity: number;
}

export interface BacktestResult {
  totalReturnPercent: number;     // 總報酬率 %
  annualizedReturnPercent: number;// 年化報酬率 %
  benchmarkReturnPercent: number; // 買進持有基準報酬率 %
  winRatePercent: number;         // 勝率 %
  profitFactor: number;           // 獲利因子 (毛利 / 毛損)
  maxDrawdownPercent: number;     // 最大回撤 MDD %
  totalTrades: number;            // 總交易次數
  winningTrades: number;          // 獲利次數
  losingTrades: number;           // 虧損次數
  tradeLogs: TradeLog[];          // 交易明細
  equityCurve: EquityPoint[];     // 資金權益曲線
}

// 模擬交易帳戶 (Paper Trading)
export interface PaperPosition {
  symbol: string;
  name: string;
  shares: number;
  avgCostPrice: number;
  currentPrice: number;
  unrealizedProfit: number;
  unrealizedProfitPercent: number;
  currency: string;
}

export interface PaperTradeRecord {
  id: string;
  timestamp: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  shares: number;
  price: number;
  amount: number;
  fee: number;
}

export interface PaperAccount {
  balance: number;         // 現金餘額
  initialCapital: number;  // 初始本金
  positions: PaperPosition[];
  history: PaperTradeRecord[];
}
