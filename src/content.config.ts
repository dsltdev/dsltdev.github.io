import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const postCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/post' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.string(),
    author: z.string().default('David López'),
    tags: z.array(z.string()).default([]),
    category: z.string().default('Marketing'),
  }),
});

export const collections = {
  post: postCollection,
};
