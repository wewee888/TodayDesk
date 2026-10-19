import React, { useEffect, useState } from 'react';
import type { SubjectName, WeeklyReportAI } from '../types/study';

interface WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: WeeklyReportAI;
  isGenerating: boolean;
  onRefreshAIReport: () => void;
  onAddActionToDesk: (
    subject: SubjectName,
    taskType: string,
    minutes: number,
    title: string
  ) => void;
}

export const WeeklyReportModal: React.FC<WeeklyReportModalProps> = ({
  isOpen,
  onClose,
  report,
  isGenerating,
  onRefreshAIReport,
  onAddActionToDesk,
}) => {
  const [addedIndices, setAddedIndices] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#FDFBF7] rounded-3xl max-w-lg w-full p-5 shadow-2xl border border-[#EAE4DA] space-y-4 max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="周末清账单与AI学情周报"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-surface-container pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">
                auto_awesome
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-secondary">
                {report.weekLabel}
              </span>
              <h3 className="text-base font-bold text-on-surface">
                AI 个性化学习周报 & 周末清账单
              </h3>
            </div>
          </div>
          <button
            type="button"
            aria-label="关闭周报弹窗"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3.5 overflow-y-auto pr-1">
          <div className="p-3.5 rounded-2xl bg-surface-container-low space-y-1.5 border border-[#EAE4DA]/60">
            <div className="text-xs font-bold text-primary">
              💡 核心诊断：{report.headline}
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {report.summaryParagraph}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-secondary-container/30 border border-secondary/20">
              <span className="text-[10px] font-semibold text-secondary block">
                高投入高回报科目
              </span>
              <span className="text-xs font-bold text-on-surface mt-0.5 block">
                {report.highYieldSubject}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-tertiary-fixed/40 border border-tertiary/20">
              <span className="text-[10px] font-semibold text-tertiary block">
                周末提分杠杆点
              </span>
              <span className="text-xs font-bold text-on-surface mt-0.5 block">
                {report.potentialSubject}
              </span>
            </div>
          </div>

          {/* Weekend Actionable Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface">
                📋 周末 45 分钟靶向清账清单（点击可排入今日书桌）
              </span>
            </div>
            {report.actionItems.length === 0 ? (
              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-dashed border-[#EAE4DA] text-center space-y-1">
                <div className="text-xs font-bold text-secondary">
                  🎉 当前暂无待清账错题或积压任务
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  在「今日书桌」录入真实作业或收录错题后，这里会自动生成针对性的周末微清账清单。
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {report.actionItems.map((item, idx) => {
                  const isAdded = addedIndices[idx];
                  return (
                    <div
                      key={`${item.subject}-${idx}`}
                      className="p-3 rounded-2xl bg-surface-container-lowest border border-[#EAE4DA] flex items-center justify-between gap-2.5 shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface text-[10px] font-bold">
                            {item.subject}
                          </span>
                          <span className="text-[10px] font-semibold text-primary">
                            {item.priority} · {item.minutes}m
                          </span>
                        </div>
                        <p className="text-xs font-medium text-on-surface mt-1">
                          {item.task}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isAdded}
                        onClick={() => {
                          onAddActionToDesk(
                            item.subject as SubjectName,
                            '错题订正',
                            item.minutes,
                            item.task
                          );
                          setAddedIndices((prev) => ({ ...prev, [idx]: true }));
                        }}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold shrink-0 transition-all cursor-pointer ${
                          isAdded
                            ? 'bg-secondary-container text-on-secondary-container'
                            : 'bg-primary-container text-on-primary hover:bg-primary'
                        }`}
                      >
                        {isAdded ? '已排入书桌 ✓' : '+ 排入书桌'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Encouragement Footer Note */}
          <div className="p-3 rounded-2xl bg-surface-container text-xs text-on-surface-variant flex items-start gap-2">
            <span className="material-symbols-outlined text-secondary text-[18px] shrink-0">
              spa
            </span>
            <span>{report.encouragement}</span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-2 border-t border-surface-container flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            disabled={isGenerating}
            onClick={onRefreshAIReport}
            className="px-4 py-2.5 rounded-full bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">
              refresh
            </span>
            <span>{isGenerating ? 'AI 正在深度分析...' : 'AI 重新诊断'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full bg-secondary text-on-secondary text-xs font-semibold shadow-sm hover:bg-secondary/90 transition-colors cursor-pointer"
          >
            收好清账单 · 开启轻松周末
          </button>
        </div>
      </div>
    </div>
  );
};
