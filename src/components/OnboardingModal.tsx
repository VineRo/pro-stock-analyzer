import React, { useState } from 'react';
import { 
  X, 
  Compass, 
  Globe, 
  CandlestickChart, 
  Square, 
  Sparkles, 
  Zap, 
  Keyboard, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  SlidersHorizontal, 
  BarChart2, 
  Building2, 
  Wallet, 
  Bell, 
  Pin, 
  BookOpen,
  TrendingUp,
  Magnet
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenScreener?: () => void;
  onOpenBacktest?: () => void;
  onOpenFundamentals?: () => void;
  onOpenPaperTrading?: () => void;
  onOpenAlerts?: () => void;
  onOpenIndicators?: () => void;
  onOpenShortcuts?: () => void;
  onOpenEducation?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onOpenScreener,
  onOpenBacktest,
  onOpenFundamentals,
  onOpenPaperTrading,
  onOpenAlerts,
  onOpenIndicators,
  onOpenShortcuts,
  onOpenEducation,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleFinish = () => {
    if (dontShowAgain) {
      localStorage.setItem('prostock_onboarding_shown', 'true');
    }
    onClose();
  };

  const steps = [
    {
      id: 'markets',
      title: '多市場標的與快速搜尋',
      subtitle: '台股全市場名冊 · 美股主流標的 · 全球大盤看板 · 加密貨幣',
      icon: <Globe className="w-5 h-5 text-blue-400" />,
      tag: '市場分類',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            整合台股、美股、全球指數與加密貨幣，頂部提供獨立分類按鈕方便隨時切換：
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-[#1e222d] border border-[#2e323e] p-3 rounded-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base">🇹🇼</span>
                <span className="font-bold text-white text-sm">國內股票 (台股)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  2,344 檔收錄
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                同步臺灣證交所與櫃買中心名冊，涵蓋上市櫃、創新板與各類熱門 ETF。支援代碼、中文名稱與簡稱即時搜尋。
              </p>
            </div>

            <div className="bg-[#1e222d] border border-[#2e323e] p-3 rounded-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base">🇺🇸</span>
                <span className="font-bold text-white text-sm">國外股票 (美股)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                  即時快取
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                收錄科技權值與主流標的（如 AAPL、MSFT、NVDA、TSLA 等），輸入代號即自動連線載入報價與歷史走勢。
              </p>
            </div>

            <div className="bg-[#1e222d] border border-[#2e323e] p-3 rounded-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base">🌐</span>
                <span className="font-bold text-white text-sm">大盤指數看板</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                  時段狀態
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                涵蓋台股加權、日經225、美股標普/道瓊/費半等全球主要指數，直觀呈現開盤、盤後與收盤狀態。
              </p>
            </div>

            <div className="bg-[#1e222d] border border-[#2e323e] p-3 rounded-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base">🪙</span>
                <span className="font-bold text-white text-sm">虛擬貨幣 (Crypto)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                  24/7 全天候
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                收錄 BTC、ETH、SOL 等主流加密資產，全天候連續即時報價，輔助跨市場觀察資金流向。
              </p>
            </div>
          </div>

          <div className="p-3 bg-blue-950/30 border border-blue-500/30 rounded-xl flex items-start gap-2.5 text-xs text-blue-200">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white">搜尋捷徑提示：</span>
              隨時在鍵盤按下 <kbd className="px-1.5 py-0.5 bg-[#1e222d] border border-blue-400/40 rounded text-blue-300 font-mono font-bold">/</kbd> 鍵，即可快速聚焦搜尋框，直接輸入代碼或名稱快速切換標的。
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'kline',
      title: 'K 線圖表與數據展示',
      subtitle: '全景自適應 · 雙擊視角還原 · 點選固定 K 棒 · 現價水平線',
      icon: <CandlestickChart className="w-5 h-5 text-emerald-400" />,
      tag: '核心圖表',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            專為專業看盤打造的高效能技術圖表核心，提供流暢的走勢縮放、即時的數據呈現與無干擾的視覺體驗：
          </p>

          <div className="space-y-2.5">
            <div className="p-3 bg-[#1e222d] border border-[#2e323e] rounded-xl flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">全景自適應縮放與雙擊還原視角</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-normal">
                  支援滾輪自由縮放走勢細節；在圖表任意空白處「雙擊左鍵」即可瞬間還原為最佳全景視野，操作直覺高效。
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#1e222d] border border-[#2e323e] rounded-xl flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                <Pin size={16} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">📌 點擊任意 K 棒固定數據卡</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-normal">
                  點選任一根 K 棒，頂部即彈出「已固定 K 棒」資訊，鎖定該時間點的開高低收、漲跌幅與成交量，方便波段對比；再點擊一次或按 <kbd className="px-1.5 py-0.2 bg-[#2a2e39] rounded font-mono text-white">Esc</kbd> 即可取消鎖定。
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#1e222d] border border-[#2e323e] rounded-xl flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 shrink-0 mt-0.5">
                <TrendingUp size={16} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">現價水平參考線開關</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-normal">
                  左側工具列提供專屬按鈕，可自由切換是否顯示最新成交價的水平橫線，維持盤面簡潔。
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#1e222d] border border-[#2e323e] rounded-xl flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
                <SlidersHorizontal size={16} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">頂部整合式 OHLCV 資訊列</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-normal">
                  將時間、開高低收、漲跌幅與成交量集中平鋪於頂部，避免浮動視窗遮蔽圖表走勢。
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'drawing',
      title: '左側繪圖工具箱',
      subtitle: '磁吸輔助 · 獨立標的記憶 · 趨勢線 · 水平線 · 斐波那契 · 矩形箱體',
      icon: <Square className="w-5 h-5 text-amber-400" />,
      tag: '畫線工具',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            畫面左側工具列提供常用的幾何與趨勢分析工具，支援各標的獨立記憶：
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs mb-1">
                <Magnet size={14} className="text-amber-400" />
                <span>磁吸模式 (M)</span>
              </div>
              <p className="text-[11px] text-slate-400">自動吸附 K 棒高低點，畫線更精確。</p>
            </div>

            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs mb-1">
                <span className="text-blue-400 font-mono font-bold">／</span>
                <span>趨勢線 (Alt+T)</span>
              </div>
              <p className="text-[11px] text-slate-400">連接關鍵高低點，判斷趨勢方向。</p>
            </div>

            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs mb-1">
                <span className="text-rose-400 font-mono font-bold">―</span>
                <span>水平線 (Alt+H)</span>
              </div>
              <p className="text-[11px] text-slate-400">標註關鍵支撐位與壓力位。</p>
            </div>

            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs mb-1">
                <span className="text-purple-400 font-mono font-bold">≡</span>
                <span>斐波那契回撤 (Alt+F)</span>
              </div>
              <p className="text-[11px] text-slate-400">黃金分割比例 (0.382/0.5/0.618) 觀察回檔位。</p>
            </div>

            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs mb-1">
                <Square size={13} className="text-emerald-400" />
                <span>矩形箱體</span>
              </div>
              <p className="text-[11px] text-slate-400">標註區間整理或平台盤整範圍。</p>
            </div>

            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs mb-1">
                <span className="text-cyan-400 font-mono font-bold">T</span>
                <span>文字標註</span>
              </div>
              <p className="text-[11px] text-slate-400">在關鍵轉折處記錄交易筆記與提醒。</p>
            </div>
          </div>

          <div className="p-3 bg-[#1e222d] border border-[#2e323e] rounded-xl space-y-1.5 text-xs text-slate-300">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              <span>獨立標的畫線記憶與除權息校準</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              每檔標的擁有專屬畫線紀錄，切換標的時不會相互干擾；遇價格除權息折算時，亦會自動按比例校準歷史座標。
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'flagship',
      title: '輔助量化分析工具',
      subtitle: '條件選股 · 歷史回測 · 財務體質 · 模擬交易 · 價格警報',
      icon: <Sparkles className="w-5 h-5 text-purple-400" />,
      tag: '進階功能',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            點擊頂部導航列的「分析工具」，可隨時開啟進階分析與交易輔助模組：
          </p>

          <div className="space-y-2.5">
            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <SlidersHorizontal size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">條件選股器 (Screener)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">多條件篩選：均線黃金交叉、成交放量突破、RSI 超賣反彈等。</p>
                </div>
              </div>
              {onOpenScreener && (
                <button
                  onClick={() => { onClose(); onOpenScreener(); }}
                  className="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors shrink-0"
                >
                  立即開啟
                </button>
              )}
            </div>

            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <BarChart2 size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">策略回測中心 (Backtest Engine)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">以歷史數據回溯檢驗策略，計算總報酬率、勝率、最大回撤 (MDD) 與夏普值。</p>
                </div>
              </div>
              {onOpenBacktest && (
                <button
                  onClick={() => { onClose(); onOpenBacktest(); }}
                  className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors shrink-0"
                >
                  開啟回測
                </button>
              )}
            </div>

            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Building2 size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">個股基本面估值 (Fundamental Health)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">營收成長、ROE、負債比、本益比河流圖與 DCF 估值模型。</p>
                </div>
              </div>
              {onOpenFundamentals && (
                <button
                  onClick={() => { onClose(); onOpenFundamentals(); }}
                  className="px-2.5 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors shrink-0"
                >
                  檢視數據
                </button>
              )}
            </div>

            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Wallet size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">模擬交易 (Paper Trading)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">提供 100 萬虛擬資金，用於驗證進出場策略與交易紀律。</p>
                </div>
              </div>
              {onOpenPaperTrading && (
                <button
                  onClick={() => { onClose(); onOpenPaperTrading(); }}
                  className="px-2.5 py-1 text-xs bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors shrink-0"
                >
                  開始模擬
                </button>
              )}
            </div>

            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                  <Bell size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">價格警報中心 (Price Alerts)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">設定目標價位突破或跌破提醒，到達條件時即時發送桌面通知。</p>
                </div>
              </div>
              {onOpenAlerts && (
                <button
                  onClick={() => { onClose(); onOpenAlerts(); }}
                  className="px-2.5 py-1 text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg transition-colors shrink-0"
                >
                  設定警報
                </button>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'smc',
      title: '籌碼分佈與訂單流工具',
      subtitle: '成交量分佈 (VP) · 成交量加權均價 (VWAP) · 訂單塊 · 結構轉折',
      icon: <Zap className="w-5 h-5 text-emerald-400" />,
      tag: '籌碼結構',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            除了傳統技術指標外，提供以成交量分佈與市場結構為核心的分析工具：
          </p>

          <div className="space-y-3">
            <div className="p-3 bg-[#1e222d] border border-[#2e323e] rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                  <BarChart2 size={16} className="text-blue-400" />
                  Volume Profile (VP) 籌碼分佈圖
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded font-mono font-bold">
                  快速鍵: VP 按鈕
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                在價格軸繪製成交量分佈直方圖，標記籌碼密集區 (POC) 與 70% 價值區 (VAH / VAL)，輔助判斷關鍵支撐阻力。
              </p>
            </div>

            <div className="p-3 bg-[#1e222d] border border-[#2e323e] rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                  <TrendingUp size={16} className="text-amber-400" />
                  VWAP 成交量加權平均價
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-mono font-bold">
                  均價基準
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                盤中重要的加權均價基準。價格在 VWAP 之上代表多方動能佔優，跌破 VWAP 則提示短線回檔。
              </p>
            </div>

            <div className="p-3 bg-[#1e222d] border border-[#2e323e] rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                  <Zap size={16} className="text-emerald-400" />
                  SMC (Smart Money Concepts) 結構分析
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-mono font-bold">
                  結構分析
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                標註價值失衡區 (FVG)、訂單塊 (Order Block) 與結構轉折 (BOS / CHoCH)，協助觀察市場流動性與關鍵轉折位。
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'shortcuts',
      title: '全域鍵盤操作與看盤介面',
      subtitle: '全域快捷操作 · 漲跌配色切換 · 技術指標指南',
      icon: <Keyboard className="w-5 h-5 text-cyan-400" />,
      tag: '操作設定',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            支援「鍵盤優先 (Keyboard-First)」操作流程，各項快捷按鍵均可於快捷鍵中心依個人習慣自訂：
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl flex items-center justify-between">
              <span className="text-slate-300">聚焦股票搜尋</span>
              <kbd className="px-2 py-0.5 bg-[#2a2e39] text-amber-300 font-mono font-bold rounded border border-[#3e4250]">/</kbd>
            </div>

            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl flex items-center justify-between">
              <span className="text-slate-300">切換時間週期</span>
              <div className="flex gap-1">
                <kbd className="px-1.5 py-0.5 bg-[#2a2e39] text-white font-mono rounded">1</kbd>
                <kbd className="px-1.5 py-0.5 bg-[#2a2e39] text-white font-mono rounded">5</kbd>
                <kbd className="px-1.5 py-0.5 bg-[#2a2e39] text-white font-mono rounded">D</kbd>
                <kbd className="px-1.5 py-0.5 bg-[#2a2e39] text-white font-mono rounded">W</kbd>
              </div>
            </div>

            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl flex items-center justify-between">
              <span className="text-slate-300">切換漲跌色彩習慣</span>
              <kbd className="px-2 py-0.5 bg-[#2a2e39] text-emerald-300 font-mono font-bold rounded border border-[#3e4250]">C</kbd>
            </div>

            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl flex items-center justify-between">
              <span className="text-slate-300">展開 / 收合自選清單</span>
              <kbd className="px-2 py-0.5 bg-[#2a2e39] text-cyan-300 font-mono font-bold rounded border border-[#3e4250]">Tab</kbd>
            </div>

            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl flex items-center justify-between">
              <span className="text-slate-300">全螢幕沉浸看盤</span>
              <kbd className="px-2 py-0.5 bg-[#2a2e39] text-purple-300 font-mono font-bold rounded border border-[#3e4250]">F</kbd>
            </div>

            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl flex items-center justify-between">
              <span className="text-slate-300">取消固定 / 退出畫線</span>
              <kbd className="px-2 py-0.5 bg-[#2a2e39] text-rose-300 font-mono font-bold rounded border border-[#3e4250]">Esc</kbd>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2 pt-1">
            {onOpenIndicators && (
              <button
                onClick={() => { onClose(); onOpenIndicators(); }}
                className="flex-1 py-2 px-3 bg-[#1e222d] hover:bg-pro-hover border border-[#2e323e] text-white text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer font-medium"
              >
                <SlidersHorizontal size={14} className="text-pro-accent" />
                <span>指標庫 (I)</span>
              </button>
            )}
            {onOpenShortcuts && (
              <button
                onClick={() => { onClose(); onOpenShortcuts(); }}
                className="flex-1 py-2 px-3 bg-[#1e222d] hover:bg-pro-hover border border-[#2e323e] text-white text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer font-medium"
              >
                <Keyboard size={14} className="text-pro-accent" />
                <span>快捷鍵 (K)</span>
              </button>
            )}
            {onOpenEducation && (
              <button
                onClick={() => { onClose(); onOpenEducation(); }}
                className="flex-1 py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer font-medium"
              >
                <BookOpen size={14} />
                <span>指標指南 (?)</span>
              </button>
            )}
          </div>
        </div>
      ),
    },
  ];

  const current = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="bg-[#181b22] border border-[#2e323e] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* 彈窗頂部標題列 */}
        <div className="px-6 py-4 border-b border-[#2e323e] flex items-center justify-between bg-[#14171f]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Compass size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-base tracking-wide">ProStock Analyzer 功能導覽</h3>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                  使用手冊
                </span>
              </div>
              <p className="text-xs text-slate-400">快速了解技術分析工具的核心操作與功能配置</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-pro-hover transition-colors cursor-pointer"
            title="關閉導覽"
          >
            <X size={18} />
          </button>
        </div>

        {/* 步驟分頁導航標籤列 */}
        <div className="px-6 py-2.5 bg-[#14171f] border-b border-[#2e323e] flex items-center gap-1.5 overflow-x-auto">
          {steps.map((step, idx) => {
            const isActive = idx === currentStep;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(idx)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold border-blue-500 shadow-sm'
                    : 'bg-[#1e222d]/60 text-slate-400 border-transparent hover:text-white hover:bg-[#1e222d]'
                }`}
              >
                <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-mono font-bold ${
                  isActive ? 'bg-white text-blue-600' : 'bg-slate-700 text-slate-300'
                }`}>
                  {idx + 1}
                </span>
                <span>{step.tag}</span>
              </button>
            );
          })}
        </div>

        {/* 導覽主內容區 */}
        <div className="p-6 flex-1 overflow-y-auto min-h-[380px]">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#2e323e]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#1e222d] border border-[#2e323e]">
                {current.icon}
              </div>
              <div>
                <h4 className="text-base font-black text-white">{current.title}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{current.subtitle}</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">
              {currentStep + 1} / {steps.length}
            </span>
          </div>

          {current.content}
        </div>

        {/* 底部導航與完成控制列 */}
        <div className="px-6 py-3.5 bg-[#14171f] border-t border-[#2e323e] flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-[#1e222d] border-[#2e323e] text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>下次啟動時不再自動顯示此導覽</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#2e323e] bg-[#1e222d] hover:bg-pro-hover text-slate-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>上一步</span>
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
              >
                <span>下一步</span>
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>完成並開始看盤</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
