import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export const POSTS_OUT_DIR = path.join("src", "content", "posts");
export const CMS_LABEL = "status:published";

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} env var.`);
  return value;
}

export async function ghFetch(url, token) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function ghGraphql(query, variables, token) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (!res.ok || data.errors) {
    throw new Error(`GitHub GraphQL error: ${JSON.stringify(data)}`);
  }
  return data;
}

export function cleanPostsDir() {
  if (fs.existsSync(POSTS_OUT_DIR)) {
    fs.rmSync(POSTS_OUT_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(POSTS_OUT_DIR, { recursive: true });
}

function toDateString(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

export function parsePost(body) {
  const parsed = matter(body ?? "");
  const data = parsed.data ?? {};
  const markdownContent = parsed.content ?? "";

  const slug = data.slug;
  const title = data.title;
  const publishedAt = toDateString(data.publishedAt);
  if (!slug) throw new Error("Post missing frontmatter field: slug");
  if (!title) throw new Error("Post missing frontmatter field: title");
  if (!publishedAt) throw new Error("Post missing frontmatter field: publishedAt");

  const tags = Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [];
  const excerpt = data.excerpt;
  const category = data.category;
  const discussionId = data.discussionId;

  return {
    slug,
    title,
    publishedAt,
    tags,
    excerpt,
    category,
    discussionId,
    markdownContent,
  };
}

function firstParagraph(text) {
  const cleaned = (text || "").replace(/\r/g, "");
  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return "";
  return lines.slice(0, 3).join(" ").slice(0, 160);
}

export function buildExcerpt(excerpt, markdownContent) {
  if (excerpt) return excerpt;
  return firstParagraph(markdownContent)
    .replace(/[#>*_`~\[\]\(\)-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

export function writePost(post) {
  const frontmatter = {
    title: post.title,
    publishedAt: post.publishedAt,
    tags: post.tags,
  };
  if (post.excerpt) frontmatter.excerpt = post.excerpt;
  if (post.category) frontmatter.category = post.category;
  if (post.discussionId !== undefined) frontmatter.discussionId = post.discussionId;

  const doc = matter.stringify(post.markdownContent, frontmatter);
  const outPath = path.join(POSTS_OUT_DIR, `${post.slug}.md`);
  fs.writeFileSync(outPath, doc, "utf8");
}
