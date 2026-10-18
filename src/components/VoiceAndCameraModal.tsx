import React, { useState } from 'react';
import type { ParsedVoiceTask } from '../types/study';
import { parseVoiceCommandLocal } from '../utils/studyLogic';

interface VoiceAndCameraModalProps {
  mode: 'voice' | 'camera' | null;
  onClose: () => void;
  onAddParsedTasks: (tasks: ParsedVoiceTask[]) => void;
  onImportRecognizedScores: (scores: {
    math: number;
    english: number;
    chinese: number;
  }) => void;
  onShowToast: (msg: string) => void;
}

const VOICE_PRESETS = [
  '今天数学写了一张卷子花了一个小时，物理预习了第三章20分钟',
  '晚上跳绳20分钟，1000米耐力跑25分钟，英语背诵15分钟',
  '周末练了象棋45分钟，练了钢琴一个半小时，练了小号30分钟',
];

export const VoiceAndCameraModal: React.FC<VoiceAndCameraModalProps> = ({
  mode,
  onClose,
  onAddParsedTasks,
  onImportRecognizedScores,
  onShowToast,
}) => {
  const [voiceInput, setVoiceInput] = useState(VOICE_PRESETS[0]);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedTasks, setParsedTasks] = useState<ParsedVoiceTask[]>(() =>
    parseVoiceCommandLocal(VOICE_PRESETS[0])
  );
  const [cameraTab, setCameraTab] = useState<'board' | 'score'>('board');

  if (!mode) return null;

  const handleParseVoice = async (textToParse: string) => {
    setVoiceInput(textToParse);
    const immediate = parseVoiceCommandLocal(textToParse);
    setParsedTasks(immediate);
    setIsParsing(true);
    try {
      const res = await fetch('/api/ai/parse-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToParse }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tasks) && data.tasks.length > 0) {
          setParsedTasks(data.tasks);
        }
      }
    } catch {
      // Fallback already populated via parseVoiceCommandLocal
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#FDFBF7] rounded-t-[28px] sm:rounded-3xl max-w-lg w-full p-5 shadow-2xl border border-[#EAE4DA] space-y-4 animate-[slideUp_0.22s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={mode === 'voice' ? '一句话语音智能拆解' : '拍板书或成绩单识别'}
      >
        {mode === 'voice' ? (
          <>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">
                    mic
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">
                    一句话语音解析 · 免打字建单
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    说出多科作业与耗时，AI 自动拆解为结构化卡片
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="关闭语音面板"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            {/* Quick Voice Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-on-surface-variant">
                点击试听常见口述示例：
              </span>
              <div className="flex flex-col gap-1.5">
                {VOICE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleParseVoice(preset)}
                    className={`text-left px-3 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      voiceInput === preset
                        ? 'bg-primary-fixed/60 text-on-primary-fixed font-semibold border border-primary/30'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    <span className="truncate">“{preset}”</span>
                    <span className="text-[11px] text-primary shrink-0">
                      一键识别
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Editable Voice Transcript Box */}
            <div className="space-y-1.5">
              <label
                htmlFor="voice-transcript-input"
                className="text-[11px] font-semibold text-on-surface-variant block"
              >
                语音识别文本（可自由修改补充）：
              </label>
              <div className="flex gap-2">
                <input
                  id="voice-transcript-input"
                  type="text"
                  value={voiceInput}
                  onChange={(e) => {
                    setVoiceInput(e.target.value);
                    setParsedTasks(parseVoiceCommandLocal(e.target.value));
                  }}
                  placeholder="例如：数学卷子40分钟，英语背诵15分钟"
                  className="flex-1 bg-white rounded-xl px-3 py-2 text-xs text-on-surface border border-outline-variant/50 focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => handleParseVoice(voiceInput)}
                  className="px-3 py-2 rounded-xl bg-surface-container text-primary text-xs font-semibold hover:bg-surface-container-high cursor-pointer shrink-0"
                >
                  {isParsing ? '解析中...' : 'AI重拆'}
                </button>
              </div>
            </div>

            {/* Structured Breakdown Preview */}
            <div className="space-y-2 bg-surface-container-low p-3 rounded-2xl border border-surface-container">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-secondary">
                  ⚡ 自动拆解为 {parsedTasks.length} 条结构化记录：
                </span>
              </div>
              <div className="space-y-1.5">
                {parsedTasks.map((t, idx) => (
                  <div
                    key={`${t.subject}-${idx}`}
                    className="p-2.5 rounded-xl bg-white shadow-2xs flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-2 py-0.5 rounded-md bg-secondary-container text-on-secondary-container text-[11px] font-semibold shrink-0">
                        {t.category} | {t.subject}
                      </span>
                      <span className="font-semibold text-on-surface truncate">
                        {t.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-bold text-[11px]">
                        {t.estimatedMinutes}min
                      </span>
                      <span className="text-[10px] text-outline">
                        {t.statusNote}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (parsedTasks.length > 0) {
                  onAddParsedTasks(parsedTasks);
                  onClose();
                }
              }}
              className="w-full py-3 rounded-full bg-primary text-on-primary text-sm font-semibold shadow-md hover:bg-primary-container active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">
                add_task
              </span>
              <span>确认生成并加入今日书桌 ({parsedTasks.length} 项)</span>
            </button>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">
                    photo_camera
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">
                    AI 视觉识图 · 拍板书 / 拍成绩单
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    对准教室黑板或考卷分数条，1秒入库免手敲
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="关闭识图面板"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <div className="flex p-1 rounded-full bg-surface-container">
              <button
                type="button"
                onClick={() => setCameraTab('board')}
                className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  cameraTab === 'board'
                    ? 'bg-white text-on-surface shadow-2xs'
                    : 'text-on-surface-variant'
                }`}
              >
                拍教室黑板 / 群作业截图
              </button>
              <button
                type="button"
                onClick={() => setCameraTab('score')}
                className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  cameraTab === 'score'
                    ? 'bg-white text-on-surface shadow-2xs'
                    : 'text-on-surface-variant'
                }`}
              >
                拍月考成绩条 / 试卷分数
              </button>
            </div>

            {cameraTab === 'board' ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-[#2A3B32] text-[#E9F2EC] font-sans space-y-2 shadow-inner border-2 border-[#C8A97E]">
                  <div className="flex items-center justify-between text-[11px] text-[#A4C3B2]">
                    <span>📋 初二(3)班 今日课后作业板书</span>
                    <span>AI 视觉框选已就绪</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p>1. 【物理】完成凸透镜成像作图精练 P.28（预计25分钟）</p>
                    <p>2. 【化学】背诵常见元素化合价口诀并默写（预计15分钟）</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onAddParsedTasks([
                      {
                        category: '作业',
                        subject: '物理',
                        taskType: '作业练习',
                        title: '凸透镜成像作图精练 P.28',
                        estimatedMinutes: 25,
                        statusNote: '板书识别',
                      },
                      {
                        category: '作业',
                        subject: '化学',
                        taskType: '背诵默写',
                        title: '常见元素化合价口诀背诵与默写',
                        estimatedMinutes: 15,
                        statusNote: '板书识别',
                      },
                    ]);
                    onClose();
                  }}
                  className="w-full py-3 rounded-full bg-secondary text-on-secondary text-sm font-semibold shadow-md hover:bg-secondary/90 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    document_scanner
                  </span>
                  <span>一键识别板书并导入 2 门作业</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/50 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-on-surface">
                    <span>📄 识别到：初二年级阶段监测成绩条（李子涵）</span>
                    <span className="text-[11px] text-secondary">置信度 99%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="bg-white p-2 rounded-xl text-center">
                      <div className="text-[11px] text-on-surface-variant">数学</div>
                      <div className="text-base font-bold text-primary">116 / 120</div>
                    </div>
                    <div className="bg-white p-2 rounded-xl text-center">
                      <div className="text-[11px] text-on-surface-variant">英语</div>
                      <div className="text-base font-bold text-secondary">118 / 120</div>
                    </div>
                    <div className="bg-white p-2 rounded-xl text-center">
                      <div className="text-[11px] text-on-surface-variant">语文</div>
                      <div className="text-base font-bold text-tertiary">108 / 120</div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onImportRecognizedScores({
                      math: 116,
                      english: 118,
                      chinese: 108,
                    });
                    onShowToast('成绩单识别入库成功！已同步至成长档案 🎯');
                    onClose();
                  }}
                  className="w-full py-3 rounded-full bg-primary text-on-primary text-sm font-semibold shadow-md hover:bg-primary-container cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    fact_check
                  </span>
                  <span>同步成绩至「成长档案与清账」</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
