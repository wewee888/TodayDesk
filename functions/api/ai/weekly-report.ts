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

    const studentName = payload?.studentName || '李子涵';
    const gradeClass = payload?.gradeClass || '初二 (3) 班';
    const remainingMistakes = Number(payload?.remainingMistakes ?? 0);
    const totalMinutes = Number(payload?.totalMinutes ?? 0);
    const tasks = Array.isArray(payload?.tasks) ? payload.tasks : [];

    if (totalMinutes === 0 && tasks.length === 0 && remainingMistakes === 0) {
      const emptyFallback = {
        studentName: `${studentName} · ${gradeClass}`,
        weekLabel: '本周 · 家庭学情诊断与周末清账单',
        headline: '书桌已清空就绪 · 录入真实作业与考分后将自动生成专属周报',
        summaryParagraph: `${studentName}的伴学书桌当前处于干净初始状态，暂未录入作业时长、体育打卡或错题记录。平时只需在「今日书桌」点击右侧 3 秒快记或底部语音录入每日作业，周末即可一键汇总真实学情周报。`,
        highYieldSubject: '暂未产生作业耗时（录入后自动统计）',
        potentialSubject: '暂未录入错题与考分（录入后智能诊断）',
        encouragement: '万事开头简，今晚先从第一项作业或 15 分钟体育打卡开始记录吧！',
        actionItems: [],
      };
      return new Response(
        JSON.stringify({ report: emptyFallback, source: 'smart-engine' }),
        {
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    const dynamicActions = tasks.slice(0, 3).map((t: any) => ({
      subject: t.subject || '自主自习',
      task: `${t.completed ? '复盘巩固' : '优先完成'}：${t.title || t.taskType || '专项练习'}`,
      minutes: Number(t.actualMinutes ?? t.estimatedMinutes ?? 20),
      priority: t.completed ? '已打卡 ✓' : '待完成',
    }));

    const fallbackReport = {
      studentName: `${studentName} · ${gradeClass}`,
      weekLabel: '本周 · 家庭学情与周末清账单',
      headline: `已累计记录 ${totalMinutes} 分钟学习投入，稳步推进今日节奏 ✨`,
      summaryParagraph: `${studentName}本周今日书桌累计记录 ${totalMinutes} 分钟（共 ${tasks.length} 项真实任务），目前错题本有 ${remainingMistakes} 道待清账。保持每日如实记录与错题回填，周末复盘更轻松。`,
      highYieldSubject:
        tasks.length > 0
          ? `${tasks[0].subject}（已记录 ${tasks[0].actualMinutes ?? tasks[0].estimatedMinutes ?? 20} 分钟）`
          : '待录入更多科目作业后自动评估',
      potentialSubject:
        remainingMistakes > 0
          ? `错题本待清账（共 ${remainingMistakes} 道）`
          : '各科均衡推进（录入月考成绩后自动定位提分点）',
      encouragement: '节奏比速度更重要，平视每一次练习与错题，就是迈向进步的最佳基石！',
      actionItems: dynamicActions,
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
