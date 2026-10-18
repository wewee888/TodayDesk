import React, { useState } from 'react';
import type { ActivityConfigItem, SubjectName } from '../types/study';
import {
  RECOMMENDED_EXTRA_SUBJECTS,
  buildTaskTitle,
  clampTaskDuration,
  getTaskPresetsForSubject,
} from '../utils/studyLogic';
import { useDragScroll } from '../utils/useDragScroll';

interface QuickCapsuleSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (
    subject: SubjectName,
    taskType: string,
    minutes: number,
    customTitle?: string
  ) => void;
  customSubjects?: SubjectName[];
  onAddCustomSubject?: (newSubject: SubjectName) => void;
  onUpdateCustomSubjects?: (nextCustomSubjects: SubjectName[]) => void;
  onRenameSubject?: (oldName: SubjectName, newName: SubjectName) => void;
  onOpenTimetableImport?: () => void;
  onShowToast?: (msg: string) => void;
  extracurricularActivities?: string[];
  peExercises?: string[];
  activityConfigs?: Record<string, ActivityConfigItem>;
  onOpenSettings?: () => void;
  inlineMode?: boolean;
}

const BASE_SUBJECT_OPTIONS: {
  label: SubjectName;
  icon: string;
  iconColorClass: string;
}[] = [
  { label: '语文', icon: 'stylus_note', iconColorClass: 'text-tertiary' },
  { label: '数学', icon: 'square_foot', iconColorClass: 'text-primary' },
  { label: '英语', icon: 'translate', iconColorClass: 'text-secondary' },
  { label: '物理', icon: 'electric_bolt', iconColorClass: 'text-[#5B82A6]' },
  { label: '化学', icon: 'science', iconColorClass: 'text-[#8C7AA9]' },
  { label: '历史', icon: 'history_edu', iconColorClass: 'text-[#B87D5B]' },
  { label: '地理', icon: 'public', iconColorClass: 'text-[#3B7A67]' },
  { label: '生物', icon: 'biotech', iconColorClass: 'text-[#527D3B]' },
  { label: '道法', icon: 'gavel', iconColorClass: 'text-[#B4544D]' },
  {
    label: '体育锻炼',
    icon: 'directions_run',
    iconColorClass: 'text-secondary',
  },
  {
    label: '课余兴趣',
    icon: 'interests',
    iconColorClass: 'text-tertiary',
  },
  {
    label: '自主自习',
    icon: 'self_improvement',
    iconColorClass: 'text-secondary',
  },
];

// PE & Quick duration presets: 5, 10, 15, 20, 25, 30, 45 + 60, 90
const PE_TIME_PRESETS = [5, 10, 15, 20, 25, 30, 45];
const GENERAL_TIME_PRESETS = [10, 15, 20, 25, 30, 45, 60, 90];

