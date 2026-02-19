import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Briefcase, Pin, User } from 'lucide-react'
import type { CommunityPost, EventMetadata, JobMetadata } from '@/lib/types'

export function PostCard({ post, communitySlug }: { post: CommunityPost; communitySlug: string }) {
    const typeLabels = { announcement: 'Anuncio', event: 'Evento', job: 'Empleo' }
    const typeColors = { announcement: 'default', event: 'outline', job: 'secondary' } as const

    return (
        <Link href={`/${communitySlug}/community/${post.type === 'announcement' ? 'announcements' : post.type === 'event' ? 'events' : 'jobs'}/${post.id}`}>
            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none bg-white hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden group h-full flex flex-col">
                {post.image_url && (
                    <div className="aspect-video overflow-hidden border-b-2 border-black">
                        <img src={post.image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                )}
                <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
                    <div className="flex items-center gap-2">
                        <Badge variant={typeColors[post.type]} className="border-black border uppercase tracking-widest text-[10px]">
                            {typeLabels[post.type]}
                        </Badge>
                        {post.is_pinned && (
                            <Badge variant="outline" className="gap-1 border-black border uppercase tracking-widest text-[10px] bg-yellow-200">
                                <Pin className="h-3 w-3" /> Fijado
                            </Badge>
                        )}
                    </div>

                    <h3 className="font-heading font-black text-lg uppercase tracking-tight italic group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                    </h3>

                    <p className="text-sm text-black/60 line-clamp-3 mb-4">{post.content}</p>

                    <div className="mt-auto space-y-3">
                        {/* Type-specific metadata */}
                        {post.type === 'event' && (
                            <div className="flex flex-col gap-1.5 p-2 bg-accent/5 border border-black/10 text-xs font-bold text-black/70">
                                <span className="flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5 text-primary" />
                                    {new Date((post.metadata as EventMetadata).date).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                                <span className="flex items-center gap-2">
                                    <MapPin className="h-3.5 w-3.5 text-primary" />
                                    {(post.metadata as EventMetadata).location}
                                </span>
                            </div>
                        )}

                        {post.type === 'job' && (
                            <div className="flex flex-col gap-1.5 p-2 bg-secondary/5 border border-black/10 text-xs font-bold text-black/70">
                                <span className="flex items-center gap-2">
                                    <Briefcase className="h-3.5 w-3.5 text-secondary-foreground" />
                                    {(post.metadata as JobMetadata).category}
                                </span>
                                {(post.metadata as JobMetadata).salary_range && (
                                    <span className="text-secondary-foreground font-black uppercase tracking-tight pl-5">
                                        {(post.metadata as JobMetadata).salary_range}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Author + date footer */}
                        <div className="flex items-center gap-2 pt-3 border-t-2 border-dashed border-black/10 text-[10px] font-black uppercase tracking-widest text-black/40">
                            <div className="w-5 h-5 rounded-none border border-black bg-accent/20 flex items-center justify-center overflow-hidden">
                                {post.profiles?.avatar_url ? (
                                    <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="h-3 w-3" />
                                )}
                            </div>
                            <span className="truncate max-w-[120px]">{post.profiles?.full_name ?? 'Vecino'}</span>
                            <span className="ml-auto flex-shrink-0">
                                {new Date(post.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}
