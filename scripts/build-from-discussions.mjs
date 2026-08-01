import {
  buildExcerpt,
  cleanPostsDir,
  ghGraphql,
  parsePost,
  requireEnv,
  writePost,
} from "./lib/common.mjs";

const ORG_REPO = requireEnv("REPO");
const token = requireEnv("GITHUB_TOKEN");

const [owner, repo] = ORG_REPO.split("/");
if (!owner || !repo) throw new Error("Invalid REPO. Expected owner/name.");

const QUERY = `
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

function isPublished(discussion) {
  return (discussion.labels?.nodes ?? []).some((label) => label.name === "status:published");
}

async function fetchDiscussions() {
  const all = [];
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data = await ghGraphql(QUERY, { owner, repo, cursor }, token);
    const discussions = data.data.repository.discussions;
    if (!discussions) throw new Error("Discussions is not enabled on this repository.");
    all.push(...(discussions.nodes || []));
    hasNextPage = discussions.pageInfo.hasNextPage;
    cursor = discussions.pageInfo.endCursor;
  }

  return all;
}

async function main() {
  const all = await fetchDiscussions();
  const discussions = all.filter(isPublished);

  cleanPostsDir();

  for (const discussion of discussions) {
    const parsed = parsePost(discussion.body);
    const excerpt = buildExcerpt(parsed.excerpt, parsed.markdownContent);
    writePost({
      ...parsed,
      excerpt,
      discussionId: discussion.number,
    });
    console.log(`Generated: ${parsed.slug}`);
  }

  console.log(`Done. ${discussions.length} posts from Discussions.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
