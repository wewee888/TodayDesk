import type {
  AttendanceStatus,
  ExamPeriod,
  HomeworkTask,
  MistakeItem,
  ParsedVoiceTask,
  ReviewItem,
  ScheduleFrequencyType,
  SubjectName,
  TimetableDaySchedule,
  TimetableRecognitionResult,
} from '../types/study.ts';

export const SUBJECT_BADGE_MAP: Record<SubjectName, string> = {
  语文: 'bg-primary-fixed/40 text-primary',
  数学: 'bg-secondary-container/50 text-secondary',
  英语: 'bg-tertiary-fixed/40 text-tertiary',
  物理: 'bg-[#EDF4F8] text-[#5B82A6]',
  化学: 'bg-[#F4F1F8] text-[#8C7AA9]',
  历史: 'bg-[#FDF4E3] text-[#B87D5B]',
  道法: 'bg-[#FDECEB] text-[#B4544D]',
  政治: 'bg-[#FDECEB] text-[#B4544D]',
  地理: 'bg-[#EAF5F1] text-[#3B7A67]',
  生物: 'bg-[#EEF6E8] text-[#527D3B]',
  科学: 'bg-[#EBF3FA] text-[#3E6B99]',
  信息科技: 'bg-[#EEF0F8] text-[#556299]',
  体育锻炼: 'bg-secondary-container/70 text-on-secondary-container',
  课余兴趣: 'bg-tertiary-fixed/60 text-on-tertiary-fixed-variant',
  自主自习: 'bg-secondary-container/40 text-on-secondary-container',
};

export const DEFAULT_SUBJECTS: SubjectName[] = [
  '数学',
  '语文',
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
];

export const RECOMMENDED_EXTRA_SUBJECTS: SubjectName[] = [
  '道法',
  '地理',
  '生物',
  '科学',
  '信息科技',
  '政治',
  '奥数',
  '音乐',
  '美术',
  '科创',
];

export function getSubjectBadgeClass(subject: SubjectName): string {
  return (
    SUBJECT_BADGE_MAP[subject] ||
    'bg-primary-fixed/40 text-on-primary-fixed-variant'
  );
}

export function getAttendanceStatusMeta(
  status?: AttendanceStatus,
  leaveNote?: string
): {
  isOnLeaveOrPaused: boolean;
  label: string;
  shortLabel: string;
  badgeClass: string;
  defaultNote: string;
} {
  switch (status) {
    case 'teacher_leave':
      return {
        isOnLeaveOrPaused: true,
        label: '🧑‍🏫 老师请假',
        shortLabel: '老师请假',
        badgeClass: 'bg-[#FFF3E0] text-[#B25E00] border border-[#FFE0B2]',
        defaultNote: leaveNote || '本周老师请假 · 课程顺延或调课',
      };
    case 'student_leave':
      return {
        isOnLeaveOrPaused: true,
        label: '🙋 自己请假',
        shortLabel: '自己请假',
        badgeClass: 'bg-[#FCE8E6] text-[#A5382D] border border-[#FAD2CF]',
        defaultNote: leaveNote || '本次已请假 · 暂免打卡',
      };
    case 'paused':
      return {
        isOnLeaveOrPaused: true,
        label: '⏸️ 阶段暂停',
        shortLabel: '已暂停',
        badgeClass: 'bg-[#ECEAE5] text-[#665E57] border border-[#DCD7CE]',
        defaultNote: leaveNote || '阶段暂停训练 · 可随时恢复',
      };
    default:
      return {
        isOnLeaveOrPaused: false,
        label: '✅ 正常进行',
        shortLabel: '正常',
        badgeClass: 'bg-secondary-container/60 text-on-secondary-container',
        defaultNote: leaveNote || '',
      };
  }
}

