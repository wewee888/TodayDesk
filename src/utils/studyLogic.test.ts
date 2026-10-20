import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_POMODORO_SECONDS,
  buildDynamicWeeklyReport,
  buildSmartExamPeriods,
  calculateDeskSummary,
  calculatePomodoroProgress,
  clampTaskDuration,
  clearMistakeItem,
  computeDynamicEfficiencyBubbles,
  computeMistakeArchiveCounts,
  extractOrderedSubjectsFromSegment,
  formatPomodoroTime,
  getDefaultSubjectsForGrade,
  getSubjectMeta,
  getTaskPresetsForSubject,
  parseTimetableContent,
  parseVoiceCommandLocal,
  resolveRecommendedExamPeriod,
  resolveReviewStatus,
} from './studyLogic.ts';
import type { HomeworkTask, MistakeItem, ReviewItem } from '../types/study.ts';

test('formatPomodoroTime and calculatePomodoroProgress handle 25-minute countdown accurately', () => {
  assert.equal(DEFAULT_POMODORO_SECONDS, 1500);
  assert.equal(formatPomodoroTime(1500), '25:00');
  assert.equal(formatPomodoroTime(65), '01:05');
  assert.equal(formatPomodoroTime(0), '00:00');

  assert.equal(calculatePomodoroProgress(1500, 1500), 0);
  assert.equal(calculatePomodoroProgress(750, 1500), 50);
  assert.equal(calculatePomodoroProgress(0, 1500), 100);
});

test('parseVoiceCommandLocal supports >90m durations, extracurricular hobbies (象棋, 钢琴, 小号), and middle school PE exam exercises (跳绳, 耐力跑)', () => {
  const input =
    '数学模拟卷120分钟，晚上跳绳20分钟，1000米跑步25分钟，周末练了象棋45分钟，练了钢琴一个半小时，练了小号30分钟';
  const parsed = parseVoiceCommandLocal(input);

  assert.equal(parsed.length, 6);
  assert.equal(parsed[0].subject, '数学');
  assert.equal(parsed[0].estimatedMinutes, 120);

  assert.equal(parsed[1].subject, '体育锻炼');
  assert.equal(parsed[1].taskType, '晚间跳绳');
  assert.equal(parsed[1].estimatedMinutes, 20);

  assert.equal(parsed[2].subject, '体育锻炼');
  assert.equal(parsed[2].taskType, '1000m/800m耐力跑');
  assert.equal(parsed[2].estimatedMinutes, 25);

  assert.equal(parsed[3].subject, '课余兴趣');
  assert.equal(parsed[3].taskType, '练象棋');
  assert.equal(parsed[3].estimatedMinutes, 45);

  assert.equal(parsed[4].subject, '课余兴趣');
  assert.equal(parsed[4].taskType, '练钢琴');
  assert.equal(parsed[4].estimatedMinutes, 90);

  assert.equal(parsed[5].subject, '课余兴趣');
  assert.equal(parsed[5].taskType, '练小号');
  assert.equal(parsed[5].estimatedMinutes, 30);

  assert.equal(clampTaskDuration(150), 150);
  assert.equal(clampTaskDuration(300), 240);
});

test('calculateDeskSummary accurately computes task counts and estimated minutes', () => {
  const tasks: HomeworkTask[] = [
    {
      id: 't1',
      subject: '语文',
      subjectBadgeClass: '',
      taskType: '古诗背诵',
      title: '岳阳楼记',
      estimatedMinutes: 30,
      completed: false,
    },
    {
      id: 't2',
      subject: '数学',
      subjectBadgeClass: '',
      taskType: '阶段冲刺卷',
      title: '二次函数',
      estimatedMinutes: 120,
      completed: true,
    },
  ];

  const summary = calculateDeskSummary(tasks);
  assert.equal(summary.totalCount, 2);
  assert.equal(summary.completedCount, 1);
  assert.equal(summary.remainingCount, 1);
  assert.equal(summary.totalMinutes, 150);
});

