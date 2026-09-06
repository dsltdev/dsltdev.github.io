import type { NeuroFamiliaError } from './types';

export class SDKError extends Error implements NeuroFamiliaError {
  public code: string;
  public status?: number;

  constructor(message: string, code: string, status?: number) {
    super(message);
    this.name = 'NeuroFamiliaSDKError';
    this.code = code;
    this.status = status;
  }

  static missingApiKey(): SDKError {
    return new SDKError(
      'API key is required. Pass it in the config or set NEUROFAMILIA_API_KEY env var.',
      'MISSING_API_KEY'
    );
  }

  static missingBaseUrl(): SDKError {
    return new SDKError(
      'Base URL is required. Pass it in the config or set NEUROFAMILIA_BASE_URL env var.',
      'MISSING_BASE_URL'
    );
  }

  static networkError(err: Error): SDKError {
    return new SDKError(
      `Network error: ${err.message}`,
      'NETWORK_ERROR'
    );
  }

  static apiError(status: number, message: string): SDKError {
    return new SDKError(
      message || `API error: ${status}`,
      'API_ERROR',
      status
    );
  }

  static timeout(): SDKError {
    return new SDKError(
      'Request timed out',
      'TIMEOUT'
    );
  }

  static streamError(): SDKError {
    return new SDKError(
      'Stream processing error',
      'STREAM_ERROR'
    );
  }
}
