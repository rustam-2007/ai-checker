import { Injectable } from '@nestjs/common';
import { CheckTextConfidence, CheckTextResponse } from '../check-text.types';
import { TextChecker } from './text-checker.interface';

export type HeuristicSignal = {
  name: string;
  score: number;
  weight: number;
  aiDetail: string;
  humanDetail: string;
};

export type HeuristicTextMetrics = {
  wordCount: number;
  sentenceCount: number;
  averageSentenceLength: number;
  repeatedWordRatio: number;
  vocabularyDiversity: number;
  sentenceLengthVariation: number;
  formulaicPhraseCount: number;
  topRepeatedWords: string[];
};

export type HeuristicTextAnalysis = {
  response: CheckTextResponse;
  metrics: HeuristicTextMetrics;
  signals: HeuristicSignal[];
};

@Injectable()
export class HeuristicTextCheckerService implements TextChecker {
  async check(text: string): Promise<CheckTextResponse> {
    return this.analyze(text).response;
  }

  analyze(text: string): HeuristicTextAnalysis {
    const normalizedText = text.trim();
    const words = this.getWords(normalizedText);
    const sentences = this.getSentences(normalizedText);

    if (words.length < 20 || sentences.length < 2) {
      const metrics = this.getMetrics(normalizedText, words, sentences);

      return {
        response: {
          label: 'uncertain',
          score: 0.5,
          confidence: this.getConfidence(0.5),
          explanation: `Heuristic result is uncertain because text length (${words.length} words) and sentence count (${sentences.length}) are too low to evaluate reliably.`,
        },
        metrics,
        signals: this.getSignals(metrics),
      };
    }

    const metrics = this.getMetrics(normalizedText, words, sentences);
    const signals = this.getSignals(metrics);
    const totalWeight = signals.reduce((total, signal) => total + signal.weight, 0);
    const weightedScore = signals.reduce(
      (total, signal) => total + signal.score * signal.weight,
      0,
    );
    const score = this.clampScore(weightedScore / totalWeight);
    const label = this.getLabel(score);

    return {
      response: {
        label,
        score,
        confidence: this.getConfidence(score),
        explanation: this.getExplanation(label, signals),
      },
      metrics,
      signals,
    };
  }

  private getMetrics(
    text: string,
    words: string[],
    sentences: string[],
  ): HeuristicTextMetrics {
    const contentWords = words.filter((word) => !this.isCommonWord(word));
    const sentenceLengths = sentences.map((sentence) => this.getWords(sentence).length);
    const wordCount = words.length;
    const sentenceCount = sentences.length;
    const averageSentenceLength = this.getAverage(sentenceLengths);
    const repeatedWords = this.getRepeatedWords(contentWords);

    return {
      wordCount,
      sentenceCount,
      averageSentenceLength,
      repeatedWordRatio:
        contentWords.length === 0
          ? 0
          : repeatedWords.reduce((total, repeatedWord) => total + repeatedWord.count - 1, 0) /
            contentWords.length,
      vocabularyDiversity:
        contentWords.length === 0 ? 0 : new Set(contentWords).size / contentWords.length,
      sentenceLengthVariation: this.getSentenceLengthVariation(sentenceLengths),
      formulaicPhraseCount:
        this.countGenericPhrases(text) + this.countPolishedToneMarkers(text),
      topRepeatedWords: repeatedWords
        .slice(0, 3)
        .map((repeatedWord) => `${repeatedWord.word} x${repeatedWord.count}`),
    };
  }

