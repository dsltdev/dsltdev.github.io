import type {
  NeuroFamiliaConfig,
  Message,
  ChatResponse,
  HealthResponse,
  StreamEvent
} from './types';
import { SDKError } from './errors';

export class NeuroFamilia {
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;
  private retries: number;

  constructor(config: NeuroFamiliaConfig) {
    const baseUrl = config.baseUrl || process.env.NEUROFAMILIA_BASE_URL;
    if (!baseUrl) throw SDKError.missingBaseUrl();

    const apiKey = config.apiKey || process.env.NEUROFAMILIA_API_KEY;

    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 2;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            ...this.getHeaders(),
            ...options?.headers
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          throw SDKError.apiError(response.status, errorBody);
        }

        return await response.json() as T;
      } catch (error) {
        lastError = error as Error;

        if (error instanceof SDKError) {
          throw error;
        }

        if (error instanceof DOMException && error.name === 'AbortError') {
          throw SDKError.timeout();
        }

        if (attempt < this.retries) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 100));
          continue;
        }
      }
    }

    throw SDKError.networkError(lastError!);
  }

  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/api/health');
  }

  async chat(messages: Message[]): Promise<ChatResponse> {
    if (!messages || messages.length === 0) {
      throw new SDKError('Messages are required', 'VALIDATION_ERROR');
    }

    const hasUserMessage = messages.some(m => m.role === 'user');
    if (!hasUserMessage) {
      throw new SDKError('At least one user message is required', 'VALIDATION_ERROR');
    }

    return this.request<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, stream: false })
    });
  }

  async *chatStream(messages: Message[]): AsyncGenerator<StreamEvent> {
    if (!messages || messages.length === 0) {
      throw new SDKError('Messages are required', 'VALIDATION_ERROR');
    }

    const hasUserMessage = messages.some(m => m.role === 'user');
    if (!hasUserMessage) {
      throw new SDKError('At least one user message is required', 'VALIDATION_ERROR');
    }

    const url = `${this.baseUrl}/api/chat`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ messages, stream: true }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw SDKError.apiError(response.status, errorBody);
      }

      const reader = response.body?.getReader();
      if (!reader) throw SDKError.streamError();

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              yield { content: parsed.content };
            }
            if (parsed.error) {
              throw SDKError.streamError();
            }
          } catch (e) {
            if (e instanceof SDKError) throw e;
          }
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof SDKError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw SDKError.timeout();
      }
      throw SDKError.networkError(error as Error);
    }
  }

  async chatSimple(message: string): Promise<string> {
    const response = await this.chat([{ role: 'user', content: message }]);
    return response.response;
  }

  async *chatStreamSimple(message: string): AsyncGenerator<string> {
    for await (const event of this.chatStream([{ role: 'user', content: message }])) {
      yield event.content;
    }
  }
}
