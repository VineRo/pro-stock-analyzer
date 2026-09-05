import { describe, it, expect } from 'vitest';
import { 
  calculateDCFValuation, 
  calculateGrahamValuation, 
  calculatePeterLynchPEG, 
  calculateDividendDiscountModel, 
  runMonteCarloSimulation, 
  generateComprehensiveValuation 
} from '../utils/valuationEngine';
import { FundamentalData } from '../types/stock';

describe('Valuation Engine - DCF 現金流折現模型測試', () => {
  it('應精準計算 5 年顯性預測期折現值、永續終值與每股公允價值', () => {
    const input = {
      currentPrice: 100,
      freeCashFlow: 50,       // 50 億
      growthRate5Y: 10,       // 10%
      terminalGrowthRate: 2.5,// 2.5%
      wacc: 8.5,              // 8.5%
      netDebt: 20,            // 20 億
      sharesOutstanding: 10,  // 10 億股
    };

    const res = calculateDCFValuation(input);

    // 驗證 5 年顯性預測期長度
    expect(res.projectedFCF).toHaveLength(5);
    // Year 1 FCF 應為 50 * 1.1 = 55
    expect(res.projectedFCF[0].fcf).toBe(55);
    // 驗證每股內在價值大於 0
    expect(res.intrinsicValuePerShare).toBeGreaterThan(0);
    // 驗證安全邊際計算
    expect(typeof res.marginOfSafetyPercent).toBe('number');
    // 驗證 5x5 敏感度矩陣
    expect(res.sensitivityMatrix.waccRange).toHaveLength(5);
    expect(res.sensitivityMatrix.growthRange).toHaveLength(5);
    expect(res.sensitivityMatrix.grid).toHaveLength(5);
    expect(res.sensitivityMatrix.grid[0]).toHaveLength(5);
  });

  it('防呆邊界條件：當永續增長率高於或等於 WACC 時，應自動限縮防止分母小於等於 0 崩潰', () => {
    const input = {
      currentPrice: 150,
      freeCashFlow: 40,
      growthRate5Y: 15,
      terminalGrowthRate: 10.0, // 異常超高永續增長率 (大於 WACC 8%)
      wacc: 8.0,
      netDebt: 0,
      sharesOutstanding: 5,
    };

    const res = calculateDCFValuation(input);
    expect(res.terminalValue).toBeGreaterThan(0);
    expect(res.intrinsicValuePerShare).toBeGreaterThan(0);
  });
});

describe('Valuation Engine - 葛拉漢修正公式模型測試', () => {
  it('應根據無風險公債利率準確計算葛拉漢公允價值與安全邊際', () => {
    // EPS = 5, g = 10%, Y = 4.2%
    // V = (5 * (8.5 + 2 * 10) * 4.4) / 4.2 = (5 * 28.5 * 4.4) / 4.2 = 627 / 4.2 ≈ 149.29
    const res = calculateGrahamValuation(5.0, 10.0, 4.2, 100);

    expect(res.intrinsicValue).toBeCloseTo(149.29, 1);
    // 安全邊際 (149.29 - 100) / 149.29 ≈ 33.0%
    expect(res.marginOfSafetyPercent).toBeGreaterThan(30);
    expect(res.evaluation).toBe('大幅低估 (充足防撞安全邊際)');
  });

  it('當現價遠高於葛拉漢公允價時應給予估值偏高警示', () => {
    const res = calculateGrahamValuation(2.0, 5.0, 4.2, 200);
    expect(res.marginOfSafetyPercent).toBeLessThan(0);
    expect(['估值偏高', '嚴重泡沫']).toContain(res.evaluation);
  });
});

