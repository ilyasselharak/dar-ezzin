import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { Providers } from "@/components/providers";
import { keywordList, siteBase } from "@/lib/seo";
import { getSeoSettings } from "@/server/queries/seo";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap", weight: ["500", "600", "700", "800"] });

// Site-wide defaults, editable in Admin → SEO → Paramètres globaux. Pages override them.
export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  const keywords = keywordList(seo.defaultKeywords);
  return {
    metadataBase: new URL(siteBase(seo)),
    title: { default: seo.defaultTitle, template: `%s | ${seo.siteName}` },
    description: seo.defaultDescription,
    ...(keywords.length ? { keywords } : {}),
    applicationName: seo.siteName,
    formatDetection: { telephone: false },
    openGraph: { siteName: seo.siteName, locale: "fr_MA", type: "website" },
    robots: { index: seo.robotsIndex, follow: seo.robotsFollow },
    verification: {
      ...(seo.googleVerification ? { google: seo.googleVerification } : {}),
      ...(seo.bingVerification ? { other: { "msvalidate.01": seo.bingVerification } } : {}),
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#1f4a5c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr-MA" dir="ltr" className={`${inter.variable} ${manrope.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
