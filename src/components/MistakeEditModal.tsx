import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { MistakeItem, SubjectName } from '../types/study';
import { getDefaultSubjectsForGrade, getSubjectMeta } from '../utils/studyLogic';

interface MistakeEditModalProps {
  isOpen: boolean;
  gradeClass?: string;
  initialMistake?: MistakeItem | null;
  customSubjects?: SubjectName[];
  onSave: (mistake: MistakeItem) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const COMMON_SUBJECTS: SubjectName[] = [
  '数学',
  '英语',
  '物理',
  '化学',
  '语文',
  '生物',
  '历史',
  '地理',
  '道法',
  '科学',
];

const REASON_PRESETS = [
  { text: '计算粗心 · 符号丢负', icon: 'warning', colorClass: 'text-tertiary' },
  { text: '概念混淆 · 易错陷阱', icon: 'help_outline', colorClass: 'text-primary' },
  { text: '审题不清 · 漏看条件', icon: 'search', colorClass: 'text-error' },
  { text: '公式记错 · 定理盲区', icon: 'menu_book', colorClass: 'text-secondary' },
  { text: '解法繁琐 · 考场超时', icon: 'schedule', colorClass: 'text-outline' },
  { text: '压轴难题 · 缺乏思路', icon: 'lightbulb', colorClass: 'text-on-surface-variant' },
];

export const MistakeEditModal: React.FC<MistakeEditModalProps> = ({
  isOpen,
  gradeClass,
  initialMistake,
  customSubjects = [],
  onSave,
  onDelete,
  onClose,
}) => {
  const isEditing = Boolean(initialMistake);

  const [subject, setSubject] = useState<SubjectName>('数学');
  const [title, setTitle] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');
  const [reasonText, setReasonText] = useState('计算粗心 · 符号丢负');
  const [reasonIcon, setReasonIcon] = useState('warning');
  const [reasonColorClass, setReasonColorClass] = useState('text-tertiary');
  const [statusType, setStatusType] = useState<'repeat' | 'reinforce' | 'keypoint'>('reinforce');
  const [statusText, setStatusText] = useState('待攻克');
  const [excerpt, setExcerpt] = useState('');
  const [solutionDetail, setSolutionDetail] = useState('');

  useEffect(() => {
    if (initialMistake) {
      setSubject(initialMistake.subject || '数学');
      setTitle(initialMistake.title || '');
      setSourceLabel(initialMistake.sourceLabel || '');
      setReasonText(initialMistake.reasonText || '计算粗心 · 符号丢负');
      setReasonIcon(initialMistake.reasonIcon || 'warning');
      setReasonColorClass(initialMistake.reasonColorClass || 'text-tertiary');
      setStatusType(initialMistake.statusType || 'reinforce');
      setStatusText(initialMistake.statusText || '待攻克');
      setExcerpt(initialMistake.excerpt || '');
      setSolutionDetail(initialMistake.solutionDetail || '');
    } else {
      setSubject('数学');
      setTitle('');
      setSourceLabel('数学 · 错题清账');
      setReasonText('计算粗心 · 符号丢负');
      setReasonIcon('warning');
      setReasonColorClass('text-tertiary');
      setStatusType('reinforce');
      setStatusText('待攻克');
      setExcerpt('');
      setSolutionDetail('');
    }
  }, [initialMistake, isOpen]);

  if (!isOpen) return null;

  const gradeBaseSubjects = getDefaultSubjectsForGrade(gradeClass).filter(
    (s) => s !== '体育锻炼' && s !== '课余兴趣' && s !== '自主自习'
  );
  const allSubjects = Array.from(
    new Set([...gradeBaseSubjects, ...customSubjects])
  );

  const handleSelectSubject = (s: SubjectName) => {
    setSubject(s);
    if (!sourceLabel || sourceLabel.includes('·')) {
      setSourceLabel(`${s} · 错题清账`);
    }
  };

  const handleSelectReason = (preset: typeof REASON_PRESETS[0]) => {
    setReasonText(preset.text);
    setReasonIcon(preset.icon);
    setReasonColorClass(preset.colorClass);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || `${subject}重难点题目订正`;
    const finalSource = sourceLabel.trim() || `${subject} · 错题清账`;
    const subjectMeta = getSubjectMeta(subject);

    const saved: MistakeItem = {
      id: initialMistake?.id || `mistake-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      subject,
      sourceLabel: finalSource,
      badgeClass: subjectMeta.badgeClass,
      statusText: statusText.trim() || '待攻克',
      statusType,
      title: finalTitle,
      reasonText: reasonText.trim() || '需巩固消化',
      reasonIcon,
      reasonColorClass,
      excerpt: excerpt.trim() || '（已拍摄/录入错题原题，重点巩固此类变形与解题方法）',
      solutionDetail: solutionDetail.trim() || '【解题要点】理清已知条件与未知量关系，严谨按解题步骤推演，注意细节与验算。',
      cleared: initialMistake?.cleared ?? false,
      ctaLabel: initialMistake?.ctaLabel || '重做此题',
      ctaStyle: initialMistake?.ctaStyle || 'primary',
      imageUrl: initialMistake?.imageUrl,
      iconFallback: subjectMeta.icon,
    };

    onSave(saved);
    onClose();
  };

  const handleDeleteCurrent = () => {
    if (!initialMistake || !onDelete) return;
    if (window.confirm(`确定要彻底删除错题「${initialMistake.title}」吗？删除后不可撤回。`)) {
      onDelete(initialMistake.id);
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#FDFBF7] rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[#EAE4DA] max-h-[90vh] flex flex-col space-y-4 animate-scale-pop"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={isEditing ? '修改错题内容' : '录入新错题'}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#EAE4DA]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">
                {isEditing ? 'edit_note' : 'add_task'}
              </span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-on-surface">
                {isEditing ? '修改错题详情与解法' : '录入新错题 · 纳入周末清账'}
              </h3>
              <p className="text-xs text-on-surface-variant">
                支持编辑科目、考法题型、原题节选与满分解题钥匙
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="关闭错题弹窗"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-3.5 text-xs">
          {/* 1. 科目选择 */}
          <div className="space-y-1.5">
            <label className="font-bold text-on-surface flex items-center gap-1">
              <span>学科所属：</span>
              <span className="text-primary font-semibold">当前已选「{subject}」</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {allSubjects.map((s) => {
                const meta = getSubjectMeta(s);
                const isSelected = subject === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSelectSubject(s)}
                    className={`px-2.5 py-1 rounded-xl font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-primary text-on-primary shadow-2xs scale-102'
                        : 'bg-white hover:bg-surface-container text-on-surface-variant border border-[#EAE4DA]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {meta.icon}
                    </span>
                    <span>{s}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. 错题标题与来源 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="font-bold text-on-surface block">
                错题考点 / 标题 <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="如：二次函数顶点最值 / 定语从句"
                className="w-full bg-white rounded-xl px-3 py-2 text-xs font-semibold text-on-surface border border-[#EAE4DA] focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-on-surface block">
                来源试卷 / 练习
              </label>
              <input
                type="text"
                value={sourceLabel}
                onChange={(e) => setSourceLabel(e.target.value)}
                placeholder="如：数学 · 10月月考压轴"
                className="w-full bg-white rounded-xl px-3 py-2 text-xs text-on-surface border border-[#EAE4DA] focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* 3. 错因诊断快速预设 */}
          <div className="space-y-1.5">
            <label className="font-bold text-on-surface block">
              错因归类诊断（点击快速选择或下方自定义）：
            </label>
            <div className="flex flex-wrap gap-1.5">
              {REASON_PRESETS.map((preset) => {
                const isMatch = reasonText === preset.text;
                return (
                  <button
                    key={preset.text}
                    type="button"
                    onClick={() => handleSelectReason(preset)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                      isMatch
                        ? 'bg-secondary text-on-secondary shadow-2xs'
                        : 'bg-white hover:bg-surface-container text-on-surface-variant border border-[#EAE4DA]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {preset.icon}
                    </span>
                    <span>{preset.text}</span>
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="自定义错因（如：漏掉分类讨论 / 审题粗心）"
              className="w-full bg-white rounded-xl px-3 py-1.5 text-xs text-on-surface border border-[#EAE4DA] focus:outline-none focus:border-secondary"
            />
          </div>

          {/* 4. 难度/重难点状态 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-on-surface">清账优先级：</span>
            {[
              { type: 'repeat' as const, label: '已错 2 次（高频攻克）', icon: 'history' },
              { type: 'reinforce' as const, label: '待强化（基础巩固）', icon: 'flag' },
              { type: 'keypoint' as const, label: '重难点（压轴冲刺）', icon: 'lightbulb' },
            ].map((st) => (
              <button
                key={st.type}
                type="button"
                onClick={() => {
                  setStatusType(st.type);
                  setStatusText(st.label.split('（')[0]);
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                  statusType === st.type
                    ? 'bg-inverse-surface text-inverse-on-surface shadow-2xs'
                    : 'bg-white hover:bg-surface-container text-on-surface-variant border border-[#EAE4DA]'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">
                  {st.icon}
                </span>
                <span>{st.label}</span>
              </button>
            ))}
          </div>

          {/* 5. 原题干节选 */}
          <div className="space-y-1">
            <label className="font-bold text-on-surface block">
              原题节选与题干（支持输入题目文字或关键已知条件）
            </label>
            <textarea
              rows={3}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="如：已知二次函数 y = a(x-2)² + k 过原点，求区间 [-1, 3] 上的最值..."
              className="w-full bg-white rounded-xl p-2.5 text-xs text-on-surface border border-[#EAE4DA] focus:outline-none focus:border-primary leading-relaxed"
            />
          </div>

          {/* 6. 满分解题钥匙 */}
          <div className="space-y-1">
            <label className="font-bold text-secondary flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">
                lightbulb
              </span>
              <span>审题与满分解法钥匙（核心推导步骤与避坑点拨）</span>
            </label>
            <textarea
              rows={4}
              value={solutionDetail}
              onChange={(e) => setSolutionDetail(e.target.value)}
              placeholder="如：【核心步骤】设解析式后代入原点求得 4a + k = 0。注意 a<0 开口向下，对称轴 x=2 在区间内，故 x=2 取最大值，离对称轴较远的端点取最小值..."
              className="w-full bg-white rounded-xl p-2.5 text-xs text-on-surface border border-[#EAE4DA] focus:outline-none focus:border-secondary leading-relaxed font-mono"
            />
          </div>

          {/* Modal Action Footer */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#EAE4DA]">
            <div>
              {isEditing && onDelete && (
                <button
                  type="button"
                  onClick={handleDeleteCurrent}
                  className="px-3 py-2 rounded-full bg-error-container text-on-error-container text-xs font-bold hover:bg-error/20 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    delete
                  </span>
                  <span>删除错题</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high text-xs font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary-container active:scale-95 transition-all cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">
                  check
                </span>
                <span>{isEditing ? '保存修改 ✓' : '确认录入错题 ✓'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
