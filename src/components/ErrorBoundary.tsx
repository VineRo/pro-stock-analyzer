import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('ProStock ErrorBoundary caught error:', error, errorInfo);
  }

  private handleCopy = () => {
    const report = `【ProStock 系統自動除錯報告】\n時間: ${new Date().toISOString()}\n錯誤: ${this.state.error?.message}\n堆疊資訊:\n${this.state.errorInfo?.componentStack || this.state.error?.stack}`;
    navigator.clipboard.writeText(report);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2500);
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-pro-bg text-pro-text p-6">
          <div className="bg-pro-card border border-red-500/30 rounded-xl p-8 max-w-lg w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <AlertTriangle size={36} />
            </div>
            <h2 className="text-xl font-bold mb-2 text-white">介面渲染暫時遇到問題</h2>
            <p className="text-sm text-pro-muted mb-6">
              請不用擔心！全域防護體系已成功隔離異常，您的所有畫線與自選股配置皆安全保存在本地。
            </p>
            
            <div className="bg-black/40 rounded-lg p-3 text-left font-mono text-xs text-red-400 mb-6 overflow-auto max-h-32 border border-white/5">
              {this.state.error?.message || '未知錯誤'}
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 bg-pro-accent hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <RefreshCw size={16} />
                重新整理軟體
              </button>
              <button
                onClick={this.handleCopy}
                className="flex items-center gap-2 px-4 py-2 bg-pro-hover hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors border border-white/10"
              >
                {this.state.copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                {this.state.copied ? '已複製除錯報告' : '複製報告貼給 AI'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
