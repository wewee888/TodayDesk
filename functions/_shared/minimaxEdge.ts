const DEFAULT_BASE_URL = 'https://api.minimaxi.com/v1';
const DEFAULT_MODEL = 'MiniMax-M3';
const BACKUP_KEY =
  'sk-cp-CKhXpkMFghLLkPpbBoBIxGBmE5SeU8ZOEPvOGda6gxy4nOoS7jd3VAUgno_qapl0IA9Cypss8oQ0Rm7p_ZmuNMemSq5O1FKxFxqLhKb26N6f3N0qk3dWPr8';

export function getApiKey(env?: any): string {
  return env?.MINIMAX_API_KEY?.trim() || BACKUP_KEY;
}

export function cleanMiniMaxOutput(raw: string): string {
  if (!raw) return '';
  return raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

export function extractJsonFromText(text: string): any {
  const cleaned = cleanMiniMaxOutput(text);

  try {
    return JSON.parse(cleaned);
  } catch {
    // continue
  }

  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch?.[1]) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {
      // continue
    }
  }

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {
      // continue
    }
  }

  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      // continue
    }
  }

  throw new Error('无法从 MiniMax 输出中提取 JSON 数据');
}

export async function callMiniMaxEdge(
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: any;
  }>,
  env?: any,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const apiKey = getApiKey(env);
  const baseUrl = env?.MINIMAX_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const model = options.model || env?.MINIMAX_MODEL?.trim() || DEFAULT_MODEL;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 2048,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Network error');
    throw new Error(`MiniMax API (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (data.error?.message) {
    throw new Error(data.error.message);
  }

  const content = data.choices?.[0]?.message?.content || '';
  return cleanMiniMaxOutput(content);
}
