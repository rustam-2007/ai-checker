import { Injectable } from '@nestjs/common';
import {
  TranscriptProvider,
  TranscriptProviderError,
  TranscriptResult,
  TranscriptSegment,
  TranscriptUnavailableError,
} from '../transcript-provider.interface';

type CaptionTrack = {
  baseUrl?: unknown;
  languageCode?: unknown;
  name?: {
    simpleText?: unknown;
    runs?: Array<{
      text?: unknown;
    }>;
  };
  kind?: unknown;
  vssId?: unknown;
};

type PlayerResponse = {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrack[];
    };
  };
};

type Json3Transcript = {
  events?: Array<{
    segs?: Array<{
      utf8?: unknown;
    }>;
  }>;
};

@Injectable()
export class YoutubeTranscriptProviderService implements TranscriptProvider {
  async fetchTranscript(videoId: string): Promise<TranscriptResult> {
    const playerResponse = await this.fetchPlayerResponse(videoId);
    const captionTrack = this.selectCaptionTrack(playerResponse);
    const transcriptUrl = this.getTranscriptUrl(captionTrack);
    const segments = await this.fetchTranscriptSegments(transcriptUrl);
    const text = this.normalizeTranscriptText(segments);

    if (!text) {
      throw new TranscriptUnavailableError('Transcript is empty for this video');
    }

    return {
      videoId,
      language: this.getLanguage(captionTrack),
      source: 'youtube_transcript',
      segments,
      text,
    };
  }

  private async fetchPlayerResponse(videoId: string): Promise<PlayerResponse> {
    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=en`;

    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
        },
      });
    } catch {
      throw new TranscriptProviderError('Failed to fetch YouTube video page');
    }

    if (!response.ok) {
      throw new TranscriptProviderError('YouTube video page request failed');
    }

    const html = await response.text();
    const playerResponseJson = this.extractPlayerResponseJson(html);

    if (!playerResponseJson) {
      throw new TranscriptProviderError('Could not read YouTube player response');
    }

    try {
      return JSON.parse(playerResponseJson) as PlayerResponse;
    } catch {
      throw new TranscriptProviderError('Could not parse YouTube player response');
    }
  }

  private extractPlayerResponseJson(html: string): string | null {
    const marker = 'ytInitialPlayerResponse';
    const markerIndex = html.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const objectStart = html.indexOf('{', markerIndex);

    if (objectStart === -1) {
      return null;
    }

    return this.readBalancedJsonObject(html, objectStart);
  }

  private readBalancedJsonObject(value: string, startIndex: number): string | null {
    let depth = 0;
    let isInString = false;
    let isEscaped = false;

    for (let index = startIndex; index < value.length; index += 1) {
      const character = value[index];

      if (isInString) {
        if (isEscaped) {
          isEscaped = false;
        } else if (character === '\\') {
          isEscaped = true;
        } else if (character === '"') {
          isInString = false;
        }

        continue;
      }

      if (character === '"') {
        isInString = true;
      } else if (character === '{') {
        depth += 1;
      } else if (character === '}') {
        depth -= 1;

        if (depth === 0) {
          return value.slice(startIndex, index + 1);
        }
      }
    }

    return null;
  }

  private selectCaptionTrack(playerResponse: PlayerResponse): CaptionTrack {
    const captionTracks =
      playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

    if (captionTracks.length === 0) {
      throw new TranscriptUnavailableError();
    }

    const englishTrack = captionTracks.find((track) => {
      return track.languageCode === 'en' || track.vssId === '.en' || track.vssId === 'a.en';
    });

    return englishTrack ?? captionTracks[0];
  }

  private getTranscriptUrl(captionTrack: CaptionTrack): string {
    if (typeof captionTrack.baseUrl !== 'string' || captionTrack.baseUrl.length === 0) {
      throw new TranscriptUnavailableError();
    }

    let url: URL;

    try {
      url = new URL(captionTrack.baseUrl);
    } catch {
      throw new TranscriptProviderError('YouTube transcript URL is invalid');
    }

    url.searchParams.set('fmt', 'json3');

    return url.toString();
  }

  private async fetchTranscriptSegments(transcriptUrl: string): Promise<TranscriptSegment[]> {
    let response: Response;

    try {
      response = await fetch(transcriptUrl);
    } catch {
      throw new TranscriptProviderError('Failed to fetch YouTube transcript');
    }

    if (!response.ok) {
      throw new TranscriptProviderError('YouTube transcript request failed');
    }

    const body = await response.text();

    try {
      return this.parseJson3Transcript(JSON.parse(body) as Json3Transcript);
    } catch {
      return this.parseXmlTranscript(body);
    }
  }

  private parseJson3Transcript(transcript: Json3Transcript): TranscriptSegment[] {
    const segments =
      transcript.events
        ?.flatMap((event) => event.segs ?? [])
        .map((segment) => (typeof segment.utf8 === 'string' ? segment.utf8 : ''))
        .map((text) => this.cleanSegmentText(text))
        .filter(Boolean)
        .map((text) => ({ text })) ?? [];

    if (segments.length === 0) {
      throw new TranscriptUnavailableError('Transcript is empty for this video');
    }

    return segments;
  }

  private parseXmlTranscript(xml: string): TranscriptSegment[] {
    const segments = Array.from(xml.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g))
      .map((match) => this.decodeHtmlEntities(match[1]))
      .map((text) => this.cleanSegmentText(text))
      .filter(Boolean)
      .map((text) => ({ text }));

    if (segments.length === 0) {
      throw new TranscriptUnavailableError('Transcript is empty for this video');
    }

    return segments;
  }

  private normalizeTranscriptText(segments: TranscriptSegment[]): string {
    return segments
      .map((segment) => segment.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private cleanSegmentText(text: string): string {
    return this.decodeHtmlEntities(text).replace(/\s+/g, ' ').trim();
  }

  private decodeHtmlEntities(value: string): string {
    const namedEntities: Record<string, string> = {
      amp: '&',
      apos: "'",
      gt: '>',
      lt: '<',
      quot: '"',
    };

    return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
      const normalizedCode = code.toLowerCase();

      if (normalizedCode.startsWith('#x')) {
        const codePoint = Number.parseInt(normalizedCode.slice(2), 16);

        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
      }

      if (normalizedCode.startsWith('#')) {
        const codePoint = Number.parseInt(normalizedCode.slice(1), 10);

        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
      }

      return namedEntities[normalizedCode] ?? entity;
    });
  }

  private getLanguage(captionTrack: CaptionTrack): string | undefined {
    return typeof captionTrack.languageCode === 'string' ? captionTrack.languageCode : undefined;
  }
}
