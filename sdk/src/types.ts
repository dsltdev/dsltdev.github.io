export interface NeuroFamiliaConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Source {
  title: string;
  score: number;
  category?: string;
}

export interface ChatResponse {
  response: string;
  sources: Source[];
}

export interface ChatRequest {
  messages: Message[];
  stream?: boolean;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  service: string;
}

export interface StreamEvent {
  content: string;
}

export interface NeuroFamiliaError {
  message: string;
  code: string;
  status?: number;
}
