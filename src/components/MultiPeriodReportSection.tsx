import React, { useState } from 'react';
import type {
  ExamScoreCard,
  HomeworkTask,
  MistakeItem,
  SubjectName,
} from '../types/study';
import { getDefaultSubjectsForGrade, getSubjectBadgeClass } from '../utils/studyLogic';
import { useDragScroll } from '../utils/useDragScroll';

export type TimeDimension = 'week' | 'month' | 'quarter' | 'year';

interface MultiPeriodReportSectionProps {
  tasks: HomeworkTask[];
  examScores: ExamScoreCard[];
  mistakes?: MistakeItem[];
  gradeClass?: string;
  isDemoPurged?: boolean;
  customSubjects?: SubjectName[];
  onShowToast: (msg: string) => void;
}

interface TrendBarPoint {
  label: string;
  studyMinutes: number;
  peMinutes: number;
  hobbyMinutes: number;
  allCorrectSubjCount: number;
  scoreRate: number;
}

interface SubjectReportRow {
  subject: SubjectName;
  category: 'academic' | 'pe' | 'hobby';
  homeworkMinutes: number;
  completedTasks: number;
  totalTasks: number;
  allCorrectTimes: number;
  allCorrectRate: number;
  scoreText: string;
  scorePercent: number;
  trendNote: string;
  statusBadge: string;
  statusColorClass: string;
}

const DIMENSION_META: Record<
  TimeDimension,
  {
    tabLabel: string;
    periodTitle: string;
    subtitle: string;
    multiplier: number;
    scoreDelta: string;
    clearedMistakes: number;
    pomodoroCount: number;
    trendPoints: TrendBarPoint[];
  }
> = {
  week: {
    tabLabel: '周视图',
    periodTitle: '第 7 教学周 · 周度作业、全对名单与成绩报表',
    subtitle:
      '周一至周日：学科作业耗时、老师公布全对名单次数、中考体育与课余兴趣独立计时',
    multiplier: 1,
    scoreDelta: '+3.2%',
    clearedMistakes: 8,
    pomodoroCount: 14,
    trendPoints: [
      {
        label: '周一',
        studyMinutes: 85,
        peMinutes: 15,
        hobbyMinutes: 0,
        allCorrectSubjCount: 3,
        scoreRate: 88,
      },
      {
        label: '周二',
        studyMinutes: 90,
        peMinutes: 15,
        hobbyMinutes: 30,
        allCorrectSubjCount: 4,
        scoreRate: 90,
      },
      {
        label: '周三',
        studyMinutes: 75,
        peMinutes: 15,
        hobbyMinutes: 0,
        allCorrectSubjCount: 3,
        scoreRate: 89,
      },
      {
        label: '周四',
        studyMinutes: 95,
        peMinutes: 15,
        hobbyMinutes: 30,
        allCorrectSubjCount: 4,
        scoreRate: 92,
      },
      {
        label: '周五',
        studyMinutes: 70,
        peMinutes: 15,
        hobbyMinutes: 45,
        allCorrectSubjCount: 5,
        scoreRate: 93,
      },
      {
        label: '周六',
        studyMinutes: 110,
        peMinutes: 20,
        hobbyMinutes: 60,
        allCorrectSubjCount: 4,
        scoreRate: 94,
      },
      {
        label: '周日',
        studyMinutes: 80,
        peMinutes: 15,
        hobbyMinutes: 60,
        allCorrectSubjCount: 5,
        scoreRate: 95,
      },
    ],
  },
  month: {
    tabLabel: '月视图',
    periodTitle: '10 月度 · 学科作业全对榜、体育/兴趣独立计时与月考报表',
    subtitle:
      '本月 4 个教学周累计学科作业时长、各科登上全对名单次数、体育与课余独立统计',
    multiplier: 4,
    scoreDelta: '+5.8%',
    clearedMistakes: 32,
    pomodoroCount: 58,
    trendPoints: [
      {
        label: '第1周',
        studyMinutes: 520,
        peMinutes: 95,
        hobbyMinutes: 180,
        allCorrectSubjCount: 22,
        scoreRate: 86,
      },
      {
        label: '第2周',
        studyMinutes: 560,
        peMinutes: 105,
        hobbyMinutes: 210,
        allCorrectSubjCount: 25,
        scoreRate: 89,
      },
      {
        label: '第3周',
        studyMinutes: 590,
        peMinutes: 110,
        hobbyMinutes: 195,
        allCorrectSubjCount: 27,
        scoreRate: 91,
      },
      {
        label: '第4周',
        studyMinutes: 605,
        peMinutes: 110,
        hobbyMinutes: 225,
        allCorrectSubjCount: 28,
        scoreRate: 94,
      },
    ],
  },
  quarter: {
    tabLabel: '季视图',
    periodTitle: '秋季学期季度 (9~11月) · 阶段作业全对率与成绩总览',
    subtitle:
      '跨月度作业时长、老师全对名单累计登榜、中考体育体能与课余特长独立统计',
    multiplier: 12,
    scoreDelta: '+8.4%',
    clearedMistakes: 96,
    pomodoroCount: 176,
    trendPoints: [
      {
        label: '9月(开学季)',
        studyMinutes: 2150,
        peMinutes: 400,
        hobbyMinutes: 720,
        allCorrectSubjCount: 92,
        scoreRate: 85,
      },
      {
        label: '10月(月考季)',
        studyMinutes: 2275,
        peMinutes: 420,
        hobbyMinutes: 810,
        allCorrectSubjCount: 102,
        scoreRate: 91,
      },
      {
        label: '11月(期中季)',
        studyMinutes: 2380,
        peMinutes: 450,
        hobbyMinutes: 840,
        allCorrectSubjCount: 112,
        scoreRate: 94,
      },
    ],
  },
  year: {
    tabLabel: '年视图',
    periodTitle: '2026 学年全景 · 年度作业全对榜、体育/特长与全科成绩总报表',
    subtitle:
      '全学年四季累计学业投入、全对名单荣誉记录、中考体育与课余特长分开核算档案',
    multiplier: 42,
    scoreDelta: '+12.6%',
    clearedMistakes: 340,
    pomodoroCount: 620,
    trendPoints: [
      {
        label: '春季学期初',
        studyMinutes: 6100,
        peMinutes: 1180,
        hobbyMinutes: 2160,
        allCorrectSubjCount: 275,
        scoreRate: 84,
      },
      {
        label: '暑假集训期',
        studyMinutes: 5400,
        peMinutes: 1350,
        hobbyMinutes: 2700,
        allCorrectSubjCount: 260,
        scoreRate: 88,
      },
      {
        label: '秋季期中段',
        studyMinutes: 6805,
        peMinutes: 1270,
        hobbyMinutes: 2370,
        allCorrectSubjCount: 306,
        scoreRate: 92,
      },
      {
        label: '期末冲刺段',
        studyMinutes: 7120,
        peMinutes: 1320,
        hobbyMinutes: 2400,
        allCorrectSubjCount: 328,
        scoreRate: 95,
      },
    ],
  },
};