test('resolveReviewStatus and clearMistakeItem update states accurately', () => {
  const reviews: ReviewItem[] = [
    {
      id: 'r1',
      subject: '数学',
      subjectBadgeClass: '',
      title: '同步练习册 P.42-43',
      status: 'pending',
    },
  ];
  const step1 = resolveReviewStatus(reviews, 'r1', 'all_correct');
  assert.equal(step1.allResolved, true);

  const mistakes: MistakeItem[] = [
    {
      id: 'm1',
      subject: '数学',
      sourceLabel: '数学 · 第3次作业',
      badgeClass: '',
      statusText: '已错 2 次',
      statusType: 'repeat',
      title: '二次函数顶点最值',
      reasonText: '计算粗心',
      reasonIcon: 'warning',
      reasonColorClass: '',
      excerpt: '已知抛物线...',
      cleared: false,
      ctaLabel: '已重做过关 ✓',
      ctaStyle: 'secondary',
      solutionDetail: '',
    },
  ];
  const res = clearMistakeItem(mistakes, 'm1', 5);
  assert.equal(res.remainingCount, 0);
  assert.equal(res.totalClearedCount, 6);
});

test('getTaskPresetsForSubject returns custom extracurricular and PE exercises when configured', () => {
  const customHobbies = ['练象棋', '练钢琴', '练小号'];
  const hobbyPresets = getTaskPresetsForSubject('课余兴趣', customHobbies);
  assert.deepEqual(hobbyPresets.taskTypes, customHobbies);

  const customPe = ['晚间跳绳', '1000m耐力跑', '游泳500m'];
  const pePresets = getTaskPresetsForSubject('体育锻炼', undefined, customPe);
  assert.deepEqual(pePresets.taskTypes, customPe);

  const geoPresets = getTaskPresetsForSubject('地理');
  assert.equal(geoPresets.taskTypes.includes('读图填图'), true);

  const bioPresets = getTaskPresetsForSubject('生物');
  assert.equal(bioPresets.taskTypes.includes('实验导学'), true);

  const customSubjPresets = getTaskPresetsForSubject('天文选修');
  assert.equal(customSubjPresets.taskTypes.length > 0, true);
  assert.equal(
    customSubjPresets.defaultTitles['作业练习'].includes('天文选修'),
    true
  );
});

test('parseTimetableContent and buildSmartExamPeriods handle curriculum detection and exam period adaptation', () => {
  const parsed = parseTimetableContent(
    '周一：语文、数学、英语、物理、地理、生物、道法、体育、信息科技',
    '初二课表.png',
    'grade8'
  );
  assert.equal(parsed.academicSubjects.includes('地理'), true);
  assert.equal(parsed.academicSubjects.includes('生物'), true);
  assert.equal(parsed.academicSubjects.includes('道法'), true);
  assert.equal(parsed.weeklyGrid.length, 5);

  const novMonthly = buildSmartExamPeriods(11, 'monthly_and_major');
  assert.equal(novMonthly.includes('11月月考'), true);
  assert.equal(novMonthly.includes('期中预备'), false);
  assert.equal(resolveRecommendedExamPeriod(11, 'monthly_and_major'), '11月月考');

  const directMajor = buildSmartExamPeriods(11, 'major_only');
  assert.deepEqual(directMajor, ['日常单元测', '期中考试', '期末考试', '中考模拟']);
  assert.equal(resolveRecommendedExamPeriod(11, 'major_only'), '期中考试');

  const withPrep = buildSmartExamPeriods(11, 'with_prep');
  assert.equal(withPrep.includes('期中预备'), true);
  assert.equal(withPrep.includes('期中考试'), true);
});

