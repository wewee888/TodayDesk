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

export interface SubjectMeta {
  label: SubjectName;
  icon: string;
  iconColorClass: string;
  badgeClass: string;
  isAcademic: boolean;
  category: '主科' | '理科' | '文科' | '技术' | '艺术' | '体健' | '实践' | '兴趣' | '自习';
}

export const SUBJECT_CATALOG: Record<string, SubjectMeta> = {
  // 1. 基础主科 (中考/高考核心)
  语文: {
    label: '语文',
    icon: 'stylus_note',
    iconColorClass: 'text-primary',
    badgeClass: 'bg-primary-fixed/40 text-primary',
    isAcademic: true,
    category: '主科',
  },
  数学: {
    label: '数学',
    icon: 'square_foot',
    iconColorClass: 'text-secondary',
    badgeClass: 'bg-secondary-container/50 text-secondary',
    isAcademic: true,
    category: '主科',
  },
  英语: {
    label: '英语',
    icon: 'translate',
    iconColorClass: 'text-tertiary',
    badgeClass: 'bg-tertiary-fixed/40 text-tertiary',
    isAcademic: true,
    category: '主科',
  },
  外语: {
    label: '外语',
    icon: 'translate',
    iconColorClass: 'text-tertiary',
    badgeClass: 'bg-tertiary-fixed/40 text-tertiary',
    isAcademic: true,
    category: '主科',
  },
  日语: {
    label: '日语',
    icon: 'temple_buddhist',
    iconColorClass: 'text-[#C71585]',
    badgeClass: 'bg-[#FFF0F5] text-[#C71585]',
    isAcademic: true,
    category: '主科',
  },
  俄语: {
    label: '俄语',
    icon: 'language',
    iconColorClass: 'text-[#4169E1]',
    badgeClass: 'bg-[#F0F8FF] text-[#4169E1]',
    isAcademic: true,
    category: '主科',
  },

  // 2. 自然科学/理科组 (初中与高中选考)
  物理: {
    label: '物理',
    icon: 'electric_bolt',
    iconColorClass: 'text-[#5B82A6]',
    badgeClass: 'bg-[#EDF4F8] text-[#5B82A6]',
    isAcademic: true,
    category: '理科',
  },
  化学: {
    label: '化学',
    icon: 'science',
    iconColorClass: 'text-[#8C7AA9]',
    badgeClass: 'bg-[#F4F1F8] text-[#8C7AA9]',
    isAcademic: true,
    category: '理科',
  },
  生物: {
    label: '生物',
    icon: 'biotech',
    iconColorClass: 'text-[#527D3B]',
    badgeClass: 'bg-[#EEF6E8] text-[#527D3B]',
    isAcademic: true,
    category: '理科',
  },
  科学: {
    label: '科学',
    icon: 'experiment',
    iconColorClass: 'text-[#3E6B99]',
    badgeClass: 'bg-[#EBF3FA] text-[#3E6B99]',
    isAcademic: true,
    category: '理科',
  },

  // 3. 人文社科/文科组 (初中与高中选考)
  历史: {
    label: '历史',
    icon: 'history_edu',
    iconColorClass: 'text-[#B87D5B]',
    badgeClass: 'bg-[#FDF4E3] text-[#B87D5B]',
    isAcademic: true,
    category: '文科',
  },
  地理: {
    label: '地理',
    icon: 'public',
    iconColorClass: 'text-[#3B7A67]',
    badgeClass: 'bg-[#EAF5F1] text-[#3B7A67]',
    isAcademic: true,
    category: '文科',
  },
  道法: {
    label: '道法',
    icon: 'gavel',
    iconColorClass: 'text-[#B4544D]',
    badgeClass: 'bg-[#FDECEB] text-[#B4544D]',
    isAcademic: true,
    category: '文科',
  },
  道德与法治: {
    label: '道德与法治',
    icon: 'gavel',
    iconColorClass: 'text-[#B4544D]',
    badgeClass: 'bg-[#FDECEB] text-[#B4544D]',
    isAcademic: true,
    category: '文科',
  },
  政治: {
    label: '政治',
    icon: 'policy',
    iconColorClass: 'text-[#B4544D]',
    badgeClass: 'bg-[#FDECEB] text-[#B4544D]',
    isAcademic: true,
    category: '文科',
  },
  思想政治: {
    label: '思想政治',
    icon: 'policy',
    iconColorClass: 'text-[#B4544D]',
    badgeClass: 'bg-[#FDECEB] text-[#B4544D]',
    isAcademic: true,
    category: '文科',
  },

  // 4. 新高考技术与综合工程选考
  信息科技: {
    label: '信息科技',
    icon: 'terminal',
    iconColorClass: 'text-[#556299]',
    badgeClass: 'bg-[#EEF0F8] text-[#556299]',
    isAcademic: true,
    category: '技术',
  },
  信息技术: {
    label: '信息技术',
    icon: 'terminal',
    iconColorClass: 'text-[#556299]',
    badgeClass: 'bg-[#EEF0F8] text-[#556299]',
    isAcademic: true,
    category: '技术',
  },
  计算机: {
    label: '计算机',
    icon: 'laptop_mac',
    iconColorClass: 'text-[#556299]',
    badgeClass: 'bg-[#EEF0F8] text-[#556299]',
    isAcademic: true,
    category: '技术',
  },
  通用技术: {
    label: '通用技术',
    icon: 'precision_manufacturing',
    iconColorClass: 'text-[#546E7A]',
    badgeClass: 'bg-[#ECEFF1] text-[#546E7A]',
    isAcademic: true,
    category: '技术',
  },

  // 5. 艺术美育与书法
  音乐: {
    label: '音乐',
    icon: 'music_note',
    iconColorClass: 'text-[#C2185B]',
    badgeClass: 'bg-[#FCE4EC] text-[#C2185B]',
    isAcademic: false,
    category: '艺术',
  },
  美术: {
    label: '美术',
    icon: 'palette',
    iconColorClass: 'text-[#E65100]',
    badgeClass: 'bg-[#FFF3E0] text-[#E65100]',
    isAcademic: false,
    category: '艺术',
  },
  艺术: {
    label: '艺术',
    icon: 'palette',
    iconColorClass: 'text-[#E65100]',
    badgeClass: 'bg-[#FFF3E0] text-[#E65100]',
    isAcademic: false,
    category: '艺术',
  },
  书法: {
    label: '书法',
    icon: 'draw',
    iconColorClass: 'text-[#5D4037]',
    badgeClass: 'bg-[#EFEBE9] text-[#5D4037]',
    isAcademic: false,
    category: '艺术',
  },

  // 6. 体育锻炼与身心健康 (中考体育计入总分)
  体育锻炼: {
    label: '体育锻炼',
    icon: 'directions_run',
    iconColorClass: 'text-secondary',
    badgeClass: 'bg-secondary-container/70 text-on-secondary-container',
    isAcademic: true,
    category: '体健',
  },
  体育: {
    label: '体育',
    icon: 'directions_run',
    iconColorClass: 'text-secondary',
    badgeClass: 'bg-secondary-container/70 text-on-secondary-container',
    isAcademic: true,
    category: '体健',
  },
  心理健康: {
    label: '心理健康',
    icon: 'psychology',
    iconColorClass: 'text-[#7B1FA2]',
    badgeClass: 'bg-[#F3E5F5] text-[#7B1FA2]',
    isAcademic: false,
    category: '体健',
  },
  心理: {
    label: '心理',
    icon: 'psychology',
    iconColorClass: 'text-[#7B1FA2]',
    badgeClass: 'bg-[#F3E5F5] text-[#7B1FA2]',
    isAcademic: false,
    category: '体健',
  },

  // 7. 劳动实践与综合研学
  劳动: {
    label: '劳动',
    icon: 'handyman',
    iconColorClass: 'text-[#33691E]',
    badgeClass: 'bg-[#F1F8E9] text-[#33691E]',
    isAcademic: false,
    category: '实践',
  },
  劳动教育: {
    label: '劳动教育',
    icon: 'handyman',
    iconColorClass: 'text-[#33691E]',
    badgeClass: 'bg-[#F1F8E9] text-[#33691E]',
    isAcademic: false,
    category: '实践',
  },
  综合实践: {
    label: '综合实践',
    icon: 'explore',
    iconColorClass: 'text-[#00695C]',
    badgeClass: 'bg-[#E0F2F1] text-[#00695C]',
    isAcademic: false,
    category: '实践',
  },

  // 8. 拔尖竞赛与科创
  奥数: {
    label: '奥数',
    icon: 'functions',
    iconColorClass: 'text-[#FF8F00]',
    badgeClass: 'bg-[#FFF8E1] text-[#FF8F00]',
    isAcademic: true,
    category: '主科',
  },
  科创: {
    label: '科创',
    icon: 'smart_toy',
    iconColorClass: 'text-[#0277BD]',
    badgeClass: 'bg-[#E1F5FE] text-[#0277BD]',
    isAcademic: false,
    category: '实践',
  },
  机器人: {
    label: '机器人',
    icon: 'smart_toy',
    iconColorClass: 'text-[#0277BD]',
    badgeClass: 'bg-[#E1F5FE] text-[#0277BD]',
    isAcademic: false,
    category: '实践',
  },
  编程: {
    label: '编程',
    icon: 'code',
    iconColorClass: 'text-[#0288D1]',
    badgeClass: 'bg-[#E1F5FE] text-[#0288D1]',
    isAcademic: true,
    category: '技术',
  },
  航模: {
    label: '航模',
    icon: 'flight',
    iconColorClass: 'text-[#0277BD]',
    badgeClass: 'bg-[#E1F5FE] text-[#0277BD]',
    isAcademic: false,
    category: '实践',
  },

  // 9. 中高考专项与特色学科
  体育中考: {
    label: '体育中考',
    icon: 'directions_run',
    iconColorClass: 'text-secondary',
    badgeClass: 'bg-secondary-container/70 text-on-secondary-container',
    isAcademic: true,
    category: '体健',
  },
  生物学: {
    label: '生物学',
    icon: 'biotech',
    iconColorClass: 'text-[#527D3B]',
    badgeClass: 'bg-[#EEF6E8] text-[#527D3B]',
    isAcademic: true,
    category: '理科',
  },
  阅读: {
    label: '阅读',
    icon: 'menu_book',
    iconColorClass: 'text-[#6D4C41]',
    badgeClass: 'bg-[#EFEBE9] text-[#6D4C41]',
    isAcademic: true,
    category: '主科',
  },
  名著阅读: {
    label: '名著阅读',
    icon: 'auto_stories',
    iconColorClass: 'text-[#6D4C41]',
    badgeClass: 'bg-[#EFEBE9] text-[#6D4C41]',
    isAcademic: true,
    category: '主科',
  },
  作文: {
    label: '作文',
    icon: 'stylus_note',
    iconColorClass: 'text-primary',
    badgeClass: 'bg-primary-fixed/40 text-primary',
    isAcademic: true,
    category: '主科',
  },
  法语: {
    label: '法语',
    icon: 'language',
    iconColorClass: 'text-[#1E88E5]',
    badgeClass: 'bg-[#E3F2FD] text-[#1E88E5]',
    isAcademic: true,
    category: '主科',
  },
  德语: {
    label: '德语',
    icon: 'language',
    iconColorClass: 'text-[#F57C00]',
    badgeClass: 'bg-[#FFF3E0] text-[#F57C00]',
    isAcademic: true,
    category: '主科',
  },
  西班牙语: {
    label: '西班牙语',
    icon: 'language',
    iconColorClass: 'text-[#E64A19]',
    badgeClass: 'bg-[#FBE9E7] text-[#E64A19]',
    isAcademic: true,
    category: '主科',
  },
  健康教育: {
    label: '健康教育',
    icon: 'health_and_safety',
    iconColorClass: 'text-[#2E7D32]',
    badgeClass: 'bg-[#E8F5E9] text-[#2E7D32]',
    isAcademic: false,
    category: '体健',
  },
  研学实践: {
    label: '研学实践',
    icon: 'explore',
    iconColorClass: 'text-[#00838F]',
    badgeClass: 'bg-[#E0F7FA] text-[#00838F]',
    isAcademic: false,
    category: '实践',
  },

  // 10. 自主自律与课余专栏
  自主自习: {
    label: '自主自习',
    icon: 'self_improvement',
    iconColorClass: 'text-secondary',
    badgeClass: 'bg-secondary-container/40 text-on-secondary-container',
    isAcademic: false,
    category: '自习',
  },
  课余兴趣: {
    label: '课余兴趣',
    icon: 'interests',
    iconColorClass: 'text-tertiary',
    badgeClass: 'bg-tertiary-fixed/60 text-on-tertiary-fixed-variant',
    isAcademic: false,
    category: '兴趣',
  },
};

