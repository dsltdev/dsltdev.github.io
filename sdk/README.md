# NeuroFamilia SDK

JavaScript/TypeScript SDK para el API de NeuroFamilia RAG - Asistente de neuroeducación familiar.

## Instalación

```bash
npm install @neurofamilia/sdk
```

## Uso rápido

```typescript
import { NeuroFamilia } from '@neurofamilia/sdk';

const nf = new NeuroFamilia({
  baseUrl: 'https://tu-worker.workers.dev'
});

// Chat simple
const response = await nf.chatSimple('¿Cómo puedo mejorar la comunicación con mi hijo adolescente?');
console.log(response);

// Chat con historial
const chat = await nf.chat([
  { role: 'user', content: 'Mi hijo de 12 años no me escucha' },
  { role: 'assistant', content: 'Entiendo que eso puede ser frustrante...' },
  { role: 'user', content: '¿Qué puedo hacer?' }
]);
console.log(chat.response);
console.log(chat.sources); // Fuentes de knowledge base
```

## Streaming

```typescript
// Streaming simple
for await (const chunk of nf.chatStreamSimple('¿Cómo manejar berrinches?')) {
  process.stdout.write(chunk);
}

// Streaming con historial
for await (const event of nf.chatStream([
  { role: 'user', content: 'Mi hijo tiene problemas para dormir' }
])) {
  process.stdout.write(event.content);
}
```

## Configuración

```typescript
const nf = new NeuroFamilia({
  baseUrl: 'https://tu-worker.workers.dev',  // requerido
  apiKey: 'tu-api-key',                       // opcional
  timeout: 30000,                             // default: 30s
  retries: 2                                  // default: 2
});
```

O usar variables de entorno:

```bash
NEUROFAMILIA_BASE_URL=https://tu-worker.workers.dev
NEUROFAMILIA_API_KEY=tu-api-key
```

```typescript
// Las variables de entorno se usan automáticamente
const nf = new NeuroFamilia({});
```

## Health Check

```typescript
const health = await nf.health();
console.log(health); // { status: 'ok', service: 'NeuroFamilia RAG' }
```

## Manejo de errores

```typescript
import { NeuroFamilia, SDKError } from '@neurofamilia/sdk';

try {
  const response = await nf.chatSimple('Hola');
} catch (error) {
  if (error instanceof SDKError) {
    console.error(`Error: ${error.code}`, error.message);
    
    switch (error.code) {
      case 'MISSING_BASE_URL':
        // Configurar URL
        break;
      case 'API_ERROR':
        console.error(`Status: ${error.status}`);
        break;
      case 'TIMEOUT':
        // Reintentar
        break;
      case 'NETWORK_ERROR':
        // Verificar conexión
        break;
    }
  }
}
```

## React / Next.js

```typescript
'use client';

import { NeuroFamilia } from '@neurofamilia/sdk';

const nf = new NeuroFamilia({
  baseUrl: process.env.NEXT_PUBLIC_NEUROFAMILIA_URL!
});

export function Chat() {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (message: string) => {
    setLoading(true);
    setResponse('');
    
    for await (const chunk of nf.chatStreamSimple(message)) {
      setResponse(prev => prev + chunk);
    }
    
    setLoading(false);
  };

  return (
    <div>
      <button onClick={() => sendMessage('Hola')}>Enviar</button>
      {loading && <p>Pensando...</p>}
      <p>{response}</p>
    </div>
  );
}
```

## TypeScript

El SDK está escrito en TypeScript y exporta todos los tipos:

```typescript
import type {
  NeuroFamiliaConfig,
  Message,
  ChatResponse,
  Source,
  StreamEvent
} from '@neurofamilia/sdk';
```

## Licencia

MIT
