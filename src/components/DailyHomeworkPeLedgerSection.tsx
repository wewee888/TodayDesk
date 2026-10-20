import React, { useMemo, useState } from 'react';
import type { HomeworkTask, SubjectName } from '../types/study';
import {
  getDefaultSubjectsForGrade,
  getSubjectBadgeClass,
  getSubjectMeta,
  isDemoHomeworkTask,
} from '../utils/studyLogic';

interface DailyHomeworkPeLedgerSectionProps {
  tasks: HomeworkTask[];
  gradeClass?: string;
  customSubjects?: SubjectName[];
  peExercises?: string[];
  extracurricularActivities?: string[];
  onAddTaskRecord: (newTask: HomeworkTask) => void;
  onUpdateTaskRecord: (updatedTask: HomeworkTask) => void;
  onDeleteTaskRecord: (taskId: string) => void;
  onShowToast: (msg: string) => void;
}

type LedgerCategoryFilter = 'all' | 'academic' | 'pe' | 'hobby';

function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getOffsetIsoDate(daysOffset: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + daysOffset);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateLabel(isoDate: string): string {
  const today = getTodayIsoDate();
  const yesterday = getOffsetIsoDate(-1);
  const dayBefore = getOffsetIsoDate(-2);

  const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  let weekday = '';
  const parts = isoDate.split('-').map(Number);
  if (parts.length === 3 && !parts.some(Number.isNaN)) {
    const dt = new Date(parts[0], parts[1] - 1, parts[2]);
    weekday = weekdayNames[dt.getDay()] || '';
  }

  if (isoDate === today) return `${isoDate} (${weekday || '今日'} · 今天)`;
  if (isoDate === yesterday) return `${isoDate} (${weekday || '昨日'} · 昨天)`;
  if (isoDate === dayBefore) return `${isoDate} (${weekday} · 前天)`;
  return weekday ? `${isoDate} (${weekday})` : isoDate;
}

const ACADEMIC_TASK_TYPES = [
  '作业练习',
  '背诵默写',
  '试卷订正',
  '错题重做',
  '课前预习',
  '阅读摘抄',
];

const DEFAULT_PE_TYPES = [
  '中考跳绳 1500个',
  '1000米/800米耐力跑',
  '立定跳远专项',
  '引体向上/仰卧起坐',
  '晚间体能拉伸',
  '实心球/球类训练',
];

const DEFAULT_HOBBY_TYPES = [
  '象棋对弈复盘',
  '钢琴曲目练习',
  '小号吹奏训练',
  '课外深度阅读',
  '书法临摹练习',
  '编程创客实践',
];

export const DailyHomeworkPeLedgerSection: React.FC<
  DailyHomeworkPeLedgerSectionProps
