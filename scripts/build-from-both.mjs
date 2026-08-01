import {
  CMS_LABEL,
  buildExcerpt,
  cleanPostsDir,
  ghFetch,
  ghGraphql,
  parsePost,
  requireEnv,
  writePost,
} from "./lib/common.mjs";

const ORG_REPO = requireEnv("REPO");
const token = requireEnv("GITHUB_TOKEN");

const [owner, repo] = ORG_REPO.split("/");
if (!owner || !repo) throw new Error("Invalid REPO. Expected owner/name.");

const DISCUSSIONS_QUERY = `
  query($owner: String!, $repo: String!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      discussions(first: 100, after: $cursor) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          number
          body
          labels(first: 20) {
            nodes {
              name
            }
          }
        }
      }
    }
  }
`;

function isPublished(labels) {
  return (labels ?? []).some((label) => label.name === CMS_LABEL);
}

async function fetchIssues() {
  const q = `repo:${ORG_REPO} label:"${CMS_LABEL}" is:issue`;
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&per_page=100`;
  const data = await ghFetch(url, token);
  return (data.items || []).filter((issue) => !issue.pull_request);
}

async function fetchDiscussions() {
  const all = [];
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data = await ghGraphql(DISCUSSIONS_QUERY, { owner, repo, cursor }, token);
    const discussions = data.data.repository.discussions;
    if (!discussions) throw new Error("Discussions is not enabled on this repository.");
    all.push(...(discussions.nodes || []));
    hasNextPage = discussions.pageInfo.hasNextPage;
    cursor = discussions.pageInfo.endCursor;
  }

  return all.filter((discussion) => isPublished(discussion.labels?.nodes));
}

async function main() {
  const issues = await fetchIssues();
  const discussions = await fetchDiscussions();

  cleanPostsDir();

  const written = new Set();
  let issuesCount = 0;
  let discussionsCount = 0;
  let skipped = 0;

  for (const issue of issues) {
    const parsed = parsePost(issue.body);
    if (written.has(parsed.slug)) {
      skipped++;
      continue;
    }
    const excerpt = buildExcerpt(parsed.excerpt, parsed.markdownContent);
    writePost({ ...parsed, excerpt });
    written.add(parsed.slug);
    issuesCount++;
    console.log(`Generated (Issues): ${parsed.slug}`);
  }

  for (const discussion of discussions) {
    const parsed = parsePost(discussion.body);
    if (written.has(parsed.slug)) {
      skipped++;
      continue;
    }
    const excerpt = buildExcerpt(parsed.excerpt, parsed.markdownContent);
    writePost({ ...parsed, excerpt, discussionId: discussion.number });
    written.add(parsed.slug);
    discussionsCount++;
    console.log(`Generated (Discussions): ${parsed.slug}`);
  }

  console.log(
    `Done. Issues: ${issuesCount}, Discussions: ${discussionsCount}, skipped (duplicate slug): ${skipped}.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
