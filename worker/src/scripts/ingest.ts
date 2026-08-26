import { Env, SAMPLE_CONTENT, chunkContent, embedText } from '../ingest';

async function ingest() {
  console.log('Starting content ingestion...');

  const env = {
    AI: {} as any,
    VECTORIZE: {} as any
  };

  const BATCH_SIZE = 10;
  let totalIngested = 0;

  for (let i = 0; i < SAMPLE_CONTENT.length; i += BATCH_SIZE) {
    const batch = SAMPLE_CONTENT.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(SAMPLE_CONTENT.length / BATCH_SIZE)}...`);

    const allChunks = batch.flatMap(item => {
      const chunks = chunkContent(item.content);
      return chunks.map((chunk, j) => ({
        id: `${item.id}-chunk-${j}`,
        title: item.title,
        content: chunk,
        category: item.category,
        ageGroup: item.ageGroup,
        source: item.source
      }));
    });

    console.log(`  Generated ${allChunks.length} chunks from ${batch.length} items`);
  }

  console.log(`\nIngestion complete. Total items: ${SAMPLE_CONTENT.length}`);
  console.log('\nTo run the actual ingestion, use: npm run ingest');
}

ingest().catch(console.error);
