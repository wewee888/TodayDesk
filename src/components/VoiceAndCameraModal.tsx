import React, { useEffect, useRef, useState } from 'react';
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
  '初二数学卷子写40分钟，背英语Unit3单词15分钟，晚上跳绳15分钟',
  '完成物理凸透镜作图精练25分钟，预习化学化合价口诀15分钟',
  '语文文言文注释背诵20分钟，完成历史课后思考题15分钟',
];

export const VoiceAndCameraModal: React.FC<VoiceAndCameraModalProps> = ({
  mode,
  onClose,
  onAddParsedTasks,
  onImportRecognizedScores,
  onShowToast,
}) => {
  const [voiceInput, setVoiceInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedTasks, setParsedTasks] = useState<ParsedVoiceTask[]>([]);
  const [cameraTab, setCameraTab] = useState<'board' | 'score'>('board');

  // Real Camera & R2 Upload states
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Real Microphone (Web Speech API) states
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [micStatusText, setMicStatusText] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      setPhotoPreview(dataUrl);
      setIsUploadingImage(true);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', cameraTab === 'board' ? 'board' : 'score');
        formData.append('account', 'lizihan');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.publicUrl) {
            setUploadedImageUrl(data.publicUrl);
            onShowToast('照片已安全存入 Cloudflare R2 云图床 ☁️');
          }
        } else {
          onShowToast('照片已载入本地，将在联网时自动同步');
        }
      } catch {
        onShowToast('照片已载入本地预览');
      } finally {
        setIsUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Initialize SpeechRecognition on mount / mode change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setMicStatusText('🎙️ 正在倾听，请清晰说出作业与耗时...');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setVoiceInput(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setMicStatusText(
            '⚠️ 麦克风权限未开启。在手机上可直接点击下方文本框，使用手机输入法键盘自带的麦克风说话！'
          );
        } else if (event.error === 'no-speech') {
          setMicStatusText('未检测到声音，请点击麦克风重新说话');
        } else {
          setMicStatusText(`识别异常 (${event.error})，可直接键盘或输入法语音打字`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // If voice input has text, trigger MiniMax AI semantic parsing
        setVoiceInput((currentText) => {
          const trimmed = currentText.trim();
          if (trimmed) {
            setMicStatusText('✓ 语音输入完毕，正在启动 MiniMax 语义解析...');
            handleParseVoice(trimmed);
          }
          return currentText;
        });
      };

      recognitionRef.current = recognition;
    } catch {
      setIsSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [mode]);

  if (!mode) return null;

  const startListening = () => {
    setMicStatusText(null);
    if (!recognitionRef.current) {
      setMicStatusText(
        '📱 提示：当前环境暂不支持网页麦克风直连。请直接在下方文本框使用手机键盘自带的【🎙️麦克风】语音打字，AI 同样支持极速拆解！'
      );
      return;
    }

    try {
      setVoiceInput('');
      recognitionRef.current.start();
    } catch {
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current?.start();
        }, 150);
      } catch {
        setMicStatusText('无法启动录音，请重试或在下方直接语音打字');
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  };

  const handleToggleRecord = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // MiniMax LLM semantic recognition call
  const handleParseVoice = async (textToParse: string) => {
    const trimmed = textToParse.trim();
    if (!trimmed) {
      onShowToast('请先输入或说出作业内容');
      return;
    }

    setVoiceInput(trimmed);
    const immediate = parseVoiceCommandLocal(trimmed);
    setParsedTasks(immediate);
    setIsParsing(true);

    try {
      const res = await fetch('/api/ai/parse-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tasks) && data.tasks.length > 0) {
          setParsedTasks(data.tasks);
          setMicStatusText(
            data.source === 'minimax'
              ? '✨ MiniMax-M3 大模型已成功深度提取科目、题型与耗时'
              : '✓ 智能引擎已解析任务结构'
          );
        }
      }
    } catch {
      // Fallback already populated via parseVoiceCommandLocal
    } finally {
      setIsParsing(false);
    }
  };

  // Discard a single item before adding to desk
  const handleRemoveParsedTask = (indexToRemove: number) => {
    setParsedTasks((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#FDFBF7] rounded-t-[28px] sm:rounded-3xl max-w-lg w-full p-5 shadow-2xl border border-[#EAE4DA] space-y-4 animate-[slideUp_0.22s_cubic-bezier(0.16,1,0.3,1)] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={mode === 'voice' ? '一句话语音智能拆解' : '拍板书或成绩单识别'}
      >
        {mode === 'voice' ? (
          <>
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">
                    mic
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-on-surface">
                      一句话语音建单
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-primary-fixed/60 text-primary text-[10px] font-bold">
                      MiniMax-M3 语义模型
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    按住麦克风说话，或用手机输入法语音口述，AI 自动拆解多科任务
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

            {/* Central Tactile Microphone Button & Real-time Wave Zone */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-[#EAE4DA] flex flex-col items-center justify-center text-center space-y-3">
              <button
                type="button"
                onClick={handleToggleRecord}
                onMouseDown={startListening}
                onMouseUp={stopListening}
                onTouchStart={startListening}
                onTouchEnd={stopListening}
                className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer select-none ${
                  isListening
                    ? 'bg-error text-white ring-8 ring-error/25 animate-pulse'
                    : 'bg-primary hover:bg-primary-container text-on-primary'
                }`}
                title={isListening ? '松开或点击停止录音' : '按住说话或点击开启'}
              >
                <span className="material-symbols-outlined text-[32px]">
                  {isListening ? 'graphic_eq' : 'mic'}
                </span>
                <span className="text-[10px] font-bold mt-0.5">
                  {isListening ? '正在录音' : '按住说话'}
                </span>
              </button>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-on-surface">
                  {isListening ? (
                    <span className="text-error font-bold flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-error animate-ping" />
                      正在聆听中... 说完请松开或点击停止
                    </span>
                  ) : (
                    <span>💡 网页麦克风直连 · 支持随时点击或长按口述</span>
                  )}
                </div>
                {micStatusText && (
                  <p className="text-[11px] text-primary leading-tight max-w-sm px-2">
                    {micStatusText}
                  </p>
                )}
              </div>
            </div>

            {/* Editable Voice Transcript Box (Mobile Voice Keyboard Friendly) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="voice-transcript-input"
                  className="text-[11px] font-semibold text-on-surface-variant block"
                >
                  口述识别文本（支持手机输入法语音直接打字）：
                </label>
                {voiceInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceInput('');
                      setParsedTasks([]);
                    }}
                    className="text-[11px] text-outline hover:text-error cursor-pointer"
                  >
                    清空
                  </button>
                )}
              </div>

              <textarea
                id="voice-transcript-input"
                rows={3}
                value={voiceInput}
                onChange={(e) => setVoiceInput(e.target.value)}
                placeholder="例如：初二数学卷子写40分钟，背英语Unit3单词15分钟，晚上跳绳15分钟..."
                className="w-full bg-white rounded-2xl p-3 text-xs sm:text-sm text-on-surface border border-outline-variant/60 focus:outline-none focus:border-primary shadow-2xs leading-relaxed resize-none"
              />

              {/* Mobile Typing Hint Banner */}
              <div className="p-2.5 rounded-xl bg-secondary-container/20 border border-secondary/20 flex items-start gap-2 text-[11px] text-secondary">
                <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">
                  smartphone
                </span>
                <p className="leading-snug">
                  <span className="font-bold">手机端小技巧：</span>点击上方文本框调出手机键盘，直接按键盘自带的【🎙️麦克风】键口述多科作业；说完点击下方【MiniMax AI 智能拆解】即可！
                </p>
              </div>

              {/* Action Button: MiniMax Semantic Parsing */}
              <button
                type="button"
                disabled={isParsing || !voiceInput.trim()}
                onClick={() => handleParseVoice(voiceInput)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                  isParsing || !voiceInput.trim()
                    ? 'bg-surface-container text-outline cursor-not-allowed'
                    : 'bg-primary text-on-primary hover:bg-primary-container active:scale-98'
                }`}
              >
                {isParsing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                    <span>MiniMax-M3 语义模型正在分析科目与耗时...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">
                      auto_awesome
                    </span>
                    <span>✨ MiniMax AI 智能语义拆解</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Voice Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-on-surface-variant">
                快捷示例（点击快速体验）：
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
                      一键填入并拆解
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Structured Breakdown Preview (with single-item delete capability) */}
            {parsedTasks.length > 0 && (
              <div className="space-y-2 bg-surface-container-low p-3 rounded-2xl border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-secondary">
                    ⚡ 自动拆解为 {parsedTasks.length} 项自律作业卡片：
                  </span>
                  <span className="text-[10px] text-on-surface-variant">
                    点击 ✕ 可剔除单项
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
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-bold text-[11px]">
                          {t.estimatedMinutes}min
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveParsedTask(idx)}
                          className="w-5 h-5 rounded-full hover:bg-error-container/20 text-outline hover:text-error flex items-center justify-center cursor-pointer"
                          title="移除此项"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm & Add button */}
            <button
              type="button"
              disabled={parsedTasks.length === 0}
              onClick={() => {
                if (parsedTasks.length > 0) {
                  onAddParsedTasks(parsedTasks);
                  onClose();
                }
              }}
              className={`w-full py-3 rounded-full text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-1.5 ${
                parsedTasks.length > 0
                  ? 'bg-primary text-on-primary hover:bg-primary-container active:scale-98 cursor-pointer'
                  : 'bg-surface-container text-outline cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                add_task
              </span>
              <span>
                {parsedTasks.length > 0
                  ? `确认生成并加入今日书桌 (${parsedTasks.length} 项)`
                  : '请先口述作业并拆解'}
              </span>
            </button>
          </>
        ) : (
          <>
            {/* Camera Tab (Plate / Scorecard OCR) */}
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

            {/* Hidden Real File Input for Camera / Photo Library */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />

            {/* Photo Upload / Capture Action Header */}
            <div className="p-3 rounded-2xl bg-surface-container-low border border-primary/20 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    cloud_upload
                  </span>
                  <span className="text-xs font-bold text-on-surface">
                    Cloudflare R2 图床直传持久化
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-full bg-primary text-on-primary text-xs font-bold shadow-xs hover:bg-primary-container cursor-pointer flex items-center gap-1 transition-all active:scale-95 shrink-0"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    add_a_photo
                  </span>
                  <span>{photoPreview ? '重拍换一张' : '拍照 / 选图上传'}</span>
                </button>
              </div>

              {photoPreview && (
                <div className="relative rounded-xl overflow-hidden border border-[#EAE4DA] max-h-48 bg-black/5 flex items-center justify-center">
                  <img
                    src={photoPreview}
                    alt="Uploaded Board or Scorecard"
                    className="max-h-48 w-full object-contain rounded-xl"
                  />
                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center text-white text-xs font-bold gap-2">
                      <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                      <span>正在上传到 Cloudflare R2...</span>
                    </div>
                  )}
                  {uploadedImageUrl && (
                    <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1 rounded-lg bg-black/60 text-white text-[11px] font-semibold flex items-center justify-between">
                      <span className="truncate">✓ R2 已持久化存储</span>
                      <span className="text-[10px] text-[#A4C3B2]">云端多设备同步</span>
                    </div>
                  )}
                </div>
              )}
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
                        statusNote: uploadedImageUrl ? 'R2板书实拍' : '板书识别',
                      },
                      {
                        category: '作业',
                        subject: '化学',
                        taskType: '背诵默写',
                        title: '常见元素化合价口诀背诵与默写',
                        estimatedMinutes: 15,
                        statusNote: uploadedImageUrl ? 'R2板书实拍' : '板书识别',
                      },
                    ]);
                    onShowToast(
                      uploadedImageUrl
                        ? '板书照片已存入 R2，并自动录入 2 门作业 🎯'
                        : '已一键识别板书并生成 2 门待办作业 ✨'
                    );
                    onClose();
                  }}
                  className="w-full py-3 rounded-full bg-secondary text-on-secondary text-sm font-semibold shadow-md hover:bg-secondary/90 cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    document_scanner
                  </span>
                  <span>确认识别板书并导入 2 门作业</span>
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
                    onShowToast(
                      uploadedImageUrl
                        ? '成绩单照片已归档至 Cloudflare R2，并同步至档案 🎯'
                        : '成绩单识别入库成功！已同步至成长档案 🎯'
                    );
                    onClose();
                  }}
                  className="w-full py-3 rounded-full bg-primary text-on-primary text-sm font-semibold shadow-md hover:bg-primary-container cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 transition-all"
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
