# API Contract

## Endpoint

```http
POST /check-text
```

## Request

```ts
export type TextCheckRequest = {
  text: string;
};
```

## Response

```ts
export type TextCheckResponse = {
  label: "likely_ai" | "likely_human" | "uncertain";
  score: number;
  confidence: "low" | "medium" | "high";
  explanation: string;
};
```

## YouTube Endpoint

```http
POST /check-youtube
```

## Request

```ts
export type YoutubeCheckRequest = {
  url: string;
};
```

## Response

```ts
export type YoutubeCheckResponse = TextCheckResponse;
```

## Notes

- `score` should use a `0` to `1` range.
- `label` is `likely_ai` when `score >= 0.70`, `likely_human` when `score <= 0.30`, and `uncertain` otherwise.
- `confidence` is calculated locally from the final score: `high` when `score >= 0.80` or `score <= 0.20`, `medium` when `score >= 0.70` or `score <= 0.30`, and `low` otherwise.
- The current API runs local heuristic detection first and optionally uses GPT semantic checking when `OPENAI_API_KEY` is configured.
- The text heuristic considers text length, sentence count, average sentence length, repeated words, vocabulary diversity, sentence length variation, and formulaic phrasing.
- If `OPENAI_API_KEY` is missing or OpenAI checking fails, the API returns the local heuristic result.
- Raw GPT output and secrets are never included in the API response.
- Empty or missing `text` values are rejected.
- The YouTube endpoint supports `youtube.com/watch?v=VIDEO_ID` and `www.youtube.com/watch?v=VIDEO_ID`, extracts the video transcript from caption tracks, and passes transcript text into the existing text checker.
- The YouTube endpoint returns `400` for invalid URLs, `422` when a transcript is unavailable, and `502` when transcript fetching fails unexpectedly.
- Shared request and response types should move to `packages/shared` when both the web app and API need them.
