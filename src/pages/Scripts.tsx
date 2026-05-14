import { useState, useEffect } from 'react'
import { Copy, Check, FileText, Clock, Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { UsageBadge } from '@/components/shared/UsageBadge'
import type { Script } from '@/integrations/supabase/types'

const PLATFORMS = [
  { value: 'TikTok', label: 'TikTok' },
  { value: 'Reels', label: 'Instagram Reels' },
  { value: 'YouTube Shorts', label: 'YouTube Shorts' },
]

const TONES = [
  { value: 'energético', label: 'Energético' },
  { value: 'educativo', label: 'Educativo' },
  { value: 'inspirador', label: 'Inspirador' },
  { value: 'conversacional', label: 'Conversacional' },
  { value: 'humorístico', label: 'Humorístico' },
  { value: 'directo', label: 'Directo/Provocador' },
]

const DURATIONS = [
  { value: '15-30 segundos', label: '15-30 seg (micro)' },
  { value: '30-60 segundos', label: '30-60 seg (corto)' },
  { value: '60-90 segundos', label: '60-90 seg (estándar)' },
  { value: '90-3 minutos', label: '90 seg - 3 min (largo)' },
]

export function Scripts() {
  const { profile, user, refreshProfile } = useAuth()
  const { toast } = useToast()

  const [platform, setPlatform] = useState('TikTok')
  const [niche, setNiche] = useState('')
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('energético')
  const [duration, setDuration] = useState('30-60 segundos')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<Script[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const isAdmin = profile?.role === 'admin'
  const scriptsUsed = profile?.scripts_used ?? 0
  const atLimit = !isAdmin && scriptsUsed >= 10

  // Pre-fill niche from profile
  useEffect(() => {
    if (profile?.niche) setNiche(profile.niche)
  }, [profile?.niche])

  // Load history
  useEffect(() => {
    if (!user) return
    setHistoryLoading(true)
    supabase
      .from('scripts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setHistory(data)
        setHistoryLoading(false)
      })
  }, [user, result])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) {
      toast({ title: 'Campo requerido', description: 'Escribe el tema del guion.', variant: 'destructive' })
      return
    }
    if (atLimit) {
      toast({ title: 'Límite alcanzado', description: 'Has usado tus 10 guiones. Actualiza en viralidad.com', variant: 'destructive' })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const response = await supabase.functions.invoke('create-script', {
        body: { platform, niche, topic, tone, duration },
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

      const data = response.data as { content: string; id: string }
      setResult(data.content)
      await refreshProfile()
      toast({ title: 'Guion generado', description: '¡Tu guion viral está listo!' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al generar el guion'
      if (message.includes('403') || message.toLowerCase().includes('límite')) {
        toast({ title: 'Límite alcanzado', description: 'Has usado tus 10 guiones del plan gratuito.', variant: 'destructive' })
      } else {
        toast({ title: 'Error', description: message, variant: 'destructive' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Generador de Guiones</h1>
        <p className="text-muted-foreground text-sm">Crea guiones virales optimizados para cada plataforma</p>
      </div>

      {!isAdmin && (
        <div className="mb-6">
          <UsageBadge used={scriptsUsed} total={10} label="Guiones usados este mes" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Configura tu guion</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Plataforma</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="niche">Nicho</Label>
                <Input
                  id="niche"
                  placeholder="Ej: fitness, finanzas, cocina..."
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="topic">Tema del video *</Label>
                <Textarea
                  id="topic"
                  placeholder="Ej: 3 errores que cometen los principiantes en el gym"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tono</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Duración</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || atLimit}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generando...</>
                ) : atLimit ? (
                  'Límite alcanzado'
                ) : (
                  'Generar guion viral'
                )}
              </Button>

              {atLimit && (
                <p className="text-xs text-center text-muted-foreground">
                  <a href="https://viralidad.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Actualiza en viralidad.com
                  </a>{' '}
                  para guiones ilimitados
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Result */}
        <div className="space-y-4">
          {result ? (
            <Card className="bg-card border-border border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Tu guion
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5">
                    {copied ? (
                      <><Check className="w-3.5 h-3.5 text-green-500" />Copiado</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" />Copiar</>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed font-sans bg-background/50 rounded-md p-4 border border-border">
                  {result}
                </pre>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Tu guion aparecerá aquí
                </p>
              </CardContent>
            </Card>
          )}

          {/* History */}
          {!historyLoading && history.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Últimos guiones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {history.map((script, i) => (
                  <div key={script.id}>
                    {i > 0 && <Separator className="my-2" />}
                    <button
                      className="w-full text-left group"
                      onClick={() => setResult(script.content)}
                    >
                      <div className="flex items-start gap-2">
                        <Badge variant="secondary" className="text-xs shrink-0 mt-0.5">
                          {script.platform}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {script.title ?? script.content.slice(0, 60) + '...'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(script.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