test('getSubjectMeta accurately maps junior and senior high school subjects to distinct icons and colors', () => {
  const chinese = getSubjectMeta('语文');
  assert.equal(chinese.icon, 'stylus_note');
  assert.equal(chinese.category, '主科');

  const physics = getSubjectMeta('物理');
  assert.equal(physics.icon, 'electric_bolt');
  assert.equal(physics.category, '理科');

  const chemistry = getSubjectMeta('化学');
  assert.equal(chemistry.icon, 'science');
  assert.equal(chemistry.category, '理科');

  const history = getSubjectMeta('历史');
  assert.equal(history.icon, 'history_edu');
  assert.equal(history.category, '文科');

  const politics = getSubjectMeta('思想政治');
  assert.equal(politics.icon, 'policy');
  assert.equal(politics.category, '文科');

  const science = getSubjectMeta('科学');
  assert.equal(science.icon, 'experiment');
  assert.equal(science.category, '理科');

  const it = getSubjectMeta('信息科技');
  assert.equal(it.icon, 'terminal');
  assert.equal(it.category, '技术');

  const pe = getSubjectMeta('体育中考');
  assert.equal(pe.icon, 'directions_run');
  assert.equal(pe.category, '体健');

  const olympiad = getSubjectMeta('奥数');
  assert.equal(olympiad.icon, 'functions');

  const coding = getSubjectMeta('编程');
  assert.equal(coding.icon, 'code');

  // Test dynamic fuzzy matching fallback
  const customRobotics = getSubjectMeta('青少年机器人社团');
  assert.equal(customRobotics.icon, 'smart_toy');

  const customMusic = getSubjectMeta('管乐团长笛');
  assert.equal(customMusic.icon, 'music_note');
});

test('calculateConstrainedDimensions and formatBytes optimize images accurately for R2 upload', async () => {
  const { calculateConstrainedDimensions, formatBytes } = await import(
    './imageCompressor.ts'
  );

  // Format bytes test
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(153600), '150.0 KB');
  assert.equal(formatBytes(4194304), '4.00 MB');

  // Constrained dimensions test (aspect ratio preserved under max 1920)
  // 1. Smaller image remains unchanged
  const small = calculateConstrainedDimensions(800, 600, 1920);
  assert.deepEqual(small, { width: 800, height: 600 });

  // 2. High-res mobile photo (4032 x 3024) scaled down proportionally
  const photo = calculateConstrainedDimensions(4032, 3024, 1920);
  assert.equal(photo.width, 1920);
  assert.equal(photo.height, 1440);

  // 3. Tall mobile document/scorecard (3024 x 4032) scaled down proportionally
  const tallPhoto = calculateConstrainedDimensions(3024, 4032, 1920);
  assert.equal(tallPhoto.width, 1440);
  assert.equal(tallPhoto.height, 1920);
});

test('getDefaultSubjectsForGrade accurately adapts default subjects to grade curriculum', () => {
  // 初一 (七年级)：语、数、英、道法、历史、地理、生物、体育锻炼、课余兴趣、自主自习 (无物理、无化学)
  const grade7 = getDefaultSubjectsForGrade('初一 (6) 班');
  assert.ok(!grade7.includes('物理'), '初一绝不默认出现物理');
  assert.ok(!grade7.includes('化学'), '初一绝不默认出现化学');
  assert.ok(grade7.includes('语文') && grade7.includes('数学') && grade7.includes('英语'));
  assert.ok(grade7.includes('地理') && grade7.includes('生物') && grade7.includes('历史') && grade7.includes('道法'));

  // 初二 (八年级)：开物理，无化学 (化学初三开设)
  const grade8 = getDefaultSubjectsForGrade('初二 (3) 班');
  assert.ok(grade8.includes('物理'), '初二默认包含物理');
  assert.ok(!grade8.includes('化学'), '初二绝不默认包含化学');
  assert.ok(grade8.includes('地理') && grade8.includes('生物'));

  // 初三 (九年级)：开化学，中考冲刺 (地理生物在八年级已结业)
  const grade9 = getDefaultSubjectsForGrade('初三 (1) 班');
  assert.ok(grade9.includes('物理'), '初三包含物理');
  assert.ok(grade9.includes('化学'), '初三包含化学');
  assert.ok(!grade9.includes('地理') && !grade9.includes('生物'), '初三默认结业地理生物');
});

