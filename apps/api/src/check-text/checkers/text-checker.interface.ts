import { CheckTextResponse } from '../check-text.types';

export interface TextChecker {
  check(text: string): Promise<CheckTextResponse>;
}
