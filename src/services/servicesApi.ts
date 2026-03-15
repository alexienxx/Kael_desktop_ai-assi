/**
 * Services API
 *
 * Provides backend integration for the Services hub.
 * Handles service discovery, connection status, and agentic action requests.
 *
 * This layer delegates to the backend for all service-related operations
 * and does not implement any service logic locally.
 */

import { transportFetchJson } from './backendTransport'
import type {
  Service,
  AgenticActionRequest,
  GitHubRepo,
  ServiceProvider
} from '@/lib/types'

// ── Service API endpoints ─────────────────────────────────────────────────────

const SERVICES_ENDPOINTS = {
  /** Get list of available services and their connection status */
  SERVICES_LIST: '/services',
  /** Get service details by ID */
  SERVICE_DETAIL: (serviceId: string) => `/services/${serviceId}`,
  /** Execute an agentic action */
  AGENTIC_ACTION: '/services/agentic-action',
  /** GitHub-specific endpoints */
  GITHUB_REPOS: '/services/github/repos',
  GITHUB_REPO_DETAIL: (owner: string, repo: string) => `/services/github/repos/${owner}/${repo}`,
} as const

// ── Request / Response types ──────────────────────────────────────────────────

export interface GetServicesResponse {
  services: Service[]
}

export interface GetServiceDetailResponse {
  service: Service
}

export interface AgenticActionResponse {
  success: boolean
  actionId: string
  result?: Record<string, unknown>
  message?: string
}

export interface GetGitHubReposResponse {
  repos: GitHubRepo[]
}

export interface GetGitHubRepoDetailResponse {
  repo: GitHubRepo
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
 * Handles all backend communication for the Services hub.
 * Uses backendTransport for consistent error handling and auth.
 */
export class ServicesApi {
  /**
   * Get list of available services
   * Maps to: GET /services
   */
  async getServices(): Promise<Service[]> {
    try {
      const data = await transportFetchJson<Record<string, unknown>>(
        SERVICES_ENDPOINTS.SERVICES_LIST,
        { method: 'GET' }
      )

      const services = Array.isArray(data.services) ? data.services : []

      return services.map((svc: any) => ({
        id: asString(svc.id, `service-${Date.now()}`),
        provider: asString(svc.provider, 'github') as ServiceProvider,
        displayName: asString(svc.display_name ?? svc.displayName, 'Unknown Service'),
        icon: asString(svc.icon, ''),
        connectionStatus: asString(
          svc.connection_status ?? svc.connectionStatus,
          'not_connected'
        ) as any,
        accountLabel: typeof svc.account_label === 'string'
          ? svc.account_label
          : typeof svc.accountLabel === 'string'
          ? svc.accountLabel
          : undefined,
        capabilities: Array.isArray(svc.capabilities)
          ? svc.capabilities.map((cap: any) => ({
              id: asString(cap.id, ''),
              label: asString(cap.label, ''),
              enabled: asBoolean(cap.enabled, false),
            }))
          : [],
        scopes: Array.isArray(svc.scopes) ? svc.scopes : undefined,
      }))
    } catch (err) {
      console.warn('Failed to fetch services, returning empty list:', err)
      return []
    }
  }

  /**
   * Get service details by ID
   * Maps to: GET /services/:id
   */
  async getServiceDetail(serviceId: string): Promise<Service | null> {
    try {
      const data = await transportFetchJson<Record<string, unknown>>(
        SERVICES_ENDPOINTS.SERVICE_DETAIL(serviceId),
        { method: 'GET' }
      )

      const svc = data.service as any
      if (!svc) return null

      return {
        id: asString(svc.id, serviceId),
        provider: asString(svc.provider, 'github') as ServiceProvider,
        displayName: asString(svc.display_name ?? svc.displayName, 'Unknown Service'),
        icon: asString(svc.icon, ''),
        connectionStatus: asString(
          svc.connection_status ?? svc.connectionStatus,
          'not_connected'
        ) as any,
        accountLabel: typeof svc.account_label === 'string'
          ? svc.account_label
          : typeof svc.accountLabel === 'string'
          ? svc.accountLabel
          : undefined,
        capabilities: Array.isArray(svc.capabilities)
          ? svc.capabilities.map((cap: any) => ({
              id: asString(cap.id, ''),
              label: asString(cap.label, ''),
              enabled: asBoolean(cap.enabled, false),
            }))
          : [],
        scopes: Array.isArray(svc.scopes) ? svc.scopes : undefined,
      }
    } catch (err) {
      console.warn(`Failed to fetch service detail for ${serviceId}:`, err)
      return null
    }
  }

  /**
   * Execute an agentic action
   * Maps to: POST /services/agentic-action
   */
  async executeAgenticAction(request: AgenticActionRequest): Promise<AgenticActionResponse> {
    const data = await transportFetchJson<Record<string, unknown>>(
      SERVICES_ENDPOINTS.AGENTIC_ACTION,
      {
        method: 'POST',
        body: JSON.stringify({
          service_id: request.serviceId,
          action: request.action,
          target: request.target,
          mode: request.mode,
          correlate_with_diagnostics: request.correlateWithDiagnostics,
          draft_issue: request.draftIssue,
          metadata: request.metadata,
        }),
      }
    )

    return {
      success: asBoolean(data.success, false),
      actionId: asString(data.action_id ?? data.actionId, `action-${Date.now()}`),
      result: typeof data.result === 'object' ? data.result as Record<string, unknown> : undefined,
      message: typeof data.message === 'string' ? data.message : undefined,
    }
  }

  /**
   * Get GitHub repositories for the connected account
   * Maps to: GET /services/github/repos
   */
  async getGitHubRepos(): Promise<GitHubRepo[]> {
    try {
      const data = await transportFetchJson<Record<string, unknown>>(
        SERVICES_ENDPOINTS.GITHUB_REPOS,
        { method: 'GET' }
      )

      const repos = Array.isArray(data.repos) ? data.repos : []

      return repos.map((repo: any) => ({
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
      }))
    } catch (err) {
      console.warn('Failed to fetch GitHub repos, returning empty list:', err)
      return []
    }
  }

  /**
   * Get GitHub repository details
   * Maps to: GET /services/github/repos/:owner/:repo
   */
  async getGitHubRepoDetail(owner: string, name: string): Promise<GitHubRepo | null> {
    try {
      const data = await transportFetchJson<Record<string, unknown>>(
        SERVICES_ENDPOINTS.GITHUB_REPO_DETAIL(owner, name),
        { method: 'GET' }
      )

      const repo = data.repo as any
      if (!repo) return null

      return {
        owner: asString(repo.owner, owner),
        name: asString(repo.name, name),
        fullName: asString(repo.full_name ?? repo.fullName, `${owner}/${name}`),
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
      }
    } catch (err) {
      console.warn(`Failed to fetch GitHub repo detail for ${owner}/${name}:`, err)
      return null
    }
  }
}

// ── Export singleton instance ─────────────────────────────────────────────────

export const servicesApi = new ServicesApi()
