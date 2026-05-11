import { RefreshCw } from 'lucide-react'
import { LockedFeature } from '@/components/shared/LockedFeature'

export function RecreateContent() {
  return (
    <div className="p-6 h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Recrear Contenido</h1>
        <p className="text-muted-foreground text-sm">Adapta videos virales a tu nicho y estilo</p>
      </div>
      <LockedFeature
        title="Recrear Contenido Viral"
        description="Toma cualquier video viral y adáptalo automáticamente a tu nicho y estilo de comunicación. Mantén la esencia viral pero con tu toque único y personalidad de marca."
        icon={<RefreshCw className="w-9 h-9 text-primary" />}
      />
    </div>
  )
}
