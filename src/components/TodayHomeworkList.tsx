import React, { useEffect, useState } from 'react';
import type { HomeworkTask, SubjectName } from '../types/study';
import {
  DEFAULT_SUBJECTS,
  calculateDeskSummary,
  calculatePomodoroProgress,
  clampTaskDuration,
  formatPomodoroTime,
  getDefaultSubjectsForGrade,
  getSubjectBadgeClass,
  getSubjectMeta,
} from '../utils/studyLogic';

interface TodayHomeworkListProps {
  tasks: HomeworkTask[];
  gradeClass?: string;
  pomodoroMinutes?: number;
  customSubjects?: SubjectName[];
  role?: 'student' | 'parent';
  parentCheerNote?: string | null;
  onSendParentCheer?: (note: string) => void;
  onClearParentCheer?: () => void;
  onToggleTaskComplete: (id: string) => void;
  onSelectDuration: (id: string, minutes: number) => void;
  onUpdateTask?: (updated: HomeworkTask) => void;
  onDeleteTask?: (id: string) => void;
  onClearAllTasks?: () => void;
  onRestoreDefaultTasks?: () => void;
  onOpenVoiceModal?: () => void;
  onOpenQuickAdd?: () => void;
  onPomodoroComplete: (id: string) => void;
  onShowToast?: (msg: string) => void;
}

const PRESET_DURATIONS = [15, 30, 45, 60, 90, 120];
// For PE exercises: 5, 10, 15, 20, 25, 30, 45 minutes
const PE_PRESET_DURATIONS = [5, 10, 15, 20, 25, 30, 45];

function playWarmCompletionChime() {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.11);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(
        0.14,
        ctx.currentTime + idx * 0.11 + 0.03
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + idx * 0.11 + 0.35
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.11);
      osc.stop(ctx.currentTime + idx * 0.11 + 0.36);
    });
  } catch {
    // AudioContext blocked or unsupported in headless environment
  }
}

