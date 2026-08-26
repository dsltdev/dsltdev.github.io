import { Ai } from '@cloudflare/workers-types';

interface ContentItem {
  id: string;
  title: string;
  content: string;
  category: string;
  ageGroup: string;
  source: string;
}

interface VectorItem {
  id: string;
  values: number[];
  metadata: {
    title: string;
    content: string;
    category: string;
    ageGroup: string;
    source: string;
  };
}

const SAMPLE_CONTENT: ContentItem[] = [
  {
    id: 'regulacion-emocional-1',
    title: '¿Qué es la regulación emocional?',
    content: `La regulación emocional es la capacidad de identificar,理解 y gestionar nuestras emociones de manera saludable. En niños, esta habilidad se desarrolla progresivamente y es fundamental para su bienestar mental y social.

Los niños aprenden a regular sus emociones a través de:
1. Modelado: Observando cómo los adultos manejan sus emociones
2. Co-regulación: Recibiendo apoyo de figuras de apego durante momentos de intensidad emocional
3. Práctica: Experimentando situaciones diversas y aprendiendo a responder

Es importante recordar que los berrinches son una parte normal del desarrollo, especialmente entre los 2 y 4 años, cuando el lenguaje aún no está completamente desarrollado.

Estrategias efectivas:
- Mantener la calma (co-regulación)
- Validar la emoción del niño
- Ofrecer opciones simples
- Establecer límites con empatía`,
    category: 'desarrollo',
    ageGroup: '2-6 años',
    source: 'NeuroFamilia'
  },
  {
    id: 'berrinches-1',
    title: 'Cómo manejar berrinches en niños pequeños',
    content: `Los berrinches o pataletas son episodios de llanto intenso, gritos o pataleos que ocurren cuando un niño se siente abrumado emocionalmente. Son más comunes entre los 1 y 4 años.

¿Por qué ocurren?
- El cerebro prefrontal (responsable del autocontrol) aún está en desarrollo
- Los niños tienen un vocabulario limitado para expresar sus emociones
- Pueden sentir frustración, cansancio, hambre o sobreestimulación

Estrategias para manejar berrinches:
1. Permanecer calmado: Tu calma ayuda a regular al niño
2. Seguridad física: Asegurate de que el niño esté a salvo
3. Validar emociones: "Veo que estás muy enojado"
4. Ofrecer contención: "Estoy aquí cuando necesites un abrazo"
5. Esperar: No intentes razonar durante el berrinche
6. Después del berrinche: Hablar sobre lo sucedido

¿Qué evitar?
- Castigos物理 oVerbales
- Minimizar sus emociones ("no es para tanto")
- Ceder para detener el berrinche (refuerza el comportamiento)`,
    category: 'conducta',
    ageGroup: '1-4 años',
    source: 'NeuroFamilia'
  },
  {
    id: 'adolescentes-comunicacion-1',
    title: 'Comunicación efectiva con adolescentes',
    content: `La adolescencia es un período de grandes cambios neurológicos y emocionales. El cerebro adolescente está en plena remodelación, especialmente las áreas responsables de la toma de decisiones y el control de impulsos.

Características del cerebro adolescente:
- Mayor sensibilidad al reward (recompensa)
- Desarrollo del córtex prefrontal (hasta los 25 años)
- Influencia significativa del sistema límbico (emociones)

Estrategias de comunicación:
1. Escucha activa: Presta atención sin interrumpir
2. Preguntas abiertas: "¿Cómo te sentiste cuando...?"
3. Valida sus emociones: "Entiendo que eso sea frustrante"
4. Espacio sin juzgar: Crea un ambiente seguro para对话
5. Momentos informales: Conversaciones durante actividades
6. Respeto por su privacidad: Equilibrio entre cercanía y respeto

Señales de alerta (buscar ayuda profesional):
- Cambios drásticos en el sueño o apetito
- Aislamiento social prolongado
- Cambios de humor extremos
- Pérdida de interés en actividades que disfrutaba`,
    category: 'adolescentes',
    ageGroup: '12-18 años',
    source: 'NeuroFamilia'
  },
  {
    id: 'limites-sin-castigos-1',
    title: 'Establecer límites efectivos sin castigos',
    content: `Los límites son esenciales para el desarrollo saludable de los niños. Proporcionan seguridad, enseñan autorregulación y ayudan a entender las normas sociales.

Principios para establecer límites efectivos:
1. Claridad: Ser específico sobre qué conducta se espera
2. Consistencia: Mantener los límites en diferentes contextos
3. Conexión: Primero la conexión, luego la corrección
4. Comprensión: Explicar el "por qué" detrás del límite

Enfoques alternativos al castigo:
- Tiempo de desconexión (no time-out punitivo): "Vamos a calmarnos juntos"
- Consecuencias naturales: "Si no comes, tendrás hambre después"
- Soluciones de reparación: "¿Cómo podemos arreglar esto juntos?"
- Refuerzo positivo: Reconocer las conductas deseadas

Edades y límites:
- 1-3 años: Límites simples, redirection
- 3-6 años: Reglas claras, consecuencias lógicas
- 6-12 años: Negociación apropiada, responsabilidades
- 12-18 años: Colaboración, respeto mutuo`,
    category: 'disciplina',
    ageGroup: 'Todas las edades',
    source: 'NeuroFamilia'
  },
  {
    id: 'apego-seguro-1',
    title: 'La importancia del apego seguro',
    content: `El apego seguro es el vínculo emocional que se forma entre un niño y sus cuidadores principales durante los primeros años de vida. Es la base para el desarrollo socioemocional saludable.

Tipos de apego:
1. Seguro: El niño confía en que el cuidador estará disponible
2. Ansioso-ambivalente: El niño muestra ansiedad ante la separación
3. Evitativo: El niño parece indiferente a la presencia del cuidador
4. Desorganizado: Conductas inconsistentes y contradictorias

Cómo fomentar el apego seguro:
- Disponibilidad emocional: Estar presente física y emocionalmente
- Respuesta sensible: Atender las necesidades del niño de manera consistente
- Validación emocional: Reconocer y aceptar todas las emociones
- Juego interactivo: Tiempo de calidad de juego libre
- Rutinas predecibles: Crear estructura y seguridad

Beneficios del apego seguro:
- Mayor resiliencia emocional
- Mejores habilidades sociales
- Mayor autoestima
- Mejor regulación emocional`,
    category: 'desarrollo',
    ageGroup: '0-5 años',
    source: 'NeuroFamilia'
  }
];