/**
 * 智能获取任意初高中学科的图标、颜色与徽章样式 (支持模糊推断与智能兜底)
 */
export function getSubjectMeta(subject: string): SubjectMeta {
  const trimmed = String(subject || '').trim();
  if (SUBJECT_CATALOG[trimmed]) {
    return SUBJECT_CATALOG[trimmed];
  }

  // 智能模糊匹配关键词
  if (trimmed.includes('语') || trimmed.includes('文') || trimmed.includes('阅读') || trimmed.includes('作文')) {
    return {
      label: trimmed,
      icon: 'stylus_note',
      iconColorClass: 'text-primary',
      badgeClass: 'bg-primary-fixed/40 text-primary',
      isAcademic: true,
      category: '主科',
    };
  }
  if (trimmed.includes('数') || trimmed.includes('算') || trimmed.includes('几') || trimmed.includes('代')) {
    return {
      label: trimmed,
      icon: 'square_foot',
      iconColorClass: 'text-secondary',
      badgeClass: 'bg-secondary-container/50 text-secondary',
      isAcademic: true,
      category: '主科',
    };
  }
  if (trimmed.includes('英') || trimmed.includes('语') || trimmed.includes('译') || trimmed.includes('日') || trimmed.includes('俄') || trimmed.includes('德') || trimmed.includes('法')) {
    return {
      label: trimmed,
      icon: 'translate',
      iconColorClass: 'text-tertiary',
      badgeClass: 'bg-tertiary-fixed/40 text-tertiary',
      isAcademic: true,
      category: '主科',
    };
  }
  if (trimmed.includes('物') || trimmed.includes('力') || trimmed.includes('电') || trimmed.includes('光')) {
    return {
      label: trimmed,
      icon: 'electric_bolt',
      iconColorClass: 'text-[#5B82A6]',
      badgeClass: 'bg-[#EDF4F8] text-[#5B82A6]',
      isAcademic: true,
      category: '理科',
    };
  }
  if (trimmed.includes('化') || trimmed.includes('剂') || trimmed.includes('试')) {
    return {
      label: trimmed,
      icon: 'science',
      iconColorClass: 'text-[#8C7AA9]',
      badgeClass: 'bg-[#F4F1F8] text-[#8C7AA9]',
      isAcademic: true,
      category: '理科',
    };
  }
  if (trimmed.includes('生') || trimmed.includes('物') || trimmed.includes('医') || trimmed.includes('植')) {
    return {
      label: trimmed,
      icon: 'biotech',
      iconColorClass: 'text-[#527D3B]',
      badgeClass: 'bg-[#EEF6E8] text-[#527D3B]',
      isAcademic: true,
      category: '理科',
    };
  }
  if (trimmed.includes('科') && !trimmed.includes('信')) {
    return {
      label: trimmed,
      icon: 'experiment',
      iconColorClass: 'text-[#3E6B99]',
      badgeClass: 'bg-[#EBF3FA] text-[#3E6B99]',
      isAcademic: true,
      category: '理科',
    };
  }
  if (trimmed.includes('史') || trimmed.includes('古')) {
    return {
      label: trimmed,
      icon: 'history_edu',
      iconColorClass: 'text-[#B87D5B]',
      badgeClass: 'bg-[#FDF4E3] text-[#B87D5B]',
      isAcademic: true,
      category: '文科',
    };
  }
  if (trimmed.includes('地') || trimmed.includes('图') || trimmed.includes('海') || trimmed.includes('空')) {
    return {
      label: trimmed,
      icon: 'public',
      iconColorClass: 'text-[#3B7A67]',
      badgeClass: 'bg-[#EAF5F1] text-[#3B7A67]',
      isAcademic: true,
      category: '文科',
    };
  }
  if (trimmed.includes('法') || trimmed.includes('政') || trimmed.includes('德') || trimmed.includes('思')) {
    return {
      label: trimmed,
      icon: 'gavel',
      iconColorClass: 'text-[#B4544D]',
      badgeClass: 'bg-[#FDECEB] text-[#B4544D]',
      isAcademic: true,
      category: '文科',
    };
  }
  if (trimmed.includes('信') || trimmed.includes('编') || trimmed.includes('计') || trimmed.includes('码') || trimmed.includes('程')) {
    return {
      label: trimmed,
      icon: 'terminal',
      iconColorClass: 'text-[#556299]',
      badgeClass: 'bg-[#EEF0F8] text-[#556299]',
      isAcademic: true,
      category: '技术',
    };
  }
  if (trimmed.includes('技') || trimmed.includes('工') || trimmed.includes('制作')) {
    return {
      label: trimmed,
      icon: 'precision_manufacturing',
      iconColorClass: 'text-[#546E7A]',
      badgeClass: 'bg-[#ECEFF1] text-[#546E7A]',
      isAcademic: true,
      category: '技术',
    };
  }
  if (trimmed.includes('音') || trimmed.includes('乐') || trimmed.includes('琴') || trimmed.includes('唱') || trimmed.includes('笛')) {
    return {
      label: trimmed,
      icon: 'music_note',
      iconColorClass: 'text-[#C2185B]',
      badgeClass: 'bg-[#FCE4EC] text-[#C2185B]',
      isAcademic: false,
      category: '艺术',
    };
  }
  if (trimmed.includes('美') || trimmed.includes('画') || trimmed.includes('艺') || trimmed.includes('彩')) {
    return {
      label: trimmed,
      icon: 'palette',
      iconColorClass: 'text-[#E65100]',
      badgeClass: 'bg-[#FFF3E0] text-[#E65100]',
      isAcademic: false,
      category: '艺术',
    };
  }
  if (trimmed.includes('书') || trimmed.includes('字') || trimmed.includes('帖') || trimmed.includes('墨')) {
    return {
      label: trimmed,
      icon: 'draw',
      iconColorClass: 'text-[#5D4037]',
      badgeClass: 'bg-[#EFEBE9] text-[#5D4037]',
      isAcademic: false,
      category: '艺术',
    };
  }
  if (trimmed.includes('体') || trimmed.includes('跑') || trimmed.includes('跳') || trimmed.includes('球') || trimmed.includes('泳') || trimmed.includes('锻炼')) {
    return {
      label: trimmed,
      icon: 'directions_run',
      iconColorClass: 'text-secondary',
      badgeClass: 'bg-secondary-container/70 text-on-secondary-container',
      isAcademic: true,
      category: '体健',
    };
  }
  if (trimmed.includes('心') || trimmed.includes('情') || trimmed.includes('心理')) {
    return {
      label: trimmed,
      icon: 'psychology',
      iconColorClass: 'text-[#7B1FA2]',
      badgeClass: 'bg-[#F3E5F5] text-[#7B1FA2]',
      isAcademic: false,
      category: '体健',
    };
  }
  if (trimmed.includes('劳') || trimmed.includes('农') || trimmed.includes('作')) {
    return {
      label: trimmed,
      icon: 'handyman',
      iconColorClass: 'text-[#33691E]',
      badgeClass: 'bg-[#F1F8E9] text-[#33691E]',
      isAcademic: false,
      category: '实践',
    };
  }
  if (trimmed.includes('机') || trimmed.includes('创') || trimmed.includes('智') || trimmed.includes('AI') || trimmed.includes('航模')) {
    return {
      label: trimmed,
      icon: 'smart_toy',
      iconColorClass: 'text-[#0277BD]',
      badgeClass: 'bg-[#E1F5FE] text-[#0277BD]',
      isAcademic: false,
      category: '实践',
    };
  }
  if (trimmed.includes('棋') || trimmed.includes('牌')) {
    return {
      label: trimmed,
      icon: 'grid_view',
      iconColorClass: 'text-[#5D4037]',
      badgeClass: 'bg-[#EFEBE9] text-[#5D4037]',
      isAcademic: false,
      category: '兴趣',
    };
  }

  // 终极优雅兜底 (基于文字哈希分配不同轻柔色彩与通用学识图标)
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash << 5) - hash + trimmed.charCodeAt(i);
  }
  const colorSchemes = [
    { badge: 'bg-[#FDF4E3] text-[#B87D5B]', iconCol: 'text-[#B87D5B]', icon: 'school' },
    { badge: 'bg-[#EDF4F8] text-[#5B82A6]', iconCol: 'text-[#5B82A6]', icon: 'auto_stories' },
    { badge: 'bg-[#F4F1F8] text-[#8C7AA9]', iconCol: 'text-[#8C7AA9]', icon: 'menu_book' },
    { badge: 'bg-[#EAF5F1] text-[#3B7A67]', iconCol: 'text-[#3B7A67]', icon: 'menu_book' },
  ];
  const selected = colorSchemes[Math.abs(hash) % colorSchemes.length];

  return {
    label: trimmed,
    icon: selected.icon,
    iconColorClass: selected.iconCol,
    badgeClass: selected.badge,
    isAcademic: true,
    category: '主科',
  };
}

