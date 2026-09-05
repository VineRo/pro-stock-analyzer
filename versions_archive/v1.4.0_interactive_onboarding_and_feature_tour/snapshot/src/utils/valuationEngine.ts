import { 
  ComprehensiveValuationResult, 
  DCFInput, 
  DCFResult, 
  DDMResult, 
  FootballFieldItem, 
  FundamentalData, 
  GrahamResult, 
  MonteCarloPathPoint, 
  MonteCarloResult, 
  PEGResult, 
  SensitivityCell, 
  SensitivityMatrix 
} from '../types/stock';

/**
 * 1. 兩階段現金流折現模型 (Two-Stage Discounted Cash Flow, DCF)
 * 
 * 學術與投行標準公式：
 * - 前 5 年預測期：PV_explicit = SUM( FCF_t / (1 + WACC)^t )
 * - 永續終值 (Gordon Growth Terminal Value)：TV = (FCF_5 * (1 + g)) / (WACC - g)
 * - 終值現值：PV_TV = TV / (1 + WACC)^5
 * - 企業價值 (EV)：PV_explicit + PV_TV
 * - 股權價值 (Equity Value)：EV - NetDebt
 * - 每股內在價值：Equity Value / SharesOutstanding
 */
export function calculateDCFValuation(input: DCFInput): DCFResult {
  const {
    currentPrice,
    freeCashFlow,
    growthRate5Y,
    terminalGrowthRate,
    wacc,
    netDebt,
    sharesOutstanding,
  } = input;

  const waccDec = Math.max(0.04, wacc / 100);
  const g5Dec = growthRate5Y / 100;
  // 永續增長率必須嚴格小於 WACC，否則分母小於等於 0 導致發散 (金融防呆邊界條件)
  const gTermDec = Math.min(terminalGrowthRate / 100, waccDec - 0.005);

  const projectedFCF: { year: number; fcf: number; pv: number }[] = [];
  let pvExplicit = 0;
  let runningFCF = freeCashFlow;

  for (let year = 1; year <= 5; year++) {
    runningFCF = runningFCF * (1 + g5Dec);
    const discountFactor = Math.pow(1 + waccDec, year);
    const pv = runningFCF / discountFactor;
    pvExplicit += pv;
    projectedFCF.push({
      year,
      fcf: Number(runningFCF.toFixed(2)),
      pv: Number(pv.toFixed(2)),
    });
  }

  // 永續終值計算
  const fcfYear5 = projectedFCF[4].fcf;
  const terminalValue = (fcfYear5 * (1 + gTermDec)) / (waccDec - gTermDec);
  const pvTerminalValue = terminalValue / Math.pow(1 + waccDec, 5);

  const enterpriseValue = pvExplicit + pvTerminalValue;
  const equityValue = Math.max(0, enterpriseValue - netDebt);
  const validShares = Math.max(0.01, sharesOutstanding);
  const intrinsicValuePerShare = Number((equityValue / validShares).toFixed(2));

  // 安全邊際計算：(內在公允價 - 現價) / 內在公允價
  const marginOfSafetyPercent = intrinsicValuePerShare > 0
    ? Number((((intrinsicValuePerShare - currentPrice) / intrinsicValuePerShare) * 100).toFixed(1))
    : -100;

  // 生成 5x5 WACC vs 永續增長率敏感度矩陣
  const sensitivityMatrix = generateSensitivityMatrix(
    freeCashFlow,
    g5Dec,
    wacc,
    terminalGrowthRate,
    netDebt,
    validShares,
    currentPrice
  );

  return {
    projectedFCF,
    presentValueOfExplicitPeriod: Number(pvExplicit.toFixed(2)),
    terminalValue: Number(terminalValue.toFixed(2)),
    presentValueOfTerminalValue: Number(pvTerminalValue.toFixed(2)),
    enterpriseValue: Number(enterpriseValue.toFixed(2)),
    equityValue: Number(equityValue.toFixed(2)),
    intrinsicValuePerShare,
    currentPrice,
    marginOfSafetyPercent,
    isUndervalued: intrinsicValuePerShare > currentPrice,
    sensitivityMatrix,
  };
}

/**
 * 產生 5x5 WACC 與永續增長率之敏感度分析熱力表
 */
