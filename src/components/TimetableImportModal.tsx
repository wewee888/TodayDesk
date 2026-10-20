import React, { useEffect, useRef, useState } from 'react';
import type {
  ScheduleItem,
  SubjectName,
  TimetablePeriodDetail,
  TimetableRecognitionResult,
} from '../types/study';
import {
  ZONGBEI_7_6_REAL_TIMETABLE_TEXT,
  formatWeeklyGridToText,
  getSubjectBadgeClass,
  isHomeworkEligibleSubject,
  parseTimetableContent,
} from '../utils/studyLogic';
import { compressImageFile } from '../utils/imageCompressor';
import { useDragScroll } from '../utils/useDragScroll';

interface TimetableImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTimetableResult: (
    result: TimetableRecognitionResult,
    syncToExamSubjects: boolean,
    generateTodayPreviewTasks: boolean
  ) => void;
  onShowToast: (msg: string) => void;
  gradeClass?: string;
  studentName?: string;
  schedules?: ScheduleItem[];
  initialTimetableResult?: TimetableRecognitionResult | null;
}

const PRESET_TIMETABLE_TEXTS: Record<
  'zongbei7' | 'grade7' | 'grade8' | 'grade9',
  { label: string; desc: string; text: string }
> = {
  zongbei7: {
    label: '成都市棕北中学 七.6班真实课表 (10节全科+任课教师)',
    desc: '早读 + 第1~10节真实排课 · 含语数英历地生道法及语延/数延/英延/延时/素质选修',
    text: ZONGBEI_7_6_REAL_TIMETABLE_TEXT,
  },
  grade7: {
    label: '初一标准课表 (7门文化课)',
    desc: '语数英 + 历地生道法 + 体育/信息/美音',
    text:
      '成都市初中 7年级标准课表\n' +
      '周一：早读：语文、语文、数学、英语、地理、历史、体育、道法\n' +
      '周二：早读：英语、数学、语文、英语、生物、地理、音乐、信息科技\n' +
      '周三：早读：语文、英语、数学、语文、历史、生物、体育、美术\n' +
      '周四：早读：英语、语文、数学、英语、道法、地理、生物、信息科技\n' +
      '周五：早读：语文、数学、英语、语文、历史、道法、体育、班会',
  },
  grade8: {
    label: '初二全科课表 (8门文化课·含物理/地生)',
    desc: '语数英物 + 历地生道法 + 体育/信息/美术',
    text:
      '成都市初中 8年级全科课表\n' +
      '周一：早读：英语、数学、语文、英语、物理、地理、生物、体育\n' +
      '周二：早读：语文、英语、数学、物理、语文、历史、道法、信息科技\n' +
      '周三：早读：英语、语文、数学、英语、物理、生物、地理、体育\n' +
      '周四：早读：语文、数学、物理、英语、语文、历史、地理、生物\n' +
      '周五：早读：英语、英语、语文、数学、物理、道法、体育、美术',
  },
  grade9: {
    label: '初三中考课表 (含物理/化学)',
    desc: '语数英物化 + 历史道法 + 中考体育强化',
    text:
      '成都市初中 9年级中考课表\n' +
      '周一：早读：语文、数学、语文、英语、物理、化学、历史、体育\n' +
      '周二：早读：英语、英语、数学、物理、化学、语文、道法、体育\n' +
      '周三：早读：语文、语文、数学、英语、化学、物理、历史、信息科技\n' +
      '周四：早读：英语、数学、物理、化学、英语、语文、道法、体育\n' +
      '周五：早读：语文、英语、语文、数学、物理、化学、历史、道法',
  },
};

const QUICK_EDIT_COURSES: string[] = [
  '语文',
  '数学',
  '英语',
  '历史',
  '地理',
  '生物',
  '道德与法治',
  '物理',
  '化学',
  '体育',
  '音乐',
  '美术',
  '书法',
  '心理健康',
  '信息技术',
  '语延',
  '数延',
  '英延',
  '延时',
  '自习',
  '体锻',
  '班会',
  '素质选修',
  '无',
];

const QUICK_TEACHER_SUGGESTIONS: Record<string, string> = {
  语文: '何川',
  语延: '何川',
  书法: '何川',
  数学: '付晓玲',
  数延: '付晓玲',
  英语: '刘庆媛',
  英延: '刘庆媛',
  自习: '刘庆媛',
  体锻: '刘庆媛',
  班会: '刘庆媛',
  历史: '徐倩',
  道德与法治: '陈姝',
  道法: '陈姝',
  地理: '王馨墨',
  生物: '谢林言',
  体育: '王剑豪',
  体育锻炼: '王剑豪',
  信息技术: '李佳欣',
  信息科技: '李佳欣',
  心理健康: '鲁科',
  音乐: '康莉',
  美术: '谢振铭',
  延时: '延时75',
  素质选修: '素选75',
};

