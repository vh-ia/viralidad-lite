import { Subtitles } from 'lucide-react'
import { LockedFeature } from '@/components/shared/LockedFeature'

export function Transcription() {
  return (
    <div className="p-4 sm:p-6 h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Transcripción de Contenido</h1>
        <p className="text-muted-foreground text-sm">Convierte cualquier video a texto en segundos</p>
      </div>
      <LockedFeature
        title="Transcripción de Contenido"
        description="Pega el link de cualquier video de TikTok, Reels o YouTube y obtén la transcripción completa en segundos. Ideal para analizar contenido viral y reutilizar ideas."
        icon={<Subtitles className="w-9 h-9 text-primary" />}
      />
    </div>
  )
}