export function getScheduleFrequencyBadge(
  scheduleType?: ScheduleFrequencyType,
  scheduleTime?: string
): {
  typeLabel: string;
  fullText: string;
  isFlexible: boolean;
} {
  const isFlexible =
    scheduleType === 'flexible' ||
    Boolean(scheduleTime && scheduleTime.includes('不固定')) ||
    Boolean(scheduleTime && scheduleTime.includes('机动'));
  const timeStr = scheduleTime || (isFlexible ? '机动安排' : '周末固定');
  return {
    typeLabel: isFlexible ? '不固定/机动' : '每周固定',
    fullText: isFlexible ? `机动 · ${timeStr}` : `固定 · ${timeStr}`,
    isFlexible,
  };
}

export const DEFAULT_EXTRACURRICULAR_ACTIVITIES = [
  '练象棋',
  '练钢琴',
  '练小号',
  'Python编程',
  '硬笔书法',
];

export const DEFAULT_PE_EXERCISES = [
  '晚间跳绳',
  '1000m/800m耐力跑',
  '立定跳远',
  '引体/仰卧起坐',
  '篮球绕杆',
  '实心球投掷',
];

export const SUBJECT_TASK_PRESETS: Record<
  SubjectName,
  { taskTypes: string[]; defaultTitles: Record<string, string> }
