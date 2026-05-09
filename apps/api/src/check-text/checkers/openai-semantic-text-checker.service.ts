import { Injectable } from '@nestjs/common';
import { HeuristicTextAnalysis } from './heuristic-text-checker.service';
import { AI_DETECTION_PROMPT } from '../prompts/ai-detection.prompt';

type OpenAiResponsePayload = {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: unknown;
    }>;
  }>;
};

@Injectable()
export class OpenAiSemanticTextCheckerService {
  private readonly endpoint = 'https://api.openai.com/v1/responses';

  hasApiKey(): boolean {
    return this.getApiKey().length > 0;
  }

  async check(text: string, heuristic: HeuristicTextAnalysis): Promise<unknown> {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.getModel(),
        instructions: AI_DETECTION_PROMPT,
        input: JSON.stringify({
          text: this.truncateText(text),
          heuristic: {
            label: heuristic.response.label,
            score: heuristic.response.score,
            explanation: heuristic.response.explanation,
            metrics: heuristic.metrics,
            signals: heuristic.signals.map((signal) => ({
              name: signal.name,
              score: signal.score,
              weight: signal.weight,
              aiDetail: signal.aiDetail,
              humanDetail: signal.humanDetail,
            })),
          },
        }),
        max_output_tokens: 220,
        store: false,
        temperature: 0,
        text: {
          format: {
            type: 'json_schema',
            name: 'ai_detection_result',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['label', 'score', 'explanation'],
              properties: {
                label: {
                  type: 'string',
                  enum: ['likely_ai', 'likely_human', 'uncertain'],
                },
                score: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                },
                explanation: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 220,
                },
              },
            },
          },
        },
      }),
      signal: AbortSignal.timeout(this.getTimeoutMs()),
    });

    if (!response.ok) {
      throw new Error('OpenAI semantic checker failed');
    }

    const payload = (await response.json()) as OpenAiResponsePayload;
    const outputText = this.extractOutputText(payload);

    if (!outputText) {
      throw new Error('OpenAI semantic checker returned no text output');
    }

    return JSON.parse(outputText) as unknown;
  }

  private getApiKey(): string {
    return process.env.OPENAI_API_KEY?.trim() ?? '';
  }

  private getModel(): string {
    return process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini';
  }

  private getTimeoutMs(): number {
    const timeoutMs = Number(process.env.OPENAI_CHECK_TIMEOUT_MS);

    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      return 8000;
    }

    return timeoutMs;
  }

  private truncateText(text: string): string {
    const maxChars = Number(process.env.OPENAI_MAX_INPUT_CHARS);
    const limit = Number.isFinite(maxChars) && maxChars > 0 ? maxChars : 12000;

    return text.length > limit ? text.slice(0, limit) : text;
  }

  private extractOutputText(payload: OpenAiResponsePayload): string | null {
    if (typeof payload.output_text === 'string') {
      return payload.output_text;
    }

    for (const outputItem of payload.output ?? []) {
      for (const contentItem of outputItem.content ?? []) {
        if (contentItem.type === 'output_text' && typeof contentItem.text === 'string') {
          return contentItem.text;
        }
      }
    }

    return null;
  }
}
