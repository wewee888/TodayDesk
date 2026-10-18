import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_POMODORO_SECONDS,
  buildSmartExamPeriods,
  calculateDeskSummary,
  calculatePomodoroProgress,
  clampTaskDuration,
  clearMistakeItem,
  formatPomodoroTime,
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


