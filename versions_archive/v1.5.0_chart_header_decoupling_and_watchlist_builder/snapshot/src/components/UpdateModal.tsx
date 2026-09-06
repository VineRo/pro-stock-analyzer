import React from 'react';
import { 
  X, 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  Download, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  HardDrive,
  Clock,
  Check,
  ExternalLink
} from 'lucide-react';
import { UpdaterState } from '../types/updater';
import { cleanReleaseNotes } from '../utils/updaterUtils';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updaterState: UpdaterState;
  onCheckForUpdates: () => void;
  onStartDownload: () => void;
  onQuitAndInstall: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  updaterState,
  onCheckForUpdates,
  onStartDownload,
  onQuitAndInstall,
}) => {
  if (!isOpen) return null;

  const { status, currentVersion, info, progress, error, lastCheckedTime } = updaterState;

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSec: number) => {
    return `${formatBytes(bytesPerSec)}/s`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-pro-card border border-pro-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 頂部標題列 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pro-border bg-pro-bg/50">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-pro-accent">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span>軟體更新檢查</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pro-border text-pro-muted">
                  目前版本: v{currentVersion}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-pro-hover text-pro-muted hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 內容主體 */}
        <div className="p-6 space-y-5 text-xs">
          {/* 狀態橫幅 */}
          {status === 'checking' && (
            <div className="flex items-center gap-3 p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300">
              <RotateCw size={18} className="animate-spin text-pro-accent shrink-0" />
              <div>
                <p className="font-bold text-sm text-white">正在檢查版本更新...</p>
                <p className="text-[11px] text-blue-300/80 mt-0.5">連線伺服器確認是否有可用更新</p>
              </div>
            </div>
          )}

          {status === 'available' && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={18} />
                  <span className="font-bold text-sm text-white">
                    發現新版本 v{info?.version}
                  </span>
                </div>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-mono font-medium">
                  可立即更新
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                檢測到新版本發布，建議更新以獲得最新的功能改進與修復。
              </p>
            </div>
          )}

          {status === 'downloading' && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Download size={16} className="text-pro-accent animate-bounce" />
                  <span className="font-bold">正在下載更新包...</span>
                </div>
                <span className="font-mono font-bold text-pro-accent text-sm">
                  {Math.round(progress?.percent || 0)}%
                </span>
              </div>

              {/* 進度條 */}
              <div className="w-full bg-pro-bg h-2 rounded-full overflow-hidden border border-pro-border">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.round(progress?.percent || 0)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-pro-muted font-mono">
                <span>傳輸速度：{formatSpeed(progress?.bytesPerSecond || 0)}</span>
                <span>
                  {formatBytes(progress?.transferred || 0)} / {formatBytes(progress?.total || 0)}
                </span>
              </div>
            </div>
          )}

          {status === 'downloaded' && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={18} />
                <span className="font-bold text-sm text-white">
                  {info?.isDmg ? '新版本 DMG 安裝檔已下載完成' : '新版本已下載完成'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                {info?.isDmg
                  ? '安裝檔已保存至您的「下載項目」資料夾。點擊「開啟安裝檔」後，將圖示拖曳入應用程式即可完成升級！'
                  : '安裝檔已準備就緒，您可以點擊「立即重啟套用」，或在下次重啟軟體時自動更新。'}
              </p>
            </div>
          )}

          {status === 'not-available' && (
            <div className="flex items-center gap-3 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-sm text-white">目前已是最新版本 (v{currentVersion})</p>
                <p className="text-[11px] text-emerald-300/80 mt-0.5">
                  軟體各項功能與指標均處於最新狀態
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <AlertCircle size={16} className="text-rose-400 shrink-0" />
                <span>檢查更新時遇到狀況</span>
              </div>
              <p className="text-[11px] text-rose-300/90 leading-relaxed font-sans">
                {error || '請確認網路連線是否暢通，或稍後再次重試。'}
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.open(`https://github.com/VineRo/pro-stock-analyzer/releases/download/v${info?.version || '1.4.0'}/ProStock-Analyzer-${info?.version || '1.4.0'}-arm64.dmg`, '_blank')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-xs transition-colors shadow-sm"
                >
                  <Download size={13} />
                  <span>一鍵下載最新版 DMG 安裝檔</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.open('https://vinero.github.io/pro-stock-analyzer/', '_blank')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-white font-medium rounded-lg text-xs transition-colors border border-rose-500/30 shadow-sm"
                >
                  <ExternalLink size={13} />
                  <span>前往官方網站</span>
                </button>
              </div>
            </div>
          )}

          {/* 四大資安防禦體系檢驗標章 */}
          <div className="bg-pro-bg/50 border border-pro-border rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between text-pro-muted">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                多重安全機制認證 (Enterprise Security)
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">100% 綠燈受保護</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-2 bg-pro-card/80 p-2 rounded-lg border border-pro-border/60">
                <Lock size={13} className="text-pro-accent shrink-0" />
                <div>
                  <div className="text-white font-medium">TLS 1.3 傳輸加密</div>
                  <div className="text-[10px] text-pro-muted">防 DNS 劫持與中間人攻擊</div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-pro-card/80 p-2 rounded-lg border border-pro-border/60">
                <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                <div>
                  <div className="text-white font-medium">SHA-512 雜湊驗證</div>
                  <div className="text-[10px] text-pro-muted">密碼學防二進位竄改</div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-pro-card/80 p-2 rounded-lg border border-pro-border/60">
                <HardDrive size={13} className="text-purple-400 shrink-0" />
                <div>
                  <div className="text-white font-medium">雙平台數位簽章</div>
                  <div className="text-[10px] text-pro-muted">Authenticode & Apple 公證</div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-pro-card/80 p-2 rounded-lg border border-pro-border/60">
                <Clock size={13} className="text-amber-400 shrink-0" />
                <div>
                  <div className="text-white font-medium">SemVer 降級防禦</div>
                  <div className="text-[10px] text-pro-muted">阻斷回滾攻擊 (Anti-Rollback)</div>
                </div>
              </div>
            </div>
          </div>

          {/* 發布日誌 (Changelog) */}
          {(status === 'available' || status === 'downloading' || status === 'downloaded' || info?.releaseNotes) && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-pro-muted">
                <span className="font-semibold text-white">版本升級說明與新功能</span>
                {info?.releaseDate && (
                  <span className="text-[10px] font-mono">
                    發布日期: {new Date(info.releaseDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="bg-pro-bg/40 border border-pro-border rounded-xl p-3 text-[11px] leading-relaxed max-h-36 overflow-y-auto space-y-1 text-slate-300 font-sans">
                {info?.releaseNotes ? (
                  typeof info.releaseNotes === 'string' ? (
                    cleanReleaseNotes(info.releaseNotes).split('\n').map((line, idx) => (
                      <p key={idx} className={line.startsWith('#') ? 'font-bold text-white mt-1' : ''}>
                        {line}
                      </p>
                    ))
                  ) : (
                    info.releaseNotes.map((n, idx) => (
                      <div key={idx}>
                        <div className="font-bold text-white">{n.version}</div>
                        <div>{cleanReleaseNotes(n.note)}</div>
                      </div>
                    ))
                  )
                ) : (
                  <div className="space-y-1 text-pro-muted">
                    <p>• 優化圖表渲染與畫線吸附體驗</p>
                    <p>• 改進指標計算與記憶體管理</p>
                    <p>• 提升行情即時連線穩定度</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 上次檢查時間 */}
          {lastCheckedTime && (
            <div className="text-center text-[10px] text-pro-muted font-mono">
              上次檢查時間：{new Date(lastCheckedTime).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* 底部行動按鈕 */}
        <div className="p-4 border-t border-pro-border bg-pro-bg/40 flex items-center justify-between">
          <button
            onClick={onCheckForUpdates}
            disabled={status === 'checking' || status === 'downloading'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-pro-muted hover:text-white hover:bg-pro-hover transition-colors disabled:opacity-50 text-xs"
          >
            <RotateCw size={13} className={status === 'checking' ? 'animate-spin' : ''} />
            <span>重新檢查</span>
          </button>

          <div className="flex items-center gap-2">
            {status === 'available' && (
              <>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg text-pro-muted hover:text-white hover:bg-pro-hover transition-colors text-xs"
                >
                  稍後提醒我
                </button>
                <button
                  onClick={onStartDownload}
                  className="flex items-center gap-1.5 px-4 py-2 bg-pro-accent hover:bg-blue-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
                >
                  <Download size={14} />
                  <span>立即下載更新</span>
                </button>
              </>
            )}

            {status === 'downloading' && (
              <button
                disabled
                className="flex items-center gap-1.5 px-4 py-2 bg-pro-border text-pro-muted font-medium text-xs rounded-xl cursor-not-allowed"
              >
                <RotateCw size={14} className="animate-spin" />
                <span>正在下載更新 ({Math.round(progress?.percent || 0)}%)</span>
              </button>
            )}

            {status === 'downloaded' && (
              <>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg text-pro-muted hover:text-white hover:bg-pro-hover transition-colors text-xs"
                >
                  稍後手動安裝
                </button>
                <button
                  onClick={onQuitAndInstall}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                >
                  {info?.isDmg ? <ExternalLink size={14} /> : <Check size={14} />}
                  <span>{info?.isDmg ? '開啟 DMG 安裝檔' : '立即重啟套用新版'}</span>
                </button>
              </>
            )}

            {(status === 'idle' || status === 'not-available' || status === 'error') && (
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-pro-border hover:bg-pro-hover text-white text-xs rounded-xl transition-colors font-medium"
              >
                關閉
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
