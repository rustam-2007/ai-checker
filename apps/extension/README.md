# Chrome Extension

Manifest V3 Chrome extension for checking the current YouTube video with the AI Checker backend.

## Current Features

- Runs on YouTube pages.
- Detects `/watch?v=...` video URLs.
- Shows a small floating AI Checker panel.
- Calls the backend `POST /check-youtube` endpoint only when the user clicks `Check this video`.
- Displays label, score, and explanation returned by the backend.

No API keys or checker logic are included in the extension.

## Build

```bash
npm install
npm run build
```

The manifest loads `dist/content/youtube-content-script.js`.

## Load In Chrome

1. Open `chrome://extensions`.
2. Turn on `Developer mode`.
3. Click `Load unpacked`.
4. Select the `apps/extension` folder.

## Test

1. Start the API from `apps/api`:

```bash
npm run dev
```

2. Open a YouTube video page such as `https://www.youtube.com/watch?v=...`.
3. Confirm the AI Checker panel appears in the bottom-right corner.
4. Click `Check this video`.
5. Confirm the panel displays label, score, and explanation.

## Limitations

- The backend `POST /check-youtube` endpoint is currently connected as an MVP placeholder.
- Real transcript fetching and YouTube-specific checker logic are not implemented yet.
- The extension backend URL is fixed to `http://localhost:3001` for local MVP testing.
