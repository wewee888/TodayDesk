import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class DeskErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('DeskErrorBoundary caught an unhandled rendering error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleSafeReset = () => {
    try {
      // Clear transient or possibly corrupted layout states without erasing user credentials
      localStorage.removeItem('todaydesk_timetable_result_v1');
      localStorage.removeItem('todaydesk_parent_cheer_v1');
      sessionStorage.clear();
    } catch {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#FDFBF7] text-[#1b1c1a] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-7 shadow-[0_12px_36px_rgba(42,24,0,0.08)] border border-[#EAE4DA] space-y-4 text-center">
            {/* Warm Lantern Glow Icon */}
            <div className="w-14 h-14 rounded-2xl bg-[#FFE4C8] text-[#99462a] flex items-center justify-center mx-auto shadow-xs">
              <span className="material-symbols-outlined text-[28px]">
                wb_incandescent
              </span>
            </div>

            <div className="space-y-1">
              <h1 className="text-lg font-bold text-[#1b1c1a] tracking-tight">
                书桌遇到了一点小波折
              </h1>
              <p className="text-xs text-[#55433d] leading-relaxed">
                请放心，您的作业记录与档案已安全保存在本地。轻点下方按钮即可重新点亮书桌：
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-2.5 rounded-xl bg-[#99462a] hover:bg-[#d97757] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>重新点亮书桌</span>
              </button>

              <button
                type="button"
                onClick={this.handleSafeReset}
                className="w-full py-2.5 rounded-xl bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#55433d] text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">cleaning_services</span>
                <span>清理异常缓存并恢复</span>
              </button>
            </div>

            {/* Collapsible Error Diagnostics for Debugging */}
            {this.state.error && (
              <details className="text-left text-[11px] text-[#88726c] pt-2 border-t border-[#EAE4DA]/60">
                <summary className="cursor-pointer hover:text-[#1b1c1a] py-1 select-none">
                  查看技术诊断信息
                </summary>
                <div className="p-2 rounded-lg bg-[#f5f3f0] mt-1 overflow-x-auto font-mono text-[10px] space-y-1">
                  <p className="font-bold text-[#ba1a1a]">{this.state.error.name}: {this.state.error.message}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack.slice(0, 500)}</pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