export const TodayHomeworkList: React.FC<TodayHomeworkListProps> = ({
  tasks,
  gradeClass,
  pomodoroMinutes = 25,
  customSubjects = [],
  role = 'student',
  parentCheerNote,
  onSendParentCheer,
  onClearParentCheer,
  onToggleTaskComplete,
  onSelectDuration,
  onUpdateTask,
  onDeleteTask,
  onClearAllTasks,
  onRestoreDefaultTasks,
  onOpenVoiceModal,
  onOpenQuickAdd,
  onPomodoroComplete,
  onShowToast,
}) => {
  const totalPomodoroSeconds = Math.max(1, pomodoroMinutes) * 60;
  const summary = calculateDeskSummary(tasks);

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    totalPomodoroSeconds
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [expandedDurationTaskId, setExpandedDurationTaskId] = useState<string | null>(null);

  // Parent Cheer Note state
  const [showCheerModal, setShowCheerModal] = useState<boolean>(false);
  const [cheerInputText, setCheerInputText] = useState<string>('');

  // Inline full task editor state (subject, taskType, title, custom minutes)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState<SubjectName>('数学');
  const [editTaskType, setEditTaskType] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editMinutes, setEditMinutes] = useState<string>('30');
  const [editActualMinutes, setEditActualMinutes] = useState<string>('30');

  const availableSubjects = Array.from(
    new Set([...getDefaultSubjectsForGrade(gradeClass), ...customSubjects])
  );

  // Calculate estimated finish time for Parent Companion View
  const now = new Date();
  const estFinishTime = new Date(now.getTime() + summary.remainingMinutes * 60 * 1000);
  const estFinishHour = String(estFinishTime.getHours()).padStart(2, '0');
  const estFinishMinute = String(estFinishTime.getMinutes()).padStart(2, '0');

  useEffect(() => {
    if (!isRunning) {
      setRemainingSeconds(totalPomodoroSeconds);
    }
  }, [totalPomodoroSeconds, isRunning]);

  useEffect(() => {
    if (!isRunning || !activeTaskId) return;

    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setIsRunning(false);
          playWarmCompletionChime();
          onPomodoroComplete(activeTaskId);
          return totalPomodoroSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRunning, activeTaskId, onPomodoroComplete, totalPomodoroSeconds]);

  const handleStartPomodoro = (task: HomeworkTask) => {
    if (activeTaskId === task.id) {
      setIsRunning((prev) => !prev);
      return;
    }
    setActiveTaskId(task.id);
    setRemainingSeconds(totalPomodoroSeconds);
    setIsRunning(true);
    if (onShowToast) {
      onShowToast(
        `🍅 已开启「${task.subject}」${pomodoroMinutes}分钟专注倒计时`
      );
    }
  };

  const handleResetPomodoro = () => {
    setIsRunning(false);
    setRemainingSeconds(totalPomodoroSeconds);
  };

  const handleFinishPomodoroNow = (task: HomeworkTask) => {
    setIsRunning(false);
    setRemainingSeconds(totalPomodoroSeconds);
    playWarmCompletionChime();
    onPomodoroComplete(task.id);
  };

  const handleOpenTaskEditor = (task: HomeworkTask) => {
    if (editingTaskId === task.id) {
      setEditingTaskId(null);
      return;
    }
    setEditingTaskId(task.id);
    setEditSubject(task.subject);
    setEditTaskType(task.taskType);
    setEditTitle(task.title);
    setEditMinutes(String(task.estimatedMinutes));
    setEditActualMinutes(String(task.actualMinutes ?? task.estimatedMinutes));
  };

  const handleSaveTaskEditor = (task: HomeworkTask) => {
    const parsedMins = parseInt(editMinutes, 10);
    const clampedMins = clampTaskDuration(
      Number.isNaN(parsedMins) ? task.estimatedMinutes : parsedMins
    );
    const parsedActual = parseInt(editActualMinutes, 10);
    const clampedActual = Number.isNaN(parsedActual)
      ? undefined
      : clampTaskDuration(parsedActual);
    const nextSubject = editSubject.trim() || task.subject;
    const updated: HomeworkTask = {
      ...task,
      subject: nextSubject,
      subjectBadgeClass: getSubjectBadgeClass(nextSubject),
      taskType: editTaskType.trim() || task.taskType,
      title: editTitle.trim() || task.title,
      estimatedMinutes: clampedMins,
      actualMinutes: clampedActual,
    };
    if (onUpdateTask) {
      onUpdateTask(updated);
    } else {
      onSelectDuration(task.id, clampedMins);
    }
    setEditingTaskId(null);
  };

  const allCorrectCount = tasks.filter(
    (t) =>
      t.isAllCorrect &&
      t.subject !== '体育锻炼' &&
      t.subject !== '课余兴趣'
  ).length;

  const handleToggleTaskCheck = (task: HomeworkTask) => {
    const nextCompleted = !task.completed;
    if (nextCompleted && task.actualMinutes === undefined) {
      const updated: HomeworkTask = {
        ...task,
        completed: true,
        actualMinutes: task.estimatedMinutes,
      };
      if (onUpdateTask) {
        onUpdateTask(updated);
      }
    }
    onToggleTaskComplete(task.id);
  };

  const handleToggleAllCorrect = (task: HomeworkTask) => {
    const nextState = !task.isAllCorrect;
    const updated: HomeworkTask = {
      ...task,
      isAllCorrect: nextState,
      accuracyNote: nextState ? '自批/家长核对无误' : undefined,
    };
    if (onUpdateTask) {
      onUpdateTask(updated);
    }
    if (onShowToast) {
      onShowToast(
        nextState
          ? `✓ 已标记「${task.subject}」当晚自批/核对无误`
          : `已取消「${task.subject}」自批标记`
      );
    }
  };

  return (
    <section aria-label="今日待攻克" className="space-y-3">
      {/* 1. Parent Companion Dashboard (家长静默伴学视角专属) */}
      {role === 'parent' && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/90 to-orange-50/90 border border-amber-200/80 shadow-xs space-y-2.5 animate-fade-slide">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">
                family_restroom
              </span>
              <span className="text-xs font-bold text-on-surface">
                家长静默伴学看板 · 看清学情不催不吼
              </span>
            </div>
            <span className="text-[11px] font-semibold text-primary">
              已完成 {summary.completedCount} / {summary.totalCount} 项 ({summary.progressPercent}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
            <div
              className="h-full bg-secondary transition-all duration-300 rounded-full"
              style={{ width: `${summary.progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap text-xs pt-0.5">
            <span className="text-[11px] text-on-surface-variant">
              💡 按当前节奏，预计今晚 <strong className="text-primary font-bold">{estFinishHour}:{estFinishMinute}</strong> 全部完成
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowCheerModal(true)}
                className="px-2.5 py-1 rounded-full bg-primary text-on-primary text-[11px] font-semibold hover:bg-primary-container transition-colors cursor-pointer flex items-center gap-1 active:scale-95 shadow-2xs"
              >
                <span className="material-symbols-outlined text-[13px]">favorite</span>
                <span>发送暖心鼓励便签</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Warm Parent Cheer Sticky Note (爸爸妈妈的鼓励便签) */}
      {parentCheerNote && (
        <div className="p-3 rounded-2xl bg-amber-50/95 border border-amber-200/90 flex items-start justify-between gap-2.5 shadow-2xs animate-fade-slide">
          <div className="flex items-start gap-2 min-w-0">
            <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
              push_pin
            </span>
            <div className="space-y-0.5 min-w-0">
              <span className="text-[11px] font-bold text-primary block">
                📌 家长的暖心便签
              </span>
              <p className="text-xs font-semibold text-on-surface leading-relaxed break-words">
                “{parentCheerNote}”
              </p>
            </div>
          </div>
          {onClearParentCheer && (
            <button
              type="button"
              onClick={onClearParentCheer}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-amber-100 text-primary text-[11px] font-bold border border-amber-200 cursor-pointer shrink-0 transition-colors whitespace-nowrap active:scale-95"
              title="孩子已收到并温和互动"
            >
              收到 ❤️
            </button>
          )}
        </div>
      )}

      {/* 3. Modal: Parent Sending Cheer Sticky Note */}
      {showCheerModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FDFBF7] rounded-3xl max-w-sm w-full p-4.5 border border-[#EAE4DA] shadow-2xl space-y-3 animate-fade-slide">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-sm text-on-surface">
                <span className="material-symbols-outlined text-primary text-[18px]">favorite</span>
                <span>给孩子留一张暖心便签</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCheerModal(false)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[15px]">close</span>
              </button>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              便签将温馨显示在孩子今日书桌上方。不催不吼，用具体的看见和关怀支持孩子的自律心流。
            </p>
            {/* Quick cheer presets */}
            <div className="flex flex-wrap gap-1.5">
              {[
                '今天数学压轴题思路太棒了，加油！🎉',
                '洗好水果在桌上，歇5分钟再战 🍓',
                '今晚专注度超赞，写完早点洗漱休息 🌙',
                '做完这门作业，我们一起下楼散步10分钟 🏃',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCheerInputText(preset)}
                  className="text-[11px] px-2 py-1 rounded-lg bg-surface-container text-on-surface hover:bg-primary-fixed/50 text-left transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={cheerInputText}
              onChange={(e) => setCheerInputText(e.target.value)}
              placeholder="输入给孩子的鼓励便签..."
              className="w-full bg-white rounded-xl p-2.5 text-xs text-on-surface border border-[#EAE4DA] focus:outline-none focus:border-primary"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCheerModal(false)}
                className="px-3.5 py-1.5 rounded-full bg-surface-container text-xs font-semibold text-on-surface-variant cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (cheerInputText.trim() && onSendParentCheer) {
                    onSendParentCheer(cheerInputText.trim());
                    if (onShowToast) onShowToast('💌 暖心便签已粘贴到孩子书桌！');
                  }
                  setShowCheerModal(false);
                }}
                className="px-4 py-1.5 rounded-full bg-primary text-on-primary text-xs font-bold cursor-pointer hover:bg-primary-container shadow-2xs"
              >
                粘贴便签 ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Section Header */}
      <div className="flex items-center justify-between px-0.5 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-[20px]">
            target
          </span>
          <h2 className="text-[18px] leading-[24px] font-semibold text-on-surface">
            今日待攻克
          </h2>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {allCorrectCount > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-semibold animate-scale-pop">
              <span>🏆 全对登榜 {allCorrectCount} 科</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface text-[11px] font-medium">
            <span className="w-2 h-2 rounded-full bg-primary-container" />
            <span data-testid="desk-summary-badge">
              {summary.totalCount} 项任务 · 预计 {summary.totalMinutes} 分钟
            </span>
          </div>
          {onClearAllTasks && tasks.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    '确定清空当前书桌上的模拟/全部任务吗？清空后您可以录入属于您自己的真实作业。'
                  )
                ) {
                  onClearAllTasks();
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-outline hover:text-error bg-surface-container-low hover:bg-error-container/20 border border-outline-variant/40 transition-colors cursor-pointer"
              title="一键清空模拟任务，设置自己的任务"
            >
              <span className="material-symbols-outlined text-[13px]">
                delete_sweep
              </span>
              <span>清空任务</span>
            </button>
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="p-8 rounded-3xl bg-surface-container-lowest/90 backdrop-blur-md border border-dashed border-[#EAE4DA] text-center space-y-4 animate-fade-slide">
          <div className="w-14 h-14 mx-auto rounded-full bg-secondary-container/40 text-secondary flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">
              task_alt
            </span>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-on-surface">
              书桌清爽无余粮，准备开启新征程 ✨
            </h3>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed">
              当前暂无待完成作业。您可以点击下方【按住说句话】语音口述作业，或点击【+3秒快记】快速添加，打造专属于您的自律学习清单！
            </p>
          </div>
          <div className="flex items-center justify-center gap-2.5 flex-wrap pt-1">
            {onOpenVoiceModal && (
              <button
                type="button"
                onClick={onOpenVoiceModal}
                className="px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-semibold shadow-sm hover:bg-primary-container cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">mic</span>
                <span>按住说句话建单</span>
              </button>
            )}
            {onOpenQuickAdd && (
              <button
                type="button"
                onClick={onOpenQuickAdd}
                className="px-4 py-2 rounded-full bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>+3秒快记</span>
              </button>
            )}
            {onRestoreDefaultTasks && (
              <button
                type="button"
                onClick={onRestoreDefaultTasks}
                className="px-3.5 py-2 rounded-full text-xs text-on-surface-variant hover:text-on-surface bg-transparent hover:bg-surface-container cursor-pointer flex items-center gap-1 transition-all"
                title="重新载入示范任务体验功能"
              >
                <span className="material-symbols-outlined text-[15px]">refresh</span>
                <span>载入示范任务</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
          const isPeTask = task.subject === '体育锻炼';
          const isHobbyTask = task.subject === '课余兴趣';
          const isAcademicHomework = !isPeTask && !isHobbyTask;
          const cardDurationPresets = isPeTask
            ? PE_PRESET_DURATIONS
            : PRESET_DURATIONS;
          const isCustomDuration = !cardDurationPresets.includes(
            task.estimatedMinutes
          );
          const isPomodoroActive = activeTaskId === task.id;
          const isEditingTask = editingTaskId === task.id;
          const progressPct = isPomodoroActive
            ? calculatePomodoroProgress(remainingSeconds, totalPomodoroSeconds)
            : 0;

          const actualMins = task.actualMinutes ?? (task.completed ? task.estimatedMinutes : undefined);
          let timeDiffBadge: { text: string; colorClass: string } | null = null;
          if (task.completed && actualMins !== undefined) {
            const diff = actualMins - task.estimatedMinutes;
            if (diff < 0) {
              timeDiffBadge = {
                text: `⚡ 提前 ${Math.abs(diff)}m`,
                colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              };
            } else if (diff === 0) {
              timeDiffBadge = {
                text: `🎯 分秒不差 ${actualMins}m`,
                colorClass: 'bg-blue-50 text-blue-700 border-blue-200',
              };
            } else {
              timeDiffBadge = {
                text: `⏱️ 超时 +${diff}m`,
                colorClass: 'bg-amber-50 text-amber-700 border-amber-200',
              };
            }
          }

          return (
            <div
              key={task.id}
              data-testid={`homework-card-${task.id}`}
              className={`bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl p-4 shadow-sm border transition-all space-y-2.5 card-hover-lift ${
                isPomodoroActive
                  ? 'border-primary-container ring-2 ring-primary/15'
                  : 'border-[#EAE4DA]/80'
              } ${task.completed ? 'opacity-65' : ''}`}
            >
              {/* ROW 1: Top Meta Strip (Left: Subject + Type + Edit | Right: Pomodoro + Check) */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-bold shrink-0 inline-flex items-center gap-1 ${
                      task.subjectBadgeClass || getSubjectMeta(task.subject).badgeClass
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {getSubjectMeta(task.subject).icon}
                    </span>
                    <span>{task.subject}</span>
                  </span>
                  <span className="text-xs text-on-surface-variant font-medium truncate max-w-[150px] sm:max-w-none">
                    {task.taskType}
                  </span>
                  <span className="text-outline/50 text-xs">·</span>
                  <button
                    type="button"
                    onClick={() => handleOpenTaskEditor(task)}
                    className="text-xs text-on-surface-variant hover:text-primary font-semibold inline-flex items-center gap-0.5 cursor-pointer transition-colors shrink-0"
                    title="修改科目、项目内容或时间"
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      edit
                    </span>
                    <span>{isEditingTask ? '收起' : '修改'}</span>
                  </button>
                  {onDeleteTask && (
                    <>
                      <span className="text-outline/50 text-xs">·</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`确定删除任务「${task.title}」吗？`)) {
                            onDeleteTask(task.id);
                          }
                        }}
                        className="text-xs text-outline hover:text-error font-medium inline-flex items-center gap-0.5 cursor-pointer transition-colors shrink-0"
                        title="删除该任务"
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          delete_outline
                        </span>
                        <span>删除</span>
                      </button>
                    </>
                  )}
                  {(task.completedPomodoros ?? 0) > 0 && (
                    <span
                      data-testid={`pomodoro-count-${task.id}`}
                      className="text-xs font-bold text-primary shrink-0"
                    >
                      🍅×{task.completedPomodoros}
                    </span>
                  )}
                </div>

                {/* Right Action Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    aria-label={`番茄钟 ${task.title}`}
                    onClick={() => handleStartPomodoro(task)}
                    className={`h-8 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-semibold transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
                      isPomodoroActive
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'bg-primary-fixed/50 text-primary hover:bg-primary-fixed'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      timer
                    </span>
                    <span>
                      {isPomodoroActive
                        ? formatPomodoroTime(remainingSeconds)
                        : `${pomodoroMinutes}m 番茄钟`}
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-label={`完成 ${task.title}`}
                    onClick={() => handleToggleTaskCheck(task)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer shrink-0 ${
                      task.completed
                        ? 'bg-secondary text-on-secondary shadow-xs'
                        : 'bg-surface-container text-outline hover:text-secondary hover:bg-secondary-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[19px]">
                      {task.completed ? 'verified' : 'check_circle'}
                    </span>
                  </button>
                </div>
              </div>

              {/* ROW 2: Full-Width Title & Actual Time Status Badge (Never squeezed by right buttons!) */}
              <div className="flex items-start justify-between gap-2 pt-0.5">
                <h3
                  className={`text-[15px] sm:text-[16px] leading-[22px] font-bold tracking-tight flex-1 ${
                    task.completed
                      ? 'line-through text-outline'
                      : 'text-on-surface'
                  }`}
                >
                  {task.title}
                </h3>

                {task.completed && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {timeDiffBadge && (
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${timeDiffBadge.colorClass}`}>
                        {timeDiffBadge.text}
                      </span>
                    )}
                    {isAcademicHomework && (
                      <button
                        type="button"
                        onClick={() => handleToggleAllCorrect(task)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                          task.isAllCorrect
                            ? 'bg-secondary text-on-secondary border-secondary shadow-2xs'
                            : 'bg-surface-container-low text-on-surface-variant hover:text-secondary border-[#EAE4DA]'
                        }`}
                        title="当晚自批客观题无误（第二天老师批改全对请在明日复盘登榜）"
                      >
                        {task.isAllCorrect ? '✓ 自批无误' : '自批无误?'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Inline Full Editor for Subject, TaskType, Title, and Duration */}
              {isEditingTask && (
                <div
                  data-testid={`task-editor-${task.id}`}
                  className="p-3 rounded-2xl bg-[#FDF8F4] border border-primary/30 space-y-2.5 text-xs animate-fade-slide"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">
                      ✏️ 修改科目、项目内容与耗时
                    </span>
                    {onDeleteTask && (
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        className="text-[11px] text-error hover:underline cursor-pointer"
                      >
                        删除此项
                      </button>
                    )}
                  </div>

                  {/* Subject Selector + Custom Subject Input */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-on-surface-variant font-medium block">
                      所属科目 / 领域（支持点选或手动输入自定义学科）：
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {availableSubjects.map((subj) => {
                        const meta = getSubjectMeta(subj);
                        const isSelected = editSubject === subj;
                        return (
                          <button
                            key={subj}
                            type="button"
                            onClick={() => setEditSubject(subj)}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium cursor-pointer transition-colors inline-flex items-center gap-1 ${
                              isSelected
                                ? 'bg-primary text-on-primary font-semibold'
                                : 'bg-white text-on-surface-variant border border-outline-variant/40'
                            }`}
                          >
                            <span
                              className={`material-symbols-outlined text-[12px] ${
                                isSelected ? 'text-on-primary' : meta.iconColorClass
                              }`}
                            >
                              {meta.icon}
                            </span>
                            <span>{subj}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-on-surface-variant font-medium">
                        自定义学科名称：
                      </span>
                      <input
                        type="text"
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        placeholder="如：地理、生物、道法..."
                        className="bg-white rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary border border-outline-variant/60 focus:outline-none focus:border-primary"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-on-surface-variant font-medium">
                        作业/活动类型：
                      </span>
                      <input
                        type="text"
                        value={editTaskType}
                        onChange={(e) => setEditTaskType(e.target.value)}
                        placeholder="例如：跳绳、练象棋、试卷..."
                        className="bg-white rounded-lg px-2.5 py-1.5 text-xs font-medium text-on-surface border border-outline-variant/60 focus:outline-none focus:border-primary"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-on-surface-variant font-medium">
                        预计耗时(分)：
                      </span>
                      <input
                        type="number"
                        min={5}
                        max={240}
                        value={editMinutes}
                        onChange={(e) => setEditMinutes(e.target.value)}
                        className="bg-white rounded-lg px-2.5 py-1.5 text-xs font-bold text-primary border border-outline-variant/60 focus:outline-none focus:border-primary"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-on-surface-variant font-medium">
                        实际用时(分)：
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={300}
                        value={editActualMinutes}
                        onChange={(e) => setEditActualMinutes(e.target.value)}
                        placeholder="实际完成分钟"
                        className="bg-white rounded-lg px-2.5 py-1.5 text-xs font-bold text-secondary border border-outline-variant/60 focus:outline-none focus:border-secondary"
                      />
                    </label>
                  </div>

                  {/* Quick Duration Pills inside Editor: 5, 10, 15, 20, 25, 30, 45, 60, 90 */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-on-surface-variant">
                      快捷选时长：
                    </span>
                    {[5, 10, 15, 20, 25, 30, 45, 60, 90].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setEditMinutes(String(m))}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer ${
                          Number(editMinutes) === m
                            ? 'bg-primary text-on-primary'
                            : 'bg-white text-on-surface-variant border border-outline-variant/40'
                        }`}
                      >
                        {m}分
                      </button>
                    ))}
                  </div>

                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-on-surface-variant font-medium">
                      具体内容标题：
                    </span>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="bg-white rounded-lg px-2.5 py-1.5 text-xs font-semibold text-on-surface border border-outline-variant/60 focus:outline-none focus:border-primary"
                    />
                  </label>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingTaskId(null)}
                      className="px-3 py-1.5 rounded-full bg-white text-on-surface-variant text-xs font-medium border border-outline-variant/40 cursor-pointer"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveTaskEditor(task)}
                      className="px-4 py-1.5 rounded-full bg-primary text-on-primary text-xs font-semibold shadow-2xs hover:bg-primary-container cursor-pointer"
                    >
                      保存修改 ✓
                    </button>
                  </div>
                </div>
              )}

              {/* Active Pomodoro Focus Panel */}
              {isPomodoroActive && (
                <div
                  data-testid={`pomodoro-panel-${task.id}`}
                  className="p-3 rounded-2xl bg-[#FDF8F4] border border-primary-container/35 flex flex-col gap-2.5 shadow-2xs animate-fade-slide"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                        <svg
                          className="w-11 h-11 -rotate-90"
                          viewBox="0 0 36 36"
                        >
                          <circle
                            cx="18"
                            cy="18"
                            r="15"
                            fill="none"
                            stroke="#EAE4DA"
                            strokeWidth="3"
                          />
                          <circle
                            cx="18"
                            cy="18"
                            r="15"
                            fill="none"
                            stroke="#D97757"
                            strokeWidth="3"
                            strokeDasharray="94.2"
                            strokeDashoffset={
                              94.2 - (94.2 * progressPct) / 100
                            }
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="material-symbols-outlined text-primary text-[16px] absolute">
                          {isRunning ? 'local_fire_department' : 'pause'}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span
                            data-testid={`pomodoro-timer-display-${task.id}`}
                            className="text-xl font-bold text-primary tracking-tight tabular-nums"
                          >
                            {formatPomodoroTime(remainingSeconds)}
                          </span>
                          <span className="text-[11px] font-semibold text-on-surface-variant">
                            {isRunning ? '沉浸专注中' : '已暂停'}
                          </span>
                        </div>
                        <p className="text-[11px] text-outline">
                          {pomodoroMinutes}分钟专注计时 · 结束播放暖音与提醒
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={() => setIsRunning((prev) => !prev)}
                        className="px-2.5 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {isRunning ? '暂停' : '继续'}
                      </button>
                      <button
                        type="button"
                        onClick={handleResetPomodoro}
                        className="px-2.5 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap"
                      >
                        重置
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFinishPomodoroNow(task)}
                        className="px-3 py-1.5 rounded-full bg-secondary text-on-secondary text-[11px] font-semibold shadow-2xs hover:bg-secondary/90 active:scale-95 transition-all cursor-pointer flex items-center gap-0.5 whitespace-nowrap"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          notifications_active
                        </span>
                        <span>完成结算</span>
                      </button>
                      <button
                        type="button"
                        aria-label="收起番茄钟"
                        onClick={() => {
                          setIsRunning(false);
                          setActiveTaskId(null);
                        }}
                        className="w-7 h-7 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          close
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ROW 3: Compact Single-Line Duration Chip (Click 调档 to expand, saving 35% height!) */}
              <div className="bg-surface-container/60 p-2 rounded-xl flex flex-col gap-1.5">
                {/* Top sub-row: Current duration on left, +5m/+15m and Custom on right */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenTaskEditor(task)}
                    className="text-xs text-on-surface-variant hover:text-primary flex items-center gap-1 font-medium cursor-pointer"
                    title="点击修改科目、项目内容或任意分钟数"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      schedule
                    </span>
                    <span>
                      预计耗时{' '}
                      <strong className="text-primary font-bold underline decoration-dotted underline-offset-2">
                        {task.estimatedMinutes} 分钟
                      </strong>
                    </span>
                    {task.completed && task.actualMinutes !== undefined && (
                      <span className="text-[11px] text-on-surface-variant/80 ml-1">
                        · 实际 {task.actualMinutes}m
                      </span>
                    )}
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    {isCustomDuration && (
                      <span className="px-2 py-0.5 rounded-md bg-primary/15 text-primary text-[11px] font-bold">
                        自定义 {task.estimatedMinutes}m
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        onSelectDuration(
                          task.id,
                          clampTaskDuration(
                            task.estimatedMinutes + (isPeTask ? 5 : 15)
                          )
                        )
                      }
                      className="px-2 py-0.5 rounded-md bg-white hover:bg-primary-fixed/60 text-primary text-[11px] font-bold border border-[#EAE4DA] transition-all cursor-pointer whitespace-nowrap active:scale-95"
                      title="每次累加时长"
                    >
                      +{isPeTask ? 5 : 15}m
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedDurationTaskId((prev) =>
                          prev === task.id ? null : task.id
                        )
                      }
                      className="px-2 py-0.5 rounded-md bg-white hover:bg-surface-container text-on-surface-variant hover:text-on-surface text-[11px] font-semibold border border-[#EAE4DA] transition-all cursor-pointer flex items-center gap-0.5 whitespace-nowrap active:scale-95"
                      title="展开或收起快捷时长档位选择"
                    >
                      <span>
                        {expandedDurationTaskId === task.id ? '收起' : '调档'}
                      </span>
                      <span className="material-symbols-outlined text-[13px]">
                        {expandedDurationTaskId === task.id
                          ? 'expand_less'
                          : 'expand_more'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Bottom sub-row: Only expands when expandedDurationTaskId === task.id, saving ~35% height */}
                {expandedDurationTaskId === task.id && (
                  <div
                    className={`grid gap-1 pt-1.5 border-t border-[#EAE4DA]/60 animate-fade-slide ${
                      isPeTask ? 'grid-cols-7' : 'grid-cols-6'
                    }`}
                  >
                    {cardDurationPresets.map((mins) => {
                      const isActive = task.estimatedMinutes === mins;
                      return (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => {
                            onSelectDuration(task.id, mins);
                            setExpandedDurationTaskId(null);
                          }}
                          className={`py-1 rounded-lg text-[11px] font-semibold text-center transition-all cursor-pointer whitespace-nowrap ${
                            isActive
                              ? 'bg-primary text-on-primary shadow-xs font-bold'
                              : 'bg-white/75 text-on-surface-variant hover:text-on-surface hover:bg-white'
                          }`}
                        >
                          {mins}m
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </section>
  );
};
