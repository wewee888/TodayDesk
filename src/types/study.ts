export type SubjectName = string;

export type ScheduleFrequencyType = 'weekly_fixed' | 'flexible';

export type AttendanceStatus =
  | 'active'
  | 'teacher_leave'
  | 'student_leave'
  | 'paused';

export interface ActivityConfigItem {
  id: string;
  name: string;
  subject: SubjectName;
  defaultMinutes: number;
  scheduleType?: ScheduleFrequencyType;
  scheduleTime: string;
  subtitle?: string;
  attendanceStatus?: AttendanceStatus;
  leaveNote?: string;
}

export interface DeskSettings {
  studentName: string;
  gradeClass: string;
  pomodoroMinutes: number;
  customSubjects?: SubjectName[];
  extracurricularActivities: string[];
  peExercises: string[];
  activityConfigs?: Record<string, ActivityConfigItem>;
  familyReflectionNote: string;
}

export interface ReviewItem {
  id: string;
  subject: SubjectName;
  subjectBadgeClass: string;
  title: string;
  status: 'pending' | 'all_correct' | 'fixed_minor' | 'weekend_review';
  mistakeTag?: '计算粗心' | '审题漏看' | '概念模糊';
  hasPhoto?: boolean;
}

export interface ScheduleItem {
  id: string;
  badgeText: string;
  badgeClass: string;
  scheduleType?: ScheduleFrequencyType;
  timeText: string;
  title: string;
  subtitle: string;
  completed: boolean;
  attendanceStatus?: AttendanceStatus;
  leaveNote?: string;
}

export interface HomeworkTask {
  id: string;
  subject: SubjectName;
  subjectBadgeClass: string;
  taskType: string;
  title: string;
  estimatedMinutes: number;
  completed: boolean;
  completedPomodoros?: number;
  isAllCorrect?: boolean;
  accuracyNote?: string;
}

export interface MistakeItem {
  id: string;
  subject: SubjectName;
  sourceLabel: string;
  badgeClass: string;
  statusText: string;
  statusType: 'repeat' | 'reinforce' | 'keypoint';
  title: string;
  reasonText: string;
  reasonIcon: string;
  reasonColorClass: string;
  excerpt: string;
  imageUrl?: string;
  iconFallback?: string;
  cleared: boolean;
  ctaLabel: string;
  ctaStyle: 'secondary' | 'primary' | 'neutral';
  solutionDetail: string;
}

export type ExamPeriod = string;

export interface TimetableDaySchedule {
  day: '周一' | '周二' | '周三' | '周四' | '周五';
  morningReading?: string;
  periods: string[];
}

export interface TimetableRecognitionResult {
  semesterLabel: string;
  schoolAndClass?: string;
  detectedSubjects: SubjectName[];
  academicSubjects: SubjectName[];
  extraSubjects: SubjectName[];
  subjectTeachers?: Record<SubjectName, string>;
  weeklyGrid: TimetableDaySchedule[];
  extractedRawText?: string;
  sourceName: string;
}


export interface ExamScoreCard {
  id?: string;
  subject: SubjectName;
  icon: string;
  score: number;
  fullScore: number;
  trendText: string;
  trendIcon: string;
  colorScheme: 'primary' | 'secondary' | 'tertiary';
}

export interface EfficiencyBubble {
  id: string;
  subject: SubjectName;
  hours: number;
  scorePercent: number;
  badgeText: string;
  quadrantNote: string;
  colorScheme: 'primary' | 'secondary' | 'tertiary';
  positionClass: string;
  sizeClass: string;
}

export interface ParsedVoiceTask {
  category: '作业' | '预习' | '体育' | '兴趣';
  subject: SubjectName;
  taskType: string;
  title: string;
  estimatedMinutes: number;
  statusNote: string;
}

export interface WeeklyReportAI {
  studentName: string;
  weekLabel: string;
  headline: string;
  summaryParagraph: string;
  highYieldSubject: string;
  potentialSubject: string;
  actionItems: {
    subject: SubjectName;
    task: string;
    minutes: number;
    priority: string;
  }[];
  encouragement: string;
}
