import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  init, 
  dispose, 
  Chart, 
  KLineData,
  LineType,
  PolygonType,
  CandleType,
  TooltipShowRule,
  TooltipShowType,
  OverlayMode,
  registerIndicator,
  ActionType
} from 'klinecharts';
import { ColorTheme, DrawingToolType, MarketType } from '../types/stock';
import '../utils/customOverlays';
import { calculateVolumeProfile } from '../utils/volumeProfile';
import { analyzeSMC } from '../utils/smcAnalysis';
import { getMarketInfo, formatVolume } from '../utils/formatters';
import { BarChart2, X, Zap, ShieldAlert, Target, Info, Pin } from 'lucide-react';
import {
  StoredDrawing,
  getNextDrawingColor,
  getDrawingsForSymbol,
  saveDrawingsForSymbol,
  upsertDrawingForSymbol,
  removeDrawingForSymbol,
  clearDrawingsForSymbol,
  adjustDrawingsForData,
  enrichPointsWithCandles
} from '../services/drawingStore';

// 註冊客製化機構級 VWAP (成交量加權平均價 + 多階標準差通道)
try {
  registerIndicator({
    name: 'VWAP',
    shortName: 'VWAP',
    calc: (kLineDataList) => {
      let cumVol = 0;
      let cumTypVol = 0;
      let lastDay = -1;
      return kLineDataList.map((bar) => {
        const d = new Date(bar.timestamp).getUTCDate();
        if (d !== lastDay) {
          cumVol = 0;
          cumTypVol = 0;
          lastDay = d;
        }
        const typ = (bar.high + bar.low + bar.close) / 3;
        const vol = bar.volume || 1;
        cumTypVol += typ * vol;
        cumVol += vol;
        const vwap = cumVol > 0 ? Number((cumTypVol / cumVol).toFixed(2)) : bar.close;
        const dev = Math.max(0.5, Number((bar.high - bar.low).toFixed(2)));
        return {
          vwap,
          up1: Number((vwap + dev * 0.8).toFixed(2)),
          dn1: Number((vwap - dev * 0.8).toFixed(2)),
          up2: Number((vwap + dev * 1.6).toFixed(2)),
          dn2: Number((vwap - dev * 1.6).toFixed(2)),
        };
      });
    },
    figures: [
      { key: 'vwap', title: 'VWAP: ', type: 'line' },
      { key: 'up1', title: '+1σ: ', type: 'line' },
      { key: 'dn1', title: '-1σ: ', type: 'line' },
      { key: 'up2', title: '+2σ: ', type: 'line' },
      { key: 'dn2', title: '-2σ: ', type: 'line' },
    ],
    styles: {
      lines: [
        { style: LineType.Solid, smooth: false, size: 1.5, color: '#06b6d4', dashedValue: [2, 2] },
        { style: LineType.Dashed, smooth: false, size: 1, color: '#38bdf8', dashedValue: [3, 3] },
        { style: LineType.Dashed, smooth: false, size: 1, color: '#38bdf8', dashedValue: [3, 3] },
        { style: LineType.Dashed, smooth: false, size: 1, color: '#a855f7', dashedValue: [2, 2] },
        { style: LineType.Dashed, smooth: false, size: 1, color: '#a855f7', dashedValue: [2, 2] },
      ]
    }
  });
} catch {
  // ignore if already registered
}

/**
 * 精確計算圖表容器的實際主繪圖區寬度（扣除右側 Y 軸標籤寬度約 65px）
 */
const getChartPaneWidth = (el: HTMLElement | null): number => {
  const cWidth = el?.clientWidth || 800;
  return Math.max(300, cWidth - 65);
};

/**
 * 依據當前資料總根數與畫布寬度，動態計算確保「K 線絕不脫節或縮小成團露出大片黑底」的最小柱寬 (minBarSpace)
 */
const calcDynamicMinBarSpace = (el: HTMLElement | null, count: number): number => {
  const paneWidth = getChartPaneWidth(el);
  const dataCount = Math.max(count, 1);
  // 讓所有 K 棒拉到極限時正好鋪滿整片畫布（右側 0 偏移緊貼價位座標），絕不出現右側或左側黑底空隙
  const spanSpace = paneWidth / dataCount;
  // 最小 3.5px 保持燭身與影線清晰度，上限 35px 避免少量 K 棒時被過度拉伸
  return Math.max(3.5, Math.min(35, spanSpace));
};

/**
 * 動態套用圖表滾動與邊界限制（以柱數模式嚴密限制，徹底消除無 K 線黑底空洞）：
 * 1. 左邊界：最早一根 K 棒 (index 0) 抵達左邊界即鎖定，絕不往右拖曳出大片黑底
 * 2. 右邊界：最新 K 棒緊密貼齊右側價位軸 (0 偏移)，絕不露出任何無 K 線空洞
 * 3. 若全部 K 棒已完整容納於可視寬度內，自動鎖定滾動，防止拖曳至虛無
 */
const applyStrictBoundaries = (
  chart: Chart | null,
  containerEl: HTMLElement | null,
  dataCount: number
) => {
  if (!chart) return;
  const paneWidth = getChartPaneWidth(containerEl);
  const curBarSpace = chart.getBarSpace();
  const visibleBarCount = paneWidth / curBarSpace;

  // 當總資料筆數少於或等於目前可視柱數時（所有資料都已完整呈現在螢幕上）
  if (dataCount <= visibleBarCount) {
    chart.setScrollEnabled(false);
    chart.setOffsetRightDistance(0);
    chart.scrollToRealTime();
    return;
  }

  // 當資料筆數充足、可左右滾動查看歷史時
  chart.setScrollEnabled(true);
  chart.setOffsetRightDistance(0);
  // 右側滾動極限：最新 K 棒緊密貼齊右側價位軸 (0 偏移)，絕不露出任何右側黑底空隙
  chart.setLeftMinVisibleBarCount(Math.max(1, Math.floor(visibleBarCount)));
  // 左側滾動極限：最早 K 棒 (index 0) 剛好貼緊左邊界，禁止露出左側黑底
  chart.setRightMinVisibleBarCount(Math.floor(visibleBarCount));
};

