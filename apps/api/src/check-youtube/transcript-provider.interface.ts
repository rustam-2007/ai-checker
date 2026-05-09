export type TranscriptSegment = {
  text: string;
};

export type TranscriptResult = {
  videoId: string;
  language?: string;
  source: 'youtube_transcript';
  segments: TranscriptSegment[];
  text: string;
};

export interface TranscriptProvider {
  fetchTranscript(videoId: string): Promise<TranscriptResult>;
}

export class TranscriptUnavailableError extends Error {
  constructor(message = 'Transcript is not available for this video') {
    super(message);
    this.name = 'TranscriptUnavailableError';
  }
}

export class TranscriptProviderError extends Error {
  constructor(message = 'Transcript provider failed') {
    super(message);
    this.name = 'TranscriptProviderError';
  }
}