const BASE_SUBJECT_REPORT_DATA: {
  subject: SubjectName;
  category: 'academic' | 'pe' | 'hobby';
  weeklyMinutes: number;
  weeklyTasks: number;
  weeklyAllCorrect: number;
  defaultScore: number;
  defaultFullScore: number;
  trendNote: string;
}[] = [
  {
    subject: '数学',
    category: 'academic',
    weeklyMinutes: 245,
    weeklyTasks: 7,
    weeklyAllCorrect: 6,
    defaultScore: 112,
    defaultFullScore: 120,
    trendNote: '老师每日公布全对名单 · 本周 6 次登榜',
  },
  {
    subject: '英语',
    category: 'academic',
    weeklyMinutes: 190,
    weeklyTasks: 7,
    weeklyAllCorrect: 6,
    defaultScore: 115,
    defaultFullScore: 120,
    trendNote: '听口与完形全对率稳居班级前列',
  },
  {
    subject: '语文',
    category: 'academic',
    weeklyMinutes: 175,
    weeklyTasks: 6,
    weeklyAllCorrect: 5,
    defaultScore: 103,
    defaultFullScore: 120,
    trendNote: '古诗文默写连续全对 · 重点抓现代文阅读',
  },
  {
    subject: '物理',
    category: 'academic',
    weeklyMinutes: 140,
    weeklyTasks: 5,
    weeklyAllCorrect: 4,
    defaultScore: 93,
    defaultFullScore: 100,
    trendNote: '作图与实验探究作业全对率稳步提升',
  },
  {
    subject: '化学',
    category: 'academic',
    weeklyMinutes: 110,
    weeklyTasks: 4,
    weeklyAllCorrect: 3,
    defaultScore: 91,
    defaultFullScore: 100,
    trendNote: '化学方程式默写需继续冲击全对榜',
  },
  {
    subject: '历史',
    category: 'academic',
    weeklyMinutes: 80,
    weeklyTasks: 3,
    weeklyAllCorrect: 3,
    defaultScore: 92,
    defaultFullScore: 100,
    trendNote: '时间轴梳理扎实 · 连续登上全对名单',
  },
  {
    subject: '地理',
    category: 'academic',
    weeklyMinutes: 75,
    weeklyTasks: 3,
    weeklyAllCorrect: 3,
    defaultScore: 94,
    defaultFullScore: 100,
    trendNote: '等高线与气候读图填图作业全部全对',
  },
  {
    subject: '生物',
    category: 'academic',
    weeklyMinutes: 75,
    weeklyTasks: 3,
    weeklyAllCorrect: 2,
    defaultScore: 93,
    defaultFullScore: 100,
    trendNote: '显微镜与细胞结构识图准确度高',
  },
  {
    subject: '道法',
    category: 'academic',
    weeklyMinutes: 65,
    weeklyTasks: 3,
    weeklyAllCorrect: 3,
    defaultScore: 92,
    defaultFullScore: 100,
    trendNote: '核心观点背诵与材料题规范全对',
  },
  {
    subject: '体育锻炼',
    category: 'pe',
    weeklyMinutes: 105,
    weeklyTasks: 7,
    weeklyAllCorrect: 7,
    defaultScore: 49,
    defaultFullScore: 50,
    trendNote: '【独立计时】跳绳/耐力跑/立定跳远每日15m满勤',
  },
  {
    subject: '课余兴趣',
    category: 'hobby',
    weeklyMinutes: 165,
    weeklyTasks: 4,
    weeklyAllCorrect: 4,
    defaultScore: 98,
    defaultFullScore: 100,
    trendNote: '【独立计时】象棋对弈、钢琴与小号练习按计划推进',
  },
];

