import { useNavigate } from 'react-router-dom'
import { FileText, MessageCircle, Zap, ArrowRight, TrendingUp } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UsageBadge } from '@/components/shared/UsageBadge'
import { Badge } from '@/components/ui/badge'

export function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const scriptsUsed = profile?.scripts_used ?? 0
  const queriesUsed = profile?.queries_used ?? 0
  const isAdmin = profile?.role === 'admin'

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold">
            {greeting()}, {profile?.full_name?.split(' ')[0] ?? 'Creador'}
          </h1>
          {isAdmin && (
            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
              Admin
            </Badge>
          )}
        </div>
        {profile?.niche && (
          <p className="text-muted-foreground">
            Nicho:{' '}
            <span className="text-foreground font-medium">{profile.niche}</span>
          </p>
        )}
      </div>

      {/* Usage cards */}
      {!isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Guiones generados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-3">
                {scriptsUsed}
                <span className="text-lg text-muted-foreground font-normal">/10</span>
              </div>
              <UsageBadge used={scriptsUsed} total={10} label="Uso mensual" />
              {scriptsUsed >= 10 && (
                <p className="text-xs text-destructive mt-2">
                  Límite alcanzado. Actualiza para continuar.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Consultas a Víctor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-3">
                {queriesUsed}
                <span className="text-lg text-muted-foreground font-normal">/10</span>
              </div>
              <UsageBadge used={queriesUsed} total={10} label="Uso mensual" />
              {queriesUsed >= 10 && (
                <p className="text-xs text-destructive mt-2">
                  Límite alcanzado. Actualiza para continuar.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {isAdmin && (
        <div className="mb-8 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm text-primary font-medium flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Cuenta admin — sin límites de uso
          </p>
        </div>
      )}

      {/* Quick actions */}
      <h2 className="text-lg font-semibold mb-4">Accesos rápidos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          className="bg-card border-border hover:border-primary/40 transition-colors cursor-pointer group"
          onClick={() => navigate('/scripts')}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Generar guion</p>
              <p className="text-xs text-muted-foreground">Crea contenido viral con IA</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </CardContent>
        </Card>

        <Card
          className="bg-card border-border hover:border-primary/40 transition-colors cursor-pointer group"
          onClick={() => navigate('/ask-victor')}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Pregunta a Víctor</p>
              <p className="text-xs text-muted-foreground">Consulta mentoría en tiempo real</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </CardContent>
        </Card>

        {/* Upgrade CTA */}
        {!isAdmin && (
          <Card className="sm:col-span-2 bg-gradient-to-r from-primary/10 to-purple-900/20 border-primary/20">
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Desbloquea el potencial completo</p>
                  <p className="text-xs text-muted-foreground">
                    Transcripciones, análisis, recreación de contenido y más en viralidad.com
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="shrink-0"
                onClick={() => window.open('https://viralidad.com', '_blank')}
              >
                Ver más
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
