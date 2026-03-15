/**
 * Services API
 *
 * Provides backend integration for the Services hub.
 * Handles repo-awareness status and agentic action requests via the
 * backend's `/agentic/repo/*` endpoints.
 *
 * This layer delegates to the backend for all service-related operations
 * and does not implement any service logic locally.
 */

import { transportFetchJson } from './backendTransport'
import { ENDPOINTS } from './backendContract'
import type {
  Service,
  AgenticActionRequest,
  GitHubRepo,
  ServiceProvider
} from '@/lib/types'

// ── Request / Response types ──────────────────────────────────────────────────

export interface RepoStatusResponse {
  repos: GitHubRepo[]
  github_connected: boolean
  account_label?: string
}

export interface AgenticActionResponse {
  success: boolean
  actionId: string
  result?: Record<string, unknown>
  message?: string
}

// ── Helper functions ──────────────────────────────────────────────────────────

function asString(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.length > 0) return value
  if (typeof value === 'number') return String(value)
  return fallback
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  return fallback
}

// ── Services API class ────────────────────────────────────────────────────────

/**
 * Services API
 *
 * Handles all backend communication for the Services hub via the
 * `/agentic/repo/*` endpoints. Uses backendTransport for consistent
 * error handling and auth.
 */
export class ServicesApi {
  /**
   * Get repo-awareness status and available repositories
   * Maps to: GET /agentic/repo/status
   *
   * Returns GitHub connection status and available repos.
   * Degrades gracefully if endpoint is unavailable.
   */
  async getRepoStatus(): Promise<RepoStatusResponse> {
    try {
      const data = await transportFetchJson<Record<string, unknown>>(
        ENDPOINTS.AGENTIC_REPO_STATUS,
        { method: 'GET' }
      )

      const repos = Array.isArray(data.repos) ? data.repos : []

      return {
        github_connected: asBoolean(data.github_connected, false),
        account_label: typeof data.account_label === 'string' ? data.account_label : undefined,
        repos: repos.map((repo: any) => ({
          owner: asString(repo.owner, ''),
          name: asString(repo.name, ''),
          fullName: asString(repo.full_name ?? repo.fullName, ''),
          type: asString(repo.type, 'generic') as any,
          url: asString(repo.url, ''),
          description: typeof repo.description === 'string' ? repo.description : undefined,
          isPrivate: typeof repo.is_private === 'boolean'
            ? repo.is_private
            : typeof repo.isPrivate === 'boolean'
            ? repo.isPrivate
            : undefined,
          lastUpdated: typeof repo.last_updated === 'string'
            ? new Date(repo.last_updated)
            : typeof repo.lastUpdated === 'string'
            ? new Date(repo.lastUpdated)
            : undefined,
        })),
      }
    } catch (err) {
      console.warn('Failed to fetch repo status, returning empty state:', err)
      return {
        github_connected: false,
        repos: [],
      }
    }
  }

  /**
   * Execute a repo analyze action
   * Maps to: POST /agentic/repo/analyze
   *
   * Performs general repo analysis (repo_scan, pr_review, issue_review modes).
   * Degrades gracefully: if the endpoint is unavailable or the backend
   * returns an error, a failure response is returned rather than throwing.
   */
  async analyzeRepo(
    target: string,
    mode: 'repo_scan' | 'pr_review' | 'issue_review',
    metadata?: Record<string, unknown>
  ): Promise<AgenticActionResponse> {
    try {
      const data = await transportFetchJson<Record<string, unknown>>(
        ENDPOINTS.AGENTIC_REPO_ANALYZE,
        {
          method: 'POST',
          body: JSON.stringify({
            target,
            mode,
            metadata,
          }),
        }
      )

      return {
        success: asBoolean(data.success, false),
        actionId: asString(data.action_id ?? data.actionId, `action-${Date.now()}`),
        result: typeof data.result === 'object' ? data.result as Record<string, unknown> : undefined,
        message: typeof data.message === 'string' ? data.message : undefined,
      }
    } catch (err) {
      console.warn('Repo analyze endpoint unavailable:', err)
      return {
        success: false,
        actionId: '',
        message: err instanceof Error ? err.message : 'Repo analyze endpoint unavailable',
      }
    }
  }

