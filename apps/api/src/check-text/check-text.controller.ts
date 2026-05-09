import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { CheckTextService } from './check-text.service';
import { CheckTextRequest, CheckTextResponse } from './check-text.types';

@Controller()
export class CheckTextController {
  constructor(private readonly checkTextService: CheckTextService) {}

  @Post('check-text')
  checkText(@Body() body: Partial<CheckTextRequest> | undefined): Promise<CheckTextResponse> {
    if (typeof body?.text !== 'string' || body.text.trim().length === 0) {
      throw new BadRequestException('text must be a non-empty string');
    }

    return this.checkTextService.check(body.text);
  }
}
