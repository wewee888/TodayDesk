import React, { useState } from 'react';
import type {
  AttendanceStatus,
  ScheduleFrequencyType,
  ScheduleItem,
} from '../types/study';
import {
  getAttendanceStatusMeta,
  getScheduleFrequencyBadge,
} from '../utils/studyLogic';
import { useDragScroll } from '../utils/useDragScroll';

interface RoutineScheduleCarouselProps {
  schedules: ScheduleItem[];
  onToggleSchedule: (id: string) => void;
  onUpdateSchedule?: (updated: ScheduleItem) => void;
  onDeleteSchedule?: (id: string) => void;
  onAddScheduleClick: () => void;
}

const BADGE_PRESETS = [
  '15m 预习',
  '10m 中考跳绳',
  '15m 中考体育',
  '课余素养',
  '45m 练象棋',
  '60m 练钢琴',
  '30m 练小号',
  '20m 朗读',
];

const FIXED_TIME_PRESETS = [
  '19:00',
  '每晚 20:45',
  '21:30',
  '周六 15:00',
  '周日 10:00',
  '周末固定',
];

const FLEXIBLE_TIME_PRESETS = [
  '不固定 · 机动安排',
  '不固定 · 随堂约课',
  '周末机动',
  '晚间机动',
];

export const RoutineScheduleCarousel: React.FC<RoutineScheduleCarouselProps> = ({
  schedules,
  onToggleSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onAddScheduleClick,
}) => {
  const { dragProps, isDragging } = useDragScroll<HTMLDivElement>();
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [badgeText, setBadgeText] = useState('');
  const [scheduleType, setScheduleType] =
    useState<ScheduleFrequencyType>('weekly_fixed');
  const [timeText, setTimeText] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [attendanceStatus, setAttendanceStatus] =
    useState<AttendanceStatus>('active');
  const [leaveNote, setLeaveNote] = useState('');

  const handleOpenEdit = (item: ScheduleItem) => {
    setEditingItem(item);
    setBadgeText(item.badgeText);
    setScheduleType(
      item.scheduleType ||
        (item.timeText.includes('不固定') || item.timeText.includes('机动')
          ? 'flexible'
          : 'weekly_fixed')
    );
    setTimeText(item.timeText);
    setTitle(item.title);
    setSubtitle(item.subtitle);
    setAttendanceStatus(item.attendanceStatus || 'active');
    setLeaveNote(item.leaveNote || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !onUpdateSchedule) return;
    onUpdateSchedule({
      ...editingItem,
      badgeText: badgeText.trim() || editingItem.badgeText,
      scheduleType,
      timeText:
        timeText.trim() ||
        (scheduleType === 'flexible' ? '不固定 · 机动' : editingItem.timeText),
      title: title.trim() || editingItem.title,
      subtitle: subtitle.trim() || editingItem.subtitle,
      attendanceStatus,
      leaveNote:
        attendanceStatus === 'active'
          ? undefined
          : leaveNote.trim() || undefined,
    });
    setEditingItem(null);
  };

  const handleQuickRestore = (item: ScheduleItem) => {
    if (!onUpdateSchedule) return;
    onUpdateSchedule({
      ...item,
      attendanceStatus: 'active',
      leaveNote: undefined,
    });
  };

  return (
    <section aria-label="固定日程与预习" className="space-y-2">
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-secondary text-[18px]">
            calendar_clock
          </span>
          <h2 className="text-[18px] leading-[24px] font-semibold text-on-surface">
            固定/机动日程与预习
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-on-surface-variant font-medium">
            共 {schedules.length} 项
          </span>
          <button
            type="button"
            onClick={onAddScheduleClick}
            className="px-2.5 py-0.5 rounded-full bg-secondary-container/70 text-on-secondary-container text-[11px] font-semibold hover:bg-secondary-container cursor-pointer"
          >
            + 新增日程
          </button>
        </div>
      </div>

      <div
        {...dragProps}
        className={`flex gap-2.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1 select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab snap-x'
        }`}
      >
        {schedules.map((item) => {
          const attendanceMeta = getAttendanceStatusMeta(
            item.attendanceStatus,
            item.leaveNote
          );
          const freqBadge = getScheduleFrequencyBadge(
            item.scheduleType,
            item.timeText
          );

          return (
            <div
              key={item.id}
              className={`snap-start shrink-0 w-60 bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl p-3 shadow-xs border flex flex-col justify-between transition-all ${
                attendanceMeta.isOnLeaveOrPaused
                  ? 'border-[#F3D9B1] bg-[#FFFDF9]/95'
                  : item.completed
                  ? 'opacity-65 bg-surface-container-low/70 border-[#EAE4DA]/70'
                  : 'border-[#EAE4DA]/70'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold truncate ${item.badgeClass}`}
                  >
                    {item.badgeText}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-on-surface-variant font-medium">
                      {freqBadge.isFlexible ? '机动' : item.timeText}
                    </span>
                    {onUpdateSchedule && (
                      <button
                        type="button"
                        aria-label={`修改日程 ${item.title}`}
                        onClick={() => handleOpenEdit(item)}
                        className="w-5 h-5 rounded-full hover:bg-surface-container text-outline hover:text-primary flex items-center justify-center cursor-pointer transition-colors"
                        title="修改时间/请假/暂停"
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          edit
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <p
                    className={`text-[14px] leading-[20px] font-semibold line-clamp-1 ${
                      attendanceMeta.isOnLeaveOrPaused
                        ? 'text-on-surface-variant line-through decoration-dotted'
                        : item.completed
                        ? 'line-through text-outline'
                        : 'text-on-surface'
                    }`}
                  >
                    {item.title}
                  </p>
                </div>

                {attendanceMeta.isOnLeaveOrPaused ? (
                  <p className="text-[11px] leading-[16px] text-[#B25E00] font-medium line-clamp-1">
                    {attendanceMeta.label} · {attendanceMeta.defaultNote}
                  </p>
                ) : (
                  <p className="text-[12px] leading-[18px] text-on-surface-variant line-clamp-1">
                    {item.subtitle}
                  </p>
                )}
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-1">
                {attendanceMeta.isOnLeaveOrPaused ? (
                  <button
                    type="button"
                    onClick={() => handleQuickRestore(item)}
                    className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-semibold cursor-pointer"
                  >
                    恢复正常上课
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onUpdateSchedule && handleOpenEdit(item)}
                      className="px-2 py-0.5 rounded-full bg-surface-container hover:bg-[#FFF3E0] text-[10px] text-on-surface-variant hover:text-[#B25E00] font-medium cursor-pointer"
                    >
                      请假/改期
                    </button>
                    {item.completed && (
                      <span className="text-[10px] text-secondary font-semibold">
                        已打卡 ✓
                      </span>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  aria-label={`打卡 ${item.title}`}
                  disabled={attendanceMeta.isOnLeaveOrPaused}
                  onClick={() => onToggleSchedule(item.id)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all cursor-pointer shrink-0 ${
                    attendanceMeta.isOnLeaveOrPaused
                      ? 'bg-surface-container-low text-outline/50 cursor-not-allowed'
                      : item.completed
                      ? 'bg-secondary text-on-secondary shadow-xs'
                      : 'bg-surface-container text-on-surface-variant hover:text-secondary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {attendanceMeta.isOnLeaveOrPaused
                      ? 'pause_circle'
                      : item.completed
                      ? 'check_circle'
                      : 'radio_button_unchecked'}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Schedule / Leave & Pause Modal */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setEditingItem(null)}
        >
          <form
            onSubmit={handleSaveEdit}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FDFBF7] rounded-3xl max-w-md w-full p-5 shadow-2xl border border-[#EAE4DA] space-y-3 max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-label="修改固定日程与请假暂停设置"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-on-surface">
                  修改日程 / 请假与暂停设置
                </h3>
                <p className="text-xs text-on-surface-variant">
                  支持每周固定或不固定排期，以及老师请假、自己请假或暂停
                </p>
              </div>
              <button
                type="button"
                aria-label="关闭修改日程"
                onClick={() => setEditingItem(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            {/* Leave / Pause Selector */}
            <div className="p-2.5 rounded-2xl bg-[#FFF9F2] border border-[#F3D9B1] space-y-2">
              <span className="text-xs font-bold text-[#9A5300] block">
                ⏸️ 出勤状态（老师请假 / 自己请假 / 阶段暂停）：
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(
                  [
                    { val: 'active', label: '✅ 正常进行' },
                    { val: 'teacher_leave', label: '🧑‍🏫 老师请假' },
                    { val: 'student_leave', label: '🙋 自己请假' },
                    { val: 'paused', label: '⏸️ 阶段暂停' },
                  ] as { val: AttendanceStatus; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setAttendanceStatus(opt.val)}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold cursor-pointer ${
                      attendanceStatus === opt.val
                        ? 'bg-primary text-on-primary shadow-2xs'
                        : 'bg-white text-on-surface border border-[#EAE4DA]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {attendanceStatus !== 'active' && (
                <input
                  type="text"
                  value={leaveNote}
                  onChange={(e) => setLeaveNote(e.target.value)}
                  placeholder="选填请假/调课备注（如：本周老师请假顺延下周）"
                  className="w-full bg-white rounded-xl px-3 py-1.5 text-xs text-on-surface border border-outline-variant/50 focus:outline-none focus:border-primary"
                />
              )}
            </div>

            {/* Schedule Type: Weekly Fixed vs Flexible */}
            <div className="space-y-1.5">
              <span className="text-xs text-on-surface-variant font-medium block">
                排期周期类型：
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setScheduleType('weekly_fixed');
                    if (timeText.includes('不固定')) setTimeText('周六 15:00');
                  }}
                  className={`py-1.5 px-3 rounded-xl text-xs font-semibold cursor-pointer ${
                    scheduleType === 'weekly_fixed'
                      ? 'bg-secondary text-on-secondary'
                      : 'bg-surface-container-low text-on-surface-variant'
                  }`}
                >
                  📅 每周/每晚固定
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScheduleType('flexible');
                    if (!timeText.includes('不固定') && !timeText.includes('机动')) {
                      setTimeText('不固定 · 机动安排');
                    }
                  }}
                  className={`py-1.5 px-3 rounded-xl text-xs font-semibold cursor-pointer ${
                    scheduleType === 'flexible'
                      ? 'bg-secondary text-on-secondary'
                      : 'bg-surface-container-low text-on-surface-variant'
                  }`}
                >
                  🔀 不固定 / 机动安排
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-on-surface-variant font-medium block">
                执行时间 / 周期说明：
              </label>
              <input
                type="text"
                value={timeText}
                onChange={(e) => setTimeText(e.target.value)}
                className="w-full bg-white rounded-xl px-3 py-2 text-xs font-semibold text-on-surface border border-outline-variant/50 focus:outline-none focus:border-primary"
              />
              <div className="flex flex-wrap gap-1">
                {(scheduleType === 'flexible'
                  ? FLEXIBLE_TIME_PRESETS
                  : FIXED_TIME_PRESETS
                ).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeText(t)}
                    className="px-2 py-0.5 rounded-full bg-surface-container hover:bg-secondary-container text-[11px] text-on-surface-variant cursor-pointer"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-on-surface-variant font-medium block">
                科目 / 时长标签：
              </label>
              <input
                type="text"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                className="w-full bg-white rounded-xl px-3 py-2 text-xs font-semibold text-on-surface border border-outline-variant/50 focus:outline-none focus:border-primary"
              />
              <div className="flex flex-wrap gap-1">
                {BADGE_PRESETS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBadgeText(b)}
                    className="px-2 py-0.5 rounded-full bg-surface-container hover:bg-primary-fixed/50 text-[11px] text-on-surface-variant cursor-pointer"
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-1 text-xs">
              <span className="text-on-surface-variant font-medium">
                项目名称：
              </span>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-white rounded-xl px-3 py-2 font-semibold text-on-surface border border-outline-variant/50 focus:outline-none focus:border-primary"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs">
              <span className="text-on-surface-variant font-medium">
                练习内容详情：
              </span>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="bg-white rounded-xl px-3 py-2 text-on-surface border border-outline-variant/50 focus:outline-none focus:border-primary"
              />
            </label>

            <div className="flex items-center justify-between pt-1">
              {onDeleteSchedule ? (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteSchedule(editingItem.id);
                    setEditingItem(null);
                  }}
                  className="px-3 py-2 rounded-full bg-error-container/60 text-error text-xs font-semibold hover:bg-error-container cursor-pointer"
                >
                  删除此日程
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-full bg-surface-container text-on-surface-variant text-xs font-semibold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-primary text-on-primary text-xs font-semibold shadow-sm hover:bg-primary-container cursor-pointer"
                >
                  保存修改 ✓
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