> = {
  数学: {
    taskTypes: ['错题订正', '作业练习', '试卷测试', '课前预习'],
    defaultTitles: {
      错题订正: '二次函数压轴错题重做与归纳',
      作业练习: '同步练习册函数图像专项精练',
      试卷测试: '学校发卷 · 阶段限时综合小测',
      课前预习: '新课微预习：反比例函数性质导学',
    },
  },
  语文: {
    taskTypes: ['作业练习', '背诵默写', '试卷测试', '课前预习', '错题订正'],
    defaultTitles: {
      作业练习: '文言文实词虚词梳理与导学案',
      背诵默写: '《醉翁亭记》全文背诵与默写自测',
      试卷测试: '现代文阅读理解专项限时卷',
      课前预习: '新课微预习：古诗词鉴赏背景通读',
      错题订正: '病句辨析与古诗文默写易错字订正',
    },
  },
  英语: {
    taskTypes: ['作业练习', '背诵默写', '试卷测试', '错题订正', '课前预习'],
    defaultTitles: {
      作业练习: '完形填空与语篇阅读精读训练',
      背诵默写: 'Unit 5 核心词汇短语听写与朗读',
      试卷测试: '单元测试卷听力与语法综合演练',
      错题订正: '定语从句关系代词错题归档重做',
      课前预习: '课文原声跟读与生词预标注',
    },
  },
  物理: {
    taskTypes: ['课前预习', '作业练习', '试卷测试', '错题订正'],
    defaultTitles: {
      课前预习: '凸透镜成像规律实验探究微预习',
      作业练习: '同步练习册光学作图与计算专项',
      试卷测试: '阶段单元核心考点限时检测卷',
      错题订正: '受力分析与透镜焦距判断错题订正',
    },
  },
  化学: {
    taskTypes: ['课前预习', '背诵默写', '作业练习', '错题订正', '试卷测试'],
    defaultTitles: {
      课前预习: '氧气制取实验装置与步骤预习',
      背诵默写: '常见元素化合价与化学式默写',
      作业练习: '课后同步基础巩固练习册',
      错题订正: '实验现象描述与反应方程式订正',
      试卷测试: '化学单元阶段性综合自测卷',
    },
  },
  历史: {
    taskTypes: ['背诵默写', '课前预习', '作业练习', '错题订正', '试卷测试'],
    defaultTitles: {
      背诵默写: '中国近代史重大事件时间轴梳理背诵',
      课前预习: '新章节历史背景与史料导读',
      作业练习: '材料解析题答题规范专项练习',
      错题订正: '历史时期特征辨析错题订正',
      试卷测试: '单元历史核心素养达标测试卷',
    },
  },
  地理: {
    taskTypes: ['读图填图', '作业练习', '背诵默写', '错题订正', '课前预习'],
    defaultTitles: {
      读图填图: '中国地形气候分布图与等高线读图填图训练',
      作业练习: '地理同步练习册区域地理综合题精练',
      背诵默写: '气候类型特征与地理分界线核心考点背诵',
      错题订正: '经纬网判读与地形剖面图错题订正',
      课前预习: '新章节自然资源与水系分布导学预习',
    },
  },
  生物: {
    taskTypes: ['实验导学', '作业练习', '背诵默写', '错题订正', '试卷测试'],
    defaultTitles: {
      实验导学: '显微镜观察与生物结构图解识记训练',
      作业练习: '生物同步练习册生态系统与遗传专项',
      背诵默写: '人体生理系统与细胞结构核心概念默写',
      错题订正: '对照实验变量分析与识图题错题订正',
      试卷测试: '初中生物会考核心考点阶段小测',
    },
  },
  道法: {
    taskTypes: ['核心背诵', '材料分析', '课前预习', '错题订正', '试卷测试'],
    defaultTitles: {
      核心背诵: '道德与法治单元核心观点与高频金句背诵',
      材料分析: '时政材料评析题答题思路与规范训练',
      课前预习: '新课法治意识与社会责任案例导读',
      错题订正: '选择题概念辨析与主观题漏点订正',
      试卷测试: '道法阶段性开卷/闭卷限时检测',
    },
  },
  政治: {
    taskTypes: ['核心背诵', '材料分析', '课前预习', '错题订正', '试卷测试'],
    defaultTitles: {
      核心背诵: '政治单元核心知识点与答题框架背诵',
      材料分析: '主观材料分析题规范作答训练',
      课前预习: '新课核心概念与背景导学',
      错题订正: '易混概念辨析与错题归纳',
      试卷测试: '阶段综合水平检测卷',
    },
  },
  科学: {
    taskTypes: ['实验探究', '作业练习', '课前预习', '错题订正', '试卷测试'],
    defaultTitles: {
      实验探究: '科学实验探究步骤与现象记录分析',
      作业练习: '科学同步练习册综合应用题精练',
      课前预习: '新章节科学原理与生活现象微预习',
      错题订正: '科学计算与实验探究题错题重做',
      试卷测试: '科学单元综合能力测试卷',
    },
  },
  信息科技: {
    taskTypes: ['编程实操', '作业练习', '课前预习', '操作自测'],
    defaultTitles: {
      编程实操: 'Python 算法流程图与代码调试练习',
      作业练习: '信息科技基础概念与网络原理同步练习',
      课前预习: '新课数据结构与算法逻辑导读',
      操作自测: '上机实操题综合演练',
    },
  },
  体育锻炼: {
    taskTypes: DEFAULT_PE_EXERCISES,
    defaultTitles: {
      晚间跳绳: '晚间中考跳绳 3组×1分钟计时冲刺 + 小腿拉伸',
      '1000m/800m耐力跑': '晚间耐力跑配速呼吸训练 + 赛后放松',
      立定跳远: '中考立定跳远摆臂起跳爆发力训练 15次',
      '引体/仰卧起坐': '引体向上/1分钟仰卧起坐上肢与核心力量打卡',
      篮球绕杆: '中考体育篮球往返运球绕杆计时练习',
      实心球投掷: '双手头上前掷实心球满弓发力动作定型',
    },
  },
  课余兴趣: {
    taskTypes: DEFAULT_EXTRACURRICULAR_ACTIVITIES,
    defaultTitles: {
      练象棋: '周末象棋残局复盘与战术对弈练习',
      练钢琴: '钢琴曲目分段慢练与全曲连奏训练',
      练小号: '小号长音气息控制与练习曲吹奏',
      Python编程: 'Python 趣味算法与项目实操',
      硬笔书法: '行楷字帖临摹与静心练字',
    },
  },
  自主自习: {
    taskTypes: ['错题订正', '课前预习', '作业练习', '试卷测试'],
    defaultTitles: {
      错题订正: '本周各科重点错题清账与复盘',
      课前预习: '明日主科新课重点内容自主预习',
      作业练习: '晚自习自主查漏补缺专项巩固',
      试卷测试: '周末全真限时模拟自测',
    },
  },
};

