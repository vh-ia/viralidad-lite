import { TrendingUp } from 'lucide-react'
import { LockedFeature } from '@/components/shared/LockedFeature'

export function ViralCalculator() {
  return (
    <div className="p-4 sm:p-6 h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Calculadora Viral</h1>
        <p className="text-muted-foreground text-sm">Predice el potencial viral de tu contenido</p>
      </div>
      <LockedFeature
        title="Calculadora de Potencial Viral"
        description="Ingresa los detalles de tu video y obtén una puntuación de potencial viral junto con recomendaciones específicas para maximizar tu alcance orgánico en cada plataforma."
        icon={<TrendingUp className="w-9 h-9 text-primary" />}
      />
    </div>
  )
}
