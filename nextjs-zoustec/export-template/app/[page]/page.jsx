import { notFound } from 'next/navigation';
import { EventSubPage } from '../../components/Site';
import { getSite } from '../../lib/site-data';

export const dynamic = 'force-dynamic';

function findPage(site, slug) {
  return (site.event.config?.pages || []).find((p) => p.slug === slug && p.data?.content?.length);
}

export async function generateMetadata({ params }) {
  const site = await getSite();
  const page = findPage(site, params.page);
  return { title: page ? `${page.title} · ${site.event.name}` : site.event.name };
}

export default async function Page({ params }) {
  const site = await getSite();
  const page = findPage(site, params.page);
  if (!page) notFound();
  return <EventSubPage site={site} page={page} />;
}