test('parseTimetableContent preserves duplicate subjects in the same day, extracts morning reading, and transposes period-row tables without padding default subjects', () => {
  // 1. Same-day duplicate subjects + morning reading + unpadded short day
  const rawDaily = [
    '周一：早读英语 数学 数学 语文 英语 物理 体育',
    '周二：早读语文 语文 数学 英语',
  ].join('\n');
  const parsedDaily = parseTimetableContent(rawDaily, '测试课表.txt', 'grade8');
  const monCol = parsedDaily.weeklyGrid.find((d) => d.day === '周一');
  const tueCol = parsedDaily.weeklyGrid.find((d) => d.day === '周二');
  const wedCol = parsedDaily.weeklyGrid.find((d) => d.day === '周三');

  assert.equal(monCol?.morningReading, '英语');
  assert.deepEqual(
    monCol?.periods.map((p) => (typeof p === 'string' ? p : p.subject)),
    ['数学', '数学', '语文', '英语', '物理', '体育锻炼']
  );
  assert.equal(tueCol?.morningReading, '语文');
  assert.deepEqual(
    tueCol?.periods.map((p) => (typeof p === 'string' ? p : p.subject)),
    ['语文', '数学', '英语']
  );
  assert.equal(wedCol?.periods.length, 0);

  // 2. Period-by-period rows across Mon-Fri columns
  const rawPeriodTable = [
    '周一 周二 周三 周四 周五',
    '早读 语文 英语 语文 英语 语文',
    '第1节 数学 语文 数学 英语 数学',
    '第2节 数学 数学 语文 数学 语文',
    '第3节 英语 物理 生物 历史 道法',
  ].join('\n');
  const parsedTable = parseTimetableContent(rawPeriodTable, '表格课表.txt', 'grade8');
  const tableMon = parsedTable.weeklyGrid.find((d) => d.day === '周一');
  const tableWed = parsedTable.weeklyGrid.find((d) => d.day === '周三');
  assert.equal(tableMon?.morningReading, '语文');
  assert.deepEqual(
    tableMon?.periods.map((p) => (typeof p === 'string' ? p : p.subject)),
    ['数学', '数学', '英语']
  );
  assert.equal(tableWed?.morningReading, '语文');
  assert.deepEqual(
    tableWed?.periods.map((p) => (typeof p === 'string' ? p : p.subject)),
    ['数学', '语文', '生物']
  );

  // 3. Continuous unspaced subject extraction
  const continuous = extractOrderedSubjectsFromSegment('数学数学语文英语道德与法治体育');
  assert.deepEqual(
    continuous.map((c) => c.subject),
    ['数学', '数学', '语文', '英语', '道法', '体育锻炼']
  );
});

