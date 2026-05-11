import { Lock, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LockedFeatureProps {
  title: string
  description: string
  icon?: React.ReactNode
}

export function LockedFeature({ title, description, icon }: LockedFeatureProps) {
  return (
    <div className="relative flex flex-col h-full min-h-[calc(100vh-8rem)]">
      {/* Blurred background content */}
      <div className="absolute inset-0 blur-sm opacity-30 pointer-events-none select-none p-6">
        <div className="h-8 w-48 bg-muted rounded mb-4" />
        <div className="h-4 w-full bg-muted rounded mb-2" />
        <div className="h-4 w-3/4 bg-muted rounded mb-2" />
        <div className="h-4 w-1/2 bg-muted rounded mb-6" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-32 bg-muted rounded-lg" />
        </div>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-md flex items-center justify-center z-10">
        <div className="text-center max-w-md px-6">
          {/* Lock icon with glow */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl scale-150" />
              <div className="relative w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                {icon ?? <Lock className="w-9 h-9 text-primary" />}
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-foreground mb-3">{title}</h2>

          {/* Description */}
          <p className="text-muted-foreground mb-8 leading-relaxed">{description}</p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3">
            <Button
              size="lg"
              className="gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-8"
              onClick={() => window.open('https://viralidad.ai', '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
              Desbloquear en viralidad.ai
            </Button>
            <p className="text-xs text-muted-foreground">
              Accede a todas las herramientas con la versión completa
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
