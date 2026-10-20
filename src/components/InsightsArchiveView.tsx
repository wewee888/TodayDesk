import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type {
  EfficiencyBubble,
  ExamPeriod,
  ExamScoreCard,
  HomeworkTask,
  MistakeItem,
  SubjectName,
} from '../types/study';
import { INITIAL_EFFICIENCY_BUBBLES } from '../data/initialData';
import { MultiPeriodReportSection } from './MultiPeriodReportSection';
import { DailyHomeworkPeLedgerSection } from './DailyHomeworkPeLedgerSection';
import {
  type SchoolExamScheduleMode,
  buildSmartExamPeriods,
  computeDynamicEfficiencyBubbles,
  computeMistakeArchiveCounts,
  getDefaultSubjectsForGrade,
  getSubjectMeta,
  resolveRecommendedExamPeriod,
} from '../utils/studyLogic';
import { useDragScroll } from '../utils/useDragScroll';
import { MistakeEditModal } from './MistakeEditModal';

interface InsightsArchiveViewProps {
  tasks?: HomeworkTask[];
  onAddTaskRecord?: (newTask: HomeworkTask) => void;
  onUpdateTaskRecord?: (updatedTask: HomeworkTask) => void;
  onDeleteTaskRecord?: (taskId: string) => void;
  peExercises?: string[];
  extracurricularActivities?: string[];
  mistakes: MistakeItem[];
  gradeClass?: string;
  isDemoPurged?: boolean;
  familyReflectionNote?: string;
  onUpdateReflectionNote?: (note: string) => void;
  onClearMistake: (id: string) => void;
  onRestoreMistake: (id: string) => void;
  onDeleteMistake?: (id: string) => void;
  onClearAllMistakes?: () => void;
  onUpdateMistake?: (updated: MistakeItem) => void;
  onAddMistake?: (newMistake: MistakeItem) => void;
  examPeriod: ExamPeriod;
  onSelectExamPeriod: (period: ExamPeriod) => void;
  examScores: ExamScoreCard[];
  onUpdateExamScores: (
    period: ExamPeriod,
    updated: {
      math: number;
      english: number;
      chinese: number;
      mathFull?: number;
      englishFull?: number;
      chineseFull?: number;
      cards?: ExamScoreCard[];
    }
  ) => void;
  customSubjects?: SubjectName[];
  onOpenCameraSnap: () => void;
  onOpenWeeklyReport: () => void;
  onShowToast: (msg: string) => void;
}

const INITIAL_EXAM_PERIODS: ExamPeriod[] = [
  '周考',
  '10月月考',
  '11月月考',
  '期中考试',
  '期末考试',
  '中考模拟',
];
const FULL_SCORE_PRESETS = [90, 100, 120, 150];
const EXTRA_EXAM_SUBJECTS = [
  '物理',
  '化学',
  '历史',
  '道法',
  '地理',
  '生物',
  '科学',
  '政治',
  '信息科技',
  '体育中考',
];

