import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { STATIC_PAGES } from "@/lib/content/pages";
import { buildMetadata } from "@/lib/seo";
import { getSettings } from "@/server/queries/settings";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(STATIC_PAGES).map((page) => ({ page }));
}

export async function generateMetadata({ params }: PageProps<"/[page]">): Promise<Metadata> {
  const { page } = await params;
  const content = STATIC_PAGES[page];
  if (!content) return {};
  return buildMetadata({ title: content.title, description: content.description, path: `/${page}` });
}

export default async function StaticPage({ params }: PageProps<"/[page]">) {
  const { page } = await params;
  const content = STATIC_PAGES[page];
  if (!content) notFound();
  const settings = page === "contact" ? await getSettings() : null;

  return (
    <div className="container-page max-w-3xl space-y-6 py-6 sm:py-10">
      <Breadcrumbs items={[{ name: content.title, path: `/${page}` }]} />
      <h1 className="text-3xl font-extrabold sm:text-4xl">{content.title}</h1>
      <div className="prose-store space-y-6">
        {content.sections.map((s, i) => (
          <section key={i}>
            {s.heading ? <h2 className="text-xl">{s.heading}</h2> : null}
            {s.body.map((p, j) => <p key={j}>{p}</p>)}
          </section>
        ))}
      </div>
      {settings ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          <li><a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="flex items-center gap-3 rounded-2xl border bg-card p-4 hover:border-primary/40"><Phone className="size-5 text-primary" />{settings.phone}</a></li>
          <li><a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border bg-card p-4 hover:border-primary/40"><MessageCircle className="size-5 text-primary" />WhatsApp</a></li>
          <li><a href={`mailto:${settings.email}`} className="flex items-center gap-3 rounded-2xl border bg-card p-4 hover:border-primary/40"><Mail className="size-5 text-primary" />{settings.email}</a></li>
          <li className="flex items-center gap-3 rounded-2xl border bg-card p-4"><MapPin className="size-5 text-primary" />{settings.address}</li>
        </ul>
      ) : null}
    </div>
  );
}
