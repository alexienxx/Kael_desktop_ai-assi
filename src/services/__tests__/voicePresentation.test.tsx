import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import { MessageBubble } from '../../components/MessageBubble'
import { Sidebar } from '../../components/Sidebar'
import type { Message } from '../../lib/types'
import { messagePreview } from '../chatHistoryService'

const PRIVATE_TRANSCRIPT = 'surface privata che non deve apparire'

function voiceMessage(role: 'user' | 'assistant'): Message {
  return {
    id: `${role}-voice-1`,
    role,
    content: { type: 'text', text: PRIVATE_TRANSCRIPT },
    timestamp: new Date('2026-09-30T12:00:00Z'),
    conversationId: 'canonical-chat',
    assistantTurnId: role === 'assistant' ? 73 : undefined,
    deliveryMode: 'voice_note',
  }
}

describe('desktop canonical voice presentation', () => {
  it.each(['user', 'assistant'] as const)(
    'does not render the %s voice transcript in the message DOM',
    (role) => {
      const markup = renderToStaticMarkup(
        <MessageBubble
          message={voiceMessage(role)}
          bubbleClasses="bubble"
          showTimestamp={false}
          onMediaDownload={vi.fn()}
          onSpeak={vi.fn()}
          speaking={false}
        />
      )

      expect(markup).not.toContain(PRIVATE_TRANSCRIPT)
      expect(markup).toContain(
        role === 'user' ? 'Messaggio vocale' : 'Messaggio vocale di Arrakis'
      )
      if (role === 'assistant') {
        expect(markup).toContain('aria-label="Ascolta Arrakis"')
        expect(markup).not.toContain('disabled=""')
      }
    }
  )

  it('uses a safe voice preview in the sidebar', () => {
    const message = voiceMessage('assistant')
    const markup = renderToStaticMarkup(
      <Sidebar
        conversations={[{
          id: message.conversationId,
          title: 'Conversazione vocale',
          lastMessage: messagePreview(message),
          timestamp: message.timestamp,
          messageCount: 2,
        }]}
        activeConversationId={message.conversationId}
        onSelectConversation={vi.fn()}
        onNewChat={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenMedia={vi.fn()}
        onOpenControlCenter={vi.fn()}
      />
    )

    expect(messagePreview(message)).toBe('Messaggio vocale di Arrakis')
    expect(markup).not.toContain(PRIVATE_TRANSCRIPT)
    expect(markup).toContain('Messaggio vocale di Arrakis')
  })
})