function generateSensitivityMatrix(
  baseFCF: number,
  g5Dec: number,
  baseWacc: number,
  baseTermG: number,
  netDebt: number,
  shares: number,
  currentPrice: number
): SensitivityMatrix {
  const waccOffsets = [-2, -1, 0, 1, 2];
  const gOffsets = [-1.0, -0.5, 0, 0.5, 1.0];

  const waccRange = waccOffsets.map((o) => Number((baseWacc + o).toFixed(1)));
  const growthRange = gOffsets.map((o) => Number((baseTermG + o).toFixed(1)));

  const grid: SensitivityCell[][] = [];

  for (let r = 0; r < waccRange.length; r++) {
    const row: SensitivityCell[] = [];
    const wVal = waccRange[r];
    const wDec = Math.max(0.03, wVal / 100);

    for (let c = 0; c < growthRange.length; c++) {
      const gVal = growthRange[c];
      const gDec = Math.min(gVal / 100, wDec - 0.005);

      // 快速折現
      let pvExp = 0;
      let fcf = baseFCF;
      for (let y = 1; y <= 5; y++) {
        fcf = fcf * (1 + g5Dec);
        pvExp += fcf / Math.pow(1 + wDec, y);
      }
      const tv = (fcf * (1 + gDec)) / (wDec - gDec);
      const pvTv = tv / Math.pow(1 + wDec, 5);
      const eqVal = Math.max(0, pvExp + pvTv - netDebt);
      const perShare = Number((eqVal / shares).toFixed(2));
      const discountOrPremium = currentPrice > 0
        ? Number((((perShare - currentPrice) / currentPrice) * 100).toFixed(1))
        : 0;

      row.push({
        wacc: wVal,
        terminalGrowthRate: gVal,
        intrinsicValue: perShare,
        discountOrPremiumPercent: discountOrPremium,
      });
    }
    grid.push(row);
  }

  return { waccRange, growthRange, grid };
}

/**
 * 2. 班傑明·葛拉漢修正公式 (Benjamin Graham Revised Intrinsic Value Formula)
 * 
 * 公式：
 * V = (EPS * (8.5 + 2 * g) * 4.4) / Y
 * 其中：
 * - 8.5：葛拉漢定義的零成長公司公允 P/E 基數
 * - g：未來 5~10 年預估複合年化盈餘增長率 %
 * - 4.4：歷史無風險 AAA 高評等公司債平均殖利率
 * - Y：當前市場 10 年期美國公債殖利率 (如 4.2%)
 */
export function calculateGrahamValuation(
  eps: number,
  growthRate: number,
  riskFreeRate = 4.2,
  currentPrice: number
): GrahamResult {
  const safeEPS = Math.max(0.01, eps);
  // 限制過度樂觀增長率上限為 35%，防止超高成長股失真
  const cappedG = Math.min(35, Math.max(0, growthRate));
  const safeY = Math.max(1.0, riskFreeRate);

  const intrinsicValue = Number((((safeEPS * (8.5 + 2 * cappedG) * 4.4) / safeY)).toFixed(2));
  const marginOfSafetyPercent = intrinsicValue > 0
    ? Number((((intrinsicValue - currentPrice) / intrinsicValue) * 100).toFixed(1))
    : -100;

  let evaluation: GrahamResult['evaluation'] = '合理估值區間';
  if (marginOfSafetyPercent >= 30) {
    evaluation = '大幅低估 (充足防撞安全邊際)';
  } else if (marginOfSafetyPercent >= 0) {
    evaluation = '合理估值區間';
  } else if (marginOfSafetyPercent >= -25) {
    evaluation = '估值偏高';
  } else {
    evaluation = '嚴重泡沫';
  }

  return {
    currentPrice,
    eps: safeEPS,
    growthRate: cappedG,
    riskFreeRate: safeY,
    intrinsicValue,
    marginOfSafetyPercent,
    evaluation,
  };
}

/**
 * 3. 彼得·林區本益成長比 (Peter Lynch PEG Valuation)
 * 
 * 經典法則：
 * PEG = P/E / g
 * 彼得林區公允價：P_fair = EPS * g
 */
