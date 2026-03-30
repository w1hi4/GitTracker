export interface RepoStats {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  openIssues: number;
  createdAt: string;
  updatedAt: string;
  language: string | null;
  totalCommits: number;
  totalContributors: number;
}

export interface Contributor {
  id: string;
  login: string;
  avatarUrl: string;
  contributions: number;
  profileUrl: string;
}

export interface Branch {
  name: string;
  commitSha: string;
}

export interface Commit {
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authorAvatarUrl: string | null;
  date: string;
  url: string;
  parents: string[];
}

export interface RepoData {
  stats: RepoStats;
  contributors: Contributor[];
  recentCommits: Commit[];
  commitsOverTime: { date: string; count: number }[];
  branches: Branch[];
  firstCommit: Commit | null;
  lastCommit: Commit | null;
}

export interface ComparedFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
}

export interface ComparisonData {
  status: string;
  aheadBy: number;
  behindBy: number;
  commits: Commit[];
  files: ComparedFile[];
}

const getGitHubHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
  };
  const token = localStorage.getItem('github_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export async function fetchBranchComparison(repoUrl: string, base: string, head: string, signal?: AbortSignal): Promise<ComparisonData> {
  const urlObj = new URL(repoUrl);
  const pathParts = urlObj.pathname.split('/').filter(Boolean);
  const owner = pathParts[0];
  const repo = pathParts[1].replace(/\.git$/, '');

  if (urlObj.hostname.includes('github.com')) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/compare/${base}...${head}`, {
      headers: getGitHubHeaders(),
      signal
    });
    if (!res.ok) {
      if (res.status === 403) throw new Error("GitHub API rate limit exceeded. Please add a GitHub token in Settings to increase your limit.");
      throw new Error("Failed to fetch comparison from GitHub");
    }
    const data = await res.json();
    return {
      status: data.status,
      aheadBy: data.ahead_by,
      behindBy: data.behind_by,
      commits: data.commits.map((c: any) => ({
        sha: c.sha,
        message: c.commit.message,
        authorName: c.commit.author.name,
        authorEmail: c.commit.author.email,
        authorAvatarUrl: c.author?.avatar_url || null,
        date: c.commit.author.date,
        url: c.html_url,
        parents: c.parents ? c.parents.map((p: any) => p.sha) : []
      })),
      files: (data.files || []).map((f: any) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes
      }))
    };
  } else if (urlObj.hostname.includes('gitlab.com')) {
    const encodedPath = encodeURIComponent(`${owner}/${repo}`);
    const res = await fetch(`https://gitlab.com/api/v4/projects/${encodedPath}/repository/compare?from=${base}&to=${head}`, { signal });
    if (!res.ok) throw new Error("Failed to fetch comparison from GitLab");
    const data = await res.json();
    return {
      status: data.commits.length > 0 ? 'ahead' : 'identical',
      aheadBy: data.commits.length,
      behindBy: 0,
      commits: data.commits.map((c: any) => ({
        sha: c.id,
        message: c.title,
        authorName: c.author_name,
        authorEmail: c.author_email,
        authorAvatarUrl: null,
        date: c.created_at,
        url: `https://gitlab.com/${owner}/${repo}/-/commit/${c.id}`,
        parents: c.parent_ids || []
      })),
      files: (data.diffs || []).map((f: any) => ({
        filename: f.new_path,
        status: f.new_file ? 'added' : f.deleted_file ? 'removed' : f.renamed_file ? 'renamed' : 'modified',
        additions: 0,
        deletions: 0,
        changes: 0
      }))
    };
  }
  throw new Error("Unsupported platform");
}