describe('Valuation Engine - 彼得·林區 PEG 估值測試', () => {
  it('PEG <= 0.8 時應評估為極佳買點', () => {
    // P/E = 15, g = 25% => PEG = 0.6
    const res = calculatePeterLynchPEG(15, 25, 4.0, 60);
    expect(res.peg).toBe(0.6);
    expect(res.fairValue).toBe(100); // 4 * 25
    expect(res.evaluation).toBe('極佳買點 (成長低估)');
  });

  it('PEG > 1.3 時應評估為成長透支高估', () => {
    const res = calculatePeterLynchPEG(45, 15, 2.0, 90);
    expect(res.peg).toBe(3.0);
    expect(res.evaluation).toBe('成長透支高估');
  });
});

describe('Valuation Engine - 高登股息折現 DDM 測試', () => {
  it('具備現金配息且要求報酬率大於成長率時應成功折現', () => {
    // D0 = 4, r = 8%, g = 3% => P = 4 * 1.03 / 0.05 = 82.4
    const res = calculateDividendDiscountModel(4.0, 8.0, 3.0, 70);
    expect(res.isApplicable).toBe(true);
    expect(res.intrinsicValue).toBeCloseTo(82.4, 1);
  });

  it('零配息或要求報酬率小於等於成長率時應標記為不適用', () => {
    const res = calculateDividendDiscountModel(0, 8.0, 3.0, 100);
    expect(res.isApplicable).toBe(false);
    expect(res.intrinsicValue).toBe(0);
  });
});

describe('Valuation Engine - 蒙地卡羅 1,000 次隨機路徑模擬測試', () => {
  it('應正確產生 60 天 1,000 次幾何布朗運動路徑與統計分位數', () => {
    const res = runMonteCarloSimulation(100, 25.0, 8.0, 60, 1000);

    expect(res.simulationsCount).toBe(1000);
    expect(res.forecastDays).toBe(60);
    expect(res.paths.length).toBeGreaterThan(0);

    // 驗證分位數單調遞增特性 P10 <= P25 <= P50 <= P75 <= P90 <= P95
    const finalPoint = res.paths[res.paths.length - 1];
    expect(finalPoint.p10).toBeLessThanOrEqual(finalPoint.p25);
    expect(finalPoint.p25).toBeLessThanOrEqual(finalPoint.p50);
    expect(finalPoint.p50).toBeLessThanOrEqual(finalPoint.p75);
    expect(finalPoint.p75).toBeLessThanOrEqual(finalPoint.p90);
    expect(finalPoint.p90).toBeLessThanOrEqual(finalPoint.p95);

    // 驗證 95% 信賴區間下限小於上限
    expect(res.confidenceInterval95[0]).toBeLessThan(res.confidenceInterval95[1]);
    expect(res.valueAtRisk95Percent).toBeGreaterThan(0);
  });
});

describe('Valuation Engine - 橄欖球場綜合估值 (Football Field) 測試', () => {
  it('應能聚合多模型估值並計算出公允價值交集區間 (Sweet Spot)', () => {
    const fakeFund: FundamentalData = {
      symbol: 'TEST',
      name: '測試股票',
      peRatio: 22,
      pbRatio: 4,
      dividendYield: 2.0,
      eps: 5,
      revenueGrowthYoY: 15,
      high52w: 130,
      low52w: 80,
      marketCap: '$50B',
      sector: '科技',
      healthScore: 90,
      analystConsensus: '買進',
      freeCashFlow: 30,
      sharesOutstanding: 5,
      wacc: 8.5,
      growthRateNext5Y: 12.0,
      dividendPerShare: 2.0,
      analystTargetPrice: 120,
    };

    const summary = generateComprehensiveValuation('TEST', 100, 'USD', fakeFund);

    expect(summary.models.length).toBeGreaterThanOrEqual(4);
    expect(summary.sweetSpotRange[0]).toBeLessThanOrEqual(summary.sweetSpotRange[1]);
    expect(typeof summary.overallDiscountPercent).toBe('number');
    expect(summary.overallRating).toBeDefined();
    expect(summary.dcf).toBeDefined();
    expect(summary.graham).toBeDefined();
    expect(summary.monteCarlo).toBeDefined();
  });
});
