import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Toaster } from '@/components/ui/toaster'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isSettingPassword, setIsSettingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const { toast } = useToast()
  const navigate = useNavigate()

  // Handle invitation/password recovery callback
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'))
    const accessToken = hashParams.get('access_token')
    const type = hashParams.get('type')

    if (accessToken && (type === 'invite' || type === 'recovery')) {
      // Exchange the tokens
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          // User is already authenticated via the magic link
          if (type === 'invite') {
            setIsSettingPassword(true)
          } else {
            navigate('/dashboard')
          }
        }
      })
    }

    // Also handle PKCE flow via URL params
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) {
          navigate('/dashboard')
        }
      })
    }
  }, [navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast({ title: 'Campos requeridos', description: 'Por favor ingresa tu email y contraseña.', variant: 'destructive' })
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast({
        title: 'Error al iniciar sesión',
        description: error.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos.'
          : error.message,
        variant: 'destructive',
      })
    } else {
      navigate('/dashboard')
    }
    setLoading(false)
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden.', variant: 'destructive' })
      return
    }
    if (newPassword.length < 8) {
      toast({ title: 'Contraseña muy corta', description: 'Debe tener al menos 8 caracteres.', variant: 'destructive' })
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Contraseña configurada', description: 'Bienvenido a Viralidad Lite.' })
      navigate('/dashboard')
    }
    setLoading(false)
  }

  if (isSettingPassword) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="w-full max-w-sm">
            <div className="flex justify-center mb-8">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Viralidad Lite</span>
              </div>
            </div>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Crea tu contraseña</CardTitle>
                <CardDescription>
                  Configura una contraseña segura para acceder a tu cuenta.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSetPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword">Nueva contraseña</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Repite la contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Guardando...' : 'Establecer contraseña y acceder'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
        <Toaster />
      </>
    )
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Viralidad Lite</span>
            </div>
          </div>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Iniciar sesión</CardTitle>
              <CardDescription>
                Accede con el link de invitación que recibiste o con tus credenciales.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Tu contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Ingresando...' : 'Iniciar sesión'}
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-4">
                ¿No tienes acceso?{' '}
                <a
                  href="https://viralidad.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Conoce viralidad.ai
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      <Toaster />
    </>
  )
}
