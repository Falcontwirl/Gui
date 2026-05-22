/**
 * Parse various GitHub URL forms into { owner, repo, ref }.
 * Returns null for invalid input.
 *
 * Accepts:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   https://github.com/owner/repo/tree/main
 *   https://github.com/owner/repo/tree/feature/my-branch
 *   http://github.com/owner/repo
 *   git@github.com:owner/repo.git
 *   owner/repo
 */
export function parseGithubUrl(input) {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim().replace(/\.git$/, '').replace(/\/$/, '');
  if (!s) return null;

  // SSH form: git@github.com:owner/repo
  let m = s.match(/^git@github\.com:([^/\s]+)\/([^/\s]+)$/);
  if (m) return { owner: m[1], repo: m[2], ref: null };

  // HTTPS form: https://github.com/owner/repo[/tree/ref]
  m = s.match(/^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/\s]+)(?:\/tree\/(.+))?(?:\/.*)?$/);
  if (m) return { owner: m[1], repo: m[2], ref: m[3] || null };

  // Shorthand: owner/repo
  m = s.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (m) return { owner: m[1], repo: m[2], ref: null };

  return null;
}

/** Build the canonical "owner/repo" string for backend requests. */
export function toRepoFullName(parsed) {
  if (!parsed) return null;
  return `${parsed.owner}/${parsed.repo}`;
}
