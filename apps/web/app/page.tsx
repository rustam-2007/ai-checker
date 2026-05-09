"use client";

import { FormEvent, useState } from "react";

type CheckResult = {
  label: "likely_ai" | "likely_human" | "uncertain";
  score: number;
  confidence: "low" | "medium" | "high";
  explanation: string;
};

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

const labelText: Record<CheckResult["label"], string> = {
  likely_ai: "Likely AI",
  likely_human: "Likely Human",
  uncertain: "Uncertain",
};

const confidenceText: Record<CheckResult["confidence"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export default function Home() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!text.trim()) {
      setResult(null);
      setError("Enter text to check.");
      return;
    }

    setError("");
    setResult(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/check-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("API request failed.");
      }

      const data = (await response.json()) as CheckResult;
      setResult(data);
    } catch {
      setError("Could not check the text. Make sure the API is running.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="checker">
        <div className="intro">
          <p className="eyebrow">AI Checker MVP</p>
          <h1>Check text for AI-like writing</h1>
          <p>Paste text below and get a mock result from the API.</p>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <label htmlFor="text">Text to check</label>
          <textarea
            id="text"
            name="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Paste text here..."
            rows={10}
            disabled={isLoading}
          />

          {error ? <p className="error">{error}</p> : null}

          <button type="submit" disabled={isLoading}>
            {isLoading ? "Checking..." : "Check Text"}
          </button>
        </form>

        {isLoading ? (
          <section className="result" aria-live="polite" aria-busy="true">
            <h2>Result</h2>
            <p>Checking text...</p>
          </section>
        ) : result ? (
          <section className="result" aria-live="polite">
            <h2>Result</h2>
            <dl>
              <div>
                <dt>Label</dt>
                <dd>{labelText[result.label]}</dd>
              </div>
              <div>
                <dt>Score</dt>
                <dd>{Math.round(result.score * 100)}%</dd>
              </div>
              <div>
                <dt>Confidence</dt>
                <dd>{confidenceText[result.confidence]}</dd>
              </div>
              <div>
                <dt>Explanation</dt>
                <dd>{result.explanation}</dd>
              </div>
            </dl>
          </section>
        ) : null}
      </section>
    </main>
  );
}
