import Link from 'next/link'
import { PostCard } from './post-card'
import { ArrowRight, Briefcase } from 'lucide-react'
import type { CommunityPost } from '@/lib/types'

export function JobsSection({ posts, communitySlug }: { posts: CommunityPost[]; communitySlug: string }) {
    if (posts.length === 0) return null

    return (
        <section>
            <div className="flex items-end justify-between mb-8 border-b-4 border-black pb-2">
                <h2 className="text-3xl md:text-4xl font-heading font-black uppercase italic tracking-tighter flex items-center gap-3">
                    <div className="w-10 h-10 border-2 border-black bg-secondary flex items-center justify-center -rotate-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <Briefcase className="h-6 w-6 text-black" />
                    </div>
                    Empleos
                </h2>
                <Link
                    href={`/${communitySlug}/community/jobs`}
                    className="group text-sm font-black uppercase tracking-widest text-black/60 hover:text-primary transition-colors flex items-center gap-2 mb-1"
                >
                    Ver todos <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                    <PostCard key={post.id} post={post} communitySlug={communitySlug} />
                ))}
            </div>
        </section>
    )
}