export const SUBJECT_BADGE_MAP: Record<SubjectName, string> = new Proxy(
  {},
  {
    get: (_, prop: string) => getSubjectMeta(prop).badgeClass,
  }
);

/**
 * 依据中国义务教育初高中课程设置标准，智能提供对应年级的默认学科体系：
 * - 初一（七年级）：语、数、英、道法、历史、地理、生物、体育锻炼、课余兴趣、自主自习 (无物理、无化学)
 * - 初二（八年级）：语、数、英、物理、道法、历史、地理、生物、体育锻炼、课余兴趣、自主自习 (开物理，无化学)
 * - 初三（九年级）：语、数、英、物理、化学、道法、历史、体育锻炼、课余兴趣、自主自习 (开化学，地生已小中考结业)
 * - 高中（高一/高二/高三）：语、数、英、物理、化学、生物、历史、政治、地理、信息科技、体育锻炼、自主自习
 * - 小学（一至六年级）：语、数、英、科学、道法、体育锻炼、课余兴趣、自主自习
 */
export function getDefaultSubjectsForGrade(gradeClass?: string): SubjectName[] {
  const str = String(gradeClass || '').trim();

  // 1. 初一（七年级）：初一绝不开设物理和化学
  if (
    str.includes('初一') ||
    str.includes('七年级') ||
    str.includes('7年级') ||
    str.includes('初1') ||
    str.includes('七年') ||
    str.includes('G7') ||
    str.includes('Grade 7')
  ) {
    return [
      '语文',
      '数学',
      '英语',
      '道法',
      '历史',
      '地理',
      '生物',
      '体育锻炼',
      '课余兴趣',
      '自主自习',
    ];
  }

  // 2. 初二（八年级）：开物理，无化学 (地理生物在八年级结业考)
  if (
    str.includes('初二') ||
    str.includes('八年级') ||
    str.includes('8年级') ||
    str.includes('初2') ||
    str.includes('八年') ||
    str.includes('G8') ||
    str.includes('Grade 8')
  ) {
    return [
      '语文',
      '数学',
      '英语',
      '物理',
      '道法',
      '历史',
      '地理',
      '生物',
      '体育锻炼',
      '课余兴趣',
      '自主自习',
    ];
  }

  // 3. 初三（九年级）：开化学，中考冲刺 (地理生物已在八年级小中考结业)
  if (
    str.includes('初三') ||
    str.includes('九年级') ||
    str.includes('9年级') ||
    str.includes('初3') ||
    str.includes('九年') ||
    str.includes('中考') ||
    str.includes('G9') ||
    str.includes('Grade 9')
  ) {
    return [
      '语文',
      '数学',
      '英语',
      '物理',
      '化学',
      '道法',
      '历史',
      '体育锻炼',
      '课余兴趣',
      '自主自习',
    ];
  }

  // 4. 高中阶段（高一至高三）
  if (
    str.includes('高') ||
    str.includes('高考') ||
    str.includes('G10') ||
    str.includes('G11') ||
    str.includes('G12')
  ) {
    return [
      '语文',
      '数学',
      '英语',
      '物理',
      '化学',
      '生物',
      '道法',
      '历史',
      '地理',
      '信息科技',
      '体育锻炼',
      '自主自习',
    ];
  }

  // 5. 小学阶段（一至六年级）
  if (
    str.includes('小') ||
    str.includes('一') ||
    str.includes('二') ||
    str.includes('三') ||
    str.includes('四') ||
    str.includes('五') ||
    str.includes('六')
  ) {
    return [
      '语文',
      '数学',
      '英语',
      '科学',
      '道法',
      '体育锻炼',
      '课余兴趣',
      '自主自习',
    ];
  }

  // 默认兜底（初二配置）
  return [
    '语文',
    '数学',
    '英语',
    '物理',
    '道法',
    '历史',
    '地理',
    '生物',
    '体育锻炼',
    '课余兴趣',
    '自主自习',
  ];
}

