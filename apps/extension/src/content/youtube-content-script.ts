type CheckYoutubeResponse = {
  label: 'likely_ai' | 'likely_human' | 'uncertain';
  score: number;
  confidence: 'low' | 'medium' | 'high';
  explanation: string;
};

const apiBaseUrl = 'http://localhost:3001';
const hostId = 'ai-checker-youtube-panel-host';
let currentVideoId: string | null = null;

const labelText: Record<CheckYoutubeResponse['label'], string> = {
  likely_ai: 'Likely AI',
  likely_human: 'Likely Human',
  uncertain: 'Uncertain',
};

const confidenceText: Record<CheckYoutubeResponse['confidence'], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

function getYoutubeVideo(): { url: string; videoId: string } | null {
  const url = new URL(window.location.href);
  const hostname = url.hostname.toLowerCase();
  const isYoutubeHost = hostname === 'youtube.com' || hostname === 'www.youtube.com';
  const videoId = url.searchParams.get('v');

  if (!isYoutubeHost || url.pathname !== '/watch' || !videoId) {
    return null;
  }

  return {
    url: `https://www.youtube.com/watch?v=${videoId}`,
    videoId,
  };
}

function syncPanel(): void {
  const video = getYoutubeVideo();

  if (!video) {
    removePanel();
    currentVideoId = null;
    return;
  }

  if (video.videoId === currentVideoId && document.getElementById(hostId)) {
    return;
  }

  currentVideoId = video.videoId;
  renderPanel(video.url, video.videoId);
}

function removePanel(): void {
  document.getElementById(hostId)?.remove();
}

function renderPanel(videoUrl: string, videoId: string): void {
  removePanel();

  const host = document.createElement('div');
  host.id = hostId;
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    :host {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 2147483647;
      color: #17202a;
      font-family: Inter, Arial, sans-serif;
    }

    .panel {
      width: min(320px, calc(100vw - 32px));
      border: 1px solid #c8d0d8;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 12px 32px rgba(23, 32, 42, 0.18);
      padding: 14px;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }

    h2 {
      margin: 0;
      font-size: 15px;
      line-height: 1.2;
    }

    button {
      border: 0;
      border-radius: 8px;
      padding: 9px 12px;
      color: #ffffff;
      background: #234f48;
      font: inherit;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }

    button:hover:not(:disabled) {
      background: #1b403a;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.7;
    }

    .close {
      width: 28px;
      height: 28px;
      padding: 0;
      color: #52606d;
      background: transparent;
      font-size: 20px;
      line-height: 1;
    }

    .close:hover {
      color: #17202a;
      background: #eef2f4;
    }

    .status,
    .error,
    .meta,
    .explanation {
      margin: 0;
      font-size: 13px;
      line-height: 1.45;
    }

    .status,
    .meta {
      color: #52606d;
    }

    .error {
      color: #a33a2f;
      font-weight: 700;
    }

    .result {
      display: grid;
      gap: 8px;
      margin-top: 12px;
    }

    .metric {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 13px;
    }

    .metric span:first-child {
      color: #52606d;
      font-weight: 700;
    }

    .metric span:last-child {
      text-align: right;
      font-weight: 700;
    }
  `;

  const panel = document.createElement('section');
  panel.className = 'panel';
  panel.setAttribute('aria-live', 'polite');

  const header = document.createElement('div');
  header.className = 'header';

  const title = document.createElement('h2');
  title.textContent = 'AI Checker';

  const closeButton = document.createElement('button');
  closeButton.className = 'close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close AI Checker panel');
  closeButton.textContent = 'x';
  closeButton.addEventListener('click', () => removePanel());

  const meta = document.createElement('p');
  meta.className = 'meta';
  meta.textContent = `Video ID: ${videoId}`;

  const actionButton = document.createElement('button');
  actionButton.type = 'button';
  actionButton.textContent = 'Check this video';

  const output = document.createElement('div');
  output.className = 'result';

  actionButton.addEventListener('click', () => {
    void checkVideo(videoUrl, actionButton, output);
  });

  header.append(title, closeButton);
  panel.append(header, meta, actionButton, output);
  shadow.append(style, panel);
  document.documentElement.append(host);
}

async function checkVideo(
  videoUrl: string,
  button: HTMLButtonElement,
  output: HTMLDivElement,
): Promise<void> {
  button.disabled = true;
  button.textContent = 'Checking...';
  output.replaceChildren(createParagraph('status', 'Checking video...'));

  try {
    const response = await fetch(`${apiBaseUrl}/check-youtube`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: videoUrl }),
    });

    if (!response.ok) {
      throw new Error('Backend request failed.');
    }

    const result = (await response.json()) as CheckYoutubeResponse;
    output.replaceChildren(...createResultNodes(result));
  } catch {
    output.replaceChildren(
      createParagraph('error', 'Could not check this video. Make sure the API is running.'),
    );
  } finally {
    button.disabled = false;
    button.textContent = 'Check this video';
  }
}

function createResultNodes(result: CheckYoutubeResponse): Node[] {
  const label = createMetric('Label', labelText[result.label]);
  const score = createMetric('AI score', `${Math.round(result.score * 100)}%`);
  const confidence = createMetric('Confidence', confidenceText[result.confidence]);
  const explanation = createParagraph('explanation', result.explanation);

  return [label, score, confidence, explanation];
}

function createMetric(name: string, value: string): HTMLElement {
  const metric = document.createElement('div');
  metric.className = 'metric';

  const nameNode = document.createElement('span');
  nameNode.textContent = name;

  const valueNode = document.createElement('span');
  valueNode.textContent = value;

  metric.append(nameNode, valueNode);
  return metric;
}

function createParagraph(className: string, text: string): HTMLParagraphElement {
  const paragraph = document.createElement('p');
  paragraph.className = className;
  paragraph.textContent = text;
  return paragraph;
}

function watchYoutubeNavigation(): void {
  window.addEventListener('popstate', syncPanel);
  window.addEventListener('yt-navigate-finish', syncPanel);

  const originalPushState = history.pushState;
  history.pushState = function pushState(...args) {
    const result = originalPushState.apply(this, args);
    window.setTimeout(syncPanel, 0);
    return result;
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function replaceState(...args) {
    const result = originalReplaceState.apply(this, args);
    window.setTimeout(syncPanel, 0);
    return result;
  };
}

watchYoutubeNavigation();
syncPanel();
