import 'dotenv/config';
import type {
  ParsedVoiceTask,
  SubjectName,
  TimetableRecognitionResult,
  WeeklyReportAI,
} from '../src/types/study.ts';
import {
  parseTimetableContent,
  parseVoiceCommandLocal,
} from '../src/utils/studyLogic.ts';
import { DEFAULT_WEEKLY_REPORT } from '../src/data/initialData.ts';

const DEFAULT_BASE_URL =
  process.env.MINIMAX_BASE_URL?.trim() || 'https://api.minimaxi.com/v1';
const DEFAULT_MODEL =
  process.env.MINIMAX_MODEL?.trim() || 'MiniMax-M3';
const DEFAULT_API_KEY =
  process.env.MINIMAX_API_KEY?.trim() ||
  'sk-cp-CKhXpkMFghLLkPpbBoBIxGBmE5SeU8ZOEPvOGda6gxy4nOoS7jd3VAUgno_qapl0IA9Cypss8oQ0Rm7p_ZmuNMemSq5O1FKxFxqLhKb26N6f3N0qk3dWPr8';

export interface MiniMaxMessage {
  role: 'system' | 'user' | 'assistant';
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >;
}

export function getMiniMaxApiKey(): string {
  return DEFAULT_API_KEY;
}

export function cleanMiniMaxOutput(raw: string): string {
  if (!raw) return '';
  // 过滤 MiniMax-M3 系列推理模型返回的 <think>...</think> 内部思考过程
  return raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

export function extractJsonFromText(text: string): any {
  const cleaned = cleanMiniMaxOutput(text);

  // 1. 尝试直接解析
  try {
    return JSON.parse(cleaned);
  } catch {
    // 忽略并尝试后续提取
  }

  // 2. 尝试提取 ```json ... ``` 代码块
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch?.[1]) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {
      // 忽略
    }
  }

  // 3. 尝试提取 [ ... ] 数组
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {
      // 忽略
    }
  }

  // 4. 尝试提取 { ... } 对象
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      // 忽略
    }
  }

  throw new Error('无法从 MiniMax 输出中解析出有效的 JSON 数据');
}

/**
 * 通用 MiniMax Chat API 调用函数
 */