test('computeMistakeArchiveCounts and computeDynamicEfficiencyBubbles respect isDemoPurged with zero residual offsets', () => {
  const emptyCounts = computeMistakeArchiveCounts([], true);
  assert.equal(emptyCounts.remainingMistakes, 0);
  assert.equal(emptyCounts.clearedCount, 0);
  assert.equal(emptyCounts.totalCount, 0);

  const emptyBubbles = computeDynamicEfficiencyBubbles([], [], [], true);
  assert.equal(emptyBubbles.length, 0);

  const realBubbles = computeDynamicEfficiencyBubbles(
    [
      {
        id: 't-real-1',
        subject: '数学',
        subjectBadgeClass: '',
        taskType: '作业练习',
        title: '数学精练',
        estimatedMinutes: 60,
        completed: true,
      },
    ],
    [
      {
        subject: '数学',
        icon: 'square_foot',
        score: 114,
        fullScore: 120,
        trendText: '最新录入',
        trendIcon: 'trending_up',
        colorScheme: 'secondary',
      },
    ],
    [],
    true
  );
  assert.equal(realBubbles.length, 1);
  assert.equal(realBubbles[0].subject, '数学');
  assert.equal(realBubbles[0].scorePercent, 95);

  const emptyReport = buildDynamicWeeklyReport({
    studentName: '李子涵',
    gradeClass: '初二 (3) 班',
    tasks: [],
    mistakes: [],
    examScores: [],
    isDemoPurged: true,
    defaultReport: {
      studentName: '李子涵',
      weekLabel: '默认周报',
      headline: '默认标题',
      summaryParagraph: '默认总结',
      highYieldSubject: '数学（月投入 14h · 得分率 93%）',
      potentialSubject: '物理',
      encouragement: '加油',
      actionItems: [{ subject: '数学', task: '假任务', minutes: 15, priority: '必清' }],
    },
  });
  assert.equal(emptyReport.actionItems.length, 0);
  assert.ok(!emptyReport.highYieldSubject.includes('14h'));

  const singleTaskReport = buildDynamicWeeklyReport({
    studentName: '李子涵',
    gradeClass: '初二 (3) 班',
    tasks: [
      {
        id: 'task-henry-math-1',
        subject: '数学',
        subjectBadgeClass: '',
        taskType: '作业练习',
        title: '数学 · 作业练习专项',
        estimatedMinutes: 22,
        completed: false,
      },
    ],
    mistakes: [],
    examScores: [],
    isDemoPurged: true,
    defaultReport: emptyReport,
  });
  assert.ok(singleTaskReport.headline.includes('22 分钟'));
  assert.ok(singleTaskReport.highYieldSubject.includes('22 分钟'));
  assert.equal(singleTaskReport.actionItems.length, 1);
  assert.equal(singleTaskReport.actionItems[0].minutes, 22);

  // When tasks contain residual demo tasks, buildDynamicWeeklyReport strictly excludes them when isDemoPurged is true
  const mixedReport = buildDynamicWeeklyReport({
    studentName: '李子涵',
    gradeClass: '初二 (3) 班',
    tasks: [
      {
        id: 'task-1',
        subject: '语文',
        taskType: '古诗默写',
        title: '示范任务（应被排除）',
        estimatedMinutes: 30,
        isDemo: true,
        completed: false,
      } as any,
      {
        id: 'task-real-math',
        subject: '数学',
        taskType: '作业练习',
        title: '真实作业练习',
        estimatedMinutes: 25,
        isDemo: false,
        completed: false,
      } as any,
    ],
    mistakes: [
      {
        id: 'mis-1',
        subject: '物理',
        title: '示范错题（应被排除）',
        isDemo: true,
        cleared: false,
      } as any,
    ],
    examScores: [{ subject: '英语', score: 90, fullScore: 100, isDemo: true } as any],
    isDemoPurged: true,
    defaultReport: emptyReport,
  });
  // Must count only the 1 real task (25 mins) and 0 demo mistakes
  assert.ok(mixedReport.headline.includes('1 项任务'));
  assert.ok(mixedReport.headline.includes('25 分钟'));
  assert.ok(mixedReport.highYieldSubject.includes('数学'));
  assert.ok(!mixedReport.highYieldSubject.includes('语文'));
  assert.ok(!mixedReport.summaryParagraph.includes('物理'));
  assert.equal(mixedReport.actionItems.length, 1);
  assert.equal(mixedReport.actionItems[0].subject, '数学');
});

