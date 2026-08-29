import { ingestContent } from '../ingest';

interface IngestEnv {
  AI: Ai;
  VECTORIZE: VectorizeIndex;
}

export default {
  async fetch(_request: Request, env: IngestEnv): Promise<Response> {
    const result = await ingestContent(env.AI, env.VECTORIZE);

    return new Response(JSON.stringify({
      ok: result.errors.length === 0,
      ingested: result.ingested,
      errors: result.errors
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: result.errors.length === 0 ? 200 : 500
    });
  }
};