export async function fetchCommitFiles(repoUrl: string, sha: string, signal?: AbortSignal): Promise<ComparedFile[]> {
  const urlObj = new URL(repoUrl);
  const pathParts = urlObj.pathname.split('/').filter(Boolean);
  const owner = pathParts[0];
  const repo = pathParts[1].replace(/\.git$/, '');

  if (urlObj.hostname.includes('github.com')) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}`, {
      headers: getGitHubHeaders(),
      signal
    });
    if (!res.ok) {
      if (res.status === 403) throw new Error("GitHub API rate limit exceeded. Please add a GitHub token in Settings to increase your limit.");
      throw new Error("Failed to fetch commit details");
    }
    const data = await res.json();
    return (data.files || []).map((f: any) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes
    }));
  } else if (urlObj.hostname.includes('gitlab.com')) {
    const encodedPath = encodeURIComponent(`${owner}/${repo}`);
    const res = await fetch(`https://gitlab.com/api/v4/projects/${encodedPath}/repository/commits/${sha}/diff`, { signal });
    if (!res.ok) throw new Error("Failed to fetch commit details");
    const data = await res.json();
    return data.map((f: any) => ({
      filename: f.new_path,
      status: f.new_file ? 'added' : f.deleted_file ? 'removed' : f.renamed_file ? 'renamed' : 'modified',
      additions: 0,
      deletions: 0,
      changes: 0
    }));
  }
  throw new Error("Unsupported platform");
}

const parseLinkHeader = (header: string | null): Record<string, string> => {
  if (!header) return {};
  const links: Record<string, string> = {};
  const parts = header.split(',');
  for (const part of parts) {
    const section = part.split(';');
    if (section.length !== 2) continue;
    const url = section[0].replace(/<(.*)>/, '$1').trim();
    const name = section[1].replace(/rel="(.*)"/, '$1').trim();
    links[name] = url;
  }
  return links;
};

