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
import { ColorTheme, DrawingToolType } from '../types/stock';
import { calculateVolumeProfile } from '../utils/volumeProfile';
import { analyzeSMC } from '../utils/smcAnalysis';
import { BarChart2, X, Zap, ShieldAlert, Target, Info } from 'lucide-react';
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

interface ChartContainerProps {
  symbol: string;
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
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  symbol,
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
            showRule: TooltipShowRule.Always,
            showType: TooltipShowType.Standard,
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
            high: { show: true, color: '#d1d4dc', textOffset: 5, textSize: 10 },
            low: { show: true, color: '#d1d4dc', textOffset: 5, textSize: 10 },
            last: {
              show: true,
              upColor,
              downColor,
              noChangeColor: '#888888',
              line: { show: true, style: LineType.Dashed, dashedValue: [4, 2] },
              text: { show: true, size: 11, color: '#ffffff' },
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
            { style: LineType.Solid, smooth: false, size: 1.5, color: '#fbc02d' }, // MA5 (金絲雀黃)
            { style: LineType.Solid, smooth: false, size: 1.5, color: '#00bcd4' }, // MA10 (晴空青)
            { style: LineType.Solid, smooth: false, size: 1.5, color: '#e91e63' }, // MA20 (螢光洋紅生命線)
            { style: LineType.Solid, smooth: false, size: 1.5, color: '#00e676' }, // MA60 (翡翠綠季線)
            { style: LineType.Solid, smooth: false, size: 1.5, color: '#ab47bc' }, // MA120 (皇家紫半年線)
          ],
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

    // 設定緊湊平滑的右側邊距與滾動距離邊界，徹底防止 K 線拖曳到出現大片黑底空洞 (元大證券緊湊體驗)
    chart.setOffsetRightDistance(50);
    chart.setMaxOffsetLeftDistance(50);
    chart.setMaxOffsetRightDistance(60);

    const calcMinBarSpace = (el: HTMLElement | null) => {
      const cWidth = el?.clientWidth || 800;
      const count = dataRef.current?.length || 150;
      // 動態縮放限制：
      // 確保 K 線縮圖時不會過度縮小成一團縮在畫面中央
      const spanSpace = Math.max(3.5, (cWidth - 100) / Math.max(count, 30));
      return Math.max(3.5, Math.min(8.0, spanSpace));
    };

    // 監聽滾輪縮放：在捕獲階段限制最小與最大 K 線寬度，防止縮在中央
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        const curSpace = chart.getBarSpace();
        const minSpace = calcMinBarSpace(containerRef.current);
        const maxSpace = 40;

        // 向下滾動 (deltaY > 0) 為縮小 K 線 (Zoom Out)
        if (e.deltaY > 0 && curSpace <= minSpace) {
          e.preventDefault();
          e.stopPropagation();
          chart.setBarSpace(minSpace);
          return;
        }

