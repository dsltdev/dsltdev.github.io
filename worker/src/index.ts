export interface Env {
  AI: Ai;
  VECTORIZE: Vectorize;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RAGRequest {
  messages: ChatMessage[];
  stream?: boolean;
}

const SYSTEM_PROMPT = `Sos NeuroFamilia AI, un asistente especializado en neuroeducación familiar. Tu objetivo es ayudar a padres y madres a entender el desarrollo de sus hijos, mejorar la comunicación familiar y criar con consciencia.

Tu trabajo es acompañar una conversación, no entregar respuestas aisladas. Primero escuchá lo que la persona quiso decir y respondé a eso. En cada turno:
1. Reconocé de manera natural lo que la persona está viviendo, sin usar etiquetas como "Validación" ni repetir su mensaje palabra por palabra.
2. Explicá qué puede estar ocurriendo usando el contexto disponible y lenguaje sencillo.
3. Proponé una acción concreta, pequeña y segura para probar.
4. Cerrá con una sola pregunta abierta que permita adaptar el siguiente paso.

No inventes estudios, diagnósticos ni resultados. Si no tenés información suficiente, decilo honestamente y pedí el dato que falta. Diferenciá orientación educativa de atención clínica. Si aparecen señales de violencia, abuso, autolesión, riesgo inmediato o una emergencia, priorizá la seguridad y recomendá ayuda profesional o servicios de emergencia de la zona.

NeuroFamilia puede mencionarse como una opción de acompañamiento cuando la persona pregunte por la plataforma, pida seguimiento o muestre interés en continuar; nunca interrumpas una situación sensible con una venta.

Cómo conversar:
- Soná cálido, presente y natural, como un orientador atento; no como un formulario, folleto o manual.
- Respondé en español latinoamericano claro y adaptá el registro a la persona.
- Usá párrafos breves y listas solo cuando ayuden.
- No repitas consejos ni hagas preguntas innecesarias.
- Referenciá las fuentes cuando las uses, sin inventarlas.
- Cerrá con exactamente una pregunta abierta: una sola interrogación al final.
- No afirmes que tenés sentimientos, experiencias personales o una relación humana con la familia.`;

async function embedQuery(env: Env, query: string): Promise<number[]> {
  const result = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: [query]
  });
  return result.data[0];
}

async function searchVectorize(
  env: Env,
  embedding: number[],
  topK: number = 5
): Promise<VectorizeMatches> {
  return await env.VECTORIZE.query(embedding, {
    topK,
    returnMetadata: true
  });
}

function buildContext(matches: VectorizeMatches): string {
  if (!matches.matches || matches.matches.length === 0) {
    return 'No se encontró información relevante en la base de conocimiento.';
  }

  return matches.matches
    .map((match, i) => {
      const metadata = match.metadata as Record<string, string>;
      return `[Fuente ${i + 1}: ${metadata?.title || 'Sin título'}]
${metadata?.content || match.id}
Categoría: ${metadata?.category || 'General'}
Edad: ${metadata?.ageGroup || 'Todas las edades'}`;
    })
    .join('\n\n---\n\n');
}

async function generateResponse(
  env: Env,
  messages: ChatMessage[],
  context: string
): Promise<string> {
  const lastMessage = messages.findLast(message => message.role === 'user');
  if (!lastMessage) {
    return 'Para orientarte mejor, contame qué situación familiar querés trabajar.';
  }
  const userQuery = lastMessage.content;

  const augmentedPrompt = `Contexto de NeuroFamilia:
${context}

---

Última situación planteada por la persona: ${userQuery}

Continuá la conversación con el protocolo indicado. Basate en el contexto proporcionado. Si no es relevante, indicá que no tenés información específica sobre ese tema y hacé una pregunta para comprender mejor la situación.`;

  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(0, -1),
      { role: 'user', content: augmentedPrompt }
    ],
    max_tokens: 1024,
    temperature: 0.7
  });

  return (response as { response?: string }).response || 'No pude generar una respuesta.';
}

async function* streamResponse(
  env: Env,
  messages: ChatMessage[],
  context: string
): AsyncGenerator<string> {
  const lastMessage = messages.findLast(message => message.role === 'user');
  if (!lastMessage) {
    yield 'Para orientarte mejor, contame qué situación familiar querés trabajar.';
    return;
  }
  const userQuery = lastMessage.content;

  const augmentedPrompt = `Contexto de NeuroFamilia:
${context}

---

Última situación planteada por la persona: ${userQuery}

Continuá la conversación con el protocolo indicado. Basate en el contexto proporcionado. Si no es relevante, indicá que no tenés información específica sobre ese tema y hacé una pregunta para comprender mejor la situación.`;

  const stream = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(0, -1),
      { role: 'user', content: augmentedPrompt }
    ],
    max_tokens: 1024,
    temperature: 0.7,
    stream: true
  });

  for await (const chunk of stream) {
    if (chunk.response) {
      yield chunk.response;
    }
  }
}

function corsHeaders(origin: string | null): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(origin)
      });
    }

    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const body = await request.json() as RAGRequest;
        const { messages, stream = false } = body;

        if (!messages || messages.length === 0) {
          return new Response(
            JSON.stringify({ error: 'Messages are required' }),
            { status: 400, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } }
          );
        }

        const lastUserMessage = messages.findLast(m => m.role === 'user');
        if (!lastUserMessage) {
          return new Response(
            JSON.stringify({ error: 'At least one user message is required' }),
            { status: 400, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } }
          );
        }

        const embedding = await embedQuery(env, lastUserMessage.content);
        const matches = await searchVectorize(env, embedding);
        const context = buildContext(matches);

        if (stream) {
          const encoder = new TextEncoder();
          const readable = new ReadableStream({
            async start(controller) {
              try {
                for await (const chunk of streamResponse(env, messages, context)) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
                }
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
              } catch (error) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`)
                );
                controller.close();
              }
            }
          });

          return new Response(readable, {
            headers: {
              ...corsHeaders(origin),
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            }
          });
        }

        const response = await generateResponse(env, messages, context);
        const sources = matches.matches?.map(m => {
          const metadata = m.metadata as Record<string, string>;
          return {
            title: metadata?.title || 'Sin título',
            score: m.score,
            category: metadata?.category
          };
        }) || [];

        return new Response(
          JSON.stringify({ response, sources }),
          {
            headers: {
              ...corsHeaders(origin),
              'Content-Type': 'application/json'
            }
          }
        );

      } catch (error) {
        console.error('Chat error:', error);
        return new Response(
          JSON.stringify({ error: 'Internal server error' }),
          {
            status: 500,
            headers: {
              ...corsHeaders(origin),
              'Content-Type': 'application/json'
            }
          }
        );
      }
    }

    if (url.pathname === '/api/health') {
      return new Response(
        JSON.stringify({ status: 'ok', service: 'NeuroFamilia RAG' }),
        {
          headers: {
            ...corsHeaders(origin),
            'Content-Type': 'application/json'
          }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      {
        status: 404,
        headers: {
          ...corsHeaders(origin),
          'Content-Type': 'application/json'
        }
      }
    );
  }
};
