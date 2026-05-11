import React, { useState, useRef, useEffect } from 'react'
import { Send, MessageCircle, User } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { UsageBadge } from '@/components/shared/UsageBadge'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Source {
  title: string
  snippet: string
}

interface AskVictorResponse {
  answer: string
  sources: Source[]
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        // Headings
        if (/^###\s/.test(line)) {
          return <p key={i} className="font-bold text-base mt-2">{line.replace(/^###\s/, '')}</p>
        }
        if (/^##\s/.test(line)) {
          return <p key={i} className="font-bold text-base mt-2">{line.replace(/^##\s/, '')}</p>
        }
        // Bullet points
        if (/^\*\s+/.test(line) || /^-\s+/.test(line)) {
          const content = line.replace(/^[\*\-]\s+/, '')
          return <p key={i} className="pl-3">• {renderInline(content)}</p>
        }
        // Numbered list
        if (/^\d+\.\s/.test(line)) {
          return <p key={i} className="pl-1">{renderInline(line)}</p>
        }
        // Empty line
        if (line.trim() === '') return <br key={i} />
        // Normal line
        return <p key={i}>{renderInline(line)}</p>
      })}
    </div>
  )
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="w-2 h-2 rounded-full bg-primary typing-dot" />
      <span className="w-2 h-2 rounded-full bg-primary typing-dot" />
      <span className="w-2 h-2 rounded-full bg-primary typing-dot" />
    </div>
  )
}

export function AskVictor() {
  const { profile, user, refreshProfile } = useAuth()
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sources, setSources] = useState<Source[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  const isAdmin = profile?.role === 'admin'
  const queriesUsed = profile?.queries_used ?? 0
  const atLimit = !isAdmin && queriesUsed >= 10

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async () => {
    const query = input.trim()
    if (!query || loading || atLimit) return

    setInput('')
    const userMessage: Message = { role: 'user', content: query }
    setMessages(prev => [...prev, userMessage])
    setSources([])
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const history = messages.slice(-6) // last 6 messages for context

      const response = await supabase.functions.invoke('ask-victor', {
        body: {
          query,
          conversation_history: history,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (response.error) {
        // FunctionsHttpError stores the original Response in .context
        let detail = response.error.message
        try {
          const body = await (response.error as any).context?.json?.()
          if (body?.error) detail = body.error
        } catch {}
        throw new Error(detail)
      }

      const data = response.data as AskVictorResponse
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }])
      if (data.sources && data.sources.length > 0) {
        setSources(data.sources)
      }
      await refreshProfile()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al consultar'
      if (message.includes('403') || message.toLowerCase().includes('límite')) {
        toast({ title: 'Límite alcanzado', description: 'Has usado tus 10 consultas del plan gratuito.', variant: 'destructive' })
        setMessages(prev => prev.slice(0, -1)) // remove the user message we just added
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Lo siento, tuve un problema al procesar tu consulta. Intenta de nuevo.',
        }])
        toast({ title: 'Error', description: message, variant: 'destructive' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-screen p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-1">Pregunta a Víctor</h1>
        <p className="text-muted-foreground text-sm">
          Accede a la mentoría de Víctor Heras sobre creación de contenido viral
        </p>
        {!isAdmin && (
          <div className="mt-3">
            <UsageBadge used={queriesUsed} total={10} label="Consultas usadas este mes" />
          </div>
        )}
      </div>

      <Separator className="mb-4" />

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <MessageCircle className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Habla con Víctor</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Pregúntame sobre estrategias de contenido viral, crecimiento en redes sociales,
              monetización y más. Respondo basándome en las mentorías de Víctor Heras.
            </p>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {[
                '¿Cómo crear ganchos virales?',
                '¿Qué publicar para crecer en TikTok?',
                '¿Cómo monetizar mi audiencia?',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:border-primary/40 hover:text-primary transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, i) => (
          <div
            key={i}
            className={cn(
              'flex gap-3',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <MessageCircle className="w-4 h-4 text-primary" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                message.role === 'user'
                  ? 'bg-primary text-white rounded-tr-sm'
                  : 'bg-card border border-border rounded-tl-sm'
              )}
            >
              {message.role === 'assistant'
                ? <MarkdownText text={message.content} />
                : <p className="whitespace-pre-wrap">{message.content}</p>
              }
            </div>
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {atLimit ? (
        <div className="text-center py-4 border border-border rounded-lg bg-card">
          <p className="text-sm text-muted-foreground mb-3">Has usado tus 10 consultas gratuitas</p>
          <Button size="sm" onClick={() => window.open('https://viralidad.ai', '_blank')}>
            Actualizar en viralidad.ai
          </Button>
        </div>
      ) : (
        <div className="flex gap-2 items-end">
          <Textarea
            placeholder="Escribe tu pregunta sobre contenido viral... (Enter para enviar)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="resize-none flex-1"
            disabled={loading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            size="icon"
            className="h-[60px] w-10 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}

      {!isAdmin && !atLimit && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          {10 - queriesUsed} consultas restantes
        </p>
      )}

      {/* Usage badge inline */}
      {!isAdmin && (
        <div className="mt-1 flex justify-end">
          <Badge
            variant="secondary"
            className={cn(
              'text-xs',
              queriesUsed >= 8 ? 'bg-yellow-500/10 text-yellow-500' : ''
            )}
          >
            {queriesUsed}/10 consultas
          </Badge>
        </div>
      )}
    </div>
  )
}