export function getTaskPresetsForSubject(
  subject: SubjectName,
  customActivities?: string[],
  customPeExercises?: string[]
): {
  taskTypes: string[];
  defaultTitles: Record<string, string>;
} {
  if (subject === '课余兴趣' && customActivities && customActivities.length > 0) {
    const dynamicTitles: Record<string, string> = {
      ...SUBJECT_TASK_PRESETS['课余兴趣'].defaultTitles,
    };
    for (const act of customActivities) {
      if (!dynamicTitles[act]) {
        dynamicTitles[act] = `课余活动 · ${act}专注练习`;
      }
    }
    return {
      taskTypes: customActivities,
      defaultTitles: dynamicTitles,
    };
  }

  if (subject === '体育锻炼' && customPeExercises && customPeExercises.length > 0) {
    const dynamicPeTitles: Record<string, string> = {
      ...SUBJECT_TASK_PRESETS['体育锻炼'].defaultTitles,
    };
    for (const ex of customPeExercises) {
      if (!dynamicPeTitles[ex]) {
        dynamicPeTitles[ex] = `中考体育与晚间运动 · ${ex}专项锻炼`;
      }
    }
    return {
      taskTypes: customPeExercises,
      defaultTitles: dynamicPeTitles,
    };
  }

  if (SUBJECT_TASK_PRESETS[subject]) {
    return SUBJECT_TASK_PRESETS[subject];
  }

  return {
    taskTypes: ['作业练习', '背诵默写', '课前预习', '错题订正', '试卷测试'],
    defaultTitles: {
      作业练习: `${subject}同步作业与课后专项巩固`,
      背诵默写: `${subject}核心知识点背诵与默写自测`,
      课前预习: `${subject}新章节核心要点微预习`,
      错题订正: `${subject}阶段错题重做与归纳`,
      试卷测试: `${subject}单元综合能力限时自测`,
    },
  };
}

export function buildTaskTitle(
  subject: SubjectName,
  taskType: string,
  customActivities?: string[],
  customPeExercises?: string[]
): string {
  const presets = getTaskPresetsForSubject(
    subject,
    customActivities,
    customPeExercises
  );
  return presets.defaultTitles[taskType] || `${subject} · ${taskType}专项任务`;
}

export function clampTaskDuration(minutes: number): number {
  if (Number.isNaN(minutes)) return 30;
  return Math.min(Math.max(Math.round(minutes), 5), 240);
}

export function calculateDeskSummary(tasks: HomeworkTask[]): {
  totalCount: number;
  completedCount: number;
  remainingCount: number;
  totalMinutes: number;
  completedMinutes: number;
  remainingMinutes: number;
} {
  const totalCount = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed);
  const completedCount = completedTasks.length;
  const remainingCount = totalCount - completedCount;

  const totalMinutes = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  const completedMinutes = completedTasks.reduce(
    (sum, t) => sum + t.estimatedMinutes,
    0
  );
  const remainingMinutes = totalMinutes - completedMinutes;

  return {
    totalCount,
    completedCount,
    remainingCount,
    totalMinutes,
    completedMinutes,
    remainingMinutes,
  };
}

export function resolveReviewStatus(
  items: ReviewItem[],
  id: string,
  status: ReviewItem['status'],
  mistakeTag?: ReviewItem['mistakeTag'],
  hasPhoto?: boolean
): {
  updatedItems: ReviewItem[];
  pendingCount: number;
  allResolved: boolean;
} {
  const updatedItems = items.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      status,
      mistakeTag: mistakeTag ?? item.mistakeTag,
      hasPhoto: hasPhoto ?? item.hasPhoto,
    };
  });
  const pendingCount = updatedItems.filter((i) => i.status === 'pending').length;
  return {
    updatedItems,
    pendingCount,
    allResolved: pendingCount === 0,
  };
}

export function clearMistakeItem(
  mistakes: MistakeItem[],
  id: string,
  baseClearedCount = 5
): {
  updatedMistakes: MistakeItem[];
  remainingCount: number;
  totalClearedCount: number;
} {
  const updatedMistakes = mistakes.map((m) =>
    m.id === id ? { ...m, cleared: true } : m
  );
  const newlyCleared = updatedMistakes.filter((m) => m.cleared).length;
  const remainingCount = updatedMistakes.filter((m) => !m.cleared).length;
  return {
    updatedMistakes,
    remainingCount,
    totalClearedCount: baseClearedCount + newlyCleared,
  };
}

