# NeuroFamilia RAG Worker

Worker de Cloudflare para el sistema RAG (Retrieval-Augmented Generation) de NeuroFamilia.

## Arquitectura

- **Workers AI**: Genera embeddings y respuestas con LLM
- **Vectorize**: Almacena vectores de contenido para búsqueda semántica
- **Frontend**: Página `/chat` en el sitio Astro

## Setup

### 1. Instalar dependencias

```bash
cd worker
npm install
```

### 2. Crear Vectorize index

```bash
npx wrangler vectorize create neurofamilia-content --dimensions=768 --metric=cosine
```

### 3. Configurar cuenta de Cloudflare

Edita `wrangler.jsonc` con tu Account ID:

```jsonc
{
  // ... config existente
  "account_id": "TU_ACCOUNT_ID"
}
```

### 4. Desarrollo local

```bash
npm run dev
```

Esto inicia el worker en `http://localhost:8787`.

### 5. Ingerir contenido

```bash
npm run ingest
```

### 6. Deploy a producción

```bash
npm run deploy
```

## API Endpoints

### POST /api/chat

Endpoint principal para interactuar con el agente RAG.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "¿Cómo manejar berrinches?" }
  ],
  "stream": false
}
```

**Response:**
```json
{
  "response": "Los berrinches son...",
  "sources": [
    { "title": "Cómo manejar berrinches", "score": 0.89, "category": "conducta" }
  ]
}
```

### GET /api/health

Verifica que el worker esté funcionando.

## Variables de Entorno

| Binding | Tipo | Descripción |
|---------|------|-------------|
| `AI` | Ai | Workers AI binding |
| `VECTORIZE` | VectorizeIndex | Vectorize index binding |

## Contenido Indexado

El script de ingesta incluye contenido sobre:
- Regulación emocional
- Manejo de berrinches
- Comunicación con adolescentes
- Límites sin castigos
- Apego seguro

Para agregar más contenido, edita `src/ingest.ts` y agrega items al array `SAMPLE_CONTENT`.

## Producción

1. Actualiza la URL del API en `src/pages/chat.astro`:
   ```javascript
   const API_URL = 'https://neurofamilia-rag.TU_ACCOUNT_ID.workers.dev';
   ```

2. Despliega el worker:
   ```bash
   npm run deploy
   ```

3. Despliega el sitio Astro:
   ```bash
   cd ..
   npm run build
   # Push a GitHub para deploy via GitHub Pages
   ```
