import { EventHome } from '../components/Site';
import { getSite } from '../lib/site-data';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const site = await getSite();
  return { title: `${site.event.name} · ${site.branding.tenant_name}` };
}

export default async function Page() {
  const site = await getSite();
  return <EventHome site={site} />;
}
