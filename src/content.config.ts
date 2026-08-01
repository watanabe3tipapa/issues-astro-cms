import { defineCollection, z } from "astro:content";

const dateString = z
  .union([z.string(), z.date()])
  .transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v));

const posts = defineCollection({
  schema: z.object({
    title: z.string(),
    publishedAt: dateString,
    tags: z.array(z.string()).default([]),
    excerpt: z.string().optional(),
    category: z.string().optional(),
    discussionId: z.number().optional(),
  }),
});

export const collections = {
  posts,
};
