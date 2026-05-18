import { Calendar } from 'lucide-react'
import { LockedFeature } from '@/components/shared/LockedFeature'

export function EditorialCalendar() {
  return (
    <div className="p-4 sm:p-6 h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Calendario Editorial</h1>
        <p className="text-muted-foreground text-sm">Planifica tu contenido con IA</p>
      </div>
      <LockedFeature
        title="Calendario Editorial con IA"
        description="Genera un calendario de contenido completo para 30 días adaptado a tu nicho, audiencia y objetivos. Incluye temas, formatos, mejores horarios de publicación y estrategia de hashtags."
        icon={<Calendar className="w-9 h-9 text-primary" />}
      />
    </div>
  )
}