export interface ChartContainerProps {
  symbol: string;
  stockName?: string;
  market?: MarketType;
  period?: string;
  data: KLineData[];
  secondaryData?: KLineData[];
  colorTheme: ColorTheme;
  mainIndicators: string[];
  subIndicators: string[];
  activeTool: DrawingToolType;
  isMagnet: boolean;
  selectedColor?: string;
  onFinishDrawing: () => void;
  onDrawingCountChange: (count: number) => void;
  showVolumeProfile?: boolean;
  onToggleVolumeProfile?: () => void;
  showSMC?: boolean;
  onToggleSMC?: () => void;
  isDualSplit?: boolean;
  showLastPriceLine?: boolean;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  symbol,
  stockName,
  market,
  period,
  data,
  secondaryData,
  colorTheme,
  mainIndicators,
  subIndicators,
  activeTool,
  isMagnet,
  selectedColor = 'auto',
  onFinishDrawing,
  onDrawingCountChange,
  showVolumeProfile: propShowVP,
  onToggleVolumeProfile: propToggleVP,
  showSMC: propShowSMC,
  onToggleSMC: propToggleSMC,
  isDualSplit: propIsDual,
  showLastPriceLine = true,
}) => {
  const chartRef = useRef<Chart | null>(null);
  const secondaryChartRef = useRef<Chart | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const secondaryContainerRef = useRef<HTMLDivElement>(null);
  const subPanesRef = useRef<Map<string, string>>(new Map());
  const dataRef = useRef<KLineData[]>(data);
  dataRef.current = data;

  // 跨標的畫線獨立記憶庫與動態股價比率快取
  const drawingsRef = useRef<StoredDrawing[]>([]);
  const symbolRef = useRef<string>(symbol);
  symbolRef.current = symbol;

  const activeToolRef = useRef<DrawingToolType>(activeTool);
  activeToolRef.current = activeTool;

  // 點擊固定 K 棒 (箱型圖) 資訊狀態
  const [pinnedCandle, setPinnedCandle] = useState<KLineData | null>(null);
  // 實時十字線或懸停 K 棒數值 (用於圖表頂部獨立平鋪列)
  const [hoverCandle, setHoverCandle] = useState<KLineData | null>(null);

  // 籌碼 Volume Profile、SMC 機構訂單流與雙屏分時對比狀態
  const [internalVP, setInternalVP] = useState<boolean>(false);
  const [internalSMC, setInternalSMC] = useState<boolean>(false);
  const [internalDual] = useState<boolean>(false);

  const showVolumeProfile = propShowVP !== undefined ? propShowVP : internalVP;
  const toggleVolumeProfile = propToggleVP || (() => setInternalVP((p) => !p));
  const showSMC = propShowSMC !== undefined ? propShowSMC : internalSMC;
  const toggleSMC = propToggleSMC || (() => setInternalSMC((p) => !p));
  const isDualSplit = propIsDual !== undefined ? propIsDual : internalDual;

  // 計算 Volume Profile
  const vpResult = useMemo(() => {
    return calculateVolumeProfile(data, 24);
  }, [data]);

  // 計算 SMC 機構訂單流分析
  const smcResult = useMemo(() => {
    return analyzeSMC(data);
  }, [data]);

  // 1. 初始化主圖 Chart
  useEffect(() => {
    if (!containerRef.current) return;

    const upColor = colorTheme === 'international' ? '#089981' : '#f23645';
    const downColor = colorTheme === 'international' ? '#f23645' : '#089981';

    const chart = init(containerRef.current, {
      styles: {
        grid: {
          show: true,
          horizontal: { color: 'rgba(255, 255, 255, 0.04)', size: 1, style: LineType.Dashed, dashedValue: [2, 4] },
          vertical: { color: 'rgba(255, 255, 255, 0.04)', size: 1, style: LineType.Dashed, dashedValue: [2, 4] },
        },
        candle: {
          type: CandleType.CandleSolid,
          bar: {
            upColor,
            downColor,
            noChangeColor: '#888888',
            upBorderColor: upColor,
            downBorderColor: downColor,
            noChangeBorderColor: '#888888',
            upWickColor: upColor,
            downWickColor: downColor,
            noChangeWickColor: '#888888',
          },
          tooltip: {
            showRule: TooltipShowRule.None, // 數據已置於圖表頂部獨立平鋪列，畫布內隱藏以根除與蠟燭重疊
            showType: TooltipShowType.Standard,
            offsetTop: 46,
            offsetLeft: 10,
            custom: [
              { title: '時間 ', value: '{time}' },
              { title: '開 ', value: '{open}' },
              { title: '高 ', value: '{high}' },
              { title: '低 ', value: '{low}' },
              { title: '收 ', value: '{close}' },
              { title: '漲幅 ', value: '{change}' },
              { title: '量 ', value: '{volume}' },
            ],
            text: { color: '#d1d4dc', size: 11, marginRight: 8 },
          },
          priceMark: {
            show: true,
            high: { show: true, color: '#f8fafc', textOffset: 4, textSize: 11, textWeight: 'bold' },
            low: { show: true, color: '#f8fafc', textOffset: 4, textSize: 11, textWeight: 'bold' },
            last: {
              show: showLastPriceLine,
              upColor,
              downColor,
              noChangeColor: '#888888',
              line: { show: showLastPriceLine, style: LineType.Dashed, dashedValue: [4, 2] },
              text: { show: showLastPriceLine, size: 11, color: '#ffffff' },
            },
          },
        },
        indicator: {
          ohlc: { upColor, downColor, noChangeColor: '#888888' },
          bars: [
            {
              style: PolygonType.Fill,
              borderStyle: LineType.Solid,
              borderSize: 1,
              borderDashedValue: [2, 2],
              upColor: upColor + '99',
              downColor: downColor + '99',
              noChangeColor: '#88888899',
            },
          ],
          lines: [
            { style: LineType.Solid, smooth: false, size: 1.5, color: '#fbc02d' }, // 1 (金絲雀黃)
            { style: LineType.Solid, smooth: false, size: 1.5, color: '#00bcd4' }, // 2 (晴空青)
            { style: LineType.Solid, smooth: false, size: 1.5, color: '#e91e63' }, // 3 (螢光洋紅)
            { style: LineType.Solid, smooth: false, size: 1.5, color: '#00e676' }, // 4 (翡翠綠)
            { style: LineType.Solid, smooth: false, size: 1.5, color: '#ab47bc' }, // 5 (皇家紫)
          ],
          tooltip: {
            showRule: TooltipShowRule.Always,
            showType: TooltipShowType.Standard,
            showName: true,
            showParams: true,
            offsetTop: 4,
            offsetLeft: 8,
            text: {
              size: 11,
              color: '#cbd5e1',
              marginRight: 8,
            },
          },
        },
        xAxis: {
          show: true,
          axisLine: { show: true, color: '#2a2e39', size: 1 },
          tickLine: { show: true, color: '#2a2e39', size: 1, length: 3 },
          tickText: { show: true, color: '#787b86', size: 11 },
        },
        yAxis: {
          show: true,
          axisLine: { show: true, color: '#2a2e39', size: 1 },
          tickLine: { show: true, color: '#2a2e39', size: 1, length: 3 },
          tickText: { show: true, color: '#787b86', size: 11 },
        },
        separator: {
          size: 1,
          color: '#2a2e39',
          fill: true,
          activeBackgroundColor: 'rgba(33, 150, 243, 0.15)',
        },
        crosshair: {
          show: true,
          horizontal: {
            show: true,
            line: { style: LineType.Dashed, dashedValue: [4, 2], size: 1, color: '#787b86' },
            text: { show: true, color: '#ffffff', backgroundColor: '#2a2e39', size: 11 },
          },
          vertical: {
            show: true,
            line: { style: LineType.Dashed, dashedValue: [4, 2], size: 1, color: '#787b86' },
            text: { show: true, color: '#ffffff', backgroundColor: '#2a2e39', size: 11 },
          },
        },
        overlay: {
          point: { color: '#2962ff', activeColor: '#ff9800', radius: 4, activeRadius: 6 },
          line: { style: LineType.Solid, smooth: false, color: '#2962ff', size: 1.5 },
          rect: { style: PolygonType.StrokeFill, color: '#2962ff33', borderColor: '#2962ff', borderSize: 1.5 },
          polygon: { style: PolygonType.StrokeFill, color: '#2962ff33', borderColor: '#2962ff', borderSize: 1.5 },
          text: { color: '#ffffff', size: 12 },
        },
      },
    });

    if (!chart) return;

    chartRef.current = chart;

    const currentDataCount = dataRef.current?.length || 150;
    const initialMinSpace = calcDynamicMinBarSpace(containerRef.current, currentDataCount);
    const initialSpace = currentDataCount < 100 
      ? initialMinSpace 
      : Math.max(initialMinSpace, Math.min(11, getChartPaneWidth(containerRef.current) / 100));

    chart.setBarSpace(initialSpace);
    applyStrictBoundaries(chart, containerRef.current, currentDataCount);
    chart.setOffsetRightDistance(0);
    chart.scrollToRealTime();

    // 監聽滾輪縮放：在捕獲階段精確限制最小與最大 K 線寬度，防止縮小過度露出黑底空洞
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        const curSpace = chart.getBarSpace();
        const count = dataRef.current?.length || 150;
        const minSpace = calcDynamicMinBarSpace(containerRef.current, count);
        const maxSpace = 40;

        // 向下滾動 (deltaY > 0) 為縮小 K 線 (Zoom Out)
        if (e.deltaY > 0) {
          if (curSpace <= minSpace) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }

        // 向上滾動 (deltaY < 0) 為放大 K 線 (Zoom In)
        if (e.deltaY < 0 && curSpace >= maxSpace) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
    };
    const cEl = containerRef.current;
    cEl?.addEventListener('wheel', handleWheel, { capture: true, passive: false });

    // 訂閱縮放事件作為第二道防護，同步更新滾動柱數邊界
    chart.subscribeAction(ActionType.OnZoom, () => {
      const curSpace = chart.getBarSpace();
      const count = dataRef.current?.length || 150;
      const minSpace = calcDynamicMinBarSpace(containerRef.current, count);
      if (curSpace < minSpace) {
        chart.setBarSpace(minSpace);
      } else if (curSpace > 40) {
        chart.setBarSpace(40);
      }
      applyStrictBoundaries(chart, containerRef.current, count);
    });

    const handleResize = () => {
      chart?.resize();
      const count = dataRef.current?.length || 150;
      const minSpace = calcDynamicMinBarSpace(containerRef.current, count);
      if (chart && chart.getBarSpace() < minSpace) {
        chart.setBarSpace(minSpace);
      }
      applyStrictBoundaries(chart, containerRef.current, count);

      if (secondaryChartRef.current) {
        secondaryChartRef.current.resize();
        const secCount = (secondaryData && secondaryData.length > 0 ? secondaryData : (dataRef.current?.slice(-100) || [])).length;
        const secMinSpace = calcDynamicMinBarSpace(secondaryContainerRef.current, secCount);
        if (secondaryChartRef.current.getBarSpace() < secMinSpace) {
          secondaryChartRef.current.setBarSpace(secMinSpace);
        }
        applyStrictBoundaries(secondaryChartRef.current, secondaryContainerRef.current, secCount);
      }
    };
    window.addEventListener('resize', handleResize);

    // 透過 ResizeObserver 監聽容器寬度變化 (如側邊欄收合、雙屏分欄)
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(containerRef.current);
    }

    const handleDblClick = () => {
      const count = dataRef.current?.length || 150;
      const paneWidth = getChartPaneWidth(containerRef.current);
      const minSpace = calcDynamicMinBarSpace(containerRef.current, count);
      const defaultSpace = count < 100 
        ? minSpace 
        : Math.max(minSpace, Math.min(11, paneWidth / 100));

      chart?.setBarSpace(defaultSpace);
      applyStrictBoundaries(chart, containerRef.current, count);
      chart?.setOffsetRightDistance(0);
      chart?.setPaneOptions({
        id: 'candle_pane',
        minHeight: 200,
        gap: { top: 38, bottom: 28 },
      });
      chart?.scrollToRealTime();
      chart?.resize();
    };
    cEl?.addEventListener('dblclick', handleDblClick);

    // 點擊 K 棒 (箱型圖) 即可固定/釘選當前 K 棒之開高低收等詳細數據
    chart.subscribeAction(ActionType.OnCandleBarClick, (param: any) => {
      if (activeToolRef.current !== 'none') return;
      if (param?.kLineData) {
        const clicked: KLineData = param.kLineData;
        setPinnedCandle((prev) => {
          if (prev && prev.timestamp === clicked.timestamp) {
            return null; // 點擊同一根則取消固定
          }
          return clicked; // 固定此根 K 棒
        });
      }
    });

    // 監聽十字線移動，即時更新頂部平鋪資訊列
    chart.subscribeAction(ActionType.OnCrosshairChange, (param: any) => {
      if (param && param.kLineData) {
        setHoverCandle(param.kLineData);
      } else {
        setHoverCandle(null);
      }
    });

    // 增加 K 線主繪圖區上下安全緩衝，使用像素級邊距 (38px 頂 / 28px 底) 與最小高度保護
    // 保證即使圖表被上下強烈壓縮或開啟多個副圖，最高價與最低價標記箭頭與文字永遠不被裁切、永不消失！
    chart.setPaneOptions({
      id: 'candle_pane',
      minHeight: 200,
      gap: { top: 38, bottom: 28 },
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      cEl?.removeEventListener('wheel', handleWheel, { capture: true } as any);
      cEl?.removeEventListener('dblclick', handleDblClick);
      resizeObserver?.disconnect();
      chart?.unsubscribeAction(ActionType.OnZoom);
      chart?.unsubscribeAction(ActionType.OnCandleBarClick);
      chart?.unsubscribeAction(ActionType.OnCrosshairChange);
      if (containerRef.current) {
        dispose(containerRef.current);
      }
      chartRef.current = null;
    };
  }, []);

  // 標的切換或按下 Esc 鍵時自動解除 K 棒數據固定
  useEffect(() => {
    setPinnedCandle(null);
  }, [symbol]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pinnedCandle) {
        setPinnedCandle(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pinnedCandle]);

  // 監聽最新現價水平線開關切換
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.setStyles({
        candle: {
          priceMark: {
            last: {
              show: showLastPriceLine,
              line: { show: showLastPriceLine },
              text: { show: showLastPriceLine },
            },
          },
        },
      });
    }
    if (secondaryChartRef.current) {
      secondaryChartRef.current.setStyles({
        candle: {
          priceMark: {
            last: {
              show: showLastPriceLine,
              line: { show: showLastPriceLine },
              text: { show: showLastPriceLine },
            },
          },
        },
      });
    }
  }, [showLastPriceLine]);

  // 2. 初始化副屏 Chart (若開啟雙屏)
  useEffect(() => {
    if (!isDualSplit || !secondaryContainerRef.current) {
      if (secondaryChartRef.current) {
        if (secondaryContainerRef.current) dispose(secondaryContainerRef.current);
        secondaryChartRef.current = null;
      }
      return;
    }

    const upColor = colorTheme === 'international' ? '#089981' : '#f23645';
    const downColor = colorTheme === 'international' ? '#f23645' : '#089981';

    const secChart = init(secondaryContainerRef.current, {
      styles: {
        grid: {
          show: true,
          horizontal: { color: '#1e222d', size: 1, style: LineType.Dashed, dashedValue: [4, 4] },
          vertical: { color: '#1e222d', size: 1, style: LineType.Dashed, dashedValue: [4, 4] },
        },
        candle: {
          type: CandleType.CandleSolid,
          bar: {
            upColor,
            downColor,
            noChangeColor: '#888888',
            upBorderColor: upColor,
            downBorderColor: downColor,
            noChangeBorderColor: '#888888',
            upWickColor: upColor,
            downWickColor: downColor,
            noChangeWickColor: '#888888',
          },
          tooltip: {
            showRule: TooltipShowRule.None, // 數據置於頂部獨立列，畫布內隱藏以杜絕重疊
            showType: TooltipShowType.Standard,
            offsetTop: 46,
            offsetLeft: 10,
            custom: [
              { title: '時間 ', value: '{time}' },
              { title: '開 ', value: '{open}' },
              { title: '高 ', value: '{high}' },
              { title: '低 ', value: '{low}' },
              { title: '收 ', value: '{close}' },
              { title: '漲幅 ', value: '{change}' },
              { title: '量 ', value: '{volume}' },
            ],
            text: { color: '#d1d4dc', size: 11, marginRight: 8 },
          },
          priceMark: {
            show: true,
            last: {
              show: showLastPriceLine,
              line: { show: showLastPriceLine },
              text: { show: showLastPriceLine },
            },
          },
        },
      },
    });

    if (!secChart) return;

    secondaryChartRef.current = secChart;

    secChart.setPaneOptions({
      id: 'candle_pane',
      minHeight: 200,
      gap: { top: 38, bottom: 28 },
    });

    const secData = secondaryData && secondaryData.length > 0 ? secondaryData : data.slice(-100);
    secChart?.applyNewData(secData);
    const secCount = secData.length;
    const secMinSpace = calcDynamicMinBarSpace(secondaryContainerRef.current, secCount);
    const secPaneWidth = getChartPaneWidth(secondaryContainerRef.current);
    const secIdealSpace = secCount < 100 
      ? secMinSpace 
      : Math.max(secMinSpace, Math.min(11, secPaneWidth / 100));

    secChart?.setBarSpace(secIdealSpace);
    applyStrictBoundaries(secChart, secondaryContainerRef.current, secCount);
    secChart?.setOffsetRightDistance(0);
    secChart?.scrollToRealTime();

    // 副圖縮放與邊界同步保護
    const handleSecWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        const curSpace = secChart.getBarSpace();
        const minSpace = calcDynamicMinBarSpace(secondaryContainerRef.current, secCount);
        const maxSpace = 40;

        if (e.deltaY > 0) {
          if (curSpace <= minSpace) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
        if (e.deltaY < 0 && curSpace >= maxSpace) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
    };
    const secEl = secondaryContainerRef.current;
    secEl?.addEventListener('wheel', handleSecWheel, { capture: true, passive: false });

    secChart.subscribeAction(ActionType.OnZoom, () => {
      const curSpace = secChart.getBarSpace();
      const minSpace = calcDynamicMinBarSpace(secondaryContainerRef.current, secCount);
      if (curSpace < minSpace) {
        secChart.setBarSpace(minSpace);
      } else if (curSpace > 40) {
        secChart.setBarSpace(40);
      }
      applyStrictBoundaries(secChart, secondaryContainerRef.current, secCount);
    });

    return () => {
      secEl?.removeEventListener('wheel', handleSecWheel, { capture: true } as any);
      secChart?.unsubscribeAction(ActionType.OnZoom);
      if (secondaryContainerRef.current) {
        dispose(secondaryContainerRef.current);
      }
      secondaryChartRef.current = null;
    };
  }, [isDualSplit, colorTheme]);

  // 載入主圖數據
  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;
    chartRef.current.applyNewData(data);
    const count = data.length;
    const paneWidth = getChartPaneWidth(containerRef.current);
    const minSpace = calcDynamicMinBarSpace(containerRef.current, count);
    
    // 自適應初始寬度：若資料數量少於 100 筆，直接鋪滿全寬；若資料充足，則以舒適密度展示
    const idealSpace = count < 100 
      ? minSpace 
      : Math.max(minSpace, Math.min(11, paneWidth / 100));

    chartRef.current.setBarSpace(idealSpace);
    applyStrictBoundaries(chartRef.current, containerRef.current, count);
    chartRef.current.setOffsetRightDistance(0);
    chartRef.current.scrollToRealTime();
  }, [data]);

  // 配色切換
  useEffect(() => {
    if (!chartRef.current) return;
    const upColor = colorTheme === 'international' ? '#089981' : '#f23645';
    const downColor = colorTheme === 'international' ? '#f23645' : '#089981';

    chartRef.current.setStyles({
      candle: {
        bar: {
          upColor,
          downColor,
          upBorderColor: upColor,
          downBorderColor: downColor,
          upWickColor: upColor,
          downWickColor: downColor,
        },
        priceMark: {
          last: { upColor, downColor },
        },
      },
      indicator: {
        ohlc: { upColor, downColor },
        bars: [{ upColor: upColor + '99', downColor: downColor + '99' }],
      },
    });
  }, [colorTheme]);

  // 更新主圖指標 (含 VWAP)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const allMain = ['MA', 'EMA', 'BOLL', 'SAR', 'BBI', 'VWAP'];
    allMain.forEach((id) => {
      try {
        chart.removeIndicator('candle_pane', id);
      } catch {
        // ignore
      }
    });

    mainIndicators.forEach((id) => {
      try {
        chart.createIndicator(id, false, { id: 'candle_pane' });
        // 關鍵：將 candle_pane 上的主圖指標 (EMA, MA, BOLL 等) 在畫布內的 Tooltip 數據源覆蓋為空
        // 徹底杜絕任何指標文字直接畫在 K 線蠟燭圖身上造成遮擋與重疊！
        // 主圖指標即時數值已移至圖表畫布上方專屬 DOM 資訊列 (100% 畫布外物理隔離)
        chart.overrideIndicator({
          name: id,
          createTooltipDataSource: () => ({ name: '', calcParamsText: '', icons: [], values: [] }),
        }, 'candle_pane');
      } catch (e) {
        console.warn(`Could not create main indicator ${id}:`, e);
      }
    });

    // 重新校準主圖上下邊距，確保高低價標記永久安全
    chart.setPaneOptions({
      id: 'candle_pane',
      minHeight: 200,
      gap: { top: 38, bottom: 28 },
    });
  }, [mainIndicators]);

  // 更新副圖指標
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    subPanesRef.current.forEach((paneId, name) => {
      if (!subIndicators.includes(name)) {
        try {
          chart.removeIndicator(paneId, name);
        } catch {
          // ignore
        }
        subPanesRef.current.delete(name);
      }
    });

    subIndicators.forEach((name) => {
      if (!subPanesRef.current.has(name)) {
        try {
          const paneId = chart.createIndicator(name, false, {
            height: 100,
            minHeight: 70,
            gap: { top: 32, bottom: 8 },
          });
          if (paneId) {
            subPanesRef.current.set(name, paneId);
            // 關鍵：為每一個副圖指標欄位 (VOL, MACD, KDJ, OBV 等) 明確指定 32px 頂部預留間距
            // 確保成交量長紅長綠柱狀圖或指標高峰曲線「永遠不會衝進頂部 32px 區域」
            // 副圖指標文字位於頂部 (0~16px)，與指標折線/柱狀圖 (32px以下) 達到 100% 物理分離，永不重疊！
            chart.setPaneOptions({
              id: paneId,
              height: 100,
              minHeight: 70,
              gap: { top: 32, bottom: 8 },
            });
          }
        } catch (e) {
          console.warn(`Could not create sub indicator ${name}:`, e);
        }
      } else {
        // 對已存在副圖亦確保防重疊邊距設定維持生效
        const paneId = subPanesRef.current.get(name);
        if (paneId) {
          chart.setPaneOptions({
            id: paneId,
            height: 100,
            minHeight: 70,
            gap: { top: 32, bottom: 8 },
          });
        }
      }
    });

    // 重新校準主圖上下邊距，確保高低價標記永久安全
    chart.setPaneOptions({
      id: 'candle_pane',
      minHeight: 200,
      gap: { top: 38, bottom: 28 },
    });
  }, [subIndicators]);

  // 1. 標的切換生命週期管理：讀取獨立記憶庫並自動動態校準股價
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // 清空上一檔股票的畫線，防止標的穿透
    chart.removeOverlay();

    // 讀取該標的歷史畫線紀錄
    const saved = getDrawingsForSymbol(symbol);
    
    // 若歷史畫線存在且已有 K 線數據，自動進行股價動態校準
    const { adjustedDrawings, hasChanges } = adjustDrawingsForData(saved, dataRef.current);
    if (hasChanges) {
      saveDrawingsForSymbol(symbol, adjustedDrawings);
    }
    drawingsRef.current = adjustedDrawings;
    onDrawingCountChange(adjustedDrawings.length);

    // 在圖表畫布上重建所有線段
    adjustedDrawings.forEach((d) => {
      try {
        chart.createOverlay({
          id: d.id,
          name: d.name,
          points: d.points,
          styles: d.styles,
          extendData: d.extendData,
          onPressedMoveEnd: (e: any) => {
            if (e?.overlay) {
              const enriched = enrichPointsWithCandles(e.overlay.points, dataRef.current);
              upsertDrawingForSymbol(symbolRef.current, {
                ...d,
                points: enriched,
                updatedAt: Date.now(),
              });
              drawingsRef.current = getDrawingsForSymbol(symbolRef.current);
            }
            return true;
          },
          onRightClick: (e: any) => {
            if (e?.overlay?.id) {
              chart.removeOverlay(e.overlay.id);
              removeDrawingForSymbol(symbolRef.current, e.overlay.id);
              drawingsRef.current = getDrawingsForSymbol(symbolRef.current);
              onDrawingCountChange(drawingsRef.current.length);
            }
            return true;
          },
        });
      } catch (err) {
        console.warn(`[ChartContainer] Failed to recreate overlay ${d.id}:`, err);
      }
    });
  }, [symbol]);

  // 2. 股價每日修正與除權息自動動態校準：當 K 線數據變動時即時同步點位
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !drawingsRef.current.length) return;

    const { adjustedDrawings, hasChanges } = adjustDrawingsForData(drawingsRef.current, data);
    if (hasChanges) {
      drawingsRef.current = adjustedDrawings;
      saveDrawingsForSymbol(symbol, adjustedDrawings);

      // 即時重新指派畫布上各線段之校準後點位
      adjustedDrawings.forEach((d) => {
        try {
          chart.overrideOverlay({
            id: d.id,
            points: d.points,
          });
        } catch {
          // ignore
        }
      });
    }
  }, [data, symbol]);

  // 3. 畫線工具啟動：分配專屬語意/輪播高對比色彩，並儲存至記憶庫
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || activeTool === 'none') return;

    const mode = isMagnet ? OverlayMode.WeakMagnet : OverlayMode.Normal;
    const chosenColor = getNextDrawingColor(activeTool, drawingsRef.current, selectedColor);

    const overlayStyles = {
      point: { 
        color: chosenColor, 
        borderColor: '#ffffff',
        borderSize: 1.5,
        activeColor: '#ff9800', 
        radius: 4, 
        activeRadius: 6 
      },
      line: { 
        style: LineType.Solid, 
        smooth: false, 
        color: chosenColor, 
        size: 2 
      },
      rect: { 
        style: PolygonType.StrokeFill, 
        color: `${chosenColor}26`, 
        borderColor: chosenColor, 
        borderSize: 1.5 
      },
      polygon: { 
        style: PolygonType.StrokeFill, 
        color: `${chosenColor}26`, 
        borderColor: chosenColor, 
        borderSize: 1.5 
      },
      circle: { 
        style: PolygonType.StrokeFill, 
        color: `${chosenColor}26`, 
        borderColor: chosenColor, 
        borderSize: 1.5 
      },
      text: { 
        color: '#ffffff', 
        backgroundColor: chosenColor,
        size: 12 
      },
    };

    let pendingOverlayId: string | null = null;
    let extendData: any = undefined;
    if (activeTool === 'text') {
      const input = window.prompt('請輸入標註文字內容：', '重點筆記');
      if (input === null) {
        onFinishDrawing();
        return;
      }
      extendData = input.trim() || '重點筆記';
    }

    try {
      const res = chart.createOverlay({
        name: activeTool,
        mode: mode,
        styles: overlayStyles,
        extendData: extendData,
        onDrawEnd: (e: any) => {
          if (e?.overlay) {
            const enriched = enrichPointsWithCandles(e.overlay.points, dataRef.current);
            const newDrawing: StoredDrawing = {
              id: e.overlay.id,
              name: activeTool,
              color: chosenColor,
              points: enriched,
              styles: overlayStyles,
              extendData: extendData,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            upsertDrawingForSymbol(symbolRef.current, newDrawing);
            drawingsRef.current = getDrawingsForSymbol(symbolRef.current);
            onDrawingCountChange(drawingsRef.current.length);
          }
          onFinishDrawing();
          return true;
        },
        onPressedMoveEnd: (e: any) => {
          if (e?.overlay) {
            const enriched = enrichPointsWithCandles(e.overlay.points, dataRef.current);
            const current = drawingsRef.current.find((d) => d.id === e.overlay.id);
            if (current) {
              const updated = {
                ...current,
                points: enriched,
                updatedAt: Date.now(),
              };
              upsertDrawingForSymbol(symbolRef.current, updated);
              drawingsRef.current = getDrawingsForSymbol(symbolRef.current);
            }
          }
          return true;
        },
        onRightClick: (e: any) => {
          if (e?.overlay?.id) {
            chart.removeOverlay(e.overlay.id);
            removeDrawingForSymbol(symbolRef.current, e.overlay.id);
            drawingsRef.current = getDrawingsForSymbol(symbolRef.current);
            onDrawingCountChange(drawingsRef.current.length);
          }
          return true;
        },
      });
      if (typeof res === 'string') {
        pendingOverlayId = res;
      }
    } catch (e) {
      console.warn(`Error activating drawing tool ${activeTool}:`, e);
    }

    return () => {
      if (pendingOverlayId && chartRef.current) {
        const isSaved = drawingsRef.current.some((d) => d.id === pendingOverlayId);
        if (!isSaved) {
          chartRef.current.removeOverlay(pendingOverlayId);
        }
      }
    };
  }, [activeTool, isMagnet, selectedColor, onFinishDrawing]);

  const clearAllDrawings = () => {
    if (chartRef.current) {
      chartRef.current.removeOverlay();
      clearDrawingsForSymbol(symbolRef.current);
      drawingsRef.current = [];
      onDrawingCountChange(0);
    }
  };

  useEffect(() => {
    (window as any).__proStockClearDrawings = clearAllDrawings;
    return () => {
      delete (window as any).__proStockClearDrawings;
    };
  }, []);

  // 格式化日期與時間
  const formatBarDateTime = (ts?: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  };

  // EMA 指數移動平均計算函式
  const calculateEmaSeries = (dataList: KLineData[], period: number): number[] => {
    if (!dataList || dataList.length === 0) return [];
    const k = 2 / (period + 1);
    const result: number[] = new Array(dataList.length);
    let closeSum = 0;
    for (let i = 0; i < dataList.length; i++) {
      closeSum += dataList[i].close;
      if (i < period - 1) {
        result[i] = NaN;
      } else if (i === period - 1) {
        result[i] = closeSum / period;
      } else {
        result[i] = (dataList[i].close * k) + (result[i - 1] * (1 - k));
      }
    }
    return result;
  };

  // MA 簡單移動平均計算函式
  const calculateMaSeries = (dataList: KLineData[], period: number): number[] => {
    if (!dataList || dataList.length === 0) return [];
    const result: number[] = new Array(dataList.length);
    let windowSum = 0;
    for (let i = 0; i < dataList.length; i++) {
      windowSum += dataList[i].close;
      if (i >= period) {
        windowSum -= dataList[i - period].close;
      }
      if (i >= period - 1) {
        result[i] = windowSum / period;
      } else {
        result[i] = NaN;
      }
    }
    return result;
  };

  // BOLL 布林帶計算函式
  const calculateBollSeries = (dataList: KLineData[], period = 20, mult = 2): { mid: number[]; up: number[]; dn: number[] } => {
    const ma = calculateMaSeries(dataList, period);
    const up: number[] = new Array(dataList.length);
    const dn: number[] = new Array(dataList.length);
    for (let i = 0; i < dataList.length; i++) {
      if (i >= period - 1 && !isNaN(ma[i])) {
        let sumSq = 0;
        for (let j = i - period + 1; j <= i; j++) {
          sumSq += Math.pow(dataList[j].close - ma[i], 2);
        }
        const std = Math.sqrt(sumSq / period);
        up[i] = ma[i] + mult * std;
        dn[i] = ma[i] - mult * std;
      } else {
        up[i] = NaN;
        dn[i] = NaN;
      }
    }
    return { mid: ma, up, dn };
  };

  // 當前顯示的 K 棒數據 (優先使用固定K棒或十字線懸停值，預設為最新一筆收盤K棒)
  const displayCandle = pinnedCandle || hoverCandle || (data && data.length > 0 ? data[data.length - 1] : null);
  const isCandleUp = displayCandle ? displayCandle.close >= displayCandle.open : true;
  const candleChangePercent = displayCandle && displayCandle.open > 0
    ? ((displayCandle.close - displayCandle.open) / displayCandle.open) * 100
    : 0;

  // 當前焦點 K 棒在整體序列之索引
  const activeCandleIndex = useMemo(() => {
    if (!displayCandle || !data || data.length === 0) return -1;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].timestamp === displayCandle.timestamp) return i;
    }
    return data.length - 1;
  }, [data, displayCandle]);

  // 快取技術指標數值序列，避免頻繁懸停重複運算
  const indicatorSeriesMap = useMemo(() => {
    if (!data || data.length === 0) return {};
    return {
      ema6: calculateEmaSeries(data, 6),
      ema12: calculateEmaSeries(data, 12),
      ema20: calculateEmaSeries(data, 20),
      ma5: calculateMaSeries(data, 5),
      ma10: calculateMaSeries(data, 10),
      ma20: calculateMaSeries(data, 20),
      ma60: calculateMaSeries(data, 60),
      boll: calculateBollSeries(data, 20, 2),
    };
  }, [data]);

  // 主圖技術指標即時數值平鋪渲染 (置於頂部獨立 DOM 標題列，徹底杜絕與 K 線畫布重疊)
  const renderedMainIndicators = useMemo(() => {
    if (!data || data.length === 0 || mainIndicators.length === 0) return null;
    const idx = activeCandleIndex >= 0 ? activeCandleIndex : data.length - 1;
    const maColors = ['#fbc02d', '#00bcd4', '#e91e63', '#00e676', '#ab47bc'];

    return (
      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] border-l border-[#2e323e] pl-2.5 shrink-0">
        {mainIndicators.map((ind) => {
          if (ind === 'EMA') {
            const val6 = indicatorSeriesMap.ema6?.[idx];
            const val12 = indicatorSeriesMap.ema12?.[idx];
            const val20 = indicatorSeriesMap.ema20?.[idx];
            return (
              <div key="EMA" className="flex items-center gap-1.5 bg-[#1a1d26] px-2 py-0.5 rounded border border-[#2e323e]">
                <span className="text-slate-400 font-bold">EMA(6,12,20)</span>
                {val6 != null && !isNaN(val6) && (
                  <span style={{ color: maColors[0] }} className="font-semibold">
                    EMA6: {val6.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
                {val12 != null && !isNaN(val12) && (
                  <span style={{ color: maColors[1] }} className="font-semibold">
                    EMA12: {val12.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
                {val20 != null && !isNaN(val20) && (
                  <span style={{ color: maColors[2] }} className="font-semibold">
                    EMA20: {val20.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            );
          }

          if (ind === 'MA') {
            const val5 = indicatorSeriesMap.ma5?.[idx];
            const val10 = indicatorSeriesMap.ma10?.[idx];
            const val20 = indicatorSeriesMap.ma20?.[idx];
            const val60 = indicatorSeriesMap.ma60?.[idx];
            return (
              <div key="MA" className="flex items-center gap-1.5 bg-[#1a1d26] px-2 py-0.5 rounded border border-[#2e323e]">
                <span className="text-slate-400 font-bold">MA(5,10,20,60)</span>
                {val5 != null && !isNaN(val5) && (
                  <span style={{ color: maColors[0] }} className="font-semibold">
                    MA5: {val5.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
                {val10 != null && !isNaN(val10) && (
                  <span style={{ color: maColors[1] }} className="font-semibold">
                    MA10: {val10.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
                {val20 != null && !isNaN(val20) && (
                  <span style={{ color: maColors[2] }} className="font-semibold">
                    MA20: {val20.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
                {val60 != null && !isNaN(val60) && (
                  <span style={{ color: maColors[3] }} className="font-semibold">
                    MA60: {val60.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            );
          }

          if (ind === 'BOLL') {
            const boll = indicatorSeriesMap.boll;
            const mid = boll?.mid?.[idx];
            const up = boll?.up?.[idx];
            const dn = boll?.dn?.[idx];
            return (
              <div key="BOLL" className="flex items-center gap-1.5 bg-[#1a1d26] px-2 py-0.5 rounded border border-[#2e323e]">
                <span className="text-slate-400 font-bold">BOLL(20,2)</span>
                {mid != null && !isNaN(mid) && (
                  <span style={{ color: maColors[0] }} className="font-semibold">
                    MID: {mid.toFixed(2)}
                  </span>
                )}
                {up != null && !isNaN(up) && (
                  <span style={{ color: maColors[1] }} className="font-semibold">
                    UP: {up.toFixed(2)}
                  </span>
                )}
                {dn != null && !isNaN(dn) && (
                  <span style={{ color: maColors[4] }} className="font-semibold">
                    DN: {dn.toFixed(2)}
                  </span>
                )}
              </div>
            );
          }

          return (
            <span key={ind} className="text-slate-300 font-semibold px-2 py-0.5 bg-[#1a1d26] rounded border border-[#2e323e]">
              {ind}
            </span>
          );
        })}
      </div>
    );
  }, [data, activeCandleIndex, mainIndicators, indicatorSeriesMap]);

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden bg-pro-bg flex flex-col select-none">
      {/* 🌟 1. 圖表頂部獨立資訊平鋪列 (置於 K 線圖畫布之外！使圖表上邊界下移，徹底消除任何蠟燭/均線與文字重疊) */}
      <div className="w-full px-3 py-1.5 bg-[#141720] border-b border-pro-border/80 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 shrink-0 z-20 select-none text-xs">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          {/* 標的徽章 (代號 + 名稱 + 市場 + 週期) */}
          <div className="flex items-center gap-2 bg-[#1e222d] px-2.5 py-1 rounded-md border border-[#363a45] shrink-0">
            <span className="font-mono font-black text-white text-sm tracking-wider">{symbol}</span>
            {stockName && <span className="font-extrabold text-slate-100 text-xs">{stockName}</span>}
            {market && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border ${getMarketInfo(market).badgeClass}`}>
                {getMarketInfo(market).label}
              </span>
            )}
            {period && (
              <span className="text-xs font-mono font-semibold text-slate-400">· {period}</span>
            )}
          </div>

          {/* 📌 已固定 K 棒資訊卡 (點擊蠟燭固定開/高/低/收，再點一次或按 Esc 解除) */}
          {pinnedCandle ? (
            <div className="flex items-center gap-2 bg-[#181b22] px-2.5 py-1 rounded-md border border-amber-500/60 shadow-md text-xs shrink-0 animate-in fade-in">
              <div className="flex items-center gap-1 text-amber-400 font-bold shrink-0">
                <Pin size={12} className="fill-amber-400 text-amber-400" />
                <span>已固定K棒</span>
              </div>
              <span className="text-slate-300 font-mono text-[11px]">
                {formatBarDateTime(pinnedCandle.timestamp)}
              </span>
              <span className="text-slate-400">開 <b className="text-white font-mono">{pinnedCandle.open.toFixed(2)}</b></span>
              <span className="text-slate-400">高 <b className="text-emerald-400 font-mono">{pinnedCandle.high.toFixed(2)}</b></span>
              <span className="text-slate-400">低 <b className="text-rose-400 font-mono">{pinnedCandle.low.toFixed(2)}</b></span>
              <span className="text-slate-400">收 <b className="text-white font-mono">{pinnedCandle.close.toFixed(2)}</b></span>
              <span className={`font-mono font-bold ${pinnedCandle.close >= pinnedCandle.open ? 'text-pro-up' : 'text-pro-down'}`}>
                {pinnedCandle.close >= pinnedCandle.open ? '+' : ''}
                {((pinnedCandle.close - pinnedCandle.open) / pinnedCandle.open * 100).toFixed(2)}%
              </span>
              {pinnedCandle.volume !== undefined && (
                <span className="text-slate-400 hidden sm:inline">量 <b className="text-slate-200 font-mono">{formatVolume(pinnedCandle.volume)}</b></span>
              )}
              <button
                onClick={() => setPinnedCandle(null)}
                className="ml-1 p-0.5 rounded hover:bg-pro-hover text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="解除固定 (Esc)"
              >
                <X size={13} />
              </button>
            </div>
          ) : displayCandle ? (
            /* 即時十字線或最新 K 棒 OHLCV 數據列 */
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs font-mono">
              <span className="text-slate-400 text-[11px]">
                時間 <span className="text-slate-200">{formatBarDateTime(displayCandle.timestamp)}</span>
              </span>
              <span className="text-slate-400 text-[11px]">
                開 <span className="text-white font-bold">{displayCandle.open.toFixed(2)}</span>
              </span>
              <span className="text-slate-400 text-[11px]">
                高 <span className="text-emerald-400 font-bold">{displayCandle.high.toFixed(2)}</span>
              </span>
              <span className="text-slate-400 text-[11px]">
                低 <span className="text-rose-400 font-bold">{displayCandle.low.toFixed(2)}</span>
              </span>
              <span className="text-slate-400 text-[11px]">
                收 <span className="text-white font-bold">{displayCandle.close.toFixed(2)}</span>
              </span>
              <span className={`text-[11px] font-bold ${isCandleUp ? 'text-pro-up' : 'text-pro-down'}`}>
                漲幅 {isCandleUp ? '+' : ''}{candleChangePercent.toFixed(2)}%
              </span>
              {displayCandle.volume !== undefined && (
                <span className="text-slate-400 text-[11px]">
                  量 <span className="text-slate-200">{formatVolume(displayCandle.volume)}</span>
                </span>
              )}
            </div>
          ) : null}

          {/* 主圖技術指標即時數值 (MA, EMA, BOLL 等，平鋪於獨立列) */}
          {renderedMainIndicators}
        </div>

        {/* 右側：看盤輔助提示 */}
        <div className="text-[11px] text-pro-muted shrink-0 hidden xl:flex items-center gap-2 font-mono">
          <span>點擊K棒鎖定 · 雙擊重設</span>
        </div>
      </div>

      {/* 🌟 2. 下方主工作區 (包含左側VP、主K線圖畫布、副屏對比) */}
      <div className="flex-1 w-full relative overflow-hidden flex flex-row">
        {/* SMC 機構訂單流浮層 HUD */}
        {showSMC && smcResult && (
          <div className={`absolute top-2 ${showVolumeProfile ? 'right-88' : 'right-20'} z-20 bg-pro-panel/95 backdrop-blur-md border border-emerald-500/40 rounded-xl p-3 shadow-2xl w-72 text-xs select-none animate-in fade-in duration-200`}>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-pro-border/60">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                SMC 機構訂單流 (Order Flow)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-semibold">
                  {smcResult.structureStatus}
                </span>
                <button
                  onClick={() => toggleSMC()}
                  className="text-pro-muted hover:text-white p-0.5 rounded hover:bg-pro-hover transition-colors"
                  title="關閉 SMC 卡片"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 機構關鍵支撐與阻力 */}
            <div className="space-y-1 mb-2.5 text-[11px]">
              <div className="flex justify-between items-center text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                <span className="flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> 機構核心支撐 (FVG CE):</span>
                <span className="font-mono font-bold">${smcResult.nearestSupport != null ? smcResult.nearestSupport.toFixed(2) : '---'}</span>
              </div>
              <div className="flex justify-between items-center text-rose-400 font-semibold bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                <span className="flex items-center gap-1"><Target className="w-3 h-3" /> 機構核心壓力 (阻力):</span>
                <span className="font-mono font-bold">${smcResult.nearestResistance != null ? smcResult.nearestResistance.toFixed(2) : '---'}</span>
              </div>
            </div>

            {/* FVG 缺口清單 */}
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              <div className="text-[10px] text-pro-muted font-bold flex justify-between">
                <span>FVG 價值失衡缺口</span>
                <span>CE 中軸 (50%)</span>
              </div>
              {smcResult.fvgs.length === 0 ? (
                <div className="text-[10px] text-pro-muted py-2 text-center">當前週期未發現顯著機構失衡缺口</div>
              ) : (
                smcResult.fvgs.slice(-4).reverse().map((g, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[10px] bg-pro-bg/50 px-1.5 py-0.5 rounded">
                    <div className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${g.type === 'bullish' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <span className={g.type === 'bullish' ? 'text-emerald-400' : 'text-rose-400'}>
                        {g.type === 'bullish' ? '看漲 FVG' : '看跌 FVG'}
                      </span>
                      {g.isMitigated && <span className="text-[9px] text-pro-muted bg-white/5 px-1 rounded">已回踩</span>}
                    </div>
                    <span className="font-mono font-bold text-white">${g.consequentEncroachment}</span>
                  </div>
                ))
              )}
            </div>

            {/* 實戰筆記 */}
            <div className="mt-2 pt-2 border-t border-pro-border/40 text-[10px] text-pro-muted flex items-start gap-1">
              <Info className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
              <span>【實戰筆記】：看多缺口為買盤失衡吸籌區，價格回踩 50% CE 中軸通常具備支撐動能，適合耐心等待確認後再行動。</span>
            </div>
          </div>
        )}

        {/* Volume Profile 籌碼分佈浮層 HUD (避開右側 80px 刻度軸，並提供清楚的關閉按鈕) */}
        {showVolumeProfile && vpResult && (
          <div className="absolute top-2 right-20 z-20 bg-pro-panel/95 backdrop-blur-md border border-pro-border rounded-xl p-3 shadow-2xl w-64 text-xs select-none animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-pro-border/60">
              <span className="font-bold text-white flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
                籌碼成交量分佈 (Volume Profile)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-semibold">
                  VA 70%
                </span>
                <button
                  onClick={() => toggleVolumeProfile()}
                  className="text-pro-muted hover:text-white p-0.5 rounded hover:bg-pro-hover transition-colors"
                  title="關閉籌碼分佈"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* POC & VAH / VAL 核心價位標記 */}
            <div className="space-y-1 mb-2.5 text-[11px]">
              <div className="flex justify-between items-center text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                <span>POC 主力成本線:</span>
                <span className="font-mono font-bold">${vpResult.poc}</span>
              </div>
              <div className="flex justify-between items-center text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded">
                <span>VAH 價值區間上限:</span>
                <span className="font-mono">${vpResult.vah}</span>
              </div>
              <div className="flex justify-between items-center text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded">
                <span>VAL 價值區間下限:</span>
                <span className="font-mono">${vpResult.val}</span>
              </div>
            </div>

            {/* 價位量能條狀分佈圖 */}
            <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
              {vpResult.tiers.slice().reverse().map((t, idx) => {
                const isPOC = t.price === vpResult.poc;
                const inValueArea = t.price >= vpResult.val && t.price <= vpResult.vah;
                return (
                  <div key={idx} className="flex items-center gap-1.5 text-[10px] group hover:bg-pro-bg/50 px-1 py-0.5 rounded">
                    <span className={`w-14 text-right font-mono ${isPOC ? 'text-amber-400 font-bold' : inValueArea ? 'text-purple-300' : 'text-pro-muted'}`}>
                      ${t.price}
                    </span>
                    <div className="flex-1 h-2 bg-pro-bg/80 rounded-sm overflow-hidden flex items-center">
                      <div
                        className={`h-full rounded-sm transition-all ${
                          isPOC
                            ? 'bg-amber-400'
                            : inValueArea
                            ? 'bg-purple-500/70'
                            : 'bg-blue-500/40'
                        }`}
                        style={{ width: `${Math.max(2, t.percent)}%` }}
                      />
                    </div>
                    <span className="w-8 text-[9px] text-pro-muted text-right font-mono">{t.percent}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 主圖畫布區 (完全位於獨立頂部平鋪列下方，蠟燭永遠不會遮蔽資訊) */}
        <div className={`h-full relative overflow-hidden ${isDualSplit ? 'w-1/2 border-r border-pro-border' : 'w-full'}`}>
          {/* 圖表背景大字浮水印 (純淨低透 4%，無發光) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-0 opacity-[0.04] overflow-hidden">
            <span className="text-7xl sm:text-9xl font-black font-mono tracking-widest text-white leading-none">
              {symbol}
            </span>
            {stockName && (
              <span className="text-3xl sm:text-5xl font-black text-white mt-3 tracking-wider">
                {stockName}
              </span>
            )}
          </div>

          <div ref={containerRef} className="w-full h-full relative z-1" />
        </div>

        {/* 雙屏分時圖畫布 */}
        {isDualSplit && (
          <div className="w-1/2 h-full relative bg-pro-bg/40 overflow-hidden">
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-0 opacity-[0.03]">
              <span className="text-6xl sm:text-8xl font-black font-mono tracking-widest text-white leading-none">
                {symbol}
              </span>
            </div>
            <div className="absolute top-2 left-3 z-10 text-xs font-bold text-slate-200 bg-[#1e222d]/90 backdrop-blur-sm px-2.5 py-1 rounded border border-[#363a45] shadow-sm flex items-center gap-1.5 pointer-events-none select-none">
              <span className="text-white font-mono font-black">{symbol}</span>
              {stockName && <span className="text-slate-100">{stockName}</span>}
              <span className="text-pro-muted font-normal">· 副屏分時同步</span>
            </div>
            <div ref={secondaryContainerRef} className="w-full h-full relative z-1" />
          </div>
        )}
      </div>
    </div>
  );
};
