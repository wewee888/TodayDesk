import React, { useEffect, useRef, useState } from 'react';
import type {
  ScheduleItem,
  SubjectName,
  TimetableRecognitionResult,
} from '../types/study';
import {
  getSubjectBadgeClass,
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
}

const PRESET_TIMETABLE_TEXTS: Record<
  'zongbei7' | 'grade7' | 'grade8' | 'grade9',
  { label: string; desc: string; text: string }
> = {
  zongbei7: {
    label: '成都市棕北中学 七.6班实测课表',
    desc: '真实初一课表 · 语数英生历地道法 + 书法/心理/体锻/素质选修',
    text:
      '成都市棕北中学 初2026届7年级6班课程表\n' +
      '周一：语文、数学、英语、生物、地理、书法、体育\n' +
      '周二：数学、语文、英语、历史、心理健康、音乐、体育\n' +
      '周三：英语、数学、语文、道德与法治、生物、美术、素质选修\n' +
      '周四：语文、英语、数学、地理、历史、信息科技、体育\n' +
      '周五：数学、语文、英语、道德与法治、劳动实践、体锻、班会',
  },
  grade7: {
    label: '初一标准课表 (7门文化课)',
    desc: '语数英 + 历地生道法 + 体育/信息/美音',
    text: '周一：语文、数学、英语、地理、历史、体育、道法\n周二：数学、语文、英语、生物、地理、音乐、信息科技\n周三：英语、数学、语文、历史、生物、体育、美术\n周四：语文、数学、英语、道法、地理、生物、信息科技\n周五：数学、英语、语文、历史、道法、体育、班会',
  },
  grade8: {
    label: '初二全科课表 (8门文化课·含物理/地生)',
    desc: '语数英物 + 历地生道法 + 体育/信息/美术',
    text: '周一：数学、语文、英语、物理、地理、生物、体育\n周二：英语、数学、物理、语文、历史、道法、信息科技\n周三：语文、数学、英语、物理、生物、地理、体育\n周四：数学、物理、英语、语文、历史、地理、生物\n周五：英语、语文、数学、物理、道法、体育、美术',
  },
  grade9: {
    label: '初三中考课表 (含物理/化学)',
    desc: '语数英物化 + 历史道法 + 中考体育强化',
    text: '周一：数学、语文、英语、物理、化学、历史、体育\n周二：英语、数学、物理、化学、语文、道法、体育\n周三：语文、数学、英语、化学、物理、历史、信息科技\n周四：数学、物理、化学、英语、语文、道法、体育\n周五：英语、语文、数学、物理、化学、历史、道法',
  },
};

