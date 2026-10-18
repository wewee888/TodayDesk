import React, { useState } from 'react';
import type { ReviewItem } from '../types/study';

interface YesterdayReviewBannerProps {
  items: ReviewItem[];
  isDismissed: boolean;
  onResolveItem: (
    id: string,
    status: ReviewItem['status'],
    mistakeTag?: ReviewItem['mistakeTag'],
    hasPhoto?: boolean
  ) => void;
  onDismissAll: () => void;
  onRestoreBanner: () => void;
  onShowToast: (msg: string) => void;
}

export const YesterdayReviewBanner: React.FC<YesterdayReviewBannerProps> = ({
  items,
  isDismissed,
  onResolveItem,
  onDismissAll,
  onRestoreBanner,
  onShowToast,
}) => {
  const [expandedMistakeId, setExpandedMistakeId] = useState<string | null>(null);
  const pendingCount = items.filter((i) => i.status === 'pending').length;

  if (isDismissed || pendingCount === 0) {
    return (
      <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-surface-container-low/80 border border-outline-variant/25 text-xs text-on-surface-variant">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-secondary">
            verified
          </span>
          <span>昨日 {items.length} 门作业已完成小复盘清账</span>
        </div>
        <button
          type="button"
          onClick={onRestoreBanner}
          className="text-primary font-semibold hover:underline cursor-pointer whitespace-nowrap"
        >
          重新核验
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label="昨日作业小复盘"
      className="bg-surface-container-low/90 backdrop-blur-md rounded-2xl p-space-md shadow-sm relative overflow-hidden transition-all duration-300 border border-[#EAE4DA]/80"
    >
      {/* Amber accent decorative strip */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-tertiary via-primary-container to-secondary opacity-70" />

      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed">
            <span className="material-symbols-outlined text-[15px]">
              rate_review
            </span>
          </div>
          <h2 className="text-[16px] leading-[22px] font-semibold text-on-surface">
            昨日作业小复盘
          </h2>
        </div>
        <span className="text-[11px] leading-[14px] px-2 py-0.5 rounded-full bg-surface-container text-tertiary font-medium">
          待核验 {pendingCount} 门
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const isResolved = item.status !== 'pending';
          const isCapturingMistake = expandedMistakeId === item.id;

          return (
            <div
              key={item.id}
              className={`bg-surface-container-lowest/85 rounded-xl p-2.5 flex flex-col gap-2 shadow-xs transition-all duration-200 ${
                isResolved ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0 ${item.subjectBadgeClass}`}
                  >
                    {item.subject}
                  </span>
                  <span className="text-[13px] leading-[18px] text-on-surface font-medium truncate">
                    {item.title}
                  </span>
                </div>
                {isResolved && (
                  <span className="text-[11px] font-semibold text-secondary shrink-0">
                    {item.status === 'all_correct'
                      ? '🏆 已确认全对 (登全对榜) ✓'
                      : item.status === 'fixed_minor'
                      ? `小错已改${item.mistakeTag ? ` · ${item.mistakeTag}` : ''}`
                      : `已入周末错题本${item.mistakeTag ? ` · ${item.mistakeTag}` : ''}`}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-0.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setExpandedMistakeId(null);
                    onResolveItem(item.id, 'all_correct');
                    onShowToast(
                      `🏆 ${item.subject}作业复盘：全对！已记入老师全对名单统计 ✓`
                    );
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-95 cursor-pointer ${
                    item.status === 'all_correct'
                      ? 'bg-secondary text-on-secondary shadow-2xs'
                      : 'bg-surface-container text-on-surface-variant hover:bg-secondary-container hover:text-on-secondary-container'
                  }`}
                >
                  🏆 全对(登全对名单) ✓
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onResolveItem(item.id, 'fixed_minor', '计算粗心');
                    setExpandedMistakeId(item.id);
                    onShowToast(`${item.subject}已标记「小错已改」`);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all active:scale-95 cursor-pointer ${
                    item.status === 'fixed_minor'
                      ? 'bg-tertiary-container text-on-tertiary'
                      : 'bg-surface-container text-on-surface-variant hover:bg-tertiary-fixed hover:text-on-tertiary-fixed'
                  }`}
                >
                  小错已改
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExpandedMistakeId(
                      expandedMistakeId === item.id ? null : item.id
                    );
                    onResolveItem(item.id, 'weekend_review', '概念模糊', true);
                    onShowToast('已顺手拍下错题，归入周末清账池 📷');
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all active:scale-95 flex items-center gap-0.5 cursor-pointer ${
                    item.status === 'weekend_review'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant hover:bg-primary-fixed hover:text-on-primary-fixed'
                  }`}
                >
                  <span>有难题</span>
                  <span className="material-symbols-outlined text-[13px]">
                    photo_camera
                  </span>
                </button>
              </div>

              {isCapturingMistake && (
                <div className="pt-1.5 border-t border-surface-container flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-on-surface-variant">顺手标错因：</span>
                  <div className="flex items-center gap-1">
                    {(['计算粗心', '审题漏看', '概念模糊'] as const).map(
                      (tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            onResolveItem(
                              item.id,
                              'weekend_review',
                              tag,
                              true
                            );
                            setExpandedMistakeId(null);
                            onShowToast(`已标记「${tag}」并归档至周末错题本`);
                          }}
                          className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                            item.mistakeTag === tag
                              ? 'bg-primary-container text-on-primary font-semibold'
                              : 'bg-surface-container text-on-surface-variant hover:bg-primary-fixed'
                          }`}
                        >
                          {tag}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Dismiss Action */}
      <div className="mt-2.5 pt-1.5 flex justify-center">
        <button
          type="button"
          onClick={onDismissAll}
          className="text-tertiary hover:text-on-tertiary-container text-[11px] font-medium flex items-center gap-1 transition-transform active:scale-95 cursor-pointer py-1 px-3 rounded-full hover:bg-tertiary-fixed/30"
        >
          <span className="material-symbols-outlined text-[15px]">
            offline_bolt
          </span>
          <span>一键全部搞定 ⚡</span>
        </button>
      </div>
    </section>
  );
};