> = ({
  tasks,
  gradeClass,
  customSubjects = [],
  peExercises = [],
  extracurricularActivities = [],
  onAddTaskRecord,
  onUpdateTaskRecord,
  onDeleteTaskRecord,
  onShowToast,
}) => {
  const todayIso = useMemo(() => getTodayIsoDate(), []);

  // Filter states
  const [categoryFilter, setCategoryFilter] =
    useState<LedgerCategoryFilter>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Supplement (补录) form states
  const [isSupplementOpen, setIsSupplementOpen] = useState<boolean>(false);
  const [supCategory, setSupCategory] = useState<'academic' | 'pe' | 'hobby'>(
    'academic'
  );
  const [supDate, setSupDate] = useState<string>(() => getOffsetIsoDate(-1));
  const [supSubject, setSupSubject] = useState<SubjectName>('数学');
  const [supTaskType, setSupTaskType] = useState<string>('作业练习');
  const [supTitle, setSupTitle] = useState<string>('');
  const [supMinutes, setSupMinutes] = useState<number>(25);
  const [supCompleted, setSupCompleted] = useState<boolean>(true);
  const [supAllCorrect, setSupAllCorrect] = useState<boolean>(true);

  // Inline Edit states
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>(todayIso);
  const [editSubject, setEditSubject] = useState<SubjectName>('数学');
  const [editTaskType, setEditTaskType] = useState<string>('作业练习');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editMinutes, setEditMinutes] = useState<number>(25);
  const [editCompleted, setEditCompleted] = useState<boolean>(true);
  const [editAllCorrect, setEditAllCorrect] = useState<boolean>(false);

  // Safe two-step delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const academicSubjects = useMemo(() => {
    const base = getDefaultSubjectsForGrade(gradeClass).filter(
      (s) => s !== '体育锻炼' && s !== '课余兴趣' && s !== '自主自习'
    );
    const merged = Array.from(
      new Set([
        ...base,
        ...customSubjects.filter(
          (s) => s !== '体育锻炼' && s !== '课余兴趣' && s !== '自主自习'
        ),
      ])
    );
    return merged.length > 0 ? merged : (['语文', '数学', '英语'] as SubjectName[]);
  }, [gradeClass, customSubjects]);

  const allSubjectsForEdit = useMemo(
    () =>
      Array.from(
        new Set([
          ...academicSubjects,
          '体育锻炼',
          '课余兴趣',
          '自主自习',
        ] as SubjectName[])
      ),
    [academicSubjects]
  );

  const peQuickOptions = useMemo(() => {
    const combined = Array.from(new Set([...peExercises, ...DEFAULT_PE_TYPES]));
    return combined.slice(0, 8);
  }, [peExercises]);

  const hobbyQuickOptions = useMemo(() => {
    const combined = Array.from(
      new Set([...extracurricularActivities, ...DEFAULT_HOBBY_TYPES])
    );
    return combined.slice(0, 8);
  }, [extracurricularActivities]);

  // Normalize tasks with a fallback taskDate so every record has a date
  const normalizedTasks = useMemo(() => {
    return tasks.map((t) => ({
      ...t,
      taskDate: t.taskDate || todayIso,
    }));
  }, [tasks, todayIso]);

  // Available dates for filter dropdown
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    normalizedTasks.forEach((t) => set.add(t.taskDate));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [normalizedTasks]);

  // Filtered and sorted records (newest date first)
  const filteredTasks = useMemo(() => {
    return normalizedTasks
      .filter((t) => {
        if (categoryFilter === 'academic') {
          if (t.subject === '体育锻炼' || t.subject === '课余兴趣') return false;
        } else if (categoryFilter === 'pe') {
          if (t.subject !== '体育锻炼') return false;
        } else if (categoryFilter === 'hobby') {
          if (t.subject !== '课余兴趣') return false;
        }

        if (dateFilter !== 'all' && t.taskDate !== dateFilter) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matchSubj = t.subject.toLowerCase().includes(q);
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchType = t.taskType.toLowerCase().includes(q);
          const matchDate = t.taskDate.includes(q);
          if (!matchSubj && !matchTitle && !matchType && !matchDate) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (a.taskDate !== b.taskDate) {
          return b.taskDate.localeCompare(a.taskDate);
        }
        return 0;
      });
  }, [normalizedTasks, categoryFilter, dateFilter, searchQuery]);

  // Summary metrics across all normalized tasks
  const stats = useMemo(() => {
    const uniqueDays = new Set(normalizedTasks.map((t) => t.taskDate)).size;
    const academicList = normalizedTasks.filter(
      (t) => t.subject !== '体育锻炼' && t.subject !== '课余兴趣'
    );
    const peList = normalizedTasks.filter((t) => t.subject === '体育锻炼');
    const academicMinutes = academicList.reduce(
      (sum, t) => sum + (t.actualMinutes ?? t.estimatedMinutes),
      0
    );
    const peMinutes = peList.reduce(
      (sum, t) => sum + (t.actualMinutes ?? t.estimatedMinutes),
      0
    );
    const allCorrectCount = academicList.filter((t) => t.isAllCorrect).length;

    return {
      uniqueDays,
      academicCount: academicList.length,
      academicCompleted: academicList.filter((t) => t.completed).length,
      academicMinutes,
      peCount: peList.length,
      peCompleted: peList.filter((t) => t.completed).length,
      peMinutes,
      allCorrectCount,
    };
  }, [normalizedTasks]);

  const handleSwitchSupCategory = (cat: 'academic' | 'pe' | 'hobby') => {
    setSupCategory(cat);
    if (cat === 'pe') {
      setSupSubject('体育锻炼');
      const firstPe = peQuickOptions[0] || '中考跳绳 1500个';
      setSupTaskType(firstPe);
      setSupTitle(`体育锻炼 · ${firstPe}`);
      setSupMinutes(15);
      setSupAllCorrect(false);
    } else if (cat === 'hobby') {
      setSupSubject('课余兴趣');
      const firstHobby = hobbyQuickOptions[0] || '器乐/特长练习';
      setSupTaskType(firstHobby);
      setSupTitle(`课余兴趣 · ${firstHobby}`);
      setSupMinutes(45);
      setSupAllCorrect(false);
    } else {
      const defaultSubj = academicSubjects[0] || '数学';
      setSupSubject(defaultSubj);
      setSupTaskType('作业练习');
      setSupTitle('');
      setSupMinutes(25);
      setSupAllCorrect(true);
    }
  };

  const handleSaveSupplement = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSubj: SubjectName =
      supCategory === 'pe'
        ? '体育锻炼'
        : supCategory === 'hobby'
        ? '课余兴趣'
        : supSubject;
    const clampedMinutes = Math.max(5, Math.min(240, Number(supMinutes) || 20));
    const cleanTitle =
      supTitle.trim() || `${finalSubj} · ${supTaskType || '日常打卡'}`;

    const newRecord: HomeworkTask = {
      id: `ledger-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      subject: finalSubj,
      subjectBadgeClass: getSubjectBadgeClass(finalSubj),
      taskType: supTaskType.trim() || '日常打卡',
      title: cleanTitle,
      estimatedMinutes: clampedMinutes,
      actualMinutes: clampedMinutes,
      completed: supCompleted,
      completedPomodoros: supCompleted ? 1 : 0,
      isAllCorrect:
        finalSubj !== '体育锻炼' && finalSubj !== '课余兴趣'
          ? supAllCorrect
          : undefined,
      taskDate: supDate || todayIso,
    };

    onAddTaskRecord(newRecord);
    setSupTitle('');
    setIsSupplementOpen(false);
    onShowToast(
      `已补录 ${newRecord.taskDate}「${finalSubj} · ${cleanTitle} (${clampedMinutes}分钟)」✓`
    );
  };

  const handleStartEdit = (task: HomeworkTask & { taskDate: string }) => {
    setEditingTaskId(task.id);
    setEditDate(task.taskDate || todayIso);
    setEditSubject(task.subject);
    setEditTaskType(task.taskType);
    setEditTitle(task.title);
    setEditMinutes(task.actualMinutes ?? task.estimatedMinutes);
    setEditCompleted(task.completed);
    setEditAllCorrect(Boolean(task.isAllCorrect));
    setConfirmDeleteId(null);
  };

  const handleSaveEdit = (originalTask: HomeworkTask) => {
    const clampedMinutes = Math.max(5, Math.min(240, Number(editMinutes) || 20));
    const cleanTitle =
      editTitle.trim() || `${editSubject} · ${editTaskType || '作业练习'}`;
    const isAcademic =
      editSubject !== '体育锻炼' && editSubject !== '课余兴趣';

    const updated: HomeworkTask = {
      ...originalTask,
      subject: editSubject,
      subjectBadgeClass: getSubjectBadgeClass(editSubject),
      taskType: editTaskType.trim() || '作业练习',
      title: cleanTitle,
      estimatedMinutes: clampedMinutes,
      actualMinutes: clampedMinutes,
      completed: editCompleted,
      isAllCorrect: isAcademic ? editAllCorrect : false,
      taskDate: editDate || todayIso,
    };

    onUpdateTaskRecord(updated);
    setEditingTaskId(null);
    onShowToast(
      `已修正记录：${updated.taskDate}「${updated.subject} · ${updated.title}」✓`
    );
  };

  return (
    <div
      data-testid="daily-homework-pe-ledger"
      className="p-5 sm:p-6 rounded-3xl bg-surface-container-lowest border border-[#EAE4DA] shadow-xs space-y-4"
    >
      {/* Top Header & "+ 补录漏记" CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAE4DA]/70 pb-3.5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-8 h-8 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">
                calendar_month
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
              每日作业与体育打卡 · 按日期记录明细表
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold">
              支持补录漏记 & 修改错记
            </span>
          </div>
          <p className="text-xs text-on-surface-variant">
            按日期汇总每日完成的文化课作业、老师核对全对情况与中考体育打卡；漏记可随时按日期补录，录错可随时点击修改。
          </p>
        </div>

        <button
          type="button"
          data-testid="open-supplement-record-btn"
          onClick={() => {
            if (!isSupplementOpen) {
              handleSwitchSupCategory('academic');
            }
            setIsSupplementOpen((prev) => !prev);
          }}
          className={`px-4 py-2 rounded-full text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-auto ${
            isSupplementOpen
              ? 'bg-surface-container text-on-surface'
              : 'bg-primary text-on-primary hover:bg-primary-container'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            {isSupplementOpen ? 'expand_less' : 'post_add'}
          </span>
          <span>
            {isSupplementOpen ? '收起补录面板' : '补录作业 / 体育打卡'}
          </span>
        </button>
      </div>

      {/* Quick Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-2xl bg-surface-container-low border border-[#EAE4DA]/60">
          <span className="text-[11px] text-on-surface-variant block">
            累计打卡天数
          </span>
          <span className="text-sm sm:text-base font-bold text-on-surface mt-0.5 block">
            {stats.uniqueDays} 天 · 共 {normalizedTasks.length} 条
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-surface-container-low border border-[#EAE4DA]/60">
          <span className="text-[11px] text-on-surface-variant block">
            文化课作业记录
          </span>
          <span className="text-sm sm:text-base font-bold text-primary mt-0.5 block">
            {stats.academicCompleted}/{stats.academicCount} 项 ·{' '}
            {stats.academicMinutes} 分钟
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-secondary-container/25 border border-secondary/20">
          <span className="text-[11px] text-secondary font-semibold block">
            🏃 体育锻炼打卡
          </span>
          <span className="text-sm sm:text-base font-bold text-secondary mt-0.5 block">
            {stats.peCompleted}/{stats.peCount} 次 · {stats.peMinutes} 分钟
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/70">
          <span className="text-[11px] text-emerald-800 font-semibold block">
            🎯 老师核对：全对
          </span>
          <span className="text-sm sm:text-base font-bold text-emerald-700 mt-0.5 block">
            累计 {stats.allCorrectCount} 次全对
          </span>
        </div>
      </div>

      {/* Expandable Supplement (补录忘了的记录) Form */}
      {isSupplementOpen && (
        <form
          onSubmit={handleSaveSupplement}
          data-testid="supplement-record-form"
          className="p-4 rounded-2xl bg-[#FAF6F0] border-2 border-primary/30 space-y-3.5 animate-fade-slide"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]">
                history_edu
              </span>
              <span className="text-xs sm:text-sm font-bold text-on-surface">
                补录历史作业或体育打卡（自动计入多维统计与周报）
              </span>
            </div>

            {/* Category Switcher */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-[#EAE4DA]">
              <button
                type="button"
                onClick={() => handleSwitchSupCategory('academic')}
                className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                  supCategory === 'academic'
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                📚 补录作业
              </button>
              <button
                type="button"
                onClick={() => handleSwitchSupCategory('pe')}
                className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                  supCategory === 'pe'
                    ? 'bg-secondary text-on-secondary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                🏃 补录体育打卡
              </button>
              <button
                type="button"
                onClick={() => handleSwitchSupCategory('hobby')}
                className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                  supCategory === 'hobby'
                    ? 'bg-tertiary text-on-tertiary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                🎨 补录兴趣
              </button>
            </div>
          </div>

          {/* Row 1: Date Picker + Quick Date Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
            <div className="sm:col-span-5 flex items-center gap-2">
              <label className="text-xs font-bold text-on-surface shrink-0">
                所属日期：
              </label>
              <input
                type="date"
                aria-label="补录所属日期"
                value={supDate}
                onChange={(e) => setSupDate(e.target.value)}
                className="flex-1 bg-white rounded-xl px-3 py-1.5 text-xs font-bold text-on-surface border border-[#EAE4DA] focus:outline-none focus:border-primary"
              />
            </div>
            <div className="sm:col-span-7 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-on-surface-variant">
                快捷选日：
              </span>
              {[
                { label: '今天', val: getOffsetIsoDate(0) },
                { label: '昨天', val: getOffsetIsoDate(-1) },
                { label: '前天', val: getOffsetIsoDate(-2) },
                { label: '3天前', val: getOffsetIsoDate(-3) },
                { label: '上周日', val: getOffsetIsoDate(-5) },
              ].map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => setSupDate(d.val)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-colors ${
                    supDate === d.val
                      ? 'bg-primary text-on-primary'
                      : 'bg-white text-on-surface-variant border border-[#EAE4DA] hover:text-on-surface'
                  }`}
                >
                  {d.label} ({d.val.slice(5)})
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Subject / PE Item Selector */}
          {supCategory === 'academic' ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-on-surface shrink-0">
                  选择学科：
                </span>
                {academicSubjects.map((subj) => (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => setSupSubject(subj)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
                      supSubject === subj
                        ? 'bg-primary text-on-primary shadow-2xs'
                        : 'bg-white text-on-surface-variant border border-[#EAE4DA] hover:text-on-surface'
                    }`}
                  >
                    {subj}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-on-surface shrink-0">
                  作业类型：
                </span>
                {ACADEMIC_TASK_TYPES.map((tType) => (
                  <button
                    key={tType}
                    type="button"
                    onClick={() => setSupTaskType(tType)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer ${
                      supTaskType === tType
                        ? 'bg-secondary text-on-secondary'
                        : 'bg-white text-on-surface-variant border border-[#EAE4DA]'
                    }`}
                  >
                    {tType}
                  </button>
                ))}
              </div>
            </div>
          ) : supCategory === 'pe' ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-secondary shrink-0">
                体育项目快选：
              </span>
              {peQuickOptions.map((peName) => (
                <button
                  key={peName}
                  type="button"
                  onClick={() => {
                    setSupTaskType(peName);
                    setSupTitle(`体育锻炼 · ${peName}`);
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer ${
                    supTaskType === peName
                      ? 'bg-secondary text-on-secondary shadow-2xs'
                      : 'bg-white text-on-surface-variant border border-[#EAE4DA]'
                  }`}
                >
                  🏃 {peName}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-tertiary shrink-0">
                课余项目快选：
              </span>
              {hobbyQuickOptions.map((hName) => (
                <button
                  key={hName}
                  type="button"
                  onClick={() => {
                    setSupTaskType(hName);
                    setSupTitle(`课余兴趣 · ${hName}`);
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer ${
                    supTaskType === hName
                      ? 'bg-tertiary text-on-tertiary shadow-2xs'
                      : 'bg-white text-on-surface-variant border border-[#EAE4DA]'
                  }`}
                >
                  🎨 {hName}
                </button>
              ))}
            </div>
          )}

          {/* Row 3: Content Input + Duration + Checkboxes + Submit */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
            <div className="sm:col-span-5">
              <input
                type="text"
                aria-label="补录具体内容说明"
                value={supTitle}
                onChange={(e) => setSupTitle(e.target.value)}
                placeholder={
                  supCategory === 'pe'
                    ? '输入具体体育打卡内容（如：跳绳1600个、夜跑15分钟）'
                    : `输入具体内容（留空则自动记为“${supSubject} · ${supTaskType}”）`
                }
                className="w-full bg-white rounded-xl px-3 py-2 text-xs font-medium text-on-surface border border-[#EAE4DA] focus:outline-none focus:border-primary"
              />
            </div>

            <div className="sm:col-span-4 flex items-center gap-1 flex-wrap">
              <span className="text-xs font-bold text-on-surface shrink-0">
                耗时：
              </span>
              {[10, 15, 20, 30, 45].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSupMinutes(m)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                    supMinutes === m
                      ? 'bg-primary text-on-primary'
                      : 'bg-white text-on-surface-variant border border-[#EAE4DA]'
                  }`}
                >
                  {m}m
                </button>
              ))}
              <input
                type="number"
                min={5}
                max={240}
                aria-label="补录分钟数"
                value={supMinutes}
                onChange={(e) =>
                  setSupMinutes(parseInt(e.target.value, 10) || 15)
                }
                className="w-14 bg-white rounded-lg px-2 py-1 text-xs font-bold text-primary border border-[#EAE4DA] text-center"
              />
            </div>

            <div className="sm:col-span-3 flex items-center justify-end gap-2">
              {supCategory === 'academic' && (
                <label className="flex items-center gap-1 text-xs font-bold text-emerald-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={supAllCorrect}
                    onChange={(e) => setSupAllCorrect(e.target.checked)}
                    className="accent-emerald-600 rounded cursor-pointer"
                  />
                  <span>老师全对</span>
                </label>
              )}
              <button
                type="submit"
                data-testid="confirm-supplement-submit-btn"
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:bg-primary-container cursor-pointer whitespace-nowrap"
              >
                保存补录 ✓
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter Bar: Category Tabs + Date Selector + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: 'all', label: `全部记录 (${normalizedTasks.length})` },
              { id: 'academic', label: `📚 文化课作业 (${stats.academicCount})` },
              { id: 'pe', label: `🏃 体育打卡 (${stats.peCount})` },
              { id: 'hobby', label: '🎨 课余兴趣' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all ${
                categoryFilter === tab.id
                  ? 'bg-on-surface text-surface shadow-2xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            aria-label="按日期筛选记录"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-surface-container-low rounded-xl px-2.5 py-1.5 text-xs font-semibold text-on-surface border border-[#EAE4DA] focus:outline-none focus:border-primary"
          >
            <option value="all">📅 全部日期 ({availableDates.length}天)</option>
            {availableDates.map((d) => (
              <option key={d} value={d}>
                {formatDateLabel(d)}
              </option>
            ))}
          </select>

          <input
            type="text"
            aria-label="搜索科目或作业内容"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索科目/内容/日期..."
            className="bg-surface-container-low rounded-xl px-3 py-1.5 text-xs text-on-surface border border-[#EAE4DA] focus:outline-none focus:border-primary w-40 sm:w-44"
          />
        </div>
      </div>

      {/* Date-Ordered Table of Homework & PE Check-ins */}
      {filteredTasks.length === 0 ? (
        <div className="p-8 rounded-2xl bg-surface-container-low/50 border border-dashed border-[#EAE4DA] text-center space-y-2.5">
          <span className="material-symbols-outlined text-3xl text-outline/60">
            event_note
          </span>
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-bold text-on-surface">
              当前筛选下暂无每日作业或体育打卡记录
            </p>
            <p className="text-xs text-on-surface-variant">
              若有漏记的昨日作业或体育锻炼，点击右上角「补录作业 / 体育打卡」即可按日期补充录入。
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              handleSwitchSupCategory('academic');
              setIsSupplementOpen(true);
            }}
            className="px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-bold cursor-pointer hover:bg-primary-container inline-flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[15px]">
              post_add
            </span>
            <span>立即补录一条记录</span>
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#EAE4DA] bg-white">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-surface-container-low/80 border-b border-[#EAE4DA] text-[11px] font-bold text-on-surface-variant">
                <th className="py-2.5 px-3">记录日期</th>
                <th className="py-2.5 px-3">科目 / 类别</th>
                <th className="py-2.5 px-3">具体作业 / 体育打卡内容</th>
                <th className="py-2.5 px-3 text-center">耗时</th>
                <th className="py-2.5 px-3 text-center">完成与核对状态</th>
                <th className="py-2.5 px-3 text-right">修改 / 操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE4DA]/60 text-xs">
              {filteredTasks.map((task) => {
                const isEditing = editingTaskId === task.id;
                const isPe = task.subject === '体育锻炼';
                const isHobby = task.subject === '课余兴趣';
                const isAcademic = !isPe && !isHobby;
                const mins = task.actualMinutes ?? task.estimatedMinutes;

                if (isEditing) {
                  return (
                    <tr
                      key={task.id}
                      data-testid={`ledger-edit-row-${task.id}`}
                      className="bg-[#FFFDF9]"
                    >
                      <td colSpan={6} className="p-3.5">
                        <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-primary/40 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-primary flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">
                                edit_calendar
                              </span>
                              <span>
                                修改记录详情（支持更正日期、科目、时长与完成状态）
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingTaskId(null)}
                              className="text-xs text-on-surface-variant hover:text-on-surface cursor-pointer"
                            >
                              取消修改
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                            <label className="sm:col-span-3 flex flex-col gap-1">
                              <span className="text-[11px] font-semibold text-on-surface-variant">
                                记录日期
                              </span>
                              <input
                                type="date"
                                aria-label="修改记录日期"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="bg-white rounded-xl px-2.5 py-1.5 text-xs font-bold border border-[#EAE4DA]"
                              />
                            </label>

                            <label className="sm:col-span-2 flex flex-col gap-1">
                              <span className="text-[11px] font-semibold text-on-surface-variant">
                                所属科目
                              </span>
                              <select
                                aria-label="修改所属科目"
                                value={editSubject}
                                onChange={(e) =>
                                  setEditSubject(e.target.value as SubjectName)
                                }
                                className="bg-white rounded-xl px-2.5 py-1.5 text-xs font-bold border border-[#EAE4DA]"
                              >
                                {allSubjectsForEdit.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="sm:col-span-2 flex flex-col gap-1">
                              <span className="text-[11px] font-semibold text-on-surface-variant">
                                类型标签
                              </span>
                              <input
                                type="text"
                                aria-label="修改类型标签"
                                value={editTaskType}
                                onChange={(e) => setEditTaskType(e.target.value)}
                                className="bg-white rounded-xl px-2.5 py-1.5 text-xs font-semibold border border-[#EAE4DA]"
                              />
                            </label>

                            <label className="sm:col-span-3 flex flex-col gap-1">
                              <span className="text-[11px] font-semibold text-on-surface-variant">
                                具体内容
                              </span>
                              <input
                                type="text"
                                aria-label="修改具体内容"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="bg-white rounded-xl px-2.5 py-1.5 text-xs font-semibold border border-[#EAE4DA]"
                              />
                            </label>

                            <label className="sm:col-span-2 flex flex-col gap-1">
                              <span className="text-[11px] font-semibold text-on-surface-variant">
                                实际耗时 (分钟)
                              </span>
                              <input
                                type="number"
                                min={5}
                                max={240}
                                aria-label="修改耗时分钟"
                                value={editMinutes}
                                onChange={(e) =>
                                  setEditMinutes(
                                    parseInt(e.target.value, 10) || 15
                                  )
                                }
                                className="bg-white rounded-xl px-2.5 py-1.5 text-xs font-bold text-primary border border-[#EAE4DA]"
                              />
                            </label>
                          </div>

                          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-1.5 text-xs font-bold text-on-surface cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editCompleted}
                                  onChange={(e) =>
                                    setEditCompleted(e.target.checked)
                                  }
                                  className="accent-primary rounded cursor-pointer"
                                />
                                <span>已完成打卡 ✓</span>
                              </label>

                              {editSubject !== '体育锻炼' &&
                                editSubject !== '课余兴趣' && (
                                  <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editAllCorrect}
                                      onChange={(e) =>
                                        setEditAllCorrect(e.target.checked)
                                      }
                                      className="accent-emerald-600 rounded cursor-pointer"
                                    />
                                    <span>🎯 老师核对：全对</span>
                                  </label>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingTaskId(null)}
                                className="px-3 py-1.5 rounded-full bg-white border border-[#EAE4DA] text-xs font-semibold text-on-surface-variant cursor-pointer"
                              >
                                取消
                              </button>
                              <button
                                type="button"
                                data-testid={`save-ledger-edit-${task.id}`}
                                onClick={() => handleSaveEdit(task)}
                                className="px-4 py-1.5 rounded-full bg-primary text-on-primary text-xs font-bold shadow-2xs cursor-pointer"
                              >
                                保存更正 ✓
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={task.id}
                    data-testid={`ledger-row-${task.id}`}
                    className="hover:bg-surface-container-low/40 transition-colors"
                  >
                    {/* Col 1: Date */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-on-surface">
                      {formatDateLabel(task.taskDate)}
                    </td>

                    {/* Col 2: Subject Badge */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 ${
                            task.subjectBadgeClass ||
                            getSubjectMeta(task.subject).badgeClass
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {getSubjectMeta(task.subject).icon}
                          </span>
                          <span>{task.subject}</span>
                        </span>
                        {isDemoHomeworkTask(task) ? (
                          <span
                            data-testid={`ledger-demo-${task.id}`}
                            className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0"
                            title="示范数据"
                          >
                            示例
                          </span>
                        ) : (
                          <span
                            data-testid={`ledger-real-${task.id}`}
                            className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-secondary-container/70 text-secondary border border-secondary/30 shrink-0"
                            title="真实记录"
                          >
                            真实
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Col 3: Title & Type */}
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-on-surface">
                        {task.title}
                      </div>
                      <div className="text-[11px] text-on-surface-variant">
                        类型：{task.taskType}
                        {(task.completedPomodoros ?? 0) > 0
                          ? ` · 🍅×${task.completedPomodoros}`
                          : ''}
                      </div>
                    </td>

                    {/* Col 4: Duration */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="font-bold text-primary">{mins} 分钟</span>
                    </td>

                    {/* Col 5: Status & Teacher All-Correct Quick Toggle */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateTaskRecord({
                              ...task,
                              completed: !task.completed,
                            })
                          }
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                            task.completed
                              ? 'bg-secondary-container text-on-secondary-container'
                              : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                          }`}
                          title="点击切换完成状态"
                        >
                          {task.completed
                            ? isPe
                              ? '🏃 已打卡 ✓'
                              : '已完成 ✓'
                            : '待完成'}
                        </button>

                        {isAcademic && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateTaskRecord({
                                ...task,
                                isAllCorrect: !task.isAllCorrect,
                                completed: !task.isAllCorrect
                                  ? true
                                  : task.completed,
                              })
                            }
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold cursor-pointer border transition-colors ${
                              task.isAllCorrect
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-white text-outline border-[#EAE4DA] hover:text-emerald-800'
                            }`}
                            title="点击标记/取消老师核对全对"
                          >
                            {task.isAllCorrect ? '🎯 全对 ✓' : '核对全对'}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Col 6: Edit / Delete Actions */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          data-testid={`edit-ledger-btn-${task.id}`}
                          onClick={() => handleStartEdit(task)}
                          className="px-2.5 py-1 rounded-full bg-surface-container hover:bg-primary-fixed/60 text-on-surface-variant hover:text-primary text-[11px] font-semibold inline-flex items-center gap-0.5 cursor-pointer transition-colors"
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            edit
                          </span>
                          <span>修改</span>
                        </button>

                        {confirmDeleteId === task.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteTaskRecord(task.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2.5 py-1 rounded-full bg-error text-on-error text-[11px] font-bold cursor-pointer"
                          >
                            确认删除?
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(task.id)}
                            className="w-7 h-7 rounded-full hover:bg-error-container text-outline hover:text-error inline-flex items-center justify-center cursor-pointer transition-colors"
                            title="删除该条错误记录"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              delete
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