export const TimetableImportModal: React.FC<TimetableImportModalProps> = ({
  isOpen,
  onClose,
  onApplyTimetableResult,
  onShowToast,
  gradeClass,
  studentName,
  schedules,
}) => {
  const [gradePreset, setGradePreset] = useState<
    'zongbei7' | 'grade7' | 'grade8' | 'grade9'
  >('zongbei7');
  const [rawText, setRawText] = useState(PRESET_TIMETABLE_TEXTS.zongbei7.text);
  const [uploadedFileName, setUploadedFileName] = useState<string>(
    '成都市棕北中学_七.6班_课表.png'
  );
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const [recognitionResult, setRecognitionResult] =
    useState<TimetableRecognitionResult>(() =>
      parseTimetableContent(
        PRESET_TIMETABLE_TEXTS.zongbei7.text,
        '成都市棕北中学_七.6班_课表.png',
        'grade7'
      )
    );

  // Selected subjects to sync into the app
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectName[]>(
    () =>
      parseTimetableContent(
        PRESET_TIMETABLE_TEXTS.zongbei7.text,
        '成都市棕北中学_七.6班_课表.png',
        'grade7'
      ).detectedSubjects
  );
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [syncToExamSubjects, setSyncToExamSubjects] = useState(true);
  const [generateTodayPreviewTasks, setGenerateTodayPreviewTasks] =
    useState(true);
  const [includeFixedHabitsInPrint, setIncludeFixedHabitsInPrint] = useState(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { dragProps: gridDragProps, isDragging: isDraggingGrid } =
    useDragScroll<HTMLDivElement>();

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

  const runSmartRecognition = async (
    textToParse: string,
    fileName: string,
    preset: 'zongbei7' | 'grade7' | 'grade8' | 'grade9',
    imageBase64?: string,
    mimeType?: string
  ) => {
    setIsScanning(true);
    const gradeLevel = preset === 'zongbei7' ? 'grade7' : preset;
    const localImmediate = parseTimetableContent(textToParse, fileName, gradeLevel);
    setRecognitionResult(localImmediate);
    setSelectedSubjects(localImmediate.detectedSubjects);

    // Only call backend AI endpoint when an image is uploaded or extra subject extraction is needed,
    // and never let an empty/incomplete backend weeklyGrid overwrite the line-by-line parsed weeklyGrid!
    try {
      const res = await fetch('/api/ai/parse-timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToParse,
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

          if (imageBase64 && data.result.rawText) {
            setRawText(data.result.rawText);
          }

          const finalWeeklyGrid = hasCompleteApiGrid
            ? apiGrid
            : imageBase64 && data.result.rawText
            ? parseTimetableContent(
                data.result.rawText,
                fileName,
                gradeLevel
              ).weeklyGrid
            : localImmediate.weeklyGrid;

          const mergedDetected = imageBase64
            ? (data.result.detectedSubjects as SubjectName[])
            : localImmediate.detectedSubjects;

          setRecognitionResult({
            ...localImmediate,
            ...data.result,
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
      }, 450);
    }
  };

  const handleSelectGradePreset = (
    preset: 'zongbei7' | 'grade7' | 'grade8' | 'grade9'
  ) => {
    setGradePreset(preset);
    const presetMeta = PRESET_TIMETABLE_TEXTS[preset];
    setRawText(presetMeta.text);
    const fileName = `${presetMeta.label}.png`;
    setUploadedFileName(fileName);
    setPreviewImageUrl(null);
    runSmartRecognition(presetMeta.text, fileName, preset);
    onShowToast(`已载入「${presetMeta.label}」并自动识别本学期全部学科 ✨`);
  };

  const handlePrintTimetable = () => {
    const printRoot = document.getElementById('todaydesk-printable-root');
    if (!printRoot) {
      window.print();
      return;
    }

    const schoolTitle =
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
    ];

    let rowsHtml = '';
    const hasMorningReading = dayCols.some((d) => Boolean(d.morningReading));
    if (hasMorningReading) {
      let morningCells = `<td style="border:1px solid #333; padding:5px; font-weight:bold; background:#fefce8;">早读<div style="font-size:10px; color:#555;">07:35 - 07:55</div></td>`;
      for (let dIdx = 0; dIdx < 5; dIdx++) {
        const mSubj = dayCols[dIdx]?.morningReading || '—';
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
        runSmartRecognition(
          rawText,
          compressed.file.name,
          gradePreset,
          compressed.dataUrl,
          'image/webp'
        );
        onShowToast(
          `📷 已将课表智能压缩 (${compressed.savedPercent}) 并识别本学期学科！`
        );
      } catch {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || '');
          setPreviewImageUrl(dataUrl);
          runSmartRecognition(
            rawText,
            file.name,
            gradePreset,
            dataUrl,
            file.type
          );
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
        runSmartRecognition(fileText || rawText, file.name, gradePreset);
        onShowToast(
          `📄 已解析课表文件「${file.name}」，自动提取出本学期学科！`
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
    if (selectedSubjects.length === 0) {
      onShowToast('请至少勾选一门本学期学科');
      return;
    }
    const finalResult: TimetableRecognitionResult = {
      ...recognitionResult,
      detectedSubjects: selectedSubjects,
      academicSubjects: selectedSubjects.filter(
        (s) =>
          s !== '体育锻炼' &&
          s !== '课余兴趣' &&
          s !== '美术' &&
          s !== '音乐'
      ),
    };
    onApplyTimetableResult(
      finalResult,
      syncToExamSubjects,
      generateTodayPreviewTasks
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#FDFBF7] rounded-t-[28px] sm:rounded-3xl max-w-2xl w-full p-5 shadow-2xl border border-[#EAE4DA] space-y-4 max-h-[90vh] overflow-y-auto animate-[slideUp_0.25s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="课表图片或文件导入与本学期学科识别"
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
                导入学校课程表 · 自动识别本学期全部学科
              </h3>
              <p className="text-xs text-on-surface-variant">
                支持上传课表图片 (JPG/PNG) 或文件 (CSV/TXT/表格)，一键提取本学期开设学科并同步至快记与成绩单
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

          {/* Quick Grade Curriculum Templates & Editable Text */}
          <div className="sm:col-span-7 flex flex-col justify-between gap-2 p-3.5 rounded-2xl bg-surface-container-low border border-[#EAE4DA]/70">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-on-surface block">
                🏫 或一键选择本学期年级标准课表模板：
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {(['zongbei7', 'grade7', 'grade8', 'grade9'] as const).map((preset) => {
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
                        {active ? '已启用 ✓' : '点此识别'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Editable OCR / Timetable Text Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <label
              htmlFor="timetable-ocr-textarea"
              className="text-xs font-bold text-on-surface"
            >
              📝 课表识别文本内容（可直接粘贴班级课表文字，系统实时提取全部学科）：
            </label>
            <button
              type="button"
              onClick={() =>
                runSmartRecognition(rawText, uploadedFileName, gradePreset)
              }
              className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold hover:bg-secondary hover:text-on-secondary transition-colors cursor-pointer"
            >
              {isScanning ? '✨ 正在智能识别中...' : '🔄 重新识别课表学科'}
            </button>
          </div>
          <textarea
            id="timetable-ocr-textarea"
            rows={2}
            value={rawText}
            onChange={(e) => {
              const val = e.target.value;
              setRawText(val);
              const updated = parseTimetableContent(
                val,
                uploadedFileName,
                gradePreset === 'zongbei7' ? 'grade7' : gradePreset
              );
              setRecognitionResult(updated);
              setSelectedSubjects(updated.detectedSubjects);
            }}
            placeholder="粘贴或输入课表内容，例如：周一 语文 数学 英语 物理 地理 生物 道法 历史..."
            className="w-full rounded-xl bg-white p-2.5 text-xs text-on-surface border border-[#EAE4DA] focus:outline-none focus:border-primary"
          />
        </div>

        {/* Step 2: Recognized Semester Subjects Result */}
        <div className="p-3.5 rounded-2xl bg-secondary-container/30 border border-secondary/25 space-y-2.5 animate-fade-slide">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary text-[18px]">
                verified
              </span>
              <span className="text-xs font-bold text-on-surface">
                已从课表中自动识别出本学期共 {selectedSubjects.length} 门学科（点击可勾选/取消）：
              </span>
            </div>
            <span className="text-[11px] font-semibold text-secondary">
              {recognitionResult.semesterLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {recognitionResult.detectedSubjects.map((subj) => {
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
              placeholder="有课表外的选修/地方课？输入学科名补充（如：人工智能、书法）"
              className="flex-1 bg-white rounded-xl px-3 py-1.5 text-xs text-on-surface border border-[#EAE4DA] focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={handleAddManualSubject}
              className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-semibold cursor-pointer shrink-0"
            >
              + 补充学科
            </button>
          </div>
        </div>

        {/* Step 3: Weekly Timetable Preview Grid (PC Left-Mouse Drag Scrollable + Click to Edit Cells & Morning Reading) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs flex-wrap gap-1">
            <span className="font-bold text-on-surface">
              📅 识别出的周一至周五课程表预览（保留同日重复科目与真实节次）
            </span>
            <span className="text-[11px] text-on-surface-variant">
              💡 点击任意早读或节次可快速切换科目 · PC端按住左键可滑动
            </span>
          </div>
          <div
            {...gridDragProps}
            className={`overflow-x-auto rounded-2xl border border-[#EAE4DA] bg-white p-2.5 select-none ${
              isDraggingGrid ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <div className="grid grid-cols-5 gap-2 min-w-[520px]">
              {recognitionResult.weeklyGrid.map((dayCol, dIdx) => (
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
                      const cycle = ['', '语文', '英语', '道法', '历史'];
                      const cur = dayCol.morningReading || '';
                      const next = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
                      setRecognitionResult((prev) => ({
                        ...prev,
                        weeklyGrid: prev.weeklyGrid.map((col, i) =>
                          i === dIdx
                            ? { ...col, morningReading: next || undefined }
                            : col
                        ),
                      }));
                    }}
                    title="点击切换早读科目（无 / 语文 / 英语 / 道法 / 历史）"
                    className="flex items-center justify-between px-2 py-1 rounded-lg bg-[#FEFCE8] hover:bg-[#FEF08A]/50 text-[10px] border border-[#FDE047]/60 cursor-pointer transition-colors"
                  >
                    <span className="text-[#854D0E] font-semibold">早读</span>
                    <span className="font-bold text-[#713F12]">
                      {dayCol.morningReading || '点此设置'}
                    </span>
                  </button>

                  {dayCol.periods.map((subjItem, idx) => {
                    const subjName =
                      typeof subjItem === 'string' ? subjItem : subjItem.subject;
                    const teacherName =
                      typeof subjItem === 'string' ? undefined : subjItem.teacher;
                    return (
                      <button
                        key={`${dayCol.day}-${idx}`}
                        type="button"
                        onClick={() => {
                          const cyclePool =
                            selectedSubjects.length > 0
                              ? selectedSubjects
                              : ['语文', '数学', '英语', '生物', '地理', '历史', '道法', '体育锻炼'];
                          const curIdx = cyclePool.indexOf(subjName);
                          const nextSubj =
                            cyclePool[(curIdx + 1) % cyclePool.length];
                          setRecognitionResult((prev) => ({
                            ...prev,
                            weeklyGrid: prev.weeklyGrid.map((col, i) => {
                              if (i !== dIdx) return col;
                              const nextPeriods = col.periods.map((p, pIdx) =>
                                pIdx === idx
                                  ? typeof p === 'string'
                                    ? nextSubj
                                    : { ...p, subject: nextSubj }
                                  : p
                              );
                              return { ...col, periods: nextPeriods };
                            }),
                          }));
                        }}
                        title={`点击切换 ${dayCol.day} 第${idx + 1}节 科目`}
                        className="flex items-center justify-between px-2 py-1 rounded-lg bg-white hover:bg-primary-fixed/20 text-[11px] border border-[#EAE4DA]/50 cursor-pointer transition-colors"
                      >
                        <span className="text-[10px] text-outline">
                          第{idx + 1}节
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${getSubjectBadgeClass(
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
              ))}
            </div>
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
                确认导入课表 · 启用本学期 {selectedSubjects.length} 门学科 ✓
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