        // 向上滾動 (deltaY < 0) 為放大 K 線 (Zoom In)
        if (e.deltaY < 0 && curSpace >= maxSpace) {
          e.preventDefault();
          e.stopPropagation();
          chart.setBarSpace(maxSpace);
          return;
        }
      }
    };
    const cEl = containerRef.current;
    cEl?.addEventListener('wheel', handleWheel, { capture: true, passive: false });

    // 訂閱縮放事件作為第二道防護
    chart.subscribeAction(ActionType.OnZoom, () => {
      const curSpace = chart.getBarSpace();
      const minSpace = calcMinBarSpace(containerRef.current);
      if (curSpace < minSpace) {
        chart.setBarSpace(minSpace);
      } else if (curSpace > 40) {
        chart.setBarSpace(40);
      }
    });

    const handleResize = () => {
      chart?.resize();
      secondaryChartRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    // 透過 ResizeObserver 監聽容器寬度變化 (如側邊欄收合、雙屏分欄)
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        chart?.resize();
        secondaryChartRef.current?.resize();
      });
      resizeObserver.observe(containerRef.current);
    }

    const handleDblClick = () => {
      chart?.setBarSpace(8);
      chart?.setOffsetRightDistance(50);
      chart?.setMaxOffsetLeftDistance(50);
      chart?.setMaxOffsetRightDistance(60);
      chart?.scrollByDistance(0);
      chart?.resize();
    };
    cEl?.addEventListener('dblclick', handleDblClick);

    return () => {
      window.removeEventListener('resize', handleResize);
      cEl?.removeEventListener('wheel', handleWheel, { capture: true } as any);
      cEl?.removeEventListener('dblclick', handleDblClick);
      resizeObserver?.disconnect();
      if (containerRef.current) {
        dispose(containerRef.current);
      }
      chartRef.current = null;
    };
  }, []);

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
            showRule: TooltipShowRule.Always,
            showType: TooltipShowType.Standard,
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
        },
      },
    });

    secondaryChartRef.current = secChart;

    const secData = secondaryData && secondaryData.length > 0 ? secondaryData : data.slice(-100);
    secChart?.applyNewData(secData);
    secChart?.setOffsetRightDistance(50);
    secChart?.setMaxOffsetLeftDistance(50);
    secChart?.setMaxOffsetRightDistance(60);

    return () => {
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
    chartRef.current.setOffsetRightDistance(50);
    chartRef.current.setMaxOffsetLeftDistance(50);
    chartRef.current.setMaxOffsetRightDistance(60);
    const cWidth = containerRef.current?.clientWidth || 800;
    const spanSpace = Math.max(3.5, (cWidth - 100) / Math.max(data.length, 30));
    const minSpace = Math.max(3.5, Math.min(8.0, spanSpace));
    if (chartRef.current.getBarSpace() < minSpace) {
      chartRef.current.setBarSpace(minSpace);
    }
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
      } catch (e) {
        console.warn(`Could not create main indicator ${id}:`, e);
      }
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
          const paneId = chart.createIndicator(name, false);
          if (paneId) {
            subPanesRef.current.set(name, paneId);
          }
        } catch (e) {
          console.warn(`Could not create sub indicator ${name}:`, e);
        }
      }
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

    try {
      chart.createOverlay({
        name: activeTool,
        mode: mode,
        styles: overlayStyles,
        onDrawEnd: (e: any) => {
          if (e?.overlay) {
            const enriched = enrichPointsWithCandles(e.overlay.points, dataRef.current);
            const newDrawing: StoredDrawing = {
              id: e.overlay.id,
              name: activeTool,
              color: chosenColor,
              points: enriched,
              styles: overlayStyles,
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
    } catch (e) {
      console.warn(`Error activating drawing tool ${activeTool}:`, e);
    }
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

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden bg-pro-bg flex flex-row">
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
              <span className="font-mono font-bold">{smcResult.nearestSupport ? `$${smcResult.nearestSupport}` : '暫無下方失衡'}</span>
            </div>
            <div className="flex justify-between items-center text-rose-400 font-semibold bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
              <span className="flex items-center gap-1"><Target className="w-3 h-3" /> 機構拋壓阻力 (FVG CE):</span>
              <span className="font-mono font-bold">{smcResult.nearestResistance ? `$${smcResult.nearestResistance}` : '上方無壓空曠'}</span>
            </div>
          </div>

          {/* 價值失衡區 (FVG) 清單 */}
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            <div className="text-[10px] text-pro-muted font-bold flex justify-between">
              <span>偵測到之失衡區塊 (FVG)</span>
              <span>50% 吸引線 (CE)</span>
            </div>
            {smcResult.fvgs.length === 0 ? (
              <div className="text-[11px] text-pro-muted text-center py-2">目前無明顯失衡缺口</div>
            ) : (
              smcResult.fvgs.map((g) => (
                <div key={g.id} className="flex items-center justify-between p-1.5 rounded bg-pro-bg/60 border border-pro-border/50 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${g.type === 'bullish' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                    <span className={g.type === 'bullish' ? 'text-emerald-300 font-medium' : 'text-rose-300 font-medium'}>
                      {g.type === 'bullish' ? '看漲 FVG' : '看跌 FVG'}
                    </span>
                    {g.isMitigated && <span className="text-[9px] text-pro-muted bg-white/5 px-1 rounded">已回踩</span>}
                  </div>
                  <span className="font-mono font-bold text-white">${g.consequentEncroachment}</span>
                </div>
              ))
            )}
          </div>

          {/* 小白速懂指南 */}
          <div className="mt-2 pt-2 border-t border-pro-border/40 text-[10px] text-pro-muted flex items-start gap-1">
            <Info className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
            <span>【小白指南】：綠色缺口為主力強力吸籌區，價格回踩 50% CE 線常有強彈支撐，切忌追高，等踩穩再上車！</span>
          </div>
        </div>
      )}

      {/* Volume Profile 籌碼分佈浮層 HUD (避開右側 80px 刻度軸，並提供清楚的關閉按鈕) */}
      {showVolumeProfile && vpResult && (
        <div className="absolute top-2 right-20 z-20 bg-pro-panel/95 backdrop-blur-md border border-pro-border rounded-xl p-3 shadow-2xl w-64 text-xs select-none animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-pro-border/60">
            <span className="font-bold text-white flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
              籌碼成交量分佈 (VP)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-pro-muted">70% 價值區</span>
              <button
                onClick={() => toggleVolumeProfile()}
                className="text-pro-muted hover:text-white p-0.5 rounded hover:bg-pro-hover transition-colors"
                title="關閉籌碼分佈卡片"
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

      {/* 主圖畫布 */}
      <div className={`h-full relative ${isDualSplit ? 'w-1/2 border-r border-pro-border' : 'w-full'}`}>
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* 雙屏分時圖畫布 */}
      {isDualSplit && (
        <div className="w-1/2 h-full relative bg-pro-bg/40">
          <div className="absolute top-3 left-4 z-10 text-[11px] font-semibold text-pro-muted bg-pro-panel/80 px-2 py-0.5 rounded border border-pro-border">
            副屏 (短週期分時同步視圖)
          </div>
          <div ref={secondaryContainerRef} className="w-full h-full" />
        </div>
      )}
    </div>
  );
};
