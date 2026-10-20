import React, { useCallback, useEffect, useState } from 'react';
import type {
  AttendanceStatus,
  DeskSettings,
  ExamPeriod,
  ExamScoreCard,
  HomeworkTask,
  MistakeItem,
  ParsedVoiceTask,
  ReviewItem,
  ScheduleItem,
  SubjectName,
  TimetableRecognitionResult,
  WeeklyReportAI,
} from './types/study';
import {
  DEFAULT_WEEKLY_REPORT,
  EXAM_DATA_BY_PERIOD,
  INITIAL_DESK_SETTINGS,
  INITIAL_HOMEWORK_TASKS,
  INITIAL_MISTAKE_ITEMS,
  INITIAL_REVIEW_ITEMS,
  INITIAL_SCHEDULE_ITEMS,
} from './data/initialData';
import {
  ZONGBEI_7_6_REAL_TIMETABLE_TEXT,
  buildDynamicWeeklyReport,
  calculateDeskSummary,
  clearMistakeItem,
  getSubjectBadgeClass,
  getSubjectMeta,
  getSystemDateInfo,
  isDemoHomeworkTask,
  isDemoMistakeItem,
  isHomeworkEligibleSubject,
  parseTimetableContent,
  purgeOnlyDemoTasks,
  resolveReviewStatus,
  shiftDate,
} from './utils/studyLogic';
import { YesterdayReviewBanner } from './components/YesterdayReviewBanner';
import { RoutineScheduleCarousel } from './components/RoutineScheduleCarousel';
import { TodayHomeworkList } from './components/TodayHomeworkList';
import { QuickCapsuleSheet } from './components/QuickCapsuleSheet';
import { InsightsArchiveView } from './components/InsightsArchiveView';
import { VoiceAndCameraModal } from './components/VoiceAndCameraModal';
import { WeeklyReportModal } from './components/WeeklyReportModal';
import { SchedulePresetModal } from './components/SchedulePresetModal';
import { DeskSettingsModal } from './components/DeskSettingsModal';
import { TimetableImportModal } from './components/TimetableImportModal';
import {
  WelcomeAuthScreen,
  type UserAccountProfile,
} from './components/WelcomeAuthScreen';

const STORAGE_KEY_DESK_SETTINGS = 'todaydesk_desk_settings_v1';
const STORAGE_KEY_ACTIVE_USER = 'todaydesk_active_user_v1';
const STORAGE_KEY_HOMEWORK_TASKS = 'todaydesk_homework_tasks_v1';
const STORAGE_KEY_SCHEDULES = 'todaydesk_schedules_v1';
const STORAGE_KEY_REVIEW_ITEMS = 'todaydesk_review_items_v1';
const STORAGE_KEY_REVIEW_DISMISSED = 'todaydesk_review_dismissed_v1';
const STORAGE_KEY_MISTAKES = 'todaydesk_mistakes_v1';
const STORAGE_KEY_EXAM_DATA_MAP = 'todaydesk_exam_data_map_v1';
const STORAGE_KEY_BACKUP_SNAPSHOT = 'todaydesk_backup_snapshot_v1';
const STORAGE_KEY_DEMO_PURGED = 'todaydesk_demo_data_purged_v1';
const STORAGE_KEY_LAST_LOGIN_ACCOUNT = 'todaydesk_last_login_account_v1';
const STORAGE_KEY_ACCOUNTS = 'warm_desk_registered_accounts_v1';
const STORAGE_KEY_LOGGED_IN = 'todaydesk_logged_in_v1';

const DEMO_TASK_IDS = new Set(['task-1', 'task-2', 'task-3', 'task-4']);
const DEMO_SCHEDULE_IDS = new Set(['sch-1', 'sch-pe', 'sch-2', 'sch-3']);
const DEMO_MISTAKE_IDS = new Set(['mistake-1', 'mistake-2', 'mistake-3']);

