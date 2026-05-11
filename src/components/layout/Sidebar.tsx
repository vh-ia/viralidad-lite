import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  MessageCircle,
  Subtitles,
  Search,
  RefreshCw,
  TrendingUp,
  Calendar,
  Users,
  Lock,
  LogOut,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  locked?: boolean
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { to: '/scripts', label: 'Generar Guion', icon: <FileText className="w-4 h-4" /> },
  { to: '/ask-victor', label: 'Pregunta a Víctor', icon: <MessageCircle className="w-4 h-4" /> },
  { to: '/transcription', label: 'Transcripción', icon: <Subtitles className="w-4 h-4" />, locked: true },
  { to: '/analyze', label: 'Analizar Contenido', icon: <Search className="w-4 h-4" />, locked: true },
  { to: '/recreate', label: 'Recrear Contenido', icon: <RefreshCw className="w-4 h-4" />, locked: true },
  { to: '/calculator', label: 'Calculadora Viral', icon: <TrendingUp className="w-4 h-4" />, locked: true },
  { to: '/calendar', label: 'Calendario Editorial', icon: <Calendar className="w-4 h-4" />, locked: true },
]

export function Sidebar() {
  const { profile, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="p-5 flex items-center gap-2.5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm text-foreground leading-none">Viralidad Lite</p>
          <p className="text-xs text-muted-foreground mt-0.5">by viralidad.ai</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors group',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )
              }
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.locked && (
                <Lock className="w-3 h-3 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" />
              )}
            </NavLink>
          ))}
        </div>

        {isAdmin && (
          <>
            <Separator className="my-3" />
            <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Admin
            </p>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors mt-0.5',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )
              }
            >
              <Users className="w-4 h-4" />
              Usuarios
            </NavLink>
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {profile?.full_name || 'Usuario'}
            </p>
            <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 w-8 h-8 text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
