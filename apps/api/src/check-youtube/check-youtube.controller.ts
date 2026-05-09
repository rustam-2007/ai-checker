import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { CheckYoutubeService } from './check-youtube.service';
import { CheckYoutubeRequest, CheckYoutubeResponse } from './check-youtube.types';

@Controller()
export class CheckYoutubeController {
  constructor(private readonly checkYoutubeService: CheckYoutubeService) {}

  @Post('check-youtube')
  checkYoutube(
    @Body() body: Partial<CheckYoutubeRequest> | undefined,
  ): Promise<CheckYoutubeResponse> {
    if (typeof body?.url !== 'string' || body.url.trim().length === 0) {
      throw new BadRequestException('url must be a non-empty string');
    }

    return this.checkYoutubeService.check(body.url);
  }
}
