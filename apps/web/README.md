# Web App

Minimal Next.js UI for the AI Checker MVP.

## Current Features

- Textarea for text input.
- Check button.
- Loading and error states while checking text.
- Result section populated from the API `POST /check-text` response.

## Run

Install dependencies from this folder, then start the dev server:

```bash
npm install
npm run dev
```

By default, the web app calls `http://localhost:3001/check-text`.
Set `NEXT_PUBLIC_API_BASE_URL` before starting the dev server to use a different API URL.