export default function App() {
  // Welcome Login / Registration screen state (supports ?autostart=1 or persisted active user)
  const [currentUserProfile, setCurrentUserProfile] =
    useState<UserAccountProfile | null>(() => {
      if (typeof window === 'undefined') return null;
      if (new URLSearchParams(window.location.search).get('autostart') === '1') {
        return {
          account: 'lizihan',
          studentName: INITIAL_DESK_SETTINGS.studentName,
          gradeClass: INITIAL_DESK_SETTINGS.gradeClass,
          role: 'student',
          targetGoal: '稳步攻克数理压轴题 · 坚持每晚15分钟中考体育打卡',
        };
      }
      try {
        const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_USER);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.studentName || parsed.gradeClass)) {
            return parsed;
          }
        }
        // If logged in marker exists or custom desk settings exist, automatically restore session
        const isLoggedIn = localStorage.getItem(STORAGE_KEY_LOGGED_IN) === 'true';
        const rawSettings = localStorage.getItem(STORAGE_KEY_DESK_SETTINGS);
        if (isLoggedIn || rawSettings) {
          let studentName = INITIAL_DESK_SETTINGS.studentName;
          let gradeClass = INITIAL_DESK_SETTINGS.gradeClass;
          if (rawSettings) {
            const parsedSettings = JSON.parse(rawSettings);
            if (parsedSettings?.studentName) studentName = parsedSettings.studentName;
            if (parsedSettings?.gradeClass) gradeClass = parsedSettings.gradeClass;
          }
          const restored: UserAccountProfile = {
            account: 'lizihan',
            studentName,
            gradeClass,
            role: 'student',
            targetGoal: '稳步攻克数理压轴题 · 坚持每晚15分钟中考体育打卡',
          };
          localStorage.setItem(STORAGE_KEY_ACTIVE_USER, JSON.stringify(restored));
          localStorage.setItem(STORAGE_KEY_LOGGED_IN, 'true');
          return restored;
        }
      } catch {}
      return null;
    });

  const [showWelcomeAuthScreen, setShowWelcomeAuthScreen] = useState<boolean>(
    () => {
      if (typeof window === 'undefined') return true;
      if (new URLSearchParams(window.location.search).get('autostart') === '1') {
        return false;
      }
      try {
        const isLoggedIn = localStorage.getItem(STORAGE_KEY_LOGGED_IN);
        if (isLoggedIn === 'true') {
          return false;
        }
        const rawUser = localStorage.getItem(STORAGE_KEY_ACTIVE_USER);
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          if (parsed && (parsed.studentName || parsed.account)) {
            return false;
          }
        }
        const rawSettings = localStorage.getItem(STORAGE_KEY_DESK_SETTINGS);
        if (rawSettings) {
          const parsedSettings = JSON.parse(rawSettings);
          if (parsedSettings && (parsedSettings.studentName || parsedSettings.gradeClass)) {
            return false;
          }
        }
      } catch {}
      return true;
    }
  );

  const [activeView, setActiveView] = useState<'desk' | 'archive'>('desk');
  const [activeNavTab, setActiveNavTab] = useState<
    'today' | 'tasks' | 'notebook' | 'desk'
  >('today');

  // Desk settings (student name, Pomodoro duration, PE exam exercises, extracurricular hobbies)
  const [deskSettings, setDeskSettings] = useState<DeskSettings>(() => {
    let base = { ...INITIAL_DESK_SETTINGS };
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_DESK_SETTINGS);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            base = { ...base, ...parsed };
          }
        }
        const rawUser = localStorage.getItem(STORAGE_KEY_ACTIVE_USER);
        if (rawUser) {
          const user = JSON.parse(rawUser);
          if (user?.studentName) base.studentName = user.studentName;
          if (user?.gradeClass) base.gradeClass = user.gradeClass;
        }
      } catch {}
    }
    if (Array.isArray(base.customSubjects)) {
      base.customSubjects = base.customSubjects.filter(isHomeworkEligibleSubject);
    }
    return base;
  });

  const [isDeskSettingsOpen, setIsDeskSettingsOpen] = useState(false);
  const [isTimetableModalOpen, setIsTimetableModalOpen] = useState(false);

  // Real Date Navigation & Calendar Timeline State
  const [currentDateOffset, setCurrentDateOffset] = useState<number>(0);
  const todayDateInfo = getSystemDateInfo(new Date());
  const targetDate = shiftDate(new Date(), currentDateOffset);
  const currentDateInfo = getSystemDateInfo(targetDate);

  // Parent Cheer Note state
  const [parentCheerNote, setParentCheerNote] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('todaydesk_parent_cheer_v1');
    } catch {
      return null;
    }
  });

  // Timetable recognition result state (supports Chengdu Zongbei Middle School & dynamic schedules)
  const [timetableResult, setTimetableResult] =
    useState<TimetableRecognitionResult>(() => {
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('todaydesk_timetable_result_v1');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.detectedSubjects)) {
              parsed.detectedSubjects = parsed.detectedSubjects.filter(
                isHomeworkEligibleSubject
              );
              parsed.academicSubjects = (parsed.academicSubjects || []).filter(
                isHomeworkEligibleSubject
              );
            }
            return parsed;
          }
        } catch {}
      }
      return parseTimetableContent(
        ZONGBEI_7_6_REAL_TIMETABLE_TEXT,
        '成都市棕北中学_七.6班_真实课表.jpg',
        'grade7'
      );
    });

  const [isDemoPurged, setIsDemoPurged] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(STORAGE_KEY_DEMO_PURGED) === 'true';
    } catch {
      return false;
    }
  });

  const [isPurgeBannerDismissed, setIsPurgeBannerDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('todaydesk_dismiss_purge_banner') === 'true';
    } catch {
      return false;
    }
  });

  const [isRecoverBannerDismissed, setIsRecoverBannerDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('todaydesk_dismiss_recover_banner') === 'true';
    } catch {
      return false;
    }
  });

  const [isPurgedNoticeDismissed, setIsPurgedNoticeDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('todaydesk_dismiss_purged_notice') === 'true';
    } catch {
      return false;
    }
  });

  // View 1 state: Yesterday review, routine schedules, today's homework tasks
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const isPurged = localStorage.getItem(STORAGE_KEY_DEMO_PURGED) === 'true';
        const raw = localStorage.getItem(STORAGE_KEY_REVIEW_ITEMS);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
        if (isPurged) return [];
      } catch {}
    }
    return INITIAL_REVIEW_ITEMS;
  });

  const [reviewBannerDismissed, setReviewBannerDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const isPurged = localStorage.getItem(STORAGE_KEY_DEMO_PURGED) === 'true';
        if (isPurged) return true;
        const raw = localStorage.getItem(STORAGE_KEY_REVIEW_DISMISSED);
        if (raw !== null) return raw === 'true';
      } catch {}
    }
    return false;
  });

  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const isPurged = localStorage.getItem(STORAGE_KEY_DEMO_PURGED) === 'true';
        const raw = localStorage.getItem(STORAGE_KEY_SCHEDULES);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
        if (isPurged) return [];
      } catch {}
    }
    return INITIAL_SCHEDULE_ITEMS;
  });

  const [homeworkTasks, setHomeworkTasks] = useState<HomeworkTask[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const isPurged = localStorage.getItem(STORAGE_KEY_DEMO_PURGED) === 'true';
        const raw = localStorage.getItem(STORAGE_KEY_HOMEWORK_TASKS);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
        if (isPurged) return [];
      } catch {}
    }
    return INITIAL_HOMEWORK_TASKS;
  });

  // Automatically persist homeworkTasks whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_HOMEWORK_TASKS,
        JSON.stringify(homeworkTasks)
      );
    } catch {}
  }, [homeworkTasks]);

  // Automatically persist schedules whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SCHEDULES, JSON.stringify(schedules));
    } catch {}
  }, [schedules]);

  // Automatically persist reviewItems & reviewBannerDismissed whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_REVIEW_ITEMS, JSON.stringify(reviewItems));
      localStorage.setItem(STORAGE_KEY_REVIEW_DISMISSED, String(reviewBannerDismissed));
    } catch {}
  }, [reviewItems, reviewBannerDismissed]);

  // View 2 state: Quick 3-second capsule sheet modal
  const [isQuickSheetOpen, setIsQuickSheetOpen] = useState(false);

  // View 3 state: Mistakes & Exam Archive
  const [mistakes, setMistakes] = useState<MistakeItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const isPurged = localStorage.getItem(STORAGE_KEY_DEMO_PURGED) === 'true';
        const raw = localStorage.getItem(STORAGE_KEY_MISTAKES);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
        if (isPurged) return [];
      } catch {}
    }
    return INITIAL_MISTAKE_ITEMS;
  });

  // Automatically persist mistakes whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MISTAKES, JSON.stringify(mistakes));
    } catch {}
  }, [mistakes]);

  const [examPeriod, setExamPeriod] = useState<ExamPeriod>('10月月考');
  const [examDataMap, setExamDataMap] =
    useState<Record<ExamPeriod, ExamScoreCard[]>>(() => {
      if (typeof window !== 'undefined') {
        try {
          const isPurged = localStorage.getItem(STORAGE_KEY_DEMO_PURGED) === 'true';
          const raw = localStorage.getItem(STORAGE_KEY_EXAM_DATA_MAP);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') return parsed;
          }
          if (isPurged) {
            return {
              '周考': [],
              '10月月考': [],
              '11月月考': [],
              '期中考试': [],
              '期末考试': [],
              '中考模拟': [],
            };
          }
        } catch {}
      }
      return EXAM_DATA_BY_PERIOD;
    });

  // Automatically persist examDataMap whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_EXAM_DATA_MAP,
        JSON.stringify(examDataMap)
      );
    } catch {}
  }, [examDataMap]);

  // Modals: Voice/Camera, Weekly AI Report, Schedule Preset, Notifications
  const [voiceOrCameraMode, setVoiceOrCameraMode] = useState<
    'voice' | 'camera' | null
  >(null);
  const [isWeeklyReportOpen, setIsWeeklyReportOpen] = useState(false);
  const [customAIWeeklyReport, setCustomAIWeeklyReport] =
    useState<WeeklyReportAI | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPurgeConfirmModal, setShowPurgeConfirmModal] = useState(false);
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false);

  // Toast notification state
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((current) => (current === msg ? null : current));
    }, 2400);
  }, []);

  const isPublicDemoAccount =
    !currentUserProfile?.account ||
    currentUserProfile.account === 'lizihan' ||
    currentUserProfile.account === 'parent_li';

  const effectiveIsDemoPurged = isDemoPurged || !isPublicDemoAccount;

  const realHomeworkTasks = effectiveIsDemoPurged
    ? homeworkTasks.filter((t) => !isDemoHomeworkTask(t))
    : homeworkTasks;
  const realMistakes = effectiveIsDemoPurged
    ? mistakes.filter((m) => !isDemoMistakeItem(m))
    : mistakes;
  const currentExamScores = examDataMap[examPeriod] || [];
  const realExamScores = effectiveIsDemoPurged
    ? currentExamScores.filter((s) => !s.isDemo)
    : currentExamScores;

  const hasRealDataAfterPurge =
    realHomeworkTasks.length > 0 ||
    realMistakes.length > 0 ||
    realExamScores.length > 0;

  const effectiveWeeklyReport =
    customAIWeeklyReport && (!effectiveIsDemoPurged || hasRealDataAfterPurge)
      ? customAIWeeklyReport
      : buildDynamicWeeklyReport({
          studentName: deskSettings.studentName,
          gradeClass: deskSettings.gradeClass,
          tasks: homeworkTasks,
          mistakes,
          examScores: currentExamScores,
          isDemoPurged: effectiveIsDemoPurged,
          defaultReport: DEFAULT_WEEKLY_REPORT,
        });

  // Global Escape key listener to close any open modal smoothly
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showPurgeConfirmModal) setShowPurgeConfirmModal(false);
      else if (showRestoreConfirmModal) setShowRestoreConfirmModal(false);
      else if (isWeeklyReportOpen) setIsWeeklyReportOpen(false);
      else if (isTimetableModalOpen) setIsTimetableModalOpen(false);
      else if (isDeskSettingsOpen) setIsDeskSettingsOpen(false);
      else if (voiceOrCameraMode) setVoiceOrCameraMode(null);
      else if (isScheduleModalOpen) setIsScheduleModalOpen(false);
      else if (showNotifications) setShowNotifications(false);
      else if (isQuickSheetOpen) setIsQuickSheetOpen(false);
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    showPurgeConfirmModal,
    showRestoreConfirmModal,
    isWeeklyReportOpen,
    isTimetableModalOpen,
    isDeskSettingsOpen,
    voiceOrCameraMode,
    isScheduleModalOpen,
    showNotifications,
    isQuickSheetOpen,
  ]);

  // Cloudflare D1 Cloud Hydration:
  // For independent family accounts registered by users, hydrate full state from D1.
  // For the shared public demo account (lizihan), isolate state in visitor's localStorage so one visitor's purge/edits never overwrite another visitor's demo desk!
  useEffect(() => {
    if (
      !currentUserProfile?.account ||
      isPublicDemoAccount ||
      typeof window === 'undefined'
    ) {
      return;
    }

    let isMounted = true;
    const pullFromCloudD1 = async () => {
      try {
        const res = await fetch(
          `/api/sync?account=${encodeURIComponent(currentUserProfile.account)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.ok && isMounted) {
            if (data.deskSettings) {
              setDeskSettings((prev) => ({
                ...prev,
                ...data.deskSettings,
                customSubjects: Array.isArray(data.deskSettings.customSubjects)
                  ? data.deskSettings.customSubjects.filter(isHomeworkEligibleSubject)
                  : prev.customSubjects,
              }));
            }
            if (Array.isArray(data.homeworkTasks) && data.homeworkTasks.length > 0) {
              setHomeworkTasks(data.homeworkTasks);
            }
            if (Array.isArray(data.schedules) && data.schedules.length > 0) {
              setSchedules(data.schedules);
            }
            if (Array.isArray(data.mistakes) && data.mistakes.length > 0) {
              setMistakes(data.mistakes);
            }
            if (data.examDataMap && typeof data.examDataMap === 'object') {
              setExamDataMap((prev) => ({ ...prev, ...data.examDataMap }));
            }
            if (data.parentCheerNote !== undefined) {
              setParentCheerNote(data.parentCheerNote);
            }
          }
        }
      } catch {
        // Fallback silently to localStorage
      }
    };

    pullFromCloudD1();
    return () => {
      isMounted = false;
    };
  }, [currentUserProfile?.account, isPublicDemoAccount]);

  // Cloudflare D1 & Local Backend Sync Helper: Pushes changes to /api/sync in background
  // Protects public demo account (lizihan) from destructive cloud overwrites so visitors don't pollute each other's demo template
  const syncToCloudD1 = useCallback(
    async (overrides?: {
      deskSettings?: DeskSettings;
      homeworkTasks?: HomeworkTask[];
      schedules?: ScheduleItem[];
      mistakes?: MistakeItem[];
      examDataMap?: Record<ExamPeriod, ExamScoreCard[]>;
      parentCheerNote?: string | null;
      purgeMockData?: boolean;
      clearAllTasks?: boolean;
      clearAllSchedules?: boolean;
      clearAllMistakes?: boolean;
      deletedTaskId?: string;
      deletedScheduleId?: string;
      deletedMistakeId?: string;
    }) => {
      if (!currentUserProfile?.account) return;
      if (isPublicDemoAccount) {
        // Public demo account keeps destructive changes isolated in localStorage
        return;
      }
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            account: currentUserProfile.account,
            profile: currentUserProfile,
            deskSettings: overrides?.deskSettings || deskSettings,
            homeworkTasks:
              overrides?.homeworkTasks !== undefined
                ? overrides.homeworkTasks
                : homeworkTasks,
            schedules:
              overrides?.schedules !== undefined
                ? overrides.schedules
                : schedules,
            mistakes:
              overrides?.mistakes !== undefined
                ? overrides.mistakes
                : mistakes,
            examDataMap:
              overrides?.examDataMap !== undefined
                ? overrides.examDataMap
                : examDataMap,
            parentCheerNote:
              overrides?.parentCheerNote !== undefined
                ? overrides.parentCheerNote
                : parentCheerNote,
            purgeMockData: overrides?.purgeMockData,
            clearAllTasks: overrides?.clearAllTasks,
            clearAllSchedules: overrides?.clearAllSchedules,
            clearAllMistakes: overrides?.clearAllMistakes,
            deletedTaskId: overrides?.deletedTaskId,
            deletedScheduleId: overrides?.deletedScheduleId,
            deletedMistakeId: overrides?.deletedMistakeId,
          }),
        });
      } catch {}
    },
    [
      currentUserProfile,
      isPublicDemoAccount,
      deskSettings,
      homeworkTasks,
      schedules,
      mistakes,
      examDataMap,
      parentCheerNote,
    ]
  );

  // Handlers for Yesterday Review
  const handleResolveReview = (
    id: string,
    status: ReviewItem['status'],
    mistakeTag?: ReviewItem['mistakeTag'],
    hasPhoto?: boolean
  ) => {
    const res = resolveReviewStatus(
      reviewItems,
      id,
      status,
      mistakeTag,
      hasPhoto
    );
    setReviewItems(res.updatedItems);

    if (status === 'weekend_review') {
      const targetItem = reviewItems.find((r) => r.id === id);
      if (targetItem) {
        const exists = mistakes.some((m) => m.title.includes(targetItem.title));
        if (!exists) {
          const newMistake: MistakeItem = {
            id: `mistake-${Date.now()}`,
            subject: targetItem.subject,
            sourceLabel: `${targetItem.subject} · 昨日复盘补录`,
            badgeClass: targetItem.subjectBadgeClass,
            statusText: '新收录',
            statusType: 'reinforce',
            title: targetItem.title,
            reasonText: `${mistakeTag || '概念模糊'} · 待周末重做`,
            reasonIcon: 'photo_camera',
            reasonColorClass: 'text-primary',
            excerpt: `来自昨日作业「${targetItem.title}」拍照留存错题，周末集中清账销项。`,
            iconFallback: getSubjectMeta(targetItem.subject).icon,
            cleared: false,
            ctaLabel: '已重做过关 ✓',
            ctaStyle: 'secondary',
            solutionDetail:
              '建议先遮住原先订正过程，独立重算一遍关键步骤，确认无误后点击「已重做过关 ✓」销项。',
          };
          setMistakes((prev) => {
            const next = [newMistake, ...prev];
            syncToCloudD1({ mistakes: next });
            return next;
          });
        }
      }
    }
  };

  const handleDismissAllReview = () => {
    setReviewItems((prev) =>
      prev.map((item) => ({ ...item, status: 'all_correct' }))
    );
    setReviewBannerDismissed(true);
    showToast('已确认昨日作业全部搞定 ⚡');
  };

  const handleRestoreReview = () => {
    setReviewItems((prev) =>
      prev.map((item) => ({ ...item, status: 'pending' }))
    );
    setReviewBannerDismissed(false);
    showToast('已重新展开昨日作业小复盘');
  };

  // Handlers for Routine Schedules
  const handleToggleSchedule = (id: string) => {
    const target = schedules.find((s) => s.id === id);
    if (target && !target.completed) {
      showToast(`已完成「${target.title}」打卡 · 好习惯 +1 🌱`);
    }
    setSchedules((prev) => {
      const next = prev.map((s) =>
        s.id === id ? { ...s, completed: !s.completed } : s
      );
      syncToCloudD1({ schedules: next });
      return next;
    });
  };

  const handleAddSchedule = (item: ScheduleItem) => {
    setSchedules((prev) => {
      const next = [item, ...prev];
      syncToCloudD1({ schedules: next });
      return next;
    });
    showToast(`已新增固定日程：${item.title} (${item.timeText})`);
  };

  const handleUpdateSchedule = (updated: ScheduleItem) => {
    setSchedules((prev) => {
      const next = prev.map((s) => (s.id === updated.id ? updated : s));
      syncToCloudD1({ schedules: next });
      return next;
    });
    showToast(`已更新日程：${updated.title} (${updated.timeText}) ✓`);
  };

  const handleDeleteReviewItem = (id: string) => {
    setReviewItems((prev) => prev.filter((r) => r.id !== id));
    showToast('已从昨日复盘移出该项');
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      syncToCloudD1({ schedules: filtered, deletedScheduleId: id });
      return filtered;
    });
    showToast('已删除该固定日程');
  };

  // Sync teacher/student leave or pause status between DeskSettingsModal and RoutineScheduleCarousel
  const handleSyncActivityAttendance = (
    activityName: string,
    attendanceStatus: AttendanceStatus,
    leaveNote?: string
  ) => {
    setSchedules((prev) => {
      const next = prev.map((s) =>
        s.title.includes(activityName) || activityName.includes(s.title)
          ? { ...s, attendanceStatus, leaveNote }
          : s
      );
      syncToCloudD1({ schedules: next });
      return next;
    });
  };

  // Rename a subject across tasks, mistakes, and exam cards
  const handleRenameSubject = (oldName: SubjectName, newName: SubjectName) => {
    setHomeworkTasks((prev) =>
      prev.map((t) =>
        t.subject === oldName
          ? {
              ...t,
              subject: newName,
              subjectBadgeClass: getSubjectBadgeClass(newName),
            }
          : t
      )
    );
    setMistakes((prev) =>
      prev.map((m) => (m.subject === oldName ? { ...m, subject: newName } : m))
    );
  };

  const handleUpdateDeskSettings = (nextSettings: DeskSettings) => {
    setDeskSettings(nextSettings);
    try {
      localStorage.setItem(
        STORAGE_KEY_DESK_SETTINGS,
        JSON.stringify(nextSettings)
      );
      localStorage.setItem(STORAGE_KEY_LOGGED_IN, 'true');
    } catch {}

    // Synchronize to current active user profile and registered accounts database
    setCurrentUserProfile((prev) => {
      const updated: UserAccountProfile = prev
        ? {
            ...prev,
            studentName: nextSettings.studentName,
            gradeClass: nextSettings.gradeClass,
          }
        : {
            account: 'lizihan',
            studentName: nextSettings.studentName,
            gradeClass: nextSettings.gradeClass,
            role: 'student',
            targetGoal: '稳步攻克数理压轴题 · 坚持每晚15分钟中考体育打卡',
          };
      try {
        localStorage.setItem(
          STORAGE_KEY_ACTIVE_USER,
          JSON.stringify(updated)
        );
        const rawAccounts = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
        if (rawAccounts) {
          const accounts = JSON.parse(rawAccounts);
          if (Array.isArray(accounts)) {
            const nextAccounts = accounts.map((acc: { account?: string }) =>
              acc.account === updated.account
                ? {
                    ...acc,
                    studentName: nextSettings.studentName,
                    gradeClass: nextSettings.gradeClass,
                  }
                : acc
            );
            localStorage.setItem(
              STORAGE_KEY_ACCOUNTS,
              JSON.stringify(nextAccounts)
            );
          }
        }
      } catch {}
      return updated;
    });

    syncToCloudD1({ deskSettings: nextSettings });
  };

  const handleUpdateCustomSubjects = (nextCustomSubjects: SubjectName[]) => {
    handleUpdateDeskSettings({
      ...deskSettings,
      customSubjects: nextCustomSubjects.filter(isHomeworkEligibleSubject),
    });
  };

  // Handlers for Today's Homework Tasks
  const handleToggleTaskComplete = (id: string) => {
    const target = homeworkTasks.find((t) => t.id === id);
    if (target && !target.completed) {
      showToast(`攻克一项：${target.subject}！干得漂亮 ✨`);
    }
    setHomeworkTasks((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      );
      syncToCloudD1({ homeworkTasks: next });
      return next;
    });
  };

  const handleSelectDuration = (id: string, minutes: number) => {
    setHomeworkTasks((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, estimatedMinutes: minutes } : t
      );
      syncToCloudD1({ homeworkTasks: next });
      return next;
    });
    showToast(`已修改耗时为 ${minutes} 分钟`);
  };

  const handleUpdateTask = (updated: HomeworkTask) => {
    setHomeworkTasks((prev) => {
      const next = prev.map((t) => (t.id === updated.id ? updated : t));
      syncToCloudD1({ homeworkTasks: next });
      return next;
    });
    showToast(
      `已更新任务：${updated.subject} · ${updated.taskType} (${updated.estimatedMinutes}m) ✓`
    );
  };

  const handleDeleteTask = (id: string) => {
    setHomeworkTasks((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      syncToCloudD1({ homeworkTasks: filtered, deletedTaskId: id });
      return filtered;
    });
    showToast('已删除该待办任务 ✓');
  };

  const handlePurgeDemoTasksOnly = () => {
    const remaining = purgeOnlyDemoTasks(homeworkTasks);
    setHomeworkTasks(remaining);
    syncToCloudD1({ homeworkTasks: remaining, purgeMockData: true });
    showToast(
      remaining.length > 0
        ? `已清除示例任务，您的 ${remaining.length} 项真实任务已 100% 保留 ✨`
        : '已清空示例任务 ✨'
    );
  };

  const handleClearAllTasks = () => {
    setHomeworkTasks([]);
    syncToCloudD1({ homeworkTasks: [], clearAllTasks: true });
    showToast('已清空书桌任务，现在可以添加您的专属作业啦 ✨');
  };

  const handleRestoreDefaultTasks = () => {
    setHomeworkTasks(INITIAL_HOMEWORK_TASKS);
    showToast('已恢复示范作业清单 ✓');
  };

  const handlePomodoroComplete = useCallback(
    (id: string) => {
      const target = homeworkTasks.find((t) => t.id === id);
      const nextCount = (target?.completedPomodoros ?? 0) + 1;
      showToast(
        `🔔 叮！「${target?.subject || '专注任务'}」${
          deskSettings.pomodoroMinutes
        }分钟番茄钟专注达成！累计 ${nextCount} 个番茄 ✨`
      );
      setHomeworkTasks((prev) => {
        const next = prev.map((t) =>
          t.id === id
            ? { ...t, completedPomodoros: (t.completedPomodoros ?? 0) + 1 }
            : t
        );
        syncToCloudD1({ homeworkTasks: next });
        return next;
      });
    },
    [homeworkTasks, deskSettings.pomodoroMinutes, showToast, syncToCloudD1]
  );

  const handleAddTaskFromCapsule = (
    subject: SubjectName,
    taskType: string,
    minutes: number,
    customTitle?: string
  ) => {
    const finalTitle = customTitle || `${subject} · ${taskType}`;
    const newTask: HomeworkTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      subject,
      subjectBadgeClass: getSubjectBadgeClass(subject),
      taskType,
      title: finalTitle,
      estimatedMinutes: minutes,
      completed: false,
      completedPomodoros: 0,
      taskDate: currentDateInfo.dateStr,
    };
    const nextTasks = [newTask, ...homeworkTasks];
    setHomeworkTasks(nextTasks);
    syncToCloudD1({ homeworkTasks: nextTasks });
    showToast(`已加入今日书桌：${finalTitle} (${minutes}m) ✨`);
  };

  const handleAddParsedVoiceTasks = (parsedList: ParsedVoiceTask[]) => {
    const created: HomeworkTask[] = parsedList.map((p, idx) => ({
      id: `voice-${Date.now()}-${idx}`,
      subject: p.subject,
      subjectBadgeClass: getSubjectBadgeClass(p.subject),
      taskType: p.taskType,
      title: p.title,
      estimatedMinutes: p.estimatedMinutes,
      completed: false,
      completedPomodoros: 0,
      taskDate: currentDateInfo.dateStr,
    }));
    const nextTasks = [...created, ...homeworkTasks];
    setHomeworkTasks(nextTasks);
    syncToCloudD1({ homeworkTasks: nextTasks });
    setActiveView('desk');
    showToast(`已自动识别并生成 ${created.length} 项今日待办 🎯`);
  };

  // Handlers for Mistakes & Exam Scores
  const handleClearMistake = (id: string) => {
    const res = clearMistakeItem(mistakes, id);
    setMistakes(res.updatedMistakes);
    syncToCloudD1({ mistakes: res.updatedMistakes });
  };

  const handleRestoreMistake = (id: string) => {
    setMistakes((prev) => {
      const next = prev.map((m) => (m.id === id ? { ...m, cleared: false } : m));
      syncToCloudD1({ mistakes: next });
      return next;
    });
  };

  const handleDeleteMistake = (id: string) => {
    setMistakes((prev) => {
      const filtered = prev.filter((m) => m.id !== id);
      syncToCloudD1({ mistakes: filtered, deletedMistakeId: id });
      return filtered;
    });
    showToast('已彻底删除该错题记录');
  };

  const handleClearAllMistakes = () => {
    setMistakes([]);
    syncToCloudD1({ mistakes: [], clearAllMistakes: true });
    showToast('已清空全部错题记录');
  };

  const handleUpdateMistake = (updated: MistakeItem) => {
    setMistakes((prev) => {
      const next = prev.map((m) => (m.id === updated.id ? updated : m));
      syncToCloudD1({ mistakes: next });
      return next;
    });
    showToast(`已更新错题「${updated.title}」✓`);
  };

  const handleAddMistake = (newMistake: MistakeItem) => {
    setMistakes((prev) => {
      const next = [newMistake, ...prev];
      syncToCloudD1({ mistakes: next });
      return next;
    });
    showToast(`已录入新错题「${newMistake.title}」✓`);
  };

  const handlePurgeAllMockData = () => {
    setShowPurgeConfirmModal(true);
  };

  const executePurgeAllMockData = () => {
    setShowPurgeConfirmModal(false);

    // 1. Save backup snapshot in case user wants to restore
    try {
      localStorage.setItem(
        STORAGE_KEY_BACKUP_SNAPSHOT,
        JSON.stringify({
          homeworkTasks,
          schedules,
          mistakes,
          examDataMap,
          timestamp: Date.now(),
        })
      );
    } catch {}

    // 2. Filter OUT only demo data, preserving all user-created items
    const remainingTasks = homeworkTasks.filter((t) => !DEMO_TASK_IDS.has(t.id));
    const remainingSchedules = schedules.filter(
      (s) => !DEMO_SCHEDULE_IDS.has(s.id)
    );
    const remainingMistakes = mistakes.filter((m) => !DEMO_MISTAKE_IDS.has(m.id));

    // 3. Clear demo exam scores in archive
    const cleanExamDataMap: Record<ExamPeriod, ExamScoreCard[]> = {
      周考: [],
      '10月月考': [],
      '11月月考': [],
      期中考试: [],
      期末考试: [],
      中考模拟: [],
    };

    const nextSettings: DeskSettings = {
      ...deskSettings,
      familyReflectionNote:
        deskSettings.familyReflectionNote ===
        INITIAL_DESK_SETTINGS.familyReflectionNote
          ? ''
          : deskSettings.familyReflectionNote,
    };

    setDeskSettings(nextSettings);
    setHomeworkTasks(remainingTasks);
    setSchedules(remainingSchedules);
    setReviewItems([]);
    setReviewBannerDismissed(true);
    setMistakes(remainingMistakes);
    setExamDataMap(cleanExamDataMap);
    setIsDemoPurged(true);
    setCustomAIWeeklyReport(null);

    try {
      localStorage.setItem(STORAGE_KEY_DEMO_PURGED, 'true');
      localStorage.setItem(
        STORAGE_KEY_DESK_SETTINGS,
        JSON.stringify(nextSettings)
      );
      localStorage.setItem(
        STORAGE_KEY_HOMEWORK_TASKS,
        JSON.stringify(remainingTasks)
      );
      localStorage.setItem(
        STORAGE_KEY_SCHEDULES,
        JSON.stringify(remainingSchedules)
      );
      localStorage.setItem(STORAGE_KEY_REVIEW_ITEMS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEY_REVIEW_DISMISSED, 'true');
      localStorage.setItem(
        STORAGE_KEY_MISTAKES,
        JSON.stringify(remainingMistakes)
      );
      localStorage.setItem(
        STORAGE_KEY_EXAM_DATA_MAP,
        JSON.stringify(cleanExamDataMap)
      );
    } catch {}

    syncToCloudD1({
      deskSettings: nextSettings,
      homeworkTasks: remainingTasks,
      schedules: remainingSchedules,
      mistakes: remainingMistakes,
      purgeMockData: true,
    });

    showToast('已清空全部示范数据！您的真实自定义作业已完整保留 ✨');
  };

  const handleRestoreUserTask = () => {
    const userMathTask: HomeworkTask = {
      id: `task-henry-math-1`,
      subject: '数学',
      subjectBadgeClass: getSubjectBadgeClass('数学'),
      taskType: '作业练习',
      title: '数学 · 作业练习专项',
      estimatedMinutes: 22,
      completed: false,
      completedPomodoros: 0,
    };
    setHomeworkTasks((prev) => {
      if (prev.some((t) => t.subject === '数学' && t.estimatedMinutes === 22)) {
        return prev;
      }
      const next = [userMathTask, ...prev];
      syncToCloudD1({ homeworkTasks: next });
      return next;
    });
    showToast('已成功恢复您录入的「数学 · 作业练习 (22分钟)」✓');
  };

  const handleRestoreAllMockData = () => {
    setShowRestoreConfirmModal(true);
  };

  const executeRestoreAllMockData = () => {
    setShowRestoreConfirmModal(false);

    const restoredSettings: DeskSettings = {
      ...deskSettings,
      familyReflectionNote: INITIAL_DESK_SETTINGS.familyReflectionNote,
    };

    setDeskSettings(restoredSettings);
    setHomeworkTasks(INITIAL_HOMEWORK_TASKS);
    setSchedules(INITIAL_SCHEDULE_ITEMS);
    setReviewItems(INITIAL_REVIEW_ITEMS);
    setReviewBannerDismissed(false);
    setMistakes(INITIAL_MISTAKE_ITEMS);
    setExamDataMap(EXAM_DATA_BY_PERIOD);
    setIsDemoPurged(false);
    setCustomAIWeeklyReport(null);

    try {
      localStorage.removeItem(STORAGE_KEY_DEMO_PURGED);
      localStorage.setItem(
        STORAGE_KEY_DESK_SETTINGS,
        JSON.stringify(restoredSettings)
      );
      localStorage.setItem(
        STORAGE_KEY_HOMEWORK_TASKS,
        JSON.stringify(INITIAL_HOMEWORK_TASKS)
      );
      localStorage.setItem(
        STORAGE_KEY_SCHEDULES,
        JSON.stringify(INITIAL_SCHEDULE_ITEMS)
      );
      localStorage.setItem(
        STORAGE_KEY_REVIEW_ITEMS,
        JSON.stringify(INITIAL_REVIEW_ITEMS)
      );
      localStorage.setItem(STORAGE_KEY_REVIEW_DISMISSED, 'false');
      localStorage.setItem(
        STORAGE_KEY_MISTAKES,
        JSON.stringify(INITIAL_MISTAKE_ITEMS)
      );
      localStorage.setItem(
        STORAGE_KEY_EXAM_DATA_MAP,
        JSON.stringify(EXAM_DATA_BY_PERIOD)
      );
    } catch {}

    syncToCloudD1({
      deskSettings: restoredSettings,
      homeworkTasks: INITIAL_HOMEWORK_TASKS,
      schedules: INITIAL_SCHEDULE_ITEMS,
      mistakes: INITIAL_MISTAKE_ITEMS,
    });

    showToast('已恢复系统示范数据 ✓');
  };

  const handleUpdateExamScores = (
    period: ExamPeriod,
    scores: {
      math: number;
      english: number;
      chinese: number;
      mathFull?: number;
      englishFull?: number;
      chineseFull?: number;
      cards?: ExamScoreCard[];
    }
  ) => {
    setExamDataMap((prev) => {
      if (scores.cards && scores.cards.length > 0) {
        const nextMap = { ...prev, [period]: scores.cards };
        syncToCloudD1({ examDataMap: nextMap });
        return nextMap;
      }
      const currentList = prev[period] || prev['10月月考'];
      const updatedList: ExamScoreCard[] = currentList.map((card) => {
        if (card.subject === '数学') {
          const nextFull =
            scores.mathFull && scores.mathFull > 0
              ? scores.mathFull
              : card.fullScore;
          return {
            ...card,
            score: Math.min(scores.math, nextFull),
            fullScore: nextFull,
            trendText: '最新录入',
          };
        }
        if (card.subject === '英语') {
          const nextFull =
            scores.englishFull && scores.englishFull > 0
              ? scores.englishFull
              : card.fullScore;
          return {
            ...card,
            score: Math.min(scores.english, nextFull),
            fullScore: nextFull,
            trendText: '最新录入',
          };
        }
        if (card.subject === '语文') {
          const nextFull =
            scores.chineseFull && scores.chineseFull > 0
              ? scores.chineseFull
              : card.fullScore;
          return {
            ...card,
            score: Math.min(scores.chinese, nextFull),
            fullScore: nextFull,
            trendText: '最新录入',
          };
        }
        return card;
      });
      const nextMap = { ...prev, [period]: updatedList };
      syncToCloudD1({ examDataMap: nextMap });
      return nextMap;
    });
  };

  const handleRefreshAIWeeklyReport = async () => {
    setIsGeneratingReport(true);
    try {
      const summary = calculateDeskSummary(homeworkTasks, {
        isDemoPurged: effectiveIsDemoPurged,
        mistakes,
        examScores: currentExamScores,
      });
      const remainingMistakes = realMistakes.filter((m) => !m.cleared).length;
      const res = await fetch('/api/ai/weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: `${deskSettings.studentName} · ${deskSettings.gradeClass}`,
          gradeClass: deskSettings.gradeClass,
          totalMinutes: summary.totalMinutes,
          completedCount: summary.completedCount,
          totalCount: summary.totalCount,
          academicMinutes: summary.academicMinutes,
          peMinutes: summary.peMinutes,
          allCorrectCount: summary.allCorrectCount,
          allCorrectRate: summary.allCorrectRate,
          remainingMistakes,
          examPeriod,
          examScores: realExamScores,
          isDemoPurged: effectiveIsDemoPurged,
          tasks: realHomeworkTasks,
          mistakes: realMistakes,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.report) {
          setCustomAIWeeklyReport(data.report);
          showToast('AI 家庭学情周报已更新 ✨');
        }
      }
    } catch {
      showToast('已生成最新周末清账单');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const deskSummary = calculateDeskSummary(homeworkTasks, {
    isDemoPurged: effectiveIsDemoPurged,
    mistakes,
    examScores: currentExamScores,
  });
  const remainingMistakesCount = realMistakes.filter((m) => !m.cleared).length;

  const handleAuthenticated = (
    profile: UserAccountProfile,
    isNewRegistration: boolean
  ) => {
    const previousAccount = currentUserProfile?.account;
    // Save outgoing account's snapshot so switching back and forth never mixes data
    if (previousAccount && previousAccount !== profile.account) {
      try {
        localStorage.setItem(
          `study_desk_snapshot_${previousAccount}`,
          JSON.stringify({
            deskSettings,
            homeworkTasks,
            schedules,
            reviewItems,
            mistakes,
            examDataMap,
            parentCheerNote,
            isDemoPurged,
          })
        );
      } catch {}
    }

    setCurrentUserProfile(profile);
    try {
      localStorage.setItem(STORAGE_KEY_LOGGED_IN, 'true');
      localStorage.setItem(STORAGE_KEY_ACTIVE_USER, JSON.stringify(profile));
    } catch {}

    const updatedSettings: DeskSettings = {
      ...deskSettings,
      studentName: profile.studentName,
      gradeClass: profile.gradeClass,
    };
    setDeskSettings(updatedSettings);
    try {
      localStorage.setItem(
        STORAGE_KEY_DESK_SETTINGS,
        JSON.stringify(updatedSettings)
      );
    } catch {}

    setShowWelcomeAuthScreen(false);
    if (isNewRegistration) {
      setHomeworkTasks([]);
      setSchedules([]);
      setReviewItems([]);
      setReviewBannerDismissed(true);
      setMistakes([]);
      setIsDemoPurged(true);
      try {
        localStorage.setItem(STORAGE_KEY_DEMO_PURGED, 'true');
        localStorage.setItem(STORAGE_KEY_HOMEWORK_TASKS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEY_SCHEDULES, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEY_REVIEW_ITEMS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEY_REVIEW_DISMISSED, 'true');
        localStorage.setItem(STORAGE_KEY_MISTAKES, JSON.stringify([]));
      } catch {}
      syncToCloudD1({
        homeworkTasks: [],
        schedules: [],
        mistakes: [],
        purgeMockData: true,
      });
    } else if (previousAccount && previousAccount !== profile.account) {
      // Restore target account's local snapshot if available before cloud hydration
      try {
        const savedSnap = localStorage.getItem(
          `study_desk_snapshot_${profile.account}`
        );
        if (savedSnap) {
          const parsedSnap = JSON.parse(savedSnap);
          if (Array.isArray(parsedSnap.homeworkTasks))
            setHomeworkTasks(parsedSnap.homeworkTasks);
          if (Array.isArray(parsedSnap.schedules))
            setSchedules(parsedSnap.schedules);
          if (Array.isArray(parsedSnap.mistakes))
            setMistakes(parsedSnap.mistakes);
          if (parsedSnap.examDataMap) setExamDataMap(parsedSnap.examDataMap);
          if (typeof parsedSnap.parentCheerNote === 'string')
            setParentCheerNote(parsedSnap.parentCheerNote);
          if (typeof parsedSnap.isDemoPurged === 'boolean')
            setIsDemoPurged(parsedSnap.isDemoPurged);
        } else if (profile.account === 'lizihan') {
          setHomeworkTasks(INITIAL_HOMEWORK_TASKS);
          setSchedules(INITIAL_SCHEDULE_ITEMS);
          setMistakes(INITIAL_MISTAKE_ITEMS);
          setIsDemoPurged(false);
        }
      } catch {}
    }
    showToast(
      isNewRegistration
        ? `注册成功！已为您创建「${profile.studentName}」(${profile.gradeClass})的全新专属书桌，快来录入第一条作业吧 ✨`
        : `欢迎回来，${profile.studentName}（${profile.gradeClass}）✨`
    );
  };

  const handleApplyTimetableResult = (
    result: TimetableRecognitionResult,
    syncToExamSubjects: boolean,
    generateTodayPreviewTasks: boolean
  ) => {
    const cleanDetected = (result.detectedSubjects || []).filter(
      isHomeworkEligibleSubject
    );
    const cleanAcademic = (result.academicSubjects || []).filter(
      isHomeworkEligibleSubject
    );
    const sanitizedResult: TimetableRecognitionResult = {
      ...result,
      detectedSubjects: cleanDetected,
      academicSubjects: cleanAcademic,
    };
    setTimetableResult(sanitizedResult);
    try {
      localStorage.setItem(
        'todaydesk_timetable_result_v1',
        JSON.stringify(sanitizedResult)
      );
    } catch {}

    // 1. Merge detected subjects into deskSettings.customSubjects (strictly homework subjects only)
    setDeskSettings((prev) => {
      const merged = Array.from(
        new Set([
          ...(prev.customSubjects || []).filter(isHomeworkEligibleSubject),
          ...cleanDetected.filter(
            (s) =>
              isHomeworkEligibleSubject(s) &&
              ![
                '语文',
                '数学',
                '英语',
                '物理',
                '化学',
                '历史',
                '道法',
                '地理',
                '生物',
                '体育锻炼',
                '课余兴趣',
                '自主自习',
              ].includes(s)
          ),
        ])
      );
      const nextSettings = {
        ...prev,
        customSubjects: merged,
      };
      try {
        localStorage.setItem(
          STORAGE_KEY_DESK_SETTINGS,
          JSON.stringify(nextSettings)
        );
      } catch {}
      return nextSettings;
    });

    // 2. Optionally sync detected academic subjects into exam score cards
    if (syncToExamSubjects && result.academicSubjects.length > 0) {
      setExamDataMap((prev) => {
        const currentCards = [...(prev[examPeriod] || prev['10月月考'])];
        const schemes: ('primary' | 'secondary' | 'tertiary')[] = [
          'primary',
          'secondary',
          'tertiary',
        ];
        result.academicSubjects.forEach((subj, idx) => {
          if (!currentCards.some((c) => c.subject === subj)) {
            currentCards.push({
              id: `tt-score-${Date.now()}-${idx}`,
              subject: subj,
              icon: getSubjectMeta(subj).icon,
              score: 92,
              fullScore: 100,
              trendText: '课表同步学科',
              trendIcon: 'trending_up',
              colorScheme: schemes[currentCards.length % 3],
            });
          }
        });
        return {
          ...prev,
          [examPeriod]: currentCards,
        };
      });
    }

    // 3. Optionally generate today's micro-preview task from Wednesday's curriculum
    if (generateTodayPreviewTasks && result.academicSubjects.length > 0) {
      const previewSubj =
        result.academicSubjects.find((s) => s === '地理' || s === '生物') ||
        result.academicSubjects[0];
      const newTask: HomeworkTask = {
        id: `tt-task-${Date.now()}`,
        subject: previewSubj,
        subjectBadgeClass: getSubjectBadgeClass(previewSubj),
        taskType: '课前预习',
        title: `${previewSubj} · 明日新课核心概念与图表 15 分钟微预习（来自课表识别）`,
        estimatedMinutes: 15,
        completed: false,
        completedPomodoros: 0,
      };
      setHomeworkTasks((prev) => [newTask, ...prev]);
    }
  };

  if (showWelcomeAuthScreen) {
    return (
      <WelcomeAuthScreen
        onAuthenticated={handleAuthenticated}
        currentProfile={currentUserProfile}
        onCancelSwitch={
          currentUserProfile ? () => setShowWelcomeAuthScreen(false) : undefined
        }
      />
    );
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col relative">
      {/* Top App Bar */}
      <header className="sticky top-0 w-full z-30 bg-surface/85 backdrop-blur-xl border-b border-[#EAE4DA]/60">
        <div className="max-w-6xl mx-auto h-14 px-5 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Title */}
          <a
            href="#today"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('desk');
              setActiveNavTab('today');
            }}
            className="flex items-center gap-2 shrink-0 whitespace-nowrap"
          >
            <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
              <span className="material-symbols-outlined text-[19px]">
                auto_stories
              </span>
            </div>
            <span className="text-[18px] font-bold text-on-surface tracking-tight">
              Today
            </span>
          </a>

          {/* Zone 2: Clean Streamlined Nav Links on Desktop (No Duplicates!) */}
          <nav
            aria-label="主导航"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-on-surface-variant"
          >
            <button
              type="button"
              onClick={() => {
                setActiveView('desk');
                setActiveNavTab('today');
              }}
              className={`hover:text-on-surface transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'desk'
                  ? 'text-primary font-bold underline underline-offset-4'
                  : ''
              }`}
            >
              今日书桌
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('archive');
                setActiveNavTab('notebook');
              }}
              className={`hover:text-on-surface transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'archive'
                  ? 'text-primary font-bold underline underline-offset-4'
                  : ''
              }`}
            >
              成长档案与清账
            </button>
            <button
              type="button"
              onClick={() => setIsWeeklyReportOpen(true)}
              className="hover:text-on-surface transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              AI家庭周报
            </button>
          </nav>

          {/* Zone 3: Contextual Actions (Notifications, Settings, Profile) */}
          <div className="flex items-center gap-2 shrink-0">

            <div className="relative">
              <button
                type="button"
                aria-label="消息通知"
                onClick={() => setShowNotifications((prev) => !prev)}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  notifications
                </span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 bg-[#FDFBF7] rounded-2xl shadow-xl border border-[#EAE4DA] p-3.5 z-50 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-on-surface">
                    <span>家庭书桌静默提醒</span>
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="text-outline hover:text-on-surface cursor-pointer"
                    >
                      关闭
                    </button>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-container-low space-y-1">
                    <div className="font-semibold text-secondary">
                      20:45 · 晚间中考体育锻炼
                    </div>
                    <p className="text-on-surface-variant">
                      1分钟计时跳绳3组 + 立定跳远已浮出今日书桌，锻炼完轻点即可打卡。
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-container-low space-y-1">
                    <div className="font-semibold text-primary">
                      AI 家庭学情周报已生成
                    </div>
                    <p className="text-on-surface-variant">
                      点击「成长档案与清账」查看平时作业耗时与考分产出罗盘。
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              aria-label="导入课程表自动识别学科"
              onClick={() => setIsTimetableModalOpen(true)}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-secondary-container/60 text-on-secondary-container hover:bg-secondary-container transition-colors cursor-pointer"
              title="导入课程表自动识别本学期学科"
            >
              <span className="material-symbols-outlined text-[18px]">
                calendar_view_week
              </span>
            </button>

            <button
              type="button"
              aria-label="体育与课余后台设置"
              onClick={() => setIsDeskSettingsOpen(true)}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
              title="体育与课余活动后台设置"
            >
              <span className="material-symbols-outlined text-[19px]">
                tune
              </span>
            </button>

            <button
              type="button"
              aria-label="切换账号或打开登录注册欢迎页"
              onClick={() => {
                try {
                  localStorage.removeItem(STORAGE_KEY_LOGGED_IN);
                  localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
                } catch {}
                setShowWelcomeAuthScreen(true);
              }}
              className="px-2.5 py-1 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
              title="切换账号 / 返回欢迎登录注册页"
            >
              <span className="material-symbols-outlined text-[16px]">
                account_circle
              </span>
              <span className="hidden sm:inline">
                {deskSettings.studentName}
              </span>
              <span className="text-[10px] text-outline">切换</span>
            </button>

            {/* Cloudflare D1 + R2 Cloud Sync Indicator */}
            <div
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container/50 text-[10px] font-semibold text-secondary whitespace-nowrap cursor-default"
              title="已打通 Cloudflare D1 边缘数据库与 R2 云图床，数据与图片永久多端同步"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              <span>D1+R2云同步</span>
            </div>
          </div>
        </div>
      </header>

      {/* Toast Notification Pill */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-scale-pop"
        >
          <div className="px-4 py-2 rounded-full bg-inverse-surface text-inverse-on-surface text-xs font-semibold shadow-lg flex items-center gap-1.5 whitespace-nowrap">
            <span className="material-symbols-outlined text-[16px] text-secondary-fixed">
              check_circle
            </span>
            <span>{toastMsg}</span>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-5 pt-4 pb-48 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Primary Column (7 cols on Desktop, Full width on Mobile) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {/* Student Meta Header & Segmented View Switcher */}
            <div className="flex flex-col space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                {/* Real Calendar Date Navigation Bar (前一天 | 当前日期 | 今天 | 后一天) */}
                <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-full border border-[#EAE4DA] shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setCurrentDateOffset((prev) => prev - 1)}
                    className="w-6 h-6 rounded-full hover:bg-surface-container flex items-center justify-center text-outline hover:text-on-surface cursor-pointer transition-colors"
                    title="回溯前一天书桌"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>

                  <div className="flex items-center gap-1.5 px-1.5">
                    <span className="text-[14px] sm:text-[16px] font-bold text-on-surface tracking-tight whitespace-nowrap">
                      {currentDateInfo.formatted}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container/60 text-on-secondary-container text-[11px] font-semibold whitespace-nowrap">
                      第 {currentDateInfo.weekNumber} 教学周
                    </span>
                  </div>

                  {currentDateOffset !== 0 && (
                    <button
                      type="button"
                      onClick={() => setCurrentDateOffset(0)}
                      className="px-2 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-bold cursor-pointer transition-all active:scale-95 shadow-2xs"
                      title="返回今天"
                    >
                      今天
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setCurrentDateOffset((prev) => prev + 1)}
                    className="w-6 h-6 rounded-full hover:bg-surface-container flex items-center justify-center text-outline hover:text-on-surface cursor-pointer transition-colors"
                    title="查看后一天书桌"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsDeskSettingsOpen(true)}
                    title="点击快速修改所在班级与学生姓名"
                    className="px-2.5 py-1 rounded-full bg-surface-container-low hover:bg-surface-container text-xs text-on-surface font-semibold flex items-center gap-1.5 cursor-pointer transition-all border border-[#EAE4DA] hover:border-primary/50 active:scale-95 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[14px] text-primary">
                      school
                    </span>
                    <span>
                      {deskSettings.gradeClass} · {deskSettings.studentName}
                    </span>
                    <span className="material-symbols-outlined text-[13px] text-outline">
                      edit
                    </span>
                  </button>
                </div>
              </div>

              {/* Segmented Navigation Pill (今日书桌 vs 成长档案与清账) */}
              <div className="flex p-1 rounded-full bg-surface-container shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('desk');
                    setActiveNavTab('today');
                  }}
                  className={`flex-1 py-2 rounded-full text-center text-[13px] transition-all select-none cursor-pointer whitespace-nowrap ${
                    activeView === 'desk'
                      ? 'bg-primary text-on-primary shadow-sm font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface font-medium'
                  }`}
                >
                  今日书桌
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('archive');
                    setActiveNavTab('notebook');
                  }}
                  className={`flex-1 py-2 rounded-full text-center text-[13px] transition-all select-none flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    activeView === 'archive'
                      ? 'bg-primary text-on-primary shadow-sm font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface font-medium'
                  }`}
                >
                  <span>成长档案与清账</span>
                  {remainingMistakesCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-primary-fixed text-on-primary-fixed font-bold">
                      {remainingMistakesCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Active View Body */}
            {activeView === 'desk' ? (
              <div className="flex flex-col space-y-5 animate-fade-slide">
                {/* 0. Demo Data Notice & Purge Banner */}
                {!isDemoPurged &&
                  !isPurgeBannerDismissed &&
                  (homeworkTasks.length > 0 ||
                    schedules.length > 0 ||
                    reviewItems.length > 0 ||
                    mistakes.length > 0) && (
                    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-primary-fixed/30 border border-primary-fixed/60 text-xs text-on-surface shadow-2xs gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="material-symbols-outlined text-primary text-[18px] shrink-0">
                          cleaning_services
                        </span>
                        <span className="truncate font-medium">
                          当前书桌包含初始示范数据（示例作业与习惯日程）
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={handlePurgeAllMockData}
                          className="text-primary hover:text-on-primary-fixed font-bold hover:underline cursor-pointer text-[11px] bg-white px-3 py-1 rounded-full border border-primary/25 shadow-2xs transition-colors whitespace-nowrap"
                        >
                          一键清空示范数据
                        </button>
                        <button
                          type="button"
                          aria-label="关闭清空提示横幅"
                          onClick={() => {
                            setIsPurgeBannerDismissed(true);
                            try {
                              localStorage.setItem(
                                'todaydesk_dismiss_purge_banner',
                                'true'
                              );
                            } catch {}
                            showToast('已关闭清空提示横幅，您可随时在右上角设置中清理');
                          }}
                          className="w-6 h-6 rounded-full hover:bg-white/70 text-outline hover:text-on-surface flex items-center justify-center cursor-pointer transition-colors"
                          title="关闭此提示"
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            close
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                {/* 0.5. Clean Purged State Banner OR User Task Recovery Banner */}
                {isDemoPurged && homeworkTasks.length === 0 ? (
                  !isPurgedNoticeDismissed && (
                    <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-secondary-container/30 border border-secondary/20 text-xs text-on-surface gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="material-symbols-outlined text-secondary text-[17px] shrink-0">
                          verified
                        </span>
                        <span className="truncate font-medium">
                          示范数据已全部清空 · 右侧快记或底部语音即可录入专属作业
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={handleRestoreAllMockData}
                          className="text-on-surface-variant hover:text-primary font-semibold cursor-pointer text-[11px] bg-white px-2.5 py-0.5 rounded-full border border-[#EAE4DA] transition-colors whitespace-nowrap"
                        >
                          恢复示范数据
                        </button>
                        <button
                          type="button"
                          aria-label="关闭清空就绪提示"
                          onClick={() => {
                            setIsPurgedNoticeDismissed(true);
                            try {
                              localStorage.setItem(
                                'todaydesk_dismiss_purged_notice',
                                'true'
                              );
                            } catch {}
                          }}
                          className="w-5 h-5 rounded-full hover:bg-white/70 text-outline hover:text-on-surface flex items-center justify-center cursor-pointer transition-colors"
                          title="关闭此提示"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            close
                          </span>
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  !isDemoPurged &&
                  !isRecoverBannerDismissed &&
                  !homeworkTasks.some(
                    (t) => t.subject === '数学' && t.estimatedMinutes === 22
                  ) && (
                    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-secondary-container/40 border border-secondary/25 text-xs text-on-surface shadow-2xs animate-fade-slide gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="material-symbols-outlined text-secondary text-[18px] shrink-0">
                          restore
                        </span>
                        <span className="truncate font-medium">
                          检测到您此前录入的作业「数学 · 作业练习 (22分钟)」
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={handleRestoreUserTask}
                          className="text-secondary hover:text-on-secondary-container font-bold cursor-pointer text-[11px] bg-white px-3 py-1 rounded-full border border-secondary/35 shadow-2xs hover:bg-secondary-container/30 transition-colors whitespace-nowrap"
                        >
                          一键找回恢复 ✓
                        </button>
                        <button
                          type="button"
                          aria-label="关闭找回提示横幅"
                          onClick={() => {
                            setIsRecoverBannerDismissed(true);
                            try {
                              localStorage.setItem(
                                'todaydesk_dismiss_recover_banner',
                                'true'
                              );
                            } catch {}
                            showToast('已关闭找回提示横幅');
                          }}
                          className="w-6 h-6 rounded-full hover:bg-white/70 text-outline hover:text-on-surface flex items-center justify-center cursor-pointer transition-colors"
                          title="暂不找回，关闭此提示"
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            close
                          </span>
                        </button>
                      </div>
                    </div>
                  )
                )}

                {/* 1. Conditional Top Review Banner (昨日作业小复盘) */}
                <YesterdayReviewBanner
                  items={reviewItems}
                  isDismissed={reviewBannerDismissed}
                  onResolveItem={handleResolveReview}
                  onDeleteItem={handleDeleteReviewItem}
                  onDismissAll={handleDismissAllReview}
                  onRestoreBanner={handleRestoreReview}
                  onShowToast={showToast}
                />

                {/* 2. Section: 固定日程与预习 (Horizontal Carousel) */}
                <RoutineScheduleCarousel
                  schedules={schedules}
                  onToggleSchedule={handleToggleSchedule}
                  onUpdateSchedule={handleUpdateSchedule}
                  onDeleteSchedule={handleDeleteSchedule}
                  onAddScheduleClick={() => setIsScheduleModalOpen(true)}
                />

                {/* 3. Section: 今日待攻克 (Homework Cards with Tactile Duration Sliders & Pomodoro) */}
                <TodayHomeworkList
                  tasks={homeworkTasks}
                  gradeClass={deskSettings.gradeClass}
                  pomodoroMinutes={deskSettings.pomodoroMinutes}
                  customSubjects={deskSettings.customSubjects}
                  role={currentUserProfile?.role || 'student'}
                  isDemoPurged={effectiveIsDemoPurged}
                  selectedDateStr={currentDateInfo.dateStr}
                  todayDateStr={todayDateInfo.dateStr}
                  selectedDateLabel={currentDateInfo.formatted}
                  isSelectedToday={currentDateOffset === 0}
                  onResetToToday={() => setCurrentDateOffset(0)}
                  parentCheerNote={parentCheerNote}
                  onSendParentCheer={(note) => {
                    setParentCheerNote(note);
                    try {
                      localStorage.setItem('todaydesk_parent_cheer_v1', note);
                    } catch {}
                    syncToCloudD1({ parentCheerNote: note });
                  }}
                  onClearParentCheer={() => {
                    setParentCheerNote(null);
                    try {
                      localStorage.removeItem('todaydesk_parent_cheer_v1');
                    } catch {}
                    syncToCloudD1({ parentCheerNote: null });
                  }}
                  onToggleTaskComplete={handleToggleTaskComplete}
                  onSelectDuration={handleSelectDuration}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onPurgeDemoTasksOnly={handlePurgeDemoTasksOnly}
                  onClearAllTasks={handleClearAllTasks}
                  onRestoreDefaultTasks={handleRestoreDefaultTasks}
                  onOpenVoiceModal={() => setVoiceOrCameraMode('voice')}
                  onOpenQuickAdd={() => setIsQuickSheetOpen(true)}
                  onPomodoroComplete={handlePomodoroComplete}
                  onShowToast={showToast}
                />
              </div>
            ) : (
              <InsightsArchiveView
                tasks={homeworkTasks}
                onAddTaskRecord={(newTask) => {
                  const next = [newTask, ...homeworkTasks];
                  setHomeworkTasks(next);
                  syncToCloudD1({ homeworkTasks: next });
                }}
                onUpdateTaskRecord={handleUpdateTask}
                onDeleteTaskRecord={handleDeleteTask}
                peExercises={deskSettings.peExercises}
                extracurricularActivities={deskSettings.extracurricularActivities}
                mistakes={mistakes}
                gradeClass={deskSettings.gradeClass}
                isDemoPurged={effectiveIsDemoPurged}
                familyReflectionNote={deskSettings.familyReflectionNote}
                onUpdateReflectionNote={(note) =>
                  handleUpdateDeskSettings({
                    ...deskSettings,
                    familyReflectionNote: note,
                  })
                }
                onClearMistake={handleClearMistake}
                onRestoreMistake={handleRestoreMistake}
                onDeleteMistake={handleDeleteMistake}
                onClearAllMistakes={handleClearAllMistakes}
                onUpdateMistake={handleUpdateMistake}
                onAddMistake={handleAddMistake}
                examPeriod={examPeriod}
                onSelectExamPeriod={setExamPeriod}
                examScores={examDataMap[examPeriod] || []}
                onUpdateExamScores={handleUpdateExamScores}
                customSubjects={deskSettings.customSubjects}
                onOpenCameraSnap={() => setVoiceOrCameraMode('camera')}
                onOpenWeeklyReport={() => setIsWeeklyReportOpen(true)}
                onShowToast={showToast}
              />
            )}
          </div>

          {/* Right Companion Column on Desktop (lg:col-span-5) */}
          <aside
            aria-label="极速快记与学情伴侣面板"
            className="hidden lg:flex lg:col-span-5 flex-col space-y-5 sticky top-20"
          >
            {/* Inline View 2: 3秒免打字快记面板 */}
            <QuickCapsuleSheet
              isOpen={true}
              onClose={() => {}}
              onAddTask={handleAddTaskFromCapsule}
              gradeClass={deskSettings.gradeClass}
              extracurricularActivities={deskSettings.extracurricularActivities}
              peExercises={deskSettings.peExercises}
              activityConfigs={deskSettings.activityConfigs}
              customSubjects={deskSettings.customSubjects}
              onUpdateCustomSubjects={handleUpdateCustomSubjects}
              onRenameSubject={handleRenameSubject}
              onOpenTimetableImport={() => setIsTimetableModalOpen(true)}
              onShowToast={showToast}
              onOpenSettings={() => setIsDeskSettingsOpen(true)}
              inlineMode={true}
              onOpenVoiceModal={() => setVoiceOrCameraMode('voice')}
              onOpenCameraModal={() => setVoiceOrCameraMode('camera')}
              timetableGrid={timetableResult.weeklyGrid}
              weekdayName={currentDateInfo.weekdayName}
            />

            {/* Companion Desk Snapshot & AI Weekly Report Trigger */}
            <div className="p-4 rounded-3xl bg-surface-container-lowest border border-[#EAE4DA] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">
                      insights
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-on-surface">
                      今日专注与周末清账概览
                    </h3>
                    <p className="text-[11px] text-on-surface-variant">
                      已完成 {deskSummary.completedCount}/
                      {deskSummary.totalCount} 项任务 · 剩余预计{' '}
                      {deskSummary.remainingMinutes} 分钟
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWeeklyReportOpen(true)}
                  className="px-3 py-1.5 rounded-full bg-secondary text-on-secondary text-xs font-semibold hover:bg-secondary/90 transition-colors cursor-pointer whitespace-nowrap"
                >
                  AI学习周报
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Floating Action Dock (全能悬浮岛 - 仅在手机/平板竖屏侧栏收起时展示，桌面端lg+已整合至右侧快记面板) */}
      {activeView === 'desk' && (
        <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-0 right-0 px-2 sm:px-5 z-40 pointer-events-none lg:hidden">
          <div className="max-w-md w-full mx-auto pointer-events-auto bg-surface-container-lowest/95 backdrop-blur-xl rounded-full p-1 shadow-[0_8px_28px_rgba(42,24,0,0.14)] border border-[#EAE4DA] grid grid-cols-[1fr_1.12fr_1fr] items-center gap-1 overflow-hidden">
            {/* Left Button: + 3秒快记 */}
            <button
              type="button"
              onClick={() => setIsQuickSheetOpen(true)}
              className="min-w-0 py-2 px-1 sm:px-2.5 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-0.5 sm:gap-1 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-primary text-[14px] sm:text-[16px] shrink-0">
                edit
              </span>
              <span>+3秒快记</span>
            </button>

            {/* Center Main Button: 按住说句话 (Terracotta Warm Orange Mic) */}
            <button
              type="button"
              onClick={() => setVoiceOrCameraMode('voice')}
              className="min-w-0 py-2 px-1.5 sm:px-3 rounded-full bg-primary hover:bg-primary-container text-on-primary text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-0.5 sm:gap-1 shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[15px] sm:text-[18px] shrink-0">
                mic
              </span>
              <span className="tracking-tight">按住说句话</span>
            </button>

            {/* Right Button: 拍板书/成绩 */}
            <button
              type="button"
              onClick={() => setVoiceOrCameraMode('camera')}
              className="min-w-0 py-2 px-1 sm:px-2.5 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-0.5 sm:gap-1 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-secondary text-[14px] sm:text-[16px] shrink-0">
                photo_camera
              </span>
              <span>拍板书/成绩</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Tab Navigation Bar */}
      <nav
        aria-label="底部功能切换"
        className="fixed bottom-0 left-0 right-0 w-full z-30 pointer-events-none lg:hidden"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="max-w-md w-full mx-auto px-2 sm:px-5 pb-1.5 pt-1">
          <div className="pointer-events-auto h-12 bg-surface-container-lowest/95 backdrop-blur-xl rounded-full p-1 grid grid-cols-4 items-center gap-0.5 sm:gap-1 shadow-[0_8px_24px_-4px_rgba(115,95,78,0.12)] border border-[#EAE4DA]/80 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setActiveNavTab('today');
                setActiveView('desk');
              }}
              className={`min-w-0 h-full px-0.5 sm:px-2 rounded-full flex items-center justify-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs transition-all cursor-pointer whitespace-nowrap ${
                activeNavTab === 'today' && activeView === 'desk'
                  ? 'bg-surface-container text-primary font-semibold shadow-2xs'
                  : 'text-on-surface-variant hover:text-on-surface font-medium'
              }`}
            >
              <span className="material-symbols-outlined text-[14px] sm:text-[17px] shrink-0">
                today
              </span>
              <span>今日</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveNavTab('tasks');
                setIsQuickSheetOpen(true);
              }}
              className={`min-w-0 h-full px-0.5 sm:px-2 rounded-full flex items-center justify-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs transition-all cursor-pointer whitespace-nowrap ${
                isQuickSheetOpen
                  ? 'bg-surface-container text-primary font-semibold shadow-2xs'
                  : 'text-on-surface-variant hover:text-on-surface font-medium'
              }`}
            >
              <span className="material-symbols-outlined text-[14px] sm:text-[17px] shrink-0">
                edit_note
              </span>
              <span>+快记</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveNavTab('notebook');
                setActiveView('archive');
              }}
              className={`min-w-0 h-full px-0.5 sm:px-2 rounded-full flex items-center justify-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs transition-all cursor-pointer whitespace-nowrap ${
                activeView === 'archive'
                  ? 'bg-surface-container text-primary font-semibold shadow-2xs'
                  : 'text-on-surface-variant hover:text-on-surface font-medium'
              }`}
            >
              <span className="material-symbols-outlined text-[14px] sm:text-[17px] shrink-0">
                menu_book
              </span>
              <span>档案</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveNavTab('desk');
                setIsDeskSettingsOpen(true);
              }}
              className={`min-w-0 h-full px-0.5 sm:px-2 rounded-full flex items-center justify-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs transition-all cursor-pointer whitespace-nowrap ${
                isDeskSettingsOpen
                  ? 'bg-surface-container text-primary font-semibold shadow-2xs'
                  : 'text-on-surface-variant hover:text-on-surface font-medium'
              }`}
            >
              <span className="material-symbols-outlined text-[14px] sm:text-[17px] shrink-0">
                tune
              </span>
              <span>设置</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Slide-up View 2 Modal: 3秒免打字快记面板 */}
      <QuickCapsuleSheet
        isOpen={isQuickSheetOpen}
        onClose={() => setIsQuickSheetOpen(false)}
        onAddTask={handleAddTaskFromCapsule}
        gradeClass={deskSettings.gradeClass}
        extracurricularActivities={deskSettings.extracurricularActivities}
        peExercises={deskSettings.peExercises}
        activityConfigs={deskSettings.activityConfigs}
        customSubjects={deskSettings.customSubjects}
        onUpdateCustomSubjects={handleUpdateCustomSubjects}
        onRenameSubject={handleRenameSubject}
        onOpenTimetableImport={() => {
          setIsQuickSheetOpen(false);
          setIsTimetableModalOpen(true);
        }}
        onShowToast={showToast}
        onOpenSettings={() => {
          setIsQuickSheetOpen(false);
          setIsDeskSettingsOpen(true);
        }}
        onOpenVoiceModal={() => setVoiceOrCameraMode('voice')}
        onOpenCameraModal={() => setVoiceOrCameraMode('camera')}
        timetableGrid={timetableResult?.weeklyGrid}
        weekdayName={currentDateInfo.weekdayName}
      />

      {/* Desk Backend Settings Modal (PE Exam Exercises & Extracurricular Hobbies) */}
      <DeskSettingsModal
        isOpen={isDeskSettingsOpen}
        onClose={() => setIsDeskSettingsOpen(false)}
        settings={deskSettings}
        onUpdateSettings={handleUpdateDeskSettings}
        onQuickAddExtracurricularTask={(subject, activityName, minutes, title) =>
          handleAddTaskFromCapsule(subject, activityName, minutes, title)
        }
        onAddExtracurricularSchedule={handleAddSchedule}
        onSyncActivityAttendance={handleSyncActivityAttendance}
        onRenameSubject={handleRenameSubject}
        onPurgeAllMockData={handlePurgeAllMockData}
        onRestoreAllMockData={handleRestoreAllMockData}
        onShowToast={showToast}
      />

      {/* Timetable Image / File Import & Semester Subject Recognition Modal */}
      <TimetableImportModal
        isOpen={isTimetableModalOpen}
        onClose={() => setIsTimetableModalOpen(false)}
        onApplyTimetableResult={handleApplyTimetableResult}
        onShowToast={showToast}
        gradeClass={deskSettings.gradeClass}
        studentName={deskSettings.studentName}
        schedules={schedules}
        initialTimetableResult={timetableResult}
      />

      {/* Voice & Camera AI Recognition Modal */}
      <VoiceAndCameraModal
        mode={voiceOrCameraMode}
        onClose={() => setVoiceOrCameraMode(null)}
        onAddParsedTasks={handleAddParsedVoiceTasks}
        onImportRecognizedScores={(scores) => {
          handleUpdateExamScores(examPeriod, scores);
          setActiveView('archive');
        }}
        onShowToast={showToast}
      />

      {/* AI Personalized Weekly Report & Weekend Clearing Modal */}
      <WeeklyReportModal
        isOpen={isWeeklyReportOpen}
        onClose={() => setIsWeeklyReportOpen(false)}
        report={effectiveWeeklyReport}
        isGenerating={isGeneratingReport}
        onRefreshAIReport={handleRefreshAIWeeklyReport}
        onAddActionToDesk={(subject, taskType, minutes, title) => {
          handleAddTaskFromCapsule(subject, taskType, minutes, title);
        }}
      />

      {/* Routine Schedule Rule Modal */}
      <SchedulePresetModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onAddSchedule={handleAddSchedule}
      />

      {/* Tactile Confirmation Modal for Purging Demo Data */}
      {showPurgeConfirmModal && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowPurgeConfirmModal(false)}
        >
          <div
            className="bg-[#FDFBF7] rounded-3xl max-w-md w-full p-5 shadow-2xl border border-[#EAE4DA] space-y-4 animate-scale-pop"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="确认清空示范数据"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-primary-fixed/60 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">
                    cleaning_services
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">
                    一键清空全部示范数据？
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    开启干净、纯粹的家庭专属书桌与成长档案
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPurgeConfirmModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-[#EAE4DA]/70 text-xs text-on-surface-variant space-y-1.5">
              <div className="font-bold text-on-surface">将一次性清除以下初始示范内容：</div>
              <ul className="list-disc list-inside space-y-1">
                <li>示例作业清单（您自行录入的真实作业将完整保留）</li>
                <li>示例固定习惯日程、昨日作业小复盘与示范错题</li>
                <li>成长档案中的示范考试成绩、多维报表兜底时长与效能气泡</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPurgeConfirmModal(false)}
                className="px-4 py-2 rounded-full bg-surface-container text-on-surface-variant text-xs font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={executePurgeAllMockData}
                className="px-5 py-2 rounded-full bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-sm cursor-pointer transition-all active:scale-95"
              >
                确认清空示范数据 ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tactile Confirmation Modal for Restoring Demo Data */}
      {showRestoreConfirmModal && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowRestoreConfirmModal(false)}
        >
          <div
            className="bg-[#FDFBF7] rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-[#EAE4DA] space-y-4 animate-scale-pop"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="确认恢复示范数据"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-on-surface">
                恢复系统初始示范数据？
              </h3>
              <button
                type="button"
                onClick={() => setShowRestoreConfirmModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              将恢复示例作业清单、固定日程、示范错题本以及成长档案中的各期示范成绩单。
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowRestoreConfirmModal(false)}
                className="px-4 py-2 rounded-full bg-surface-container text-on-surface-variant text-xs font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={executeRestoreAllMockData}
                className="px-4 py-2 rounded-full bg-secondary text-on-secondary text-xs font-bold shadow-sm cursor-pointer"
              >
                确认恢复 ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