test('calculateDeskSummary accurately recalculates metrics and reports empty state when demo data is purged', () => {
  const mixedTasks: any[] = [
    { id: 'task-1', subject: '数学', estimatedMinutes: 25, isDemo: true, completed: true, isAllCorrect: true },
    { id: 'task-2', subject: '英语', estimatedMinutes: 20, isDemo: true, completed: false },
    { id: 'task-real-1', subject: '数学', estimatedMinutes: 22, actualMinutes: 22, isDemo: false, completed: true, isAllCorrect: true },
    { id: 'task-real-pe', subject: '体育锻炼', estimatedMinutes: 15, isDemo: false, completed: true },
    { id: 'task-real-chess', subject: '课余兴趣', estimatedMinutes: 30, isDemo: false, completed: false },
  ];

  // 1. Without isDemoPurged: all tasks counted
  const summaryAll = calculateDeskSummary(mixedTasks);
  assert.equal(summaryAll.totalCount, 5);
  assert.equal(summaryAll.demoTaskCount, 2);
  assert.equal(summaryAll.realTaskCount, 3);
  assert.equal(summaryAll.isEmpty, false);

  // 2. With isDemoPurged: true: demo tasks filtered out, only real tasks counted
  const summaryPurged = calculateDeskSummary(mixedTasks, { isDemoPurged: true });
  assert.equal(summaryPurged.totalCount, 3);
  assert.equal(summaryPurged.demoTaskCount, 0);
  assert.equal(summaryPurged.realTaskCount, 3);
  assert.equal(summaryPurged.totalMinutes, 22 + 15 + 30);
  assert.equal(summaryPurged.academicMinutes, 22);
  assert.equal(summaryPurged.peMinutes, 15);
  assert.equal(summaryPurged.hobbyMinutes, 30);
  assert.equal(summaryPurged.allCorrectCount, 1);
  assert.equal(summaryPurged.isEmpty, false);

  // 3. When no real tasks remain after purge: clean zero state with guide text
  const emptyPurged = calculateDeskSummary(
    [{ id: 'task-1', subject: '数学', estimatedMinutes: 25, isDemo: true } as any],
    { isDemoPurged: true }
  );
  assert.equal(emptyPurged.totalCount, 0);
  assert.equal(emptyPurged.totalMinutes, 0);
  assert.equal(emptyPurged.academicMinutes, 0);
  assert.equal(emptyPurged.peMinutes, 0);
  assert.equal(emptyPurged.hobbyMinutes, 0);
  assert.equal(emptyPurged.isEmpty, true);
  assert.ok(emptyPurged.emptyGuideText.includes('示范数据已全部清空'));
});

test('isDemo helper functions accurately differentiate demo items from real user items', async () => {
  const {
    isDemoHomeworkTask,
    isDemoScheduleItem,
    isDemoReviewItem,
    isDemoMistakeItem,
  } = await import('./studyLogic.ts');

  // Demo tasks by ID or isDemo flag
  assert.equal(isDemoHomeworkTask({ id: 'task-1', isDemo: true } as any), true);
  assert.equal(isDemoHomeworkTask({ id: 'task-custom-1', isDemo: true } as any), true);
  assert.equal(isDemoHomeworkTask({ id: 'task-custom-1', isDemo: false } as any), false);
  assert.equal(isDemoHomeworkTask({ id: 'task-henry-22m' } as any), false);

  // Demo schedules
  assert.equal(isDemoScheduleItem({ id: 'sch-1' } as any), true);
  assert.equal(isDemoScheduleItem({ id: 'sch-pe' } as any), true);
  assert.equal(isDemoScheduleItem({ id: 'sch-custom-99' } as any), false);

  // Demo reviews
  assert.equal(isDemoReviewItem({ id: 'rev-1' } as any), true);
  assert.equal(isDemoReviewItem({ id: 'rev-custom-1' } as any), false);

  // Demo mistakes
  assert.equal(isDemoMistakeItem({ id: 'mistake-1' } as any), true);
  assert.equal(isDemoMistakeItem({ id: 'mistake-custom-99' } as any), false);
});