export const DEFAULT_SUBJECTS: SubjectName[] = [
  '数学',
  '语文',
  '英语',
  '物理',
  '化学',
  '生物',
  '历史',
  '道法',
  '地理',
  '信息科技',
  '体育锻炼',
  '课余兴趣',
  '自主自习',
];

export const RECOMMENDED_EXTRA_SUBJECTS: SubjectName[] = [
  '科学',
  '信息科技',
  '通用技术',
  '政治',
  '思想政治',
  '音乐',
  '美术',
  '书法',
  '心理健康',
  '劳动教育',
  '综合实践',
  '奥数',
  '科创',
  '日语',
  '俄语',
];

export function getSubjectBadgeClass(subject: SubjectName): string {
  return getSubjectMeta(subject).badgeClass;
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
      错题订正: '数学错题订正与归纳',
      作业练习: '数学同步练习册专项精练',
      试卷测试: '数学阶段限时综合小测',
      课前预习: '数学新课导学微预习',
    },
  },
  语文: {
    taskTypes: ['作业练习', '背诵默写', '试卷测试', '课前预习', '错题订正'],
    defaultTitles: {
      作业练习: '语文同步作业与导学案',
      背诵默写: '语文重点篇目背诵与默写',
      试卷测试: '现代文阅读与综合限时卷',
      课前预习: '语文新课背景与课文通读',
      错题订正: '生字词与阅读题错题订正',
    },
  },
  英语: {
    taskTypes: ['作业练习', '背诵默写', '试卷测试', '错题订正', '课前预习'],
    defaultTitles: {
      作业练习: '完形填空与语篇阅读精读训练',
      背诵默写: '核心词汇短语听写与朗读',
      试卷测试: '单元测试卷听力与语法小测',
      错题订正: '语法考点与易错题归档重做',
      课前预习: '课文原声跟读与生词预习',
    },
  },
  物理: {
    taskTypes: ['课前预习', '作业练习', '试卷测试', '错题订正'],
    defaultTitles: {
      课前预习: '物理新课实验探究微预习',
      作业练习: '物理同步练习册专项精练',
      试卷测试: '阶段核心考点限时自测卷',
      错题订正: '物理公式与概念错题订正',
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
  { keyword: '体锻', normalized: '体育锻炼', isAcademic: false },
  { keyword: '美术', normalized: '美术', isAcademic: false },
  { keyword: '音乐', normalized: '音乐', isAcademic: false },
  { keyword: '书法', normalized: '书法', isAcademic: false },
  { keyword: '心理', normalized: '心理健康', isAcademic: false },
  { keyword: '选修', normalized: '素质选修', isAcademic: false },
  { keyword: '素质', normalized: '素质选修', isAcademic: false },
  { keyword: '班会', normalized: '班会', isAcademic: false },
  { keyword: '延时', normalized: '延时辅导', isAcademic: false },
  { keyword: '语延', normalized: '语延', isAcademic: true },
  { keyword: '数延', normalized: '数延', isAcademic: true },
  { keyword: '英延', normalized: '英延', isAcademic: true },
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

  // Check if rawText contains structured daily lines e.g. "周一：历史(徐倩)、语文(何川)..."
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const dayMap: Record<
    string,
    { morningReading?: string; periods: (string | TimetablePeriodDetail)[] }
  > = {
    周一: { periods: [] },
    周二: { periods: [] },
    周三: { periods: [] },
    周四: { periods: [] },
    周五: { periods: [] },
  };
  let foundStructuredDay = false;

  for (const line of lines) {
    const match = line.match(/^(周[一二三四五]|星期[一二三四五])[：:\s](.*)/);
    if (match) {
      foundStructuredDay = true;
      const dayKey = match[1].replace('星期', '周');
      const content = match[2];
      const items = content
        .split(/[、,，\t\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const parsedPeriods: (string | TimetablePeriodDetail)[] = [];
      let morning = '';
      let pIdx = 1;

      for (const item of items) {
        if (item.includes('早读')) {
          morning = item.replace(/早读[：:]?/, '').trim() || '早读';
        } else {
          // parse teacher if format like "历史(徐倩)" or "语文(何川)"
          const tMatch = item.match(/^([^(（]+)[(（]([^)）]+)[)）]$/);
          if (tMatch) {
            const subj = tMatch[1].trim();
            const teacher = tMatch[2].trim();
            parsedPeriods.push({
              periodIndex: pIdx++,
              subject: subj,
              teacher: teacher,
            });
            for (const k of KNOWN_TIMETABLE_SUBJECTS) {
              if (subj.includes(k.keyword)) {
                if (k.isAcademic) detectedAcademic.add(k.normalized);
                else detectedExtra.add(k.normalized);
                break;
              }
            }
          } else {
            parsedPeriods.push({
              periodIndex: pIdx++,
              subject: item,
            });
            for (const k of KNOWN_TIMETABLE_SUBJECTS) {
              if (item.includes(k.keyword)) {
                if (k.isAcademic) detectedAcademic.add(k.normalized);
                else detectedExtra.add(k.normalized);
                break;
              }
            }
          }
        }
      }
      if (dayMap[dayKey]) {
        dayMap[dayKey] = { morningReading: morning, periods: parsedPeriods };
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

  const days: ('周一' | '周二' | '周三' | '周四' | '周五')[] = [
    '周一',
    '周二',
    '周三',
    '周四',
    '周五',
  ];

  let weeklyGrid: TimetableDaySchedule[] = [];

  if (foundStructuredDay) {
    weeklyGrid = days.map((day) => ({
      day,
      dayName: day,
      morningReading: dayMap[day].morningReading,
      periods: dayMap[day].periods,
    }));
  } else {
    // Build a realistic 5-day x 7-period timetable grid from the detected subjects
    const pool =
      academicSubjects.length > 0
        ? academicSubjects
        : ['语文', '数学', '英语', '物理', '历史', '地理', '生物', '道法'];

    weeklyGrid = days.map((day, dIdx) => {
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
      return { day, dayName: day, periods };
    });
  }

  const schoolAndClass =
    text.includes('棕北中学') || sourceName.includes('棕北中学')
      ? '成都市棕北中学 七.6'
      : undefined;

  const semesterLabel =
    gradePreset === 'grade7'
      ? '初一学年 · 7门文化课全科课表'
      : gradePreset === 'grade9'
      ? '初三冲刺 · 语数英物化历道法课表'
      : '初二学年 · 语数英物历地生道法全科课表';

  return {
    semesterLabel,
    schoolAndClass,
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

/**
 * Returns real dynamic date info with teaching week calculation
 */
export function getSystemDateInfo(dateInput?: string | Date): {
  dateStr: string; // YYYY-MM-DD
  displayDate: string; // "10月20日"
  weekdayName: '周一' | '周二' | '周三' | '周四' | '周五' | '周六' | '周日';
  fullLabel: string; // "周二 · 10月20日"
  teachingWeek: number; // e.g. 第 8 教学周
  isToday: boolean;
} {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const weekdays: ('周日' | '周一' | '周二' | '周三' | '周四' | '周五' | '周六')[] = [
    '周日',
    '周一',
    '周二',
    '周三',
    '周四',
    '周五',
    '周六',
  ];
  const weekdayName = (weekdays[d.getDay()] || '周一') as any;

  // Calculate teaching week from autumn semester start (Sept 1)
  const semesterStart = new Date(year, 8, 1);
  const diffDays = Math.max(
    0,
    Math.floor((d.getTime() - semesterStart.getTime()) / (1000 * 60 * 60 * 24))
  );
  const teachingWeek = Math.min(22, Math.max(1, Math.floor(diffDays / 7) + 1));

  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  return {
    dateStr,
    displayDate: `${month}月${day}日`,
    weekdayName,
    fullLabel: `${weekdayName} · ${month}月${day}日`,
    teachingWeek,
    isToday,
  };
}

export function shiftDate(dateStr: string, offsetDays: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getTimetableSubjectsForDay(
  weeklyGrid: TimetableDaySchedule[] | undefined,
  weekdayName: string
): {
  todaySubjects: SubjectName[];
  tomorrowSubjects: SubjectName[];
} {
  if (!weeklyGrid || weeklyGrid.length === 0) {
    return { todaySubjects: [], tomorrowSubjects: [] };
  }

  const dayMap: Record<string, string> = {
    周一: '周二',
    周二: '周三',
    周三: '周四',
    周四: '周五',
    周五: '周一',
    周六: '周日',
    周日: '周一',
  };

  const tomorrowName = dayMap[weekdayName] || '周四';

  const findSubjs = (dayKey: string): SubjectName[] => {
    const col = weeklyGrid.find(
      (c) => c.day === dayKey || c.dayName === dayKey || c.day?.includes(dayKey)
    );
    if (!col || !Array.isArray(col.periods)) return [];
    const list: SubjectName[] = [];
    for (const p of col.periods) {
      const name = typeof p === 'string' ? p : p.subject;
      if (
        name &&
        !list.includes(name) &&
        !['班会', '自习', '午休', '延时', '素质选修'].includes(name)
      ) {
        list.push(name);
      }
    }
    return list;
  };

  return {
    todaySubjects: findSubjs(weekdayName),
    tomorrowSubjects: findSubjs(tomorrowName),
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