  private getSignals(metrics: HeuristicTextMetrics): HeuristicSignal[] {
    return [
      {
        name: 'text length',
        score: this.scoreTextLength(metrics.wordCount),
        weight: 0.08,
        aiDetail: `longer text sample (${metrics.wordCount} words)`,
        humanDetail: `shorter text sample (${metrics.wordCount} words)`,
      },
      {
        name: 'sentence count',
        score: this.scoreSentenceCount(metrics.sentenceCount),
        weight: 0.07,
        aiDetail: `many sentences (${metrics.sentenceCount})`,
        humanDetail: `few sentences (${metrics.sentenceCount})`,
      },
      {
        name: 'average sentence length',
        score: this.scoreAverageSentenceLength(metrics.averageSentenceLength),
        weight: 0.15,
        aiDetail: `long average sentence length (${this.formatNumber(metrics.averageSentenceLength)} words)`,
        humanDetail: `moderate average sentence length (${this.formatNumber(metrics.averageSentenceLength)} words)`,
      },
      {
        name: 'repeated words',
        score: this.scoreRepeatedWords(metrics.repeatedWordRatio),
        weight: 0.2,
        aiDetail: `repeated words (${this.formatPercent(metrics.repeatedWordRatio)} repeated content words${this.formatRepeatedWords(metrics.topRepeatedWords)})`,
        humanDetail: `few repeated words (${this.formatPercent(metrics.repeatedWordRatio)} repeated content words)`,
      },
      {
        name: 'vocabulary diversity',
        score: this.scoreVocabularyDiversity(metrics.vocabularyDiversity),
        weight: 0.2,
        aiDetail: `low vocabulary diversity (${this.formatPercent(metrics.vocabularyDiversity)} unique content words)`,
        humanDetail: `high vocabulary diversity (${this.formatPercent(metrics.vocabularyDiversity)} unique content words)`,
      },
      {
        name: 'sentence length variation',
        score: this.scoreSentenceLengthVariation(metrics.sentenceLengthVariation),
        weight: 0.18,
        aiDetail: `similar sentence lengths (${this.formatPercent(metrics.sentenceLengthVariation)} variation)`,
        humanDetail: `varied sentence lengths (${this.formatPercent(metrics.sentenceLengthVariation)} variation)`,
      },
      {
        name: 'formulaic phrasing',
        score: this.scoreFormulaicPhrasing(metrics.formulaicPhraseCount),
        weight: 0.12,
        aiDetail: `formulaic phrasing (${metrics.formulaicPhraseCount} marker${metrics.formulaicPhraseCount === 1 ? '' : 's'})`,
        humanDetail: `few formulaic phrases (${metrics.formulaicPhraseCount} markers)`,
      },
    ];
  }