test('parseTimetableContent and formatWeeklyGridToText support Chengdu Zongbei 7.6 10-period timetable and bidirectional text conversion', async () => {
  const {
    ZONGBEI_7_6_REAL_TIMETABLE_TEXT,
    formatWeeklyGridToText,
    parseTimetableContent,
  } = await import('./studyLogic.ts');

  const res = parseTimetableContent(ZONGBEI_7_6_REAL_TIMETABLE_TEXT, '成都市棕北中学_七.6班_课表.jpg', 'grade7');
  assert.equal(res.schoolAndClass, '成都市棕北中学 七.6');
  assert.equal(res.weeklyGrid.length, 5);

  // Monday should have 10 periods + morning reading '无'
  const monday = res.weeklyGrid[0];
  assert.equal(monday.day, '周一');
  assert.equal(monday.morningReading, '无');
  assert.equal(monday.periods.length, 10);
  assert.equal(typeof monday.periods[0] === 'object' ? monday.periods[0].subject : monday.periods[0], '历史');
  assert.equal(typeof monday.periods[0] === 'object' ? monday.periods[0].teacher : '', '徐倩');

  // Tuesday morning reading is 英语(刘庆媛)
  const tuesday = res.weeklyGrid[1];
  assert.equal(tuesday.morningReading, '英语(刘庆媛)');

  // Convert weekly grid back to formatted text
  const convertedText = formatWeeklyGridToText(res.weeklyGrid, '成都市棕北中学 七.6');
  assert.ok(convertedText.includes('成都市棕北中学 七.6'));
  assert.ok(convertedText.includes('周一：早读：无'));
  assert.ok(convertedText.includes('历史(徐倩)'));
  assert.ok(convertedText.includes('周二：早读：英语(刘庆媛)'));

  // Reparse converted text should yield identical periods and subjects
  const reparsed = parseTimetableContent(convertedText, 'synced.txt', 'grade7');
  assert.equal(reparsed.weeklyGrid[0].periods.length, 10);
  assert.equal(reparsed.detectedSubjects.includes('语文'), true);
  assert.equal(reparsed.detectedSubjects.includes('数学'), true);
  assert.equal(reparsed.detectedSubjects.includes('历史'), true);
});

test('isHomeworkEligibleSubject strictly retains main academic subjects and filters out non-homework timetable items', async () => {
  const {
    isHomeworkEligibleSubject,
    ZONGBEI_7_6_REAL_TIMETABLE_TEXT,
    getTimetableSubjectsForDay,
  } = await import('./studyLogic.ts');

  // Academic homework subjects MUST be eligible
  assert.equal(isHomeworkEligibleSubject('语文'), true);
  assert.equal(isHomeworkEligibleSubject('数学'), true);
  assert.equal(isHomeworkEligibleSubject('英语'), true);
  assert.equal(isHomeworkEligibleSubject('物理'), true);
  assert.equal(isHomeworkEligibleSubject('化学'), true);
  assert.equal(isHomeworkEligibleSubject('生物'), true);
  assert.equal(isHomeworkEligibleSubject('历史'), true);
  assert.equal(isHomeworkEligibleSubject('地理'), true);
  assert.equal(isHomeworkEligibleSubject('道德与法治'), true);
  assert.equal(isHomeworkEligibleSubject('道法'), true);
  assert.equal(isHomeworkEligibleSubject('政治'), true);
  assert.equal(isHomeworkEligibleSubject('科学'), true);
  assert.equal(isHomeworkEligibleSubject('体育锻炼'), true);
  assert.equal(isHomeworkEligibleSubject('体育'), true);

  // Non-homework courses, extension periods, and arts MUST be filtered out
  assert.equal(isHomeworkEligibleSubject('语延'), false);
  assert.equal(isHomeworkEligibleSubject('数延'), false);
  assert.equal(isHomeworkEligibleSubject('英延'), false);
  assert.equal(isHomeworkEligibleSubject('延时'), false);
  assert.equal(isHomeworkEligibleSubject('延时辅导'), false);
  assert.equal(isHomeworkEligibleSubject('延时75'), false);
  assert.equal(isHomeworkEligibleSubject('延时托管'), false);
  assert.equal(isHomeworkEligibleSubject('素质选修'), false);
  assert.equal(isHomeworkEligibleSubject('素选75'), false);
  assert.equal(isHomeworkEligibleSubject('书法'), false);
  assert.equal(isHomeworkEligibleSubject('硬笔书法'), false);
  assert.equal(isHomeworkEligibleSubject('音乐'), false);
  assert.equal(isHomeworkEligibleSubject('美术'), false);
  assert.equal(isHomeworkEligibleSubject('信息技术'), false);
  assert.equal(isHomeworkEligibleSubject('信息科技'), false);
  assert.equal(isHomeworkEligibleSubject('心理健康'), false);
  assert.equal(isHomeworkEligibleSubject('班会'), false);
  assert.equal(isHomeworkEligibleSubject('劳动教育'), false);
  assert.equal(isHomeworkEligibleSubject('课余兴趣'), false);
  assert.equal(isHomeworkEligibleSubject('自主自习'), false);
  assert.equal(isHomeworkEligibleSubject('早读'), false);
  assert.equal(isHomeworkEligibleSubject('午休'), false);

  // Timetable recognition and daily subjects must never return non-homework subjects
  const zongbeiParsed = parseTimetableContent(ZONGBEI_7_6_REAL_TIMETABLE_TEXT);
  assert.ok(!zongbeiParsed.detectedSubjects.includes('语延'));
  assert.ok(!zongbeiParsed.detectedSubjects.includes('英延'));
  assert.ok(!zongbeiParsed.detectedSubjects.includes('数延'));
  assert.ok(!zongbeiParsed.detectedSubjects.includes('延时辅导'));
  assert.ok(!zongbeiParsed.detectedSubjects.includes('书法'));
  assert.ok(!zongbeiParsed.detectedSubjects.includes('音乐'));
  assert.ok(!zongbeiParsed.detectedSubjects.includes('美术'));

  const dailySubjs = getTimetableSubjectsForDay(zongbeiParsed.weeklyGrid, '周三');
  // Wednesday has 書法, 心理, 數延; Thursday has 音樂, 語延
  assert.ok(!dailySubjs.todaySubjects.includes('书法'));
  assert.ok(!dailySubjs.todaySubjects.includes('数延'));
  assert.ok(!dailySubjs.tomorrowSubjects.includes('音乐'));
  assert.ok(!dailySubjs.tomorrowSubjects.includes('语延'));
});

