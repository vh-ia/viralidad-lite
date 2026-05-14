import { useState, useEffect, useMemo } from 'react'
import { Loader2, UserPlus, Trash2, Users, RefreshCw, Eye, Search, Shield, ShieldOff } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import type { Profile } from '@/integrations/supabase/types'

export function Admin() {
  const { toast } = useToast()
  const { isMaster } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState<string | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Profile | null>(null)
  const [viewLead, setViewLead] = useState<Profile | null>(null)
  const [search, setSearch] = useState('')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteNiche, setInviteNiche] = useState('')
  const [inviteMonthlyRevenue, setInviteMonthlyRevenue] = useState('')
  const [inviteRevenueGoal, setInviteRevenueGoal] = useState('')
  const [inviteAdSpend, setInviteAdSpend] = useState('')
  const [inviteObjetivo, setInviteObjetivo] = useState('')
  const [inviteAsAdmin, setInviteAsAdmin] = useState(false)

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

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(u =>
      u.email?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.niche?.toLowerCase().includes(q)
    )
  }, [users, search])

  const resetInviteForm = () => {
    setInviteEmail(''); setInviteName(''); setInviteNiche('')
    setInviteMonthlyRevenue(''); setInviteRevenueGoal('')
    setInviteAdSpend(''); setInviteObjetivo(''); setInviteAsAdmin(false)
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) { toast({ title: 'Email requerido', variant: 'destructive' }); return }
    setInviteLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const response = await supabase.functions.invoke('invite-user', {
        body: {
          email: inviteEmail, full_name: inviteName, niche: inviteNiche,
          monthly_revenue: inviteMonthlyRevenue, revenue_goal: inviteRevenueGoal,
          ad_spend: inviteAdSpend, objetivo: inviteObjetivo,
          role: inviteAsAdmin ? 'admin' : 'user',
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (response.error) {
        let detail = response.error.message
        try { const b = await (response.error as any).context?.json?.(); if (b?.error) detail = b.error } catch {}
        throw new Error(detail)
      }

      toast({ title: 'Invitación enviada', description: `Link enviado a ${inviteEmail}${inviteAsAdmin ? ' (admin)' : ''}` })
      resetInviteForm(); setShowInviteForm(false); await loadUsers()
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error al invitar', variant: 'destructive' })
    } finally { setInviteLoading(false) }
  }

  const handleToggleRole = async (user: Profile) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    setRoleLoading(user.id)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      if (error) throw error
      toast({ title: `Rol actualizado`, description: `${user.email} ahora es ${newRole}` })
      await loadUsers()
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' })
    } finally { setRoleLoading(null) }
  }

  const handleDelete = async (user: Profile) => {
    setDeleteLoading(user.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const response = await supabase.functions.invoke('delete-user', {
        body: { user_id: user.id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (response.error) {
        let detail = response.error.message
        try { const b = await (response.error as any).context?.json?.(); if (b?.error) detail = b.error } catch {}
        throw new Error(detail)
      }

      toast({ title: 'Usuario eliminado', description: `${user.email} ha sido eliminado.` })
      setDeleteConfirm(null); await loadUsers()
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error al eliminar', variant: 'destructive' })
    } finally { setDeleteLoading(null) }
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Panel de Administración</h1>
          <p className="text-muted-foreground text-sm">Gestiona los leads de Viralidad Lite</p>
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
            <p className="text-xs text-muted-foreground">Total leads</p>
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
            <p className="text-xs text-muted-foreground">Admins</p>
            <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, email o nicho..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Users table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            {search ? `Resultados (${filteredUsers.length})` : `Usuarios (${users.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              {search ? 'No se encontraron resultados' : 'No hay usuarios registrados'}
            </p>
          ) : (
            <div className="space-y-0">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-4">Usuario</div>
                <div className="col-span-2">Nicho</div>
                <div className="col-span-1 text-center">Guiones</div>
                <div className="col-span-1 text-center">Consultas</div>
                <div className="col-span-4 text-right">Acciones</div>
              </div>
              <Separator />
              {filteredUsers.map((user, i) => (
                <div key={user.id}>
                  {i > 0 && <Separator />}
                  <div className="grid grid-cols-12 gap-2 px-3 py-3 items-center hover:bg-accent/50 rounded-md transition-colors">
                    <div className="col-span-4 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-sm truncate">{user.full_name || '—'}</p>
                        {user.role === 'admin' && (
                          <Badge className="text-xs bg-primary/20 text-primary border-primary/30 shrink-0">Admin</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </p>
                    </div>
                    <div className="col-span-2">
                      {user.niche ? (
                        <Badge variant="secondary" className="text-xs truncate max-w-full">{user.niche}</Badge>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                    <div className="col-span-1 text-center">
                      <span className={`text-sm font-medium ${user.scripts_used >= 10 ? 'text-destructive' : user.scripts_used >= 8 ? 'text-yellow-500' : ''}`}>
                        {user.scripts_used}/10
                      </span>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className={`text-sm font-medium ${user.queries_used >= 5 ? 'text-destructive' : user.queries_used >= 4 ? 'text-yellow-500' : ''}`}>
                        {user.queries_used}/5
                      </span>
                    </div>
                    <div className="col-span-4 flex justify-end gap-1">
                      {/* Ver perfil */}
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-primary" onClick={() => setViewLead(user)} title="Ver perfil">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      {/* Toggle rol — solo master puede cambiar roles */}
                      {isMaster && user.role !== 'master' && (
                        <Button
                          variant="ghost" size="icon"
                          className={`w-7 h-7 ${user.role === 'admin' ? 'text-primary hover:text-muted-foreground' : 'text-muted-foreground hover:text-primary'}`}
                          onClick={() => handleToggleRole(user)}
                          disabled={roleLoading === user.id}
                          title={user.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                        >
                          {roleLoading === user.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : user.role === 'admin'
                              ? <ShieldOff className="w-3.5 h-3.5" />
                              : <Shield className="w-3.5 h-3.5" />
                          }
                        </Button>
                      )}
                      {/* Eliminar */}
                      <Button
                        variant="ghost" size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteConfirm(user)}
                        disabled={deleteLoading === user.id}
                        title="Eliminar usuario"
                      >
                        {deleteLoading === user.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <Dialog open={showInviteForm} onOpenChange={(open) => { if (!open) resetInviteForm(); setShowInviteForm(open) }}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invitar usuario</DialogTitle>
            <DialogDescription>Rellena la información del lead antes de enviar la invitación.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inviteEmail">Email *</Label>
              <Input id="inviteEmail" type="email" placeholder="lead@email.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inviteName">Nombre completo</Label>
              <Input id="inviteName" placeholder="Juan García" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inviteNiche">Nicho</Label>
              <Input id="inviteNiche" placeholder="Ej: fitness, finanzas..." value={inviteNiche} onChange={(e) => setInviteNiche(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inviteMonthlyRevenue">¿Cuánto generas al mes?</Label>
              <Input id="inviteMonthlyRevenue" placeholder="Ej: $500, nada por ahora..." value={inviteMonthlyRevenue} onChange={(e) => setInviteMonthlyRevenue(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inviteRevenueGoal">¿Cuánto quieres generar?</Label>
              <Input id="inviteRevenueGoal" placeholder="Ej: $5,000 al mes" value={inviteRevenueGoal} onChange={(e) => setInviteRevenueGoal(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inviteAdSpend">¿Cuánto inviertes en anuncios?</Label>
              <Input id="inviteAdSpend" placeholder="Ej: $200/mes, ninguno..." value={inviteAdSpend} onChange={(e) => setInviteAdSpend(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inviteObjetivo">Objetivo / contexto</Label>
              <Textarea id="inviteObjetivo" placeholder="Situación actual, qué busca, objeciones..." value={inviteObjetivo} onChange={(e) => setInviteObjetivo(e.target.value)} rows={3} />
            </div>
            {/* Admin toggle — solo visible para master */}
            {isMaster && (
              <div className="flex items-center gap-3 py-2 px-3 rounded-lg border border-border bg-background/50">
                <input
                  type="checkbox"
                  id="inviteAsAdmin"
                  checked={inviteAsAdmin}
                  onChange={(e) => setInviteAsAdmin(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <div>
                  <label htmlFor="inviteAsAdmin" className="text-sm font-medium cursor-pointer">Invitar como Admin (Asesor)</label>
                  <p className="text-xs text-muted-foreground">Tendrá acceso al panel de administración</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { resetInviteForm(); setShowInviteForm(false) }}>Cancelar</Button>
              <Button type="submit" disabled={inviteLoading}>
                {inviteLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando...</>
                  : <><UserPlus className="w-4 h-4 mr-2" />Enviar invitación</>
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lead profile dialog */}
      <Dialog open={!!viewLead} onOpenChange={(open) => !open && setViewLead(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Perfil del lead</DialogTitle>
            <DialogDescription>{viewLead?.email}</DialogDescription>
          </DialogHeader>
          {viewLead && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground mb-0.5">Nombre</p><p className="font-medium">{viewLead.full_name || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Nicho</p><p className="font-medium">{viewLead.niche || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Genera al mes</p><p className="font-medium">{viewLead.monthly_revenue || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Quiere generar</p><p className="font-medium">{viewLead.revenue_goal || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Invierte en anuncios</p><p className="font-medium">{viewLead.ad_spend || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Uso de la app</p><p className="font-medium">{viewLead.scripts_used} guiones · {viewLead.queries_used} consultas</p></div>
              </div>
              {viewLead.objetivo && (<><Separator /><div><p className="text-xs text-muted-foreground mb-1">Objetivo / contexto</p><p className="text-sm leading-relaxed whitespace-pre-wrap">{viewLead.objetivo}</p></div></>)}
              <Separator />
              <p className="text-xs text-muted-foreground">Registrado el {new Date(viewLead.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar a <strong className="text-foreground">{deleteConfirm?.email}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} disabled={!!deleteLoading}>
              {deleteLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Eliminando...</> : 'Eliminar usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
