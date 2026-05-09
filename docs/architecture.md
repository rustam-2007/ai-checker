# Architecture

## Overview

AI Checker will start as a small TypeScript monorepo with a web app, an API, and shared package for contracts.

```text
apps/web      Next.js frontend
apps/api      NestJS backend API
packages/shared  Shared TypeScript types
```

## Web App

The web app will provide the main user flow:

- Paste text.
- Submit text for checking.
- Display the result returned by the API.

## API

The API will expose text-checking endpoints. The first endpoint should accept raw text and return a simple result contract.

## Shared Package

`packages/shared` should contain TypeScript types that are used by both the web app and API, such as request and response contracts.

## Out Of Scope For Initial MVP

- Chrome extension.
- User accounts.
- Payments.
- Persistent check history.
- YouTube transcript processing.
