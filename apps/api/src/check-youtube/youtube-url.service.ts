import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class YoutubeUrlService {
  extractVideoId(value: string): string {
    let url: URL;

    try {
      url = new URL(value);
    } catch {
      throw new BadRequestException('url must be a valid YouTube video URL');
    }

    const hostname = url.hostname.toLowerCase();
    const isYoutubeHost = hostname === 'youtube.com' || hostname === 'www.youtube.com';
    const videoId = url.searchParams.get('v')?.trim() ?? '';

    if (!isYoutubeHost || url.pathname !== '/watch' || !this.isValidVideoId(videoId)) {
      throw new BadRequestException('url must be a valid YouTube video URL');
    }

    return videoId;
  }

  private isValidVideoId(videoId: string): boolean {
    return /^[A-Za-z0-9_-]{11}$/.test(videoId);
  }
}
