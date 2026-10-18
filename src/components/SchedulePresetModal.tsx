import React, { useState } from 'react';
import type { ScheduleFrequencyType, ScheduleItem } from '../types/study';

interface SchedulePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSchedule: (item: ScheduleItem) => void;
}

const PRESET_TEMPLATES: {
  badgeText: string;
  badgeClass: string;
  scheduleType: ScheduleFrequencyType;
  timeText: string;
  title: string;
  subtitle: string;
}[] = [
  {
    badgeText: '15m 中考体育',
    badgeClass: 'bg-secondary-container/70 text-on-secondary-container',
    scheduleType: 'weekly_fixed',
    timeText: '每晚 20:45',
    title: '晚间中考体育锻炼（跳绳+立定跳远）',
    subtitle: '1分钟计时跳绳3组 + 立定跳远/核心体能打卡 (10~15分钟)',
  },
  {
    badgeText: '15m 中考耐力',
    badgeClass: 'bg-secondary-container/70 text-on-secondary-container',
    scheduleType: 'weekly_fixed',
    timeText: '每晚 21:00',
    title: '中考体育 1000m/800m 耐力跑与引体/仰卧起坐',
    subtitle: '配速呼吸跑 + 上肢核心力量与赛后拉伸',
  },
  {
    badgeText: '周末课余',
    badgeClass: 'bg-tertiary-fixed/60 text-on-tertiary-fixed-variant',
    scheduleType: 'weekly_fixed',
    timeText: '周六 15:00',
    title: '周末象棋对弈 / 钢琴 / 小号固定课',
    subtitle: '每周固定时间课余特长训练（支持随时请假/改期）',
  },
  {
    badgeText: '机动课余',
    badgeClass: 'bg-tertiary-fixed/60 text-on-tertiary-fixed-variant',
    scheduleType: 'flexible',
    timeText: '不固定 · 机动安排',
    title: '不固定课余兴趣 / 球类机动加练',
    subtitle: '根据周末或晚间空余时间机动打卡',
  },
];

export const SchedulePresetModal: React.FC<SchedulePresetModalProps> = ({
  isOpen,
  onClose,
  onAddSchedule,
}) => {
  const [title, setTitle] = useState('晚间中考体育锻炼（跳绳+立定跳远）');
  const [subtitle, setSubtitle] = useState(
    '1分钟计时跳绳3组 + 立定跳远/核心体能打卡 (10~15分钟)'
  );
  const [scheduleType, setScheduleType] =
    useState<ScheduleFrequencyType>('weekly_fixed');
  const [timeText, setTimeText] = useState('每晚 20:45');
  const [badgeText, setBadgeText] = useState('15m 中考体育');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddSchedule({
      id: `sch-${Date.now()}`,
      badgeText: badgeText.trim() || '15m 中考体育',
      badgeClass: 'bg-secondary-container/60 text-on-secondary-container',
      scheduleType,
      timeText:
        timeText.trim() ||
        (scheduleType === 'flexible' ? '不固定 · 机动安排' : '每晚 20:45'),
      title: title.trim(),
      subtitle: subtitle.trim() || '日常自律打卡计划',
      completed: false,
      attendanceStatus: 'active',
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FDFBF7] rounded-3xl max-w-md w-full p-5 shadow-xl border border-[#EAE4DA] space-y-3.5 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-label="新增固定或机动日程"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-on-surface">
              新增日程 · 支持每周固定或不固定安排
            </h3>
            <p className="text-xs text-on-surface-variant">
              可选每晚/每周固定时间，或设为不固定机动任务，支持随时请假暂停
            </p>
          </div>
          <button
            type="button"
            aria-label="关闭周期设置"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-on-surface-variant">
            一键选用常见模板：
          </span>
          <div className="flex flex-col gap-1.5">
            {PRESET_TEMPLATES.map((tpl) => (
              <button
                key={tpl.title}
                type="button"
                onClick={() => {
                  setTitle(tpl.title);
                  setSubtitle(tpl.subtitle);
                  setScheduleType(tpl.scheduleType);
                  setTimeText(tpl.timeText);
                  setBadgeText(tpl.badgeText);
                }}
                className={`text-left p-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  title === tpl.title
                    ? 'bg-secondary-container/40 border border-secondary/30 font-semibold text-on-surface'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span className="truncate">
                  {tpl.title}（{tpl.timeText}）
                </span>
                <span className="text-[11px] text-secondary shrink-0">
                  {tpl.badgeText}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Weekly Fixed vs Flexible toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setScheduleType('weekly_fixed');
              if (timeText.includes('不固定')) setTimeText('周六 15:00');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer ${
              scheduleType === 'weekly_fixed'
                ? 'bg-secondary text-on-secondary shadow-2xs'
                : 'bg-surface-container-low text-on-surface-variant'
            }`}
          >
            📅 每周/每晚固定
          </button>
          <button
            type="button"
            onClick={() => {
              setScheduleType('flexible');
              setTimeText('不固定 · 机动安排');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer ${
              scheduleType === 'flexible'
                ? 'bg-secondary text-on-secondary shadow-2xs'
                : 'bg-surface-container-low text-on-surface-variant'
            }`}
          >
            🔀 不固定 / 机动安排
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-on-surface-variant font-medium">任务名称</span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white rounded-xl px-3 py-2 border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-on-surface-variant font-medium">
              时间/周期说明
            </span>
            <input
              type="text"
              value={timeText}
              onChange={(e) => setTimeText(e.target.value)}
              className="bg-white rounded-xl px-3 py-2 border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs">
          <span className="text-on-surface-variant font-medium">内容备注</span>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="bg-white rounded-xl px-3 py-2 border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
          />
        </label>

        <button
          type="submit"
          className="w-full py-2.5 rounded-full bg-secondary text-on-secondary text-xs font-semibold shadow-sm hover:bg-secondary/90 cursor-pointer"
        >
          + 加入日程流
        </button>
      </form>
    </div>
  );
};
