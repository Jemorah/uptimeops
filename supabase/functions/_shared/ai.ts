// ═══════════════════════════════════════════════════════════════
// AI CLIENT — Shared utilities for AI agent functions
// Anthropic (primary) → OpenAI (secondary) → error if none available
// NO MOCK DATA. If no provider is configured, returns error.
// ═══════════════════════════════════════════════════════════════

import { logInfo, logError } from './logger.ts';

const FUNCTION = 'ai-client';

interface AIResponse {
  content: string;
  model: string;
  provider: string;
  usage?: { input_tokens: number; output_tokens: number };
}

// ── Anthropic Claude (Primary) ──
async function callAnthropic(prompt: string, systemPrompt?: string): Promise<AIResponse | null> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return null;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemPrompt || 'You are an infrastructure DevOps AI agent. Respond with concise, actionable technical analysis.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!resp.ok) {
      logError(FUNCTION, `Anthropic API error: ${resp.status}`, await resp.text());
      return null;
    }

    const data = await resp.json();
    return {
      content: data.content?.[0]?.text || '',
      model: data.model,
      provider: 'anthropic',
      usage: data.usage,
    };
  } catch (e) {
    logError(FUNCTION, 'Anthropic call failed', e);
    return null;
  }
}

// ── OpenAI GPT (Secondary) ──
async function callOpenAI(prompt: string, systemPrompt?: string): Promise<AIResponse | null> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return null;

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt || 'You are an infrastructure DevOps AI agent. Respond with concise, actionable technical analysis.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 4096,
      }),
    });

    if (!resp.ok) {
      logError(FUNCTION, `OpenAI API error: ${resp.status}`, await resp.text());
      return null;
    }

    const data = await resp.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      model: data.model,
      provider: 'openai',
      usage: {
        input_tokens: data.usage?.prompt_tokens || 0,
        output_tokens: data.usage?.completion_tokens || 0,
      },
    };
  } catch (e) {
    logError(FUNCTION, 'OpenAI call failed', e);
    return null;
  }
}

// ── Unified AI Call — Tries providers in order, throws if none available ──
export async function callAI(prompt: string, systemPrompt?: string): Promise<AIResponse> {
  logInfo(FUNCTION, 'Calling AI', { prompt_length: prompt.length });

  // Try Anthropic first (primary)
  const anthropicResult = await callAnthropic(prompt, systemPrompt);
  if (anthropicResult) {
    logInfo(FUNCTION, 'Anthropic success', { model: anthropicResult.model, tokens: anthropicResult.usage });
    return anthropicResult;
  }

  // Fallback to OpenAI (secondary)
  const openaiResult = await callOpenAI(prompt, systemPrompt);
  if (openaiResult) {
    logInfo(FUNCTION, 'OpenAI fallback success', { model: openaiResult.model });
    return openaiResult;
  }

  // No provider available — this is an error, not a simulation
  throw new Error(
    'No AI provider available. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in Supabase Edge Function Secrets.'
  );
}

// Parse structured JSON from AI response
export function parseAIJson<T>(content: string): T | null {
  try {
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]) as T;
    }
    return null;
  } catch {
    return null;
  }
}
