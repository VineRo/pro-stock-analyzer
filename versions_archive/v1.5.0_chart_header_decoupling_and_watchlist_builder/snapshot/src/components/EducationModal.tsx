import { useState } from 'react';
import { X, Search, BookOpen, CheckCircle, AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react';
import { INDICATORS_DATA, IndicatorEducation } from '../education/indicatorsData';

interface EducationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIndicatorId?: string;
}

export const EducationModal: React.FC<EducationModalProps> = ({
  isOpen,
  onClose,
  initialIndicatorId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'main' | 'sub' | 'smc' | 'valuation'>('all');
  const [selectedId, setSelectedId] = useState<string>(initialIndicatorId || 'MA');

  if (!isOpen) return null;

  const indicatorsList = Object.values(INDICATORS_DATA);

  const filtered = indicatorsList.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.shortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchSearch && matchCategory;
  });

  const selectedItem: IndicatorEducation =
    INDICATORS_DATA[selectedId] || filtered[0] || indicatorsList[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-pro-card border border-pro-border rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 頂部標題列 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pro-border bg-pro-bg/50">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <BookOpen size={20} />
            </div>
            <span>實戰技術指標與估值觀念指南</span>
            <span className="text-xs bg-pro-accent/20 text-pro-accent px-2 py-0.5 rounded-full font-normal">
              實戰筆記
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-pro-hover text-pro-muted hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 主體雙欄佈局 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左側選單 */}
          <div className="w-80 border-r border-pro-border flex flex-col bg-pro-bg/30">
            {/* 搜尋與分類 */}
            <div className="p-3 border-b border-pro-border space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-pro-muted" />
                <input
                  type="text"
                  placeholder="搜尋指標或模型 (如 DCF, SMC, MACD)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-pro-card border border-pro-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-pro-muted focus:outline-none focus:border-pro-accent"
                />
              </div>

              <div className="grid grid-cols-5 gap-1 rounded-lg bg-pro-card p-1 border border-pro-border text-[11px]">
                {([
                  { key: 'all', label: '全部' },
                  { key: 'main', label: '主圖' },
                  { key: 'sub', label: '副圖' },
                  { key: 'smc', label: '機構SMC' },
                  { key: 'valuation', label: '估值模型' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveCategory(key)}
                    className={`py-1 rounded text-center transition-colors truncate px-0.5 ${
                      activeCategory === key
                        ? 'bg-pro-accent text-white font-medium shadow-sm'
                        : 'text-pro-muted hover:text-pro-text'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 指標清單列表 */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filtered.map((item) => {
                const isSelected = item.id === selectedItem.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex flex-col gap-0.5 ${
                      isSelected
                        ? 'bg-pro-accent text-white font-medium shadow-md shadow-blue-500/20'
                        : 'text-pro-text hover:bg-pro-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{item.shortName}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-pro-hover text-pro-muted'
                        }`}
                      >
                        {item.category === 'main' ? '主圖' : '副圖'}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] truncate ${
                        isSelected ? 'text-white/80' : 'text-pro-muted'
                      }`}
                    >
                      {item.tagline}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 右側詳細內容 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 標題與標籤 */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-xs bg-pro-accent/20 text-pro-accent font-semibold">
                  {selectedItem.category === 'main' ? '主圖指標（直接疊加於K線上）' : '副圖指標（獨立於下方視窗）'}
                </span>
                <span className="text-xs text-pro-muted">建議預設參數：{selectedItem.defaultSettings}</span>
              </div>
              <h2 className="text-2xl font-black text-white">{selectedItem.name}</h2>
              <p className="text-sm text-pro-muted mt-1">{selectedItem.tagline}</p>
            </div>

            {/* 生活化比喻 */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3 text-amber-100">
              <Lightbulb size={24} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-300 text-sm mb-1">💡 觀念比喻與核心意涵</h4>
                <p className="text-xs leading-relaxed text-amber-100/90">{selectedItem.analogy}</p>
              </div>
            </div>

            {/* 到底是什麼 */}
            <div className="bg-pro-card border border-pro-border rounded-xl p-4">
              <h4 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                <BookOpen size={16} className="text-pro-accent" />
                指標原理與計算邏輯
              </h4>
              <p className="text-xs leading-relaxed text-pro-text">{selectedItem.whatIsIt}</p>
            </div>

            {/* 怎麼看買賣訊號 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 買訊做多 */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-2">
                  <CheckCircle size={18} />
                  <span>🟢 偏多觀察 / 買進參考訊號</span>
                </div>
                <p className="text-xs leading-relaxed text-emerald-100/90">
                  {selectedItem.howToUse.buySignal}
                </p>
              </div>

              {/* 賣訊做空 */}
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm mb-2">
                  <TrendingUp size={18} className="rotate-180" />
                  <span>🔴 偏空觀察 / 出場減碼訊號</span>
                </div>
                <p className="text-xs leading-relaxed text-rose-100/90">
                  {selectedItem.howToUse.sellSignal}
                </p>
              </div>
            </div>

            {/* 整理期/中立訊號 (若有) */}
            {selectedItem.howToUse.neutralSignal && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-xs text-blue-200">
                <span className="font-bold">⚖️ 震盪盤整提示：</span>
                {selectedItem.howToUse.neutralSignal}
              </div>
            )}

            {/* 實戰常見盲點 */}
            <div className="bg-pro-card border border-amber-500/20 rounded-xl p-4">
              <h4 className="font-bold text-amber-400 text-sm mb-2 flex items-center gap-2">
                <AlertTriangle size={16} />
                實戰常見盲點與交易提醒
              </h4>
              <ul className="space-y-2">
                {selectedItem.pitfalls.map((pitfall, index) => (
                  <li key={index} className="text-xs text-pro-text flex items-start gap-2">
                    <span className="text-amber-400 font-mono font-bold">{index + 1}.</span>
                    <span>{pitfall}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
