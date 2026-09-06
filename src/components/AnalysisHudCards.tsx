import React from 'react';
import { Zap, ShieldAlert, Target, X, Info, BarChart2 } from 'lucide-react';
import { SMCAnalysisResult, VolumeProfileResult } from '../types/stock';

interface SMCHudCardProps {
  result: SMCAnalysisResult;
  onClose: () => void;
}

export const SMCHudCard: React.FC<SMCHudCardProps> = ({ result, onClose }) => {
  return (
    <div className="bg-[#181c27]/95 backdrop-blur-md border border-emerald-500/50 rounded-2xl p-3 shadow-2xl w-[280px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-120px)] overflow-y-auto text-xs select-none animate-in fade-in duration-200 shrink-0">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2a2e3d]">
        <span className="font-bold text-white flex items-center gap-1.5 text-xs">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          SMC 機構訂單流 (Order Flow)
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-semibold">
            {result.structureStatus}
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-[#252a37] transition-colors"
            title="關閉 SMC 卡片"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 機構關鍵支撐與阻力 */}
      <div className="space-y-1 mb-2.5 text-[11px]">
        <div className="flex justify-between items-center text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
          <span className="flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> 機構核心支撐 (FVG CE):
          </span>
          <span className="font-mono font-bold">
            ${result.nearestSupport != null ? result.nearestSupport.toFixed(2) : '---'}
          </span>
        </div>
        <div className="flex justify-between items-center text-rose-400 font-semibold bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3" /> 機構核心壓力 (阻力):
          </span>
          <span className="font-mono font-bold">
            ${result.nearestResistance != null ? result.nearestResistance.toFixed(2) : '---'}
          </span>
        </div>
      </div>

      {/* FVG 缺口清單 */}
      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
        <div className="text-[10px] text-slate-400 font-bold flex justify-between">
          <span>FVG 價值失衡缺口</span>
          <span>CE 中軸 (50%)</span>
        </div>
        {result.fvgs.length === 0 ? (
          <div className="text-[10px] text-slate-500 py-2 text-center">當前週期未發現顯著機構失衡缺口</div>
        ) : (
          result.fvgs.slice(-4).reverse().map((g, idx) => (
            <div key={idx} className="flex justify-between items-center text-[10px] bg-[#12151e] px-1.5 py-0.5 rounded">
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${g.type === 'bullish' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className={g.type === 'bullish' ? 'text-emerald-400' : 'text-rose-400'}>
                  {g.type === 'bullish' ? '看漲 FVG' : '看跌 FVG'}
                </span>
                {g.isMitigated && <span className="text-[9px] text-slate-400 bg-white/5 px-1 rounded">已回踩</span>}
              </div>
              <span className="font-mono font-bold text-white">${g.consequentEncroachment.toFixed(2)}</span>
            </div>
          ))
        )}
      </div>

      {/* 實戰筆記 */}
      <div className="mt-2 pt-2 border-t border-[#2a2e3d] text-[10px] text-slate-400 flex items-start gap-1">
        <Info className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
        <span>【實戰筆記】：看多缺口為買盤失衡吸籌區，價格回踩 50% CE 中軸通常具備支撐動能。</span>
      </div>
    </div>
  );
};

interface VolumeProfileHudCardProps {
  result: VolumeProfileResult;
  onClose: () => void;
}

export const VolumeProfileHudCard: React.FC<VolumeProfileHudCardProps> = ({ result, onClose }) => {
  return (
    <div className="bg-[#181c27]/95 backdrop-blur-md border border-amber-500/50 rounded-2xl p-3 shadow-2xl w-[280px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-120px)] overflow-y-auto text-xs select-none animate-in fade-in duration-200 shrink-0">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2a2e3d]">
        <span className="font-bold text-white flex items-center gap-1.5 text-xs">
          <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
          籌碼成交量分佈 (Volume Profile)
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-semibold">
            VA 70%
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-[#252a37] transition-colors"
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
          <span className="font-mono font-bold">${result.poc.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded">
          <span>VAH 價值區間上限:</span>
          <span className="font-mono font-bold">${result.vah.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded">
          <span>VAL 價值區間下限:</span>
          <span className="font-mono font-bold">${result.val.toFixed(2)}</span>
        </div>
      </div>

      {/* 價位量能條狀分佈圖 */}
      <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
        {result.tiers.slice().reverse().map((t, idx) => {
          const isPOC = t.price === result.poc;
          const inValueArea = t.price >= result.val && t.price <= result.vah;
          return (
            <div key={idx} className="flex items-center gap-1.5 text-[10px] group hover:bg-slate-800/40 px-1 py-0.5 rounded">
              <span
                className={`w-14 text-right font-mono ${
                  isPOC ? 'text-amber-400 font-bold' : inValueArea ? 'text-purple-300 font-semibold' : 'text-slate-400'
                }`}
              >
                ${t.price.toFixed(2)}
              </span>
              <div className="flex-1 h-2 bg-[#12151e] rounded-sm overflow-hidden flex items-center">
                <div
                  className={`h-full rounded-sm transition-all ${
                    isPOC ? 'bg-amber-400' : inValueArea ? 'bg-purple-500/70' : 'bg-blue-500/40'
                  }`}
                  style={{ width: `${Math.max(2, t.percent)}%` }}
                />
              </div>
              <span className="w-8 text-[9px] text-slate-400 text-right font-mono">{t.percent}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
