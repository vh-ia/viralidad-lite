import { useState, useEffect } from 'react'
import { Loader2, UserPlus, Trash2, Users, RefreshCw } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import type { Profile } from '@/integrations/supabase/types'

export function Admin() {
  const { toast } = useToast()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Profile | null>(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteNiche, setInviteNiche] = useState('')

  const loadUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setUsers(data)
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) {
      toast({ title: 'Email requerido', variant: 'destructive' })
      return
    }
    setInviteLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const response = await supabase.functions.invoke('invite-user', {
        body: { email: inviteEmail, full_name: inviteName, niche: inviteNiche },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (response.error) {
        let detail = response.error.message
        try {
          const body = await (response.error as any).context?.json?.()
          if (body?.error) detail = body.error
        } catch {}
        throw new Error(detail)
      }

      toast({ title: 'Invitación enviada', description: `Se envió el link de acceso a ${inviteEmail}` })
      setInviteEmail('')
      setInviteName('')
      setInviteNiche('')
      setShowInviteForm(false)
      await loadUsers()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al invitar usuario'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setInviteLoading(false)
    }
  }

  const handleDelete = async (user: Profile) => {
    setDeleteLoading(user.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      // Delete from auth using admin API — only works if you have service role in edge function
      // For now we delete the profile (cascade will handle auth.users via DB trigger if set)
      const { error } = await supabase.from('profiles').delete().eq('id', user.id)
      if (error) throw error

      toast({ title: 'Usuario eliminado', description: `${user.email} ha sido eliminado.` })
      setDeleteConfirm(null)
      await loadUsers()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al eliminar'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setDeleteLoading(null)
    }
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Panel de Administración</h1>
          <p className="text-muted-foreground text-sm">Gestiona los usuarios de Viralidad Lite</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button size="sm" onClick={() => setShowInviteForm(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invitar usuario
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total usuarios</p>
            <p className="text-2xl font-bold">{users.filter(u => u.role === 'user').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Guiones generados</p>
            <p className="text-2xl font-bold">{users.reduce((a, u) => a + u.scripts_used, 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Consultas realizadas</p>
            <p className="text-2xl font-bold">{users.reduce((a, u) => a + u.queries_used, 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Límite alcanzado</p>
            <p className="text-2xl font-bold">{users.filter(u => u.scripts_used >= 10 || u.queries_used >= 10).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Users table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Usuarios ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No hay usuarios registrados</p>
          ) : (
            <div className="space-y-0">
              {/* Header */}
              <div className="grid grid-cols-12 gap-3 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-3">Usuario</div>
                <div className="col-span-2">Nicho</div>
                <div className="col-span-2 text-center">Guiones</div>
                <div className="col-span-2 text-center">Consultas</div>
                <div className="col-span-2">Registro</div>
                <div className="col-span-1" />
              </div>
              <Separator />
              {users.map((user, i) => (
                <div key={user.id}>
                  {i > 0 && <Separator />}
                  <div className="grid grid-cols-12 gap-3 px-3 py-3 items-center hover:bg-accent/50 rounded-md transition-colors">
                    <div className="col-span-3 min-w-0">
                      <p className="font-medium text-sm truncate">{user.full_name || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="col-span-2">
                      {user.niche ? (
                        <Badge variant="secondary" className="text-xs truncate max-w-full">
                          {user.niche}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="col-span-2 text-center">
                      <span className={`text-sm font-medium ${user.scripts_used >= 10 ? 'text-destructive' : user.scripts_used >= 8 ? 'text-yellow-500' : ''}`}>
                        {user.scripts_used}/10
                      </span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className={`text-sm font-medium ${user.queries_used >= 10 ? 'text-destructive' : user.queries_used >= 8 ? 'text-yellow-500' : ''}`}>
                        {user.queries_used}/10
                      </span>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </span>
                        {user.role === 'admin' && (
                          <Badge className="text-xs bg-primary/20 text-primary border-primary/30">Admin</Badge>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {user.role !== 'admin' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteConfirm(user)}
                          disabled={deleteLoading === user.id}
                        >
                          {deleteLoading === user.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <Dialog open={showInviteForm} onOpenChange={setShowInviteForm}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Invitar nuevo usuario</DialogTitle>
            <DialogDescription>
              El usuario recibirá un email con un link para crear su cuenta.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inviteEmail">Email *</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="usuario@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inviteName">Nombre completo</Label>
              <Input
                id="inviteName"
                placeholder="Juan García"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inviteNiche">Nicho</Label>
              <Input
                id="inviteNiche"
                placeholder="Ej: fitness, finanzas personales..."
                value={inviteNiche}
                onChange={(e) => setInviteNiche(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowInviteForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={inviteLoading}>
                {inviteLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando...</>
                ) : (
                  <><UserPlus className="w-4 h-4 mr-2" />Enviar invitación</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar a{' '}
              <strong className="text-foreground">{deleteConfirm?.email}</strong>?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={!!deleteLoading}
            >
              {deleteLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Eliminando...</>
              ) : (
                <>Eliminar usuario</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
