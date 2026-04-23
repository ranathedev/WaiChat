/**
 * GitHub API integration for the auto-update system.
 *
 * Uses the Compare API to discover exactly which files changed between the
 * user's current version tag and the latest release. This eliminates the need
 * for a manually maintained file manifest - git history IS the manifest.
 *
 * Exclusion list: a small, stable set of paths that should never be overwritten
 * (user configs, migrations, env files).
 */

import type { Env } from "./types";

/** Paths that should NEVER be auto-updated (user-specific configs). */
const EXCLUDED_PATHS = [
  "wrangler.toml",
  "wrangler.local.toml",
  "wrangler.local.toml.example",
  ".env",
  ".env.local",
  ".env.example",
  ".dev.vars",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "vite.config.ts",
  ".prettierrc",
  ".gitignore",
  "LICENSE",
  "UPDATE_MANIFEST.json",
];

/** Path prefixes that should never be auto-updated. */
const EXCLUDED_PREFIXES = [
  "migrations/", // User's DB state - never overwrite applied migrations
  ".git/",
  "node_modules/",
  "dist/",
  ".wrangler/",
  "docs/",
  "scripts/", // Release tooling - not needed in user repos
];

const UPSTREAM_OWNER = "ranajahanzaib";
const UPSTREAM_REPO = "waichat";

export interface FileChange {
  path: string;
  status: "added" | "modified" | "removed" | "renamed";
  downloadUrl: string;
}

export interface CommitFile {
  path: string;
  content: string;
}

function isExcluded(path: string): boolean {
  if (EXCLUDED_PATHS.includes(path)) return true;
  return EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * Use the GitHub Compare API to get the exact list of files that changed
 * between two version tags. Returns only files that aren't excluded.
 *
 * Compare API: GET /repos/{owner}/{repo}/compare/{base}...{head}
 */
export async function getChangedFiles(
  env: Env,
  fromTag: string,
  toTag: string,
): Promise<FileChange[]> {
  const response = await fetch(
    `https://api.github.com/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/compare/${fromTag}...${toTag}`,
    {
      headers: {
        "User-Agent": "waichat-updater/1.0",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Compare API failed (${fromTag}...${toTag}): HTTP ${response.status} - ${body.substring(0, 200)}`,
    );
  }

  const data = (await response.json()) as {
    files: {
      filename: string;
      status: "added" | "modified" | "removed" | "renamed";
      raw_url: string;
    }[];
  };

  if (!Array.isArray(data.files)) {
    throw new Error("Compare API returned unexpected format: missing files array");
  }

  return data.files
    .filter((f) => !isExcluded(f.filename))
    .map((f) => ({
      path: f.filename,
      status: f.status,
      downloadUrl: f.raw_url,
    }));
}

/**
 * Fetch file contents for all changed files (additions + modifications).
 * Skips removed files - those are handled separately during commit.
 */
export async function fetchChangedFiles(env: Env, changes: FileChange[]): Promise<CommitFile[]> {
  const filesToCommit: CommitFile[] = [];

  for (const change of changes) {
    if (change.status === "removed") continue; // Handled separately

    const response = await fetch(change.downloadUrl, {
      headers: { "User-Agent": "waichat-updater/1.0" },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${change.path}: HTTP ${response.status}`);
    }

    const content = await response.text();
    filesToCommit.push({ path: change.path, content });
  }

  return filesToCommit;
}

/**
 * Commit updated/added files and delete removed files in the user's GitHub repo.
 * Uses the GitHub Contents API (one commit per file).
 *
 * Requires GITHUB_TOKEN with Contents read+write permission on the target repo.
 */
export async function commitChangesToGitHub(
  env: Env,
  filesToUpdate: CommitFile[],
  filesToDelete: string[],
  version: string,
): Promise<number> {
  const token = env.GITHUB_TOKEN;
  const repo = env.GITHUB_REPO;

  if (!token) {
    throw new Error(
      "GITHUB_TOKEN not configured. See WaiChat setup guide for auto-update token provisioning.",
    );
  }

  if (!repo || !repo.includes("/")) {
    throw new Error(`Invalid GITHUB_REPO format: "${repo}" (expected: owner/repo)`);
  }

  let totalCommitted = 0;

  // 1. Update/create files
  for (const file of filesToUpdate) {
    const existingSha = await getFileSha(token, repo, file.path);

    const body: Record<string, unknown> = {
      message: `chore(auto-update): ${version} - update ${file.path}`,
      content: btoa(file.content),
      branch: "main",
    };

    if (existingSha) {
      body.sha = existingSha;
    }

    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${file.path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "waichat-updater/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      throw new Error(
        `GitHub API error for ${file.path}: ${error.message || response.statusText} (HTTP ${response.status})`,
      );
    }

    totalCommitted++;
  }

  // 2. Delete removed files
  for (const path of filesToDelete) {
    const existingSha = await getFileSha(token, repo, path);
    if (!existingSha) continue; // File doesn't exist in user's repo - skip

    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "waichat-updater/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({
        message: `chore(auto-update): ${version} - remove ${path}`,
        sha: existingSha,
        branch: "main",
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      // Don't fail the whole update for a delete - log and continue
      console.error(`[GitHub] Failed to delete ${path}: ${error.message || response.statusText}`);
    } else {
      totalCommitted++;
    }
  }

  return totalCommitted;
}

/** Get a file's SHA from the user's repo (needed for updates and deletes). */
async function getFileSha(token: string, repo: string, path: string): Promise<string | undefined> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "waichat-updater/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
        Accept: "application/vnd.github+json",
      },
    });

    if (response.ok) {
      const data = (await response.json()) as { sha: string };
      return data.sha;
    }
    return undefined; // 404 = new file
  } catch {
    return undefined;
  }
}
