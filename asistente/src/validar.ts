// Validación de lo que llega del navegador. Todo lo que viene del cliente es dato no confiable.

export interface Mensaje {
  role: 'user' | 'assistant';
  content: string;
}

export const MAX_MENSAJES = 12;
export const MAX_CARACTERES = 600;
export const MAX_BYTES = 12_000;

export type Resultado = { ok: true; messages: Mensaje[] } | { ok: false; error: string };

// Caracteres de control salvo salto de línea y tabulación.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

export function validar(cuerpo: unknown): Resultado {
  if (!cuerpo || typeof cuerpo !== 'object') return { ok: false, error: 'Solicitud inválida.' };
  const msgs = (cuerpo as { messages?: unknown }).messages;
  if (!Array.isArray(msgs) || msgs.length === 0) return { ok: false, error: 'Falta el mensaje.' };
  if (msgs.length > MAX_MENSAJES) return { ok: false, error: 'La conversación es demasiado larga. Empezá una nueva.' };

  const out: Mensaje[] = [];
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i] as { role?: unknown; content?: unknown };
    const esperado = i % 2 === 0 ? 'user' : 'assistant';
    if (m?.role !== esperado) return { ok: false, error: 'Solicitud inválida.' };
    if (typeof m.content !== 'string') return { ok: false, error: 'Solicitud inválida.' };
    const content = m.content.replace(CONTROL, '').trim();
    if (!content) return { ok: false, error: 'El mensaje está vacío.' };
    if (content.length > MAX_CARACTERES) return { ok: false, error: `El mensaje supera ${MAX_CARACTERES} caracteres.` };
    out.push({ role: esperado, content });
  }
  if (out[out.length - 1].role !== 'user') return { ok: false, error: 'Solicitud inválida.' };
  return { ok: true, messages: out };
}

export type Accion = 'pagar' | 'correo' | null;

/** Separa el texto visible del marcador de acción que pone el modelo. */
export function separarAccion(texto: string): { reply: string; cta: Accion } {
  const m = /\[\[(PAGAR|CORREO)\]\]/i.exec(texto);
  const cta: Accion = m ? (m[1].toUpperCase() === 'PAGAR' ? 'pagar' : 'correo') : null;
  const reply = texto.replace(/\[\[[A-ZÁÉÍÓÚ_ ]{2,20}\]\]/gi, '').replace(/\s+$/g, '').trim();
  return { reply, cta };
}
