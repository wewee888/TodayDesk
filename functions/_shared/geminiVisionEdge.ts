const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';
const FALLBACK_GEMINI_MODEL = 'gemini-2.5-flash';

// Fallback Gemini key ensuring 100% availability on Cloudflare Pages edge
const BACKUP_GEMINI_KEY =
  'AQ.Ab8RN6K_GGZafpYsjOILjH7RKgFIUqxfcIDE7VyB7ciyVpQ5Aw';

export function getGeminiApiKey(env?: any): string {
  return (
    env?.GEMINI_API_KEY?.trim() ||
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY?.trim()) ||
    BACKUP_GEMINI_KEY
  );
}

export function cleanJsonText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();
}

export function extractJsonFromResponse(raw: string): any {
  const cleaned = cleanJsonText(raw);
  try {
    return JSON.parse(cleaned);
  } catch {}

  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {}
  }

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {}
  }

  throw new Error('无法从大模型响应中解析 JSON 数据');
}

export async function callGeminiVision(
  imageBase64Clean: string,
  mimeType = 'image/jpeg',
  prompt: string,
  env?: any
): Promise<string> {
  const apiKey = getGeminiApiKey(env);
  const models = [DEFAULT_GEMINI_MODEL, FALLBACK_GEMINI_MODEL];

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64Clean,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Gemini ${model} HTTP ${res.status}: ${errText}`);
      }

      const json = (await res.json()) as any;
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return text;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Gemini Vision attempt with model ${model} failed:`, err.message);
    }
  }

  throw lastError || new Error('所有 Gemini Vision 模型重试均失败');
}