export function calculatePeterLynchPEG(
  peRatio: number,
  growthRate: number,
  eps: number,
  currentPrice: number
): PEGResult {
  const safeG = Math.max(1.0, Math.min(45, growthRate));
  const safePE = Math.max(0.1, peRatio);
  const peg = Number((safePE / safeG).toFixed(2));
  const fairValue = Number((eps * safeG).toFixed(2));

  let evaluation: PEGResult['evaluation'] = '合理成長定價';
  if (peg <= 0.8) {
    evaluation = '極佳買點 (成長低估)';
  } else if (peg <= 1.3) {
    evaluation = '合理成長定價';
  } else {
    evaluation = '成長透支高估';
  }

  return {
    currentPrice,
    peRatio: safePE,
    growthRate: safeG,
    peg,
    fairValue,
    evaluation,
  };
}

/**
 * 4. 高登股利折現模型 (Dividend Discount Model, DDM)
 * 
 * P = D_0 * (1 + g) / (r - g)
 */
export function calculateDividendDiscountModel(
  dividendPerShare: number,
  requiredReturn = 8.5,
  dividendGrowthRate = 4.0,
  currentPrice: number
): DDMResult {
  const isApplicable = dividendPerShare > 0 && requiredReturn > dividendGrowthRate;
  if (!isApplicable) {
    return {
      currentPrice,
      dividendPerShare,
      requiredReturn,
      dividendGrowthRate,
      intrinsicValue: 0,
      isApplicable: false,
    };
  }

  const rDec = requiredReturn / 100;
  const gDec = dividendGrowthRate / 100;
  const intrinsicValue = Number(((dividendPerShare * (1 + gDec)) / (rDec - gDec)).toFixed(2));

  return {
    currentPrice,
    dividendPerShare,
    requiredReturn,
    dividendGrowthRate,
    intrinsicValue,
    isApplicable: true,
  };
}

/**
 * 5. 蒙地卡羅 1,000 次幾何布朗運動 (Geometric Brownian Motion, GBM) 隨機路徑模擬
 * 
 * 隨機微分方程：
 * S_{t + dt} = S_t * exp( (mu - 0.5 * sigma^2) * dt + sigma * sqrt(dt) * Z )
 * 其中 Z ~ N(0, 1) 使用 Box-Muller 變換精確生成
 */
