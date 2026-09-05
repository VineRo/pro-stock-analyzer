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
      title: '四大核心市場與全市場秒搜',
      subtitle: '台股 2,344 檔官方名冊秒查 · 美股 · 全球大盤看板 · 虛擬貨幣',
      icon: <Globe className="w-5 h-5 text-blue-400" />,
      tag: '市場分類',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            ProStock Analyzer 整合四大全球金融交易市場，頂部提供純淨高對比的獨立分頁按鈕，隨時一鍵無縫切換：
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
                完整同步臺灣證券交易所 (TWSE) 與櫃買中心 (TPEx) 官方全市場名冊。包含上市櫃、創新板、高股息 ETF (0050, 0056, 00878, 00919, 00940) 與中裕、保瑞、世芯等生技與高價股，繁中名稱 0.1 毫秒離線秒搜。
              </p>
            </div>

            <div className="bg-[#1e222d] border border-[#2e323e] p-3 rounded-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base">🇺🇸</span>
                <span className="font-bold text-white text-sm">國外股票 (美股)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                  元數據自主學習
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                即時追蹤蘋果 (AAPL)、微軟 (MSFT)、輝達 (NVDA)、特斯拉 (TSLA) 等全球科技巨頭。輸入任何未知代號，系統行情流自動解析官方名稱並記憶快取，免除手動建庫。
              </p>
            </div>

            <div className="bg-[#1e222d] border border-[#2e323e] p-3 rounded-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base">🌐</span>
                <span className="font-bold text-white text-sm">大盤指數看板</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                  實時時段追蹤
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                涵蓋台股加權、日經225、韓國綜合、美股標普/道瓊/費半及歐洲核心指數。精準識別交易中（跳價）、盤後交易（琥珀黃燈）與已收盤（靜態平靜線條），絕無假波動。
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
                收錄 BTC、ETH、SOL、BNB、DOGE、XRP 等主流加密資產，全天候 24 小時連續即時報價，助您洞察跨市場資金輪動。
              </p>
            </div>
          </div>

          <div className="p-3 bg-blue-950/30 border border-blue-500/30 rounded-xl flex items-start gap-2.5 text-xs text-blue-200">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white">智慧搜尋小秘訣：</span>
              隨時在鍵盤按下 <kbd className="px-1.5 py-0.5 bg-[#1e222d] border border-blue-400/40 rounded text-blue-300 font-mono font-bold">/</kbd> 鍵，即可瞬間聚焦右側搜尋框，直接輸入「公司中文名、英文名、代號或簡稱」極速切換標的！
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'kline',
      title: '元大證券級專業 K 線看盤體驗',
      subtitle: '緊湊防黑邊 · 平鋪 OHLCV · 點擊固定 K 棒資訊 · 現價線開關',
      icon: <CandlestickChart className="w-5 h-5 text-emerald-400" />,
      tag: '核心圖表',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            深入比照元大證券「投資先生」與專業金融終端的人性化看盤習慣，解決傳統 K 線圖過度滑移與畫面遮蔽的痛點：
          </p>

          <div className="space-y-2.5">
            <div className="p-3 bg-[#1e222d] border border-[#2e323e] rounded-xl flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">元大防黑邊邊界限制，蠟燭永遠緊湊貼邊</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-normal">
                  杜絕向右拖曳拉出 95% 全黑空洞的困擾。圖表自動採用像素級滾動距離限制，蠟燭永遠飽滿鋪滿螢幕，雙擊畫布瞬間還原預設最佳視角。
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#1e222d] border border-[#2e323e] rounded-xl flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                <Pin size={16} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">📌 點選任意 K 棒 (箱型圖) 立即鎖定開高低收資訊</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-normal">
                  點擊圖表上任意一根蠟燭實體，頂部立即彈出「已固定 K 棒」數據卡，將該時間點的開、高、低、收盤價、漲跌幅與成交量固定顯示。滑鼠移開也不會消失，便於波段比對；再點一次同一根蠟燭或按 <kbd className="px-1.5 py-0.2 bg-[#2a2e39] rounded font-mono text-white">Esc</kbd> 即可隨時解除。
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#1e222d] border border-[#2e323e] rounded-xl flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 shrink-0 mt-0.5">
                <TrendingUp size={16} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">最新收盤/現價水平虛線開關</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-normal">
                  左側邊欄繪圖工具箱提供專屬按鈕，由您自由決定是否開啟橫貫全圖的最新現價虛線，關閉時盤面更加乾淨純粹。
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#1e222d] border border-[#2e323e] rounded-xl flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
                <SlidersHorizontal size={16} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">頂部平鋪 OHLCV 資訊列，三層垂直零重疊</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-normal">
                  將時間、開、高、低、收、漲幅與成交量整齊平鋪在頂部資訊列，徹底解決傳統懸浮浮塊遮蔽蠟燭走勢的問題，標籤與數據分流清晰。
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'drawing',
      title: '左側專業繪圖分析工具箱',
      subtitle: '智慧磁吸 · 獨立標的畫線記憶庫 · 趨勢線 · 黃金分割 · 矩形箱體',
      icon: <Square className="w-5 h-5 text-amber-400" />,
      tag: '畫線工具',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            位於畫面左側的專業畫線工具列（寬度 44px），支援全套幾何與趨勢工具，並具備個人化記憶功能：
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs mb-1">
                <Magnet size={14} className="text-amber-400" />
                <span>磁吸模式 (M)</span>
              </div>
              <p className="text-[11px] text-slate-400">自動吸附蠟燭最高價與最低價，畫線防手抖。</p>
            </div>

            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs mb-1">
                <span className="text-blue-400 font-mono font-bold">／</span>
                <span>趨勢線 (Alt+T)</span>
              </div>
              <p className="text-[11px] text-slate-400">連接關鍵高低點，判斷多空主升降趨勢。</p>
            </div>

            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs mb-1">
                <span className="text-rose-400 font-mono font-bold">―</span>
                <span>水平線 (Alt+H)</span>
              </div>
              <p className="text-[11px] text-slate-400">精確標註前高壓力位與前低支撐防守線。</p>
            </div>

            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs mb-1">
                <span className="text-purple-400 font-mono font-bold">≡</span>
                <span>斐波那契回撤 (Alt+F)</span>
              </div>
              <p className="text-[11px] text-slate-400">黃金分割率 (0.382/0.5/0.618) 抓回檔買點。</p>
            </div>

            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs mb-1">
                <Square size={13} className="text-emerald-400" />
                <span>矩形箱體</span>
              </div>
              <p className="text-[11px] text-slate-400">框出主力打底、籌碼洗盤或箱型整理區間。</p>
            </div>

            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs mb-1">
                <span className="text-cyan-400 font-mono font-bold">T</span>
                <span>文字筆記標註</span>
              </div>
              <p className="text-[11px] text-slate-400">在關鍵轉折處寫下交易策略與備忘筆記。</p>
            </div>
          </div>

          <div className="p-3 bg-[#1e222d] border border-[#2e323e] rounded-xl space-y-1.5 text-xs text-slate-300">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              <span>跨標的畫線獨立隔離與除權息自動校準</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              每檔股票擁有專屬畫線資料庫，切換標的絕不串線穿透；當遇除權息或每日新 K 棒時，系統會自動按收盤比率進行毫米級動態校準，確保支撐壓力線永遠精準貼合！
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'flagship',
      title: '五大旗艦量化分析工具',
      subtitle: '選股器 · 策略回測中心 · 個股基本面 · 模擬交易沙盒 · 價格預警',
      icon: <Sparkles className="w-5 h-5 text-purple-400" />,
      tag: '量化工具箱',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            點擊頂部導航列的「分析工具」按鈕，即可開啟 5 大機構級金融量化與輔助模組：
          </p>

          <div className="space-y-2.5">
            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <SlidersHorizontal size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">智慧選股器 (Screener)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">多因子策略篩選：均線黃金交叉、成交量暴增突破、RSI超跌反彈。</p>
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
                  <p className="text-[11px] text-slate-400 mt-0.5">歷史數據回溯檢驗，即時計算策略總報酬率、勝率、最大回撤 (MDD) 與夏普比率。</p>
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
                  <h4 className="font-bold text-white text-xs">個股基本面診斷 (Fundamental Health)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">營收季增年增、ROE、負債比、本益比河流圖位階與殖利率體檢評分。</p>
                </div>
              </div>
              {onOpenFundamentals && (
                <button
                  onClick={() => { onClose(); onOpenFundamentals(); }}
                  className="px-2.5 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors shrink-0"
                >
                  檢視財報
                </button>
              )}
            </div>

            <div className="p-2.5 bg-[#1e222d] border border-[#2e323e] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Wallet size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">模擬交易沙盒 (Paper Trading)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">配備 100 萬虛擬本金，實盤零風險下單買賣，磨練個人交易心理與進出場紀律。</p>
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
                  <h4 className="font-bold text-white text-xs">價格預警中心 (Price Alerts)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">設定目標價位突破或跌破警示，盤中行情觸發時即時發送桌面通知。</p>
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
      title: '機構級籌碼與 SMC 訂單流',
      subtitle: 'Volume Profile 籌碼分佈 · VWAP 均價 · 機構訂單塊 · 結構突破',
      icon: <Zap className="w-5 h-5 text-emerald-400" />,
      tag: '高階籌碼',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            超越一般散戶的傳統指標，為您揭開法人主力資金在盤面留下的真實足跡：
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
                在右側垂直軸繪製成交量分佈直方圖，自動標記控制點 (POC，最多籌碼成交價位) 與價值區間 (VAH / VAL)。一眼看穿主力籌碼究竟在何處換手與堆積！
              </p>
            </div>

            <div className="p-3 bg-[#1e222d] border border-[#2e323e] rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                  <TrendingUp size={16} className="text-amber-400" />
                  VWAP 成交量加權平均價
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-mono font-bold">
                  機構基準
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                外資與投信法人衡量盤中買進成本的最重要指標。價格在 VWAP 之上代表多方強勢控盤，跌破 VWAP 則提示回檔防守。
              </p>
            </div>

            <div className="p-3 bg-[#1e222d] border border-[#2e323e] rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                  <Zap size={16} className="text-emerald-400" />
                  SMC (Smart Money Concepts) 機構訂單流
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-mono font-bold">
                  頂級流派
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                自動演算法即時偵測機構訂單塊 (Order Block)、失衡價值真空區 (FVG) 與市場結構轉折點 (BOS / CHoCH)，助您在主力發動前搶先站在大資金這一側。
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'shortcuts',
      title: '全域鍵盤極速流與自適應看盤',
      subtitle: '不碰滑鼠的一鍵操作 · 漲跌紅綠切換 · 小白百科全書',
      icon: <Keyboard className="w-5 h-5 text-cyan-400" />,
      tag: '極速操作',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            專為高頻操盤手打造的「鍵盤優先 (Keyboard-First)」極速操作體系，所有按鍵均可於快捷鍵中心自訂：
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
                <span>小白百科 (?)</span>
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
                <h3 className="font-black text-white text-base tracking-wide">ProStock Analyzer 新手功能導覽</h3>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                  全功能手冊
                </span>
              </div>
              <p className="text-xs text-slate-400">帶您快速掌握專業跨平台看盤與量化分析工具的所有強大功能</p>
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
