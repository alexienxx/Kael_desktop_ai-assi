/**
 * GitHub Agentic Service
 *
 * Provides higher-level GitHub-specific operations for the Services hub.
 * Acts as a convenient wrapper around servicesApi for GitHub operations.
 */

import { servicesApi } from './servicesApi'
import type {
  Service,
  GitHubRepo,
  AgenticActionRequest,
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
    const service = await this.getGitHubService()
    return service?.connectionStatus === 'connected'
  }

  /**
   * Get available GitHub repositories
   */
  async getRepos(): Promise<GitHubRepo[]> {
    return servicesApi.getGitHubRepos()
  }

  /**
   * Get repository details
   */
  async getRepoDetail(owner: string, name: string): Promise<GitHubRepo | null> {
    return servicesApi.getGitHubRepoDetail(owner, name)
  }

  /**
   * Execute a GitHub agentic action
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
    const service = await this.getGitHubService()
    if (!service) {
      throw new Error('GitHub service not available')
    }

    const request: AgenticActionRequest = {
      serviceId: service.id,
      action: 'github_agentic_analysis',
      target,
      mode,
      correlateWithDiagnostics: options?.correlateWithDiagnostics,
      draftIssue: options?.draftIssue,
      metadata: options?.metadata,
    }

    const response = await servicesApi.executeAgenticAction(request)
    return {
      success: response.success,
      actionId: response.actionId,
      message: response.message,
    }
  }

  /**
   * Get mock GitHub repos for development/testing
   * This returns local mock data when backend is not available
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
   * Determine if a repository is a Kael self-repo based on naming patterns
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