export function runMonteCarloSimulation(
  currentPrice: number,
  historicalVolatility = 28.0, // 年化波動率 %
  drift = 8.0,                  // 預期年化漂移率 %
  forecastDays = 60,
  simulationsCount = 1000
): MonteCarloResult {
  const dt = 1 / 252; // 年化交易日微元
  const sigma = historicalVolatility / 100;
  const mu = drift / 100;
  const driftTerm = (mu - 0.5 * sigma * sigma) * dt;
  const volTerm = sigma * Math.sqrt(dt);

  // 初始化每條路徑當前價格
  const paths: number[][] = [];
  for (let s = 0; s < simulationsCount; s++) {
    paths.push([currentPrice]);
  }

  // 逐步模擬 forecastDays 天
  for (let day = 1; day <= forecastDays; day++) {
    for (let s = 0; s < simulationsCount; s += 2) {
      // Box-Muller 變換產生標準常態分佈隨機數 (Z1, Z2)
      let u1 = Math.random();
      let u2 = Math.random();
      while (u1 <= 1e-15) u1 = Math.random();

      const radius = Math.sqrt(-2.0 * Math.log(u1));
      const theta = 2.0 * Math.PI * u2;
      const z1 = radius * Math.cos(theta);
      const z2 = radius * Math.sin(theta);

      // 路徑 1
      const p1Prev = paths[s][day - 1];
      const p1Next = p1Prev * Math.exp(driftTerm + volTerm * z1);
      paths[s].push(p1Next);

      // 路徑 2
      if (s + 1 < simulationsCount) {
        const p2Prev = paths[s + 1][day - 1];
        const p2Next = p2Prev * Math.exp(driftTerm + volTerm * z2);
        paths[s + 1].push(p2Next);
      }
    }
  }

  // 採樣關鍵天數統計分位數 (Day 0, 5, 10, 15, 20, 30, 40, 50, forecastDays)
  const sampleDays = [0, 5, 10, 15, 20, 30, 40, 50, forecastDays];
  const summaryPoints: MonteCarloPathPoint[] = [];

  for (const day of sampleDays) {
    const pricesAtDay = paths.map((p) => p[day]).sort((a, b) => a - b);
    const getPercentile = (p: number) => {
      const idx = Math.min(simulationsCount - 1, Math.floor((p / 100) * simulationsCount));
      return Number(pricesAtDay[idx].toFixed(2));
    };

    summaryPoints.push({
      day,
      p10: getPercentile(10),
      p25: getPercentile(25),
      p50: getPercentile(50),
      p75: getPercentile(75),
      p90: getPercentile(90),
      p95: getPercentile(95),
    });
  }

  // 期末 Day 60 統計指標
  const finalPrices = paths.map((p) => p[forecastDays]).sort((a, b) => a - b);
  const expectedMedianPrice = Number(finalPrices[Math.floor(simulationsCount * 0.5)].toFixed(2));
  const ci95Low = Number(finalPrices[Math.floor(simulationsCount * 0.025)].toFixed(2));
  const ci95High = Number(finalPrices[Math.floor(simulationsCount * 0.975)].toFixed(2));

  // 跌破 -10% 停損線的機率
  const stopLossThreshold = currentPrice * 0.90;
  const breakDownCount = finalPrices.filter((p) => p < stopLossThreshold).length;
  const breakdownProbabilityPercent = Number(((breakDownCount / simulationsCount) * 100).toFixed(1));

  // 95% 單日最大在險價值 (Value at Risk, 1.65 * sigma / sqrt(252))
  const valueAtRisk95Percent = Number(((1.65 * sigma * Math.sqrt(dt)) * 100).toFixed(2));

  return {
    currentPrice,
    historicalVolatility,
    drift,
    simulationsCount,
    forecastDays,
    paths: summaryPoints,
    expectedMedianPrice,
    confidenceInterval95: [ci95Low, ci95High],
    breakdownProbabilityPercent,
    valueAtRisk95Percent,
  };
}

/**
 * 6. 橄欖球場綜合估值 (Football Field Valuation Summary)
 * 
 * 整合 DCF、葛拉漢、彼得林區 PEG、高登 DDM、52 週區間與投行共識目標價，
 * 計算出華爾街研報標準的公允價值重疊交集區 (Sweet Spot Range)。
 */
