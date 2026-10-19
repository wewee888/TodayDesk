import {
  callGeminiVision,
  extractJsonFromResponse,
} from '../../_shared/geminiVisionEdge';
import { callMiniMaxEdge, extractJsonFromText } from '../../_shared/minimaxEdge';

export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context;

  try {
    const payload = (await request.json().catch(() => ({}))) as {
      text?: string;
      sourceName?: string;
      gradePreset?: string;
      imageBase64?: string;
      mimeType?: string;
    };

    const text = String(payload.text || '').trim();
    const sourceName = payload.sourceName || '新学期课程表';
    const gradePreset = payload.gradePreset || 'grade8';

    // 1. If image is uploaded, use Gemini Vision for multimodal OCR recognition
    if (payload.imageBase64) {
      try {
        let cleanBase64 = payload.imageBase64;
        let mimeType = payload.mimeType || 'image/jpeg';

        if (cleanBase64.includes('base64,')) {
          const parts = cleanBase64.split('base64,');
          cleanBase64 = parts[1];
          const match = parts[0].match(/data:(.*?);/);
          if (match?.[1]) {
            mimeType = match[1];
          }
        }

        const visionPrompt = `你是一个专业的中学课程表智能OCR解析专家。请严格、逐字识别这张课程表图片，识别出表头学校、班级、学期、早读以及周一到周五每天每一节课（第1节到第10节）的科目名称（包括语数英、物化生、史地政/道法、体育、延时课、书法、心理健康、体锻、素质选修等）和任课老师姓名。
请输出严格合法的纯 JSON 对象，格式如下：
{
  "schoolAndClass": "成都市棕北中学 七.6",
  "semesterLabel": "初一秋季学期标准课程表",
  "rawText": "周一：历史(徐倩)、语文(何川)、英语(刘庆媛)、数学(付晓玲)...",
  "detectedSubjects": ["语文", "数学", "英语", "历史", "地理", "生物", "道德与法治", "体育", "音乐", "美术", "书法", "信息技术", "心理健康"],
  "academicSubjects": ["语文", "数学", "英语", "历史", "地理", "生物", "道德与法治"],
  "weeklyGrid": [
    {
      "day": "周一",
      "dayName": "周一",
      "morningReading": "",
      "periods": [
        { "periodIndex": 1, "subject": "历史", "teacher": "徐倩" },
        { "periodIndex": 2, "subject": "语文", "teacher": "何川" }
      ]
    }
  ]
}
只输出纯 JSON，严禁 markdown 标记，严禁多余文字。`;

        const rawGemini = await callGeminiVision(
          cleanBase64,
          mimeType,
          visionPrompt,
          env
        );

        const parsedVision = extractJsonFromResponse(rawGemini);

        if (parsedVision && Array.isArray(parsedVision.detectedSubjects)) {
          // Normalize weeklyGrid days
          const weeklyGrid = (parsedVision.weeklyGrid || []).map((col: any) => ({
            day: col.day || col.dayName || '周一',
            dayName: col.dayName || col.day || '周一',
            morningReading: col.morningReading || '',
            periods: Array.isArray(col.periods) ? col.periods : [],
          }));

          return new Response(
            JSON.stringify({
              result: {
                semesterLabel:
                  parsedVision.semesterLabel || '2026学年标准作息表',
                schoolAndClass: parsedVision.schoolAndClass || '七年级班级课表',
                detectedSubjects: parsedVision.detectedSubjects,
                academicSubjects:
                  parsedVision.academicSubjects ||
                  parsedVision.detectedSubjects.slice(0, 7),
                extraSubjects: parsedVision.detectedSubjects.filter(
                  (s: string) =>
                    !parsedVision.academicSubjects?.includes(s) &&
                    !['语文', '数学', '英语', '物理', '化学', '历史', '道法', '地理', '生物'].includes(s)
                ),
                sourceName,
                rawText: parsedVision.rawText || '',
                weeklyGrid,
              },
              source: 'gemini-vision',
            }),
            {
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }
          );
        }
      } catch (geminiErr: any) {
        console.warn('Gemini Vision failed, falling back to MiniMax/Smart Parser:', geminiErr?.message);
      }
    }

    // 2. Text-based MiniMax M3 parsing if text is provided
    if (text) {
      try {
        const rawOutput = await callMiniMaxEdge(
          [
            {
              role: 'system',
              content: `你是一个中学课程表解析引擎。请提取课表文本中的科目列表和周一至周五课程安排，输出纯 JSON 对象：
{
  "detectedSubjects": ["语文", "数学", "英语", "物理", "化学", "历史", "道法", "地理", "生物", "体育锻炼"],
  "academicSubjects": ["语文", "数学", "英语", "物理", "化学", "历史"],
  "extraSubjects": ["体育锻炼", "课余兴趣"],
  "semesterLabel": "2026学年第二学期标准作息表",
  "schoolAndClass": "初二(3)班",
  "weeklyGrid": [
    {
      "day": "周一",
      "dayName": "周一",
      "periods": [
        { "periodIndex": 1, "subject": "语文" },
        { "periodIndex": 2, "subject": "数学" }
      ]
    }
  ]
}`,
            },
            {
              role: 'user',
              content: `课程表内容（年级预设：${gradePreset}）：\n\n${text}`,
            },
          ],
          env,
          { temperature: 0.1, maxTokens: 1024 }
        );

        const parsed = extractJsonFromText(rawOutput);
        if (parsed && Array.isArray(parsed.detectedSubjects)) {
          return new Response(
            JSON.stringify({
              result: {
                semesterLabel: parsed.semesterLabel || '2026学年标准作息表',
                schoolAndClass: parsed.schoolAndClass || '初二(3)班',
                detectedSubjects: parsed.detectedSubjects,
                academicSubjects:
                  parsed.academicSubjects || parsed.detectedSubjects.slice(0, 6),
                extraSubjects: parsed.extraSubjects || ['体育锻炼', '自主自习'],
                sourceName,
                rawText: text,
                weeklyGrid: parsed.weeklyGrid || [],
              },
              source: 'minimax',
            }),
            {
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }
          );
        }
      } catch (err) {
        console.warn('MiniMax parse-timetable fallback on edge:', err);
      }
    }

    // 3. Fallback deterministic generator
    const fallbackSubjects =
      gradePreset === 'grade7'
        ? ['语文', '数学', '英语', '历史', '地理', '生物', '道法', '体育锻炼']
        : gradePreset === 'grade9'
        ? ['语文', '数学', '英语', '物理', '化学', '历史', '道法', '体育锻炼']
        : ['语文', '数学', '英语', '物理', '历史', '道法', '地理', '生物', '体育锻炼'];

    const fallbackResult = {
      semesterLabel:
        gradePreset === 'grade7'
          ? '初一秋季学期标准课程表'
          : gradePreset === 'grade9'
          ? '初三全科中考课程表'
          : '初二全科课程表',
      schoolAndClass: '初中部标准班级',
      detectedSubjects: fallbackSubjects,
      academicSubjects: fallbackSubjects.filter((s) => s !== '体育锻炼'),
      extraSubjects: ['体育锻炼', '课余兴趣'],
      sourceName,
      rawText: text,
      weeklyGrid: [],
    };

    return new Response(
      JSON.stringify({ result: fallbackResult, source: 'smart-parser' }),
      {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