  private getWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9'\s-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  private getSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
  }

  private countGenericPhrases(text: string): number {
    const lowerText = text.toLowerCase();
    const phrases = [
      'in conclusion',
      'it is important to note',
      'it is worth noting',
      'in today\'s world',
      'plays a vital role',
      'a wide range of',
      'various aspects',
      'significant impact',
      'overall',
      'furthermore',
      'moreover',
      'additionally',
      'in the realm of',
      'when it comes to',
    ];

    return phrases.filter((phrase) => lowerText.includes(phrase)).length;
  }

  private countPolishedToneMarkers(text: string): number {
    const lowerText = text.toLowerCase();
    const markers = [
      'therefore',
      'however',
      'consequently',
      'ultimately',
      'notably',
      'comprehensive',
      'seamless',
      'robust',
      'efficient',
      'enhance',
      'underscore',
      'facilitate',
      'leverage',
      'streamline',
    ];

    return markers.filter((marker) => lowerText.includes(marker)).length;
  }

  private getRepeatedWords(words: string[]): { word: string; count: number }[] {
    const counts = new Map<string, number>();

    for (const word of words) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([word, count]) => ({ word, count }))
      .sort((first, second) => second.count - first.count);
  }

  private getSentenceLengthVariation(lengths: number[]): number {
    const average = this.getAverage(lengths);

    if (average === 0) {
      return 0;
    }

    const variance =
      lengths.reduce((total, length) => total + Math.abs(length - average), 0) /
      lengths.length;

    return variance / average;
  }

  private getAverage(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    return values.reduce((total, value) => total + value, 0) / values.length;
  }

  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'a',
      'an',
      'and',
      'are',
      'as',
      'at',
      'be',
      'because',
      'but',
      'by',
      'for',
      'from',
      'has',
      'have',
      'in',
      'is',
      'it',
      'of',
      'on',
      'or',
      'that',
      'the',
      'this',
      'to',
      'was',
      'were',
      'with',
    ]);

    return commonWords.has(word);
  }

  private scoreTextLength(wordCount: number): number {
    if (wordCount < 40) {
      return 0.2;
    }

    if (wordCount < 80) {
      return 0.35;
    }

    if (wordCount <= 220) {
      return 0.5;
    }

    return 0.65;
  }

  private scoreSentenceCount(sentenceCount: number): number {
    if (sentenceCount <= 3) {
      return 0.15;
    }

    if (sentenceCount <= 7) {
      return 0.35;
    }

    if (sentenceCount <= 14) {
      return 0.5;
    }

    return 0.65;
  }

  private scoreAverageSentenceLength(averageSentenceLength: number): number {
    if (averageSentenceLength < 10) {
      return 0.25;
    }

    if (averageSentenceLength < 18) {
      return 0.45;
    }

    if (averageSentenceLength <= 28) {
      return 0.75;
    }

    return 0.55;
  }

  private scoreRepeatedWords(repeatedWordRatio: number): number {
    if (repeatedWordRatio >= 0.45) {
      return 1;
    }

    if (repeatedWordRatio >= 0.32) {
      return 0.8;
    }

    if (repeatedWordRatio >= 0.18) {
      return 0.55;
    }

    if (repeatedWordRatio >= 0.1) {
      return 0.35;
    }

    return 0.15;
  }

  private scoreVocabularyDiversity(vocabularyDiversity: number): number {
    if (vocabularyDiversity < 0.42) {
      return 0.95;
    }

    if (vocabularyDiversity < 0.52) {
      return 0.75;
    }

    if (vocabularyDiversity < 0.62) {
      return 0.55;
    }

    if (vocabularyDiversity < 0.75) {
      return 0.3;
    }

    return 0.15;
  }

  private scoreSentenceLengthVariation(sentenceLengthVariation: number): number {
    if (sentenceLengthVariation < 0.18) {
      return 0.95;
    }

    if (sentenceLengthVariation < 0.25) {
      return 0.75;
    }

    if (sentenceLengthVariation < 0.35) {
      return 0.35;
    }

    if (sentenceLengthVariation < 0.55) {
      return 0.3;
    }

    return 0.15;
  }

  private scoreFormulaicPhrasing(formulaicPhraseCount: number): number {
    return Math.min(1, formulaicPhraseCount / 4);
  }

  private getExplanation(
    label: CheckTextResponse['label'],
    signals: HeuristicSignal[],
  ): string {
    const strongestSignals = this.getStrongestSignals(label, signals)
      .slice(0, 3)
      .map((signal) => this.getSignalDetail(label, signal))
      .join(', ');

    if (label === 'likely_ai') {
      return `Heuristic result points to likely AI text. Strongest signals: ${strongestSignals}.`;
    }

    if (label === 'likely_human') {
      return `Heuristic result points to likely human text. Strongest signals: ${strongestSignals}.`;
    }

    return `Heuristic result is uncertain. Strongest signals: ${strongestSignals}.`;
  }

  private getStrongestSignals(
    label: CheckTextResponse['label'],
    signals: HeuristicSignal[],
  ): HeuristicSignal[] {
    return [...signals].sort((first, second) => {
      return this.getSignalStrength(label, second) - this.getSignalStrength(label, first);
    });
  }

  private getSignalStrength(
    label: CheckTextResponse['label'],
    signal: HeuristicSignal,
  ): number {
    if (label === 'likely_human') {
      return (1 - signal.score) * signal.weight;
    }

    if (label === 'likely_ai') {
      return signal.score * signal.weight;
    }

    return Math.abs(signal.score - 0.5) * signal.weight;
  }

  private getSignalDetail(
    label: CheckTextResponse['label'],
    signal: HeuristicSignal,
  ): string {
    if (label === 'likely_human') {
      return signal.humanDetail;
    }

    if (label === 'likely_ai') {
      return signal.aiDetail;
    }

    return signal.score >= 0.5 ? signal.aiDetail : signal.humanDetail;
  }

  private clampScore(score: number): number {
    return Math.max(0, Math.min(1, Number(score.toFixed(2))));
  }

  private getLabel(score: number): CheckTextResponse['label'] {
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

  private formatNumber(value: number): string {
    return Number(value.toFixed(1)).toString();
  }

  private formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  private formatRepeatedWords(repeatedWords: string[]): string {
    if (repeatedWords.length === 0) {
      return '';
    }

    return `: ${repeatedWords.join(', ')}`;
  }
}
