import type { Plugin } from 'vite';
import {
  generateWeeklyReportWithMiniMax,
  parseTimetableWithMiniMax,
  parseVoiceWithMiniMax,
} from './minimax.ts';

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
          // 1. 口述语音作业拆解 API
          if (req.url === '/api/ai/parse-voice' && req.method === 'POST') {
            const { text } = await readJsonBody(req);
            const inputText = String(text || '').trim();
            if (!inputText) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '请输入或说出作业内容' }));
              return;
            }

            const result = await parseVoiceWithMiniMax(inputText);
            res.end(JSON.stringify(result));
            return;
          }

          // 2. 周末清账与家庭学情周报 API
          if (req.url === '/api/ai/weekly-report' && req.method === 'POST') {
            const payload = await readJsonBody(req);
            const result = await generateWeeklyReportWithMiniMax(payload);
            res.end(JSON.stringify(result));
            return;
          }

          // 3. 智能排课与新学期课程表识别 API
          if (req.url === '/api/ai/parse-timetable' && req.method === 'POST') {
            const payload = await readJsonBody(req);
            const result = await parseTimetableWithMiniMax(payload);
            res.end(JSON.stringify(result));
            return;
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Endpoint not found' }));
        } catch (err: any) {
          console.error('[API Middleware Error]:', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err?.message || 'Internal error' }));
        }
      });
    },
  };
}
