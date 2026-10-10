// Worker del asistente de ventas de dsltdev.com.
// El sitio es estático: este Worker es lo único con la llave de la API. No guarda ni registra las conversaciones.

import { sistema } from './prompt';
import { validar, separarAccion, MAX_BYTES } from './validar';

export interface Env {
  /** Secreto: `wrangler secret put ANTHROPIC_API_KEY`. */
  ANTHROPIC_API_KEY: string;
  MODEL?: string;
  /** Orígenes que pueden llamar, separados por coma. */
  ALLOWED_ORIGINS?: string;
  /** Tope de conversaciones por día para todo el sitio (freno de gasto). */
  MAX_DIA?: string;
  /** Límite por visitante (binding de Rate Limiting de Cloudflare). */
  LIMITER?: { limit(opts: { key: string }): Promise<{ success: boolean }> };
  /** KV opcional para el contador diario. */
  CUOTA?: { get(k: string): Promise<string | null>; put(k: string, v: string, o?: { expirationTtl?: number }): Promise<void> };
}

const MODELO = 'claude-haiku-5-5';
const ORIGENES = ['https://dsltdev.com', 'https://www.dsltdev.com'];
const MAX_DIA = 300;
const MAX_TOKENS = 400;
const TIMEOUT_MS = 20_000;
const CONTACTO = 'dsltdev@icloud.com';

function origenesPermitidos(env: Env): string[] {
  return env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean) : ORIGENES;
}

function cors(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

function json(data: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...(origin ? cors(origin) : {}) }
  });
}

async function dentroDelTopeDiario(env: Env): Promise<boolean> {
  if (!env.CUOTA) return true;
  const tope = Number(env.MAX_DIA) || MAX_DIA;
  const clave = `dia:${new Date().toISOString().slice(0, 10)}`;
  // Conteo aproximado (no atómico): sirve de freno de gasto, no de contabilidad.
  const n = Number(await env.CUOTA.get(clave)) || 0;
  if (n >= tope) return false;
  await env.CUOTA.put(clave, String(n + 1), { expirationTtl: 60 * 60 * 36 });
  return true;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin');
    const permitido = !!origin && origenesPermitidos(env).includes(origin);

    if (req.method === 'OPTIONS') {
      return permitido ? new Response(null, { status: 204, headers: cors(origin!) }) : new Response(null, { status: 403 });
    }
    if (url.pathname === '/salud' && req.method === 'GET') return json({ ok: true }, 200, permitido ? origin : null);
    if (url.pathname !== '/chat' || req.method !== 'POST') return json({ error: 'No encontrado.' }, 404, permitido ? origin : null);
    if (!permitido) return json({ error: 'Origen no permitido.' }, 403, null);

    const texto = await req.text();
    if (texto.length > MAX_BYTES) return json({ error: 'Solicitud demasiado grande.' }, 413, origin);
    let cuerpo: unknown;
    try {
      cuerpo = JSON.parse(texto);
    } catch {
      return json({ error: 'Solicitud inválida.' }, 400, origin);
    }
    const v = validar(cuerpo);
    if (!v.ok) return json({ error: v.error }, 400, origin);

    if (env.LIMITER) {
      const ip = req.headers.get('CF-Connecting-IP') ?? 'anon';
      const { success } = await env.LIMITER.limit({ key: ip });
      if (!success) return json({ error: 'Muchas preguntas seguidas. Probá de nuevo en un minuto.' }, 429, origin);
    }
    // El tope diario se cuenta una vez por conversación nueva (primer mensaje), no por cada mensaje.
    if (v.messages.length === 1 && !(await dentroDelTopeDiario(env))) {
      return json({ error: `El asistente llegó a su límite de hoy. Escribile a ${CONTACTO}.`, agotado: true }, 503, origin);
    }

    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: env.MODEL || MODELO,
          max_tokens: MAX_TOKENS,
          temperature: 0.3,
          system: sistema(),
          messages: v.messages
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
      if (!r.ok) throw new Error(`api ${r.status}`);
      const data = (await r.json()) as { content?: { type: string; text?: string }[] };
      const bruto = (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('').trim();
      if (!bruto) throw new Error('vacío');
      return json(separarAccion(bruto), 200, origin);
    } catch {
      // Sin detalles al visitante, y sin registrar el contenido de la conversación.
      return json({ error: `El asistente no está disponible ahora. Escribile a ${CONTACTO}.` }, 502, origin);
    }
  }
};
