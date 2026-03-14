import { Plus, MagnifyingGlass, Gear, Folder } from '@phosphor-icons/react'
import { Conversation } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'

interface SidebarProps {
  conversations: Conversation[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewChat: () => void
  onOpenSettings: () => void
  onOpenMedia: () => void
}

export function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onOpenSettings,
  onOpenMedia
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="w-80 border-r border-border/50 glass-panel flex flex-col">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">Kael</h1>
          <Button
            size="icon"
            onClick={onNewChat}
            className="h-9 w-9 rounded-full glow-accent"
          >
            <Plus weight="bold" className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 glass-panel border-white/30"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 px-4 text-sm text-muted-foreground">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${
                  activeConversationId === conv.id
                    ? 'glass-strong border border-primary/30 glow-soft'
                    : 'hover:bg-accent/20'
                }`}
              >
                <div className="font-medium text-sm truncate mb-1">{conv.title}</div>
                {conv.lastMessage && (
                  <div className="text-xs text-muted-foreground truncate mb-1">
                    {conv.lastMessage}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(conv.timestamp), { addSuffix: true })}
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border/50 space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenMedia}
          className="w-full justify-start hover:bg-accent/30"
        >
          <Folder className="h-4 w-4 mr-2" />
          Downloaded Media
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenSettings}
          className="w-full justify-start hover:bg-accent/30"
        >
          <Gear className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>
    </div>
  )
}