  /**
   * Execute a self-repo audit action
   * Maps to: POST /agentic/repo/self_audit
   *
   * Performs self-repo audit (self_repo_scan, self_repo_diagnostics_correlation modes).
   * Degrades gracefully: if the endpoint is unavailable or the backend
   * returns an error, a failure response is returned rather than throwing.
   */
  async selfAuditRepo(
    target: string,
    mode: 'self_repo_scan' | 'self_repo_diagnostics_correlation',
    correlateWithDiagnostics?: boolean,
    metadata?: Record<string, unknown>
  ): Promise<AgenticActionResponse> {
    try {
      const data = await transportFetchJson<Record<string, unknown>>(
        ENDPOINTS.AGENTIC_REPO_SELF_AUDIT,
        {
          method: 'POST',
          body: JSON.stringify({
            target,
            mode,
            correlate_with_diagnostics: correlateWithDiagnostics,
            metadata,
          }),
        }
      )

      return {
        success: asBoolean(data.success, false),
        actionId: asString(data.action_id ?? data.actionId, `action-${Date.now()}`),
        result: typeof data.result === 'object' ? data.result as Record<string, unknown> : undefined,
        message: typeof data.message === 'string' ? data.message : undefined,
      }
    } catch (err) {
      console.warn('Self-audit endpoint unavailable:', err)
      return {
        success: false,
        actionId: '',
        message: err instanceof Error ? err.message : 'Self-audit endpoint unavailable',
      }
    }
  }

  /**
   * Draft an issue based on repo analysis
   * Maps to: POST /agentic/repo/draft_issue
   *
   * Creates an issue draft based on repo analysis results.
   * Degrades gracefully: if the endpoint is unavailable or the backend
   * returns an error, a failure response is returned rather than throwing.
   */
  async draftIssue(
    target: string,
    metadata?: Record<string, unknown>
  ): Promise<AgenticActionResponse> {
    try {
      const data = await transportFetchJson<Record<string, unknown>>(
        ENDPOINTS.AGENTIC_REPO_DRAFT_ISSUE,
        {
          method: 'POST',
          body: JSON.stringify({
            target,
            mode: 'issue_draft',
            metadata,
          }),
        }
      )

      return {
        success: asBoolean(data.success, false),
        actionId: asString(data.action_id ?? data.actionId, `action-${Date.now()}`),
        result: typeof data.result === 'object' ? data.result as Record<string, unknown> : undefined,
        message: typeof data.message === 'string' ? data.message : undefined,
      }
    } catch (err) {
      console.warn('Draft issue endpoint unavailable:', err)
      return {
        success: false,
        actionId: '',
        message: err instanceof Error ? err.message : 'Draft issue endpoint unavailable',
      }
    }
  }

  /**
   * Legacy method for backward compatibility with useServices hook.
   * Constructs a minimal Service[] array from repo status.
   *
   * @deprecated Use getRepoStatus() directly for new code.
   */
  async getServices(): Promise<Service[]> {
    const status = await this.getRepoStatus()

    if (!status.github_connected) {
      return []
    }

    return [
      {
        id: 'github-service',
        provider: 'github',
        displayName: 'GitHub',
        icon: 'github',
        connectionStatus: 'connected',
        accountLabel: status.account_label,
        capabilities: [
          { id: 'repo-audit', label: 'Repo audit', enabled: true },
          { id: 'pr-review', label: 'PR review', enabled: true },
          { id: 'issue-drafting', label: 'Issue drafting', enabled: true },
          { id: 'self-repo-aware', label: 'Self-repo aware', enabled: true },
        ],
        scopes: ['repo', 'read:user'],
      },
    ]
  }

  /**
   * Legacy method for backward compatibility with useGitHubService hook.
   *
   * @deprecated Use getRepoStatus() directly for new code.
   */
  async getGitHubRepos(): Promise<GitHubRepo[]> {
    const status = await this.getRepoStatus()
    return status.repos
  }
}

// ── Export singleton instance ─────────────────────────────────────────────────

export const servicesApi = new ServicesApi()
