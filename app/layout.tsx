import type { Metadata } from "next";
import { seoMetadata, webApplicationSchema } from "./seo.js";
import "./globals.css";

export const metadata: Metadata = seoMetadata;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationSchema) }}
        />
      </body>
    </html>
  );
}