function chunkContent(content: string, maxChunkSize: number = 500): string[] {
  const paragraphs = content.split('\n\n').filter(p => p.trim());
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [content.substring(0, maxChunkSize)];
}

async function embedText(
  ai: Ai,
  texts: string[]
): Promise<number[][]> {
  const result = await ai.run('@cf/baai/bge-base-en-v1.5', {
    text: texts
  });
  return result.data;
}

export async function ingestContent(
  ai: Ai,
  vectorize: VectorizeIndex
): Promise<{ ingested: number; errors: string[] }> {
  const errors: string[] = [];
  let ingested = 0;

  const BATCH_SIZE = 10;

  for (let i = 0; i < SAMPLE_CONTENT.length; i += BATCH_SIZE) {
    const batch = SAMPLE_CONTENT.slice(i, i + BATCH_SIZE);
    const allChunks: ContentItem[] = [];

    for (const item of batch) {
      const chunks = chunkContent(item.content);
      for (let j = 0; j < chunks.length; j++) {
        allChunks.push({
          ...item,
          id: `${item.id}-chunk-${j}`,
          content: chunks[j]
        });
      }
    }

    try {
      const textsToEmbed = allChunks.map(c => `${c.title} ${c.content}`);
      const embeddings = await embedText(ai, textsToEmbed);

      const vectors: VectorItem[] = allChunks.map((item, idx) => ({
        id: item.id,
        values: embeddings[idx],
        metadata: {
          title: item.title,
          content: item.content.substring(0, 1000),
          category: item.category,
          ageGroup: item.ageGroup,
          source: item.source
        }
      }));

      await vectorize.upsert(vectors);
      ingested += vectors.length;

    } catch (error) {
      errors.push(`Error processing batch starting at ${i}: ${error}`);
    }
  }

  return { ingested, errors };
}

export { SAMPLE_CONTENT, ContentItem, VectorItem };
