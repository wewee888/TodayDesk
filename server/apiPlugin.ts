import { GoogleGenAI, Type } from '@google/genai';
import type { Plugin } from 'vite';
import {
  parseTimetableContent,
  parseVoiceCommandLocal,
} from '../src/utils/studyLogic';
import { DEFAULT_WEEKLY_REPORT } from '../src/data/initialData';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function readJsonBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export function studyApiPlugin(): Plugin {
  return {
    name: 'study-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/ai/')) {
          return next();
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        try {
          if (req.url === '/api/ai/parse-voice' && req.method === 'POST') {
            const { text } = await readJsonBody(req);
            const inputText = String(text || '').trim();
            if (!inputText) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '请输入或说出作业内容' }));
              return;
            }

            const ai = getGeminiClient();
            if (ai) {
              try {
                const response = await ai.models.generateContent({
                  model: 'gemini-3.8-flash',
                  contents: `将以下中学生或家长的口述学习、体育锻炼或课余活动记录拆解为结构化任务JSON数组：
口述内容："${inputText}"
可选科目仅限：语文、数学、英语、物理、化学、历史、体育锻炼、课余兴趣、自主自习。
可选分类(category)仅限：作业、预习、体育、兴趣。`,
                  config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          category: { type: Type.STRING },
                          subject: { type: Type.STRING },
                          taskType: { type: Type.STRING },
                          title: { type: Type.STRING },
                          estimatedMinutes: { type: Type.INTEGER },
                          statusNote: { type: Type.STRING },
                        },
                        required: [
                          'category',
                          'subject',
                          'taskType',
                          'title',
                          'estimatedMinutes',
                          'statusNote',
                        ],
                      },
                    },
                  },
                });
                const rawJson = response.text;
                if (rawJson) {
                  const parsed = JSON.parse(rawJson);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    res.end(JSON.stringify({ tasks: parsed, source: 'gemini' }));
                    return;
                  }
                }
              } catch {
                // Fall back to deterministic parser below
              }
            }

            const fallbackTasks = parseVoiceCommandLocal(inputText);
            res.end(JSON.stringify({ tasks: fallbackTasks, source: 'smart-parser' }));
            return;
          }

          if (req.url === '/api/ai/weekly-report' && req.method === 'POST') {
            const payload = await readJsonBody(req);
            const ai = getGeminiClient();

            if (ai) {
              try {
                const response = await ai.models.generateContent({
                  model: 'gemini-3.8-flash',
                  contents: `你是温和、平视、尊重孩子的家庭AI学情陪伴助手（仅供孩子和家长使用）。请根据以下学生本周数据生成一份去焦虑化、极具实操价值的周末清账与家庭学情周报JSON：
学生数据：${JSON.stringify(payload)}`,
                  config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                        studentName: { type: Type.STRING },
                        weekLabel: { type: Type.STRING },
                        headline: { type: Type.STRING },
                        summaryParagraph: { type: Type.STRING },
                        highYieldSubject: { type: Type.STRING },
                        potentialSubject: { type: Type.STRING },
                        encouragement: { type: Type.STRING },
                        actionItems: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              subject: { type: Type.STRING },
                              task: { type: Type.STRING },
                              minutes: { type: Type.INTEGER },
                              priority: { type: Type.STRING },
                            },
                            required: ['subject', 'task', 'minutes', 'priority'],
                          },
                        },
                      },
                      required: [
                        'studentName',
                        'weekLabel',
                        'headline',
                        'summaryParagraph',
                        'highYieldSubject',
                        'potentialSubject',
                        'encouragement',
                        'actionItems',
                      ],
                    },
                  },
                });
                const rawJson = response.text;
                if (rawJson) {
                  const report = JSON.parse(rawJson);
                  res.end(JSON.stringify({ report, source: 'gemini' }));
                  return;
                }
              } catch {
                // Fall back to rich contextual report
              }
            }

            const remainingMistakes = payload?.remainingMistakes ?? 3;
            const totalMinutes = payload?.totalMinutes ?? 90;
            const dynamicReport = {
              ...DEFAULT_WEEKLY_REPORT,
              summaryParagraph: `子涵本周今日书桌累计规划 ${totalMinutes} 分钟，目前错题本仅剩 ${remainingMistakes} 道待清账。数学凭借扎实的「次日回填」习惯，月考取得了 +8 分的显著突破；英语继续保持低耗高效的领跑姿态。`,
            };
            res.end(JSON.stringify({ report: dynamicReport, source: 'smart-engine' }));
            return;
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Not found' }));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err?.message || 'Internal error' }));
        }
      });
    },
  };
}
