export type CheckTextLabel = 'likely_ai' | 'likely_human' | 'uncertain';
export type CheckTextConfidence = 'low' | 'medium' | 'high';

export type CheckTextRequest = {
  text: string;
};

export type CheckTextResponse = {
  label: CheckTextLabel;
  score: number;
  confidence: CheckTextConfidence;
  explanation: string;
};
