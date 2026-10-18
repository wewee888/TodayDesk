import React, { useEffect, useState } from 'react';
import type { HomeworkTask, SubjectName } from '../types/study';
import {
  DEFAULT_SUBJECTS,
  calculateDeskSummary,
  calculatePomodoroProgress,
  clampTaskDuration,
  formatPomodoroTime,
  getSubjectBadgeClass,
  getSubjectMeta,
} from '../utils/studyLogic';

interface TodayHomeworkListProps {
  tasks: HomeworkTask[];
  pomodoroMinutes?: number;
  customSubjects?: SubjectName[];
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
  pomodoroMinutes = 25,
  customSubjects = [],
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

  // Inline full task editor state (subject, taskType, title, custom minutes)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState<SubjectName>('数学');
  const [editTaskType, setEditTaskType] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editMinutes, setEditMinutes] = useState<string>('30');

  const availableSubjects = Array.from(
    new Set([...DEFAULT_SUBJECTS, ...customSubjects])
  );

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
  };

  const handleSaveTaskEditor = (task: HomeworkTask) => {
    const parsedMins = parseInt(editMinutes, 10);
    const clampedMins = clampTaskDuration(
      Number.isNaN(parsedMins) ? task.estimatedMinutes : parsedMins
    );
    const nextSubject = editSubject.trim() || task.subject;
    const updated: HomeworkTask = {
      ...task,
      subject: nextSubject,
      subjectBadgeClass: getSubjectBadgeClass(nextSubject),
      taskType: editTaskType.trim() || task.taskType,
      title: editTitle.trim() || task.title,
      estimatedMinutes: clampedMins,
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

  const handleToggleAllCorrect = (task: HomeworkTask) => {
    const nextState = !task.isAllCorrect;
    const updated: HomeworkTask = {
      ...task,
      isAllCorrect: nextState,
      accuracyNote: nextState ? '已登老师每日全对名单' : undefined,
    };
    if (onUpdateTask) {
      onUpdateTask(updated);
    }
    if (onShowToast) {
      onShowToast(
        nextState
          ? `🏆 已记载「${task.subject}」作业全对！登上老师全对名单 ✨`
          : `已取消「${task.subject}」全对标记`
      );
    }
  };

  return (
    <section aria-label="今日待攻克" className="space-y-3">
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
                    onClick={() => onToggleTaskComplete(task.id)}
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

              {/* ROW 2: Full-Width Title & All-Correct Honor Roll Toggle (Never squeezed by right buttons!) */}
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

                {isAcademicHomework && (
                  <button
                    type="button"
                    onClick={() => handleToggleAllCorrect(task)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0 active:scale-95 ${
                      task.isAllCorrect
                        ? 'bg-secondary text-on-secondary shadow-2xs animate-scale-pop'
                        : 'bg-surface-container-low hover:bg-secondary-container text-on-surface-variant hover:text-on-secondary-container border border-[#EAE4DA]'
                    }`}
                    title="记载该科作业是否全对（如数学老师每天公布的全对作业名单）"
                  >
                    <span>
                      {task.isAllCorrect ? '🏆 全对登榜 ✓' : '🏆 记全对'}
                    </span>
                  </button>
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                        耗时(分钟，支持5~240m)：
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

              {/* ROW 3: Clean Two-Line Duration Selector (No Orphan Button Wrapping!) */}
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
                      className="px-2 py-0.5 rounded-md bg-white hover:bg-primary-fixed/60 text-primary text-[11px] font-bold border border-[#EAE4DA] transition-all cursor-pointer whitespace-nowrap"
                      title="每次累加时长"
                    >
                      +{isPeTask ? 5 : 15}分钟
                    </button>
                  </div>
                </div>

                {/* Bottom sub-row: Single-row evenly spaced duration grid (never wraps onto orphan line!) */}
                <div
                  className={`grid gap-1 ${
                    isPeTask ? 'grid-cols-7' : 'grid-cols-6'
                  }`}
                >
                  {cardDurationPresets.map((mins) => {
                    const isActive = task.estimatedMinutes === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => onSelectDuration(task.id, mins)}
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
              </div>
            </div>
          );
        })}
      </div>
      )}
    </section>
  );
};
