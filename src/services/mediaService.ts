/**
 * Media Service
 *
 * Handles robust media downloads with:
 * - Explicit download handling
 * - Content-type detection
 * - CORS error handling
 * - Download verification
 * - Proper error reporting
 *
 * Media URL resolution is centralized via resolveMediaUrl from backendContract
 * so that the URL construction logic lives in one place.
 */

import { resolveMediaUrl } from './backendContract'
import { backendConfigStore } from './backendConfigStore'

export interface DownloadResult {
  success: boolean
  filename: string
  url?: string
  error?: string
}

export interface DownloadOptions {
  filename?: string
  conversationTitle?: string
}

/**
 * Media Service
 *
 * Provides robust media download functionality with proper error handling.
 */
export class MediaService {
  /**
   * Download an image from the backend.
   * @param ref  A fully-qualified URL, backend-relative path, or bare image ID
   */
  async downloadImage(
    ref: string,
    options: DownloadOptions = {}
  ): Promise<DownloadResult> {
    const baseUrl = backendConfigStore.getBaseUrl()
    if (!baseUrl) {
      return {
        success: false,
        filename: '',
        error: 'Backend not configured',
      }
    }

    const url = resolveMediaUrl('image', ref, baseUrl)
    const filename = this.generateFilename('image', options)
    return this.downloadMedia(url, filename, 'image')
  }

  /**
   * Download an audio file from the backend.
   * @param ref  A fully-qualified URL, backend-relative path, or bare audio ID
   */
  async downloadAudio(
    ref: string,
    options: DownloadOptions = {}
  ): Promise<DownloadResult> {
    const baseUrl = backendConfigStore.getBaseUrl()
    if (!baseUrl) {
      return {
        success: false,
        filename: '',
        error: 'Backend not configured',
      }
    }

    const url = resolveMediaUrl('audio', ref, baseUrl)
    const filename = this.generateFilename('audio', options)
    return this.downloadMedia(url, filename, 'audio')
  }

  /**
   * Download media from a URL
   */
  private async downloadMedia(
    url: string,
    filename: string,
    type: 'image' | 'audio'
  ): Promise<DownloadResult> {
    try {
      // Fetch the media with error handling
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'include',
      })

      if (!response.ok) {
        return {
          success: false,
          filename,
          error: `Failed to download: ${response.status} ${response.statusText}`,
        }
      }

      // Detect content type
      const contentType = response.headers.get('content-type')
      if (!contentType) {
        console.warn('No content-type header, proceeding anyway')
      } else {
        // Validate content type
        const expectedTypes = type === 'image'
          ? ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
          : ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm']

        const isValidType = expectedTypes.some(t => contentType.includes(t))
        if (!isValidType) {
          console.warn(`Unexpected content-type: ${contentType}`)
        }
      }

      // Get the blob
      const blob = await response.blob()

      if (blob.size === 0) {
        return {
          success: false,
          filename,
          error: 'Downloaded file is empty',
        }
      }

      // Create object URL
      const objectUrl = URL.createObjectURL(blob)

      // Attempt download via anchor element
      const success = this.triggerDownload(objectUrl, filename)

      if (!success) {
        // Fallback: try opening in new tab with download attribute
        const fallbackSuccess = this.fallbackDownload(objectUrl, filename)

        if (!fallbackSuccess) {
          // Cleanup and return error
          URL.revokeObjectURL(objectUrl)
          return {
            success: false,
            filename,
            error: 'Failed to trigger download. Please check browser permissions.',
          }
        }
      }

      // Schedule cleanup after download
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl)
      }, 1000)

      return {
        success: true,
        filename,
        url: objectUrl,
      }
    } catch (error) {
      // Handle CORS errors
      if (error instanceof TypeError && error.message.includes('CORS')) {
        return {
          success: false,
          filename,
          error: 'CORS error: Backend must allow cross-origin requests',
        }
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          success: false,
          filename,
          error: 'Network error: Please check your connection',
        }
      }

      // Generic error
      return {
        success: false,
        filename,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Trigger download using anchor element
   */
  private triggerDownload(url: string, filename: string): boolean {
    try {
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.style.display = 'none'

      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)

      return true
    } catch (error) {
      console.error('Failed to trigger download:', error)
      return false
    }
  }

  /**
   * Fallback download method
   */
  private fallbackDownload(url: string, filename: string): boolean {
    try {
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.target = '_blank'
      link.rel = 'noopener noreferrer'

      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
      })

      link.dispatchEvent(clickEvent)

      return true
    } catch (error) {
      console.error('Fallback download failed:', error)
      return false
    }
  }

  /**
   * Generate a filename for downloaded media
   */
  private generateFilename(
    type: 'image' | 'audio',
    options: DownloadOptions = {}
  ): string {
    if (options.filename) {
      return options.filename
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const conversationPart = options.conversationTitle
      ? `-${options.conversationTitle.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 20)}`
      : ''

    const extension = type === 'image' ? 'png' : 'mp3'

    return `${type}${conversationPart}-${timestamp}.${extension}`
  }

  /**
   * Validate if a URL is accessible (for pre-download checks)
   */
  async validateUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'cors',
        credentials: 'include',
      })
      return response.ok
    } catch (error) {
      console.error('URL validation failed:', error)
      return false
    }
  }

  /**
   * Get content type from URL
   */
  async getContentType(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'cors',
        credentials: 'include',
      })

      if (!response.ok) {
        return null
      }

      return response.headers.get('content-type')
    } catch (error) {
      console.error('Failed to get content type:', error)
      return null
    }
  }
}

// Export singleton instance
export const mediaService = new MediaService()
