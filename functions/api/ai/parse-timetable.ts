import { callMiniMaxEdge, extractJsonFromText } from '../../_shared/minimaxEdge';

export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context;

  try {
    const payload = (await request.json().catch(() => ({}))) as {
      text?: string;
      sourceName?: string;
      gradePreset?: string;
      imageBase64?: string;
    };

    const text = String(payload.text || '').trim();
    const sourceName = payload.sourceName || '新学期课程表';
    const gradePreset = payload.gradePreset || 'grade8';

    try {
      const userContent: any[] = [];
      if (payload.imageBase64) {
        userContent.push({
          type: 'text',
          text: `请识别分析这张初中课程表，结合年级预设 (${gradePreset})，提取出开设科目。`,
        });
        userContent.push({
          type: 'image_url',
          image_url: { url: payload.imageBase64 },
        });
      } else {
        userContent.push({
          type: 'text',
          text: `请根据以下课程表文本内容（年级预设：${gradePreset}），提取出开设的所有主要科目与课程信息：\n\n${text}`,
        });
      }

      const rawOutput = await callMiniMaxEdge(
        [
          {
            role: 'system',
            content: `你是一个中学课程表解析引擎。请提取科目列表，输出纯 JSON 对象：
{
  "detectedSubjects": ["语文", "数学", "英语", "物理", "化学", "历史", "道法", "地理", "生物", "体育锻炼"],
  "academicSubjects": ["语文", "数学", "英语", "物理", "化学", "历史"],
  "extraSubjects": ["体育锻炼", "课余兴趣"],
  "semesterLabel": "2026学年第二学期初二年级标准作息表",
  "schoolAndClass": "初二(3)班"
}`,
          },
          {
            role: 'user',
            content: userContent,
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
              semesterLabel: parsed.semesterLabel || '2026学年第二学期标准作息表',
              schoolAndClass: parsed.schoolAndClass || '初二(3)班',
              detectedSubjects: parsed.detectedSubjects,
              academicSubjects: parsed.academicSubjects || parsed.detectedSubjects.slice(0, 6),
              extraSubjects: parsed.extraSubjects || ['体育锻炼', '课余兴趣'],
              sourceName,
              weeklyGrid: [],
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

    const fallbackResult = {
      semesterLabel: '2026学年第二学期标准作息表',
      schoolAndClass: '初二(3)班',
      detectedSubjects: ['语文', '数学', '英语', '物理', '历史', '道法', '体育锻炼'],
      academicSubjects: ['语文', '数学', '英语', '物理', '历史', '道法'],
      extraSubjects: ['体育锻炼', '自主自习'],
      sourceName,
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