test('getSystemDateInfo, shiftDate, purgeOnlyDemoTasks, and filterTasksBySelectedDate prevent UTC day-shift and preserve user tasks', async () => {
  const {
    getSystemDateInfo,
    shiftDate,
    purgeOnlyDemoTasks,
    filterTasksBySelectedDate,
  } = await import('./studyLogic.ts');

  const todayShifted = shiftDate(new Date(), 0);
  const info = getSystemDateInfo(todayShifted);
  assert.equal(info.dateStr, todayShifted);
  assert.equal(info.isToday, true);

  // Explicit YYYY-MM-DD should never shift back 1 day in negative UTC offsets
  const explicitInfo = getSystemDateInfo('2026-10-20');
  assert.equal(explicitInfo.dateStr, '2026-10-20');
  assert.equal(explicitInfo.displayDate, '10月20日');
  assert.equal(explicitInfo.weekdayName, '周二');

  const tasks: HomeworkTask[] = [
    {
      id: 'task-1',
      subject: '语文',
      subjectBadgeClass: '',
      taskType: '默写',
      title: '示范语文任务',
      estimatedMinutes: 30,
      completed: false,
      isDemo: true,
    },
    {
      id: 'task-user-today',
      subject: '数学',
      subjectBadgeClass: '',
      taskType: '作业练习',
      title: '今日真实数学作业',
      estimatedMinutes: 25,
      completed: false,
      taskDate: '2026-10-20',
    },
    {
      id: 'task-user-yesterday',
      subject: '英语',
      subjectBadgeClass: '',
      taskType: '阅读',
      title: '昨日真实英语作业',
      estimatedMinutes: 20,
      completed: true,
      taskDate: '2026-10-19',
    },
  ];

  const remaining = purgeOnlyDemoTasks(tasks);
  assert.equal(remaining.length, 2);
  assert.equal(remaining.some((t) => t.id === 'task-1'), false);
  assert.equal(remaining.some((t) => t.id === 'task-user-today'), true);

  const todayFiltered = filterTasksBySelectedDate(tasks, '2026-10-20', '2026-10-20', false);
  assert.equal(todayFiltered.length, 2); // task-1 (no taskDate -> defaults to today) + task-user-today
  const yesterdayFiltered = filterTasksBySelectedDate(tasks, '2026-10-19', '2026-10-20', false);
  assert.equal(yesterdayFiltered.length, 1);
  assert.equal(yesterdayFiltered[0].id, 'task-user-yesterday');
});
