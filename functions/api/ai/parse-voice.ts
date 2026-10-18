import { callMiniMaxEdge, extractJsonFromText } from '../../_shared/minimaxEdge';

export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context;

  try {
    const body = (await request.json().catch(() => ({}))) as { text?: string };
    const text = String(body.text || '').trim();

    if (!text) {
      return new Response(JSON.stringify({ error: '请输入或说出作业内容' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    try {
      const rawOutput = await callMiniMaxEdge(
        [
          {
            role: 'system',
            content: `你是一个中学生轻量自律学习助手的解析引擎。请将用户口述的学习、体育锻炼或课余活动拆解为结构化任务JSON数组。
必须为纯 JSON 数组，严禁包含 markdown 标记。
每个对象包含：category (作业、预习、体育、兴趣), subject, taskType, title, estimatedMinutes, statusNote。`,
          },
          {
            role: 'user',
            content: `口述内容："${text}"`,
          },
        ],
        env,
        { temperature: 0.1, maxTokens: 1024 }
      );

      const parsed = extractJsonFromText(rawOutput);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return new Response(
          JSON.stringify({ tasks: parsed, source: 'minimax' }),
          {
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          }
        );
      }
    } catch (err) {
      console.warn('MiniMax parse-voice fallback on edge:', err);
    }

    // Edge deterministic fallback
    const fallbackTasks = [
      {
        category: '作业',
        subject: '自主自习',
        taskType: '自习规划',
        title: text.slice(0, 30),
        estimatedMinutes: 25,
        statusNote: '快速建单',
      },
    ];

    return new Response(
      JSON.stringify({ tasks: fallbackTasks, source: 'smart-parser' }),
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
