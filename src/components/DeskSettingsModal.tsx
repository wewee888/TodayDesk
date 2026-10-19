import React, { useEffect, useState } from 'react';
import type {
  ActivityConfigItem,
  AttendanceStatus,
  DeskSettings,
  ScheduleFrequencyType,
  ScheduleItem,
  SubjectName,
} from '../types/study';
import {
  DEFAULT_SUBJECTS,
  RECOMMENDED_EXTRA_SUBJECTS,
  clampTaskDuration,
  getAttendanceStatusMeta,
  getDefaultSubjectsForGrade,
  getScheduleFrequencyBadge,
  getSubjectBadgeClass,
} from '../utils/studyLogic';

interface DeskSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DeskSettings;
  onUpdateSettings: (next: DeskSettings) => void;
  onQuickAddExtracurricularTask: (
    subject: SubjectName,
    activityName: string,
    minutes: number,
    title: string
  ) => void;
  onAddExtracurricularSchedule: (item: ScheduleItem) => void;
  onSyncActivityAttendance?: (
    activityName: string,
    status: AttendanceStatus,
    leaveNote?: string
  ) => void;
  onRenameSubjectGlobal?: (oldName: SubjectName, newName: SubjectName) => void;
  onRenameSubject?: (oldName: SubjectName, newName: SubjectName) => void;
  onPurgeAllMockData?: () => void;
  onRestoreAllMockData?: () => void;
  onShowToast: (msg: string) => void;
}

const RECOMMENDED_HOBBIES = [
  '练象棋',
  '练钢琴',
  '练小号',
  '围棋对弈',
  '小提琴',
  '硬笔书法',
  'Python编程',
  '素描写生',
];

const RECOMMENDED_PE_EXERCISES = [
  '晚间跳绳',
  '1000m/800m耐力跑',
  '立定跳远',
  '引体/仰卧起坐',
  '篮球绕杆',
  '足球绕杆',
  '排球垫球',
  '实心球投掷',
  '游泳耐力',
];

// Quick duration options when clicking "+ 记今日" (5, 10, 15, 20, 25, 30, 45, 60, 90)
const QUICK_TODAY_DURATIONS = [5, 10, 15, 20, 25, 30, 45, 60, 90];

const GLOBAL_DEFAULT_DURATIONS = [10, 15, 20, 30, 45, 60, 90, 120];

const FIXED_TIME_PRESETS = [
  '每晚 20:45',
  '每晚 21:00',
  '周六 15:00',
  '周日 10:00',
  '每周五 19:30',
];

const FLEXIBLE_TIME_PRESETS = [
  '不固定 · 机动安排',
  '不固定 · 随堂约课',
  '周末机动',
  '晚间机动',
];

