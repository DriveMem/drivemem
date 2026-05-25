import { chat, ChatMessage } from './llm.service.js';

export interface AssessmentResult {
  sufficient: boolean;
  confidence: number;
  score: number;
  missing: string[];
  reasoning: string;
}

const FALLBACK_RESULT: AssessmentResult = {
  sufficient: true,
  confidence: 0,
  score: 50,
  missing: [],
  reasoning: 'Assessment unavailable',
};

const SYSTEM_PROMPT = `You are a handoff quality assessor. Evaluate the context pack for a task handoff between team members.

Score the context pack on 5 dimensions (each 0-20 points, total 0-100):
1. Task Clarity — Is the task/objective clearly described?
2. Context Sufficiency — Is there enough background context for the recipient?
3. Decision Records — Are key decisions and their rationale documented?
4. Next Steps Actionability — Are next steps concrete and actionable?
5. Key Facts Completeness — Are critical facts, constraints, and dependencies included?

Respond in JSON format only:
{
  "score": <number 0-100>,
  "sufficient": <boolean, true if score >= 70>,
  "confidence": <number 0-100, your confidence in this assessment>,
  "missing": [<list of specific missing items that would improve the handoff>],
  "reasoning": "<brief explanation>"
}`;

export async function assessContextPack(contextPack: any): Promise<AssessmentResult> {
  try {
    const contextStr = typeof contextPack === 'string' ? contextPack : JSON.stringify(contextPack, null, 2);

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Evaluate this context pack:\n\n${contextStr}` },
    ];

    const responsePromise = chat(messages);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Assessment timeout')), 10000)
    );

    const response = await Promise.race([responsePromise, timeoutPromise]);

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return FALLBACK_RESULT;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      sufficient: Boolean(parsed.sufficient),
      confidence: Number(parsed.confidence) || 0,
      score: Number(parsed.score) || 50,
      missing: Array.isArray(parsed.missing) ? parsed.missing : [],
      reasoning: String(parsed.reasoning || ''),
    };
  } catch (err) {
    console.error('[handoff-intelligence] LLM assessment failed, using fallback:', err instanceof Error ? err.message : err);
    return FALLBACK_RESULT;
  }
}
