# API

Minimal NestJS API for AI Checker.

## Endpoint

```http
POST /check-text
```

Request:

```json
{
  "text": "string"
}
```

Response:

```json
{
  "label": "uncertain",
  "score": 0.5,
  "confidence": "low",
  "explanation": "Heuristic result is uncertain. Strongest signals: repeated words (24% repeated content words: process x4, efficient x3), similar sentence lengths (18% variation), formulaic phrasing (2 markers)."
}
```

The endpoint uses hybrid detection when `OPENAI_API_KEY` is configured and local heuristic detection otherwise. It rejects missing or empty `text` values.
Local web app origins such as `http://localhost:3000` are allowed by CORS for development.

## YouTube Endpoint

```http
POST /check-youtube
```

Request:

```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

Response:

```json
{
  "label": "likely_ai",
  "score": 0.82,
  "confidence": "high",
  "explanation": "The transcript uses repetitive phrasing, uniform rhythm, and generic transitions."
}
```

This endpoint extracts a transcript from the YouTube caption tracks and passes the transcript text into the existing text checker. It supports `youtube.com/watch?v=VIDEO_ID` and `www.youtube.com/watch?v=VIDEO_ID` URLs first. It returns `400` for invalid URLs, `422` when a transcript is unavailable, and `502` when transcript fetching fails unexpectedly.

## Checker Logic

The API runs the local heuristic checker first. When `OPENAI_API_KEY` exists, it sends the text and heuristic signals to the OpenAI semantic checker for a final hybrid result. If the API key is missing or the OpenAI request fails, `/check-text` returns the heuristic result. `/check-youtube` reuses the same checker after transcript extraction and does not duplicate AI detection logic.

`/check-text` evaluates text length, sentence count, average sentence length, repeated words, vocabulary diversity, sentence length variation, and formulaic phrasing. Scores use a `0` to `1` range:

- `likely_ai` when `score >= 0.70`
- `likely_human` when `score <= 0.30`
- `uncertain` otherwise

Confidence is calculated locally from the final score:

- `high` when `score >= 0.80` or `score <= 0.20`
- `medium` when `score >= 0.70` or `score <= 0.30`
- `low` otherwise

The public response includes the label, score, confidence, and explanation:

```json
{
  "label": "likely_ai",
  "score": 0.82,
  "confidence": "high",
  "explanation": "The text uses repetitive phrasing, uniform rhythm, and generic transitions."
}
```

## Environment

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OPENAI_CHECK_TIMEOUT_MS=8000
OPENAI_MAX_INPUT_CHARS=12000
```

Do not expose `OPENAI_API_KEY` to the web app or extension. Set it only in the API server environment.

## Run

```bash
npm install
npm run start:dev
```

The API listens on `http://localhost:3001`.
