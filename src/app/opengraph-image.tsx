import { ImageResponse } from "next/og";

export const alt = "Dar Ezzin — Électroménager au Maroc";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#1f4a5c", color: "#fbfaf7" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="96" height="96" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#fbfaf7" /><path d="M20 50V30a12 12 0 0 1 24 0v20" fill="none" stroke="#d9a441" strokeWidth="5" strokeLinecap="round" /><path d="M27 50V34a5 5 0 0 1 10 0v16" fill="#d9a441" /></svg>
          <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -2 }}>DAR EZZIN</div>
        </div>
        <div style={{ fontSize: 44, marginTop: 40, maxWidth: 900, lineHeight: 1.2 }}>L&apos;électroménager qui rend la maison plus belle.</div>
        <div style={{ fontSize: 28, marginTop: 28, color: "#d9a441" }}>Livraison partout au Maroc · Paiement à la livraison</div>
      </div>
    ),
    size,
  );
}
