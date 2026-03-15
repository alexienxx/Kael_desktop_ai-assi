/**
 * GitHub Agentic Service
 *
 * Provides higher-level GitHub-specific operations for the Services hub.
 * Acts as a convenient wrapper around servicesApi for GitHub operations,
 * routing to the appropriate `/agentic/repo/*` endpoints based on action mode.
 */

import { servicesApi } from './servicesApi'
import type {
  Service,
  GitHubRepo,
  GitHubActionMode,
  RepoType
} from '@/lib/types'

/**
 * GitHub Agentic Service
 *
 * Provides GitHub-specific convenience methods for the Services hub.
 * All operations delegate to the backend via servicesApi.
 */
export class GitHubAgenticService {
  /**
   * Get GitHub service configuration if connected
   */
  async getGitHubService(): Promise<Service | null> {
    const services = await servicesApi.getServices()
    return services.find(s => s.provider === 'github') || null
  }

  /**
   * Check if GitHub service is connected
   */
  async isGitHubConnected(): Promise<boolean> {
    const status = await servicesApi.getRepoStatus()
    return status.github_connected
  }

  /**
   * Get available GitHub repositories
   */
  async getRepos(): Promise<GitHubRepo[]> {
    return servicesApi.getGitHubRepos()
  }

  /**
   * Execute a GitHub agentic action
   *
   * Routes to the appropriate `/agentic/repo/*` endpoint based on mode:
   * - repo_scan, pr_review, issue_review → /agentic/repo/analyze
   * - self_repo_scan, self_repo_diagnostics_correlation → /agentic/repo/self_audit
   * - issue_draft → /agentic/repo/draft_issue
   */
  async executeAction(
    target: string,
    mode: GitHubActionMode,
    options?: {
      correlateWithDiagnostics?: boolean
      draftIssue?: boolean
      metadata?: Record<string, unknown>
    }
  ): Promise<{ success: boolean; actionId: string; message?: string }> {
    // Route to appropriate endpoint based on mode
    if (mode === 'issue_draft') {
      const response = await servicesApi.draftIssue(target, options?.metadata)
      return {
        success: response.success,
        actionId: response.actionId,
        message: response.message,
      }
    }

    if (mode === 'self_repo_scan' || mode === 'self_repo_diagnostics_correlation') {
      const response = await servicesApi.selfAuditRepo(
        target,
        mode,
        options?.correlateWithDiagnostics,
        options?.metadata
      )
      return {
        success: response.success,
        actionId: response.actionId,
        message: response.message,
      }
    }

    // Default to analyzeRepo for generic modes
    const response = await servicesApi.analyzeRepo(target, mode, options?.metadata)
    return {
      success: response.success,
      actionId: response.actionId,
      message: response.message,
    }
  }

  /**
   * Get mock GitHub repos for development/testing
   *
   * ⚠️  FOR TESTS AND STORYBOOK ONLY – must NOT be used as a production
   * fallback.  The backend is the sole authority for repo identity and
   * `RepoType`; injecting these values client-side would fake a ready state
   * that may not exist on the backend.
   */
  getMockRepos(): GitHubRepo[] {
    return [
      {
        owner: 'xxalexienxx',
        name: 'kael-desktop-ai-assi',
        fullName: 'xxalexienxx/kael-desktop-ai-assi',
        type: 'self-repo',
        url: 'https://github.com/xxalexienxx/kael-desktop-ai-assi',
        description: 'Kael Desktop AI Assistant',
        isPrivate: false,
        lastUpdated: new Date(),
      },
      {
        owner: 'xxalexienxx',
        name: 'kael-nexus-hub',
        fullName: 'xxalexienxx/kael-nexus-hub',
        type: 'self-repo',
        url: 'https://github.com/xxalexienxx/kael-nexus-hub',
        description: 'Kael Nexus Hub',
        isPrivate: false,
        lastUpdated: new Date(),
      },
      {
        owner: 'example',
        name: 'generic-repo',
        fullName: 'example/generic-repo',
        type: 'generic',
        url: 'https://github.com/example/generic-repo',
        description: 'A generic repository',
        isPrivate: false,
        lastUpdated: new Date(),
      },
    ]
  }

  /**
   * Get mock GitHub service for development/testing
   *
   * ⚠️  FOR TESTS AND STORYBOOK ONLY – must NOT be used as a production
   * fallback.  In particular, the `connectionStatus: 'connected'` value here
   * is a stub; returning it when the backend is unavailable would fake a
   * ready state and surface action buttons that cannot actually work.
   */
  getMockGitHubService(): Service {
    return {
      id: 'github-service-1',
      provider: 'github',
      displayName: 'GitHub',
      icon: 'github',
      connectionStatus: 'connected',
      accountLabel: 'xxalexienxx',
      capabilities: [
        { id: 'repo-audit', label: 'Repo audit', enabled: true },
        { id: 'pr-review', label: 'PR review', enabled: true },
        { id: 'issue-drafting', label: 'Issue drafting', enabled: true },
        { id: 'self-repo-aware', label: 'Self-repo aware', enabled: true },
      ],
      scopes: ['repo', 'read:user'],
    }
  }

  /**
   * UI display helper – does NOT determine repo type.
   *
   * ⚠️  The `type` field on a `GitHubRepo` object is authoritative and must
   * come exclusively from the backend response.  This method is a client-side
   * string-matching heuristic and must not be used to set or override the
   * `type` property returned by the backend.
   */
  isSelfRepo(repoFullName: string): boolean {
    const lowerName = repoFullName.toLowerCase()
    return (
      lowerName.includes('kael') ||
      lowerName.includes('xxalexienxx')
    )
  }

  /**
   * Get action mode label for display
   */
  getActionModeLabel(mode: GitHubActionMode): string {
    const labels: Record<GitHubActionMode, string> = {
      repo_scan: 'Repo scan',
      pr_review: 'PR review',
      issue_review: 'Issue review',
      self_repo_scan: 'Self-repo scan',
      self_repo_diagnostics_correlation: 'Self-repo diagnostics',
      issue_draft: 'Issue draft',
    }
    return labels[mode] || mode
  }

  /**
   * Get repo type badge label
   */
  getRepoTypeBadge(type: RepoType): string {
    return type === 'self-repo' ? 'Kael self-repo' : 'Generic repo'
  }
}

// ── Export singleton instance ─────────────────────────────────────────────────

export const githubAgenticService = new GitHubAgenticService()
