import { callMiniMaxEdge, extractJsonFromText } from '../../_shared/minimaxEdge';

export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context;

  try {
    const payload = await request.json().catch(() => ({}));

    try {
      const rawOutput = await callMiniMaxEdge(
        [
          {
            role: 'system',
            content: `你是温和、平视、尊重孩子的家庭AI学情陪伴助手（仅供孩子和家长使用）。请根据学生本周数据生成一份去焦虑化、极具实操价值的周末清账与家庭学情周报。
输出必须为纯 JSON 对象，严禁包含 markdown 标记。
字段包含：studentName, weekLabel, headline, summaryParagraph, highYieldSubject, potentialSubject, encouragement, actionItems (每项含 subject, task, minutes, priority)。`,
          },
          {
            role: 'user',
            content: `学生本周实际学习与错题数据：${JSON.stringify(payload)}`,
          },
        ],
        env,
        { temperature: 0.3, maxTokens: 1500 }
      );

      const report = extractJsonFromText(rawOutput);
      if (report && typeof report.headline === 'string') {
        return new Response(JSON.stringify({ report, source: 'minimax' }), {
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
      }
    } catch (err) {
      console.warn('MiniMax weekly-report fallback on edge:', err);
    }

    const remainingMistakes = payload?.remainingMistakes ?? 3;
    const totalMinutes = payload?.totalMinutes ?? 90;
    const fallbackReport = {
      studentName: '李子涵 · 初二(3)班',
      weekLabel: '第 7 教学周 · 家庭学情与周末清账单',
      headline: '数学投产比攀升，周末微清账即可轻松开局 ✨',
      summaryParagraph: `子涵本周今日书桌累计规划 ${totalMinutes} 分钟，目前错题本仅剩 ${remainingMistakes} 道待清账。数学凭借扎实的「次日回填」习惯，月考取得了突破；周末稍加巩固即可全面清盘。`,
      highYieldSubject: '数学（投入与产出效能显著）',
      potentialSubject: '物理 & 英语（周末清账重点）',
      encouragement: '节奏比速度更重要，平视每一次错题，就是迈向卓越的最佳基石！',
      actionItems: [
        {
          subject: '数学',
          task: '重刷几何辅助线错题 1 道（注重思路复盘）',
          minutes: 15,
          priority: '必清',
        },
        {
          subject: '物理',
          task: '凸透镜成像规律作图精练 2 道',
          minutes: 20,
          priority: '高杠杆',
        },
        {
          subject: '体育锻炼',
          task: '周末跳绳 1500 次或中考耐力跑',
          minutes: 25,
          priority: '中考满分',
        },
      ],
    };

    return new Response(
      JSON.stringify({ report: fallbackReport, source: 'smart-engine' }),
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
