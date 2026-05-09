import { BadGatewayException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { CheckTextService } from '../check-text/check-text.service';
import { CheckYoutubeResponse } from './check-youtube.types';
import {
  TranscriptProviderError,
  TranscriptUnavailableError,
} from './transcript-provider.interface';
import { YoutubeUrlService } from './youtube-url.service';
import { YoutubeTranscriptProviderService } from './providers/youtube-transcript-provider.service';

@Injectable()
export class CheckYoutubeService {
  constructor(
    private readonly youtubeUrlService: YoutubeUrlService,
    private readonly transcriptProvider: YoutubeTranscriptProviderService,
    private readonly checkTextService: CheckTextService,
  ) {}

  async check(url: string): Promise<CheckYoutubeResponse> {
    const videoId = this.youtubeUrlService.extractVideoId(url);

    try {
      const transcript = await this.transcriptProvider.fetchTranscript(videoId);

      return this.checkTextService.check(transcript.text);
    } catch (error) {
      if (error instanceof TranscriptUnavailableError) {
        throw new UnprocessableEntityException(error.message);
      }

      if (error instanceof TranscriptProviderError) {
        throw new BadGatewayException(error.message);
      }

      throw error;
    }
  }
}