export async function callMiniMaxChat(
  messages: MiniMaxMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
  } = {}
): Promise<string> {
  const apiKey = getMiniMaxApiKey();
  if (!apiKey || apiKey === 'your_minimax_api_key_here') {
    throw new Error('MiniMax API Key 未配置，请在 .env 中设置 MINIMAX_API_KEY');
  }

  const model = options.model || DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs ?? 45000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${DEFAULT_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 2048,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown network error');
      throw new Error(`MiniMax API 响应错误 (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (data.error?.message) {
      throw new Error(`MiniMax API 报错: ${data.error.message}`);
    }

    const content = data.choices?.[0]?.message?.content || '';
    return cleanMiniMaxOutput(content);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 1. MiniMax 驱动的语音一句话智能解析任务
 */
export async function parseVoiceWithMiniMax(
  inputText: string
): Promise<{ tasks: ParsedVoiceTask[]; source: 'minimax' | 'smart-parser' }> {
  const trimmed = String(inputText || '').trim();
  if (!trimmed) {
    return { tasks: [], source: 'smart-parser' };
  }

  try {
    const rawOutput = await callMiniMaxChat(
      [
        {
          role: 'system',
          content: `你是一个中学生轻量自律学习助手的解析引擎。请将用户口述的学习、体育锻炼或课余活动拆解为结构化任务JSON数组。
严格遵循要求：
1. 仅输出纯 JSON 数组，严禁包含 markdown 标记或任何闲聊解释。
2. 数组中每个对象包含以下 6 个字段：
   - category: 只能为 "作业"、"预习"、"体育"、"兴趣" 之一
   - subject: 只能为 "语文"、"数学"、"英语"、"物理"、"化学"、"历史"、"道法"、"地理"、"生物"、"体育锻炼"、"课余兴趣"、"自主自习" 之一
   - taskType: 简短动作，例如 "做题"、"背诵"、"跳绳"、"默写"、"复习"
   - title: 任务标题（如 "完成数学大题第1~3题"、"背诵英语必修一单词"）
   - estimatedMinutes: 预估耗时整数（如 25, 40, 15）
   - statusNote: 备注或难度说明（如 "口述识别"、"重点错题"）`,
        },
        {
          role: 'user',
          content: `口述内容："${trimmed}"`,
        },
      ],
      { temperature: 0.1, maxTokens: 1024 }
    );

    const parsed = extractJsonFromText(rawOutput);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const validTasks: ParsedVoiceTask[] = parsed.map((item: any) => ({
        category: (['作业', '预习', '体育', '兴趣'].includes(item.category)
          ? item.category
          : '作业') as any,
        subject: (item.subject || '自主自习') as SubjectName,
        taskType: String(item.taskType || '作业练习'),
        title: String(item.title || trimmed),
        estimatedMinutes: Number(item.estimatedMinutes) > 0 ? Number(item.estimatedMinutes) : 25,
        statusNote: String(item.statusNote || 'AI智能拆解'),
      }));

      return { tasks: validTasks, source: 'minimax' };
    }
  } catch (err) {
    console.warn('[MiniMax API] 语音拆解调用异常，自动降级至本地规则引擎:', err);
  }

  // 兜底本地确定性规则引擎
  const fallback = parseVoiceCommandLocal(trimmed);
  return { tasks: fallback, source: 'smart-parser' };
}

/**
 * 2. MiniMax 驱动的去焦虑化学情周报生成
 */
export async function generateWeeklyReportWithMiniMax(
  payload: any
): Promise<{ report: WeeklyReportAI; source: 'minimax' | 'smart-engine' }> {
  try {
    const rawOutput = await callMiniMaxChat(
      [
        {
          role: 'system',
          content: `你是温和、平视、尊重孩子的家庭AI学情陪伴助手（仅供孩子和家长使用）。请根据学生本周数据生成一份去焦虑化、极具实操价值的周末清账与家庭学情周报。
严格遵循要求：
1. 仅输出纯 JSON 对象，严禁包含 markdown 标记或任何闲聊。
2. JSON 对象必须包含以下字段：
   - studentName: 学生姓名与班级（如 "李子涵 · 初二(3)班"）
   - weekLabel: 周次标签（如 "第 7 教学周 · 家庭学情与周末清账单"）
   - headline: 一句话温和且充满激励的学情总结标题
   - summaryParagraph: 150字左右的学情温暖分析，既点出亮点，也点出周末小任务
   - highYieldSubject: 本周高产出高专注科目评价（如 "数学（投产比高 · 错题清账率 90%）"）
   - potentialSubject: 具有突破潜力的科目（如 "物理 & 英语（周末花20分钟即可突破）"）
   - encouragement: 70字左右给孩子和家长的贴心打气赋能话语
   - actionItems: 数组，包含3~4条实操建议，每条包含：
     * subject: 对应科目名称
     * task: 具体任务描述
     * minutes: 耗时建议（分钟整数，如 15, 20）
     * priority: 优先级（如 "必清", "高杠杆", "中考重点"）`,
        },
        {
          role: 'user',
          content: `学生本周实际学习与错题数据：${JSON.stringify(payload)}`,
        },
      ],
      { temperature: 0.3, maxTokens: 1500 }
    );

    const report = extractJsonFromText(rawOutput);
    if (
      report &&
      typeof report.headline === 'string' &&
      Array.isArray(report.actionItems)
    ) {
      return { report, source: 'minimax' };
    }
  } catch (err) {
    console.warn('[MiniMax API] 周报生成调用异常，自动降级至上下文动态引擎:', err);
  }

  // 兜底本地生成
  const remainingMistakes = payload?.remainingMistakes ?? 3;
  const totalMinutes = payload?.totalMinutes ?? 90;
  const dynamicReport: WeeklyReportAI = {
    ...DEFAULT_WEEKLY_REPORT,
    summaryParagraph: `子涵本周今日书桌累计规划 ${totalMinutes} 分钟，目前错题本仅剩 ${remainingMistakes} 道待清账。数学凭借扎实的「次日回填」习惯，月考取得了 +8 分的显著突破；英语继续保持低耗高效的领跑姿态。`,
  };
  return { report: dynamicReport, source: 'smart-engine' };
}

/**
 * 3. MiniMax 驱动的智能课程表识别与排课提取
 */
export async function parseTimetableWithMiniMax(payload: {
  text?: string;
  sourceName?: string;
  gradePreset?: 'grade7' | 'grade8' | 'grade9';
  imageBase64?: string;
  mimeType?: string;
}): Promise<{
  result: TimetableRecognitionResult;
  source: 'minimax' | 'smart-parser';
}> {
  const {
    text = '',
    sourceName = '新学期课程表',
    gradePreset = 'grade8',
    imageBase64,
  } = payload;

  // 先准备本地保底结果
  const localResult = parseTimetableContent(text, sourceName, gradePreset);

  if (!text.trim() && !imageBase64) {
    return { result: localResult, source: 'smart-parser' };
  }

  try {
    const userContent: any[] = [];
    if (imageBase64) {
      userContent.push({
        type: 'text',
        text: `请识别分析这张初中课程表，结合年级预设 (${gradePreset})，提取出开设科目与作息安排。文本备选参考：${text}`,
      });
      userContent.push({
        type: 'image_url',
        image_url: { url: imageBase64 },
      });
    } else {
      userContent.push({
        type: 'text',
        text: `请根据以下课程表文本内容（年级预设：${gradePreset}），提取出开设的所有主要科目与课程信息：\n\n${text}`,
      });
    }

    const rawOutput = await callMiniMaxChat(
      [
        {
          role: 'system',
          content: `你是一个专业的中学教务课程表识别引擎。请根据用户提供的课程表文本或图像提取科目列表。
输出必须为纯 JSON 对象，格式如下：
{
  "detectedSubjects": ["语文", "数学", "英语", "物理", "化学", "历史", "道法", "地理", "生物", "体育锻炼"],
  "academicSubjects": ["语文", "数学", "英语", "物理", "化学", "历史"],
  "extraSubjects": ["体育锻炼", "课余兴趣", "音乐", "美术"],
  "semesterLabel": "2026学年第二学期初二年级标准作息表",
  "schoolAndClass": "初二(3)班"
}
严禁返回 markdown 标签。`,
        },
        {
          role: 'user',
          content: userContent,
        },
      ],
      { temperature: 0.1, maxTokens: 1024 }
    );

    const parsed = extractJsonFromText(rawOutput);
    if (parsed && Array.isArray(parsed.detectedSubjects) && parsed.detectedSubjects.length > 0) {
      const mergedResult: TimetableRecognitionResult = {
        ...localResult,
        semesterLabel: parsed.semesterLabel || localResult.semesterLabel,
        schoolAndClass: parsed.schoolAndClass || localResult.schoolAndClass,
        detectedSubjects: Array.from(
          new Set([...parsed.detectedSubjects, ...localResult.detectedSubjects])
        ) as SubjectName[],
        academicSubjects: Array.from(
          new Set([...(parsed.academicSubjects || []), ...localResult.academicSubjects])
        ) as SubjectName[],
        extraSubjects: Array.from(
          new Set([...(parsed.extraSubjects || []), ...localResult.extraSubjects])
        ) as SubjectName[],
        extractedRawText: text || localResult.extractedRawText,
        sourceName,
      };
      return { result: mergedResult, source: 'minimax' };
    }
  } catch (err) {
    console.warn('[MiniMax API] 课程表识别调用异常，自动降级至确定性规则引擎:', err);
  }

  return { result: localResult, source: 'smart-parser' };
}