export const DeskSettingsModal: React.FC<DeskSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onQuickAddExtracurricularTask,
  onAddExtracurricularSchedule,
  onSyncActivityAttendance,
  onRenameSubjectGlobal,
  onRenameSubject,
  onPurgeAllMockData,
  onRestoreAllMockData,
  onShowToast,
}) => {
  // Top-level add form state for Extracurricular Hobby
  const [showAddHobbyPanel, setShowAddHobbyPanel] = useState(false);
  const [customHobbyInput, setCustomHobbyInput] = useState('');
  const [customHobbySubject, setCustomHobbySubject] =
    useState<SubjectName>('课余兴趣');
  const [customHobbyMinutes, setCustomHobbyMinutes] = useState<number>(45);
  const [customHobbyScheduleType, setCustomHobbyScheduleType] =
    useState<ScheduleFrequencyType>('weekly_fixed');
  const [customHobbyScheduleTime, setCustomHobbyScheduleTime] =
    useState<string>('周六 15:00');

  // Top-level add form state for PE Exercise (defaults to 15m!)
  const [showAddPePanel, setShowAddPePanel] = useState(false);
  const [customPeInput, setCustomPeInput] = useState('');
  const [customPeMinutes, setCustomPeMinutes] = useState<number>(15);
  const [customPeScheduleType, setCustomPeScheduleType] =
    useState<ScheduleFrequencyType>('weekly_fixed');
  const [customPeScheduleTime, setCustomPeScheduleTime] =
    useState<string>('每晚 20:45');

  const [selectedDuration, setSelectedDuration] = useState<number>(15);
  const [studentName, setStudentName] = useState(settings.studentName);
  const [gradeClass, setGradeClass] = useState(settings.gradeClass);
  const [pomodoroMinutes, setPomodoroMinutes] = useState(
    settings.pomodoroMinutes
  );

  useEffect(() => {
    if (isOpen) {
      setStudentName(settings.studentName);
      setGradeClass(settings.gradeClass);
      setPomodoroMinutes(settings.pomodoroMinutes);
    }
  }, [
    isOpen,
    settings.studentName,
    settings.gradeClass,
    settings.pomodoroMinutes,
  ]);

  // Quick Today Duration Picker state (opens when clicking "+ 记今日")
  const [quickLogTargetName, setQuickLogTargetName] = useState<string | null>(
    null
  );
  const [quickLogCustomMinutes, setQuickLogCustomMinutes] =
    useState<string>('20');

  // Quick Leave / Pause Picker state (opens when clicking "请假/暂停")
  const [leaveTargetName, setLeaveTargetName] = useState<string | null>(null);
  const [leaveTargetCategory, setLeaveTargetCategory] = useState<
    'pe' | 'hobby' | null
  >(null);
  const [leaveNoteInput, setLeaveNoteInput] = useState<string>('');

  // Inline editing state for any PE or extracurricular item
  const [editingItemName, setEditingItemName] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<'pe' | 'hobby' | null>(
    null
  );
  const [editNameVal, setEditNameVal] = useState('');
  const [editSubjectVal, setEditSubjectVal] =
    useState<SubjectName>('课余兴趣');
  const [editMinutesVal, setEditMinutesVal] = useState<number>(45);
  const [editScheduleTypeVal, setEditScheduleTypeVal] =
    useState<ScheduleFrequencyType>('weekly_fixed');
  const [editScheduleTimeVal, setEditScheduleTimeVal] = useState('周六 15:00');
  const [editSubtitleVal, setEditSubtitleVal] = useState('');
  const [editAttendanceVal, setEditAttendanceVal] =
    useState<AttendanceStatus>('active');
  const [editLeaveNoteVal, setEditLeaveNoteVal] = useState('');

  // Custom subject management state
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [renamingSubject, setRenamingSubject] = useState<SubjectName | null>(
    null
  );
  const [renameSubjectVal, setRenameSubjectVal] = useState('');

  if (!isOpen) return null;

  const allAvailableSubjects: SubjectName[] = Array.from(
    new Set([
      ...getDefaultSubjectsForGrade(settings.gradeClass),
      ...(settings.customSubjects || []),
    ])
  );

  const getItemConfig = (
    name: string,
    fallbackCategory: 'pe' | 'hobby'
  ): ActivityConfigItem => {
    const existing = settings.activityConfigs?.[name];
    if (existing) {
      return {
        ...existing,
        scheduleType:
          existing.scheduleType ||
          (existing.scheduleTime?.includes('不固定') ||
          existing.scheduleTime?.includes('机动')
            ? 'flexible'
            : 'weekly_fixed'),
        attendanceStatus: existing.attendanceStatus || 'active',
      };
    }
    return {
      id: `cfg-${name}`,
      name,
      subject: fallbackCategory === 'pe' ? '体育锻炼' : '课余兴趣',
      defaultMinutes: fallbackCategory === 'pe' ? 15 : 45,
      scheduleType: 'weekly_fixed',
      scheduleTime: fallbackCategory === 'pe' ? '每晚 20:45' : '周六 15:00',
      subtitle:
        fallbackCategory === 'pe'
          ? `初中体育中考晚间锻炼 · ${name}`
          : `课余特长与素养练习 · ${name}`,
      attendanceStatus: 'active',
    };
  };

  const handleStartEditItem = (name: string, category: 'pe' | 'hobby') => {
    const cfg = getItemConfig(name, category);
    setQuickLogTargetName(null);
    setLeaveTargetName(null);
    setEditingItemName(name);
    setEditingCategory(category);
    setEditNameVal(cfg.name);
    setEditSubjectVal(cfg.subject);
    setEditMinutesVal(cfg.defaultMinutes);
    setEditScheduleTypeVal(cfg.scheduleType || 'weekly_fixed');
    setEditScheduleTimeVal(cfg.scheduleTime);
    setEditSubtitleVal(
      cfg.subtitle ||
        (category === 'pe'
          ? `初中体育中考晚间锻炼 · ${name}`
          : `课余特长专注练习 · ${name}`)
    );
    setEditAttendanceVal(cfg.attendanceStatus || 'active');
    setEditLeaveNoteVal(cfg.leaveNote || '');
  };

  const handleSaveItemEdit = () => {
    if (!editingItemName || !editingCategory) return;
    const trimmedName = editNameVal.trim() || editingItemName;
    const clampedMins = clampTaskDuration(editMinutesVal);
    const updatedConfigs: Record<string, ActivityConfigItem> = {
      ...(settings.activityConfigs || {}),
    };

    if (trimmedName !== editingItemName) {
      delete updatedConfigs[editingItemName];
    }

    const defaultTime =
      editScheduleTypeVal === 'flexible' ? '不固定 · 机动安排' : '周末固定';

    updatedConfigs[trimmedName] = {
      id: `cfg-${Date.now()}`,
      name: trimmedName,
      subject: editSubjectVal,
      defaultMinutes: clampedMins,
      scheduleType: editScheduleTypeVal,
      scheduleTime: editScheduleTimeVal.trim() || defaultTime,
      subtitle:
        editSubtitleVal.trim() ||
        `${editSubjectVal} · ${trimmedName} (${clampedMins}分钟)`,
      attendanceStatus: editAttendanceVal,
      leaveNote: editLeaveNoteVal.trim() || undefined,
    };

    if (editingCategory === 'pe') {
      const nextPeList = settings.peExercises.map((item) =>
        item === editingItemName ? trimmedName : item
      );
      onUpdateSettings({
        ...settings,
        peExercises: nextPeList,
        activityConfigs: updatedConfigs,
      });
    } else {
      const nextHobbyList = settings.extracurricularActivities.map((item) =>
        item === editingItemName ? trimmedName : item
      );
      onUpdateSettings({
        ...settings,
        extracurricularActivities: nextHobbyList,
        activityConfigs: updatedConfigs,
      });
    }

    if (onSyncActivityAttendance) {
      onSyncActivityAttendance(
        trimmedName,
        editAttendanceVal,
        editLeaveNoteVal.trim() || undefined
      );
    }

    setEditingItemName(null);
    setEditingCategory(null);
    onShowToast(
      `已更新「${trimmedName}」：${editSubjectVal} · ${clampedMins}分钟 (${
        editScheduleTypeVal === 'flexible' ? '不固定' : '每周固定'
      }) ✓`
    );
  };

  const handleSetItemAttendance = (
    name: string,
    category: 'pe' | 'hobby',
    status: AttendanceStatus,
    note?: string
  ) => {
    const cfg = getItemConfig(name, category);
    const meta = getAttendanceStatusMeta(status, note);
    const updatedConfigs: Record<string, ActivityConfigItem> = {
      ...(settings.activityConfigs || {}),
      [name]: {
        ...cfg,
        attendanceStatus: status,
        leaveNote:
          status === 'active'
            ? undefined
            : note?.trim() || meta.defaultNote,
      },
    };
    onUpdateSettings({
      ...settings,
      activityConfigs: updatedConfigs,
    });
    if (onSyncActivityAttendance) {
      onSyncActivityAttendance(
        name,
        status,
        status === 'active' ? undefined : note?.trim() || meta.defaultNote
      );
    }
    setLeaveTargetName(null);
    setLeaveTargetCategory(null);
    if (status === 'active') {
      onShowToast(`已恢复「${name}」正常上课/训练状态 ✓`);
    } else {
      onShowToast(`已将「${name}」标记为：${meta.shortLabel} ⏸️`);
    }
  };

  const handleAddActivityTag = (
    tagName: string,
    subj: SubjectName = customHobbySubject,
    mins: number = customHobbyMinutes,
    schedType: ScheduleFrequencyType = customHobbyScheduleType,
    schedTime: string = customHobbyScheduleTime
  ) => {
    const trimmed = tagName.trim();
    if (!trimmed) return;
    if (settings.extracurricularActivities.includes(trimmed)) {
      onShowToast(`「${trimmed}」已在课余活动库中`);
      return;
    }
    const clamped = clampTaskDuration(mins);
    const finalTime =
      schedTime.trim() ||
      (schedType === 'flexible' ? '不固定 · 机动安排' : '周六 15:00');
    const nextConfigs: Record<string, ActivityConfigItem> = {
      ...(settings.activityConfigs || {}),
      [trimmed]: {
        id: `cfg-hb-${Date.now()}`,
        name: trimmed,
        subject: subj,
        defaultMinutes: clamped,
        scheduleType: schedType,
        scheduleTime: finalTime,
        subtitle: `${subj} · ${trimmed}专注练习`,
        attendanceStatus: 'active',
      },
    };
    onUpdateSettings({
      ...settings,
      extracurricularActivities: [
        trimmed,
        ...settings.extracurricularActivities,
      ],
      activityConfigs: nextConfigs,
    });
    setCustomHobbyInput('');
    setShowAddHobbyPanel(false);
    onShowToast(
      `已新增课余项目：「${trimmed}」(${
        schedType === 'flexible' ? '不固定排期' : '每周固定'
      } · ${clamped}m) 🎯`
    );
  };

  const handleRemoveActivityTag = (tagName: string) => {
    onUpdateSettings({
      ...settings,
      extracurricularActivities: settings.extracurricularActivities.filter(
        (a) => a !== tagName
      ),
    });
    if (editingItemName === tagName) {
      setEditingItemName(null);
    }
    onShowToast(`已移除「${tagName}」`);
  };

  const handleAddPeTag = (
    peName: string,
    mins: number = customPeMinutes,
    schedType: ScheduleFrequencyType = customPeScheduleType,
    schedTime: string = customPeScheduleTime
  ) => {
    const trimmed = peName.trim();
    if (!trimmed) return;
    if (settings.peExercises.includes(trimmed)) {
      onShowToast(`「${trimmed}」已在中考体育锻炼库中`);
      return;
    }
    const clamped = clampTaskDuration(mins);
    const finalTime =
      schedTime.trim() ||
      (schedType === 'flexible' ? '不固定 · 机动锻炼' : '每晚 20:45');
    const nextConfigs: Record<string, ActivityConfigItem> = {
      ...(settings.activityConfigs || {}),
      [trimmed]: {
        id: `cfg-pe-${Date.now()}`,
        name: trimmed,
        subject: '体育锻炼',
        defaultMinutes: clamped,
        scheduleType: schedType,
        scheduleTime: finalTime,
        subtitle: `初中体育中考晚间锻炼 · ${trimmed}`,
        attendanceStatus: 'active',
      },
    };
    onUpdateSettings({
      ...settings,
      peExercises: [trimmed, ...settings.peExercises],
      activityConfigs: nextConfigs,
    });
    setCustomPeInput('');
    setShowAddPePanel(false);
    onShowToast(
      `已新增中考体育项目：「${trimmed}」(${clamped}分钟 · ${
        schedType === 'flexible' ? '机动安排' : finalTime
      }) 🏃`
    );
  };

  const handleRemovePeTag = (peName: string) => {
    onUpdateSettings({
      ...settings,
      peExercises: settings.peExercises.filter((p) => p !== peName),
    });
    if (editingItemName === peName) {
      setEditingItemName(null);
    }
    onShowToast(`已移除「${peName}」`);
  };

  const handleAddCustomSubject = (subjName: string) => {
    const trimmed = subjName.trim();
    if (!trimmed) return;
    if (allAvailableSubjects.includes(trimmed)) {
      onShowToast(`学科「${trimmed}」已存在`);
      return;
    }
    onUpdateSettings({
      ...settings,
      customSubjects: [...(settings.customSubjects || []), trimmed],
    });
    setNewSubjectInput('');
    onShowToast(`已新增自定义学科：「${trimmed}」📚`);
  };

  const handleConfirmRenameSubject = (oldSubj: SubjectName) => {
    const trimmed = renameSubjectVal.trim();
    if (!trimmed || trimmed === oldSubj) {
      setRenamingSubject(null);
      return;
    }
    const nextCustom = Array.from(
      new Set(
        allAvailableSubjects.map((s) => (s === oldSubj ? trimmed : s))
      )
    );
    const updatedConfigs: Record<string, ActivityConfigItem> = {};
    for (const [k, v] of Object.entries(settings.activityConfigs || {})) {
      updatedConfigs[k] = {
        ...v,
        subject: v.subject === oldSubj ? trimmed : v.subject,
      };
    }
    onUpdateSettings({
      ...settings,
      customSubjects: nextCustom,
      activityConfigs: updatedConfigs,
    });
    const renameFn = onRenameSubjectGlobal || onRenameSubject;
    if (renameFn) {
      renameFn(oldSubj, trimmed);
    }
    setRenamingSubject(null);
    onShowToast(`已将学科「${oldSubj}」修改为「${trimmed}」✓`);
  };

  const handleSaveBasicSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const nextStudent = studentName.trim() || '李子涵';
    const nextGrade = gradeClass.trim() || '初二 (3) 班';
    onUpdateSettings({
      ...settings,
      studentName: nextStudent,
      gradeClass: nextGrade,
      pomodoroMinutes,
    });
    onShowToast(`已保存班级与学生设置：${nextGrade} · ${nextStudent} ✓`);
    onClose();
  };

  // Renders the Quick Duration Picker when user clicks "+ 记今日"
  const renderQuickDurationPicker = (cfg: ActivityConfigItem, actName: string) => (
    <div
      data-testid={`quick-duration-picker-${actName}`}
      className="mt-1.5 p-2.5 rounded-xl bg-[#FDF8F4] border border-primary/30 space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-primary">
          ⏱️ 选择「{actName}」今日时长（点选即记入书桌）：
        </span>
        <button
          type="button"
          onClick={() => setQuickLogTargetName(null)}
          className="text-[11px] text-outline hover:text-on-surface cursor-pointer shrink-0"
        >
          收起
        </button>
      </div>

      {/* Preset buttons: 5, 10, 15, 20, 25, 30, 45, 60, 90 */}
      <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5">
        {QUICK_TODAY_DURATIONS.map((mins) => (
          <button
            key={mins}
            type="button"
            onClick={() => {
              onQuickAddExtracurricularTask(
                cfg.subject,
                actName,
                mins,
                cfg.subtitle || `${cfg.subject} · ${actName} (${mins}分钟)`
              );
              setQuickLogTargetName(null);
            }}
            className={`py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center ${
              cfg.defaultMinutes === mins
                ? 'bg-primary text-on-primary shadow-2xs'
                : 'bg-white text-on-surface hover:bg-primary-fixed/60 hover:text-primary border border-[#EAE4DA]'
            }`}
          >
            {mins}分
          </button>
        ))}
      </div>

      {/* Custom duration input */}
      <div className="flex items-center gap-1.5 pt-0.5">
        <span className="text-[11px] text-on-surface-variant shrink-0">
          自定义时长：
        </span>
        <input
          type="number"
          min={5}
          max={240}
          aria-label={`${actName}自定义分钟数`}
          value={quickLogCustomMinutes}
          onChange={(e) => setQuickLogCustomMinutes(e.target.value)}
          className="w-16 bg-white rounded-lg px-2 py-1 text-xs font-bold text-primary text-center border border-outline-variant/60 focus:outline-none focus:border-primary"
        />
        <span className="text-[11px] text-on-surface-variant shrink-0">
          分钟
        </span>
        <button
          type="button"
          onClick={() => {
            const parsed = clampTaskDuration(
              parseInt(quickLogCustomMinutes, 10) || cfg.defaultMinutes
            );
            onQuickAddExtracurricularTask(
              cfg.subject,
              actName,
              parsed,
              cfg.subtitle || `${cfg.subject} · ${actName} (${parsed}分钟)`
            );
            setQuickLogTargetName(null);
          }}
          className="ml-auto px-3 py-1 rounded-full bg-primary text-on-primary text-[11px] font-semibold hover:bg-primary-container cursor-pointer shrink-0"
        >
          确认记今日 ✓
        </button>
      </div>
    </div>
  );

  // Renders the Quick Leave / Pause Picker when user clicks "请假/暂停"
  const renderLeavePausePicker = (
    cfg: ActivityConfigItem,
    actName: string,
    category: 'pe' | 'hobby'
  ) => (
    <div
      data-testid={`leave-picker-${actName}`}
      className="mt-1.5 p-2.5 rounded-xl bg-[#FFF9F2] border border-[#F3D9B1] space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-[#9A5300]">
          ⏸️ 设置「{actName}」请假或暂停状态：
        </span>
        <button
          type="button"
          onClick={() => {
            setLeaveTargetName(null);
            setLeaveTargetCategory(null);
          }}
          className="text-[11px] text-outline hover:text-on-surface cursor-pointer shrink-0"
        >
          收起
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {(
          [
            { status: 'active', label: '✅ 正常上课' },
            { status: 'teacher_leave', label: '🧑‍🏫 老师请假' },
            { status: 'student_leave', label: '🙋 自己请假' },
            { status: 'paused', label: '⏸️ 阶段暂停' },
          ] as { status: AttendanceStatus; label: string }[]
        ).map((opt) => (
          <button
            key={opt.status}
            type="button"
            onClick={() =>
              handleSetItemAttendance(
                actName,
                category,
                opt.status,
                leaveNoteInput
              )
            }
            className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer text-center whitespace-nowrap ${
              (cfg.attendanceStatus || 'active') === opt.status
                ? 'bg-primary text-on-primary shadow-2xs'
                : 'bg-white text-on-surface hover:bg-surface-container border border-[#EAE4DA]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={leaveNoteInput}
          onChange={(e) => setLeaveNoteInput(e.target.value)}
          placeholder="选填请假/调课备注（如：老师请假顺延至下周日）"
          className="flex-1 bg-white rounded-lg px-2.5 py-1 text-[11px] text-on-surface border border-outline-variant/50 focus:outline-none focus:border-primary"
        />
      </div>
    </div>
  );

  const renderInlineEditor = () => (
    <div
      data-testid="activity-inline-editor"
      className="mt-2 pt-2.5 border-t border-primary/20 bg-[#FDF8F4] -mx-1 px-2.5 pb-2 rounded-xl space-y-2.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-primary">
          ✏️ 修改科目、时长、排期方式与请假状态
        </span>
        <button
          type="button"
          onClick={() => {
            setEditingItemName(null);
            setEditingCategory(null);
          }}
          className="text-[11px] text-outline hover:text-on-surface cursor-pointer"
        >
          取消
        </button>
      </div>

      {/* 1. Subject Selector */}
      <div className="space-y-1">
        <span className="text-[11px] font-medium text-on-surface-variant block">
          所属科目 / 分类：
        </span>
        <div className="flex flex-wrap gap-1">
          {allAvailableSubjects.map((subj) => (
            <button
              key={subj}
              type="button"
              onClick={() => setEditSubjectVal(subj)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                editSubjectVal === subj
                  ? 'bg-primary text-on-primary font-semibold shadow-2xs'
                  : 'bg-white text-on-surface-variant border border-outline-variant/40 hover:bg-surface-container'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Name & Duration Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-[11px]">
          <span className="text-on-surface-variant font-medium">项目名称：</span>
          <input
            type="text"
            value={editNameVal}
            onChange={(e) => setEditNameVal(e.target.value)}
            className="bg-white rounded-lg px-2.5 py-1.5 text-xs font-semibold text-on-surface border border-outline-variant/60 focus:outline-none focus:border-primary"
          />
        </label>

        <label className="flex flex-col gap-1 text-[11px]">
          <span className="text-on-surface-variant font-medium">
            默认时长 (5~240分钟)：
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            <input
              type="number"
              min={5}
              max={240}
              value={editMinutesVal}
              onChange={(e) =>
                setEditMinutesVal(parseInt(e.target.value, 10) || 15)
              }
              className="w-16 bg-white rounded-lg px-2 py-1 text-xs font-bold text-primary text-center border border-outline-variant/60 focus:outline-none focus:border-primary"
            />
            {[10, 15, 20, 30, 45, 60].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setEditMinutesVal(m)}
                className={`px-1.5 py-1 rounded-md text-[10px] font-semibold cursor-pointer ${
                  editMinutesVal === m
                    ? 'bg-primary text-on-primary'
                    : 'bg-white text-on-surface-variant border border-outline-variant/40'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        </label>
      </div>

      {/* 3. Schedule Frequency Type (每周固定 vs 不固定/机动) & Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-on-surface-variant block">
            排期方式（每周固定 / 不固定）：
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setEditScheduleTypeVal('weekly_fixed');
                if (editScheduleTimeVal.includes('不固定')) {
                  setEditScheduleTimeVal('周六 15:00');
                }
              }}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold cursor-pointer ${
                editScheduleTypeVal === 'weekly_fixed'
                  ? 'bg-primary text-on-primary'
                  : 'bg-white text-on-surface-variant border border-outline-variant/40'
              }`}
            >
              📅 每周固定
            </button>
            <button
              type="button"
              onClick={() => {
                setEditScheduleTypeVal('flexible');
                if (!editScheduleTimeVal.includes('不固定') && !editScheduleTimeVal.includes('机动')) {
                  setEditScheduleTimeVal('不固定 · 机动安排');
                }
              }}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold cursor-pointer ${
                editScheduleTypeVal === 'flexible'
                  ? 'bg-primary text-on-primary'
                  : 'bg-white text-on-surface-variant border border-outline-variant/40'
              }`}
            >
              🔀 不固定/机动
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-medium text-on-surface-variant block">
            排期时段说明：
          </span>
          <input
            type="text"
            value={editScheduleTimeVal}
            onChange={(e) => setEditScheduleTimeVal(e.target.value)}
            placeholder="如：周六 15:00 或 不固定·随堂约课"
            className="w-full bg-white rounded-lg px-2.5 py-1.5 text-xs text-on-surface border border-outline-variant/60 focus:outline-none focus:border-primary"
          />
          <div className="flex flex-wrap gap-1 pt-0.5">
            {(editScheduleTypeVal === 'flexible'
              ? FLEXIBLE_TIME_PRESETS
              : FIXED_TIME_PRESETS
            ).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setEditScheduleTimeVal(preset)}
                className="px-1.5 py-0.5 rounded-md bg-white text-[10px] text-on-surface-variant border border-outline-variant/30 hover:border-primary cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Attendance Status (正常 / 老师请假 / 自己请假 / 暂停) */}
      <div className="space-y-1">
        <span className="text-[11px] font-medium text-on-surface-variant block">
          当前出勤状态（支持老师请假 / 自己请假 / 暂停）：
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {(
            [
              { val: 'active', label: '✅ 正常进行' },
              { val: 'teacher_leave', label: '🧑‍🏫 老师请假' },
              { val: 'student_leave', label: '🙋 自己请假' },
              { val: 'paused', label: '⏸️ 阶段暂停' },
            ] as { val: AttendanceStatus; label: string }[]
          ).map((st) => (
            <button
              key={st.val}
              type="button"
              onClick={() => setEditAttendanceVal(st.val)}
              className={`py-1 px-2 rounded-lg text-[11px] font-semibold cursor-pointer ${
                editAttendanceVal === st.val
                  ? 'bg-primary text-on-primary'
                  : 'bg-white text-on-surface-variant border border-outline-variant/40'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
        {editAttendanceVal !== 'active' && (
          <input
            type="text"
            value={editLeaveNoteVal}
            onChange={(e) => setEditLeaveNoteVal(e.target.value)}
            placeholder="填写请假/调课原因备注（如：本周老师请假顺延一次）"
            className="w-full mt-1 bg-white rounded-lg px-2.5 py-1.5 text-xs text-on-surface border border-outline-variant/60 focus:outline-none focus:border-primary"
          />
        )}
      </div>

      {/* 5. Subtitle */}
      <label className="flex flex-col gap-1 text-[11px]">
        <span className="text-on-surface-variant font-medium">
          任务内容说明：
        </span>
        <input
          type="text"
          value={editSubtitleVal}
          onChange={(e) => setEditSubtitleVal(e.target.value)}
          placeholder="如：周末象棋残局复盘与对弈"
          className="bg-white rounded-lg px-2.5 py-1.5 text-xs text-on-surface border border-outline-variant/60 focus:outline-none focus:border-primary"
        />
      </label>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            setEditingItemName(null);
            setEditingCategory(null);
          }}
          className="px-3 py-1.5 rounded-full bg-white text-on-surface-variant text-xs font-medium border border-outline-variant/40 cursor-pointer"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSaveItemEdit}
          className="px-4 py-1.5 rounded-full bg-primary text-on-primary text-xs font-semibold shadow-2xs hover:bg-primary-container cursor-pointer"
        >
          保存修改 ✓
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#FDFBF7] rounded-3xl max-w-xl w-full p-3.5 sm:p-5 shadow-2xl border border-[#EAE4DA] space-y-3 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="家庭书桌后台设置与体育课余管理"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2.5 border-b border-surface-container pb-2.5 shrink-0">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary-fixed text-primary flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[20px]">
                tune
              </span>
            </div>
            <div className="min-w-0 space-y-0.5">
              <h3 className="text-[15px] sm:text-base font-bold text-on-surface leading-snug">
                家庭书桌设置 · 体育与课余活动库
              </h3>
              <p className="text-[11px] sm:text-xs text-on-surface-variant leading-relaxed">
                支持新增每周固定/不固定项目、请假暂停、快捷选时长及自定义全科学科
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="关闭设置弹窗"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Global Quick Duration Bar - includes 10m & 15m for PE! */}
        <div className="flex flex-col gap-1.5 bg-surface-container-low px-3 py-2 rounded-2xl border border-[#EAE4DA]/60 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-on-surface-variant">
              新项目默认时长（体育常选 10~15m，可随时独立修改）：
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-primary shrink-0">
              当前 {selectedDuration} 分钟
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
            {GLOBAL_DEFAULT_DURATIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setSelectedDuration(m);
                  setCustomPeMinutes(m);
                }}
                className={`py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer text-center whitespace-nowrap ${
                  selectedDuration === m
                    ? 'bg-primary text-on-primary shadow-2xs'
                    : 'bg-white text-on-surface-variant hover:text-on-surface border border-[#EAE4DA]/50'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="space-y-4 overflow-y-auto overflow-x-hidden pr-0.5">
          {/* Section 0: 孩子信息、所在班级与番茄钟专注设置 (置顶核心，即改即生效) */}
          <form
            id="desk-settings-form"
            onSubmit={handleSaveBasicSettings}
            className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-primary-fixed/20 to-surface-container-lowest border border-primary/25 space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">
                    school
                  </span>
                </div>
                <span className="text-[13px] font-bold text-on-surface">
                  🎓 孩子姓名与所在年级/班级设置
                </span>
              </div>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-full bg-primary text-on-primary text-xs font-semibold shadow-xs hover:bg-primary-container cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[14px]">save</span>
                <span>保存更正</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-on-surface-variant font-medium">
                  孩子姓名 / 昵称
                </span>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="如：李子涵"
                  className="bg-white rounded-xl px-3 py-2 border border-outline-variant/60 text-on-surface font-semibold focus:outline-none focus:border-primary shadow-2xs"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs">
                <span className="text-on-surface-variant font-medium">
                  所在年级 / 班级
                </span>
                <input
                  type="text"
                  value={gradeClass}
                  onChange={(e) => setGradeClass(e.target.value)}
                  placeholder="如：初一(1)班、初二(3)班、高一(2)班..."
                  className="bg-white rounded-xl px-3 py-2 border border-outline-variant/60 text-primary font-bold focus:outline-none focus:border-primary shadow-2xs"
                />
              </label>
            </div>

            {/* Quick Class Presets for instant 1-tap select */}
            <div className="flex items-center gap-1 flex-wrap pt-0.5">
              <span className="text-[10px] text-outline shrink-0">快捷选班：</span>
              {[
                '初一 (1) 班',
                '初一 (3) 班',
                '初二 (3) 班',
                '初二 (6) 班',
                '初三 (1) 班',
                '初三 (6) 班',
                '高一 (1) 班',
                '高二 (2) 班',
                '高三 (1) 班',
              ].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setGradeClass(c)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors cursor-pointer ${
                    gradeClass === c
                      ? 'bg-primary text-on-primary font-semibold'
                      : 'bg-white text-on-surface-variant hover:bg-surface-container border border-[#EAE4DA]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 pt-1 border-t border-[#EAE4DA]/60">
              <span className="text-xs text-on-surface-variant font-medium block">
                番茄钟单次默认专注时长：
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[25, 35, 45].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setPomodoroMinutes(mins)}
                    className={`py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      pomodoroMinutes === mins
                        ? 'bg-primary text-on-primary border-primary shadow-2xs'
                        : 'bg-white text-on-surface-variant border-outline-variant/40 hover:bg-surface-container'
                    }`}
                  >
                    {mins} 分钟{' '}
                    {mins === 25 ? '(标准)' : mins === 45 ? '(长专注)' : ''}
                  </button>
                ))}
              </div>
            </div>
          </form>

          {/* Section 1: 周末与课余兴趣活动库 */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-surface-container-low border border-[#EAE4DA]/80 space-y-2.5">
            {/* Section Header with Prominent "+ 新增项目" button right at the top! */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs sm:text-[13px] font-bold text-on-surface block leading-snug">
                  🎨 周末与课余兴趣活动库（象棋 / 钢琴 / 小号）
                </span>
                <span className="text-[11px] text-on-surface-variant block leading-normal">
                  支持每周固定或不固定排期，老师/自己请假可一键暂停
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddHobbyPanel((prev) => !prev)}
                className="px-2.5 py-1 rounded-full bg-primary text-on-primary text-[11px] font-semibold shadow-2xs hover:bg-primary-container cursor-pointer shrink-0 flex items-center gap-0.5 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {showAddHobbyPanel ? 'expand_less' : 'add'}
                </span>
                <span>{showAddHobbyPanel ? '收起新增' : '+ 新增项目'}</span>
              </button>
            </div>

            {/* Top Creation Form for Extracurricular Hobby (Fixed vs Flexible) */}
            {showAddHobbyPanel && (
              <div
                data-testid="top-add-hobby-panel"
                className="p-3 rounded-xl bg-white border border-primary/30 shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">
                    ✨ 新增课余兴趣项目（可选每周固定 / 不固定机动）
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customHobbyInput}
                    onChange={(e) => setCustomHobbyInput(e.target.value)}
                    placeholder="输入项目名（如：练长笛、围棋、编程...）"
                    className="bg-surface-container-low rounded-xl px-3 py-1.5 text-xs text-on-surface border border-outline-variant/50 focus:outline-none focus:border-primary"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      aria-label="新课余项目所属科目"
                      value={customHobbySubject}
                      onChange={(e) =>
                        setCustomHobbySubject(e.target.value as SubjectName)
                      }
                      className="bg-surface-container-low rounded-xl px-2 py-1.5 text-xs font-semibold text-on-surface border border-outline-variant/50"
                    >
                      {allAvailableSubjects.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="新课余项目默认时长"
                      value={customHobbyMinutes}
                      onChange={(e) =>
                        setCustomHobbyMinutes(parseInt(e.target.value, 10))
                      }
                      className="bg-surface-container-low rounded-xl px-2 py-1.5 text-xs font-semibold text-primary border border-outline-variant/50"
                    >
                      {[15, 20, 30, 45, 60, 90, 120].map((m) => (
                        <option key={m} value={m}>
                          {m}分钟
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Fixed vs Flexible Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomHobbyScheduleType('weekly_fixed');
                        setCustomHobbyScheduleTime('周六 15:00');
                      }}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold cursor-pointer ${
                        customHobbyScheduleType === 'weekly_fixed'
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-low text-on-surface-variant'
                      }`}
                    >
                      📅 每周固定
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomHobbyScheduleType('flexible');
                        setCustomHobbyScheduleTime('不固定 · 机动约课');
                      }}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold cursor-pointer ${
                        customHobbyScheduleType === 'flexible'
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-low text-on-surface-variant'
                      }`}
                    >
                      🔀 不固定/机动
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customHobbyScheduleTime}
                      onChange={(e) =>
                        setCustomHobbyScheduleTime(e.target.value)
                      }
                      placeholder={
                        customHobbyScheduleType === 'flexible'
                          ? '如：不固定·随堂约课'
                          : '如：周六 15:00'
                      }
                      className="flex-1 bg-surface-container-low rounded-xl px-2.5 py-1.5 text-xs text-on-surface border border-outline-variant/50"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddActivityTag(customHobbyInput)}
                      className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      确认新增
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[11px] text-outline">推荐快添：</span>
                  {RECOMMENDED_HOBBIES.filter(
                    (h) => !settings.extracurricularActivities.includes(h)
                  ).map((hobby) => (
                    <button
                      key={hobby}
                      type="button"
                      onClick={() => handleAddActivityTag(hobby)}
                      className="px-2 py-0.5 rounded-full bg-surface-container hover:bg-tertiary-fixed/50 text-on-surface-variant text-[11px] cursor-pointer transition-colors whitespace-nowrap"
                    >
                      + {hobby}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              {settings.extracurricularActivities.map((act) => {
                const cfg = getItemConfig(act, 'hobby');
                const isEditing =
                  editingItemName === act && editingCategory === 'hobby';
                const isQuickLogging = quickLogTargetName === act;
                const isSettingLeave =
                  leaveTargetName === act && leaveTargetCategory === 'hobby';
                const badgeClass = getSubjectBadgeClass(cfg.subject);
                const freqBadge = getScheduleFrequencyBadge(
                  cfg.scheduleType,
                  cfg.scheduleTime
                );
                const attendanceMeta = getAttendanceStatusMeta(
                  cfg.attendanceStatus,
                  cfg.leaveNote
                );

                return (
                  <div
                    key={act}
                    className={`p-3 rounded-xl bg-white border transition-all flex flex-col gap-1.5 shadow-2xs ${
                      attendanceMeta.isOnLeaveOrPaused
                        ? 'border-[#F3D9B1] bg-[#FFFDF9]'
                        : 'border-[#EAE4DA]'
                    }`}
                  >
                    {/* Row 1: Icon + Name (never wraps apart) on left, Action buttons on right */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="material-symbols-outlined text-[16px] text-tertiary shrink-0">
                          interests
                        </span>
                        <span
                          className={`text-[13px] font-bold truncate ${
                            attendanceMeta.isOnLeaveOrPaused
                              ? 'text-on-surface-variant line-through decoration-dotted'
                              : 'text-on-surface'
                          }`}
                        >
                          {act}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {attendanceMeta.isOnLeaveOrPaused ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleSetItemAttendance(act, 'hobby', 'active')
                            }
                            className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold cursor-pointer whitespace-nowrap"
                          >
                            恢复正常
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItemName(null);
                              setQuickLogTargetName(null);
                              if (isSettingLeave) {
                                setLeaveTargetName(null);
                              } else {
                                setLeaveTargetName(act);
                                setLeaveTargetCategory('hobby');
                                setLeaveNoteInput(cfg.leaveNote || '');
                              }
                            }}
                            className="px-2 py-0.5 rounded-full bg-surface-container hover:bg-[#FFF3E0] text-on-surface-variant hover:text-[#B25E00] text-[10px] font-semibold cursor-pointer whitespace-nowrap"
                          >
                            请假/暂停
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            isEditing
                              ? setEditingItemName(null)
                              : handleStartEditItem(act, 'hobby')
                          }
                          className="px-2 py-0.5 rounded-full bg-surface-container hover:bg-primary-fixed/60 text-on-surface-variant hover:text-primary text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer transition-colors whitespace-nowrap"
                        >
                          <span className="material-symbols-outlined text-[12px]">
                            edit
                          </span>
                          <span>{isEditing ? '收起' : '修改'}</span>
                        </button>
                        <button
                          type="button"
                          aria-label={`删除 ${act}`}
                          onClick={() => handleRemoveActivityTag(act)}
                          className="w-6 h-6 rounded-full hover:bg-error-container text-outline hover:text-error flex items-center justify-center cursor-pointer shrink-0"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            close
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Subject Badge + Default Duration + Fixed/Flexible Badge + Attendance Status */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${badgeClass}`}
                      >
                        {cfg.subject}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-semibold whitespace-nowrap">
                        默认 {cfg.defaultMinutes}分钟
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                          freqBadge.isFlexible
                            ? 'bg-[#EEF4FA] text-[#426A8C]'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {freqBadge.isFlexible ? '🔀 ' : '📅 '}
                        {freqBadge.fullText}
                      </span>
                      {attendanceMeta.isOnLeaveOrPaused && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${attendanceMeta.badgeClass}`}
                        >
                          {attendanceMeta.label}
                        </span>
                      )}
                    </div>

                    {attendanceMeta.isOnLeaveOrPaused &&
                      attendanceMeta.defaultNote && (
                        <p className="text-[11px] font-medium text-[#B25E00] bg-[#FFF8EE] px-2.5 py-1 rounded-lg">
                          备注：{attendanceMeta.defaultNote}
                        </p>
                      )}

                    {cfg.subtitle && !attendanceMeta.isOnLeaveOrPaused && (
                      <p className="text-[11px] text-on-surface-variant leading-normal">
                        {cfg.subtitle}
                      </p>
                    )}

                    {/* Row 3: Concise 2-Column Buttons that never overflow on narrow screens */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItemName(null);
                          setLeaveTargetName(null);
                          if (isQuickLogging) {
                            setQuickLogTargetName(null);
                          } else {
                            setQuickLogTargetName(act);
                            setQuickLogCustomMinutes(
                              String(cfg.defaultMinutes)
                            );
                          }
                        }}
                        className="min-w-0 py-1.5 px-2 rounded-full bg-primary-fixed/85 text-primary hover:bg-primary hover:text-on-primary text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer text-center truncate"
                      >
                        + 记今日 ({cfg.defaultMinutes}m/选时长)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onAddExtracurricularSchedule({
                            id: `sch-hobby-${Date.now()}`,
                            badgeText: `${cfg.defaultMinutes}m ${cfg.subject}`,
                            badgeClass:
                              'bg-tertiary-fixed/60 text-on-tertiary-fixed-variant',
                            scheduleType: cfg.scheduleType || 'weekly_fixed',
                            timeText: cfg.scheduleTime,
                            title: act,
                            subtitle:
                              cfg.subtitle ||
                              `${
                                freqBadge.isFlexible ? '机动安排' : '每周固定'
                              } (${cfg.defaultMinutes}分钟)`,
                            completed: false,
                            attendanceStatus: cfg.attendanceStatus || 'active',
                            leaveNote: cfg.leaveNote,
                          });
                        }}
                        className="min-w-0 py-1.5 px-2 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-[11px] sm:text-xs font-medium cursor-pointer text-center truncate"
                      >
                        {freqBadge.isFlexible ? '+ 记入机动日程' : '+ 设为固定日程'}
                      </button>
                    </div>

                    {isQuickLogging && renderQuickDurationPicker(cfg, act)}
                    {isSettingLeave && renderLeavePausePicker(cfg, act, 'hobby')}
                    {isEditing && renderInlineEditor()}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: 初中体育中考与晚间锻炼项目库 */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-secondary-container/25 border border-secondary/20 space-y-2.5">
            {/* Section Header with Prominent "+ 新增体育项" button at top! */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs sm:text-[13px] font-bold text-on-surface block leading-snug">
                  🏃 初中体育中考与晚间锻炼库（默认 10~15 分钟/次）
                </span>
                <span className="text-[11px] text-on-surface-variant block leading-normal">
                  点「+ 记今日」可快捷选 5/10/15/20/25/30/45 分钟或自定义时长
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPePanel((prev) => !prev)}
                className="px-2.5 py-1 rounded-full bg-secondary text-on-secondary text-[11px] font-semibold shadow-2xs hover:bg-secondary/90 cursor-pointer shrink-0 flex items-center gap-0.5 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {showAddPePanel ? 'expand_less' : 'add'}
                </span>
                <span>{showAddPePanel ? '收起新增' : '+ 新增体育项'}</span>
              </button>
            </div>

            {/* Top Creation Form for PE Exercise */}
            {showAddPePanel && (
              <div
                data-testid="top-add-pe-panel"
                className="p-3 rounded-xl bg-white border border-secondary/30 shadow-xs space-y-2.5"
              >
                <span className="text-xs font-bold text-secondary block">
                  🏃 新增中考体育锻炼项目（支持每周固定或机动安排）
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customPeInput}
                    onChange={(e) => setCustomPeInput(e.target.value)}
                    placeholder="输入体育项目（如：平板支撑、50米冲刺、排球...）"
                    className="bg-surface-container-low rounded-xl px-3 py-1.5 text-xs text-on-surface border border-outline-variant/50 focus:outline-none focus:border-secondary"
                  />
                  <div className="flex items-center gap-1">
                    {[10, 15, 20, 25, 30].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setCustomPeMinutes(m)}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                          customPeMinutes === m
                            ? 'bg-secondary text-on-secondary'
                            : 'bg-surface-container-low text-on-surface-variant'
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomPeScheduleType('weekly_fixed');
                        setCustomPeScheduleTime('每晚 20:45');
                      }}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold cursor-pointer ${
                        customPeScheduleType === 'weekly_fixed'
                          ? 'bg-secondary text-on-secondary'
                          : 'bg-surface-container-low text-on-surface-variant'
                      }`}
                    >
                      📅 每晚/每周固定
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomPeScheduleType('flexible');
                        setCustomPeScheduleTime('不固定 · 机动锻炼');
                      }}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold cursor-pointer ${
                        customPeScheduleType === 'flexible'
                          ? 'bg-secondary text-on-secondary'
                          : 'bg-surface-container-low text-on-surface-variant'
                      }`}
                    >
                      🔀 不固定/机动
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customPeScheduleTime}
                      onChange={(e) => setCustomPeScheduleTime(e.target.value)}
                      placeholder="如：每晚 20:45 或 周末机动"
                      className="flex-1 bg-surface-container-low rounded-xl px-2.5 py-1.5 text-xs text-on-surface border border-outline-variant/50"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddPeTag(customPeInput)}
                      className="px-3.5 py-1.5 rounded-xl bg-secondary text-on-secondary text-xs font-semibold hover:bg-secondary/90 cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      确认新增
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-outline">中考常考快添：</span>
                  {RECOMMENDED_PE_EXERCISES.filter(
                    (item) => !settings.peExercises.includes(item)
                  ).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleAddPeTag(item)}
                      className="px-2 py-0.5 rounded-full bg-white hover:bg-secondary-container text-secondary text-[11px] cursor-pointer transition-colors border border-secondary/20"
                    >
                      + {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              {settings.peExercises.map((pe) => {
                const cfg = getItemConfig(pe, 'pe');
                const isEditing =
                  editingItemName === pe && editingCategory === 'pe';
                const isQuickLogging = quickLogTargetName === pe;
                const isSettingLeave =
                  leaveTargetName === pe && leaveTargetCategory === 'pe';
                const badgeClass = getSubjectBadgeClass(cfg.subject);
                const freqBadge = getScheduleFrequencyBadge(
                  cfg.scheduleType,
                  cfg.scheduleTime
                );
                const attendanceMeta = getAttendanceStatusMeta(
                  cfg.attendanceStatus,
                  cfg.leaveNote
                );

                return (
                  <div
                    key={pe}
                    className={`p-3 rounded-xl bg-white border transition-all flex flex-col gap-1.5 shadow-2xs ${
                      attendanceMeta.isOnLeaveOrPaused
                        ? 'border-[#F3D9B1] bg-[#FFFDF9]'
                        : 'border-[#EAE4DA]'
                    }`}
                  >
                    {/* Row 1: Icon + PE Name (never wraps apart) on left, Buttons on right */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">
                          directions_run
                        </span>
                        <span
                          className={`text-[13px] font-bold truncate ${
                            attendanceMeta.isOnLeaveOrPaused
                              ? 'text-on-surface-variant line-through decoration-dotted'
                              : 'text-on-surface'
                          }`}
                        >
                          {pe}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {attendanceMeta.isOnLeaveOrPaused ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleSetItemAttendance(pe, 'pe', 'active')
                            }
                            className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold cursor-pointer whitespace-nowrap"
                          >
                            恢复正常
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItemName(null);
                              setQuickLogTargetName(null);
                              if (isSettingLeave) {
                                setLeaveTargetName(null);
                              } else {
                                setLeaveTargetName(pe);
                                setLeaveTargetCategory('pe');
                                setLeaveNoteInput(cfg.leaveNote || '');
                              }
                            }}
                            className="px-2 py-0.5 rounded-full bg-surface-container hover:bg-[#FFF3E0] text-on-surface-variant hover:text-[#B25E00] text-[10px] font-semibold cursor-pointer whitespace-nowrap"
                          >
                            请假/暂停
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            isEditing
                              ? setEditingItemName(null)
                              : handleStartEditItem(pe, 'pe')
                          }
                          className="px-2 py-0.5 rounded-full bg-surface-container hover:bg-secondary-container text-on-surface-variant hover:text-secondary text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer transition-colors whitespace-nowrap"
                        >
                          <span className="material-symbols-outlined text-[12px]">
                            edit
                          </span>
                          <span>{isEditing ? '收起' : '修改'}</span>
                        </button>
                        <button
                          type="button"
                          aria-label={`删除 ${pe}`}
                          onClick={() => handleRemovePeTag(pe)}
                          className="w-6 h-6 rounded-full hover:bg-error-container text-outline hover:text-error flex items-center justify-center cursor-pointer shrink-0"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            close
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${badgeClass}`}
                      >
                        {cfg.subject}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-semibold whitespace-nowrap">
                        默认 {cfg.defaultMinutes}分钟
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                          freqBadge.isFlexible
                            ? 'bg-[#EEF4FA] text-[#426A8C]'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {freqBadge.isFlexible ? '🔀 ' : '📅 '}
                        {freqBadge.fullText}
                      </span>
                      {attendanceMeta.isOnLeaveOrPaused && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${attendanceMeta.badgeClass}`}
                        >
                          {attendanceMeta.label}
                        </span>
                      )}
                    </div>

                    {attendanceMeta.isOnLeaveOrPaused &&
                      attendanceMeta.defaultNote && (
                        <p className="text-[11px] font-medium text-[#B25E00] bg-[#FFF8EE] px-2.5 py-1 rounded-lg">
                          备注：{attendanceMeta.defaultNote}
                        </p>
                      )}

                    {cfg.subtitle && !attendanceMeta.isOnLeaveOrPaused && (
                      <p className="text-[11px] text-on-surface-variant leading-normal">
                        {cfg.subtitle}
                      </p>
                    )}

                    {/* Row 3: Concise Action Buttons (Never overflows on narrow mobile screens!) */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItemName(null);
                          setLeaveTargetName(null);
                          if (isQuickLogging) {
                            setQuickLogTargetName(null);
                          } else {
                            setQuickLogTargetName(pe);
                            setQuickLogCustomMinutes(
                              String(cfg.defaultMinutes)
                            );
                          }
                        }}
                        className="min-w-0 py-1.5 px-2 rounded-full bg-secondary text-on-secondary hover:bg-secondary/90 text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer text-center truncate"
                      >
                        + 记今日 ({cfg.defaultMinutes}m/选时长)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onAddExtracurricularSchedule({
                            id: `sch-pe-${Date.now()}`,
                            badgeText: `${cfg.defaultMinutes}m 中考体育`,
                            badgeClass:
                              'bg-secondary-container/70 text-on-secondary-container',
                            scheduleType: cfg.scheduleType || 'weekly_fixed',
                            timeText: cfg.scheduleTime,
                            title: pe,
                            subtitle:
                              cfg.subtitle ||
                              `初中体育中考晚间锻炼 (${cfg.defaultMinutes}分钟)`,
                            completed: false,
                            attendanceStatus: cfg.attendanceStatus || 'active',
                            leaveNote: cfg.leaveNote,
                          });
                        }}
                        className="min-w-0 py-1.5 px-2 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-[11px] sm:text-xs font-medium cursor-pointer text-center truncate"
                      >
                        {freqBadge.isFlexible ? '+ 记入机动打卡' : '+ 设为固定打卡'}
                      </button>
                    </div>

                    {isQuickLogging && renderQuickDurationPicker(cfg, pe)}
                    {isSettingLeave && renderLeavePausePicker(cfg, pe, 'pe')}
                    {isEditing && renderInlineEditor()}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: 全科学科自定义与重命名管理 */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-surface-container-lowest border border-[#EAE4DA] space-y-2.5">
            <div className="space-y-0.5">
              <span className="text-xs sm:text-[13px] font-bold text-on-surface block">
                📚 学科修改与自定义学科库（支持全科扩展与改名）
              </span>
              <span className="text-[11px] text-on-surface-variant block">
                点击任意学科可修改名称，或新增学校开设的其他学科（同步用于快记与成绩单）
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {allAvailableSubjects.map((subj) => (
                <div
                  key={subj}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-low border border-[#EAE4DA] text-xs font-semibold text-on-surface"
                >
                  <span>{subj}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingSubject(subj);
                      setRenameSubjectVal(subj);
                    }}
                    className="text-outline hover:text-primary flex items-center cursor-pointer"
                    title={`修改学科 ${subj}`}
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      edit
                    </span>
                  </button>
                </div>
              ))}
            </div>

            {renamingSubject && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-[#FDF8F4] border border-primary/30">
                <span className="text-[11px] font-semibold text-primary shrink-0">
                  将「{renamingSubject}」改名为：
                </span>
                <input
                  type="text"
                  value={renameSubjectVal}
                  onChange={(e) => setRenameSubjectVal(e.target.value)}
                  className="flex-1 bg-white rounded-lg px-2.5 py-1 text-xs font-semibold text-on-surface border border-outline-variant/50"
                />
                <button
                  type="button"
                  onClick={() => handleConfirmRenameSubject(renamingSubject)}
                  className="px-3 py-1 rounded-full bg-primary text-on-primary text-[11px] font-semibold cursor-pointer shrink-0"
                >
                  保存改名
                </button>
                <button
                  type="button"
                  onClick={() => setRenamingSubject(null)}
                  className="text-[11px] text-outline cursor-pointer shrink-0"
                >
                  取消
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={newSubjectInput}
                onChange={(e) => setNewSubjectInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomSubject(newSubjectInput);
                  }
                }}
                placeholder="输入新学科（如：道法、地理、生物、科学、奥数...）"
                className="flex-1 bg-surface-container-low rounded-xl px-3 py-1.5 text-xs text-on-surface border border-outline-variant/40 focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => handleAddCustomSubject(newSubjectInput)}
                className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-semibold cursor-pointer shrink-0 whitespace-nowrap"
              >
                + 新增学科
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-outline">一键添加常见学科：</span>
              {RECOMMENDED_EXTRA_SUBJECTS.filter(
                (s) => !allAvailableSubjects.includes(s)
              ).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleAddCustomSubject(s)}
                  className="px-2 py-0.5 rounded-full bg-surface-container hover:bg-primary-fixed/50 text-on-surface-variant text-[11px] cursor-pointer"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION: 示范数据管理与纯净书桌 */}
          {(onPurgeAllMockData || onRestoreAllMockData) && (
            <div className="p-3.5 rounded-2xl bg-[#FFF8F3] border border-primary-fixed space-y-2">
              <div className="flex items-center gap-1.5 text-primary">
                <span className="material-symbols-outlined text-[18px]">
                  cleaning_services
                </span>
                <h4 className="text-xs font-bold text-on-surface">
                  示范数据管理 · 开启属于你的纯净书桌
                </h4>
              </div>
              <p className="text-[11px] leading-relaxed text-on-surface-variant">
                正式注册使用后，建议点击一键清空系统预设的初始示例作业、示例打卡日程、昨日复盘与示例错题，开启完全空白的个人书桌。您的学生姓名、班级和番茄钟时长等个性化配置将完整保留。
              </p>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {onPurgeAllMockData && (
                  <button
                    type="button"
                    onClick={() => {
                      onPurgeAllMockData();
                      onClose();
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-error hover:bg-error/90 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      delete_sweep
                    </span>
                    <span>一键清空全部示范数据</span>
                  </button>
                )}
                {onRestoreAllMockData && (
                  <button
                    type="button"
                    onClick={() => {
                      onRestoreAllMockData();
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-medium cursor-pointer transition-colors"
                  >
                    恢复预设示范数据
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-surface-container flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-surface-container text-on-surface-variant text-xs font-semibold hover:bg-surface-container-high cursor-pointer"
          >
            关闭
          </button>
          <button
            type="submit"
            form="desk-settings-form"
            className="px-6 py-2 rounded-full bg-primary text-on-primary text-xs font-semibold shadow-sm hover:bg-primary-container cursor-pointer"
          >
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
};