export function generateComprehensiveValuation(
  symbol: string,
  price: number,
  currency = 'USD',
  fundamental: FundamentalData
): ComprehensiveValuationResult {
  const currentPrice = price > 0 ? price : 100;
  const eps = fundamental.eps > 0 ? fundamental.eps : currentPrice * 0.04;
  const growthRate = fundamental.growthRateNext5Y || fundamental.revenueGrowthYoY || 12.0;
  const pe = fundamental.peRatio > 0 ? fundamental.peRatio : 22.0;
  const wacc = fundamental.wacc || 8.5;
  const termG = fundamental.terminalGrowthRate || 2.5;

  // 1. DCF 計算
  const fcfBase = fundamental.freeCashFlow || currentPrice * 0.045 * (fundamental.sharesOutstanding || 10);
  const dcfResult = calculateDCFValuation({
    currentPrice,
    freeCashFlow: fcfBase,
    growthRate5Y: growthRate,
    terminalGrowthRate: termG,
    wacc,
    netDebt: fundamental.netDebt || 0,
    sharesOutstanding: fundamental.sharesOutstanding || 10,
  });

  // 2. 葛拉漢公式計算
  const grahamResult = calculateGrahamValuation(eps, growthRate, 4.2, currentPrice);

  // 3. 彼得林區 PEG 計算
  const pegResult = calculatePeterLynchPEG(pe, growthRate, eps, currentPrice);

  // 4. 高登 DDM 計算
  const ddmResult = calculateDividendDiscountModel(
    fundamental.dividendPerShare || (currentPrice * (fundamental.dividendYield / 100)),
    8.5,
    3.5,
    currentPrice
  );

  // 5. 蒙地卡羅模擬
  const beta = fundamental.beta || 1.1;
  const histVol = Math.max(18, Math.min(65, 22 * beta));
  const monteCarloResult = runMonteCarloSimulation(currentPrice, histVol, 8.0, 60, 1000);

  // 6. 整合橄欖球場項目
  const models: FootballFieldItem[] = [
    {
      modelName: '52 週歷史區間 (52W Range)',
      category: 'market',
      lowPrice: fundamental.low52w || Number((currentPrice * 0.75).toFixed(2)),
      midPrice: currentPrice,
      highPrice: fundamental.high52w || Number((currentPrice * 1.25).toFixed(2)),
      description: '近一年市場多空博弈極值區間',
    },
    {
      modelName: '兩階段 DCF 現金流折現',
      category: 'fundamental',
      lowPrice: Number((dcfResult.intrinsicValuePerShare * 0.85).toFixed(2)),
      midPrice: dcfResult.intrinsicValuePerShare,
      highPrice: Number((dcfResult.intrinsicValuePerShare * 1.15).toFixed(2)),
      description: `WACC ${wacc}% 與 5 年 ${growthRate}% 成長折現模型`,
    },
    {
      modelName: '葛拉漢修正公式 (Graham)',
      category: 'fundamental',
      lowPrice: Number((grahamResult.intrinsicValue * 0.85).toFixed(2)),
      midPrice: grahamResult.intrinsicValue,
      highPrice: Number((grahamResult.intrinsicValue * 1.15).toFixed(2)),
      description: '價值投資之父考量無風險利率之內在公允定價',
    },
    {
      modelName: '彼得·林區 PEG 成長定價',
      category: 'multiples',
      lowPrice: Number((pegResult.fairValue * 0.85).toFixed(2)),
      midPrice: pegResult.fairValue,
      highPrice: Number((pegResult.fairValue * 1.15).toFixed(2)),
      description: `PEG 為 ${pegResult.peg}，成長性與本益比相稱水準`,
    },
  ];

  // 若有分析師目標價或高登 DDM，加入比較
  if (fundamental.analystTargetPrice) {
    models.push({
      modelName: '華爾街投行共識目標價',
      category: 'market',
      lowPrice: Number((fundamental.analystTargetPrice * 0.88).toFixed(2)),
      midPrice: fundamental.analystTargetPrice,
      highPrice: Number((fundamental.analystTargetPrice * 1.12).toFixed(2)),
      description: '高盛/摩根士丹利等法人機構綜合評等目標價',
    });
  }

  if (ddmResult.isApplicable) {
    models.push({
      modelName: '高登股息折現 (DDM)',
      category: 'fundamental',
      lowPrice: Number((ddmResult.intrinsicValue * 0.88).toFixed(2)),
      midPrice: ddmResult.intrinsicValue,
      highPrice: Number((ddmResult.intrinsicValue * 1.12).toFixed(2)),
      description: '現金股利永續折現模型 (適合防禦與高息股)',
    });
  }

  // 綜合重疊甜蜜區間 (Sweet Spot Range)：取各模型中間價的第 25% 與第 75% 區間
  const midPrices = models.map((m) => m.midPrice).sort((a, b) => a - b);
  const sweetLow = midPrices[Math.floor(midPrices.length * 0.25)];
  const sweetHigh = midPrices[Math.floor(midPrices.length * 0.75)];
  const sweetMid = (sweetLow + sweetHigh) / 2;

  // 綜合折溢價率 %
  const overallDiscountPercent = Number((((sweetMid - currentPrice) / sweetMid) * 100).toFixed(1));

  let overallRating: ComprehensiveValuationResult['overallRating'] = '公允合理';
  if (overallDiscountPercent >= 20) {
    overallRating = '顯著低估 (強烈安全邊際)';
  } else if (overallDiscountPercent >= -5) {
    overallRating = '公允合理';
  } else if (overallDiscountPercent >= -25) {
    overallRating = '偏高溢價';
  } else {
    overallRating = '過度透支';
  }

  return {
    symbol,
    currentPrice,
    currency,
    models,
    sweetSpotRange: [Number(sweetLow.toFixed(2)), Number(sweetHigh.toFixed(2))],
    overallDiscountPercent,
    overallRating,
    dcf: dcfResult,
    graham: grahamResult,
    peg: pegResult,
    ddm: ddmResult,
    monteCarlo: monteCarloResult,
  };
}
