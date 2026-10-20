import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import {
  generateWeeklyReportWithMiniMax,
  parseTimetableWithMiniMax,
  parseVoiceWithMiniMax,
} from './minimax.ts';

const STATE_FILE_PATH = path.resolve(process.cwd(), '.study-desk-state.json');

interface AccountCloudState {
  account: string;
  profile?: any;
  deskSettings?: any;
  homeworkTasks?: any[];
  schedules?: any[];
  mistakes?: any[];
  examDataMap?: Record<string, any[]>;
  parentCheerNote?: string | null;
  updatedAt: string;
}

function readLocalStateStore(): Record<string, AccountCloudState> {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (parsed.accounts && typeof parsed.accounts === 'object') {
          return parsed.accounts;
        }
        return parsed;
      }
    }
  } catch {}
  return {};
}

function writeLocalStateStore(accounts: Record<string, AccountCloudState>) {
  try {
    fs.writeFileSync(
      STATE_FILE_PATH,
      JSON.stringify({ accounts, updatedAt: new Date().toISOString() }, null, 2),
      'utf-8'
    );
  } catch {}
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
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const parsedUrl = new URL(req.url, 'http://localhost:3000');
        const pathname = parsedUrl.pathname;

        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        try {
          // 0. 家庭账号多端状态同步 API (/api/sync GET & POST)
          if (pathname === '/api/sync' && req.method === 'GET') {
            const account = parsedUrl.searchParams.get('account') || 'lizihan';
            const store = readLocalStateStore();
            const record = store[account];
            if (!record) {
              res.end(
                JSON.stringify({
                  ok: true,
                  account,
                  profile: null,
                  deskSettings: null,
                  homeworkTasks: [],
                  schedules: [],
                  mistakes: [],
                  examDataMap: null,
                })
              );
              return;
            }
            res.end(
              JSON.stringify({
                ok: true,
                ...record,
              })
            );
            return;
          }

          if (pathname === '/api/sync' && req.method === 'POST') {
            const payload = await readJsonBody(req);
            const account = String(payload.account || 'lizihan').trim();
            const isPublicDemo = account === 'lizihan' || account === 'parent_li';
            const store = readLocalStateStore();
            const existing = store[account] || {
              account,
              homeworkTasks: [],
              schedules: [],
              mistakes: [],
              updatedAt: new Date().toISOString(),
            };

            let nextTasks =
              payload.homeworkTasks !== undefined
                ? payload.homeworkTasks
                : existing.homeworkTasks || [];
            let nextSchedules =
              payload.schedules !== undefined
                ? payload.schedules
                : existing.schedules || [];
            let nextMistakes =
              payload.mistakes !== undefined
                ? payload.mistakes
                : existing.mistakes || [];

            if (payload.purgeMockData && !isPublicDemo) {
              const demoTaskIds = new Set(['task-1', 'task-2', 'task-3', 'task-4']);
              const demoSchIds = new Set(['sch-1', 'sch-pe', 'sch-2', 'sch-3']);
              const demoMisIds = new Set(['mistake-1', 'mistake-2', 'mistake-3']);
              nextTasks = nextTasks.filter((t: any) => !demoTaskIds.has(t.id) && !t.isDemo);
              nextSchedules = nextSchedules.filter((s: any) => !demoSchIds.has(s.id) && !s.isDemo);
              nextMistakes = nextMistakes.filter((m: any) => !demoMisIds.has(m.id) && !m.isDemo);
            }

            if (payload.clearAllTasks) nextTasks = [];
            if (payload.clearAllSchedules) nextSchedules = [];
            if (payload.clearAllMistakes) nextMistakes = [];
            if (payload.deletedTaskId) {
              nextTasks = nextTasks.filter((t: any) => t.id !== payload.deletedTaskId);
            }
            if (payload.deletedScheduleId) {
              nextSchedules = nextSchedules.filter((s: any) => s.id !== payload.deletedScheduleId);
            }
            if (payload.deletedMistakeId) {
              nextMistakes = nextMistakes.filter((m: any) => m.id !== payload.deletedMistakeId);
            }

            store[account] = {
              account,
              profile: payload.profile || existing.profile,
              deskSettings: payload.deskSettings || existing.deskSettings,
              homeworkTasks: nextTasks,
              schedules: nextSchedules,
              mistakes: nextMistakes,
              examDataMap:
                payload.examDataMap !== undefined
                  ? payload.examDataMap
                  : existing.examDataMap,
              parentCheerNote:
                payload.parentCheerNote !== undefined
                  ? payload.parentCheerNote
                  : existing.parentCheerNote,
              updatedAt: new Date().toISOString(),
            };

            writeLocalStateStore(store);

            res.end(
              JSON.stringify({
                ok: true,
                account,
                syncedAt: store[account].updatedAt,
              })
            );
            return;
          }

          // 1. 口述语音作业拆解 API
          if (pathname === '/api/ai/parse-voice' && req.method === 'POST') {
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
          if (pathname === '/api/ai/weekly-report' && req.method === 'POST') {
            const payload = await readJsonBody(req);
            const result = await generateWeeklyReportWithMiniMax(payload);
            res.end(JSON.stringify(result));
            return;
          }

          // 3. 智能排课与新学期课程表识别 API
          if (pathname === '/api/ai/parse-timetable' && req.method === 'POST') {
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
