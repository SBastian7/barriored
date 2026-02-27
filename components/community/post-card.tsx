import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Briefcase, Pin, User, CheckCircle, Building } from 'lucide-react'
import { ImageLoader } from '@/components/ui/image-loader'
import type { CommunityPost, EventMetadata, JobMetadata, PromotionMetadata } from '@/lib/types'

export function PostCard({ post, communitySlug }: { post: CommunityPost; communitySlug: string }) {
    const typeLabels = { announcement: 'Anuncio', event: 'Evento', job: 'Empleo', promotion: 'Promoción' }
    const typeColors = { announcement: 'default', event: 'outline', job: 'secondary', promotion: 'secondary' } as const

    const linkPath = post.type === 'announcement' ? 'announcements' : post.type === 'event' ? 'events' : post.type === 'job' ? 'jobs' : 'promotions'

    return (
        <Link href={`/${communitySlug}/community/${linkPath}/${post.id}`}>
            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none bg-white hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden group h-full flex flex-col">
                {post.image_url && (
                    <div className="border-b-2 border-black">
                        <ImageLoader
                            src={post.image_url}
                            alt={post.title}
                            width={400}
                            height={300}
                            aspectRatio="4/3"
                            className="w-full"
                        />
                    </div>
                )}
                <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={typeColors[post.type]} className="border-black border uppercase tracking-widest text-[10px]">
                            {typeLabels[post.type]}
                        </Badge>
                        {post.is_pinned && (
                            <Badge variant="outline" className="gap-1 border-black border uppercase tracking-widest text-[10px] bg-yellow-200">
                                <Pin className="h-3 w-3" /> Fijado
                            </Badge>
                        )}
                        {post.type === 'job' && (post.metadata as JobMetadata)?.is_filled && (
                            <Badge className="gap-1 border-black border uppercase tracking-widest text-[10px] bg-gray-500 text-white">
                                <CheckCircle className="h-3 w-3" /> Lleno
                            </Badge>
                        )}
                        {post.type === 'promotion' && 'linked_business_id' in post.metadata && post.metadata.linked_business_id && (
                            <Badge
                                asChild
                                className="gap-1 bg-accent border-2 border-black text-white hover:bg-accent/90 uppercase tracking-widest text-[10px]"
                            >
                                <Link
                                    href={`/${communitySlug}/business/${post.metadata.linked_business_id}`}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Building className="h-3 w-3" />
                                    {post.metadata.linked_business_name}
                                </Link>
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
                                    <ImageLoader
                                        src={post.profiles.avatar_url}
                                        alt={post.profiles?.full_name || 'Usuario'}
                                        width={20}
                                        height={20}
                                        aspectRatio="1/1"
                                        className="w-full h-full"
                                    />
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
