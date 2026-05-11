import { Search } from 'lucide-react'
import { LockedFeature } from '@/components/shared/LockedFeature'

export function AnalyzeContent() {
  return (
    <div className="p-6 h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Analizar Contenido</h1>
        <p className="text-muted-foreground text-sm">Descubre por qué un video se volvió viral</p>
      </div>
      <LockedFeature
        title="Análisis de Contenido Viral"
        description="Analiza cualquier video viral y obtén un desglose detallado: gancho, estructura narrativa, elementos que generan engagement y qué puedes replicar en tu estrategia."
        icon={<Search className="w-9 h-9 text-primary" />}
      />
    </div>
  )
}