/**
 * Deterministic natural-language parser for student/parent voice inputs.
 * Supports academic subjects, middle school PE exam exercises (跳绳, 跑步, 立定跳远, 引体向上, etc.),
 * extracurricular activities (象棋, 钢琴, 小号, etc.), and extended durations > 90 minutes (up to 240 minutes).
 */
export function parseVoiceCommandLocal(rawText: string): ParsedVoiceTask[] {
  const cleaned = rawText.trim();
  if (!cleaned) return [];

  const segments = cleaned
    .split(/[，,；;。！!\n]|(?:还有)|(?:以及)|(?:然后)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const results: ParsedVoiceTask[] = [];

  for (const seg of segments) {
    let subject: SubjectName = '数学';
    let taskType = '作业练习';
    let category: '作业' | '预习' | '体育' | '兴趣' = '作业';

    // 1. Detect PE exam exercises first
    if (
      seg.includes('体育') ||
      seg.includes('跳绳') ||
      seg.includes('跑步') ||
      seg.includes('耐力跑') ||
      seg.includes('1000米') ||
      seg.includes('800米') ||
      seg.includes('立定跳远') ||
      seg.includes('引体向上') ||
      seg.includes('仰卧起坐') ||
      seg.includes('实心球') ||
      seg.includes('绕杆') ||
      seg.includes('排球')
    ) {
      subject = '体育锻炼';
      category = '体育';
      if (seg.includes('跳绳')) taskType = '晚间跳绳';
      else if (
        seg.includes('跑') ||
        seg.includes('1000') ||
        seg.includes('800')
      ) {
        taskType = '1000m/800m耐力跑';
      } else if (seg.includes('跳远')) taskType = '立定跳远';
      else if (seg.includes('引体') || seg.includes('仰卧起坐')) {
        taskType = '引体/仰卧起坐';
      } else if (seg.includes('实心球')) taskType = '实心球投掷';
      else if (seg.includes('绕杆') || seg.includes('篮球')) {
        taskType = '篮球绕杆';
      } else {
        taskType = '晚间跳绳';
      }
    } else if (
      seg.includes('象棋') ||
      seg.includes('钢琴') ||
      seg.includes('小号') ||
      seg.includes('围棋') ||
      seg.includes('小提琴') ||
      seg.includes('书法') ||
      seg.includes('编程')
    ) {
      subject = '课余兴趣';
      category = '兴趣';
      if (seg.includes('象棋')) taskType = '练象棋';
      else if (seg.includes('钢琴')) taskType = '练钢琴';
      else if (seg.includes('小号')) taskType = '练小号';
      else if (seg.includes('编程')) taskType = 'Python编程';
      else if (seg.includes('书法')) taskType = '硬笔书法';
      else taskType = '课余活动练习';
    } else if (
      seg.includes('语文') ||
      seg.includes('古诗') ||
      seg.includes('文言文') ||
      seg.includes('作文')
    ) {
      subject = '语文';
    } else if (
      seg.includes('数学') ||
      seg.includes('几何') ||
      seg.includes('函数') ||
      seg.includes('奥数')
    ) {
      subject = '数学';
    } else if (
      seg.includes('英语') ||
      seg.includes('单词') ||
      seg.includes('完形') ||
      seg.includes('听力')
    ) {
      subject = '英语';
    } else if (
      seg.includes('物理') ||
      seg.includes('光学') ||
      seg.includes('力学') ||
      seg.includes('透镜')
    ) {
      subject = '物理';
    } else if (
      seg.includes('化学') ||
      seg.includes('方程式') ||
      seg.includes('元素')
    ) {
      subject = '化学';
    } else if (seg.includes('历史') || seg.includes('近代史')) {
      subject = '历史';
    } else if (seg.includes('自习')) {
      subject = '自主自习';
    }

    if (subject !== '课余兴趣' && subject !== '体育锻炼') {
      if (seg.includes('预习')) {
        taskType = '课前预习';
        category = '预习';
      } else if (seg.includes('卷') || seg.includes('测') || seg.includes('考')) {
        taskType = '试卷测试';
      } else if (
        seg.includes('背') ||
        seg.includes('默写') ||
        seg.includes('朗读') ||
        seg.includes('单词')
      ) {
        taskType = '背诵默写';
      } else if (
        seg.includes('错题') ||
        seg.includes('订正') ||
        seg.includes('重做')
      ) {
        taskType = '错题订正';
      } else if (
        seg.includes('练习册') ||
        seg.includes('导学案') ||
        seg.includes('精练')
      ) {
        taskType = '作业练习';
      }
    }

    // Detect minutes (supporting > 90m up to 240m)
    let minutes = subject === '体育锻炼' ? 20 : 30;
    const twoHourMatch = seg.match(/(?:两个小时|两小时|2\s*小时)/);
    const oneAndHalfHourMatch = seg.match(/(?:一个半小时|1\.5\s*小时)/);
    const oneHourMatch = seg.match(/(?:一个小时|一小时|1\s*小时|60\s*分钟|60\s*m)/i);
    const halfHourMatch = seg.match(/(?:半个小时|半小时|30\s*分钟|30\s*m)/i);
    const numMinMatch = seg.match(/(\d+)\s*(?:分钟|分|min|m)/i);

    if (twoHourMatch) {
      minutes = 120;
    } else if (oneAndHalfHourMatch) {
      minutes = 90;
    } else if (oneHourMatch) {
      minutes = 60;
    } else if (halfHourMatch) {
      minutes = 30;
    } else if (numMinMatch) {
      const parsed = parseInt(numMinMatch[1], 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        minutes = clampTaskDuration(parsed);
      }
    }

    let title = buildTaskTitle(subject, taskType);
    if (subject === '课余兴趣' || subject === '体育锻炼') {
      title = buildTaskTitle(subject, taskType);
    } else if (seg.includes('第三章')) {
      title = `${subject}第三章新课核心概念微预习`;
    } else if (seg.includes('岳阳楼记')) {
      title = '《岳阳楼记》全文背诵与默写自测';
    } else if (seg.includes('卷子') || seg.includes('试卷')) {
      title = `${subject}阶段综合冲刺试卷 1 套`;
    } else if (seg.includes('背诵') || seg.includes('单词')) {
      title = `${subject}重点篇目/核心词汇背诵默写`;
    }

    results.push({
      category,
      subject,
      taskType,
      title,
      estimatedMinutes: minutes,
      statusNote:
        category === '体育'
          ? '中考体能打卡'
          : category === '兴趣'
          ? '课余素养打卡'
          : category === '预习'
          ? '已完成微预习'
          : '待次日回填',
    });
  }

  return results;
}

export const DEFAULT_POMODORO_SECONDS = 25 * 60;

export function formatPomodoroTime(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function calculatePomodoroProgress(
  remainingSeconds: number,
  totalSeconds: number = DEFAULT_POMODORO_SECONDS
): number {
  if (totalSeconds <= 0) return 100;
  const elapsed = Math.max(0, totalSeconds - Math.max(0, remainingSeconds));
  return Math.min(100, Math.round((elapsed / totalSeconds) * 100));
}

const KNOWN_TIMETABLE_SUBJECTS: {
  keyword: string;
  normalized: SubjectName;
  isAcademic: boolean;
}[] = [
  { keyword: '语文', normalized: '语文', isAcademic: true },
  { keyword: '数学', normalized: '数学', isAcademic: true },
  { keyword: '英语', normalized: '英语', isAcademic: true },
  { keyword: '外语', normalized: '英语', isAcademic: true },
  { keyword: '物理', normalized: '物理', isAcademic: true },
  { keyword: '化学', normalized: '化学', isAcademic: true },
  { keyword: '历史', normalized: '历史', isAcademic: true },
  { keyword: '地理', normalized: '地理', isAcademic: true },
  { keyword: '生物', normalized: '生物', isAcademic: true },
  { keyword: '道法', normalized: '道法', isAcademic: true },
  { keyword: '道德与法治', normalized: '道法', isAcademic: true },
  { keyword: '政治', normalized: '政治', isAcademic: true },
  { keyword: '科学', normalized: '科学', isAcademic: true },
  { keyword: '信息', normalized: '信息科技', isAcademic: false },
  { keyword: '微机', normalized: '信息科技', isAcademic: false },
  { keyword: '编程', normalized: '信息科技', isAcademic: false },
  { keyword: '体育', normalized: '体育锻炼', isAcademic: false },
  { keyword: '美术', normalized: '美术', isAcademic: false },
  { keyword: '音乐', normalized: '音乐', isAcademic: false },
];

export function parseTimetableContent(
  rawText: string,
  sourceName = '本学期课程表',
  gradePreset: 'grade7' | 'grade8' | 'grade9' = 'grade8'
): TimetableRecognitionResult {
  const text = String(rawText || '').trim();
  const detectedAcademic = new Set<SubjectName>();
  const detectedExtra = new Set<SubjectName>();

  for (const item of KNOWN_TIMETABLE_SUBJECTS) {
    if (text.includes(item.keyword)) {
      if (item.isAcademic) {
        detectedAcademic.add(item.normalized);
      } else {
        detectedExtra.add(item.normalized);
      }
    }
  }

  // If no explicit keywords matched (e.g., binary image upload without OCR text), use grade-appropriate full curriculum
  if (detectedAcademic.size === 0) {
    if (gradePreset === 'grade7') {
      ['语文', '数学', '英语', '历史', '地理', '生物', '道法'].forEach((s) =>
        detectedAcademic.add(s)
      );
    } else if (gradePreset === 'grade9') {
      ['语文', '数学', '英语', '物理', '化学', '历史', '道法'].forEach((s) =>
        detectedAcademic.add(s)
      );
    } else {
      ['语文', '数学', '英语', '物理', '历史', '地理', '生物', '道法'].forEach(
        (s) => detectedAcademic.add(s)
      );
    }
    ['体育锻炼', '信息科技', '美术', '音乐'].forEach((s) =>
      detectedExtra.add(s)
    );
  }

  const academicSubjects = Array.from(detectedAcademic);
  const extraSubjects = Array.from(detectedExtra);
  const detectedSubjects = Array.from(
    new Set([...academicSubjects, ...extraSubjects])
  );

  // Build a realistic 5-day x 7-period timetable grid from the detected subjects
  const pool =
    academicSubjects.length > 0
      ? academicSubjects
      : ['语文', '数学', '英语', '物理', '历史', '地理', '生物', '道法'];
  const days: ('周一' | '周二' | '周三' | '周四' | '周五')[] = [
    '周一',
    '周二',
    '周三',
    '周四',
    '周五',
  ];

  const weeklyGrid: TimetableDaySchedule[] = days.map((day, dIdx) => {
    const periods: SubjectName[] = [];
    for (let p = 0; p < 7; p++) {
      if (p === 4 && dIdx % 2 === 0) {
        periods.push('体育锻炼');
      } else if (p === 6 && dIdx === 2 && extraSubjects.includes('信息科技')) {
        periods.push('信息科技');
      } else if (p === 6 && dIdx === 4 && extraSubjects.includes('美术')) {
        periods.push('美术');
      } else {
        periods.push(pool[(dIdx * 3 + p) % pool.length]);
      }
    }
    return { day, periods };
  });

  const semesterLabel =
    gradePreset === 'grade7'
      ? '初一学年 · 7门文化课全科课表'
      : gradePreset === 'grade9'
      ? '初三冲刺 · 语数英物化历道法课表'
      : '初二学年 · 语数英物历地生道法全科课表';

  return {
    semesterLabel,
    detectedSubjects,
    academicSubjects,
    extraSubjects,
    weeklyGrid,
    sourceName,
  };
}

export type SchoolExamScheduleMode =
  | 'monthly_and_major'
  | 'major_only'
  | 'with_prep';

/**
 * Generates smart exam periods based on calendar month and school exam mode:
 * - 'monthly_and_major': Automatically adapts monthly exam to current month (e.g. 10月 -> 10月月考, 11月 -> 11月月考) + 期中考试 + 期末考试
 * - 'major_only': For schools without monthly exams or without 期中预备 (goes straight from 日常单元测 to 期中考试 & 期末考试)
 * - 'with_prep': For schools that include a pre-midterm warm-up (期中预备 -> 期中考试 -> 期末考试)
 */
export function buildSmartExamPeriods(
  currentMonth: number = new Date().getMonth() + 1,
  mode: SchoolExamScheduleMode = 'monthly_and_major'
): ExamPeriod[] {
  const safeMonth = Math.min(Math.max(Math.round(currentMonth) || 10, 1), 12);
  if (mode === 'major_only') {
    return ['日常单元测', '期中考试', '期末考试', '中考模拟'];
  }
  if (mode === 'with_prep') {
    return [
      '周考',
      `${safeMonth}月月考`,
      '期中预备',
      '期中考试',
      '期末考试',
      '中考模拟',
    ];
  }
  return ['周考', `${safeMonth}月月考`, '期中考试', '期末考试', '中考模拟'];
}

export function resolveRecommendedExamPeriod(
  currentMonth: number = new Date().getMonth() + 1,
  mode: SchoolExamScheduleMode = 'monthly_and_major'
): ExamPeriod {
  const safeMonth = Math.min(Math.max(Math.round(currentMonth) || 10, 1), 12);
  if (mode === 'major_only') {
    if (safeMonth === 1 || safeMonth === 6 || safeMonth === 7) {
      return '期末考试';
    }
    return '期中考试';
  }
  if (safeMonth === 1 || safeMonth === 6 || safeMonth === 7) {
    return '期末考试';
  }
  return `${safeMonth}月月考`;
}

export interface TeacherAllCorrectSyncSummary {
  totalTasks: number;
  allCorrectCount: number;
  allCorrectRate: number;
  verifiedSubjects: SubjectName[];
  verifiedTasks: HomeworkTask[];
  weeklySyncHeadline: string;
}

export function toggleTaskTeacherAllCorrect(
  tasks: HomeworkTask[],
  taskId: string
): {
  updatedTasks: HomeworkTask[];
  targetTask?: HomeworkTask;
  isNowAllCorrect: boolean;
} {
  let targetTask: HomeworkTask | undefined;
  let isNowAllCorrect = false;

  const updatedTasks = tasks.map((task) => {
    if (task.id !== taskId) return task;
    isNowAllCorrect = !task.isAllCorrect;
    const updated: HomeworkTask = {
      ...task,
      isAllCorrect: isNowAllCorrect,
      accuracyNote: isNowAllCorrect
        ? '老师核对：全对 · 已同步至学情周报'
        : undefined,
    };
    targetTask = updated;
    return updated;
  });

  return {
    updatedTasks,
    targetTask,
    isNowAllCorrect,
  };
}

export function computeTeacherAllCorrectSyncSummary(
  tasks: HomeworkTask[]
): TeacherAllCorrectSyncSummary {
  const totalTasks = tasks.length;
  const verifiedTasks = tasks.filter((t) => Boolean(t.isAllCorrect));
  const allCorrectCount = verifiedTasks.length;
  const allCorrectRate =
    totalTasks > 0 ? Math.round((allCorrectCount / totalTasks) * 100) : 0;
  const verifiedSubjects = Array.from(
    new Set(verifiedTasks.map((t) => t.subject))
  );

  const weeklySyncHeadline =
    allCorrectCount > 0
      ? `今日家长已核对记录 ${allCorrectCount}/${totalTasks} 项「老师核对：全对」（${verifiedSubjects.join(
          '、'
        )}），今日核对全对率 ${allCorrectRate}%，已实时同步至本周学情周报。`
      : `今日共 ${totalTasks} 项作业待核对，家长勾选「老师核对：全对」后将实时同步至学情周报。`;

  return {
    totalTasks,
    allCorrectCount,
    allCorrectRate,
    verifiedSubjects,
    verifiedTasks,
    weeklySyncHeadline,
  };
}