export const MultiPeriodReportSection: React.FC<
  MultiPeriodReportSectionProps
> = ({
  tasks,
  examScores,
  mistakes = [],
  gradeClass,
  isDemoPurged,
  customSubjects = [],
  onShowToast,
}) => {
  const [dimension, setDimension] = useState<TimeDimension>('week');
  const [displayMode, setDisplayMode] = useState<'both' | 'chart' | 'table'>(
    'both'
  );
  // Extra manual increments when user clicks "+1 记全对" for any subject (e.g. Math teacher announces daily all-correct list)
  const [extraAllCorrectMap, setExtraAllCorrectMap] = useState<
    Record<SubjectName, number>
  >({});

  const { dragProps: tableDragProps, isDragging: isDraggingTable } =
    useDragScroll<HTMLDivElement>();

  const meta = DIMENSION_META[dimension];

  // Resolve curriculum subjects based on student's grade (e.g. 初一/初二 has no 化学)
  const gradeBaseSubjects = getDefaultSubjectsForGrade(gradeClass);
  const filteredBaseItems = BASE_SUBJECT_REPORT_DATA.filter((item) => {
    if (gradeBaseSubjects.length > 0) {
      return gradeBaseSubjects.includes(item.subject);
    }
    return true;
  });

  // Merge grade subjects with any user-created custom subjects or exam score subjects
  const allSubjectItems = [...filteredBaseItems];
  const extraNames = Array.from(
    new Set([
      ...customSubjects,
      ...examScores.map((c) => c.subject),
      ...tasks.map((t) => t.subject),
    ])
  ).filter((s) => !allSubjectItems.some((item) => item.subject === s));

  extraNames.forEach((subj) => {
    allSubjectItems.push({
      subject: subj,
      category: 'academic',
      weeklyMinutes: 70,
      weeklyTasks: 3,
      weeklyAllCorrect: 2,
      defaultScore: 92,
      defaultFullScore: 100,
      trendNote: '自定义学科 · 作业全对与考分稳步积累',
    });
  });

  const handleIncrementSubjectAllCorrect = (subj: SubjectName) => {
    setExtraAllCorrectMap((prev) => ({
      ...prev,
      [subj]: (prev[subj] || 0) + 1,
    }));
    onShowToast(
      `🏆 已记录「${subj}」今日登上老师全对作业名单！全对次数 +1 ✨`
    );
  };

  // Compute dynamic rows for the selected time dimension (zeroing out demo baseline when isDemoPurged is true)
  const subjectRows: SubjectReportRow[] = allSubjectItems.map((item) => {
    const liveSubjTasks = tasks.filter((t) => t.subject === item.subject);
    const liveTaskMinutes = liveSubjTasks.reduce(
      (sum, t) => sum + (t.actualMinutes ?? t.estimatedMinutes),
      0
    );
    const liveCompletedCount = liveSubjTasks.filter((t) => t.completed).length;
    const liveAllCorrectTasks = liveSubjTasks.filter((t) => t.isAllCorrect).length;
    const manualExtra = extraAllCorrectMap[item.subject] || 0;

    const liveScoreCard = examScores.find((c) => c.subject === item.subject);
    const hasLiveScore = Boolean(liveScoreCard);

    const score = liveScoreCard ? liveScoreCard.score : 0;
    const fullScore = liveScoreCard
      ? liveScoreCard.fullScore
      : item.defaultFullScore;
    const scorePercent = hasLiveScore
      ? Math.min(100, Math.round((score / Math.max(fullScore, 1)) * 100))
      : isDemoPurged
      ? 0
      : Math.min(
          100,
          Math.round((item.defaultScore / Math.max(item.defaultFullScore, 1)) * 100)
        );

    const periodMinutes = isDemoPurged
      ? liveTaskMinutes
      : item.weeklyMinutes * meta.multiplier + liveTaskMinutes;

    const totalTasks = isDemoPurged
      ? liveSubjTasks.length + manualExtra
      : item.weeklyTasks * meta.multiplier + manualExtra;

    const completedTasks = isDemoPurged
      ? liveCompletedCount + manualExtra
      : Math.max(
          1,
          Math.round(totalTasks * (dimension === 'week' ? 0.94 : 0.96))
        );

    const allCorrectTimes = isDemoPurged
      ? Math.min(totalTasks, liveAllCorrectTasks + manualExtra)
      : Math.min(
          totalTasks,
          item.weeklyAllCorrect * meta.multiplier +
            liveAllCorrectTasks +
            manualExtra
        );

    const allCorrectRate =
      totalTasks > 0
        ? Math.min(100, Math.round((allCorrectTimes / totalTasks) * 100))
        : 0;

    let statusBadge = '稳扎稳打';
    let statusColorClass = 'bg-primary-fixed/60 text-primary';
    if (!hasLiveScore && isDemoPurged && totalTasks === 0) {
      statusBadge = '待录入';
      statusColorClass = 'bg-surface-container text-on-surface-variant';
    } else if (scorePercent >= 93 || (totalTasks > 0 && allCorrectRate >= 85)) {
      statusBadge = '🌟 高效领跑';
      statusColorClass = 'bg-secondary-container text-on-secondary-container';
    } else if (hasLiveScore && scorePercent < 88) {
      statusBadge = '⚡ 提分空间';
      statusColorClass = 'bg-tertiary-fixed/70 text-tertiary';
    }

    const scoreText = hasLiveScore
      ? `${score}/${fullScore}`
      : isDemoPurged
      ? '待录入'
      : `${item.defaultScore}/${item.defaultFullScore}`;

    return {
      subject: item.subject,
      category: item.category,
      homeworkMinutes: periodMinutes,
      completedTasks: Math.min(completedTasks, totalTasks),
      totalTasks,
      allCorrectTimes,
      allCorrectRate,
      scoreText,
      scorePercent,
      trendNote:
        liveScoreCard?.trendText ||
        (isDemoPurged
          ? totalTasks > 0
            ? `已累计 ${periodMinutes} 分钟 · 完成 ${completedTasks}/${totalTasks} 项`
            : '考分与作业待录入 · 录入后自动生成趋势'
          : item.trendNote),
      statusBadge,
      statusColorClass,
    };
  });

  // 1. Academic Homework & Preview ONLY (excludes PE and Hobby so times are strictly separated!)
  const academicRows = subjectRows.filter((r) => r.category === 'academic');
  const academicMinutes = academicRows.reduce(
    (sum, r) => sum + r.homeworkMinutes,
    0
  );
  const academicHours = (academicMinutes / 60).toFixed(1);

  // 2. Standalone PE Exercise time (中考体育独立统计)
  const peRow = subjectRows.find((r) => r.category === 'pe');
  const peStandaloneMinutes = peRow
    ? peRow.homeworkMinutes
    : isDemoPurged
    ? 0
    : 105 * meta.multiplier;
  const peStandaloneHours = (peStandaloneMinutes / 60).toFixed(1);

  // 3. Standalone Extracurricular Hobby time (课余兴趣班独立统计)
  const hobbyRow = subjectRows.find((r) => r.category === 'hobby');
  const hobbyStandaloneMinutes = hobbyRow
    ? hobbyRow.homeworkMinutes
    : isDemoPurged
    ? 0
    : 165 * meta.multiplier;
  const hobbyStandaloneHours = (hobbyStandaloneMinutes / 60).toFixed(1);

  // 4. Total All-Correct Honor Roll count across academic subjects
  const totalAllCorrectTimes = academicRows.reduce(
    (sum, r) => sum + r.allCorrectTimes,
    0
  );
  const totalAcademicTasks = academicRows.reduce(
    (sum, r) => sum + r.totalTasks,
    0
  );
  const totalAcademicCompleted = academicRows.reduce(
    (sum, r) => sum + r.completedTasks,
    0
  );
  const academicCompletionRate =
    totalAcademicTasks > 0
      ? Math.round((totalAcademicCompleted / totalAcademicTasks) * 100)
      : isDemoPurged
      ? 0
      : 95;
  const overallAllCorrectRate =
    totalAcademicTasks > 0
      ? Math.min(100, Math.round((totalAllCorrectTimes / totalAcademicTasks) * 100))
      : 0;
  const mathRow = academicRows.find((r) => r.subject === '数学');

  const scoredAcademicRows = subjectRows.filter((r) => r.scorePercent > 0);
  const avgScorePercent =
    scoredAcademicRows.length > 0
      ? Math.round(
          scoredAcademicRows.reduce((sum, r) => sum + r.scorePercent, 0) /
            scoredAcademicRows.length
        )
      : 0;

  const clearedMistakesTotal = isDemoPurged
    ? mistakes.filter((m) => m.cleared).length
    : meta.clearedMistakes + mistakes.filter((m) => m.cleared).length;

  const pomodoroTotal = isDemoPurged
    ? tasks.reduce((sum, t) => sum + (t.completedPomodoros || 0), 0)
    : meta.pomodoroCount +
      tasks.reduce((sum, t) => sum + (t.completedPomodoros || 0), 0);

  const effectiveTrendPoints: TrendBarPoint[] = isDemoPurged
    ? meta.trendPoints.map((pt, idx) => {
        const isCurrentBucket = idx === meta.trendPoints.length - 1;
        return {
          label: pt.label,
          studyMinutes: isCurrentBucket ? academicMinutes : 0,
          peMinutes: isCurrentBucket ? peStandaloneMinutes : 0,
          hobbyMinutes: isCurrentBucket ? hobbyStandaloneMinutes : 0,
          allCorrectSubjCount: isCurrentBucket ? totalAllCorrectTimes : 0,
          scoreRate: isCurrentBucket ? avgScorePercent : 0,
        };
      })
    : meta.trendPoints;

  const maxBarMinutes = Math.max(
    ...effectiveTrendPoints.map(
      (p) => p.studyMinutes + p.peMinutes + p.hobbyMinutes
    ),
    1
  );

  const handleExportCSV = () => {
    const headers = [
      '统计周期',
      '学科/领域',
      '计时分类',
      '累计时长(分钟)',
      '折合小时',
      '作业全对登榜次数/总作业次数',
      '作业全对率(%)',
      '最新考分/满分',
      '折算得分率(%)',
      '效能评级',
      '学情诊断备注',
    ];
    const rows = subjectRows.map((r) => [
      meta.tabLabel,
      r.subject,
      r.category === 'pe'
        ? '中考体育(独立计时)'
        : r.category === 'hobby'
        ? '课余兴趣班(独立计时)'
        : '文化课学科作业',
      String(r.homeworkMinutes),
      (r.homeworkMinutes / 60).toFixed(1),
      r.category === 'academic'
        ? `全对${r.allCorrectTimes}次/${r.totalTasks}次`
        : `打卡${r.completedTasks}/${r.totalTasks}次`,
      `${r.allCorrectRate}%`,
      r.scoreText,
      `${r.scorePercent}%`,
      r.statusBadge,
      r.trendNote,
    ]);
    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `家庭书桌_${meta.tabLabel}_成绩与作业全对统计报表.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast(`已导出「${meta.periodTitle}」CSV 报表文件 📊`);
  };

  return (
    <section
      aria-label="成绩与作业周期视图与统计报表"
      className="flex flex-col p-4 sm:p-5 rounded-3xl bg-surface-container-lowest shadow-sm border border-[#EAE4DA]/80 space-y-4"
    >
      {/* Top Header & Dimension Switcher (周视图 / 月视图 / 季视图 / 年视图) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[20px] shrink-0">
              analytics
            </span>
            <h2 className="text-[17px] sm:text-[18px] leading-[24px] font-bold text-on-surface">
              成绩与作业 · 多维视图与统计报表
            </h2>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {meta.subtitle}
          </p>
        </div>

        {/* 4-Period Switcher Pill */}
        <div
          role="tablist"
          aria-label="报表周期切换"
          className="grid grid-cols-4 p-1 rounded-full bg-surface-container shrink-0 gap-0.5"
        >
          {(['week', 'month', 'quarter', 'year'] as TimeDimension[]).map(
            (dim) => {
              const active = dimension === dim;
              return (
                <button
                  key={dim}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setDimension(dim)}
                  className={`px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap text-center ${
                    active
                      ? 'bg-primary text-on-primary shadow-2xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {DIMENSION_META[dim].tabLabel}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Period Banner & Display Mode Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 rounded-2xl bg-surface-container-low border border-[#EAE4DA]/60">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
          <span className="text-xs font-bold text-on-surface">
            {meta.periodTitle}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center bg-white rounded-full p-0.5 border border-[#EAE4DA]">
            {(
              [
                { id: 'both', label: '图表+报表' },
                { id: 'chart', label: '仅趋势图' },
                { id: 'table', label: '仅明细表' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setDisplayMode(m.id)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer whitespace-nowrap ${
                  displayMode === m.id
                    ? 'bg-secondary text-on-secondary'
                    : 'text-on-surface-variant'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined text-[14px]">
              download
            </span>
            <span>导出报表</span>
          </button>
        </div>
      </div>

      {/* Quick Daily All-Correct Honor Roll Recorder Strip (老师公布每日全对作业名单一键记录) */}
      <div className="p-3 rounded-2xl bg-secondary-container/35 border border-secondary/25 flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🏆</span>
            <span className="text-xs font-bold text-on-surface">
              每日作业「全对名单」快记（如数学老师每天公布全对名单，点选即可 +1 记入报表）：
            </span>
          </div>
          <span className="text-[11px] font-semibold text-secondary">
            当前周期全科已登榜 {totalAllCorrectTimes} 次（全对率 {overallAllCorrectRate}%）
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {academicRows.map((row) => (
            <button
              key={row.subject}
              type="button"
              onClick={() => handleIncrementSubjectAllCorrect(row.subject)}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-secondary hover:text-on-secondary text-on-surface border border-[#EAE4DA] text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
              title={`点击记录今日${row.subject}作业全对（登上老师全对名单）`}
            >
              <span>🏆 {row.subject}全对</span>
              <span className="px-1.5 py-0.2 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold">
                {row.allCorrectTimes}次
              </span>
              <span className="text-secondary font-bold">+1</span>
            </button>
          ))}
        </div>
      </div>

      {/* 6 KPI Summary Cards (2-column spacious grid — PE and Extracurricular Hobby strictly separated!) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Card 1: Pure Academic Homework Time */}
        <div className="p-3.5 rounded-2xl bg-surface-container-low/70 border border-[#EAE4DA]/60 space-y-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs text-on-surface-variant font-semibold">
              📚 文化课作业与预习时长
            </span>
            <span className="text-[10px] text-primary font-semibold">
              不含体育与兴趣班
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl font-bold text-primary tabular-nums">
              {academicHours}
            </span>
            <span className="text-xs text-on-surface-variant">
              小时（共 {academicMinutes} 分钟）
            </span>
          </div>
          <span className="text-[11px] text-secondary font-semibold block">
            语数英物化历地生道法纯作业累计 · 完成率 {academicCompletionRate}%
          </span>
        </div>

        {/* Card 2: Homework All-Correct Honor Roll */}
        <div className="p-3.5 rounded-2xl bg-surface-container-low/70 border border-[#EAE4DA]/60 space-y-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs text-on-surface-variant font-semibold">
              🏆 作业全对 · 登老师全对名单
            </span>
            <span className="text-[10px] text-secondary font-bold">
              全对率 {overallAllCorrectRate}%
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl font-bold text-secondary tabular-nums">
              {totalAllCorrectTimes}
            </span>
            <span className="text-xs text-on-surface-variant">
              次全对 / 共 {totalAcademicTasks} 次作业
            </span>
          </div>
          <span className="text-[11px] text-on-surface-variant block">
            其中数学全对 {mathRow?.allCorrectTimes ?? 0}/{mathRow?.totalTasks ?? 0} 次（全对率{' '}
            {mathRow?.allCorrectRate ?? 0}%）
          </span>
        </div>

        {/* Card 3: Standalone Middle School PE Time (分开独立计算 1) */}
        <div
          data-testid="pe-standalone-kpi"
          className="p-3.5 rounded-2xl bg-[#EEF7F3] border border-secondary/25 space-y-1 min-w-0"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs text-secondary font-bold">
              🏃 中考体育锻炼时长（独立计算）
            </span>
            <span className="text-[10px] text-secondary font-semibold">
              每次 10~15 分钟
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl font-bold text-secondary tabular-nums">
              {peStandaloneHours}
            </span>
            <span className="text-xs text-on-surface-variant">
              小时（独立累计 {peStandaloneMinutes} 分钟）
            </span>
          </div>
          <span className="text-[11px] text-secondary font-semibold block">
            跳绳 / 1000m耐力跑 / 立定跳远与核心体能
          </span>
        </div>

        {/* Card 4: Standalone Extracurricular Hobby Time (分开独立计算 2) */}
        <div
          data-testid="hobby-standalone-kpi"
          className="p-3.5 rounded-2xl bg-[#FDF6EC] border border-tertiary/25 space-y-1 min-w-0"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs text-tertiary font-bold">
              🎨 课余兴趣班与特长时长（独立计算）
            </span>
            <span className="text-[10px] text-tertiary font-semibold">
              固定/机动排期
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl font-bold text-tertiary tabular-nums">
              {hobbyStandaloneHours}
            </span>
            <span className="text-xs text-on-surface-variant">
              小时（独立累计 {hobbyStandaloneMinutes} 分钟）
            </span>
          </div>
          <span className="text-[11px] text-tertiary font-semibold block">
            练象棋 / 练钢琴 / 练小号 / Python编程（与体育分开统计）
          </span>
        </div>

        {/* Card 5: Overall Normalized Exam Score Rate */}
        <div className="p-3.5 rounded-2xl bg-surface-container-low/70 border border-[#EAE4DA]/60 space-y-1 min-w-0">
          <span className="text-xs text-on-surface-variant font-semibold block">
            📈 全科考试平均得分率
          </span>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl font-bold text-primary tabular-nums">
              {avgScorePercent}%
            </span>
            <span className="text-xs text-secondary font-bold">
              {avgScorePercent > 0 ? `较上周期 ${meta.scoreDelta}` : '录入考分后自动计算'}
            </span>
          </div>
          <span className="text-[11px] text-on-surface-variant block">
            支持 90 / 100 / 120 / 150 不同满分自动折算百分制
          </span>
        </div>

        {/* Card 6: Cleared Mistakes & Pomodoros */}
        <div className="p-3.5 rounded-2xl bg-surface-container-low/70 border border-[#EAE4DA]/60 space-y-1 min-w-0">
          <span className="text-xs text-on-surface-variant font-semibold block">
            🎯 错题清账与番茄钟专注
          </span>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl font-bold text-on-surface tabular-nums">
              {clearedMistakesTotal}
            </span>
            <span className="text-xs text-on-surface-variant">
              道错题已销项 · 🍅 {pomodoroTotal} 个番茄钟
            </span>
          </div>
          <span className="text-[11px] text-primary font-semibold block">
            错题重做过关后自动同步至全对率提升曲线
          </span>
        </div>
      </div>

      {/* Visual Dual-Metric Trend Chart (Study vs PE vs Hobby vs All-Correct/Score) */}
      {(displayMode === 'both' || displayMode === 'chart') && (
        <div className="p-4 rounded-2xl bg-surface-container-low/60 border border-[#EAE4DA]/70 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-on-surface">
              📈 {meta.tabLabel} · 学科作业 / 中考体育 / 课余兴趣分项时长与全对趋势
            </span>
            <div className="flex items-center gap-3 text-[11px] text-on-surface-variant flex-wrap">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-primary inline-block" />
                学科作业
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-secondary inline-block" />
                中考体育(独立)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-tertiary-container inline-block" />
                课余兴趣(独立)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary inline-block" />
                全对登榜/得分率
              </span>
            </div>
          </div>

          <div
            className={`grid gap-2 pt-2 items-end ${
              effectiveTrendPoints.length === 7
                ? 'grid-cols-7'
                : effectiveTrendPoints.length === 4
                ? 'grid-cols-4'
                : 'grid-cols-3'
            }`}
          >
            {effectiveTrendPoints.map((pt) => {
              const studyH =
                pt.studyMinutes > 0
                  ? Math.max(
                      12,
                      Math.round((pt.studyMinutes / maxBarMinutes) * 84)
                    )
                  : 3;
              const peH =
                pt.peMinutes > 0
                  ? Math.max(6, Math.round((pt.peMinutes / maxBarMinutes) * 84))
                  : 3;
              const hobbyH =
                pt.hobbyMinutes > 0
                  ? Math.max(
                      8,
                      Math.round((pt.hobbyMinutes / maxBarMinutes) * 84)
                    )
                  : 2;

              return (
                <div
                  key={pt.label}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white/80 border border-[#EAE4DA]/50"
                >
                  {/* Score & All-Correct Badge */}
                  <div className="px-1.5 py-0.5 rounded-full bg-tertiary-fixed/60 text-tertiary text-[10px] font-bold whitespace-nowrap">
                    {pt.scoreRate}% · 🏆{pt.allCorrectSubjCount}
                  </div>

                  {/* 3 Separate Bars: Academic Study, PE, Hobby */}
                  <div className="h-24 w-full flex items-end justify-center gap-1 px-0.5">
                    <div
                      title={`文化课作业：${pt.studyMinutes} 分钟`}
                      className="w-2.5 sm:w-3 rounded-t-md bg-primary transition-all duration-300"
                      style={{ height: `${studyH}px` }}
                    />
                    <div
                      title={`中考体育(独立计时)：${pt.peMinutes} 分钟`}
                      className="w-2.5 sm:w-3 rounded-t-md bg-secondary transition-all duration-300"
                      style={{ height: `${peH}px` }}
                    />
                    <div
                      title={`课余兴趣(独立计时)：${pt.hobbyMinutes} 分钟`}
                      className="w-2.5 sm:w-3 rounded-t-md bg-tertiary-container transition-all duration-300"
                      style={{ height: `${hobbyH}px` }}
                    />
                  </div>

                  {/* X-axis Label & Separate Breakdown */}
                  <div className="text-center">
                    <div className="text-[11px] font-bold text-on-surface whitespace-nowrap">
                      {pt.label}
                    </div>
                    <div className="text-[9px] text-on-surface-variant whitespace-nowrap">
                      作{pt.studyMinutes}m · 体{pt.peMinutes}m
                    </div>
                    <div className="text-[9px] text-tertiary font-medium whitespace-nowrap">
                      兴{pt.hobbyMinutes}m
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full-Subject Report Table (supports PC mouse left-button drag scrolling) */}
      {(displayMode === 'both' || displayMode === 'table') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-1 px-0.5">
            <span className="text-xs font-bold text-on-surface">
              📋 全科学情、作业全对名单与成绩明细报表（体育与兴趣班已分开独立核算）
            </span>
            <span className="text-[11px] text-on-surface-variant">
              💡 可点表内「+1全对」记入每日老师全对名单 · PC端可按住左键左右滑动
            </span>
          </div>

          <div
            {...tableDragProps}
            className={`overflow-x-auto rounded-2xl border border-[#EAE4DA] bg-white select-none ${
              isDraggingTable ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="bg-surface-container-low border-b border-[#EAE4DA] text-[11px] text-on-surface-variant font-bold">
                  <th className="py-2.5 px-3">学科 / 独立领域</th>
                  <th className="py-2.5 px-2.5">{meta.tabLabel}独立耗时</th>
                  <th className="py-2.5 px-2.5">🏆 作业全对 / 老师全对名单</th>
                  <th className="py-2.5 px-2.5">考分 / 满分</th>
                  <th className="py-2.5 px-2.5">折算得分率</th>
                  <th className="py-2.5 px-3">效能评级与诊断</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE4DA]/60 text-xs">
                {subjectRows.map((row) => (
                  <tr
                    key={row.subject}
                    className={`hover:bg-surface-container-low/40 transition-colors ${
                      row.category === 'pe'
                        ? 'bg-[#EEF7F3]/40'
                        : row.category === 'hobby'
                        ? 'bg-[#FDF6EC]/50'
                        : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${getSubjectBadgeClass(
                            row.subject
                          )}`}
                        >
                          {row.subject}
                        </span>
                        {row.category === 'pe' && (
                          <span className="text-[10px] text-secondary font-bold">
                            体育独立计时
                          </span>
                        )}
                        {row.category === 'hobby' && (
                          <span className="text-[10px] text-tertiary font-bold">
                            兴趣独立计时
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      <span className="font-bold text-on-surface">
                        {row.homeworkMinutes} 分钟
                      </span>
                      <span className="text-[11px] text-on-surface-variant ml-1">
                        ({(row.homeworkMinutes / 60).toFixed(1)}h)
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      {row.category === 'academic' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-secondary">
                            🏆 全对 {row.allCorrectTimes}/{row.totalTasks} 次
                          </span>
                          <span className="text-[10px] text-on-surface-variant">
                            ({row.allCorrectRate}%)
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleIncrementSubjectAllCorrect(row.subject)
                            }
                            className="px-1.5 py-0.5 rounded-md bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary text-[10px] font-bold cursor-pointer transition-colors"
                            title={`记录${row.subject}今日登上老师全对作业名单`}
                          >
                            +1全对
                          </button>
                        </div>
                      ) : (
                        <span className="text-on-surface-variant font-medium">
                          已打卡 {row.completedTasks}/{row.totalTasks} 次
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2.5 font-bold text-on-surface whitespace-nowrap">
                      {row.scoreText}
                    </td>
                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-14 h-1.5 rounded-full bg-surface-container overflow-hidden">
                          <div
                            className="h-full rounded-full bg-secondary"
                            style={{ width: `${row.scorePercent}%` }}
                          />
                        </div>
                        <span className="font-bold text-secondary">
                          {row.scorePercent}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${row.statusColorClass}`}
                        >
                          {row.statusBadge}
                        </span>
                        <span className="text-[11px] text-on-surface-variant">
                          {row.trendNote}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