export const QuickCapsuleSheet: React.FC<QuickCapsuleSheetProps> = ({
  isOpen,
  onClose,
  onAddTask,
  customSubjects,
  onAddCustomSubject,
  onUpdateCustomSubjects,
  onRenameSubject,
  onOpenTimetableImport,
  onShowToast,
  extracurricularActivities,
  peExercises,
  activityConfigs,
  onOpenSettings,
  inlineMode = false,
}) => {
  const { dragProps: subjDragProps } = useDragScroll<HTMLDivElement>();
  const [selectedSubject, setSelectedSubject] = useState<SubjectName>('数学');
  const [selectedTask, setSelectedTask] = useState<string>('错题订正');
  const [minutes, setMinutes] = useState<number>(45);
  const [justSubmitted, setJustSubmitted] = useState<boolean>(false);

  // Inline Subject Add / Rename state directly inside QuickCapsuleSheet
  const [showSubjectManager, setShowSubjectManager] = useState<boolean>(false);
  const [newSubjInput, setNewSubjInput] = useState<string>('');
  const [renameTargetVal, setRenameTargetVal] = useState<string>('');
  const [localAddedSubjects, setLocalAddedSubjects] = useState<SubjectName[]>(
    []
  );

  if (!isOpen && !inlineMode) return null;

  const combinedCustom = Array.from(
    new Set([...(customSubjects || []), ...localAddedSubjects])
  );

  const extraSubjectItems = combinedCustom
    .filter((s) => !BASE_SUBJECT_OPTIONS.some((b) => b.label === s))
    .map((s) => ({
      label: s,
      icon: 'menu_book',
      iconColorClass: 'text-primary',
    }));

  const allSubjectOptions = [...BASE_SUBJECT_OPTIONS, ...extraSubjectItems];

  const currentPresets = getTaskPresetsForSubject(
    selectedSubject,
    extracurricularActivities,
    peExercises
  );

  const handleSubjectSelect = (subj: SubjectName) => {
    setSelectedSubject(subj);
    setRenameTargetVal(subj);
    const nextPresets = getTaskPresetsForSubject(
      subj,
      extracurricularActivities,
      peExercises
    );
    const firstTask = nextPresets.taskTypes[0] || '作业练习';
    if (!nextPresets.taskTypes.includes(selectedTask)) {
      setSelectedTask(firstTask);
      const cfg = activityConfigs?.[firstTask];
      if (cfg) {
        setMinutes(cfg.defaultMinutes);
      } else if (subj === '体育锻炼') {
        setMinutes(15);
      } else if (subj === '课余兴趣') {
        setMinutes(45);
      } else {
        setMinutes(30);
      }
    } else if (subj === '体育锻炼') {
      const cfg = activityConfigs?.[selectedTask];
      setMinutes(cfg ? cfg.defaultMinutes : 15);
    }
  };

  const handleCreateNewSubject = (subjName: string) => {
    const trimmed = subjName.trim();
    if (!trimmed) return;
    if (!allSubjectOptions.some((o) => o.label === trimmed)) {
      setLocalAddedSubjects((prev) => [...prev, trimmed]);
    }
    if (onAddCustomSubject) {
      onAddCustomSubject(trimmed);
    }
    if (onUpdateCustomSubjects) {
      const next = Array.from(new Set([...(customSubjects || []), trimmed]));
      onUpdateCustomSubjects(next);
    }
    if (onShowToast) {
      onShowToast(`已添加学科「${trimmed}」✓`);
    }
    setNewSubjInput('');
    handleSubjectSelect(trimmed);
  };

  const handleRenameCurrentSubject = () => {
    const trimmed = renameTargetVal.trim();
    if (!trimmed || trimmed === selectedSubject) return;
    if (onRenameSubject) {
      onRenameSubject(selectedSubject, trimmed);
    }
    if (!allSubjectOptions.some((o) => o.label === trimmed)) {
      setLocalAddedSubjects((prev) => [...prev, trimmed]);
    }
    if (onShowToast) {
      onShowToast(`已将学科改名为「${trimmed}」✓`);
    }
    setSelectedSubject(trimmed);
  };

  const handleTaskSelect = (taskLabel: string) => {
    setSelectedTask(taskLabel);
    const cfg = activityConfigs?.[taskLabel];
    if (cfg) {
      setMinutes(cfg.defaultMinutes);
    } else if (selectedSubject === '体育锻炼') {
      setMinutes(15);
    }
  };

  const handleSubmit = () => {
    const cfg = activityConfigs?.[selectedTask];
    const effectiveSubject = cfg?.subject || selectedSubject;
    const generatedTitle =
      cfg?.subtitle ||
      buildTaskTitle(
        effectiveSubject,
        selectedTask,
        extracurricularActivities,
        peExercises
      );
    onAddTask(effectiveSubject, selectedTask, minutes, generatedTitle);
    setJustSubmitted(true);
    setTimeout(() => {
      setJustSubmitted(false);
      if (!inlineMode) {
        onClose();
      }
    }, 650);
  };

  const activeTimePresets =
    selectedSubject === '体育锻炼' ? PE_TIME_PRESETS : GENERAL_TIME_PRESETS;

  const sheetContent = (
    <div
      className={
        inlineMode
          ? 'bg-[#FDFBF7] rounded-3xl shadow-sm border border-[#EAE4DA] flex flex-col overflow-hidden'
          : 'fixed inset-x-0 bottom-0 z-50 max-w-lg mx-auto bg-[#FDFBF7] rounded-t-[28px] shadow-[0_-12px_44px_rgba(42,24,0,0.18)] flex flex-col overflow-hidden max-h-[88vh] pb-safe animate-[slideUp_0.24s_cubic-bezier(0.16,1,0.3,1)]'
      }
      role={inlineMode ? 'region' : 'dialog'}
      aria-label="3秒免打字快记"
    >
      {/* Tactile Drag Handle */}
      {!inlineMode && (
        <div className="w-full pt-2.5 pb-1 flex justify-center items-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-surface-container-highest" />
        </div>
      )}

      {/* Sheet Header */}
      <div className="px-4 sm:px-5 pt-3 pb-3 flex items-center justify-between gap-2 border-b border-surface-container/60 shrink-0">
        <div className="flex flex-col space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="material-symbols-outlined text-primary text-[19px] shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              bolt
            </span>
            <h2 className="text-[16px] sm:text-[17px] font-bold text-on-surface tracking-tight whitespace-nowrap">
              3秒免打字快记
            </h2>
          </div>
          <p className="text-[11px] text-on-surface-variant whitespace-nowrap">
            全科作业 · 中考体育 · 课余特长
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenTimetableImport && (
            <button
              type="button"
              onClick={onOpenTimetableImport}
              className="px-2.5 py-1 rounded-full bg-secondary-container/70 hover:bg-secondary-container text-on-secondary-container text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
              title="导入课程表图片或文件自动识别本学期学科"
            >
              <span className="material-symbols-outlined text-[14px] shrink-0">
                calendar_view_week
              </span>
              <span>导课表识学科</span>
            </button>
          )}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-2.5 py-1 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span className="material-symbols-outlined text-[14px] text-primary shrink-0">
                tune
              </span>
              <span>管理项目</span>
            </button>
          )}
          {!inlineMode && (
            <button
              type="button"
              aria-label="关闭快记面板"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">
                close
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Options Scroll Area */}
      <div className="px-4 sm:px-5 py-3.5 flex flex-col gap-3.5 overflow-y-auto overflow-x-hidden">
        {/* Step 1: Choose Subject / Domain + Direct Add/Rename Subject */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-on-surface-variant tracking-wide">
              选择科目或活动领域
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-primary font-semibold">
                当前：{selectedSubject}
              </span>
              <button
                type="button"
                onClick={() => {
                  setRenameTargetVal(selectedSubject);
                  setShowSubjectManager((prev) => !prev);
                }}
                className="px-2 py-0.5 rounded-full bg-primary-fixed/60 text-primary text-[11px] font-semibold hover:bg-primary-fixed cursor-pointer whitespace-nowrap"
              >
                {showSubjectManager ? '收起学科管理' : '+ 新增/改学科'}
              </button>
            </div>
          </div>

          <div {...subjDragProps} className="flex flex-wrap gap-1.5 select-none">
            {allSubjectOptions.map((subj) => {
              const isSelected = selectedSubject === subj.label;
              return (
                <button
                  key={subj.label}
                  type="button"
                  onClick={() => handleSubjectSelect(subj.label)}
                  className={`px-2.5 py-1.5 rounded-full text-[12px] font-medium flex items-center gap-1 transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-primary text-on-primary shadow-sm font-semibold'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[14px] ${
                      isSelected ? 'text-on-primary' : subj.iconColorClass
                    }`}
                  >
                    {subj.icon}
                  </span>
                  <span>{subj.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setRenameTargetVal(selectedSubject);
                setShowSubjectManager((prev) => !prev);
              }}
              className="px-2.5 py-1.5 rounded-full text-[12px] font-semibold bg-surface-container border border-dashed border-primary/50 text-primary hover:bg-primary-fixed/40 flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span>自定义学科</span>
            </button>
          </div>

          {/* Inline Subject Add & Rename Panel */}
          {showSubjectManager && (
            <div
              data-testid="capsule-subject-manager"
              className="mt-1 p-2.5 rounded-2xl bg-[#FDF8F4] border border-primary/30 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-primary">
                  📚 新增自定义学科或修改当前学科名
                </span>
                <button
                  type="button"
                  onClick={() => setShowSubjectManager(false)}
                  className="text-[11px] text-outline hover:text-on-surface cursor-pointer"
                >
                  收起
                </button>
              </div>

              {/* Add new subject row */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newSubjInput}
                  onChange={(e) => setNewSubjInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateNewSubject(newSubjInput);
                    }
                  }}
                  placeholder="输入新学科（如：科学、信息科技、奥数、美术...）"
                  className="flex-1 bg-white rounded-xl px-2.5 py-1.5 text-xs text-on-surface border border-outline-variant/50 focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => handleCreateNewSubject(newSubjInput)}
                  className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                >
                  + 新增学科
                </button>
              </div>

              {/* Quick recommended extra subjects */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-outline">一键添加：</span>
                {RECOMMENDED_EXTRA_SUBJECTS.filter(
                  (s) => !allSubjectOptions.some((o) => o.label === s)
                ).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleCreateNewSubject(s)}
                    className="px-2 py-0.5 rounded-full bg-white hover:bg-primary-fixed/50 text-[11px] text-on-surface-variant border border-[#EAE4DA] cursor-pointer whitespace-nowrap"
                  >
                    + {s}
                  </button>
                ))}
              </div>

              {/* Rename selected subject row */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-[#EAE4DA]/70">
                <span className="text-[11px] text-on-surface-variant shrink-0">
                  改名「{selectedSubject}」：
                </span>
                <input
                  type="text"
                  value={renameTargetVal}
                  onChange={(e) => setRenameTargetVal(e.target.value)}
                  className="flex-1 bg-white rounded-xl px-2.5 py-1 text-xs font-semibold text-on-surface border border-outline-variant/50"
                />
                <button
                  type="button"
                  onClick={handleRenameCurrentSubject}
                  className="px-2.5 py-1 rounded-xl bg-secondary text-on-secondary text-[11px] font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                >
                  保存改名
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Dynamic Learning / PE / Hobby Task Type */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-on-surface-variant tracking-wide truncate">
              {selectedSubject === '体育锻炼'
                ? '中考体育与晚间锻炼（常选 10~15 分钟）'
                : selectedSubject === '课余兴趣'
                ? '周末与课余活动项目'
                : '学习类型'}
            </span>
            <span className="text-[11px] text-secondary font-semibold shrink-0">
              当前：{selectedTask}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {currentPresets.taskTypes.map((taskLabel) => {
              const isSelected = selectedTask === taskLabel;
              return (
                <button
                  key={taskLabel}
                  type="button"
                  onClick={() => handleTaskSelect(taskLabel)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium flex items-center gap-1 transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-secondary text-on-secondary shadow-sm font-semibold'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <span>{taskLabel}</span>
                </button>
              );
            })}
            {(selectedSubject === '课余兴趣' ||
              selectedSubject === '体育锻炼') &&
              onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold bg-primary-fixed/50 text-primary hover:bg-primary-fixed transition-colors cursor-pointer whitespace-nowrap"
                >
                  ✏️ 修改/新增/请假
                </button>
              )}
          </div>
        </div>

        {/* Step 3: Estimated Time (Supports 5/10/15/20/25/30/45m & custom input up to 240m) */}
        <div className="flex flex-col gap-2 bg-surface-container-low/80 p-3 rounded-2xl border border-surface-container">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-on-surface-variant tracking-wide">
              快捷选时长或自定义输入
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setMinutes((m) => clampTaskDuration(m - 5))}
                className="w-6 h-6 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold flex items-center justify-center cursor-pointer"
                title="减少 5 分钟"
              >
                -
              </button>
              <input
                type="number"
                min={5}
                max={240}
                aria-label="自定义预估分钟数"
                value={minutes}
                onChange={(e) =>
                  setMinutes(
                    clampTaskDuration(parseInt(e.target.value, 10) || 15)
                  )
                }
                className="w-14 bg-white rounded-lg px-1.5 py-0.5 text-[15px] text-primary font-bold text-center border border-outline-variant/50 focus:outline-none focus:border-primary tabular-nums"
              />
              <span className="text-[12px] text-on-surface-variant">分钟</span>
              <button
                type="button"
                onClick={() => setMinutes((m) => clampTaskDuration(m + 5))}
                className="w-6 h-6 rounded-full bg-primary-fixed/70 hover:bg-primary-fixed text-primary text-xs font-bold flex items-center justify-center cursor-pointer"
                title="增加 5 分钟"
              >
                +
              </button>
            </div>
          </div>

          <div
            className={`grid ${
              selectedSubject === '体育锻炼'
                ? 'grid-cols-7'
                : 'grid-cols-4 sm:grid-cols-8'
            } gap-1`}
          >
            {activeTimePresets.map((preset) => {
              const isSelected = minutes === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMinutes(preset)}
                  className={`py-1.5 rounded-full text-[11px] text-center transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {preset}m
                </button>
              );
            })}
          </div>

          <div className="relative flex items-center w-full pt-1 pb-0.5">
            <input
              type="range"
              aria-label="预估用时滑轨"
              min={5}
              max={180}
              step={5}
              value={Math.min(minutes, 180)}
              onChange={(e) => setMinutes(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-primary"
            />
          </div>

          <div className="flex justify-between items-center px-0.5">
            <span className="text-[11px] text-outline">
              5~15 分钟 (跳绳/体育微练)
            </span>
            <span className="text-[11px] text-outline">
              180 分钟 (长时模考/精练)
            </span>
          </div>
        </div>

        {/* Real-time Live Generated Summary Preview Card */}
        <div className="p-2.5 rounded-2xl bg-secondary-container/40 border border-secondary-container flex items-center gap-2.5 shadow-xs shrink-0">
          <div className="w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center shrink-0 shadow-xs">
            <span
              className="material-symbols-outlined text-[16px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              electric_bolt
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-on-secondary-container font-bold tracking-wider">
              生成就绪
            </span>
            <span
              data-testid="capsule-preview-text"
              className="text-[13px] font-semibold text-on-surface truncate"
            >
              ⚡ 将创建：{selectedSubject} · {selectedTask} (预计 {minutes} 分钟)
            </span>
          </div>
        </div>
      </div>

      {/* Sticky Bottom CTA Area */}
      <div className="px-5 pt-1.5 pb-3.5 flex flex-col gap-1.5 bg-[#FDFBF7] shrink-0 border-t border-surface-container/40">
        <button
          type="button"
          onClick={handleSubmit}
          className={`w-full h-11 rounded-full font-semibold text-[15px] shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 select-none cursor-pointer ${
            justSubmitted
              ? 'bg-secondary text-on-secondary'
              : 'bg-primary-container text-on-primary hover:bg-primary'
          }`}
        >
          <span className="material-symbols-outlined text-[19px]">
            {justSubmitted ? 'check_circle' : 'add_task'}
          </span>
          <span>{justSubmitted ? '已安排在书桌！' : '+ 加入今日书桌'}</span>
        </button>
        <p
          className={`text-[11px] text-center select-none ${
            justSubmitted
              ? 'text-secondary font-semibold'
              : 'text-on-surface-variant'
          }`}
        >
          {justSubmitted
            ? '✨ 专注力 +10 · 沉浸自律开启'
            : '已就绪 · 点击即存'}
        </p>
      </div>
    </div>
  );

  if (inlineMode) {
    return sheetContent;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      {sheetContent}
    </>
  );
};