export async function fetchRepoData(repoUrl: string, signal?: AbortSignal): Promise<RepoData> {
  try {
    const urlObj = new URL(repoUrl);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    if (pathParts.length < 2) {
      throw new Error("Invalid repository URL. Must include owner and repo name.");
    }

    const owner = pathParts[0];
    const repo = pathParts[1].replace(/\.git$/, '');

    if (urlObj.hostname.includes('github.com')) {
      return await fetchGitHubData(owner, repo, signal);
    } else if (urlObj.hostname.includes('gitlab.com')) {
      return await fetchGitLabData(owner, repo, signal);
    } else {
      throw new Error("Unsupported platform. Only GitHub and GitLab are supported.");
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to parse URL or fetch data.");
  }
}

async function fetchGitHubData(owner: string, repo: string, signal?: AbortSignal): Promise<RepoData> {
  const headers = getGitHubHeaders();

  // Fetch EVERYTHING in parallel immediately
  const [repoRes, commitsRes, commitsPage1Res, contribRes, contribPage1Res, branchesRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers, signal }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`, { headers, signal }).catch(() => null),
    fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`, { headers, signal }).catch(() => null),
    fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=100&anon=1`, { headers, signal }).catch(() => null),
    fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=1&anon=1`, { headers, signal }).catch(() => null),
    fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=30`, { headers, signal }).catch(() => null)
  ]);

  if (!repoRes.ok) {
    if (repoRes.status === 403) throw new Error("GitHub API rate limit exceeded. Please add a GitHub token in Settings (top right) to increase your limit (60 -> 5000 requests/hr).");
    if (repoRes.status === 404) throw new Error("Repository not found or is private.");
    throw new Error(`GitHub API Error: ${repoRes.statusText}`);
  }

  if (commitsRes?.status === 403 || contribRes?.status === 403 || branchesRes?.status === 403) {
    throw new Error("GitHub API rate limit exceeded. Please add a GitHub token in Settings (top right) to increase your limit (60 -> 5000 requests/hr).");
  }

  const repoData = await repoRes.json();
  const recentCommitsData = commitsRes?.ok ? await commitsRes.json() : [];
  const contribData = contribRes?.ok ? await contribRes.json() : [];
  const branchesData = branchesRes?.ok ? await branchesRes.json() : [];
  
  let totalCommits = Array.isArray(recentCommitsData) ? recentCommitsData.length : 0;
  let totalContributors = Array.isArray(contribData) ? contribData.length : 0;
  let firstCommit: Commit | null = null;

  // Try to get total commits from Link header
  const linkHeader = commitsPage1Res?.headers.get('Link');
  const links = parseLinkHeader(linkHeader);
  
  if (links.last) {
    const lastUrl = new URL(links.last);
    const lastPage = lastUrl.searchParams.get('page');
    if (lastPage) {
      totalCommits = parseInt(lastPage, 10);
      // Fetch the last page to get the first commit date, but don't wait more than 2 seconds
      const firstCommitRes = await Promise.race([
        fetch(links.last, { headers, signal }).catch(() => null),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 2000))
      ]);
      
      if (firstCommitRes?.ok) {
        const firstCommitData = await firstCommitRes.json();
        if (Array.isArray(firstCommitData) && firstCommitData.length > 0) {
          const c = firstCommitData[firstCommitData.length - 1];
          firstCommit = {
            sha: c.sha,
            message: c.commit.message,
            authorName: c.commit.author.name,
            authorEmail: c.commit.author.email,
            authorAvatarUrl: c.author?.avatar_url || null,
            date: c.commit.author.date,
            url: c.html_url,
            parents: c.parents ? c.parents.map((p: any) => p.sha) : []
          };
        }
      }
    }
  }

  // Try to get total contributors from Link header
  const contribLinkHeader = contribPage1Res?.headers.get('Link');
  const contribLinks = parseLinkHeader(contribLinkHeader);
  
  if (contribLinks.last) {
    const lastUrl = new URL(contribLinks.last);
    const lastPage = lastUrl.searchParams.get('page');
    if (lastPage) {
      totalContributors = Math.max(totalContributors, parseInt(lastPage, 10));
    }
  }

  const stats: RepoStats = {
    id: repoData.id.toString(),
    name: repoData.name,
    fullName: repoData.full_name,
    description: repoData.description,
    url: repoData.html_url,
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    openIssues: repoData.open_issues_count,
    createdAt: repoData.created_at,
    updatedAt: repoData.updated_at,
    language: repoData.language,
    totalCommits,
    totalContributors,
  };

  const contributors: Contributor[] = Array.isArray(contribData) ? contribData.map((c: any) => ({
    id: c.id ? c.id.toString() : (c.email || c.name || Math.random().toString()),
    login: c.login || c.name || 'Anonymous',
    avatarUrl: c.avatar_url || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y',
    contributions: c.contributions,
    profileUrl: c.html_url || '#',
  })) : [];

  const branches: Branch[] = Array.isArray(branchesData) ? branchesData.map((b: any) => ({
    name: b.name,
    commitSha: b.commit.sha
  })) : [];

  const recentCommits: Commit[] = Array.isArray(recentCommitsData) ? recentCommitsData.map((c: any) => ({
    sha: c.sha,
    message: c.commit.message,
    authorName: c.commit.author.name,
    authorEmail: c.commit.author.email,
    authorAvatarUrl: c.author?.avatar_url || null,
    date: c.commit.author.date,
    url: c.html_url,
    parents: c.parents ? c.parents.map((p: any) => p.sha) : []
  })) : [];

  if (!firstCommit && recentCommits.length > 0) {
    firstCommit = recentCommits[recentCommits.length - 1];
  }

  const lastCommit: Commit | null = recentCommits.length > 0 ? recentCommits[0] : null;

  // Group commits by date for the chart (using recent 100 commits)
  const commitsOverTimeMap: Record<string, number> = {};
  recentCommits.forEach(c => {
    const date = c.date.split('T')[0];
    commitsOverTimeMap[date] = (commitsOverTimeMap[date] || 0) + 1;
  });
  
  const commitsOverTime = Object.entries(commitsOverTimeMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return { stats, contributors, recentCommits, commitsOverTime, branches, firstCommit, lastCommit };
}

async function fetchGitLabData(owner: string, repo: string, signal?: AbortSignal): Promise<RepoData> {
  const encodedPath = encodeURIComponent(`${owner}/${repo}`);
  
  // Fetch EVERYTHING in parallel immediately using the encoded path
  const [repoRes, commitsRes, firstCommitRes, contribRes, branchesRes] = await Promise.all([
    fetch(`https://gitlab.com/api/v4/projects/${encodedPath}`, { signal }),
    fetch(`https://gitlab.com/api/v4/projects/${encodedPath}/repository/commits?per_page=100`, { signal }).catch(() => null),
    fetch(`https://gitlab.com/api/v4/projects/${encodedPath}/repository/commits?per_page=1&sort=asc`, { signal }).catch(() => null),
    fetch(`https://gitlab.com/api/v4/projects/${encodedPath}/repository/contributors?per_page=100`, { signal }).catch(() => null),
    fetch(`https://gitlab.com/api/v4/projects/${encodedPath}/repository/branches?per_page=30`, { signal }).catch(() => null)
  ]);

  if (!repoRes.ok) {
    if (repoRes.status === 404) throw new Error("Repository not found or is private.");
    throw new Error(`GitLab API Error: ${repoRes.statusText}`);
  }
  
  const repoData = await repoRes.json();
  const recentCommitsData = commitsRes?.ok ? await commitsRes.json() : [];
  const contribData = contribRes?.ok ? await contribRes.json() : [];
  const branchesData = branchesRes?.ok ? await branchesRes.json() : [];
  
  let totalCommits = Array.isArray(recentCommitsData) ? recentCommitsData.length : 0;
  const totalHeader = commitsRes?.headers.get('X-Total');
  if (totalHeader) {
    totalCommits = parseInt(totalHeader, 10);
  } else if (repoData.statistics && repoData.statistics.commit_count) {
    totalCommits = repoData.statistics.commit_count;
  }

  let totalContributors = Array.isArray(contribData) ? contribData.length : 0;
  const contribTotalHeader = contribRes?.headers.get('X-Total');
  if (contribTotalHeader) {
    totalContributors = Math.max(totalContributors, parseInt(contribTotalHeader, 10));
  }

  let firstCommit: Commit | null = null;

  // Try to get first commit
  if (firstCommitRes?.ok) {
    const firstCommitData = await firstCommitRes.json();
    if (Array.isArray(firstCommitData) && firstCommitData.length > 0) {
      const c = firstCommitData[0];
      firstCommit = {
        sha: c.id,
        message: c.title,
        authorName: c.author_name,
        authorEmail: c.author_email,
        authorAvatarUrl: null,
        date: c.created_at,
        url: `${repoData.web_url}/-/commit/${c.id}`,
        parents: c.parent_ids || []
      };
    }
  }

  const stats: RepoStats = {
    id: repoData.id.toString(),
    name: repoData.name,
    fullName: repoData.path_with_namespace,
    description: repoData.description,
    url: repoData.web_url,
    stars: repoData.star_count,
    forks: repoData.forks_count,
    openIssues: repoData.open_issues_count || 0,
    createdAt: repoData.created_at,
    updatedAt: repoData.last_activity_at,
    language: null,
    totalCommits,
    totalContributors,
  };

  const contributors: Contributor[] = Array.isArray(contribData) ? contribData.map((c: any) => ({
    id: c.email || c.name,
    login: c.name,
    avatarUrl: `https://www.gravatar.com/avatar/${c.email}?s=80&d=identicon`,
    contributions: c.commits,
    profileUrl: repoData.web_url,
  })).sort((a, b) => b.contributions - a.contributions) : [];

  const branches: Branch[] = Array.isArray(branchesData) ? branchesData.map((b: any) => ({
    name: b.name,
    commitSha: b.commit.id
  })) : [];

  const recentCommits: Commit[] = Array.isArray(recentCommitsData) ? recentCommitsData.map((c: any) => ({
    sha: c.id,
    message: c.title,
    authorName: c.author_name,
    authorEmail: c.author_email,
    authorAvatarUrl: null,
    date: c.created_at,
    url: `${repoData.web_url}/-/commit/${c.id}`,
    parents: c.parent_ids || []
  })) : [];

  if (!firstCommit && recentCommits.length > 0) {
    firstCommit = recentCommits[recentCommits.length - 1];
  }
  const lastCommit: Commit | null = recentCommits.length > 0 ? recentCommits[0] : null;

  const commitsOverTimeMap: Record<string, number> = {};
  recentCommits.forEach(c => {
    const date = c.date.split('T')[0];
    commitsOverTimeMap[date] = (commitsOverTimeMap[date] || 0) + 1;
  });
  
  const commitsOverTime = Object.entries(commitsOverTimeMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return { stats, contributors, recentCommits, commitsOverTime, branches, firstCommit, lastCommit };
}

