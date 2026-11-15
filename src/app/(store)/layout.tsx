import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { WhatsAppButton } from "@/components/store/whatsapp-button";
import { JsonLd } from "@/components/shared/json-ld";
import { getSettings } from "@/server/queries/settings";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();
  return (
    <>
      <JsonLd data={[organizationJsonLd(settings), websiteJsonLd()]} />
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2">
        Aller au contenu
      </a>
      <Header />
      <main id="contenu" className="flex-1">{children}</main>
      <Footer />
      <WhatsAppButton number={settings.whatsapp} />
    </>
  );
}
