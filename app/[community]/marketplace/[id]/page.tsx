import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { ClassifiedDetailView } from '@/components/marketplace/classified-detail-view';
import type { ClassifiedWithRelations } from '@/lib/types';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{
    community: string;
    id: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { community: communitySlug, id } = await params;
  const supabase = await createClient();

  const { data: classified } = await supabase
    .from('classifieds')
    .select(`
      *,
      profiles!classifieds_user_id_fkey(full_name, avatar_url),
      marketplace_categories(name, slug, icon),
      communities(name, slug)
    `)
    .eq('id', id)
    .eq('communities.slug', communitySlug)
    .single();

  if (!classified) {
    return {
      title: 'Clasificado no encontrado',
    };
  }

  return {
    title: `${classified.title} | Marketplace BarrioRed`,
    description: classified.description.substring(0, 160),
    openGraph: {
      title: classified.title,
      description: classified.description.substring(0, 160),
      images: classified.images?.[0] ? [classified.images[0]] : [],
    },
  };
}

export default async function ClassifiedDetailPage({ params }: PageProps) {
  const { community: communitySlug, id } = await params;
  const supabase = await createClient();

  // Get community
  const { data: community } = await supabase
    .from('communities')
    .select('id, name, slug')
    .eq('slug', communitySlug)
    .single();

  if (!community) {
    notFound();
  }

  // Get classified with all relations
  const { data: classified } = await supabase
    .from('classifieds')
    .select(`
      *,
      profiles!classifieds_user_id_fkey(full_name, avatar_url),
      marketplace_categories(name, slug, icon),
      communities(name, slug)
    `)
    .eq('id', id)
    .eq('community_id', community.id)
    .single();

  if (!classified) {
    notFound();
  }

  // Check if classified is active
  if (classified.status !== 'active') {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[
              { label: 'Inicio', href: `/${communitySlug}` },
              { label: 'Marketplace', href: `/${communitySlug}/marketplace` },
              { label: classified.title },
            ]}
          />

          <div className="mt-8 max-w-2xl mx-auto text-center">
            <div className="brutalist-card p-8">
              <h1 className="text-2xl font-outfit font-black uppercase tracking-tighter mb-4">
                Clasificado no disponible
              </h1>
              <p className="text-muted-foreground mb-6">
                Este clasificado ya no está activo o ha sido{' '}
                {classified.status === 'sold' ? 'vendido' : 'eliminado'}
              </p>
              <Link
                href={`/${communitySlug}/marketplace`}
                className="brutalist-button inline-block"
              >
                Volver al Marketplace
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Type cast to ClassifiedWithRelations
  const classifiedWithRelations = classified as ClassifiedWithRelations;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: `/${communitySlug}` },
            { label: 'Marketplace', href: `/${communitySlug}/marketplace` },
            {
              label: classifiedWithRelations.marketplace_categories?.name || 'Categoría',
              href: `/${communitySlug}/marketplace?category=${classifiedWithRelations.marketplace_categories?.slug}`,
            },
            { label: classifiedWithRelations.title },
          ]}
        />

        <ClassifiedDetailView
          classified={classifiedWithRelations}
          communitySlug={communitySlug}
        />
      </div>
    </div>
  );
}
