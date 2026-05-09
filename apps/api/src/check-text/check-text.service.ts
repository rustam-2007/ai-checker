import { Injectable } from '@nestjs/common';
import { CheckTextResponse } from './check-text.types';
import { HybridTextCheckerService } from './hybrid/hybrid-text-checker.service';

@Injectable()
export class CheckTextService {
  constructor(private readonly hybridChecker: HybridTextCheckerService) {}

  check(text: string): Promise<CheckTextResponse> {
    return this.hybridChecker.check(text);
  }
}