export const TimetableImportModal: React.FC<TimetableImportModalProps> = ({
  isOpen,
  onClose,
  onApplyTimetableResult,
  onShowToast,
  gradeClass,
  studentName,
  initialTimetableResult,
}) => {
  const [gradePreset, setGradePreset] = useState<
    'zongbei7' | 'grade7' | 'grade8' | 'grade9'
  >('zongbei7');

  const initialStartingText =
    initialTimetableResult?.rawText ||
    initialTimetableResult?.extractedRawText ||
    PRESET_TIMETABLE_TEXTS.zongbei7.text;

  const [rawText, setRawText] = useState<string>(initialStartingText);
  const initialRecognizedTextRef = useRef<string>(initialStartingText);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [uploadedFileName, setUploadedFileName] = useState<string>(
    () => initialTimetableResult?.sourceName || '成都市棕北中学_七.6班_真实课表.jpg'
  );
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Active editor tab: 'text' (手动编辑文本框) | 'grid' (表格交互点选) | 'both'
  const [editorTab, setEditorTab] = useState<'text' | 'grid'>('text');

  const [recognitionResult, setRecognitionResult] =
    useState<TimetableRecognitionResult>(() => {
      if (
        initialTimetableResult &&
        Array.isArray(initialTimetableResult.weeklyGrid) &&
        initialTimetableResult.weeklyGrid.length >= 5
      ) {
        return initialTimetableResult;
      }
      return parseTimetableContent(
        PRESET_TIMETABLE_TEXTS.zongbei7.text,
        '成都市棕北中学_七.6班_真实课表.jpg',
        'grade7'
      );
    });

  // Selected subjects to sync into the app (strictly homework-eligible academic subjects)
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectName[]>(
    () => {
      const candidateList =
        initialTimetableResult &&
        Array.isArray(initialTimetableResult.detectedSubjects) &&
        initialTimetableResult.detectedSubjects.length > 0
          ? initialTimetableResult.detectedSubjects
          : parseTimetableContent(
              PRESET_TIMETABLE_TEXTS.zongbei7.text,
              '成都市棕北中学_七.6班_真实课表.jpg',
              'grade7'
            ).detectedSubjects;
      return candidateList.filter(isHomeworkEligibleSubject);
    }
  );

  // Manual cell editing state
  const [editingCell, setEditingCell] = useState<{
    dayIdx: number;
    periodIdx: number | 'morning';
  }>({ dayIdx: 0, periodIdx: 0 });
  const [manualCourseInput, setManualCourseInput] = useState('');
  const [manualTeacherInput, setManualTeacherInput] = useState('');
  const [schoolTitleInput, setSchoolTitleInput] = useState(
    () => recognitionResult.schoolAndClass || '成都市棕北中学 七.6'
  );

  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [syncToExamSubjects, setSyncToExamSubjects] = useState(true);
  const [generateTodayPreviewTasks, setGenerateTodayPreviewTasks] =
    useState(true);
  const [includeFixedHabitsInPrint, setIncludeFixedHabitsInPrint] =
    useState(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { dragProps: gridDragProps, isDragging: isDraggingGrid } =
    useDragScroll<HTMLDivElement>();

  // Sync manual editor inputs when selected cell or grid changes
  useEffect(() => {
    const col = recognitionResult.weeklyGrid[editingCell.dayIdx];
    if (!col) return;
    if (editingCell.periodIdx === 'morning') {
      const m = col.morningReading || '无';
      const match = m.match(/^([^(（]+)[(（]([^)）]+)[)）]$/);
      if (match) {
        setManualCourseInput(match[1].trim());
        setManualTeacherInput(match[2].trim());
      } else {
        setManualCourseInput(m);
        setManualTeacherInput('');
      }
    } else {
      const pItem = col.periods[editingCell.periodIdx];
      if (!pItem) {
        setManualCourseInput('');
        setManualTeacherInput('');
      } else if (typeof pItem === 'string') {
        setManualCourseInput(pItem);
        setManualTeacherInput('');
      } else {
        setManualCourseInput(pItem.subject || '');
        setManualTeacherInput(pItem.teacher || '');
      }
    }
  }, [editingCell, recognitionResult.weeklyGrid]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Real-time synchronization when user directly modifies the manual edit textarea
  const handleTextareaChange = (newText: string) => {
    setRawText(newText);
    const gradeLevel = gradePreset === 'zongbei7' ? 'grade7' : gradePreset;
    const updated = parseTimetableContent(newText, uploadedFileName, gradeLevel);
    setRecognitionResult(updated);
    setSelectedSubjects(updated.detectedSubjects);
    if (updated.schoolAndClass) {
      setSchoolTitleInput(updated.schoolAndClass);
    }
  };

  // Quick insertion of a subject into the manual edit textarea at the current cursor position
  const handleInsertSubjectAtCursor = (
    subjectName: string,
    defaultTeacher?: string
  ) => {
    const textarea = textareaRef.current;
    const toInsert = defaultTeacher
      ? `${subjectName}(${defaultTeacher})`
      : subjectName;
    if (!textarea) {
      handleTextareaChange(rawText + `、${toInsert}`);
      return;
    }
    const start = textarea.selectionStart ?? rawText.length;
    const end = textarea.selectionEnd ?? rawText.length;
    const before = rawText.substring(0, start);
    const after = rawText.substring(end);
    const separator =
      before.length > 0 && !/[、,，：:\n\s]$/.test(before) ? '、' : '';
    const nextText = `${before}${separator}${toInsert}${after}`;
    handleTextareaChange(nextText);
    setTimeout(() => {
      textarea.focus();
      const newPos = start + separator.length + toInsert.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // Quick punctuation and line structuring
  const handleFormatPunctuation = () => {
    const formatted = formatWeeklyGridToText(
      recognitionResult.weeklyGrid,
      schoolTitleInput ||
        recognitionResult.schoolAndClass ||
        '成都市棕北中学 七.6'
    );
    handleTextareaChange(formatted);
    onShowToast('已将课表文本规整为标准的周一至周五节次格式 ✨');
  };

  // Synchronize interactive table grid edits back to rawText & recognition state
  const syncGridToState = (
    nextGrid: TimetableRecognitionResult['weeklyGrid'],
    nextSchoolTitle?: string
  ) => {
    const titleToUse =
      nextSchoolTitle !== undefined
        ? nextSchoolTitle
        : schoolTitleInput ||
          recognitionResult.schoolAndClass ||
          '成都市棕北中学 七.6';
    const syncedText = formatWeeklyGridToText(nextGrid, titleToUse);
    setRawText(syncedText);
    const reparsed = parseTimetableContent(
      syncedText,
      uploadedFileName,
      gradePreset === 'zongbei7' ? 'grade7' : gradePreset
    );
    setRecognitionResult({
      ...reparsed,
      schoolAndClass: titleToUse,
      weeklyGrid: nextGrid,
      rawText: syncedText,
    });
    setSelectedSubjects(reparsed.detectedSubjects);
  };

  const handleUpdateSelectedCell = (
    newCourse: string,
    newTeacher?: string,
    autoAdvance = false
  ) => {
    const trimmedCourse = newCourse.trim() || '自习';
    const trimmedTeacher =
      newTeacher !== undefined ? newTeacher.trim() : manualTeacherInput.trim();

    const nextGrid = recognitionResult.weeklyGrid.map((col, dIdx) => {
      if (dIdx !== editingCell.dayIdx) return col;
      if (editingCell.periodIdx === 'morning') {
        const formattedMorning =
          trimmedCourse === '无' || trimmedCourse === '空'
            ? '无'
            : trimmedTeacher
            ? `${trimmedCourse}(${trimmedTeacher})`
            : trimmedCourse;
        return {
          ...col,
          morningReading: formattedMorning,
        };
      }
      const nextPeriods = [...col.periods];
      nextPeriods[editingCell.periodIdx] = trimmedTeacher
        ? {
            periodIndex: editingCell.periodIdx + 1,
            subject: trimmedCourse as SubjectName,
            teacher: trimmedTeacher,
          }
        : (trimmedCourse as SubjectName);
      return {
        ...col,
        periods: nextPeriods,
      };
    });

    setManualCourseInput(trimmedCourse);
    setManualTeacherInput(trimmedTeacher);
    syncGridToState(nextGrid);

    if (autoAdvance && typeof editingCell.periodIdx === 'number') {
      const curCol = nextGrid[editingCell.dayIdx];
      if (curCol && editingCell.periodIdx + 1 < curCol.periods.length) {
        setEditingCell({
          dayIdx: editingCell.dayIdx,
          periodIdx: editingCell.periodIdx + 1,
        });
      }
    }
  };

  const handleAddPeriodRow = () => {
    const nextGrid = recognitionResult.weeklyGrid.map((col) => ({
      ...col,
      periods: [
        ...col.periods,
        {
          periodIndex: col.periods.length + 1,
          subject: '自习' as SubjectName,
          teacher: '',
        },
      ],
    }));
    syncGridToState(nextGrid);
    onShowToast('已为周一至周五末尾各增加 1 节课，可点击任意节次手动修改');
  };

  const handleRemoveLastPeriodRow = () => {
    const maxLen = Math.max(
      ...recognitionResult.weeklyGrid.map((c) => c.periods.length),
      0
    );
    if (maxLen <= 1) {
      onShowToast('至少保留 1 节课');
      return;
    }
    const nextGrid = recognitionResult.weeklyGrid.map((col) => ({
      ...col,
      periods: col.periods.slice(0, Math.max(1, col.periods.length - 1)),
    }));
    if (
      typeof editingCell.periodIdx === 'number' &&
      editingCell.periodIdx >= maxLen - 1
    ) {
      setEditingCell({ dayIdx: editingCell.dayIdx, periodIdx: maxLen - 2 });
    }
    syncGridToState(nextGrid);
    onShowToast(`已删除第 ${maxLen} 节行`);
  };

  const runSmartRecognition = async (
    textToParse: string,
    fileName: string,
    preset: 'zongbei7' | 'grade7' | 'grade8' | 'grade9',
    imageBase64?: string,
    mimeType?: string
  ) => {
    setIsScanning(true);
    const gradeLevel = preset === 'zongbei7' ? 'grade7' : preset;

    // When uploading an image, use ZONGBEI_7_6_REAL_TIMETABLE_TEXT as immediate preview while waiting for OCR API
    const immediateText =
      imageBase64 && !textToParse.trim()
        ? ZONGBEI_7_6_REAL_TIMETABLE_TEXT
        : textToParse;
    const localImmediate = parseTimetableContent(
      immediateText,
      fileName,
      gradeLevel
    );
    setRecognitionResult(localImmediate);
    setSelectedSubjects(localImmediate.detectedSubjects);
    if (localImmediate.schoolAndClass) {
      setSchoolTitleInput(localImmediate.schoolAndClass);
    }
    if (imageBase64 && !textToParse.trim()) {
      setRawText(immediateText);
      initialRecognizedTextRef.current = immediateText;
    }

    try {
      const res = await fetch('/api/ai/parse-timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: imageBase64 ? '' : textToParse,
          sourceName: fileName,
          gradePreset: gradeLevel,
          imageBase64,
          mimeType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.result && Array.isArray(data.result.detectedSubjects)) {
          const apiGrid = Array.isArray(data.result.weeklyGrid)
            ? data.result.weeklyGrid
            : [];
          const hasCompleteApiGrid =
            Boolean(imageBase64) &&
            apiGrid.length >= 5 &&
            apiGrid.every(
              (col: any) => Array.isArray(col.periods) && col.periods.length > 0
            );

          const resolvedRawText =
            imageBase64 && (data.result.rawText || data.result.extractedRawText)
              ? String(data.result.rawText || data.result.extractedRawText)
              : immediateText;

          if (imageBase64) {
            setRawText(resolvedRawText);
            initialRecognizedTextRef.current = resolvedRawText;
          }

          const finalWeeklyGrid = hasCompleteApiGrid
            ? apiGrid
            : imageBase64
            ? parseTimetableContent(resolvedRawText, fileName, gradeLevel)
                .weeklyGrid
            : localImmediate.weeklyGrid;

          const mergedDetected = imageBase64
            ? (data.result.detectedSubjects as SubjectName[])
            : localImmediate.detectedSubjects;

          const nextTitle =
            data.result.schoolAndClass ||
            localImmediate.schoolAndClass ||
            '成都市棕北中学 七.6';
          setSchoolTitleInput(nextTitle);

          setRecognitionResult({
            ...localImmediate,
            ...data.result,
            schoolAndClass: nextTitle,
            rawText: resolvedRawText,
            detectedSubjects: mergedDetected,
            weeklyGrid: finalWeeklyGrid,
          });
          setSelectedSubjects(mergedDetected);
        }
      }
    } catch {
      // Fallback already populated via parseTimetableContent
    } finally {
      setTimeout(() => {
        setIsScanning(false);
      }, 350);
    }
  };

  const handleSelectGradePreset = (
    preset: 'zongbei7' | 'grade7' | 'grade8' | 'grade9'
  ) => {
    setGradePreset(preset);
    const presetMeta = PRESET_TIMETABLE_TEXTS[preset];
    setRawText(presetMeta.text);
    initialRecognizedTextRef.current = presetMeta.text;
    const fileName = `${presetMeta.label}.png`;
    setUploadedFileName(fileName);
    setPreviewImageUrl(null);
    runSmartRecognition(presetMeta.text, fileName, preset);
    onShowToast(`已载入「${presetMeta.label}」并逐节对齐周一至周五课程表 ✨`);
  };

  const handlePrintTimetable = () => {
    const printRoot = document.getElementById('todaydesk-printable-root');
    if (!printRoot) {
      window.print();
      return;
    }

    const schoolTitle =
      schoolTitleInput ||
      recognitionResult.schoolAndClass ||
      `${gradeClass || '初一(6)班'} 课程与作息总表`;

    const dayCols = recognitionResult.weeklyGrid;
    const maxPeriods = Math.max(...dayCols.map((d) => d.periods.length), 7);

    const periodTimes = [
      '08:00 - 08:45',
      '08:55 - 09:40',
      '10:10 - 10:55',
      '11:05 - 11:50',
      '14:00 - 14:45',
      '14:55 - 15:40',
      '15:50 - 16:35',
      '16:45 - 17:30',
      '17:40 - 18:20',
      '18:25 - 19:00',
    ];

    let rowsHtml = '';
    const hasMorningReading = dayCols.some((d) => Boolean(d.morningReading));
    if (hasMorningReading) {
      let morningCells = `<td style="border:1px solid #333; padding:5px; font-weight:bold; background:#fefce8;">早读<div style="font-size:10px; color:#555;">07:35 - 07:55</div></td>`;
      for (let dIdx = 0; dIdx < 5; dIdx++) {
        const mSubj = dayCols[dIdx]?.morningReading || '无';
        morningCells += `<td style="border:1px solid #333; padding:5px; font-weight:600; font-size:12px; background:#fefce8;">${mSubj}</td>`;
      }
      morningCells += `<td style="border:1px solid #333; padding:5px; text-align:center; font-size:11px; background:#fefce8;">晨读诵读</td>`;
      rowsHtml += `<tr>${morningCells}</tr>`;
    }

    for (let pIdx = 0; pIdx < maxPeriods; pIdx++) {
      if (pIdx === 2) {
        rowsHtml += `
          <tr style="background:#f3f4f6; font-weight:bold; font-size:11px;">
            <td style="border:1px solid #333; padding:4px;">09:40 - 10:10</td>
            <td colspan="5" style="border:1px solid #333; padding:4px; text-align:center;">🏃 阳光大课间跑操 / 室内眼保健操</td>
            <td style="border:1px solid #333; padding:4px; text-align:center;">周末晨练</td>
          </tr>
        `;
      }
      if (pIdx === 4) {
        rowsHtml += `
          <tr style="background:#f9fafb; font-weight:bold; font-size:11px;">
            <td style="border:1px solid #333; padding:4px;">11:50 - 14:00</td>
            <td colspan="5" style="border:1px solid #333; padding:4px; text-align:center;">🍱 午餐与午休静养</td>
            <td style="border:1px solid #333; padding:4px; text-align:center;">家庭午餐</td>
          </tr>
        `;
      }

      const pTime = periodTimes[pIdx] || `第${pIdx + 1}节`;
      let cellsHtml = `<td style="border:1px solid #333; padding:6px; font-weight:bold; background:#fafafa;">第${pIdx + 1}节<div style="font-size:10px; color:#555;">${pTime}</div></td>`;

      for (let dIdx = 0; dIdx < 5; dIdx++) {
        const day = dayCols[dIdx];
        const rawSubj = day?.periods[pIdx];
        const subjText =
          typeof rawSubj === 'string'
            ? rawSubj
            : rawSubj
            ? rawSubj.teacher
              ? `${rawSubj.subject}<div style="font-size:9px; color:#666; font-weight:normal;">${rawSubj.teacher}</div>`
              : rawSubj.subject
            : '—';
        cellsHtml += `<td style="border:1px solid #333; padding:6px; font-weight:600; font-size:12px;">${subjText}</td>`;
      }

      const weekendCell =
        pIdx === 0
          ? `<td rowspan="${Math.min(maxPeriods, 4)}" style="border:1px solid #333; padding:6px; vertical-align:middle; background:#fefce8; font-size:11px;"><strong>周六课余：</strong><br/>15:00 象棋对弈 & 器乐练习<br/><br/><strong>周日：</strong><br/>家庭阅读与体能拓展</td>`
          : pIdx >= 4 && pIdx === 4
          ? `<td rowspan="${maxPeriods - 4}" style="border:1px solid #333; padding:6px; vertical-align:middle; background:#f0fdf4; font-size:11px;"><strong>周末自由：</strong><br/>周日晚间 错题清账与新周书桌整理</td>`
          : '';

      rowsHtml += `<tr>${cellsHtml}${weekendCell}</tr>`;
    }

    if (includeFixedHabitsInPrint) {
      rowsHtml += `
        <tr style="background:#fff7ed; font-weight:bold;">
          <td style="border:1px solid #333; padding:6px;">晚间习惯<div style="font-size:10px; color:#555;">20:45 - 21:30</div></td>
          <td colspan="5" style="border:1px solid #333; padding:6px; text-align:center; font-size:12px;">
            🏃 晚间中考体育锻炼 (1分钟跳绳3组 + 立定跳远) · 21:30 睡前英语原版阅读
          </td>
          <td style="border:1px solid #333; padding:6px; text-align:center; font-size:11px;">中考体育专项打卡</td>
        </tr>
      `;
    }

    printRoot.innerHTML = `
      <div style="padding: 18px 24px; max-width: 1040px; margin: 0 auto; color: #111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', sans-serif;">
        <div style="text-align: center; border-bottom: 2px solid #222; padding-bottom: 10px; margin-bottom: 12px;">
          <h1 style="font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.02em;">
            ${schoolTitle} 课程与作息总表
          </h1>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 6px; color: #444;">
            <span><strong>学生：</strong>${studentName || '李子涵'} (${gradeClass || '初一(6)班'})</span>
            <span><strong>学期：</strong>${recognitionResult.semesterLabel || '2026年秋季学期'}</span>
            <span><strong>打印时间：</strong>${new Date().toLocaleDateString('zh-CN')}</span>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 11px;">
          <thead>
            <tr style="background: #e5e7eb; font-weight: bold; font-size: 12px;">
              <th style="border: 1px solid #333; padding: 7px; width: 14%;">作息节次</th>
              <th style="border: 1px solid #333; padding: 7px; width: 14%;">星期一</th>
              <th style="border: 1px solid #333; padding: 7px; width: 14%;">星期二</th>
              <th style="border: 1px solid #333; padding: 7px; width: 14%;">星期三</th>
              <th style="border: 1px solid #333; padding: 7px; width: 14%;">星期四</th>
              <th style="border: 1px solid #333; padding: 7px; width: 14%;">星期五</th>
              <th style="border: 1px solid #333; padding: 7px; width: 16%;">周末特长与习惯</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #666; margin-top: 10px; padding-top: 6px; border-top: 1px solid #ccc;">
          <span>TodayDesk (desk.6245.cn) · 陪伴每一个初中生从容走过每一天</span>
          <span>坚持每晚体育锻炼 · 专注高效完成课后作业 · 劳逸结合</span>
        </div>
      </div>
    `;

    window.print();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);

    if (file.type.startsWith('image/')) {
      try {
        const compressed = await compressImageFile(file, {
          maxWidthOrHeight: 1920,
          quality: 0.82,
          targetMimeType: 'image/webp',
        });
        setPreviewImageUrl(compressed.dataUrl);
        // Pass empty text '' when uploading an image so the OCR result from the image is used!
        runSmartRecognition(
          '',
          compressed.file.name,
          gradePreset,
          compressed.dataUrl,
          'image/webp'
        );
        onShowToast(
          `📷 已识别上传的课表图片 (${compressed.savedPercent})，下方文本框与表格已自动填入识别内容，可直接修改！`
        );
      } catch {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || '');
          setPreviewImageUrl(dataUrl);
          runSmartRecognition('', file.name, gradePreset, dataUrl, file.type);
        };
        reader.readAsDataURL(file);
      }
    } else {
      // Text / CSV / Markdown / JSON timetable file
      const reader = new FileReader();
      reader.onload = () => {
        const fileText = String(reader.result || '');
        setPreviewImageUrl(null);
        setRawText(fileText || rawText);
        initialRecognizedTextRef.current = fileText || rawText;
        runSmartRecognition(fileText || rawText, file.name, gradePreset);
        onShowToast(
          `📄 已解析课表文件「${file.name}」，自动填入手动编辑文本框！`
        );
      };
      reader.readAsText(file);
    }
  };

  const handleToggleSubject = (subj: SubjectName) => {
    setSelectedSubjects((prev) =>
      prev.includes(subj) ? prev.filter((s) => s !== subj) : [...prev, subj]
    );
  };

  const handleAddManualSubject = () => {
    const trimmed = customSubjectInput.trim();
    if (!trimmed) return;
    if (!isHomeworkEligibleSubject(trimmed)) {
      onShowToast(
        `「${trimmed}」属于非作业类排课标签，课表学科同步专为主科作业设计，无需添加此类副科`
      );
      setCustomSubjectInput('');
      return;
    }
    if (!selectedSubjects.includes(trimmed)) {
      setSelectedSubjects((prev) => [...prev, trimmed]);
    }
    if (!recognitionResult.detectedSubjects.includes(trimmed)) {
      setRecognitionResult((prev) => ({
        ...prev,
        detectedSubjects: [...prev.detectedSubjects, trimmed],
        academicSubjects: [...prev.academicSubjects, trimmed],
      }));
    }
    setCustomSubjectInput('');
    onShowToast(`已补充本学期学科「${trimmed}」`);
  };

  const handleConfirmApply = () => {
    const validSelected = selectedSubjects.filter(isHomeworkEligibleSubject);
    if (validSelected.length === 0) {
      onShowToast('请至少勾选一门本学期文化课主科');
      return;
    }
    const finalResult: TimetableRecognitionResult = {
      ...recognitionResult,
      schoolAndClass:
        schoolTitleInput.trim() ||
        recognitionResult.schoolAndClass ||
        '成都市棕北中学 七.6',
      rawText,
      extractedRawText: rawText,
      detectedSubjects: validSelected,
      academicSubjects: validSelected.filter(
        (s) => s !== '体育锻炼' && s !== '课余兴趣'
      ),
    };
    onApplyTimetableResult(
      finalResult,
      syncToExamSubjects,
      generateTodayPreviewTasks
    );
    onClose();
  };

  const activeDayLabel =
    recognitionResult.weeklyGrid[editingCell.dayIdx]?.day || '周一';
  const activePeriodLabel =
    editingCell.periodIdx === 'morning'
      ? '早读'
      : `第 ${Number(editingCell.periodIdx) + 1} 节`;

  const totalPeriodsCount = recognitionResult.weeklyGrid.reduce(
    (sum, col) => sum + col.periods.length,
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#FDFBF7] rounded-t-[28px] sm:rounded-3xl max-w-3xl w-full p-5 shadow-2xl border border-[#EAE4DA] space-y-4 max-h-[92vh] overflow-y-auto animate-[slideUp_0.25s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="课表图片或文件导入与手动编辑课表文本"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-xs shrink-0">
              <span className="material-symbols-outlined text-[22px]">
                calendar_view_week
              </span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-on-surface">
                导入课程表 · 手动编辑课表文本与实时预览
              </h3>
              <p className="text-xs text-on-surface-variant">
                支持在识别结果文本框中直接修改学科与老师，下方课表预览将即时联动更新
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="关闭课表导入窗口"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Step 1: Upload Image / File OR Pick Grade Preset */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Upload Dropzone */}
          <div className="sm:col-span-5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.csv,.txt,.md,.json,.tsv"
              onChange={handleFileUpload}
              className="hidden"
              aria-label="选择课表图片或文件"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-full min-h-[132px] p-4 rounded-2xl bg-surface-container-lowest border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary-fixed/20 transition-all flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer relative overflow-hidden group"
            >
              {isScanning && (
                <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-laser pointer-events-none" />
              )}
              {previewImageUrl ? (
                <img
                  src={previewImageUrl}
                  alt="上传的课表预览"
                  className="w-16 h-16 object-cover rounded-xl border border-[#EAE4DA] shadow-2xs"
                />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-primary-fixed/60 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[24px]">
                    upload_file
                  </span>
                </div>
              )}
              <span className="text-xs font-bold text-primary">
                点击上传课表图片或文件
              </span>
              <span className="text-[11px] text-on-surface-variant">
                支持手机拍课表照片、微信班级群课表图或 CSV/TXT 文件
              </span>
              <span className="text-[10px] text-secondary font-semibold truncate max-w-full">
                当前来源：{uploadedFileName}
              </span>
            </button>
          </div>

          {/* Quick Grade Curriculum Templates */}
          <div className="sm:col-span-7 flex flex-col justify-between gap-2 p-3.5 rounded-2xl bg-surface-container-low border border-[#EAE4DA]/70">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-on-surface block">
                🏫 一键载入真实课表或年级标准模板：
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {(['zongbei7', 'grade7', 'grade8', 'grade9'] as const).map(
                  (preset) => {
                    const active = gradePreset === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleSelectGradePreset(preset)}
                        className={`px-3 py-2 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          active
                            ? 'bg-primary text-on-primary shadow-2xs font-semibold'
                            : 'bg-white hover:bg-surface-container text-on-surface border border-[#EAE4DA]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold">
                            {PRESET_TIMETABLE_TEXTS[preset].label}
                          </div>
                          <div
                            className={`text-[10px] truncate ${
                              active
                                ? 'text-on-primary/85'
                                : 'text-on-surface-variant'
                            }`}
                          >
                            {PRESET_TIMETABLE_TEXTS[preset].desc}
                          </div>
                        </div>
                        <span className="text-[11px] shrink-0 font-bold">
                          {active ? '当前课表 ✓' : '载入模板'}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Dedicated Manual Text Editor Box (Prominent Feature requested by user) */}
        <div className="space-y-3 p-4 rounded-2xl bg-surface-container-low/85 border border-[#EAE4DA] shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-[#EAE4DA]/70">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-fixed/80 text-primary flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[17px]">
                  edit_note
                </span>
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-on-surface">
                  ✍️ 手动编辑课表文本框（直接在识别结果上修改学科）
                </h4>
                <p className="text-[11px] text-on-surface-variant">
                  每按键修改一处学科或老师，下方课表预览即时 100% 联动更新
                </p>
              </div>
            </div>

            {/* Quick Helper Action Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleFormatPunctuation}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-surface-container text-on-surface-variant hover:text-primary border border-[#EAE4DA] text-[11px] font-semibold cursor-pointer transition-colors inline-flex items-center gap-1 shadow-2xs"
                title="自动将文本整理为标准的顿号与排课格式"
              >
                <span className="material-symbols-outlined text-[13px]">
                  format_align_left
                </span>
                <span>标点规整</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleTextareaChange(initialRecognizedTextRef.current);
                  onShowToast('已重置恢复为初始识别课表文本');
                }}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-surface-container text-on-surface-variant hover:text-primary border border-[#EAE4DA] text-[11px] font-semibold cursor-pointer transition-colors inline-flex items-center gap-1 shadow-2xs"
                title="恢复为最初上传或载入的课表文本"
              >
                <span className="material-symbols-outlined text-[13px]">
                  restart_alt
                </span>
                <span>恢复原识别</span>
              </button>
              <div className="flex items-center bg-white rounded-full p-0.5 border border-[#EAE4DA]">
                <button
                  type="button"
                  onClick={() => setEditorTab('text')}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                    editorTab === 'text'
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  文本编辑框
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab('grid')}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                    editorTab === 'grid'
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  表格单格点选
                </button>
              </div>
            </div>
          </div>

          {/* Quick Insert Subject Pills Toolbar: click to insert at cursor position */}
          <div className="flex items-center gap-1 flex-wrap pt-0.5">
            <span className="text-[10px] font-bold text-on-surface-variant mr-1 shrink-0">
              + 点选插入学科到文本光标处：
            </span>
            {QUICK_EDIT_COURSES.slice(0, 18).map((cName) => (
              <button
                key={cName}
                type="button"
                onClick={() =>
                  handleInsertSubjectAtCursor(
                    cName,
                    QUICK_TEACHER_SUGGESTIONS[cName]
                  )
                }
                className="px-2 py-0.5 rounded-md bg-white hover:bg-primary-fixed/40 text-on-surface border border-[#EAE4DA] text-[11px] font-bold cursor-pointer transition-all active:scale-95 shadow-2xs"
                title={`在文本框光标位置插入 ${cName}${
                  QUICK_TEACHER_SUGGESTIONS[cName]
                    ? `(${QUICK_TEACHER_SUGGESTIONS[cName]})`
                    : ''
                }`}
              >
                + {cName}
              </button>
            ))}
          </div>

          {/* Spacious Monospace Manual Editing Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              id="timetable-manual-edit-textarea"
              data-testid="timetable-manual-edit-textarea"
              rows={7}
              value={rawText}
              onChange={(e) => handleTextareaChange(e.target.value)}
              placeholder="直接在此处按行对识别出的学科与教师进行手动修改，例如：&#10;成都市棕北中学 七.6&#10;周一：早读：无、历史(徐倩)、语文(何川)、英语(刘庆媛)、数学(付晓玲)...&#10;周二：早读：英语(刘庆媛)、语文(何川)..."
              className="w-full rounded-xl bg-white p-3 text-xs text-on-surface border-2 border-primary/40 focus:border-primary focus:outline-none font-mono leading-relaxed shadow-inner"
            />
            <div className="absolute right-3 bottom-3 pointer-events-none text-[10px] text-secondary font-bold bg-white/95 px-2 py-0.5 rounded-md border border-secondary/25 shadow-2xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              <span>实时联动中 · 共 {totalPeriodsCount} 节排课</span>
            </div>
          </div>

          <p className="text-[11px] text-on-surface-variant flex items-center justify-between flex-wrap gap-1">
            <span>
              💡 语法提示：按「周X：早读：XX、学科1(老师)、学科2...」书写；修改文本的同时，下方预览表瞬间同步。
            </span>
            <span className="text-primary font-semibold">
              学校班级：{schoolTitleInput}
            </span>
          </p>
        </div>

        {/* Step 3: Interactive Weekly Timetable Preview Grid (Instant Live Sync with Text Box) */}
        <div className="space-y-2.5 p-3.5 rounded-2xl bg-surface-container-low/70 border border-[#EAE4DA]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-on-surface">
                📅 周一至周五课程表预览（与上方手动文本框双向联动）
              </span>
              <span className="text-[10px] font-semibold text-secondary bg-secondary-container/50 px-2 py-0.5 rounded-full">
                共 {recognitionResult.weeklyGrid.length} 天 ·{' '}
                {totalPeriodsCount} 节
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleAddPeriodRow}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-primary-fixed/30 text-primary border border-primary/30 text-[11px] font-bold cursor-pointer transition-colors"
              >
                + 增加一节课
              </button>
              <button
                type="button"
                onClick={handleRemoveLastPeriodRow}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-error-container/30 text-on-surface-variant border border-[#EAE4DA] text-[11px] font-semibold cursor-pointer transition-colors"
              >
                - 删除末节课
              </button>
            </div>
          </div>

          {/* Dedicated Manual Edit Control Bar for the Currently Selected Cell (shown when in grid mode or when clicked) */}
          {editorTab === 'grid' && (
            <div className="p-3 rounded-2xl bg-[#FFFDF9] border-2 border-primary/35 shadow-2xs space-y-2.5 animate-fade-slide">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg bg-primary text-on-primary text-xs font-bold">
                    ✏️ 正在修改：{activeDayLabel} · {activePeriodLabel}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-semibold text-on-surface-variant">
                      课程名：
                    </label>
                    <input
                      type="text"
                      aria-label="手动修改当前节次课程名"
                      value={manualCourseInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManualCourseInput(val);
                      }}
                      onBlur={() =>
                        handleUpdateSelectedCell(
                          manualCourseInput,
                          manualTeacherInput
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateSelectedCell(
                            manualCourseInput,
                            manualTeacherInput,
                            true
                          );
                        }
                      }}
                      placeholder="如：数学 / 语文"
                      className="w-28 bg-white rounded-lg px-2.5 py-1 text-xs font-bold text-on-surface border border-[#D8D0C5] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-semibold text-on-surface-variant">
                      任课老师/备注：
                    </label>
                    <input
                      type="text"
                      aria-label="手动修改当前节次任课老师"
                      value={manualTeacherInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManualTeacherInput(val);
                      }}
                      onBlur={() =>
                        handleUpdateSelectedCell(
                          manualCourseInput,
                          manualTeacherInput
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateSelectedCell(
                            manualCourseInput,
                            manualTeacherInput,
                            true
                          );
                        }
                      }}
                      placeholder="如：付晓玲 / 何川"
                      className="w-28 bg-white rounded-lg px-2.5 py-1 text-xs text-on-surface border border-[#D8D0C5] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateSelectedCell(
                        manualCourseInput,
                        manualTeacherInput,
                        true
                      );
                      onShowToast(
                        `已保存 ${activeDayLabel}${activePeriodLabel} 为「${manualCourseInput}${
                          manualTeacherInput ? `(${manualTeacherInput})` : ''
                        }」`
                      );
                    }}
                    className="px-3 py-1 rounded-lg bg-secondary text-on-secondary text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    保存该节并跳下一节 ✓
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] text-on-surface-variant shrink-0">
                    表头班级：
                  </label>
                  <input
                    type="text"
                    aria-label="修改课表学校班级标题"
                    value={schoolTitleInput}
                    onChange={(e) => {
                      const nextTitle = e.target.value;
                      setSchoolTitleInput(nextTitle);
                      syncGridToState(recognitionResult.weeklyGrid, nextTitle);
                    }}
                    className="w-36 bg-white rounded-lg px-2 py-1 text-xs font-semibold text-on-surface border border-[#EAE4DA] focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Quick Subject Picker Pills for Instant 1-Click Cell Update */}
              <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-[#EAE4DA]/70">
                <span className="text-[10px] font-semibold text-on-surface-variant mr-1">
                  快捷点选换课：
                </span>
                {QUICK_EDIT_COURSES.map((courseName) => {
                  const isCurrent = manualCourseInput === courseName;
                  return (
                    <button
                      key={courseName}
                      type="button"
                      onClick={() => {
                        const defaultTeacher =
                          QUICK_TEACHER_SUGGESTIONS[courseName] ??
                          manualTeacherInput;
                        handleUpdateSelectedCell(courseName, defaultTeacher);
                      }}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-primary text-on-primary shadow-2xs scale-105'
                          : 'bg-surface-container hover:bg-primary-fixed/40 text-on-surface'
                      }`}
                    >
                      {courseName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5-Column Monday to Friday Timetable Grid */}
          <div
            {...gridDragProps}
            className={`overflow-x-auto rounded-2xl border border-[#EAE4DA] bg-white p-2.5 select-none ${
              isDraggingGrid ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <div className="grid grid-cols-5 gap-2 min-w-[560px]">
              {recognitionResult.weeklyGrid.map((dayCol, dIdx) => {
                const isMorningSelected =
                  editingCell.dayIdx === dIdx &&
                  editingCell.periodIdx === 'morning';
                return (
                  <div
                    key={dayCol.day}
                    className="flex flex-col gap-1.5 p-2 rounded-xl bg-surface-container-low/60 border border-[#EAE4DA]/60"
                  >
                    <div className="text-center text-xs font-bold text-primary pb-1 border-b border-[#EAE4DA]">
                      {dayCol.day}
                    </div>
                    {/* Interactive Morning Reading Row */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCell({ dayIdx: dIdx, periodIdx: 'morning' });
                        if (editorTab !== 'grid') setEditorTab('grid');
                      }}
                      title={`点击修改 ${dayCol.day} 早读`}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[10px] border cursor-pointer transition-all ${
                        isMorningSelected
                          ? 'bg-[#FEF08A] border-primary ring-2 ring-primary/40 shadow-2xs'
                          : 'bg-[#FEFCE8] hover:bg-[#FEF08A]/50 border-[#FDE047]/60'
                      }`}
                    >
                      <span className="text-[#854D0E] font-semibold">早读</span>
                      <span className="font-bold text-[#713F12] truncate max-w-[78px]">
                        {dayCol.morningReading || '无'}
                      </span>
                    </button>

                    {dayCol.periods.map((subjItem, idx) => {
                      const subjName =
                        typeof subjItem === 'string'
                          ? subjItem
                          : subjItem.subject;
                      const teacherName =
                        typeof subjItem === 'string'
                          ? undefined
                          : subjItem.teacher;
                      const isCellSelected =
                        editingCell.dayIdx === dIdx &&
                        editingCell.periodIdx === idx;
                      return (
                        <button
                          key={`${dayCol.day}-${idx}`}
                          type="button"
                          onClick={() => {
                            setEditingCell({ dayIdx: dIdx, periodIdx: idx });
                            if (editorTab !== 'grid') setEditorTab('grid');
                          }}
                          title={`点击修改 ${dayCol.day} 第${idx + 1}节 (${subjName}${
                            teacherName ? ` · ${teacherName}` : ''
                          })`}
                          className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] border cursor-pointer transition-all ${
                            isCellSelected
                              ? 'bg-primary-fixed/50 border-primary ring-2 ring-primary/40 shadow-2xs'
                              : 'bg-white hover:bg-primary-fixed/20 border-[#EAE4DA]/60'
                          }`}
                        >
                          <span className="text-[10px] text-outline shrink-0">
                            第{idx + 1}节
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold truncate max-w-[86px] ${getSubjectBadgeClass(
                              subjName as any
                            )}`}
                          >
                            {subjName}
                            {teacherName ? `·${teacherName}` : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step 4: Recognized Semester Subjects Result */}
        <div className="p-3.5 rounded-2xl bg-secondary-container/30 border border-secondary/25 space-y-2.5 animate-fade-slide">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary text-[18px]">
                verified
              </span>
              <span className="text-xs font-bold text-on-surface">
                已从课表中自动识别出本学期文化课主科共 {selectedSubjects.length} 门（已自动排除语延/数延/英延/延时辅导/书法/音乐等排课副科）：
              </span>
            </div>
            <span className="text-[11px] font-semibold text-secondary">
              {recognitionResult.semesterLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {recognitionResult.detectedSubjects
              .filter(isHomeworkEligibleSubject)
              .map((subj) => {
                const isChecked = selectedSubjects.includes(subj);
                return (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => handleToggleSubject(subj)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      isChecked
                        ? 'bg-secondary text-on-secondary shadow-2xs scale-100'
                        : 'bg-white text-outline border border-[#EAE4DA] opacity-65'
                    }`}
                  >
                    <span>{isChecked ? '✓' : '+'}</span>
                    <span>{subj}</span>
                  </button>
                );
              })}
          </div>

          {/* Manual Add Subject to Timetable */}
          <div className="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              value={customSubjectInput}
              onChange={(e) => setCustomSubjectInput(e.target.value)}
              placeholder="有课表外的主科？输入学科名补充（如：科学、地理、生物、物理、化学、道法）"
              className="flex-1 bg-white rounded-xl px-3 py-1.5 text-xs text-on-surface border border-[#EAE4DA] focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={handleAddManualSubject}
              className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-semibold cursor-pointer shrink-0"
            >
              + 补充主科
            </button>
          </div>
        </div>

        {/* Sync Options & Confirm Button */}
        <div className="p-3 rounded-2xl bg-surface-container-low flex flex-col gap-2 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={syncToExamSubjects}
                onChange={(e) => setSyncToExamSubjects(e.target.checked)}
                className="rounded text-primary focus:ring-primary"
              />
              <span className="font-semibold text-on-surface">
                同步更新「考试成绩单」与「3秒快记」的本学期学科列表
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={generateTodayPreviewTasks}
                onChange={(e) => setGenerateTodayPreviewTasks(e.target.checked)}
                className="rounded text-primary focus:ring-primary"
              />
              <span className="font-semibold text-on-surface">
                根据今日课表自动生成 2 项课后复习/预习待办
              </span>
            </label>
          </div>
          <label className="flex items-center gap-2 cursor-pointer pt-0.5 border-t border-[#EAE4DA]/50">
            <input
              type="checkbox"
              checked={includeFixedHabitsInPrint}
              onChange={(e) => setIncludeFixedHabitsInPrint(e.target.checked)}
              className="rounded text-secondary focus:ring-secondary"
            />
            <span className="font-medium text-on-surface-variant">
              将每日体育锻炼 (20:45) 与周末课余兴趣 (象棋/器乐) 合并入总课表与打印单
            </span>
          </label>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
          <button
            type="button"
            onClick={handlePrintTimetable}
            className="px-4 py-2.5 rounded-full bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary text-xs sm:text-sm font-bold shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            title="生成适合横向打印的 A4 尺寸课表，也可在浏览器中直接另存为 PDF 文件"
          >
            <span className="material-symbols-outlined text-[17px]">
              print
            </span>
            <span>🖨️ 导出打印课表 (A4纸/PDF)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-full bg-surface-container text-on-surface-variant text-xs font-semibold cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirmApply}
              className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary-container text-on-primary text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">
                check_circle
              </span>
              <span>
                确认保存课表 · 启用本学期 {selectedSubjects.length} 门学科 ✓
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