export const InsightsArchiveView: React.FC<InsightsArchiveViewProps> = ({
  tasks = [],
  onAddTaskRecord,
  onUpdateTaskRecord,
  onDeleteTaskRecord,
  peExercises,
  extracurricularActivities,
  mistakes,
  gradeClass,
  isDemoPurged,
  familyReflectionNote,
  onUpdateReflectionNote,
  onClearMistake,
  onRestoreMistake,
  onDeleteMistake,
  onClearAllMistakes,
  onUpdateMistake,
  onAddMistake,
  examPeriod,
  onSelectExamPeriod,
  examScores,
  onUpdateExamScores,
  customSubjects,
  onOpenCameraSnap,
  onOpenWeeklyReport,
  onShowToast,
}) => {
  // Academic exam subjects based on the student's grade (e.g. 初一/初二 has no 化学)
  const gradeExamSubjects = getDefaultSubjectsForGrade(gradeClass).filter(
    (s) => s !== '体育锻炼' && s !== '课余兴趣' && s !== '自主自习'
  );

  const { dragProps: mistakeDragProps, isDragging: isDraggingMistakes } =
    useDragScroll<HTMLDivElement>();
  const { dragProps: periodDragProps, isDragging: isDraggingPeriods } =
    useDragScroll<HTMLDivElement>();
  const [activeMistakeDetail, setActiveMistakeDetail] =
    useState<MistakeItem | null>(null);
  const [editingMistake, setEditingMistake] = useState<MistakeItem | null>(null);
  const [isAddingMistake, setIsAddingMistake] = useState(false);
  const [showAllMistakesModal, setShowAllMistakesModal] = useState(false);
  const [showFastScoreInput, setShowFastScoreInput] = useState(false);
  const [selectedBubble, setSelectedBubble] = useState<EfficiencyBubble | null>(
    null
  );
  const [imageFallbackMap, setImageFallbackMap] = useState<
    Record<string, boolean>
  >({});
  const [confirmClearAllMistakes, setConfirmClearAllMistakes] = useState(false);
  const [confirmDeleteMistakeId, setConfirmDeleteMistakeId] = useState<
    string | null
  >(null);
  const [isEditingReflection, setIsEditingReflection] = useState(false);
  const [reflectionDraft, setReflectionDraft] = useState(
    familyReflectionNote || ''
  );

  // Dynamic Exam Periods state (supports auto monthly exam, skipping straight to 期中考试/期末考试, or including 期中预备)
  const [examPeriods, setExamPeriods] =
    useState<ExamPeriod[]>(INITIAL_EXAM_PERIODS);
  const [schoolExamMode, setSchoolExamMode] =
    useState<SchoolExamScheduleMode>('monthly_and_major');
  const [activeCalendarMonth, setActiveCalendarMonth] = useState<number>(10);
  const [showExamPeriodManager, setShowExamPeriodManager] = useState(false);
  const [customExamPeriodInput, setCustomExamPeriodInput] = useState('');
  const [renameCurrentPeriodInput, setRenameCurrentPeriodInput] =
    useState(examPeriod);

  // Editable copy of all score cards for the current examPeriod (supports modifying subject name, score, fullScore, and adding new subjects)
  const [draftCards, setDraftCards] = useState<ExamScoreCard[]>(examScores);
  const [newExamSubjectName, setNewExamSubjectName] = useState('');
  const [newExamSubjectScore, setNewExamSubjectScore] = useState('92');
  const [newExamSubjectFull, setNewExamSubjectFull] = useState('100');

  const { remainingMistakes, clearedCount } = computeMistakeArchiveCounts(
    mistakes,
    Boolean(isDemoPurged)
  );
  const efficiencyBubbles = computeDynamicEfficiencyBubbles(
    tasks,
    examScores,
    INITIAL_EFFICIENCY_BUBBLES,
    Boolean(isDemoPurged)
  );

  // Filter states for mistake notebook
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('全部');
  const [onlyUnclearedFilter, setOnlyUnclearedFilter] = useState<boolean>(false);

  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    mistakes.forEach((m) => {
      if (m.subject) set.add(m.subject);
    });
    return ['全部', ...Array.from(set)];
  }, [mistakes]);

  const filteredMistakes = useMemo(() => {
    return mistakes.filter((m) => {
      if (selectedSubjectFilter !== '全部' && m.subject !== selectedSubjectFilter) {
        return false;
      }
      if (onlyUnclearedFilter && m.cleared) {
        return false;
      }
      return true;
    });
  }, [mistakes, selectedSubjectFilter, onlyUnclearedFilter]);

  const handleApplySmartExamRule = (
    month: number,
    mode: SchoolExamScheduleMode
  ) => {
    setActiveCalendarMonth(month);
    setSchoolExamMode(mode);
    const nextPeriods = buildSmartExamPeriods(month, mode);
    const recommended = resolveRecommendedExamPeriod(month, mode);
    setExamPeriods(nextPeriods);
    onSelectExamPeriod(recommended);
    setRenameCurrentPeriodInput(recommended);

    if (mode === 'major_only') {
      onShowToast(
        `已切换为「无月考/无预备」考制：跳过月考与预备，直接选中「${recommended}」✓`
      );
    } else if (mode === 'with_prep') {
      onShowToast(
        `已切换为「含期中预备热身」考制（${month}月）：含 ${month}月月考 → 期中预备 → 期中考试 ✓`
      );
    } else {
      onShowToast(
        `已按 ${month} 月自动适配考制：自动生成「${month}月月考」与「期中考试」✓`
      );
    }
  };

  const openFastEntry = () => {
    setDraftCards(examScores.map((c) => ({ ...c })));
    setShowFastScoreInput(true);
  };

  const handleUpdateDraftCard = (
    index: number,
    patch: Partial<ExamScoreCard>
  ) => {
    setDraftCards((prev) =>
      prev.map((c, idx) => (idx === index ? { ...c, ...patch } : c))
    );
  };

  const handleAddDraftSubject = (
    subjName: string,
    defaultScore = 90,
    defaultFull = 100
  ) => {
    const trimmed = subjName.trim();
    if (!trimmed) return;
    if (draftCards.some((c) => c.subject === trimmed)) {
      onShowToast(`「${trimmed}」已在当前成绩单中`);
      return;
    }
    const schemes: ('primary' | 'secondary' | 'tertiary')[] = [
      'primary',
      'secondary',
      'tertiary',
    ];
    const nextCard: ExamScoreCard = {
      id: `score-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      subject: trimmed,
      icon: getSubjectMeta(trimmed).icon,
      score: Math.min(defaultScore, defaultFull),
      fullScore: defaultFull,
      trendText: '新增学科',
      trendIcon: 'trending_up',
      colorScheme: schemes[draftCards.length % 3],
    };
    setDraftCards((prev) => [...prev, nextCard]);
    setNewExamSubjectName('');
    onShowToast(`已添加学科「${trimmed}」（满分 ${defaultFull}）`);
  };

  const handleRemoveDraftCard = (index: number) => {
    if (draftCards.length <= 1) {
      onShowToast('至少保留一门考试学科');
      return;
    }
    setDraftCards((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveFastScores = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized: ExamScoreCard[] = draftCards.map((c) => {
      const full = Math.min(
        Math.max(Math.round(Number(c.fullScore) || 100), 10),
        300
      );
      const sc = Math.min(Math.max(Math.round(Number(c.score) || 0), 0), full);
      return {
        ...c,
        subject: c.subject.trim() || '未命名学科',
        score: sc,
        fullScore: full,
        trendText: c.trendText || '最新录入',
      };
    });

    const mathCard = sanitized.find((c) => c.subject === '数学') || sanitized[0];
    const engCard =
      sanitized.find((c) => c.subject === '英语') ||
      sanitized[1] ||
      sanitized[0];
    const chiCard =
      sanitized.find((c) => c.subject === '语文') ||
      sanitized[2] ||
      sanitized[0];

    onUpdateExamScores(examPeriod, {
      math: mathCard.score,
      english: engCard.score,
      chinese: chiCard.score,
      mathFull: mathCard.fullScore,
      englishFull: engCard.fullScore,
      chineseFull: chiCard.fullScore,
      cards: sanitized,
    });
    setShowFastScoreInput(false);
    onShowToast(
      `已保存「${examPeriod}」共 ${sanitized.length} 门学科成绩与满分设置 ✓`
    );
  };

  return (
    <div className="flex flex-col w-full space-y-6 pb-6 animate-fade-slide">
      {/* SECTION 1: 本周待清账错题本 (Horizontal Reel) */}
      <section aria-label="周末清账错题本" className="flex flex-col space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2.5">
            <h2 className="typo-section-title">周末清账错题本</h2>
            <span
              data-testid="remaining-mistakes-badge"
              className="px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container text-[11px] font-bold tracking-wide"
            >
              {remainingMistakes} 题待消灭
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsAddingMistake(true)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary-fixed/50 hover:bg-primary-fixed text-primary px-2.5 py-1 rounded-full cursor-pointer transition-all shadow-2xs active:scale-95"
              title="录入新错题"
            >
              <span className="material-symbols-outlined text-[14px]">
                add_circle
              </span>
              <span>录入错题</span>
            </button>
            {onClearAllMistakes && mistakes.length > 0 && (
              confirmClearAllMistakes ? (
                <div className="inline-flex items-center gap-1 bg-error-container/30 px-2 py-0.5 rounded-full">
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllMistakes();
                      setConfirmClearAllMistakes(false);
                    }}
                    className="text-[11px] font-bold text-error cursor-pointer px-1"
                  >
                    确认清空
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAllMistakes(false)}
                    className="text-[11px] text-outline cursor-pointer px-1"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearAllMistakes(true)}
                  className="flex items-center gap-1 text-[11px] text-outline hover:text-error cursor-pointer transition-colors px-2 py-0.5 rounded-full hover:bg-error-container/20"
                  title="一键清空所有错题"
                >
                  <span className="material-symbols-outlined text-[13px]">
                    delete_sweep
                  </span>
                  <span>清空错题</span>
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => setShowAllMistakesModal(true)}
              className="inline-flex items-center gap-0.5 text-primary text-[12px] font-semibold hover:opacity-80 transition-opacity cursor-pointer"
            >
              <span>全部错题 ({mistakes.length})</span>
              <span className="material-symbols-outlined text-[16px]">
                chevron_right
              </span>
            </button>
          </div>
        </div>

        {/* 学科多维筛选与待消灭状态切换栏 */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
            {availableSubjects.map((subj) => {
              const count =
                subj === '全部'
                  ? mistakes.length
                  : mistakes.filter((m) => m.subject === subj).length;
              return (
                <button
                  key={subj}
                  type="button"
                  onClick={() => setSelectedSubjectFilter(subj)}
                  className={`px-3 py-1 rounded-full text-xs transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    selectedSubjectFilter === subj
                      ? 'bg-primary text-on-primary font-bold shadow-2xs'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <span>{subj}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      selectedSubjectFilter === subj
                        ? 'bg-on-primary/20 text-on-primary'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setOnlyUnclearedFilter((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              onlyUnclearedFilter
                ? 'bg-error-container text-on-error-container font-bold ring-1 ring-error/30'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
            title={onlyUnclearedFilter ? '点击查看全部' : '只看待消灭/未归档错题'}
          >
            <span className="material-symbols-outlined text-[15px]">
              {onlyUnclearedFilter ? 'check_box' : 'check_box_outline_blank'}
            </span>
            <span>只看待消灭</span>
          </button>
        </div>

        {/* Swipeable Card Carousel (supports PC left-mouse hold & drag) */}
        <div
          {...mistakeDragProps}
          className={`flex gap-3.5 overflow-x-auto pb-2 pt-1 -mx-5 px-5 no-scrollbar select-none ${
            isDraggingMistakes
              ? 'cursor-grabbing'
              : 'cursor-grab snap-x snap-mandatory'
          }`}
        >
          {filteredMistakes.length === 0 ? (
            <div className="w-full py-8 px-4 text-center bg-surface-container-lowest rounded-3xl border border-dashed border-[#EAE4DA] text-on-surface-variant flex flex-col items-center justify-center gap-1.5 snap-start">
              <span className="material-symbols-outlined text-2xl text-outline/60">
                filter_alt_off
              </span>
              <p className="text-xs font-semibold text-on-surface">
                当前筛选条件下暂无错题
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedSubjectFilter('全部');
                  setOnlyUnclearedFilter(false);
                }}
                className="text-xs text-primary font-bold hover:underline cursor-pointer mt-0.5"
              >
                重置学科与待消灭筛选
              </button>
            </div>
          ) : (
            filteredMistakes.map((item) => {
            const imgFailed = imageFallbackMap[item.id];
            return (
              <div
                key={item.id}
                data-testid={`mistake-card-${item.id}`}
                className={`min-w-[276px] max-w-[276px] snap-start flex flex-col justify-between p-4 rounded-3xl bg-surface-container-lowest shadow-sm border border-[#EAE4DA]/80 card-hover-lift relative overflow-hidden ${
                  item.cleared ? 'opacity-65 bg-surface-container-low' : ''
                }`}
              >
                <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-tertiary-container/10 pointer-events-none" />

                <div className="flex flex-col space-y-3">
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide truncate max-w-[100px] ${item.badgeClass}`}
                      title={item.sourceLabel}
                    >
                      {item.sourceLabel}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      {item.cleared ? (
                        <span className="text-[11px] text-secondary font-semibold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[13px]">
                            verified
                          </span>
                          已归档
                        </span>
                      ) : item.statusType === 'repeat' ? (
                        <span className="text-[11px] text-error font-semibold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[13px]">
                            history
                          </span>
                          {item.statusText}
                        </span>
                      ) : item.statusType === 'keypoint' ? (
                        <span className="text-[11px] text-error font-semibold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[13px]">
                            flag
                          </span>
                          {item.statusText}
                        </span>
                      ) : (
                        <span className="text-[11px] text-on-surface-variant font-medium">
                          {item.statusText}
                        </span>
                      )}

                      {/* Edit Button */}
                      <button
                        type="button"
                        aria-label={`修改错题 ${item.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMistake(item);
                        }}
                        className="px-1.5 py-0.5 rounded-full bg-surface-container hover:bg-primary-fixed/60 text-on-surface-variant hover:text-primary flex items-center gap-0.5 cursor-pointer transition-colors text-[11px] font-semibold"
                        title="修改此题（科目、错因、题干与解法）"
                      >
                        <span className="material-symbols-outlined text-[12px]">
                          edit
                        </span>
                        <span>修改</span>
                      </button>

                      {/* Delete Button */}
                      {onDeleteMistake && (
                        <button
                          type="button"
                          aria-label={`删除错题 ${item.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirmDeleteMistakeId === item.id) {
                              onDeleteMistake(item.id);
                              setConfirmDeleteMistakeId(null);
                            } else {
                              setConfirmDeleteMistakeId(item.id);
                            }
                          }}
                          className={`rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                            confirmDeleteMistakeId === item.id
                              ? 'px-1.5 py-0.5 bg-error text-on-error text-[10px] font-bold'
                              : 'w-5 h-5 hover:bg-error-container/40 text-outline hover:text-error'
                          }`}
                          title="彻底删除此错题"
                        >
                          {confirmDeleteMistakeId === item.id ? (
                            <span>删?</span>
                          ) : (
                            <span className="material-symbols-outlined text-[13px]">
                              delete
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-16 h-16 rounded-2xl bg-[#F5EFE6] border border-[#E6DEC8] overflow-hidden shrink-0 relative flex items-center justify-center">
                      {item.subject === '数学' ? (
                        <svg
                          viewBox="0 0 64 64"
                          className="w-full h-full absolute inset-0"
                          aria-hidden="true"
                        >
                          <rect width="64" height="64" fill="#F6F0E4" />
                          <path
                            d="M0 16 H64 M0 32 H64 M0 48 H64 M16 0 V64 M32 0 V64 M48 0 V64"
                            stroke="#E5DCCB"
                            strokeWidth="0.75"
                          />
                          <line
                            x1="8"
                            y1="52"
                            x2="58"
                            y2="52"
                            stroke="#88726c"
                            strokeWidth="1.2"
                          />
                          <line
                            x1="20"
                            y1="8"
                            x2="20"
                            y2="58"
                            stroke="#88726c"
                            strokeWidth="1.2"
                          />
                          <line
                            x1="38"
                            y1="10"
                            x2="38"
                            y2="56"
                            stroke="#d97757"
                            strokeWidth="1"
                            strokeDasharray="2 2"
                          />
                          <path
                            d="M 14 54 Q 38 -8 56 54"
                            fill="none"
                            stroke="#2B5B84"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                          />
                          <circle cx="38" cy="23" r="2.5" fill="#99462a" />
                        </svg>
                      ) : item.subject === '物理' ? (
                        <svg
                          viewBox="0 0 64 64"
                          className="w-full h-full absolute inset-0"
                          aria-hidden="true"
                        >
                          <rect width="64" height="64" fill="#F6F0E4" />
                          <line
                            x1="4"
                            y1="32"
                            x2="60"
                            y2="32"
                            stroke="#88726c"
                            strokeWidth="1"
                            strokeDasharray="3 2"
                          />
                          <ellipse
                            cx="32"
                            cy="32"
                            rx="5"
                            ry="20"
                            fill="#A4F1E0"
                            fillOpacity="0.55"
                            stroke="#126a5d"
                            strokeWidth="1.6"
                          />
                          <path
                            d="M12 20 L32 20 L54 44 M12 20 L54 44"
                            fill="none"
                            stroke="#d97757"
                            strokeWidth="1.4"
                          />
                        </svg>
                      ) : (
                        <span className="material-symbols-outlined text-[28px] text-primary-container relative z-10">
                          {item.iconFallback || 'spellcheck'}
                        </span>
                      )}
                      {item.imageUrl && !imgFailed && (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setImageFallbackMap((prev) => ({
                              ...prev,
                              [item.id]: true,
                            }))
                          }
                          className="w-full h-full object-cover relative z-10"
                        />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0 space-y-1">
                      <p className="typo-card-title truncate">{item.title}</p>
                      <span
                        className={`inline-flex items-center text-[11px] font-semibold ${item.reasonColorClass}`}
                      >
                        <span className="material-symbols-outlined text-[13px] mr-0.5">
                          {item.reasonIcon}
                        </span>
                        {item.reasonText}
                      </span>
                    </div>
                  </div>

                  <p className="text-[13px] leading-[1.55] text-on-surface-variant line-clamp-2">
                    {item.excerpt}
                  </p>
                </div>

                <div className="pt-3.5 mt-1 flex items-center gap-1.5">
                  {item.cleared ? (
                    <button
                      type="button"
                      onClick={() => {
                        onRestoreMistake(item.id);
                        onShowToast(`已将「${item.title}」放回待复习池`);
                      }}
                      className="w-full py-2 px-3 rounded-full bg-surface-container text-on-surface-variant text-[12px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-surface-container-high"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        undo
                      </span>
                      <span>已完成清账 · 点击撤回</span>
                    </button>
                  ) : item.ctaStyle === 'secondary' ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClearMistake(item.id);
                        onShowToast(`「${item.title}」已重做过关，成功销项 ✓`);
                      }}
                      className="w-full py-2 px-3 rounded-full bg-secondary text-on-secondary text-[12px] font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        check_circle
                      </span>
                      <span>{item.ctaLabel}</span>
                    </button>
                  ) : item.ctaStyle === 'primary' ? (
                    <button
                      type="button"
                      onClick={() => setActiveMistakeDetail(item)}
                      className="w-full py-2 px-3 rounded-full bg-primary-container text-on-primary text-[12px] font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        replay
                      </span>
                      <span>{item.ctaLabel}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveMistakeDetail(item)}
                      className="w-full py-2 px-3 rounded-full bg-surface-container text-on-surface text-[12px] font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform hover:bg-surface-container-high cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        visibility
                      </span>
                      <span>{item.ctaLabel}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        </div>
      </section>

      {/* SECTION 2: 考试成绩与能力档案 */}
      <section
        aria-label="考试成绩与能力档案"
        className="flex flex-col space-y-3.5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex flex-col space-y-0.5 min-w-0">
            <h2 className="typo-section-title">考试成绩与能力档案</h2>
            <p className="typo-section-subtitle">
              自适应月考与期中/期末考制 · 点击卡片即改考分与满分
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => {
                setRenameCurrentPeriodInput(examPeriod);
                setShowExamPeriodManager((prev) => !prev);
              }}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold active:scale-95 transition-all cursor-pointer whitespace-nowrap ${
                showExamPeriodManager
                  ? 'bg-secondary text-on-secondary shadow-2xs'
                  : 'bg-secondary-container/50 text-on-secondary-container hover:bg-secondary-container'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                calendar_month
              </span>
              <span>考制/月考逻辑</span>
            </button>
            <button
              type="button"
              onClick={() =>
                showFastScoreInput
                  ? setShowFastScoreInput(false)
                  : openFastEntry()
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container text-on-surface text-[11px] font-semibold hover:bg-surface-container-high active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[14px] text-secondary">
                edit_note
              </span>
              <span>改成绩/满分/学科</span>
            </button>
            <button
              type="button"
              onClick={onOpenCameraSnap}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[15px]">
                photo_camera
              </span>
              <span>拍成绩单</span>
            </button>
          </div>
        </div>

        {/* Quick 1-Line School Exam Mode Switcher Bar (Always visible so users can switch 11月月考 vs 无月考直达期中 in 1 tap) */}
        <div className="px-3 py-2 rounded-2xl bg-surface-container-low/85 border border-[#EAE4DA]/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-on-surface-variant">
              当前学校考制：
            </span>
            <button
              type="button"
              onClick={() =>
                handleApplySmartExamRule(activeCalendarMonth, 'monthly_and_major')
              }
              className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                schoolExamMode === 'monthly_and_major'
                  ? 'bg-secondary text-on-secondary shadow-2xs'
                  : 'bg-white text-on-surface-variant hover:text-on-surface border border-[#EAE4DA]'
              }`}
            >
              按月自动月考 ({activeCalendarMonth}月月考)
            </button>
            <button
              type="button"
              onClick={() =>
                handleApplySmartExamRule(activeCalendarMonth, 'major_only')
              }
              className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                schoolExamMode === 'major_only'
                  ? 'bg-primary text-on-primary shadow-2xs'
                  : 'bg-white text-on-surface-variant hover:text-on-surface border border-[#EAE4DA]'
              }`}
            >
              无月考/无预备 · 直接考期中
            </button>
            <button
              type="button"
              onClick={() =>
                handleApplySmartExamRule(activeCalendarMonth, 'with_prep')
              }
              className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                schoolExamMode === 'with_prep'
                  ? 'bg-tertiary text-on-tertiary shadow-2xs'
                  : 'bg-white text-on-surface-variant hover:text-on-surface border border-[#EAE4DA]'
              }`}
            >
              含期中预备热身
            </button>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-outline">月份推演：</span>
            {[10, 11, 12, 1].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleApplySmartExamRule(m, schoolExamMode)}
                className={`px-2 py-0.5 rounded-full font-bold cursor-pointer transition-all ${
                  activeCalendarMonth === m
                    ? 'bg-inverse-surface text-inverse-on-surface'
                    : 'bg-white text-on-surface-variant hover:bg-surface-container border border-[#EAE4DA]'
                }`}
              >
                {m}月
              </button>
            ))}
          </div>
        </div>

        {/* Smart Exam Period Logic & Customizer Panel */}
        {showExamPeriodManager && (
          <div className="p-4 rounded-2xl bg-surface-container-lowest border border-secondary/35 shadow-sm space-y-3.5 animate-fade-slide text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="font-bold text-secondary text-[13px] block">
                  📅 考试选项三层自适应逻辑（解决不同学校有/无月考或直接考期中的差异）
                </span>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  ① 有月考学校：随月份自动变为「10月月考 → 11月月考」；② 无月考/无预备学校：直接展示「期中考试 / 期末考试」；③ 支持自由改名与增删。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExamPeriodManager(false)}
                className="text-outline hover:text-on-surface cursor-pointer shrink-0"
              >
                收起
              </button>
            </div>

            {/* 3 Smart School Exam Mode Presets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  handleApplySmartExamRule(11, 'monthly_and_major')
                }
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
                  schoolExamMode === 'monthly_and_major'
                    ? 'bg-secondary-container/35 border-secondary shadow-2xs'
                    : 'bg-surface-container-low hover:bg-secondary-container/25 border-[#EAE4DA]'
                }`}
              >
                <div className="font-bold text-on-surface">
                  📅 模式 A：按月自动月考
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  10月显示10月月考，到11月自动变为「11月月考」+「期中考试」
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleApplySmartExamRule(11, 'major_only')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
                  schoolExamMode === 'major_only'
                    ? 'bg-primary-fixed/40 border-primary shadow-2xs'
                    : 'bg-surface-container-low hover:bg-primary-fixed/25 border-[#EAE4DA]'
                }`}
              >
                <div className="font-bold text-primary">
                  🎯 模式 B：无月考 · 直接期中
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  不考月考也没有期中预备，平时单元测后直接就是「期中考试」
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleApplySmartExamRule(11, 'with_prep')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
                  schoolExamMode === 'with_prep'
                    ? 'bg-tertiary-fixed/45 border-tertiary shadow-2xs'
                    : 'bg-surface-container-low hover:bg-tertiary-fixed/25 border-[#EAE4DA]'
                }`}
              >
                <div className="font-bold text-tertiary">
                  🧭 模式 C：含期中预备热身
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  适合期中前有摸底热身的学校（月考 → 期中预备 → 期中考试）
                </p>
              </button>
            </div>

            {/* Rename Current Exam Period OR Add New Exam Period */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={renameCurrentPeriodInput}
                  onChange={(e) => setRenameCurrentPeriodInput(e.target.value)}
                  placeholder="修改当前考试名（如：期中考试）"
                  className="flex-1 bg-white rounded-lg px-2.5 py-1.5 text-xs font-semibold text-on-surface border border-[#EAE4DA]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = renameCurrentPeriodInput.trim();
                    if (!trimmed) return;
                    setExamPeriods((prev) =>
                      prev.map((p) => (p === examPeriod ? trimmed : p))
                    );
                    onSelectExamPeriod(trimmed);
                    onShowToast(`已将考试名称修改为「${trimmed}」✓`);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-semibold cursor-pointer shrink-0"
                >
                  改当前名
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customExamPeriodInput}
                  onChange={(e) => setCustomExamPeriodInput(e.target.value)}
                  placeholder="新增考试（如：12月月考、一模）"
                  className="flex-1 bg-white rounded-lg px-2.5 py-1.5 text-xs text-on-surface border border-[#EAE4DA]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = customExamPeriodInput.trim();
                    if (!trimmed) return;
                    if (!examPeriods.includes(trimmed)) {
                      setExamPeriods((prev) => [...prev, trimmed]);
                    }
                    onSelectExamPeriod(trimmed);
                    setCustomExamPeriodInput('');
                    onShowToast(`已新增并切换至「${trimmed}」✓`);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-secondary text-on-secondary font-semibold cursor-pointer shrink-0"
                >
                  + 新增考试
                </button>
              </div>
            </div>

            {/* Quick Add / Delete Exam Period Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[11px] text-outline">快捷添加：</span>
              {[
                '10月月考',
                '11月月考',
                '12月月考',
                '期中预备',
                '期中考试',
                '期末考试',
                '日常单元测',
                '一模考试',
              ]
                .filter((p) => !examPeriods.includes(p))
                .map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setExamPeriods((prev) => [...prev, p]);
                      onSelectExamPeriod(p);
                      onShowToast(`已添加「${p}」`);
                    }}
                    className="px-2.5 py-0.5 rounded-full bg-white hover:bg-secondary-container text-[11px] text-on-surface-variant border border-[#EAE4DA] cursor-pointer"
                  >
                    + {p}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Continuous Fast Numeric Score, Full-Score & Custom Subject Entry Panel */}
        {showFastScoreInput && (
          <form
            onSubmit={handleSaveFastScores}
            className="p-3.5 rounded-2xl bg-surface-container-lowest border border-primary/30 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[12px] font-semibold text-on-surface">
                ⚡ 考分、满分与学科管理（{examPeriod} · 支持改学科名、改满分90/100/120/150及新增学科）
              </span>
              <button
                type="button"
                onClick={() => setShowFastScoreInput(false)}
                className="text-xs text-outline hover:text-on-surface cursor-pointer"
              >
                收起
              </button>
            </div>

            {/* Batch Full-Score Quick Bar */}
            <div className="flex items-center justify-between flex-wrap gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-container-low text-[11px]">
              <span className="text-on-surface-variant font-medium">
                全部学科同设满分（或下方单科独立修改）：
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                {FULL_SCORE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setDraftCards((prev) =>
                        prev.map((c) => ({ ...c, fullScore: preset }))
                      );
                    }}
                    className="px-2 py-0.5 rounded-full bg-white hover:bg-primary-fixed text-on-surface-variant hover:text-primary font-semibold border border-[#EAE4DA] cursor-pointer transition-colors"
                  >
                    满分{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Subject Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {draftCards.map((card, idx) => (
                <div
                  key={card.id || `${card.subject}-${idx}`}
                  className="flex flex-col gap-1.5 bg-surface-container-low p-2.5 rounded-xl border border-[#EAE4DA]/60"
                >
                  <div className="flex items-center justify-between gap-1">
                    <input
                      type="text"
                      aria-label={`学科名称-${idx + 1}`}
                      value={card.subject}
                      onChange={(e) =>
                        handleUpdateDraftCard(idx, { subject: e.target.value })
                      }
                      placeholder="学科名"
                      className="w-24 bg-white rounded-lg px-2 py-0.5 text-xs font-bold text-primary border border-outline-variant/40 focus:outline-none focus:border-primary"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-on-surface-variant">
                        满分{card.fullScore}
                      </span>
                      {draftCards.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftCard(idx)}
                          className="w-5 h-5 rounded-full hover:bg-error-container text-outline hover:text-error flex items-center justify-center cursor-pointer"
                          title="移除此学科"
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            close
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <label className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-on-surface-variant">
                        得分
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={300}
                        aria-label={`${card.subject}得分`}
                        value={card.score}
                        onChange={(e) =>
                          handleUpdateDraftCard(idx, {
                            score: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="w-full bg-white rounded-lg px-2 py-1 text-sm font-bold text-on-surface border border-outline-variant/40 focus:outline-none focus:border-primary"
                      />
                    </label>
                    <label className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-on-surface-variant">
                        满分(可改)
                      </span>
                      <input
                        type="number"
                        min={10}
                        max={300}
                        aria-label={`${card.subject}满分`}
                        value={card.fullScore}
                        onChange={(e) =>
                          handleUpdateDraftCard(idx, {
                            fullScore: parseInt(e.target.value, 10) || 100,
                          })
                        }
                        className="w-full bg-white rounded-lg px-2 py-1 text-sm font-bold text-primary border border-outline-variant/40 focus:outline-none focus:border-primary"
                      />
                    </label>
                  </div>

                  <div className="flex items-center gap-1 pt-0.5">
                    {FULL_SCORE_PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() =>
                          handleUpdateDraftCard(idx, { fullScore: p })
                        }
                        className={`flex-1 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer ${
                          Number(card.fullScore) === p
                            ? 'bg-primary text-on-primary'
                            : 'bg-white text-on-surface-variant'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Exam Subject Bar */}
            <div className="p-2.5 rounded-xl bg-surface-container-low/80 border border-[#EAE4DA] space-y-2">
              <span className="text-[11px] font-semibold text-on-surface-variant block">
                + 新增其他考试学科（支持自定义学科与满分）：
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  type="text"
                  value={newExamSubjectName}
                  onChange={(e) => setNewExamSubjectName(e.target.value)}
                  placeholder="学科名（如：物理、道法、生物...）"
                  className="flex-1 min-w-[130px] bg-white rounded-lg px-2.5 py-1 text-xs text-on-surface border border-outline-variant/50"
                />
                <input
                  type="number"
                  min={0}
                  max={300}
                  value={newExamSubjectScore}
                  onChange={(e) => setNewExamSubjectScore(e.target.value)}
                  placeholder="得分"
                  className="w-16 bg-white rounded-lg px-2 py-1 text-xs font-bold text-on-surface border border-outline-variant/50 text-center"
                />
                <span className="text-xs text-outline">/</span>
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={newExamSubjectFull}
                  onChange={(e) => setNewExamSubjectFull(e.target.value)}
                  placeholder="满分"
                  className="w-16 bg-white rounded-lg px-2 py-1 text-xs font-bold text-primary border border-outline-variant/50 text-center"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleAddDraftSubject(
                      newExamSubjectName,
                      parseInt(newExamSubjectScore, 10) || 90,
                      parseInt(newExamSubjectFull, 10) || 100
                    )
                  }
                  className="px-3 py-1 rounded-lg bg-secondary text-on-secondary text-xs font-semibold cursor-pointer shrink-0"
                >
                  + 添加学科
                </button>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-outline">快添学科：</span>
                {Array.from(
                  new Set([
                    ...(gradeExamSubjects.length > 0
                      ? gradeExamSubjects
                      : EXTRA_EXAM_SUBJECTS),
                    ...(customSubjects || []),
                  ])
                )
                  .filter((s) => !draftCards.some((c) => c.subject === s))
                  .map((subj) => {
                    const meta = getSubjectMeta(subj);
                    return (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => handleAddDraftSubject(subj, 92, 100)}
                        className="px-2 py-0.5 rounded-full bg-white hover:bg-secondary-container text-[10px] text-on-surface-variant border border-[#EAE4DA] cursor-pointer inline-flex items-center gap-0.5"
                      >
                        <span
                          className={`material-symbols-outlined text-[11px] ${meta.iconColorClass}`}
                        >
                          {meta.icon}
                        </span>
                        <span>+ {subj}</span>
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFastScoreInput(false)}
                className="px-3.5 py-1.5 rounded-full bg-surface-container text-on-surface-variant text-xs font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-full bg-primary text-on-primary text-xs font-semibold shadow-xs hover:bg-primary-container transition-colors cursor-pointer"
              >
                保存考分与学科设置 ✓
              </button>
            </div>
          </form>
        )}

        {/* Exam Period Tabs (supports PC left-mouse hold & drag + inline delete in manager mode) */}
        <div
          {...periodDragProps}
          className={`flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 select-none ${
            isDraggingPeriods ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {examPeriods.map((period) => {
            const isActive = examPeriod === period;
            return (
              <div key={period} className="inline-flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onSelectExamPeriod(period);
                    setRenameCurrentPeriodInput(period);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-inverse-surface text-inverse-on-surface font-semibold shadow-sm px-4'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface font-medium'
                  }`}
                >
                  <span>{period}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed" />
                  )}
                </button>
                {showExamPeriodManager && examPeriods.length > 1 && (
                  <button
                    type="button"
                    aria-label={`删除考试批次 ${period}`}
                    onClick={() => {
                      const remaining = examPeriods.filter((p) => p !== period);
                      setExamPeriods(remaining);
                      if (examPeriod === period) {
                        onSelectExamPeriod(remaining[0]);
                      }
                      onShowToast(`已移除「${period}」考试批次`);
                    }}
                    className="-ml-1.5 w-5 h-5 rounded-full bg-error-container text-on-error-container text-[11px] font-bold flex items-center justify-center cursor-pointer shadow-2xs"
                    title={`移除 ${period}`}
                  >
                    <span className="material-symbols-outlined text-[13px]">close</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Score Cards Bento Grid (Click card to edit subject, score & fullScore) */}
        {examScores.length === 0 ? (
          <div className="p-6 rounded-2xl bg-surface-container-lowest border border-dashed border-[#EAE4DA] flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-secondary-container/60 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">add_chart</span>
            </div>
            <div className="space-y-1 max-w-sm">
              <div className="text-sm font-bold text-on-surface">「{examPeriod}」暂未录入考试成绩</div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                示范成绩已清空。点击下方按钮即可录入真实考分与满分，开启专属成长档案。
              </p>
            </div>
            <button
              type="button"
              onClick={() => openFastEntry()}
              className="px-4 py-2 rounded-full bg-secondary text-on-secondary text-xs font-semibold shadow-xs hover:bg-secondary/90 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">edit_note</span>
              <span>+ 录入本次考分与学科</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {examScores.map((card, idx) => {
              const pct = Math.min(
                100,
                Math.round((card.score / Math.max(card.fullScore, 1)) * 100)
              );
              const titleColor =
                card.colorScheme === 'primary'
                  ? 'text-primary'
                  : card.colorScheme === 'secondary'
                  ? 'text-secondary'
                  : 'text-tertiary';
              const barColor =
                card.colorScheme === 'primary'
                  ? 'bg-primary-container'
                  : card.colorScheme === 'secondary'
                  ? 'bg-secondary'
                  : 'bg-tertiary-container';
              const badgeColor =
                card.colorScheme === 'tertiary'
                  ? 'text-tertiary'
                  : 'text-secondary';

              return (
                <div
                  key={card.id || `${card.subject}-${idx}`}
                  onClick={() => openFastEntry()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openFastEntry();
                    }
                  }}
                  title={`点击修改${card.subject}学科名、得分或满分（支持90/100/120/150等）`}
                  className="flex flex-col p-3.5 rounded-2xl bg-surface-container-lowest shadow-sm border border-[#EAE4DA]/75 hover:border-primary/40 card-hover-lift space-y-2.5 cursor-pointer group min-w-0"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[13px] font-bold tracking-tight truncate inline-flex items-center gap-1 ${titleColor}`}
                    >
                      <span className="material-symbols-outlined text-[15px] shrink-0">
                        {getSubjectMeta(card.subject).icon}
                      </span>
                      <span className="truncate">{card.subject}</span>
                    </span>
                    <span className="material-symbols-outlined text-[14px] text-outline group-hover:text-primary transition-colors shrink-0">
                      edit
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="text-[22px] sm:text-[26px] leading-none typo-num-hero text-on-surface">
                        {card.score}
                      </span>
                      <span className="text-[11px] font-medium text-outline underline decoration-dotted underline-offset-2 group-hover:text-primary tabular-nums">
                        /{card.fullScore}
                      </span>
                    </div>
                    <div
                      className={`inline-flex items-center ${badgeColor} text-[11px] font-semibold max-w-full`}
                    >
                      <span className="material-symbols-outlined text-[13px] mr-0.5 shrink-0">
                        {card.trendIcon}
                      </span>
                      <span className="truncate">{card.trendText}</span>
                    </div>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`${barColor} h-full rounded-full transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 2.2: 每日完成的作业与体育打卡 · 按日期记录明细表（支持补录漏记与修改错记） */}
      <DailyHomeworkPeLedgerSection
        tasks={tasks}
        gradeClass={gradeClass}
        customSubjects={customSubjects}
        peExercises={peExercises}
        extracurricularActivities={extracurricularActivities}
        onAddTaskRecord={(newTask) => {
          if (onAddTaskRecord) onAddTaskRecord(newTask);
        }}
        onUpdateTaskRecord={(updatedTask) => {
          if (onUpdateTaskRecord) onUpdateTaskRecord(updatedTask);
        }}
        onDeleteTaskRecord={(taskId) => {
          if (onDeleteTaskRecord) onDeleteTaskRecord(taskId);
        }}
        onShowToast={onShowToast}
      />

      {/* SECTION 2.5: 作业与成绩 · 周视图 / 月视图 / 季视图 / 年视图 & 综合学情报表 */}
      <MultiPeriodReportSection
        tasks={tasks}
        examScores={examScores}
        mistakes={mistakes}
        gradeClass={gradeClass}
        isDemoPurged={isDemoPurged}
        customSubjects={customSubjects}
        onShowToast={onShowToast}
      />

      {/* SECTION 3: 平时投入 vs 考分产出 (Tactile Visual Insight Chart) */}
      <section
        aria-label="平时投入 vs 考分产出"
        className="flex flex-col p-5 rounded-3xl bg-surface-container-lowest shadow-sm border border-[#EAE4DA]/80 space-y-4 relative overflow-hidden"
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-col space-y-0.5">
            <span className="typo-section-title">平时投入 vs 考分产出</span>
            <span className="typo-section-subtitle">
              学习时长与提分效能罗盘 · 本月统计（点击气泡查看学科诊断）
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">
              insights
            </span>
          </div>
        </div>

        {/* Tactile Visual Efficiency Map / Bubbles */}
        {efficiencyBubbles.length === 0 ? (
          <div className="w-full h-44 rounded-2xl bg-surface-container-low p-4 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-[#EAE4DA]">
            <span className="material-symbols-outlined text-[28px] text-outline">query_stats</span>
            <div className="text-xs font-bold text-on-surface">学情效能罗盘待生成</div>
            <p className="text-[11px] text-on-surface-variant max-w-xs">
              示范数据已彻底清空。录入真实考分并打卡每日作业后，系统将自动汇总各科学时投入与提分效能四象限罗盘。
            </p>
          </div>
        ) : (
          <div className="relative w-full h-44 rounded-2xl bg-surface-container-low p-3 flex flex-col justify-between overflow-hidden">
            {/* Subtle paper graph guidelines */}
            <div className="absolute inset-0 flex flex-col justify-between p-3 pointer-events-none opacity-40">
              <div className="w-full border-t border-dashed border-outline-variant" />
              <div className="w-full border-t border-dashed border-outline-variant" />
              <div className="w-full border-t border-dashed border-outline-variant" />
            </div>

            {efficiencyBubbles.map((b) => {
              const isSelected = selectedBubble?.id === b.id;
              const circleClass =
                b.colorScheme === 'primary'
                  ? 'bg-primary-container text-on-primary'
                  : b.colorScheme === 'tertiary'
                  ? 'bg-tertiary-container text-on-tertiary'
                  : 'bg-secondary text-on-secondary';
              const tagClass =
                b.colorScheme === 'primary'
                  ? 'bg-primary-fixed text-on-primary-fixed'
                  : b.colorScheme === 'tertiary'
                  ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                  : 'bg-secondary-fixed text-on-secondary-fixed';

              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() =>
                    setSelectedBubble(isSelected ? null : b)
                  }
                  className={`absolute ${b.positionClass} flex flex-col items-center group cursor-pointer focus:outline-none z-10`}
                >
                  <div
                    className={`${b.sizeClass} rounded-full ${circleClass} flex flex-col items-center justify-center shadow-md transform transition-transform group-hover:scale-105 ${
                      isSelected ? 'ring-3 ring-primary/40 scale-105' : ''
                    }`}
                  >
                    <span className="text-[12px] font-bold">{b.subject}</span>
                    <span className="text-[11px] opacity-90">{b.hours}h</span>
                  </div>
                  <div
                    className={`mt-1 px-2 py-0.5 rounded-full ${tagClass} text-[11px] font-semibold shadow-2xs whitespace-nowrap`}
                  >
                    {b.badgeText}
                  </div>
                </button>
              );
            })}

            {/* Axes Labels */}
            <div className="relative z-10 flex justify-between w-full text-[11px] text-on-surface-variant font-medium pointer-events-none mt-auto">
              <span>← 夯实基础期</span>
              <span>高回报爆发区 →</span>
            </div>
          </div>
        )}

        {/* Selected Bubble Interactive Diagnostic Pill */}
        {selectedBubble && (
          <div className="p-3 rounded-2xl bg-primary-fixed/30 border border-primary/20 flex items-start justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-primary">
                {selectedBubble.subject}（月累计 {selectedBubble.hours} 小时 · 得分率{' '}
                {selectedBubble.scorePercent}%）：
              </span>
              <span className="text-on-surface-variant">
                {selectedBubble.quadrantNote}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedBubble(null)}
              className="text-outline hover:text-on-surface shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* Family & Self Reflection Bookmark Card (Child & Parent Only) */}
        <div className="p-3.5 rounded-2xl bg-surface-container flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
            <span className="material-symbols-outlined text-[18px]">
              psychology
            </span>
          </div>
          <div className="flex flex-col space-y-1.5 flex-1">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[12px] font-bold text-on-surface">
                家庭学情小结 · 亲子复盘便签
              </span>
              <button
                type="button"
                onClick={() => {
                  setReflectionDraft(familyReflectionNote || '');
                  setIsEditingReflection((prev) => !prev);
                }}
                className="text-[11px] text-primary hover:underline font-semibold cursor-pointer flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[13px]">
                  edit
                </span>
                <span>{isEditingReflection ? '收起' : '编辑便签'}</span>
              </button>
            </div>
            {isEditingReflection ? (
              <div className="space-y-2">
                <textarea
                  rows={2}
                  value={reflectionDraft}
                  onChange={(e) => setReflectionDraft(e.target.value)}
                  placeholder="记录本周孩子的学习亮点、习惯进步或下周小目标..."
                  className="w-full rounded-xl bg-white p-2.5 text-xs text-on-surface border border-[#EAE4DA] focus:outline-none focus:border-primary"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsEditingReflection(false)}
                    className="px-3 py-1 rounded-full bg-white text-on-surface-variant text-[11px] font-semibold border border-[#EAE4DA] cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateReflectionNote) {
                        onUpdateReflectionNote(reflectionDraft.trim());
                      }
                      setIsEditingReflection(false);
                      onShowToast('已保存家庭学情小结 ✓');
                    }}
                    className="px-3.5 py-1 rounded-full bg-primary text-on-primary text-[11px] font-semibold cursor-pointer"
                  >
                    保存便签 ✓
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-on-surface-variant leading-relaxed">
                {familyReflectionNote
                  ? `“${familyReflectionNote}”`
                  : isDemoPurged || (examScores.length === 0 && tasks.length === 0)
                  ? '“欢迎使用今日书桌成长档案！录入各次小测、月考与期中/期末考分，配合每日作业与体育锻炼打卡，点击右上角「编辑便签」即可记录专属亲子复盘建议。”'
                  : '“本月数学压轴题突破明显，平时错题回填坚持得非常棒！每晚坚持 20 分钟中考体育跳绳与体能打卡，周末重点把物理受力分析与透镜成像的 2 道错题吃透，象棋、钢琴与小号练习继续保持节奏。”'}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Interactive Study Plan Footnote (Tactile Card) */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary-container/35 border border-secondary/15 text-on-secondary-container">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-secondary text-[22px]">
            calendar_month
          </span>
          <div className="flex flex-col">
            <span className="text-[14px] font-semibold text-on-surface">
              本周清账目标进度
            </span>
            <span
              data-testid="weekend-progress-text"
              className="text-[13px] text-on-surface-variant"
            >
              已攻破 {clearedCount} 题 / 剩余 {remainingMistakes} 题错题
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenWeeklyReport}
          className="px-3.5 py-2 rounded-full bg-secondary text-on-secondary text-[12px] font-semibold shadow-xs hover:bg-secondary/90 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
        >
          生成周末清账单
        </button>
      </div>

      {/* Modal for Single Mistake Solution & Retry (via createPortal to break out of containing blocks) */}
      {activeMistakeDetail &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
            onClick={() => setActiveMistakeDetail(null)}
          >
            <div
              className="bg-[#FDFBF7] rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[#EAE4DA] space-y-4 max-h-[90vh] flex flex-col animate-scale-pop"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label={activeMistakeDetail.title}
            >
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#EAE4DA]/70">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${activeMistakeDetail.badgeClass}`}
                    >
                      {activeMistakeDetail.sourceLabel}
                    </span>
                    <span
                      className={`inline-flex items-center text-[11px] font-semibold ${activeMistakeDetail.reasonColorClass}`}
                    >
                      <span className="material-symbols-outlined text-[13px] mr-0.5">
                        {activeMistakeDetail.reasonIcon}
                      </span>
                      {activeMistakeDetail.reasonText}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-on-surface mt-1.5 truncate">
                    {activeMistakeDetail.title}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    aria-label="修改此错题"
                    onClick={() => {
                      const target = activeMistakeDetail;
                      setActiveMistakeDetail(null);
                      setEditingMistake(target);
                    }}
                    className="px-2.5 py-1 rounded-full bg-surface-container hover:bg-primary-fixed/60 text-xs font-semibold text-on-surface-variant hover:text-primary flex items-center gap-1 cursor-pointer transition-colors"
                    title="修改此错题"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      edit
                    </span>
                    <span>修改</span>
                  </button>

                  {onDeleteMistake && (
                    <button
                      type="button"
                      aria-label="删除此错题"
                      onClick={() => {
                        onDeleteMistake(activeMistakeDetail.id);
                        setActiveMistakeDetail(null);
                      }}
                      className="w-8 h-8 rounded-full hover:bg-error-container text-outline hover:text-error flex items-center justify-center cursor-pointer transition-colors"
                      title="彻底删除此错题"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        delete
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    aria-label="关闭错题详情"
                    onClick={() => setActiveMistakeDetail(null)}
                    className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-surface-container-low text-on-surface-variant space-y-1.5 border border-[#EAE4DA]/60">
                  <div className="font-bold text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-primary">
                      menu_book
                    </span>
                    <span>原题节选与题干：</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">
                    {activeMistakeDetail.excerpt}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-secondary-container/25 border border-secondary/25 space-y-2">
                  <div className="font-bold text-secondary flex items-center gap-1 text-[13px]">
                    <span className="material-symbols-outlined text-[17px]">
                      lightbulb
                    </span>
                    <span>审题与满分解题钥匙</span>
                  </div>
                  <p className="text-on-surface leading-relaxed whitespace-pre-wrap font-mono text-xs">
                    {activeMistakeDetail.solutionDetail}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#EAE4DA]">
                <button
                  type="button"
                  onClick={() => setActiveMistakeDetail(null)}
                  className="px-4 py-2.5 rounded-full bg-surface-container text-on-surface-variant text-xs font-semibold hover:bg-surface-container-high cursor-pointer"
                >
                  留着周末再看
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = activeMistakeDetail;
                    setActiveMistakeDetail(null);
                    setEditingMistake(target);
                  }}
                  className="px-3.5 py-2.5 rounded-full bg-surface-container hover:bg-primary-fixed/60 text-on-surface-variant hover:text-primary text-xs font-semibold cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    edit
                  </span>
                  <span>修改题目</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClearMistake(activeMistakeDetail.id);
                    onShowToast(
                      `「${activeMistakeDetail.title}」已重练过关并归档 ✓`
                    );
                    setActiveMistakeDetail(null);
                  }}
                  className="flex-1 py-2.5 rounded-full bg-secondary text-on-secondary text-xs font-bold shadow-sm hover:bg-secondary/90 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    check_circle
                  </span>
                  <span>已重做过关 ✓</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal for All Mistakes Overview (via createPortal) */}
      {showAllMistakesModal &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
            onClick={() => setShowAllMistakesModal(false)}
          >
            <div
              className="bg-[#FDFBF7] rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-[#EAE4DA] space-y-4 max-h-[85vh] flex flex-col animate-scale-pop"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="全部错题档案库"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#EAE4DA]">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-on-surface">
                    本学期错题清账总库
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    收录 {mistakes.length} 道错题 · 待攻克 {remainingMistakes} 道 · 已完成 {clearedCount} 道
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAllMistakesModal(false);
                      setIsAddingMistake(true);
                    }}
                    className="px-3 py-1 rounded-full bg-primary text-on-primary text-xs font-bold cursor-pointer hover:bg-primary-container flex items-center gap-1 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      add
                    </span>
                    <span>录入新错题</span>
                  </button>
                  <button
                    type="button"
                    aria-label="关闭错题总库"
                    onClick={() => setShowAllMistakesModal(false)}
                    className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              </div>

              {/* 弹窗内学科与待消灭快捷筛选 */}
              <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1 shrink-0 border-b border-[#EAE4DA]/60">
                <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                  {availableSubjects.map((subj) => {
                    const count =
                      subj === '全部'
                        ? mistakes.length
                        : mistakes.filter((m) => m.subject === subj).length;
                    return (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => setSelectedSubjectFilter(subj)}
                        className={`px-2.5 py-0.5 rounded-full text-xs transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                          selectedSubjectFilter === subj
                            ? 'bg-primary text-on-primary font-bold shadow-2xs'
                            : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                      >
                        <span>{subj}</span>
                        <span
                          className={`text-[10px] px-1 py-0.1 rounded-full ${
                            selectedSubjectFilter === subj
                              ? 'bg-on-primary/20 text-on-primary'
                              : 'bg-surface-container-high text-on-surface-variant'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setOnlyUnclearedFilter((prev) => !prev)}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    onlyUnclearedFilter
                      ? 'bg-error-container text-on-error-container font-bold ring-1 ring-error/30'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {onlyUnclearedFilter ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                  <span>只看待消灭</span>
                </button>
              </div>

              <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
                {mistakes.length === 0 ? (
                  <div className="py-12 text-center text-on-surface-variant space-y-2">
                    <span className="material-symbols-outlined text-4xl text-outline/60">
                      verified
                    </span>
                    <p className="text-xs font-semibold">
                      错题本干干净净，暂无待清账错题！
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAllMistakesModal(false);
                        setIsAddingMistake(true);
                      }}
                      className="px-4 py-1.5 rounded-full bg-primary text-on-primary text-xs font-bold cursor-pointer hover:bg-primary-container inline-flex items-center gap-1"
                    >
                      <span>+ 录入第一道错题</span>
                    </button>
                  </div>
                ) : filteredMistakes.length === 0 ? (
                  <div className="py-10 text-center text-on-surface-variant space-y-2">
                    <span className="material-symbols-outlined text-3xl text-outline/60">
                      filter_alt_off
                    </span>
                    <p className="text-xs font-semibold text-on-surface">
                      当前筛选条件下暂无错题
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSubjectFilter('全部');
                        setOnlyUnclearedFilter(false);
                      }}
                      className="text-xs text-primary font-bold hover:underline cursor-pointer"
                    >
                      重置学科与待消灭筛选
                    </button>
                  </div>
                ) : (
                  filteredMistakes.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-2xl bg-surface-container-lowest border border-[#EAE4DA] flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.badgeClass}`}
                          >
                            {m.sourceLabel}
                          </span>
                          <span className="text-xs font-bold text-on-surface truncate">
                            {m.title}
                          </span>
                          <span
                            className={`inline-flex items-center text-[10px] font-semibold ${m.reasonColorClass}`}
                          >
                            {m.reasonText}
                          </span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant mt-1 line-clamp-1">
                          {m.excerpt}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowAllMistakesModal(false);
                            setEditingMistake(m);
                          }}
                          className="px-2 py-1 rounded-full bg-surface-container hover:bg-primary-fixed/60 text-xs font-semibold text-on-surface-variant hover:text-primary flex items-center gap-0.5 cursor-pointer transition-colors"
                          title="修改此错题"
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            edit
                          </span>
                          <span>修改</span>
                        </button>

                        {/* Delete Button */}
                        {onDeleteMistake && (
                          <button
                            type="button"
                            onClick={() => onDeleteMistake(m.id)}
                            className="w-7 h-7 rounded-full hover:bg-error-container text-outline hover:text-error flex items-center justify-center cursor-pointer transition-colors"
                            title="删除该错题"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              delete
                            </span>
                          </button>
                        )}

                        {/* Clear / Restore Toggle */}
                        <button
                          type="button"
                          onClick={() => {
                            if (m.cleared) {
                              onRestoreMistake(m.id);
                            } else {
                              onClearMistake(m.id);
                            }
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${
                            m.cleared
                              ? 'bg-surface-container text-secondary'
                              : 'bg-secondary text-on-secondary'
                          }`}
                        >
                          {m.cleared ? '已销项 ✓' : '标记过关'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Edit or Add Mistake Modal */}
      <MistakeEditModal
        isOpen={isAddingMistake || Boolean(editingMistake)}
        gradeClass={gradeClass}
        initialMistake={editingMistake}
        customSubjects={customSubjects}
        onSave={(saved) => {
          if (editingMistake) {
            if (onUpdateMistake) onUpdateMistake(saved);
            onShowToast(`已修改错题「${saved.title}」✓`);
          } else {
            if (onAddMistake) onAddMistake(saved);
            onShowToast(`已录入新错题「${saved.title}」✓`);
          }
          setEditingMistake(null);
          setIsAddingMistake(false);
        }}
        onDelete={(id) => {
          if (onDeleteMistake) onDeleteMistake(id);
          setEditingMistake(null);
          setIsAddingMistake(false);
        }}
        onClose={() => {
          setEditingMistake(null);
          setIsAddingMistake(false);
        }}
      />
    </div>
  );
};
