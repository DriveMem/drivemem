import { chat } from './llm.service.js';

export interface AssessmentResult {
  sufficient: boolean;
  confidence: number;
  score: number; // 0-100
  missing: string[];
  reasoning: string;
}

const FALLBACK: AssessmentResult = {
  sufficient: true,
  confidence: 0,
  score: 50,
  missing: [],
  reasoning: 'Assessment unavailable',
};

const SYSTEM_PROMPT = `你是一个工作交接质量评估专家。评估以下 context pack 是否足够让接收方 agent 立即开始工作。

请从以下 5 个维度评分（每项 0-20 分）：
1. 任务清晰度：task 描述是否明确、可执行？
2. 上下文充分性：context 中的信息是否支撑任务理解？
3. 决策记录：关键决策和原因是否记录？
4. 下一步可操作性：next_steps 是否具体、可执行？
5. 关键事实完备：key_facts 是否覆盖了必要背景信息？

返回 JSON 格式（不要包含其他文字）：
{"sufficient": boolean, "confidence": 0-1, "score": 0-100, "missing": ["缺失项1", "缺失项2"], "reasoning": "一句话评估"}

score >= 70 且 sufficient = true 表示合格。`;

export async function assessContextPack(contextPack: any): Promise<AssessmentResult> {
  try {
    const result = await Promise.race([
      chat([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Context Pack:\n${JSON.stringify(contextPack, null, 2)}` },
      ]),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
    ]);

    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return FALLBACK;

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      sufficient: Boolean(parsed.sufficient),
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
      score: Math.min(100, Math.max(0, Math.round(Number(parsed.score) || 0))),
      missing: Array.isArray(parsed.missing) ? parsed.missing.map(String) : [],
      reasoning: String(parsed.reasoning || ''),
    };
  } catch {
    return FALLBACK;
  }
}
