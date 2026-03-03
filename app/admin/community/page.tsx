'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { CheckCircle, XCircle, Clock, Eye, MessageSquare, Calendar, Briefcase, Filter, X, Pin } from 'lucide-react'

export default function AdminCommunityPage() {
  const supabase = createClient()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all'
  })

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    setLoading(true)
    const { data } = await supabase
      .from('community_posts')
      .select('*, profiles(full_name), communities(name)')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    setPosts(data || [])
    setLoading(false)
  }

  // Filter posts based on selected criteria
  const filteredPosts = posts.filter(post => {
    if (filters.type !== 'all' && post.type !== filters.type) return false
    if (filters.status !== 'all' && post.status !== filters.status) return false
    return true
  })

  const pending = filteredPosts.filter(p => p.status === 'pending')
  const approved = filteredPosts.filter(p => p.status === 'approved')
  const rejected = filteredPosts.filter(p => p.status === 'rejected')

  const typeIcons: any = {
    announcement: MessageSquare,
    event: Calendar,
    job: Briefcase,
  }

  const handleClearFilters = () => {
    setFilters({ type: 'all', status: 'all' })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <h1 className="text-4xl font-heading font-black uppercase italic tracking-tighter">
          Moderación de <span className="text-primary">Comunidad</span>
        </h1>
        <p className="font-bold text-black/60">Gestiona las publicaciones de los vecinos en todas las comunidades.</p>
      </header>

      {/* Filter Controls */}
      <section className="flex flex-wrap items-center gap-4 p-6 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          <span className="font-black uppercase tracking-widest text-[10px] text-black/40">Filtros:</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-black uppercase tracking-widest text-[10px] text-black/60">Tipo:</label>
          <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
            <SelectTrigger className="brutalist-input w-40 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-2 border-black rounded-none">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="announcement">Anuncios</SelectItem>
              <SelectItem value="event">Eventos</SelectItem>
              <SelectItem value="job">Empleos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-black uppercase tracking-widest text-[10px] text-black/60">Estado:</label>
          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
            <SelectTrigger className="brutalist-input w-40 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-2 border-black rounded-none">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="approved">Aprobado</SelectItem>
              <SelectItem value="rejected">Rechazado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(filters.type !== 'all' || filters.status !== 'all') && (
          <Button
            onClick={handleClearFilters}
            variant="outline"
            size="sm"
            className="brutalist-button h-10 gap-2"
          >
            <X className="h-4 w-4" /> Limpiar Filtros
          </Button>
        )}

        <div className="ml-auto text-[10px] font-black uppercase tracking-widest text-black/40">
          Mostrando {filteredPosts.length} de {posts.length} publicaciones
        </div>
      </section>

      {/* Pending Posts */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-heading font-black uppercase italic tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary animate-pulse" />
            Pendientes de Revisión ({pending.length})
          </h2>
          <div className="h-1 flex-1 bg-primary/10"></div>
        </div>

        {pending.length === 0 ? (
          <Card className="border-4 border-black border-dashed bg-white shadow-none py-12 text-center">
            <p className="font-bold text-black/30 uppercase tracking-widest">No hay publicaciones pendientes</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pending.map(post => {
              const Icon = typeIcons[post.type] || MessageSquare
              return (
                <Card key={post.id} className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all overflow-hidden bg-white">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row divide-y-2 md:divide-y-0 md:divide-x-2 divide-black">
                      <div className="p-4 md:w-16 bg-accent/10 flex items-center justify-center shrink-0">
                        <Icon className="h-6 w-6 text-black" />
                      </div>
                      <div className="p-4 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">
                          <Badge variant="outline" className="text-[10px] rounded-none py-0 px-1 border-black">{post.communities?.name}</Badge>
                          {post.is_pinned && (
                            <Badge className="text-[10px] rounded-none py-0 px-1 border-black bg-yellow-200 text-black">
                              <Pin className="h-2.5 w-2.5 mr-0.5" /> Fijado
                            </Badge>
                          )}
                          <span>•</span>
                          <span>{post.profiles?.full_name}</span>
                          <span>•</span>
                          <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        </div>
                        <h3 className="font-heading font-black uppercase text-lg leading-tight">{post.title}</h3>
                        <p className="text-sm text-black/60 line-clamp-1">{post.content}</p>
                      </div>
                      <div className="p-4 md:w-48 bg-black/5 flex items-center gap-2 justify-center">
                        <Link href={`/admin/community/${post.id}`} className="w-full">
                          <Button variant="outline" size="sm" className="w-full border-2 border-black rounded-none h-10 gap-2 font-black uppercase tracking-widest text-[10px]">
                            <Eye className="h-3.5 w-3.5" /> Revisar
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {/* Recent History */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-heading font-black uppercase italic tracking-tight">Historial Reciente</h2>
          <div className="h-1 flex-1 bg-black/10"></div>
        </div>

        <div className="grid gap-4 opacity-70">
          {[...approved, ...rejected].slice(0, 5).map(post => {
            const Icon = typeIcons[post.type] || MessageSquare
            return (
              <div key={post.id} className="flex items-center gap-4 p-4 border-2 border-black/10 bg-white/50">
                <Icon className="h-5 w-5 text-black/30" />
                <div className="flex-1">
                  <h4 className="font-bold text-sm uppercase tracking-tight">{post.title}</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/30">{post.communities?.name} • {post.profiles?.full_name}</p>
                </div>
                {post.status === 'approved' ? (
                  <Badge className="bg-emerald-500 text-white border-black border rounded-none"><CheckCircle className="h-3 w-3 mr-1" /> Aprobado</Badge>
                ) : (
                  <Badge variant="destructive" className="rounded-none border-black border"><XCircle className="h-3 w-3 mr-1" /> Rechazado</Badge>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
