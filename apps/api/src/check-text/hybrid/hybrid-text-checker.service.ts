import { Injectable, Logger } from '@nestjs/common';
import { CheckTextConfidence, CheckTextLabel, CheckTextResponse } from '../check-text.types';
import { HeuristicTextCheckerService } from '../checkers/heuristic-text-checker.service';
import { OpenAiSemanticTextCheckerService } from '../checkers/openai-semantic-text-checker.service';

type GptCheckCandidate = {
  label?: unknown;
  score?: unknown;
  explanation?: unknown;
};

@Injectable()
export class HybridTextCheckerService {
  private readonly logger = new Logger(HybridTextCheckerService.name);

  constructor(
    private readonly heuristicChecker: HeuristicTextCheckerService,
    private readonly openAiChecker: OpenAiSemanticTextCheckerService,
  ) {}

  async check(text: string): Promise<CheckTextResponse> {
    const heuristicAnalysis = this.heuristicChecker.analyze(text);
    const heuristicResponse = heuristicAnalysis.response;
    const hasApiKey = this.openAiChecker.hasApiKey();

    this.logger.log(`OPENAI_API_KEY configured: ${hasApiKey}`);

    if (!hasApiKey) {
      return heuristicResponse;
    }

    try {
      this.logger.log('Calling GPT checker');
      const gptResult = await this.openAiChecker.check(text, heuristicAnalysis);
      const validatedResult = this.validateGptResult(gptResult);

      this.logger.log('GPT success');

      return validatedResult;
    } catch {
      this.logger.warn('GPT failed, fallback used');
      return heuristicResponse;
    }
  }

  private validateGptResult(result: unknown): CheckTextResponse {
    if (!this.isRecord(result)) {
      throw new Error('Invalid GPT checker result');
    }

    const candidate = result as GptCheckCandidate;

    if (!this.isValidLabel(candidate.label)) {
      throw new Error('Invalid GPT checker label');
    }

    if (typeof candidate.score !== 'number' || !Number.isFinite(candidate.score)) {
      throw new Error('Invalid GPT checker score');
    }

    if (candidate.score < 0 || candidate.score > 1) {
      throw new Error('GPT checker score is outside the valid range');
    }

    if (typeof candidate.explanation !== 'string' || candidate.explanation.trim().length === 0) {
      throw new Error('Invalid GPT checker explanation');
    }

    const score = this.clampScore(candidate.score);

    return {
      label: this.getLabel(score),
      score,
      confidence: this.getConfidence(score),
      explanation: this.sanitizeExplanation(candidate.explanation),
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isValidLabel(label: unknown): label is CheckTextLabel {
    return label === 'likely_ai' || label === 'likely_human' || label === 'uncertain';
  }

  private getLabel(score: number): CheckTextLabel {
    if (score >= 0.7) {
      return 'likely_ai';
    }

    if (score <= 0.3) {
      return 'likely_human';
    }

    return 'uncertain';
  }

  private getConfidence(score: number): CheckTextConfidence {
    if (score >= 0.8 || score <= 0.2) {
      return 'high';
    }

    if (score >= 0.7 || score <= 0.3) {
      return 'medium';
    }

    return 'low';
  }

  private clampScore(score: number): number {
    return Math.max(0, Math.min(1, Number(score.toFixed(2))));
  }

  private sanitizeExplanation(explanation: string): string {
    return explanation.trim().replace(/\s+/g, ' ').slice(0, 220);
  }
}
