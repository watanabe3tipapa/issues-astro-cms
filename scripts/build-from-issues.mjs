import {
  CMS_LABEL,
  buildExcerpt,
  cleanPostsDir,
  ghFetch,
  parsePost,
  requireEnv,
  writePost,
} from "./lib/common.mjs";

const ORG_REPO = requireEnv("REPO");
const token = requireEnv("GITHUB_TOKEN");

const q = `repo:${ORG_REPO} label:"${CMS_LABEL}" is:issue`;
const url = `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&per_page=100`;

async function main() {
  const data = await ghFetch(url, token);
  const issues = (data.items || []).filter((issue) => !issue.pull_request);

  cleanPostsDir();

  for (const issue of issues) {
    const parsed = parsePost(issue.body);
    const excerpt = buildExcerpt(parsed.excerpt, parsed.markdownContent);
    writePost({ ...parsed, excerpt });
    console.log(`Generated: ${parsed.slug}`);
  }

  console.log(`Done. ${issues.length} posts from Issues.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
