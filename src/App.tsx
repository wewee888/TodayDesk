import React, { useCallback, useState } from 'react';
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
  calculateDeskSummary,
  clearMistakeItem,
  getSubjectBadgeClass,
  resolveReviewStatus,
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

export default function App() {
  // Welcome Login / Registration screen state (supports ?autostart=1 to jump straight to desk)
  const [currentUserProfile, setCurrentUserProfile] =
    useState<UserAccountProfile | null>(() => {
      if (
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('autostart') === '1'
      ) {
        return {
          account: 'lizihan',
          studentName: INITIAL_DESK_SETTINGS.studentName,
          gradeClass: INITIAL_DESK_SETTINGS.gradeClass,
          role: 'student',
          targetGoal: '稳步攻克数理压轴题 · 坚持每晚15分钟中考体育打卡',
        };
      }
      return null;
    });
  const [showWelcomeAuthScreen, setShowWelcomeAuthScreen] = useState<boolean>(
    () => {
      if (
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('autostart') === '1'
      ) {
        return false;
      }
      return true;
    }
  );

  const [activeView, setActiveView] = useState<'desk' | 'archive'>('desk');
  const [activeNavTab, setActiveNavTab] = useState<
    'today' | 'tasks' | 'notebook' | 'desk'
  >('today');

  // Desk settings (student name, Pomodoro duration, PE exam exercises, extracurricular hobbies)
  const [deskSettings, setDeskSettings] = useState<DeskSettings>(
    INITIAL_DESK_SETTINGS
  );
  const [isDeskSettingsOpen, setIsDeskSettingsOpen] = useState(false);
  const [isTimetableModalOpen, setIsTimetableModalOpen] = useState(false);

  // View 1 state: Yesterday review, routine schedules, today's homework tasks
  const [reviewItems, setReviewItems] =
    useState<ReviewItem[]>(INITIAL_REVIEW_ITEMS);
  const [reviewBannerDismissed, setReviewBannerDismissed] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleItem[]>(
    INITIAL_SCHEDULE_ITEMS
  );
  const [homeworkTasks, setHomeworkTasks] = useState<HomeworkTask[]>(
    INITIAL_HOMEWORK_TASKS
  );

  // View 2 state: Quick 3-second capsule sheet modal
  const [isQuickSheetOpen, setIsQuickSheetOpen] = useState(false);

  // View 3 state: Mistakes & Exam Archive
  const [mistakes, setMistakes] = useState<MistakeItem[]>(
    INITIAL_MISTAKE_ITEMS
  );
  const [examPeriod, setExamPeriod] = useState<ExamPeriod>('10月月考');
  const [examDataMap, setExamDataMap] =
    useState<Record<ExamPeriod, ExamScoreCard[]>>(EXAM_DATA_BY_PERIOD);

  // Modals: Voice/Camera, Weekly AI Report, Schedule Preset, Notifications
  const [voiceOrCameraMode, setVoiceOrCameraMode] = useState<
    'voice' | 'camera' | null
  >(null);
  const [isWeeklyReportOpen, setIsWeeklyReportOpen] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReportAI>(
    DEFAULT_WEEKLY_REPORT
  );
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Toast notification state
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((current) => (current === msg ? null : current));
    }, 2400);
  }, []);

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
            iconFallback: 'menu_book',
            cleared: false,
            ctaLabel: '已重做过关 ✓',
            ctaStyle: 'secondary',
            solutionDetail:
              '建议先遮住原先订正过程，独立重算一遍关键步骤，确认无误后点击「已重做过关 ✓」销项。',
          };
          setMistakes((prev) => [newMistake, ...prev]);
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
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  const handleAddSchedule = (item: ScheduleItem) => {
    setSchedules((prev) => [item, ...prev]);
    showToast(`已新增固定日程：${item.title} (${item.timeText})`);
  };

  const handleUpdateSchedule = (updated: ScheduleItem) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
    showToast(`已更新日程：${updated.title} (${updated.timeText}) ✓`);
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    showToast('已删除该固定日程');
  };

  // Sync teacher/student leave or pause status between DeskSettingsModal and RoutineScheduleCarousel
  const handleSyncActivityAttendance = (
    activityName: string,
    attendanceStatus: AttendanceStatus,
    leaveNote?: string
  ) => {
    setSchedules((prev) =>
      prev.map((s) =>
        s.title.includes(activityName) || activityName.includes(s.title)
          ? { ...s, attendanceStatus, leaveNote }
          : s
      )
    );
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

  const handleUpdateCustomSubjects = (nextCustomSubjects: SubjectName[]) => {
    setDeskSettings((prev) => ({
      ...prev,
      customSubjects: nextCustomSubjects,
    }));
  };

  // Handlers for Today's Homework Tasks
  const handleToggleTaskComplete = (id: string) => {
    const target = homeworkTasks.find((t) => t.id === id);
    if (target && !target.completed) {
      showToast(`攻克一项：${target.subject}！干得漂亮 ✨`);
    }
    setHomeworkTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleSelectDuration = (id: string, minutes: number) => {
    setHomeworkTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, estimatedMinutes: minutes } : t))
    );
    showToast(`已修改耗时为 ${minutes} 分钟`);
  };

  const handleUpdateTask = (updated: HomeworkTask) => {
    setHomeworkTasks((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
    showToast(
      `已更新任务：${updated.subject} · ${updated.taskType} (${updated.estimatedMinutes}m) ✓`
    );
  };

  const handleDeleteTask = (id: string) => {
    setHomeworkTasks((prev) => prev.filter((t) => t.id !== id));
    showToast('已移除该项待办任务');
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
      setHomeworkTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, completedPomodoros: (t.completedPomodoros ?? 0) + 1 }
            : t
        )
      );
    },
    [homeworkTasks, deskSettings.pomodoroMinutes, showToast]
  );

  const handleAddTaskFromCapsule = (
    subject: SubjectName,
    taskType: string,
    minutes: number,
    customTitle?: string
  ) => {
    const newTask: HomeworkTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      subject,
      subjectBadgeClass: getSubjectBadgeClass(subject),
      taskType,
      title: customTitle || `${subject} · ${taskType}专项`,
      estimatedMinutes: minutes,
      completed: false,
      completedPomodoros: 0,
    };
    setHomeworkTasks((prev) => [newTask, ...prev]);
    showToast(`已加入今日书桌：${subject} · ${taskType} (${minutes}m) ✨`);
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
    }));
    setHomeworkTasks((prev) => [...created, ...prev]);
    setActiveView('desk');
    showToast(`已自动识别并生成 ${created.length} 项今日待办 🎯`);
  };

  // Handlers for Mistakes & Exam Scores
  const handleClearMistake = (id: string) => {
    const res = clearMistakeItem(mistakes, id);
    setMistakes(res.updatedMistakes);
  };

  const handleRestoreMistake = (id: string) => {
    setMistakes((prev) =>
      prev.map((m) => (m.id === id ? { ...m, cleared: false } : m))
    );
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
        return { ...prev, [period]: scores.cards };
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
      return { ...prev, [period]: updatedList };
    });
  };

  const handleRefreshAIWeeklyReport = async () => {
    setIsGeneratingReport(true);
    try {
      const summary = calculateDeskSummary(homeworkTasks);
      const remainingMistakes = mistakes.filter((m) => !m.cleared).length;
      const res = await fetch('/api/ai/weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: `${deskSettings.studentName} · ${deskSettings.gradeClass}`,
          totalMinutes: summary.totalMinutes,
          completedCount: summary.completedCount,
          totalCount: summary.totalCount,
          remainingMistakes,
          examPeriod,
          examScores: examDataMap[examPeriod],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.report) {
          setWeeklyReport(data.report);
          showToast('AI 家庭学情周报已更新 ✨');
        }
      }
    } catch {
      showToast('已生成最新周末清账单');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const deskSummary = calculateDeskSummary(homeworkTasks);
  const remainingMistakesCount = mistakes.filter((m) => !m.cleared).length;

  const handleAuthenticated = (
    profile: UserAccountProfile,
    isNewRegistration: boolean
  ) => {
    setCurrentUserProfile(profile);
    setDeskSettings((prev) => ({
      ...prev,
      studentName: profile.studentName,
      gradeClass: profile.gradeClass,
    }));
    setShowWelcomeAuthScreen(false);
    showToast(
      isNewRegistration
        ? `注册成功！欢迎来到「${profile.studentName}」的专属伴学书桌 ✨`
        : `欢迎回来，${profile.studentName}（${
            profile.role === 'parent' ? '家长伴学' : '学生书桌'
          }）✨`
    );
  };

  const handleApplyTimetableResult = (
    result: TimetableRecognitionResult,
    syncToExamSubjects: boolean,
    generateTodayPreviewTasks: boolean
  ) => {
    // 1. Merge detected subjects into deskSettings.customSubjects
    setDeskSettings((prev) => {
      const merged = Array.from(
        new Set([
          ...(prev.customSubjects || []),
          ...result.detectedSubjects.filter(
            (s) =>
              ![
                '语文',
                '数学',
                '英语',
                '物理',
                '化学',
                '历史',
                '体育锻炼',
                '课余兴趣',
                '自主自习',
              ].includes(s)
          ),
        ])
      );
      return {
        ...prev,
        customSubjects: merged,
      };
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
              icon: 'menu_book',
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

          {/* Zone 2: Clean Single-Line Nav Links on Desktop */}
          <nav
            aria-label="主导航"
            className="hidden md:flex items-center gap-5 text-sm font-medium text-on-surface-variant"
          >
            <button
              type="button"
              onClick={() => {
                setActiveView('desk');
                setActiveNavTab('today');
              }}
              className={`hover:text-on-surface transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'desk'
                  ? 'text-primary font-semibold underline underline-offset-4'
                  : ''
              }`}
            >
              今日书桌
            </button>
            <button
              type="button"
              onClick={() => setIsQuickSheetOpen(true)}
              className="hover:text-on-surface transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              3秒免打字快记
            </button>
            <button
              type="button"
              onClick={() => setIsTimetableModalOpen(true)}
              className="hover:text-primary transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1 text-secondary font-semibold"
            >
              <span className="material-symbols-outlined text-[16px]">
                calendar_view_week
              </span>
              <span>导课表识学科</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('archive');
                setActiveNavTab('notebook');
              }}
              className={`hover:text-on-surface transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'archive'
                  ? 'text-primary font-semibold underline underline-offset-4'
                  : ''
              }`}
            >
              成长档案与清账
            </button>
            <button
              type="button"
              onClick={() => setIsDeskSettingsOpen(true)}
              className="hover:text-on-surface transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              体育与课余设置
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
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative">
              <button
                type="button"
                aria-label="消息通知"
                onClick={() => setShowNotifications((prev) => !prev)}
                className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
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
                      AI 家庭学情周报已生成 10 月月考复盘
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
              className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary-container/60 text-on-secondary-container hover:bg-secondary-container transition-colors cursor-pointer"
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
              className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
              title="体育与课余活动后台设置"
            >
              <span className="material-symbols-outlined text-[19px]">
                tune
              </span>
            </button>

            <button
              type="button"
              aria-label="家庭学情周报"
              onClick={() => setIsWeeklyReportOpen(true)}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-xs cursor-pointer hover:bg-primary-container transition-colors"
              title="查看 AI 家庭学情周报"
            >
              <span className="material-symbols-outlined text-on-primary text-[17px]">
                analytics
              </span>
            </button>

            <button
              type="button"
              aria-label="切换账号或打开登录注册欢迎页"
              onClick={() => setShowWelcomeAuthScreen(true)}
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
      <main className="flex-1 w-full max-w-6xl mx-auto px-5 pt-4 pb-36">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Primary Column (7 cols on Desktop, Full width on Mobile) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {/* Student Meta Header & Segmented View Switcher */}
            <div className="flex flex-col space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[20px] leading-[28px] font-bold text-on-surface tracking-tight">
                    周三 · 10月18日
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary-container/60 text-on-secondary-container text-[11px] font-semibold">
                    第 7 教学周
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-on-surface-variant font-semibold">
                    {deskSettings.gradeClass} · {deskSettings.studentName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsTimetableModalOpen(true)}
                    className="px-2.5 py-0.5 rounded-full bg-primary-fixed/60 hover:bg-primary-fixed text-primary text-[11px] font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      calendar_view_week
                    </span>
                    <span>导课表识学科</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDeskSettingsOpen(true)}
                    className="text-xs font-semibold text-tertiary hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <span>设置体育/课余</span>
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
                {/* 1. Conditional Top Review Banner (昨日作业小复盘) */}
                <YesterdayReviewBanner
                  items={reviewItems}
                  isDismissed={reviewBannerDismissed}
                  onResolveItem={handleResolveReview}
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
                  pomodoroMinutes={deskSettings.pomodoroMinutes}
                  customSubjects={deskSettings.customSubjects}
                  onToggleTaskComplete={handleToggleTaskComplete}
                  onSelectDuration={handleSelectDuration}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onPomodoroComplete={handlePomodoroComplete}
                  onShowToast={showToast}
                />
              </div>
            ) : (
              <InsightsArchiveView
                tasks={homeworkTasks}
                mistakes={mistakes}
                onClearMistake={handleClearMistake}
                onRestoreMistake={handleRestoreMistake}
                examPeriod={examPeriod}
                onSelectExamPeriod={setExamPeriod}
                examScores={
                  examDataMap[examPeriod] || examDataMap['10月月考']
                }
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

      {/* Floating Action Dock (全能悬浮岛 - 今日书桌专属) */}
      {activeView === 'desk' && (
        <div className="fixed bottom-16 lg:bottom-4 left-0 right-0 px-2 sm:px-5 z-30 pointer-events-none">
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
        className="fixed bottom-0 left-0 right-0 w-full z-30 pb-safe pointer-events-none lg:hidden"
      >
        <div className="max-w-md w-full mx-auto px-2 sm:px-5 pb-2 pt-1">
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
              <span>Today</span>
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
              <span>Tasks</span>
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
              <span>Archive</span>
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
              <span>Desk</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Slide-up View 2 Modal: 3秒免打字快记面板 */}
      <QuickCapsuleSheet
        isOpen={isQuickSheetOpen}
        onClose={() => setIsQuickSheetOpen(false)}
        onAddTask={handleAddTaskFromCapsule}
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
      />

      {/* Desk Backend Settings Modal (PE Exam Exercises & Extracurricular Hobbies) */}
      <DeskSettingsModal
        isOpen={isDeskSettingsOpen}
        onClose={() => setIsDeskSettingsOpen(false)}
        settings={deskSettings}
        onUpdateSettings={setDeskSettings}
        onQuickAddExtracurricularTask={(subject, activityName, minutes, title) =>
          handleAddTaskFromCapsule(subject, activityName, minutes, title)
        }
        onAddExtracurricularSchedule={handleAddSchedule}
        onSyncActivityAttendance={handleSyncActivityAttendance}
        onRenameSubject={handleRenameSubject}
        onShowToast={showToast}
      />

      {/* Timetable Image / File Import & Semester Subject Recognition Modal */}
      <TimetableImportModal
        isOpen={isTimetableModalOpen}
        onClose={() => setIsTimetableModalOpen(false)}
        onApplyTimetableResult={handleApplyTimetableResult}
        onShowToast={showToast}
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
        report={weeklyReport}
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
    </div>
  );
}
